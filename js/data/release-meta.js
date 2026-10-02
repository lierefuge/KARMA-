/* ============================================================
   KARMA — data/release-meta.js
   YAYIN METADATA KATMANI

   Gerçek dağıtım formlarında (DistroKid / TuneCore / CD Baby /
   Amuse / Believe) ZORUNLU olan alanların oyun karşılığı:

     ISRC       parça kayıt kodu   (CC-XXX-YY-NNNNN)
     UPC/EAN    yayın barkodu      (13 hane)
     Explicit   müstehcen içerik bayrağı
     Bölge      dağıtım coğrafyası
     Dil        yayın dili
     Kredi      söz yazarı / besteci / prodüktör / aranjör
     Split      telif bölüşümü

   Hiçbiri "sadece görsel" değildir: her alan yayının erişimini,
   gelirini veya riskini etkiler.
   ============================================================ */
(function (K) {
  "use strict";
  /* NOT: js/core/util.js bu dosyadan SONRA yüklenir (index.html sırası),
     bu yüzden U burada bağlanamaz — çağrı anında K.util üzerinden erişilir. */

  K.meta = K.meta || {};

  /* ---------------- ISRC (parça kayıt kodu) ----------------
     Uluslararası standart kayıt kodu. Format:
       CC  -  XXX  -  YY  -  NNNNN
       ülke  kayıt sahibi  yıl  sıra
     Distribütör otomatik atar; oyunda parçanın "kimlik kartı"dır. */
  K.ISRC = { country: "TR", registrant: "KRM" };

  K.meta.isrc = function (year, seq) {
    const y = String((year || 25) % 100).padStart(2, "0");
    const n = String(Math.max(1, Math.round(seq || 1)) % 100000).padStart(5, "0");
    return K.ISRC.country + "-" + K.ISRC.registrant + "-" + y + "-" + n;
  };

  /* ---------------- UPC / EAN (yayın barkodu) ----------------
     13 haneli barkod. Son hane EAN kontrol basamağıdır ve
     gerçekten hesaplanır (uydurma değil). */
  K.meta.eanCheck = function (digits12) {
    const d = String(digits12).replace(/\D/g, "").padStart(12, "0").slice(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += (+d[i]) * (i % 2 ? 3 : 1);
    return String((10 - (sum % 10)) % 10);
  };
  K.meta.upc = function (seed) {
    /* tohumdan deterministik 12 hane üret, kontrol basamağını ekle */
    const str = String(seed || "rel");
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    const d12 = ("869" + String(h % 1000000000).padStart(9, "0")).slice(0, 12);
    return d12 + K.meta.eanCheck(d12);
  };

  /* ---------------- EXPLICIT (müstehcen içerik) ----------------
     Gerçekte mağazaya bildirilen bir bayraktır: explicit parçalar
     editoryal/radyo listelerinden düşer ama çekirdek kitleyi
     güçlendirir. Oyun karşılığı da tam olarak bu denge.

     Öneri, sözün TEMASI ve parça TÜRÜNDEN çıkar (sokak/diss
     ağırlıklı işler daha sert dil kullanır); oyuncu her zaman
     elle değiştirebilir. */
  K.meta.EXPLICIT_THEMES = ["street", "diss", "money", "lifestyle", "hustle"];
  K.meta.suggestExplicit = function (themeId, kindId) {
    const hard = K.meta.EXPLICIT_THEMES.indexOf(themeId) >= 0;
    const kindHard = kindId === "diss" || kindId === "freestyle";
    if (hard && kindHard) return true;
    if (kindId === "diss") return true;
    return false;
  };

  /* explicit bayrağının yayın üzerindeki etkisi.
     reach : erişim/liste çarpanı  (< 1 ceza)
     core  : çekirdek kitle çarpanı (> 1 ödül) */
  K.meta.explicitEffect = function (explicit) {
    if (!explicit) return { reach: 1, core: 1, playlistPenalty: 1 };
    return { reach: 0.94, core: 1.12, playlistPenalty: 0.68 };
  };

  /* ---------------- SAMPLE CLEARANCE ----------------
     Sample tabanlı altyapıda örnek HAKKI ödenmezse yayın
     kaldırılabilir (takedown) ve gelir cezası gelir. */
  K.meta.clearanceCost = 14000;
  K.meta.SAMPLE_RISK = 0.16;          // temizlenmemiş sample'ın ilk 30 günde takılma olasılığı
  K.meta.SAMPLE_TAKEDOWN_DAYS = 30;

  /* ---------------- BÖLGELER (dağıtım coğrafyası) ----------------
     reach: o bölgenin pazar büyüklüğü (0-1)
     cost : dağıtım maliyeti çarpanı
     lang : o bölgede öne çıkan dil (dil uyumu bonus verir) */
  K.REGIONS = [
    { id: "tr",     name: "Türkiye",                  icon: "🇹🇷", reach: 0.42, cost: 0.30, lang: "tr", note: "Ana pazar; düşük maliyet, yüksek yerel etki." },
    { id: "eu",     name: "Avrupa",                   icon: "🇪🇺", reach: 0.72, cost: 0.68, lang: "en", note: "Göçmen kitle güçlü; dil çeşitliliği yüksek." },
    { id: "na",     name: "Kuzey Amerika",            icon: "🇺🇸", reach: 0.82, cost: 0.85, lang: "en", note: "En büyük pazar; rekabet sert, maliyet yüksek." },
    { id: "latam",  name: "Latin Amerika",            icon: "🌎", reach: 0.48, cost: 0.50, lang: "es", note: "Hızlı büyüyen pazar; ritim ağırlıklı işler tutar." },
    { id: "mena",   name: "Orta Doğu & K. Afrika",    icon: "🕌", reach: 0.38, cost: 0.42, lang: "ar", note: "Kültürel yakınlık; iş birliği kapısı açık." },
    { id: "asia",   name: "Asya",                     icon: "🌏", reach: 0.55, cost: 0.62, lang: "en", note: "Devasa ama mesafeli; yerel dil şart." },
    { id: "africa", name: "Sahra Altı Afrika",        icon: "🌍", reach: 0.34, cost: 0.40, lang: "en", note: "Yükselen pazar; erken giren avantajlı." },
    { id: "oceania",name: "Okyanusya",                icon: "🇦🇺", reach: 0.30, cost: 0.45, lang: "en", note: "Küçük ama sadık dinleyici." }
  ];
  K.regionById = function (id) { return K.REGIONS.find(r => r.id === id) || null; };
  K.defaultRegions = function () { return ["world"]; };

  /* Seçili bölgelerden erişim çarpanı (0.30 – 1.30) ve maliyet çarpanı.
     "world" özel bir bölgedir: her yeri kapsar, en pahalıdır. */
  K.meta.regionReach = function (ids) {
    /* null/undefined → varsayılan (dünya geneli); BOŞ dizi → hiç bölge yok */
    const list = (ids == null) ? ["world"] : ids.slice();
    if (!list.length) return 0.30;
    if (list.indexOf("world") >= 0) return 1.30;
    const picked = list.map(K.regionById).filter(Boolean);
    if (!picked.length) return 0.30;
    const sum = picked.reduce((n, r) => n + r.reach, 0);
    /* 4 bölge ≈ tam kapsama referansı */
    return K.util.clamp(0.35 + sum * 0.62, 0.35, 1.24);
  };
  K.meta.regionCost = function (ids) {
    const list = (ids == null) ? ["world"] : ids.slice();
    if (!list.length) return 0.55;
    if (list.indexOf("world") >= 0) return 1.55;
    const picked = list.map(K.regionById).filter(Boolean);
    if (!picked.length) return 0.55;
    return K.util.clamp(picked.reduce((n, r) => n + r.cost, 0) / Math.max(1, picked.length) + 0.28, 0.55, 1.40);
  };
  K.meta.regionLabel = function (ids) {
    const list = (ids == null) ? ["world"] : ids.slice();
    if (!list.length) return "—";
    if (list.indexOf("world") >= 0) return "Dünya Geneli";
    const picked = list.map(K.regionById).filter(Boolean);
    if (!picked.length) return "—";
    if (picked.length <= 2) return picked.map(r => r.name).join(" + ");
    return picked.length + " bölge";
  };

  /* ---------------- YAYIN DİLİ ----------------
     Mağazalara bildirilir; bölge diliyle uyumluysa erişim artar. */
  K.LANGUAGES = [
    { id: "tr", name: "Türkçe",    icon: "🇹🇷", note: "Yerel pazarın ana dili." },
    { id: "en", name: "İngilizce", icon: "🇬🇧", note: "En geniş yayılım; küresel listeler." },
    { id: "es", name: "İspanyolca",icon: "🇪🇸", note: "Latin pazarı ve ABD göçmen kitlesi." },
    { id: "ar", name: "Arapça",    icon: "🇸🇦", note: "MENA bölgesinde güçlü." },
    { id: "de", name: "Almanca",   icon: "🇩🇪", note: "Avrupa göçmen pazarı." },
    { id: "fr", name: "Fransızca", icon: "🇫🇷", note: "Avrupa ve Afrika'da ortak dil." },
    { id: "ru", name: "Rusça",     icon: "🇷🇺", note: "Geniş bölgesel kitle." },
    { id: "instrumental", name: "Enstrümantal", icon: "🎹", note: "Sözsüz; dil bariyeri yok." }
  ];
  K.languageById = function (id) { return K.LANGUAGES.find(l => l.id === id) || K.LANGUAGES[0]; };

  /* Dil ile seçili bölgeler uyuşuyorsa erişim bonusu (1.00 – 1.14) */
  K.meta.languageFit = function (langId, regionIds) {
    if (!langId) return 1;
    if (langId === "instrumental") return 1.06;      // dil bariyeri yok
    const list = (regionIds && regionIds.length) ? regionIds : ["world"];
    if (list.indexOf("world") >= 0) return 1.02;
    const picked = list.map(K.regionById).filter(Boolean);
    if (!picked.length) return 1;
    const match = picked.filter(r => r.lang === langId).length;
    return K.util.clamp(1 + (match / picked.length) * 0.14, 1.00, 1.14);
  };

  /* ---------------- KREDİLER (credits) ----------------
     Dağıtım formlarında zorunlu: söz yazarı, besteci, prodüktör.
     Her rol yayın gelirinden pay alır (split sheet). */
  K.CREDIT_ROLES = [
    { id: "songwriter", name: "Söz Yazarı",      icon: "✍️", share: 22, note: "Sözleri yazan." },
    { id: "composer",   name: "Besteci",         icon: "🎼", share: 18, note: "Melodiyi yazan." },
    { id: "producer",   name: "Prodüktör",       icon: "🎛️", share: 14, note: "Altyapıyı üreten." },
    { id: "arranger",   name: "Aranjör",         icon: "🎹", share: 6,  note: "Düzenlemeyi yapan." },
    { id: "mixer",      name: "Mix & Mastering", icon: "🎚️", share: 5,  note: "Son ses işleme." }
  ];
  K.creditRoleById = function (id) { return K.CREDIT_ROLES.find(r => r.id === id) || K.CREDIT_ROLES[0]; };

  /* Oyuncunun kendi yazdığı işlerde varsayılan kredi dağılımı.
     Oyuncu her rolü "kendim" ya da bir kişiye atayabilir. */
  K.meta.defaultCredits = function (st) {
    const me = { self: true, name: null };
    const out = {};
    K.CREDIT_ROLES.forEach(r => {
      out[r.id] = (r.id === "songwriter" || r.id === "composer") ? Object.assign({}, me) : { self: false, name: null };
    });
    /* ghostwriter varsa söz yazarı ona geçer */
    if (st && st.ghost) out.songwriter = { self: false, name: "Ghostwriter" };
    return out;
  };

  /* Kredilerin toplam payı (%) — 100'ü geçemez */
  K.meta.creditTotal = function (credits) {
    if (!credits) return 0;
    return K.util.sum(K.CREDIT_ROLES, r => (credits[r.id] && credits[r.id].share != null)
      ? +credits[r.id].share
      : (credits[r.id] ? (r.share || 0) : 0));
  };

  /* ---------------- TELİF BÖLÜŞÜMÜ (split sheet) ----------------
     Krediler + feature payı + prodüktör puanı birleşir.
     Oyuncunun net payı = 100 - (diğer tüm paylar). */
  K.meta.splitSheet = function (rel) {
    const rows = [];
    const credits = rel.credits || {};
    K.CREDIT_ROLES.forEach(r => {
      const c = credits[r.id];
      if (!c) return;
      const share = c.share != null ? +c.share : (c.self ? (r.share || 0) : 0);
      if (!share) return;
      rows.push({ id: r.id, name: r.name, icon: r.icon, holder: c.self ? "Sen" : (c.name || "—"), share });
    });
    /* feature ortağı */
    if (rel.featWith && rel.featureShare != null && rel.featureShare < 100) {
      const fa = K.artistById(rel.featWith);
      rows.push({
        id: "feature", name: "Feature Ortağı", icon: "🤝",
        holder: fa ? fa.stageName : "Ortak",
        share: 100 - rel.featureShare
      });
    }
    /* prodüktör puanı (exclusive beat lisansı) */
    if (rel.licensePoints) {
      rows.push({ id: "beatPoints", name: "Beat Lisans Puanı", icon: "🔒", holder: "Prodüktör", share: rel.licensePoints });
    }
    const taken = K.util.sum(rows, r => r.share);
    const mine = K.util.clamp(100 - taken, 0, 100);
    return { rows, taken, mine, over: taken > 100 };
  };

  /* ---------------- ENSTRÜMANTAL SÜRÜM ----------------
     Karaoke/sync kullanımı için sözsüz sürüm. Maliyeti düşük,
     getirisi küçük ama istikrarlıdır (dizi/reklam lisansı). */
  K.meta.INSTRUMENTAL_COST = 5000;
  K.meta.INSTRUMENTAL_BONUS = 0.05;   // günlük dinlenmeye küçük katkı

  /* ---------------- YOUTUBE CONTENT ID ----------------
     Yayınını Content ID sistemine kaydettirmek, başkaları videolarında
     kullandığında otomatik telif geliri getirir. Küçük ama pasif gelir. */
  K.meta.CONTENT_ID_COST = 3500;
  K.meta.CONTENT_ID_YIELD = 0.035;    // günlük dinlenmenin %'si kadar ek gelir

  /* ---------------- YENİDEN YÜKLEME ----------------
     Kaldırılan bir yayını düzeltip tekrar göndermenin bedeli. */
  K.meta.REUPLOAD_COST = 6000;

  /* ---------------- ÇIKIŞ GÜNÜ ----------------
     Endüstri standardı: yeni yayınlar CUMA çıkar. Hafta içi
     çıkış liste algoritmasına yakalanma şansını düşürür. */
  K.meta.WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  K.meta.WEEKDAYS_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  K.meta.weekdayOf = function (day) {
    /* oyun günü 0'dan başlar; Gün 0 = Pazartesi kabul edilir */
    return ((Math.round(day || 0) + 1) % 7 + 7) % 7;
  };
  K.meta.weekdayName = function (day) { return K.meta.WEEKDAYS[K.meta.weekdayOf(day)]; };
  /* cuma çıkışı = 1.00, diğer günler cezalı */
  K.meta.releaseDayFit = function (day) {
    const w = K.meta.weekdayOf(day);
    if (w === 5) return 1.00;    // Cuma
    if (w === 4) return 0.97;    // Perşembe (gece yarısı çıkışı)
    if (w === 6 || w === 0) return 0.94;
    return 0.91;
  };
  K.meta.nextFriday = function (day) {
    return K.meta.snapToWeekday(day, 5);
  };
  /* Verilen güne en yakın (o gün ya da sonrası) hedef hafta gününü döndürür.
     C3: oyuncu "cuma çıksın" der; hazırlık süresi en az o kadar olur ama
     takvim hedef güne kayar. */
  K.meta.snapToWeekday = function (fromDay, weekday) {
    let d = Math.round(fromDay || 0);
    const w = ((Math.round(weekday || 0) % 7) + 7) % 7;
    for (let i = 0; i < 8; i++) { if (K.meta.weekdayOf(d) === w) return d; d++; }
    return d;
  };

  /* ---------------- TEKNİK GEREKSİNİMLER ----------------
     Mağazaların kapak ve ses dosyası için alt sınırları.
     Altında kalırsa yayın REDDEDİLİR (gerçekte de öyle). */
  K.meta.COVER_MIN_PX = 1400;          // mağaza alt sınırı
  K.meta.COVER_GOOD_PX = 3000;         // önerilen (Apple Music)
  K.meta.LOSSLESS_BITS = ["WAV", "FLAC", "AIFF"];
  K.meta.MIN_BITRATE = 256;            // kbps (kayıplı formatlarda alt sınır)

  /* Kayıplı formatta KATI davranan mağazalar. Spotify/YouTube/SoundCloud
     kayıplı dosyayı kabul eder; Apple/TIDAL/Amazon yüksek kalite ister. */
  K.meta.PREMIUM_STORES = ["apple", "tidal", "amazon"];
  K.meta.premiumStores = function (ids) {
    return (ids || []).filter(id => K.meta.PREMIUM_STORES.indexOf(id) >= 0);
  };
  /* bu kaynak, seçili mağazalardan hangileri tarafından reddedilir? */
  K.meta.rejectedBy = function (src, storeIds) {
    if (K.meta.sourceAccepted(src)) return [];
    return K.meta.premiumStores(storeIds);
  };

  /* kaynak dosya kabul edilebilir mi? */
  K.meta.sourceAccepted = function (src) {
    if (!src) return true;
    if (K.meta.LOSSLESS_BITS.indexOf(String(src.file).toUpperCase()) >= 0) return true;
    const m = String(src.bit || "").match(/(\d+)\s*kbps/i);
    if (!m) return true;                       // bilinmiyorsa geçer
    return (+m[1]) >= K.meta.MIN_BITRATE;
  };

  /* kapak çözünürlüğü kabul edilebilir mi? */
  K.meta.coverAccepted = function (px) { return (px || 0) >= K.meta.COVER_MIN_PX; };

})(window.K = window.K || {});
