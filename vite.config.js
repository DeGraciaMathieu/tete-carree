import { defineConfig } from 'vite';

// itch.io sert le jeu dans une iframe depuis un sous-dossier de son CDN : chemins relatifs obligatoires.
export default defineConfig({
  base: './',
});
