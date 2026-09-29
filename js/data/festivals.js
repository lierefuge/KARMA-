/* ============================================================
   KARMA — data/festivals.js
   YAZ FESTİVALLERİ (veri)
   ------------------------------------------------------------
   Neden ayrı dosya?
   Festivaller konser salonlarından farklı bir ekonomiye sahiptir:
   mekânını sen kiralamazsın, bir LINE-UP'a girmeye çalışırsın.
   Değeri belirleyen şey KAPASİTE değil SLOT'tur (gündüz sahnesi mi,
   headliner mı?). Bu yüzden festivaller turne/konser verisinden
   ayrı tutulur ve kendi eğrisiyle çözülür.

   tier      : local | city | national | flagship
   month/dom : gerçek takvim ayı ve günü (yaz sezonu Haziran-Eylül)
   capacity  : toplam alan kapasitesi (tek sahne değil, günün toplamı)
   mult      : şehir/çekim çarpanı (İstanbul > Trabzon)
   minPop    : en düşük slota başvurabilmek için gereken popülerlik
   baseFee   : prime-time slot referans ücreti (₺)
   prestige  : itibar/şöhret etkisi katsayısı
   travel    : ekip + ulaşım + teknik gider (₺)
   multiDay  : kaç gün sürdüğü (line-up günü 1'dir)
   ============================================================ */
