const test = require('node:test'), assert = require('node:assert/strict');
const { T, game, place, run } = require('./util.js');

test('sniper costs 300 and is the 4th buy option', () => {
  assert.equal(T.UNITS.sniper.custo, 300);
  assert.deepEqual(T.UNIT_ORDER, ['fuzileiro', 'metralhador', 'granadeiro', 'sniper']);
});

test('sniper walks to the first trench even with enemies in sight', () => {
  const s = game();
  place(s, 'e', 'fuzileiro', 2, { hp: 1e9 });
  s.money.p = 300;
  T.buy(s, 'p', 'sniper');
  run(s, 15);
  const u = s.units.find(u => u.type === 'sniper');
  assert.equal(u.at, 0);
  assert.equal(u.x, 250);
});

test('sniper ignores advance and retreat orders', () => {
  const s = game();
  const u = place(s, 'p', 'sniper', 0);
  s.trenches.forEach(t => t.owner = 'p');
  T.order(s, 'p', 1);
  assert.equal(u.target, 0);
  T.order(s, 'p', -1);
  assert.equal(u.target, 0);
});

test('sniper hits an enemy soldier across the whole map', () => {
  const s = game();
  place(s, 'p', 'sniper', 0);
  const e = place(s, 'e', 'fuzileiro', 2, { x: 960, at: 3, target: 3 }); // fora de trincheira
  T.step(s, 1 / 60);
  assert.equal(e.hp, 100 - T.UNITS.sniper.dano);
});

test('sniper never shoots the enemy base', () => {
  const s = game();
  const u = place(s, 'p', 'sniper', 0);
  u.at = u.target = 3; u.x = 970; // mesmo se estivesse colado na base
  T.step(s, 1 / 60);
  assert.equal(s.bases.e.hp, 1000);
});

test('AI never buys snipers', () => {
  const s = T.createGame('campo', 'general', 5);
  for (let i = 0; i < 400 * 60 && !s.over; i++) T.step(s, 1 / 60);
  assert.ok(!s.units.some(u => u.side === 'e' && u.type === 'sniper'));
});
