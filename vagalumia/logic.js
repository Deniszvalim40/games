// Vagalumia — regras do jogo (sem DOM).
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.Vagalumia = f(); })(this, function () {
'use strict';

// ===== Constantes =====
const COLS = 5, VISIBLE_ROWS = 5, BAR = 5, POT_MIN = 12, POT_MAX = 30, MAX_LIVES = 5;
const LIFE_MS = 600000, START_HELPS = 2, HELP_EVERY = 50, PREVIEW_UNTIL = 50;
const GROW = Math.sqrt(3); // lado × √3 = 3× mais quadrados
const PALETTE = ['#ff1744', '#ffee00', '#39ff14', '#1f8bff', '#b026ff', '#ff7a00', '#00f0ff', '#ff2bd6'];

// ===== Aleatório determinístico =====
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedFor(n) { let h = Math.imul(n | 0, 0x9E3779B1) ^ 0x5bd1e995; h = Math.imul(h ^ h >>> 15, 0x85ebca6b); h = Math.imul(h ^ h >>> 13, 0xc2b2ae35); return (h ^ h >>> 16) | 0; }

// ===== Níveis =====
function tierOf(n) { return n % 10 === 0 ? 'super' : n % 5 === 0 ? 'dificil' : 'normal'; }
function levelParams(n) {
  const tier = tierOf(n);
  const base = Math.min(32, 16 + Math.floor((n - 1) / 2));
  const side = tier === 'normal' ? base : Math.min(40, Math.round(base * (tier === 'dificil' ? 1.3 : 1.6)));
  const size = Math.round(side * GROW);
  const colors = Math.min(8, 3 + Math.floor((n - 1) / 8) + (tier === 'dificil' ? 1 : tier === 'super' ? 2 : 0));
  const mix = tier === 'normal' ? 4 : tier === 'dificil' ? 5 : 8;
  return { tier, size, colors, mix };
}

// ===== Artes (regiões em coordenadas normalizadas; -1 = fora) =====
const inCircle = (u, v, cx, cy, r) => (u - cx) * (u - cx) + (v - cy) * (v - cy) <= r * r;
function polar(u, v, cx, cy) { const dx = u - cx, dy = v - cy; return { r: Math.hypot(dx, dy), a: Math.atan2(dy, dx) }; }

const ART = [
  { id: 'coracao', nome: 'Coração', shape(u, v) {
    const x = (u - .5) * 2.6, y = (.55 - v) * 2.6;
    const k = x * x + y * y - 1;
    if (k * k * k - x * x * y * y * y > 0) return -1;
    return v < .32 ? 0 : (u < .5 ? 1 : 2);
  } },
  { id: 'estrela', nome: 'Estrela', shape(u, v) {
    const { r, a } = polar(u, v, .5, .54);
    const t = ((a + Math.PI / 2) / (2 * Math.PI / 5) % 1 + 1) % 1, d = Math.abs(t - .5) * 2;
    const R = .22 + .26 * (1 - d);
    if (r > R) return -1;
    return r < .14 ? 0 : (u < .5 ? 1 : 2);
  } },
  { id: 'flor', nome: 'Flor', shape(u, v) {
    const { r, a } = polar(u, v, .5, .42);
    if (r < .1) return 0;
    if (r < .36 && r < .17 + .19 * Math.abs(Math.cos(a * 2.5))) return 1 + (Math.floor(((a + Math.PI) / (2 * Math.PI)) * 5) % 2);
    if (Math.abs(u - .5) < .03 && v > .55 && v < .98) return 3;
    if (v > .72 && v < .86 && inCircle(u, v, u < .5 ? .38 : .62, .79, .12)) return 3;
    return -1;
  } },
  { id: 'peixe', nome: 'Peixe', shape(u, v) {
    const body = ((u - .42) / .36) ** 2 + ((v - .5) / .24) ** 2 <= 1;
    const tail = u > .72 && u < .98 && Math.abs(v - .5) < (u - .7) * .9;
    if (inCircle(u, v, .26, .45, .04)) return 3;
    if (tail) return 2;
    if (!body) return -1;
    return u < .3 ? 0 : (v < .5 ? 1 : 0);
  } },
  { id: 'casa', nome: 'Casa', shape(u, v) {
    if (v >= .45 && v < .95 && u >= .15 && u < .85) {
      if (u >= .42 && u < .58 && v >= .65) return 2;
      if (u >= .22 && u < .36 && v >= .55 && v < .68) return 3;
      return 0;
    }
    if (v >= .12 && v < .45 && Math.abs(u - .5) <= (v - .12) / .33 * .42) return 1;
    return -1;
  } },
  { id: 'arvore', nome: 'Árvore', shape(u, v) {
    if (u >= .43 && u < .57 && v >= .65 && v < .95) return 0;
    if (inCircle(u, v, .5, .32, .28)) return 1;
    if (inCircle(u, v, .3, .5, .2) || inCircle(u, v, .7, .5, .2)) return 2;
    return -1;
  } },
  { id: 'cogumelo', nome: 'Cogumelo', shape(u, v) {
    if (v < .55 && ((u - .5) / .42) ** 2 + ((v - .55) / .43) ** 2 <= 1) {
      return (inCircle(u, v, .35, .35, .08) || inCircle(u, v, .62, .28, .07) || inCircle(u, v, .55, .45, .05)) ? 1 : 0;
    }
    if (u >= .38 && u < .62 && v >= .55 && v < .92) return 2;
    return -1;
  } },
  { id: 'lua', nome: 'Lua', shape(u, v) {
    if (!inCircle(u, v, .5, .5, .42) || inCircle(u, v, .68, .42, .34)) return -1;
    return v < .35 ? 0 : (v < .65 ? 1 : 2);
  } },
];

// ===== Imagem =====
// Cada célula recebe um índice de cor 0..colors-1; fora do desenho = -1.
function makeImage(n, rand) {
  const { tier, size, colors } = levelParams(n);
  const art = ART[(n - 1) % ART.length];
  const w = size, h = size, reg = new Int16Array(w * h).fill(-1);
  const ids = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = art.shape((x + .5) / w, (y + .5) / h);
    reg[y * w + x] = r;
    if (r >= 0 && ids.indexOf(r) < 0) ids.push(r);
  }
  // Compacta ids de região para 0..k-1.
  let k = ids.length;
  for (let i = 0; i < reg.length; i++) if (reg[i] >= 0) reg[i] = ids.indexOf(reg[i]);
  // Faltam regiões: divide a maior (faixas horizontais; anéis concêntricos no 'super').
  while (k < colors) {
    const cells = [], cnt = new Array(k).fill(0);
    for (let i = 0; i < reg.length; i++) if (reg[i] >= 0) cnt[reg[i]]++;
    let big = 0; for (let i = 1; i < k; i++) if (cnt[i] > cnt[big]) big = i;
    for (let i = 0; i < reg.length; i++) if (reg[i] === big) cells.push(i);
    let key;
    if (tier === 'super') {
      let cx = 0, cy = 0; for (const i of cells) { cx += i % w; cy += (i / w | 0); }
      cx /= cells.length; cy /= cells.length;
      key = i => -Math.hypot(i % w - cx, (i / w | 0) - cy);
    } else key = i => (i / w | 0) * w + (i % w) * 1e-3;
    cells.sort((a, b) => key(a) - key(b) || a - b);
    for (let j = cells.length >> 1; j < cells.length; j++) reg[cells[j]] = k;
    k++;
  }
  // Embaralha a ordem da paleta (Fisher-Yates) e mapeia regiões -> cores.
  const perm = []; for (let i = 0; i < colors; i++) perm.push(i);
  for (let i = colors - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  const cellsOut = new Int8Array(w * h);
  for (let i = 0; i < reg.length; i++) cellsOut[i] = reg[i] < 0 ? -1 : perm[reg[i] % colors];
  return { w, h, cells: cellsOut };
}

// ===== Regras da fase =====
// Estado: { n, tier, w, h, cells, lit, cols, bar, cap, extra, anyPick, over }
function fromGrid(rows, cols) {
  const h = rows.length, w = rows[0].length, cells = new Int8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = rows[y][x]; cells[y * w + x] = c === '.' ? -1 : +c; }
  const cs = [];
  for (let i = 0; i < COLS; i++) cs.push((cols[i] || []).map(p => ({ color: p[0], count: p[1] })));
  return { n: 1, tier: 'normal', w, h, cells, lit: new Uint8Array(w * h), cols: cs,
    bar: new Array(BAR).fill(null), cap: BAR, extra: false, anyPick: false, over: null };
}
// Exposto: pintado, apagado e com algum vizinho ortogonal aceso, vazio ou fora da borda.
function isExposed(s, i) {
  if (s.cells[i] < 0 || s.lit[i]) return false;
  const w = s.w, h = s.h, x = i % w, y = (i / w) | 0;
  const open = j => s.cells[j] < 0 || s.lit[j] === 1;
  return x === 0 || y === 0 || x === w - 1 || y === h - 1 || open(i - 1) || open(i + 1) || open(i - w) || open(i + w);
}
function exposedOf(s, color) {
  const out = [];
  for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === color && isExposed(s, i)) out.push(i);
  return out;
}
function target(s, color) {
  const w = s.w, mid = (w - 1) / 2;
  let best = -1, by = -1, bd = 0, bx = 0;
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== color || !isExposed(s, i)) continue;
    const x = i % w, y = (i / w) | 0, d = Math.abs(x - mid);
    if (best < 0 || y > by || (y === by && (d < bd || (d === bd && x < bx)))) { best = i; by = y; bd = d; bx = x; }
  }
  return best;
}
function pick(s, col, depth) {
  depth = depth || 0;
  if (s.over || depth < 0) return false;
  const c = s.cols[col];
  if (!c || depth >= c.length) return false;
  if (depth > 0 && !s.anyPick) return false;
  const slot = s.bar.indexOf(null);
  if (slot < 0 || slot >= s.cap) return false;
  const pot = c.splice(depth, 1)[0];
  if (depth > 0) s.anyPick = false;
  s.bar[slot] = { color: pot.color, left: pot.count };
  return true;
}
function advance(s) {
  const ev = [];
  for (let slot = 0; slot < s.bar.length; slot++) {
    const p = s.bar[slot];
    if (!p) continue;
    const cell = target(s, p.color);
    if (cell < 0) continue;
    s.lit[cell] = 1; p.left--;
    ev.push({ slot, color: p.color, cell });
    if (p.left <= 0) s.bar[slot] = null;
  }
  s.over = status(s);
  return ev;
}
function status(s) {
  let won = true;
  for (let i = 0; i < s.cells.length; i++) if (s.cells[i] >= 0 && !s.lit[i]) { won = false; break; }
  if (won) return 'won';
  const used = s.bar.slice(0, s.cap);
  if (used.indexOf(null) >= 0) return null;
  for (const p of used) if (p && target(s, p.color) !== -1) return null;
  return 'lost';
}

