# Vagalumia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o "Vagalumia" (quebra-cabeça de passatempo: potes soltam vaga-lumes que acendem uma pixel art de fora para dentro) como PWA em `games/vagalumia/`.

**Architecture:** Mesmo formato da Trincheira. Toda a regra fica em `vagalumia/logic.js`, que é puro (sem DOM, sem `Math.random`, sem `Date`) e é testado com `node --test`. `index.html` só desenha em `<canvas>`, trata os toques, toca os sons, anima a faixa (SVG) e chama a lógica. O salvamento (vidas, ajudas, nível) também é lógica pura que recebe `now` como parâmetro; só a leitura e a escrita do `localStorage` ficam no HTML.

**Tech Stack:** HTML/JS puro, Canvas 2D, SVG para a faixa, WebAudio, `node --test` (Node 24, sem dependências, sem package.json).

**Spec:** `docs/superpowers/specs/2026-10-22-vagalumia-design.md`

## Global Constraints

- Sem bibliotecas nem CDN; sem package.json; testes só com `node:test` e `node:assert/strict`.
- Todo texto visível em português (pt-BR). O nome aparece sempre como **VAGALUMIA** na faixa.
- `logic.js` não usa `Math.random`, `Date`, `window` nem `document`. A aleatoriedade vem de `rng(seed)` (mulberry32, igual à Trincheira) e a semente da fase é `seedFor(n)`, então a fase n é sempre igual.
- Constantes exatas: `COLS = 5`, `VISIBLE_ROWS = 5`, `BAR = 5` (6 com +1 vaga), `POT_MIN = 12`, `POT_MAX = 30`, `MAX_LIVES = 5`, `LIFE_MS = 600000` (10 min), `START_HELPS = 2`, `HELP_EVERY = 50`, `PREVIEW_UNTIL = 50`.
- Nível: final 0 = `'super'`, final 5 = `'dificil'`, o resto = `'normal'`.
- Exposto = vizinho em cima, embaixo, à esquerda ou à direita que está fora da grade, vazio (-1) ou aceso. **Diagonal não conta.**
- IDs das ajudas: `'slot'` (+1 vaga), `'shuffle'` (Embaralhar), `'any'` (Qualquer pote).
- Paleta fixa (índice → cor): `['#ff5a5f','#ffd23f','#3ddc84','#4ea8ff','#c77dff','#ff9f43','#2ee6d6','#ff7ac8']`.
- Todo acesso a `localStorage` fica dentro de `try/catch`, com a chave `'vagalumia-save-v1'`. O jogo funciona sem ele.
- Os comandos rodam a partir de `D:\DEV\ATARI\games`. O trabalho fica no branch `vagalumia`, criado a partir do branch atual `trincheira`, que já tem o commit do spec.

## Review Focus

1. **"Tentar de novo" precisa repetir a fase igualzinha.** `createLevel(n)` chamado duas vezes dá o mesmo estado (Task 3, teste `createLevel is deterministic`).
2. **Toque duplo ou toque com a barra cheia** não faz nada: `pick` devolve `false` e não muda o estado (Task 2, testes `pick refused when bar full` e `pick on empty column`).
3. **Relógio do celular voltando no tempo** não dá vida negativa nem infinita (Task 5, teste `clock going backwards`).
4. **Save corrompido ou de versão velha** cai num save novo sem quebrar (Task 5, teste `parseSave falls back`).
5. **Embaralhar não pode deixar a fase sem solução.** Só aceita uma ordem que o `solve` resolve; se não achar, devolve `false` e a ajuda não é gasta (Task 4, teste `shuffle keeps the level solvable`).

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `vagalumia/logic.js` | Dados, geração da fase, regras, solver, ajudas e save. UMD: `module.exports` no Node, `window.Vagalumia` no navegador. |
| `vagalumia/test/*.test.js` | Um arquivo por task; `test/util.js` com o helper `grid()`. |
| `vagalumia/index.html` | Canvas, telas (início, fase, derrota), faixa SVG, toques, sons e localStorage. |
| `vagalumia/manifest.webmanifest`, `sw.js`, `icon-*.png` | PWA, copiado do formato da Trincheira (`orientation: "portrait"`, cache `vagalumia-v1`). |
| `tools/make-icons.mjs` | Ganha o desenho do Vagalumia (pote com vaga-lumes), escolhido por `dir === 'vagalumia'`. |
| `index.html` (portal) | Novo cartão. |

