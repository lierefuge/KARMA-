/* ============================================================
   KARMA — data/news.js
   GÜNDEM / HABER sistemi.
   Kategoriler: gündem · siyasal · toplumsal · asayiş & suç ·
   ekonomi · magazin · garip & tuhaf · müzik
   Sözler güncel gündemle örtüşürse etkileşim (dinlenme + viral) artar.
   ============================================================ */
(function (K) {
  "use strict";


  /* ---------------- KATEGORİLER (basitten garibe) ---------------- */
  K.NEWS_CATEGORIES = [
    { id: "gundem",    name: "Gündem",        icon: "🔥", color: "#ff5c7a" },
    { id: "siyasal",   name: "Siyasal",       icon: "🏛️", color: "#6ec3ff" },
    { id: "toplumsal", name: "Toplumsal",     icon: "👥", color: "#5ce89b" },
    { id: "asayis",    name: "Asayiş & Suç",  icon: "🚨", color: "#ff5c7a" },
    { id: "ekonomi",   name: "Ekonomi",       icon: "💸", color: "#ffcb5c" },
    { id: "magazin",   name: "Magazin",       icon: "✨", color: "#b06cff" },
    { id: "garip",     name: "Garip & Tuhaf", icon: "👽", color: "#8b91a3" },
    { id: "muzik",     name: "Müzik",         icon: "🎵", color: "#1ed760" }
  ];
  K.newsCatById = function (id) {
    return K.NEWS_CATEGORIES.find(c => c.id === id) || K.NEWS_CATEGORIES[0];
  };

  /* ---------------- HABER HAVUZU ----------------
     keywords: sözlerde aranacak kök kelimeler (küçük harf).
     line: "Gündeme göre söz öner" için örnek satır.
     heat: gündem sıcaklığı (0-100) — etkileşim çarpanını belirler. */
  K.NEWS_POOL = [
    /* ---- GÜNDEM ---- */
    { cat: "gundem", title: "Zamlar ve hayat pahalılığı gündemin tepesinde", heat: 88, keywords: ["zam", "pahalılık", "geçim", "enflasyon"], line: "Kasada kalan üç kuruşla yaşıyoruz" },
    { cat: "gundem", title: "Yeni sosyal medya akımı tartışma yarattı", heat: 74, keywords: ["akım", "trend", "viral", "sosyal medya"], line: "Ekranda bir akım, sokakta gerçek var" },
    { cat: "gundem", title: "Şehirde ulaşım krizi büyüyor", heat: 63, keywords: ["ulaşım", "trafik", "metro", "otobüs"], line: "Trafikte eriyor ömrümüz şehirde" },
    { cat: "gundem", title: "Gençler arasında umutsuzluk artıyor", heat: 71, keywords: ["umutsuz", "gelecek", "gençlik", "yarın"], line: "Yarını yok gibi yaşıyor gençlik" },
    { cat: "gundem", title: "Şehirde su kesintisi krize yol açtı", heat: 52, keywords: ["su", "kesinti", "kriz"], line: "Susuz kaldı bu mahallenin boğazı" },
    { cat: "gundem", title: "Elektrik faturaları el yaktı", heat: 76, keywords: ["elektrik", "fatura", "borç"], line: "Karanlıkta oturduk faturayı düşündük" },
    { cat: "gundem", title: "Sokak hayvanları için yeni kampanya başladı", heat: 58, keywords: ["hayvan", "barınak", "mama"], line: "Bir kap mama, bir parça vicdan" },
    { cat: "gundem", title: "Şehirde yeni güvenlik kameraları tartışılıyor", heat: 50, keywords: ["kamera", "güvenlik", "takip"], line: "Her köşe bir kamera, hiç huzur yok" },
    { cat: "gundem", title: "Üniversiteliler barınma için ayakta", heat: 67, keywords: ["yurt", "öğrenci", "barınma"], line: "Yurt çıkmadı, oda arkadaşı arıyorum" },

    /* ---- GÜNDEM (ek) ---- */
    { cat: "gundem", title: "Toplu taşımada yeni zam kararı tartışma yarattı", heat: 73, keywords: ["zam", "otobüs", "ulaşım", "bilet"], line: "Otobüs bileti bir tabak yemek oldu" },
    { cat: "gundem", title: "Şebeke suyu kalitesi tartışmaya açıldı", heat: 47, keywords: ["su", "kalite", "sağlık"], line: "Musluktan akan suya güven kalmadı" },
    { cat: "gundem", title: "Sokakta güvenlik endişesi büyüyor", heat: 68, keywords: ["güvenlik", "sokak", "korku"], line: "Akşam oldu mu sokak bize yabancı" },

    /* ---- SİYASAL (ek) ---- */
    { cat: "siyasal", title: "Yerel yönetim bütçesi tartışmaları büyüdü", heat: 66, keywords: ["bütçe", "belediye", "harcama"], line: "Bütçe konuşulur, sokak unutulur" },
    { cat: "siyasal", title: "Gençlik politikaları eleştirildi", heat: 61, keywords: ["gençlik", "politika", "istihdam"], line: "Gençlik için söz verdiler, söz kaldı" },
    { cat: "siyasal", title: "Adalet tartışması yeniden gündemde", heat: 79, keywords: ["adalet", "mahkeme", "hak"], line: "Adalet gecikti mi zulüm olur" },
    { cat: "siyasal", title: "Medya özgürlüğü raporu tepki çekti", heat: 64, keywords: ["medya", "özgürlük", "rapor"], line: "Kalem tutsak, söz yarım kalır" },

    /* ---- TOPLUMSAL (ek) ---- */
    { cat: "toplumsal", title: "Aile içi şiddet ihbarları arttı", heat: 87, keywords: ["şiddet", "aile", "ihbar"], line: "Duvar kalın ama ses geçer" },
    { cat: "toplumsal", title: "Sağlıkta randevu krizi büyüyor", heat: 72, keywords: ["sağlık", "randevu", "hastane"], line: "Hastane kapısında sabah ettim" },
    { cat: "toplumsal", title: "Toplu işten çıkarmalar tartışma yarattı", heat: 69, keywords: ["işten çıkarma", "sözleşme", "fabrika"], line: "Kapıda son gün, içeride borç" },
    { cat: "toplumsal", title: "Çocuk istismarına karşı kampanya büyüdü", heat: 88, keywords: ["istismar", "çocuk", "adalet"], line: "Uzat elini, susma artık" },

    /* ---- ASAYİŞ (ek) ---- */
    { cat: "asayis", title: "Kuyumcu soygunu kamerada", heat: 81, keywords: ["soygun", "kuyumcu", "çalıntı", "kamera"], line: "Bir cam kırıldı, vicdan sustu" },
    { cat: "asayis", title: "Zincirleme kaza şehir merkezini kilitledi", heat: 66, keywords: ["kaza", "yaralı", "trafik"], line: "Sireni duyan donakaldı kaldırımda" },
    { cat: "asayis", title: "Kaçak göçmen kaçakçılığına operasyon", heat: 63, keywords: ["göçmen", "kaçakçılık", "operasyon"], line: "Denizde umut kağıttan kayık" },
    { cat: "asayis", title: "Torbacılara ağır ceza", heat: 74, keywords: ["torbacı", "zehir", "mahkeme", "ceza"], line: "Zehri mahallenin çocuğuna sattın" },
    { cat: "asayis", title: "Bankada içeriden dolandırıcılık iddiası", heat: 60, keywords: ["banka", "dolandırıcılık", "soygun"], line: "Sistemin içinden vurdular bizi" },

    /* ---- EKONOMİ (ek) ---- */
    { cat: "ekonomi", title: "Kredi faizleri tükendi diyorlar", heat: 71, keywords: ["kredi", "faiz", "borç"], line: "Kredi çektim, faiziyle boğuldum" },
    { cat: "ekonomi", title: "İşsizlik rakamları açıklandı", heat: 80, keywords: ["işsizlik", "rakam", "istihdam"], line: "Rakam aldattı, sokak doğruyu söyler" },
    { cat: "ekonomi", title: "Serbest piyasada büyük dalgalanma", heat: 75, keywords: ["döviz", "piyasa", "dalgalanma"], line: "Cebimdeki para sabaha değmedi" },
    { cat: "ekonomi", title: "Kira artışları tavan yaptı", heat: 88, keywords: ["kira", "artış", "tavan"], line: "Ev arıyorum, sokak arıyor beni" },

    /* ---- MAGAZİN (ek) ---- */
    { cat: "magazin", title: "Ünlü çiftin ayrılık dedikodusu büyüdü", heat: 70, keywords: ["ayrılık", "çift", "dedikodu"], line: "Manşet oldu, gerçek yoktu ortada" },
    { cat: "magazin", title: "Albüm tanıtımı gecesinde kavga çıktı", heat: 76, keywords: ["kavga", "gece", "kulis"], line: "Kulis kavgası, sahnede sükûnet" },
    { cat: "magazin", title: "Yeni ilişki kulis bilgisi sızdı", heat: 59, keywords: ["ilişki", "kulis", "sızıntı"], line: "Kamerayı sevdiğinden çok sevdim mi seni" },
    { cat: "magazin", title: "Şarkıcı sahnede gözyaşlarını tutamadı", heat: 68, keywords: ["sahne", "gözyaşı", "veda"], line: "Sahnede ağladım, mikrofon gördü" },

    /* ---- GARİP (ek) ---- */
    { cat: "garip", title: "Köyde üç başlı kuzu doğduğu iddiası", heat: 52, keywords: ["kuzu", "garip", "doğdu"], line: "Doğa bazen şaka yapıyor bize" },
    { cat: "garip", title: "Adam yirmi yıl sonra mektubu açtı", heat: 48, keywords: ["mektup", "yıllar", "geçmiş"], line: "Yıllar sonra açtım, gençliğim çıktı" },
    { cat: "garip", title: "Sosyal medyada tuhaf dans akımı yayıldı", heat: 71, keywords: ["dans", "akım", "viral"], line: "Herkes dans ediyor, kimse durmuyor" },
    { cat: "garip", title: "Evinde gizli geçit bulan kişi şaşkın", heat: 55, keywords: ["gizli", "geçit", "ev"], line: "Kendi evimde kayboldum bir gün" },

    /* ---- MÜZİK (ek) ---- */
    { cat: "muzik", title: "Yılın hit'i seçildi, tartışma büyük", heat: 75, keywords: ["hit", "yıl", "ödül"], line: "Yılın şarkısı mı, yılımın şarkısı mı" },
    { cat: "muzik", title: "Rapçiler sosyal sorumluluk projesinde buluştu", heat: 64, keywords: ["proje", "yardım", "rapçi"], line: "Sahnede birleşince ses gür çıkar" },
    { cat: "muzik", title: "Stüdyo ekipmanı fiyatları yükseldi", heat: 56, keywords: ["stüdyo", "ekipman", "fiyat"], line: "Ekipman pahalı, ilham bedava" },
    { cat: "muzik", title: "Yeraltı sahnesinden büyük çıkış", heat: 78, keywords: ["yeraltı", "underground", "çıkış"], line: "Yeraltından çıktım, ışık gözümü aldı" },

    /* ---- SİYASAL ---- */
    { cat: "siyasal", title: "Meclis'te yeni yasa tartışması sertleşti", heat: 80, keywords: ["yas", "meclis", "kanun", "siyaset"], line: "Kürsüde söz bitmez, sokakta sabır" },
    { cat: "siyasal", title: "Seçim gündemi yeniden ısındı", heat: 84, keywords: ["seçim", "oy", "miting", "sandık"], line: "Sandık başında bir umut arıyoruz" },
    { cat: "siyasal", title: "Muhalefetten sert açıklama: 'Hesap sorulacak'", heat: 77, keywords: ["muhalefet", "iktidar", "protesto", "açıklama"], line: "Hesap sorulur elbet bir gün" },
    { cat: "siyasal", title: "Yeni vergi düzenlemesi tepki çekti", heat: 82, keywords: ["vergi", "düzenleme", "tepki", "kesinti"], line: "Vergi üstüne vergi, cebim boş" },
    { cat: "siyasal", title: "Sansür tartışması sanat dünyasını böldü", heat: 69, keywords: ["sansür", "yasak", "özgürlük"], line: "Söylemek yasak, susmak zor" },

    /* ---- TOPLUMSAL ---- */
    { cat: "toplumsal", title: "Kadına şiddet vakaları gündemde", heat: 90, keywords: ["şiddet", "kadın", "adalet", "hak"], line: "Bir kadın susuyorsa vicdan sağır" },
    { cat: "toplumsal", title: "Eğitimde fırsat eşitsizliği tartışılıyor", heat: 66, keywords: ["eğitim", "okul", "öğrenci", "sınav"], line: "Bazı çocuklar daha geriden başlıyor" },
    { cat: "toplumsal", title: "Barınma krizi: kiralar uçtu", heat: 85, keywords: ["kira", "ev", "barınma", "yurt"], line: "Bir çatı bile lüks oldu bu şehirde" },
    { cat: "toplumsal", title: "İşsizlik gençleri vurdu", heat: 83, keywords: ["işsiz", "istihdam", "iş", "maaş"], line: "Diploma elimde, iş yok ortada" },
    { cat: "toplumsal", title: "Depremzedeler hâlâ çadırda", heat: 76, keywords: ["deprem", "çadır", "yardım", "konteyner"], line: "Enkaz kalktı ama izi kaldı" },

    /* ---- ASAYİŞ & SUÇ ---- */
    { cat: "asayis", title: "Market zincirinde hırsızlık kamerada", heat: 79, keywords: ["hırsız", "hırsızlık", "çalıntı", "gasp"], line: "Açlık çaldırır, sistem seyreder" },
    { cat: "asayis", title: "Sokak ortasında silahlı saldırı", heat: 88, keywords: ["silah", "saldırı", "kurşun", "cinayet"], line: "Bir kurşun, bir ömür, bir haber" },
    { cat: "asayis", title: "Uyuşturucu operasyonunda gözaltılar", heat: 72, keywords: ["uyuşturucu", "operasyon", "gözaltı", "zehir"], line: "Zehri satan çocukları kandırıyor" },
    { cat: "asayis", title: "Dolandırıcılık çetesi çökertildi", heat: 68, keywords: ["dolandırıcılık", "çete", "tuzak", "aldatma"], line: "Tuzak kurdular masum umutlara" },
    { cat: "asayis", title: "Kayıp gencin izi kayboldu", heat: 75, keywords: ["kayıp", "aranıyor", "gasp"], line: "Bir anne kapıda bekliyor hâlâ" },
    { cat: "asayis", title: "Kaçakçılık ağı çökertildi", heat: 61, keywords: ["kaçakçılık", "ağ", "yasadışı"], line: "Sınırda biter hayaller, kaçak yollarda" },

    /* ---- EKONOMİ ---- */
    { cat: "ekonomi", title: "Dolar rekor kırdı", heat: 86, keywords: ["dolar", "kur", "rekor", "borsa"], line: "Kur her gün biraz daha boğuyor" },
    { cat: "ekonomi", title: "Market fiyatlarına zam üstüne zam", heat: 84, keywords: ["zam", "fiyat", "market", "pahalı"], line: "Etiketler utandırıyor insanı" },
    { cat: "ekonomi", title: "Asgari ücret tartışması büyüyor", heat: 81, keywords: ["asgari ücret", "maaş", "ücret", "geçim"], line: "Ay sonunu zor getiren maaşlar" },
    { cat: "ekonomi", title: "Esnaf kepenk kapatıyor", heat: 70, keywords: ["esnaf", "kepenk", "borç", "iflas"], line: "Kepenk kapandı, borç açık kaldı" },
    { cat: "ekonomi", title: "Genç girişimciler destek arıyor", heat: 55, keywords: ["girişim", "destek", "yatırım"], line: "Bir fikir, bir umut, sıfır sermaye" },

    /* ---- MAGAZİN ---- */
    { cat: "magazin", title: "Ünlü şarkıcıdan sürpriz ayrılık", heat: 73, keywords: ["ayrılık", "ilişki", "aşk"], line: "Sahne ışıkları söndü, gerçek başladı" },
    { cat: "magazin", title: "Rapçiler arasında diss savaşı koptu", heat: 87, keywords: ["diss", "rapçi", "kamplaşma", "tartışma"], line: "Mikrofon silah, beat savaş alanı" },
    { cat: "magazin", title: "Sürpriz düğün kulisi: tarih netleşti", heat: 62, keywords: ["düğün", "nişan", "kulis"], line: "Kameralar önünde her şey sahne" },
    { cat: "magazin", title: "Sanatçı hayranlarına veda etti", heat: 58, keywords: ["veda", "emekli", "sahne"], line: "Veda eden bir ses daha sustu" },

    /* ---- GARİP & TUHAF ---- */
    { cat: "garip", title: "Gökyüzünde tanımlanamayan cisim paniği", heat: 64, keywords: ["ufo", "cisim", "gökyüzü"], line: "Gökte bir şey var mı diye baktık" },
    { cat: "garip", title: "Mahallede kuyudan tuhaf eşyalar çıktı", heat: 49, keywords: ["kuyu", "tuhaf", "esrar"], line: "Toprak bazen sakladığını verir" },
    { cat: "garip", title: "Kedisine miras bırakan adam şoke etti", heat: 53, keywords: ["miras", "kedi", "ilginç"], line: "Kimseye güvenmeyince kediye bıraktı" },
    { cat: "garip", title: "Üç gün boyunca gökten balık yağdı", heat: 77, keywords: ["balık", "yağmur", "garip"], line: "Gökten balık yağdı garip bu dünya" },
    { cat: "garip", title: "Kayıp 40 yıl sonra evine döndü", heat: 60, keywords: ["kayıp", "döndü", "yıllar"], line: "Kırk yıl sonra buldum kendimi" },

    /* ---- MÜZİK ---- */
    { cat: "muzik", title: "Yeni çıkan albüm listeleri salladı", heat: 78, keywords: ["albüm", "liste", "single", "hit"], line: "Listelerde bir ismim var artık" },
    { cat: "muzik", title: "Rap sahnesinde yeni dalga yükseliyor", heat: 82, keywords: ["rap", "rapçi", "underground", "sahne"], line: "Yeraltından çıktım, sesim yankı" },
    { cat: "muzik", title: "Konser biletleri saniyeler içinde tükendi", heat: 74, keywords: ["konser", "bilet", "sahne"], line: "Biletler bitti, sahnede yer yok" },
    { cat: "muzik", title: "Festival kadrosu açıklandı", heat: 57, keywords: ["festival", "kadro", "etkinlik"], line: "Festival çadırında bir şarkı doğuyor" },

    /* ---- MÜZİK · GÜNCEL SAHNE (v10.14) ----
       Oyun artık bugünün rap ekonomisini de konuşuyor: kısa video
       döngüsü, algoritma baskısı, yapay zekâ tartışması, bağımsız
       üretim ve drill/melodik trap dalgası. Sözler bu başlıklarla
       örtüşürse etkileşim artıyor (salt eski gündem değil). */
    { cat: "muzik", title: "Şarkıların ömrü kısaldı: albüm değil tekli dönemi", heat: 84, keywords: ["tekli", "single", "albüm", "döngü", "kısa video"], line: "Bir şarkı çıktı, üç günde tükendi" },
    { cat: "muzik", title: "Algoritma şarkıyı ilk 10 saniyede yargılıyor", heat: 80, keywords: ["algoritma", "giriş", "hook", "tiktok", "trend"], line: "İlk on saniyede karar veriyor kitle" },
    { cat: "muzik", title: "Yapay zekâ ile üretilen şarkı tartışması büyüdü", heat: 86, keywords: ["yapay zeka", "ai", "telif", "üretim"], line: "Makine yazıyor ama yaşıyor mu?" },
    { cat: "muzik", title: "Bağımsız sanatçılar aracısız yayınlamaya geçti", heat: 79, keywords: ["bağımsız", "dağıtım", "aracı", "telif"], line: "Aracıyı çıkardım, kontrol bende" },
    { cat: "muzik", title: "Melodik trap dalgası listeleri ele geçirdi", heat: 77, keywords: ["melodik", "trap", "dalga", "liste"], line: "Melodi ağır, söz keskin, akış hızlı" },
    { cat: "muzik", title: "Drill akışı Türkiye'de yerleşti", heat: 75, keywords: ["drill", "akış", "flow", "sokak"], line: "Sokak ritmi değişti, akış sertleşti" },
    { cat: "muzik", title: "Phonk ve hyperpop genç kitleyi böldü", heat: 68, keywords: ["phonk", "hyperpop", "genç", "sound"], line: "Yeni sound geldi, eski kulak alışmadı" },
    { cat: "muzik", title: "Rapçiler arasında beat savaşı: aynı sample tartışması", heat: 72, keywords: ["beat", "sample", "çalıntı", "prodüksiyon", "kopya"], line: "Aynı sample, iki şarkı, tek hakikat" },
    { cat: "muzik", title: "Konser bilet fiyatlarına tepki büyüdü", heat: 74, keywords: ["konser", "bilet", "fiyat", "sahne"], line: "Sahneye bakıyorum, cebime bakıyorum" },
    { cat: "muzik", title: "Sosyal medyada şarkı challenge'ı viral oldu", heat: 81, keywords: ["challenge", "viral", "akım", "kısa video"], line: "Herkes aynı akışı deniyor, özgün kalan az" },
    { cat: "muzik", title: "Plak ve kaset satışı gençler arasında geri döndü", heat: 62, keywords: ["plak", "kaset", "fiziksel", "satış"], line: "Dijital dünyada kaset arıyor gençlik" },
    { cat: "muzik", title: "Müzikte sözün ağırlığı yeniden tartışılıyor", heat: 83, keywords: ["söz", "yazım", "kalem", "içerik"], line: "Sound değişti ama söz hâlâ soruluyor" }
  ];

  /* tema ↔ kategori uyumu (küçük bonus) */
  const THEME_CAT = {
    street:     ["asayis", "toplumsal", "gundem"],
    money:      ["ekonomi", "gundem"],
    freedom:    ["siyasal", "toplumsal"],
    loss:       ["toplumsal", "gundem"],
    love:       ["magazin"],
    party:      ["muzik", "magazin"],
    introspect: ["toplumsal", "garip"],
    faith:      ["toplumsal", "garip"],
    flex:       ["ekonomi", "muzik"]
  };

  /* kategori → önerilen söz teması (gündemden stüdyoya atlarken) */
  K.NEWS_CAT_THEME = {
    asayis: "street", siyasal: "freedom", toplumsal: "street",
    ekonomi: "money", magazin: "love", garip: "introspect",
    muzik: "flex", gundem: "street"
  };

  const REFRESH_DAYS = 30;

  K.news = {
    /* --- gündemi kur / tazele --- */
    refresh(force) {
      const s = K.state;
      if (!s) return;
      const has = s.agenda && s.agenda.topics && s.agenda.topics.length;
      const age = has ? (s.day - (s.agenda.refreshedDay || 0)) : 9999;
      if (!force && has && age < REFRESH_DAYS) return;

      const topics = [];
      K.NEWS_CATEGORIES.forEach(cat => {
        const pool = K.NEWS_POOL.filter(p => p.cat === cat.id);
        K.util.shuffle(pool).slice(0, 2).forEach(p => {
          // hafif günlük sıcaklık dalgalanması (kalıcı, kayıtta tutulur)
          const heat = K.util.clamp(Math.round(p.heat + K.util.rand(-8, 12)), 20, 100);
          topics.push({ id: K.util.uid("news"), cat: p.cat, title: p.title, keywords: p.keywords, line: p.line, heat });
        });
      });
      s.agenda = { refreshedDay: s.day, topics: K.util.shuffle(topics).slice(0, 12) };
    },

    current() {
      const s = K.state;
      return (s && s.agenda && s.agenda.topics) || [];
    },

    /* kategorilere göre gruplu gündem */
    byCategory() {
      const map = {};
      K.news.current().forEach(t => { (map[t.cat] = map[t.cat] || []).push(t); });
      return K.NEWS_CATEGORIES
        .map(c => ({ cat: c, topics: (map[c.id] || []).slice().sort((a, b) => b.heat - a.heat) }))
        .filter(x => x.topics.length);
    },

    hot(n) {
      return K.news.current().slice().sort((a, b) => b.heat - a.heat).slice(0, n || 5);
    },

    /* günün gündemi: her gün en sıcak konular arasından biri öne çıkar */
    today() {
      const t = K.news.current();
      if (!t.length) return null;
      const top = t.slice().sort((a, b) => b.heat - a.heat).slice(0, Math.min(5, t.length));
      const d = (K.state && K.state.day) || 1;
      return top[(d - 1) % top.length];
    },

    topicById(id) {
      return K.news.current().find(t => t.id === id) || null;
    },

    /* --- sözleri gündemle eşleştir --- */
    match(text, themeId, genre) {
      const t = (text || "").toLocaleLowerCase("tr");
      if (!t.trim()) return { score: 0, hits: [], empty: true };
      const words = new Set(t.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean));
      const themeCats = THEME_CAT[themeId] || [];
      const hits = [];
      let score = 0;

      K.news.current().forEach(tp => {
        let kwHit = 0;
        let used = null;
        tp.keywords.forEach(k => {
          if (words.has(k)) { kwHit += 1; used = used || k; }
          else if (t.includes(k)) { kwHit += 0.6; used = used || k; }
        });
        if (kwHit <= 0) return;
        const themeBonus = themeCats.includes(tp.cat) ? 1.25 : 1;
        const heatFactor = 0.6 + tp.heat / 220;
        const gain = Math.min(45, kwHit * 14) * heatFactor * themeBonus;
        score += gain;
        hits.push({ id: tp.id, cat: tp.cat, title: tp.title, heat: tp.heat, gain: Math.round(gain), keyword: used });
      });

      hits.sort((a, b) => b.gain - a.gain);
      return { score: Math.min(100, Math.round(score)), hits, empty: false };
    },

    /* --- TEMAYA GÖRE GÜNDEM UYUMU (sözlerde konu geçmesi GEREKMEZ) ---
       Gündem ayrı takip edilir: seçtiğin tema bir kategoriye denk geliyorsa,
       o kategorideki sıcak konular yayınına ivme kazandırır. */
    themeAffinity(themeId, genre) {
      const cats = THEME_CAT[themeId] || [];
      const topics = K.news.current().filter(t => cats.includes(t.cat));
      if (!topics.length) return { score: 0, hits: [], cats: cats, hot: null };
      const hot = topics.slice().sort((a, b) => b.heat - a.heat).slice(0, 3);
      let score = 0;
      const hits = hot.map((t, i) => {
        const gain = Math.round((t.heat / 100) * (26 - i * 6));
        score += gain;
        return { id: t.id, cat: t.cat, title: t.title, heat: t.heat, gain };
      });
      if (!hits.length) return { score: 0, hits: [], cats: cats, hot: null };
      return { score: Math.min(100, Math.round(score)), hits: hits, cats: cats, hot: hot[0] };
    },

    /* --- gündeme uygun söz satırı öner (söz yazmaya zorlamaz) --- */
    suggest(themeId, topicId) {
      let tp = topicId ? K.news.topicById(topicId) : null;
      if (!tp) {
        const themeCats = THEME_CAT[themeId] || [];
        const pool = K.news.current().filter(t => themeCats.includes(t.cat));
        tp = (pool.length ? K.util.pick(pool) : K.news.hot(8)[0]) || null;
      }
      const base = tp ? tp.line : "Sokakta bir hikâye, mikrofonda hayat";
      const extra = [
        "Kaç kere yazdım aynı satırı",
        "Haberler değişti, dert aynı kaldı",
        "Gündem sıcak, kalem soğumaz",
        "Bir başlık açtım, içine hayatı koydum"
      ];
      return base + "\n" + K.util.shuffle(extra).slice(0, 3).join("\n");
    },

    /* bir sözün gündem uyumunu tek cümlede özetle */
    summary(hits) {
      if (!hits || !hits.length) return "Gündemle örtüşme yok — sözler bağımsız yayılır.";
      const top = hits[0];
      const c = K.newsCatById(top.cat);
      return `${c.icon} ${c.name} · "${top.title}" konusu yakalandı (×${(1 + top.gain / 100).toFixed(2)} etkileşim).`;
    }
  };
})(window.K = window.K || {});