// ===== Geração da fase =====
function copyState(s) {
  return Object.assign({}, s, { cells: s.cells.slice(), lit: s.lit.slice(), cols: s.cols && s.cols.map(col => col.map(p => ({ color: p.color, count: p.count }))), bar: s.bar.map(p => p && { color: p.color, left: p.left }) });
}
// Simula numa cópia a ordem de acender. Cada pote recebe uma cota de 12 a 30; o resto da cor
// nunca fica abaixo de 12 (cor com menos de 12 vira um pote só). Se a cor trava no meio, o pote
// fica aberto e continua quando a cor voltar a ter exposto (o resto se junta ao mesmo pote).
function peel(s, rand) {
  const c = copyState(s), seq = [];
  let colors = 0; for (let i = 0; i < c.cells.length; i++) if (c.cells[i] >= colors) colors = c.cells[i] + 1;
  const free = new Array(colors).fill(0), open = new Array(colors).fill(null);
  for (let i = 0; i < c.cells.length; i++) if (c.cells[i] >= 0) free[c.cells[i]]++;
  for (;;) {
    const ready = [];
    for (let col = 0; col < colors; col++) if (target(c, col) >= 0) ready.push(col);
    if (!ready.length) break;
    const color = ready[Math.floor(rand() * ready.length)];
    let pot = open[color];
    if (!pot) {
      let k = POT_MIN + Math.floor(rand() * (POT_MAX - POT_MIN + 1));
      if (free[color] <= POT_MAX) k = free[color];
      else if (free[color] - k < POT_MIN) k = free[color] - POT_MIN;
      free[color] -= k;
      pot = { color, count: 0, need: k }; seq.push(pot);
    }
    while (pot.count < pot.need) { const i = target(c, color); if (i < 0) break; c.lit[i] = 1; pot.count++; }
    open[color] = pot.count < pot.need ? pot : null;
  }
  return seq.map(p => ({ color: p.color, count: p.count }));
}
// O pote i vai para a coluna i % 5.
function deal(seq) {
  const cols = []; for (let i = 0; i < COLS; i++) cols.push([]);
  seq.forEach((p, i) => cols[i % COLS].push({ color: p.color, count: p.count }));
  return cols;
}
// Guloso numa cópia: solta se der; senão pega o pote da frente cuja cor tem exposto
// (preferindo o que veio antes na distribuição); senão a primeira coluna não vazia.
function solve(s) {
  const c = copyState(s), len0 = c.cols.map(col => col.length);
  let st = status(c);
  while (st === null) {
    if (c.bar.some(p => p && target(c, p.color) >= 0)) { advance(c); st = c.over; continue; }
    let best = -1, bi = Infinity;
    for (let col = 0; col < c.cols.length; col++) {
      const f = c.cols[col][0];
      if (!f || target(c, f.color) < 0) continue;
      const idx = (len0[col] - c.cols[col].length) * COLS + col;
      if (idx < bi) { bi = idx; best = col; }
    }
    if (best < 0) best = c.cols.findIndex(col => col.length > 0);
    if (best < 0 || !pick(c, best)) return false;
    st = status(c);
  }
  return st === 'won';
}
function createLevel(n) {
  const rand = rng(seedFor(n)), { tier, mix } = levelParams(n), img = makeImage(n, rand);
  const base = { n, tier, w: img.w, h: img.h, cells: img.cells, lit: new Uint8Array(img.w * img.h),
    cols: null, bar: new Array(BAR).fill(null), cap: BAR, extra: false, anyPick: false, over: null };
  const seq = peel(base, rand);
  for (let t = 0; t < 20; t++) {
    const q = seq.slice();
    for (let i = 0; i < q.length; i++) {
      const j = i + Math.floor(rand() * (Math.min(i + mix, q.length - 1) - i + 1));
      const x = q[i]; q[i] = q[j]; q[j] = x;
    }
    base.cols = deal(q);
    if (solve(base)) return base;
  }
  base.cols = deal(seq);
  return base;
}