### Estado da fase (usado por todas as tasks)

```js
s = {
  n, tier,              // nível e 'normal' | 'dificil' | 'super'
  w, h,                 // tamanho da imagem
  cells,                // Int8Array(w*h): índice da cor ou -1 (vazio)
  lit,                  // Uint8Array(w*h): 1 = aceso
  cols,                 // 5 arrays, frente primeiro: [{ color, count }]
  bar,                  // Array(cap) de { color, left } | null (vaga vazia)
  cap,                  // 5, ou 6 depois do +1 vaga
  extra,                // true se já usou +1 vaga nesta fase
  anyPick,              // true = o próximo pick pode ser de qualquer profundidade
  over,                 // null | 'won' | 'lost'
}
```

---

### Task 1: Dados, níveis e imagens

**Files:**
- Create: `vagalumia/logic.js`
- Test: `vagalumia/test/data.test.js`

**Interfaces:**
- Produces: as constantes do Global Constraints, `PALETTE`, `rng(seed) -> () => number`, `seedFor(n) -> int`, `tierOf(n) -> 'normal'|'dificil'|'super'`, `levelParams(n) -> { tier, size, colors, mix }`, `ART: [{ id, nome, shape(u, v) -> int }]` (região ≥ 0 ou -1 = fora do desenho; u, v em [0,1)), `makeImage(n, rand) -> { w, h, cells: Int8Array }`.

- [ ] **Step 1: Write the failing tests**

```js
test('tiers by last digit', () => {
  assert.deepEqual([1, 5, 10, 15, 20, 23].map(T.tierOf), ['normal', 'dificil', 'super', 'dificil', 'super', 'normal']);
});
test('level size and colors follow the spec', () => {
  // normal: 12 + floor((n-1)/2), máx 32; difícil: round(base*1.3); super: round(base*1.6); ambos máx 40
  assert.equal(T.levelParams(1).size, 12);
  assert.equal(T.levelParams(14).size, 18);
  assert.equal(T.levelParams(15).size, Math.round(19 * 1.3));
  assert.equal(T.levelParams(20).size, Math.round(21 * 1.6));
  assert.equal(T.levelParams(200).size, 32);
  assert.equal(T.levelParams(210).size, 40);
  // cores: normal min(8, 3 + floor((n-1)/8)); difícil +1; super +2; máx 8
  assert.deepEqual([1, 5, 10, 11, 100].map(n => T.levelParams(n).colors), [3, 4, 6, 4, 8]);
  // mix (quanto os potes são embaralhados): normal 4, difícil 5, super 8
  assert.deepEqual([1, 5, 10].map(n => T.levelParams(n).mix), [4, 5, 8]);
});
test('makeImage has the requested size and exactly N colors, each used', () => {
  for (const n of [1, 5, 10, 37, 120]) {
    const p = T.levelParams(n), img = T.makeImage(n, T.rng(T.seedFor(n)));
    assert.equal(img.w, p.size); assert.equal(img.h, p.size);
    const used = new Set([...img.cells].filter(c => c >= 0));
    assert.equal(used.size, p.colors, 'nível ' + n);
    assert.ok([...used].every(c => c < p.colors));
  }
});
test('at least 8 arts', () => { assert.ok(T.ART.length >= 8); });
```

- [ ] **Step 2: Run and see it fail.** Run: `node --test vagalumia/test/`. Expected: FAIL (`Cannot find module '../logic.js'`).

