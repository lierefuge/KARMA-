/* ============================================================
   KARMA — data/labels.js
   Gerçekçi Türk müzik şirketleri + KADROLARI + distribütörleri.

   power       : endüstri gücü (0-100)
   reach       : kurumsal erişim / tanıtım kabiliyeti
   fee         : sözleşme avansı beklentisi (₺)
   royalty     : şirketin aldığı pay (%)
   roster      : kadrodaki sanatçı id'leri (K.ARTISTS)
   distributor : dağıtımı yapan distribütör (mağazalara gönderim)
   cover       : şirketin dağıtımı ne kadar üstlenir (0-1)
   ============================================================ */
(function (K) {
  "use strict";

  K.LABELS = [
    { id: "dokuzsekiz", name: "Dokuz Sekiz Müzik", power: 82, reach: 88, fee: 180000, royalty: 42, focus: "Pop / Mainstream", color: "#6ec3ff",
      distributor: "The Orchard", cover: 0.55, roster: ["sila", "edis", "simge", "deryaulug"],
      note: "Türkiye'nin en köklü bağımsız etiketlerinden." },

    { id: "hypers", name: "Hypers Music", power: 74, reach: 80, fee: 140000, royalty: 45, focus: "Rap / Trap", color: "#b06cff",
      distributor: "Believe", cover: 0.5, roster: ["sehinsah", "weghrumi", "lilzey"],
      note: "Yeni nesil rap sound'una odaklı." },

    { id: "pmc", name: "PMC Music", power: 70, reach: 76, fee: 120000, royalty: 46, focus: "Rap / Trap", color: "#ff5c7a",
      distributor: "Ditto Music", cover: 0.45, roster: ["patron", "ati242", "heijan", "muti"],
      note: "Sokak sound'unda güçlü bir aile; kadro birbirine destek olur." },

    { id: "esen", name: "Esen Müzik", power: 78, reach: 82, fee: 160000, royalty: 43, focus: "Arabesk / Pop", color: "#ff9f43",
      distributor: "The Orchard", cover: 0.55, roster: ["aleynatilki", "melekmosso"],
      note: "Arabesk ve pop'ta güçlü dağıtım." },

    { id: "kaset", name: "Kaset Müzik", power: 70, reach: 74, fee: 120000, royalty: 46, focus: "Rap / R&B", color: "#5ce89b",
      distributor: "Amuse", cover: 0.5, roster: ["mavi", "lvbelc5", "hidra"],
      note: "Kadro gelişimine yatırım yapar." },

    { id: "muzikon", name: "MuzikOn", power: 66, reach: 72, fee: 95000, royalty: 48, focus: "Dijital-first", color: "#25f4ee",
      distributor: "TuneCore", cover: 0.35, roster: ["benfero", "saniser", "lierefuge"],
      note: "Playlist ve dijital büyüme uzmanı." },

    { id: "ruzgar", name: "Rüzgar Müzik", power: 64, reach: 68, fee: 85000, royalty: 49, focus: "Genel", color: "#8ab4ff",
      distributor: "CD Baby", cover: 0.35, roster: ["normender", "gazapizm", "khontkar"],
      note: "Orta ölçek, esnek sözleşmeler." },

    { id: "sonytr", name: "Sony Music Türkiye", power: 95, reach: 98, fee: 420000, royalty: 32, focus: "Global Major", color: "#ff4b4b",
      distributor: "Sony Music Distribution", cover: 0.85, roster: ["hadise", "murda"],
      note: "Küresel güç ve tam dağıtım ağı." },

    { id: "universaltr", name: "Universal Music Türkiye", power: 94, reach: 97, fee: 400000, royalty: 33, focus: "Global Major", color: "#ffcb5c",
      distributor: "Universal Music Distribution", cover: 0.85, roster: ["ceza", "sagopa"],
      note: "Global major, yüksek avans." },

    { id: "warnertr", name: "Warner Music Türkiye", power: 90, reach: 94, fee: 360000, royalty: 34, focus: "Global Major", color: "#6ec3ff",
      distributor: "Warner ADA", cover: 0.8, roster: ["joker", "contra"],
      note: "Güçlü uluslararası sinerji." },

    { id: "no1", name: "No.1 Müzik", power: 72, reach: 76, fee: 130000, royalty: 44, focus: "Rap / Pop", color: "#ff5c7a",
      distributor: "Believe", cover: 0.5, roster: ["uzi", "motive", "cakal"],
      note: "Hızlı hit üretimine odaklı." },

    { id: "wavy", name: "Wavy Music", power: 62, reach: 66, fee: 78000, royalty: 48, focus: "Trap / Hyperpop", color: "#25f4ee",
      distributor: "Ditto Music", cover: 0.3, roster: ["era7capone", "reckol"],
      note: "Genç kitleye hızlı ulaşım." },

    { id: "adim", name: "Adım Müzik", power: 60, reach: 62, fee: 70000, royalty: 50, focus: "Anadolu / Alternatif", color: "#5ce89b",
      distributor: "Amuse", cover: 0.3, roster: [],
      note: "Niş kitleye sahip, samimi ekip." },

    { id: "kanal", name: "Kanal Müzik", power: 68, reach: 70, fee: 100000, royalty: 47, focus: "TV / Medya bağlantılı", color: "#b06cff",
      distributor: "The Orchard", cover: 0.45, roster: [],
      note: "Medya ve TV bağlantıları güçlü." },

    { id: "pasaj", name: "Pasaj Müzik", power: 58, reach: 60, fee: 65000, royalty: 51, focus: "Alternatif / Indie", color: "#ffcb5c",
      distributor: "CD Baby", cover: 0.25, roster: [],
      note: "Sanatçı dostu, butik yaklaşım." }
  ];

  K.labelById = function (id) {
    return K.LABELS.find(l => l.id === id) || null;
  };

  /* bir sanatçının bağlı olduğu şirket */
  K.labelOfArtist = function (artistId) {
    if (!artistId) return null;
    return K.LABELS.find(l => (l.roster || []).indexOf(artistId) >= 0) || null;
  };

  /* aynı şirketteki diğer sanatçılar (diss/respect etkileri için) */
  K.labelmates = function (artistId) {
    const l = K.labelOfArtist(artistId);
    if (!l) return [];
    return (l.roster || []).filter(id => id !== artistId);
  };
})(window.K = window.K || {});
