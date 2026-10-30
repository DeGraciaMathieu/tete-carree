// Thèmes des arènes : couleurs du sol, des murs, des caisses de plan, du vide et du mini-plan (couleurs seules, aucun dessin).
// `marks` : motif du sol (fissures, flaques, traces de pas, taches d'humidité, traces de pneus).
// `void.kind` : crevasse (`pit`), eau (`water`) ou barbelés au ras du sol (`wire`).
const BETON = {
  floor: { base: '#b3b6af', check: 'rgba(0,0,0,.035)', joint: 'rgba(0,0,0,.07)', speckDark: 'rgba(0,0,0,.06)', speckLight: 'rgba(255,255,255,.08)', marks: 'cracks', mark: 'rgba(40,40,36,.18)', marking: true },
  wall: { top: '#596166', light: '#737c81', side: '#4c5357', face: '#3c4245' },
  shadow: 'rgba(30,32,30,.16)',
  crate: { face: '#8f6639', line: '#6a4a28', top: '#b98c55', slat: '#a57a46', rim: '#7d5a31' },
  void: { kind: 'pit', bg: '#0c0d0e' },
  map: ['#8d918a', '#596166', '#b98c55', '#0c0d0e'],
};
const THEMES = {
  beton: BETON,
  chinatown: {
    floor: { base: '#2c2b31', check: 'rgba(255,255,255,.02)', joint: 'rgba(0,0,0,.25)', speckDark: 'rgba(0,0,0,.12)', speckLight: 'rgba(255,255,255,.04)', marks: 'puddles', mark: 'rgba(0,0,0,.2)', marking: false },
    wall: { top: '#7c3029', light: '#9b3b33', side: '#4e201c', face: '#5e2723' },
    shadow: 'rgba(0,0,0,.28)',
    crate: { face: '#6a4f30', line: '#4e3a22', top: '#8a6a42', slat: '#7a5c38', rim: '#5e4527' },
    void: BETON.void,
    map: ['#3a3940', '#7c3029', '#8a6a42', '#0c0d0e'],
  },
  siberie: {
    floor: { base: '#dfe5ea', check: 'rgba(40,60,90,.025)', joint: 'rgba(40,60,90,.05)', speckDark: 'rgba(60,80,110,.08)', speckLight: 'rgba(255,255,255,.5)', marks: 'tracks', mark: '#c3cbd2', marking: false },
    wall: { top: '#eef3f6', light: '#ffffff', side: '#c9d3da', face: '#5b4634' },
    shadow: 'rgba(60,80,110,.16)',
    crate: { face: '#3a3f45', line: '#2a2e33', top: '#4a4f55', slat: '#43484e', rim: '#2f3338' },
    void: { kind: 'wire', bg: '#dfe5ea', wire: '#3a3f45', post: '#5b4634' },
    map: ['#dfe5ea', '#5b4634', '#4a4f55', '#3a3f45'],
  },
  egouts: {
    floor: { base: '#4f5a52', check: 'rgba(0,0,0,.05)', joint: 'rgba(0,0,0,.14)', speckDark: 'rgba(0,0,0,.12)', speckLight: 'rgba(200,220,190,.06)', marks: 'stains', mark: 'rgba(30,45,35,.35)', marking: false },
    wall: { top: '#5f5045', light: '#76655a', side: '#4a3e35', face: '#3e3229' },
    shadow: 'rgba(0,0,0,.25)',
    crate: { face: '#5c4f36', line: '#45392a', top: '#7a6a4a', slat: '#6c5d40', rim: '#55482f' },
    void: { kind: 'water', bg: '#2f4a3c', lip: '#1d2420', rim: '#3a4a40' },
    map: ['#5d685f', '#4b3d33', '#7a6a4a', '#2f4a3c'],
  },
  militaire: {
    floor: { base: '#a8946c', check: 'rgba(0,0,0,.03)', joint: 'rgba(0,0,0,.05)', speckDark: 'rgba(60,40,20,.1)', speckLight: 'rgba(255,240,200,.1)', marks: 'tyres', mark: 'rgba(80,60,40,.25)', marking: false },
    wall: { top: '#6a7a44', light: '#7f9055', side: '#56643a', face: '#4b5730' },
    shadow: 'rgba(40,30,20,.18)',
    crate: { face: '#5e4527', line: '#47331c', top: '#7a5a34', slat: '#6b4e2d', rim: '#523c22' },
    void: BETON.void,
    map: ['#a8946c', '#5d6b3a', '#7a5a34', '#0c0d0e'],
  },
};
// Thème d'une arène : le sien s'il existe, sinon le béton des arènes d'origine.
export function themeOf(id) { return THEMES[id] || BETON; }
