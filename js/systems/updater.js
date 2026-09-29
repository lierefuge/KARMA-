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
            showBanner(info);
            return info;
          }
          return null;
        })
        .catch(function () { return null; });   /* çevrimdışı: sessiz geç */
    },

    /* yeni worker'ı devreye al ve sayfayı yenile */
    apply() {
      try { if (K.save) K.save(); } catch (e) {}
      const doReload = function () {
        try { location.reload(); } catch (e) {}
      };
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
        setTimeout(function () { if (!reloaded) { reloaded = true; doReload(); } }, 1500);
        return;
      }
      doReload();
    },

    init() {
      if (!isModular()) return;
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
