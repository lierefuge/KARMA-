/* ============================================================
   KARMA — data/genres.js
   Türler · Yayın formatları · Parça türleri · Stüdyolar · Prodüktörler
   ============================================================ */
(function (K) {
  "use strict";

  /* ---------------- TÜRLER ---------------- */
  K.GENRES = [
    { id: "rap",      name: "Rap",            icon: "🎤", prodCost: 0.92, quality: 1.02, mass: 1.00, note: "Dengeli, sözlere dayalı klasik." },
    { id: "hiphop",   name: "Hip-Hop",        icon: "🧢", prodCost: 0.96, quality: 1.04, mass: 1.02, note: "Boom bap'tan moderne geniş şemsiye." },
    { id: "trap",     name: "Trap",           icon: "🔥", prodCost: 1.00, quality: 1.05, mass: 1.10, note: "Yüksek dinlenme potansiyeli, hızlı viral." },
    { id: "drill",    name: "Drill",          icon: "🥶", prodCost: 1.05, quality: 0.98, mass: 1.12, note: "Sert sound, genç kitle." },
    { id: "boombap",  name: "Boom Bap",       icon: "🥁", prodCost: 0.80, quality: 1.08, mass: 0.82, note: "Eski ekol; sadık ama dar kitle." },
    { id: "cloudrap", name: "Cloud Rap",      icon: "☁️", prodCost: 0.94, quality: 1.06, mass: 0.92, note: "Atmosferik, niş ve sadık dinleyici." },
    { id: "afrotrap", name: "Afro-Trap",      icon: "🌍", prodCost: 1.02, quality: 1.00, mass: 1.06, note: "Ritmik, yaz aylarında güçlü." },
    { id: "pop",      name: "Pop",            icon: "✨", prodCost: 1.15, quality: 1.00, mass: 1.20, note: "En geniş kitle, radyo dostu." },
    { id: "rnb",      name: "R&B",            icon: "🌙", prodCost: 1.10, quality: 1.12, mass: 0.98, note: "Kalite odaklı, sadık dinleyici." },
    { id: "arabesk",  name: "Arabesk Rap",    icon: "💔", prodCost: 1.02, quality: 1.00, mass: 1.08, note: "Duygusal, güçlü bağ kurar." },
    { id: "phonk",    name: "Phonk",          icon: "👻", prodCost: 0.86, quality: 1.04, mass: 1.14, note: "Viral odaklı, kısa video sound'u." },
    { id: "euro",     name: "Euro Trap",      icon: "EU", prodCost: 1.06, quality: 1.02, mass: 1.04, note: "Avrupa sound'u, kulüp uyumlu." },
    { id: "hyperpop", name: "Hyperpop",       icon: "⚡", prodCost: 1.08, quality: 1.06, mass: 1.02, note: "Deneysel, genç ve niş." },
    { id: "indie",    name: "Indie / Alt",    icon: "🎸", prodCost: 0.88, quality: 1.10, mass: 0.88, note: "Sanatsal itibar, düşük ticari." }
  ];

  K.genreById = function (id) {
    return K.GENRES.find(g => g.id === id) || K.GENRES[0];
  };

  /* ---------------- YAYIN FORMATLARI ---------------- */
  K.RELEASE_TYPES = {
    single:  { id: "single",  name: "Single",        tracks: 1,  icon: "💿", dist: 3000,  note: "Tek parça, hızlı çıkış." },
    double:  { id: "double",  name: "Çift Single",   tracks: 2,  icon: "💿", dist: 4500,  note: "İki parça, daha fazla içerik." },
    ep:      { id: "ep",      name: "EP",            tracks: 4,  icon: "📀", dist: 9000,  note: "Kısa proje, kimlik gösterir." },
    mixtape: { id: "mixtape", name: "Mixtape",       tracks: 8,  icon: "📼", dist: 12000, note: "Sokak işi, hayran kitlesi kurar." },
    album:   { id: "album",   name: "Albüm",         tracks: 10, icon: "🗂️", dist: 18000, note: "Tam proje, prestij ve kritik." },
    deluxe:  { id: "deluxe",  name: "Deluxe Albüm",  tracks: 14, icon: "💎", dist: 26000, note: "Büyük lansman, yüksek maliyet." }
  };

  /* ---------------- PARÇA TÜRÜ (kind) ---------------- */
  K.TRACK_KINDS = {
    normal:   { id: "normal",   name: "Normal Parça",   icon: "🎵", costMult: 1.00, qAdd: 0,  qMult: 1.00, mass: 1.00, viral: 1.00, note: "Standart yayın." },
    freestyle:{ id: "freestyle",name: "Freestyle",      icon: "🎙️", costMult: 0.40, qAdd: -8, qMult: 0.95, mass: 1.10, viral: 1.35, note: "Ucuz ve ham; viral şansı yüksek." },
    remix:    { id: "remix",    name: "Remix",          icon: "🔁", costMult: 0.70, qAdd: -2, qMult: 1.00, mass: 1.12, viral: 1.25, note: "Tanıdık bir işin yeniden yorumu." },
    acoustic: { id: "acoustic", name: "Akustik",        icon: "🪕", costMult: 0.50, qAdd: 4,  qMult: 1.06, mass: 0.88, viral: 0.85, note: "Sanatsal, kalite odaklı." },
    live:     { id: "live",     name: "Canlı Kayıt",    icon: "🎤", costMult: 0.55, qAdd: 2,  qMult: 1.02, mass: 0.92, viral: 1.05, note: "Sahne enerjisi, samimi kayıt." },
    diss:     { id: "diss",     name: "Diss",           icon: "⚔️", costMult: 0.90, qAdd: -2, qMult: 0.97, mass: 1.20, viral: 1.50, note: "Gündem yaratır; itibar riski var." }
  };
  K.kindById = function (id) { return K.TRACK_KINDS[id] || K.TRACK_KINDS.normal; };

  /* ---------------- ALTYAPI (BEAT) TÜRLERİ ----------------
     Stüdyo/prodüktör kademeleri kaldırıldı. Kaliteyi artık şarkının
     kendi üretim parametreleri belirler: altyapı, vokal ve mix. */
  K.BEAT_TYPES = [
    { id: "digital",    name: "Dijital Beat",      icon: "💻", costMult: 0.80, qAdd: 0,  mass: 1.00, viral: 1.00, note: "Modern, temiz dijital altyapı." },
    { id: "trap808",    name: "Trap 808",          icon: "🔥", costMult: 0.95, qAdd: 3,  mass: 1.10, viral: 1.15, note: "Derin 808 ve hızlı hi-hat." },
    { id: "boombap",    name: "Boom Bap",          icon: "🥁", costMult: 0.85, qAdd: 5,  mass: 0.90, viral: 0.85, note: "Sample tabanlı klasik vuruş." },
    { id: "drill",      name: "Drill Slayt",       icon: "🥶", costMult: 1.05, qAdd: 2,  mass: 1.14, viral: 1.20, note: "Kaydırmalı 808, sert sound." },
    { id: "sample",     name: "Sample / Örnek",    icon: "🎞️", costMult: 1.00, qAdd: 6,  mass: 0.95, viral: 1.05, note: "Örnekleme ile karakter." },
    { id: "synth",      name: "Synth / Elektronik",icon: "🎛️", costMult: 1.10, qAdd: 7,  mass: 1.02, viral: 1.05, note: "Sintetik doku, geniş ses." },
    { id: "acoustic",   name: "Akustik Canlı",     icon: "🎸", costMult: 0.70, qAdd: 8,  mass: 0.88, viral: 0.80, note: "Canlı enstrüman, organik." },
    { id: "orchestral", name: "Orkestral",         icon: "🎻", costMult: 1.50, qAdd: 12, mass: 0.96, viral: 0.90, note: "Sinematik, pahalı prodüksiyon." }
  ];
  K.beatById = function (id) { return K.BEAT_TYPES.find(b => b.id === id) || K.BEAT_TYPES[0]; };

  /* ---------------- VOKAL STİLLERİ ---------------- */
  K.VOCAL_STYLES = [
    { id: "rap",        name: "Rap / Flow",       icon: "🎤", costMult: 1.00, qAdd: 0,  mass: 1.00, viral: 1.00, note: "Net flow, söz öne çıkar." },
    { id: "melodic",    name: "Melodik",          icon: "🎶", costMult: 1.05, qAdd: 4,  mass: 1.06, viral: 1.05, note: "Melodik hook'lar ve nakarat." },
    { id: "autotune",   name: "Auto-Tune",        icon: "🤖", costMult: 0.95, qAdd: 2,  mass: 1.08, viral: 1.12, note: "Modern, viral uyumlu tını." },
    { id: "layered",    name: "Katmanlı Vokal",   icon: "🧱", costMult: 1.15, qAdd: 7,  mass: 1.00, viral: 1.00, note: "Back-vokal katmanları, dolgun." },
    { id: "whisper",    name: "Fısıltı",          icon: "🤫", costMult: 0.85, qAdd: 3,  mass: 0.94, viral: 0.95, note: "Yakın mic, samimi ton." },
    { id: "aggressive", name: "Sert / Bağıran",   icon: "😤", costMult: 0.90, qAdd: -1, mass: 1.12, viral: 1.25, note: "Yüksek enerji, agresif." },
    { id: "clean",      name: "Temiz Stüdyo Kaydı",icon: "✨", costMult: 1.25, qAdd: 10, mass: 1.00, viral: 0.95, note: "Kusursuz, pahalı kayıt." }
  ];
  K.vocalById = function (id) { return K.VOCAL_STYLES.find(v => v.id === id) || K.VOCAL_STYLES[0]; };

  /* ---------------- yayın bekleme ---------------- */
  K.RELEASE_WAIT_PRESETS = [
    { id: "fast",   label: "Hızlı Sürüm",    days: 13, note: "Hızlı ama editoryal desteği sınırlı." },
    { id: "normal", label: "Standart",       days: 18, note: "Dengeli hazırlık süreci." },
    { id: "slow",   label: "Büyük Lansman",  days: 24, note: "Tam hazırlık, yüksek lansman gücü." },
    { id: "hype",   label: "Hype Kampanyası",days: 35, note: "Uzun bekleme ama güçlü ilk gün ivmesi." }
  ];

  /* ---------------- kariyer promosyon kanalları ---------------- */
  K.PROMO_CHANNELS = [
    { id: "playlist", name: "Playlist Pitch", icon: "📻", cost: 8000,  effect: 0.18, note: "Editoryal listelere gönderim." },
    { id: "radio",    name: "Radyo Promosyonu", icon: "📡", cost: 12000, effect: 0.22, note: "Ulusal radyo çalma şansı." },
    { id: "billboard",name: "Açık Hava Reklam", icon: "🪧", cost: 20000, effect: 0.30, note: "Şehir genelinde görünürlük." }
  ];

  /* ---------------- BEAT LİSANS MODELLERİ ----------------
     Ücretsiz tag'li beat ucuz ama kalitesiz ve exclusive değil;
     exclusive beat pahalı, kaliteli ve prodüktör puanı doğurur. */
  K.BEAT_LICENSES = [
    { id: "tagged",    name: "Ücretsiz (tag'li)",  icon: "🆓", costMult: 0.0,  qAdd: -6, exclusive: false, points: 0, note: "Etiketli beat; kalite düşük, exclusive değil." },
    { id: "leased",    name: "Leased (kiralık)",   icon: "📄", costMult: 0.35, qAdd: 0,  exclusive: false, points: 0, note: "Standart kiralık kullanım hakkı." },
    { id: "exclusive", name: "Exclusive (tam hak)", icon: "🔒", costMult: 1.6,  qAdd: 6,  exclusive: true,  points: 3, note: "Tam hak; prodüktör %3 puan alır." }
  ];
  K.licenseById = function (id) { return K.BEAT_LICENSES.find(l => l.id === id) || K.BEAT_LICENSES[1]; };
})(window.K = window.K || {});
