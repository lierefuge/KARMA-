/* ============================================================
   KARMA — data/lazy.js   (v10.16 · P-1)
   AĞIR VERİYİ KRİTİK YOLDAN ÇIKARIR.

   Sorun
   -----
   Gerçek şarkı/önizleme/diskoğrafi verisi 375 KB'lık JS olarak
   sayfa açılışında hem İNDİRİLİYOR hem de ÇALIŞTIRILIYORDU.
   Mobilde ilk açılışın en büyük maliyeti buydu (tek dosya build
   1,88 MB).

   Çözüm — iki mod, tek arayüz
   ---------------------------
   MODÜLER (GitHub Pages):
     Veri dosyaları başlangıçta yüklenmez. İhtiyaç anında bir
     script etiketi (src = js/data/real-songs.js) DOM'a eklenir ve
     ağdan indirilir. Böylece ~408 KB ilk boyamadan SONRAYA taşınır.
     (Bu yorumda bilerek düz bir script etiketi yazılmaz; build'in
      "gömülemeyen yerel kaynak" denetimi onu gerçek bir etiket sanır.)

   TEK DOSYA (KARMA-Oyun.html):
     Dosyayı bölmek mümkün değil (özelliği "harici bağımlılık yok").
     Bu yüzden veri, type="application/json" taşıyan bir script bloğu
     olarak gömülür:
       · JSON blokları tarayıcı tarafından YORUMLANMAZ (execution yok)
       · İhtiyaç anında JSON.parse ile okunur
       · Ölçüm: 374.697 bayt JS → 319.038 bayt JSON (−%15, sözdizimi
         ve girinti gider) + 375 KB'lık JS yürütme maliyeti tamamen düşer

   Geriye dönük uyum
   -----------------
   Yüklenmemiş veriye erişen çağrılar ÇÖKMEZ: güvenli erişimciler
   (songs / previewFor / discography / ytFor / raw) boş değer döner ve
   yüklemeyi tetikler. Yükleme bitince `lazydata:loaded` olayı yayılır,
   main.js arayüzü tazeler. Yani ilk bakışta sentetik şarkı görülürse
   veri gelince kendiliğinden gerçeğiyle değişir.

   Canlı veri (live.js) dikkate alınır: yükleme bittiğinde mevcut
   nesnenin ÜZERİNE YAZILMAZ, birleştirilir (Object.assign) — böylece
   canlı API'den gelen taze şarkılar kaybolmaz.
   ============================================================ */
