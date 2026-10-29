// Classement personnel : les meilleures parties, par score décroissant.

// Renvoie le nouveau classement (au plus max parties) une fois la partie run jouée.
// À score égal, la partie la plus ancienne reste devant.
export function rankRun(top, run, max) {
  let at = top.findIndex(r => run.score > r.score);
  if (at < 0) at = top.length;
  return [...top.slice(0, at), run, ...top.slice(at)].slice(0, max);
}
