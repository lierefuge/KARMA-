/* ============================================================
   KARMA — systems/chat.js
   SERBEST METİN DM MOTORU (genişletilmiş)
   • Oyuncunun mesajını niyetine (intent) göre analiz eder.
   • Sanatçının kişiliğine / samimiyet seviyesine göre bağlamsal
     ve TUTARLI cevap üretir (konuşma hafızası + takip soruları).
   • Bazı sanatçıların ÖZEL ağzı vardır (ör. Lie Refuge → argo).
   • Gündemdeki haberlerden söz edilirse ona da bağlanır.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ------------- yardımcı ------------- */
  const norm = s => (s || "").toLocaleLowerCase("tr").replace(/[.,!?;:]/g, " ").replace(/\s+/g, " ").trim();
  const has = (t, words) => words.some(w => t.includes(w));

  /* ------------- selamlaşma tespiti (özel) -------------
     "selamün aleyküm" / "sa" → aleyküm selam
     "aleyküm selam"  / "as" → karşılık
     Bu mesajlara ulaşılabilirlik ne olursa olsun karşılık verilir. */
  function greetForm(text) {
    const t = norm(text);
    if (!t) return null;
    if (/^(ve\s+)?aleyk(u|ü)m\s+selam/.test(t) || t === "as" || t === "a s" || t === "a.s") return "reply";
    if (t.includes("aleyk") || t === "sa" || t === "s a" || t === "s.a" || /^selam\s?un/.test(t)) return "islamic";
    if (/^(selam|selamlar|merhaba|meraba|merabalar|slm|salam|hey|alo|günayd|iyi akşam|iyi gece|hoş\s?geldin|hosgeldin)\b/.test(t)) return "generic";
    return null;
  }

  /* İslami selam ve karşılıkları (profil özel havuzu yoksa kullanılır) */
  const SELAM = {
    islamic: [
      "Aleyküm selam, kardeşim.",
      "Aleyküm selam, hoş geldin.",
      "Ve aleyküm selam. Nasılsın bakalım?",
      "Aleyküm selam, naber?",
      "Aleyküm selam, iyi ki yazdın."
    ],
    shortIslamic: ["as", "as, naber?", "as kardeşim.", "Aleyküm selam."],
    reply: [
      "Eyvallah, sağ ol.",
      "as kardeşim, naber?",
      "Rica ederim, sen de iyi bak.",
      "Ne demek, sen de selamettesin."
    ]
  };

  function selamPool(gf, prof, stage, short, artist) {
    if (prof && prof.selam && prof.selam[gf] && prof.selam[gf].length) return prof.selam[gf];
    if (gf === "islamic") return short ? SELAM.shortIslamic : SELAM.islamic;
    if (gf === "reply") return SELAM.reply;
    /* DÜZELTME (v10.8): selamlama yolu tür/kıdem katmanını ATLIYORDU,
       bu yüzden profil olmayan 25 sanatçı yine aynı genel cümleleri
       kuruyordu. Artık selamlama da sanatçının ses katmanını kullanır. */
    return poolFor("greet", stage, prof, artist);
  }

  /* ------------- niyet sözlüğü ------------- */
  const INTENTS = [
    { id: "feature",   words: ["feature", "feat", "düet", "duet", "ortak şarkı", "beraber şarkı", "birlikte şarkı", "collab", "verse", "nakarat oku", "üstüne oku", "ortak iş"] },
    { id: "hangout",   words: ["takılalım", "takılalım mı", "buluşalım", "görüşelim", "çıkalım", "kahve", "yemek yiyelim", "stüdyoya gel", "müsait misin", "boş musun", "plan yapalım", "dışarı", "buluşma"] },
    { id: "company",   words: ["şirket", "şirketime", "label", "sözleşme", "kontrat", "imzala", "kadro", "transfer", "imzalamak", "anlaşma", "kayıt al"] },
    { id: "money",     words: ["para", "bütçe", "avans", "ödeme", "kaç para", "ücret", "fiyat", "para ver", "kazanç", "telif", "royalty"] },
    { id: "compliment",words: ["harika", "muhteşem", "efsane", "süper", "çok iyi", "bayıldım", "sevdim", "beğendim", "tebrik", "bravo", "güzel olmuş", "helal", "kralsın", "adamsın", "goat", "kral", "saygı", "hayran"] },
    { id: "critique",  words: ["kötü", "berbat", "sevmedim", "beğenmedim", "vasat", "zayıf", "sıkıcı", "overrated", "abartı", "eskisi gibi", "bozmuş", "hayal kırıklığı"] },
    { id: "diss",      words: ["diss", "beef", "subliminal", "gönderme", "laf sokma", "rap savaşı", "verse at", "sataşma"] },
    { id: "music",     words: ["albüm", "şarkı", "single", "ep", "proje", "ne zaman çıkıyor", "yeni iş", "yeni parça", "beat", "kayıt", "stüdyo", "sound", "prodüksiyon", "klip", "konser", "turne", "mix", "master"] },
    { id: "career",    words: ["nasıl başladın", "tavsiye", "ilham", "kariyer", "tecrübe", "nasıl yaptın", "öğüt", "yol göster", "mentor", "ders", "hedef", "başarı"] },
    { id: "market",    words: ["piyasa", "sektör", "endüstri", "rap piyasası", "müzik dünyası", "trend", "bu ara ne dinliyor", "dinleyici", "algoritma", "spotify listesi"] },
    { id: "beef",      words: ["kimse", "piyasa bitmiş", "rap öldü", "sahte", "kopya", "taklit", "çalıntı beat", "iş bitirmiş"] },
    { id: "health",    words: ["sağlık", "uyku", "yorgun", "stres", "dinlen", "iyi misin", "yaralanma", "sesin"] },
    { id: "hard",      words: ["yorgunum", "param yok", "moralim bozuk", "moralim", "bunalım", "stres", "sıkıntı", "dert", "zor durumdayım", "kötüyüm", "yalnızım", "mutsuzum", "çöktüm", "dibe vurdum", "bitkin", "yıkıldım", "kafam bozuk", "geçinemiyorum"] },
    { id: "family",    words: ["aile", "anne", "baba", "kardeş", "çocuk", "evlilik", "eşim", "oğlun", "kızın", "çocuğun", "eşin", "ailen", "baban", "annen", "kardeşin"] },
    { id: "thanks",    words: ["teşekkür", "sağol", "sağ ol", "eyvallah", "minnettar", "teşekkürler", "thanks"] },
    { id: "howareyou", words: ["nasılsın", "naber", "ne haber", "iyi misin", "neler yapıyorsun", "napıyorsun", "ne yapıyorsun", "keyifler"] },
    { id: "greet",     words: ["merhaba", "selam", "hey", "alo", "günaydın", "iyi akşamlar", "iyi geceler", "hosgeldin", "hoş geldin"] },
    { id: "support",   words: ["paylaştım", "story", "tanıttım", "destek", "reklam", "spotify listeme", "çalma listeme", "ekledim", "rep", "like attım"] },
    { id: "bye",       words: ["görüşürüz", "bye", "hoşçakal", "kapatıyorum", "gideyim", "iyi geceler", "sonra konuşuruz", "hadi kaçtım"] },
    { id: "shortyes",  words: ["evet", "tamam", "olur", "tabii", "peki", "anladım", "ok", "okay", "kesin", "neden olmasın", "aynen", "he"] },
    { id: "shortno",   words: ["hayır", "olmaz", "yok", "yapmam", "istemiyorum", "belki", "sonra", "şimdi değil", "yo", "olmaz kardeş"] },
    { id: "laugh",     words: ["haha", "hahah", "lol", "şaka", "dalga", "komik", "gül", "koptum", "asdfg", "kahkaha", "komiğime"] },
    { id: "insult",    words: ["salak", "aptal", "kötüsün", "berbatsın", "saçma", "rezalet", "nefret ediyorum", "beter", "vasıfsız", "kopyacı", "tipsiz", "beceriksiz"] },
    { id: "flirt",     words: ["seni seviyorum", "aşığım", "yakışıklı", "güzelsin", "evlenelim", "seninle olmak", "kalbim", "çıkma teklifi"] },
    { id: "personal",  words: ["kaç yaşındasın", "nerelisin", "hangi şehir", "gerçek adın", "ismin ne", "ismin ne anlama", "adın ne", "sahne adı", "sahne adın", "lakabın", "takma adın", "evli misin", "sevgilin", "özel hayatın", "telefonun", "adresin"] },
    { id: "askmoney",  words: ["borç", "para ver", "ödünç", "maddi", "yardım et para", "faizsiz", "bana para"] },
    { id: "news",      words: ["haber", "gündem", "siyaset", "ekonomi", "cinayet", "hırsızlık", "zam", "seçim", "sokak olayı"] },
    { id: "question",  words: ["nasıl", "neden", "niye", "ne zaman", "kim", "nerede", "mi", "mı", "musun", "mısın"] }
  ];

  /* ------------- soğuk cevaplar (tanımıyorsa) ------------- */
  const COLD = {
    generic: ["Kimsin kardeşim?", "Tanıdık gelmiyorsun, kimsin sen?", "Yoğunum, sonra bakarım.", "Şu an herkese cevap veremiyorum, kusura bakma.", "Seni tanımıyorum ama yazmışsın.", "Bir sürü mesaj geliyor, seni ayırt edemedim."],
    feature: ["Şu an kimseye feature vermiyorum.", "Önce seni bir tanıyalım, öyle konuşalım.", "Feature ciddi iş, sen kimsin?", "Bunun için biraz ün lazım kardeşim."],
    hangout: ["Şu an müsait değilim.", "Tanımadığım insanlarla takılmıyorum, kusura bakma.", "Programım dolu."],
    company: ["Sözleşme için önce bir geçmiş lazım.", "Böyle bir teklif için çok erken.", "Önce kendini kanıtla."],
    flirt: ["Yo, oraya gitmeyelim.", "Saçmalama."],
    insult: ["Kes sesini, ne diyorsun sen?", "Boş konuşma.", "Kimsin sen ya?"],
    askmoney: ["Para mı? Yok öyle bir şey.", "Bana para sorma, ben kimseye vermem."],
    personal: ["Özel hayatım seni ilgilendirmez.", "Bunları sormaya hakkın yok henüz."],
    laugh: ["Komik misin?", "Ne gülüyorsun?"],
    thanks: ["Tanımadığım birine teşekkür etmenin anlamı yok ama sağ ol.", "Peki."],
    question: ["Neden soruyorsun?", "Kimsin sen önce?", "Böyle soruya cevap vermem."]
  };

  /* ------------- NOT (v10.14 temizliği) -------------
     Burada eskiden "yansıtıcı cevap" denemesi vardı: REFLECT havuzu,
     STOP kelime seti ve salientWord() yardımcısı oyuncunun mesajından
     rastgele bir kelime seçip cümleye geri koyuyordu ("{word} mı?
     İlginç, devam et."). Bu yaklaşım terk edildi — contextReply()
     artık anlamlı bağlam kuruyor — ama üç tanım dosyada kalmıştı.
     Hiçbiri çağrılmıyordu; kaldırıldı. */

  function classify(text) {
    const t = norm(text);
    if (!t) return "empty";
    const isQuestion = /\?/.test(text || "");
    if (t.length <= 16) {
      const shorty = INTENTS.find(i => ["shortyes", "shortno"].includes(i.id) && i.words.some(w => t === w || t.startsWith(w + " ")));
      if (shorty) return shorty.id;
    }
    // "yo" / "he" gibi çok kısa onay/ret
    if (["yo", "yok", "olmaz"].includes(t)) return "shortno";
    if (["he", "hehe", "aynen", "ok"].includes(t)) return "shortyes";

    let best = null, bestScore = 0;
    INTENTS.forEach(i => {
      let sc = 0;
      i.words.forEach(w => { if (t.includes(w)) sc += w.length > 5 ? 2 : 1; });
      if (sc > bestScore) { bestScore = sc; best = i.id; }
    });
    const PRIORITY = ["insult", "laugh", "flirt", "personal", "hard", "askmoney"];
    for (const pid of PRIORITY) {
      const pi = INTENTS.find(x => x.id === pid);
      if (pi && pi.words.some(w => t.includes(w))) return pid;
    }
    if (best) return best;
    if (isQuestion) return "question";
    if (t.split(" ").length <= 2) return "shortyes";
    return "generic";
  }

  /* ------------- kişilik tonu ------------- */
  function tone(artist) {
    const tr = artist.traits;
    if (tr.ego >= 7) return "ego";
    if (tr.openness >= 8) return "warm";
    if (tr.loyalty >= 7) return "guarded";
    if (tr.work >= 9) return "workaholic";
    return "neutral";
  }

  const TONE_SUFFIX = {
    ego: [" Bu arada bu piyasada benim seviyeme gelen çok az.", " Ben işimi biliyorum kardeşim.", " Konuşmak kolay, icraat lazım.", " Bu sound'u ilk ben yaptım, not al."],
    warm: [" Seni dinliyorum, devam.", " Samimiyetin güzel, hoşuma gidiyor.", " Senin gibi insanlar lazım bu işe.", " İçten konuşman hoşuma gitti."],
    guarded: [" Ama her şeye hemen açık değilim, bilirsin.", " Önce güven lazım.", " Temkinliyim, kusura bakma."],
    workaholic: [" Bu aralar stüdyodan çıkmıyorum.", " Çalışmadan olmuyor bu iş.", " Emeğe saygı duyarım, ben de öyle çalışıyorum.", " Bugün de kayıttaydım, durmak yok."],
    neutral: ["", "", " Aynen."]
  };

  /* sanatçının gerçek şarkılarından alıntı */
  function theirSong(artist, used) {
    /* v10.16 — tembel veri katmanı (P-1) */
    const list = K.lazy ? K.lazy.songs(artist.id) : ((K.REAL_SONGS && K.REAL_SONGS[artist.id]) || []);
    const titles = list.map(s => s.title).filter(Boolean);
    if (used && used.length) {
      const rem = titles.filter(t => !used.includes(t));
      if (rem.length) return U.pick(rem);
    }
    return titles.length ? U.pick(titles) : "yeni bir iş";
  }

  /* =====================================================
     TEMEL CEVAP HAVUZLARI (zenginleştirildi)
     ===================================================== */
  function basePools(intent, S) {
    const P = {
      greet: [
        "Selam, naber? Seni görmek güzel.",
        "Hey! Hoş geldin, ne var ne yok?",
        "Selam kardeşim, iyi ki yazdın.",
        "Oo selam, nasıl gidiyor işler?",
        "Selam, bu ara yoğunum ama sana vakit var.",
        "Naber? Yazman iyi oldu, kafamı dağıttım.",
        "Selam! Yeni bir şey üstünde çalışıyordum, sen geldin.",
        "Hey, sonunda yazdın. Nasılsın?"
      ],
      howareyou: [
        "İyiyim, stüdyodayım sürekli. Sen nasılsın?",
        "Fena değil, yeni bir şeyler üstünde çalışıyorum. Sen?",
        "İdare eder, bu aralar kafam müzikte. Sen ne yapıyorsun?",
        "Yorgunum ama iyi sayılırım. Üretmeye devam. Sen?",
        "Sorma, koşuşturma var. Ama iyiyim, sen nasılsın?",
        "Gayet iyiyim kardeşim, enerjim yüksek. Sen nasılsın?"
      ],
      compliment: S >= 3
        ? ["Sağol kardeşim, çok teşekkür ederim. Bunu senden duymak güzel.",
           "Adamsın, sağ ol. Senin de işler yükseliyor, takipteyim.",
           "Eyvallah, bu desteği unutmam.",
           "Çok sağ ol, motivasyon oldu bu bana.",
           "Sen böyle deyince bir sonraki işi daha sağlam yapıyorum."]
        : ["Teşekkürler, sağ ol. Yeni tanışıyoruz ama iyi konuşuyorsun.",
           "Sağ ol kardeşim, güzel sözler.",
           "Eyvallah, desteğin için teşekkürler.",
           "Sağ ol, güzel moral oldu."],
      critique: S >= 3
        ? ["Herkes beğenmek zorunda değil, saygı duyuyorum. Ama o işte emek var.",
           "Tamam, eleştiriyi alıyorum. Beklentin neydi tam olarak?",
           "Anladım. Ben o sound'u bilerek seçtim, kendimi tekrarlamak istemem.",
           "Eleştirin değerli ama nedenini anlat, boş laf sevmem."]
        : ["Yorumun için sağ ol ama henüz birbirimizi tanımıyoruz.",
           "Herkesin zevki farklı, saygı duyarım.",
           "Tamam, notunu aldım.",
           "Dinledim, ama önce kim olduğunu bilmek isterim."],
      diss: S >= 3
        ? ["Diss işi kolay değil, adamlığını bilmen lazım.",
           "Ben sataşmam ama üstüme gelene cevap veririm.",
           "Subliminal değil direkt söylerim, o yüzden net ol.",
           "Rap savaşı kültürdür ama seviyeli olacak."]
        : ["Kimseyle diss'lik işim olmaz, sen bu konulara hiç girme.",
           "Boş iş, gerçek iş yapalım.",
           "O işlere girmem."],
      feature: S >= 4
        ? ["Onay! Sen beat getir, ben yazarım. Uygun bir zamanda stüdyoda oturalım.",
           "Varım kardeşim. Ortak bir şey yapalım, güzel olur.",
           "Ben de düşünüyordum bunu. Şu vibe üzerinden gidelim.",
           "Tamam, ama iş ciddi olsun. Sağlam bir şey çıkarmalıyız.",
           "Olur. Sen demo gönder, ben bakayım, sonra oturup yazarız."]
        : ["Şu an herkese feature vermiyorum, önce birbirimizi tanıyalım derim.",
           "Fikri sevdim ama şimdi doğru zaman değil. Biraz daha takılalım, sonra konuşuruz.",
           "Feature ciddi iş, önce güven lazım.",
           "Güzel teklif ama önce sen kendini göstermelisin."],
      hangout: S >= 3
        ? ["Olur, müsait olduğumda haber ederim. Takılalım.",
           "Varım, bir kahve içeriz, kafa dağıtırız.",
           "Tamam, stüdyoya gel hem bakarsın hem tanışırız.",
           "Olur kardeşim, bir gün oturup konuşalım."]
        : ["Şu an programım dolu, ama belki sonra.",
           "Yeni tanışıyoruz, biraz daha samimiyet lazım önce.",
           "Şimdi olmaz ama gelecek var.",
           "Bakalım, müsait olsam haber ederim."],
      company: S >= 5
        ? ["Şirket işi ciddi. Şartları konuşalım ama ciddi düşünüyorum.",
           "Label konusunda açığım, ama işin arkasında durman lazım.",
           "Teklifi dinlerim. Doğru ekip olursa neden olmasın.",
           "Şirket varsa vizyon da olmalı. Anlat bakalım planını."]
        : ["Şirket işi şu an gündemimde değil, daha yolum var seninle.",
           "Önce güven, sonra sözleşme. Şimdi erken.",
           "Sözleşme büyük laf, henüz orada değiliz.",
           "Şimdilik erken, ama kapıyı kapatmıyorum."],
      money: [
        "Para konusu net olur, söz verdiysem yaparım.",
        "Bu işlerde şartları baştan konuşmak lazım, haklısın.",
        "Bütçe varsa iş de olur, ama ciddiyet şart.",
        "Parayı konuşmak ayıp değil, net olmak iyidir.",
        "Fiyatı net söyle, ona göre bakarız."
      ],
      music: [
        "Şu aralar stüdyodayım, yeni bir şey üstünde çalışıyorum.",
        "Yeni işler var. \"{song}\" favorim, bak istersen.",
        "Prodüksiyon üstünde çok çalışıyorum. \"{song}\" bunun güzel bir örneği.",
        "Sürekli kayıttayım. Bir sonraki single büyük ihtimalle \"{song}\" vibe'ında olacak.",
        "Beat'i kendim yapıyorum artık, \"{song}\" gibi işler çıkıyor ortaya.",
        "Mix'i de kendim yapmaya başladım, kontrol bende olsun istiyorum."
      ],
      career: [
        "Tavsiye istiyorsan: her gün yazacaksın, istikrar her şeyi geçer.",
        "Ben sokaktan geldim, kolay olmadı. Sabır ve üretim.",
        "Kendini başkalarıyla kıyaslama, kendi sound'unu kur.",
        "Kimseyi taklit etme; bugün farklı olan kazanıyor.",
        "Küçük başla ama bitir. Yarım işler seni yorar.",
        "Kendine bir ses kur, sonra o sesi savun."
      ],
      market: [
        "Piyasa değişti, artık algoritma her şeyi belirliyor.",
        "Kısa içerik olmadan hit zor. Ama müzik yine de özünde duruyor.",
        "Sektör acımasız ama dürüst üretim yapan kaybetmiyor.",
        "Herkes hit peşinde, kimse albüm yapmıyor. Değişecek bu.",
        "Trend'i takip et ama kendini kaybetme."
      ],
      beef: [
        "Sahtekârlık bitmez bu işte, ama kaliteli iş kendini gösterir.",
        "Ben laf sokmam, iş koyarım ortaya.",
        "Piyasada çok gürültü var, sakin olan kazanır.",
        "Herkes birbirine benziyor, farklı olan kazanacak."
      ],
      health: [
        "Sağlık her şeyin önünde, ne yaptıysam uykuyu düzeltmekle başladı.",
        "Sesim bazen yoruluyor, ısınma yapmadan kayda girmiyorum.",
        "Çok çalışıyorum ama dinlenmeyi de öğrendim artık.",
        "Stres olunca stüdyodan uzaklaşıyorum biraz."
      ],
      hard: [
        "Anlıyorum kardeşim, bu iş kolay değil; o günlerden ben de geçtim.",
        "Zor günler geçer, yeter ki sen yılma. Buradayım.",
        "Para ve moral aynı anda gidince ağır oluyor, biliyorum. Bir nefes al.",
        "Derdini anlat, dinliyorum. Çözüm olmasa da yalnız değilsin.",
        "İlk yıllarda ben de borçla yaşadım; sabreden kazanıyor.",
        "Kötü günler işin bir parçası. Kendine iyi bak, ben de buradayım.",
        "Moralin bozuksa stüdyoya gel, bir şeyler kaydedelim; iyi gelir."
      ],
      family: [
        "Aileme çok şey borçluyum, desteği onlardan aldım.",
        "Ailemi çok anlatmam, ama onlar arkamda durdu.",
        "Zor günlerde aile önemlidir, bunu geç öğrendim."
      ],
      thanks: [
        "Rica ederim kardeşim.",
        "Ne demek, her zaman.",
        "Eyvallah, sağ ol sen de.",
        "Estağfurullah, lafı olmaz."
      ],
      support: [
        "Desteğin için sağ ol, unutmam bunu.",
        "Eyvallah! Sen de bir şey çıkarınca bana yaz, destek olurum.",
        "Çok teşekkürler, bu işler destekle büyüyor.",
        "Sağ ol, paylaşım çok önemli bu dönemde."
      ],
      bye: [
        "Görüşürüz, kendine iyi bak.",
        "Tamam, sonra konuşuruz. İyi çalışmalar.",
        "Hoşçakal, işlerinde kolay gelsin.",
        "Hadi, kendine dikkat et."
      ],
      shortyes: [
        "Aynen öyle.",
        "Tamam o zaman.",
        "Anlaştık.",
        "Peki, öyle olsun."
      ],
      shortno: [
        "Tamam, saygı duyarım.",
        "Anladım, sorun değil.",
        "Peki, nasıl istersen.",
        "Tamam kardeşim, baskı yapmam."
      ],
      laugh: S >= 3
        ? ["Hahah iyiydi bu 😄", "Güldürdün kardeşim, sağ ol.", "Şakacısın, sevdim bunu.", "Haha, tamam tamam, aldım."]
        : ["Haha, tamam.", "Komiksin.", "Güldüm."],
      insult: S >= 4
        ? ["Sert konuşuyorsun ama hakkını veriyorsun, tartışmaya açığım.",
           "Eleştiriye açığım ama saygı çerçevesinde.",
           "Tamam, sinirlendin. Sebebi ne?"]
        : ["Kes sesini istersen, ne konuşuyorsun sen?", "Herkes haddini bilecek.", "Boş konuşma.", "Sana bir şey mi yaptım?"],
      flirt: S >= 4
        ? ["Yapma ya 😄 Sen iyi bir insan gibisin, öyle kalalım.", "Sağ ol ama kafam müzikte şu an."]
        : ["Yo, oraya gitmeyelim.", "Saçmalama kardeşim."],
      personal: S >= 3
        ? ["Özel hayatımı pek konuşmam ama sormakta ısrarcısın 😄", "Müzik dışında konuşmam genelde. Ama seninle iyiydi."]
        : ["Bunları sormaya henüz hakkın yok.", "Özel hayatım seni ilgilendirmez."],
      askmoney: S >= 4
        ? ["Para işine girmeyelim, aramız bozulmasın.", "Maddi konulara girmem, kusura bakma."]
        : ["Para mı? Yok öyle bir şey.", "Bana para sorma."],
      news: [
        "Gündem karışık, ama rapçinin işi tam burada.",
        "Haberlere bakıyorum, söze dökecek çok şey var.",
        "Bu aralar gündem ağır, müzik biraz da kaçış.",
        "Haberde ne varsa sokakta iki katı var."
      ],
      question: S >= 3
        ? ["İyi soru. Kısa cevap: zamanla öğreniliyor.",
           "Bunu sana uzun uzun anlatabilirim.",
           "Neden sorduğunu anladım, cevaplayayım.",
           "Soruna net cevap: deneyerek bulacaksın."]
        : ["Neden soruyorsun?", "Soru sormadan önce bir tanışalım.", "Bakalım, ne demek istedin?"],
      generic: S >= 3
        ? ["Anladım. Bunu biraz açsana, ne demek istedin?",
           "İlginç, devam et.",
           "Haklısın galiba. Ben de benzer şeyler düşünüyorum.",
           "Bunu konuşmak için doğru kişidesin.",
           "Senin bakış açını sevdim, devam et."]
        : ["Anladım, teşekkürler.",
           "Tamamdır. Seni dinliyorum.",
           "Peki, ne demek istedin tam olarak?",
           "İlginç bakış açısı."]
    };
    return P[intent] || P.generic;
  }

  /* =====================================================
     TAKİP CEVAPLARI (kısa "evet/hayır" için bağlamsal)
     ===================================================== */
  const FOLLOWUP = {
    feature: {
      yes: ["Süper. O zaman sen beat'i hazırla, bana yolla, ben oturup yazarım.", "Tamam, anlaştık. Müsait bir gün stüdyoda oturalım."],
      no: ["Tamam kardeşim, zorlamam. Hazır olunca konuşuruz.", "Olur, kendi akışında ilerle."]
    },
    hangout: {
      yes: ["Tamam, ben sana gün veririrm. Kaçırma ama.", "Olur, bu hafta bir şey ayarlarım."],
      no: ["Anladım, müsait değilsin. Sonra bakarız.", "Tamam, başka zaman."]
    },
    company: {
      yes: ["Peki, şartları getir bakalım. Ciddi konuşalım.", "Tamam, o zaman bir toplantı ayarlayalım."],
      no: ["Tamam, doğru karar da olabilir. Aceleye gelmez.", "Anladım, süre istiyorsun. Mantıklı."]
    },
    money: {
      yes: ["Tamam, net olalım o zaman. Rakamı ve işi baştan konuşuruz.", "Peki, bütçe varsa iş konuşulur."],
      no: ["Tamam, para yoksa iş yok, anlayışla karşılarım.", "Anladım, başka zaman."]
    },
    music: {
      yes: ["Tamam, o zaman sana bir şey dinleteyim müsait olunca.", "Peki, demo hazırlayınca atarım."],
      no: ["Tamam, sana uymuyorsa kendi sound'unu kovala.", "Anladım, herkesin tarzı ayrı."]
    },
    career: {
      yes: ["İşte bu kafa! Sürekli yaz, çalış, bırakma.", "Tamam, o zaman ilk işin bugün bir satır yazmak olsun."],
      no: ["Tamam, kendi yolunu kendin bul, ben de buradayım.", "Anladım, acele etme. Yolu yürümek önemli."]
    },
    laugh: {
      yes: ["Hahah iyiydi gerçekten 😄", "Güldük biraz, iyi geldi."],
      no: ["Tamam o zaman, ciddi devam edelim.", "Haha, tamam kestim."]
    },
    market: {
      yes: ["Aynen, trendi doğru okuyorsun. Devam edelim.", "İşte bu! Piyasayı konuşmak lazım."],
      no: ["Herkesin görüşü farklı, saygı duyarım.", "Tamam, senin bakışın da geçerli."]
    },
    news: {
      yes: ["Öyle, gündem ağır. Bu yüzden söz de ağır olmalı.", "Haklısın, konuşulacak çok şey var."],
      no: ["Tamam, farklı düşünüyorsun. Anlat o zaman.", "Peki, sen nasıl bakıyorsun?"]
    },
    hard: {
      yes: ["İyi olmana sevindim. Yine de kendine dikkat et.", "Tamam, iyiysen sorun yok. Buradayım."],
      no: ["Anlat o zaman, dinliyorum. Yalnız değilsin.", "Zor biliyorum. Bir nefes al, konuşalım."]
    },
    compliment: {
      yes: ["Söz, haber veririm. Sen de kendini göster.", "Tamam, iş çıkarınca ilk sana atarım."],
      no: ["Tamam, zorlamam. Kendi akışında ilerle.", "Olur, sen nasıl istersen."]
    },
    generic: {
      yes: ["Tamam, devam ediyorum o zaman.", "Peki, anlatmaya devam."],
      no: ["Tamam, konuyu kapatalım.", "Peki, başka bir şeye geçelim."]
    }
  };

  /* Sanatçının sohbeti sürdüren takip soruları (tutarlılık) */
  const QUESTIONS = {
    music:      ["Yeni bir şey üstünde çalışıyorum, sonra bakar mısın?"],
    feature:    ["Oturup yazalım mı?", "Beraber bir iş yapalım mı?"],
    hangout:    ["Bu aralar müsait misin?"],
    career:     ["Bu tavsiyeyi bir dene."],
    market:     ["Sence piyasa nereye gidiyor?"],
    news:       ["Sen bu konuda ne düşünüyorsun?"],
    hard:       ["Konuşmak ister misin?"],
    compliment: ["Sen de bir iş çıkarınca bana yaz."],
    generic:    ["Sen ne düşünüyorsun?"]
  };

  /* Aynı konu tekrar açıldığında sohbeti bağlayan geçiş cümleleri */
  const CONTINUITY = {
    music:   ["Yine müzikten konuşuyoruz, iyi.", "Bu konuyu sevdim, devam."],
    career:  ["Kariyer konusuna döndük, güzel.", "Bu konuda söyleyeceğim çok şey var."],
    market:  ["Piyasayı yine konuşuyoruz.", "Bu konu uzun, devam edelim."],
    news:    ["Gündem yine gündemde.", "Bu mesele büyük."],
    feature: ["Feature konusunu tekrar açtın, demek ciddisin.", "Tamam, bu işi ciddiye alıyorsun."],
    hard:    ["Bu konuyu yine açtın, seni dinliyorum.", "Anlat bakalım, aynı dert mi?"]
  };

  /* =====================================================
     SANATÇIYA ÖZEL AĞIZLAR (profiller)
     ===================================================== */
  /* ============================================================
     v10.18 (B-5) — PROFİLLER AYRI DOSYAYA TAŞINDI
     Sanatçıya özel cümle havuzları artık data/chat-profiles.js içinde
     ve `K.CHAT_PROFILES` olarak yükleniyor. Bu dosya yalnızca MOTORU
     (niyet analizi, cevap seçimi, kurallar) tutar — 86 KB'lık tek
     modül yerine veri/motor ayrımı.

     GÜVENLİ GERİ DÜŞÜŞ: profil dosyası yüklenmemişse (eski index.html
     ile geçiş penceresi) motor boş nesneyle çalışır; sanatçıya özel ağız
     devreye girmez ve genel/tür havuzları kullanılır — ÇÖKMEZ.
     Bkz. testsiz davranış doğrulaması: tools/smoke-personality.js
     (263 kontrol, profilsiz sanatçılarla karşılaştırmalı).
     ============================================================ */
  const PROFILES = (K.CHAT_PROFILES || {});

  /* profil varsa onun havuzunu, yoksa temel havuzu kullan */
  /* ============================================================
     v10.8 GERÇEKLİK DÜZELTMESİ — SES KATMANLARI
     Eskiden 36 sanatçıdan 25'i (Sıla, Edis, UZI, Blok3, Cakal,
     Lvbel C5, Hadise dışındakiler…) AYNI genel havuzdan konuşuyordu:
     1980'lerden gelen bir ekol ile 24 yaşındaki drill sanatçısı
     birebir aynı cümleyi kuruyordu. Artık kişisel profil yoksa
     sırayla şu katmanlar devreye girer:
       1) sanatçının kendi ağızı (PROFILES)
       2) 40+ yaş → kıdemli tonu
       3) tür havuzu (trap · drill · rap · pop · rnb · indie)
       4) genel havuz
     Böylece 25 sanatçı da birbirinden ayrışır. */
  const VET_CHAT = {
    greet: ["Selam, iyi ki yazdın.", "Selam kardeşim, naber?", "Selam, otur anlat."],
    howareyou: ["İyiyim, yıllardır aynı düzen: stüdyo, ev, sahne. Sen?", "Fena değil, bu iş bitmez. Sen nasılsın?", "İyiyim, gençlerin işlerini dinliyorum. Sen?"]
  };
  const GENRE_CHAT = {
    trap: {
      greet: ["Selam kanka, naber?", "Lan naber, iyi misin?", "Selam, kayıttaydım."],
      howareyou: ["İyiyim, gece çalışıyorum sürekli. Sen?", "İdare eder, sesle uğraşıyorum. Sen napıyon?", "İyiyim ya, kayıt bitti sayılır. Sen?"],
      music: ["Bir şey pişiyor ama acele etmiyorum.", "Sound oturduğunda çıkacak, acele yok.", "Beat seçmek işin yarısı zaten."],
      career: ["Bol kayıt, az beklenti. Gerisi geliyor.", "Sabır. İlk yıl kimse dinlemiyor, sonra dönüyor.", "Kendi sound'unu bul, gerisi teknik."],
      market: ["Piyasa hızlı, kimse beklemiyor.", "Algoritma hız istiyor ama kalite yavaş işi.", "Şimdi kısa içerik konuşuluyor, şarkı geride."]
    },
    drill: {
      greet: ["Selam, naber?", "Yo, naber kanka", "Selam kardeşim."],
      howareyou: ["İyiyim, koşuşturma var. Sen?", "Sağlam, kayıttayım. Sen naber?", "İyiyim, işe gömüldüm. Sen?"],
      music: ["Akış sert olacak, sözleride düşünüyorum.", "Yeni bir şey var, mix kaldı.", "Beat zaten hazır, üstüne oturuyorum."],
      career: ["Hızlı çık, kaliteyi düşürme. Zor iş.", "Kitle genç, dikkat süresi kısa.", "Düzenli at, ara verme."],
      market: ["Piyasa doydu ama yer var.", "Herkes aynı sesi kullanıyor, farklı ol.", "TikTok olmadan olmuyor artık."]
    },
    rap: {
      greet: ["Selam, hoş geldin.", "Selam kardeşim, naber?", "Selam, buyur."],
      howareyou: ["İyiyim, yazıyorum sürekli. Sen?", "İdare eder, kalem kâğıt işi. Sen nasılsın?", "İyiyim, metin üstünde çalışıyorum. Sen?"],
      music: ["Söz bitti sayılır, kaydı bekliyor.", "Metin oturmadan kayda girmem.", "Bu parça biraz daha emek istiyor."],
      career: ["Oku, yaz, kaydet. Formül bu.", "Taklit etme, sesini bul.", "İlk 100 şarkıyı kimse dinlemez, yine de yaz."],
      market: ["Dinleyici azaldı ama gerçek dinleyici kaldı.", "Söz anlayan kitle küçük ama sadık.", "Piyasa hızlı tüketiyor, sen kalıcı yaz."]
    },
    pop: {
      greet: ["Selamlar, hoş geldin 💫", "Merhaba, iyi ki yazdın.", "Selam, nasılsın?"],
      howareyou: ["Çok iyiyim, provadayım. Sen nasılsın?", "İyiyim, sahne hazırlığı var. Sen?", "Gayet iyiyim, yoğun ama güzel. Sen?"],
      music: ["Yeni şarkı çok yakın, çok heyecanlıyım.", "Bu kayıt içime sindi.", "Sahnede söylemek için sabırsızım."],
      career: ["Sahne tecrübesi her şeyi öğretiyor.", "Sesini koru, düzenli çalış.", "Kitleyi tanı, ona göre iş yap."],
      market: ["Dinleyici hızlı karar veriyor, ilk 10 saniye önemli.", "Sosyal medya olmadan görünmüyorsun.", "Radyo hâlâ etkili."]
    },
    rnb: {
      greet: ["Selam, hoş geldin 🌙", "Merhaba, iyi ki yazdın.", "Selam, naber?"],
      howareyou: ["İyiyim, gece çalışıyorum. Sen?", "Sakinim, kayıttaydım. Sen nasılsın?", "İyiyim, yumuşak bir şey üstünde çalışıyorum."],
      music: ["Gece için yazdım, yumuşak oldu.", "Vokal oturdu, gerisi miks.", "Sessizlikte dinlenecek bir şey."],
      career: ["Yumuşak olan kalıcı oluyor.", "Acele etme, tonunu bul.", "Kalabalığa değil, kulağa çalış."],
      market: ["Gece çalma listeleri önemli.", "Dinleyici sadakati burada daha yüksek.", "Trend değişiyor ama ton kalıyor."]
    },
    indie: {
      greet: ["Selam, hoş geldin ✨", "Merhaba, iyi ki yazdın.", "Selam, naber?"],
      howareyou: ["İyiyim, kendi halimde çalışıyorum. Sen?", "İdare eder, kayıt devam. Sen?", "İyiyim, küçük bir odada büyük bir şey."],
      music: ["Kendim yapıyorum, acele yok.", "Bu kayıt beni anlatıyor.", "Küçük ama gerçek olacak."],
      career: ["Bağımsız kalmak zor ama doğru.", "Yavaş büyü, sağlam büyü.", "Kendi kitleni kur, hazır kitleye oynama."],
      market: ["Bağımsız kalmak artık mümkün.", "Aracı azaldıkça pay artıyor.", "Küçük kitle ama gerçek destek."]
    }
  };

  function poolFor(intent, S, prof, artist) {
    if (prof && prof.pool && prof.pool[intent] && prof.pool[intent].length) return prof.pool[intent];
    /* DÜZELTME (v10.12): kişisel profili olan sanatçının havuzunda
       o niyet yoksa GENEL havuza düşüyordu — yani Şehinşah bir mesajda
       kendi sesiyle, başka mesajda herkesle aynı cümleyle konuşuyordu.
       Artık önce sanatçının KENDİ “generic” satırları denenir. */
    if (prof && prof.pool && prof.pool.generic && prof.pool.generic.length) return prof.pool.generic;
    if (artist) {
      if ((artist.age || 30) >= 40 && VET_CHAT[intent]) return VET_CHAT[intent];
      const g = GENRE_CHAT[artist.genre];
      if (g && g[intent]) return g[intent];
    }
    return basePools(intent, S);
  }
  function coldFor(intent, prof) {
    if (prof && prof.cold) {
      if (prof.cold[intent] && prof.cold[intent].length) return prof.cold[intent];
      if (prof.cold.generic && prof.cold.generic.length) return prof.cold.generic;
    }
    return COLD[intent] || COLD.generic;
  }

  /* tekrar etmeyen seçim */
  function pickFresh(arr, recent) {
    if (!arr || !arr.length) return "";
    const fresh = arr.filter(x => !(recent || []).includes(x));
    return U.pick(fresh.length ? fresh : arr);
  }

  /* =====================================================
     ANA MOTOR
     ===================================================== */
  K.chat = {
    classify,
    greetForm,

    /* ---------------- ana cevap ---------------- */
    reply(artistId, text, pol) {
      const artist = K.artistById(artistId);
      const rel = K.relation(artistId);
      // gerçek sanatçı özel profili yoksa mahalle/semt çevresi profilini kullan
      const prof = PROFILES[artistId]
        || (artist && artist.isContact && K.contacts ? K.contacts.profile(artistId) : null)
        || null;
      const stage = K.stageIndexFor(rel.affinity);
      const t = tone(artist);
      const reach = pol ? pol.reach : (K.relations ? K.relations.reach(artistId) : 1);
      /* v10.29 — akıl sağlığı çarpanı: stresliyken yazılan mesaj daha az
         samimiyet kazandırır. Erken dönüş yollarında da uygulanır ki
         davranış tutarlı olsun (stres 40 altında her zaman 1,00). */
      const mdScale = () => (K.mental && K.mental.dmMult) ? K.mental.dmMult() : 1;   // 100 streste ≈ 0,55
      const mTone = () => (K.mental && K.mental.dmTone) ? K.mental.dmTone() : null;

      const chat = rel._chat = rel._chat || { recent: [], lastIntent: null, turns: 0 };

      /* --- SELAMLAŞMA: tanımasa da her zaman karşılık verilir --- */
      const gf = greetForm(text);
      if (gf) {
        const nt = norm(text);
        const short = (nt === "sa" || nt === "s a" || nt === "as" || nt === "a s");
        const msg = pickFresh(selamPool(gf, prof, stage, short, artist), chat.recent);
        chat.recent.push(msg); if (chat.recent.length > 8) chat.recent.shift();
        chat.lastIntent = "greet";
        chat.turns++;
        rel.lastTopic = "greet";
        rel.lastInteract = K.state.day;
        /* NOT: selamlaşma yolu da ölçeklenir ve aynı alanları döndürür —
           çağıran taraf her yolda `stressed`/`dmMult` görebilmeli. */
        return { msgs: [msg], delta: +((0.9 * mdScale()).toFixed(3)), intent: "greet", action: null,
                 stressed: !!mTone(), dmMult: +mdScale().toFixed(2) };
      }

      const intent0 = classify(text);
      const cold = reach < 0.22 && intent0 !== "shortno";

      /* --- seni tanımıyorsa soğuk, kısa cevap --- */
      if (cold) {
        const pool = coldFor(intent0, prof);
        const msg = pickFresh(pool, chat.recent);
        chat.recent.push(msg); if (chat.recent.length > 6) chat.recent.shift();
        chat.turns++;
        return { msgs: [msg], delta: +((0.15 * mdScale()).toFixed(3)), intent: intent0, action: null, cold: true,
                 stressed: !!mTone(), dmMult: +mdScale().toFixed(2) };
      }

      /* --- bağlamlı takip: kısa evet/hayır --- */
      let intent = intent0;
      let forcedMsgs = null;
      if ((intent0 === "shortyes" || intent0 === "shortno") && chat.lastIntent && FOLLOWUP[chat.lastIntent]) {
        const key = intent0 === "shortyes" ? "yes" : "no";
        const profFollow = prof && prof.followup && prof.followup[chat.lastIntent] && prof.followup[chat.lastIntent][key];
        forcedMsgs = profFollow || FOLLOWUP[chat.lastIntent][key];
        intent = chat.lastIntent;
      }

      const song = theirSong(artist, rel._usedSongs || []);
      rel._usedSongs = rel._usedSongs || [];
      if (song && song !== "yeni bir iş") rel._usedSongs.push(song);

      let msgs = forcedMsgs || poolFor(intent, stage, prof, artist).map(m => m.replace("{song}", song));
      let chosen = pickFresh(msgs, chat.recent);

      // genel mesaja BAĞLAMLI cevap (rastgele kelime yansıtma yok)
      if (intent0 === "generic" && !forcedMsgs) {
        chosen = K.chat.contextReply(artistId, text);
      }

      /* ---- konu sürekliliği: aynı konu tekrar açıldıysa bağla ---- */
      let continuityMsg = null;
      if (!forcedMsgs && chat.lastIntent && chat.lastIntent === intent &&
          CONTINUITY[intent] && chat.turns > 0 && U.chance(0.4)) {
        continuityMsg = U.pick(CONTINUITY[intent]);
      }

      /* ---- ek mesajlar (gerçek sohbet hissi + tutarlılık) ---- */
      const extras = [];
      const profExtras = prof && prof.extras ? prof.extras : null;
      if (U.chance(0.30) && ["feature", "music", "career", "market", "compliment", "diss", "news"].includes(intent)) {
        extras.push(pickFresh(profExtras || [
          "Bu arada senin işlerini takip ediyorum.",
          "Sen de bir şey çıkarınca bana yaz.",
          "Bu sohbeti sevdim.",
          "Stüdyoya uğra bir ara."
        ], chat.recent));
      }
      if (U.chance(0.22)) {
        const s = (prof && prof.suffix ? prof.suffix : TONE_SUFFIX[t]).filter(Boolean);
        if (s.length) extras.push(U.pick(s));
      }

      /* v10.29 — AKIL SAĞLIĞI: yüksek streste sanatçı MESAFE KOYAR.
         Oyuncunun mesajları dağınık/ters gelir; karşı taraf bunu hisseder
         ve cevabına bunu katar. (Samimiyet kaybı aşağıda `delta` ile.) */
      const stressTone = mTone();
      if (stressTone && U.chance(0.55)) {
        const LINES = {
          gergin:   [" Bugün biraz gergin gibisin.", " İyi misin? Sesin tuhaf çıkıyor."],
          yuksek:   [" Bir şey mi oldu? Bana ters konuşuyorsun.", " Kafan dağınık galiba, sonra konuşalım."],
          tukenmis: [" Sen iyi değilsin. Dinlen, sonra yazarım.", " Bu hâlde konuşmak ikimize de iyi gelmez."]
        };
        const pool = LINES[stressTone] || [];
        if (pool.length) extras.push(U.pick(pool));
      }

      /* ---- gündem bağlantısı: mesajda haber konusu geçiyorsa ---- */
      let agendaMsg = null;
      if (K.news && K.news.match) {
        const ag = K.news.match(text, null, artist.genre);
        if (ag.score >= 12 && ag.hits.length && U.chance(0.6)) {
          const h = ag.hits[0];
          const c = K.newsCatById(h.cat);
          agendaMsg = (prof && prof.label === "argo")
            ? `${c.icon} "${h.title}" mı? Amına koyim tam bu konuya rap yazılır.`
            : `${c.icon} "${h.title}" konusu… işte tam bunu söze dökmek lazım.`;
        }
      }

      /* ---- DURUM FARKINDALIĞI: sanatçı senin halini anlasın ---- */
      const p = K.state.player;
      const sit = [];
      if (intent === "hard") sit.push(U.pick([
        "Bu his geçici, sözlerini yaz, iyileşirsin.",
        "Seni anlıyorum. Bir gün bunları şarkıya çevirirsin.",
        "Yanındayım kardeşim, tek başına değilsin."
      ]));
      if ((p.fatigue || 0) >= 55 && U.chance(0.6)) sit.push("Bu arada yorgun görünüyorsun, biraz dinlensen iyi olur.");
      if (K.state.balance < 4000 && ["generic", "howareyou", "greet", "hard"].includes(intent) && U.chance(0.6))
        sit.push("Kasa da zayıf galiba; ilk yıllar böyle geçer, yan işle idare et, yılma.");
      const recentSong = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];
      if (recentSong && (K.state.day - (recentSong.publishedDay || 0)) <= 6 && U.chance(0.5))
        sit.push(`Bu arada "${recentSong.title}" yeni çıkmış, fena değil; ilk hafta dinlenmeyi desteklemek lazım.`);
      const beefTop = (K.beef && K.beef.list) ? K.beef.list().filter(b => b.heat >= 40)[0] : null;
      if (beefTop && ["generic", "market", "news", "beef", "diss"].includes(intent) && U.chance(0.6))
        sit.push(`${beefTop.artist.stageName} ile aranda gerginlik varmış; kafana takma, işine bak.`);
      /* ---- son günlük olay (incident) farkındalığı: olaylar sohbete yansısın ---- */
      if (K.state.notifications && U.chance(0.35)) {
        const note = K.state.notifications.slice(-10).reverse().find(n =>
          n && n.title && n.title.indexOf("🎲") === 0 && (K.state.day - (n.day || 0)) <= 3);
        if (note && note.msg) {
          const txt = String(note.msg).replace(/\s*—\s*karar bekliyor\.?$/, "").replace(/\s*·\s*$/, "");
          sit.push(`Bu arada gündemde "${txt}" var; sen ne düşünüyorsun?`);
        }
      }
      sit.forEach(x => extras.push(x));

      /* ---- niyet bazlı eylem / ipucu ---- */
      let action = null;
      if (intent === "feature" && stage >= 4) action = "feature_ready";
      if (intent === "hangout" && stage >= 3) action = "hangout_ready";
      if (intent === "company") {
        if (K.label.hasLabel() && stage >= 5) action = "company_ready";
        else if (!K.label.hasLabel()) action = "company_no_label";
      }

      /* ---- samimiyet etkisi ---- */
      const deltas = {
        compliment: 1.6, support: 1.8, thanks: 1.0, career: 1.2, music: 1.2,
        market: 1.0, feature: 1.4, hangout: 1.3, company: 1.0, howareyou: 1.0,
        greet: 0.9, diss: 0.8, beef: 0.7, health: 1.0, family: 0.6, news: 1.0, hard: 1.5,
        shortyes: 0.7, shortno: 0.3, bye: 0.5, generic: 0.6,
        critique: -0.4, money: 0.4,
        laugh: 1.0, insult: -0.8, flirt: -0.2, personal: 0.2, askmoney: -0.5, question: 0.8
      };
      let delta = deltas[intent] != null ? deltas[intent] : 0.6;
      delta *= (0.75 + artist.traits.openness * 0.045);
      delta *= 0.55;
      /* v10.14 — KİŞİLİK AĞIRLIĞI: aynı niyet her sanatçıda aynı puanı
         getirmemeli. Şehinşah'a boş övgü ile söz eleştirisi, wegh'e
         taklit tavsiyesi ile üretim sorusu aynı şey değil. */
      if (K.npcPersonality && K.npcPersonality.bias) delta += K.npcPersonality.bias(artistId, intent);
      if (agendaMsg) delta += 0.4;

      /* v10.29 — AKIL SAĞLIĞI: stresliyken yazdığın mesaj daha az
         samimiyet kazandırır (ters teper). Tüm bonuslardan SONRA
         uygulanır ki nihai kazancı ölçeklesin. */
      const dmMult = mdScale();
      delta *= dmMult;   // 100 streste ≈ 0,55

      /* ---- hafızayı güncelle ---- */
      chat.lastIntent = intent;
      chat.turns++;
      const pushRecent = m => { chat.recent.push(m); if (chat.recent.length > 8) chat.recent.shift(); };
      pushRecent(chosen); extras.forEach(pushRecent);

      rel.lastTopic = intent;
      rel.lastInteract = K.state.day;

      /* ---- sohbeti sürdüren kısa takip sorusu (nadir) ---- */
      if (!forcedMsgs && QUESTIONS[intent] && !/[?？]\s*$/.test(chosen) && U.chance(0.18)) {
        extras.push(U.pick(QUESTIONS[intent]));
      }

      /* ---- TEK MESAJ: fazladan cümleler aynı mesaja eklenir (spam yok) ---- */
      let msg = chosen;
      const tail = [].concat(continuityMsg ? [continuityMsg] : [], agendaMsg ? [agendaMsg] : [], extras.filter(Boolean));
      const picked = [];
      for (let i = 0; i < tail.length; i++) {
        if (picked.length >= 2) break;
        const x = tail[i];
        if (x && msg.indexOf(x) < 0 && picked.indexOf(x) < 0) picked.push(x);
      }
      if (picked.length) msg = msg + " " + picked.join(" ");

      /* ---- kişilik imzası: sanatçının kendi açılış kalıbı (nadir) ---- */
      if (K.npcPersonality && K.npcPersonality.opening && !forcedMsgs && intent !== "generic") {
        const op = K.npcPersonality.opening(artistId);
        if (op && msg.indexOf(op) !== 0 && (op.length + msg.length) < 240) msg = op + msg;
      }
      return { msgs: [msg], delta, intent, action, stressed: !!stressTone, dmMult: +dmMult.toFixed(2) };
    },

    /* -------- bağlamlı genel cevap --------
       Oyuncunun durumuna ve son konuşulan konuya bağlanır;
       saçma soru sormaz, anlamsız cümle kurmaz. */
    contextReply(artistId, text) {
      const p = K.state.player;
      const rel = K.relation(artistId);
      const chat = rel._chat = rel._chat || { recent: [], lastIntent: null, turns: 0 };
      const stage = K.stageIndexFor(rel.affinity);
      const pool = [];

      const lastSong = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];
      const age = lastSong ? (K.state.day - (lastSong.publishedDay || 0)) : 999;

      if (lastSong && age <= 21) pool.push(`Bu arada "${lastSong.title}" çıkmış, nasıl gidiyor?`);
      if (lastSong && age <= 21) pool.push(`"${lastSong.title}" dinledim; devamını bekliyorum.`);
      if (stage <= 1) pool.push("Seni yeni tanıyorum, kendinden biraz bahset.");
      if (stage <= 1) pool.push("Ne işler yapıyorsun, neyle uğraşıyorsun?");
      if (chat.lastIntent === "music") pool.push("Müzikten konuşuyorduk, stüdyo ne durumda?");
      if (chat.lastIntent === "career") pool.push("Kariyer konusuna dönelim; planın ne?");
      if ((p.popularity || 0) < 12) pool.push("İlk yıllar zordur, sabır lazım; devam et.");
      if (stage >= 4) pool.push("Anlat bakalım, ne var ne yok?");
      pool.push("Peki, sen ne düşünüyorsun bu konuda?");
      pool.push("Anladım. Devam et, dinliyorum.");

      const msg = pickFresh(pool, chat.recent);
      chat.recent.push(msg); if (chat.recent.length > 8) chat.recent.shift();
      return msg;
    },

    /* ---------------- sanatçı kendiliğinden yazarken ---------------- */
    ambient(artistId, stageIdx) {
      const a0 = K.artistById(artistId);
      /* mahalle/semt çevresi: kendi rolüne uygun kendiliğinden mesaj */
      if (a0 && a0.isContact && K.contacts) {
        const cp = K.contacts.profile(artistId);
        const rel0 = K.relation(artistId);
        const chat0 = rel0._chat = rel0._chat || { recent: [] };
        const own = (cp && cp.pool && cp.pool.generic) ? cp.pool.generic : ["Naber, ne var ne yok?"];
        return pickFresh(own, chat0.recent);
      }
      const prof = PROFILES[artistId];
      if (!prof || !prof.ambient) return null;
      const a = prof.ambient;
      const pool = stageIdx >= 4 ? a.high : stageIdx >= 2 ? a.mid : a.low;
      if (!pool || !pool.length) return null;
      const rel = K.relation(artistId);
      const chat = rel._chat = rel._chat || { recent: [] };
      const msg = pickFresh(pool, chat.recent);
      chat.recent.push(msg); if (chat.recent.length > 8) chat.recent.shift();
      return msg;
    },

    /* ---------------- başka bir şarkıya sosyal tepki metni ---------------- */
    reaction(artistId, kind, song) {
      const title = song ? song.title : "yeni iş";
      const me = K.state.player.stageName;
      const PRAISE = [
        "\"{s}\" fena olmuş, dinleyin.",
        "\"{s}\" sağlam iş, tebrikler @{p}.",
        "Bu sound hoşuma gitti; \"{s}\" iyi.",
        "@{p}'in \"{s}\" işi güzel, alkış."
      ];
      const SHADE = [
        "\"{s}\" beklediğim gibi değil ama devam.",
        "Bu sound bana uzak; \"{s}\" olmamış.",
        "Aynı tarif, \"{s}\" tekrar gibi. Farklı bir şey denemeli.",
        "@{p} yine aynı kalıp; risk alsın."
      ];
      const NEUTRAL = [
        "\"{s}\" çıkmış, dinleyin bakalım.",
        "Yeni iş \"{s}\" yayında.",
        "\"{s}\" listeye ekledim.",
        "@{p}'in yeni single'ı \"{s}\" içinizde."
      ];
      const prof = PROFILES[artistId];
      let pool = kind === "praise" ? PRAISE : kind === "shade" ? SHADE : NEUTRAL;
      /* v10.14 — sanatçının kendi yorum havuzu varsa onu kullan */
      if (prof && prof.reaction && prof.reaction[kind] && prof.reaction[kind].length) {
        pool = prof.reaction[kind];
      } else if (prof && prof.label === "argo") {
        pool = kind === "praise"
          ? ["\"{s}\" fena olmuş amına koyim, dinleyin lan.", "@{p} bu işte patlamış lan, alkış."]
          : kind === "shade"
            ? ["\"{s}\" olmamış amına koyim, boş iş.", "@{p} aynı şeyi yapıyor yine, farklı bir şey yap lan."]
            : ["\"{s}\" çıkmış lan, dinleyin bakalım.", "@{p} yeni iş atmış, bir bakın amına koyim."];
      }
      return U.pick(pool).replace(/\{s\}/g, title).replace(/\{p\}/g, me);
    },

    /* ---------------- sanatçının oyuncuya diss satırı ---------------- */
    diss(artistId, targetName) {
      const t = targetName || K.state.player.stageName;
      const BASE = [
        "@{t} diye biri varmış, sahnede göremedim.",
        "Bazıları konuşuyor ama iş yok @{t}.",
        "@{t}, flow'un taklit, sözlerin boş.",
        "Rap yapıyorsan bari doğru yap @{t}.",
        "@{t} ısınma turum bile değil.",
        "Herkes mikrofona geçince rapçi olmuyor @{t}.",
        "@{t} hype'la yaşıyor, işle değil.",
        "Sahnede görürsem cevabı hazır @{t}."
      ];
      const prof = PROFILES[artistId];
      let pool = BASE;
      /* v10.14 — sanatçının kendi diss havuzu (ör. Şehinşah sataşmaz,
         mesafeden cevap verir; wegh ise doğrudan üstüne gider). */
      if (prof && prof.diss && prof.diss.length) {
        pool = prof.diss;
      } else if (prof && prof.label === "argo") {
        pool = [
          "@{t} sen kimsin lan, ananı sikim.",
          "@{t} boş yapıyon, mikrofonu bırak.",
          "@{t} diye biri varmış amına koyim, iş yok.",
          "@{t} sana diss yazmak zaman kaybı lan.",
          "@{t} gel sahnede konuş, yoksa sus amına koyim."
        ];
      } else if (prof && prof.label === "toplumcu") {
        pool = ["@{t} laf üretiyor, gerçek yok.", "@{t} sahne al, meseleye gel, gölgede kalma."];
      } else if (prof && prof.label === "teknik") {
        pool = ["@{t} flow'un yok, kafiyen zayıf.", "@{t} pratik yap, sonra konuşalım."];
      } else if (prof && prof.label === "esprili") {
        pool = ["@{t} kanka, bu iş senin değil.", "@{t} şaka maka, diss'i bırak da iş yap."];
      }
      return U.pick(pool).replace(/\{t\}/g, t);
    },

    /* ---------------- ipucu metni ---------------- */
    hintFor(action) {
      const H = {
        feature_ready: "💡 Feature teklif etmek için aşağıdaki butonu kullanabilirsin.",
        hangout_ready: "💡 Hangout için samimiyetin yeterli — butondan davet edebilirsin.",
        company_ready: "💡 Şirket teklifi için butonu kullanabilirsin.",
        company_no_label: "💡 Sözleşme için önce kendi şirketini kurmalısın (Şirket sekmesi)."
      };
      return H[action] || "";
    }
  };
})(window.K);