// ===== Ajudas =====
function addSlot(s) {
  if (s.extra) return false;
  s.bar.push(null); s.cap = BAR + 1; s.extra = true;
  if (s.over === 'lost') s.over = null;
  return true;
}
function shuffle(s, rand) {
  const pots = [];
  for (const col of s.cols) for (const p of col) pots.push({ color: p.color, count: p.count });
  for (let t = 0; t < 30; t++) {
    for (let i = pots.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = pots[i]; pots[i] = pots[j]; pots[j] = x; }
    const cols = deal(pots);
    if (solve(Object.assign({}, s, { cols }))) { s.cols = cols; return true; }
  }
  return false;
}
function setAnyPick(s) {
  if (s.anyPick) return false;
  s.anyPick = true; return true;
}
function preview(s, color) { return s.n <= PREVIEW_UNTIL ? exposedOf(s, color) : []; }

// ===== Save =====
function newSave() {
  return { v: 1, level: 1, lives: MAX_LIVES, lifeAt: 0,
    helps: { slot: START_HELPS, shuffle: START_HELPS, any: START_HELPS }, som: true, musica: true };
}
function parseSave(text) {
  const out = newSave();
  let o;
  try { o = JSON.parse(text); } catch (e) { return out; }
  if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== 1) return out;
  const isInt = (x) => typeof x === 'number' && Number.isInteger(x);
  if (isInt(o.level) && o.level > 0) out.level = o.level;
  if (isInt(o.lives) && o.lives >= 0 && o.lives <= MAX_LIVES) out.lives = o.lives;
  if (typeof o.lifeAt === 'number' && Number.isFinite(o.lifeAt)) out.lifeAt = o.lifeAt;
  if (o.helps && typeof o.helps === 'object') {
    for (const k of ['slot', 'shuffle', 'any']) if (isInt(o.helps[k]) && o.helps[k] >= 0) out.helps[k] = o.helps[k];
  }
  if (typeof o.som === 'boolean') out.som = o.som;
  if (typeof o.musica === 'boolean') out.musica = o.musica;
  return out;
}
function livesNow(save, now) {
  if (now < save.lifeAt) save.lifeAt = now;
  if (save.lives >= MAX_LIVES) return { lives: save.lives, nextMs: 0 };
  const steps = Math.floor((now - save.lifeAt) / LIFE_MS);
  if (steps > 0) {
    save.lives = Math.min(MAX_LIVES, save.lives + steps);
    save.lifeAt += steps * LIFE_MS;
  }
  if (save.lives >= MAX_LIVES) return { lives: save.lives, nextMs: 0 };
  return { lives: save.lives, nextMs: LIFE_MS - (now - save.lifeAt) };
}
function loseLife(save, now) {
  const before = livesNow(save, now).lives;
  if (before >= MAX_LIVES) save.lifeAt = now;
  save.lives = Math.max(0, save.lives - 1);
}
function canPlay(save, now) { return livesNow(save, now).lives > 0; }
function winLevel(save, n) {
  if (n !== save.level) return;
  save.level++;
  if (n % HELP_EVERY === 0) for (const k of ['slot', 'shuffle', 'any']) save.helps[k]++;
}
function spendHelp(save, id) {
  if (!save.helps || !(save.helps[id] > 0)) return false;
  save.helps[id]--; return true;
}

return { COLS, VISIBLE_ROWS, BAR, POT_MIN, POT_MAX, MAX_LIVES, LIFE_MS, START_HELPS, HELP_EVERY, PREVIEW_UNTIL, PALETTE,
  rng, seedFor, tierOf, levelParams, ART, makeImage,
  fromGrid, isExposed, exposedOf, target, pick, advance, status,
  peel, deal, solve, createLevel,
  addSlot, shuffle, setAnyPick, preview,
  newSave, parseSave, livesNow, loseLife, canPlay, winLevel, spendHelp };
});