(function (K) {
  "use strict";

  /* ---- SLOT MERDİVENİ ----
     Aynı festivalde gündüz sahnesi ile headliner arasındaki fark,
     oyuncunun kariyer basamağını hissettiren yerdir.
     - fee     : baseFee çarpanı (para)
     - draw    : kalabalık çarpanı (kitle)
     - prestige: itibar/şöhret çarpanı
     - exposure: keşfedilme çarpanı (yeni hayran başına etki)
     - backstage: camia ile temas (samimiyet)
  */
  K.FESTIVAL_SLOTS = [
    { id: "opening",   name: "Gündüz Sahnesi",     emoji: "☀️",  short: "Gündüz",
      fee: 0.30, draw: 0.55, prestige: 0.25, exposure: 1.05, backstage: 0.0,
      desc: "Öğlen güneşinde yarım dolu alan. Para yok, görünürlük var." },
    { id: "sunset",    name: "Gün Batımı Sahnesi",  emoji: "🌇",  short: "Sunset",
      fee: 0.55, draw: 0.78, prestige: 0.60, exposure: 1.00, backstage: 0.1,
      desc: "Kalabalık toplanmaya başlıyor; momentum kurulur." },
    { id: "prime",     name: "Prime-Time",          emoji: "🌆",  short: "Prime",
      fee: 1.00, draw: 1.00, prestige: 1.00, exposure: 0.95, backstage: 0.3,
      desc: "Festivalin ana akışı. Gerçek ücret burada başlar." },
    { id: "support",   name: "Ana Sahne Öncesi",    emoji: "🎧",  short: "Support",
      fee: 1.50, draw: 1.18, prestige: 1.50, exposure: 0.90, backstage: 0.6,
      desc: "Headliner öncesi doldurulmuş alan. En yüksek kitle devri." },
    { id: "headliner", name: "Headliner",           emoji: "👑",  short: "Headliner",
      fee: 2.60, draw: 1.42, prestige: 2.60, exposure: 1.00, backstage: 1.0,
      desc: "Gecenin kapanışı. Camianın seni zirveye yazdığı yer." }
  ];

  /* ---- TIER BAŞINA SLOT POPÜLERLİK EŞİKLERİ ----
     Sırayla: gündüz · sunset · prime · support · headliner.
     Popülerlik 0-99 arasıdır; flagship headliner'ı 95 ister. */
  K.FESTIVAL_TIER_POPS = {
    local:    [4, 9, 16, 28, 42],
    city:     [14, 24, 36, 52, 70],
    national: [26, 40, 55, 72, 88],
    flagship: [45, 62, 76, 88, 95]
  };

  K.FESTIVAL_TIER_LABEL = {
    local:    { label: "Yerel",     color: "#7fd1a4" },
    city:     { label: "Şehir",     color: "#6ec3ff" },
    national: { label: "Ulusal",    color: "#c79bff" },
    flagship: { label: "Amiral",    color: "#ffcd6e" }
  };

  K.FESTIVALS = [
    { id: "sahne-kenti",      name: "Sahne Kenti",            city: "İstanbul",  tier: "city",     month: 6, dom: 14, capacity: 14000, mult: 1.24, minPop: 14, baseFee: 190000, prestige: 1.7, travel: 45000,  multiDay: 2,
      desc: "İstanbul'un açılış festivali; line-up'ı her yıl gündemi belirler." },
    { id: "anadolu-ses",      name: "Anadolu Sesleri",        city: "Ankara",    tier: "national", month: 6, dom: 28, capacity: 26000, mult: 1.06, minPop: 26, baseFee: 430000, prestige: 2.3, travel: 85000,  multiDay: 3,
      desc: "Başkentin büyük sahnesi; rap line-up'ı en kalabalık gün olur." },
    { id: "ege-loud",         name: "Ege Loud",               city: "İzmir",     tier: "city",     month: 7, dom: 5,  capacity: 12000, mult: 1.10, minPop: 12, baseFee: 155000, prestige: 1.5, travel: 55000,  multiDay: 2,
      desc: "Sahil kasabası enerjisi; genç kitle ve yüksek devir." },
    { id: "fethiye-nights",   name: "Fethiye Nights",         city: "Antalya",   tier: "city",     month: 7, dom: 19, capacity: 9000,  mult: 1.02, minPop: 10, baseFee: 120000, prestige: 1.2, travel: 70000,  multiDay: 2,
      desc: "Yaz tatili kitlesi; keşfedilme için altın fırsat." },
    { id: "baskent-hiphop",   name: "Başkent Hiphop Günleri", city: "Ankara",    tier: "city",     month: 7, dom: 26, capacity: 11000, mult: 1.04, minPop: 13, baseFee: 140000, prestige: 1.4, travel: 50000,  multiDay: 2,
      desc: "Saf hip-hop festivali; camianın tamamı orada olur." },
    { id: "karadeniz-beat",   name: "Karadeniz Beat",         city: "Trabzon",   tier: "local",    month: 8, dom: 2,  capacity: 6000,  mult: 0.90, minPop: 6,  baseFee: 65000,  prestige: 0.9, travel: 60000,  multiDay: 1,
      desc: "Bölgesel sahne; yerel kitle çok sadık, alan küçük." },
    { id: "guney-ritim",      name: "Güney Ritim",            city: "Adana",     tier: "local",    month: 8, dom: 9,  capacity: 7000,  mult: 0.92, minPop: 7,  baseFee: 72000,  prestige: 0.95, travel: 65000, multiDay: 1,
      desc: "Adana'nın açık hava sahnesi; yaz sıcağında gece konseri." },
    { id: "buyuk-sahne",      name: "Büyük Sahne",            city: "İstanbul",  tier: "flagship", month: 8, dom: 23, capacity: 55000, mult: 1.30, minPop: 45, baseFee: 1250000, prestige: 3.4, travel: 180000, multiDay: 3,
      desc: "Türkiye'nin amiral gemisi. Headliner olmak kariyeri değiştirir." },
    { id: "sonbahar-ses",     name: "Sonbahar Ses",           city: "Bursa",     tier: "city",     month: 9, dom: 12, capacity: 10000, mult: 0.98, minPop: 11, baseFee: 125000, prestige: 1.3, travel: 48000,  multiDay: 1,
      desc: "Sezon kapanışı; kapalı alan, sıkı ve teknik bir seyirci." },
    { id: "eskisehir-sahne",  name: "Eskişehir Sahne",        city: "Eskişehir", tier: "local",    month: 9, dom: 20, capacity: 8000,  mult: 0.94, minPop: 8,  baseFee: 85000,  prestige: 1.05, travel: 52000, multiDay: 1,
      desc: "Öğrenci şehri; küçük alan, yüksek sosyal medya dönüşü." }
  ];
})(window.K = window.K || {});
