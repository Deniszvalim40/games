# Trincheira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o jogo "Trincheira" (guerra de trincheiras lateral contra o computador, soldados comprados, vários mapas e dificuldades) como PWA em `games/trincheira/`.

**Architecture:** Toda a regra do jogo fica em `logic.js`, puro (sem DOM, sem `Math.random`, sem relógio), testado com o test runner nativo do Node. `index.html` só desenha em `<canvas>`, lê toques/teclas, toca sons e chama `logic.js` com passo fixo. Mesmo formato do Aero Patrulha (HTML único + manifest + service worker + ícones PNG).

**Tech Stack:** HTML/JS puro, Canvas 2D, WebAudio, `node --test` (Node 24, sem dependências, sem package.json).

**Spec:** `docs/superpowers/specs/2026-10-19-trincheira-design.md`

## Global Constraints

- Sem bibliotecas nem CDN; sem package.json; testes só com `node:test` e `node:assert/strict`.
- Todo texto visível em português (pt-BR).
- `logic.js` não usa `Math.random`, `Date`, `window` nem `document`; aleatoriedade vem de `state.rand` (mulberry32 com `seed`, igual à função `rng` do Aero Patrulha).
- Mundo vai de x=0 (base do jogador) a x=1000 (base inimiga). Lado do jogador = `'p'`, computador = `'e'`.
- Números de soldados, mapas, dificuldades e dinheiro exatamente como nas tabelas do spec.
- Máximo 30 soldados vivos por lado.
- Todo acesso a `localStorage` dentro de `try/catch`; o jogo funciona sem ele.
- Comandos rodam a partir de `D:\DEV\ATARI\games` (repositório git `games`).

## Review Focus

1. **Aba escondida / celular travado e volta** → um quadro com dt enorme não pode teleportar soldados nem acabar a partida: o loop limita dt a 0,25 s e chama `step` em passos fixos de 1/60. (Task 6, verificação manual + `step` testado com muitos passos pequenos.)
2. **Apertar Avançar várias vezes seguidas** → soldados andam só uma trincheira. (Task 3, teste `order is idempotent while moving`.)
3. **Comprar com 30 soldados ou sem dinheiro** → recusado, dinheiro não muda. (Task 2, testes.)
4. **Toques depois do fim da partida** → `buy`/`order` não fazem nada quando `state.over` está definido. (Task 2 e 3, testes.)
5. **Celular em pé** → aviso "Gire o celular" e jogo pausado. (Task 7, verificação manual.)

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `trincheira/logic.js` | Dados (UNITS, MAPS, DIFFS) e simulação: `createGame`, `buy`, `order`, `step`, IA. UMD: `module.exports` no Node, `window.Trincheira` no navegador. |
| `trincheira/test/*.test.js` | Testes da lógica, um arquivo por task. |
| `trincheira/index.html` | Canvas, desenho, entrada, sons, telas, recordes. |
| `trincheira/manifest.webmanifest`, `trincheira/sw.js` | PWA (cópia adaptada do Aero Patrulha). |
| `trincheira/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Ícones, gerados por `tools/make-icons.mjs`. |
| `tools/make-icons.mjs` | Gera os PNGs com `node:zlib` (sem dependências). |
| `index.html` (portal) | Novo cartão "Trincheira". |

## Shared data shapes (todas as tasks usam)

```js
// Unit
{ id: number, side: 'p'|'e', type: 'fuzileiro'|'metralhador'|'granadeiro',
  hp: number, x: number, at: number, target: number, cd: number }
// at/target são índices de posição: 0..N-1 = trincheiras (0 = mais perto do jogador),
// -1 = base do jogador, N = base inimiga. Unidade "assentada" = at === target e x === destX.

