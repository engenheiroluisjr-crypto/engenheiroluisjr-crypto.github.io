/* Service worker do painel de obras.
   - HTML (a pagina): rede primeiro; sem rede, a ultima copia guardada.
   - resto (sienge.js, entregas.js, libs/, orc/*.json): responde do cache se tiver e
     atualiza por tras (stale-while-revalidate). Assim o 4G nao baixa de novo o que ja tem.
   - so mexe em pedidos GET da propria origem; a API do tempo (open-meteo) passa reto. */
const VERSAO = 'painel-v1';
const PRE = ['./', 'sienge.js', 'sienge_itens.js', 'entregas.js',
             'libs/jspdf.umd.min.js', 'libs/jspdf.plugin.autotable.min.js', 'libs/xlsx.mini.min.js'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSAO).then(c => Promise.allSettled(PRE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const ehPagina = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (ehPagina) {
    ev.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSAO).then(c => c.put('./', cp)); return r; })
                             .catch(() => caches.match('./')));
    return;
  }
  ev.respondWith(caches.open(VERSAO).then(async c => {
    const emCache = await c.match(req, { ignoreSearch: true });
    const daRede = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    return emCache || (await daRede) || new Response('', { status: 503, statusText: 'offline' });
  }));
});
