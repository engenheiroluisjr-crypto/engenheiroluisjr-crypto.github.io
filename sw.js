/* Service worker do painel de obras.
   - HTML (a pagina) e os arquivos de DADOS (fech.js, lo.js, consolidado.js, sienge*.js,
     entregas.js): rede primeiro; sem rede, a ultima copia guardada. Sao os numeros --
     ver o dado de ontem por causa de cache ja aconteceu e confunde mais do que ajuda.
   - libs/ e o resto: responde do cache e atualiza por tras (stale-while-revalidate).
     Essas nao mudam, entao o 4G nao baixa de novo o que ja tem.
   - so mexe em pedidos GET da propria origem; a API do tempo (open-meteo) passa reto.

   ATENCAO ao ignoreSearch: com ele ligado, 'fech.js?cb=123' casa com o 'fech.js' do cache
   e o cache-busting nao funciona. Por isso os dados nao passam mais por esse caminho. */
const VERSAO = 'painel-v2';
const PRE = ['./', 'libs/jspdf.umd.min.js', 'libs/jspdf.plugin.autotable.min.js', 'libs/xlsx.mini.min.js'];
const DADOS = /\/(fech|lo|consolidado|sienge|sienge_itens|entregas)\.js$/;

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
  if (DADOS.test(url.pathname)) {                 // dados: rede primeiro
    ev.respondWith(fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(url.pathname, cp)); }
        return r;
      }).catch(() => caches.open(VERSAO).then(c => c.match(url.pathname))
                           .then(x => x || new Response('', { status: 503, statusText: 'offline' }))));
    return;
  }
  ev.respondWith(caches.open(VERSAO).then(async c => {
    const emCache = await c.match(req, { ignoreSearch: true });
    const daRede = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    return emCache || (await daRede) || new Response('', { status: 503, statusText: 'offline' });
  }));
});