// State
{ t: number, seed: number, rand: () => number,
  map: MapDef, diff: DiffDef,
  trenches: [{ x: number, owner: 'p'|'e'|null }],
  bases: { p: { x: 0, hp: 1000, cd: 0 }, e: { x: 1000, hp: 1000, cd: 0 } },
  money: { p: number, e: number },          // float; a tela mostra Math.floor
  units: Unit[], nextId: number,
  kills: { p: number, e: number },
  over: null | 'p' | 'e',                   // lado vencedor
  events: [{ tipo: 'tiro'|'explosao'|'morte'|'base', side, x, alvoX? }],  // a tela consome e esvazia
  ai: { cd: number } }
```

---

### Task 1: Dados e `createGame`

**Files:**
- Create: `trincheira/logic.js`
- Test: `trincheira/test/data.test.js`

**Interfaces:**
- Produces: `UNITS` (objeto por id com `{ id, nome, custo, vida, dano, alcance, cadencia, velocidade, area }`, `area` = 0 ou 40), `MAPS` (array de `{ id, nome, trincheiras: number[], lama: number, cobertura: number, cores: { ceu, chao, trincheira } }`), `DIFFS` (array de `{ id, nome, renda, intervalo, avancar, minTropa, compra: 'aleatoria'|'pesos'|'contra', comprasPorVez }`), `rng(seed) -> () => number`, `createGame(mapId: string, diffId: string, seed: number) -> State`, constantes `MAX_UNITS = 30`, `INCOME = 10`, `START_MONEY = 150`, `BASE_HP = 1000`.

Valores fixos:
- MAPS ids/ordem: `campo` (Campo Aberto, [250,500,750], lama 1, cobertura 0.4), `lamacal` (Lamaçal, [200,400,600,800], lama 0.6, cobertura 0.4), `floresta` (Floresta, [220,420,580,780], lama 1, cobertura 0.3), `colinas` (Colinas, [170,335,500,665,830], lama 1, cobertura 0.4). Cores ficam à escolha do implementador.
- DIFFS: `recruta` {renda .7, intervalo 4, avancar 2.0, minTropa 6, compra 'aleatoria', comprasPorVez 1}; `soldado` {1, 3, 1.5, 4, 'pesos', 1}; `veterano` {1.25, 2, 1.3, 4, 'contra', 1}; `general` {1.6, 1.2, 1.1, 3, 'contra', 2}.
- `createGame`: trincheira 0 dono `'p'`, última dono `'e'`, demais `null`; dinheiro 150/150; `ai.cd = diff.intervalo`; sem unidades.

- [ ] **Step 1: Write the failing test** `trincheira/test/data.test.js`

```js
const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../logic.js');
test('units match spec table', () => {
  assert.deepEqual(['fuzileiro','metralhador','granadeiro'].map(k => T.UNITS[k].custo), [50,120,150]);
  assert.equal(T.UNITS.granadeiro.area, 40);
  assert.equal(T.UNITS.metralhador.cadencia, 0.2);
});
test('createGame sets trenches, money and owners', () => {
  const s = T.createGame('colinas', 'soldado', 1);
  assert.deepEqual(s.trenches.map(t => t.x), [170,335,500,665,830]);
  assert.deepEqual(s.trenches.map(t => t.owner), ['p',null,null,null,'e']);
  assert.deepEqual(s.money, { p: 150, e: 150 });
  assert.equal(s.bases.e.hp, 1000); assert.equal(s.over, null);
});
test('rng is deterministic per seed', () => {
  const a = T.rng(7), b = T.rng(7);
  assert.equal(a(), b()); assert.ok(a() >= 0 && a() < 1);
});
test('4 maps and 4 difficulties in order', () => {
  assert.deepEqual(T.MAPS.map(m => m.id), ['campo','lamacal','floresta','colinas']);
  assert.deepEqual(T.DIFFS.map(d => d.id), ['recruta','soldado','veterano','general']);
});
```

- [ ] **Step 2: Run** `node --test trincheira/test/data.test.js` — Expected: FAIL (`Cannot find module '../logic.js'`).
- [ ] **Step 3: Implement** `trincheira/logic.js` como UMD: `(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.Trincheira=f()})(this,function(){ ... return { UNITS, MAPS, DIFFS, rng, createGame, ... } })`. `rng` = mulberry32 copiado de `aero-patrulha/index.html:48`.
- [ ] **Step 4: Run** `node --test trincheira/test/data.test.js` — Expected: PASS.
- [ ] **Step 5: Commit** `git add trincheira && git commit -m "feat(trincheira): dados do jogo e createGame"`

---

### Task 2: Compra e dinheiro

**Files:**
- Modify: `trincheira/logic.js`
- Test: `trincheira/test/economy.test.js`

**Interfaces:**
- Consumes: `createGame`, `UNITS`.
- Produces: `buy(state, side, typeId) -> boolean`; `step(state, dt)` (nesta task só: `state.t += dt`, renda `INCOME*dt` para `'p'` e `INCOME*dt*diff.renda` para `'e'`; nada roda se `state.over`); `firstTrench(state, side) -> number` (p: 0, e: N-1); `alive(state, side) -> number`.
- `buy` cria unidade na base (`x` 0 ou 1000, `at` -1 ou N, `target = firstTrench`, `hp = vida`, `cd = 0`) e desconta o preço. Recusa (retorna false, nada muda) se `over`, dinheiro < custo ou `alive >= 30`.

- [ ] **Step 1: Write the failing tests**

```js
test('buy spawns at base heading to first trench', () => {
  const s = T.createGame('campo','soldado',1);
  assert.equal(T.buy(s,'p','fuzileiro'), true);
  assert.equal(s.money.p, 100);
  assert.deepEqual(pick(s.units[0], ['side','x','at','target','hp']), { side:'p', x:0, at:-1, target:0, hp:100 });
  T.buy(s,'e','fuzileiro');
  assert.deepEqual(pick(s.units[1], ['x','at','target']), { x:1000, at:3, target:2 });
});
test('buy refused without money', () => { /* money.p = 40 -> false, money.p still 40, units empty */ });
test('buy refused at 30 alive', () => { /* money.p = 1e6, 30 buys true, 31st false, money unchanged by 31st */ });
test('buy refused after game over', () => { /* s.over = 'e' -> false */ });
test('income per second with difficulty multiplier', () => {
  const s = T.createGame('campo','general',1); s.ai.cd = Infinity;
  for (let i = 0; i < 600; i++) T.step(s, 1/60);
  assert.ok(Math.abs(s.money.p - 250) < 1e-6); assert.ok(Math.abs(s.money.e - 310) < 1e-6);
});
```
(`pick` = helper local no arquivo de teste que copia as chaves pedidas.)

- [ ] **Step 2: Run** `node --test trincheira/test/economy.test.js` — Expected: FAIL (`T.buy is not a function`).
- [ ] **Step 3: Implement** `buy`, `firstTrench`, `alive`, `step` (renda e tempo). Em `step`, a IA só será chamada na Task 5; deixe o ponto de chamada já condicionado a `state.ai.cd` para que `Infinity` a desligue.
- [ ] **Step 4: Run** `node --test trincheira/test/` — Expected: PASS (todos).
- [ ] **Step 5: Commit** `git commit -am "feat(trincheira): compra de soldados e renda"` (adicione o teste novo com `git add`).

---

### Task 3: Movimento, ordens e domínio das trincheiras

**Files:**
- Modify: `trincheira/logic.js`
- Test: `trincheira/test/movement.test.js`

**Interfaces:**
- Consumes: `buy`, `step`.
- Produces: `destX(state, side, idx) -> number` (trincheira → `trenches[idx].x`; base inimiga do lado → `base.x ∓ 30`, ou seja 970 para `'p'` indo a N, 30 para `'e'` indo a -1); `isSettled(state, unit) -> boolean`; `contested(state, idx) -> boolean` (há unidades assentadas dos dois lados na trincheira); `ownsAll(state, side) -> boolean`; `order(state, side, dir: 1|-1)` (1 = avançar, -1 = recuar, relativo ao lado).

Regras (do spec):
- `step` move cada unidade em direção a `destX(target)` com `velocidade * map.lama * dt`, sem passar do destino; ao chegar, `at = target`.
- Depois de mover, para cada trincheira: se só um lado tem unidades assentadas nela, `owner` = esse lado; senão não muda.
- `order`, para cada unidade do lado, com `s = side==='p' ? 1 : -1`:
  - movendo (`target !== at`) na mesma direção da ordem → nada; na direção oposta → `target = at`.
  - assentada → candidato `at + dir*s`; se `dir === 1` e `contested(at)` → nada.
  - limites: p entre 0 e N-1, ou até N se `ownsAll(state,'p')`; e entre N-1 e 0, ou até -1 se `ownsAll(state,'e')`.
  - nada acontece se `state.over`.

- [ ] **Step 1: Write the failing tests** (cada um com `createGame('campo','soldado',1)`, `s.ai.cd = Infinity`, e um helper `run(s, secs)` que chama `step(s,1/60)` repetidamente)

```js
test('bought soldier walks alone to first trench and claims it', () => {
  T.buy(s,'p','fuzileiro'); run(s, 10);
  assert.equal(s.units[0].x, 250); assert.equal(s.units[0].at, 0);
});
test('advance moves one trench; order is idempotent while moving', () => {
  T.buy(s,'p','fuzileiro'); run(s, 10);
  T.order(s,'p',1); T.order(s,'p',1); T.order(s,'p',1); run(s, 10);
  assert.equal(s.units[0].at, 1); assert.equal(s.trenches[1].owner, 'p');
});
test('retreat while advancing returns to trench it left', () => { /* at 0, order +1, run 1s, order -1, run 10 -> at 0, x 250 */ });
test('cannot retreat behind first trench', () => { /* at 0, order -1 -> target 0 */ });
test('cannot reach enemy base until all trenches owned', () => {
  /* force s.trenches owners ['p','p','e']; unit settled at idx 2 (set at/target/x=750) -> order +1 -> target 2.
     owners all 'p' -> order +1 -> target 3; run -> x 970 */
});
test('no advance from contested trench', () => { /* p and e units both settled at idx 1 -> order('p',1) leaves target 1 */ });
test('lama slows movement', () => { /* lamacal: after 2s fuzileiro x === 40*0.6*2 = 48 (±1e-9) */ });
test('order ignored after game over', () => { /* s.over='p' -> target unchanged */ });
```

- [ ] **Step 2: Run** `node --test trincheira/test/movement.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** as funções acima em `logic.js`; movimento e domínio dentro de `step`.
- [ ] **Step 4: Run** `node --test trincheira/test/` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(trincheira): movimento, avançar/recuar e domínio das trincheiras"`