- [ ] **Step 3: Implement in `vagalumia/logic.js`**, no formato UMD da Trincheira, exportando um objeto. As artes são desenhos geométricos em coordenadas normalizadas, para escalar para qualquer tamanho: coração, estrela, flor, peixe, casa, árvore, cogumelo e lua. Cada arte divide o desenho em regiões. `makeImage` usa `ART[(n - 1) % ART.length]`, mapeia as regiões para `colors` cores e embaralha a ordem da paleta com `rand`. Se faltarem regiões, divide as maiores em faixas até ter exatamente `colors` cores. Nos níveis `'super'`, as faixas são anéis concêntricos alternando as cores, para que as cores fiquem "presas no meio".

- [ ] **Step 4: Run and see it pass.** `node --test vagalumia/test/` → PASS.

- [ ] **Step 5: Commit**: `git checkout -b vagalumia` (só na primeira task), `git add vagalumia`, `git commit -m "feat(vagalumia): dados, níveis e imagens"`.

---

### Task 2: Regras da fase

**Files:**
- Modify: `vagalumia/logic.js`
- Create: `vagalumia/test/util.js`, `vagalumia/test/rules.test.js`

**Interfaces:**
- Consumes: constantes da Task 1.
- Produces:
  - `fromGrid(rows: string[], cols: Array<Array<[color, count]>>) -> s`: helper de teste. `'.'` = vazio, `'0'..'7'` = cor. Gera `n = 1`, `tier = 'normal'`, `cap = 5`.
  - `isExposed(s, i) -> bool`
  - `exposedOf(s, color) -> number[]`
  - `target(s, color) -> i | -1`: entre os expostos daquela cor, o de maior `y`; em caso de empate, o mais perto do centro em `x`; depois, o menor `x`.
  - `pick(s, col, depth = 0) -> bool`: `depth > 0` só com `s.anyPick`, e consome `anyPick`. Coloca o pote na primeira vaga `null`.
  - `advance(s) -> Array<{ slot, color, cell }>`: cada vaga ocupada acende 1 quadradinho no `target`; o pote com `left === 0` vira `null`. No fim atualiza `s.over`.
  - `status(s) -> null | 'won' | 'lost'`: `'won'` quando tudo está aceso. `'lost'` quando não há vaga `null` e nenhum pote da barra tem `target !== -1`.
- `test/util.js` exporta `{ T, grid }`, sendo `grid = T.fromGrid`.

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run and see it fail.** `node --test vagalumia/test/` → FAIL (`T.fromGrid is not a function`).
- [ ] **Step 3: Implement** `fromGrid`, `isExposed`, `exposedOf`, `target`, `pick`, `advance` e `status` com as assinaturas acima.
- [ ] **Step 4: Run and see it pass.** `node --test vagalumia/test/` → PASS.
- [ ] **Step 5: Commit** `feat(vagalumia): regras da fase`.

---

### Task 3: Gerar a fase com solução garantida

**Files:**
- Modify: `vagalumia/logic.js`
- Create: `vagalumia/test/level.test.js`

**Interfaces:**
- Consumes: `makeImage`, `levelParams`, `target`, `pick`, `advance`, `status`.
- Produces:
  - `peel(s, rand) -> Array<{ color, count }>`: simula, numa cópia, a ordem de acender. Enquanto houver algo apagado, sorteia uma cor que tenha exposto, sorteia `k` entre `POT_MIN` e `POT_MAX` e acende até `k` quadradinhos dela com `target`. O pote fica com o número de quadradinhos realmente acesos, que pode ser menor que 12 no fim de uma cor.
  - `deal(seq) -> cols`: o pote i vai para a coluna `i % 5`. As colunas podem ter mais de 5 potes; só 5 linhas aparecem na tela.
  - `solve(s) -> bool`: guloso, numa cópia. Enquanto `status` for `null`: se algum pote da barra consegue soltar, chama `advance`. Se não, faz `pick` do pote da frente cuja cor tem exposto; se nenhum tiver, pega a primeira coluna não vazia. Devolve `status === 'won'`.
  - `createLevel(n) -> s`: imagem, depois `peel`, depois a sequência embaralhada (cada posição i troca com uma j sorteada em `[i, i + mix]`), depois `deal` e por fim `solve` para conferir. Tenta até 20 vezes; se nenhuma der certo, usa a sequência do `peel` sem embaralhar, que sempre tem solução.

