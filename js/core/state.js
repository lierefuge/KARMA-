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
    /* PLATFORM BAZLI DİNLENME ÜCRETİ (₺ / dinlenme) — temel değerler.
       Gerçek dünyada bunlar USD'dir; oyunda 1 USD = baseFx ₺ kabul edilir ve
       kur dalgalanması tüm telif gelirini oransal olarak büyütür/küçültür.
       NOT (v10.24): `royaltyPerStream` (eski sabit 0,0011 ₺) KALDIRILDI.
       Son kullanıcısı `K.economy.labelDailyNet()` idi ve orada kur/enflasyon
       uygulanmadığı için şirket gelirini gerçekçi değerin ~1/200'üne
       düşürüyordu. Artık tüm gelir yolları `streamRates` (+ `econ.avgRate()`)
       üzerinden hesaplanır. */
    streamRates: { spotify: 0.005, apple: 0.015, youtube: 0.008, other: 0.004 },
    /* platform karması — gelir dağılımı platform ayrımı yapmayan yollarda
       (şirket kadrosu, tahmin) ağırlıklı ortalama kur için kullanılır */
    storeMix: { spotify: 0.46, apple: 0.19, youtube: 0.28, other: 0.07 },
    payoutPeriodDays: 30,          // her 30 günde bir telif ödemesi

    /* ==========================================================
       v10.17 — DİKKAT DALGASI ("yüksel → zirve → düş" eğrisi)

       Ölçülen sorun: 30 günde bir yayın yapan sanatçıda aylık
       dinleyici 420 gün boyunca TEK YÖNLÜ artıyordu (172 → 76.490);
       hiç zirve yapmıyor, hiç düşmüyordu. Yayını bırakınca düşüş
       vardı ama yükselişin bir TAVANI yoktu.

       Model: her yayın bir "dikkat dalgası" (attention) ekler; dalga
       her gün söner. Ama her yayın DOYGUNLUK (fatigue) da biriktirir ve
       doygunluk sonraki yayının kazancını kısar. Bu iki zıt kuvvet
       doğal olarak: hızlı yükseliş → zirve/plato → (yayın yavaşlarsa)
       düşüş eğrisini üretir. Üstel sınırsız büyümeyi de engeller.
       ========================================================== */
    attentionGain: 0.62,      // tam güçte yayın başına dalga kazancı
    attentionMax: 2.30,       // dalga tavanı (katalog dinlenmesini en çok 2,3× besler)
    attentionDecay: 0.978,    // günlük sönüm — fazlalığın yarı ömrü ≈ 31 gün
    fatigueStep: 0.17,        // her yayın doygunluğu bu kadar artırır
    fatigueMax: 0.74,         // doygunluk tavanı (yayın başına kazanç en çok %74 kısılır)
    fatigueRecovery: 0.9955,  // günlük doygunluk azalması (yarı ömür ≈ 154 gün)

    /* ---------- v10.32 KATALOG SÖNÜMÜ: unutulma ----------
       Ölçüm (tools/sim-balance.js): 34 şarkılık ÖLÜ bir katalog,
       şarkı başına 5 dinlenmelik taban yüzünden aylık ~2.500
       “dinleyici”yi SONSUZA KADAR koruyordu — en iyi şarkısı günde
       5 dinlenirken. Yani taban katalog büyüklüğüyle DOĞRUSAL
       büyüyor ve hiç sönmüyordu; “yüksel → zirve → düş” halkası
       kopuktu, oyuncuya “yayın yap” baskısı kalmıyordu.
       Artık taban da sönümlenir: sanatçı görünmez kaldıkça unutulur. */
    silenceGrace: 30,          // yayınsız ilk 30 gün ceza yok (normal aralık)
    silenceDecay: 0.9945,      // sonrasında günlük unutulma (yarı ömür ≈ 126 gün)
    silenceFloor: 0.22,        // çarpanın alt sınırı — tamamen sıfırlanmaz
    catalogFloor: 5,           // şarkı başına dinlenme tabanı (aktifken)

    /* ---------- v10 GERÇEKLİK KATMANI: kur · enflasyon · gecikme · vergi ---------- */
    baseFx: 32,                    // 1 USD = 32 ₺ (oyun başı)
    fxMonthlyDrift: 0.018,         // aylık ortalama ₺ değer kaybı (%1,8)
    fxShockChance: 0.07,           // aylık ani kur şoku olasılığı
    fxShockMin: 0.08,              // şok alt sınırı
    fxShockMax: 0.30,              // şok üst sınırı
    inflationMonthly: 0.021,       // aylık enflasyon: maliyet VE telif nominal artışı
    /* TELİF ÖDEME GECİKMESİ (gün) — mağazalar dinlenmeyi geç raporlar.
       Dinlenme bu süre dolmadan ödenmez. */
    payoutLag: { spotify: 60, apple: 45, youtube: 75, other: 55 },
    /* 30 SANİYE EŞİĞİ: dinlenmenin bir kısmı gelir sayılmaz (atlanan çalma). */
    skipRateMin: 0.08,             // en iyi durumda bile %8 atlanır
    skipRateMax: 0.34,             // kötü/uzun girişli şarkıda %34 atlanır
    /* GELİR VERGİSİ DİLİMLERİ (aylık, kümülatif değil kademeli) */
    taxBrackets: [
      { upTo: 15000, rate: 0 },
      { upTo: 60000, rate: 0.15 },
      { upTo: 150000, rate: 0.22 },
      { upTo: Infinity, rate: 0.30 }
    ],
    debtPenaltyMonthly: 0.035,     // ödenmeyen borca aylık gecikme faizi
    /* v10.8 — ŞİRKET KURMA EŞİĞİ GERÇEKÇİLEŞTİRİLDİ.
       Eskiden pop 45 isteniyordu; pop 45 ≈ 1M aylık dinleyici demek.
       400 günlük simülasyonda oyuncu 10'da kalıyordu → "şirket kur"
       özelliği pratikte ulaşılamazdı. Gerçekte bir indie label kurmak
       için süperstar olmak gerekmez; sağlam bir dinleyici tabanı ve
       biraz sermaye yeterlidir. */
    labelFoundCost: 120000,       // kendi şirketini kurma
    labelFoundMinPop: 28,
    /* v10.24 — ŞİRKET EKONOMİSİ (gerçekçi kâr/zarar)
       labelBillableShare: kadro dinlenmesinin gelir sayılan oranı. 30 saniye
         eşiği şirket kataloğu için de geçerlidir; oyuncunun kendi şarkılarındaki
         ayrıntılı atlama modelinin kadro (NPC) tarafındaki basitleştirilmiş
         karşılığıdır.
       labelOpexShare: tanıtım + kayıt + A&R + dağıtım giderinin BRÜT gelire
         oranı. Gerçek şirketlerde bu kalem brüt gelirin ~%15-20'sidir; şirket
         kârı, sözleşme payı ile bu gider arasındaki farktır (indie şirketler
         ince marjla çalışır). */
    labelBillableShare: 0.88,
    labelOpexShare: 0.18,

    /* v10.28 — GENİŞLEME PAKETİ · sistemler arası paylaşılan sabitler.
       Sistemin KENDİ ayarları (ürün tipleri, varlık listesi, pazar
       tabloları) ilgili sistem dosyasında yaşar. */
    writingBase: 18000,        // başkası için yazmanın temel ücreti (systems/writing.js)
    minAdvance: 20000,
    defaultRoyalty: 70,
    dailyMessageLimit: 6,
    hangoutCost: 4500,
    giftCost: 12000,

    /* ---- GERÇEKLİK KATMANI: aylık gider, vergi, süperfan ---- */
    monthlyBase: 1200,        // kira / telefon / ulaşım / muhasebe tabanı (kariyer seviyesiyle çarpılır)
    equipmentUpkeep: 300,     // ekipman bakımı
    costStartPop: 5,          // bu popülaritenin altında sabit gider YOK (aile desteği)
    costStartFollowers: 5000, // bu takipçinin altında sabit gider YOK
    perSongUpkeep: 120,       // her yayınlanmış şarkı için aylık bakım (katalog masrafı)
    superfanRate: 0.02,       // takipçinin süperfan oranı
    clubPlatformCut: 0.15,    // fan kulübü platform komisyonu

    /* v10.7 — KATALOG BAKIM TAVANI (borç sarmalını / sınırsız gider artışını önler) */
    catalogUpkeepMaxShare: 0.25,   // katalog bakımı o aylık gelirin en fazla %25'i
    catalogUpkeepFloor: 900,       // ama en az bu kadar (katalog bedava değil)

    /* v10.7 — acemi koruması süresi (gün). Aile desteği geçici. */
    beginnerGraceDays: 120,

    /* v10.9 — ŞÖHRET TAVANI
       Olaylardan gelen popülerlik kazanımları (konser, ödül, TV, röportaj)
       dinleyicinin hak ettiği değerin en fazla bu kadar üstüne çıkabilir.
       Böylece bir TV programı seni geçici olarak öne taşır ama iki yıl
       boyunca hak etmediğin bir şöhreti taşımazsın. */
    fameHeadroom: 8
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
        /* B-6: OYUNCUNUN kimlik id'si (data/player-persona.js → K.PLAYER_PERSONAS).
           NPC kişilik katmanı (data/npc-personality.js → K.npcPersonality)
           ile İLGİSİZDİR. Alan adı kayıt uyumluluğu için `persona` kaldı. */
        /* B-6: OYUNCUNUN kimlik id'si (data/persona.js → K.PLAYER_PERSONAS).
           NPC kişilik katmanı (data/personality.js → K.npcPersonality)
           ile İLGİSİZDİR. Alan adı kayıt uyumluluğu için `persona` kaldı. */
        persona: null,
        /* ---------------- v10.28 GENİŞLEME PAKETİ ----------------
           Taze oyunda da tanımlı olmalı; eski kayıtlar için aynı alanlar
           `loadGame` göç bloğunda da varsayılır (state.js alt kısmı). */
        merch: { brand: null, active: null, drops: [], brandValue: 0, cooldownDay: 0, totalRevenue: 0 },
        assets: [],
        writing: { offers: [], done: [], credited: 0, exposed: 0, totalEarned: 0 },
        stress: 10,
        mental: { therapyUntil: 0, sessions: 0, hiatusUntil: 0, burnoutCount: 0, spokeOut: false },
        shady: { botStreams: 0, suspicion: 0, strikes: 0, bannedUntil: 0, curatorDeals: [], everUsed: false },
        intl: { stage: 0, markets: {}, tours: [], features: 0, globalPlays: 0 },
        beats: [],                // beat envanteri [{id,name,producer,quality,cost}]
        ghost: { hired: false, name: null, exposure: 0, uses: 0 },  // söz yazarı
        albums: [],
        dailyHistory: [],
        plaques: [],              // v10.23 — Altın/Platin/Elmas plaklar (certifications.js)
        wrapped: [],              // v10.23 — yıl sonu özetleri (yearwrap.js)
        plaqueMult: 1,            // plaklardan gelen kalıcı katalog çarpanı
        plaqueAwardWeight: 0,     // plakların ödül şansına katkısı
        /* v10.17 — dikkat dalgası & doygunluk (yüksel→zirve→düş eğrisi).
           att: 1 = nötr; yayınla yükselir, günlük söner.
           fatigueAtt: yayın başına kazancı kısar → plato/zirve üretir. */
        att: 1,
        fatigueAtt: 0,
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
        installed: null,          // yüklü (kilitli olmayan) uygulamalar; phoneOS doldurur
        /* v10.30 — GELEN ARAMALAR + YABANCI DM'LER */
        calls: [],                // çalan/cevaplanan aramalar (systems/calls.js)
        callLog: [],              // arama geçmişi
        extSenders: [],           // yabancı DM gönderenleri (systems/dms.js)
        dmBlocks: {}              // engellenen hesaplar (id → gün)
      },
      label: null,                 // oyuncunun kurduğu şirket
      relations: {},
      threads: {},
      dmRequests: {},            // v10.12 — tanımadığından gelen istekler
      groups: {},                // v10.12 — grup sohbetleri (kadro / ortak proje)
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
      festivals: [],          // yaz festivali line-up kayıtları (systems/festivals.js)
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

  /* ---------- v10.12 — DM İSTEKLERİ ve GRUP SOHBETLERİ ----------
     DM istekleri: seni tanımayan biri (samimiyet düşük / hiç iletişim
     yok) yazdığında mesaj doğrudan gelen kutusuna düşmez; “İstekler”
     klasörüne girer. Kabul edersen sohbet açılır, reddedersen silinir —
     gerçek Instagram/DM davranışı budur. */
  K.dmRequest = function (artistId) {
    const s = K.state;
    s.dmRequests = s.dmRequests || {};
    if (!s.dmRequests[artistId]) s.dmRequests[artistId] = { messages: [], day: s.day };
    return s.dmRequests[artistId];
  };

  K.dmAcceptRequest = function (artistId) {
    const s = K.state;
    s.dmRequests = s.dmRequests || {};
    const req = s.dmRequests[artistId];
    if (!req) return null;
    const th = K.thread(artistId);
    (req.messages || []).forEach(m => th.messages.push(m));
    th.unread = (th.unread || 0) + (req.messages || []).length;
    th.lastDay = s.day;
    delete s.dmRequests[artistId];
    const rel = K.relation(artistId);
    if (rel) { rel.met = true; rel.discovered = true; }
    return th;
  };

  K.dmDeclineRequest = function (artistId) {
    const s = K.state;
    s.dmRequests = s.dmRequests || {};
    delete s.dmRequests[artistId];
  };

  /* ---------- GRUP SOHBETLERİ (kadro / ortak proje) ---------- */
  K.group = function (groupId) {
    const s = K.state;
    s.groups = s.groups || {};
    return s.groups[groupId] || null;
  };

  K.groupCreate = function (name, memberIds, kind) {
    const s = K.state;
    s.groups = s.groups || {};
    const id = K.util.uid("grp");
    s.groups[id] = {
      id, name: name || "Grup", kind: kind || "genel",
      members: (memberIds || []).filter(Boolean),
      messages: [], unread: 0, lastDay: s.day, createdDay: s.day
    };
    return s.groups[id];
  };

  K.groupPost = function (groupId, from, text, opts) {
    const g = K.group(groupId);
    if (!g) return null;
    opts = opts || {};
    const msg = {
      id: K.util.uid("gm"), from,
      fromName: opts.fromName || null,
      text, day: K.state.day, type: opts.type || "chat",
      kind: opts.kind || "text", reaction: null
    };
    g.messages.push(msg);
    g.lastDay = K.state.day;
    if (from !== "me") g.unread = (g.unread || 0) + 1;
    return msg;
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
      /* v10.12 — DM istekleri, grup sohbetleri, sabitleme/arşiv */
      K.state.dmRequests = K.state.dmRequests || {};
      K.state.groups = K.state.groups || {};
      K.state.player.dmPinned = K.state.player.dmPinned || [];
      K.state.player.dmArchived = K.state.player.dmArchived || [];
      K.state.player.dmDemoLog = K.state.player.dmDemoLog || [];
      (K.state.player.songs || []).forEach(sg => { if (!sg.lists) sg.lists = []; });
      // yeni alan varsayılanları (eski kayıtlar için)
      K.state.history = K.state.history || [];
      K.state.settings = K.state.settings || {};
      K.state.concerts = K.state.concerts || [];
      K.state.festivals = K.state.festivals || [];
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
      /* v10.23 — plak ve yıl özeti alanları (eski kayıtlar için) */
      K.state.player.plaques = K.state.player.plaques || [];
      K.state.player.wrapped = K.state.player.wrapped || [];
      if (K.state.player.plaqueMult == null) K.state.player.plaqueMult = 1;
      if (K.state.player.plaqueAwardWeight == null) K.state.player.plaqueAwardWeight = 0;
      (K.state.player.songs || []).forEach(sg => { if (!sg.certifications) sg.certifications = []; });
      (K.state.player.albums || []).forEach(al => { if (!al.certifications) al.certifications = []; });
      K.state.player.watchHistory = K.state.player.watchHistory || [];
      if (K.state.player.ytAutoplay === undefined) K.state.player.ytAutoplay = true;
      K.state.player.ytReadDay = K.state.player.ytReadDay || 0;

      /* ============================================================
         v10.28 — GENİŞLEME PAKETİ (altı yeni sistem) · eski kayıt göçü
         Her alanın ayrıntısı kendi sistem dosyasında:
           merch   → systems/merch.js    (ürün/streetwear markası)
           assets  → systems/assets.js   (varlık & gösteriş)
           writing → systems/writing.js  (başkası için şarkı yazmak)
           stress  → systems/mental.js   (akıl sağlığı & tükenmişlik)
           shady   → systems/shady.js    (bot dinlenme & payola)
           intl    → systems/intl.js     (uluslararası / diaspora)
         ============================================================ */
      if (!K.state.player.merch) {
        K.state.player.merch = { brand: null, active: null, drops: [], brandValue: 0, cooldownDay: 0, totalRevenue: 0 };
      }
      K.state.player.assets = K.state.player.assets || [];
      if (!K.state.player.writing) {
        K.state.player.writing = { offers: [], done: [], credited: 0, exposed: 0, totalEarned: 0 };
      }
      if (K.state.player.stress == null) K.state.player.stress = 10;
      if (!K.state.player.mental) {
        K.state.player.mental = { therapyUntil: 0, sessions: 0, hiatusUntil: 0, burnoutCount: 0, spokeOut: false };
      }
      if (!K.state.player.shady) {
        K.state.player.shady = { botStreams: 0, suspicion: 0, strikes: 0, bannedUntil: 0, curatorDeals: [], everUsed: false };
      }
      if (!K.state.player.intl) {
        K.state.player.intl = { stage: 0, markets: {}, tours: [], features: 0, globalPlays: 0 };
      }
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
      /* v10.30 — gelen aramalar + yabancı DM'ler (eski kayıt göçü) */
      K.state.player.calls = K.state.player.calls || [];
      K.state.player.callLog = K.state.player.callLog || [];
      K.state.player.extSenders = K.state.player.extSenders || [];
      K.state.player.dmBlocks = K.state.player.dmBlocks || {};
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