---

### Task 4: Combate, bases e fim de partida

**Files:**
- Modify: `trincheira/logic.js`
- Test: `trincheira/test/combat.test.js`

**Interfaces:**
- Consumes: `step`, `isSettled`, `destX`.
- Produces: combate dentro de `step`; `coverMul(state, target: Unit, attacker: Unit) -> number`; eventos em `state.events`; constantes `BASE_GUN = { dano: 8, alcance: 120, cadencia: 0.5 }`.

Regras (do spec):
- Cada unidade: `cd -= dt`; se `cd <= 0`, mira o inimigo vivo mais próximo com `|dx| <= alcance`; se não houver e a base inimiga estiver a `<= alcance`, mira a base. Se atirou, `cd = cadencia` e evento `{tipo:'tiro', side, x, alvoX}`.
- Dano normal: `dano * coverMul`. `coverMul` = `map.cobertura` se o alvo está assentado numa trincheira (0..N-1) e o atacante não está assentado na mesma trincheira; senão 1.
- Granadeiro (`area > 0`): ignora cobertura; acerta todas as unidades inimigas com `|x - alvoX| <= 40` e a base se ela estiver a `<= 40`; evento `explosao`.
- Base: atira com `BASE_GUN` na unidade inimiga mais próxima a `<= 120` de `base.x`.
- Morte (`hp <= 0`): remove, `kills[matador]++`, `money[matador] += Math.floor(custo/2)`, evento `morte`.
- Base com `hp <= 0` → `hp = 0`, `over` = o outro lado, evento `base`. Depois disso `step` não faz nada.

