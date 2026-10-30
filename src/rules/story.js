// Mode Histoire : quel chapitre se joue à quelle vague, quand un chapitre et l'histoire se terminent.
// Chapitres numérotés de 0 à 3 ici, de 1 à 4 à l'écran.
import { STORY_CHAPTERS, STORY_WAVES } from '../config.js';

// Chapitre d'une vague ; la pause avant la vague 1 (wave = 0) appartient au premier chapitre.
export function chapterOf(wave) { return Math.min(STORY_CHAPTERS.length - 1, Math.max(0, Math.ceil(wave / STORY_WAVES) - 1)); }
export function chapterArena(i) { return STORY_CHAPTERS[i]; }
// Vrai si cette vague est la dernière de son chapitre.
export function endsChapter(wave) { return wave > 0 && wave % STORY_WAVES === 0; }
// Vrai si cette vague est la dernière de l'histoire.
export function endsStory(wave) { return wave >= STORY_CHAPTERS.length * STORY_WAVES; }
