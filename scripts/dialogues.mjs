// Éditeur des dialogues du mode Histoire (outil de dev) : `npm run dev`, puis /tools/dialogues.html.
// Le plugin réécrit le bloc `scenes` de src/i18n/fr.js et en.js ; il n'existe pas dans le build publié.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILES = { fr: '../src/i18n/fr.js', en: '../src/i18n/en.js' };
const BLOCK = /^ {2}scenes: \{\n[\s\S]*?^ {2}\},\n/m; // du `scenes: {` au premier `},` de même retrait

const quote = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
const formatLines = lines => '[' + lines.map(([who, text]) => `[${quote(who)}, ${quote(text)}]`).join(', ') + ']';

// Même mise en forme que le fichier écrit à la main : une ligne par ouverture et par fin.
export function formatScenes(scenes) {
  let out = '  scenes: {\n';
  for (const id in scenes) {
    out += `    ${id}: {\n`;
    for (const part in scenes[id]) out += `      ${part}: ${formatLines(scenes[id][part])},\n`;
    out += '    },\n';
  }
  return out + '  },\n';
}
export function replaceScenes(source, scenes) {
  if (!BLOCK.test(source)) throw new Error('bloc scenes introuvable');
  return source.replace(BLOCK, () => formatScenes(scenes));
}

// Mêmes chapitres et parties que le fichier actuel, répliques non vides, personnages identiques en fr et en.
function checkScenes(body, current, speakers) {
  for (const id in current) for (const part in current[id]) {
    const fr = body.fr?.[id]?.[part], en = body.en?.[id]?.[part];
    const where = `${id} ${part}`;
    if (!Array.isArray(fr) || !fr.length || !Array.isArray(en) || en.length !== fr.length) return `${where} : la scène doit garder au moins une réplique, autant en français qu'en anglais`;
    for (let i = 0; i < fr.length; i++) {
      if (!speakers.includes(fr[i][0]) || fr[i][0] !== en[i][0]) return `${where}, réplique ${i + 1} : personnage inconnu ou différent entre les langues`;
      if (!fr[i][1]?.trim() || !en[i][1]?.trim()) return `${where}, réplique ${i + 1} : texte vide`;
    }
  }
  return '';
}
const clean = scenes => Object.fromEntries(Object.entries(scenes).map(([id, parts]) => [id,
  Object.fromEntries(Object.entries(parts).map(([part, lines]) => [part, lines.map(([who, text]) => [who, text.replace(/\s+/g, ' ').trim()])]))]));

export function dialoguesPlugin() {
  return {
    name: 'dialogues',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dialogues', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const reply = (code, msg) => { res.statusCode = code; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(msg); };
        try {
          const body = JSON.parse(raw);
          const { default: fr } = await server.ssrLoadModule('/src/i18n/fr.js');
          const error = checkScenes(body, fr.scenes, Object.keys(fr.speakers));
          if (error) { reply(400, error); return; }
          for (const lang in FILES) {
            const path = fileURLToPath(new URL(FILES[lang], import.meta.url));
            writeFileSync(path, replaceScenes(readFileSync(path, 'utf8'), clean(body[lang])));
          }
          reply(200, 'ok');
        } catch (e) { reply(500, e.message); }
      });
    },
  };
}