- [ ] **Step 1: Write the failing tests** (unidades colocadas à mão em posições fixas para isolar o caso; `s.ai.cd = Infinity`)

```js
test('entrenched target takes cover damage', () => {
  /* e fuzileiro assentado em idx 1 (x 500, at=target=1); p fuzileiro andando em x 400 (at 0, target 1)
     step one tick -> e.hp === 100 - 12*0.4 */
});
test('same-trench fight has no cover', () => { /* both settled idx 1 -> after first tick each hp 88 */ });
test('floresta cover is 0.3', () => { /* same as first test on floresta map -> 100 - 12*0.3 */ });
test('granadeiro hits all within 40 ignoring cover', () => {
  /* 3 e fuzileiros settled at 500 and one e at 560; p granadeiro at 380 -> after tick: three at 65, the 560 one at 100 */
});
test('kill pays half the cost and counts', () => { /* e fuzileiro hp 1 -> after tick money.p increased by 25, kills.p 1, units has no e */ });
test('base gun shoots nearby enemy', () => { /* e fuzileiro at x 100, far from p units -> after tick hp 92 */ });
test('destroying enemy base ends game with victory', () => {
  /* bases.e.hp = 5; p fuzileiro settled at 970 (at=target=N) -> step until over; assert over==='p', bases.e.hp===0,
     then money frozen: step 1s more, money unchanged */
});
test('long run with many small steps stays consistent', () => {
  /* buy 5 each side, run 120s: every unit x within [0,1000], hp > 0, no NaN in money */
});
```

