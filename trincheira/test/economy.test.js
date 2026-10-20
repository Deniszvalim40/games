const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../logic.js');
const pick = (o, ks) => Object.fromEntries(ks.map(k => [k, o[k]]));

test('buy spawns at base heading to first trench', () => {
  const s = T.createGame('campo', 'soldado', 1);
  assert.equal(T.buy(s, 'p', 'fuzileiro'), true);
  assert.equal(s.money.p, 100);
  assert.deepEqual(pick(s.units[0], ['side', 'x', 'at', 'target', 'hp']), { side: 'p', x: 0, at: -1, target: 0, hp: 100 });
  T.buy(s, 'e', 'fuzileiro');
  assert.deepEqual(pick(s.units[1], ['x', 'at', 'target']), { x: 1000, at: 3, target: 2 });
});

test('buy refused without money', () => {
  const s = T.createGame('campo', 'soldado', 1);
  s.money.p = 40;
  assert.equal(T.buy(s, 'p', 'fuzileiro'), false);
  assert.equal(s.money.p, 40);
  assert.equal(s.units.length, 0);
});

test('buy refused at 30 alive', () => {
  const s = T.createGame('campo', 'soldado', 1);
  s.money.p = 1e6;
  for (let i = 0; i < 30; i++) assert.equal(T.buy(s, 'p', 'fuzileiro'), true);
  const m = s.money.p;
  assert.equal(T.buy(s, 'p', 'fuzileiro'), false);
  assert.equal(s.money.p, m);
  assert.equal(T.alive(s, 'p'), 30);
});

test('buy refused after game over', () => {
  const s = T.createGame('campo', 'soldado', 1);
  s.over = 'e';
  assert.equal(T.buy(s, 'p', 'fuzileiro'), false);
});

test('income per second with difficulty multiplier', () => {
  const s = T.createGame('campo', 'general', 1);
  s.ai.cd = Infinity;
  for (let i = 0; i < 600; i++) T.step(s, 1 / 60);
  assert.ok(Math.abs(s.money.p - 250) < 1e-6, s.money.p);
  assert.ok(Math.abs(s.money.e - 310) < 1e-6, s.money.e);
});
