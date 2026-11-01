// Rapport HTML du harnais d'équilibrage : agrégats calculés ici, graphiques dessinés dans la page (fichier autonome).
import { ARENAS, MODS, W } from '../../src/config.js';
import fr from '../../src/i18n/fr.js';
import { profileById } from './profiles.js';

const CAUSES = { z: 'Zombie', r: 'Coureur', b: 'Gonflé', s: 'Cracheur', a: 'Blindé', d: 'Diable', acid: 'Acide', blast: 'Tes explosions', sablier: 'Sablier', '': 'Inconnue' };
const COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--p5)'];
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Agrégats par profil, cartes et armes, à partir des parties jouées (les parties en erreur sont écartées).
function aggregate(meta, all) {
  const runs = all.filter(r => r.outcome !== 'erreur'), cap = meta.cap;
  const maxWave = Math.max(1, ...runs.map(r => r.wave));
  const profiles = meta.profiles.map((id, k) => {
    const rs = runs.filter(r => r.profile === id), waves = rs.map(r => r.wave).sort((a, b) => a - b);
    const deaths = rs.filter(r => r.outcome === 'mort'), causes = {};
    for (const r of deaths) causes[r.cause] = (causes[r.cause] || 0) + 1;
    const perWave = (key, w) => median(rs.map(r => r.waves.find(x => x.wave === w)).filter(x => x && x[key] !== undefined).map(x => x[key]));
    const N = Math.min(maxWave, cap);
    return {
      id, name: profileById(id).name, c: COLORS[k % COLORS.length], runs: rs.length, waves,
      median: median(waves), min: waves[0], max: waves[waves.length - 1], capped: rs.filter(r => r.outcome === 'plafond').length,
      deaths: deaths.length, causes,
      alive: Array.from({ length: N }, (_, i) => rs.length ? rs.filter(r => r.wave >= i + 1).length / rs.length : 0),
      pace: Array.from({ length: N }, (_, i) => perWave('time', i + 1)),
      hp: Array.from({ length: N }, (_, i) => perWave('hp', i + 1)),
      earned: Array.from({ length: N }, (_, i) => perWave('earned', i + 1)),
      spent: Array.from({ length: N }, (_, i) => perWave('spent', i + 1)),
      arms: Object.fromEntries(W.filter(w => w.unlock > 0).map(w => { const u = rs.map(r => r.unlocks[w.id]).filter(v => v !== undefined); return [w.id, u.length * 2 > rs.length ? median(u) : null]; })),
    };
  });
  // Cartes : vague atteinte avec et sans, écart moyen calculé profil par profil (pondéré par les parties avec la carte).
  const minTaken = Math.max(2, Math.round(runs.length / 10));
  const cards = MODS.map(m => {
    const has = r => r.cards.some(c => c.id === m.id), withR = runs.filter(has);
    if (withR.length < minTaken) return null;
    let num = 0, den = 0;
    for (const p of meta.profiles) {
      const rs = runs.filter(r => r.profile === p), a = rs.filter(has), b = rs.filter(r => !has(r));
      if (a.length && b.length) { num += a.length * (mean(a.map(r => r.wave)) - mean(b.map(r => r.wave))); den += a.length; }
    }
    return { name: fr.cards[m.id].name, rar: m.rar, taken: Math.round(withR.length / runs.length * 100), with: mean(withR.map(r => r.wave)), without: mean(runs.filter(r => !has(r)).map(r => r.wave)), delta: den ? num / den : null };
  }).filter(Boolean).sort((a, b) => (b.delta ?? -99) - (a.delta ?? -99));
  const odd = all.filter(r => r.outcome !== 'mort').map(r => ({
    profile: profileById(r.profile).name, seed: r.seed, wave: r.wave ?? '?',
    what: esc(r.outcome === 'plafond' ? 'plafond atteint' : r.outcome === 'erreur' ? `erreur : ${(r.error || '').split('\n')[0]}`
      : `vague bloquée : ${Object.entries(r.stuck?.left || {}).map(([t, n]) => `${n} ${CAUSES[t] || t}`).join(', ') || 'aucun ennemi en vie'}${r.stuck?.queue ? `, ${r.stuck.queue} encore à sortir` : ''}`),
  }));
  return { profiles, cards, odd, causes: Object.keys(CAUSES).filter(k => profiles.some(p => p.causes[k])).map(k => [k, CAUSES[k]]), arms: W.filter(w => w.unlock > 0).map(w => [w.id, fr.weapons[w.id].name]) };
}

