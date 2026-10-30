// Décors élaborés des arènes des chapitres : un module par arène, qui peint son sol, dessine ses objets
// et ses lumières. Une arène sans décor garde le rendu générique des tuiles (render/scene.js).
import * as chinatown from './decor/chinatown.js';
import * as siberie from './decor/siberie.js';

const DECOR = { chinatown, siberie };
export function decorOf(id) { return DECOR[id] || null; }
