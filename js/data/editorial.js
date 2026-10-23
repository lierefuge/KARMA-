/* ============================================================
   KARMA — data/editorial.js   (v10.48)
   EDİTORYAL LİSTELER · PITCH STRATEJİSİ · LİSTE BAKIMI

   Üç katman:

     1) 📋 EDİTORYAL LİSTELER — gerçek sanatçıların gerçek şarkılarından
        derlenmiş, küratörlü listeler (liste başına ~10 parça). Oyuncunun
        şarkısı editoryal bir listeye girdiyse veya pitch'ten kabul aldıysa
        o listede gerçek sanatçıların arasında görünür.
     2) ✉️ PITCH STRATEJİSİ — yayın öncesi editoryal ekibe nasıl
        başvurduğun: standart / veri destekli / plugger. Maliyet ve kabul
        şansı değişir.
     3) 🔄 LİSTE BAKIMI — listeye girdikten sonra orada KALMAK ayrı bir iş.
        Curator'a taze veri gönderir, promosyon yapar ya da ilişki kurarsın;
        bakım sürdükçe şarkı listeden düşmez ve sırası iyileşir.

   Liste mekaniği `systems/lists.js`, pitch akışı `systems/career.js`
   tarafından kullanılır.
   ============================================================ */
(function (K) {
  "use strict";

  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------------- ROTASYON (v10.67) --------------
     SORUN: liste içeriği DONMUŞTU.
     Eski seçim: arr[hash(def.id + "|" + aid) % arr.length]
     Tohumda TARİH yoktu → her açılışta aynı şarkı. "Spotify listesi
     hiç değişmiyor" şikâyetinin tek sebebi buydu.

     ÇÖZÜM: tohuma takvim eklenir.
       · haftalık listeler  → "w<ISO hafta>"   (pazartesi döner)
       · günlük listeler    → "d<gün no>"      (her gün döner)
     Tohum süreç içinde SABİT kalır (aynı oyun oturumunda liste zıplamaz),
     testler `setRotation()` ile tohumu sabitleyebilir → determinizm korunur. */
  const ROT = { forced: null };

  function dayNumber(d) {
    return Math.floor((d ? d.getTime() : Date.now()) / 864e5);
  }

  function cadenceSeed(cadence) {
    if (ROT.forced !== null) return ROT.forced;
    const day = dayNumber();
    /* ISO 8601 haftası: 1970-01-01 perşembeydi → +3 gün kaydırma */
    return cadence === "day" ? "d" + day : "w" + Math.floor((day + 3) / 7);
  }

  /* ---------------- YENİ ÇIKIŞLAR (release-intel) --------------
     ÖNEMLİ: burada K.lazy.raw/ensure ÇAĞRILMAZ. Tembel veri katmanı
     açılışta kendi zamanlamasıyla yükler; buradan tetiklemek boot
     sırasında ağ isteği doğurur (smoke-lazy "boot en fazla real-songs"
     kuralını kırar). Veri gelmemişse boş kabul edilir, gelince
     lazydata:loaded olayı arayüzü tazeler. */
  function intelData() {
    const d = K.RELEASE_INTEL;
    return d && d.releases ? d : { meta: {}, releases: {} };
  }

  function releaseAgeDays(iso) {
    const t = Date.parse(String(iso || "").slice(0, 10) + "T00:00:00Z");
    return isFinite(t) ? dayNumber() - Math.floor(t / 864e5) : null;
  }

  function nkey(s) {
    return String(s == null ? "" : s)
      .replace(/İ/g, "i").replace(/I/g, "ı")
      .toLowerCase()
      .replace(/[’'`´"“”]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* ---------------- EDİTORYAL LİSTELER (küratörlü) ---------------- */
  const PLAYLISTS = [
    { id: "rapturkiye", cadence: "week", name: "Rap Türkiye", desc: "Türkiye'nin en güncel rap seçkisi", color: "#1ed760", curator: "Karma Editoryal", genre: "rap",
      artists: ["ceza", "sagopa", "mavi", "saniser", "normender", "gazapizm", "patron", "defkhan", "contra", "hidra", "joker"] },
    { id: "traptr", cadence: "week", name: "Trap Zone TR", desc: "Sert trap sound'ları ve yeni jenerasyon", color: "#8a4dff", curator: "Karma Editoryal", genre: "trap",
      artists: ["sehinsah", "ezhel", "motive", "uzi", "reckol", "cakal", "heijan", "muti", "ati242", "murda", "weghrumi", "khontkar"] },
    { id: "drilltr", cadence: "week", name: "Drill Türkiye", desc: "Drill'in yükselen dalgası", color: "#ff5c7a", curator: "Karma Editoryal", genre: "drill",
      artists: ["lvbelc5", "blok3", "era7capone", "benfero", "khontkar", "weghrumi", "muti", "cakal"] },
    /* v10.67 — newmusic artık GERÇEK yeni çıkışlardan doluyor (release-intel).
       cadence:"day" → her gün, diğerleri haftada bir döner. */
    { id: "newmusic", name: "Yeni Çıkanlar", desc: "Bu hafta öne çıkan yeni işler", color: "#6ec3ff", curator: "Karma Editoryal", genre: null,
      cadence: "day", recent: true, recentDays: 21,
      artists: ["ceza", "ezhel", "blok3", "uzi", "sila", "edis", "lilzey", "mavi", "motive", "sehinsah"] },
    { id: "nightmode", cadence: "week", name: "Gece Modu", desc: "Gece için R&B ve melankolik işler", color: "#b06cff", curator: "Karma Editoryal", genre: "rnb",
      artists: ["lilzey", "sila", "edis", "mavi", "normender", "saniser", "ezhel", "sagopa"] },
    { id: "popturkiye", cadence: "week", name: "Pop Türkiye", desc: "Bugünün en çok dinlenenleri", color: "#ffcb5c", curator: "Karma Editoryal", genre: "pop",
      artists: ["sila", "edis", "lvbelc5", "blok3", "uzi", "motive", "lilzey", "murda"] }
  ];

  /* editoryal listenin mekanik karşılıkları (systems/lists.js DEFS) */
  const EDITORIAL_LIST_IDS = ["sp_newmusic", "sp_rapcaviar", "ap_new", "yt_new"];

  /* ---------------- PITCH STRATEJİLERİ ---------------- */
  const PITCH_STRATEGIES = [
    { id: "standart", name: "Standart Pitch", icon: "✉️", cost: 9000,  bonus: 0,  accept: 1.00, note: "Kısa tanıtım notu; editoryal kuyruğa girer." },
    { id: "veri",     name: "Veri Destekli",  icon: "📊", cost: 28000, bonus: 8,  accept: 1.25, note: "Dinlenme ve demografi verisiyle güçlendirilmiş dosya." },
    { id: "plugger",  name: "Plugger",        icon: "🤝", cost: 70000, bonus: 16, accept: 1.60, note: "Bağımsız playlist avukatı devrede; kabul şansı yüksek." }
  ];

  /* ---------------- LİSTE BAKIMI ---------------- */
  const MAINT = [
    { id: "refresh", name: "Liste Tazeleme", icon: "🔄", cost: 15000, days: 6,  boost: 0.10, note: "Curator'a güncel veri gönder; sıralamayı korur." },
    { id: "promo",   name: "Liste Promosyonu", icon: "📣", cost: 40000, days: 10, boost: 0.20, note: "Playlist içi görünürlük kampanyası." },
    { id: "curator", name: "Curator İlişkisi", icon: "🤝", cost: 80000, days: 20, boost: 0.30, note: "Editoryal ekiple ilişki; uzun süreli yer garantisi." }
  ];

  K.EDITORIAL = { PLAYLISTS, PITCH_STRATEGIES, MAINT, EDITORIAL_LIST_IDS };

  K.editorial = {
    PLAYLISTS: PLAYLISTS,
    PITCH_STRATEGIES: PITCH_STRATEGIES,
    MAINT: MAINT,
    EDITORIAL_LIST_IDS: EDITORIAL_LIST_IDS,

    byId(id) { return PLAYLISTS.find(p => p.id === id) || null; },
    strategyById(id) { return PITCH_STRATEGIES.find(s => s.id === id) || PITCH_STRATEGIES[0]; },
    maintById(id) { return MAINT.find(m => m.id === id) || MAINT[0]; },
    ids() { return PLAYLISTS.map(p => p.id); },

    /* ---- küratörlü gerçek parçalar (deterministik) ---- */
    realTracks(def, seed) {
      const out = [];
      const s = seed || cadenceSeed(def.cadence);
      (def.artists || []).forEach(aid => {
        /* K.lazy.songs güvenli erişimcidir: veri yüklü değilse yüklemeyi
           tetikler ve boş dizi döner. K.REAL_SONGS'a doğrudan bakmak
           modüler modda (veri henüz gelmemişken) boş liste verirdi. */
        const arr = K.lazy && K.lazy.songs ? K.lazy.songs(aid) : ((K.REAL_SONGS || {})[aid] || []);
        if (!arr.length) return;
        /* v10.67 — tohumda artık TAKVİM var: liste her hafta/gün değişir */
        const pick = arr[hash(def.id + "|" + aid + "|" + s) % arr.length];
        out.push({
          id: "ed_" + def.id + "_" + aid,
          title: pick.title, artistName: pick.artistName, artistId: aid,
          art: pick.art || null, album: pick.album || null,
          coverSeed: "ed" + aid, streams: 0, mine: false
        });
      });
      return out;
    },

    /* ---- son N günün GERÇEK çıkışları (release-intel) ---- */
    recentReleases(days) {
      const data = intelData().releases || {};
      const span = days == null ? 21 : days;
      const out = [];
      Object.keys(data).forEach(k => {
        const r = data[k];
        if (!r || !r.releaseDate) return;
        const age = releaseAgeDays(r.releaseDate);
        if (age == null || age < 0 || age > span) return;
        out.push(r);
      });
      return out;
    },

    /* ---- yeni çıkışlardan liste kur ----
       intel.fit varsa onu, yoksa türü kullanır. Aynı sanatçıdan en fazla
       2 parça: bir albüm çıkışı listeyi tek başına doldurmasın. */
    newReleaseTracks(def, limit) {
      const pool = K.editorial.recentReleases(def.recentDays);
      const maxPerArtist = 2;
      const seen = {};
      const scored = [];
      pool.forEach(r => {
        const fit = (r.intel && r.intel.fit && def && r.intel.fit[def.id]) || 0;
        /* intel varsa ve bu listeye uymuyorsa ele */
        if (r.intel && r.intel.fit && fit < 0.35) return;
        const n = seen[r.artistId] || 0;
        if (n >= maxPerArtist) return;
        seen[r.artistId] = n + 1;
        scored.push({ r: r, fit: fit });
      });
      scored.sort((a, b) => {
        const da = a.r.releaseDate, db = b.r.releaseDate;
        if (da !== db) return da < db ? 1 : -1;          /* en yeni önce */
        return b.fit - a.fit;                             /* eşitlikte uygunluk */
      });
      return scored.slice(0, limit == null ? 12 : limit).map(x => ({
        id: "nr_" + x.r.artistId + "_" + nkey(x.r.title).replace(/[^a-z0-9ı]+/g, "_"),
        title: x.r.title, artistName: x.r.artistName, artistId: x.r.artistId,
        art: x.r.art || null, album: x.r.album || null,
        coverSeed: "nr" + x.r.artistId, streams: 0, mine: false,
        releaseDate: x.r.releaseDate, isNew: true
      }));
    },

    /* ---- rotasyon tohumu (testler ve araçlar için) ---- */
    rotationSeed(cadence) { return cadenceSeed(cadence || "week"); },
    setRotation(seed) {
      ROT.forced = (seed === null || seed === undefined) ? null : String(seed);
      return ROT.forced;
    },
    rotationInfo() {
      return { forced: ROT.forced, weekly: cadenceSeed("week"), daily: cadenceSeed("day") };
    },
    intelOf(artistId, title) {
      const rec = (intelData().releases || {})[artistId + "::" + nkey(title)];
      return rec ? (rec.intel || null) : null;
    },

    /* ---- oyuncunun editoryal liste girişleri (aktif) ---- */
    onEditorial(song) {
      if (!song || !song.lists) return [];
      return song.lists.filter(e => !e.exitDay && EDITORIAL_LIST_IDS.indexOf(e.id) >= 0);
    },

    /* ---- bir listeyi kur (gerçek parçalar + hak eden oyuncu şarkıları) ---- */
    build(id) {
      const def = K.editorial.byId(id);
      if (!def) return { id: id, name: id, desc: "", color: "#888", curator: "Karma Editoryal", songs: [] };
      const seed = cadenceSeed(def.cadence);
      const songs = K.editorial.realTracks(def, seed);
      /* deterministik karıştırma + azalan dinlenme ölçeği (gerçek liste hissi).
         v10.67 — karıştırma tohumu da takvime bağlı: sıra da bayatlamaz. */
      songs.sort((a, b) => (hash(def.id + seed + "|" + a.artistId) - hash(def.id + seed + "|" + b.artistId)));

      /* v10.67 — "Yeni Çıkanlar" GERÇEKTEN yeni çıkanları gösterir.
         Gerçek çıkışlar listenin başına gelir; release-intel henüz
         yüklenmemişse liste eskisi gibi çalışmaya devam eder. */
      let list = songs;
      if (def.recent) {
        const have = {};
        songs.forEach(s => { have[nkey(s.title)] = true; });
        const fresh = K.editorial.newReleaseTracks(def, 12).filter(s => !have[nkey(s.title)]);
        list = fresh.concat(songs);
      }
      list.forEach((s, i) => { s.streams = Math.round(950000 * Math.pow(0.9, i)); });

      /* oyuncu şarkıları: pitch kabulü ya da editoryal liste girişi */
      const onEd = K.editorial;
      (K.state.player.songs || []).forEach(sg => {
        const pitched = (sg.playlists || []).indexOf(def.id) >= 0;
        const genreOk = !def.genre || sg.genre === def.genre;
        const entered = onEd.onEditorial(sg).length > 0;
        if (pitched || (entered && genreOk)) {
          list.push({
            id: sg.id, title: sg.title, artistName: K.state.player.stageName,
            artistId: "player", streams: sg.streams || 0, mine: true,
            coverSeed: sg.coverSeed
          });
        }
      });
      list.sort((a, b) => (b.streams || 0) - (a.streams || 0));
      return { id: def.id, name: def.name, desc: def.desc, color: def.color, curator: def.curator, genre: def.genre, cadence: def.cadence || "week", songs: list.slice(0, 12) };
    },

    /* ---- oyuncunun bir listedeki yeri ---- */
    placement(song) {
      const mine = K.editorial.onEditorial(song);
      return mine.map(e => ({ id: e.id, name: e.name, rank: e.rank, platform: e.platform })).sort((a, b) => a.rank - b.rank);
    },

    /* ---- liste bakımı ---- */
    careActive(song) {
      return !!(song && song.listCare && song.listCare.untilDay > K.state.day);
    },
    canMaintain(song) {
      if (!song || song.takenDown) return false;
      if (!K.editorial.onEditorial(song).length) return false;
      return !K.editorial.careActive(song);
    },
    maintain(songId, tierId) {
      const song = K.platforms.findSong(songId);
      if (!song) { K.toast("Şarkı bulunamadı", "", "warn"); return false; }
      if (!K.editorial.onEditorial(song).length) {
        K.toast("Listede değil", `"${song.title}" şu an editoryal bir listede değil.`, "warn");
        return false;
      }
      if (K.editorial.careActive(song)) {
        K.toast("Bakım sürüyor", `"${song.title}" için aktif bakım var.`, "warn");
        return false;
      }
      const t = K.editorial.maintById(tierId);
      if (!K.economy.canAfford(t.cost)) {
        K.toast("Yetersiz bakiye", `${t.name} için ${K.util.money(t.cost)} gerekiyor.`, "bad");
        return false;
      }
      K.economy.spend(t.cost, "list_maintenance");
      song.listCare = { tier: t.id, name: t.name, icon: t.icon, day: K.state.day, untilDay: K.state.day + t.days, boost: t.boost };
      K.toast("🔄 Liste bakımı", `"${song.title}" ${t.days} gün boyunca listede tutulacak.`, "good");
      if (K.refresh) K.refresh();
      return true;
    }
  };
})(window.K = window.K || {});