- [ ] **Step 2: Run** `node --test trincheira/test/combat.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** combate, base, mortes e fim em `step` (ordem por tick: renda → IA → movimento → domínio → combate → mortes → fim).
- [ ] **Step 4: Run** `node --test trincheira/test/` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(trincheira): combate, cobertura, bases e fim de partida"`

---

### Task 5: Inteligência artificial do inimigo

**Files:**
- Modify: `trincheira/logic.js`
- Test: `trincheira/test/ai.test.js`

**Interfaces:**
- Consumes: `buy`, `order`, `contested`, `UNITS`, `DIFFS`.
- Produces: `aiThink(state)` (chamado por `step` quando `state.ai.cd <= 0`, que então volta a `diff.intervalo`); `chooseType(state) -> typeId`; `strength(state, side, idx) -> number` = soma de `hp * dano / cadencia` das unidades do lado com `target === idx`.

Regras:
- **Compra** (até `comprasPorVez` por pensamento): tipo vem de `chooseType`; se não tem dinheiro para ele, guarda (não compra outro).
  - `aleatoria`: um dos três tipos com `state.rand`, igual chance.
  - `pesos`: fuzileiro 50%, metralhador 30%, granadeiro 20%.
  - `contra`: granadeiro se alguma trincheira tem ≥3 unidades do jogador assentadas, ou se o jogador tem mais metralhadores que fuzileiros; senão metralhador se o jogador tem mais unidades vivas que o computador; senão fuzileiro.
- **Movimento**: `front` = menor `at` entre unidades do computador assentadas em trincheiras (nenhuma → não move). `ratio = strength(e, front) / max(1, strength(p, front-1))`. Se `front === 0`, `front-1` é a base do jogador e a força do jogador lá é 0 (o `order` só deixa ir à base se o computador dominar todas as trincheiras). Avança (`order(state,'e',1)`) se `ratio > diff.avancar` e `alive(e) >= diff.minTropa`. Recua (`order(state,'e',-1)`) se `contested(front)` e `ratio < 0.5`.

- [ ] **Step 1: Write the failing tests**

