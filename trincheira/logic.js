// Trincheira — regras do jogo (sem DOM). Mundo: x=0 base do jogador ('p'), x=1000 base inimiga ('e').
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.Trincheira = f(); })(this, function () {
'use strict';

const MAX_UNITS = 30, INCOME = 10, START_MONEY = 150, BASE_HP = 1000;

const UNITS = {
  fuzileiro:   { id: 'fuzileiro',   nome: 'Fuzileiro',   custo: 50,  vida: 100, dano: 12, alcance: 160, cadencia: 1.0, velocidade: 40, area: 0 },
  metralhador: { id: 'metralhador', nome: 'Metralhador', custo: 120, vida: 140, dano: 5,  alcance: 200, cadencia: 0.2, velocidade: 25, area: 0 },
  granadeiro:  { id: 'granadeiro',  nome: 'Granadeiro',  custo: 150, vida: 90,  dano: 35, alcance: 130, cadencia: 2.5, velocidade: 35, area: 40 },
};
const UNIT_ORDER = ['fuzileiro', 'metralhador', 'granadeiro'];

const MAPS = [
  { id: 'campo',    nome: 'Campo Aberto', trincheiras: [250, 500, 750],           lama: 1,   cobertura: 0.4, cores: { ceu: '#9cc3d8', chao: '#7d8f4e', trincheira: '#3b2f22' } },
  { id: 'lamacal',  nome: 'Lamaçal',      trincheiras: [200, 400, 600, 800],      lama: 0.6, cobertura: 0.4, cores: { ceu: '#8f9aa0', chao: '#5e4a35', trincheira: '#2e2219' } },
  { id: 'floresta', nome: 'Floresta',     trincheiras: [220, 420, 580, 780],      lama: 1,   cobertura: 0.3, cores: { ceu: '#a9c9b0', chao: '#3f6136', trincheira: '#2a2418' } },
  { id: 'colinas',  nome: 'Colinas',      trincheiras: [170, 335, 500, 665, 830], lama: 1,   cobertura: 0.4, cores: { ceu: '#e4c58f', chao: '#9a8a52', trincheira: '#4a3826' } },
];

const DIFFS = [
  { id: 'recruta',  nome: 'Recruta',  renda: 0.7,  intervalo: 4,   avancar: 2.0, minTropa: 6, compra: 'aleatoria', comprasPorVez: 1 },
  { id: 'soldado',  nome: 'Soldado',  renda: 1.0,  intervalo: 3,   avancar: 1.5, minTropa: 4, compra: 'pesos',     comprasPorVez: 1 },
  { id: 'veterano', nome: 'Veterano', renda: 1.25, intervalo: 2,   avancar: 1.3, minTropa: 4, compra: 'contra',    comprasPorVez: 1 },
  { id: 'general',  nome: 'General',  renda: 1.6,  intervalo: 1.2, avancar: 1.1, minTropa: 3, compra: 'contra',    comprasPorVez: 2 },
];

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function createGame(mapId, diffId, seed) {
  const map = MAPS.find(m => m.id === mapId) || MAPS[0];
  const diff = DIFFS.find(d => d.id === diffId) || DIFFS[1];
  const n = map.trincheiras.length;
  return {
    t: 0, seed, rand: rng(seed), map, diff,
    trenches: map.trincheiras.map((x, i) => ({ x, owner: i === 0 ? 'p' : i === n - 1 ? 'e' : null })),
    bases: { p: { x: 0, hp: BASE_HP, cd: 0 }, e: { x: 1000, hp: BASE_HP, cd: 0 } },
    money: { p: START_MONEY, e: START_MONEY },
    units: [], nextId: 1,
    kills: { p: 0, e: 0 },
    over: null,
    events: [],
    ai: { cd: diff.intervalo },
  };
}

const N = s => s.trenches.length;
const firstTrench = (s, side) => side === 'p' ? 0 : N(s) - 1;
const alive = (s, side) => s.units.reduce((c, u) => c + (u.side === side ? 1 : 0), 0);

function buy(s, side, typeId) {
  const def = UNITS[typeId];
  if (s.over || !def || s.money[side] < def.custo || alive(s, side) >= MAX_UNITS) return false;
  s.money[side] -= def.custo;
  s.units.push({ id: s.nextId++, side, type: typeId, hp: def.vida,
    x: s.bases[side].x, at: side === 'p' ? -1 : N(s), target: firstTrench(s, side), cd: 0 });
  return true;
}

function step(s, dt) {
  if (s.over) return;
  s.t += dt;
  s.money.p += INCOME * dt;
  s.money.e += INCOME * dt * s.diff.renda;
  s.ai.cd -= dt;
  if (s.ai.cd <= 0) { s.ai.cd = s.diff.intervalo; aiThink(s); }
}

function aiThink(s) {}

return { MAX_UNITS, INCOME, START_MONEY, BASE_HP, UNITS, UNIT_ORDER, MAPS, DIFFS, rng, createGame,
  firstTrench, alive, buy, step, aiThink };
});