- [ ] **Step 1: Write the failing tests**

```js
test('createLevel is deterministic', () => {
  const a = T.createLevel(23), b = T.createLevel(23);
  assert.deepEqual(a.cols, b.cols);
  assert.deepEqual([...a.cells], [...b.cells]);
});
test('fireflies per colour equal cells per colour', () => {
  for (const n of [1, 5, 10, 33]) {
    const s = T.createLevel(n), cells = {}, flies = {};
    s.cells.forEach(c => { if (c >= 0) cells[c] = (cells[c] || 0) + 1; });
    s.cols.flat().forEach(p => { flies[p.color] = (flies[p.color] || 0) + p.count; });
    assert.deepEqual(flies, cells, 'nível ' + n);
  }
});
test('every pot has at most 30 fireflies and at least 1', () => {
  const pots = T.createLevel(12).cols.flat();
  assert.ok(pots.every(p => p.count >= 1 && p.count <= 30));
});
test('levels 1..60 are all solvable', () => {
  for (let n = 1; n <= 60; n++) assert.ok(T.solve(T.createLevel(n)), 'nível ' + n);
});
test('a 40x40 level is created in under 1 second', () => {
  const t = process.hrtime.bigint(); T.createLevel(210);
  assert.ok(Number(process.hrtime.bigint() - t) / 1e6 < 1000);
});
test('fresh level starts with empty bar, nothing lit, cap 5', () => {
  const s = T.createLevel(3);
  assert.equal(s.cap, 5); assert.ok(s.bar.every(b => b === null)); assert.ok(s.lit.every(v => v === 0));
});
```

- [ ] **Step 2: Run and see it fail.** `node --test vagalumia/test/` → FAIL (`T.createLevel is not a function`).
- [ ] **Step 3: Implement** `peel`, `deal`, `solve` e `createLevel`. A cópia usada por `solve` e `peel` duplica `cells`, `lit`, `cols` e `bar` (por exemplo com `structuredClone`). Se o teste de 1 segundo falhar, guardar os expostos por cor de forma incremental em vez de varrer a grade.
- [ ] **Step 4: Run and see it pass.** `node --test vagalumia/test/` → PASS.
- [ ] **Step 5: Commit** `feat(vagalumia): geração de fases sempre com solução`.

---

### Task 4: Ajudas e prévia

**Files:**
- Modify: `vagalumia/logic.js`
- Create: `vagalumia/test/helps.test.js` (usa `grid` de `test/util.js`)

**Interfaces:**
- Consumes: `solve`, `pick`, `exposedOf`, `rng`, `fromGrid`.
- Produces:
  - `addSlot(s) -> bool`: `cap` passa a 6, `extra = true` e a barra ganha mais um `null`. Devolve `false` se `extra` já estava ligado. Se a fase estava `'lost'`, `over` volta a `null`.
  - `shuffle(s, rand) -> bool`: junta todos os potes das colunas, embaralha e chama `deal`. Aceita a primeira de até 30 tentativas em que `solve` resolve a fase a partir do estado atual. Se nenhuma servir, não muda nada e devolve `false`.
  - `setAnyPick(s) -> bool`: liga `anyPick`. Devolve `false` se já estava ligado.
  - `preview(s, color) -> number[]`: igual a `exposedOf` quando `s.n <= PREVIEW_UNTIL`; senão, `[]`.

- [ ] **Step 1: Write the failing tests**