```js
test('AI advances when clearly stronger', () => {
  /* soldado: 5 e fuzileiros settled at idx 2 (x 750), no p units -> aiThink -> all e targets === 1 */
});
test('AI holds when weaker', () => { /* 4 e at idx 2, 6 p metralhadores settled at idx 1 -> targets stay 2 */ });
test('veterano buys granadeiro against packed trench', () => {
  /* 3 p fuzileiros settled at idx 0, money.e 1000 -> aiThink -> newest e unit type granadeiro */
});
test('AI never overspends', () => { /* general, run 300s with player idle: money.e never < 0 (check each tick) */ });
test('same seed gives same game', () => { /* two games seed 42 general, 200s each -> JSON of units/money equal (excluding rand fn) */ });
test('general beats an idle player', () => { /* campo/general, player does nothing, run up to 900s -> over === 'e' */ });
test('recruta is beatable by a simple player', () => {
  /* campo/recruta seed 1..5: each second buy fuzileiro if money>=50; every 5s if alive(p)>=5 order('p',1).
     run up to 900s -> over === 'p' in all 5 seeds */
});
```

- [ ] **Step 2: Run** `node --test trincheira/test/ai.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** `aiThink`, `chooseType`, `strength`; ligar em `step`.
- [ ] **Step 4: Run** `node --test trincheira/test/` — Expected: PASS. Se os dois últimos testes falharem por balanceamento, ajuste só os números de `DIFFS` (não as regras) e anote a mudança no spec.
- [ ] **Step 5: Commit** `git commit -m "feat(trincheira): IA do inimigo com 4 dificuldades"`

---

### Task 6: Tela da partida (desenho, controles, loop)

**Files:**
- Create: `trincheira/index.html`

**Interfaces:**
- Consumes: `window.Trincheira` (`createGame`, `buy`, `order`, `step`, `UNITS`, `MAPS`, `DIFFS`, `alive`); carrega `<script src="logic.js">` antes do script da página.

Decisões:
- Cabeçalho `<head>` igual ao do Aero Patrulha (viewport, theme-color `#0d1410`, apple/mobile web app capable, tokens `:root` claro/escuro, `body` sem scroll e `touch-action:none`).
- Canvas lógico 960×540 escalado para caber na janela (mesma ideia do `resize()` do Aero). Chão em y≈380; mundo→tela: `sx = 40 + x * 0.88`.
- Loop: `dt = min(0.25, (agora - antes)/1000)`; acumulador consumindo `step(state, 1/60)`.
- Desenha: céu/chão nas cores do mapa, trincheiras (vala + sacos de areia, borda colorida pelo dono), as duas bases com barra de vida, soldados (figuras pequenas; jogador verde-oliva, inimigo cinza; forma diferente por tipo), clarões de tiro e explosões a partir de `state.events` (esvaziar após ler).
- HUD topo: dinheiro (`$` + `Math.floor`), soldados `alive/30`, tempo. Botão pausa no canto.
- Barra inferior: 3 botões de compra (nome + preço, apagados se sem dinheiro ou 30 vivos), `◀ Recuar`, `Avançar ▶`. Teclas 1/2/3, A/←, D/→, P/Esc.
- Nesta task a página abre direto numa partida `campo`/`soldado` com seed `Date.now()` (menus vêm na Task 7).

- [ ] **Step 1: Implement** `trincheira/index.html`.
- [ ] **Step 2: Verify in browser** — abrir `trincheira/index.html` por um servidor estático na pasta `games/` (ex.: `python -m http.server 8080`, ou o preview do app) e confirmar: comprar um fuzileiro → ele corre até a primeira trincheira; Avançar/Recuar movem o grupo uma trincheira; o computador compra e ataca; dá para vencer e perder; trocar de aba por 30 s e voltar não teleporta ninguém; sem erros no console.
- [ ] **Step 3: Run** `node --test trincheira/test/` — Expected: PASS (nada da lógica quebrou).
- [ ] **Step 4: Commit** `git add trincheira/index.html && git commit -m "feat(trincheira): tela da partida"`

