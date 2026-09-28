/* ============================================================
   KARMA — data/creative.js
   ŞARKI SÖZÜ temaları + ALBÜM KONSEPTLERİ
   Sözler dinleyici çeker; konsept albüme bütünlük verir.
   ============================================================ */
(function (K) {
  "use strict";

  /* =====================================================
     ŞARKI SÖZÜ TEMALARI
     effect: { mass, viral, loyalty, rep }
       mass    → dinlenme hacmi
       viral   → viral olma şansı
       loyalty → hayran dönüşümü (takipçi)
       rep     → itibar katkısı
     ===================================================== */
  K.LYRIC_THEMES = [
    {
      id: "love", name: "Aşk & Özlem", icon: "💔",
      genres: ["rnb", "pop", "arabesk", "cloudrap"],
      effect: { mass: 0.98, viral: 1.05, loyalty: 1.25, rep: 0 },
      desc: "Duygusal sözler sadık dinleyici getirir.",
      lines: ["Gecenin bir yarısı adını sayıklıyorum", "Sen gidince şehir sustu", "Kalbim hâlâ aynı sokakta bekliyor"]
    },
    {
      id: "street", name: "Sokak & Gerçek", icon: "🏙️",
      genres: ["rap", "hiphop", "drill", "boombap"],
      effect: { mass: 1.00, viral: 1.05, loyalty: 1.10, rep: 1.2 },
      desc: "Sokak hikâyeleri itibar kazandırır.",
      lines: ["Betonun üstünde büyüdük biz", "Her iz bir hikâye bıraktı", "Bu mahalle bize her şeyi öğretti"]
    },
    {
      id: "money", name: "Para & Hırs", icon: "💰",
      genres: ["trap", "drill", "hiphop", "afrotrap"],
      effect: { mass: 1.06, viral: 1.18, loyalty: 0.95, rep: 0 },
      desc: "Hırs temaları TikTok'ta hızlı yayılır.",
      lines: ["Sıfırdan geldim, geri dönmem", "Her kuruşun hesabını bilirim", "Sabah beşte çalışmak zorundaydım"]
    },
    {
      id: "loss", name: "Kayıp & Yas", icon: "🕯️",
      genres: ["arabesk", "cloudrap", "rnb", "boombap"],
      effect: { mass: 0.94, viral: 0.95, loyalty: 1.40, rep: 0.5 },
      desc: "En güçlü duygusal bağı kuran tema.",
      lines: ["Bir daha konuşamadık", "Eşyaların hâlâ yerinde", "Sessizliğin en yüksek ses olduğunu öğrendim"]
    },
    {
      id: "freedom", name: "Özgürlük & İsyan", icon: "✊",
      genres: ["rap", "hiphop", "boombap", "indie"],
      effect: { mass: 0.99, viral: 1.08, loyalty: 1.15, rep: 1.4 },
      desc: "Duruş sergilersin; itibar ve saygı getirir.",
      lines: ["Kimse bana ne yapacağımı söyleyemez", "Kuralları biz yazmadık ama sorgularız", "Sessiz kalmak da bir seçimdir"]
    },
    {
      id: "party", name: "Parti & Enerji", icon: "🎉",
      genres: ["trap", "afrotrap", "pop", "hyperpop"],
      effect: { mass: 1.12, viral: 1.22, loyalty: 0.9, rep: 0 },
      desc: "Yaz ve kulüp hit'i; en yüksek hacim.",
      lines: ["Bu gece kimse durduramaz bizi", "Müzik yüksel, kafalar iyi", "Sabaha kadar dans edeceğiz"]
    },
    {
      id: "introspect", name: "İç Dünya", icon: "🧠",
      genres: ["cloudrap", "rnb", "indie", "hyperpop"],
      effect: { mass: 0.92, viral: 0.98, loyalty: 1.20, rep: 0.8 },
      desc: "Kişisel ve derin; sadık bir çekirdek kitle.",
      lines: ["Aynaya bakınca ne görüyorum bilmiyorum", "Kendi içimde bir savaş var", "Yalnızlık bana iyi geldi"]
    },
    {
      id: "faith", name: "İnanç & Sabır", icon: "🕌",
      genres: ["arabesk", "boombap", "indie", "rnb"],
      effect: { mass: 0.96, viral: 0.92, loyalty: 1.30, rep: 1.0 },
      desc: "Sabır ve tevekkül temaları aile kitlesi getirir.",
      lines: ["Her şeyin bir vakti var", "Beklemeyi öğrendim", "Şükür etmek en zor ders"]
    },
    {
      id: "flex", name: "Flex & Başarı", icon: "💎",
      genres: ["trap", "drill", "afrotrap", "hiphop"],
      effect: { mass: 1.08, viral: 1.12, loyalty: 0.92, rep: 0 },
      desc: "Gösterişli sözler geniş kitleye ulaşır.",
      lines: ["Zirvede kimse yalnız değil", "Bu hayat bana yakıştı", "Sokaktan çıktım, hedef yüksek"]
    }
  ];
  K.lyricThemeById = function (id) { return K.LYRIC_THEMES.find(t => t.id === id) || K.LYRIC_THEMES[0]; };

  /* =====================================================
     ALBÜM KONSEPTLERİ
     genres/kinds/themes → albüm bütünlüğü (cohesion) puanı
     ===================================================== */
  K.ALBUM_CONCEPTS = [
    { id: "street",  name: "Sokak Hikâyesi",   icon: "🏙️", genres: ["rap", "hiphop", "boombap", "drill"], kinds: ["normal", "freestyle", "diss"], themes: ["street", "freedom"], mass: 1.00, desc: "Mahalle, gerçek ve mücadele — klasik sokak albümü." },
    { id: "night",   name: "Gece & Yalnızlık", icon: "🌙", genres: ["cloudrap", "rnb", "arabesk"],          kinds: ["normal", "acoustic", "live"],  themes: ["loss", "introspect", "love"], mass: 0.96, desc: "Atmosferik, melankolik gece albümü." },
    { id: "luxury",  name: "Lüks & Başarı",    icon: "💎", genres: ["trap", "drill", "afrotrap"],           kinds: ["normal", "remix"],             themes: ["money", "flex"], mass: 1.08, desc: "Yüksek hacim, gösteriş ve hırs." },
    { id: "summer",  name: "Yaz Sound'u",      icon: "☀️", genres: ["afrotrap", "pop", "trap", "hyperpop"], kinds: ["normal", "remix"],             themes: ["party", "love"], mass: 1.12, desc: "Yaz, kulüp ve radyo dostu proje." },
    { id: "concept", name: "Konsept: Döngü",   icon: "🔄", genres: ["hiphop", "indie", "rnb", "cloudrap"],  kinds: ["normal", "live", "acoustic"],  themes: ["introspect", "faith"], mass: 0.95, desc: "Baştan sona bağlı, sanatsal bir anlatı." },
    { id: "revolt",  name: "İsyan & Sistem",   icon: "✊", genres: ["rap", "hiphop", "boombap"],             kinds: ["normal", "freestyle", "diss"], themes: ["freedom", "street"], mass: 1.00, desc: "Toplumsal söylemli, sert albüm." },
    { id: "letter",  name: "Aşk Mektubu",      icon: "💌", genres: ["rnb", "pop", "arabesk"],                kinds: ["normal", "acoustic"],          themes: ["love", "loss"], mass: 1.02, desc: "Duygusal, sadık kitle hedefli." },
    { id: "open",    name: "Açık Konsept",     icon: "🔓", genres: ["rap", "hiphop", "trap", "drill", "pop", "rnb", "arabesk", "boombap", "cloudrap", "afrotrap", "hyperpop", "indie"], kinds: ["normal", "freestyle", "remix", "acoustic", "live", "diss"], themes: ["love", "street", "money", "loss", "freedom", "party", "introspect", "faith", "flex"], mass: 1.00, desc: "Sınır yok; bütünlük bonusu küçük." }
  ];
  K.albumConceptById = function (id) { return K.ALBUM_CONCEPTS.find(c => c.id === id) || K.ALBUM_CONCEPTS[K.ALBUM_CONCEPTS.length - 1]; };

  /* =====================================================
     SÖZ KALİTESİ HESABI
     Yazılan metnin uzunluğu, çeşitliliği, mısra yapısı,
     tema-uyum ve müzikal yetenek birlikte değerlendirilir.
     ===================================================== */
  K.lyrics = {

    /* bölüm nesnesini ya da düz metni tek metne çevir */
    flatten(sections) {
      if (!sections) return "";
      if (typeof sections === "string") return sections;
      return K.LYRIC_SECTIONS.map(s => sections[s.id] || "").filter(x => String(x).trim()).join("\n");
    },

    /* bölüm dolu mu? */
    structure(sections) {
      if (!sections || typeof sections === "string") return { have: 0, total: K.LYRIC_SECTIONS.length, list: [] };
      const list = K.LYRIC_SECTIONS.filter(s => String(sections[s.id] || "").trim());
      return { have: list.length, total: K.LYRIC_SECTIONS.length, list: list.map(s => s.id) };
    },

    /* SÖZ ANALİZİ: uzunluk · çeşitlilik · yapı · kafiye · açı · tema */
    analyze(sections, themeId, genre, kindId) {
      const theme = K.lyricThemeById(themeId);
      const kind = K.kindById(kindId);
      const text = K.lyrics.flatten(sections);
      const t = (text || "").trim();
      const st = K.lyrics.structure(sections);

      if (!t) {
        return {
          score: 22, words: 0, lines: 0, unique: 0, fit: 0, empty: true,
          rhyme: { scheme: "", density: 0, pairs: [] }, angle: null, structure: st
        };
      }

      const lines = t.split(/\n+/).map(x => x.trim()).filter(Boolean);
      const words = t.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
      const unique = new Set(words).size;
      const wordCount = words.length;

      let s = 26;
      s += Math.min(26, wordCount * 0.5);                        // uzunluk
      s += Math.min(12, (unique / Math.max(1, wordCount)) * 24);  // kelime çeşitliliği
      s += Math.min(10, lines.length * 1.3);                       // mısra sayısı
      if (lines.length >= 4 && wordCount / Math.max(1, lines.length) >= 3) s += 4;

      /* KAFİYE: yoğunluk ve düzenli şema ödülü */
      const rhyme = { scheme: K.rhyme.scheme(lines), density: K.rhyme.density(lines), pairs: K.rhyme.pairs(lines) };
      s += rhyme.density * 18;
      if (lines.length >= 4 && /^(AABB|ABAB|AAAA|ABBA)/.test(rhyme.scheme)) s += 6;

      /* İÇ KAFİYE: satır içi tekrarlar */
      const internal = { count: lines.reduce((n, l) => n + K.rhyme.internal(l), 0) };
      internal.ratio = lines.length ? internal.count / lines.length : 0;
      s += Math.min(8, internal.count * 2.2);

      /* ÖLÇÜ (HECE): satırlar arası denge */
      const meter = K.meter.stats(lines);
      if (meter.avg > 0) s += meter.steady * 10;
      if (meter.steady >= 0.85 && lines.length >= 4) s += 4;

      /* PUNCHLINE: vurucu mısralar */
      const punches = K.punchlines(lines);
      s += Math.min(7, punches.length * 1.6);

      /* YAPI: bölümlerin dolu olması */
      if (st.total) s += (st.have / st.total) * 10;
      if (st.list.indexOf("hook") >= 0 && st.list.indexOf("chorus") >= 0) s += 4;

      /* LİRİKAL AÇI tutarlılığı */
      const angle = K.detectAngle(t);
      if (angle) s += 4;

      /* TEMA UYUMU */
      const fit = theme.genres.includes(genre) ? 1 : 0;
      s += fit ? 10 : 2;

      /* tür + yetenek */
      s += K.skillLevel("music") * 0.18;
      if (kind.id === "freestyle") s -= 9;
      else if (kind.id === "acoustic") s += 3;

      const score = Math.max(10, Math.min(99, Math.round(s)));
      return {
        score, words: wordCount, lines: lines.length, unique, fit, empty: false,
        rhyme, internal, meter, punches, angle, structure: st
      };
    },

    /* geriye dönük: düz metin */
    score(text, themeId, genre, kindId) {
      return K.lyrics.analyze(text, themeId, genre, kindId);
    },

    /* söz önerisi: bölüm verilirse o bölüm, verilmezse tam şarkı */
    suggest(themeId, sectionId) {
      if (sectionId) return K.suggestSectionLines(themeId, sectionId).join("\n");
      return ["intro", "verse", "hook", "chorus", "outro"]
        .map(id => K.suggestSectionLines(themeId, id).join("\n"))
        .join("\n");
    },

    /* BÖLÜME ÖZEL öneri (satır dizisi) */
    suggestSection(themeId, sectionId) {
      return K.suggestSectionLines(themeId, sectionId);
    },

    /* ---- DOLAYLI, YAPICI GERİ BİLDİRİM ----
       Asla "kötü" demez; durumu ve neyin eksik olduğunu söyler. */
    feedback(res) {
      if (!res) return "";
      if (res.empty) return "Henüz söz yok. Birkaç mısra yazarsan şarkı bir yere oturur.";
      const d = res.rhyme ? res.rhyme.density : 0;
      const parts = [];
      const sc = res.score;

      if (sc >= 85) parts.push("Sözler oturmuş; akış sağlam, kafiyeler yerinde.");
      else if (sc >= 70) parts.push("İyi bir iş çıkmış, ufak pürüzler var.");
      else if (sc >= 55) parts.push("Fena değil ama dizeler birbirini tam desteklemiyor.");
      else if (sc >= 40) parts.push("Durumun iyi değil; anlatı dağınık, akış zayıf.");
      else parts.push("Bu haliyle dinleyiciyi tutmak zor; biraz daha çalışmak lazım.");

      if (d >= 0.6) parts.push("Kafiyeler belirgin, kulakta kalıyor.");
      else if (d >= 0.3) parts.push("Kafiye yer yer var; biraz daha oturtabilirsin.");
      else parts.push("Satır sonları birbirine bağlanmıyor; kafiye eksik.");

      if (res.meter && res.meter.avg) {
        if (res.meter.steady >= 0.85) parts.push("Ölçü oturmuş, satırlar denk.");
        else if (res.meter.spread > 5) parts.push("Hece sayıları oynak; ölçüyü dengelemek akışı düzeltir.");
        else parts.push("Ölçü fena değil; birkaç satırı eşitlersen akış daha da oturur.");
      }
      if (res.internal && res.internal.count >= 3) parts.push("İç kafiyeler işi güçlendiriyor.");
      else if (res.internal && res.internal.count === 0) parts.push("Satır içi kafiye yok; birkaç tekrar ekleyebilirsin.");
      if (res.punches && res.punches.length) parts.push(res.punches.length + " vurucu mısra var.");
      if (res.meter && res.meter.avg && res.meter.avg < 8) parts.push("Mısralar kısa kalıyor; anlatıyı biraz açabilirsin.");

      if (res.structure && res.structure.have < 3) parts.push("Bölüm sayısı az; hook ve chorus ekle.");
      else if (res.structure && res.structure.list.indexOf("hook") < 0) parts.push("Bir hook eksik; şarkının tutunduğu cümle lazım.");

      if (!res.fit) parts.push("Tema ile tür tam örtüşmüyor.");
      if (res.angle) parts.push("Ton " + K.lyricAngleById(res.angle).name.toLowerCase() + " çizgisinde.");
      return parts.join(" ");
    },

    /* albüm bütünlüğü (cohesion) */
    cohesion(conceptId, genre, kindId, themeId, trackCount) {
      const c = K.albumConceptById(conceptId);
      let s = 0;
      s += c.genres.includes(genre) ? 42 : 6;
      s += c.kinds.includes(kindId) ? 28 : 8;
      s += c.themes.includes(themeId) ? 20 : 4;
      if (trackCount >= 8) s += 10; else if (trackCount >= 4) s += 6;
      return Math.max(5, Math.min(100, Math.round(s)));
    },

    cohesionLabel(v) {
      if (v >= 85) return "Mükemmel";
      if (v >= 65) return "Güçlü";
      if (v >= 45) return "Orta";
      return "Zayıf";
    }
  };
})(window.K = window.K || {});
