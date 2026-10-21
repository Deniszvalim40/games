const test = require('node:test'), assert = require('node:assert/strict');
const { T, game, place, run } = require('./util.js');

// Ids de inimigos que apareceram em campo durante secs segundos.
function spawned(s, secs) {
  const ids = new Set();
  for (let i = 0, n = Math.round(secs * 60); i < n; i++) {
    T.step(s, 1 / 60); s.money.e = 0;
    for (const u of s.units) if (u.side === 'e') ids.add(u.id);
  }
  return ids.size;
}

test('enemies keep spawning while the base is under attack, even with no money', () => {
  const s = game();
  s.ai.reforcos = true;
  s.trenches.forEach(t => t.owner = 'p');
  place(s, 'p', 'fuzileiro', 3, { hp: 1e9 });
  assert.ok(spawned(s, 10) >= 3);
});

test('no free reinforcement when the base is not under attack', () => {
  const s = game();
  s.ai.reforcos = true;
  place(s, 'p', 'fuzileiro', 2, { hp: 1e9 });
  assert.equal(spawned(s, 10), 0);
});

test('under attack, the AI buys what it can afford instead of saving', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = T.createGame('campo', 'recruta', seed);
    s.trenches.forEach(t => t.owner = 'p');
    place(s, 'p', 'fuzileiro', 3, { hp: 1e9 });
    s.money.e = 60;
    T.aiThink(s);
    assert.equal(T.alive(s, 'e'), 1, 'seed ' + seed);
  }
});
