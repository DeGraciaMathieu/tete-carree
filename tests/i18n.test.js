import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODS, W } from '../src/config.js';
import { isPact } from '../src/rules/cards.js';
import { LANGS } from '../src/i18n/index.js';

const { fr, en } = LANGS;
const broken = s => typeof s !== 'string' || !s || /undefined|NaN|null/.test(s);

test('le français et l\'anglais ont exactement les mêmes textes', () => {
  const keys = d => Object.keys(d).sort();
  assert.deepEqual(keys(fr), keys(en));
  for (const k of ['weapons', 'rar', 'rarGroups', 'cards', 'waveIntro']) assert.deepEqual(keys(fr[k]), keys(en[k]), k);
});

test('chaque carte se lit dans les deux langues, à chacun de ses niveaux', () => {
  for (const l in LANGS) for (const m of MODS) {
    const c = LANGS[l].cards[m.id];
    assert.ok(c && !broken(c.name) && !broken(c.short), `${l} ${m.id}`);
    for (let n = 1; n <= m.max; n++) {
      if (isPact(m)) assert.ok(!broken(c.plus(n)) && !broken(c.minus(n)), `${l} ${m.id} niveau ${n}`);
      else assert.ok(!broken(c.desc(n)), `${l} ${m.id} niveau ${n}`);
    }
  }
});

test('chaque arme et chaque rareté ont un nom dans les deux langues', () => {
  for (const l in LANGS) {
    for (const w of W) assert.ok(!broken(LANGS[l].weapons[w.id]?.name) && !broken(LANGS[l].weapons[w.id]?.short), `${l} ${w.id}`);
    for (const r of ['c', 'r', 'l', 'p', 'm']) assert.ok(!broken(LANGS[l].rar[r]) && !broken(LANGS[l].rarGroups[r]), `${l} ${r}`);
  }
});

test('chaque texte fixe de la page existe dans les deux langues', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-html|-aria)?="(\w+)"/g)].map(m => m[1]);
  assert.ok(keys.length > 40);
  for (const l in LANGS) for (const k of keys) assert.ok(!broken(LANGS[l][k]), `${l} ${k}`);
});
