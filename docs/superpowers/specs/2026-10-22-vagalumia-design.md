# Vagalumia — design

Jogo de quebra-cabeça para passar o tempo (sem guerra). Terceiro jogo do portal ATARI, ao lado de Aero Patrulha e Trincheira.

## A fase

- **Imagem no meio:** pixel art que começa apagada (cada quadradinho mostra a cor bem fraca). A imagem muda a cada fase.
- **Potes embaixo:** 5 colunas × 5 de profundidade. Cada pote tem uma cor e um número (quantos vaga-lumes tem dentro, de 12 a 30). **Só a linha da frente é clicável**; quando um pote sai, o de trás desce. As cores de trás ficam visíveis, mas apagadas.
- **Barra com 5 vagas:** o pote clicado vai para a barra e solta os vaga-lumes. Cada vaga-lume acende **um quadradinho exposto da mesma cor**.
- **Exposto** = encostado por cima, baixo ou lados na borda da imagem ou num quadradinho já aceso. **Diagonal não vale.** A imagem acende de fora para dentro.
- O pote sai da barra quando o número chega a 0.
- **Ganha** quando a imagem inteira acende. **Perde** quando a barra está cheia e nenhum vaga-lume tem quadradinho exposto para acender.
- Os quadradinhos expostos piscam o contorno.
- **Prévia (até o nível 50):** segurando o dedo num pote, os quadradinhos expostos daquela cor brilham mais.
- Toda fase tem solução: o total de vaga-lumes de cada cor é igual ao total de quadradinhos dessa cor.

## Níveis

- **Normal:** a imagem começa em 12×12 e cresce 1 a cada 2 níveis, até 32×32. Começa com 3 cores e chega a 8.
- **Final 5 (5, 15, 25…) = Difícil:** imagem ~30% maior de lado e +1 ou 2 cores; potes mais embaralhados. Aviso laranja.
- **Final 0 (10, 20, 30…) = Super difícil:** imagem ~60% maior (até 40×40) e +2 ou 3 cores; cores mais presas no meio. Aviso vermelho.
- Os quadradinhos diminuem para caber na tela, porque ninguém clica na imagem.

## Ajudas (rodapé da tela, abaixo dos potes)

- **➕ +1 vaga:** abre a 6ª vaga até o fim da fase (1 vez por fase).
- **🔀 Embaralhar:** mistura os potes que ainda estão nas colunas.
- **✋ Qualquer pote:** o próximo clique pode pegar um pote de qualquer linha.
- Começa com **2 de cada**. A cada 50 níveis ganha **+1 de cada**. Elas acumulam.
- **Ajuda usada é ajuda gasta:** se perder a fase mesmo assim, ela não volta.
- Quando a barra lota, o jogo oferece usar uma ajuda antes de declarar a derrota.

## Vidas

- No máximo **5**. Perder a fase tira 1; vencer não gasta nada.
- Recupera **1 a cada 10 minutos**, também com o jogo fechado.
- Com 0 vidas, mostra o relógio e não deixa jogar.
- "Tentar de novo" repete a mesma fase, com os mesmos potes na mesma ordem.

## Faixa do nome

- Faixa **ondulada, amarela, que acende e apaga como um vaga-lume** (brilho forte, depois quase apagada, devagar), escrita **VAGALUMIA**, levemente inclinada.
- **Começo da fase:** entra deslizando, as letras caem uma a uma, mostra "Nível N · Difícil", e sai depois de ~2 s.
- **Fim da fase:** entra e fica pulsando com "Nível N completo! ✨" e vaga-lumes espalhando.
- Nas fases difíceis e super difíceis, a faixa continua amarela piscando e só muda a aura em volta (laranja ou vermelha).

## Tela inicial

- **Topo:** vidas em potinhos acesos com o relógio da próxima vida; engrenagem com som e música.
- A faixa VAGALUMIA ondulando.
- **Pote grande com os níveis dentro**, subindo em zigue-zague: os vencidos em verde, o atual amarelo e maior, os difíceis com borda laranja. Vaga-lumes voando dentro.
- **Em cima do pote:** o próximo super difícil, numa bolinha vermelha pulsando.
- Ao vencer, os níveis descem um degrau no pote.
- **Botão JOGAR** grande, sempre no próximo nível.
- **Rodapé:** quantas ajudas estão guardadas.

## Visual e som

Noite, fundo azul-escuro, potes de vidro com tampa de madeira, brilho suave. Som calmo de grilos; um "plim" a cada quadradinho aceso.

## Formato

Igual aos outros jogos: pasta `games/vagalumia/` com `index.html`, lógica separada e testada (`logic.js`, como na Trincheira), PWA instalável (manifest, sw.js e ícones) e cartão no portal. Progresso, vidas e ajudas salvos no aparelho (localStorage). Sem anúncio e sem compra.

## Escolhas minhas (conferir)

- Os números de crescimento da imagem e de cores por nível.
- +1 vaga só uma vez por fase.
- O jogo oferece a ajuda antes de declarar a derrota.
- As imagens vêm de um conjunto de pixel arts desenhadas no próprio código (bichos, frutas, objetos), e as cores e a ordem dos potes são sorteadas de forma que a fase sempre tenha solução.
- Som de grilos e "plim".
- Nenhum limite de níveis: depois do 32×32 (40×40 nos especiais), as imagens só variam.
