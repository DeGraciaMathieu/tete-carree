// Classements personnels : les meilleures parties du mode Arène (par score) et du mode Histoire.

// Renvoie le nouveau classement (au plus max parties) une fois la partie run jouée.
// À score égal, la partie la plus ancienne reste devant.
export function rankRun(top, run, max) {
  let at = top.findIndex(r => run.score > r.score);
  if (at < 0) at = top.length;
  return [...top.slice(0, at), run, ...top.slice(at)].slice(0, max);
}
// Classement du mode Histoire : le chapitre atteint d'abord (une histoire terminée, won, passe devant tout),
// le score ensuite ; à égalité complète, la partie la plus ancienne reste devant.
const progress = r => r.won ? Infinity : r.chapter || 0;
export function rankStoryRun(top, run, max) {
  let at = top.findIndex(r => progress(run) > progress(r) || (progress(run) === progress(r) && run.score > r.score));
  if (at < 0) at = top.length;
  return [...top.slice(0, at), run, ...top.slice(at)].slice(0, max);
}
