import { defineConfig } from 'vite';
import { dialoguesPlugin } from './scripts/dialogues.mjs';

// itch.io sert le jeu dans une iframe depuis un sous-dossier de son CDN : chemins relatifs obligatoires.
export default defineConfig({
  base: './',
  plugins: [dialoguesPlugin()],
});
