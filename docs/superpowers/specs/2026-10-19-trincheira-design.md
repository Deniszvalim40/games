# Trincheira — Design

Data: 2026-10-19
Status: rascunho para revisão

Legenda: **[Denis]** = decidido por você na conversa. **[Claude]** = escolha minha, pode mudar.

## Intenção

Um jogo de guerra de trincheiras para o portal `games/`, no mesmo espírito do Aero Patrulha: um único jogo no navegador, rápido de abrir, jogável no celular e no PC, instalável (PWA).

## Como funciona

- **[Denis]** Nenhum soldado aparece de graça: o jogador **compra** cada soldado.
- **[Denis]** Assim que é comprado, o soldado sai da base e vai **sozinho para a primeira trincheira**.
- **[Denis]** Há um botão **Avançar** e um botão **Recuar** que mandam os soldados para a próxima trincheira / para a anterior.
- **[Denis]** Depois de **dominar todas as trincheiras**, o jogador precisa **destruir a base do inimigo**.
- **[Denis]** O inimigo é controlado por uma **inteligência artificial** (o computador).
- **[Denis]** Vários **mapas de trincheiras** e vários **níveis de dificuldade**.

### Detalhes de regra

- **[Claude]** Visão lateral, tela deitada (paisagem). Base do jogador à esquerda, base inimiga à direita, trincheiras entre elas.
- **[Claude]** Os botões Avançar/Recuar valem para **todos** os soldados de uma vez; cada um anda **uma** trincheira a partir da última que alcançou (apertar várias vezes não pula trincheiras).
- **[Claude]** Um soldado não avança se a trincheira dele está em disputa (há inimigos nela).
- **[Claude]** Uma trincheira é **dominada** por um lado quando só soldados desse lado estão nela. Vazia, ela continua com o último dono. No início, a primeira trincheira é do jogador, a última é do inimigo, as do meio são de ninguém.
- **[Claude]** Avançar a partir da última trincheira só leva até a base inimiga se **todas** as trincheiras forem do jogador. Quem já está atacando a base continua atacando mesmo que uma trincheira seja perdida depois.
- **[Claude]** Dentro da trincheira o soldado tem **cobertura** (recebe 40% do dano), exceto contra quem está na mesma trincheira (combate corpo a corpo) e contra granadas.
- **[Claude]** Soldados atiram sozinhos no inimigo mais próximo ao alcance, inclusive andando.
- **[Claude]** As bases têm uma metralhadora fraca de defesa e 1000 de vida.
- **[Claude]** Vitória: base inimiga chega a 0. Derrota: sua base chega a 0. O computador segue as mesmas regras (compra, avança, recua, ataca sua base).

### Dinheiro **[Claude]**

- Começa com $150. Ganha $10 por segundo. Cada inimigo morto dá metade do preço dele.
- No máximo 30 soldados vivos por lado.

### Tipos de soldado **[Claude]**

| Soldado | Preço | Vida | Dano | Alcance | Tiro a cada | Velocidade | Especial |
|---|---|---|---|---|---|---|---|
| Fuzileiro | $50 | 100 | 12 | 160 | 1,0 s | 40 | — |
| Metralhador | $120 | 140 | 5 | 200 | 0,2 s | 25 | — |
| Granadeiro | $150 | 90 | 35 | 130 | 2,5 s | 35 | ignora cobertura, acerta todos num raio de 40 |

(Distâncias em unidades do mundo, que vai de 0 = base do jogador a 1000 = base inimiga. Velocidade em unidades por segundo.)

### Mapas **[Claude]**

| Mapa | Trincheiras (posição x) | Efeito |
|---|---|---|
| Campo Aberto | 250, 500, 750 | — |
| Lamaçal | 200, 400, 600, 800 | soldados andam a 60% da velocidade |
| Floresta | 220, 420, 580, 780 | cobertura melhor: recebe 30% do dano |
| Colinas | 170, 335, 500, 665, 830 | — |

Cada mapa tem paleta de cores própria (céu, chão, trincheira).

### Dificuldades **[Claude]**

| Nível | Renda do computador | Pensa a cada | Comportamento |
|---|---|---|---|
| Recruta | 50% | 4 s | compra aleatório, ataca cedo e mal (avança com 4 soldados e vantagem pequena) |
| Soldado | 110% | 3 s | equilibrado (avança com 6 soldados e o dobro e meio da sua força) |
| Veterano | 150% | 2 s | compra para combater o que você tem; segura a trincheira até ter muita vantagem |
| General | 220% | 1,2 s | igual Veterano, compra 2 por vez e só ataca com exército grande |

Ajustado com partidas simuladas contra um jogador simples (junta 6 soldados e avança): o jogador vence ~100% no Recruta, ~28% no Soldado, ~16% no Veterano e ~3% no General (64 partidas por nível). O computador leva em conta a cobertura de quem está entrincheirado antes de atacar.

### Telas **[Claude]**

Menu → escolher mapa → escolher dificuldade → partida → fim (Vitória/Derrota, tempo, abates, Jogar de novo / Menu). Pausa a qualquer momento. No celular em pé, aviso "Gire o celular". O jogo guarda no aparelho quais combinações mapa+dificuldade você já venceu e mostra uma estrela no cartão do mapa.

### Controles **[Claude]**

- Toque/clique nos botões na parte de baixo: 3 botões de compra (com preço; apagados sem dinheiro), ◀ Recuar, Avançar ▶.
- Teclado: 1/2/3 compram, A/← recua, D/→ avança, P/Esc pausa.

## Objetivos / não-objetivos

- Objetivo: partida de 3 a 8 minutos, divertida no celular e no PC, sem nada para instalar.
- Não é objetivo: multiplayer, ranking online, campanha com história, upgrades permanentes.
- Seria um fracasso: travar ou ficar lento no celular, ou o computador ser impossível de vencer no Recruta.

## Restrições

- Igual ao Aero Patrulha: HTML + JavaScript puro, desenho em `<canvas>`, sons gerados (WebAudio), nada de bibliotecas, funciona offline (service worker), textos em português.
- Fica em `games/trincheira/` e ganha um cartão no `games/index.html`.

## Para quem for construir decidir

Desenho dos soldados e cenário, sons, animações, layout exato dos botões, ajuste fino dos números depois de jogar.
