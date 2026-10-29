// Petits utilitaires partagés : accès DOM, aléa cosmétique, bornage, format des nombres.
import { tr } from './i18n/index.js';

export const $ = id => document.getElementById(id);
export const rnd = (a = 1) => (Math.random() * 2 - 1) * a; // cosmétique uniquement
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const fmt = n => Math.floor(n).toLocaleString(tr.locale);
