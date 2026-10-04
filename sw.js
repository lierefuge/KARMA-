/* ============================================================
   KARMA — sw.js   (v10.19)
   SERVICE WORKER: çevrimdışı önyükleme + güncelleme akışı.

   Strateji — dosya tipine göre ayrılır, çünkü tek bir strateji
   bu projede iki farklı hataya yol açar:
     · Cache-first her şeyde → oyuncu güncellemeyi ASLA görmez.
     · Network-first her şeyde → çevrimdışı çalışmaz, her açılış yavaş.

   Bu yüzden:
     · HTML / gezinme istekleri  → NETWORK-FIRST  (yeni sürüm önce gelsin)
     · version.json              → NETWORK-ONLY   (asla önbellekten okunmasın)
     · ?v= damgalı css/js        → CACHE-FIRST    (içerik hash'li, değişmez)
     · diğer aynı-köken istekler → STALE-WHILE-REVALIDATE
     · harici (fonts, iTunes, API) → DOKUNULMAZ (tarayıcı normal işlesin)

   Güncelleme akışı:
     install → yeni worker 'waiting' durumunda bekler (sayfa bozulmasın)
     sayfa tarafı (js/systems/updater.js) 'KARMA_SKIP_WAITING' mesajı yollar
     activate → eski önbellekler silinir, sayfa yenilenir.
   ============================================================ */

const VERSION = "10.57.0"; /* tools/gen-version-json.js ile aynı kaynaktan gelir */

/* ÖNBELLEK ADI İÇERİK HASH'İNDEN TÜRETİLİR — insan sürümünden DEĞİL.
   Neden? Sürüm numarası değişmeden içerik değişebilir (damgalama
   unutulduğunda tam olarak bu oldu). O durumda ad "karma-10.31.0"
   olarak sabit kalır, activate hiçbir şeyi silmez ve oyuncu
   cache-first kuralı yüzünden eski JS/CSS'i SONSUZA KADAR çalıştırır:
   "güncelle dedim, güncellenmedi". İçerik hash'i her içerik
   değişiminde adı değiştirir; activate eski önbelleği siler.
   Damgalama: tools/gen-version-json.js (CACHE_KEY alanı). */
const CACHE_KEY = "a3b6dc6f";
const CACHE = "karma-" + CACHE_KEY;
const CORE = ["./", "./index.html", "./js/version.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await cache.addAll(CORE);
      } catch (e) {
        /* önyükleme başarısız olsa da worker kurulmalı; çevrimdışı
           yeteneği kaybolur ama oyun çalışır */
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.disable(); } catch (e) {}
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "KARMA_SKIP_WAITING") self.skipWaiting();
  if (data.type === "KARMA_VERSION" && event.source) {
    event.source.postMessage({
      type: "KARMA_VERSION_REPLY", version: VERSION, cacheKey: CACHE_KEY
    });
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

/* index.html içindeki ilk ?v= damgasını oku (css/js varlık sürümü). */
function stampOf(html) {
  const m = String(html || "").match(/[?&]v=([A-Za-z0-9._-]+)/);
  return m ? m[1] : "";
}

/* Tüm önbellekleri sil. Kendini onarma yolunda kullanılır. */
async function purgeAll() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch (e) { /* önbellek yoksa sorun değil */ }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      /* KENDİNİ ONARAN DAMGA KONTROLÜ
         Gelen index.html'in ?v= damgası worker'ın kendi CACHE_KEY'inden
         farklıysa yayında yeni içerik var ama worker güncellenmemiş
         demektir (damgalama/build unutulmuş). Bu durumda eski
         önbellekleri temizle: sonraki cache-first aramaları ıskalar ve
         içerik ağdan taze gelir. Böylece "damgalamayı unutma" hatası
         oyuncuyu kalıcı olarak eski sürümde bırakamaz. */
      try {
        const isNav = request.mode === "navigate" ||
          new URL(request.url).pathname.endsWith("index.html");
        if (isNav) {
          const stamp = stampOf(await fresh.clone().text());
          if (stamp && stamp !== CACHE_KEY) await purgeAll();
        }
      } catch (e) { /* gövde okunamazsa onarımı atla */ }

      const c = await caches.open(CACHE);
      c.put(request, fresh.clone());
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await cache.match("./index.html");
    if (shell) return shell;
    return new Response("Çevrimdışısınız ve bu sayfa önbellekte yok.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    return new Response("", { status: 504 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((fresh) => {
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  }).catch(() => null);
  return cached || (await network) || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (!isSameOrigin(url)) return;              /* harici kaynaklara dokunma */
  if (url.pathname.endsWith("/sw.js")) return; /* worker'ın kendisi önbelleklenmesin */

  /* version.json: her zaman ağdan — önbellek güncelleme kontrolünü zehirler */
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => caches.match(req))
    );
    return;
  }

  const isNavigation = req.mode === "navigate" || url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (isNavigation) { event.respondWith(networkFirst(req)); return; }

  /* içerik hash'li varlıklar değişmez kabul edilir */
  if (url.searchParams.has("v")) { event.respondWith(cacheFirst(req)); return; }

  event.respondWith(staleWhileRevalidate(req));
});
