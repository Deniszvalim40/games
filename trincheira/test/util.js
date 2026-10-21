const T = require('../logic.js');

// Jogo sem IA (nem reforços), para testes que montam o cenário à mão.
function game(map = 'campo', diff = 'soldado', seed = 1) {
  const s = T.createGame(map, diff, seed);
  s.ai.cd = Infinity;
  s.ai.reforcos = false;
  return s;
}

// Coloca uma unidade já assentada na posição idx (ou num x livre, se x for passado).
function place(s, side, type, idx, extra = {}) {
  const u = { id: s.nextId++, side, type, hp: T.UNITS[type].vida,
    x: T.destX(s, side, idx), at: idx, target: idx, cd: 0, ...extra };
  s.units.push(u);
  return u;
}

function run(s, secs) { for (let i = 0, n = Math.round(secs * 60); i < n; i++) T.step(s, 1 / 60); }

module.exports = { T, game, place, run };
