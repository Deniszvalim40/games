const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../logic.js');
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('points per win by difficulty', () => {
  assert.deepEqual(T.DIFFS.map(d => T.POINTS[d.id]), [1, 2, 4, 7]);
});

test('four upgrade branches, 10 levels, cost 1 then 2', () => {
  assert.deepEqual(T.UPGRADES.map(u => u.id), ['vida', 'base', 'dano', 'cadencia']);
  assert.equal(T.UPGRADE_MAX, 10);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(T.upgradeCost), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
  assert.equal(T.upgradeCost(10), Infinity);
});

test('upgrades only boost the player, 5% per level', () => {
  const s = T.createGame('campo', 'soldado', 1, { vida: 2, base: 4, dano: 10, cadencia: 1 });
  s.ai.cd = Infinity;
  assert.equal(s.bases.p.hp, 1200); assert.equal(s.bases.p.max, 1200);
  assert.equal(s.bases.e.hp, 1000);
  s.money.e = 1000;
  T.buy(s, 'p', 'fuzileiro'); T.buy(s, 'e', 'fuzileiro');
  const [p, e] = s.units;
  assert.ok(near(p.hp, 110) && near(p.max, 110), p.hp);
  assert.equal(e.hp, 100);
  // dano 1.5x, sem cobertura: alvo fora de trincheira
  p.x = 500; p.at = 0; p.target = 1; e.x = 600; e.at = 2; e.target = 1;
  T.step(s, 1 / 60);
  assert.ok(near(e.hp, 100 - 12 * 1.5), e.hp);
  assert.ok(near(p.cd, 1 / 1.05), p.cd);
});

test('no upgrades argument means no bonus', () => {
  const s = T.createGame('campo', 'soldado', 1);
  assert.equal(s.bases.p.hp, 1000);
  T.buy(s, 'p', 'fuzileiro');
  assert.equal(s.units[0].hp, 100);
});
