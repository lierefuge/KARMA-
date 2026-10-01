/* ============================================================
   KARMA — systems/updater.js   (v10.19)
   OYUNCU TARAFINDA GÜNCELLEME AKIŞI

   Sorun
   -----
   Önbellek hash'i (?v=…) yalnızca SAYFA YENİLENDİĞİNDE işe yarar.
   Oyunu açık bırakan bir oyuncu — ki bu simülasyonda normaldir —
   yeni sürüm çıksa bile eskisini çalıştırmaya devam ediyordu.
   Sürüm numarası elle takip ediliyordu ve kimse göremiyordu.

   Çözüm (iki katman)
   ------------------
   1. Service Worker (sw.js) — dosya tipine göre önbellek stratejisi.
   2. Bu modül — version.json'u ağdan okuyup çalışan sürümle karşılaştırır,
      fark varsa oyun içi bir şerit gösterir: "Yeni sürüm hazır → Güncelle".
      Güncelle = yeni worker'ı devreye al + sayfayı yenile.

   Neden tek dosya build'inde kapanır?
   -----------------------------------
   KARMA-Oyun.html her şeyi gömer; orada sunucu/worker yoktur. Modüler
   sürüm tespit edilmezse bu modül tamamen sessiz kalır (çökmez).
   ============================================================ */
