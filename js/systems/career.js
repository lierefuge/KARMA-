/* ============================================================
   KARMA — systems/career.js
   Sanatçı kariyeri: şarkı oluşturma, yayın hattı, single/EP/albüm,
   promosyon, şirket sözleşmesi (oyuncu → label).
   Şarkı oluşturma & yayınlama BURADA (kariyer tarafında) kalır.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  const TITLE_A = ["Gece", "Sokak", "Yalan", "Karma", "Rüya", "Ateş", "Sisli", "Kayıp",
    "Son", "Kırmızı", "Derin", "Yıldız", "Sessiz", "Fırtına", "Melek", "Kalbim",
    "Şehir", "Vazgeç", "Yol", "Zaman", "Gölge", "Beton", "Yağmur", "Küller"];
  const TITLE_B = ["", "", "", "Yarın", "Bu Gece", "Gerçek", "Hikâye", "Sonu", "İçin",
    "Değil", "Gibi", "Kadar", "Hâlâ", "Yine"];

  K.career = {

    /* v10.39 — PARÇA TAVANI tek yerde durur. Slider, "Parça Ekle",
       tip kartları ve createRelease hepsi bunu okur. (Eskiden 14'tü ve
       dört ayrı yerde kopyalanmıştı.) */
    MAX_TRACKS: 30,

    /* ---------------- kimlik ---------------- */
    setIdentity(data) {
      const p = K.state.player;
      Object.assign(p, data);
      K.save();
    },

    /* ---------------- şarkı adı öner ---------------- */
    /* v10.39 — BOŞLUK HATASI: eski hâli
         A + (koşul ? " " + B.trim() : "").trim()
       yazıyordu; dıştaki .trim() birleştirme boşluğunu da siliyordu ve
       adların %37'si "SisliSonu", "KalbimHâlâ" gibi birleşik çıkıyordu.
       Artık boşluk parçanın kendisinde; dış trim yok. */
    suggestTitle() {
      const a = U.pick(TITLE_A);
      const b = U.chance(0.55) ? U.pick(TITLE_B).trim() : "";
      return b ? a + " " + b : a;
    },
    suggestTracks(n) {
      const set = new Set();
      let guard = 0;
      while (set.size < n && guard++ < n * 40) {
        set.add(K.career.suggestTitle());
      }
      return Array.from(set);
    },

    /* parça süresi — her parçanın kendi süresi olur (eskiden hepsi 3:24'tü) */
    suggestDuration() {
      const total = U.randInt(148, 312);          // 2:28 – 5:12
      return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
    },

    /* v10.41 — SÜRE ARTIK YAPIDAN TÜRER (rastgele değil).
       Aynı tohum aynı süreyi verir; tohum boşsa yapının ham süresi
       döner. Makul aralık 1:30 – 7:00 arasına kırpılır. */
    durationSecondsForSlots(slots, seed) {
      const base = K.lyricStructureSeconds(slots);
      if (!seed) return U.clamp(base, 90, 420);
      const str = String(seed);
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
      const off = (h % 31) - 15;                  // ±15 sn sapma
      return U.clamp(base + off, 90, 420);
    },
    durationForSlots(slots, seed) {
      const total = K.career.durationSecondsForSlots(slots, seed);
      return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
    },

    /* yayın türünün SADE adı — "Albüm (5 parça)" değil "Albüm" */
    typeName(n) {
      const t = K.RELEASE_TYPES[K.career.typeForCount(n)];
      return t ? t.name : "";
    },

    /* çok parçalı projeler için proje/albüm adı öner */
    suggestProjectTitle(n) {
      const pool = ["Karma", "Gece Yarısı", "Beton", "Kayıp Şehir", "Sis", "Ateş Hattı",
        "Gölge", "Son Çıkış", "Derin", "Mahalle", "Küller", "Fırtına", "Yol Ayrımı", "Sessizlik",
        "Pencere", "Zaman", "Hâlâ", "Yarın Yok", "Geri Dönüş", "Aynalar"];
      const base = U.pick(pool);
      const kind = K.career.typeForCount(n);
      const suffix = kind === "ep" ? " EP" : "";
      return base + suffix;
    },

    /* ---------------- kalite & maliyet hesapları ---------------- */
    /* Şarkı kalitesi — altyapı + vokal + mix parametrelerinden hesaplanır.
       Eski kayıtlardaki studioId/producerId yok sayılır. */
    estimateQuality(genre, budget, opts) {
      opts = opts || {};
      const g = K.genreById(genre);
      const p = K.state.player;
      const beat = K.beatById(opts.beatId);
      const vocal = K.vocalById(opts.vocalId);
      const kind = K.kindById(opts.kind);
      const license = K.licenseById(opts.licenseId);

      const base = 40;
      const budgetScore = U.clamp(budget / 6000, 0, 38);
      const talent = p.popularity * 0.16;
      const music = K.skillLevel("music") * 0.42;      // 0-42
      const studioSkill = K.skillLevel("studio") * 0.34; // 0-34
      const jobBonus = K.jobs ? K.jobs.qualityBonus() : 0;
      const fatiguePenalty = (p.fatigue || 0) * 0.22;

      // üretim parametreleri (0-100). 50 = nötr.
      const bq = opts.beatQuality != null ? opts.beatQuality : 50;
      const vq = opts.vocalQuality != null ? opts.vocalQuality : 50;
      const mq = opts.mixQuality != null ? opts.mixQuality : 50;
      const craftAdj = (bq - 50) * 0.24 + (vq - 50) * 0.28 + (mq - 50) * 0.26;

      // söz kalitesi ve albüm bütünlüğü kaliteye de yansır
      const lyricAdj = opts.lyricScore != null ? (opts.lyricScore - 50) * 0.16 : 0;
      const cohesionAdj = opts.cohesion != null ? (opts.cohesion - 50) * 0.10 : 0;
      // gündem uyumu: konjonktürü yakalayan sözler biraz daha parlaktır
      const agendaAdj = opts.agendaScore != null ? U.clamp((opts.agendaScore - 40) * 0.05, -2, 3) : 0;

      const teamQ = (K.team && K.team.bonus) ? K.team.bonus().quality : 0;   // ses mühendisi
      const labelQ = p.labelId ? 2 : 0;                                      // şirket A&R desteği (bağlantı)
      const mentorQ = (K.beef && K.beef.mentorBonus) ? K.beef.mentorBonus() : 0;  // duayen mentorlugu
      // kayıt kaynağı (stüdyo/ev/telefon...) kaliteye doğrudan etki eder
      const sourceQ = opts.sourceQAdd != null ? opts.sourceQAdd : (opts.sourceId ? K.sourceById(opts.sourceId).qAdd : 0);

      /* v10.28 — yeni sistemlerin kalite katkıları:
         · kendi stüdyosu (varlık) → kalite +
         · AKIL SAĞLIĞI: yüksek stres işi bozar (çarpan olarak uygulanır) */
      const studioOwnQ = (K.assets && K.assets.studioBonus) ? K.assets.studioBonus().quality : 0;

      const raw = (base + budgetScore + talent + music + studioSkill + beat.qAdd + vocal.qAdd + license.qAdd + craftAdj)
        * g.quality * kind.qMult + kind.qAdd + jobBonus + teamQ + labelQ + mentorQ + studioOwnQ
        - fatiguePenalty + lyricAdj + cohesionAdj + agendaAdj + sourceQ;
      const stressed = (K.mental && K.mental.qualityMult) ? K.mental.qualityMult() : 1;
      return U.clamp(Math.round(raw * stressed + U.rand(-5, 6)), 18, 99);
    },

    /* Parça başına düşen üretim bütçelerini normalleştirir.
       • opts.trackBudgets  → parça başına bütçe dizisi (asıl kaynak)
       • yoksa budget, PARÇA BAŞINA bütçe kabul edilir ve trackCount ile çarpılır */
    _trackBudgets(budget, trackCount, opts) {
      opts = opts || {};
      const n = Math.max(1, Math.round(trackCount || opts.trackCount || 1));
      if (opts.trackBudgets && opts.trackBudgets.length) {
        const out = opts.trackBudgets.slice(0, n).map(x => Math.max(0, Math.round(+x || 0)));
        while (out.length < n) out.push(out.length ? out[out.length - 1] : (budget || 0));
        return out;
      }
      return new Array(n).fill(Math.max(0, Math.round(+budget || 0)));
    },

    releaseCost(type, budget, marketing, opts) {
      opts = opts || {};
      const g = K.genreById(opts.genre || K.state.player.genre);
      const beat = K.beatById(opts.beatId);
      const vocal = K.vocalById(opts.vocalId);
      const kind = K.kindById(opts.kind);
      const license = K.licenseById(opts.licenseId);
      const n = Math.max(1, Math.round(opts.trackCount || 0));
      const tb = K.career._trackBudgets(budget, n, opts);
      const totalProd = U.sum(tb);
      const dist = ((K.RELEASE_TYPES[type] || K.RELEASE_TYPES.single).dist) + (n > 1 ? (n - 1) * 700 : 0);
      // kayıt kaynağı katsayısı (stüdyo pahalı, telefon ucuz)
      const srcIds = (opts.trackSources && opts.trackSources.length) ? opts.trackSources : null;
      const srcMult = srcIds
        ? (U.sum(srcIds, id => K.sourceById(id).costMult) / Math.max(1, srcIds.length))
        : (opts.sourceId ? K.sourceById(opts.sourceId).costMult : 1);
      // üretim maliyeti her parçanın KENDİ bütçesinden hesaplanır
      const prod = g.prodCost * totalProd * beat.costMult * vocal.costMult * kind.costMult * srcMult;
      const licenseCost = Math.round(totalProd * license.costMult * 0.5);
      /* v10.40 — A5: örnek hakkı artık OYUNCU KARARI. Eskiden sample
         altyapısı seçilince 15.000 sabit ücret sessizce ekleniyordu;
         oyuncunun "öde / riske gir" seçeneği yoktu. */
      const clearance = (opts.beatId === "sample" && opts.clearSample)
        ? (K.meta ? K.meta.clearanceCost : 15000) : 0;
      /* v10.40 — A6: enstrümantal sürüm üretimi */
      const instCost = opts.instrumental
        ? (K.meta ? K.meta.INSTRUMENTAL_COST : 5000) : 0;
      /* v10.42 — C4: YouTube Content ID kaydı */
      const cidCost = opts.contentId ? (K.meta ? K.meta.CONTENT_ID_COST : 3500) : 0;
      const storeCost = opts.storeCost != null ? opts.storeCost : 0;   // mağaza dağıtım ücreti
      /* v10.41 — B3: bölge kapsamı dağıtım tarafını çarpar (üretimi değil) */
      const regionMult = opts.regionMult != null ? +opts.regionMult : 1;
      const dm = K.settings ? K.settings.diffMult().cost : 1;
      return Math.round((prod + marketing + (dist + storeCost) * regionMult + licenseCost + clearance + instCost + cidCost) * dm);
    },

    /* ---------------- FORMAT ↔ PARÇA SAYISI (SİSTEM OTOMATİK ALGILAR) ----------------
       1 parça      → Single
       2 parça      → Çift Single
       3-4 parça    → EP
       5-11 parça   → Albüm        (5 şarkı koyarsan ALBÜM olur)
       12+ parça    → Deluxe Albüm
       Oyuncu formatı elle seçmez; parça sayısı formatı belirler. */
    /* v10.39 — YENİ KURAL (kullanıcı kararı):
         1 → Single · 2-8 → EP · 9+ → Albüm (tavan 30)
       Eskiden 2 "Çift", 3-4 "EP", 5-11 "Albüm", 12+ "Deluxe" diyordu ve
       arayüzdeki üç kart bununla çelişiyordu (Albüm kartı "5+ parça"
       yazıyordu ama 12 parça aslında Deluxe oluyordu).
       RELEASE_TYPES'ta double/mixtape/deluxe kayıtları DURUYOR: eski
       kayıtlardaki yayınlar onları hâlâ gösterebilsin. */
    typeForCount(n) {
      n = Math.max(1, Math.min(K.career.MAX_TRACKS, Math.round(+n || 1)));
      if (n <= 1) return "single";
      if (n <= 8) return "ep";
      return "album";
    },

    /* format kuralını insan diline çevirir (arayüzde gösterilir) */
    formatRule() {
      return "1 → Single · 2-8 → EP · 9+ → Albüm (en fazla " + K.career.MAX_TRACKS + " parça)";
    },

    formatLabel(n) {
      const id = K.career.typeForCount(n);
      const t = K.RELEASE_TYPES[id];
      return t ? `${t.icon} ${t.name} (${n} parça)` : (n + " parça");
    },

    /* ---------------- yayın oluştur ---------------- */
    createRelease(opts) {
      const s = K.state;
      const p = s.player;
      /* v10.28 — TÜKENMİŞLİK: zorunlu ara sırasında yayın yapılamaz.
         (mental.js tavan yapan streste 14 günlük ara verir.) */
      if (K.mental && K.mental.onHiatus && K.mental.onHiatus()) {
        K.toast("🛑 Zorunlu ara", "Tükendin — yayın yapamazsın. Dinlenme bitince devam edersin.", "bad");
        return null;
      }
      const type = opts.trackCount ? K.career.typeForCount(opts.trackCount) : (opts.type || "single");
      const trackCount = opts.trackCount ? U.clamp(Math.round(opts.trackCount), 1, K.career.MAX_TRACKS) : (K.RELEASE_TYPES[type] || K.RELEASE_TYPES.single).tracks;
      const genre = opts.genre || p.genre;
      const budget = opts.budget || 15000;
      const marketing = opts.marketing || 0;
      const waitDays = opts.waitDays || 18;
      const beatId = K.beatById(opts.beatId).id;
      const vocalId = K.vocalById(opts.vocalId).id;
      const beatQuality = U.clamp(opts.beatQuality != null ? +opts.beatQuality : 50, 0, 100);
      const vocalQuality = U.clamp(opts.vocalQuality != null ? +opts.vocalQuality : 50, 0, 100);
      const mixQuality = U.clamp(opts.mixQuality != null ? +opts.mixQuality : 50, 0, 100);
      const kind = K.kindById(opts.kind).id;
      const license = K.licenseById(opts.licenseId);

      /* --- sözler: ARTIK PARÇA BAŞINA (v10.39) ---
         Eskiden tek bir lyricSections vardı ve 14 parçalı bir albümde
         14 şarkının sözü de aynı oluyordu. opts.trackLyrics[i] verilirse
         her parça kendi sözünü alır; verilmezse eski davranış korunur
         (tüm parçalar aynı bölümü paylaşır) — eski kayıtlar bozulmasın. */
      const lyricTheme = K.lyricThemeById(opts.lyricsTheme).id;
      const inLyrics = Array.isArray(opts.trackLyrics) ? opts.trackLyrics : null;
      /* v10.41 — her parçanın ŞARKI BİÇİMİ (slot dizisi). Verilmezse
         null kalır ve süre de null olur (geriye uyum). */
      const inSlots = Array.isArray(opts.trackSlots) ? opts.trackSlots : null;
      const slotsAt = (i) => (inSlots && Array.isArray(inSlots[i]) && inSlots[i].length) ? inSlots[i].slice() : null;
      const legacySec = (opts.lyricSections && typeof opts.lyricSections === "object")
        ? opts.lyricSections : (opts.lyricsText || null);
      const secAt = (i) => (inLyrics && inLyrics[i] != null) ? inLyrics[i] : legacySec;
      const lyrList = [];
      for (let i = 0; i < trackCount; i++) lyrList.push(K.lyrics.analyze(secAt(i), lyricTheme, genre, kind, slotsAt(i)));
      const lyr = lyrList[0] || K.lyrics.analyze("", lyricTheme, genre, kind);   // öncü parça
      const avgLyricScore = Math.round(U.sum(lyrList, x => x.score) / Math.max(1, lyrList.length));
      const lyricText = lyrList.map((_, i) => K.lyrics.flatten(secAt(i), slotsAt(i)) || "").join("\n").slice(0, 4000);

      /* --- albüm konsepti (çok parçalı yayınlarda) --- */
      const isProject = trackCount >= 4;
      const conceptId = isProject ? K.albumConceptById(opts.conceptId).id : null;
      const cohesion = isProject ? K.lyrics.cohesion(conceptId, genre, kind, lyricTheme, trackCount) : null;

      /* --- GÜNDEM UYUMU: tema gündeme denk geliyorsa ivme (sözde konu geçmesi GEREKMEZ) --- */
      const agenda = (K.news && K.news.themeAffinity) ? K.news.themeAffinity(lyricTheme, genre) : { score: 0, hits: [] };

      /* --- GÖNDERMELER: sözlerde anılan sanatçılar (saygı / diss) --- */
      const mentions = (K.beef && K.beef.detectMentions) ? K.beef.detectMentions(lyricText) : [];
      const dissTarget = (mentions.find(m => m.tone === "diss") || {}).artistId ||
        ((K.beef && K.beef.detectTarget) ? K.beef.detectTarget(lyricText) : null);

      /* --- parçalar (isim + bütçe + kayıt kaynağı) --- */
      const title = opts.title || K.career.suggestTitle();
      const rawTracks = (opts.tracks && opts.tracks.length) ? opts.tracks : K.career.suggestTracks(trackCount);
      const tracks = rawTracks.slice(0, trackCount).map(x => (typeof x === "string") ? { name: x } : Object.assign({}, x));
      while (tracks.length < trackCount) tracks.push({ name: K.career.suggestTitle() });
      if (!opts.tracks || !opts.tracks.length) tracks[0].name = title; else if (!tracks[0].name) tracks[0].name = title;

      const trackBudgets = K.career._trackBudgets(budget, trackCount, opts);
      const trackSources = tracks.map(tr => K.sourceById(tr.source).id);
      // envanterden seçilen beat kaliteyi yükseltir
      const invBeat = opts.inventoryBeat ? (p.beats || []).find(b => b.id === opts.inventoryBeat) : null;
      const beatBoost = invBeat ? Math.max(0, Math.round((invBeat.quality - 50) * 0.6)) : 0;

      /* --- mağaza dağıtım seçimi --- */
      const stores = (opts.stores && opts.stores.length)
        ? opts.stores.slice()
        : (K.defaultStores ? K.defaultStores() : []);
      const storeCost = K.distroCost ? K.distroCost(stores) : 0;
      const storeReach = K.distroReach ? K.distroReach(stores) : 1;

      /* --- YAYIN STRATEJİSİ --- */
      const strategy = (opts.strategy === "snippet" || opts.strategy === "surprise") ? opts.strategy : "standard";
      const strategyCost = strategy === "snippet" ? 8000 : 0;
      const ghost = !!opts.ghost;

      const grossCost = K.career.releaseCost(type, budget, marketing, {
        genre, beatId, vocalId, kind, licenseId: license.id, trackCount, trackBudgets, trackSources, storeCost
      }) + strategyCost;

      /* --- ŞİRKET AKIŞI: sözleşmeliysen yayını şirket çıkarır; masrafın bir kısmını üstlenir --- */
      const myLabel = p.labelId ? K.labelById(p.labelId) : null;
      const viaLabel = !!myLabel;
      /* --- A&R TOPLANTISI: şirket revizyon isteyebilir --- */
      const arRequest = (viaLabel && Math.random() < 0.45)
        ? U.pick([
            { id: "mix", note: "Nakarat biraz geride kalmış; mix'i yukarı çekelim." },
            { id: "hook", note: "Hook daha vurucu olmalı; ikinci mısrayı değiştir." },
            { id: "length", note: "Şarkı kısa duruyor; bir verse daha ekleyelim." }
          ])
        : null;

      const payCost = viaLabel
        ? Math.max(1000, Math.round(grossCost * (1 - (myLabel.cover || 0.3) * 0.55)))
        : grossCost;
      const cost = payCost;
      if (!K.economy.canAfford(payCost)) {
        K.toast("Yetersiz bakiye", `Bu yayın için ${U.money(payCost)} gerekiyor.`, "bad");
        return null;
      }
      K.economy.spend(payCost, "release");

      const rel = {
        id: U.uid("rel"),
        title, genre, type, kind, beatId, vocalId,
        licenseId: license.id, licensePoints: license.points, exclusiveBeat: license.exclusive,
        /* v10.40 — A5: sample hakkı ödendi mi? (oyuncu kararı) */
        sampleClearance: (beatId === "sample") ? !!opts.clearSample : true,
        sampleRisk: (beatId === "sample" && !opts.clearSample),
        /* v10.40 — A3: müstehcen içerik bayrağı (mağazaya bildirilir) */
        explicit: tracks.some(t => !!t.explicit),
        explicitCount: tracks.filter(t => !!t.explicit).length,
        /* v10.40 — A6: enstrümantal sürüm */
        instrumental: !!opts.instrumental,
        /* v10.40 — A2: per-track feat varsa yayın seviyesi de dolu görünür */
        featureShare: (opts.featWith || tracks.some(t => t.feat)) ? U.clamp(opts.featureShare != null ? +opts.featureShare : 50, 10, 100) : 100,
        beatQuality, vocalQuality, mixQuality, beatBoost,
        conceptId, cohesion, dissTarget,
        agenda: { score: agenda.score, hits: agenda.hits.map(h => ({ id: h.id, cat: h.cat, title: h.title, heat: h.heat, gain: h.gain })) },
        lyrics: {
          themeId: lyricTheme, text: lyricText, score: avgLyricScore, lines: lyr.lines, words: lyr.words,
          sections: secAt(0), rhyme: lyr.rhyme || null, angle: lyr.angle || null,
          structure: lyr.structure || null, feedback: K.lyrics.feedback(lyr),
          /* yayın seviyesi skor = parçaların ORTALAMASI; öncü parçanınki
             ayrıca duruyor ki tek parçalı yayınlar hiç değişmesin. */
          lead: lyr.score,
          perTrack: lyrList.map((x, i) => ({ score: x.score, lines: x.lines, words: x.words, angle: x.angle || null }))
        },
        mentions: mentions.map(m => ({ artistId: m.artistId, name: m.name, tone: m.tone })),
        trackBudgets, trackSources, stores, storeReach, storeCost,
        strategy, ghost, inventoryBeat: opts.inventoryBeat || null,
        arRequest: arRequest, arResolved: !arRequest,
        /* v10.41 — parça biçimleri yayına taşınır */
        trackSlots: inSlots ? inSlots.slice(0, trackCount).map(s => (Array.isArray(s) ? s.slice() : null)) : null,
        tracks: tracks.map((tr, i) => {
          const tb = tr.budget != null ? U.clamp(Math.round(+tr.budget || 0), 0, 500000) : trackBudgets[i];
          const src = K.sourceById(trackSources[i]);
          const slots = slotsAt(i);
          const trackName = tr.name || (title + " " + (i + 1));
          return {
            name: trackName,
            /* v10.41 — biçim, süre ve biçim puanı parça bazında */
            slots: slots,
            duration: slots ? K.career.durationForSlots(slots, trackName) : null,
            formScore: slots ? K.lyricStructureScore(slots) : 0,
            budget: tb,
            source: src.id,
            file: { type: src.file, bit: src.bit, size: src.size },
            /* v10.40 — A2: parça bazında featuring (yayın seviyesine düşer) */
            featWith: tr.feat || opts.featWith || null,
            /* v10.40 — A3: parça bazında explicit bayrağı */
            explicit: !!tr.explicit,
            /* v10.40 — A4: ISRC parça kayıt kodu (distribütör atar) */
            isrc: (K.meta && K.meta.isrc)
              ? K.meta.isrc(U.dateForDay(s.day).y, ((p.releases || []).length * 100) + i + 1)
              : null,
            /* v10.40 — A6: sözsüz sürüm üretildi mi */
            instrumental: !!opts.instrumental,
            quality: U.clamp(K.career.estimateQuality(genre, tb, {
              beatId, vocalId, beatQuality: U.clamp(beatQuality + beatBoost, 0, 100), vocalQuality, mixQuality, kind, licenseId: license.id,
              lyricScore: (lyrList[i] || lyr).score, cohesion, agendaScore: agenda.score, sourceQAdd: src.qAdd
            }) + (i === 0 ? 2 : 0), 18, 99),
            /* parça kendi söz skorunu taşır — albümde kalite artık
               parçadan parçaya değişir */
            lyrics: {
              score: (lyrList[i] || lyr).score,
              lines: (lyrList[i] || lyr).lines,
              words: (lyrList[i] || lyr).words,
              sections: secAt(i),
              slots: slots
            }
          };
        }),
        featWith: opts.featWith || null,
        waitDays, startDay: s.day,
        budget, marketing, cost, grossCost, progress: 0, stage: "prep",
        viaLabel: viaLabel, labelId: myLabel ? myLabel.id : null, labelName: myLabel ? myLabel.name : null,
        labelCover: myLabel ? (myLabel.cover || 0) : 0,
        distributor: myLabel ? myLabel.distributor : "KARMA Dağıtım",
        coverSeed: opts.coverSeed || U.uid("cv"),
        /* v10.41 — B grubu METADATA
           Gerçek dağıtım formunun zorunlu alanları: bölge, dil,
           krediler, etiket adı, telif yılı, barkod. */
        regions: (opts.regions && opts.regions.length) ? opts.regions.slice() : (K.defaultRegions ? K.defaultRegions() : ["world"]),
        lang: opts.lang || "tr",
        credits: opts.credits || (K.meta ? K.meta.defaultCredits({}) : {}),
        labelName: String(opts.labelName || "").trim() || (myLabel ? myLabel.name : (p.stageName + " Müzik")),
        copyrightYear: String(opts.copyrightYear || U.dateForDay(s.day).y),
        upc: (K.meta && K.meta.upc) ? K.meta.upc(title + s.day + trackCount) : null,
        regionReach: (K.meta && K.meta.regionReach) ? K.meta.regionReach(opts.regions) : 1,
        langFit: (K.meta && K.meta.languageFit) ? K.meta.languageFit(opts.lang, opts.regions) : 1,
        copyright: (myLabel ? myLabel.name : (p.stageName + " Müzik")) + " ℗ " + String(opts.copyrightYear || U.dateForDay(s.day).y),
        /* v10.42 — C grubu teknik alanlar */
        coverPx: U.clamp(+opts.coverPx || 1400, 200, 6000),
        contentId: !!opts.contentId,
        releaseWeekday: (K.meta ? K.meta.weekdayOf(s.day + waitDays) : null),
        releaseDayFit: (K.meta ? K.meta.releaseDayFit(s.day + waitDays) : 1)
      };

      p.releases.push(rel);
      K.toast(viaLabel ? "🏢 Şirkete gönderildi" : "🎧 Yayın sırasına eklendi",
        viaLabel
          ? `"${title}" ${myLabel.name} tarafından ${waitDays} gün sonra yayınlanacak.`
          : `"${title}" ${waitDays} gün sonra yayınlanacak.`, "ok");
      K.save();
      K.refresh();
      return rel;
    },

    /* ---------------- yayınla (pipeline bittiğinde) ---------------- */
    publishRelease(rel) {
      const s = K.state;
      const p = s.player;
      const kindDef = K.kindById(rel.kind);
      const relThemeId = rel.lyrics ? rel.lyrics.themeId : "street";
      const themeEff = K.lyricThemeById(relThemeId).effect;
      /* --- OYUNCU KİMLİK UYUMU (player-persona.js) --- */
      const pfit = (K.playerPersonaFit && p.persona) ? K.playerPersonaFit(p.persona, rel.genre, relThemeId) : null;
      const persona = pfit ? pfit.persona : null;
      const lyricBoost = 0.85 + ((rel.lyrics ? rel.lyrics.score : 50) / 100) * 0.4;
      const cohesionMult = rel.cohesion != null ? 0.9 + (rel.cohesion / 100) * 0.35 : 1;

      // GÜNDEM: eşleşen konu hâlâ gündemdeyse (paylaşım penceresi) etkileşim çarpanı uygula.
      const curTopics = new Set((K.news ? K.news.current() : []).map(t => t.id));
      const liveHits = ((rel.agenda && rel.agenda.hits) || []).filter(h => curTopics.has(h.id));
      const agendaBoost = Math.min(0.9, U.sum(liveHits, h => h.gain) / 100 * 0.95);
      const songs = rel.tracks.map((t, i) => {
        const g = K.genreById(rel.genre);
        const quality = t.quality;
        const song = {
          id: U.uid("song"),
          title: t.name,
          genre: rel.genre,
          kind: rel.kind || "normal",
          beatId: rel.beatId || "digital",
          vocalId: rel.vocalId || "rap",
          viralBonus: kindDef.viral * (themeEff.viral || 1),
          mass: kindDef.mass * (themeEff.mass || 1),
          lyricScore: (t.lyrics && t.lyrics.score != null) ? t.lyrics.score : (rel.lyrics ? rel.lyrics.score : 50),
          lyricTheme: rel.lyrics ? rel.lyrics.themeId : null,
          lyricBoost,
          lyricLoyalty: themeEff.loyalty || 1,
          conceptId: rel.conceptId || null,
          source: t.source || null,
          file: t.file || null,
          stores: rel.stores || null,
          storeReach: rel.storeReach || 1,
          quality,
          type: rel.type,
          /* v10.40 — A2: parça bazında feat (yayın seviyesi yedek) */
          featWith: t.featWith || rel.featWith || null,
          /* v10.40 — A3: explicit bayrağı mağazaya bildirilir */
          explicit: !!(t.explicit || rel.explicit),
          /* v10.40 — A4: ISRC kayıt kodu */
          isrc: t.isrc || null,
          /* v10.40 — A6: enstrümantal sürüm */
          instrumental: !!rel.instrumental,
          /* v10.40 — A5: temizlenmemiş sample riski */
          sampleRisk: !!rel.sampleRisk,
          /* v10.41 — B grubu metadata şarkıya işlenir */
          upc: rel.upc || null,
          labelName: rel.labelName || null,
          copyrightYear: rel.copyrightYear || null,
          credits: rel.credits || null,
          lang: rel.lang || null,
          regions: rel.regions || null,
          /* v10.42 — C grubu teknik */
          coverPx: rel.coverPx || 1400,
          contentId: !!rel.contentId,
          releaseDayFit: rel.releaseDayFit || 1,
          releaseWeekday: rel.releaseWeekday != null ? rel.releaseWeekday : null,
          albumTitle: rel.title,
          trackNo: i + 1,
          budget: (rel.trackBudgets && rel.trackBudgets[i] != null) ? rel.trackBudgets[i] : rel.budget,
          trackBudgets: rel.trackBudgets || null,
          /* v10.13 — ALT PUANLAR ARTIK SAKLANIYOR
             Eskiden şarkı yalnızca tek bir `quality` taşıyordu; beat /
             vokal / mix puanları ve hook gücü kaydedilmiyordu. İki sonucu
             vardı: (1) demo gönderiminde sanatçı neye baktığına göre
             değerlendirme yapamıyordu, (2) `K.econ.skipRateFor()` bu
             alanları okuduğu için 30 sn atlama oranı hep VARSAYILAN
             değerlerle hesaplanıyordu. Artık gerçek üretim parametreleri
             şarkıya yazılıyor. */
          beatQuality: U.clamp((rel.beatQuality != null ? rel.beatQuality : 50) + (rel.beatBoost || 0), 0, 100),
          vocalQuality: U.clamp(rel.vocalQuality != null ? rel.vocalQuality : 50, 0, 100),
          mixQuality: U.clamp(rel.mixQuality != null ? rel.mixQuality : 50, 0, 100),
          /* hook gücü: vokal tarzı + parça türü + genel kalite karışımı */
          hookStrength: U.clamp(
            K.vocalById(rel.vocalId).mass * 38
            + kindDef.mass * 30
            + quality * 0.34
            + (K.vocalById(rel.vocalId).qAdd > 0 ? 5 : 0), 0, 100),
          /* giriş uzunluğu (saniye): türe göre değişir */
          introLength: ({
            freestyle: 3, diss: 4, normal: 8, remix: 6, live: 6, acoustic: 11
          })[rel.kind || "normal"] || 8,
          marketing: rel.marketing,
          producerPoints: rel.licensePoints || 0,
          revenueShare: (rel.featureShare != null ? rel.featureShare / 100 : 1),
          exclusiveBeat: !!rel.exclusiveBeat,
          coverSeed: rel.coverSeed,
          publishedDay: s.day,
          streams: 0,
          dailyStreams: 0,
          lastDaily: 0,
          revenue: 0,
          spotifyStreams: 0,
          appleStreams: 0,
          youtubeViews: 0,
          chartRank: null,
          chartPeak: 999,
          lists: [],
          listPeak: 999,
          viral: false,
          boosts: {},
          decayRate: U.clamp(2.4 - quality / 60, 0.7, 2.2),
          agendaScore: (rel.agenda ? rel.agenda.score : 0),
          agendaBoost: agendaBoost,
          agendaTopics: liveHits.map(h => ({ cat: h.cat, title: h.title, gain: h.gain }))
        };
        // ilk gün ivmesi (parça türü katsayısıyla)
        /* v10.41 — B3/B4: bölge kapsamı ve dil uyumu erişimi belirler */
        song.dailyStreams = K.game.initialDaily(song) * (1 + rel.marketing / 60000) * kindDef.mass * lyricBoost * cohesionMult * (rel.storeReach || 1) * (rel.regionReach || 1) * (rel.langFit || 1) * (rel.releaseDayFit || 1);
        /* persona uyumu: tutarlıysa güçlenir, tutarsızsa ses getirmez */
        if (pfit) {
          if (pfit.score >= 0.5) {
            song.dailyStreams *= (persona.mass || 1);
            song.viralBonus = (song.viralBonus || 1) * (persona.viral || 1);
            song.lyricLoyalty = (song.lyricLoyalty || 1) * (persona.loyalty || 1);
          } else {
            song.dailyStreams *= 0.9;
          }
        }
        /* v10.40 — A3: EXPLICIT BAYRAĞI. Mağaza editoryal listeleri ve
           radyo explicit parçaları atlar; buna karşılık çekirdek kitle
           (sokak) daha sadık olur. Oyuncunun yeni bir denge ekseni. */
        if (song.explicit) {
          const eff = K.meta ? K.meta.explicitEffect(true) : { reach: 0.94, core: 1.12 };
          song.dailyStreams *= eff.reach;
          song.viralBonus = (song.viralBonus || 1) * eff.core;
          song.lyricLoyalty = (song.lyricLoyalty || 1) * 1.06;
          song.mass = (song.mass || 1) * 1.05;
        }
        /* v10.40 — A6: enstrümantal sürüm küçük ama istikrarlı katkı */
        if (song.instrumental) {
          song.dailyStreams *= 1 + (K.meta ? K.meta.INSTRUMENTAL_BONUS : 0.05);
          song.syncIncome = true;
        }
        /* yayın stratejisi: snippet beklenti kurar, surprise sessiz başlar */
        if (rel.strategy === "snippet") song.dailyStreams *= 1.18;
        else if (rel.strategy === "surprise") song.dailyStreams *= 0.88;
        /* ghostwriter: sözler daha güçlü görünür */
        if (rel.ghost) { song.dailyStreams *= 1.06; song.ghost = true; }
        // gündem boost: ilk gün ivmesi + sonraki günlerde yavaşça sönen ekstra dinlenme
        if (agendaBoost > 0.02) {
          song.boosts.agenda = (song.boosts.agenda || 0) + agendaBoost;
          song.dailyStreams *= (1 + agendaBoost);
          song.viralBonus = (song.viralBonus || 1) * (1 + agendaBoost * 0.6);
        }
        // feature ise karşı tarafın kitlesi eklenir
        if (song.featWith) {
          const fa = K.artistById(song.featWith);
          if (fa) {
            song.dailyStreams *= (1 + fa.popularity / 90);
            song.featName = fa.stageName;
          }
        }
        // v10.40 — explicit parçalar editoryal listelere daha zor girer
        if (song.explicit && song.playlists && song.playlists.length) {
          const keep = (K.meta ? K.meta.explicitEffect(true).playlistPenalty : 0.68);
          const n2 = Math.max(0, Math.round(song.playlists.length * keep));
          song.playlists = song.playlists.slice(0, n2);
        }
        // EDİTORYAL PLAYLIST (yayın öncesi pitch sonucu)
        if (rel.playlistPitch && rel.playlistPitch.accepted && rel.playlistPitch.playlists.length) {
          song.playlists = rel.playlistPitch.playlists.slice();
          song.boosts.playlist = (song.boosts.playlist || 0) + 0.18 * song.playlists.length;
        }
        // ALGORİTMİK LİSTELER: Release Radar (takipçi) + Discover Weekly (benzer dinleyici)
        const followers = K.fans ? K.fans.followers() : 0;
        const rr = U.clamp(followers / 500000 + (s.player.popularity || 0) / 300, 0, 0.7);
        const dw = U.clamp((song.quality - 50) / 120 + (K.genreById(rel.genre).mass - 1) * 0.4, 0, 0.4);
        song.algos = { releaseRadar: rr, discoverWeekly: dw };
        if (rr > 0) song.boosts.releaseRadar = (song.boosts.releaseRadar || 0) + rr;
        if (dw > 0) song.boosts.discoverWeekly = (song.boosts.discoverWeekly || 0) + dw;
        return song;
      });

      /* --- ALBÜM KAYDI (çok parçalı projeler) --- */
      if (rel.conceptId) {
        const album = {
          id: U.uid("alb"),
          title: rel.title,
          conceptId: rel.conceptId,
          conceptName: K.albumConceptById(rel.conceptId).name,
          conceptIcon: K.albumConceptById(rel.conceptId).icon,
          type: rel.type,
          cohesion: rel.cohesion,
          lyricTheme: rel.lyrics ? rel.lyrics.themeId : null,
          releasedDay: s.day,
          trackIds: songs.map(x => x.id),
          streams: 0, lastDaily: 0, critics: null, chartRank: null, chartPeak: 999,
          coverSeed: rel.coverSeed
        };
        songs.forEach(x => { x.albumId = album.id; });
        p.albums = p.albums || [];
        p.albums.unshift(album);
        const repGain = rel.cohesion * 0.025 + (themeEff.rep || 0) * 1.2;
        p.reputation = Math.min(100, p.reputation + repGain);
        K.toast("💿 Albüm yayında!", `${rel.title} · ${album.conceptIcon} ${album.conceptName} · bütünlük %${rel.cohesion}`, "ok");
      } else {
        p.reputation = Math.min(100, p.reputation + (themeEff.rep || 0) * 0.6);
      }

      /* --- PERSONA: tutarlılık itibar ve kimlik getirir --- */
      if (pfit && persona) {
        if (pfit.score >= 0.5) {
          p.reputation = Math.min(100, (p.reputation || 0) + (persona.rep || 1) * 0.6);
        } else {
          p.reputation = Math.max(0, (p.reputation || 0) - 1.2);
          p.identity = Math.max(0, (p.identity == null ? 60 : p.identity) - 6);
          s.notifications = (s.notifications || []).concat([{
            title: "🧩 Kimlik uyuşmazlığı",
            msg: `"${rel.title}" ${persona.name} kimliğiyle uyuşmadı; dinleyici kimliksiz buldu.`,
            kind: "warn", day: s.day
          }]).slice(-60);
        }
      }

      /* --- GHOSTWRITER: sözler güçlü ama sızma riski var --- */
      if (rel.ghost) {
        const gh = p.ghost = p.ghost || { hired: false, name: null, exposure: 0, uses: 0 };
        gh.uses = (gh.uses || 0) + 1;
        const leak = Math.min(0.6, 0.16 + (gh.exposure || 0) * 0.12);
        if (U.chance(leak)) {
          gh.exposure = (gh.exposure || 0) + 1;
          p.reputation = Math.max(0, (p.reputation || 0) - 6);
          p.image = U.clamp((p.image || 50) - 5, 0, 100);
          s.notifications = (s.notifications || []).concat([{
            title: "🕵️ Ghostwriter sızıntısı",
            msg: `"${rel.title}" sözlerini başkasının yazdığı ortaya çıktı. İtibar −6.`,
            kind: "bad", day: s.day
          }]).slice(-60);
          K.toast("🕵️ Sızıntı!", "Söz yazarı işi ortaya çıktı; itibar zarar gördü.", "bad");
        }
      }

      /* --- RADYO İLK ÇALMA: şanslıysa prime-time prömiyer --- */
      const radioChance = 0.24 + (((songs[0] && songs[0].quality) || 50) - 50) / 240 + (rel.marketing / 400000);
      if (U.chance(U.clamp(radioChance, 0.05, 0.75))) {
        const show = U.pick(["Radyo Karma Gece", "Trap Saati", "Yeni Sesler", "Sokak Frekansı", "Sabah Programı"]);
        songs.forEach(x => { x.boosts = x.boosts || {}; x.boosts.radio_premiere = 0.16; x.dailyStreams *= 1.12; });
        s.notifications = (s.notifications || []).concat([{
          title: "📻 Radyo prömiyeri",
          msg: `"${rel.title}" ${show} programında ilk kez çalındı.`,
          kind: "ok", day: s.day
        }]).slice(-60);
        K.toast("📻 Radyo prömiyeri!", `"${rel.title}" • ${show}`, "ok");
      }

      // SAMPLE CLEARANCE RİSKİ: izinsiz örnek iddiası
      if (rel.sampleClearance && U.chance(0.35)) {
        p.reputation = Math.max(0, p.reputation - 3);
        p.image = U.clamp((p.image || 50) - 4, 0, 100);
        K.toast("⚠️ Örnek (sample) iddiası", "Kullandığın sample için izin tartışması çıktı.", "bad");
        s.notifications = (s.notifications || []).concat([{
          title: "⚠️ Sample iddiası", msg: `"${rel.title}" için örnek izni tartışması. İtibar −3.`, kind: "bad", day: s.day
        }]).slice(-60);
      }

      // sözlerdeki göndermeler: saygı ilişkiyi büyütür, diss husumet doğurur (+ şirket arkadaşları)
      if (rel.mentions && rel.mentions.length && K.beef && K.beef.applyMentions) {
        K.beef.applyMentions(rel.mentions, songs[0]);
      } else if (rel.dissTarget && K.beef && K.beef.noteDissTrack) {
        K.beef.noteDissTrack(rel.dissTarget, songs[0]);
      }

      /* v10.17 — DİKKAT DALGASI: yayın dalgayı besler.
         Güç = kalite + tanıtım bütçesi + gündem uyumu.
         Doygunluk biriktikçe aynı güçteki yayın daha az dalga üretir:
         bu yüzden sürekli yayın yapan sanatçı bir noktada PLATO yapar,
         ara veren ise düşer. ("yüksel → zirve → düş") */
      /* v10.21 — ÇIKIŞ HAFTASI: ön kayıt + teaser hype'ı yayın anında
         dinlenme ivmesine dönüşür ve şarkıda İLK HAFTA penceresi açılır.
         (systems/rollout.js — modele ekleme yapar, mevcut akışı bozmaz.) */
      if (K.rollout && K.rollout.onPublish) K.rollout.onPublish(rel, songs);

      const avgQ = songs.length ? U.sum(songs, x => x.quality || 50) / songs.length : 50;
      K.game.bumpAttention(U.clamp(
        0.28 + avgQ / 200 + (rel.marketing || 0) / 420000 + (rel.agenda && rel.agenda.score ? 0.12 : 0),
        0, 1.4
      ));

      // ilk şarkıyı döndür (game.js çoklu yayını ayrıca işler)
      songs.slice(1).forEach(p2 => p.songs.push(p2));
      return songs[0];
    },

    /* 360 anlaşma varsa şirketin ilgili gelir kaleminden aldığı pay */
    labelCut(kind, amount) {
      const d = K.state.player.labelDeal;
      if (!d || !d.splits || !amount) return 0;
      let pct = d.splits[kind] || 0;
      if (K.team && K.team.bonus) pct = Math.max(0, pct - K.team.bonus().lawyerCut * 100);   // avukat payı düşürür
      return Math.round(amount * pct / 100);
    },

    /* ---------------- EDİTORYAL PLAYLIST PITCH (yayın öncesi) -------------
       Gerçekçilik: pitch yayından ÖNCE ve zamanında yapılmalı. Erken/geç
       pitch şansı düşürür. Sonuç yayın anında listelere yansır. */
    pitchWindow(rel) {
      const remaining = Math.max(0, rel.startDay + rel.waitDays - K.state.day);
      if (rel.playlistPitch) return { ok: false, label: "Pitch gönderildi", remaining };
      if (remaining < 7) return { ok: false, label: "Pencere kapandı (çok geç)", remaining };
      if (remaining > rel.waitDays - 2) return { ok: false, label: "Biraz erken", remaining };
      return { ok: true, label: "Pitch için uygun", remaining };
    },

    pitchPlaylist(relId) {
      const s = K.state, p = s.player;
      const rel = (p.releases || []).find(r => r.id === relId);
      if (!rel) return false;
      if (rel.playlistPitch) { K.toast("Zaten pitch yapıldı", "", "warn"); return false; }
      const win = K.career.pitchWindow(rel);
      if (!win.ok) { K.toast("Pitch zamanı değil", win.label, "warn"); return false; }
      const cost = 9000;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", U.money(cost) + " gerekiyor.", "bad"); return false; }
      K.economy.spend(cost, "playlist_pitch");

      // zamanlama çarpanı: 10-22 gün önce ideal
      const timing = win.remaining >= 10 && win.remaining <= 22 ? 1 : 0.65;
      const q = (rel.tracks && rel.tracks[0]) ? rel.tracks[0].quality : 55;
      const ar = (K.label && K.label.hasLabel()) ? K.label.staffBonus().signing : 0;
      /* v10.40 — A3: explicit yayınlar editoryal ekipte daha zor kabul alır */
      const expPen = (rel.explicit ? 14 : 0);
      const score = U.clamp(q * 0.6 + (p.popularity || 0) * 0.9 + ar * 0.5 + timing * 30 + U.rand(-15, 18) - expPen, 0, 100);
      const accepted = score >= 55;
      const pool = ["rapturkiye", "traptr", "drilltr", "newmusic", "nightmode", "popturkiye"];
      const playlists = [];
      if (accepted) {
        const n = U.clamp(Math.round(score / 30), 1, 3);
        while (playlists.length < n) { const x = U.pick(pool); if (!playlists.includes(x)) playlists.push(x); }
      }
      rel.playlistPitch = { day: s.day, remaining: win.remaining, score: Math.round(score), accepted, playlists };
      if (accepted) K.toast("📻 Playlist kabulü!", `${rel.title}: ${playlists.length} editoryal liste (puan ${Math.round(score)}).`, "ok");
      else K.toast("📻 Pitch reddedildi", `${rel.title}: editoryal ekip eklemedi (puan ${Math.round(score)}).`, "warn");
      s.notifications = (s.notifications || []).concat([{
        title: accepted ? "📻 Playlist kabulü" : "📻 Pitch reddi",
        msg: `${rel.title} · puan ${Math.round(score)}${accepted ? " · " + playlists.join(", ") : ""}`,
        kind: accepted ? "ok" : "warn", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- v10.42 — C5: TAKEDOWN / YENİDEN YÜKLEME ------------
       Yayınlanmış bir işi mağazalardan çekebilir (isteğe bağlı ya da
       örnek hakkı nedeniyle zorunlu) ve düzeltip tekrar gönderebilirsin. */
    takedownSong(songId, reason) {
      const s = K.state, p = s.player;
      const song = (p.songs || []).find(x => x.id === songId);
      if (!song) return false;
      if (song.takenDown) { K.toast("Zaten kaldırıldı", "", "warn"); return false; }
      song.takenDown = true;
      song.takenDownDay = s.day;
      song.takedownReason = reason || "manual";
      song.dailyStreams = 0;
      song.lastDaily = 0;
      song.playlists = [];
      song.chartRank = null;
      s.notifications = (s.notifications || []).concat([{
        title: "🚫 Yayın kaldırıldı",
        msg: `"${song.title}" mağazalardan çekildi.${reason === "sample" ? " Örnek hakkı ödenmemişti." : ""}`,
        kind: "warn", day: s.day
      }]).slice(-60);
      K.toast("🚫 Yayın kaldırıldı", `"${song.title}" artık mağazalarda yok.`, "warn");
      K.save(); K.refresh();
      return true;
    },

    reuploadSong(songId) {
      const s = K.state, p = s.player;
      const song = (p.songs || []).find(x => x.id === songId);
      if (!song || !song.takenDown) return false;
      const cost = (K.meta ? K.meta.REUPLOAD_COST : 6000);
      if (!K.economy.canAfford(cost)) {
        K.toast("Yetersiz bakiye", U.money(cost) + " gerekiyor.", "bad");
        return false;
      }
      K.economy.spend(cost, "reupload");
      song.takenDown = false;
      song.takedownReason = null;
      song.sampleRisk = false;                 // düzeltilmiş sürüm gönderildi
      song.publishedDay = s.day;
      song.decayRate = 1.6;
      song.dailyStreams = Math.max(200, Math.round(K.game.initialDaily(song) * 0.55));
      song.boosts = song.boosts || {};
      song.boosts.reupload = 0.10;
      K.toast("♻️ Yeniden yüklendi", `"${song.title}" düzeltilmiş sürümle mağazalara döndü.`, "ok");
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- A&R revizyonu ---------------- */
    resolveAr(relId, accept) {
      const s = K.state, p = s.player;
      const rel = (p.releases || []).find(r => r.id === relId);
      if (!rel || !rel.arRequest) return false;
      if (accept) {
        const cost = 8000;
        if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", U.money(cost) + " gerekiyor.", "bad"); return false; }
        K.economy.spend(cost, "ar_revision");
        rel.tracks.forEach(t => { t.quality = U.clamp(t.quality + 4, 18, 99); });
        rel.waitDays += 3;
        p.reputation = Math.min(100, (p.reputation || 0) + 1);
        K.toast("🔧 Revizyon uygulandı", "A&R memnun; kalite +4, yayın 3 gün ötelendi.", "ok");
      } else {
        p.reputation = Math.max(0, (p.reputation || 0) - 2);
        K.toast("A&R isteği yoksayıldı", "Şirket not aldı; itibar −2.", "warn");
      }
      rel.arResolved = true;
      rel.arRequest = null;
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- promosyon (kariyer tarafı) ---------------- */
    promote(songId, channelId) {
      const song = K.state.player.songs.find(x => x.id === songId);
      if (!song) return false;
      const ch = K.PROMO_CHANNELS.find(c => c.id === channelId);
      if (!ch) return false;
      if (!K.economy.canAfford(ch.cost)) {
        K.toast("Yetersiz bakiye", `${ch.name} için ${U.money(ch.cost)} gerekiyor.`, "bad");
        return false;
      }
      K.economy.spend(ch.cost, "promo");
      song.boosts[ch.id] = (song.boosts[ch.id] || 0) + ch.effect;
      song.dailyStreams *= (1 + ch.effect * 0.5);
      K.toast("📣 Promosyon yapıldı", `"${song.title}" için ${ch.name} aktif.`, "ok");
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- oyuncu → şirket sözleşmesi ---------------- */
    labelOfferTerms(labelId) {
      const l = K.labelById(labelId);
      if (!l) return null;
      const p = K.state.player;
      const leverage = U.clamp(0.4 + p.popularity / 120, 0.4, 1.3);
      /* 360 ANLAŞMA: güçlü şirketler turne/merch/sync'ten de pay ister.
         Daha yüksek avans verir ama gelirinin bir kısmını alır. */
      const is360 = (l.power || 50) >= 55 && U.chance(0.55);
      const mgr = (K.team && K.team.bonus) ? K.team.bonus().advance : 1;   // menajer pazarlığı
      const advance = Math.round(l.fee * leverage / 3 * (is360 ? 1.45 : 1) * mgr);
      return {
        labelId,
        labelName: l.name,
        advance,
        royalty: l.royalty,          // şirketin streaming'den aldığı pay
        artistRoyalty: 100 - l.royalty,
        lengthDays: 180,
        dealType: is360 ? "360" : "standard",
        splits: is360
          ? { touring: U.randInt(12, 20), merch: U.randInt(18, 28), sync: U.randInt(20, 30) }
          : { touring: 0, merch: 0, sync: 0 }
      };
    },

    signWithLabel(labelId) {
      const p = K.state.player;
      if (p.labelId) {
        K.toast("Zaten bir şirkettesin", "Önce mevcut sözleşmeni bitirmelisin.", "warn");
        return false;
      }
      const t = K.career.labelOfferTerms(labelId);
      if (!t) return false;
      p.labelId = labelId;
      /* AVANS ARTIK BORÇ: telif gelirinden geri ödenir (recoup). */
      p.labelDeal = {
        labelId, advance: t.advance, recouped: 0,
        labelRoyalty: t.royalty, artistRoyalty: t.artistRoyalty,
        startDay: K.state.day, lengthDays: t.lengthDays,
        dealType: t.dealType || "standard", splits: t.splits || { touring: 0, merch: 0, sync: 0 }
      };
      K.economy.earn(t.advance, "advance");
      K.toast("✍️ Sözleşme imzalandı", `${t.labelName} · avans ${U.money(t.advance)} (teliften geri ödenecek)`, "ok");
      K.state.notifications = (K.state.notifications || []).concat([{
        title: "✍️ Sözleşme", msg: `${t.labelName} ile anlaştın. Avans ${U.money(t.advance)} recoup edilecek (şirket payı %${t.royalty}).`, kind: "ok", day: K.state.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    leaveLabel() {
      const p = K.state.player;
      if (!p.labelId) return;
      const name = K.labelById(p.labelId)?.name || "şirket";
      p.labelId = null;
      p.reputation = Math.max(0, p.reputation - 5);
      K.toast("Sözleşme bitti", `${name} ile yollar ayrıldı.`, "warn");
      K.save(); K.refresh();
    }
  };
})(window.K);
