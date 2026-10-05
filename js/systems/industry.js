/* ============================================================
   KARMA — systems/industry.js   (v10.58 · YAŞAYAN ENDÜSTRİ)
   NPC–NPC ilişki ağı + sanatçı kariyer olayları + oyuncu etkisi.

   NEDEN AYRI DOSYA?
   -----------------
   Mevcut sistemler dünyayı zaten canlandırıyordu ama PARÇA PARÇA:
     · game.accrueArtistWorld  → her sanatçı kendi kadansıyla yayın yapar
     · social.js               → NPC'ler kendi sesiyle paylaşım yapar
     · npcmind.js / routine.js → NPC'nin iç durumu (ruh hali, rutin)
     · beef.js / rivalry.js    → OYUNCU ile sanatçı arasındaki gerilim
   Eksik olan halka şuydu: sanatçıların BİRBİRİYLE olan ilişkisi ve
   kariyerlerinin oyuncudan bağımsız akışı. Yani:

     · Kim kimin dostu, kim kimin rakibi? (kalıcı bir ağ)
     · İki NPC birbirine feature yapar mı, şirket değiştirir mi,
       konser verir mi, bir işi tutmaz mı, ödül alır mı?
     · Oyuncunun bir hamlesi (feature / husumet) bu ağda nasıl yankılanır?

   Bu dosya o ağı kurar, olayları üretir ve oyuncunun eylemlerini
   dünyaya bağlar. Amaç: oyuncu hiçbir şey yapmasa da sektör yaşasın.

   TASARIM İLKESİ — DETERMİNİZM (önemli!)
   --------------------------------------
   Bu modül günlük akışta Math.random() KULLANMAZ. Tüm kararlar
   (sanatçı, gün) ikilisinden türeyen kendi hash'li RNG'siyle verilir.
   Nedeni: mevcut sistemlerin RNG akışını kaydırmamak. Denge/kariyer
   testleri aynı tohumla aynı eğriyi bekler; buraya Math.random()
   serpiştirmek o eğriyi sessizce kaydırırdı. Oyuncunun doğrudan
   tetiklediği yollar (feature/husumet) ise zaten oyun dışı test
   senaryolarında çalışmadığı için orada serbestçe K API'leri kullanılır.

   KALICILIK
   ---------
   Tüm ağ ve olay geçmişi `state.industry` altında yaşar ve kayıtla
   birlikte yazılır. Eski kayıtlar için state.js göç bloğu varsayılan
   üretir; `ensure()` her alanı savunmacı biçimde tamamlar.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- deterministik karma (npcmind.js ile aynı desen) ---------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }
  const frac = (str) => (hash(str) % 100000) / 100000;         // 0-1
  const hChance = (seed, p) => frac(seed) < p;
  function hPick(seed, arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(frac(seed) * arr.length) % arr.length];
  }

  /* olay türleri — arayüz ve akış bunları ikonla gösterir */
  const KINDS = {
    feature:       { icon: "🎤", label: "Ortak iş" },
    label:         { icon: "🏢", label: "Şirket" },
    concert:       { icon: "🎫", label: "Konser" },
    tension:       { icon: "⚡", label: "Gerilim" },
    flop:          { icon: "📉", label: "Tutmayan iş" },
    hit:           { icon: "🔥", label: "Patlayan iş" },
    award:         { icon: "🏆", label: "Ödül" },
    player_feature:{ icon: "🤝", label: "Ortak işin" },
    player_beef:   { icon: "💥", label: "Husumet" }
  };

  K.industry = {

    KINDS: KINDS,

    /* ============================================================
       ENSURE — her alanı güvence altına al (eski kayıt uyumu)
       ============================================================ */
    ensure() {
      const s = K.state;
      if (!s) return { released: {}, log: [], ties: {}, events: [], label: {}, awards: {}, momentum: 0, lastLabelOfferDay: 0, awardsDay: 0 };
      s.industry = s.industry || {};
      const I = s.industry;
      I.released = I.released || {};
      I.log = I.log || [];
      I.ties = I.ties || {};
      I.events = I.events || [];
      I.label = I.label || {};
      I.awards = I.awards || {};
      if (I.momentum == null) I.momentum = 0;
      if (I.lastLabelOfferDay == null) I.lastLabelOfferDay = 0;
      if (I.awardsDay == null) I.awardsDay = 0;
      /* v10.59 — endüstri hafızası & kariyer katmanı (eski kayıt uyumu) */
      I.memory = I.memory || {};        // artistId → son olayların ayrıntılı dökümü
      I.memSum = I.memSum || {};        // artistId → olay türü sayaçları (kırpılmaz)
      I.career = I.career || {};        // artistId → kariyer geçmişi
      I.history = I.history || [];      // uzun vadeli sektör tarihi
      if (I.notifDay == null) I.notifDay = 0;
      if (I.notifCount == null) I.notifCount = 0;
      return I;
    },

    /* ============================================================
       INIT — ağı kur, bus dinleyicilerini bağla (idempotent)
       ============================================================ */
    init() {
      K.industry.ensure();
      K.industry._seedTies();
      if (K.industry._inited) return;
      K.industry._inited = true;
      /* Oyuncunun feature'lı yayını yayınlanır yayınlanmaz sektöre yayılır.
         (game.advanceReleases → K.bus.emit("release:published")) */
      if (K.bus && K.bus.on) {
        K.bus.on("release:published", (song) => {
          try { if (song && song.featWith) K.industry.onPlayerRelease(song); } catch (e) {}
        });
      }
    },

    /* ============================================================
       İLİŞKİ AĞI (ties)
       Her sanatçının `friend` ve `rival` ağırlık haritaları vardır.
       Kenarlar ÇİFT YÖNLÜ yazılır (a→b ve b→a aynı ağırlık).
       ============================================================ */
    tiesFor(artistId) {
      const I = K.industry.ensure();
      if (!I.ties[artistId]) I.ties[artistId] = { friend: {}, rival: {} };
      const t = I.ties[artistId];
      t.friend = t.friend || {};
      t.rival = t.rival || {};
      return t;
    },

    relationship(aId, bId) {
      const t = K.industry.tiesFor(aId);
      return { friend: (t.friend[bId] || 0), rival: (t.rival[bId] || 0) };
    },

    setTie(aId, bId, kind, delta) {
      if (!aId || !bId || aId === bId) return;
      const I = K.industry.ensure();
      const mk = (x) => (I.ties[x] = I.ties[x] || { friend: {}, rival: {} });
      const A = mk(aId), B = mk(bId);
      A.friend = A.friend || {}; A.rival = A.rival || {};
      B.friend = B.friend || {}; B.rival = B.rival || {};
      const cl = (w) => U.clamp(w, 0, 10);
      if (kind === "friend") {
        A.friend[bId] = cl((A.friend[bId] || 0) + delta);
        B.friend[aId] = A.friend[bId];
        A.rival[bId] = cl((A.rival[bId] || 0) - delta * 0.5);
        B.rival[aId] = A.rival[bId];
      } else {
        A.rival[bId] = cl((A.rival[bId] || 0) + delta);
        B.rival[aId] = A.rival[bId];
        A.friend[bId] = cl((A.friend[bId] || 0) - delta * 0.5);
        B.friend[aId] = A.friend[bId];
      }
    },

    friendsOf(artistId, n) {
      const t = K.industry.tiesFor(artistId);
      return Object.keys(t.friend)
        .map(id => ({ id, w: t.friend[id], artist: K.artistById(id) }))
        .filter(x => x.artist && x.w > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, n || 3);
    },

    rivalsOf(artistId, n) {
      const t = K.industry.tiesFor(artistId);
      return Object.keys(t.rival)
        .map(id => ({ id, w: t.rival[id], artist: K.artistById(id) }))
        .filter(x => x.artist && x.w > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, n || 3);
    },

    /* ---- ağı bir kez tohumla: tür/şirket yakınlığı dostluk ya da
       rekabet doğurur. Deterministik; kayıtta zaten varsa tekrar çalışmaz. */
    _seedTies() {
      const I = K.industry.ensure();
      if (I._tiesSeeded) return;
      const artists = K.artistList().filter(a => a && !a.mergedInto);
      if (!artists.length) return;
      artists.forEach(a => { if (!I.ties[a.id]) I.ties[a.id] = { friend: {}, rival: {} }; });

      for (let i = 0; i < artists.length; i++) {
        const a = artists[i];
        for (let j = i + 1; j < artists.length; j++) {
          const b = artists[j];
          const seed = "tie|" + a.id + "|" + b.id;
          const sameGenre = a.genre && a.genre === b.genre;
          const sameLabel = a.labelId && a.labelId === b.labelId;
          const r = frac(seed);
          let kind = null, w = 0;
          if (sameLabel) { kind = "friend"; w = 1.5 + frac(seed + "w") * 2.2; }
          else if (sameGenre && r > 0.62) { kind = "friend"; w = 0.8 + frac(seed + "w") * 1.6; }
          else if (sameGenre && r < 0.22) { kind = "rival"; w = 0.8 + frac(seed + "w") * 1.9; }
          else if (!sameGenre && r < 0.06) { kind = "rival"; w = 0.6 + frac(seed + "w") * 1.2; }
          if (kind) K.industry.setTie(a.id, b.id, kind, w);
        }
      }
      I._tiesSeeded = true;
    },

    /* ---- kenar listeleri (ağırlıklı seçim için) ---- */
    _edges(kind) {
      const I = K.industry.ensure();
      const out = [];
      Object.keys(I.ties).forEach(a => {
        const map = I.ties[a] && I.ties[a][kind];
        if (!map) return;
        Object.keys(map).forEach(b => {
          if (a < b && map[b] > 0) out.push([a, b, map[b]]);
        });
      });
      return out;
    },

    _pickPair(seed, kind) {
      const edges = K.industry._edges(kind);
      if (!edges.length) return null;
      const total = edges.reduce((s, e) => s + e[2], 0);
      let r = frac(seed) * total;
      let chosen = edges[edges.length - 1];
      for (const e of edges) { r -= e[2]; if (r <= 0) { chosen = e; break; } }
      const a = K.artistById(chosen[0]), b = K.artistById(chosen[1]);
      return a && b ? [a, b] : null;
    },

    /* ============================================================
       OLAY KAYDI + BİLDİRİM
       ============================================================ */
    _event(kind, text, opts) {
      const I = K.industry.ensure();
      opts = opts || {};
      const ev = {
        day: K.state.day, kind: kind, icon: (KINDS[kind] || {}).icon || "•",
        text: text, artistId: opts.artistId || null,
        important: !!opts.important, player: !!opts.player
      };
      I.events.unshift(ev);
      I.events = I.events.slice(0, 18);
      return ev;
    },

    events(n) {
      const I = K.industry.ensure();
      return I.events.slice(0, n || 14);
    },

    /* öncelikli bildirim: priority >= 2 ise gün özetine de düşer.
       Aynı gün aynı bildirim tekrarlanmaz (spam engeli). */
    notify(title, msg, kind, priority) {
      const s = K.state;
      if (!s) return;
      s.notifications = s.notifications || [];
      if (s.notifications.some(n => n.day === s.day && n.title === title && n.msg === msg)) return;
      s.notifications.push({ title, msg, kind: kind || "", day: s.day, priority: priority || 0 });
      s.notifications = s.notifications.slice(-60);
      if ((priority || 0) >= 2 && K.toast) K.toast(title, msg, kind || "");
    },

    /* ============================================================
       SOSYAL GÖNDERİ (deterministik etkileşim)
       ============================================================ */
    _eng(followers, seed) {
      const rate = 0.018 + frac("eng|" + seed) * 0.045;
      const likes = Math.round(Math.max(0, followers || 0) * rate);
      return {
        likes,
        comments: Math.round(likes * (0.015 + frac("c|" + seed) * 0.03)),
        shares: Math.round(likes * (0.006 + frac("sh|" + seed) * 0.02))
      };
    },

    _post(a, platform, text, opts) {
      if (!a) return null;
      const s = K.state;
      opts = opts || {};
      const salt = opts.salt || "0";
      const eng = K.industry._eng(a.ig || 0, a.id + "|" + platform + "|" + s.day + "|" + salt);
      const post = {
        id: "ind_" + a.id + "_" + s.day + "_" + platform + "_" + salt,
        platform: platform,
        authorId: a.id, authorName: a.stageName,
        text: text, day: s.day,
        likes: eng.likes, comments: eng.comments, shares: eng.shares,
        songId: null, songTitle: opts.songTitle || null, art: opts.art || null,
        mine: false, industry: true
      };
      (s.feed[platform] = s.feed[platform] || []).unshift(post);
      s.feed[platform] = s.feed[platform].slice(0, 60);
      return post;
    },

    /* ============================================================
       NPC OLAYLARI
       ============================================================ */
    _npcFeature(a, b) {
      const I = K.industry.ensure();
      const boost = 0.05 + frac("fb|" + a.id + b.id + K.state.day) * 0.06;
      a._boost = Math.min(0.6, (a._boost || 0) + boost);
      b._boost = Math.min(0.6, (b._boost || 0) + boost);
      a.popularity = U.clamp((a.popularity || 50) + 0.4, 30, 99);
      b.popularity = U.clamp((b.popularity || 50) + 0.4, 30, 99);
      a.monthly = Math.round(a.monthly * (1 + boost));
      b.monthly = Math.round(b.monthly * (1 + boost));
      K.industry.setTie(a.id, b.id, "friend", 1.5);

      K.industry._event("feature", `🎤 ${a.stageName} ile ${b.stageName} ortak iş yaptı`, { artistId: a.id });
      K.industry._post(a, "instagram", `${b.stageName} ile stüdyodan yeni bir iş çıktı 🎧`, { salt: "feat" });
      K.industry._post(b, "x", `"${a.stageName}" ile ortak iş yayında. Dinleyin.`, { salt: "feat" });

      const onRoster = K.state.label && (a.labelId === "my_label" || b.labelId === "my_label");
      if (onRoster) {
        K.industry.notify("🎤 Şirket ortak işi", `${a.stageName} ve ${b.stageName} ortak iş yaptı — kadron hareketli.`, "ok", 2);
      }
    },

    _npcLabelChange(a) {
      const labels = (K.LABELS || []).filter(l => l.id !== a.labelId);
      if (!labels.length) return;
      /* hedef şirket: sanatçının seviyesine yakın güçte olanlar daha olası */
      const pop = a.popularity || 50;
      const weighted = labels.slice().sort((x, y) =>
        Math.abs(x.power - pop) - Math.abs(y.power - pop));
      const pick = hPick("lblchg|" + a.id + "|" + K.state.day, weighted.slice(0, 4));
      if (!pick) return;
      /* v10.59 — transfer TEK yoldan geçer: statik roster + kariyer
         geçmişi + sektör tarihi K.labelSim içinde senkron tutulur. */
      if (K.labelSim && K.labelSim.transfer) K.labelSim.transfer(a.id, pick.id, "label_change");
      else a.labelId = pick.id;
      K.industry._post(a, "instagram", `Yeni bir sayfa açılıyor. ${pick.name} ailesine katıldım 🖤`, { salt: "label" });
      K.industry.reactToCareer(a, "label");
      if ((a.popularity || 0) >= 75) {
        K.industry.notify("🏢 Transfer", `${a.stageName} ${pick.name}'a geçti.`, "", 1);
      }
    },

    _npcConcert(a) {
      const s = K.state;
      const boost = 0.02 + frac("con|" + a.id + "|" + s.day) * 0.03;
      a._boost = Math.min(0.6, (a._boost || 0) + boost);
      a.popularity = U.clamp((a.popularity || 50) + 0.2, 30, 99);
      const cities = (K.concerts && K.concerts.CITIES) ? K.concerts.CITIES.map(c => c.name) : ["İstanbul", "Ankara", "İzmir"];
      const city = hPick("city|" + a.id + "|" + s.day, cities) || "İstanbul";
      K.industry._event("concert", `🎫 ${a.stageName}, ${city}'de konser duyurdu`, { artistId: a.id });
      K.industry._post(a, "tiktok", `${city} sahnesi hazır 🎤 Biletler satışta.`, { salt: "concert" });
    },

    _npcTension(a, b) {
      K.industry.setTie(a.id, b.id, "rival", 2);
      a.popularity = U.clamp((a.popularity || 50) + 0.2, 30, 99);
      b.popularity = U.clamp((b.popularity || 50) + 0.2, 30, 99);
      K.industry._event("tension", `⚡ ${a.stageName} ile ${b.stageName} arasında gerilim var`, { artistId: a.id });
      K.industry._post(a, "x", "Bazı şeyler söylenmez, yapılır.", { salt: "tension" });
      K.industry._post(b, "x", "Kimseye bir şey ispat etmek zorunda değilim.", { salt: "tension" });
      if ((a.popularity || 0) >= 80 || (b.popularity || 0) >= 80) {
        K.industry.notify("⚡ Sektörde gerilim", `${a.stageName} ile ${b.stageName} arasında bir gerginlik konuşuluyor.`, "", 1);
      }
    },

    /* ============================================================
       NPC YAYIN SONUCU — başarı/başarısızlık çeşitliliği
       game.npcRelease buradan geçirir. Deterministik; Math.random yok.
       ============================================================ */
    adjustNpcRelease(a, gain) {
      if (!a || gain == null) return gain;
      const seed = "rel|" + a.id + "|" + K.state.day;
      const r = frac(seed);
      /* v10.59 — her yayın kariyer geçmişine işlenir (hit/flop ayrıca) */
      if (K.industry.recordCareer) K.industry.recordCareer(a.id, "release", {});
      if (r < 0.22) {
        /* TUTMAYAN İŞ: nadiren bir yayın bekleneni vermez */
        const f = 0.18 + frac(seed + "f") * 0.35;
        a.popularity = U.clamp((a.popularity || 50) - (0.3 + frac(seed + "fp") * 0.5), 30, 99);
        K.industry._event("flop", `📉 ${a.stageName}'in yeni işi bekleneni vermedi`, { artistId: a.id });
        K.industry._post(a, "x", "Bazen iş tutmaz. Yola devam.", { salt: "flop" });
        if (K.industry.recordCareer) K.industry.recordCareer(a.id, "flop", {});
        if (K.industry.reactToCareer) K.industry.reactToCareer(a, "flop");
        return gain * f;
      }
      if (r > 0.88) {
        /* PATLAYAN İŞ */
        a.popularity = U.clamp((a.popularity || 50) + (0.4 + frac(seed + "hp") * 0.8), 30, 99);
        K.industry._event("hit", `🔥 ${a.stageName}'in yeni işi patladı`, { artistId: a.id, important: (a.popularity || 0) >= 75 });
        if (K.industry.recordCareer) K.industry.recordCareer(a.id, "hit", {});
        if (K.industry.reactToCareer) K.industry.reactToCareer(a, "hit");
        if ((a.popularity || 0) >= 78) K.industry._notifyImportant("🔥 Sektörde hit", `${a.stageName} yeni işiyle büyük çıkış yaptı.`, "ok");
        return gain * (1.4 + frac(seed + "h") * 0.6);
      }
      return gain * (0.9 + frac(seed + "n") * 0.2);
    },

    /* ============================================================
       ÖDÜL TÖRENİ KAYDI
       awards.js töreni çalıştırır; burada kazanan NPC'ler sanatçı
       kariyerine yazılır (kim kaç ödül aldı).
       ============================================================ */
    _recordAwards() {
      const I = K.industry.ensure();
      const s = K.state;
      const hist = s.awards && s.awards.history && s.awards.history[0];
      if (!hist || !hist.day) return;
      if (I.awardsDay === hist.day) return;
      I.awardsDay = hist.day;
      (hist.results || []).forEach(r => {
        if (r.won) return;
        const a = K.resolveArtistByName && K.resolveArtistByName(r.winner);
        if (!a) return;
        I.awards[a.id] = (I.awards[a.id] || 0) + 1;
        K.industry._event("award", `🏆 ${a.stageName}, "${r.cat}" ödülünü kazandı`, { artistId: a.id, important: (a.popularity || 0) >= 75 });
        if (K.industry.recordCareer) K.industry.recordCareer(a.id, "award", { cat: r.cat });
        if (K.industry.remember) K.industry.remember(a.id, "award", null, { weight: 1, note: r.cat });
      });
    },

    /* ============================================================
       v10.59 — NPC HAFIZASI
       Her sanatçı için yaşanan olayların kalıcı dökümü. Hafıza iki
       katmanda tutulur:
         · I.memory[id] → son 12 olayın AYRINTILI kaydı (gün, tür,
                           karşı taraf, ilişkiye etkisi, ağırlık, not)
         · I.memSum[id] → olay türlerinin SAYACI (kırpılmaz, uzun vade)
       Böylece geçmiş hem okunabilir hem ucuzdur: günlük döngü yalnızca
       sayacı okur, ağır tarama yapmaz.
       ============================================================ */
    remember(artistId, kind, otherId, opts) {
      const I = K.industry.ensure();
      if (!artistId) return null;
      opts = opts || {};
      const arr = I.memory[artistId] = I.memory[artistId] || [];
      const ev = {
        day: K.state.day, kind: kind,
        otherId: otherId || null,
        delta: opts.delta || 0,
        weight: opts.weight == null ? 1 : opts.weight,
        note: opts.note || ""
      };
      arr.unshift(ev);
      if (arr.length > 12) arr.length = 12;
      const m = I.memSum[artistId] = I.memSum[artistId] || {};
      m[kind] = (m[kind] || 0) + 1;
      return ev;
    },

    memoryOf(artistId, n) {
      const I = K.industry.ensure();
      return (I.memory[artistId] || []).slice(0, n || 6);
    },

    memoryBetween(aId, bId) {
      const I = K.industry.ensure();
      return (I.memory[aId] || []).filter(e => e.otherId === bId);
    },

    /* oyuncu ile geçmiş (otherId === "player") */
    playerMemory(artistId, n) {
      const I = K.industry.ensure();
      return (I.memory[artistId] || []).filter(e => e.otherId === "player").slice(0, n || 6);
    },

    /* geçmişin net duygusu: + olumlu, − olumsuz (uzun vadeli sayaçtan) */
    memoryScore(artistId) {
      const I = K.industry.ensure();
      const m = I.memSum[artistId];
      if (!m) return 0;
      const pos = (m.feat_ok || 0) * 2 + (m.support || 0) * 1 + (m.help || 0) * 1.5 +
        (m.award || 0) * 1 + (m.hit_together || 0) * 1.5 + (m.peace || 0) * 2;
      const neg = (m.beef || 0) * 3 + (m.diss || 0) * 2 + (m.betray || 0) * 3 +
        (m.feat_bad || 0) * 1.5 + (m.support_friend || 0) * 1;
      return pos - neg;
    },

    /* ============================================================
       v10.59 — KARİYER GEÇMİŞİ
       Sanatçı başına kalıcı istatistikler. Sadece toplam değil, son
       yayın sonuçlarının kısa penceresi (`recent`) tutulur; kariyer
       YAYI (arc) buradan türetilir.
       ============================================================ */
    careerOf(artistId) {
      const I = K.industry.ensure();
      const c = I.career[artistId] = I.career[artistId] || {
        releases: 0, hits: 0, flops: 0, streams: 0,
        peakMonthly: 0, peakPop: 0, features: 0, awards: 0,
        labels: [], milestones: [], recent: [],
        lastHit: 0, lastFlop: 0, lastRelease: 0,
        momentum: 0, arc: null, arcDay: 0
      };
      return c;
    },

    recordCareer(artistId, ev, data) {
      const a = K.artistById(artistId);
      const c = K.industry.careerOf(artistId);
      data = data || {};
      const day = K.state.day;
      if (ev === "release") {
        c.releases++;
        c.lastRelease = day;
        c.momentum = U.clamp((c.momentum || 0) + 0.15, 0, 1);
      } else if (ev === "hit") {
        c.hits++; c.lastHit = day;
        c.momentum = U.clamp((c.momentum || 0) + 0.45, 0, 1);
        c.recent.push(1); if (c.recent.length > 6) c.recent.shift();
        c.milestones.unshift({ day: day, text: "hit" + (data.title ? ": " + data.title : "") });
      } else if (ev === "flop") {
        c.flops++; c.lastFlop = day;
        c.momentum = U.clamp((c.momentum || 0) - 0.35, 0, 1);
        c.recent.push(-1); if (c.recent.length > 6) c.recent.shift();
        c.milestones.unshift({ day: day, text: "flop" + (data.title ? ": " + data.title : "") });
      } else if (ev === "feature") {
        c.features++;
        c.momentum = U.clamp((c.momentum || 0) + 0.1, 0, 1);
      } else if (ev === "award") {
        c.awards++;
        c.milestones.unshift({ day: day, text: "ödül" + (data.cat ? ": " + data.cat : "") });
      } else if (ev === "label") {
        c.labels.unshift({ day: day, from: data.from || null, to: data.to || null });
        c.labels = c.labels.slice(0, 8);
      }
      if (a) {
        c.peakPop = Math.max(c.peakPop || 0, a.popularity || 0);
        c.peakMonthly = Math.max(c.peakMonthly || 0, a.monthly || 0);
      }
      c.milestones = c.milestones.slice(0, 10);
      return c;
    },

    /* ============================================================
       v10.59 — KARİYER YAYI (ARC)
       Yalnızca GERÇEK istatistiklerden türetilir: son yayın
       sonuçları + popülerlik + zirveye uzaklık + kariyer hacmi.
       ============================================================ */
    ARCS: {
      caylak:     { label: "Çaylak",              icon: "🌱" },
      yukselen:   { label: "Yükselen yıldız",     icon: "🚀" },
      zirvede:    { label: "Zirvede",             icon: "👑" },
      istikrarli: { label: "İstikrarlı",          icon: "🎯" },
      viral:      { label: "Viral patlama",       icon: "⚡" },
      comeback:   { label: "Comeback",            icon: "🔄" },
      dususte:    { label: "Düşüşte",             icon: "📉" },
      unutulan:   { label: "Unutulmaya başlayan", icon: "🌫️" }
    },

    arcOf(artistId) {
      const a = K.artistById(artistId);
      if (!a) return null;
      const c = K.industry.careerOf(artistId);
      const recentScore = (c.recent || []).reduce((s, x) => s + x, 0);
      const pop = a.popularity || 0;
      const peak = c.peakPop || pop;
      const gap = peak - pop;
      const idle = K.state.day - (c.lastRelease || 0);
      let arc;
      if ((c.releases || 0) <= 1 && (c.hits || 0) === 0) arc = "caylak";
      else if (recentScore >= 3 && pop < peak - 2) arc = "yukselen";
      else if (pop >= 80 && recentScore >= 0) arc = "zirvede";
      else if (recentScore >= 2 && (K.state.day - (c.lastFlop || 0)) <= 90 && (c.flops || 0) > 0) arc = "comeback";
      else if (recentScore >= 3 && (c.hits || 0) >= 3) arc = "viral";
      else if (recentScore <= -2 && gap >= 8) arc = "dususte";
      else if (idle > 260 && pop < 55 && (c.releases || 0) > 3) arc = "unutulan";
      else arc = "istikrarli";
      c.arc = arc; c.arcDay = K.state.day;
      return arc;
    },

    arcInfo(artistId) {
      const k = K.industry.arcOf(artistId);
      return k ? K.industry.ARCS[k] : null;
    },

    /* ============================================================
       v10.59 — ENDÜSTRİ HAFIZASI (uzun vadeli sektör tarihi)
       ============================================================ */
    _industryHistory(kind, text, ids) {
      const I = K.industry.ensure();
      const y = (K.util.dateForDay ? K.util.dateForDay(K.state.day).y : new Date().getFullYear());
      I.history.unshift({ day: K.state.day, y: y, kind: kind, text: text, ids: ids || [] });
      I.history = I.history.slice(0, 60);
      return I.history[0];
    },

    history(n) {
      const I = K.industry.ensure();
      return I.history.slice(0, n || 10);
    },

    /* ============================================================
       v10.59 — NPC'NİN DİĞERİNİN KARİYERİNE TEPKİSİ
       Bir sanatçı hit/flop/transfer yaşadığında ağındaki insanlar
       (dostlar, rakipler, label arkadaşları) duruma göre konuşur.
       Tepkiler yalnızca UI metni değildir: tie (dostluk/rekabet)
       ağırlığını da değiştirir.
       ============================================================ */
    reactToCareer(a, eventKind, data) {
      if (!a) return;
      data = data || {};
      const friends = K.industry.friendsOf(a.id, 2);
      const rivals = K.industry.rivalsOf(a.id, 2);
      const mates = (K.labelSim && K.labelSim.rosterOf && a.labelId)
        ? K.labelSim.rosterOf(a.labelId).filter(x => x.id !== a.id).slice(0, 2)
        : [];
      const label = (K.labelById && a.labelId) ? K.labelById(a.labelId) : null;
      const name = a.stageName;

      if (eventKind === "hit") {
        friends.forEach((f, i) => {
          if (!f.artist) return;
          K.industry._post(f.artist, i % 2 ? "x" : "instagram", `"${name}" patladı, helal olsun 👏`, { salt: "hit_f" });
          K.industry.setTie(a.id, f.id, "friend", 0.4);
        });
        rivals.forEach((r, i) => {
          if (!r.artist) return;
          K.industry._post(r.artist, i % 2 ? "x" : "instagram", `Bir şarkıyla kral olunmuyor.`, { salt: "hit_r" });
          K.industry.setTie(a.id, r.id, "rival", 0.5);
        });
        mates.forEach((m, i) => {
          K.industry._post(m, i % 2 ? "x" : "instagram", `${name} işi ${label ? label.name : "şirketimiz"} için de büyük. 🏆`, { salt: "hit_m" });
        });
        if ((a.popularity || 0) >= 70) K.industry._industryHistory("hit", `${name} büyük bir çıkış yaptı`, [a.id]);
      } else if (eventKind === "flop") {
        friends.forEach((f, i) => {
          if (!f.artist) return;
          K.industry._post(f.artist, i % 2 ? "x" : "instagram", `${name} için üzüldüm, o iş daha iyisini hak ediyordu.`, { salt: "flop_f" });
          K.industry.setTie(a.id, f.id, "friend", 0.3);
        });
        rivals.forEach((r, i) => {
          if (!r.artist) return;
          K.industry._post(r.artist, i % 2 ? "x" : "instagram", `Beklenen oldu.`, { salt: "flop_r" });
          K.industry.setTie(a.id, r.id, "rival", 0.3);
        });
      } else if (eventKind === "label") {
        friends.forEach(f => {
          if (!f.artist) return;
          K.industry._post(f.artist, "instagram", `${name} yeni yolculuğunda başarılar 🖤`, { salt: "lbl_f" });
        });
      }
    },

    /* ============================================================
       v10.59 — GEÇMİŞİN İLİŞKİYE ETKİSİ
       Hafızadaki net duygu, samimiyeti ÇOK YAVAŞ biçimlendirir.
       Böylece "başarılı ortak iş" veya "beef" tek günlük olay olarak
       kalmaz; aylar sonra hâlâ hissedilir. Ayrıca olumlu geçmiş,
       yeni bir feature teklifini tetikleyebilir.
       ============================================================ */
    memoryDriftTick() {
      const s = K.state;
      const I = K.industry.ensure();
      Object.keys(I.memSum || {}).forEach(id => {
        const rel = s.relations && s.relations[id];
        if (!rel) return;
        const score = K.industry.memoryScore(id);
        if (!score) return;
        const pull = U.clamp(score * 0.02, -0.12, 0.12);
        rel.affinity = U.clamp(rel.affinity + pull, 0, 100);
      });
    },

    _maybeReunite() {
      const s = K.state;
      const I = K.industry.ensure();
      Object.keys(I.memSum || {}).forEach(id => {
        const m = I.memSum[id];
        if (!m || !(m.feat_ok > 0)) return;
        if ((m.beef || 0) > 0) return;
        const a = K.artistById(id);
        const rel = s.relations && s.relations[id];
        if (!a || !rel || rel.affinity < 55) return;
        if (rel.deal && rel.deal.type === "feature" && rel.deal.status !== "released") return;
        if ((s.offers || []).some(o => o.artistId === id && o.status === "pending")) return;
        const seed = "reunite|" + id + "|" + s.day;
        if (!hChance(seed, 0.01 + Math.min(0.03, (m.feat_ok) * 0.008))) return;
        if (K.relations && K.relations.createIncomingFeatureOffer) {
          K.relations.createIncomingFeatureOffer(id);
          K.industry._event("feature", `🎤 ${a.stageName} yeniden ortak iş teklif etti`, { artistId: id, player: true });
        }
      });
    },

    _updateArcs() {
      const I = K.industry.ensure();
      Object.keys(I.career || {}).forEach(id => {
        const c = I.career[id];
        if (!c) return;
        if (K.state.day - (c.arcDay || 0) >= 7) K.industry.arcOf(id);
      });
    },

    /* önemli dünya olayları için günlük bildirim tavanı (spam engeli) */
    _notifyImportant(title, msg, kind, priority) {
      const I = K.industry.ensure();
      const s = K.state;
      if (I.notifDay !== s.day) { I.notifDay = s.day; I.notifCount = 0; }
      if ((I.notifCount || 0) >= 3) return false;
      I.notifCount = (I.notifCount || 0) + 1;
      return K.industry.notify(title, msg, kind, priority == null ? 2 : priority);
    },

    /* ============================================================
       OYUNCU → DÜNYA: feature yayını
       Şarkı yayınlandığında feature partnerinin kitlesi akar,
       partnerin dostları över, rakipleri laf atar, sektör görür.
       ============================================================ */
    onPlayerRelease(song) {
      if (!song || song._indFeature) return null;
      song._indFeature = true;
      const s = K.state, p = s.player;
      const b = K.artistById(song.featWith);
      if (!b) return null;
      const I = K.industry.ensure();

      /* 1) KİTLE AKTARIMI — partnerin kitlesinden bir bölümü gelir */
      song.boosts = song.boosts || {};
      const key = "feat_" + b.id;
      song.boosts[key] = (song.boosts[key] || 0) + 0.35;
      song.featBoost = (song.featBoost || 0) + 0.35;

      const igGain = Math.round((b.ig || 0) * 0.0025 + Math.min(120000, (b.monthly || 0) * 0.006) * 0.02);
      p.ig = Math.round((p.ig || 0) + igGain);
      p.tiktok = Math.round((p.tiktok || 0) + (b.tiktok || 0) * 0.003);
      p.x = Math.round((p.x || 0) + (b.x || 0) * 0.002);
      p.ytSubs = Math.round((p.ytSubs || 0) + (b.ytSubs || 0) * 0.0015);

      /* 2) İLİŞKİ + SEKTÖR MOMENTUMU + HAFIZA */
      if (K.relations && K.relations.addAffinity) {
        K.relations.addAffinity(b.id, 3, "feat_yayin", { uncapped: true });
      }
      K.industry.remember(b.id, "feat_ok", "player", {
        delta: 3, weight: 2, note: `"${song.title}" ortak işi yayınlandı`
      });
      K.industry.remember(b.id, "hit_together", "player", { delta: 2, weight: 1.5 });
      K.industry.recordCareer(b.id, "feature", {});
      K.industry._industryHistory("player_feature", `Player ile ${b.stageName} ortak single çıkardı`, [b.id]);
      I.momentum = U.clamp((I.momentum || 0) + 0.35, 0, 1);

      /* 3) AĞ TEPKİSİ — dostlar över, rakipler gönderme yapar */
      K.industry._reactNetwork(b, song, "friend", 2, "praise");
      K.industry._reactNetwork(b, song, "rival", 1, "shade");

      /* 4) PARTNERİN KENDİ PAYLAŞIMI */
      K.industry._post(b, "instagram", `"${song.title}" birlikte çıktı — dinleyin 🎧`, { salt: "mine", songTitle: song.title });
      K.industry._post(b, "x", `"${song.title}" yayında. Emeğe saygı.`, { salt: "mine", songTitle: song.title });

      /* 5) OLAY + BİLDİRİM + TREND */
      K.industry._event("player_feature", `🤝 ${b.stageName} ile "${song.title}" ortak işin sektörde yankı buldu`,
        { artistId: b.id, important: true, player: true });
      K.industry.notify("🤝 Ortak iş yankılandı", `${b.stageName} kitlesi "${song.title}" işine akın etti.`, "ok", 2);
      s.trends = s.trends || [];
      s.trends.unshift({ tag: "#" + String(song.title).replace(/\s+/g, ""), count: 40000 + Math.round((b.popularity || 50) * 5000), mine: true });
      s.trends = s.trends.slice(0, 8);

      if (K.save) K.save();
      return { partnerId: b.id, igGain: igGain };
    },

    /* ağdaki bir sanatçının dostları/rakipleri üzerinden tepki üret */
    _reactNetwork(center, song, kind, n, tone) {
      const list = kind === "friend" ? K.industry.friendsOf(center.id, n) : K.industry.rivalsOf(center.id, n);
      const pool = list.length ? list : (kind === "friend"
        ? [{ artist: hPick("np|" + center.id, K.artistList().filter(x => x.id !== center.id)) }]
        : []);
      pool.forEach((x, i) => {
        const a = x.artist;
        if (!a) return;
        const text = tone === "praise"
          ? `"${song.title}" güzel olmuş, tebrikler.`
          : `"${song.title}" bana pek geçmedi, ama herkesin zevki farklı.`;
        K.industry._post(a, i % 2 ? "x" : "instagram", text, { salt: "react" + i, songTitle: song.title });
        if (K.relations && K.relations.addAffinity && tone === "praise") {
          K.relations.addAffinity(a.id, 0.8, "feat_dost_tepki");
        }
      });
    },

    /* ============================================================
       OYUNCU → DÜNYA: husumet
       Hedefin dostları tavır alır, rakipleri mesafeyi sever.
       ============================================================ */
    onPlayerBeef(artistId) {
      const target = K.artistById(artistId);
      if (!target) return null;
      const I = K.industry.ensure();
      const friends = K.industry.friendsOf(artistId, 4);
      const rivals = K.industry.rivalsOf(artistId, 3);

      friends.forEach((f, i) => {
        if (!f.artist) return;
        if (K.relations && K.relations.addAffinity) K.relations.addAffinity(f.id, -1.5, "dostuna_husumet");
        K.industry._post(f.artist, i % 2 ? "x" : "instagram", `${target.stageName}'a yapılanı görmezden gelemeyiz.`, { salt: "beef" });
      });
      rivals.forEach((r, i) => {
        if (!r.artist) return;
        if (K.relations && K.relations.addAffinity) K.relations.addAffinity(r.id, 1, "rakip_husumet");
        K.industry._post(r.artist, i % 2 ? "x" : "instagram", "Bazı tartışmalar kendiliğinden çözülür.", { salt: "beef" });
      });

      /* v10.59 — husumet artık kalıcı hafızada: uzun vadeli mesafe */
      K.industry.remember(artistId, "beef", "player", { delta: -3, weight: 2, note: "Oyuncu ile husumet" });
      friends.forEach(f => { if (f.artist) K.industry.remember(f.id, "support_friend", "player", { delta: -1, weight: 1, note: target.stageName + " dostuna husumet" }); });
      rivals.forEach(r => { if (r.artist) K.industry.remember(r.id, "support", "player", { delta: 1, weight: 1 }); });
      K.industry._industryHistory("player_beef", `Player ile ${target.stageName} arasında gerilim başladı`, [artistId]);
      I.momentum = U.clamp((I.momentum || 0) - 0.1, 0, 1);
      K.industry._event("player_beef", `💥 Sektör, ${target.stageName} ile gerginliğini konuşuyor`,
        { artistId: artistId, important: true, player: true });
      K.industry.notify("💥 Husumet yankısı",
        `${target.stageName}'ın çevresi tavır aldı; sektör konuşuyor.`, "warn", 2);
      if (K.save) K.save();
      return { friends: friends.length, rivals: rivals.length };
    },

    /* ============================================================
       TEKLİF EKONOMİSİ — sektör momentumu şirket ilgisine dönüşür
       Yalnızca oyuncunun büyük hamlelerinden gelen momentumda çalışır;
       normal oynayışta relations.dailyTick zaten teklif üretir.
       ============================================================ */
    labelInterest() {
      const I = K.industry.ensure();
      return U.clamp(I.momentum || 0, 0, 1);
    },

    _pickLabelForPlayer() {
      const p = K.state.player;
      const pop = p.popularity || 0;
      const all = (K.LABELS || []).filter(l => l.id !== p.labelId);
      if (!all.length) return null;
      let pool;
      if (pop >= 55) pool = all.filter(l => l.power >= 74);            // major
      else if (pop >= 35) pool = all.filter(l => l.power >= 66 && l.power < 84); // büyük
      else pool = all.filter(l => l.power < 74);                       // bağımsız/orta
      if (!pool.length) pool = all;
      const pick = hPick("lbloffer|" + K.state.day + "|" + Math.round(pop), pool);
      return pick ? pick.id : null;
    },

    _maybeLabelOffer() {
      const s = K.state, p = s.player;
      const I = K.industry.ensure();
      if (s.label || p.labelId) return;
      if ((I.momentum || 0) < 0.6) return;
      if (s.day - (I.lastLabelOfferDay || 0) < 75) return;
      if ((s.offers || []).some(o => o.type === "label" && o.status === "pending")) return;
      if ((p.popularity || 0) < 22) return;
      const labelId = K.industry._pickLabelForPlayer();
      if (!labelId) return;
      I.lastLabelOfferDay = s.day;
      I.momentum = U.clamp(I.momentum - 0.5, 0, 1);
      if (K.relations && K.relations.createLabelSignsPlayerOffer) {
        K.relations.createLabelSignsPlayerOffer(labelId);
      }
    },

    /* ============================================================
       GÜNLÜK TICK — dünya oyuncuyu beklemeden ilerler
       ============================================================ */
    tick() {
      const s = K.state;
      if (!s || !s.player) return;
      K.industry.init();
      const I = K.industry.ensure();
      const day = s.day;

      /* momentum yavaşça söner (bir hamlenin etkisi kalıcı değil) */
      I.momentum = U.clamp((I.momentum || 0) * 0.94, 0, 1);

      const artists = K.artistList().filter(a => a && !a.mergedInto);
      if (!artists.length) return;

      /* 1) yayınlanmış feature'lı işler (yedek tarama — eski kayıtlar) */
      (s.player.songs || []).forEach(song => {
        if (song.featWith && !song._indFeature) K.industry.onPlayerRelease(song);
      });

      /* 2) oyuncunun husumetleri (beef.js kaydı) */
      Object.keys(s.beefs || {}).forEach(id => {
        const b = s.beefs[id];
        if (b && !b._indSeen) { b._indSeen = true; K.industry.onPlayerBeef(id); }
      });

      /* 3) ödül töreni kazananları */
      K.industry._recordAwards();

      /* 4) günlük NPC olayları — günde en çok 2 (gündem boğulmasın) */
      let fired = 0;
      const MAX = 2;

      if (fired < MAX && hChance("ind|feat|" + day, 0.16)) {
        const pair = K.industry._pickPair("ind|feat|" + day, "friend");
        if (pair) { K.industry._npcFeature(pair[0], pair[1]); fired++; }
      }
      if (fired < MAX && hChance("ind|lbl|" + day, 0.06)) {
        const a = hPick("ind|lbl|" + day, artists.filter(x => x.labelId !== "my_label"));
        if (a) { K.industry._npcLabelChange(a); fired++; }
      }
      if (fired < MAX && hChance("ind|con|" + day, 0.18)) {
        const a = hPick("ind|con|" + day, artists);
        if (a) { K.industry._npcConcert(a); fired++; }
      }
      if (fired < MAX && hChance("ind|ten|" + day, 0.07)) {
        const pair = K.industry._pickPair("ind|ten|" + day, "rival");
        if (pair) { K.industry._npcTension(pair[0], pair[1]); fired++; }
      }

      /* 5) momentumdan şirket ilgisi */
      K.industry._maybeLabelOffer();

      /* 6) v10.59 — hafızanın ilişkiye yavaş etkisi + geçmiş ortakların dönüşü */
      K.industry.memoryDriftTick();
      K.industry._maybeReunite();
      K.industry._updateArcs();

      /* 7) bugünün olayından akışa bir gönderi (feed değişsin) */
      K.industry._feedFromEvents();
    },

    _feedFromEvents() {
      const s = K.state;
      const I = K.industry.ensure();
      const today = I.events.filter(e => e.day === s.day && !e._posted && e.artistId && e.kind !== "player_feature" && e.kind !== "player_beef");
      if (!today.length) return;
      const ev = today[0];
      const a = K.artistById(ev.artistId);
      if (!a) { ev._posted = true; return; }
      const platform = hChance("ind|pf|" + s.day, 0.5) ? "x" : "instagram";
      K.industry._post(a, platform, String(ev.text).replace(/^[^\p{L}\p{N}]+/u, ""), { salt: "evt" });
      ev._posted = true;
    },

    /* ============================================================
       ARAYÜZ — Gündem uygulamasındaki "Endüstri" sekmesi
       ============================================================ */
    feedHTML() {
      const s = K.state;
      const evs = K.industry.events(16);
      const hist = K.industry.history(6);
      if (!evs.length && !hist.length) {
        return `<div class="empty-note"><b>Endüstri henüz sessiz</b>Günler ilerledikçe sanatçılar yayın yapar, transfer olur, sahneye çıkar.</div>`;
      }
      const head = `<div class="news-hint">🏭 Sektörden son hareketler — sen bir şey yapmasan da dünya akıyor.</div>`;
      const rows = evs.map(e => `
        <div class="news-item">
          <div class="ni-head">
            <div class="ni-title">${U.escape(e.text)}</div>
          </div>
          <div class="ni-keywords"><span>${U.escape(U.ago(e.day, s.day))}</span><span>${U.escape((KINDS[e.kind] || {}).label || "Sektör")}</span></div>
        </div>`).join("");
      /* v10.59 — uzun vadeli sektör tarihi (yıl etiketli) */
      const histHTML = hist.length ? `
        <div class="news-hint">📜 Sektör tarihi</div>` +
        hist.map(h => `
        <div class="news-item">
          <div class="ni-head">
            <div class="ni-title">${U.escape(h.y + " — " + h.text)}</div>
          </div>
          <div class="ni-keywords"><span>${U.escape((KINDS[h.kind] || {}).label || "Sektör")}</span></div>
        </div>`).join("") : "";
      return head + rows + histHTML;
    }
  };
})(window.K = window.K || {});
