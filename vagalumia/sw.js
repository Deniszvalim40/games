const CACHE='vagalumia-v3';
const FILES=['./','index.html','logic.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','../ranking/config.js','../ranking/pix.js','../ranking/qrcode.js','../ranking/ranking.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
// só apaga caches antigos do próprio Vagalumia (os outros jogos dividem a origem)
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('vagalumia-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));
});
