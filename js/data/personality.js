/* ============================================================
   KARMA — data/personality.js
   NPC SANATÇI KİŞİLİK KATMANI (derin profil)

   ⚠️ BURASI OYUNCUNUN KİMLİĞİ DEĞİLDİR (B-6). Yan komşu `data/persona.js`
   oyuncunun sanatçı kimliğidir. İki dosyanın adı yakın olduğu için global
   adları bilinçli olarak AYRI önek taşır:

     BU DOSYA          data/personality.js  (NPC)
                       K.NPC_PERSONALITY (veri) · K.npcPersonality (motor)
     KOMŞU DOSYA       data/persona.js      (oyuncu)
                       K.PLAYER_PERSONAS · K.playerPersonaById

   Neden? Eskiden global'ler yalnızca tek bir harfle ayrılıyordu
   (`K.PERSONALITY` ↔ `K.PERSONAS`). Yanlış olanı yazmak `undefined`
   döndürüp SESSİZCE yanlış davranışa yol açıyordu. Bu ayrım
   tools/smoke-tooling.js içindeki B-6 invariant'ı ile kilitlidir.

   Neden ayrı bir katman?
   ----------------------
   `chat.js` içindeki PROFILES yalnızca "ne söylüyor"u tanımlar
   (cümle havuzları). Ama bir sanatçının inandırıcı olması için
   "neye nasıl tepki veriyor" da bilinmesi gerekir:
     · neyi sever  → samimiyeti hızlı artar
     · neyi sevmez → ters tepki verir, soğur
     · nasıl konuşur → cümle ritmi, kelime seçimi, kaçındığı şeyler
     · nerede susar → konuşmayacağı konular (özel hayat, para, diss)

   Bu dosya o davranış modelini tutar. DM motoru (`chat.js`) her
   cevaptan sonra buradaki `bias` değerlerini samimiyet hesabına
   katar; böylece Şehinşah'a boş bir övgü ile gerçek bir söz
   eleştirisi AYNI puanı getirmez.

   Kapsam (v10.14): Şehinşah ve wegh Rumi — oyunun iki amiral
   sanatçısı. Profiller kamuya açık röportaj, biyografi ve
   diskografi bilgilerinden türetildi; kurgusal cümle uydurulmadı.
   ============================================================ */
