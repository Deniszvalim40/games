const test = require('node:test'), assert = require('node:assert/strict');
const { T } = require('./util.js');

const full = { vida: 10, base: 10, dano: 10, cadencia: 10 };

test('prestige is available only with the whole tree at level 10', () => {
  assert.equal(T.treeDone(full), true);
  assert.equal(T.treeDone({ ...full, cadencia: 9 }), false);
  assert.equal(T.treeDone({}), false);
  assert.equal(T.treeDone(null), false);
});

test('each prestige gives +3% player income, forever', () => {
  assert.equal(T.PRESTIGE_STEP, 0.03);
  const s0 = T.createGame('campo', 'soldado', 1), s2 = T.createGame('campo', 'soldado', 1, { prestigio: 2 });
  s0.ai.cd = s2.ai.cd = Infinity;
  for (let i = 0; i < 60; i++) { T.step(s0, 1 / 60); T.step(s2, 1 / 60); }
  assert.ok(Math.abs((s0.money.p - 150) - 10) < 1e-6);
  assert.ok(Math.abs((s2.money.p - 150) - 10.6) < 1e-6);
  assert.ok(Math.abs(s0.money.e - s2.money.e) < 1e-9); // computador não ganha nada
});