(function (K) {
  "use strict";

  const CHECK_INTERVAL_MS = 5 * 60 * 1000;   // 5 dakikada bir yokla
  const BANNER_ID = "karma-update-banner";

  /* SONSUZ DÖNGÜ KORUMASI.
     Şerit "yeni sürüm var" der, oyuncu Güncelle'ye basar, sayfa yenilenir
     ama çalışan sürüm değişmezse şerit yine çıkar ve oyuncu aynı döngüde
     kalır ("güncelle diyorum, güncellenmiyor"). Bu kayıt aynı çalışan
     sürümde yakın zamanda denendi mi diye bakar; denendiyse tekrar
     denemek yerine dürüst bir "uygulanamadı" şeridi gösterir. */
  const ATTEMPT_KEY = "karma-update-attempt";
  const ATTEMPT_WINDOW_MS = 45 * 1000;

  function rememberAttempt() {
    try {
      sessionStorage.setItem(ATTEMPT_KEY, String(K.VERSION) + "|" + Date.now());
    } catch (e) {}
  }

  function attemptedRecently() {
    try {
      const parts = (sessionStorage.getItem(ATTEMPT_KEY) || "").split("|");
      if (parts.length !== 2) return false;
      return parts[0] === String(K.VERSION) &&
        (Date.now() - (parseInt(parts[1], 10) || 0)) < ATTEMPT_WINDOW_MS;
    } catch (e) { return false; }
  }

  /* Sert yenilemeden gelen damga parametresini adres çubuğundan temizle. */
  function cleanUrl() {
    try {
      const u = new URL(location.href);
      if (!u.searchParams.has("_karma_refresh")) return;
      u.searchParams.delete("_karma_refresh");
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }

  function doc() { return (K.util && K.util.doc) || (typeof document !== "undefined" ? document : null); }

  /* Modüler sürüm mü? index.html harici script'lere atıfta bulunur.
     Tek dosya build'inde hiçbir yerel <script src> kalmaz. */
  function isModular() {
    const d = doc();
    if (!d) return false;
    return !!d.querySelector('script[src*="js/version.js"]') ||
           !!d.querySelector('script[src*="js/main.js"]');
  }

  function httpOk() {
    return typeof location !== "undefined" &&
      (location.protocol === "http:" || location.protocol === "https:");
  }

  function swSupported() {
    return typeof navigator !== "undefined" && "serviceWorker" in navigator && httpOk();
  }

  let registration = null;
  let banner = null;
  let lastCheck = 0;

  function removeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function showBanner(info) {
    const d = doc();
    if (!d || banner) return;
    banner = d.createElement("div");
    banner.id = BANNER_ID;
    banner.className = "kub";
    banner.innerHTML =
      '<span class="kub-dot"></span>' +
      '<div class="kub-text">' +
        '<b>Yeni sürüm hazır</b>' +
        '<span>v' + K.util.escape(String(info.version || "")) +
        (info.date ? " · " + K.util.escape(String(info.date)) : "") +
        ' — güncellediğinde kariyerin kaydedilir.</span>' +
      '</div>' +
      '<button class="kub-btn" type="button">Güncelle</button>' +
      '<button class="kub-x" type="button" aria-label="Kapat">✕</button>';

    banner.querySelector(".kub-btn").addEventListener("click", function () {
      K.updater.apply();
    });
    banner.querySelector(".kub-x").addEventListener("click", function () {
      removeBanner();               /* oyuncu isterse sonra günceller */
    });
    d.body.appendChild(banner);
  }

  /* Güncelleme UYGULANAMADI: denendi, sayfa yenilendi, sürüm değişmedi.
     Bu genelde "yayındaki sürüm numarası ile kod uyuşmuyor" ya da
     "tarayıcı önbelleği takılı kaldı" demektir. Aynı düğmeyi tekrar
     sunmak yerine yapılacak şeyi söyler ve sert sıfırlama sunar. */
  function showStuckBanner() {
    const d = doc();
    if (!d || banner) return;
    banner = d.createElement("div");
    banner.id = BANNER_ID;
    banner.className = "kub kub-warn";
    banner.innerHTML =
      '<span class="kub-dot"></span>' +
      '<div class="kub-text">' +
        '<b>Güncelleme uygulanamadı</b>' +
        '<span>Tarayıcı hâlâ v' + K.util.escape(String(K.VERSION)) +
        ' çalıştırıyor. Sıfırla düğmesi önbelleği temizleyip yeniden yükler;' +
        ' olmazsa sert yenile: <b>Ctrl+Shift+R</b> (Mac: <b>Cmd+Shift+R</b>).</span>' +
      '</div>' +
      '<button class="kub-btn" type="button">Sıfırla ve yenile</button>' +
      '<button class="kub-x" type="button" aria-label="Kapat">✕</button>';

    banner.querySelector(".kub-btn").addEventListener("click", function () {
      K.updater._hardReset();
    });
    banner.querySelector(".kub-x").addEventListener("click", function () {
      removeBanner();
    });
    d.body.appendChild(banner);
  }

  K.updater = {
    get supported() { return isModular() && httpOk(); },
    get hasWorker() { return !!registration; },

    /* version.json'u ağdan oku; çalışan sürümden farklıysa şerit göster */
    check(force) {
      if (!K.updater.supported) return Promise.resolve(null);
      const now = Date.now();
      if (!force && now - lastCheck < CHECK_INTERVAL_MS) return Promise.resolve(null);
      lastCheck = now;

      const url = (K.UPDATE_META_URL || "version.json") + (force ? "?t=" + now : "");
      if (typeof fetch !== "function") return Promise.resolve(null);

      return fetch(url, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (info) {
          if (!info || !info.version) return null;
          if (String(info.version) !== String(K.VERSION)) {
            /* Az önce denedik ve sürüm yine aynı → döngüye sokma. */
            if (attemptedRecently()) showStuckBanner();
            else showBanner(info);
            return info;
          }
          return null;
        })
        .catch(function () { return null; });   /* çevrimdışı: sessiz geç */
    },

    /* ------------------------------------------------------------
       SERT SIFIRLAMA — "güncelle dedim, güncellenmedi"nin ilacı.

       Neden `location.reload()` YETMEZ?
       Service worker, `?v=` damgalı css/js isteklerini CACHE-FIRST
       karşılar. Önbellekte eski içerik varsa reload AYNI eski dosyaları
       getirir: sayfa yenilenir, kod değişmez. Bu yüzden sıra şudur:
         worker'ı kayıttan düşür → tüm önbellekleri sil → yeniden yükle.
       ------------------------------------------------------------ */
    _unregister() {
      if (!swSupported() || !navigator.serviceWorker.getRegistrations) {
        return Promise.resolve();
      }
      return navigator.serviceWorker.getRegistrations()
        .then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        })
        .catch(function () {});
    },

    _resetCaches() {
      if (typeof caches === "undefined" || !caches.keys) return Promise.resolve();
      return caches.keys()
        .then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        })
        .catch(function () {});
    },

    /* Damga parametresi, tarayıcının HTML'i kendi HTTP önbelleğinden
       vermesini engeller. init() parametreyi adres çubuğundan temizler. */
    _hardReload() {
      try {
        const u = new URL(location.href);
        u.searchParams.set("_karma_refresh", String(Date.now()));
        location.replace(u.toString());
      } catch (e) {
        try { location.reload(); } catch (e2) {}
      }
    },

    _hardReset() {
      return Promise.resolve()
        .then(function () { return K.updater._unregister(); })
        .then(function () { return K.updater._resetCaches(); })
        .then(function () { K.updater._hardReload(); });
    },

    /* yeni worker'ı devreye al ve sayfayı yenile */
    apply() {
      try { if (K.save) K.save(); } catch (e) {}
      rememberAttempt();                    /* sonsuz döngü koruması */

      const doReload = function () {
        try { location.reload(); } catch (e) {}
      };

      /* 1) Hazır bekleyen worker → devreye al, kontrol değişince yenile */
      if (registration && registration.waiting) {
        const waiting = registration.waiting;
        let reloaded = false;
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.addEventListener("controllerchange", function () {
            if (reloaded) return;
            reloaded = true;
            doReload();
          });
        }
        waiting.postMessage({ type: "KARMA_SKIP_WAITING" });
        setTimeout(function () {
          if (!reloaded) { reloaded = true; K.updater._hardReset(); }
        }, 1500);
        return;
      }

      /* 2) Worker var ama bekleyen yok → güncellemeyi ARA, sonucu bekle */
      if (registration && registration.update) {
        let settled = false;
        try { registration.update().catch(function () {}); } catch (e) {}
        setTimeout(function () {
          if (settled) return;
          settled = true;
          if (registration.waiting) { K.updater.apply(); return; }
          K.updater._hardReset();           /* yeni worker gelmedi: sert sıfırla */
        }, 2000);
        return;
      }

      /* 3) Worker hiç yok → sade reload önbelleği temizlemez, sert sıfırla */
      K.updater._hardReset();
    },

    init() {
      if (!isModular()) return;
      cleanUrl();
      if (!swSupported()) {
        /* worker yoksa bile sürüm kontrolü denenebilir */
        K.updater.check(true);
        return;
      }

      try {
        navigator.serviceWorker.register("sw.js").then(function (reg) {
          registration = reg;
          /* yeni worker kurulduğunda şerit göster */
          reg.addEventListener("updatefound", function () {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", function () {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                K.updater.check(true);
              }
            });
          });
        }).catch(function () { /* sw yoksa sessiz geç */ });
      } catch (e) {}

      K.updater.check(true);
      setInterval(function () { K.updater.check(true); }, CHECK_INTERVAL_MS);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") K.updater.check(false);
      });
    }
  };
})(window.K = window.K || {});
