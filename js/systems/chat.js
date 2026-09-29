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
    const list = (K.REAL_SONGS && K.REAL_SONGS[artist.id]) || [];
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
  const PROFILES = {

    /* ---- LIE REFUGE → ARGO ---- */
    lierefuge: {
      label: "argo",
      selam: {
        islamic: ["Aleyküm selam lan, naber amına koyim?", "Aleyküm selam olm, iyi ki yazdın.", "Ve aleyküm selam lan. Ne var ne yok?"],
        shortIslamic: ["as lan", "as, naber amına koyim?", "as kardeşim."],
        reply: ["Eyvallah lan, sağ ol.", "as kardeşim, ne var ne yok?", "Ne demek olm."]
      },
      cold: {
        generic: ["Kimsin olm sen, siktir git.", "Tanımıyorum seni kardeşim, ne yazıyon amına koyim.", "Bana kim olduğunu bilmediğim adam yazmasın."],
        feature: ["Feature mi? Ananı sikim önce bir tanıyalım.", "Kimsin sen ya, feature istiyon bir de.", "Feature verirken arkamı sağlama alırım, sen kimsin?"],
        hangout: ["Takılmak mı? Sikimde değil, müsait değilim.", "Tanımadığım adamla takılmam amına koyim."],
        company: ["Şirket mi? Önce adam ol da gel, ananı sikim.", "Sözleşme için biraz ciddi ol."],
        insult: ["Ananı sikim sen kimsin de bana laf ediyon?", "Bir daha yazarsan ağzını bozarım amına koyim."],
        askmoney: ["Para mı? Sikeyim para işini.", "Bana para sorma olm, gerisi gelir."],
        personal: ["Sanane amına koyim.", "Özel hayatım sana mı kaldı olm?"],
        flirt: ["Yürüme olm bana.", "Saçmalama amına koyim."],
        laugh: ["Ne gülüyon olm?"],
        question: ["Ne soruyon lan?"]
      },
      pool: {
        greet: [
          "Naber olm amına koyim, iyi misin?",
          "Selam kardeşim, naber lan?",
          "Yo yo, naber amına koyim?",
          "Selam olm, yazman iyi oldu.",
          "Naber lan, kafam çok dolu bugün amına koyim.",
          "Selam, yeni iş üstünde çalışıyorum, naber?"
        ],
        howareyou: [
          "Yaşıyoruz işte amına koyim, stüdyoda iş. Sen naber?",
          "Fena değilim lan, kafam müzikte. Sen ne yapıyon?",
          "İdare ederiz amına koyim, kafam dolu ama iyiyim.",
          "İyiyim olm, kayıttayım sürekli. Sen nasılsın?",
          "Sorma lan, yorgunum ama iş güzel. Sen?"
        ],
        compliment: [
          "Eyvallah olm, sağ ol amına koyim.",
          "Sağ ol kardeşim, iyi geldi bu.",
          "Adamsın lan, teşekkür ederim.",
          "Eyvallah, desteği unutmam amına koyim."
        ],
        critique: [
          "Tamam amına koyim, eleştiriyi alıyorum. Neydi beklentin?",
          "Herkes beğenecek diye bir şey yok lan. Ama emek var.",
          "Anladım. Ben o sound'u bilerek seçtim amına koyim.",
          "Söyle bakalım neyi beğenmedin, boş laf sevmem."
        ],
        diss: [
          "Diss işi kolay değil amına koyim, adam olmak lazım.",
          "Ben sataşmam ama üstüme gelene ananı sikim cevap veririm.",
          "Rap savaşıysa gel açık söyle, subliminal sevmem.",
          "Verse atacaksan sağlam at lan."
        ],
        feature: [
          "Varım amına koyim! Beat getir, üstüne yazarım.",
          "Tamam lan, ortak bir şey yapalım. Sağlam olsun ama.",
          "Feature'e açığım kardeşim, demo yolla bakayım.",
          "Olur amına koyim, ama iş ciddi olsun."
        ],
        hangout: [
          "Olur lan, müsait olsam haber ederim amına koyim.",
          "Tamam kardeşim, bir kahve içeriz.",
          "Stüdyoya gel olm, hem bakarız hem otururuz.",
          "Varım ama program yoğun amına koyim, ayarlarız."
        ],
        company: [
          "Şirket işi ciddi amına koyim, şartları konuşalım.",
          "Label işini dinlerim ama arkanda durman lazım lan.",
          "Teklifi getir bakalım, boş sözle olmaz amına koyim.",
          "Doğru ekip olursa neden olmasın lan."
        ],
        money: [
          "Para konusu net olur amına koyim, söz verdiysem yaparım.",
          "Şartları baştan konuşalım lan, sonra sıkıntı olmasın.",
          "Bütçe varsa iş de olur amına koyim, ama ciddiyet şart.",
          "Net konuş lan, rakam söyle, ona göre bakarız."
        ],
        music: [
          "Şu aralar \"{song}\" gibi bir sound var kafamda amına koyim.",
          "Yeni işler var lan, \"{song}\" favorim. Bak istersen.",
          "\"{song}\" gibi işler yapıyorum, beat bana ait.",
          "Sürekli kayıttayım olm, \"{song}\" vibe'ında gidiyorum."
        ],
        career: [
          "Tavsiye mi? Her gün yazacaksın amına koyim, istikrar her şeyi geçer.",
          "Ben sokaktan geldim lan, kolay olmadı. Sabır işi.",
          "Kimseyi taklit etme olm, kendi sound'unu kur.",
          "Küçük başla ama bitir lan, yarım iş insanı yorar."
        ],
        market: [
          "Piyasa bozuk amına koyim, algoritma her şeyi belirliyor.",
          "Sektör acımasız lan ama dürüst üretim kazanıyor.",
          "Herkes hit peşinde, kimse albüm yapmıyor artık.",
          "Trend'i takip et ama kendini kaybetme olm."
        ],
        thanks: [
          "Rica ederim amına koyim.",
          "Lafı olmaz lan, ne demek.",
          "Eyvallah kardeşim, sağ ol sen de."
        ],
        support: [
          "Desteğin için sağ ol amına koyim, unutmam.",
          "Eyvallah lan! Sen de bir şey çıkarınca yaz, destek olurum.",
          "Sağ ol kardeşim, bu işler destekle büyür."
        ],
        bye: [
          "Görüşürüz lan, kendine dikkat et amına koyim.",
          "Hadi eyvallah, işlerinde kolay gelsin.",
          "Tamam kardeşim, sonra konuşuruz."
        ],
        shortyes: ["Aynen amına koyim.", "Tamam lan o zaman.", "Anlaştık kardeşim.", "Olur olm."],
        shortno: ["Tamam lan, saygı duyarım.", "Anladım olm, sorun yok.", "Peki amına koyim, nasıl istersen.", "Baskı yapmam lan."],
        laugh: ["Hahah amına koyim iyiydi 😄", "Güldürdün lan sağ ol.", "Şakacısın olm, sevdim.", "Haha tamam lan."],
        insult: [
          "Ananı sikim sen kimsin de bana laf ediyon?",
          "Bir daha yazarsan ağzını bozarım amına koyim.",
          "Kes sesini lan, ne konuşuyon sen?",
          "Sana bir şey mi yaptım amına koyim?"
        ],
        flirt: ["Yapma lan 😄", "Saçmalama olm, kafam müzikte."],
        personal: ["Sanane amına koyim, özel hayatımı konuşmam.", "Bunları sorma bana lan."],
        askmoney: ["Para mı? Sikeyim para işini amına koyim.", "Bana para sorma lan, gıcık olurum."],
        news: [
          "Gündem bozuk amına koyim, söze dökecek çok şey var.",
          "Haberlere bakıyorum lan, bu dünyaya rap yazılır.",
          "Gündem ağır olm, biraz da müzikle kaçıyoruz.",
          "Ne varsa sokakta iki katı var amına koyim."
        ],
        hard: [
          "Anladım lan, zor biliyorum amına koyim. Ama yıkılmak yok.",
          "Kafanı bozma olm; herkes bir gün dibi görür, kalkan kazanır.",
          "Moralin bozuksa stüdyoya gel lan, bir şey kaydederiz amına koyim.",
          "Seni anlıyorum kardeşim; tek başına değilsin, buradayım.",
          "Bunları sonra şarkıya dökersin lan, iyi malzeme olur."
        ],
        question: ["İyi soru lan.", "Sor bakalım amına koyim.", "Ne demek istiyon olm?"],
        generic: [
          "Anladım amına koyim, devam et lan.",
          "İlginç olm, açsana biraz.",
          "Haklısın lan galiba.",
          "Devam et kardeşim, dinliyorum."
        ]
      },
      suffix: [" Amına koyim ama sen iyi adamsın.", " Kafam dolu lan bugün.", " Boş yapma, iş yapalım.", " Neyse, sen bilirsin."],
      extras: ["Bu arada senin işlerini gördüm lan, fena değil.", "Yeni bir beat var, müsait olsan dinletirdim amına koyim.", "Sohbeti sevdim olm.", "Stüdyoya uğra bir ara lan."],
      ambient: {
        low: ["Naber lan amına koyim, uzun zamandır yazmıyon.", "Olm nerelerdesin, kayboldun.", "Selam, naber? Bir ses ver amına koyim."],
        mid: ["Naber olm, yeni iş var mı? Ben kayıttayım.", "Lan bir şey çıkardın mı? Merak ettim amına koyim.", "Selam kardeşim, stüdyodan çıkamıyorum."],
        high: ["Lan kardeşim seninle çalışsak fena olmaz amına koyim.", "Yeni proje var, oturup yazalım olm.", "Sana güveniyorum lan, bir iş yapalım."]
      }
    },

    /* ---- SAGOPA KAJMER → derin, sakin, karanlık ---- */
    sagopa: {
      label: "derin",
      pool: {
        greet: ["Selam. Karanlıkta da yazıyorum, ışıkta da. Dinliyorum seni.", "Merhaba. Zamanın sesiyle konuşuyorsun, otur bakalım.", "Selam. Kafam derinlerde bugün ama sana kapım açık."],
        howareyou: ["İyiyim. Kelimelerle uğraşıyorum, onlar da benimle.", "Fena değil. Gece uzun, kâğıt dolu."],
        music: ["\"{song}\" gibi işlerde her kelime bir kesik gibidir, dikkatli yazılır.", "\"{song}\" bir kapı; içinden geçen değişir."],
        career: ["Sabır, en sert beat'ten daha güçlüdür.", "Sustuğun yerde bile bir şey anlatıyorsan, yol doğru."],
        compliment: ["Teşekkür ederim. Anlayan bir kulak her şeyden kıymetli."],
        insult: ["Öfkeni anlıyorum. Ama bıçak taşıyan her el kesmez."],
        question: ["Sorunun cevabı sende saklı; ben sadece aynayı tutarım."],
        generic: ["Anladım. Biraz susup düşüneyim, sen devam et.", "Söylediklerin bir yerden tanıdık."]
      },
      suffix: [" Yazmak bir sabır işidir.", " Sözler bıçak gibi olmalı, ya keser ya korur."],
      ambient: { low: ["Selam. Bugün sessizliğimden bir satır çıkardım."], mid: ["Selam. Yeni bir metin üstünde düşünüyorum, sen ne yapıyorsun?"], high: ["Bir proje var kafamda; kelimeleri paylaşacak birini arıyorum."] }
    },

    /* ---- CEZA → teknik, mentor, enerjik ---- */
    ceza: {
      label: "teknik",
      pool: {
        greet: ["Selam! Flow hazır mı? Ben hazırım.", "Oo selam, naber? Mikrofon sıcak, gel.", "Selam kardeşim, kalem elde, kâğıt masada."],
        howareyou: ["İyiyim, sürekli yazıyorum. Kafiye avındayım.", "İdare eder, stüdyo bana iyi geliyor."],
        music: ["\"{song}\" gibi bir yapıda kafiyeler köprü olur, akış önemli.", "\"{song}\" sound'u sağlam; üstüne teknik koyarsan uçar."],
        career: ["Kalemi bırakmayacaksın; günde bir satır bile olsa yaz.", "Teknik çalış, sonra tarzın kendiliğinden gelir."],
        compliment: ["Sağ ol kardeşim, bu iş emekle büyüyor."],
        insult: ["Sakin. Kafiyeyle cevap veririm, kavgayla değil."],
        question: ["Net soru, net cevap: pratik, pratik, pratik."],
        generic: ["Anladım, devam et. Kafamda bir ritim oluştu bile."]
      },
      suffix: [" Ritim her şeyi anlatır.", " Bu iş disiplin işi."],
      ambient: { low: ["Selam! Bir kafiye buldum, kafamda dönüyor."], mid: ["Naber? Yeni iş üstünde çalışıyorum, ses ver."], high: ["Kardeşim bir iş yapalım, teknik olarak sağlam çıkar."] }
    },

    /* ---- ŞEHİNŞAH → şifreli, gece, gizemli ---- */
    /* ============================================================
       ŞEHİNŞAH — GERÇEK KİŞİLİK (v10.12)
       Kaynak: Milliyet/Molatik röportajı (2018) ve Wikipedia.
       Konuşma tarzı, "gizemli/karanlık" klişesinden UZAK:
         • SAKİN ve ÖLÇÜLÜ: uzun, düzgün cümleler kurar; küfür etmez.
           ("durumu ajite ederek basit bir kavgadan prim yapmaya çalıştı")
         • SAMİMİYET ve ZANAAT vurgusu: "içindeki sıcaklık ve samimiyeti
           sevmem", "hem teknik hem taktik hem de manevi bir bütünlük"
         • MEMLEKETSİZ kimlik: savcı çocuğu, tayinler yüzünden
           Erzincan–Giresun–İzmir–İstanbul; "biraz memleketsiz bir rapçiyim"
         • BABA: oğlu Atlas — en duygusal olduğu konu
         • PUNK/METAL + graffiti + b-boy geçmişi, çizgi roman çizerliği
         • İSMİN ANLAMI: "kralların kralı" — lise edebiyat kitabının
           arkasındaki sözlükten bulmuş
         • DURUŞ: "Rap bir karşı duruştur"
         • GENİŞ BAKIŞ: yaş aldıkça sevmediği müziklerin neden sevildiğini
           anlamaya başladığını söyler; kendi zevkini dayatmaz
         • HEDEF: "emeğimin saygı gördüğü yer"
         • İLETİŞİM: "rap dünyası hiç bu kadar yakın olmadı… daha fazla
           iletişime ihtiyacımız var"
         • HAFİF MİZAH: kendini yerebilir ("birazcık da kız tavlamak için")
       ============================================================ */
    sehinsah: {
      label: "olgun",
      selam: {
        islamic: ["Aleyküm selam. Sağ ol, sen de iyi bak.", "Ve aleyküm selam, iyi ki yazdın.", "Aleyküm selam kardeşim."],
        shortIslamic: ["as", "Aleyküm selam."],
        reply: ["Eyvallah, sağ ol.", "Rica ederim.", "Sen de iyi bak."]
      },
      pool: {
        greet: [
          "Selam. Yazman iyi oldu, bu ara kafam müzikte.",
          "Selam kardeşim. Bugün stüdyoda kaldım, yeni çıktım.",
          "Selam. Biraz dağınık bir dönem, kusura bakma.",
          "Selamlar. Sana da vakit ayırırım, buyur."
        ],
        howareyou: [
          "İyiyim. Sabah stüdyo, akşam oğlum. Düzen bu şekilde oturdu.",
          "Fena değil. Yazıyorum sürekli, kafam kalabalık ama iyi kalabalık.",
          "İdare eder. Yaş aldıkça bazı şeyleri daha sakin karşılıyorum.",
          "İyiyim kardeşim. Sen nasılsın, işler nasıl gidiyor?"
        ],
        music: [
          "\"{song}\" üzerinde epey çalıştım. Teknik ve manevi olarak bir bütünlük istiyorum.",
          "\"{song}\" bir meseleyi anlatıyor. Dinleyen kendinden bir şey bulsun istedim.",
          "\"{song}\" — sözü yazarken kendi kıstaslarımla ilerledim, hazır hissetmeden çıkarmam.",
          "Müzikte samimiyetin önemli olduğunu düşünüyorum; \"{song}\" o yüzden bu hâlde."
        ],
        career: [
          "İlk yıllar kimse dinlemiyor, normal. Ben de lisede birkaç kez atıldım, sonra devam ettim.",
          "Oku ama sokağı da yaşa. Söz sokaktaki dili almazsa kimseye geçmez.",
          "Taklit etme. Kendi yaşam biçimini anlat, samimi olan kalıyor.",
          "Rap bir karşı duruştur. Sanat da öyle. Acele etme, oturur."
        ],
        compliment: [
          "Teşekkür ederim. Bunu duymak güzel, gerçekten.",
          "Sağ ol. İnsanların kendinden bir şey bulması benim için önemli.",
          "Eyvallah. Elimden geleni yapmaya devam ediyorum."
        ],
        critique: [
          "Anlıyorum. Eleştiri de bir dönüş, kırılmam.",
          "Haklı olabilirsin. Bazen duymak istemediğim şeyler daha çok işe yarıyor.",
          "Aldım notumu. Bir sonraki işte bakacağım."
        ],
        insult: [
          "Sakin ol. Ben kimseyle kavgayla konuşmam, sözle konuşurum.",
          "Öfkeni anlıyorum ama bu şekilde bir şey çıkmaz.",
          "Gerek yok. Konuşmak istersen konuşuruz."
        ],
        diss: [
          "O işler benden geçti. Ben işime bakarım.",
          "Ben sataşmam. Söyleyeceğim şey varsa kayıtta söylerim.",
          "Sahne sırası değil bu. Herkes işini yapsın."
        ],
        money: [
          "Para konusu konuşulur ama önce iş konuşulur. Sırası öyle.",
          "Maddi taraf dert değil, yeter ki yapılan iş saygı görsün.",
          "Bu tür konuları menajerle ilerletiyorum ama sana dürüst olurum."
        ],
        feature: [
          "Ortak iş ciddi iş. Önce duyayım, sonra oturur konuşuruz.",
          "Beraber bir şey yapacaksak ikimizin de içine sinmeli.",
          "Bir demo gönder, dinleyeyim. Söz vermiyorum ama bakarım."
        ],
        hangout: [
          "Stüdyoda olurum genelde. Müsait bir gün otururuz.",
          "Olur. Çok kalabalık ortamları sevmiyorum, sakin bir yer olsun.",
          "Biraz planlı gitmem gerekiyor, oğlumla vakit önemli."
        ],
        company: [
          "Şirket tarafı benim işim değil, işi konuşalım.",
          "Sözleşme konuşulacaksa şartları açık olsun, ben dürüstlük ararım.",
          "İmza atmadan önce neden imzaladığımı bilmek isterim."
        ],
        family: [
          "Oğlum Atlas. Ona baktığımda başka hiçbir şey düşünmüyorum.",
          "Babalık bambaşka bir şey. Kalbimin bir köşesinde duruyor.",
          "Aileme zaman ayırmak benim için pazarlık konusu değil."
        ],
        personal: [
          "Asıl adım Ufuk Yıkılmaz. Sahne adını lise edebiyat kitabının arkasındaki sözlükten buldum.",
          "\"Şehinşah\" kralların kralı demek. Anlamı hoşuma gitti.",
          "Tayinler yüzünden çok şehir gezdim: Erzincan, Giresun, İzmir… biraz memleketsiz bir rapçiyim.",
          "Özel hayatımı çok açmıyorum ama sorduğun şeyi cevaplarım."
        ],
        health: [
          "Uyku düzenim bozuk, doğru. Gece çalışmak bana iyi geliyor.",
          "Yorgunum ama iyi yorgunluk. Üretmek böyle bir şey."
        ],
        hard: [
          "Zor dönemler olur. Zor dönemde yaptığın şeyler de sana kalır, dikkat et.",
          "Bir dönem benim de kontrolü kaybettiğim oldu. Geçiyor ama iz bırakıyor.",
          "Yazmaya devam et. Kafayı toplamanın en temiz yolu bu."
        ],
        market: [
          "Rap içe dönüktü, şimdi dışa dönük konuşuyor. İnsanlar empati kuruyor.",
          "Pop kültürüne kayarsa rap de rock gibi elinden alınır. Kendi özünü koruması lazım.",
          "Yeni nesil işine daha hakim, çünkü bunun içine doğdular. Biz sonradan nail olduk.",
          "Rapçi topluma, toplum rapçiye birer adım yaklaştı. Bunu kaybetmemek lazım."
        ],
        news: [
          "Gündemi takip ediyorum ama söyleyeceğim şeyi kayıtta söylerim.",
          "Her şey hakkında konuşmam. Konuşacaksam altyapısı olur."
        ],
        beef: [
          "Yaş aldıkça insanların neden sevdiğini anlamaya başladım. Kimseyi küçümsemiyorum.",
          "Kendi zevkimi dayatmam. İyi yapıyorsa iyidir.",
          "Sataşma işi değil bu. Ben işime bakarım."
        ],
        askmoney: [
          "Borç işine girmem, kusura bakma. Ama iş konuşursak otururuz.",
          "Para meselesi yürümez aramızda. Emeğin karşılığı ayrı şey."
        ],
        flirt: [
          "Öyle bir yer değil burası. İşimize bakalım.",
          "Teşekkür ederim ama konuyu müzikte tutalım."
        ],

        thanks: ["Rica ederim. İyi ki yazdın.", "Ne demek, sözün kıymetli.", "Eyvallah. Bunu hatırlarım."],
        laugh: ["Güldüm, iyi geldi.", "Ha, o da ayrı bir mevzu."],
        question: [
          "Sorunun cevabı var ama biraz uzun. Kısaltayım.",
          "Anladım. Şöyle anlatayım…",
          "İyi soru. Ben de zamanında bunu düşünmüştüm."
        ],
        support: [
          "Teşekkürler. Destek her zaman kıymetli.",
          "Sağ ol. Bunu hatırlarım."
        ],
        bye: ["Görüşürüz. Kendine iyi bak.", "Kolay gelsin kardeşim."],
        generic: [
          "Anladım. Düşüneyim, sana dönerim.",
          "Olabilir. Biraz daha açarsan net konuşurum.",
          "Peki. Ben söylediklerimi ciddiye alırım, sen de al."
        ]
      },
      suffix: [
        " Yazmaya devam et.",
        " Aceleye gelmesin, oturur.",
        " Samimi olan kalıyor."
      ],
      ambient: {
        low: [
          "Selam. Bugün stüdyoda kaldım, aklımdan geçenleri yazdım.",
          "Selam, bir süredir adını görüyorum. Nasıl gidiyor?"
        ],
        mid: [
          "Yeni bir metin üstünde çalışıyorum. Teknik de oturuyor gibi.",
          "Oğlumla vakit geçirdikten sonra stüdyoya dönmek daha kolay oluyor, iyi geliyor.",
          "Bazen bir şey yazıyorum, sonra siliyorum. Hazır olmayınca çıkmaz."
        ],
        high: [
          "Bir iş var kafamda, daha kimseye açmadım. Sana söylüyorum çünkü anlarsın.",
          "Bu parça üzerinde epey düşündüm. Çıktığında konuşuruz."
        ]
      },
      cold: {
        generic: ["Tanıdık gelmiyorsun. Sen kimsin?", "Yoğunum, sonra bakarım."],
        feature: ["Ortak iş için önce bir tanışalım, acele etmiyorum.", "Demo gönder, dinleyeyim. Söz vermiyorum."],
        money: ["Para konuşmadan önce iş konuşulur."],
        personal: ["Bunları henüz konuşacak seviyede değiliz.", "Bu soru biraz erken."],
        insult: ["Gerek yok buna."],
        flirt: ["Öyle bir şey yok."]
      },
      /* v10.14 — kişilik çizgisi: boş övgü ve kibir onu iter, söz emeği çeker */
      extras: [
        "Söylediğini düşünüp cevap verdim, öylesine yazmam.",
        "Bu iş emek istiyor, biliyorsun.",
        "Yaz, sil, yeniden yaz. Başka yolu yok.",
        "Ben kelimeyi tartarım, sen de tart."
      ],
      followup: {
        feature: {
          yes: ["Tamam. O zaman beat'i bana yolla, sözü ben kurarım.", "Peki. Ama iş iyi olacaksa yaparım, acele yok."],
          no: ["Anladım. Hazır değilsen zorlamayalım.", "Olur. Kendi zamanınca gel."]
        },
        music: {
          yes: ["Peki. Bir şey dinleteceğim, kulak vereceksin.", "Tamam. Bitmiş hâlini duy, öyle konuşalım."],
          no: ["Olur. Herkesin kendi damarı var.", "Anladım, sen bilirsin."]
        },
        career: {
          yes: ["İyi. Bugün bir satır yaz, yarın bir satır daha.", "Doğru kafa. Sabır bu işin yarısı."],
          no: ["Peki. Yolu kendin bulacaksan da kapım açık.", "Anladım. Acele etme, oturur."]
        }
      },
      /* sosyal medya yorumu — mistik/ölçülü ton */
      reaction: {
        praise: [
          "\"{s}\" sağlam iş. Söz oturmuş, tebrikler @{p}.",
          "\"{s}\" dinledim. Kalemin işini görmüş, saygı.",
          "\"{s}\" üzerinde durulmuş, belli oluyor."
        ],
        shade: [
          "\"{s}\" fena değil ama sözün ağırlığı eksik.",
          "\"{s}\" güzel kayıt; anlattığı şey daha derin olabilirdi.",
          "\"{s}\" dinledim. Sound tamam, mesele yarım."
        ],
        neutral: [
          "\"{s}\" yayında. Dinleyin, kararı siz verin.",
          "@{p} yeni iş çıkarmış, bir kulağınızı verin."
        ]
      },
      /* diss — o kültüre girmez, mesafeden cevap verir */
      diss: [
        "@{t} konuşuyor ama sözü yok. Buna cevap harcamam.",
        "@{t} için kelime yakmam. Kayıtta anlatırım.",
        "@{t} sahneye çıksın, orada konuşuruz.",
        "Herkes bağırıyor @{t}; bir satır yazsın, gerisi gelir."
      ]
    },

    /* ==========================================================
       v10.14 — WEGH RUMI (weghrumi)
       Oyunun iki amiral sanatçısından biri artık KENDİ ağzına
       sahip. Öncesinde yalnızca `VOICE_BY_ID` içinde 6 gönderi
       satırı vardı; DM'de ise tamamen tür havuzundan (trap)
       konuşuyordu — yani UZI ile aynı cümleleri kuruyordu.

       Kişilik: hızlı karar, kısa cümle, üretim takıntısı,
       bağımsızlık vurgusu, özel hayatta ketumluk.
       ========================================================== */
    weghrumi: {
      label: "genc",
      selam: {
        islamic: ["Aleyküm selam. Nabersin?", "Aleyküm selam, iyi ki yazdın.", "Ve aleyküm selam kardeşim."],
        shortIslamic: ["as", "as, naber?"],
        reply: ["Eyvallah.", "Sağ ol, sen de iyi bak.", "Ne demek."]
      },
      pool: {
        greet: [
          "Selam, naber? Kayıttaydım, yeni çıktım.",
          "Oo selam. İyi ki yazdın, kafam doluydu.",
          "Selam. Bu aralar mix'le uğraşıyorum, sen naber?",
          "Naber? Bugün stüdyo uzadı yine."
        ],
        howareyou: [
          "İyiyim, sürekli kayıt. Sen naber?",
          "Fena değil, gece çalışıyorum. Sen ne yapıyorsun?",
          "İdare eder, sound oturuyor yavaş yavaş. Sen?",
          "Şükür. Yoğunum ama iyi yoğunluk."
        ],
        music: [
          "\"{song}\" üstünde çok uğraştım; mix oturmasa çıkmıyor.",
          "\"{song}\" benim işim; melodiyi de kendim kurdum.",
          "\"{song}\" için prodüksiyonu baştan aşağı elden geçirdim.",
          "Yeni bir şey var ama erken konuşmayacağım; \"{song}\" gibi olmasını istemiyorum."
        ],
        feature: [
          "Ortak iş olur, ama sound uyuşacak. Demo yolla.",
          "Feature veririm, şartı: ikimiz de aynı beat'te rahat olacağız.",
          "Oturalım. Ben beat'i kurarım, sen sözü getir."
        ],
        career: [
          "Kendi sound'unu kurmadan kimse seni hatırlamıyor.",
          "Yıl içinde çok şey çıkar; bir tanesi kalır, o seni taşır.",
          "Bekleme. Kayıt yap, at, tekrar yap.",
          "Bağımsız kalmak zor ama kontrol sende oluyor."
        ],
        market: [
          "Piyasa hızlı; kısa içerik şarkıyı yiyor.",
          "Artık sound tek başına yetmiyor, görüntü de iş.",
          "Yeni kuşak işini kendi kuruyor, aracıya ihtiyaç azaldı.",
          "Algoritma kısa istiyor; ben yine de bütün şarkı yapıyorum."
        ],
        compliment: [
          "Eyvallah kardeşim, sağ ol.",
          "Teşekkür ederim, desteği unutmam.",
          "Sağ ol. Böyle şeyler çalışmaya itiyor."
        ],
        critique: [
          "Tamam, neyini sevmedin? Söyle, bakayım.",
          "Eleştiri alırım. Somut söylersen daha çok işe yarar.",
          "Notumu aldım. Bir sonraki işte duyarsın."
        ],
        insult: [
          "Sakin ol. Konuşacaksan konuş, bağıracaksan kapıyı gösteririm.",
          "Bu tonla bir yere varılmıyor, biliyorsun.",
          "Sen kimsin de bana bunu yazıyorsun?"
        ],
        diss: [
          "Sataşma işi değil bu. İş yaparsa cevabı kayıtta veririm.",
          "Diss yazmak isteyen yazsın; ben mix yapıyorum.",
          "Ben kayıtla konuşuyorum, kulisle değil."
        ],
        money: [
          "Bütçe işin başında konuşulur, sonunda değil.",
          "Para konuşulur ama iş netse konuşulur.",
          "Maddi tarafı menajerle yürütürüm ama dürüst olurum."
        ],
        hangout: [
          "Olur, stüdyoda olurum zaten. Gel çal.",
          "Müsait olursam otururuz. Kalabalık yer sevmiyorum.",
          "Bu hafta kayıt var; sonraki hafta bakalım."
        ],
        company: [
          "Sözleşme mi? Şartlar netse otururuz.",
          "Bağımsız kalıyorum ama iyi teklife kapalı değilim.",
          "Önce ne verdiğini söyle, sonra ne aldığını."
        ],
        family: [
          "Aile tarafını konuşmam. Benim tarafım orası.",
          "O konu bende kapalı, kusura bakma."
        ],
        personal: [
          "Özel hayatımı açmıyorum. İş konuşalım.",
          "Bunu sormaya kimsenin hakkı yok, kusura bakma.",
          "Rize'liyim, 2000 doğumluyum. Gerisi bende kalsın."
        ],
        health: [
          "Gece düzenim bozuk ama ses iyi, idare eder.",
          "Yorgunum ama iyi yorgunluk; kayıt bitince geçer."
        ],
        hard: [
          "Zor dönemde yazdığın şey en iyi şarkın olur, sıkı dur.",
          "Bir dönem ben de dibi gördüm. Kayıt kurtardı beni, yaz.",
          "Yalnız değilsin, bu iş böyle geçiyor."
        ],
        news: [
          "Gündemi takip ediyorum ama her şeye yorum yapmam.",
          "Sözüm varsa kayıtta söylerim, kulis lafı sevmem."
        ],
        beef: [
          "Bazıları tartışmadan ekmek yiyor, saygı duyarım ama ben o işte yokum.",
          "İyi yapıyorsa iyidir; kimseye düşman değilim."
        ],
        askmoney: [
          "Borç işine girmem kardeşim. İş konuşursak olur.",
          "Para meselesi aramızda yürümez."
        ],
        flirt: [
          "Bu tarafa gitmeyelim. Müzik konuşalım.",
          "Sağ ol ama konuyu işte tutalım."
        ],
        thanks: ["Eyvallah kardeşim.", "Ne demek, ben teşekkür ederim.", "Sağ ol, desteği unutmam."],
        laugh: ["Ha, o iyiydi 😄", "Güldük biraz, iyi geldi."],
        question: [
          "Kısa cevap: evet. Uzun cevap istersen anlatırım.",
          "Sorunun net, cevabı da net olsun.",
          "İyi soru, bunu ben de düşündüm."
        ],
        support: [
          "Sağ ol, desteği unutmam.",
          "Eyvallah kardeşim, gerçekten kıymetli."
        ],
        bye: ["Görüşürüz.", "Kolay gelsin, kayıtta görüşürüz."],
        generic: [
          "Anladım. Net konuşursan net cevap veririm.",
          "Tamam, devam et. Dinliyorum.",
          "Bunu bir düşüneyim, sana dönerim."
        ]
      },
      suffix: [
        " Kayıtta konuşuruz.",
        " Sound'u kendin kur.",
        " Acele işe şeytan karışır."
      ],
      ambient: {
        low: [
          "Selam, kayıttan çıktım. Sen nasılsın?",
          "Naber? Adını görüyorum bir süredir, işler nasıl?"
        ],
        mid: [
          "Yeni bir şey var, mix aşamasında. Sonra dinletirim.",
          "Bugün beat'e oturdum, kafamda bir şey var ama erken.",
          "Rize'den İstanbul'a gelmişim, hâlâ kayıtla uğraşıyorum."
        ],
        high: [
          "Bir iş var; dinleyen ilk kişi sen olacaksın.",
          "Bu projeyi sana açarım, kafanı seviyorum."
        ]
      },
      cold: {
        generic: ["Kimsin kardeşim? Bir sürü mesaj geliyor.", "Yoğunum, sonra bakarım."],
        feature: ["Önce bir demo duyayım, ondan sonra konuşuruz.", "Feature istiyorsun ama ben sound'u tanımadım daha."],
        money: ["Bütçe netse konuşulur, yoksa erken."],
        personal: ["Özel hayatı konuşmam, tanımıyorum seni.", "Bu soru erken."],
        insult: ["Bu ton bana değil, başkasına."],
        flirt: ["Gerek yok."]
      },
      extras: [
        "Bu arada senin işlerine de bakıyorum, gözüm üstünde.",
        "İş yaparsan bana yolla, dinlerim.",
        "Sound'u kendin kur, gerisi gelir.",
        "Kalabalık ortamlarda takılmam; stüdyoda görüşürüz."
      ],
      followup: {
        feature: {
          yes: ["Tamam. Demo'yu yolla, beat'i ben kurarım.", "Olur. Aynı odada oturalım, telefonda olmaz."],
          no: ["Peki, kendi işine bak. Hazır olunca yaz.", "Anladım, zorlamam."]
        },
        music: {
          yes: ["Süper. Mix bitince ilk sana atacağım.", "Tamam, dinleteceğim; kulak kesil."],
          no: ["Olur, herkesin damarı ayrı.", "Anladım."]
        },
        career: {
          yes: ["İşte bu. Bugün bir kayıt al, at.", "Doğru. Yıl içinde çok şey çıkar, bir tanesi kalır."],
          no: ["Tamam, kendi yolun.", "Anladım, acele etme."]
        }
      },
      reaction: {
        praise: [
          "\"{s}\" sağlam olmuş, mix de oturmuş 🔥",
          "\"{s}\" iş yapar @{p}, dinleyin.",
          "\"{s}\" için @{p} sound'u kurmuş, tebrikler."
        ],
        shade: [
          "\"{s}\" olmamış; sound aynı yerde duruyor.",
          "\"{s}\" dinledim. Kısa içerik için iyi, şarkı için zayıf.",
          "\"{s}\" için @{p} aynı kalıbı dönüyor; risk alsın."
        ],
        neutral: [
          "\"{s}\" çıktı, dinleyin.",
          "@{p} yeni iş atmış, bir bakın."
        ]
      },
      diss: [
        "@{t} sen kimsin? Kayıtta konuş, kulisle değil.",
        "@{t} flow taklit, sound ödünç. Kendine iş bul.",
        "@{t} mikrofonu bıraksın, mix öğrensin.",
        "@{t} için tek satır ayırmam; beat'e yazık."
      ]
    },

    /* ---- NORM ENDER → ilkeli, eleştirel, öğretici ---- */
    normender: {
      label: "ilkeli",
      pool: {
        greet: ["Selam. İşine saygı duyarım, öyle konuşalım.", "Merhaba. Boş laf değil, iş konuşalım."],
        howareyou: ["İyiyim. Yazıyorum, eleştiriyorum, devam ediyorum."],
        music: ["\"{song}\" gibi işlerde temel sağlamsa üstü yürür.", "\"{song}\" sağlam ama prodüksiyon daha net olabilir."],
        career: ["Temeli sağlam kurmadan yükselen, yolda kalır.", "Kendine yatırım yap; taklit en büyük tuzaktır."],
        compliment: ["Sağ ol. Ama övgüyle şişmeyelim, iş konuşalım."],
        insult: ["Kırıcı olma. Eleştirin varsa söyle, dinlerim."],
        question: ["Soru güzel. Cevap: çalış ve sabret."],
        generic: ["Anladım. Bu konuyu biraz daha açar mısın?"]
      },
      suffix: [" Kalite tesadüf değildir.", " Sağlam dur, gerisi gelir."],
      ambient: { low: ["Selam. Sektör hakkında bir yazı üstünde çalışıyorum."], mid: ["Naber? Yeni işler var, müsait olunca bak."], high: ["Bir proje var; ciddi bakarsan konuşuruz."] }
    },

    /* ---- BLOK3 → genç, enerjik, kanka, hype ---- */
    blok3: {
      label: "genç",
      pool: {
        greet: ["Yiaa naber kanka, patladın mı yine?", "Selam kanka, trend oldun mu bakalım?", "Oo kanka naber, enerji yüksek mi?"],
        howareyou: ["İyiyim kanka, stüdyo full. Sen naber?", "Fena değil kanka, yeni iş üstünde çalışıyorum."],
        music: ["\"{song}\" kanka fena, TikTok'ta döner bu.", "\"{song}\" sağlam, kanca at bu tarafa."],
        career: ["Kanka sürekli içerik üret, görünür ol.", "Trendi yakala ama kendini kaybetme kanka."],
        compliment: ["Eyvallah kanka, adamsın!", "Sağ ol kanka, sen de patlıyorsun."],
        insult: ["Kanka sakin ol ya, boş yapma."],
        question: ["Kanka net soruyon mu? 😄"],
        generic: ["Anladım kanka, devam et."]
      },
      suffix: [" Kanka bu iş yürür.", " Enerji yüksek tut!", " Trend bu iş."],
      ambient: { low: ["Kanka naber, kayboldun ya. Trend oldun mu yoksa?"], mid: ["Kanka yeni iş var mı? Snippet atsana."], high: ["Kanka bir iş yapalım, birlikte patlar bu."] }
    },

    /* ---- BEN FERO → esprili, akıcı, samimi ---- */
    benfero: {
      label: "esprili",
      pool: {
        greet: ["Selam moruk, naber? Şaka maka iyi gidiyorsun.", "Oo naber, flow nasıl bugün?"],
        howareyou: ["İyiyim moruk, kafa rahat, flow yerinde.", "İdare eder, çay demler gibi yazıyorum."],
        music: ["\"{song}\" fena olmuş, üstüne back-vokal koysan patlar.", "\"{song}\" sağlam, akışı sevdim."],
        career: ["Teknik çalış kardeşim, flow gelişir; kısa yollar tuzak.", "Sabır ve akış, ikisi de lazım."],
        compliment: ["Sağ ol moruk, güzel moral oldu."],
        insult: ["Şaka bir yana, sert konuşuyon ama tamam."],
        generic: ["Anladım moruk, oradan devam edelim."]
      },
      suffix: [" Akışa güven.", " Moruk bu iş böyle."],
      ambient: { low: ["Selam moruk, ne yazıyorsun bu aralar?"], mid: ["Naber moruk? Yeni iş var mı?"], high: ["Bir iş yapalım moruk, akış uyar."] }
    },

    /* ---- HADİSE → pop diva, sıcak, medya ---- */
    hadise: {
      label: "diva",
      pool: {
        greet: ["Helloo! Nasılsın tatlım? 😍", "Selam canım! Seni görmek güzel.", "Merhaba balım, neler yapıyorsun?"],
        howareyou: ["İyiyim canım, çok yoğunum ama mutluyum! Sen nasılsın?"],
        music: ["\"{song}\" harika! Biraz sahne şovu eklersen uçar.", "\"{song}\" çok iyi canım, klibi nasıl olacak?"],
        career: ["Bu iş hem ses hem sahne hem disiplin, üçü bir arada.", "Kendine yatırım yap, kitleyle de bağ kur."],
        compliment: ["Ayy teşekkür ederim tatlım, çok naziksin! 💜"],
        insult: ["Oyy, üzülürüm ama yine de saygıyla konuşalım."],
        generic: ["Anladım canım, bunu konuşalım. ✨"]
      },
      suffix: [" Sahne ışıkları seni bekler ✨", " Bu iş biraz şov ister canım."],
      ambient: { low: ["Selam canım! Nerelerdesin, özledim 💕"], mid: ["Bir şeyler üstünde çalışıyorum, sen ne yapıyorsun tatlım?"], high: ["Canım bir iş yapalım, birlikte şahane olur ✨"] }
    },

    /* ---- MOTIVE → melodik, sakin, akıcı ---- */
    motive: {
      label: "melodik",
      pool: {
        greet: ["Naber kardeşim, sakin kafayla yazıyorum bugün.", "Selam, melodi kafamda dönüyor yine."],
        howareyou: ["İyiyim, session'dayım. Melodi hiç susmuyor."],
        music: ["\"{song}\" gibi melodik gitmek lazım, sadeliğinde güç var.", "\"{song}\" sağlam; nakaratı daha yumuşak yap."],
        career: ["Kendi sound'unu bul, sonra onu işle."],
        compliment: ["Sağ ol kardeşim, güzel oldu."],
        insult: ["Olur öyle, sakin. Melodiyle cevap veririm."],
        generic: ["Anladım, kafamda bir melodi oluştu bile."]
      },
      suffix: [" Melodi kalır.", " Sakinlik de bir tarzdır."],
      ambient: { low: ["Selam, yeni bir melodi üstünde çalışıyorum."], mid: ["Naber kardeşim, session nasıl gidiyor?"], high: ["Bir iş var kafamda, düet sağlam olur."] }
    },

    /* ---- GAZAPİZM → toplumcu, ciddi, öfkeli ---- */
    gazapizm: {
      label: "toplumcu",
      pool: {
        greet: ["Selam. Sokak ne diyorsa onu yazarım.", "Merhaba. Gündem ağır, söz de ağır olmalı."],
        howareyou: ["İyiyim. Ama dışarıda işler iyi değil, onu düşünüyorum."],
        music: ["\"{song}\" gibi işlerde gerçek bir mesele olmalı içinde.", "\"{song}\" sağlam; ama biraz daha sert söyleyebilirsin."],
        career: ["Bu iş para için değil, ses çıkarmak için.", "Kimseye eğilme, sözünü söyle."],
        compliment: ["Sağ ol. Anlamak, beğenmekten daha kıymetli."],
        insult: ["Öfkeni anlıyorum; aynı taraftayız belki."],
        news: ["Haberler kanıt, sokak tanık.", "Haberde ne varsa, şarkıda iki katı olur."],
        generic: ["Anladım. Bu mesele büyük, doğru yazalım."]
      },
      suffix: [" Gerçeği yaz, gerisi gelir.", " Susmak da bir taraf tutmaktır."],
      ambient: { low: ["Selam. Gündem ağır, sen ne yapıyorsun?"], mid: ["Yeni bir metin üstünde çalışıyorum, konu ağır."], high: ["Bir iş yapalım; mesele büyük, ses gür çıkmalı."] }
    },

    /* ---- JOKER → rekabetçi, keskin, teknik ---- */
    joker: {
      label: "rekabetçi",
      pool: {
        greet: ["Selam. Mikrofonu kap, kafiyeleri getir.", "Oo selam. Bugün kelime savaşı var, hazır mısın?"],
        howareyou: ["İyiyim. Sürekli antrenmandayım, kelimelerle."],
        music: ["\"{song}\" iyi; ama kelime oyunu eksik, onu koyarsan çöker piyasa.", "\"{song}\" sağlam, teknik yükselt."],
        diss: ["Diss mi? Kelime oyunuyla çökerim, kalemim keskin.", "Sataşan olursa cevabı hazır, verse disiplinlidir."],
        career: ["Her gün pratik, yoksa geride kalırsın.", "Rekabet seni büyütür, kaçma."],
        compliment: ["Sağ ol. Ama tavan yok, daha iyisi var."],
        insult: ["Ha! Bu sözleri satırda kullanırım."],
        generic: ["Anladım. Bunu bir bar'a çeviririm, iyi malzeme."]
      },
      suffix: [" Kalem keskin olsun.", " Tavan yok, sadece tavan arası."],
      ambient: { low: ["Selam. Pratik yapıyor musun, yoksa geride mi kalıyorsun?"], mid: ["Naber? Yeni bir bar yazdım, kafamı yiyor."], high: ["Bir iş yapalım; teknik olarak birbirimizi iteriz."] }
    }
  };

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
        return { msgs: [msg], delta: 0.9, intent: "greet", action: null };
      }

      const intent0 = classify(text);
      const cold = reach < 0.22 && intent0 !== "shortno";

      /* --- seni tanımıyorsa soğuk, kısa cevap --- */
      if (cold) {
        const pool = coldFor(intent0, prof);
        const msg = pickFresh(pool, chat.recent);
        chat.recent.push(msg); if (chat.recent.length > 6) chat.recent.shift();
        chat.turns++;
        return { msgs: [msg], delta: 0.15, intent: intent0, action: null, cold: true };
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
      if (K.personality && K.personality.bias) delta += K.personality.bias(artistId, intent);
      if (agendaMsg) delta += 0.4;

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
      if (K.personality && K.personality.opening && !forcedMsgs && intent !== "generic") {
        const op = K.personality.opening(artistId);
        if (op && msg.indexOf(op) !== 0 && (op.length + msg.length) < 240) msg = op + msg;
      }
      return { msgs: [msg], delta, intent, action };
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
