// Harnais d'équilibrage : parties jouées par des profils de joueurs dans Chrome sans interface, rapport HTML et mesures.
// Usage : npm run balance [-- --profils demo,prudent --parties 20 --vagues 25 --arene <id> --onglets 4]
//         (CHROME=<chemin> pour un autre navigateur Chromium). Spécification : docs/prd/harnais-equilibrage.md.
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROFILES } from './balance/profiles.js';
import { buildReport } from './balance/report.js';

const VITE_PORT = 5193, DEBUG_PORT = 9335;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WAVE_LIMIT = 300; // une vague qui dure plus longtemps (s de jeu) arrête la partie : « bloquée »

// --cle valeur
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const profiles = opt('profils', PROFILES.map(p => p.id).join(',')).split(',');
const games = +opt('parties', 20), cap = +opt('vagues', 25), tabs = +opt('onglets', 4), arena = opt('arene', '');
for (const id of profiles) if (!PROFILES.some(p => p.id === id)) { console.error(`Profil inconnu : ${id} (${PROFILES.map(p => p.id).join(', ')})`); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(url, init) {
  for (let k = 0; k < 100; k++) { try { const r = await fetch(url, init); if (r.ok) return r; } catch {} await sleep(200); }
  throw new Error(`${url} ne répond pas`);
}
const fmtTime = s => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, (c) => c === 'T' ? '-' : '');
let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() + (execSync('git status --porcelain', { encoding: 'utf8' }).trim() ? ' (modifié)' : ''); } catch {}
mkdirSync('reports', { recursive: true });
const base = join('reports', `balance-${stamp}`);

const profileDir = mkdtempSync(join(tmpdir(), 'tete-carree-balance-'));
const vite = spawn('./node_modules/.bin/vite', ['--port', String(VITE_PORT), '--strictPort'], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profileDir}`,
  '--window-size=1280,800', '--no-first-run', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
chrome.on('error', () => { console.error(`Chrome introuvable : ${CHROME} (variable CHROME pour un autre chemin)`); process.exit(2); });
function cleanup() { chrome.kill(); vite.kill(); try { rmSync(profileDir, { recursive: true, force: true }); } catch {} }

// Un onglet piloté par le protocole de débogage.
async function openTab() {
  const target = await (await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); pending.get(m.id)?.(m); pending.delete(m.id); });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  // avant les scripts du jeu : boucle d'affichage figée, minuteurs immédiats (le vrai setTimeout reste pour le pilote)
  await send('Page.addScriptToEvaluateOnNewDocument', { source:
    'window.requestAnimationFrame = () => 0; window.__realSetTimeout = window.setTimeout.bind(window); window.setTimeout = (f, ms, ...a) => window.__realSetTimeout(f, 0, ...a);' });
  await send('Page.navigate', { url: `http://localhost:${VITE_PORT}/` });
  for (let k = 0; k < 100; k++) {
    const r = await send('Runtime.evaluate', { expression: `import('/src/state/world.js').then(m => m.world.state)`, awaitPromise: true, returnByValue: true });
    if (r.result?.result?.value === 'title') break;
    await sleep(200);
  }
  return async job => {
    const r = await send('Runtime.evaluate', { expression: `import('/scripts/balance/pilot.js').then(m => m.runGame(${JSON.stringify(job)}))`, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return { ...job, outcome: 'erreur', error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
    return r.result.result.value;
  };
}

// Parties : chaque profil joue les mêmes graines, pour comparer à donne égale.
const jobs = [];
for (let seed = 1; seed <= games; seed++) for (const profile of profiles) jobs.push({ seed, profile, cap, waveLimit: WAVE_LIMIT, arena });
const runs = [], t0 = Date.now();
const meta = () => ({ commit, profiles, games, cap, arena, tabs, started: new Date(t0).toISOString(), seconds: Math.round((Date.now() - t0) / 1000), done: runs.length, total: jobs.length });
const save = () => writeFileSync(base + '.json', JSON.stringify({ meta: meta(), runs }, null, 1));
let finished = false;
function finish(interrupted) {
  if (finished) return; finished = true;
  save();
  writeFileSync(base + '.html', buildReport({ ...meta(), interrupted }, runs));
  console.log(`\n${interrupted ? 'Interrompu : ' : ''}${runs.length} parties en ${fmtTime((Date.now() - t0) / 1000)}.`);
  for (const id of profiles) {
    const w = runs.filter(r => r.profile === id && r.outcome !== 'erreur').map(r => r.wave).sort((a, b) => a - b);
    if (w.length) console.log(`  ${id.padEnd(10)} vague médiane ${w[w.length >> 1]}  (de ${w[0]} à ${w[w.length - 1]}, ${w.length} parties)`);
  }
  console.log(`Rapport : ${base}.html`);
  cleanup();
}
process.on('SIGINT', () => { finish(true); process.exit(130); });

try {
  await waitFor(`http://localhost:${VITE_PORT}/`);
  await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  console.log(`${jobs.length} parties (${profiles.join(', ')} × ${games}), plafond ${cap} vagues, ${tabs} onglets…`);
  const players = await Promise.all(Array.from({ length: Math.min(tabs, jobs.length) }, openTab));
  let next = 0;
  await Promise.all(players.map(async play => {
    while (next < jobs.length) {
      const job = jobs[next++], r = await play(job);
      runs.push(r); save();
      const el = (Date.now() - t0) / 1000, left = el / runs.length * (jobs.length - runs.length);
      console.log(`[${String(runs.length).padStart(String(jobs.length).length)}/${jobs.length}] ${r.profile.padEnd(9)} graine ${String(r.seed).padStart(3)} : vague ${r.wave ?? '?'} (${r.outcome}${r.cause ? ', ' + r.cause : ''})${r.error ? ' ' + r.error.split('\n')[0] : ''}  · ${fmtTime(el)} écoulées, ~${fmtTime(left)} restantes`);
    }
  }));
  finish(false);
} catch (e) { console.error(e.message); cleanup(); process.exit(1); }
