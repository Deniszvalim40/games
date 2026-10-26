// Ranking online com Pix — faixa no rodapé + janela de entrada. Usa ranking/config.js, pix.js e qrcode.js.
// Uso no jogo: Ranking.init({game, col, prefix, score:()=>n, fmt:n=>'texto', onOpen, onClose})
(function () {
const C = window.RANKING_CONFIG || {}, P = window.Pix;
const H = 26;
window.RANK_H = H;
document.documentElement.style.setProperty('--rk', 'calc(' + H + 'px + env(safe-area-inset-bottom))');
const ON = !!(C.projectId && C.apiKey && P && window.qrcode);
const BASE = 'https://firestore.googleapis.com/v1/projects/' + C.projectId + '/databases/(default)/documents/';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const brl = v => 'R$ ' + v.toFixed(2).replace('.', ',');

const CSS = `
#rk-bar{position:fixed;left:0;right:0;bottom:0;height:${H}px;padding-bottom:env(safe-area-inset-bottom);display:flex;align-items:center;gap:6px;background:#0b0f1aee;border-top:1px solid #ffd54a55;color:#f2f4f8;font:600 12px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;z-index:40;cursor:pointer;user-select:none;-webkit-user-select:none}
#rk-bar .rk-cup{flex:none;padding:0 6px 0 10px;font-size:13px}
#rk-bar .rk-track{flex:1;min-width:0;overflow:hidden;white-space:nowrap}
#rk-bar .rk-run{display:inline-block;padding-left:100%;animation:rk-roll var(--rk-dur,40s) linear infinite}
#rk-bar .rk-run.still{padding-left:0;animation:none}
#rk-bar .rk-run b{color:#ffd54a;margin-right:3px}#rk-bar .rk-run i{font-style:normal;opacity:.7;margin:0 16px 0 4px}
#rk-bar .rk-in{flex:none;margin-right:8px;padding:3px 8px;border-radius:9px;background:#ffd54a;color:#2a1d00;font-weight:800}
@keyframes rk-roll{to{transform:translateX(-100%)}}
@media (prefers-reduced-motion:reduce){#rk-bar .rk-run{padding-left:0;animation:none}}
#rk-dlg{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:#000a;font:15px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f2f4f8}
#rk-dlg[hidden]{display:none}
#rk-dlg .rk-card{width:min(360px,100%);max-height:100%;overflow:auto;touch-action:pan-y;overscroll-behavior:contain;box-sizing:border-box;padding:16px;border-radius:16px;background:#141a28;border:1px solid #ffd54a66;box-shadow:0 10px 40px #000a}
#rk-dlg header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
#rk-dlg header b{font-size:17px}
#rk-dlg button{font:inherit;font-weight:800;color:inherit;border:0;border-radius:12px;cursor:pointer}
#rk-dlg .rk-x{width:34px;height:34px;background:#ffffff14}
#rk-dlg .rk-main{width:100%;padding:12px;margin-top:10px;background:#ffd54a;color:#2a1d00}
#rk-dlg .rk-main:disabled{opacity:.45;cursor:default}
#rk-dlg .rk-sec{width:100%;padding:10px;margin-top:8px;background:#ffffff14}
#rk-dlg ol{margin:0;padding:0;list-style:none;max-height:240px;overflow:auto;touch-action:pan-y;border-radius:10px;background:#0b0f1a}
#rk-dlg li{display:flex;gap:8px;padding:7px 10px;border-bottom:1px solid #ffffff0d;font-size:14px}
#rk-dlg li span:first-child{width:30px;color:#ffd54a;font-weight:800}
#rk-dlg li span:nth-child(2){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#rk-dlg li span:last-child{opacity:.8;font-variant-numeric:tabular-nums}
#rk-dlg .rk-empty{padding:14px;text-align:center;opacity:.75;font-size:14px}
#rk-dlg p{margin:10px 0 0;font-size:14px}
#rk-dlg .rk-note{opacity:.7;font-size:12px}
#rk-dlg label{display:block;font-size:13px;opacity:.85}
#rk-dlg input,#rk-dlg textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border-radius:10px;border:2px solid #ffffff2a;background:#0b0f1a;color:inherit;font:inherit;user-select:text;-webkit-user-select:text;outline:none}
#rk-dlg input:focus{border-color:#ffd54a}
#rk-dlg textarea{height:64px;resize:none;font:12px/1.3 ui-monospace,Consolas,monospace;word-break:break-all}
#rk-dlg .rk-qr{display:flex;justify-content:center;margin:12px auto 0;width:200px;height:200px;border-radius:12px;overflow:hidden;background:#fff}
#rk-dlg .rk-qr svg{width:100%;height:100%}
#rk-dlg .rk-err{color:#ff8a80}
`;

let cfg = null, list = [], state = ON ? 'load' : 'off', step = 'list', myScore = 0, code = '', valor = 1;
let bar, run, dlg, card;
const WAIT = 60; // segundos com o "Já fiz o Pix" travado, contados ao abrir o Pix e de novo ao copiar o código
let pixOk = true, waitUntil = 0, waitTimer = 0;

function build() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  bar = document.createElement('div'); bar.id = 'rk-bar';
  bar.innerHTML = '<span class="rk-cup">🏆</span><div class="rk-track"><span class="rk-run"></span></div><span class="rk-in">Entrar</span>';
  run = bar.querySelector('.rk-run');
  dlg = document.createElement('div'); dlg.id = 'rk-dlg'; dlg.hidden = true;
  dlg.innerHTML = '<div class="rk-card" role="dialog" aria-modal="true" aria-label="Ranking"></div>';
  card = dlg.firstChild;
  document.body.append(bar, dlg);
  // os toques e teclas da faixa e da janela não chegam ao jogo
  for (const el of [bar, dlg]) for (const t of ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'click', 'keydown', 'keyup', 'wheel', 'contextmenu'])
    el.addEventListener(t, e => e.stopPropagation(), t.startsWith('touch') || t === 'wheel' ? { passive: true } : false);
  bar.addEventListener('click', open);
  dlg.addEventListener('click', e => { if (e.target === dlg) close() });
  dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close() });
}

