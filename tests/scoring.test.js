import { test } from 'vitest';
import assert from 'node:assert/strict';
import { killPoints, soifHeal, rollDrop, waveBonus, potsKill, potAfterHit, rollCoins, waveCoins, coinLife, coinBlink, coinWorth, coinHeal, coinsLostOnHit, insuranceFee, casinoPurse } from '../src/rules/scoring.js';
import { createRng } from '../src/rules/rng.js';

const fixed = (...values) => () => values.shift();

test('un zombie rapporte 50 points, multipliés par le combo', () => {
  assert.equal(killPoints('z', {}, 1), 50);
  assert.equal(killPoints('z', {}, 3), 150);
});

test('Chair à canon double les points des Gonflés, et seulement les leurs', () => {
  assert.equal(killPoints('b', { chair: 1 }, 1), 200);
  assert.equal(killPoints('z', { chair: 1 }, 1), 50);
});

test('Prime de risque ajoute 50 % de points sur chaque kill', () => {
  assert.equal(killPoints('a', { prime: 1 }, 1), 300);
});

test('Soif de sang ne soigne qu\'à partir de ×3', () => {
  assert.equal(soifHeal({ soif: 2 }, 2), 0);
  assert.equal(soifHeal({ soif: 2 }, 3), 2);
  assert.equal(soifHeal({}, 5), 0);
});

test('un blindé lâche une caisse une fois sur quatre, jamais au-dessus d\'une crevasse', () => {
  assert.equal(rollDrop('a', false, fixed(.24, .3)), 'hp');
  assert.equal(rollDrop('a', false, fixed(.24, .7)), 'ammo');
  assert.equal(rollDrop('a', false, fixed(.26)), null);
  assert.equal(rollDrop('a', true, fixed(.01)), null);
});

test('Quitte ou double double les points de chaque kill', () => {
  assert.equal(killPoints('z', { quitte: 1 }, 2), 200);
});

test('Vampire : chaque kill rend 1 PV, et Soif de sang agit dès ×1', () => {
  assert.equal(soifHeal({ vampire: 1 }, 1), 1);
  assert.equal(soifHeal({ vampire: 1, soif: 2 }, 1), 3);
});

test('Une seule vie : chaque kill et le bonus de fin de vague rapportent trois fois plus', () => {
  assert.equal(killPoints('z', { unevie: 1 }, 2), 300);
  assert.equal(waveBonus(4, {}), 1000);
  assert.equal(waveBonus(4, { unevie: 1 }), 3000);
});

test('Une seule vie : un ennemi ne lâche plus que des caisses de munitions', () => {
  assert.equal(rollDrop('a', false, fixed(0, 0), {}), 'hp');
  assert.equal(rollDrop('a', false, fixed(0, 0), { unevie: 1 }), 'ammo');
});

test('Sablier : chaque kill rapporte deux fois plus', () => {
  assert.equal(killPoints('r', { sablier: 1 }, 1), 150);
});

test('Élite : chaque kill rapporte trois fois plus', () => {
  assert.equal(killPoints('z', { elite: 1 }, 1), 150);
});

test('Tout ou rien : pendant une vague, les points des kills attendent dans la cagnotte, donc les armes ne se débloquent qu\'à la fin', () => {
  assert.equal(potsKill({ toutourien: 1 }, true), true);
  assert.equal(potsKill({ toutourien: 1 }, false), false);
  assert.equal(potsKill({}, true), false);
});

test('Tout ou rien : un coup encaissé vide la cagnotte', () => {
  assert.equal(potAfterHit({ toutourien: 1 }, 4200), 0);
  assert.equal(potAfterHit({}, 4200), 4200);
});

test('Silence : chaque kill rapporte deux fois plus', () => {
  assert.equal(killPoints('z', { silence: 1 }, 1), 100);
});

test('un Blindé abattu lâche toujours 5 pièces', () => {
  const rng = createRng(3);
  for (let k = 0; k < 100; k++) assert.equal(rollCoins('a', false, rng), 5);
});

test('un zombie lâche une pièce environ une fois sur trois', () => {
  const rng = createRng(11);
  let coins = 0;
  for (let k = 0; k < 10000; k++) coins += rollCoins('z', false, rng);
  assert.ok(coins > 2700 && coins < 3300, coins);
});

test('un ennemi tué au-dessus du vide ne lâche aucune pièce', () => {
  assert.equal(rollCoins('a', true, fixed(0)), 0);
});

test('la fin de la vague 6 rapporte 6 pièces', () => {
  assert.equal(waveCoins(6), 6);
});

test('sous Tout ou rien, les pièces ramassées pendant la vague sont en jeu et un coup encaissé les fait perdre', () => {
  assert.equal(potsKill({ toutourien: 1 }, true), true);
  assert.equal(potAfterHit({ toutourien: 1 }, 7), 0);
  assert.equal(potsKill({ toutourien: 1 }, false), false); // pendant la pause, elles vont droit dans la bourse
});

test('Fouille : un zombie lâche une pièce environ une fois sur deux', () => {
  const rng = createRng(11);
  let coins = 0;
  for (let k = 0; k < 10000; k++) coins += rollCoins('z', false, rng, { fouille: 1 });
  assert.ok(coins > 4700 && coins < 5300, coins);
});

// Cartes du butin
const coinsOver = (type, mods, buffs, n = 10000, seed = 11) => {
  const rng = createRng(seed);
  let total = 0;
  for (let k = 0; k < n; k++) total += rollCoins(type, false, rng, buffs, mods);
  return total;
};