(function (root) {
  "use strict";

  /* veri kayıt defteri — tek doğruluk kaynağı.
     tools/build-single.js bu listeyi buradan okur. */
  const MAP = {
    "real-songs":    { global: "REAL_SONGS",    src: "js/data/real-songs.js" },
    "real-previews": { global: "REAL_PREVIEWS", src: "js/data/real-previews.js" },
    "discography":   { global: "DISCOGRAPHY",   src: "js/data/discography.js" },
    "real-youtube":  { global: "REAL_YT",       src: "js/data/real-youtube.js" }
  };

  /* Node (build aracı) için: yalnızca kayıt defterini ver */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { MAP };
    return;
  }

  const K = root.K = root.K || {};
  const doc = root.document;
  const NAMES = Object.keys(MAP);

  const state = {};    // ad → "idle" | "loading" | "ready" | "error"
  const queue = {};    // ad → [resolve, ...]
  const errors = {};   // ad → hata

  /* lazydata:loaded olayını YALNIZCA K.bus varsa yay */
  function emit(ev, payload) {
    try { if (K.bus && K.bus.emit) K.bus.emit(ev, payload); } catch (e) {}
  }

  /* kendi script etiketimizden önbellek sürümünü oku (?v=...) */
  let _cv = null;
  function cacheVersion() {
    if (_cv !== null) return _cv;
    _cv = "";
    try {
      const tags = doc.getElementsByTagName("script");
      for (let i = 0; i < tags.length; i++) {
        const s = tags[i].getAttribute("src") || "";
        if (s.indexOf("js/data/lazy.js") >= 0) {
          const m = s.match(/[?&]v=([A-Za-z0-9._-]+)/);
          if (m) { _cv = m[1]; break; }
        }
      }
    } catch (e) {}
    return _cv;
  }

  /* gömülü JSON bloğu (tek dosya modu) */
  function jsonBlock(name) {
    try { return doc.getElementById("karma-lazy-" + name); } catch (e) { return null; }
  }

  /* veriyi yerleştir — mevcut nesne varsa BİRLEŞTİR (canlı veriyi koru) */
  function merge(name, data) {
    const g = MAP[name].global;
    if (data && typeof data === "object") {
      const cur = K[g];
      if (cur && typeof cur === "object") Object.assign(cur, data);
      else K[g] = data;
    } else if (!K[g]) {
      K[g] = {};
    }
  }

  function settle(name, err) {
    state[name] = err ? "error" : "ready";
    if (err) errors[name] = err;
    const q = queue[name] || [];
    queue[name] = [];
    for (let i = 0; i < q.length; i++) { try { q[i](); } catch (e) {} }
    emit(err ? "lazydata:error" : "lazydata:loaded", { name: name, error: err || null });
  }

  /* ---------------- yükleme ---------------- */
  function load(name) {
    const st = state[name];
    if (st === "loading" || st === "ready") return;
    if (!MAP[name]) return;
    state[name] = "loading";

    /* --- TEK DOSYA MODU: gömülü JSON'u şimdi parse et --- */
    const blk = jsonBlock(name);
    if (blk) {
      try {
        const raw = blk.textContent || blk.innerHTML || "";
        merge(name, JSON.parse(raw));
        settle(name, null);
      } catch (e) { settle(name, e); }
      return;
    }

    /* --- MODÜLER MOD: script etiketi talep üzerine ekle --- */
    const cv = cacheVersion();
    const s = doc.createElement("script");
    s.src = MAP[name].src + (cv ? "?v=" + cv : "");
    s.async = true;
    s.setAttribute("data-lazy-data", name);
    s.onload = function () {
      /* dosya K.<global>'i kendisi kurar; birleştirme gerekmez */
      if (!K[MAP[name].global]) K[MAP[name].global] = {};
      settle(name, null);
    };
    s.onerror = function () { settle(name, new Error(MAP[name].src + " yüklenemedi")); };
    doc.head.appendChild(s);
  }

  /* ---------------- genel API ---------------- */
  K.lazy = {
    names: NAMES,
    map: MAP,
    stateOf: function (n) { return state[n] || "idle"; },
    loaded: function (n) { return state[n] === "ready"; },
    errorOf: function (n) { return errors[n] || null; },

    /* söz verilen verileri yükle */
    ensure: function (names) {
      const list = Array.isArray(names) ? names : [names];
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const n = list[i];
        out.push(new Promise(function (res) {
          if (state[n] === "ready" || state[n] === "error") return res();
          (queue[n] = queue[n] || []).push(res);
          load(n);
        }));
      }
      return Promise.all(out);
    },

    /* ilk boyamayı bloklamadan planla */
    schedule: function (names, delay) {
      const go = function () { K.lazy.ensure(names); };
      if (root.requestIdleCallback) {
        root.setTimeout(function () { root.requestIdleCallback(go, { timeout: 2000 }); }, delay || 0);
      } else {
        root.setTimeout(go, delay || 0);
      }
    },

    /* ---- güvenli erişimciler: yüklenmemişse boş döner + yüklemeyi tetikler ---- */

    /* ham veri nesnesi */
    raw: function (name) {
      const g = MAP[name] && MAP[name].global;
      if (!g) return {};
      if (state[name] !== "ready") {
        load(name);
        return K[g] && typeof K[g] === "object" ? K[g] : {};
      }
      return K[g] || {};
    },

    /* yazma için: nesnenin var olmasını garanti eder (live.js kullanır) */
    host: function (name) {
      const g = MAP[name] && MAP[name].global;
      if (!g) return {};
      if (!K[g] || typeof K[g] !== "object") K[g] = {};
      if (state[name] === "idle") load(name);
      return K[g];
    },

    /* sanatçının gerçek şarkıları */
    songs: function (artistId) {
      const all = K.lazy.raw("real-songs");
      return (artistId && all[artistId]) || [];
    },

    /* sanatçının gerçek diskoğrafisi */
    discography: function (artistId) {
      const all = K.lazy.raw("discography");
      return (artistId && all[artistId]) || [];
    },

    /* şarkı önizlemesi: { p, a } veya null */
    previewFor: function (artistId, title) {
      const all = K.lazy.raw("real-previews");
      if (!artistId || !title) return null;
      const a = all[artistId];
      return (a && a[title]) || null;
    },

    /* YouTube video kaydı: { v } veya null */
    ytFor: function (artistId, title) {
      const all = K.lazy.raw("real-youtube");
      if (!artistId || !title) return null;
      const a = all[artistId];
      return (a && a[title]) || null;
    },

    /* kaç sanatçı kaydı yüklü */
    available: function (name) {
      const g = MAP[name] && MAP[name].global;
      if (!g) return 0;
      const o = state[name] === "ready" ? K[g] : null;
      return o ? Object.keys(o).length : 0;
    },

    /* veri yüklenince önbellekleri geçersiz kılmak için dinleyiciler */
    onLoaded: function (fn) {
      if (K.bus && K.bus.on) K.bus.on("lazydata:loaded", fn);
      return K.lazy;
    }
  };

  /* NOT: yükleme burada KENDİLİĞİNDEN başlatılmaz.
     Bu dosya main.js'ten ÖNCE çalışır; veri boot() tamamlanmadan gelirse
     `lazydata:loaded` dinleyicisi henüz kayıtlı olmaz ve arayüz tazelenmez
     (üstelik _npcSongs önbelleği sentetik şarkılarla dolu kalırdı).
     Bu yüzden zamanlamayı main.js boot() yapar: K.lazy.schedule(...) */
})(typeof window !== "undefined" ? window : globalThis);