export function buildReport(meta, runs) {
  const data = aggregate(meta, runs);
  const arenaName = fr.arenas[meta.arena || ARENAS[0]] || meta.arena;
  const when = new Date(meta.started).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const dur = `${Math.floor(meta.seconds / 60)} min ${String(meta.seconds % 60).padStart(2, '0')} s`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Équilibrage ${esc(when)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Share+Tech+Mono&display=swap">
<style>${CSS}</style></head><body>
<div class="page">
  <header>
    <span class="eyebrow">npm run balance · ${esc(when)}</span>
    <h1>Rapport d'équilibrage</h1>
    <p class="lead">Une partie par graine et par profil, jouée par le pilote automatique dans Chrome sans interface, jusqu'à la mort, au plafond de vagues ou à une vague bloquée.</p>
    ${meta.interrupted ? `<span class="warnbadge">Lancement interrompu : ${meta.done} parties sur ${meta.total}</span>` : ''}
    <div class="meta"><span>Commit <b>${esc(meta.commit || '?')}</b></span><span>Profils <b>${meta.profiles.length}</b></span><span>Parties <b>${meta.games}</b> par profil (graines 1 à ${meta.games})</span><span>Plafond <b>${meta.cap} vagues</b></span><span>Arène <b>${esc(arenaName)}</b></span><span>Onglets <b>${meta.tabs}</b></span><span>Durée <b>${dur}</b></span></div>
  </header>
  <section><h2>Vague atteinte</h2><div class="tiles" id="tiles"></div></section>
  <section><h2>Survie vague par vague</h2><p>Part des parties encore en vie au début de chaque vague. Une marche qui tombe d'un coup désigne une vague qui tue presque tout le monde.</p>
    <div class="panel"><div class="legend" id="survLegend"></div><svg class="chart" id="surv" viewBox="0 0 900 300" role="img" aria-label="Part des parties en vie par vague"></svg></div></section>
  <section><h2>Ce qui tue</h2><p>Dernier coup encaissé, en part des morts de chaque profil. Les parties au plafond ou bloquées ne comptent pas.</p><div class="panel scroll"><table id="causes"></table></div></section>
  <section><h2>Rythme</h2><div class="two">
    <div class="panel"><div class="small">Durée médiane d'une vague (s de jeu)</div><svg class="chart" id="pace" viewBox="0 0 440 240" role="img" aria-label="Durée médiane des vagues"></svg></div>
    <div class="panel"><div class="small">Vie en fin de vague (médiane, % de la vie max)</div><svg class="chart" id="hp" viewBox="0 0 440 240" role="img" aria-label="Vie en fin de vague"></svg></div></div>
    <div class="legend" id="paceLegend"></div></section>
  <section><h2>Économie</h2><p>Pièces gagnées et dépensées de chaque vague à la suivante, pause comprise (médiane des parties qui y sont arrivées), pour le profil choisi.</p>
    <div class="chips" id="ecoChips"></div>
    <div class="panel"><div class="legend"><span style="--c:var(--coin)"><i></i>gagnées</span><span style="--c:#8d938c"><i></i>dépensées</span></div><svg class="chart" id="eco" viewBox="0 0 900 240" role="img" aria-label="Pièces gagnées et dépensées par vague"></svg></div></section>
  <section><h2>Cartes</h2><p>Vague atteinte en moyenne par les parties qui ont pris la carte et par les autres ; l'écart est calculé profil par profil. Ce n'est pas une preuve : une carte prise tard profite d'avoir déjà survécu. Cartes prises dans au moins ${Math.max(2, Math.round(runs.length / 10))} parties.</p><div class="panel scroll"><table id="cards"></table></div></section>
  <section><h2>Armes</h2><p>Vague médiane de déblocage. Un tiret : débloquée dans moins de la moitié des parties.</p><div class="panel scroll"><table id="arms"></table></div></section>
  <section><h2>Parties à vérifier</h2><div class="panel scroll"><table id="odd"></table></div></section>
</div>
<div class="tip" id="tip" hidden></div>
<script>const DATA = ${JSON.stringify(data)};
${SCRIPT}</script>
</body></html>`;
}

const CSS = `
:root{--void:#1a1c1d;--surface:#1f2223;--line:rgba(255,255,255,.12);--grid:rgba(255,255,255,.07);--text:#eef0ea;--muted:#9ea59f;--faint:#6f7570;--hazard:#f2c230;--coin:#e8b23a;
--p1:#3987e5;--p2:#d95926;--p3:#199e70;--p4:#c98500;--p5:#d55181;--heat:#3987e5;--good:#62c46e;--bad:#ff8f84;
--display:'Black Ops One',Impact,'Arial Black',sans-serif;--mono:'Share Tech Mono',ui-monospace,Menlo,monospace;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--void);color:var(--text);font-family:var(--mono);font-size:14px;line-height:1.5;margin:0}
.page{max-width:1120px;margin:0 auto;padding-inline:16px;padding-block:28px 64px;display:flex;flex-direction:column;gap:34px}
h1,h2{font-family:var(--display);font-weight:400;margin:0;text-wrap:balance}
h1{font-size:clamp(30px,6vw,44px);margin-top:4px} h2{font-size:22px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--hazard)}
.lead{color:var(--muted);margin:6px 0 0;max-width:72ch}
.warnbadge{display:inline-block;margin-top:10px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#17191a;background:var(--bad);padding:2px 8px}
.meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:12px;font-size:12px;color:var(--muted)} .meta b{color:var(--text);font-weight:400}
section{display:flex;flex-direction:column;gap:10px} section>p{margin:0;color:var(--muted);font-size:13px;max-width:78ch}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:14px 16px;min-width:0}
.small{font-size:12px;color:var(--muted)}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
.tile{background:var(--surface);border:1px solid var(--line);border-top:3px solid var(--c);border-radius:4px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}
.tile .name{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.tile .big{font-family:var(--display);font-size:34px;line-height:1;font-variant-numeric:tabular-nums}
.tile .big small{font-family:var(--mono);font-size:12px;color:var(--muted);margin-left:4px}
.tile .sub{font-size:12px;color:var(--muted)} .tile .sub b{color:var(--text);font-weight:400}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--muted)} .legend span{display:inline-flex;align-items:center;gap:6px} .legend i{width:14px;height:3px;border-radius:2px;background:var(--c)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{font:inherit;font-size:12px;color:var(--muted);background:transparent;border:1px solid var(--line);border-radius:3px;padding:3px 10px;cursor:pointer}
.chip[aria-pressed="true"]{color:var(--text);border-color:var(--c);box-shadow:inset 0 -2px 0 var(--c)} .chip:focus-visible{outline:2px solid var(--hazard);outline-offset:2px}
svg.chart{width:100%;height:auto;display:block;overflow:visible} svg text{font-family:var(--mono);font-size:11px;fill:var(--muted)} svg .gridl{stroke:var(--grid)} svg .axis{stroke:var(--line)}
.tip{position:fixed;pointer-events:none;background:#0f1112;border:1px solid var(--line);border-radius:3px;padding:6px 9px;font-size:12px;color:var(--text);z-index:9;white-space:nowrap} .tip .k{color:var(--muted)}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:12.5px;font-variant-numeric:tabular-nums}
th,td{padding:6px 8px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap} th:first-child,td:first-child{text-align:left}
th{font-weight:400;color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.rar{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
.delta{display:flex;align-items:center;justify-content:flex-end;gap:8px} .delta .bar{width:90px;height:8px;position:relative;background:var(--grid);border-radius:2px} .delta .bar i{position:absolute;top:0;bottom:0;border-radius:2px}
.flag{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--bad);border:1px solid var(--bad);padding:0 5px;margin-left:6px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.empty{color:var(--faint);font-size:12.5px}
@media (max-width:820px){.two{grid-template-columns:1fr}}`;

// Dessin dans la page : n'utilise que DATA. Courbes et barres en SVG, infobulles au survol.
const SCRIPT = `
const P = DATA.profiles, NS = 'http://www.w3.org/2000/svg', tip = document.getElementById('tip');
const num = (v, d = 1) => v === null || v === undefined ? '–' : (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
const showTip = (e, html) => { tip.innerHTML = html; tip.hidden = false; tip.style.left = Math.min(innerWidth - tip.offsetWidth - 12, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; };
const hideTip = () => { tip.hidden = true; };
const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent && parent.appendChild(n); return n; };
const legend = id => { document.getElementById(id).innerHTML = P.map(p => '<span style="--c:' + p.c + '"><i></i>' + p.name + '</span>').join(''); };
const N = Math.max(1, ...P.map(p => p.alive.length));

document.getElementById('tiles').innerHTML = P.map(p => {
  const top = Object.entries(p.causes).sort((a, b) => b[1] - a[1])[0], name = top ? (DATA.causes.find(c => c[0] === top[0]) || [0, top[0]])[1] : '–';
  return '<div class="tile" style="--c:' + p.c + '"><span class="name">' + p.name + '</span><span class="big">' + num(p.median) + '<small>vague médiane</small></span>'
    + '<span class="sub">de <b>' + (p.min ?? '–') + '</b> à <b>' + (p.max ?? '–') + '</b> · plafond <b>' + p.capped + '/' + p.runs + '</b></span><span class="sub">meurt surtout : <b>' + name + '</b></span></div>';
}).join('');

// courbes : x = vague, y = valeur ; vals[k][i] par profil (null : pas de donnée)
function lines(id, vals, max, unit, W, H, step) {
  const svg = document.getElementById(id), L = 44, R = step ? 110 : 10, T = 12, B = 28;
  const x = w => L + (N > 1 ? (w - 1) / (N - 1) : .5) * (W - L - R), y = v => T + (1 - v / max) * (H - T - B);
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'gridl' }, svg); el('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, svg).textContent = Math.round(v) + unit; }
  const every = Math.max(1, Math.ceil(N / 12));
  for (let w = 1; w <= N; w += every) el('text', { x: x(w), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = 'v' + w;
  P.forEach((p, k) => {
    let d = '', pen = false;
    vals[k].forEach((v, i) => { if (v === null || v === undefined) { pen = false; return; } d += (pen ? (step ? 'H' + x(i + 1) + 'V' : 'L' + x(i + 1) + ',') : 'M' + x(i + 1) + ',') + y(v); pen = true; });
    if (d) el('path', { d, fill: 'none', stroke: p.c, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
  });
  if (step) {
    const ends = P.map((p, k) => ({ p, y: y(vals[k][vals[k].length - 1] ?? 0), v: vals[k][vals[k].length - 1] ?? 0 })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    ends.forEach(e => { const t = el('text', { x: W - R + 8, y: e.y + 4 }, svg); t.textContent = e.p.name + ' ' + Math.round(e.v) + unit; t.style.fill = 'var(--text)'; });
  }
  const cur = el('line', { y1: T, y2: H - B, stroke: 'var(--faint)', 'stroke-dasharray': '3 3', visibility: 'hidden' }, svg);
  const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' }, svg);
  hit.addEventListener('mousemove', ev => {
    const r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * W;
    const w = Math.max(1, Math.min(N, Math.round(1 + (sx - L) / (W - L - R) * (N - 1))));
    cur.setAttribute('x1', x(w)); cur.setAttribute('x2', x(w)); cur.setAttribute('visibility', 'visible');
    showTip(ev, '<b>Vague ' + w + '</b><br>' + P.map((p, k) => '<span class="k">' + p.name + '</span> ' + num(vals[k][w - 1], 0) + unit).join('<br>'));
  });
  hit.addEventListener('mouseleave', () => { cur.setAttribute('visibility', 'hidden'); hideTip(); });
}
lines('surv', P.map(p => p.alive.map(v => v * 100)), 100, ' %', 900, 300, true); legend('survLegend');
const peak = a => Math.max(10, ...a.flat().filter(v => v !== null && v !== undefined));
const pace = P.map(p => p.pace), maxPace = Math.ceil(peak(pace) / 20) * 20;
lines('pace', pace, maxPace, ' s', 440, 240, false);
lines('hp', P.map(p => p.hp), 100, ' %', 440, 240, false); legend('paceLegend');

// causes : part des morts, couleur d'une seule teinte
(function () {
  const t = document.getElementById('causes');
  if (!DATA.causes.length) { t.innerHTML = '<tr><td class="empty">Aucune mort.</td></tr>'; return; }
  t.innerHTML = '<tr><th>Profil</th>' + DATA.causes.map(c => '<th>' + c[1] + '</th>').join('') + '</tr>' + P.map(p => '<tr><td>' + p.name + ' <span class="small">(' + p.deaths + ')</span></td>' + DATA.causes.map(c => {
    const v = p.deaths ? Math.round((p.causes[c[0]] || 0) / p.deaths * 100) : 0;
    return '<td style="background:color-mix(in oklab, var(--heat) ' + Math.round(v * .7) + '%, transparent)">' + v + ' %</td>';
  }).join('') + '</tr>').join('');
})();

// économie : barres gagnées et dépensées, profil au choix
(function () {
  const chips = document.getElementById('ecoChips'), svg = document.getElementById('eco');
  function draw(i) {
    svg.innerHTML = '';
    const p = P[i], W = 900, H = 240, L = 40, R = 10, T = 10, B = 26, n = p.earned.length || 1, band = (W - L - R) / n, bw = Math.max(2, (band - 6) / 2);
    const max = Math.ceil(Math.max(10, ...p.earned.concat(p.spent).filter(v => v !== null)) / 10) * 10, y = v => T + (1 - v / max) * (H - T - B);
    for (let k = 0; k <= 3; k++) { const v = max * k / 3; el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'gridl' }, svg); el('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, svg).textContent = Math.round(v); }
    const every = Math.max(1, Math.ceil(n / 15));
    p.earned.forEach((e, w) => {
      const x0 = L + w * band + 3, vals = [e, p.spent[w]];
      vals.forEach((v, j) => {
        if (v === null) return;
        const h = Math.max(0, y(0) - y(v)), r = Math.min(4, h, bw / 2);
        el('path', { d: 'M' + (x0 + j * (bw + 2)) + ',' + y(0) + 'v' + (-(h - r)) + 'q0,' + (-r) + ' ' + r + ',' + (-r) + 'h' + (bw - 2 * r) + 'q' + r + ',0 ' + r + ',' + r + 'v' + (h - r) + 'z', fill: j ? '#8d938c' : 'var(--coin)' }, svg);
      });
      const hit = el('rect', { x: x0 - 2, y: T, width: band, height: H - T - B, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', ev => showTip(ev, '<b>Vague ' + (w + 1) + '</b><br><span class="k">gagnées</span> ' + num(e, 0) + '<br><span class="k">dépensées</span> ' + num(p.spent[w], 0)));
      hit.addEventListener('mouseleave', hideTip);
      if (w % every === 0) el('text', { x: x0 + bw, y: H - 6, 'text-anchor': 'middle' }, svg).textContent = 'v' + (w + 1);
    });
    chips.querySelectorAll('.chip').forEach((b, k) => b.setAttribute('aria-pressed', k === i));
  }
  chips.innerHTML = P.map((p, k) => '<button class="chip" type="button" style="--c:' + p.c + '" data-i="' + k + '">' + p.name + '</button>').join('');
  chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) draw(+b.dataset.i); });
  draw(0);
})();

// cartes : écart avec / sans, barre divergente
(function () {
  const RC = { c: '#b9c0b8', r: '#5aa9e6', l: '#f2c230', p: '#e0483d', m: '#a66bff' }, t = document.getElementById('cards');
  if (!DATA.cards.length) { t.innerHTML = '<tr><td class="empty">Pas assez de parties pour comparer les cartes.</td></tr>'; return; }
  const span = Math.max(1, ...DATA.cards.map(c => Math.abs(c.delta || 0)));
  t.innerHTML = '<tr><th>Carte</th><th>Prise</th><th>Avec</th><th>Sans</th><th>Écart</th></tr>' + DATA.cards.map(c => {
    const d = c.delta, w = d === null ? 0 : Math.abs(d) / span * 48, col = d >= 0 ? 'var(--good)' : 'var(--bad)';
    const bar = '<span class="bar"><i style="background:' + col + ';' + (d >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w + '%"></i><i style="left:50%;width:1px;background:var(--faint)"></i></span>';
    return '<tr><td><span class="rar" style="background:' + RC[c.rar] + '"></span>' + c.name + (d !== null && Math.abs(d) >= 2.5 ? '<span class="flag">à surveiller</span>' : '') + '</td><td>' + c.taken + ' %</td><td>' + num(c.with) + '</td><td>' + num(c.without) + '</td><td><span class="delta">' + (d > 0 ? '+' : '') + num(d) + bar + '</span></td></tr>';
  }).join('');
})();

document.getElementById('arms').innerHTML = '<tr><th>Arme</th>' + P.map(p => '<th>' + p.name + '</th>').join('') + '</tr>'
  + DATA.arms.map(a => '<tr><td>' + a[1] + '</td>' + P.map(p => '<td>' + (p.arms[a[0]] === null ? '–' : 'v' + num(p.arms[a[0]])) + '</td>').join('') + '</tr>').join('');
document.getElementById('odd').innerHTML = DATA.odd.length
  ? '<tr><th>Profil</th><th>Graine</th><th>Vague</th><th>Problème</th></tr>' + DATA.odd.map(o => '<tr><td>' + o.profile + '</td><td>' + o.seed + '</td><td>' + o.wave + '</td><td style="text-align:left">' + o.what + '</td></tr>').join('')
  : '<tr><td class="empty">Aucune : toutes les parties se sont terminées par la mort du joueur.</td></tr>';
`;
