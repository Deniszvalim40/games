// Trincheira — regras do jogo (sem DOM). Mundo: x=0 base do jogador ('p'), x=1000 base inimiga ('e').
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.Trincheira = f(); })(this, function () {
'use strict';

const MAX_UNITS = 30, INCOME = 10, START_MONEY = 150, BASE_HP = 1000;

const UNITS = {
  fuzileiro:   { id: 'fuzileiro',   nome: 'Fuzileiro',   custo: 50,  vida: 100, dano: 12, alcance: 160, cadencia: 1.0, velocidade: 40, area: 0 },
  metralhador: { id: 'metralhador', nome: 'Metralhador', custo: 120, vida: 140, dano: 5,  alcance: 200, cadencia: 0.2, velocidade: 25, area: 0 },
  granadeiro:  { id: 'granadeiro',  nome: 'Granadeiro',  custo: 150, vida: 90,  dano: 35, alcance: 130, cadencia: 2.5, velocidade: 35, area: 40 },
  // Fica na primeira trincheira (fixo), alcança o mapa inteiro, mas nunca atira na base.
  sniper:      { id: 'sniper',      nome: 'Sniper',      custo: 300, vida: 70,  dano: 45, alcance: 2000, cadencia: 3.0, velocidade: 40, area: 0, fixo: true },
};
const UNIT_ORDER = ['fuzileiro', 'metralhador', 'granadeiro', 'sniper'];

const MAPS = [
  { id: 'campo',    nome: 'Campo Aberto', trincheiras: [250, 500, 750],           lama: 1,   cobertura: 0.4, cores: { ceu: '#9cc3d8', chao: '#7d8f4e', trincheira: '#3b2f22' } },
  { id: 'lamacal',  nome: 'Lamaçal',      trincheiras: [200, 400, 600, 800],      lama: 0.6, cobertura: 0.4, cores: { ceu: '#8f9aa0', chao: '#5e4a35', trincheira: '#2e2219' } },
  { id: 'floresta', nome: 'Floresta',     trincheiras: [220, 420, 580, 780],      lama: 1,   cobertura: 0.3, cores: { ceu: '#a9c9b0', chao: '#3f6136', trincheira: '#2a2418' } },
  { id: 'colinas',  nome: 'Colinas',      trincheiras: [170, 335, 500, 665, 830], lama: 1,   cobertura: 0.4, cores: { ceu: '#e4c58f', chao: '#9a8a52', trincheira: '#4a3826' } },
];

const DIFFS = [
  { id: 'recruta',  nome: 'Recruta',  renda: 0.5,  intervalo: 4,   avancar: 1.2, minTropa: 4,  compra: 'aleatoria', comprasPorVez: 1 },
  { id: 'soldado',  nome: 'Soldado',  renda: 1.1,  intervalo: 3,   avancar: 2.5, minTropa: 6,  compra: 'pesos',     comprasPorVez: 1 },
  { id: 'veterano', nome: 'Veterano', renda: 1.5,  intervalo: 2,   avancar: 4.0, minTropa: 8,  compra: 'contra',    comprasPorVez: 1 },
  { id: 'general',  nome: 'General',  renda: 2.2,  intervalo: 1.2, avancar: 6.0, minTropa: 10, compra: 'contra',    comprasPorVez: 2 },
];

// Pontos ganhos por vitória e árvore de melhorias (só para o jogador): +5% por nível.
const POINTS = { recruta: 1, soldado: 2, veterano: 4, general: 7 };
const UPGRADES = [
  { id: 'vida',     nome: 'Vida dos soldados' },
  { id: 'base',     nome: 'Vida da base' },
  { id: 'dano',     nome: 'Dano dos soldados' },
  { id: 'cadencia', nome: 'Velocidade de tiro' },
];
const UPGRADE_MAX = 10, UPGRADE_STEP = 0.05;
const upgradeCost = lvl => lvl >= UPGRADE_MAX ? Infinity : lvl < 5 ? 1 : 2;
function bonus(up) {
  const m = id => 1 + UPGRADE_STEP * Math.max(0, Math.min(UPGRADE_MAX, (up && up[id]) | 0));
  const prest = Math.max(0, (up && up.prestigio) | 0);
  return { vida: m('vida'), base: m('base'), dano: m('dano'), cadencia: m('cadencia'), renda: 1 + PRESTIGE_STEP * prest };
}
// Prestígio: com a árvore toda no nível 10, zera tudo e ganha +3% de dinheiro por segundo para sempre.
const PRESTIGE_STEP = 0.03;
const treeDone = up => !!up && UPGRADES.every(g => (up[g.id] | 0) >= UPGRADE_MAX);
const NO_BONUS = bonus(null);

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function createGame(mapId, diffId, seed, up) {
  const map = MAPS.find(m => m.id === mapId) || MAPS[0];
  const diff = DIFFS.find(d => d.id === diffId) || DIFFS[1];
  const n = map.trincheiras.length, bp = bonus(up), baseP = BASE_HP * bp.base;
  return {
    t: 0, seed, rand: rng(seed), map, diff,
    trenches: map.trincheiras.map((x, i) => ({ x, owner: i === 0 ? 'p' : i === n - 1 ? 'e' : null })),
    bases: { p: { x: 0, hp: baseP, max: baseP, cd: 0 }, e: { x: 1000, hp: BASE_HP, max: BASE_HP, cd: 0 } },
    bonus: { p: bp, e: NO_BONUS },
    money: { p: START_MONEY, e: START_MONEY },
    units: [], nextId: 1,
    kills: { p: 0, e: 0 },
    over: null,
    events: [],
    ai: { cd: diff.intervalo, reforcos: true, reforco: 0 },
  };
}

const N = s => s.trenches.length;
const firstTrench = (s, side) => side === 'p' ? 0 : N(s) - 1;
const alive = (s, side) => s.units.reduce((c, u) => c + (u.side === side ? 1 : 0), 0);

function spawn(s, side, typeId) {
  const hp = UNITS[typeId].vida * s.bonus[side].vida;
  s.units.push({ id: s.nextId++, side, type: typeId, hp, max: hp,
    x: s.bases[side].x, at: side === 'p' ? -1 : N(s), target: firstTrench(s, side), cd: 0 });
}

function buy(s, side, typeId) {
  const def = UNITS[typeId];
  if (s.over || !def || s.money[side] < def.custo || alive(s, side) >= MAX_UNITS) return false;
  s.money[side] -= def.custo;
  spawn(s, side, typeId);
  return true;
}

// Base inimiga sob ataque: algum soldado do jogador indo/atacando a base.
const baseUnderAttack = s => s.units.some(u => u.side === 'p' && u.target === N(s));
// Reforço grátis da base inimiga enquanto ela é atacada (a cada intervalo da IA, no mínimo 2 s).
function reinforce(s, dt) {
  if (!s.ai.reforcos || !baseUnderAttack(s)) { s.ai.reforco = 0; return; }
  s.ai.reforco -= dt;
  if (s.ai.reforco > 0) return;
  s.ai.reforco = Math.max(2, s.diff.intervalo);
  if (alive(s, 'e') < MAX_UNITS) spawn(s, 'e', 'fuzileiro');
}

// Posição x de destino do índice idx: trincheira, ou frente da base inimiga (30 antes dela).
function destX(s, side, idx) {
  if (idx >= 0 && idx < N(s)) return s.trenches[idx].x;
  if (idx >= N(s)) return s.bases.e.x - 30;
  return s.bases.p.x + 30;
}
const inTrench = (s, i) => i >= 0 && i < N(s);
const isSettled = (s, u) => u.at === u.target && u.x === destX(s, u.side, u.at);
function contested(s, idx) {
  let p = false, e = false;
  for (const u of s.units) if (u.at === idx && isSettled(s, u)) { if (u.side === 'p') p = true; else e = true; }
  return p && e;
}
const ownsAll = (s, side) => s.trenches.every(t => t.owner === side);

// dir: 1 = avançar, -1 = recuar (relativo ao lado).
function order(s, side, dir) {
  if (s.over) return;
  const sg = side === 'p' ? 1 : -1, n = N(s);
  const lo = side === 'p' ? 0 : (ownsAll(s, 'e') ? -1 : 0);
  const hi = side === 'p' ? (ownsAll(s, 'p') ? n : n - 1) : n - 1;
  for (const u of s.units) {
    if (u.side !== side || UNITS[u.type].fixo) continue;
    let t;
    if (u.target !== u.at) {
      if (Math.sign(u.target - u.at) === dir * sg) continue; // já indo nessa direção
      t = u.at;                                               // volta para onde estava
    } else {
      if (dir === 1 && (contested(s, u.at) || u.at === (sg === 1 ? n : -1))) continue; // já atacando a base
      t = u.at + dir * sg;
    }
    u.target = Math.max(lo, Math.min(hi, t));
  }
}

// Quem avança para no alcance do inimigo mais próximo à frente e atira dali (ninguém se encosta).
function blocked(s, u, dir) {
  const r = UNITS[u.type].alcance;
  for (const o of s.units) if (o.side !== u.side && o.hp > 0) { const d = (o.x - u.x) * dir; if (d >= 0 && d <= r) return true; }
  return false;
}

function move(s, dt) {
  for (const u of s.units) {
    const dx = destX(s, u.side, u.target), v = UNITS[u.type].velocidade * s.map.lama * dt;
    const dir = Math.sign(dx - u.x);
    if (dir === (u.side === 'p' ? 1 : -1) && !UNITS[u.type].fixo && blocked(s, u, dir)) continue;
    if (Math.abs(dx - u.x) <= v) { u.x = dx; u.at = u.target; }
    else u.x += Math.sign(dx - u.x) * v;
  }
  s.trenches.forEach((tr, i) => {
    let p = false, e = false;
    for (const u of s.units) if (u.at === i && isSettled(s, u)) { if (u.side === 'p') p = true; else e = true; }
    if (p !== e) tr.owner = p ? 'p' : 'e';
  });
}

const BASE_GUN = { dano: 8, alcance: 120, cadencia: 0.5 };
const opp = side => side === 'p' ? 'e' : 'p';
const MAX_EVENTS = 200;
function emit(s, ev) { s.events.push(ev); if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS); }

// Alvo assentado numa trincheira tem cobertura, menos contra quem está na mesma trincheira.
function coverMul(s, target, attacker) {
  if (!inTrench(s, target.at) || !isSettled(s, target)) return 1;
  if (attacker && attacker.at === target.at && isSettled(s, attacker)) return 1;
  return s.map.cobertura;
}

function nearestEnemy(s, side, x, range) {
  let best = null, bd = Infinity;
  for (const u of s.units) {
    if (u.side === side || u.hp <= 0) continue;
    const d = Math.abs(u.x - x);
    if (d <= range && d < bd) { bd = d; best = u; }
  }
  return best;
}

function combat(s, dt) {
  for (const u of s.units) {
    if (u.hp <= 0) continue;
    u.cd -= dt;
    if (u.cd > 0) continue;
    const def = UNITS[u.type], foe = opp(u.side), base = s.bases[foe];
    const tgt = nearestEnemy(s, u.side, u.x, def.alcance);
    const assaulting = !def.fixo && u.target === (u.side === 'p' ? N(s) : -1);
    let alvoX;
    if (tgt) alvoX = tgt.x;
    else if (assaulting && Math.abs(base.x - u.x) <= def.alcance) alvoX = base.x;
    else continue;
    const b = s.bonus[u.side], dano = def.dano * b.dano;
    u.cd = def.cadencia / b.cadencia;
    if (def.area > 0) {
      for (const v of s.units) if (v.side === foe && Math.abs(v.x - alvoX) <= def.area) v.hp -= dano;
      if (assaulting && Math.abs(base.x - alvoX) <= def.area) base.hp -= dano;
      emit(s, { tipo: 'explosao', side: u.side, x: u.x, alvoX });
    } else {
      if (tgt) tgt.hp -= dano * coverMul(s, tgt, u); else base.hp -= dano;
      emit(s, { tipo: 'tiro', side: u.side, x: u.x, alvoX, type: u.type });
    }
  }
  for (const side of ['p', 'e']) {
    const b = s.bases[side];
    b.cd -= dt;
    if (b.cd > 0) continue;
    const tgt = nearestEnemy(s, side, b.x, BASE_GUN.alcance);
    if (!tgt) continue;
    b.cd = BASE_GUN.cadencia;
    tgt.hp -= BASE_GUN.dano;
    emit(s, { tipo: 'tiro', side, x: b.x, alvoX: tgt.x, type: 'base' });
  }
  s.units = s.units.filter(u => {
    if (u.hp > 0) return true;
    const k = opp(u.side);
    s.kills[k]++;
    s.money[k] += Math.floor(UNITS[u.type].custo / 2);
    emit(s, { tipo: 'morte', side: u.side, x: u.x });
    return false;
  });
  for (const side of ['p', 'e']) {
    if (s.bases[side].hp <= 0 && !s.over) {
      s.bases[side].hp = 0;
      s.over = opp(side);
      emit(s, { tipo: 'base', side, x: s.bases[side].x });
    }
  }
}

function step(s, dt) {
  if (s.over) return;
  s.t += dt;
  s.money.p += INCOME * dt * s.bonus.p.renda;
  s.money.e += INCOME * dt * s.diff.renda;
  s.ai.cd -= dt;
  if (s.ai.cd <= 0) { s.ai.cd = s.diff.intervalo; aiThink(s); }
  reinforce(s, dt);
  move(s, dt);
  combat(s, dt);
}

// Poder de fogo de um lado num índice de posição (unidades indo para lá ou já lá).
function strength(s, side, idx) {
  let t = 0;
  for (const u of s.units) if (u.side === side && u.target === idx) { const d = UNITS[u.type]; t += u.hp * d.dano / d.cadencia; }
  return t;
}

function chooseType(s) {
  const r = s.rand();
  if (s.diff.compra === 'aleatoria') return UNIT_ORDER[Math.floor(r * 3)]; // o computador não compra sniper
  if (s.diff.compra === 'pesos') return r < 0.5 ? 'fuzileiro' : r < 0.8 ? 'metralhador' : 'granadeiro';
  const p = s.units.filter(u => u.side === 'p');
  const packed = s.trenches.some((_, i) => p.filter(u => u.at === i && isSettled(s, u)).length >= 3);
  const mg = p.filter(u => u.type === 'metralhador').length, rifles = p.filter(u => u.type === 'fuzileiro').length;
  if ((packed && r < 0.5) || mg > rifles) return 'granadeiro';
  if (p.length > alive(s, 'e') || r > 0.6) return 'metralhador';
  return 'fuzileiro';
}

// Força do jogador numa trincheira, contando a cobertura de quem já está entrincheirado.
function defended(s, side, idx) {
  let t = 0;
  for (const u of s.units) if (u.side === side && u.target === idx) {
    const d = UNITS[u.type];
    t += u.hp * d.dano / d.cadencia / (isSettled(s, u) && inTrench(s, idx) ? s.map.cobertura : 1);
  }
  return t;
}

function aiThink(s) {
  const emergency = baseUnderAttack(s);
  for (let i = 0; i < s.diff.comprasPorVez; i++) {
    let type = chooseType(s);
    // Com a base sob ataque não dá para juntar dinheiro: compra o melhor que couber no bolso.
    if (emergency && UNITS[type].custo > s.money.e)
      type = ['granadeiro', 'metralhador', 'fuzileiro'].find(t => UNITS[t].custo <= s.money.e) || type;
    if (!buy(s, 'e', type)) break;
  }
  let front = Infinity;
  for (const u of s.units) if (u.side === 'e' && inTrench(s, u.at) && isSettled(s, u)) front = Math.min(front, u.at);
  if (front === Infinity) return;
  const mine = strength(s, 'e', front);
  if (contested(s, front)) {
    if (mine / Math.max(1, strength(s, 'p', front)) < 0.5) order(s, 'e', -1);
    return;
  }
  if (mine / Math.max(1, defended(s, 'p', front - 1)) > s.diff.avancar && alive(s, 'e') >= s.diff.minTropa) order(s, 'e', 1);
}

return { PRESTIGE_STEP, treeDone, POINTS, UPGRADES, UPGRADE_MAX, UPGRADE_STEP, upgradeCost, bonus, MAX_UNITS, INCOME, START_MONEY, BASE_HP, UNITS, UNIT_ORDER, MAPS, DIFFS, rng, createGame,
  firstTrench, alive, buy, step, aiThink, destX, isSettled, contested, ownsAll, order, coverMul, BASE_GUN, strength, chooseType };
});