```js
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
  assert.ok(T.preview(a, a.cols[0][0].color).length > 0);
  assert.deepEqual(T.preview(b, b.cols[0][0].color), []);
});
```

- [ ] **Step 2: Run and see it fail.** → FAIL (`T.addSlot is not a function`).
- [ ] **Step 3: Implement** as quatro funções.
- [ ] **Step 4: Run and see it pass.** → PASS.
- [ ] **Step 5: Commit** `feat(vagalumia): ajudas e prévia`.

---

### Task 5: Save — nível, vidas e estoque de ajudas

**Files:**
- Modify: `vagalumia/logic.js`
- Create: `vagalumia/test/save.test.js`

**Interfaces:**
- Produces:
  - `newSave() -> { v: 1, level: 1, lives: 5, lifeAt: 0, helps: { slot: 2, shuffle: 2, any: 2 }, som: true, musica: true }`
  - `parseSave(text) -> save`: se o texto for inválido, tiver `v !== 1` ou campos faltando, devolve `newSave()` mesclado com o que for válido.
  - `livesNow(save, now) -> { lives, nextMs }`: normaliza `save` (soma as vidas recuperadas e avança `lifeAt`). `nextMs` vale 0 com as vidas cheias. Se `now < lifeAt` (relógio voltou), faz `lifeAt = now` e não soma nada.
  - `loseLife(save, now)`: normaliza; se estava com 5, faz `lifeAt = now`; depois `lives = max(0, lives - 1)`.
  - `canPlay(save, now) -> bool`
  - `winLevel(save, n)`: se `n === save.level`, faz `level++`; se `n % HELP_EVERY === 0`, soma +1 em cada ajuda.
  - `spendHelp(save, id) -> bool`

- [ ] **Step 1: Write the failing tests**

```js
const M = 600000;
test('starts with 5 lives, level 1 and 2 of each help', () => {
  assert.deepEqual(T.newSave().helps, { slot: 2, shuffle: 2, any: 2 });
  assert.equal(T.newSave().lives, 5);
});
test('one life back every 10 minutes, capped at 5', () => {
  const s = T.newSave();
  T.loseLife(s, 0); T.loseLife(s, 0);
  assert.deepEqual(T.livesNow(s, M - 1), { lives: 3, nextMs: 1 });
  assert.equal(T.livesNow(s, M).lives, 4);
  assert.equal(T.livesNow(s, 99 * M).lives, 5);
  assert.equal(T.livesNow(s, 99 * M).nextMs, 0);
});
test('0 lives blocks playing', () => {
  const s = T.newSave();
  for (let i = 0; i < 5; i++) T.loseLife(s, 0);
  assert.equal(T.canPlay(s, 1), false);
  assert.equal(T.canPlay(s, M), true);
});
test('clock going backwards gives no lives', () => {
  const s = T.newSave(); T.loseLife(s, 10 * M);
  assert.equal(T.livesNow(s, 0).lives, 4);
  assert.equal(T.livesNow(s, M).lives, 5);           // conta a partir do novo lifeAt
});
test('+1 of each help every 50 levels', () => {
  const s = T.newSave(); s.level = 50;
  T.winLevel(s, 50);
  assert.equal(s.level, 51);
  assert.deepEqual(s.helps, { slot: 3, shuffle: 3, any: 3 });
  T.winLevel(s, 51);
  assert.deepEqual(s.helps, { slot: 3, shuffle: 3, any: 3 });
});
test('spending a help with none left fails', () => {
  const s = T.newSave(); s.helps.any = 0;
  assert.equal(T.spendHelp(s, 'any'), false);
  assert.equal(T.spendHelp(s, 'slot'), true); assert.equal(s.helps.slot, 1);
});
test('parseSave falls back', () => {
  assert.deepEqual(T.parseSave('lixo'), T.newSave());
  assert.deepEqual(T.parseSave('{"v":0}'), T.newSave());
  assert.equal(T.parseSave(JSON.stringify({ ...T.newSave(), level: 7 })).level, 7);
});
```

