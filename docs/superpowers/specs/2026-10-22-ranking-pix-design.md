# Ranking online com Pix — design

Ranking online por jogo (Vagalumia, Trincheira, Aero Patrulha), hospedado junto com os jogos no GitHub Pages e com os nomes guardados no Firebase (Firestore, plano grátis).

## Faixa na base do jogo

- Uma faixa fina fixa no rodapé de cada jogo, com os **50 melhores** daquele jogo passando em rolagem: "1º ANA · Nível 42 · 2º ZÉ · …".
- Sem ninguém ainda: "Seja o primeiro no ranking! Toque aqui". Sem internet ou sem Firebase configurado: "Ranking online em breve".
- Tocar na faixa abre a janela do ranking (a Aero Patrulha pausa se estiver em jogo).
- A lista atualiza a cada 60 s e logo depois de um nome novo.

## Entrar no ranking

1. A janela mostra a lista completa e **a sua pontuação atual**. Sem pontuação (0), o botão fica desligado.
2. **Pix:** a pessoa escolhe o valor (mínimo **R$ 1,00**). O jogo gera o **QR code** e o **Pix copia e cola** (BR Code estático) para a chave `kurtgv@outlook.com`, com um código curto de identificação (ex.: `VG7K2QXM`) que aparece no extrato.
3. Botão **"Já fiz o Pix"** libera o campo do nome (até 16 letras).
4. **Salvar** grava direto no ranking, **sem aprovação** (escolha do dono). Nomes indevidos são apagados pelo painel do Firebase.

Cada pagamento é uma linha no ranking (a mesma pessoa pode aparecer mais de uma vez).

## Pontuação de cada jogo

- **Vagalumia:** níveis completos (`nível atual − 1`). Mostra "Nível N".
- **Aero Patrulha:** recorde de pontos (`ap_hi`). Mostra "N pts".
- **Trincheira:** `prestígios × 100 + vitórias diferentes` (mapa × dificuldade, no máximo 16). Mostra "★P · V vitórias".

## Banco

- Uma coleção por jogo: `rank_vagalumia`, `rank_trincheira`, `rank_aero`. Campos: `name`, `score` (inteiro), `valor` (R$), `codigo`, `at`.
- Os jogos falam com o Firestore pela API REST (sem SDK). Leitura pública; criação pública validada pelas regras (tamanhos, tipos, valor ≥ 1); ninguém altera nem apaga pelo site.
- A configuração (projeto e chave pública do Firebase, chave Pix, nome e cidade do recebedor) fica em `ranking/config.js`.

## Limites conhecidos (aceitos)

- Sem confirmação do Pix: alguém pode tocar em "Já fiz o Pix" sem pagar.
- A pontuação vem do aparelho e pode ser forjada.
- A confirmação automática pode vir depois com a API de um banco/PSP (ex.: Asaas) e webhook.
