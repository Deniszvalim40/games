const test = require('node:test'), assert = require('node:assert/strict');
const { T, game, place, run } = require('./util.js');

test('bought soldier walks alone to first trench and claims it', () => {
  const s = game();
  T.buy(s, 'p', 'fuzileiro'); run(s, 10);
  assert.equal(s.units[0].x, 250);
  assert.equal(s.units[0].at, 0);
  assert.equal(T.isSettled(s, s.units[0]), true);
});

test('advance moves one trench; order is idempotent while moving', () => {
  const s = game();
  T.buy(s, 'p', 'fuzileiro'); run(s, 10);
  T.order(s, 'p', 1); T.order(s, 'p', 1); T.order(s, 'p', 1);
  run(s, 10);
  assert.equal(s.units[0].at, 1);
  assert.equal(s.units[0].x, 500);
  assert.equal(s.trenches[1].owner, 'p');
});

test('retreat while advancing returns to trench it left', () => {
  const s = game();
  T.buy(s, 'p', 'fuzileiro'); run(s, 10);
  T.order(s, 'p', 1); run(s, 1);
  T.order(s, 'p', -1); run(s, 10);
  assert.equal(s.units[0].at, 0);
  assert.equal(s.units[0].x, 250);
});

test('cannot retreat behind first trench', () => {
  const s = game();
  const u = place(s, 'p', 'fuzileiro', 0);
  T.order(s, 'p', -1);
  assert.equal(u.target, 0);
});

test('cannot reach enemy base until all trenches owned', () => {
  const s = game();
  s.trenches.forEach((t, i) => t.owner = i < 2 ? 'p' : 'e');
  const u = place(s, 'p', 'fuzileiro', 2, { hp: 1e9 }); // aguenta a metralhadora da base
  T.order(s, 'p', 1);
  assert.equal(u.target, 2);
  s.trenches.forEach(t => t.owner = 'p');
  T.order(s, 'p', 1);
  assert.equal(u.target, 3);
  s.bases.e.hp = 1e9; // não deixar a partida acabar durante o teste
  run(s, 20);
  assert.equal(u.x, 970);
  assert.equal(u.at, 3);
});

test('no advance from contested trench', () => {
  const s = game();
  const u = place(s, 'p', 'fuzileiro', 1);
  place(s, 'e', 'fuzileiro', 1);
  T.order(s, 'p', 1);
  assert.equal(u.target, 1);
});

test('enemy advance goes toward the player side', () => {
  const s = game();
  const u = place(s, 'e', 'fuzileiro', 2);
  T.order(s, 'e', 1);
  assert.equal(u.target, 1);
});

test('lama slows movement', () => {
  const s = game('lamacal');
  T.buy(s, 'p', 'fuzileiro'); run(s, 2);
  assert.ok(Math.abs(s.units[0].x - 48) < 1e-6, s.units[0].x);
});

test('order ignored after game over', () => {
  const s = game();
  const u = place(s, 'p', 'fuzileiro', 0);
  s.over = 'p';
  T.order(s, 'p', 1);
  assert.equal(u.target, 0);
});

test('advance keeps base attackers on the base after a trench is lost', () => {
  const s = game();
  const p = place(s, 'p', 'fuzileiro', 3, { hp: 1e9 });
  s.trenches[1].owner = 'e';
  T.order(s, 'p', 1);
  assert.equal(p.target, 3);
  const e = place(s, 'e', 'fuzileiro', -1, { hp: 1e9 });
  s.trenches[0].owner = 'p';
  T.order(s, 'e', 1);
  assert.equal(e.target, -1);
});
