// Langue du jeu : `tr` est le dictionnaire courant (liaison vivante), choisi par le joueur ou d'après le navigateur.
import { STORAGE_LANG } from '../config.js';
import en from './en.js';
import fr from './fr.js';

export const LANGS = { fr, en };
export let lang = 'en';
try { lang = (localStorage.getItem(STORAGE_LANG) || navigator.language || '').startsWith('fr') ? 'fr' : 'en'; } catch (e) {}
export let tr = LANGS[lang];
export function setLang(l) {
  lang = l; tr = LANGS[l];
  try { localStorage.setItem(STORAGE_LANG, l); } catch (e) {}
}
