/* ============================================================
   KARMA — systems/npcmind.js   (v10.50 · RPG katmanı)
   NPC ZİHİN KATMANI — hafıza · ruh hali · dedikodu · hikâye yayı

   Neden ayrı dosya?
   -----------------
   chat.js "ne söylüyor"u (cümle havuzları), personality.js ise
   "neye nasıl tepki veriyor"u (bias / kırmızı çizgi) tutar. Ama
   günümüz RPG'lerinde bir NPC'nin bir de İÇ DURUMU vardır:

     · NE HATIRLIYOR   → açılan konular, verilen sözler, cevaplanmamış sorular
     · NASIL HİSSEDİYOR → günlük ruh hali (yorgun / hype / gergin / üzgün…)
     · KİMDEN DUYDU     → dedikodu ağı (NPC'ler birbirini etkiler)
     · HANGİ HİKÂYEDE   → sanatçıya özel ilişki yayı (arc)

   Bu dosya o iç durumu tutar ve DM motoruna bağlanır. Tümü KALICIDIR:
   `rel._mind` içinde saklanır ve kayıtla birlikte yazılır.

   Tasarım ilkesi: içerik havuzu DEĞİL, davranış motoru. Cümleler
   burada yalnızca "durumun sesi" olarak yaşar; asıl iş, hangi durumda
   hangi davranışın tetikleneceğini belirlemektir.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ============================================================
     1) RUH HALİ
     Her sanatçının GÜNLÜK bir ruh hali olur. Deterministik üretilir
     (aynı gün aynı ruh hali), olaylarla (beef, hakaret, yeni ilişki)
     geçersiz kılınabilir. Ruh hali üç şeyi etkiler:
       · cevap tonu (hangi cümle havuzundan destek alınır)
       · samimiyet çarpanı (üzgünken içtenlik daha çok işler, öfkeliyken az)
       · cevap GECİKMESİ (yorgunken geç, hype'ken hemen)
     ============================================================ */
  const MOODS = {
    sakin:  { key: "sakin",  label: "Sakin",  icon: "😌", delta: 1.00, wait: [1, 3] },
    hype:   { key: "hype",   label: "Hype",   icon: "🔥", delta: 1.12, wait: [0, 2] },
    yorgun: { key: "yorgun", label: "Yorgun", icon: "🥱", delta: 0.86, wait: [4, 14] },
    gergin: { key: "gergin", label: "Gergin", icon: "😤", delta: 0.72, wait: [2, 9] },
    uzgun:  { key: "uzgun",  label: "Üzgün",  icon: "🥀", delta: 1.10, wait: [3, 11] },
    ofkeli: { key: "ofkeli", label: "Öfkeli", icon: "😠", delta: 0.55, wait: [1, 6] }
  };

  /* ruh haline göre "durum cümlesi" — cevabın sonuna nadiren eklenir */
  const MOOD_LINES = {
    sakin:  ["Bugün kafam yerinde, rahat konuşalım.", "Sakin bir gün, iyi geldi."],
    hype:   ["Bu aralar enerjim yüksek, işler yolunda!", "Yeni bir şey üstünde çalışıyorum, çok heyecanlıyım."],
    yorgun: ["Kusura bakma, bu aralar çok yorgunum.", "Uykusuzum, kafam biraz dağınık.", "Stüdyodan yeni çıktım, bitkinim."],
    gergin: ["Bugün pek keyfim yok, kısa keselim.", "Sinirlerim biraz gergin, kusura bakma.", "Her şey üst üste geldi bugün."],
    uzgun:  ["Bugünlerde biraz durgunum, idare et.", "Kafamda ağır şeyler var ama sen dinle beni.", "İyi değilim aslında, ama konuşmak iyi geliyor."],
    ofkeli: ["Şu an sinirliyim, yanlış bir şey söyleme.", "Bugün beni germe, ciddi söylüyorum.", "Keyfim yok, dikkatli konuş."]
  };

  /* deterministik karma (aynı girdi → aynı sayı) */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  const ORDER = ["sakin", "sakin", "sakin", "hype", "hype", "yorgun", "gergin", "uzgun"];

  /* ============================================================
     2) HAFIZA
     ============================================================ */
  function mind(artistId) {
    const rel = K.relation(artistId);
    if (!rel._mind) {
      rel._mind = {
        topics: {},         // intent → { count, lastDay }
        lastTopic: null,
        lastTopicDay: 0,
        promises: [],       // { by:"me"|"them", text, day, kept }
        pending: null,      // { kind, day }  sanatçının sorduğu, cevap bekleyen soru
        gossip: [],         // { from, text, day, kind }
        arc: null,          // { id, beat }
        mood: null,
        moodDay: 0,
        lastInsultDay: -99,
        lastGiftDay: -99
      };
    }
    return rel._mind;
  }

  /* ============================================================
     3) HİKÂYE YAYLARI (ARCS)
     Amiral sanatçılara özel, aşamaya bağlı 3-4 beat'lik mini hikâye.
     Aşama atlandığında bir kez oynar; tekrar etmez (mind.arc.beat).
     ============================================================ */
  const ARCS = {
    sehinsah: [
      { at: 2, text: "Sana bir şey söyleyeyim: bu işte yetenek değil, sabır kazanıyor. İlk yıl kimse dinlemez, sen yine yaz." },
      { at: 3, text: "Oğlum Atlas'ı stüdyoya getirdiğim günler oluyor. Müzik bana aileyi de öğretti. Sen de kendini kaybetme bu yolda." },
      { at: 4, text: "Sözü kılıç gibi kullanacaksan, kınından çıkarmadan önce iki kere düşün. Ben bunu geç öğrendim." }
    ],
    weghrumi: [
      { at: 2, text: "Ben de senin gibi tek başıma başladım. Rize'de kimse inanmıyordu. Sen üretmeye bak, gerisi gelir." },
      { at: 3, text: "Bağımsız kalmak zor ama özgürlük başka bir şey. Şirket işi kolay ama ruhunu satıyor." },
      { at: 4, text: "Bir ortak iş yapacaksak, sound'unu bozmadan yapalım. Taklit değil, buluşma olsun." }
    ],
    lierefuge: [
      { at: 2, text: "Bak kardeşim, bu piyasada herkes birbirini yer. Sağlam dur, kimseye eyvallah etme ama adamlığını da bozma." },
      { at: 3, text: "Sana bir şey diyeceğim: ben seni tanıdığım için konuşuyorum, herkese açılmam. Bu güven kolay kazanılmaz." },
      { at: 4, text: "Stüdyoya gel bir gün, boş konuşmayalım, iş yapalım. Sözüm sözdür." }
    ],
    liashine: [
      { at: 2, text: "Ben müziğe her şeyimi verdim, başka hayatım yok. Sen de böyle misin? O zaman anlaşırız." },
      { at: 3, text: "Bana kimse inanmıyordu, bir tek abim inandı. İnsanın bir kişiye ihtiyacı oluyor, biliyor musun?" },
      { at: 4, text: "Şarkılarımı sahnede söylemek en büyük hayalim. Bir gün beraber sahneye çıkarsak, o gün her şeye değer." }
    ]
  };

  /* ============================================================
     4) DEDİKODU
     Bir sanatçıyla ilişki dönüm noktasına gelince (aşama atlama,
     beef, hakaret), aynı şirketteki / türdeki sanatçılar bunu
     duyar. Duyan sanatçı bir sonraki sohbette laf arasında açar.
     ============================================================ */
  function relatedArtists(artistId) {
    const a = K.artistById(artistId);
    if (!a) return [];
    return (K.ARTISTS || []).filter(x =>
      x && x.id !== artistId && !x.mergedInto &&
      ((a.labelId && x.labelId === a.labelId) || (x.genre && x.genre === a.genre))
    ).map(x => x.id);
  }

  function spread(fromArtistId, kind, text) {
    const from = K.artistById(fromArtistId);
    if (!from) return;
    const targets = relatedArtists(fromArtistId);
    targets.forEach(id => {
      if (!U.chance(0.5)) return;
      const m = mind(id);
      m.gossip.push({ from: fromArtistId, kind: kind, text: text, day: K.state.day });
      if (m.gossip.length > 6) m.gossip.shift();
    });
  }

  /* duyulmuş taze bir dedikodu (1-4 gün içinde) — varsa cümle üretir */
  function gossipLine(artistId) {
    const m = mind(artistId);
    const now = K.state.day;
    const g = m.gossip.slice().reverse().find(x => now - x.day <= 4);
    if (!g) return null;
    const from = K.artistById(g.from);
    if (!from) return null;
    const name = from.stageName;
    if (g.kind === "stage_up") return `Bu arada ${name} seninle çalışmaya başlamış, duydum. Hayırlı olsun.`;
    if (g.kind === "beef") return `${name} ile aranızda bir gerginlik varmış; sektörde herkes konuşuyor. Dikkatli ol.`;
    if (g.kind === "insult") return `Duyduğuma göre ${name}'a ağzını bozmuşsun. Bu piyasada bu laflar geri döner, bilirsin.`;
    return `${name} senden bahsetti, işlerin yürüyormuş.`;
  }

  /* ============================================================
     5) MOTOR
     ============================================================ */
  K.npcMind = {

    MOODS: MOODS,

    mind: mind,

    /* ---- ruh hali: deterministik + olay geçersiz kılmaları ---- */
    moodOf(artistId) {
      const m = mind(artistId);
      const rel = K.relation(artistId);
      const a = K.artistById(artistId);
      if (!a) return MOODS.sakin;
      const day = K.state.day;

      /* gün içinde sabit kalır */
      if (m.moodDay === day && m.mood) return MOODS[m.mood] || MOODS.sakin;

      let key;
      /* 1) olay geçersiz kılmaları (en yüksek öncelik) */
      const beef = (K.beef && K.beef.list) ? K.beef.list().find(b => b.artist && b.artist.id === artistId) : null;
      if (beef && beef.heat >= 55) key = "ofkeli";
      else if (now2(m.lastInsultDay, day) <= 2) key = "gergin";
      else if (K.state.offers && K.state.offers.some(o => o.artistId === artistId && o.status === "pending" && (day - o.day) >= 2)) key = "gergin";
      else {
        /* 2) deterministik taban: sanatçıya göre 3 günlük blok */
        const block = Math.floor(day / 3);
        const h = hash(a.id + "|" + block + "|mood");
        key = ORDER[h % ORDER.length];
        /* 3) ilişki dinamiği: yüksek samimiyet + taze temas → hype */
        if (rel.affinity >= 60 && now2(rel.lastInteract, day) <= 1 && U.chance(0.5)) key = "hype";
        /* 4) ego yüksek ve popülerliği düşükse gergin */
        if (a.traits && a.traits.ego >= 8 && (a.popularity || 0) < 60 && U.chance(0.4)) key = "gergin";
      }
      m.mood = key; m.moodDay = day;
      return MOODS[key] || MOODS.sakin;
    },

    moodLabel(artistId) {
      const mo = K.npcMind.moodOf(artistId);
      return mo.icon + " " + mo.label;
    },

    /* ruh halinin samimiyet çarpanı (üzgünken 1.10, öfkeliyken 0.55) */
    moodDelta(artistId) {
      return K.npcMind.moodOf(artistId).delta;
    },

    /* ruh haline göre cevap gecikmesi (saniye) */
    replyWait(artistId) {
      const mo = K.npcMind.moodOf(artistId);
      const lo = mo.wait[0], hi = mo.wait[1];
      return U.randInt(lo * 1000, hi * 1000);
    },

    /* cevaba eklenecek ruh hali cümlesi (nadiren) */
    moodLine(artistId) {
      const mo = K.npcMind.moodOf(artistId);
      const pool = MOOD_LINES[mo.key];
      if (!pool || !pool.length) return null;
      if (!U.chance(0.30)) return null;
      return U.pick(pool);
    },

    /* ---- hafıza ---- */
    note(artistId, intent, text) {
      const m = mind(artistId);
      m.lastTopic = intent;
      m.lastTopicDay = K.state.day;
      if (intent) {
        const t = m.topics[intent] = m.topics[intent] || { count: 0, lastDay: 0 };
        t.count++; t.lastDay = K.state.day;
      }
      if (intent === "insult") {
        m.lastInsultDay = K.state.day;
        /* hakaret hızla yayılır — sektörde herkes konuşur */
        spread(artistId, "insult", "");
      }
    },

    /* oyuncu bir şey söz verdiyse (ör. "şarkıyı göndereceğim") kaydet */
    promise(artistId, by, text) {
      const m = mind(artistId);
      m.promises.push({ by: by || "me", text: String(text || "").slice(0, 120), day: K.state.day, kept: false });
      if (m.promises.length > 8) m.promises.shift();
    },

    /* sanatçının sorduğu, cevap bekleyen soru */
    setPending(artistId, kind, text) {
      const m = mind(artistId);
      m.pending = { kind: kind, day: K.state.day, text: String(text || "").slice(0, 80) };
    },

    /* oyuncu kısa evet/hayır ile cevapladığında */
    resolvePending(artistId, yes) {
      const m = mind(artistId);
      if (!m.pending) return null;
      const p = m.pending;
      m.pending = null;
      return { kind: p.kind, yes: !!yes };
    },

    pending(artistId) { return mind(artistId).pending; },

    /* ---- takip cümlesi: geçen konuşulan konuya dönüş ---- */
    followUp(artistId, currentIntent) {
      const m = mind(artistId);
      const gap = K.state.day - m.lastTopicDay;
      if (!m.lastTopic || m.lastTopic === currentIntent) return null;
      if (gap < 1 || gap > 5) return null;
      if (!U.chance(0.34)) return null;
      /* v10.52/53 — konuşulmuş bir FT anlaşması varsa öncelik ondadır */
      const rel = K.relation(artistId);
      if (rel.deal && rel.deal.type === "feature" && rel.deal.status === "agreed" && U.chance(0.6)) {
        return "Anlaşmıştık ya — şarkıyı stüdyoda hazırlayınca bana haber ver.";
      }
      if (rel.deal && rel.deal.type === "feature" && rel.deal.status === "pending" && U.chance(0.6)) {
        return "Feature konusunu kapatalım; stüdyo tarihini ne zaman belirleyelim?";
      }
      const T = {
        music:   "Geçen konuştuğumuz yeni iş ne oldu, çıktı mı?",
        career:  "Sana verdiğim tavsiyeyi düşündün mü?",
        feature: "Geçen feature konusunu kapatalım mı, ne diyorsun?",
        market:  "Piyasa konuşmuştuk; o iş ne durumda?",
        hard:    "Geçen kötü olduğunu söylemiştin, şimdi nasılsın?",
        money:   "Para konusunu açmıştın; bir çözüm bulabildin mi?",
        hangout: "Buluşma işini hâlâ düşünüyor musun?"
      };
      return T[m.lastTopic] || null;
    },

    /* ---- hikâye yayı: aşama atlandığında bir kez oynar ---- */
    arcBeat(artistId, stageIdx) {
      const arc = ARCS[artistId];
      if (!arc) return null;
      const m = mind(artistId);
      const done = m.arc && m.arc.beat != null ? m.arc.beat : -1;
      /* aşamaya kadar olan, henüz oynanmamış en yüksek beat'i seç */
      let pickIdx = -1;
      for (let i = 0; i < arc.length; i++) {
        if (arc[i].at <= stageIdx && i > done) pickIdx = i;
      }
      if (pickIdx < 0) return null;
      m.arc = { id: artistId, beat: pickIdx };
      return arc[pickIdx].text;
    },

    /* ---- dedikodu ---- */
    spread: spread,
    gossipLine: gossipLine,

    /* ---- önerilen cevaplar (RPG hızlı seçenekler) ----
       Serbest metin korunur; bunlar bağlama göre ÜRETİLEN kısayollardır.
       Her birinin bir "risk/ton" etiketi vardır. */
    suggestions(artistId) {
      const rel = K.relation(artistId);
      const stage = K.stageIndexFor(rel.affinity);
      const mo = K.npcMind.moodOf(artistId);
      const m = mind(artistId);
      const out = [];

      if (m.pending) {
        out.push({ text: "Evet, olur.", tone: "sicak" });
        out.push({ text: "Şu an olmaz, kusura bakma.", tone: "net" });
        if (stage >= 3) out.push({ text: "Detayları konuşalım.", tone: "profesyonel" });
        return out.slice(0, 4);
      }

      /* v10.52/53 — konuşulmuş FT anlaşması varsa tamamlamaya yönlendir */
      if (rel.deal && rel.deal.type === "feature" && rel.deal.status === "agreed") {
        out.push({ text: "Şarkıyı stüdyoda hazırlayıp yayınlıyorum.", tone: "profesyonel" });
        out.push({ text: "Ne zaman müsait olursun, tarihi netleştirelim?", tone: "sicak" });
        return out.slice(0, 4);
      }
      if (rel.deal && rel.deal.type === "feature" && rel.deal.status === "pending") {
        out.push({ text: "Tamam, stüdyo teklifini başlatıyorum.", tone: "profesyonel" });
        out.push({ text: "Şartları konuşalım.", tone: "net" });
        return out.slice(0, 4);
      }

      if (stage <= 1) {
        out.push({ text: "Kendimi tanıtayım: yeni başlıyorum, işler yapıyorum.", tone: "sicak" });
        out.push({ text: "Son işlerini dinledim, çok sağlam.", tone: "sicak" });
        out.push({ text: "Sana nasıl ulaşabilirim, bir tavsiyen var mı?", tone: "saygili" });
      } else {
        if (K.relations.canProposeFeature(artistId)) out.push({ text: "Feature yapalım mı?", tone: "cesur" });
        if (K.relations.canHangout(artistId)) out.push({ text: "Bir ara stüdyoda buluşalım mı?", tone: "sicak" });
        out.push({ text: "Yeni bir iş üstünde çalışıyorum, fikrini almak isterim.", tone: "profesyonel" });
        if (mo.key === "gergin" || mo.key === "ofkeli") out.push({ text: "İyi misin? Bugün bir şey mi oldu?", tone: "empatik" });
        else if (mo.key === "uzgun") out.push({ text: "Kötü görünüyorsun, anlatmak ister misin?", tone: "empatik" });
        else if (mo.key === "hype") out.push({ text: "Enerjin yüksek bugün, ne var ne yok?", tone: "sicak" });
        else out.push({ text: "Son zamanlarda ne dinliyorsun?", tone: "meraklı" });
      }
      return out.slice(0, 4);
    },

    /* ---- günlük bakım: eski hafızayı temizle, dedikodu bayatlat ---- */
    dailyTick() {
      const s = K.state;
      Object.keys(s.relations || {}).forEach(id => {
        const rel = s.relations[id];
        if (!rel || !rel._mind) return;
        const m = rel._mind;
        if (m.pending && s.day - m.pending.day > 3) m.pending = null;
        m.gossip = (m.gossip || []).filter(g => s.day - g.day <= 7);
        /* verilen söz 10 gün içinde tutulmadıysa "unutsun" */
        m.promises = (m.promises || []).filter(p => s.day - p.day <= 14);
      });
    }
  };

  function now2(day, cur) { return cur - day; }

})(window.K = window.K || {});
