# Vagalumia — design

Jogo de quebra-cabeça para passar o tempo (sem guerra). Terceiro jogo do portal ATARI, ao lado de Aero Patrulha e Trincheira.

## A fase

- **Imagem no meio:** pixel art que começa apagada (cada quadradinho mostra a cor bem fraca). A imagem muda a cada fase. **O fundo também é pintado** (uma cor só), então as cores do desenho começam presas e só abrem quando o fundo em volta acende.
- **Potes embaixo:** 5 colunas × 5 de profundidade. Cada pote tem uma cor e um número (quantos vaga-lumes tem dentro, de 12 a 30). **Só a linha da frente é clicável**; quando um pote sai, o de trás desce. As cores de trás ficam visíveis, mas apagadas.
- **Barra com 5 vagas:** o pote clicado vai para a barra e solta os vaga-lumes. Cada vaga-lume acende **um quadradinho exposto da mesma cor**.
- **Exposto** = encostado por cima, baixo ou lados na borda da imagem ou num quadradinho já aceso. **Diagonal não vale.** A imagem acende de fora para dentro.
- O pote sai da barra quando o número chega a 0.
- **Ganha** quando a imagem inteira acende. **Perde** quando a barra está cheia e nenhum vaga-lume tem quadradinho exposto para acender.
- Os quadradinhos expostos piscam o contorno.
- **Prévia (até o nível 50):** segurando o dedo num pote, os quadradinhos expostos daquela cor brilham mais.
- **Dá para perder:** pegar pote de cor que ainda não tem quadradinho exposto ocupa a vaga; com as 5 vagas presas, a fase acaba.
- Toda fase tem solução: o total de vaga-lumes de cada cor é igual ao total de quadradinhos dessa cor.

## Níveis

- **Normal:** a imagem começa em 28×28 e cresce até 55×55 (3× os quadrados do desenho original de 16→32). Todos os níveis têm a dificuldade do super difícil: começa com 5 cores e chega a 8, potes bem embaralhados.
- **Final 5 (5, 15, 25…) = Difícil:** imagem ~30% maior de lado. Aviso laranja.
- **Final 0 (10, 20, 30…) = Super difícil:** imagem ~60% maior (até 69×69); cores mais presas no meio. Aviso vermelho.
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

## Mascote e nome

- Um **vaga-lume animado com rosto feliz** (asas batendo, flutuando, barriga amarela que acende e apaga), com **VAGALUMIA** escrito em cima. Substitui a antiga faixa.
- **Começo da fase:** o vaga-lume entra voando com VAGALUMIA em cima, mostra "Nível N · Difícil", e sai depois de ~2 s.
- **Fim da fase:** entra e fica pulsando com "Nível N completo! ✨" e vaga-lumes espalhando.
- Nas fases difíceis e super difíceis, o vaga-lume continua amarelo piscando e só muda a aura em volta (laranja ou vermelha).

## Tela inicial

- **Topo:** vidas em potinhos acesos com o relógio da próxima vida; engrenagem com som e música.
- O vaga-lume mascote com VAGALUMIA em cima.
- **Pote grande com os níveis dentro**, subindo em zigue-zague: os vencidos em verde, o atual amarelo e maior, os difíceis com borda laranja. Vaga-lumes voando dentro.
- **Em cima do pote:** o próximo super difícil, numa bolinha vermelha pulsando.
- Ao vencer, os níveis descem um degrau no pote.
- **Botão JOGAR** grande, sempre no próximo nível.
- **Rodapé:** quantas ajudas estão guardadas.

## Visual e som

Noite, fundo azul-escuro, potes de vidro com tampa de madeira, brilho suave. Música leve de marimba com grilos baixinhos; um "pop" de bolha a cada quadradinho aceso, subindo de tom enquanto acendem seguidos; "pop" de madeira ao pegar pote.

## Formato

Igual aos outros jogos: pasta `games/vagalumia/` com `index.html`, lógica separada e testada (`logic.js`, como na Trincheira), PWA instalável (manifest, sw.js e ícones) e cartão no portal. Progresso, vidas e ajudas salvos no aparelho (localStorage). Sem anúncio e sem compra.

## Escolhas minhas (conferir)

- Os números de crescimento da imagem e de cores por nível.
- +1 vaga só uma vez por fase.
- O jogo oferece a ajuda antes de declarar a derrota.
- As imagens vêm de um conjunto de pixel arts desenhadas no próprio código (bichos, frutas, objetos), e as cores e a ordem dos potes são sorteadas de forma que a fase sempre tenha solução.
- Som de grilos e "plim".
- Nenhum limite de níveis: depois do 55×55 (69×69 nos especiais), as imagens só variam.
