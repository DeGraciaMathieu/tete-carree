// Décisions du pilote sur les écrans de choix, sans DOM ni état : carte gardée, relance, bannissement, achats.
// `r` : tirage entre 0 et 1 du pilote (départage les cartes de même poids).

// Poids d'une carte pour un profil : pacte ou pacte majeur refusé tout en bas, sinon poids du profil (1 par défaut).
export function cardScore(m, profile, r) {
  const c = profile.cards;
  if ((m.rar === 'p' && !c.pacts) || (m.rar === 'm' && !c.majors)) return -100 + r;
  return (c.weights[m.id] ?? 1) + r * c.jitter;
}
export function bestIndex(scores) {
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  return best;
}
// Relance : la meilleure carte pèse moins que le seuil du profil, et la relance laisse sa réserve de pièces.
export function wantsReroll(bestScore, profile, money, cost) {
  return !!profile.reroll && bestScore < profile.reroll.below && money - cost >= profile.reroll.reserve;
}
// Carte à bannir : la première de poids négatif (jamais un pacte refusé, déjà écarté par son poids).
export function banIndex(cards, profile) {
  if (!profile.ban) return -1;
  return cards.findIndex(m => (profile.cards.weights[m.id] ?? 1) < 0);
}
// Achats au Comptoir : caisses non vendues dont la famille plaît au profil, de la plus aimée à la moins aimée, tant
// que la bourse garde sa réserve. price(item) : prix payé (remise comprise). Renvoie les indices dans l'ordre d'achat.
export function shopPicks(stall, sold, profile, money, price) {
  if (!profile.shop) return [];
  const fams = profile.shop.fams, order = stall.map((s, i) => i)
    .filter(i => !sold[i] && (fams[stall[i].item.fam] || 0) > 0)
    .sort((a, b) => fams[stall[b].item.fam] - fams[stall[a].item.fam]);
  const out = [];
  for (const i of order) {
    const p = price(stall[i].item);
    if (money - p >= profile.shop.reserve) { out.push(i); money -= p; }
  }
  return out;
}