function renderBar() {
  let html, still = false;
  if (state === 'off') { html = 'Ranking online em breve'; still = true }
  else if (state === 'load') { html = 'Carregando ranking…'; still = true }
  else if (state === 'err' && !list.length) { html = 'Ranking sem conexão agora'; still = true }
  else if (!list.length) { html = 'Seja o primeiro no ranking! Toque aqui'; still = true }
  else html = list.map((r, i) => '<b>' + (i + 1) + 'º</b>' + esc(r.name) + '<i>' + esc(cfg.fmt(r.score)) + '</i>').join('');
  run.innerHTML = html;
  run.classList.toggle('still', still);
  run.style.setProperty('--rk-dur', Math.max(20, list.length * 3) + 's');
}

async function load() {
  if (!ON) { renderBar(); return }
  try {
    const r = await fetch(BASE + cfg.col + '?orderBy=score%20desc&pageSize=50&key=' + C.apiKey);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    list = (j.documents || []).map(d => ({ name: (d.fields.name || {}).stringValue || '?', score: +((d.fields.score || {}).integerValue || 0) }));
    state = 'ok';
  } catch (e) { state = 'err' }
  renderBar();
  if (!dlg.hidden && step === 'list') renderDlg();
}

function listHTML() {
  if (state === 'off') return '<div class="rk-empty">O ranking online está sendo ligado. Volte em breve!</div>';
  if (state === 'load') return '<div class="rk-empty">Carregando…</div>';
  if (!list.length) return '<div class="rk-empty">' + (state === 'err' ? 'Sem conexão com o ranking agora.' : 'Ninguém ainda. Seja o primeiro!') + '</div>';
  return '<ol>' + list.map((r, i) => '<li><span>' + (i + 1) + 'º</span><span>' + esc(r.name) + '</span><span>' + esc(cfg.fmt(r.score)) + '</span></li>').join('') + '</ol>';
}

function renderDlg() {
  const head = '<header><b>🏆 Ranking · ' + esc(cfg.game) + '</b><button class="rk-x" aria-label="Fechar">✕</button></header>';
  let body = '';
  if (step === 'list') {
    const sc = Math.max(0, Math.floor(+cfg.score() || 0));
    body = listHTML()
      + '<p>Sua pontuação: <b>' + (sc > 0 ? esc(cfg.fmt(sc)) : 'jogue para pontuar') + '</b></p>'
      + '<button class="rk-main" data-go="pix"' + (ON && sc > 0 ? '' : ' disabled') + '>Colocar meu nome</button>'
      + '<p class="rk-note">Para entrar no ranking: um Pix de R$ 1,00 ou mais.</p>';
  } else if (step === 'pix') {
    body = '<label>Valor do Pix (mínimo R$ 1,00)<input class="rk-val" inputmode="decimal" value="' + valor.toFixed(2).replace('.', ',') + '"></label>'
      + '<div class="rk-qr"></div>'
      + '<label style="margin-top:10px">Pix copia e cola<textarea class="rk-cc" readonly></textarea></label>'
      + '<button class="rk-sec" data-copy>Copiar código Pix</button>'
      + '<p class="rk-note">Chave ' + esc(C.pixKey) + ' · identificação ' + code + '</p>'
      + '<button class="rk-main" data-go="name">Já fiz o Pix</button>'
      + '<button class="rk-sec" data-go="list">Voltar</button>';
  } else if (step === 'name') {
    body = '<p style="margin-top:0">Obrigado pelo Pix! Pontuação: <b>' + esc(cfg.fmt(myScore)) + '</b></p>'
      + '<label style="margin-top:10px">Seu nome no ranking<input class="rk-name" maxlength="16" autocomplete="off" enterkeyhint="done" placeholder="Até 16 letras"></label>'
      + '<button class="rk-main" data-save>Salvar no ranking</button><p class="rk-msg rk-err"></p>';
  } else {
    body = '<p style="margin-top:0;font-size:16px">' + esc(step) + '</p><button class="rk-main" data-go="list">Ver o ranking</button>';
  }
  card.innerHTML = head + body;
  card.querySelector('.rk-x').onclick = close;
  card.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  if (step === 'pix') {
    const vin = card.querySelector('.rk-val');
    vin.oninput = () => { const v = P.parseValor(vin.value); if (v) valor = v; drawPix(!!v) };
    vin.onblur = () => { vin.value = valor.toFixed(2).replace('.', ','); drawPix(true) };
    card.querySelector('[data-copy]').onclick = copy;
    drawPix(true);
    startWait();
  }
  if (step === 'name') {
    const nin = card.querySelector('.rk-name');
    try { nin.value = localStorage.getItem('rk_nome') || '' } catch (e) {}
    nin.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); save() } };
    card.querySelector('[data-save]').onclick = save;
    setTimeout(() => nin.focus(), 50);
  }
}