---

### Task 7: Menus, fim de partida, pausa, sons e recordes

**Files:**
- Modify: `trincheira/index.html`

**Interfaces:**
- Consumes: Task 6.
- Produces: estados de tela `'menu'|'mapa'|'dificuldade'|'jogo'|'pausa'|'fim'`; chave `localStorage` `tr_vitorias` = JSON array de strings `"<mapId>:<diffId>"`.

Decisões:
- Menu: título "TRINCHEIRA", botão Jogar. Mapa: 4 cartões (nome, nº de trincheiras, estrela se venceu em qualquer dificuldade). Dificuldade: 4 botões (estrela se venceu nessa combinação). Botão Voltar nas telas de escolha.
- Fim: "VITÓRIA" ou "DERROTA", tempo (m:ss), abates do jogador, botões "Jogar de novo" (mesmo mapa+dificuldade) e "Menu". Vitória grava a combinação em `tr_vitorias`.
- Pausa: botão/teclas P/Esc e `visibilitychange` escondido → pausa; tela de pausa com Continuar e Menu.
- Retrato: se `innerHeight > innerWidth`, cobrir com "Gire o celular" e pausar.
- Sons com WebAudio no estilo `beep`/`noise` do Aero (`aero-patrulha/index.html:53-75`): tiro, metralhadora, explosão, compra, ordem, vitória, derrota. Áudio só inicia no primeiro toque.

- [ ] **Step 1: Implement** as telas, pausa, retrato, sons e recordes.
- [ ] **Step 2: Verify in browser** — percorrer menu → mapa → dificuldade → jogo nos 4 mapas; vencer uma partida (use Recruta) e ver a estrela; recarregar e a estrela continua; abrir em janela anônima com armazenamento bloqueado e o jogo funciona; viewport 375×812 mostra "Gire o celular"; 812×375 joga normalmente.
- [ ] **Step 3: Commit** `git commit -am "feat(trincheira): menus, pausa, sons e vitórias salvas"`

---

### Task 8: PWA, ícones e cartão no portal

**Files:**
- Create: `tools/make-icons.mjs`, `trincheira/manifest.webmanifest`, `trincheira/sw.js`, `trincheira/icon-192.png`, `trincheira/icon-512.png`, `trincheira/icon-maskable-512.png`
- Modify: `trincheira/index.html` (link do manifest, registro do service worker, ícones apple), `index.html` (portal)

Decisões:
- `make-icons.mjs`: desenha num buffer RGBA (fundo `#0d1410`, faixa de terra marrom, vala escura, capacete verde-oliva) e grava PNG com `zlib.deflateSync` + CRC32 próprio. Uso: `node tools/make-icons.mjs trincheira`. Maskable: mesmo desenho dentro dos 80% centrais.
- `manifest.webmanifest`: igual ao do Aero com `name`/`short_name` "Trincheira", `description` "Compre soldados, tome as trincheiras e destrua a base inimiga.", `orientation` `"landscape"`.
- `sw.js`: igual ao do Aero com `CACHE='trincheira-v1'` e `FILES` incluindo `logic.js`.
- Portal: cartão `<a class="card" href="trincheira/">` com ícone 192, título "Trincheira", texto "Soldados, trincheiras e 4 dificuldades".

- [ ] **Step 1: Implement** script de ícones e rodar `node tools/make-icons.mjs trincheira`; criar manifest e sw; ligar no `index.html`; cartão no portal.
- [ ] **Step 2: Verify in browser** — portal mostra o cartão e abre o jogo; DevTools > Application mostra manifest válido e service worker ativo; com a rede desligada, recarregar e o jogo abre.
- [ ] **Step 3: Run** `node --test trincheira/test/` — Expected: PASS.
- [ ] **Step 4: Commit** `git add tools trincheira index.html && git commit -m "feat(trincheira): PWA, ícones e cartão no portal"`
