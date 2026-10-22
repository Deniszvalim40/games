const test = require('node:test'), assert = require('node:assert/strict');
const { T, grid } = require('./util.js');

test('+1 slot only once per level, and it rescues a lost bar', () => {
  const s = T.createLevel(1);
  s.over = 'lost';
  assert.equal(T.addSlot(s), true);
  assert.equal(s.cap, 6); assert.equal(s.bar.length, 6); assert.equal(s.over, null);
  assert.equal(T.addSlot(s), false);
});
test('shuffle keeps the level solvable and keeps the same pots', () => {
  const s = T.createLevel(15);
  const before = s.cols.flat().map(p => p.color + ':' + p.count).sort();
  assert.equal(T.shuffle(s, T.rng(5)), true);
  assert.deepEqual(s.cols.flat().map(p => p.color + ':' + p.count).sort(), before);
  assert.ok(T.solve(s));
});
test('shuffle that finds no solvable order changes nothing', () => {
  const s = T.createLevel(15);
  s.cells.fill(0); s.cols = [[{ color: 1, count: 1 }], [], [], [], []];   // cor 1 não existe na imagem
  const before = JSON.stringify(s.cols);
  assert.equal(T.shuffle(s, T.rng(1)), false);
  assert.equal(JSON.stringify(s.cols), before);
});
test('any-pot lets one pick come from any depth', () => {
  const s = grid(['000'], [[[0, 1], [0, 1], [0, 1]]]);
  assert.equal(T.setAnyPick(s), true);
  assert.equal(T.pick(s, 0, 2), true);
  assert.equal(T.pick(s, 0, 1), false);
});
test('preview only until level 50', () => {
  const a = T.createLevel(50), b = T.createLevel(51);
  const first = a.cols.map(c => c[0]).find(p => p && T.exposedOf(a, p.color).length > 0);
  assert.ok(first && T.preview(a, first.color).length > 0);
  assert.deepEqual(T.preview(b, b.cols[0][0].color), []);
});
