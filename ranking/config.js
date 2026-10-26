// Configuração do ranking online (vale para todos os jogos).
// projectId e apiKey vêm do Firebase: Configurações do projeto → Seus apps → Web.
// A apiKey do Firebase é pública por natureza; quem protege o banco são as regras (ranking/firestore.rules).
window.RANKING_CONFIG = {
  projectId: 'games-ranking-d97d5',
  apiKey: 'AIzaSyAnzbTMSej194U8qj8BI20pSfg8y_6qjws',
  pixKey: 'kurtgv@outlook.com',
  pixName: 'RANKING GAMES', // nome do recebedor no QR (até 25 letras)
  pixCity: 'BRASIL'         // cidade do recebedor (até 15 letras)
};
