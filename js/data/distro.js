/* ============================================================
   KARMA — data/distro.js
   DAĞITIM KATMANI: parça kayıt kaynağı + mağaza listesi
   (DistroKid / TuneCore dağıtım akışı örnek alınmıştır)

   KAYIT KAYNAĞI (track source)
     Her parça bir "dosya" olarak yüklenir. Kaynağı kaliteyi ve
     maliyeti belirler: stüdyo kaydı pahalı ama temiz, telefon
     demosu ucuz ama ham.

   MAĞAZALAR (stores)
     Seçilen mağaza sayısı dağıtım maliyetini ve erişimi artırır.
     Az mağaza = ucuz ama dar; çok mağaza = pahalı ama geniş.
   ============================================================ */
(function (K) {
  "use strict";

  /* ---------------- KAYIT KAYNAKLARI ---------------- */
  K.TRACK_SOURCES = [
    {
      id: "studio", name: "Stüdyo Kaydı", icon: "🎙️",
      qAdd: 6, costMult: 1.35, file: "WAV", bit: "24-bit / 48kHz", size: "42 MB",
      note: "Profesyonel stüdyo; en temiz kayıt, en yüksek maliyet."
    },
    {
      id: "ev", name: "Ev Kaydı", icon: "🏠",
      qAdd: 0, costMult: 1.00, file: "WAV", bit: "16-bit / 44kHz", size: "28 MB",
      note: "Ev stüdyosu; dengeli kalite ve maliyet."
    },
    {
      id: "canli", name: "Canlı Kayıt", icon: "🎤",
      qAdd: 3, costMult: 0.90, file: "WAV", bit: "24-bit / 48kHz", size: "36 MB",
      note: "Sahne/oda kaydı; enerji yüksek, kontrol düşük."
    },
    {
      id: "sample", name: "Hazır Sample", icon: "🎞️",
      qAdd: -4, costMult: 0.80, file: "MP3", bit: "320 kbps", size: "9 MB",
      note: "Hazır loop üstüne kayıt; karakterli ama sınırlı."
    },
    {
      id: "telefon", name: "Telefon Demosu", icon: "📱",
      qAdd: -10, costMult: 0.62, file: "M4A", bit: "128 kbps", size: "4 MB",
      note: "Hızlı ve ucuz; kalite belirgin düşer."
    }
  ];
  K.sourceById = function (id) {
    return K.TRACK_SOURCES.find(s => s.id === id) || K.TRACK_SOURCES[1];
  };

  /* ---------------- MAĞAZALAR ---------------- */
  /* reach: dağıtım genişliğine katkı (0-1)
     cost : dağıtım ücreti (₺)
     on   : varsayılan seçili mi */
  K.DISTRO_STORES = [
    { id: "spotify",   name: "Spotify",            icon: "🟢", reach: 1.00, cost: 1200, on: true  },
    { id: "apple",     name: "Apple Music",        icon: "🍎", reach: 0.88, cost: 1500, on: true  },
    { id: "youtube",   name: "YouTube Music",      icon: "▶️", reach: 0.92, cost: 1200, on: true  },
    { id: "tiktok",    name: "TikTok",             icon: "🎬", reach: 0.80, cost: 800,  on: true  },
    { id: "deezer",    name: "Deezer",             icon: "🎵", reach: 0.40, cost: 600,  on: false },
    { id: "amazon",    name: "Amazon Music",       icon: "📦", reach: 0.45, cost: 900,  on: false },
    { id: "tidal",     name: "TIDAL",              icon: "🌊", reach: 0.30, cost: 700,  on: false },
    { id: "soundcloud",name: "SoundCloud",         icon: "☁️", reach: 0.50, cost: 0,    on: false },
    { id: "instagram", name: "Instagram/Facebook", icon: "📸", reach: 0.60, cost: 600,  on: false }
  ];
  K.storeById = function (id) {
    return K.DISTRO_STORES.find(s => s.id === id) || null;
  };
  K.defaultStores = function () {
    return K.DISTRO_STORES.filter(s => s.on).map(s => s.id);
  };

  /* seçili mağazalardan dağıtım genişliği çarpanı (0.55 – 1.25) ve ücret */
  K.distroReach = function (ids) {
    const list = (ids && ids.length) ? ids.map(K.storeById).filter(Boolean) : [];
    if (!list.length) return 0.55;
    const sum = list.reduce((n, s) => n + s.reach, 0);
    // 4 varsayılan mağaza ≈ 1.0 referans
    return Math.max(0.55, Math.min(1.25, sum / 3.6));
  };
  K.distroCost = function (ids) {
    const list = (ids && ids.length) ? ids.map(K.storeById).filter(Boolean) : [];
    return list.reduce((n, s) => n + s.cost, 0);
  };
})(window.K = window.K || {});