test('Pillard : un zombie lâche une pièce environ 4 fois sur 10', () => {
  const coins = coinsOver('z', { pillard: 1 });
  assert.ok(coins > 3700 && coins < 4300, coins);
});

test('Pillard : la chance ne dépasse jamais 100 %', () => {
  assert.equal(coinsOver('a', { pillard: 3 }, {}, 100), 500); // un Blindé lâche déjà toujours ses 5 pièces
});

test('Pillard et Fouille se cumulent sur les zombies', () => {
  const coins = coinsOver('z', { pillard: 1 }, { fouille: 1 });
  assert.ok(coins > 5700 && coins < 6300, coins);
});

test('sans carte du butin, le tirage des pièces est inchangé pour une même graine', () => {
  assert.equal(coinsOver('z', {}, {}), coinsOver('z', undefined, undefined));
});

test('une pièce reste 6 s au sol, 9 s avec Poches profondes', () => {
  assert.equal(coinLife({}, {}), 6);
  assert.equal(coinLife({ poches: 1 }, {}), 9);
});

test('Poches profondes et Pièces collantes se cumulent', () => {
  assert.equal(coinLife({ poches: 2 }, { collantes: 1 }), 16);
});

test('Sang d\'or : chaque pièce ramassée rend 1 PV', () => {
  assert.equal(coinHeal({ sangdor: 1 }), 1);
  assert.equal(coinHeal({}), 0);
});

test('Midas : une pièce ramassée en vaut deux', () => {
  assert.equal(coinWorth({ midas: 1 }, false), 2);
  assert.equal(coinWorth({}, false), 1);
});

test('Midas : une pièce perdue sous Cupidité ne vaut qu\'une', () => {
  assert.equal(coinWorth({ midas: 1, cupidite: 1 }, true), 1);
});

test('Avarice : un Blindé lâche 10 pièces', () => {
  assert.equal(rollCoins('a', false, fixed(0), {}, { avarice: 1 }), 10);
});

test('Avarice : une pièce ne reste que 3 s au sol et clignote la dernière seconde', () => {
  assert.equal(coinLife({ avarice: 1 }, {}), 3);
  assert.equal(coinBlink({ avarice: 1 }), 1);
});

test('Avarice : la chance de lâcher des pièces ne change pas', () => {
  assert.equal(rollCoins('z', false, fixed(.5), {}, { avarice: 1 }), 0);
});

test('Cupidité : un ennemi qui lâche des pièces en lâche une de plus', () => {
  assert.equal(rollCoins('z', false, fixed(0), {}, { cupidite: 1 }), 2);
  assert.equal(rollCoins('z', false, fixed(.9), {}, { cupidite: 1 }), 0);
});

test('Cupidité : un coup fait perdre 5 pièces, ou toutes s\'il en reste moins', () => {
  assert.equal(coinsLostOnHit({ cupidite: 1 }, 12), 5);
  assert.equal(coinsLostOnHit({ cupidite: 1 }, 3), 3);
});

test('sans Cupidité, un coup ne fait perdre aucune pièce', () => {
  assert.equal(coinsLostOnHit({}, 12), 0);
});

test('Mercenaire : un zombie rapporte 25 points au lieu de 50', () => {
  assert.equal(killPoints('z', { mercenaire: 1 }, 1), 25);
});

test('Mercenaire : chaque ennemi abattu lâche au moins une pièce', () => {
  assert.equal(rollCoins('z', false, fixed(.9), {}, { mercenaire: 1 }), 1);
});

test('Mercenaire : rien ne tombe au-dessus du vide', () => {
  assert.equal(rollCoins('a', true, fixed(0), {}, { mercenaire: 1 }), 0);
});

test('Mercenaire : le bonus de fin de vague est inchangé', () => {
  assert.equal(waveBonus(6, { mercenaire: 1 }), waveBonus(6, {}));
});

// Pactes de la bourse
test('Vœu de pauvreté : plus aucune pièce ne tombe', () => {
  assert.equal(rollCoins('a', false, fixed(0), {}, { pauvrete: 1 }), 0);
});

test('Vœu de pauvreté : la fin de vague ne verse plus de pièces', () => {
  assert.equal(waveCoins(6, { pauvrete: 1 }), 0);
});

test('Cupidité ne prend rien sur une bourse négative', () => {
  assert.equal(coinsLostOnHit({ cupidite: 1 }, -20), 0);
});

test('Assurance : la cotisation prend 15 % de la bourse en fin de vague', () => {
  assert.equal(insuranceFee({ assurance: 1 }, 60), 9);
  assert.equal(insuranceFee({}, 60), 0);
});

test('Monnaie piégée : une pièce ne reste que 4 s au sol, sans clignoter', () => {
  assert.equal(coinLife({ piegee: 1 }, {}), 4);
  assert.equal(coinBlink({ piegee: 1 }), 0);
});

test('Casino : pile, la bourse double', () => {
  assert.equal(casinoPurse({ casino: 1 }, 40, .2), 80);
});

test('Casino : face, elle est divisée par deux, arrondie en dessous', () => {
  assert.equal(casinoPurse({ casino: 1 }, 7, .8), 3);
});

test('Casino : une bourse vide ou négative ne tire rien', () => {
  assert.equal(casinoPurse({ casino: 1 }, 0, .2), 0);
  assert.equal(casinoPurse({ casino: 1 }, -10, .2), -10);
});

test('sans Casino, la bourse ne change pas en fin de vague', () => {
  assert.equal(casinoPurse({}, 40, .2), 40);
});
