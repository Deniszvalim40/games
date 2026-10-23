// Configuração do ranking online (vale para todos os jogos).
// projectId e apiKey vêm do Firebase: Configurações do projeto → Seus apps → Web.
// A apiKey do Firebase é pública por natureza; quem protege o banco são as regras (ranking/firestore.rules).
window.RANKING_CONFIG = {
  projectId: '',
  apiKey: '',
  pixKey: 'kurtgv@outlook.com',
  pixName: 'RANKING GAMES', // nome do recebedor no QR (até 25 letras)
  pixCity: 'BRASIL'         // cidade do recebedor (até 15 letras)
};
