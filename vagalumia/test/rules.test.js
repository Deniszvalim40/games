const test = require('node:test'), assert = require('node:assert/strict');
const { T, grid } = require('./util.js');

test('only orthogonal neighbours expose; diagonal does not', () => {
  const s = grid(['000', '010', '000'], [[[0, 8]], [[1, 1]]]);
  assert.equal(T.isExposed(s, 4), false);           // centro cercado
  s.lit[1] = 1;                                     // acende o de cima
  assert.equal(T.isExposed(s, 4), true);
  const d = grid(['000', '010', '000'], [[[0, 8]], [[1, 1]]]);
  d.lit[0] = 1;                                     // só a diagonal acesa
  assert.equal(T.isExposed(d, 4), false);
});
test('empty cells and the border count as open', () => {
  const s = grid(['.0.'], [[[0, 1]]]);
  assert.equal(T.isExposed(s, 1), true);
});
test('pick moves the front pot to the first free slot and the next one comes forward', () => {
  const s = grid(['00'], [[[0, 1], [0, 1]]]);
  assert.equal(T.pick(s, 0), true);
  assert.deepEqual(s.bar[0], { color: 0, left: 1 });
  assert.deepEqual(s.cols[0], [{ color: 0, count: 1 }]);
});
test('pick refused when bar full', () => {
  const s = grid(['0'.repeat(6)], [[[0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1]]]);
  s.cells.fill(1);                                  // nenhum pote da cor 0 consegue soltar
  for (let i = 0; i < 5; i++) T.pick(s, 0);
  const before = JSON.stringify(s.cols);
  assert.equal(T.pick(s, 0), false);
  assert.equal(JSON.stringify(s.cols), before);
});
test('pick on empty column, or behind the front without anyPick, is refused', () => {
  const s = grid(['00'], [[[0, 1], [0, 1]], []]);
  assert.equal(T.pick(s, 1), false);
  assert.equal(T.pick(s, 0, 1), false);
  s.anyPick = true;
  assert.equal(T.pick(s, 0, 1), true);
  assert.equal(s.anyPick, false);
});
test('advance lights one cell per pot, lowest row first, and frees the slot at zero', () => {
  const s = grid(['0', '0'], [[[0, 2]]]);
  T.pick(s, 0);
  assert.deepEqual(T.advance(s), [{ slot: 0, color: 0, cell: 1 }]);
  T.advance(s);
  assert.equal(s.bar[0], null);
  assert.equal(s.over, 'won');
});
test('lost when bar full and nothing can light', () => {
  // os 0 do meio estão cercados por 1 apagados; 5 potes cor 0 enchem a barra
  const s = grid(['11111', '10001', '11111'], [[[0, 1]], [[0, 1]], [[0, 1]], [[0, 1]], [[0, 1]]]);
  for (let c = 0; c < 5; c++) T.pick(s, c);
  T.advance(s);
  assert.equal(T.status(s), 'lost');
});
test('not lost while a slot is still free', () => {
  const s = grid(['11111', '10001', '11111'], [[[0, 1]], [[1, 12]], [], [], []]);
  T.pick(s, 0); T.advance(s);
  assert.equal(T.status(s), null);
});
test('pick refused after game over', () => {
  const s = grid(['0'], [[[0, 1], [0, 1]]]);
  s.over = 'won';
  assert.equal(T.pick(s, 0), false);
});
