// هدايا أمير — offline shell. Pages load fresh from the network when online; the saved copy is used when offline.
// Hashed build files (assets/) and 3D models never change once published, so they are served from the cache first.
const CACHE = "ameer-gift-v2";
const SHELL = ["./", "./index.html", "./museum.html", "./admin.html", "./credits.html", "./logo-full.png", "./logo-full-light.png", "./logo-icon.png", "./icon-192.png", "./icon-512.png", "./manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return; // Firebase, fonts and YouTube go straight to the network
  if (/\/(assets|models|templates)\//.test(u.pathname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })));
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("./index.html"))));
});