function drawPix(ok) {
  const qr = card.querySelector('.rk-qr'), cc = card.querySelector('.rk-cc'), paid = card.querySelector('[data-go=name]');
  pixOk = ok; paintWait();
  if (!ok) { qr.innerHTML = ''; cc.value = 'O valor mínimo é R$ 1,00.'; return }
  const s = P.brCode({ key: C.pixKey, name: C.pixName, city: C.pixCity, amount: valor, txid: code });
  const q = qrcode(0, 'M'); q.addData(s); q.make();
  qr.innerHTML = q.createSvgTag({ cellSize: 4, margin: 12, scalable: true });
  cc.value = s;
}

function startWait() {
  waitUntil = Date.now() + WAIT * 1000;
  clearInterval(waitTimer); waitTimer = setInterval(paintWait, 250); paintWait();
}
function paintWait() {
  const paid = card.querySelector('[data-go=name]');
  if (!paid) { clearInterval(waitTimer); return }
  const left = Math.ceil((waitUntil - Date.now()) / 1000);
  paid.disabled = !pixOk || left > 0;
  paid.textContent = left > 0 ? 'Já fiz o Pix (aguarde 0:' + String(left).padStart(2, '0') + ')' : 'Já fiz o Pix';
  if (left <= 0) clearInterval(waitTimer);
}

function copy() {
  const cc = card.querySelector('.rk-cc'), b = card.querySelector('[data-copy]');
  startWait();
  const done = () => { b.textContent = 'Copiado ✓'; setTimeout(() => { b.textContent = 'Copiar código Pix' }, 1800) };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cc.value).then(done, fallback);
  else fallback();
  function fallback() { cc.focus(); cc.select(); try { document.execCommand('copy'); done() } catch (e) {} }
}

function go(to) {
  if (to === 'pix') {
    myScore = Math.max(0, Math.floor(+cfg.score() || 0));
    if (!ON || myScore <= 0) return;
    code = P.makeCode(cfg.prefix);
  }
  step = to; renderDlg();
}

async function save() {
  const nin = card.querySelector('.rk-name'), msg = card.querySelector('.rk-msg'), btn = card.querySelector('[data-save]');
  const name = P.cleanName(nin.value);
  if (!name) { msg.textContent = 'Digite seu nome.'; nin.focus(); return }
  try { localStorage.setItem('rk_nome', name) } catch (e) {}
  btn.disabled = true; btn.textContent = 'Salvando…'; msg.textContent = '';
  const fields = { name: { stringValue: name }, score: { integerValue: String(myScore) }, valor: { doubleValue: valor }, codigo: { stringValue: code }, at: { timestampValue: new Date().toISOString() } };
  try {
    const r = await fetch(BASE + cfg.col + '?key=' + C.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!r.ok) throw new Error(r.status);
    const pos = list.filter(x => x.score > myScore).length + 1;
    step = pos <= 50 ? 'Pronto, ' + name + '! Você está em ' + pos + 'º lugar.' : 'Pronto, ' + name + '! Seu nome foi salvo; ainda fora do top 50.';
    renderDlg(); load();
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Tentar de novo';
    msg.textContent = 'Não consegui salvar. Confira a internet e tente de novo.';
  }
}

function open() {
  if (!dlg.hidden) return;
  if (cfg.onOpen) cfg.onOpen();
  step = 'list'; dlg.hidden = false; renderDlg(); load();
}
function close() {
  if (dlg.hidden) return;
  dlg.hidden = true; card.innerHTML = '';
  if (cfg.onClose) cfg.onClose();
}

window.Ranking = {
  height: H,
  init(o) {
    cfg = o; build(); renderBar(); load();
    setInterval(() => { if (!document.hidden) load() }, 60000);
  },
  open
};
})();
