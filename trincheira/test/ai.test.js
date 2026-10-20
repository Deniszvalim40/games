const test = require('node:test'), assert = require('node:assert/strict');
const { T, game, place, run } = require('./util.js');

test('AI advances when clearly stronger', () => {
  const s = game();
  s.money.e = 0;
  const squad = [1, 2, 3, 4, 5, 6].map(() => place(s, 'e', 'fuzileiro', 2)); // soldado: minTropa 6
  T.aiThink(s);
  squad.forEach(u => assert.equal(u.target, 1));
});

test('AI holds when weaker', () => {
  const s = game();
  s.money.e = 0;
  const squad = [1, 2, 3, 4].map(() => place(s, 'e', 'fuzileiro', 2));
  for (let i = 0; i < 6; i++) place(s, 'p', 'metralhador', 1);
  T.aiThink(s);
  squad.forEach(u => assert.equal(u.target, 2));
});

test('AI retreats from a lost fight in its trench', () => {
  const s = game();
  s.money.e = 0;
  const u = place(s, 'e', 'fuzileiro', 1);
  for (let i = 0; i < 4; i++) place(s, 'p', 'metralhador', 1);
  T.aiThink(s);
  assert.equal(u.target, 2);
});

test('veterano answers machine guns with granadeiros', () => {
  const s = game('campo', 'veterano');
  for (let i = 0; i < 3; i++) place(s, 'p', 'metralhador', 0);
  s.money.e = 1000;
  T.aiThink(s);
  assert.equal(s.units[s.units.length - 1].type, 'granadeiro');
});

test('AI never overspends', () => {
  const s = T.createGame('campo', 'general', 3);
  for (let i = 0; i < 300 * 60 && !s.over; i++) { T.step(s, 1 / 60); assert.ok(s.money.e >= 0); }
});

test('same seed gives same game', () => {
  const snap = () => { const s = T.createGame('colinas', 'general', 42); run(s, 200);
    return JSON.stringify([s.units, s.money, s.bases, s.trenches, s.over]); };
  assert.equal(snap(), snap());
});

test('general beats an idle player', () => {
  const s = T.createGame('campo', 'general', 1);
  for (let i = 0; i < 900 * 60 && !s.over; i++) T.step(s, 1 / 60);
  assert.equal(s.over, 'e');
});

// Jogador simples: compra sem parar (2 fuzileiros para 1 metralhador) e só avança com o grupo
// todo parado e pelo menos n soldados.
function simplePlayer(n) {
  return s => {
    const t = T.alive(s, 'p') % 3 === 2 ? 'metralhador' : 'fuzileiro';
    if (s.money.p >= T.UNITS[t].custo) T.buy(s, 'p', t);
    const P = s.units.filter(u => u.side === 'p');
    if (P.length >= n && P.every(u => u.at === u.target)) T.order(s, 'p', 1);
  };
}
function playAll(diff) {
  let wins = 0, games = 0;
  for (const map of T.MAPS.map(m => m.id)) for (let seed = 1; seed <= 4; seed++) {
    const s = T.createGame(map, diff, seed), bot = simplePlayer(6);
    for (let sec = 0; sec < 900 && !s.over; sec++) { bot(s); run(s, 1); }
    games++; if (s.over === 'p') wins++;
  }
  return wins / games;
}

test('recruta is beatable by a simple player', () => {
  assert.ok(playAll('recruta') >= 0.9);
});

test('general is much harder than recruta for the same player', () => {
  assert.ok(playAll('general') <= 0.3);
});