(function (K) {
  "use strict";

  K.NPC_PERSONALITY = {

    /* ==========================================================
       ŞEHİNŞAH — "Mistik Kral"
       27 Aralık 1986, Erzincan/Kemah. Asıl adı Ufuk Yıkılmaz.
       Babası savcı olduğu için çocukluğu şehir şehir geçti.
       9 yaşında grafitiyle hip hop'a girdi, 1998'de söz yazmaya
       başladı. Mahlası "kralların kralı"; Hasan Sabbah'tan
       etkilendiği için HSNSBBH mahlasını da kullanır.
       2017'de Tolosa-Hunt sendromuyla mücadele etti.
       En belirgin özellik: geniş kelime haznesi, sözü kılıç gibi
       kullanan ölçülü bir ton ve mitolojiden beslenen kapalı
       anlatım.
       ========================================================== */
    sehinsah: {
      id: "sehinsah",
      name: "Şehinşah",
      archetype: "Mistik Kral",
      code: "ŞAH-1",
      tagline: "Kendi mitolojisini kurmuş, sözü silah gibi bilen bir zanaatkâr.",
      essence:
        "Ölçülü, kapalı ve derin. Kolay övülmez, kolay kırılmaz. " +
        "Karşısındakinin sözünü tartar; samimiyeti kelime seçiminden anlar. " +
        "Kibirle değil, mesafeyle korur kendini.",

      /* Kamuya açık, doğrulanabilir çerçeve bilgiler */
      facts: [
        "1986 Erzincan/Kemah doğumlu, babası savcı olduğu için memleketsiz büyüdü",
        "Mahlası 'kralların kralı'; ikinci mahlası Hasan Sabbah → HSNSBBH",
        "2017'de Tolosa-Hunt sendromuyla mücadele ettiğini açıkladı",
        "Oğlu Atlas; babalığı işinden ayrı tutar",
        "2017 'Karma' ile trap sahnesinde yükseliş, 2016 'DEEV', 2020 '666', 2024 'İkarus'"
      ],

      loves: [
        "samimiyet", "söz zanaatı", "mitoloji ve felsefe",
        "emek", "sadakat", "bağımsız düşünce", "sabır"
      ],
      redLines: [
        "boş övgü", "taklit", "gürültülü kibir", "ona ders vermeye çalışmak",
        "özel hayatı zorlamak", "sataşma kültürü", "emeksiz talepler"
      ],

      speech: {
        tempo: "ağır, ölçülü, cümle sonunda kısa kapanış",
        markers: [
          "cümleyi genelleme ile açar, sonra kendine bağlar",
          "'bir şey' ile susmayı tercih eder, açık etmez",
          "fiili değil anlamı konuşturur",
          "soruyu cevaplarken sınırını söyler"
        ],
        avoids: ["argo", "'kanka/lan' gibi samimiyetsiz ağız", "bağırma", "gossip"]
      },

      /* Niyet bazlı samimiyet katsayısı (delta'ya eklenir) */
      bias: {
        compliment: 0.30, feature: 0.20, music: 0.40, career: 0.40,
        market: 0.35, news: 0.15, beef: 0.20, hard: 0.45, health: 0.30,
        support: 0.35, thanks: 0.25, question: 0.20, howareyou: 0.10,
        laugh: 0.10, critique: 0.25, diss: -0.45, insult: -0.55,
        flirt: -0.60, personal: -0.35, askmoney: -0.60, money: -0.20,
        hangout: -0.10, company: 0.05, family: -0.15, bye: 0.05,
        generic: 0.05, shortyes: 0.05, shortno: -0.05
      },

      /* İmza cümleler — nadiren, tek başına eklenir */
      openings: [
        "Bir düşününce…",
        "Şunu net söyleyeyim:",
        "Yıllar geçince anladım,",
        "Bunu kayıtta da söylerim:"
      ],
      quote: "Kelime sayısı değil, kelimenin ağırlığı önemli.",

      /* Kişilik testi kartı (oyun içi görünüm) */
      test: {
        title: "Mistik Stratejist",
        rows: [
          ["Söz zanaatı", 10], ["Mesafe", 9], ["Sabır", 9],
          ["Sadakat", 8], ["Ego", 7], ["Açıklık", 4]
        ],
        note: "Seni tanımadan açılmaz; tanıyınca bırakmaz."
      }
    },

    /* ==========================================================
       WEGH RUMI — "Provokatif Mükemmeliyetçi"
       2000 Rize doğumlu. Asıl adı Arif Efe Çilli.
       2020'de profesyonel başladı, 2023 'GALACTUS' EP'siyle
       kendi sound'unu kurdu. Modern trap ile geleneksel Türk
       melodilerini birleştirir. Sözlerinde özgüven, sokak
       kültürü, provokatif anlatım ve toplumsal gönderme var.
       Prodüksiyonda Bodega Grande ile çalışır. Özel hayatını
       kapalı tutar, sahne ile dinleyici arasındaki mesafeyi
       bilinçli olarak kısaltır.
       ========================================================== */
      weghrumi: {
      id: "weghrumi",
      name: "wegh Rumi",
      archetype: "Provokatif Mükemmeliyetçi",
      code: "WGH-2",
      tagline: "Modern trap ile Anadolu melodisini aynı beat'te eriten genç kuşak.",
      essence:
        "Hızlı karar verir, hızlı söyler; ama işin teknik tarafında takıntılıdır. " +
        "Sahnedeki samimiyeti ile özel hayatındaki ketumluğu bilinçli bir çizgidir. " +
        "Kendisine 'sen kimsin' diyen tonu hemen sezer ve karşılık verir.",

      facts: [
        "2000 Rize doğumlu; Karadeniz'in ritimlerini trap'e taşıdı",
        "2020'de profesyonel olarak müzik üretmeye başladı",
        "Prodüksiyonda Bodega Grande ile çalışıyor",
        "2023 'GALACTUS' EP'si ile kendi sound'unu kurdu",
        "Sözlerinde toplumsal ve politik gönderme var; özel hayatını kapalı tutar"
      ],

      loves: [
        "teknik detay", "kendi sound'unu kurmak", "bağımsızlık",
        "sahne enerjisi", "sosyal medya etkileşimi", "hız", "ürün"
      ],
      redLines: [
        "taklit", "'tarzını bırak' tavsiyesi", "kendini ispat etmeye çalışan ton",
        "şıklık dersi", "sabırsız talep", "boş iltifat"
      ],

      speech: {
        tempo: "hızlı, kısa cümle, tekrar eden vurgu",
        markers: [
          "kısa ve net konuşur, uzatmayı sevmez",
          "'kayıt', 'mix', 'beat' gibi üretim kelimelerini sık kullanır",
          "soruyu cevaplamadan önce soruyu tekrar eder",
          "toplumsal konuda provokatif ama kişisel konuda kapalı"
        ],
        avoids: ["temkinli bürokratik dil", "kendini küçümseme", "sitemkârlık"]
      },

      bias: {
        compliment: 0.20, feature: 0.45, music: 0.50, career: 0.25,
        market: 0.45, news: 0.30, beef: 0.35, hard: 0.25, health: 0.15,
        support: 0.50, thanks: 0.30, question: 0.25, howareyou: 0.15,
        laugh: 0.25, critique: 0.05, diss: 0.15, insult: -0.40,
        flirt: -0.50, personal: -0.45, askmoney: -0.55, money: -0.05,
        hangout: 0.20, company: 0.15, family: -0.30, bye: 0.05,
        generic: 0.05, shortyes: 0.05, shortno: -0.05
      },

      openings: [
        "Bak şimdi:",
        "Kısa keseyim,",
        "Kayıtta şöyle oluyor:",
        "Net söylüyorum,"
      ],
      quote: "Sound'u kendin kurmazsan, başkasının sesi oluyorsun.",

      test: {
        title: "Provokatif Mükemmeliyetçi",
        rows: [
          ["Üretim takıntısı", 10], ["Hız", 9], ["Bağımsızlık", 9],
          ["Sahne enerjisi", 8], ["Özel hayat gizliliği", 8], ["Sabır", 5]
        ],
        note: "İşe yatırım yapınca açar; lafla değil ürünle ikna olur."
      }
    }
  };

  /* ============================================================
     MOTOR YARDIMCILARI
     ============================================================ */

  K.npcPersonality = {

    byId(id) { return K.NPC_PERSONALITY[id] || null; },

    has(id) { return !!K.NPC_PERSONALITY[id]; },

    /* liste (UI için) */
    list() { return Object.keys(K.NPC_PERSONALITY).map(id => K.NPC_PERSONALITY[id]); },

    /* samimiyet düzeltmesi: niyet + profil */
    bias(artistId, intent) {
      const p = K.NPC_PERSONALITY[artistId];
      if (!p || !p.bias) return 0;
      const b = p.bias[intent];
      return b == null ? 0 : b;
    },

    /* nadir imza açılışı (her zaman değil, %12) */
    opening(artistId) {
      const p = K.NPC_PERSONALITY[artistId];
      if (!p || !p.openings || !p.openings.length) return "";
      if (!K.util || !K.util.chance(0.12)) return "";
      return K.util.pick(p.openings) + " ";
    },

    /* oyun içi "kişilik testi" kartı */
    card(artistId) {
      const p = K.NPC_PERSONALITY[artistId];
      if (!p) return null;
      return {
        code: p.code, title: p.test.title, archetype: p.archetype,
        tagline: p.tagline, note: p.test.note,
        rows: p.test.rows.map(r => ({ label: r[0], value: r[1] })),
        loves: p.loves.slice(0, 4),
        redLines: p.redLines.slice(0, 3)
      };
    },

    /* sesli özet (DM'de "kim bu adam" hissi) */
    summaryLine(artistId) {
      const p = K.NPC_PERSONALITY[artistId];
      if (!p) return "";
      return p.archetype + " · " + p.tagline;
    },

    /* hard/insult gibi niyetlerde profilin kırmızı çizgisine girip girmediği */
    isRedLine(artistId, intent) {
      const p = K.NPC_PERSONALITY[artistId];
      if (!p) return false;
      return ["insult", "personal", "askmoney", "flirt"].indexOf(intent) >= 0;
    }
  };
})(window.K = window.K || {});
