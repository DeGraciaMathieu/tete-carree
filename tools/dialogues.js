// Éditeur des dialogues : liste les scènes de fr.js et en.js côte à côte, enregistre via le plugin `dialogues` de Vite.
import { STORY_CHAPTERS } from '../src/config.js';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';

const PARTS = { intro: 'Ouverture', outro: 'Fin' };
const root = document.getElementById('scenes'), saveBtn = document.getElementById('save'), status = document.getElementById('status');
// Une réplique par ligne : le personnage est commun aux deux langues.
const scenes = {};
for (const id of STORY_CHAPTERS) {
  scenes[id] = {};
  for (const part in PARTS) scenes[id][part] = fr.scenes[id][part].map(([who, text], i) => ({ who, fr: text, en: en.scenes[id][part][i]?.[1] ?? '' }));
}

function setStatus(text, cls = '') { status.textContent = text; status.className = cls; }
function changed() { saveBtn.disabled = false; setStatus('Modifications non enregistrées'); }

function el(tag, props = {}, ...children) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}
function speakerSelect(line, row) {
  const select = el('select', { onchange: () => { line.who = select.value; row.classList.toggle('dev', line.who === 'dev'); changed(); } },
    ...Object.entries(fr.speakers).map(([who, name]) => el('option', { value: who, textContent: name, selected: who === line.who })));
  return select;
}
function textArea(line, lang) {
  return el('textarea', {
    value: line[lang], rows: 2, placeholder: lang.toUpperCase(),
    oninput: e => { line[lang] = e.target.value; changed(); },
    onkeydown: e => { if (e.key === 'Enter') e.preventDefault(); }, // une réplique tient sur une ligne du fichier
  });
}
function insertLine(lines, at) {
  lines.splice(at, 0, { who: lines[at - 1]?.who === 'dev' ? 'tc' : 'dev', fr: '', en: '' });
  changed(); render();
  root.querySelectorAll(`[data-scene="${lines.key}"] textarea`)[at * 2]?.focus();
}
function lineRow(lines, i) {
  const line = lines[i], row = el('div', { className: 'line' + (line.who === 'dev' ? ' dev' : '') });
  row.append(speakerSelect(line, row), textArea(line, 'fr'), textArea(line, 'en'), el('div', { className: 'tools' },
    el('button', { textContent: '+', title: 'Insérer une réplique dessous', onclick: () => insertLine(lines, i + 1) }),
    el('button', { className: 'del', textContent: '✕', title: 'Supprimer la réplique', onclick: () => { lines.splice(i, 1); changed(); render(); } })));
  return row;
}
function render() {
  root.replaceChildren();
  STORY_CHAPTERS.forEach((id, n) => {
    root.append(el('h2', { textContent: `Chapitre ${n + 1} · ${fr.arenas[id]}` }));
    for (const part in PARTS) {
      const lines = scenes[id][part];
      lines.key = id + '-' + part;
      const block = el('section', {}, el('h3', { textContent: `${PARTS[part]} · ${lines.length} répliques` }),
        el('div', { className: 'cols' }, el('span', { textContent: 'Personnage' }), el('span', { textContent: 'Français' }), el('span', { textContent: 'Anglais' })));
      block.dataset.scene = lines.key;
      lines.forEach((_, i) => block.append(lineRow(lines, i)));
      block.append(el('button', { className: 'add', textContent: '+ Ajouter une réplique', onclick: () => insertLine(lines, lines.length) }));
      root.append(block);
    }
  });
}

function payload(lang) {
  const out = {};
  for (const id in scenes) {
    out[id] = {};
    for (const part in scenes[id]) out[id][part] = scenes[id][part].map(l => [l.who, l[lang]]);
  }
  return out;
}
saveBtn.onclick = async () => {
  saveBtn.disabled = true; setStatus('Enregistrement…');
  const res = await fetch('/__dialogues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fr: payload('fr'), en: payload('en') }) });
  if (res.ok) setStatus('Enregistré dans fr.js et en.js', 'ok');
  else { saveBtn.disabled = false; setStatus(await res.text(), 'err'); }
};

render();
