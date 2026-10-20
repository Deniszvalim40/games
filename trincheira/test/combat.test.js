const test = require('node:test'), assert = require('node:assert/strict');
const { T, game, place, run } = require('./util.js');
const tick = s => T.step(s, 1 / 60);
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('entrenched target takes cover damage', () => {
  const s = game();
  const e = place(s, 'e', 'fuzileiro', 1);
  place(s, 'p', 'fuzileiro', 0, { x: 400, target: 1 });
  tick(s);
  assert.ok(near(e.hp, 100 - 12 * 0.4), e.hp);
});

test('same-trench fight has no cover', () => {
  const s = game();
  const p = place(s, 'p', 'fuzileiro', 1), e = place(s, 'e', 'fuzileiro', 1);
  tick(s);
  assert.equal(p.hp, 88);
  assert.equal(e.hp, 88);
});

test('floresta cover is 0.3', () => {
  const s = game('floresta');
  const e = place(s, 'e', 'fuzileiro', 1);
  place(s, 'p', 'fuzileiro', 0, { x: 320, target: 1 });
  tick(s);
  assert.ok(near(e.hp, 100 - 12 * 0.3), e.hp);
});

test('granadeiro hits all within 40 ignoring cover', () => {
  const s = game();
  const group = [1, 2, 3].map(() => place(s, 'e', 'fuzileiro', 1));
  const far = place(s, 'e', 'fuzileiro', 1, { x: 560 });
  place(s, 'p', 'granadeiro', 0, { x: 380, target: 1 });
  tick(s);
  group.forEach(u => assert.equal(u.hp, 65));
  assert.equal(far.hp, 100);
  assert.ok(s.events.some(ev => ev.tipo === 'explosao'));
});

test('kill pays half the cost and counts', () => {
  const s = game();
  place(s, 'e', 'fuzileiro', 1, { hp: 1 });
  place(s, 'p', 'fuzileiro', 0, { x: 400, target: 1 });
  const before = s.money.p;
  tick(s);
  assert.ok(near(s.money.p - before, 25 + 10 / 60), s.money.p - before);
  assert.equal(s.kills.p, 1);
  assert.equal(s.units.filter(u => u.side === 'e').length, 0);
  assert.ok(s.events.some(ev => ev.tipo === 'morte'));
});

test('base gun shoots nearby enemy', () => {
  const s = game();
  const e = place(s, 'e', 'fuzileiro', 0, { x: 100, at: 1 });
  tick(s);
  assert.equal(e.hp, 92);
});

test('units only shoot a base when ordered to assault it', () => {
  const s = game('colinas');
  place(s, 'p', 'metralhador', 4); // x 830, base inimiga a 170 (alcance 200)
  run(s, 2);
  assert.equal(s.bases.e.hp, 1000);
});

test('destroying enemy base ends game with victory', () => {
  const s = game();
  s.bases.e.hp = 5;
  place(s, 'p', 'fuzileiro', 3, { hp: 1e9 });
  for (let i = 0; i < 600 && !s.over; i++) tick(s);
  assert.equal(s.over, 'p');
  assert.equal(s.bases.e.hp, 0);
  assert.ok(s.events.some(ev => ev.tipo === 'base'));
  const m = { ...s.money };
  run(s, 1);
  assert.deepEqual(s.money, m);
});

test('long run with many small steps stays consistent', () => {
  const s = game();
  s.money.p = s.money.e = 1e4;
  for (let i = 0; i < 5; i++) { T.buy(s, 'p', T.UNIT_ORDER[i % 3]); T.buy(s, 'e', T.UNIT_ORDER[i % 3]); }
  for (let k = 0; k < 12; k++) { T.order(s, 'p', 1); T.order(s, 'e', 1); run(s, 10); }
  for (const u of s.units) { assert.ok(u.x >= 0 && u.x <= 1000); assert.ok(u.hp > 0); }
  assert.ok(Number.isFinite(s.money.p) && Number.isFinite(s.money.e));
  assert.ok(s.events.length <= 200);
});
