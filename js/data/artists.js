/* ============================================================
   KARMA — data/artists.js
   Gerçekçi Türk rap/pop/trap/R&B sanatçı veritabanı.

   NOT: Buradaki aylık dinleyici / toplam dinlenme / takipçi
   değerleri SİMÜLASYON için yaklaşık ve temsilî değerlerdir,
   gerçek zamanlı istatistik değildir.

   NOT: "Şehinşah" ve "wegh Rumi" AYRI sanatçılardır; her biri
   kendi kaydına sahiptir.

   traits (1-10):
     openness  : samimiyetin ne kadar hızlı arttığı
     loyalty   : mevcut şirketine bağlılık (transfer zorluğu)
     ego       : popülerlik/şirket gücüne ne kadar önem verdiği
     work      : ortak projeye açıklık / çalışma disiplini
   ============================================================ */
(function (K) {
  "use strict";

  K.ARTISTS = [
    {
      id: "sehinsah", stageName: "Şehinşah", aliases: ["HSNSBBH"],
      realName: "Ufuk Yıkılmaz", age: 39, city: "İstanbul", genre: "trap",
      labelId: "hypers", popularity: 88, monthly: 4200000, streams: 980000000,
      ytSubs: 1900000, ig: 2100000, x: 1400000, tiktok: 900000,
      chartPeak: 1,
      traits: { openness: 5, loyalty: 8, ego: 8, work: 9 },
      affinityStart: 8,
      bio: "Türk rap'inin en büyük isimlerinden. Erzincan doğumlu, kült bir figür; derin söylemleri ve deneysel trap sound'u ile tanınır."
    },
    {
      id: "weghrumi", stageName: "wegh Rumi", aliases: ["Wegh"],
      realName: "Arif Efe Çilli", age: 25, city: "Rize", genre: "trap",
      labelId: null, popularity: 72, monthly: 1650000, streams: 285000000,
      ytSubs: 430000, ig: 640000, x: 190000, tiktok: 820000,
      chartPeak: 6,
      traits: { openness: 9, loyalty: 5, ego: 5, work: 8 },
      affinityStart: 15,
      bio: "Rize doğumlu, modern trap sound'u ve deneysel vokal tarzıyla tanınan genç kuşak rapçi. Bağımsız üretmeyi seviyor."
    },
    {
      id: "ceza", stageName: "Ceza", aliases: [],
      realName: "Bilgin Özçalkan", age: 48, city: "İstanbul", genre: "rap",
      labelId: null, popularity: 90, monthly: 3600000, streams: 1250000000,
      ytSubs: 1500000, ig: 1700000, x: 2600000, tiktok: 600000,
      chartPeak: 1,
      traits: { openness: 7, loyalty: 6, ego: 7, work: 10 },
      affinityStart: 10,
      bio: "Türk rap'inin efsanevi öncüsü. Bağımsız yapısı ve sözlü geleneğiyle endüstrinin saygı duyduğu bir isim."
    },
    {
      id: "sagopa", stageName: "Sagopa Kajmer", aliases: [],
      realName: "Yunus Özyavuz", age: 47, city: "İstanbul", genre: "rap",
      labelId: null, popularity: 84, monthly: 2900000, streams: 890000000,
      ytSubs: 1300000, ig: 1100000, x: 900000, tiktok: 400000,
      chartPeak: 2,
      traits: { openness: 4, loyalty: 7, ego: 6, work: 9 },
      affinityStart: 6,
      bio: "Karanlık prodüksiyonu ve felsefi sözleriyle tanınan, kadim bir rap ekolü."
    },
    {
      id: "ezhel", stageName: "Ezhel", aliases: [],
      realName: "Sercan İpekçioğlu", age: 34, city: "Ankara", genre: "trap",
      labelId: "universaltr", popularity: 92, monthly: 5200000, streams: 1600000000,
      ytSubs: 2100000, ig: 2600000, x: 1200000, tiktok: 1400000,
      chartPeak: 1,
      traits: { openness: 8, loyalty: 6, ego: 7, work: 9 },
      affinityStart: 12,
      bio: "Ankara sound'unu global trap ile birleştiren, Türkiye'nin en büyük ihraç sanatçılarından."
    },
    {
      id: "benfero", stageName: "Ben Fero", aliases: [],
      realName: "Ferhat Yılmaz", age: 33, city: "Ankara", genre: "trap",
      labelId: "no1", popularity: 80, monthly: 2400000, streams: 720000000,
      ytSubs: 950000, ig: 1800000, x: 700000, tiktok: 1100000,
      chartPeak: 1,
      traits: { openness: 8, loyalty: 5, ego: 6, work: 7 },
      affinityStart: 14,
      bio: "Akılda kalıcı hit'leriyle trap dalgasını başlatan isimlerden."
    },
    {
      id: "motive", stageName: "Motive", aliases: [],
      realName: "Tolga Can Serbest", age: 29, city: "İstanbul", genre: "trap",
      labelId: "no1", popularity: 82, monthly: 3100000, streams: 640000000,
      ytSubs: 1100000, ig: 1400000, x: 500000, tiktok: 1300000,
      chartPeak: 2,
      traits: { openness: 7, loyalty: 6, ego: 6, work: 8 },
      affinityStart: 12,
      bio: "Melodik trap'in Türkiye'deki en güçlü temsilcilerinden."
    },
    {
      id: "uzi", stageName: "UZI", aliases: [],
      realName: "Uğur Kılınç", age: 27, city: "İstanbul", genre: "trap",
      labelId: "wavy", popularity: 79, monthly: 2700000, streams: 560000000,
      ytSubs: 800000, ig: 1300000, x: 400000, tiktok: 1500000,
      chartPeak: 3,
      traits: { openness: 9, loyalty: 4, ego: 5, work: 7 },
      affinityStart: 15,
      bio: "Genç kitlenin fenomeni; enerjik trap ve güçlü sosyal medya etkileşimi."
    },
    {
      id: "mavi", stageName: "Mavi", aliases: [],
      realName: "Mert Sarı", age: 26, city: "İzmir", genre: "rap",
      labelId: null, popularity: 76, monthly: 1900000, streams: 430000000,
      ytSubs: 620000, ig: 900000, x: 350000, tiktok: 700000,
      chartPeak: 4,
      traits: { openness: 8, loyalty: 7, ego: 4, work: 9 },
      affinityStart: 16,
      bio: "Sözlü anlatımı güçlü, bağımsız yapıyı seven modern rap temsilcisi."
    },
    {
      id: "lvbelc5", stageName: "Lvbel C5", aliases: [],
      realName: "Çağan Şengül", age: 25, city: "Ankara", genre: "drill",
      labelId: "wavy", popularity: 77, monthly: 2200000, streams: 480000000,
      ytSubs: 700000, ig: 1000000, x: 250000, tiktok: 1800000,
      chartPeak: 3,
      traits: { openness: 9, loyalty: 5, ego: 5, work: 6 },
      affinityStart: 15,
      bio: "Drill ve hızlı flow'uyla TikTok jenerasyonunun sesi."
    },
    {
      id: "saniser", stageName: "Şanışer", aliases: [],
      realName: "Sarp Palaur", age: 40, city: "İstanbul", genre: "rap",
      labelId: null, popularity: 72, monthly: 1500000, streams: 340000000,
      ytSubs: 700000, ig: 500000, x: 900000, tiktok: 300000,
      chartPeak: 5,
      traits: { openness: 6, loyalty: 6, ego: 5, work: 9 },
      affinityStart: 10,
      bio: "Toplumsal sözleri ve ironik anlatımıyla tanınan entelektüel rap figürü."
    },
    {
      id: "normender", stageName: "Norm Ender", aliases: [],
      realName: "Ender Taşkın", age: 38, city: "İstanbul", genre: "rap",
      labelId: "dokuzsekiz", popularity: 70, monthly: 1400000, streams: 310000000,
      ytSubs: 600000, ig: 400000, x: 600000, tiktok: 250000,
      chartPeak: 5,
      traits: { openness: 5, loyalty: 6, ego: 7, work: 8 },
      affinityStart: 8,
      bio: "Keskin söylemleri ve teknik rap yetkinliğiyle bilinen bir veteran."
    },
    {
      id: "gazapizm", stageName: "Gazapizm", aliases: [],
      realName: "Anıl Kaplan", age: 36, city: "İstanbul", genre: "rap",
      labelId: "hypers", popularity: 75, monthly: 1800000, streams: 400000000,
      ytSubs: 800000, ig: 700000, x: 300000, tiktok: 350000,
      chartPeak: 4,
      traits: { openness: 6, loyalty: 7, ego: 6, work: 8 },
      affinityStart: 10,
      bio: "Sokak hikâyelerini melankolik beat'lerle anlatan güçlü bir söz yazarı."
    },
    {
      id: "khontkar", stageName: "Khontkar", aliases: [],
      realName: "Mert Yüksel", age: 33, city: "İstanbul", genre: "trap",
      labelId: null, popularity: 68, monthly: 1200000, streams: 260000000,
      ytSubs: 500000, ig: 600000, x: 300000, tiktok: 400000,
      chartPeak: 6,
      traits: { openness: 9, loyalty: 4, ego: 5, work: 7 },
      affinityStart: 14,
      bio: "Agresif trap sound'u ve bağımsız duruşuyla tanınan prodüktör-rapçi."
    },
    {
      id: "blok3", stageName: "Blok3", aliases: [],
      realName: "Berat Cemal", age: 24, city: "İstanbul", genre: "drill",
      labelId: "wavy", popularity: 78, monthly: 2300000, streams: 500000000,
      ytSubs: 750000, ig: 1200000, x: 200000, tiktok: 2400000,
      chartPeak: 2,
      traits: { openness: 8, loyalty: 5, ego: 6, work: 7 },
      affinityStart: 13,
      bio: "Drill dalgasının Türkiye'deki öncüsü; viral kitle hakimiyeti."
    },
    {
      id: "reckol", stageName: "Reckol", aliases: [],
      realName: "Recep Kaan", age: 26, city: "İstanbul", genre: "trap",
      labelId: "wavy", popularity: 71, monthly: 1350000, streams: 290000000,
      ytSubs: 420000, ig: 850000, x: 150000, tiktok: 900000,
      chartPeak: 6,
      traits: { openness: 9, loyalty: 4, ego: 5, work: 6 },
      affinityStart: 15,
      bio: "Lvbel C5 ile yakın çalışan, enerjik sosyal medya varlığı olan genç rapçi."
    },
    {
      id: "cakal", stageName: "Cakal", aliases: [],
      realName: "Emir Cakal", age: 27, city: "İstanbul", genre: "trap",
      labelId: "no1", popularity: 76, monthly: 2000000, streams: 450000000,
      ytSubs: 680000, ig: 1100000, x: 220000, tiktok: 1500000,
      chartPeak: 3,
      traits: { openness: 8, loyalty: 5, ego: 6, work: 8 },
      affinityStart: 13,
      bio: "Melodik ve karanlık trap sound'uyla kitlesini hızla büyüten bir isim."
    },
    {
      id: "lilzey", stageName: "Lil Zey", aliases: [],
      realName: "Zeynep Sarıkartal", age: 25, city: "İstanbul", genre: "rnb",
      labelId: "hypers", popularity: 69, monthly: 1100000, streams: 210000000,
      ytSubs: 320000, ig: 700000, x: 180000, tiktok: 800000,
      chartPeak: 7,
      traits: { openness: 8, loyalty: 6, ego: 5, work: 8 },
      affinityStart: 14,
      bio: "R&B ve rap'i harmanlayan, kadın seslerin yükselen temsilcisi."
    },
    {
      id: "heijan", stageName: "Heijan", aliases: [],
      realName: "Emre Heijan", age: 30, city: "İstanbul", genre: "trap",
      labelId: "hypers", popularity: 67, monthly: 1050000, streams: 200000000,
      ytSubs: 380000, ig: 520000, x: 160000, tiktok: 480000,
      chartPeak: 8,
      traits: { openness: 8, loyalty: 6, ego: 5, work: 7 },
      affinityStart: 13,
      bio: "Karanlık atmosferli beat'ler ve akılda kalıcı nakaratlar."
    },
    {
      id: "muti", stageName: "Muti", aliases: [],
      realName: "Muti Karaca", age: 31, city: "İstanbul", genre: "trap",
      labelId: null, popularity: 66, monthly: 980000, streams: 185000000,
      ytSubs: 340000, ig: 460000, x: 140000, tiktok: 520000,
      chartPeak: 8,
      traits: { openness: 9, loyalty: 5, ego: 4, work: 7 },
      affinityStart: 15,
      bio: "Underground'dan yükselen, ham ve samimi sound'uyla tanınan rapçi."
    },
    {
      id: "era7capone", stageName: "Era7capone", aliases: [],
      realName: "Yağız Era", age: 24, city: "İstanbul", genre: "drill",
      labelId: null, popularity: 64, monthly: 900000, streams: 170000000,
      ytSubs: 300000, ig: 600000, x: 130000, tiktok: 700000,
      chartPeak: 9,
      traits: { openness: 9, loyalty: 5, ego: 5, work: 7 },
      affinityStart: 15,
      bio: "Yeni nesil drill ve hızlı yükselişiyle dikkat çeken bağımsız isim."
    },
    {
      id: "ati242", stageName: "Ati242", aliases: [],
      realName: "Atilla Demir", age: 23, city: "İstanbul", genre: "trap",
      labelId: null, popularity: 62, monthly: 820000, streams: 150000000,
      ytSubs: 280000, ig: 500000, x: 110000, tiktok: 900000,
      chartPeak: 10,
      traits: { openness: 9, loyalty: 4, ego: 5, work: 6 },
      affinityStart: 16,
      bio: "Genç ve dinamik trap sahnesinin yükselen yıldızı."
    },
    {
      id: "murda", stageName: "Murda", aliases: [],
      realName: "Önder Doğan", age: 33, city: "Amsterdam", genre: "trap",
      labelId: "universaltr", popularity: 83, monthly: 3300000, streams: 780000000,
      ytSubs: 1200000, ig: 1500000, x: 600000, tiktok: 1000000,
      chartPeak: 1,
      traits: { openness: 8, loyalty: 5, ego: 7, work: 8 },
      affinityStart: 12,
      bio: "Hollanda-Türkiye hattında global trap'in en güçlü köprülerinden."
    },
    {
      id: "patron", stageName: "Patron", aliases: [],
      realName: "Ozan Çelik", age: 37, city: "İstanbul", genre: "rap",
      labelId: "hypers", popularity: 69, monthly: 1200000, streams: 245000000,
      ytSubs: 520000, ig: 600000, x: 280000, tiktok: 300000,
      chartPeak: 6,
      traits: { openness: 7, loyalty: 7, ego: 6, work: 8 },
      affinityStart: 12,
      bio: "Sert duruşu ve bağımsız kimliğiyle tanınan üretken rapçi."
    },
    {
      id: "defkhan", stageName: "Defkhan", aliases: [],
      realName: "Ferhat Kaya", age: 39, city: "İstanbul", genre: "rap",
      labelId: null, popularity: 65, monthly: 850000, streams: 160000000,
      ytSubs: 340000, ig: 380000, x: 220000, tiktok: 180000,
      chartPeak: 9,
      traits: { openness: 7, loyalty: 6, ego: 6, work: 8 },
      affinityStart: 12,
      bio: "Battle rap geleneğinden gelen, teknik flow ustası."
    },
    {
      id: "contra", stageName: "Contra", aliases: [],
      realName: "Cihan Şenel", age: 28, city: "İstanbul", genre: "rap",
      labelId: null, popularity: 63, monthly: 780000, streams: 145000000,
      ytSubs: 300000, ig: 350000, x: 200000, tiktok: 210000,
      chartPeak: 10,
      traits: { openness: 8, loyalty: 5, ego: 5, work: 8 },
      affinityStart: 14,
      bio: "Keskin sözleri ve hızlı flow'uyla kendi kitlesini kuran rapçi."
    },
    {
      id: "hidra", stageName: "Hidra", aliases: [],
      realName: "Muhammet Ali", age: 29, city: "İstanbul", genre: "rap",
      labelId: null, popularity: 61, monthly: 700000, streams: 130000000,
      ytSubs: 260000, ig: 300000, x: 150000, tiktok: 250000,
      chartPeak: 11,
      traits: { openness: 8, loyalty: 6, ego: 5, work: 8 },
      affinityStart: 14,
      bio: "Kadim rap anlayışını sürdüren, sadık dinleyici kitlesi olan isim."
    },
    {
      id: "joker", stageName: "Joker", aliases: [],
      realName: "Umut Uğur", age: 36, city: "İstanbul", genre: "rap",
      labelId: null, popularity: 62, monthly: 740000, streams: 138000000,
      ytSubs: 400000, ig: 300000, x: 240000, tiktok: 160000,
      chartPeak: 10,
      traits: { openness: 6, loyalty: 6, ego: 7, work: 8 },
      affinityStart: 11,
      bio: "Söz oyunları ve agresif flow'uyla bilinen deneyimli rapçi."
    },
    {
      id: "sila", stageName: "Sıla", aliases: [],
      realName: "Sıla Gençoğlu", age: 44, city: "İstanbul", genre: "pop",
      labelId: "dokuzsekiz", popularity: 86, monthly: 2500000, streams: 700000000,
      ytSubs: 900000, ig: 1900000, x: 700000, tiktok: 600000,
      chartPeak: 1,
      traits: { openness: 6, loyalty: 7, ego: 6, work: 10 },
      affinityStart: 8,
      bio: "Pop ve arabesk arasında köprü kuran, söz yazarlığı güçlü bir sanatçı."
    },
    {
      id: "edis", stageName: "Edis", aliases: [],
      realName: "Edis Görgülü", age: 35, city: "İstanbul", genre: "pop",
      labelId: "dokuzsekiz", popularity: 88, monthly: 3200000, streams: 820000000,
      ytSubs: 1300000, ig: 2500000, x: 800000, tiktok: 1100000,
      chartPeak: 1,
      traits: { openness: 7, loyalty: 6, ego: 6, work: 9 },
      affinityStart: 10,
      bio: "Geniş kitleye hitap eden, sahne performansı güçlü pop yıldızı."
    },
    {
      id: "hadise", stageName: "Hadise", aliases: [],
      realName: "Hadise Açıkgöz", age: 39, city: "İstanbul", genre: "pop",
      labelId: "sonytr", popularity: 84, monthly: 2100000, streams: 600000000,
      ytSubs: 700000, ig: 2200000, x: 900000, tiktok: 800000,
      chartPeak: 1,
      traits: { openness: 7, loyalty: 6, ego: 7, work: 9 },
      affinityStart: 10,
      bio: "Medya ve müziği birleştiren, TV etkisi çok yüksek bir pop figürü."
    },
    {
      id: "aleynatilki", stageName: "Aleyna Tilki", aliases: [],
      realName: "Aleyna Tilki", age: 25, city: "İstanbul", genre: "pop",
      labelId: null, popularity: 81, monthly: 2400000, streams: 560000000,
      ytSubs: 1100000, ig: 3500000, x: 600000, tiktok: 1600000,
      chartPeak: 1,
      traits: { openness: 8, loyalty: 4, ego: 7, work: 7 },
      affinityStart: 12,
      bio: "Viral pop ve güçlü sosyal medya etkisiyle genç kitlenin ikonu."
    },
    {
      id: "simge", stageName: "Simge", aliases: [],
      realName: "Simge Sağın", age: 42, city: "İstanbul", genre: "pop",
      labelId: "dokuzsekiz", popularity: 74, monthly: 1300000, streams: 320000000,
      ytSubs: 450000, ig: 800000, x: 350000, tiktok: 400000,
      chartPeak: 3,
      traits: { openness: 7, loyalty: 6, ego: 5, work: 9 },
      affinityStart: 11,
      bio: "Akılda kalıcı melodiler ve güçlü vokaliyle sevilen pop sanatçısı."
    },
    {
      id: "melekmosso", stageName: "Melek Mosso", aliases: [],
      realName: "Melek Mosso", age: 35, city: "İzmir", genre: "indie",
      labelId: "pasaj", popularity: 64, monthly: 820000, streams: 165000000,
      ytSubs: 300000, ig: 500000, x: 200000, tiktok: 300000,
      chartPeak: 8,
      traits: { openness: 8, loyalty: 7, ego: 4, work: 8 },
      affinityStart: 15,
      bio: "Samimi vokali ve folk-pop etkileşimiyle kendi kitlesini kuran sanatçı."
    },
    {
      id: "lierefuge", stageName: "Lie Refuge", aliases: ["Majesteleri", "Refuge"],
      realName: "Berat Arda Yıkılmaz", age: 20, city: "İzmir", genre: "trap",
      labelId: null, popularity: 54, monthly: 246000, streams: 31500000,
      ytSubs: 41000, ig: 68000, x: 5200, tiktok: 112000,
      chartPeak: 38, albums: ["D'ÜNYAM"],
      traits: { openness: 9, loyalty: 5, ego: 4, work: 8 },
      affinityStart: 16,
      bio: "İzmir doğumlu genç rapçi. 'Karma' mahlasıyla da bilinir. Karanlık ve deneysel sound'uyla kendi kitlesini kurdu; D'ÜNYAM albümüyle dikkat çekti."
    },
    {
      id: "deryaulug", stageName: "Derya Uluğ", aliases: [],
      realName: "Derya Uluğ", age: 37, city: "İstanbul", genre: "pop",
      labelId: "esen", popularity: 68, monthly: 950000, streams: 210000000,
      ytSubs: 320000, ig: 700000, x: 250000, tiktok: 350000,
      chartPeak: 6,
      traits: { openness: 8, loyalty: 7, ego: 5, work: 8 },
      affinityStart: 13,
      bio: "Arabesk-pop çizgisinde geniş kitleye ulaşan güçlü bir ses."
    },
    {
      id: "liashine", stageName: "Lia Shine", aliases: ["Lia"],
      realName: "—", age: 28, city: "Sivas", genre: "trap",
      labelId: "hypers", popularity: 41, monthly: 280000, streams: 52000000,
      ytSubs: 95000, ig: 180000, x: 42000, tiktok: 240000,
      chartPeak: 34,
      traits: { openness: 9, loyalty: 8, ego: 3, work: 9 },
      affinityStart: 6,
      bio: "Sivas doğumlu genç rapçi. Şehinşah'ın keşfettiği, emotional / sad trap çizgisinde kırılgan ama kararlı bir ses. Müzik dışında hayatı yok; sahnede söylemek en büyük hayali."
    }
  ];

  /* ---------- helpers ---------- */
  // wegh Rumi alias kaydını çıkar (aynı kişi), benzersiz listeyi döndür
  K.artistList = function () {
    return K.ARTISTS.filter(a => !a.mergedInto);
  };

  K.artistById = function (id) {
    if (!id) return null;
    let a = K.ARTISTS.find(x => x.id === id);
    if (a && a.mergedInto) a = K.ARTISTS.find(x => x.id === a.mergedInto);
    if (a) return a;
    // mahalle/semt çevresi (contacts) de sanatçı-benzeri kayıttır
    if (K.contacts && K.contacts.byId) return K.contacts.byId(id);
    return null;
  };

  /* "wegh Rumi" veya alias ile arama -> asıl kayda yönlendir */
  K.resolveArtistByName = function (name) {
    if (!name) return null;
    const q = name.toLowerCase().trim();
    if (K.contacts && K.contacts.byName) {
      const c = K.contacts.byName(name);
      if (c) return c;
    }
    const list = K.artistList();
    return list.find(a =>
      a.stageName.toLowerCase() === q ||
      (a.aliases || []).some(al => al.toLowerCase() === q) ||
      (a.realName || "").toLowerCase() === q
    ) || list.find(a =>
      a.stageName.toLowerCase().includes(q) ||
      (a.aliases || []).some(al => al.toLowerCase().includes(q)) ||
      (a.realName || "").toLowerCase().includes(q)
    ) || null;
  };
})(window.K = window.K || {});
