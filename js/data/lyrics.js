/* ============================================================
   KARMA — data/lyrics.js
   SÖZ ATÖLYESİ: bölüm yapısı + kafiye motoru + lirikal açı +
   tema bazlı satır havuzları.

   BÖLÜMLER: Intro · Verse · Hook · Chorus · Bridge · Outro
   KAFİYE: satır sonu sesleri gruplanır (AABB, ABAB, AAAA...) ve
   "kafiye yoğunluğu" hesaplanır.
   AÇI: sözlerin tonu (melankolik, agresif, samimi, epik, hikâye...).
   ============================================================ */
(function (K) {
  "use strict";

  /* mode:
       single  → yapıda tek geçiş (intro/köprü/outro/hook)
       indexed → her geçiş ayrı söz (Verse 1 / Verse 2 …)
       shared  → bütün geçişler aynı sözü paylaşır (nakarat)
     v10.41 — şarkı biçimi (song structure) bu modlara dayanır. */
  K.LYRIC_SECTIONS = [
    { id: "intro",     name: "Intro",       icon: "🎬", lines: 2, mode: "single",  hint: "Atmosfer kur; kısa ve güçlü." },
    { id: "verse",     name: "Verse",       icon: "📝", lines: 4, mode: "indexed", hint: "Ana hikâye; en yoğun bölüm." },
    { id: "prechorus", name: "Pre-Nakarat", icon: "⤴️", lines: 2, mode: "indexed", hint: "Nakarata tırmanış." },
    { id: "hook",      name: "Hook",        icon: "🪝", lines: 2, mode: "shared",  hint: "Akılda kalan cümle." },
    { id: "chorus",    name: "Nakarat",     icon: "🔁", lines: 4, mode: "shared",  hint: "Tekrarlanan nakarat." },
    { id: "bridge",    name: "Köprü",       icon: "🌉", lines: 2, mode: "single",  hint: "Kırılma noktası." },
    { id: "outro",     name: "Outro",       icon: "🎞️", lines: 2, mode: "single",  hint: "Kapanış." }
  ];
  K.lyricSectionById = function (id) {
    return K.LYRIC_SECTIONS.find(s => s.id === id) || K.LYRIC_SECTIONS[1];
  };

  /* ---------------- LİRİKAL AÇI ---------------- */
  K.LYRIC_ANGLES = [
    { id: "melankolik", name: "Melankolik", icon: "🌧️", words: ["gece", "yalnız", "boşluk", "sızı", "kayıp", "hüzün", "ağla", "sessiz", "sis", "yağmur", "yara", "bekle"] },
    { id: "agresif",    name: "Agresif",    icon: "🔥", words: ["savaş", "yık", "patla", "sert", "düşman", "yumruk", "bağır", "vur", "güç", "bedel", "boyun"] },
    { id: "samimi",     name: "Samimi",     icon: "🤝", words: ["kardeş", "anne", "mahalle", "çay", "aynen", "gül", "sarıl", "içten", "dost", "biz", "hepimiz"] },
    { id: "epik",       name: "Epik",       icon: "🏔️", words: ["zirve", "efsane", "tarih", "yol", "kader", "sonsuz", "gökyüzü", "yıldız", "zafer"] },
    { id: "hikaye",     name: "Hikâye",     icon: "📖", words: ["sabah", "yolda", "kapı", "sonra", "bir gün", "hatırla", "çocuk", "önce", "hikâye"] },
    { id: "meydan",     name: "Meydan Okuma", icon: "⚔️", words: ["gel", "göster", "konuşma", "sus", "kanıt", "iddia", "seviye", "ölç"] }
  ];
  K.lyricAngleById = function (id) {
    return K.LYRIC_ANGLES.find(a => a.id === id) || K.LYRIC_ANGLES[0];
  };

  /* ============================================================
     TEMA × BÖLÜM SATIR HAVUZU
     openers → intro · couplets → verse/bridge · hooks → hook/chorus
     closers → outro
     ============================================================ */
  K.LYRIC_CONTENT = {
    love: {
      openers: ["Gecenin bir yarısı düşündüm seni yine", "Bu şehir bana seni hatırlatıyor her gece"],
      couplets: [
        ["Adını sayıklıyorum karanlık odada", "O ses yok, sadece boşluk yanımda"],
        ["Fotoğrafa bakıyorum, gözlerin aklımda", "Kalan tek şey bir sızı kalbimde"],
        ["Sen gideli sokaklar daralıyor", "Her köşede bir gölgen büyüyor"],
        ["Söyleyecek çok söz var ama yoksun", "Bekliyorum hâlâ kapıda, yoksun"],
        ["Mevsimler geçti, ben aynı yerdeyim", "Sen başka şehirde, ben kendimde değilim"],
        ["Kalbim bir ev, kapısı sana açık", "Gelsen de olur artık, kalmak yazık"]
      ],
      hooks: [["Gel, bu gece bitmesin", "Sensiz hiçbir şey yerini bulmuyor"], ["Bir tek sen kaldın aklımda", "Gerisi boş, gerisi yalan"]],
      bridges: [["Belki bir gün anlarsın", "Sustuğum her şey senin için"]],
      closers: [["İyi ki geçtin bu hayattan", "İyi ki kaldın bir yerlerde"]]
    },
    street: {
      openers: ["Betonun üstünde büyüdük biz", "Bu mahalle bize her şeyi öğretti"],
      couplets: [
        ["Her iz bir hikâye bıraktı", "Her sokak bir yara, her yara bir ders"],
        ["Sırtımızda kasket, aklımızda plan", "Kimse bize vermedi, hepsini biz aldık"],
        ["Ekmeği bölüştük, acıyı paylaştık", "Kim düştüyse kaldırdık, kim kaldıysa anladık"],
        ["Siren sesi geçti, biz sustuk", "Sabah oldu, gene işimiz başladı"],
        ["Anam dua etti, ben yola çıktım", "Döndüğümde ellerim boş değildi"],
        ["Bu semtin kuralları yazılı değil", "Ama kırarsan bedelini ödersin"]
      ],
      hooks: [["Sokak bize öğretti, boyun eğmeyi değil", "Biz buradan çıktık, unutmadık hiçbir şeyi"]],
      bridges: [["Değişen çok şey oldu", "Değişmeyen tek şey bu bağ"]],
      closers: [["Sokak kapanmaz, sadece sessizleşir"]]
    },
    money: {
      openers: ["Sıfırdan geldim, geri dönmem", "Her kuruşun hesabını bilirim"],
      couplets: [
        ["Cebimde üç kuruş vardı, hedefim büyüktü", "Kimse inanmadı ama ben inandım"],
        ["Sabah beşte kalktım, gece yarısı yattım", "Hak ettiğimi alnımın teriyle aldım"],
        ["Kağıt yığdım, düşman çoğaldı", "Umurumda değil, yol daha uzun kaldı"],
        ["Hesap kitap bilirim, savurgan değilim", "Kazandığımı korurum, kaybetmem bir gün"],
        ["Zengin doğmadım ama zengin düşünürüm", "Fakir kalmam, sözüm söz"],
        ["Her faturayı ödedim, her borcu kapattım", "Bu hayat bana sabrı da öğretti, aldım"]
      ],
      hooks: [["Kazanıyorum, kaybetmiyorum", "Hesabı ben tutuyorum"]],
      bridges: [["Para bir araç, amaç değil", "Bunu bilen kaybetmez"]],
      closers: [["Geriye bakmam, hesap kapanmış"]]
    },
    loss: {
      openers: ["Bir daha konuşamadık", "Eşyaların hâlâ yerinde"],
      couplets: [
        ["Sessizliğin en yüksek ses olduğunu öğrendim", "Sustun, ben duydum"],
        ["Telefonu açmadım, bir daha aramadın", "Şimdi her gece ben arıyorum"],
        ["Son fotoğrafta gülüyorsun", "Ben o gülüşü her gün arıyorum"],
        ["Bir yaprak düştü, geri gelmedi", "Biz de öyleyiz, bir gün döneceğiz"],
        ["Mektup yazdım, göndermedim", "Belki okursun diye sakladım"],
        ["Bayram sofrasında bir tabak boş", "O tabağı kimse almıyor"]
      ],
      hooks: [["Kalan bize sadece hatıran", "Unutmadık, unutmayacağız"]],
      bridges: [["Bir gün buluşuruz", "O zamana kadar seni taşırım"]],
      closers: [["Işıklar içinde uyu, biz buradayız"]]
    },
    freedom: {
      openers: ["Kimse bana ne yapacağımı söyleyemez", "Sessiz kalmak da bir seçimdir"],
      couplets: [
        ["Kuralları biz yazmadık ama sorgularız", "Boyun eğmeyiz, bedelini biliriz"],
        ["Duvarın önünde durdum, yıkmadım", "Ama tırmanacak bir yol buldum"],
        ["Zincir gibi görünen şey alışkanlık", "Kırdım onu, artık özgürüm"],
        ["Kalıba sokmaya çalıştılar, sığmadım", "Kendi kalıbımı yaptım, ona da sığmadım"],
        ["Konuş dediler sustum, sustum dediler konuştum", "Kendi kararımı kendim verdim"],
        ["Bu hayat benim, kimseye hesap vermem", "Yolumu kendim çizdim, geri dönmem"]
      ],
      hooks: [["Özgürüm, kimseye ait değilim", "Kendi yolumu kendim seçtim"]],
      bridges: [["Bedeli ağır olabilir", "Ama pes etmek daha ağır"]],
      closers: [["Gideceğim yolu kendim çizdim"]]
    },
    party: {
      openers: ["Bu gece kimse durduramaz bizi", "Müzik yüksel, kafalar iyi"],
      couplets: [
        ["Kadehler havada, ışıklar yanıyor", "Bu gece kimse eve dönmüyor"],
        ["Dans ediyoruz, zaman duruyor", "Sabah olmasın, bu gece sürsün"],
        ["Kalabalık, ter, müzik bir arada", "Herkes kendi hikâyesinde kayıpta"],
        ["Bass'ı vur, duvarlar titresin", "Bugünü kimse yarına taşımasın"],
        ["Sokakta başladık, kulüpte bitirdik", "Sabah güneşi bizi sokakta buldu"],
        ["Kafam iyi, dünya güzel", "Bu geceye kimse gölge düşüremez"]
      ],
      hooks: [["Bu gece bizim, sabaha kadar", "Kimse durduramaz, kimse bitiremez"]],
      bridges: [["Yarın ne olacak bilmiyorum", "Şimdi buradayım, şu an varım"]],
      closers: [["Işıklar söndü, müzik sustu, biz kaldık"]]
    },
    introspect: {
      openers: ["Aynaya bakınca ne gördüğümü bilmiyorum", "Kendi içimde bir savaş var"],
      couplets: [
        ["Sordum kendime: nereye gidiyorsun?", "Cevap vermedi, sadece yürüdü"],
        ["Yalnızlık bana iyi geldi", "Kalabalıkta kaybolmaktan iyidir"],
        ["Dışarıdan iyi görünüyorum", "İçeride bir fırtına kopuyor"],
        ["Uyku tutmuyor, düşünceler susmuyor", "Sabah olunca her şey düzelmiyor"],
        ["Değiştim mi bilmiyorum", "Ama eskisi gibi de değilim"],
        ["Kendi sesimi duymak için sustum", "Şimdi duyuyorum, korkmuyorum"]
      ],
      hooks: [["İçimde bir yer var, kimse bilmiyor", "Oraya kimseyi sokmadım"]],
      bridges: [["Kendimle barışmak zorundayım", "Başka çarem yok"]],
      closers: [["Işığı kapattım, kendimle kaldım"]]
    },
    faith: {
      openers: ["Her şeyin bir vakti var", "Beklemeyi öğrendim"],
      couplets: [
        ["Şükür etmek en zor ders", "Elimde olmayana değil, olana bak"],
        ["Dua ettim, cevap gelmedi", "Sonra anladım, beklemek de bir cevap"],
        ["Yol uzun, sabır kısa", "Ama sabrı büyütmek bana düştü"],
        ["Düşerken bir el uzandı", "Kim olduğunu sormadım, tuttum"],
        ["Kader dedik, çabaladık", "İkisi birlikte yürür, tek başına değil"],
        ["Gecenin sonunda sabah var", "Bunu bilmek yeter"]
      ],
      hooks: [["Sabret, güzel günler yakın", "Sabır en büyük güç"]],
      bridges: [["Anlamadığım şeyler var", "Ama güveniyorum"]],
      closers: [["Hamdolsun, her şeye rağmen"]]
    },
    flex: {
      openers: ["Zirvede kimse yalnız değil", "Bu hayat bana yakıştı"],
      couplets: [
        ["Gösteriş değil bu, emeğin karşılığı", "Herkes görsün, çalıştım"],
        ["Yeni araba, yeni ev, eski dostlar", "Bazıları kaldı, bazıları gitti"],
        ["Pahalı markalar üstümde", "Ama alın teri daha değerli"],
        ["Kimse bana vermedi, hepsini ben aldım", "Şimdi kimse geri alamaz"],
        ["Sahnedeyim, ışıklar üstümde", "Bu an için yıllarca çalıştım"],
        ["Konuşanlar hâlâ konuşuyor", "Ben hâlâ kazanıyorum"]
      ],
      hooks: [["Zirvedeyim, düşmeye niyetim yok", "Bu seviye benim"]],
      bridges: [["Bu bir son değil", "Daha yeni başlıyoruz"]],
      closers: [["Not alın, bu daha başlangıç"]]
    }
  };

  /* ============================================================
     KAFİYE MOTORU
     ============================================================ */
  K.rhyme = {
    /* satır sonu sesi (takribi): son kelimenin son 2 harfi */
    endKey(line) {
      const w = String(line || "").toLocaleLowerCase("tr")
        .replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
      const last = w[w.length - 1] || "";
      if (last.length <= 2) return last;
      return last.slice(-2);
    },

    /* kafiye şeması: A, B, C... (aynı ses aynı harf) */
    scheme(lines) {
      const map = {};
      let next = 0;
      const letters = "ABCDEFGH";
      return (lines || []).map(l => {
        const k = K.rhyme.endKey(l);
        if (!k) return "-";
        if (map[k] == null) map[k] = letters[next++ % letters.length];
        return map[k];
      }).join("");
    },

    /* kafiye yoğunluğu (0-1): tekrar eden satır sonu oranı */
    density(lines) {
      const ls = (lines || []).filter(l => String(l || "").trim());
      if (ls.length < 2) return 0;
      const counts = {};
      ls.forEach(l => { const k = K.rhyme.endKey(l); counts[k] = (counts[k] || 0) + 1; });
      const rhymed = ls.filter(l => counts[K.rhyme.endKey(l)] > 1).length;
      return rhymed / ls.length;
    },

    /* eşleşen çiftleri döndür */
    pairs(lines) {
      const ls = (lines || []).filter(l => String(l || "").trim());
      const map = {};
      ls.forEach((l, i) => { const k = K.rhyme.endKey(l); (map[k] = map[k] || []).push(i); });
      return Object.keys(map).filter(k => map[k].length > 1).map(k => ({ key: k, idx: map[k] }));
    }
  };

  /* lirikal açı tespiti */
  K.detectAngle = function (text) {
    const t = String(text || "").toLocaleLowerCase("tr");
    if (!t.trim()) return null;
    let best = null, bestN = 0;
    K.LYRIC_ANGLES.forEach(a => {
      let n = 0;
      a.words.forEach(w => { if (t.includes(w)) n++; });
      if (n > bestN) { bestN = n; best = a.id; }
    });
    return bestN > 0 ? best : null;
  };

  /* ============================================================
     ÖLÇÜ (HECE) MOTORU — Türkçe'de hece = sesli harf grubu
     ============================================================ */
  const VOWELS = "aeıioöuüâîû";
  K.meter = {
    syllablesWord(w) {
      const s = String(w || "").toLocaleLowerCase("tr");
      let n = 0, prev = false;
      for (const ch of s) {
        const isV = VOWELS.indexOf(ch) >= 0;
        if (isV && !prev) n++;
        prev = isV;
      }
      return n;
    },
    syllablesLine(line) {
      return String(line || "").split(/\s+/).filter(Boolean)
        .reduce((n, w) => n + K.meter.syllablesWord(w), 0);
    },
    stats(lines) {
      const arr = (lines || []).map(K.meter.syllablesLine).filter(n => n > 0);
      if (!arr.length) return { avg: 0, spread: 0, steady: 0, perLine: [] };
      const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      const spread = Math.max.apply(null, arr) - Math.min.apply(null, arr);
      // ölçü oturmuşluğu: satırlar birbirine ne kadar yakın (0-1)
      const steady = Math.max(0, Math.min(1, 1 - spread / Math.max(4, avg)));
      return { avg, spread, steady, perLine: arr };
    }
  };

  /* İÇ KAFİYE: aynı satır içinde tekrar eden ses */
  K.rhyme.internal = function (line) {
    const ws = String(line || "").toLocaleLowerCase("tr")
      .replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 3);
    const map = {};
    ws.forEach(w => { const k = w.slice(-2); (map[k] = map[k] || []).push(w); });
    return Object.keys(map).filter(k => map[k].length > 1).length;
  };

  /* PUNCHLINE: kısa, vurucu ve güçlü kelime içeren mısralar */
  const PUNCH_WORDS = ["gerçek", "yalan", "hayat", "ölüm", "zaman", "baba", "anne", "dünya", "son", "asla", "hep", "para", "kader", "ben", "biz", "yok", "var", "kral"];
  K.punchlines = function (lines) {
    return (lines || []).filter(l => {
      const ws = String(l || "").split(/\s+/).filter(Boolean);
      if (ws.length > 8 || ws.length < 2) return false;
      const low = String(l).toLocaleLowerCase("tr");
      return PUNCH_WORDS.some(w => low.indexOf(w) >= 0);
    });
  };

  /* bölüme uygun satır önerisi (kafiyeli) */
  K.suggestSectionLines = function (themeId, sectionId) {
    const c = K.LYRIC_CONTENT[themeId] || K.LYRIC_CONTENT.street;
    const pick = arr => K.util.pick(arr);
    switch (sectionId) {
      case "intro":  return [pick(c.openers)];
      case "outro":  return (c.closers.length ? pick(c.closers) : pick(c.couplets)).slice();
      case "hook":   return (c.hooks.length ? pick(c.hooks) : pick(c.couplets)).slice();
      /* v10.41 — nakaratın son geçişi (chorusLast) düz nakaratla aynı havuzdan beslenir */
      case "chorus":
      case "chorusLast": {
        const h = (c.hooks.length ? pick(c.hooks) : pick(c.couplets)).slice();
        return h.concat(h.slice(0, Math.max(0, 2 - h.length))); // nakarat tekrar eder
      }
      case "prechorus":
      case "prechorus2":
        return (c.bridges.length ? pick(c.bridges) : pick(c.couplets)).slice();
      case "bridge": return (c.bridges.length ? pick(c.bridges) : pick(c.couplets)).slice();
      default: {
        const a = pick(c.couplets);
        const b = pick(c.couplets);
        return a.concat(b);
      }
    }
  };
})(window.K = window.K || {});
