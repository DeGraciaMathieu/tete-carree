// Mesure des allocations JS : serveur Vite + Chrome sans interface, une partie lancée en vague WAVE (joueur
// immobile et invulnérable), profil d'allocations échantillonné. Échoue au-delà du budget : la cause habituelle des
// baisses de fps est le ramasse-miettes.
// Usage : npm run perf [-- secondes]   (CHROME=<chemin> pour un autre navigateur Chromium)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BUDGET_MB_S = 10;   // aujourd'hui ~2 Mo/s ; 140 Mo/s avant la correction du tas du champ de distances
const SECONDS = +(process.argv[2] || 20);
const WAVE = 15; // vague de la mesure : une horde de fin de partie, plus d'une centaine d'ennemis
const VITE_PORT = 5191, DEBUG_PORT = 9333;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TOP = 12;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(url) {
  for (let k = 0; k < 100; k++) { try { const r = await fetch(url); if (r.ok) return r; } catch {} await sleep(200); }
  throw new Error(`${url} ne répond pas`);
}

const profileDir = mkdtempSync(join(tmpdir(), 'tete-carree-perf-'));
const vite = spawn('./node_modules/.bin/vite', ['--port', String(VITE_PORT), '--strictPort'], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profileDir}`,
  '--window-size=1280,800', '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
chrome.on('error', () => { console.error(`Chrome introuvable : ${CHROME} (variable CHROME pour un autre chemin)`); process.exit(2); });
function cleanup() { chrome.kill(); vite.kill(); try { rmSync(profileDir, { recursive: true, force: true }); } catch {} }

try {
  await waitFor(`http://localhost:${VITE_PORT}/`);
  const page = (await (await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); pending.get(m.id)?.(m); pending.delete(m.id); });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const inPlay = async () => (await send('Runtime.evaluate', { expression: `!document.getElementById('hud').hidden && document.getElementById('overScreen').hidden`, returnByValue: true })).result.result.value;

  await send('Page.enable');
  await send('Page.navigate', { url: `http://localhost:${VITE_PORT}/` });
  await sleep(2500);
  // Entrée sur l'écran titre lance une partie
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Enter', key: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Enter', key: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(500);
  if (!(await inPlay())) throw new Error('la partie n\'a pas démarré');
  // Joueur immobile rendu invulnérable : la horde s'accumule autour de lui sans finir la partie.
  // La vague WAVE démarre tout de suite, pendant la pause d'avant la vague 1.
  // Le serveur Vite sert le même module que le jeu, on agit donc sur le vrai état.
  const setup = await send('Runtime.evaluate', { awaitPromise: true, expression: `Promise.all([import('/src/state/world.js'), import('/src/game/enemies.js')])
    .then(([w, en]) => { w.player.invuln = 1e9; w.S.wave = ${WAVE - 1}; en.startWave(); })` });
  if (setup.result.exceptionDetails) throw new Error(`préparation de la partie : ${setup.result.exceptionDetails.exception?.description}`);

  console.log(`Partie lancée en vague ${WAVE}, mesure pendant ${SECONDS} s…`);
  await send('HeapProfiler.enable');
  await send('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  await sleep(SECONDS * 1000);
  const { profile } = (await send('HeapProfiler.stopSampling')).result;
  const stillPlaying = await inPlay();

  const byFn = new Map(); let total = 0;
  (function walk(n) {
    const f = n.callFrame, file = f.url.split('/').pop().split('?')[0];
    const key = `${f.functionName || '(anonyme)'}  ${file ? `${file}:${f.lineNumber + 1}` : '(natif)'}`;
    byFn.set(key, (byFn.get(key) || 0) + n.selfSize); total += n.selfSize;
    n.children.forEach(walk);
  })(profile.head);

  const rate = total / 1e6 / SECONDS;
  console.log(`\nAlloué : ${(total / 1e6).toFixed(1)} Mo en ${SECONDS} s, soit ${rate.toFixed(2)} Mo/s (budget ${BUDGET_MB_S} Mo/s)\n`);
  for (const [k, v] of [...byFn].sort((a, b) => b[1] - a[1]).slice(0, TOP)) {
    console.log(`${(v / 1e6 / SECONDS).toFixed(2).padStart(7)} Mo/s ${(v / total * 100).toFixed(0).padStart(4)} %  ${k}`);
  }
  if (!stillPlaying) console.log('\nAttention : la partie s\'est terminée avant la fin de la mesure, le chiffre est sous-estimé.');
  ws.close(); cleanup();
  if (rate > BUDGET_MB_S) { console.log(`\nÉCHEC : ${rate.toFixed(2)} Mo/s dépasse le budget de ${BUDGET_MB_S} Mo/s.`); process.exit(1); }
  console.log('\nOK : allocations dans le budget.');
} catch (e) {
  cleanup();
  console.error('Mesure impossible :', e.message);
  process.exit(2);
}
