import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { replaceScenes } from '../scripts/dialogues.mjs';
import { LANGS } from '../src/i18n/index.js';

test('l\'éditeur de dialogues réécrit fr.js et en.js à l\'identique quand rien ne change', () => {
  for (const l in LANGS) {
    const source = readFileSync(new URL(`../src/i18n/${l}.js`, import.meta.url), 'utf8');
    assert.equal(replaceScenes(source, LANGS[l].scenes), source, l);
  }
});

test('une réplique avec apostrophe ou antislash se relit telle quelle', async () => {
  const scenes = { chinatown: { intro: [['dev', 'L\'arène \\ ok']], outro: [['tc', 'Fin']] } };
  const source = replaceScenes('export default {\n  scenes: {\n  },\n};\n', scenes);
  const { default: read } = await import('data:text/javascript,' + encodeURIComponent(source));
  assert.deepEqual(read.scenes, scenes);
});