- [ ] **Step 2: Run and see it fail.** → FAIL (`T.newSave is not a function`).
- [ ] **Step 3: Implement** as funções de save.
- [ ] **Step 4: Run and see it pass.** → PASS.
- [ ] **Step 5: Commit** `feat(vagalumia): save com vidas e ajudas`.

---

### Task 6: Tela da fase

**Files:**
- Create: `vagalumia/index.html`

**Interfaces:**
- Consumes: `window.Vagalumia`, com todas as funções das Tasks 1 a 5.

O layout segue o rascunho aprovado (`.superpowers/brainstorm/*/content/tela-jogo-v4.html` e `faixa-v2.html`), em pé e em tela cheia, de cima para baixo:
- topo: nível, nome pequeno e aviso Difícil ou Super difícil;
- a imagem, com o quadradinho do tamanho que couber;
- a barra com 5 ou 6 vagas;
- os potes em 5 colunas, mostrando 5 linhas;
- no rodapé, os 3 botões de ajuda com a quantidade de cada um.

- [ ] **Step 1: Desenho e toques.** Quadradinho apagado com 18% de opacidade; exposto com 45% e contorno piscando a cada 1,6 s; aceso com cor cheia e brilho. O pote é de vidro com tampa de madeira, brilho da própria cor e o número de vaga-lumes. As linhas de trás ficam apagadas. Um toque no pote da frente chama `pick`. Segurar o pote mostra a `preview`; soltar em cima do pote faz o `pick`, e arrastar o dedo para fora cancela (escolha minha).
- [ ] **Step 2: Vaga-lumes.** A cada 70 ms, `advance(s)`. Cada evento cria um vaga-lume que voa da vaga até o quadradinho em 400 ms, e o quadradinho só aparece aceso quando ele chega. Toca um "plim" (WebAudio, no máximo um a cada 40 ms). O loop limita o passo, então voltar de uma aba escondida não dispara centenas de eventos de uma vez.
- [ ] **Step 3: Começo e fim.** A faixa SVG ondulada no formato de `faixa-v2.html`, mas **amarela** (sem arco-íris): acende e apaga como um vaga-lume, num ciclo rápido de ~1,2 s (sobe o brilho, fica forte, apaga até ~30% e fica quase apagada um instante), com o brilho (`drop-shadow` amarelo) acompanhando. No começo, entra, as letras caem uma a uma, mostra "Nível N" (com "· Difícil" ou "· Super difícil" na cor laranja ou vermelha e a aura da mesma cor) e sai depois de cerca de 2 s. No fim, quando `over === 'won'` e todos os vaga-lumes já pousaram: a imagem pisca, a faixa fica pulsando com "Nível N completo! ✨", vaga-lumes se espalham e aparece o botão "Continuar", que chama `winLevel`, salva e volta para o início.
- [ ] **Step 4: Ajudas e derrota.** Os botões chamam `addSlot`, `shuffle(s, rng(Date.now()))` e `setAnyPick`. Só gastam com `spendHelp` se a função devolver `true`. Ficam apagados sem estoque, e o +1 vaga também depois de usado na fase. Com `over === 'lost'`: se tiver +1 vaga disponível, aparece "Barra cheia! Usar +1 vaga?" com Usar / Desistir. É a única ajuda que destrava uma barra cheia (escolha minha). Desistir chama `loseLife` e abre a tela "Você perdeu", com "Tentar de novo" (só com vida; recria com `createLevel(n)`, que não traz nenhuma ajuda de volta) e "Início".
- [ ] **Step 5: Som.** Grilos em loop suave, gerados no WebAudio, liga/desliga conforme `save.musica`; o plim segue `save.som`. O áudio só começa no primeiro toque.
- [ ] **Step 6: Verificar.** `preview_start` com `games`, abrir `http://localhost:8137/vagalumia/` em `resize_window` mobile. Conferir: console sem erros; vencer o nível 1; perder de propósito (encher a barra) e ver a oferta do +1 vaga; "Tentar de novo" repete os mesmos potes; no nível 51 (forçando `save.level`), segurar o pote não mostra prévia.
- [ ] **Step 7: Commit** `feat(vagalumia): tela da fase`.

