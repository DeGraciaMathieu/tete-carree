// Pictogrammes SVG des caisses du Comptoir, posés sur la face de la caisse (contour sombre comme en jeu).
const INK = 'stroke="#17191a" stroke-width="2.4" stroke-linejoin="round"';
const LIGHT = '#eef0ea';
const P = {
  heal: `<path d="M11 4h8v7h7v8h-7v7h-8v-7H4v-8h7z" fill="${LIGHT}" ${INK}/>`,
  blood: `<path d="M15 4q8 10 8 15a8 8 0 0 1-16 0q0-5 8-15z" fill="#d0352c" ${INK}/>`,
  splint: `<g ${INK}><rect x="6" y="5" width="5" height="20" fill="${LIGHT}"/><rect x="19" y="5" width="5" height="20" fill="${LIGHT}"/><path d="M8 12h14M8 18h14" stroke-width="3"/></g>`,
  calm: `<g ${INK} fill="none"><path d="M5 15h5l3-7 4 14 3-7h5" stroke="${LIGHT}" stroke-width="3.5"/><path d="M5 15h5l3-7 4 14 3-7h5"/></g>`,
  lure: `<g ${INK}><path d="M15 4v10" stroke-width="2.4"/><path d="M9 14h12l-2 12h-8z" fill="${LIGHT}"/></g>`,
  vest: `<path d="M9 4l6 3 6-3 4 5-2 4v13H7V13L5 9z" fill="${LIGHT}" ${INK}/>`,
  roll: `<circle cx="15" cy="15" r="9" fill="none" stroke="${LIGHT}" stroke-width="4"/><path d="M15 6h5l-2 4" fill="none" ${INK}/>`,
  patch: `<g ${INK}><rect x="5" y="10" width="20" height="10" rx="3" fill="${LIGHT}"/><path d="M12 13v4M18 13v4"/></g>`,
  ammo: `<g ${INK} fill="${LIGHT}"><path d="M7 12q2-6 4 0v14H7z"/><path d="M13 12q2-6 4 0v14h-4z"/><path d="M19 12q2-6 4 0v14h-4z"/></g>`,
  crate: `<g ${INK}><rect x="5" y="9" width="20" height="16" fill="#c9a64a"/><path d="M5 14h20M15 9v16"/></g>`,
  bullet: `<path d="M13 4h4l1 6v16h-6V10z" fill="#f2c230" ${INK}/><path d="M12 14h6" stroke="#17191a" stroke-width="2"/>`,
  mag: `<g ${INK}><path d="M10 4h10l-2 22h-6z" fill="${LIGHT}"/><path d="M11 10h8M11 16h7"/></g>`,
  scope: `<g ${INK} fill="none"><circle cx="15" cy="15" r="9" stroke="${LIGHT}" stroke-width="4"/><path d="M15 3v8M15 19v8M3 15h8M19 15h8"/></g>`,
  fuse: `<path d="M6 24q6-2 8-8t10-10" fill="none" stroke="${LIGHT}" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="6" r="3.5" fill="#f2c230" ${INK}/>`,
  boost: `<g ${INK}><path d="M15 4l9 10h-5v12h-8V14H6z" fill="${LIGHT}"/></g>`,
  skull: `<path d="M15 4c6 0 9 4 9 9 0 3-2 5-3 6v4H9v-4c-1-1-3-3-3-6 0-5 3-9 9-9z" fill="${LIGHT}" ${INK}/><circle cx="11" cy="13" r="2.2" fill="#17191a"/><circle cx="19" cy="13" r="2.2" fill="#17191a"/>`,
  dig: `<g ${INK}><path d="M8 22l10-10" stroke="${LIGHT}" stroke-width="4"/><path d="M15 6l9 9-4 2-7-7z" fill="${LIGHT}"/><ellipse cx="9" cy="23" rx="5" ry="3" fill="#e8b23a"/></g>`,
  coins: `<g ${INK}><ellipse cx="12" cy="18" rx="7" ry="5" fill="#e8b23a"/><ellipse cx="18" cy="12" rx="7" ry="5" fill="#e8b23a"/></g>`,
  scout: `<g ${INK} fill="${LIGHT}"><circle cx="10" cy="15" r="5"/><circle cx="20" cy="15" r="5"/><path d="M15 13v3"/></g>`,
  contract: `<g ${INK}><path d="M8 4h11l4 4v18H8z" fill="${LIGHT}"/><path d="M11 12h9M11 17h9M11 22h5"/></g>`,
  bait: `<g ${INK}><path d="M8 5h14v6l-4 3v11h-6V14l-4-3z" fill="${LIGHT}"/><path d="M10 9h10"/></g>`,
  repel: `<g ${INK}><path d="M11 4h8v5l3 4v13H8V13l3-4z" fill="${LIGHT}"/><path d="M8 17h14"/></g>`,
};
const ICON = {
  trousse: 'heal', poche: 'blood', attelle: 'splint', sangfroid: 'calm', leurre: 'lure', pistolet: 'ammo',
  gilet: 'vest', roulade: 'roll', rustine: 'patch', chargeur: 'ammo', plein: 'crate', livraison: 'crate',
  lourdes: 'bullet', grandchargeur: 'mag', lunette: 'scope', meche: 'fuse', depart: 'boost', tete: 'skull',
  fouille: 'dig', collantes: 'coins', eclaireur: 'scout', contrat: 'contract', appat: 'bait', repulsif: 'repel',
};
export function shopIcon(id) { return `<svg viewBox="0 0 30 30" aria-hidden="true">${P[ICON[id]]}</svg>`; }
