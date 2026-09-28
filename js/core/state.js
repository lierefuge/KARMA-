/* ============================================================
   KARMA — core/state.js
   Oyun durumu (state), kaydetme/yükleme, ilişki aşamaları,
   ekonomi sabitleri.
   ============================================================ */
(function (K) {
  "use strict";

  const SAVE_KEY = "karma_music_game_v1";

  /* ---------- affinity (samimiyet) aşamaları ---------- */
  /* Samimiyet eşikleri yüksek: güven kazanmak yıllar sürer */
  K.AFFINITY_STAGES = [
    { key: "tanisma",   label: "Tanışma",              min: 0,  desc: "Sanatçıyla ilk temas kurdun." },
    { key: "mesajlasma",label: "Mesajlaşma",           min: 20, desc: "Artık düzenli cevap almaya başladın." },
    { key: "iletisim",  label: "Daha Fazla İletişim",  min: 45, desc: "Daha samimi, uzun sohbetler." },
    { key: "hangout",   label: "Birlikte Takılma",     min: 65, desc: "Hangout etkinlikleri açıldı." },
    { key: "feature",   label: "Feature Teklifi",      min: 80, desc: "Ortak şarkı (feature) teklif edebilirsin." },
    { key: "ortak",     label: "Ortak Proje",          min: 92, desc: "EP/albüm düzeyinde ortak proje." },
    { key: "sozlesme",  label: "Şirkete Katılma",      min: 98, desc: "Şirketine sözleşme teklif edebilirsin (kendi label'ın varsa)." }
  ];

  /* ---------------- BECERİLER (yan işler için) ---------------- */
  K.SKILLS = {
    work:    { name: "İş Tecrübesi",    icon: "🧰", desc: "Hizmet işlerinde verimini artırır." },
    studio:  { name: "Stüdyo Becerisi", icon: "🎚️", desc: "Kayıt kalitesini artırır." },
    music:   { name: "Müzikal Yetenek", icon: "🎼", desc: "Şarkı kalitesini artırır." },
    network: { name: "Network",         icon: "🤝", desc: "İş ve iş birliği fırsatlarını açar." }
  };
  K.skillLevel = function (k) {
    return (K.state && K.state.player.skills && K.state.player.skills[k]) || 0;
  };

  K.stageIndexFor = function (affinity) {
    let idx = 0;
    K.AFFINITY_STAGES.forEach((s, i) => { if (affinity >= s.min) idx = i; });
    return idx;
  };
  K.stageFor = function (affinity) { return K.AFFINITY_STAGES[K.stageIndexFor(affinity)]; };
  K.nextStageFor = function (affinity) {
    const i = K.stageIndexFor(affinity);
    return i < K.AFFINITY_STAGES.length - 1 ? K.AFFINITY_STAGES[i + 1] : null;
  };

  /* ---------- economy constants ---------- */
  K.ECON = {
    startBalance: 25000,
    startAge: 15,
    royaltyPerStream: 0.0011,     // (eski) — artık platform bazlı aylık ödeme var
    /* PLATFORM BAZLI DİNLENME ÜCRETİ (₺ / dinlenme) */
    streamRates: { spotify: 0.005, apple: 0.015, youtube: 0.008 },
    payoutPeriodDays: 30,          // her 30 günde bir telif ödemesi
    streamRevenueShare: 0.62,     // sanatçıya kalan (label yoksa 1.0)
    labelFoundCost: 250000,       // kendi şirketini kurma
    labelFoundMinPop: 45,
    minAdvance: 20000,
    defaultRoyalty: 70,
    messageCooldown: 0,           // aynı gün sınırsız ama günlük limit aşağıda
    dailyMessageLimit: 6,
    hangoutCost: 4500,
    giftCost: 12000,

    /* ---- GERÇEKLİK KATMANI: aylık gider, vergi, süperfan ---- */
    monthlyBase: 1200,        // kira / telefon / ulaşım / muhasebe tabanı (kariyer seviyesiyle çarpılır)
    equipmentUpkeep: 300,     // ekipman bakımı
    costStartPop: 5,          // bu popülaritenin altında sabit gider YOK (aile desteği)
    costStartFollowers: 5000, // bu takipçinin altında sabit gider YOK
    perSongUpkeep: 120,       // her yayınlanmış şarkı için aylık bakım (katalog masrafı)
    taxRate: 0.14,            // aylık gelir vergisi oranı
    taxFreeMonthly: 15000,    // bu tutara kadar vergi alınmaz
    superfanRate: 0.02,       // takipçinin süperfan oranı
    clubPlatformCut: 0.15     // fan kulübü platform komisyonu
  };

  /* ---------- new game ---------- */
  K.newGame = function () {
    const s = {
      version: 2,
      day: 1,
      dateStart: K.util.todayISO(),  // oyun gün 1'in gerçek takvim tarihi
      balance: K.ECON.startBalance,
      started: false,
      player: {
        stageName: "KARMA",
        realName: "",
        firstName: "",
        lastName: "",
        age: K.ECON.startAge,
        birth: null,                 // { y, m, d } — doğum günü buradan hesaplanır
        fatigue: 0,
        jobLog: {},
        jobEarnings: 0,
        skills: { work: 4, studio: 0, music: 6, network: 2 },
        persona: null,            // sanatçı kimliği (data/persona.js)
        beats: [],                // beat envanteri [{id,name,producer,quality,cost}]
        ghost: { hired: false, name: null, exposure: 0, uses: 0 },  // söz yazarı
        albums: [],
        dailyHistory: [],
        watchHistory: [],
        ytAutoplay: true,
        ytReadDay: 0,
        payouts: [],
        totalStreamRevenue: 0,
        notifications: [],
        city: "İstanbul",
        genre: "trap",
        popularity: 0,
        monthly: 0,
        streams: 0,
        ytSubs: 0, ig: 0, x: 0, tiktok: 0,
        labelId: null,             // oyuncunun kayıtlı olduğu şirket
        reputation: 0,
        totalEarned: 0,
        songs: [],                 // yayınlanmış şarkılar
        releases: [],              // yayın hattında olanlar
        messagesSentToday: 0,

        /* --- gerçekçilik: sözleşme/borç/gider/fan --- */
        labelDeal: null,           // { labelId, advance, recouped, artistRoyalty, ... }
        debt: 0,                   // ödenemeyen gider/vergi borcu
        monthIncome: 0,            // bu ayın toplam geliri (vergi için)
        superfans: 0,
        fanClub: null,             // { level, price, conv, since, subscribers }
        merchCooldownDay: 0,
        vipCooldownDay: 0,
        publishingEarned: 0,
        publishingDeal: null,     // { publisher, cut } — yayıncı anlaşması
        image: 50,                // kamu imajı (sevilen ↔ tartışmalı)
        skillDays: {},            // son pratik günleri (beceri dökümü için)

        /* --- hedefler / ekip / sponsor / klip (yeni) --- */
        achievements: {},         // id -> açıldığı gün
        team: { manager: 0, pr: 0, lawyer: 0, engineer: 0, stylist: 0 },
        sponsors: [],             // aktif sponsorluklar
        tutorial: {},             // rehber adımları (id -> true)

        /* --- telefon (OS) --- */
        battery: 100,
        phone: { theme: "dark", wallpaper: "karma", brightness: 1, batterySaver: false, layout: null },
        installed: null           // yüklü (kilitli olmayan) uygulamalar; phoneOS doldurur
      },
      label: null,                 // oyuncunun kurduğu şirket
      relations: {},
      threads: {},
      contacts: [],          // mahalle/semt çevresi (systems/contacts.js)
      offers: [],
      feed: { ig: [], x: [], tiktok: [], yt: [] },
      trends: [],
      agenda: null,          // güncel gündem/haber konuları (data/news.js)
      beefs: {},             // husumet / diss kayıtları (systems/beef.js)
      crew: null,            // oyuncunun çetesi (sistem: beef.js)
      pendingIncident: null, // karar bekleyen günlük olay
      pendingSync: null,          // karar bekleyen sync teklifi
      pendingCatalogOffer: null,  // bekleyen katalog satın alma teklifi
      catalogSold: false,         // katalog master hakları satıldı mı
      pendingPress: null,         // bekleyen basın teklifi
      pendingSponsor: null,       // bekleyen sponsorluk teklifi
      quests: null,               // haftalık görevler
      userPlaylists: [],          // kullanıcı çalma listeleri
      queue: [],                  // çalma kuyruğu
      chart: [],
      log: [],
      /* --- genişletilmiş sistemler --- */
      history: [],
      settings: {},
      concerts: [],
      tour: null,
      rivals: [],
      crisis: null,
      awards: { lastDay: 0, history: [] },
      staff: { manager: 0, producer: 0, pr: 0, ar: 0 },
      catalog: [],
      live: null,
      flags: { introSeen: false, labelUnlocked: false }
    };
    return s;
  };

  K.state = null;

  /* ---------- relation accessors ---------- */
  K.relation = function (artistId) {
    const s = K.state;
    if (!s.relations[artistId]) {
      const a = K.artistById(artistId);
      s.relations[artistId] = {
        affinity: a ? (a.affinityStart || 5) : 5,
        discovered: false,       // profil keşfedildi mi (affinity görünür mü)
        met: false,
        lastInteract: 0,
        interactions: 0,
        history: [],
        flags: { hangout: false, feature: false, collab: false, contractOffered: false },
        giftCooldown: 0,
        hangoutCooldown: 0
      };
    }
    return s.relations[artistId];
  };

  K.thread = function (artistId) {
    const s = K.state;
    if (!s.threads[artistId]) {
      s.threads[artistId] = { messages: [], unread: 0, lastDay: 0 };
    }
    return s.threads[artistId];
  };

  /* ---------- save / load ---------- */
  K.save = function () {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(K.state));
      return true;
    } catch (e) {
      console.warn("kayıt hatası", e);
      return false;
    }
  };

  K.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.player) return false;
      K.state = data;
      // migrate / defaults
      K.state.offers = K.state.offers || [];
      K.state.feed = K.state.feed || { ig: [], x: [], tiktok: [], yt: [] };
      K.state.trends = K.state.trends || [];
      if (K.state.agenda === undefined) K.state.agenda = null;
      K.state.beefs = K.state.beefs || {};
      if (K.state.crew === undefined) K.state.crew = null;
      if (K.state.pendingIncident === undefined) K.state.pendingIncident = null;
      // eski beef kayıtlarına log / seviye alanları ekle
      Object.values(K.state.beefs).forEach(b => { if (!b.log) b.log = []; if (b._stageLevel == null) b._stageLevel = 0; });
      K.state.chart = K.state.chart || [];
      K.state.relations = K.state.relations || {};
      K.state.threads = K.state.threads || {};
      K.state.contacts = K.state.contacts || [];
      (K.state.player.songs || []).forEach(sg => { if (!sg.lists) sg.lists = []; });
      // yeni alan varsayılanları (eski kayıtlar için)
      K.state.history = K.state.history || [];
      K.state.settings = K.state.settings || {};
      K.state.concerts = K.state.concerts || [];
      if (K.state.tour === undefined) K.state.tour = null;
      K.state.rivals = K.state.rivals || [];
      if (K.state.crisis === undefined) K.state.crisis = null;
      K.state.awards = K.state.awards || { lastDay: 0, history: [] };
      K.state.staff = K.state.staff || { manager: 0, producer: 0, pr: 0, ar: 0 };
      K.state.catalog = K.state.catalog || [];
      K.state.player.skills = K.state.player.skills || { work: 4, studio: 0, music: 6, network: 2 };
      if (K.state.player.persona === undefined) K.state.player.persona = null;
      K.state.player.beats = K.state.player.beats || [];
      if (!K.state.player.ghost) K.state.player.ghost = { hired: false, name: null, exposure: 0, uses: 0 };
      K.state.player.selloutUntil = K.state.player.selloutUntil || 0;
      if (K.state.pendingInterview === undefined) K.state.pendingInterview = null;
      if (K.state.pendingAward === undefined) K.state.pendingAward = null;
      if (K.state.player.lastFinance === undefined) K.state.player.lastFinance = null;
      K.state.player.albums = K.state.player.albums || [];
      K.state.player.dailyHistory = K.state.player.dailyHistory || [];
      K.state.player.watchHistory = K.state.player.watchHistory || [];
      if (K.state.player.ytAutoplay === undefined) K.state.player.ytAutoplay = true;
      K.state.player.ytReadDay = K.state.player.ytReadDay || 0;
      K.state.player.payouts = K.state.player.payouts || [];
      K.state.player.totalStreamRevenue = K.state.player.totalStreamRevenue || 0;
      /* yeni alanlar (eski kayitlar) */
      if (K.state.player.labelDeal === undefined) K.state.player.labelDeal = null;
      K.state.player.debt = K.state.player.debt || 0;
      K.state.player.monthIncome = K.state.player.monthIncome || 0;
      K.state.player.superfans = K.state.player.superfans || 0;
      if (K.state.player.fanClub === undefined) K.state.player.fanClub = null;
      K.state.player.merchCooldownDay = K.state.player.merchCooldownDay || 0;
      K.state.player.vipCooldownDay = K.state.player.vipCooldownDay || 0;
      K.state.player.publishingEarned = K.state.player.publishingEarned || 0;
      if (K.state.player.publishingDeal === undefined) K.state.player.publishingDeal = null;
      if (K.state.player.image === undefined) K.state.player.image = 50;
      K.state.player.skillDays = K.state.player.skillDays || {};
      if (K.state.pendingPress === undefined) K.state.pendingPress = null;
      if (K.state.pendingSponsor === undefined) K.state.pendingSponsor = null;
      if (K.state.quests === undefined) K.state.quests = null;
      K.state.userPlaylists = K.state.userPlaylists || [];
      K.state.queue = K.state.queue || [];
      K.state.xReplies = K.state.xReplies || {};
      K.state.player.achievements = K.state.player.achievements || {};
      K.state.player.team = K.state.player.team || { manager: 0, pr: 0, lawyer: 0, engineer: 0, stylist: 0 };
      K.state.player.sponsors = K.state.player.sponsors || [];
      K.state.player.tutorial = K.state.player.tutorial || {};
      if (K.state.player.battery == null) K.state.player.battery = 100;
      K.state.player.phone = K.state.player.phone || { theme: "dark", wallpaper: "karma", brightness: 1, batterySaver: false, layout: null };
      if (K.state.player.phone.layout === undefined) K.state.player.phone.layout = null;
      if (K.state.player.installed === undefined) K.state.player.installed = null;
      if (K.state.pendingSync === undefined) K.state.pendingSync = null;
      if (K.state.pendingCatalogOffer === undefined) K.state.pendingCatalogOffer = null;
      if (K.state.catalogSold === undefined) K.state.catalogSold = false;
      K.state.notifications = K.state.notifications || [];
      K.state.albumChart = K.state.albumChart || [];
      K.state.albumChartRising = K.state.albumChartRising || [];
      K.state.player.likes = K.state.player.likes || {};
      K.state.player.follows = K.state.player.follows || {};
      K.state.player.subs = K.state.player.subs || {};
      K.state.player.saved = K.state.player.saved || {};

      /* ---- TAKVİM & YAŞ (yeni sistem) ---- */
      // Eski kayıtlarda dateStart yoksa bugünden başlat.
      K.state.dateStart = K.state.dateStart || K.util.todayISO();
      // Eski kayıtlarda birth yoksa, mevcut yaşa göre makul bir doğum tarihi üret
      // (1 Ocak varsayımı) ki yaş mekanizması çalışsın.
      if (!K.state.player.birth) {
        const start = K.util.fromISO(K.state.dateStart);
        const age = (K.state.player.age != null) ? K.state.player.age : K.ECON.startAge;
        const passed = (start.m > 1) || (start.m === 1 && start.d >= 1);
        K.state.player.birth = { y: start.y - age - (passed ? 0 : 1), m: 1, d: 1 };
      }
      if (K.state.player.age == null) K.state.player.age = K.ECON.startAge;
      return true;
    } catch (e) {
      console.warn("yükleme hatası", e);
      return false;
    }
  };

  K.resetGame = function () {
    K.state = K.newGame();
    K.save();
  };

  K.hasSave = function () { return !!localStorage.getItem(SAVE_KEY); };
})(window.K);