---

### Task 7: Tela inicial

**Files:**
- Modify: `vagalumia/index.html`

Segue `tela-inicial-v3.html`.

- [ ] **Step 1: Montar a tela.**
  - Topo: 5 potinhos de vida (acesos ou apagados) e "+1 em mm:ss" quando não está cheio, atualizando a cada segundo com `livesNow`; engrenagem que abre Som e Música (liga/desliga, salvo).
  - A faixa VAGALUMIA ondulando, amarela, acendendo e apagando como vaga-lume (a mesma da Task 6).
  - O pote grande com os níveis `level-2` até `level+3` em zigue-zague. Os vencidos em verde, o atual amarelo e maior, os de final 5 com borda laranja e os de final 0 com borda vermelha.
  - Em cima do pote, uma bolinha vermelha pulsando com o menor múltiplo de 10 que seja ≥ `level`, e "SUPER DIFÍCIL" embaixo.
  - O botão JOGAR com "Nível N". Com 0 vidas fica apagado e mostra "Próxima vida em mm:ss".
  - No rodapé, o estoque das 3 ajudas.
- [ ] **Step 2: Animação de vitória.** Ao voltar de uma vitória, os círculos descem um degrau em 0,6 s e o novo atual acende, como no "Simular vitória" do rascunho.
- [ ] **Step 3: Verificar** no preview mobile: abrir o jogo, ver a tela inicial; vencer o nível 1 e ver os círculos descerem; perder 5 vezes e ver o JOGAR bloqueado com o relógio; recarregar a página e conferir que nível, vidas e ajudas continuam iguais.
- [ ] **Step 4: Commit** `feat(vagalumia): tela inicial`.

---

### Task 8: PWA, ícones e cartão no portal

**Files:**
- Create: `vagalumia/manifest.webmanifest`, `vagalumia/sw.js`, `vagalumia/icon-192.png`, `vagalumia/icon-512.png`, `vagalumia/icon-maskable-512.png`
- Modify: `tools/make-icons.mjs`, `index.html` (portal)

- [ ] **Step 1: Manifest e service worker** copiados da Trincheira, trocando o seguinte:
  - `name`/`short_name` "Vagalumia";
  - `description` "Solte os vaga-lumes e acenda a imagem.";
  - `orientation` "portrait";
  - `background_color`/`theme_color` `#070b16`;
  - cache `vagalumia-v1` com `logic.js` na lista.

  No `index.html`, adicionar `<link rel="manifest">` e o registro do `sw.js`, como na Trincheira.
- [ ] **Step 2: Ícones.** Em `make-icons.mjs`, escolher a função de desenho por `dir`. O Vagalumia é um pote de vidro sobre fundo `#070b16`, com tampa de madeira e 3 pontos amarelos brilhando. Rodar `node tools/make-icons.mjs vagalumia` e ver os 3 PNG criados. Rodar também `node tools/make-icons.mjs trincheira` e conferir com `git diff --stat` que os ícones da Trincheira não mudaram.
- [ ] **Step 3: Cartão no portal.** Adicionar `<a class="card" href="vagalumia/"><img src="vagalumia/icon-192.png" alt=""><div><b>Vagalumia</b><span>Vaga-lumes, potes e imagens que acendem</span></div></a>`.
- [ ] **Step 4: Verificar.** `node --test vagalumia/test/` passa inteiro. No preview, o portal mostra os 3 cartões e o cartão do Vagalumia abre o jogo. O manifest carrega sem erro no console.
- [ ] **Step 5: Commit** `feat(vagalumia): PWA, ícones e cartão no portal`.
