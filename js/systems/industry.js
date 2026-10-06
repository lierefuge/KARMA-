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
    player_beef:   { icon: "💥", label: "Husumet" },
    /* v10.62 — "GERÇEK DÜNYA" bağlantı olayları */
    meet:          { icon: "👋", label: "Tanışma" },
    bond:          { icon: "🔗", label: "Yakın ilişki" },
    viral:         { icon: "⚡", label: "Viral" },
    comeback:      { icon: "🔄", label: "Comeback" }
  };

  K.industry = {

    KINDS: KINDS,

    /* ============================================================
       v10.61 — NPC AYLIK DİNLEYİCİ EKONOMİSİ SABİTLERİ
       Aylık dinleyici artık yayın bonusuyla doğrudan büyüyen yapay
       bir sayı DEĞİL; son 28 günün GERÇEK stream performansından
       türetilir. Parametreler oyuncunun mevcut ölçeğine göre seçildi
       (oyuncu modeli: monthly ≈ 28 günlük akışın yarısı).
       ============================================================ */
    NPC_MONTHLY: {
      WINDOW: 28,               // gerçek performans penceresi (gün)
      STREAM_TO_LISTENER: 0.5,  // monthly = pencere akışı × 0.5 (oyuncu modeliyle aynı)
      CATALOG_DIV: 14,          // katalog günlük akışı = taban/14 → sabit monthly
      FLOOR: 50000,             // güvenli taban (altına inmez)
      POP_FLOOR: 700,           // popülerliğin tabana katkısı
      SOFT_CAP_BASE: 500000,    // yumuşak tavan tabanı
      SOFT_CAP_POP: 110000,     // popülerlikle büyüyen tavan
      INACTIVE_GRACE: 150,      // yayınsız bu günden sonra taban erimeye başlar
      INACTIVE_DECAY: 0.9975,   // günlük erime (≈ -%7/ay)
      FLOP_DAYS: 21             // flop sonrası katalog hasarı süresi
    },

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
      I.lastRelease = I.lastRelease || {}; // v10.60 — artistId → son yayın performansı
      /* v10.61 — artistId → son 28 günün günlük akış penceresi
         { last: gün, vals: [günlük akış...] }. Eski kayıtta yoksa boş
         kalır; pencere ilk erişimde monthly'den tohumlanır. */
      I.npcStreams = I.npcStreams || {};
      /* v10.62 — NPC↔NPC ilişki aşamaları ("a|b" → {st,day,last,feat})
         ve aktif viral olaylar (artistId → {day,until,mult,...}). */
      I.npcRel = I.npcRel || {};
      I.viral = I.viral || {};
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

    /* ============================================================
       v10.62 — NPC ↔ NPC İLİŞKİ AŞAMALARI ("GERÇEK DÜNYA")
       ties (friend/rival) ilişkinin YÖNÜdür; bu katman DERECESİdir.
       İki sanatçı önce karşılaşır, tanışır, iletişim kurar, düzenli
       görüşür, arkadaş/iş ilişkisi kurar, ortak proje yapar, yakınlaşır.
       Feature yalnızca yeterli aşamaya gelmiş çiftler arasında olur;
       böylece "hiç tanışmadan ortak iş" imkânsız hale gelir. Zamanla
       ilerler: aynı gün herkes birbirini tanımaz.
       ============================================================ */
    NPC_REL_STAGES: [
      "tanımıyor", "ilk karşılaşma", "tanışıyor", "iletişim",
      "düzenli etkileşim", "arkadaş/iş", "ortak proje", "yakın ilişki"
    ],

    _pk(aId, bId) { return aId < bId ? aId + "|" + bId : bId + "|" + aId; },

    npcRelOf(aId, bId) {
      const I = K.industry.ensure();
      const k = K.industry._pk(aId, bId);
      const r = I.npcRel[k] = I.npcRel[k] || { st: 0, day: 0, last: 0, feat: 0 };
      return r;
    },

    npcRelStage(aId, bId) { return K.industry.npcRelOf(aId, bId).st || 0; },

    npcRelLabel(st) { return K.industry.NPC_REL_STAGES[U.clamp(st | 0, 0, 7)]; },

    /* aşamayı ilerlet (deterministik). Eşik geçilirse olay/haber üretir. */
    advanceNpcRel(aId, bId, n, reason) {
      const a = K.artistById(aId), b = K.artistById(bId);
      if (!a || !b) return 0;
      const r = K.industry.npcRelOf(aId, bId);
      const before = r.st || 0;
      r.st = U.clamp(before + (n || 1), 0, 7);
      r.day = K.state.day; r.last = K.state.day;
      if (r.st !== before) {
        if (r.st === 1) {
          K.industry._event("meet", `👋 ${a.stageName} ile ${b.stageName} aynı ortamda karşılaştı`, { artistId: a.id });
        } else if (r.st === 2) {
          K.industry._event("meet", `🤝 ${a.stageName} ve ${b.stageName} tanıştı`, { artistId: a.id });
        } else if (r.st === 6) {
          K.industry._event("feature", `🎤 ${a.stageName} ile ${b.stageName} ortak projeye başladı`, { artistId: a.id, important: true });
          K.industry._industryHistory("feature", `${a.stageName} ve ${b.stageName} ortak proje yaptı`, [a.id, b.id]);
        } else if (r.st === 7) {
          K.industry._industryHistory("bond", `${a.stageName} ile ${b.stageName} artık yakın çalışma ortakları`, [a.id, b.id]);
        }
      }
      return r.st;
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
          /* v10.62 — başlangıç ilişki AŞAMASI: herkes herkesi tanımaz.
             Aynı şirket → tanışıyor/iletişim, aynı tür → karşılaşmış,
             diğerleri çoğunlukla hiç tanışmamış. Zamanla ilerler. */
          let st = 0;
          if (sameLabel) st = 3 + (frac(seed + "st") < 0.5 ? 1 : 0);
          else if (sameGenre && kind === "friend") st = 2 + (frac(seed + "st") < 0.4 ? 1 : 0);
          else if (sameGenre) st = 1;
          else if (kind) st = 1;
          if (st > 0) K.industry.npcRelOf(a.id, b.id).st = st;
        }
      }
      I._tiesSeeded = true;
    },

    /* ---- kenar listeleri (ağırlıklı seçim için) ----
       minStage verilirse yalnızca o ilişki aşamasına ULAŞMIŞ çiftler
       döner; böylece tanışmamış sanatçılar ortak iş yapamaz. */
    _edges(kind, minStage) {
      const I = K.industry.ensure();
      const out = [];
      Object.keys(I.ties).forEach(a => {
        const map = I.ties[a] && I.ties[a][kind];
        if (!map) return;
        Object.keys(map).forEach(b => {
          if (a < b && map[b] > 0) {
            if (minStage && K.industry.npcRelStage(a, b) < minStage) return;
            out.push([a, b, map[b]]);
          }
        });
      });
      return out;
    },

    _pickPair(seed, kind, minStage) {
      const edges = K.industry._edges(kind, minStage);
      if (!edges.length) return null;
      /* v10.62.1 — KİŞİLİK AĞIRLIĞI: seçici sanatçılar daha az ortak iş
         yapar; rekabetçi/agresif olanlar daha çok gerilim üretir. Oran
         (olay sıklığı) korunur, yalnızca KİMİN seçildiği değişir. */
      const P = K.industry.personality;
      const wOf = (e) => {
        let w = e[2];
        const a = K.artistById(e[0]), b = K.artistById(e[1]);
        if (a && b && P) {
          const pa = P(a), pb = P(b);
          if (kind === "friend") w *= Math.max(0.2, 1.5 - (pa.selective + pb.selective) / 2);
          else w *= 0.7 + (pa.competitive + pb.competitive) / 2 + (pa.aggressive + pb.aggressive) / 2;
        }
        return Math.max(0.05, w);
      };
      const total = edges.reduce((s, e) => s + wOf(e), 0);
      let r = frac(seed) * total;
      let chosen = edges[edges.length - 1];
      for (const e of edges) { r -= wOf(e); if (r <= 0) { chosen = e; break; } }
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
      const followers = (K.social && K.social.platformFollowers)
        ? K.social.platformFollowers(a, platform) : (a.ig || 0);
      const eng = K.industry._eng(followers, a.id + "|" + platform + "|" + s.day + "|" + salt);
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
      /* v10.62 — monthly DOĞRUDAN büyütülmez (v10.61 kuralı). Feature
         kitlesi stream penceresine yazılır; monthly buradan türetilir. */
      K.industry.npcStreamPush(a, Math.round((a.monthly || 50000) * boost * 0.5));
      K.industry.npcStreamPush(b, Math.round((b.monthly || 50000) * boost * 0.5));
      a.monthly = K.industry.npcMonthlyFromWindow(a);
      b.monthly = K.industry.npcMonthlyFromWindow(b);
      K.industry.setTie(a.id, b.id, "friend", 1.5);
      /* v10.62 — ortak iş ilişkiyi ilerletir: aşama ≥6 (ortak proje) */
      const st = K.industry.npcRelOf(a.id, b.id).st || 0;
      if (st < 6) K.industry.advanceNpcRel(a.id, b.id, 6 - st, "feature");
      K.industry.npcRelOf(a.id, b.id).feat = (K.industry.npcRelOf(a.id, b.id).feat || 0) + 1;
      K.industry.recordCareer(a.id, "feature", {});
      K.industry.recordCareer(b.id, "feature", {});
      K.industry.remember(a.id, "hit_together", b.id, { delta: 1, weight: 1 });
      K.industry.remember(b.id, "hit_together", a.id, { delta: 1, weight: 1 });

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
      /* v10.62 — gerilim de bir etkileşimdir: ilişki aşamasını ilerletir */
      const st = K.industry.npcRelOf(a.id, b.id).st || 0;
      if (st < 2) K.industry.advanceNpcRel(a.id, b.id, 2 - st, "tension");
      else K.industry.advanceNpcRel(a.id, b.id, 1, "tension");
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
      const outcome = K.industry.npcOutcome(a);
      /* v10.59 — her yayın kariyer geçmişine işlenir (hit/flop ayrıca) */
      if (K.industry.recordCareer) K.industry.recordCareer(a.id, "release", {});
      if (outcome === "flop") {
        /* TUTMAYAN İŞ: nadiren bir yayın bekleneni vermez.
           v10.61 — kısa süreli katalog hasarı: pencereden gelen akış
           düşer, böylece monthly GERÇEKTEN gerileyebilir. */
        a._flopUntil = K.state.day + K.industry.NPC_MONTHLY.FLOP_DAYS;
        const f = 0.18 + frac(seed + "f") * 0.35;
        a.popularity = U.clamp((a.popularity || 50) - (0.3 + frac(seed + "fp") * 0.5), 30, 99);
        K.industry._event("flop", `📉 ${a.stageName}'in yeni işi bekleneni vermedi`, { artistId: a.id });
        K.industry._post(a, "x", "Bazen iş tutmaz. Yola devam.", { salt: "flop" });
        if (K.industry.recordCareer) K.industry.recordCareer(a.id, "flop", {});
        if (K.industry.reactToCareer) K.industry.reactToCareer(a, "flop");
        return gain * f;
      }
      if (outcome === "hit") {
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
       v10.60 — NPC YAYIN SONUCU (deterministik)
       adjustNpcRelease ile AYNI tohuma bağlıdır; böylece sonuç tek
       yerden okunur ve iki sistem asla çelişmez.
       ============================================================ */
    npcOutcome(a) {
      if (!a) return "normal";
      const r = frac("rel|" + a.id + "|" + K.state.day);
      if (r < 0.22) return "flop";
      if (r > 0.88) return "hit";
      return "normal";
    },

    /* tür → trend etiket anahtarları (mevcut gündem etiketleriyle uyumlu) */
    TREND_TAGS: {
      trap: ["trap", "türkiye", "yenişarkı"],
      rap: ["rap", "underground", "yenişarkı"],
      drill: ["drill", "underground"],
      pop: ["pop", "spotify", "yenişarkı"],
      rnb: ["r&b", "rnb", "soul"],
      indie: ["indie", "alternatif", "underground"]
    },

    /* bir türün ŞU ANKİ trendlerle uyumu (0..1). Deterministik. */
    trendMatch(genre) {
      const s = K.state;
      const keys = K.industry.TREND_TAGS[genre] || [];
      if (!keys.length || !s.trends || !s.trends.length) return 0;
      let best = 0;
      s.trends.forEach(t => {
        const tag = String(t.tag || "").toLowerCase();
        if (keys.some(k => tag.indexOf(k) >= 0)) {
          best = Math.max(best, 0.5 + Math.min(0.5, (t.count || 0) / 2000000));
        }
      });
      return U.clamp(best, 0, 1);
    },

    /* label gücü + prestiji → yayın avantajı (başarıyı GARANTİ ETMEZ) */
    labelFactor(a) {
      if (!a || !a.labelId) return 0.95;
      let power = 60, prestige = 60;
      if (a.labelId === "my_label" && K.label && K.label.power) {
        power = K.label.power();
        prestige = power;
      } else if (K.labelById) {
        const l = K.labelById(a.labelId);
        if (l) power = l.power || 60;
        if (K.labelSim && K.labelSim.prestige) prestige = K.labelSim.prestige(a.labelId);
      }
      /* güçlü label daha iyi başlangıç görünürlüğü verir; zayıf label
         yine de kaliteli bir işle hit çıkarabilir (tavan 1,25). */
      return U.clamp(0.9 + (power - 60) / 220 + (prestige - 55) / 400, 0.9, 1.25);
    },

    /* yayın performansını besleyen faktörler (hepsi deterministik) */
    npcFactors(a, song) {
      const s = K.state;
      const seed = "npf|" + a.id + "|" + s.day + "|" + ((song && song.title) || "");
      const c = K.industry.careerOf(a.id);
      const work = (a.traits && a.traits.work) ? a.traits.work : 5;
      /* v10.62.1 — kişilik, faktörleri ORTALAMA NÖTR biçimde kaydırır:
         çalışkan/deneysel sanatçının kalitesi biraz yüksek ve oynak,
         trend takipçisi trendden biraz daha çok kazanır. */
      const P = K.industry.personality(a) || { workaholic: 0.6, experimental: 0.5, trendChaser: 0.5 };
      const qMul = 1 + (P.workaholic - 0.6) * 0.08 + (P.experimental - 0.5) * 0.06;
      const quality = U.clamp((0.75 + work / 25 + frac(seed + "q") * 0.35) * qMul, 0.5, 1.5);
      const momentum = U.clamp(0.85 + (c.momentum || 0) * 0.5, 0.6, 1.45);
      const trend = (0.92 + K.industry.trendMatch(a.genre) * 0.45) * (1 + (P.trendChaser - 0.5) * 0.12);
      const label = K.industry.labelFactor(a);
      const social = U.clamp(
        0.9 + Math.log10(Math.max(100, (a.ig || 0) + (a.x || 0) + (a.tiktok || 0) + (a.ytSubs || 0))) / 50,
        0.9, 1.3);
      const dow = s.day % 7;
      const timing = (dow === 4 || dow === 5) ? 1.08 : (dow === 0 || dow === 6) ? 1.03 : 0.97;
      return { quality: quality, momentum: momentum, trend: trend, label: label, social: social, timing: timing };
    },

    /* ============================================================
       v10.61 — NPC STREAM PENCERESİ (son 28 gün)
       Aylık dinleyiciyi doğrudan release bonusuyla büyütmek yerine
       sanatçının GÜNLÜK akışı bu pencereye yazılır; monthly buradan
       türetilir. Pencere kayan bir dizidir: en fazla WINDOW gün tutar,
       eskisi düşer (temizlik O(1) amortize).
       ============================================================ */
    _seedWindow(a) {
      const day = (K.state && K.state.day) || 1;
      const base = Math.max(50000, (a && a.monthly) || 50000);
      const d = Math.max(1, Math.round(base / K.industry.NPC_MONTHLY.CATALOG_DIV));
      const vals = [];
      for (let i = 0; i < K.industry.NPC_MONTHLY.WINDOW; i++) vals.push(d);
      return { last: day - 1, vals: vals };
    },

    _npcWin(a) {
      const I = K.industry.ensure();
      let w = I.npcStreams[a.id];
      if (!w || !Array.isArray(w.vals)) { w = K.industry._seedWindow(a); I.npcStreams[a.id] = w; }
      return w;
    },

    /* günün akışını pencereye yaz (aynı gün birden çok çağrı toplanır) */
    npcStreamPush(a, value) {
      if (!a || !a.id) return;
      const day = (K.state && K.state.day) || 1;
      const W = K.industry.NPC_MONTHLY.WINDOW;
      const w = K.industry._npcWin(a);
      const v = Math.max(0, Math.round(value || 0));
      if (w.last === day) {
        w.vals[w.vals.length - 1] = (w.vals[w.vals.length - 1] || 0) + v;
      } else {
        /* gün atlanmışsa (test/kayıt yükleme) pencereyi SIFIRLAYIP
           çökertme; son bilinen değeri taşı. Normal oynayışta gün
           gün ilerlediği için bu dal hiç çalışmaz. */
        const missing = Math.max(0, day - (w.last || day) - 1);
        if (missing > 0 && missing < W && w.vals.length) {
          const carry = w.vals[w.vals.length - 1] || 0;
          for (let i = 0; i < missing; i++) w.vals.push(carry);
        }
        w.vals.push(v);
        w.last = day;
      }
      if (w.vals.length > W) w.vals = w.vals.slice(-W);
    },

    npcWindowSum(a) {
      const I = K.industry.ensure();
      const w = I.npcStreams[a.id];
      if (!w || !Array.isArray(w.vals)) return 0;
      let sum = 0;
      for (let i = 0; i < w.vals.length; i++) sum += (w.vals[i] || 0);
      return sum;
    },

    /* yumuşak tavan: dizin altında aynen, tavana yaklaşırken doygunlaşır */
    _softCap(x, cap) {
      const knee = cap * 0.75;
      if (x <= knee) return x;
      const room = cap - knee;
      return knee + room * (1 - Math.exp(-(x - knee) / room));
    },

    /* son 28 günlük gerçek akış → aylık dinleyici (popülerlik tabanı + tavan) */
    npcMonthlyFromWindow(a) {
      const N = K.industry.NPC_MONTHLY;
      const win = K.industry.npcWindowSum(a);
      const pop = (a && a.popularity) || 50;
      const floor = Math.max(N.FLOOR, pop * N.POP_FLOOR);
      const cap = N.SOFT_CAP_BASE + pop * N.SOFT_CAP_POP;
      const m = K.industry._softCap(win * N.STREAM_TO_LISTENER, cap);
      return Math.round(Math.max(floor, m));
    },

    /* ============================================================
       v10.61 — GÜNLÜK NPC MONTHLY TICK
       accrueArtistWorld her sanatçı için bir kez çağırır. Katalog
       akışını pencereye yazar, uzun sessizlikte tabanı eritir ve
       monthly'yi pencereden türetir. Ağır tarama yok; O(1)+O(28).
       ============================================================ */
    npcMonthlyTick(a, catDaily) {
      if (!a || !a.id) return null;
      const N = K.industry.NPC_MONTHLY;
      if (catDaily > 0) K.industry.npcStreamPush(a, catDaily);
      const c = K.industry.careerOf(a.id);
      const idle = ((K.state && K.state.day) || 0) - (c.lastRelease || 0);
      if (idle > N.INACTIVE_GRACE && a._base) {
        a._base = Math.max(N.FLOOR, a._base * N.INACTIVE_DECAY);
      }
      const prev = a.monthly || 0;
      const m = K.industry.npcMonthlyFromWindow(a);
      a.monthly = m;
      K.industry._trackMonthlyMilestone(a, prev, m);
      return m;
    },

    /* kariyer geçmişine yalnızca ANLAMLI aylık kırılmalar yazılır (spam yok) */
    _trackMonthlyMilestone(a, prev, m) {
      const c = K.industry.careerOf(a.id);
      const day = (K.state && K.state.day) || 0;
      const peakBefore = c.monthlyPeak || 0;
      if (m > peakBefore) {
        c.monthlyPeak = m;
        c._mTrough = m;
        if (peakBefore > 0 && m >= peakBefore * 1.03 && day - (c._mPeakDay || 0) >= 30) {
          c._mPeakDay = day;
          c.milestones.unshift({ day: day, text: "aylık zirve: " + m });
          c.milestones = c.milestones.slice(0, 10);
        }
      } else if (m < (c._mTrough == null ? m : c._mTrough)) {
        c._mTrough = m;
      }
      if (m < prev * 0.995) c._mDownDays = (c._mDownDays || 0) + 1;
      else c._mDownDays = 0;
      if (c._mDownDays === 30) {
        c.milestones.unshift({ day: day, text: "uzun aylık düşüş" });
        c.milestones = c.milestones.slice(0, 10);
      }
      /* comeback: zirveden ≥%25 düşmüşken dipten ≥%15 toparlanma */
      if (c.monthlyPeak && c._mTrough && c._mTrough < c.monthlyPeak * 0.75 &&
        m >= c._mTrough * 1.15 && day - (c._mComebackDay || 0) >= 60) {
        c._mComebackDay = day;
        c.milestones.unshift({ day: day, text: "aylık toparlanma" });
        c.milestones = c.milestones.slice(0, 10);
      }
    },

    /* ============================================================
       v10.60 — YAŞAYAN NPC YAYINI
       game.npcRelease buradan geçer. Mevcut RNG akışı KORUNUR; bu
       fonksiyon yalnızca deterministik EK etkiler uygular:
         ilk dinlenme → günlük akış → kariyer geçmişi → chart/trend.
       ============================================================ */
    applyNpcRelease(a, song, gain, big) {
      if (!a) return null;
      const s = K.state;
      const I = K.industry.ensure();
      const day = s.day;
      const c = K.industry.careerOf(a.id);
      const outcome = K.industry.npcOutcome(a);
      const f = K.industry.npcFactors(a, song);

      /* 1) İLK DİNLENME: aylık dinleyici → günlük taban akış × faktörler */
      const monthly = Math.max(50000, a.monthly || 50000);
      const baseDaily = monthly / 26;
      /* v10.61 — katsayılar monthly'nin kontrollü değişmesi için yeniden
         kalibre edildi: normal ≈ ±%5-8, hit ≈ +%20-25, flop geriler.
         Tek bir hit asla astronomik sıçrama yaratmaz (soft-cap + pencere). */
      const outcomeMult = outcome === "hit" ? 2.4 : outcome === "flop" ? 0.45 : 1.0;
      const releaseBoost = 1 + Math.min(0.9, (a._boost || 0) + (gain || 0));
      let initial = Math.round(baseDaily * 0.16 * releaseBoost * outcomeMult *
        f.quality * f.trend * f.label * f.social * f.timing);
      initial = Math.max(500, initial);

      /* 2) FEATURE KİTLESİ: iki sanatçının kitleleri birleşir */
      let featName = null;
      if (song && song.featWith) {
        const b = K.artistById(song.featWith);
        if (b && b.id !== a.id) {
          const cross = Math.min(0.45, Math.sqrt(Math.max(0, b.monthly || 0)) / 4200);
          initial = Math.round(initial * (1 + cross));
          featName = b.stageName;
          a.ig = Math.round((a.ig || 0) + (b.ig || 0) * 0.002);
          a.x = Math.round((a.x || 0) + (b.x || 0) * 0.002);
          a.tiktok = Math.round((a.tiktok || 0) + (b.tiktok || 0) * 0.002);
          a.ytSubs = Math.round((a.ytSubs || 0) + (b.ytSubs || 0) * 0.002);
        }
      }

      /* 2.5) İLK AKIŞ: yayın günü stream penceresine yazılır.
         Sonraki günlerde decayReleaseStreams aynı pencereyi besler. */
      K.industry.npcStreamPush(a, initial);

      /* 2.7) v10.62 — BAŞARI SEVİYESİ: yalnızca GERÇEK performanstan
         türetilir (ilk günlük akış / sanatçının taban akışı). Rastgele
         bir etiket değildir; aynı seed aynı seviyeyi verir. */
      const _ratio = initial / Math.max(1, baseDaily);
      const tier = outcome === "hit"
        ? (_ratio >= 1.5 ? "career" : _ratio >= 1.15 ? "viral" : _ratio >= 0.9 ? "bigHit" : "hit")
        : outcome; // "normal" | "flop"

      /* 3) SONUÇ KAYDI (chart + trend + akış buradan beslenir) */
      I.lastRelease = I.lastRelease || {};
      I.lastRelease[a.id] = {
        day: day, title: (song && song.title) || "", art: (song && song.art) || null,
        featWith: (song && song.featWith) || null, featName: featName,
        initial: initial, daily: initial, peakDaily: initial, total: initial,
        result: outcome, tier: tier,
        factors: {
          quality: +f.quality.toFixed(2), momentum: +f.momentum.toFixed(2),
          trend: +f.trend.toFixed(2), label: +f.label.toFixed(2),
          social: +f.social.toFixed(2), timing: +f.timing.toFixed(2)
        }
      };

      /* 4) MONTHLY LISTENERS: kalıcı tabanı YUMUŞAKÇA kaydır.
         Hit az büyütür, flop az küçültür — ani sıçrama yok. */
      const baseAdj = outcome === "hit" ? 1.006 : outcome === "flop" ? 0.988 : 1.0;
      a._base = Math.max(50000, (a._base || a.monthly || 50000) * baseAdj);

      /* 4.5) MONTHLY: pencere güncellendi → aylık dinleyici GERÇEK
         performanstan yeniden türetilir (yapay bonus yok). */
      a.monthly = K.industry.npcMonthlyFromWindow(a);

      /* 5) SOSYAL TAKİPÇİ (platforma özel, deterministik) */
      const reach = Math.round(Math.min(initial * 0.08, (a.popularity || 50) * 900));
      a.ig = Math.round((a.ig || 0) + reach * 0.4);
      a.x = Math.round((a.x || 0) + reach * 0.2);
      a.tiktok = Math.round((a.tiktok || 0) + reach * 0.3);
      a.ytSubs = Math.round((a.ytSubs || 0) + reach * 0.15);

      /* 6) KARİYER GEÇMİŞİ: stream + sonuç + değişim detayı */
      K.industry.recordCareer(a.id, "release_info", {
        title: (song && song.title) || "",
        streams: initial, result: outcome, tier: tier,
        monthly: a.monthly, popularity: a.popularity,
        featWith: (song && song.featWith) || null
      });
      /* v10.62 — büyük seviyeler kariyer kilometre taşı olur */
      if (tier === "bigHit" || tier === "viral" || tier === "career") {
        c.milestones.unshift({ day: day, text: tier + (song && song.title ? ": " + song.title : "") });
        c.milestones = c.milestones.slice(0, 10);
      }

      /* 7) LABEL EKONOMİSİ (hafif: gelir + hit/flop kaydı → prestij) */
      if (K.labelSim && K.labelSim.recordRelease) K.labelSim.recordRelease(a, outcome, initial);

      /* 8) BÜYÜK HIT: sektör tarihi + öncelikli bildirim (spam yok) */
      if (outcome === "hit" && (a.popularity || 0) >= 72) {
        K.industry._industryHistory("release",
          `${a.stageName} "${(song && song.title) || ""}" ile büyük çıkış yaptı`, [a.id]);
        K.industry._notifyImportant("📈 Sektörde büyük hit",
          `${a.stageName} — "${(song && song.title) || ""}" listelerde hızla yükseliyor.`, "ok");
      }

      /* 9) v10.62 — COMEBACK: floptan sonra gelen hit "geri dönüş"tür.
         Tek flop kariyeri bitirmez; toparlanma her zaman mümkündür. */
      if (outcome === "hit" && (c.flops || 0) > 0 && (day - (c.lastFlop || 0)) <= 240) {
        c.comebackDay = day;
        c.milestones.unshift({ day: day, text: "comeback" });
        c.milestones = c.milestones.slice(0, 10);
        K.industry._event("comeback", `🔄 ${a.stageName} düşüşten sonra geri döndü`, { artistId: a.id, important: (a.popularity || 0) >= 70 });
        K.industry._industryHistory("comeback", `${a.stageName} bir tutmayan işin ardından toparlandı`, [a.id]);
      }

      /* 10) v10.62 — VİRAL ZİNCİRİ (sosyal → stream → monthly → chart).
         Bir hit bazen kısa videolarda patlar; sonraki günlerde bu
         viral akış sanatçının 28 günlük penceresine yazılır. Böylece
         aylık dinleyici GERÇEK stream'den büyür ve chart yükselir. */
      if ((tier === "viral" || tier === "career" || tier === "bigHit") &&
        hChance("vir|" + a.id + "|" + day, tier === "bigHit" ? 0.18 : 0.4)) {
        K.industry._startViral(a, song, tier);
      }
      return I.lastRelease[a.id];
    },

    /* ============================================================
       v10.62 — VİRAL OLAY (TikTok/Reels/Shorts)
       Kısa videoda patlayan bir şarkı birkaç gün boyunca EK akış
       üretir; akış pencereye yazıldığı için monthly ve chart gerçek
       performanstan etkilenir. Deterministik; Math.random yok.
       ============================================================ */
    _startViral(a, song, tier) {
      const I = K.industry.ensure();
      const day = K.state.day;
      const dur = 3 + Math.floor(frac("vird|" + a.id + day) * 3);       // 3-5 gün
      const mult = tier === "career" ? 2.2 : tier === "viral" ? 1.8 : 1.35;
      const platform = hPick("virp|" + a.id + day, ["tiktok", "reels", "shorts"]) || "tiktok";
      I.viral[a.id] = {
        day: day, until: day + dur, mult: mult, platform: platform,
        title: (song && song.title) || ""
      };
      const pf = { tiktok: "TikTok", reels: "Reels", shorts: "Shorts" }[platform] || "TikTok";
      K.industry._event("viral", `⚡ ${a.stageName}'in "${(song && song.title) || "yeni işi"}" parçası ${pf}'ta viral oldu`, { artistId: a.id, important: true });
      K.industry._post(a, platform, `${(song && song.title) || "yeni sesim"} herkesin videosunda 🔥`, { salt: "viral" });
      K.industry._industryHistory("viral", `${a.stageName}'in şarkısı kısa videolarda viral oldu`, [a.id]);
      if (K.industry.reactToCareer) K.industry.reactToCareer(a, "hit");
    },

    /* günlük: aktif viral olaylar ek akış üretir (pencere → monthly → chart) */
    _viralTick() {
      const I = K.industry.ensure();
      const s = K.state, day = s.day;
      const ids = Object.keys(I.viral || {});
      if (!ids.length) return;
      ids.forEach(id => {
        const v = I.viral[id];
        const a = K.artistById(id);
        if (!v || !a) { delete I.viral[id]; return; }
        if (day > v.until) { delete I.viral[id]; return; }
        const lr = I.lastRelease && I.lastRelease[id];
        const base = lr ? lr.daily : Math.max(50000, a.monthly || 50000) / 26;
        const extra = Math.round(base * (v.mult - 1) * 0.6);
        if (extra > 0) {
          K.industry.npcStreamPush(a, extra);
          if (lr) { lr.daily += extra; lr.total = Math.round((lr.total || 0) + extra); lr.viral = true; }
          a.streams = Math.round((a.streams || 0) + extra);
        }
        a.popularity = U.clamp((a.popularity || 50) + 0.15, 30, 99);
        const tag = "#" + String(v.title || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 20);
        if (tag.length >= 5 && s.trends && !s.trends.some(t => t.tag === tag)) {
          s.trends.unshift({ tag: tag, count: Math.round(base * 20), npc: true });
        }
        a.monthly = K.industry.npcMonthlyFromWindow(a);
      });
      s.trends = (s.trends || []).slice(0, 8);
    },

    /* günlük: NPC ilişkileri ZAMANLA ilerler (tanışma emek ister) */
    _npcRelTick() {
      const I = K.industry.ensure();
      const day = K.state.day;
      const keys = Object.keys(I.npcRel || {});
      if (!keys.length) return;
      let moved = 0;
      for (let i = 0; i < keys.length && moved < 2; i++) {
        const k = keys[i];
        const r = I.npcRel[k];
        if (!r || r.st >= 7) continue;
        const parts = k.split("|");
        const aId = parts[0], bId = parts[1];
        if (!K.artistById(aId) || !K.artistById(bId)) continue;
        if (day - (r.last || 0) < 3) continue;
        const p = r.st <= 2 ? 0.012 : 0.006;
        if (hChance("npcst|" + k + "|" + day, p)) {
          K.industry.advanceNpcRel(aId, bId, 1, "time");
          moved++;
        }
      }
    },

    /* günlük: yayın sonrası dinlenme akışı söner, sanatçıya yazılır */
    decayReleaseStreams(a) {
      const s = K.state;
      const I = K.industry.ensure();
      if (!I.lastRelease) return;
      const lr = I.lastRelease[a.id];
      if (!lr) return;
      lr.daily = lr.daily * 0.93;
      lr.total = Math.round((lr.total || 0) + lr.daily);
      a.streams = Math.round((a.streams || 0) + lr.daily);
      /* v10.61 — yayın akışı da 28 günlük pencereye yazılır (monthly buradan) */
      K.industry.npcStreamPush(a, lr.daily);
      if (s.day - lr.day > 60 || lr.daily < 200) delete I.lastRelease[a.id];
    },

    /* günlük: büyük NPC hit'leri gündeme düşer (deterministik) */
    _npcTrends() {
      const s = K.state;
      const I = K.industry.ensure();
      if (!s.trends || !I.lastRelease) return;
      const recent = Object.keys(I.lastRelease)
        .map(id => ({ id: id, lr: I.lastRelease[id] }))
        .filter(x => x.lr.result === "hit" && (s.day - x.lr.day) <= 3)
        .sort((x, y) => y.lr.initial - x.lr.initial)
        .slice(0, 2);
      recent.forEach(x => {
        const tag = "#" + String(x.lr.title || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 20);
        if (!tag || tag.length < 5) return;
        if (s.trends.some(t => t.tag === tag)) return;
        s.trends.unshift({ tag: tag, count: Math.round(x.lr.initial * 12), npc: true });
      });
      s.trends = s.trends.slice(0, 8);
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
        momentum: 0, arc: null, arcDay: 0,
        lastReleaseInfo: null, releaseLog: []
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
      } else if (ev === "release_info") {
        /* v10.60 — yayın detayı (stream + sonuç + değişim). releases
           sayacını ARTIRMAZ; o işi adjustNpcRelease yapar. */
        c.streams = Math.round((c.streams || 0) + (data.streams || 0));
        c.lastReleaseInfo = {
          day: day, title: data.title || "", streams: data.streams || 0,
          result: data.result || "normal", tier: data.tier || data.result || "normal",
          monthly: data.monthly || 0,
          popularity: data.popularity || 0, featWith: data.featWith || null
        };
        c.releaseLog = c.releaseLog || [];
        c.releaseLog.unshift({
          day: day, title: data.title || "", streams: data.streams || 0,
          result: data.result || "normal", tier: data.tier || data.result || "normal",
          featWith: data.featWith || null
        });
        c.releaseLog = c.releaseLog.slice(0, 10);
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
      /* v10.61 — gerçek akıştan gelen aylık çöküş de "unutulma" sinyalidir */
      else if ((c.monthlyPeak || 0) > 0 && a.monthly < c.monthlyPeak * 0.6 && idle > 150) arc = "unutulan";
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
      /* v10.62.1 — sektör tarihine geçen ÖNEMLİ olaylar Gündem'in
         Müzik kategorisine de düşer (gerçek olaydan haber, spam değil). */
      const NEWSY = { hit: 1, viral: 1, label: 1, comeback: 1, feature: 1, release: 1, player_feature: 1, bond: 0, meet: 0 };
      if (NEWSY[kind] && K.news && K.news.injectMusic) {
        const hot = (kind === "viral" || kind === "hit" || kind === "comeback") ? 84 : 70;
        K.news.injectMusic(text, hot);
      }
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
       v10.62.1 — NPC GİZLİ KİŞİLİK KATMANI
       Her sanatçı için deterministik davranış özellikleri TÜRETİLİR
       (mevcut `a.traits` + id hash + tür). Yeni veri dosyası yok,
       state çoğaltma yok. Bu özellikler NPC KARARLARINI etkiler:
         selective   → daha az ortak iş yapar
         trendChaser → trend uyumundan daha çok kazanır
         experimental→ kalite varyansı yüksek (sürpriz hit/flop)
         competitive → gerilim/rekabete daha yatkın
         labelLoyal  → transfer teklifini daha çok reddeder
         social      → daha çok paylaşım/etkileşim
         riskTaker   → yüksek varyans, yüksek tavan
       ============================================================ */
    personality(a) {
      if (!a) return null;
      if (a._pers) return a._pers;
      const t = a.traits || {};
      const work = (t.work == null ? 5 : t.work) / 10;
      const ego = (t.ego == null ? 5 : t.ego) / 10;
      const open = (t.openness == null ? 5 : t.openness) / 10;
      const h = (s) => frac("pers|" + a.id + "|" + s);
      const P = {
        social:       0.30 + open * 0.50 + h("soc") * 0.30,
        aggressive:   0.15 + ego * 0.50 + h("agg") * 0.30,
        workaholic:   0.25 + work * 0.60 + h("wk") * 0.25,
        independent:  0.20 + h("ind") * 0.60 + (a.labelId ? 0 : 0.15),
        labelLoyal:   0.25 + h("loy") * 0.50 + (a.labelId ? 0.15 : 0),
        selective:    0.20 + h("sel") * 0.60,
        trendChaser:  0.20 + h("tr") * 0.65,
        experimental: 0.20 + h("exp") * 0.60,
        competitive:  0.20 + ego * 0.40 + h("cmp") * 0.40,
        mediaFriendly:0.20 + open * 0.40 + h("med") * 0.40,
        riskTaker:    0.20 + h("rsk") * 0.70
      };
      Object.keys(P).forEach(k => { P[k] = U.clamp(P[k], 0, 1); });
      a._pers = P;
      return P;
    },

    /* ============================================================
       v10.62.1 — OYUNCU OLAY YANKISI (tek veriyolu)
       Oyuncunun önemli bir müzik olayı (viral / hit / flop / release /
       chart peak) TEK bir kapıdan geçer ve zinciri tetikler:
         sosyal (X/IG/YT/TikTok) → stream çarpanı → aylık dinleyici
         → chart → NPC tepkisi → medya/haber → FT & label & konser ilgisi
       Yeni paralel state YARATMAZ: mevcut `song.boosts`, `s.feed`,
       `s.trends`, `s.agenda`, `s.notifications`, `p.*` alanlarını kullanır.
       ============================================================ */
    _PLATFORM_MULT: {
      viral:    { x: 0.14, instagram: 0.10, youtube: 0.16, spotify: 0.20, apple: 0.08, days: 12 },
      hit:      { x: 0.08, instagram: 0.06, youtube: 0.10, spotify: 0.12, apple: 0.05, days: 9 },
      flop:     { x: -0.02, instagram: -0.01, youtube: -0.02, spotify: -0.03, apple: -0.01, days: 7 },
      release:  { x: 0.03, instagram: 0.04, youtube: 0.05, spotify: 0.05, apple: 0.02, days: 5 }
    },

    /* oyuncunun "sıcak" (gündem) penceresi 0..1 — teklif olasılıklarını besler */
    playerBuzz() {
      const p = K.state && K.state.player;
      if (!p || !p._buzzUntil) return 0;
      const left = p._buzzUntil - K.state.day;
      if (left <= 0) return 0;
      return U.clamp(left / 21, 0, 1);
    },

    onPlayerEvent(kind, payload) {
      const s = K.state, p = s.player;
      if (!p) return null;
      const song = payload && payload.song;
      const M = K.industry._PLATFORM_MULT[kind] || K.industry._PLATFORM_MULT.release;
      const I = K.industry.ensure();

      /* 1) PLATFORM ÇARPANLARI: akış `accrueStreams` içindeki mevcut
         `song.boosts` sözlüğünden geçer (yeni sistem değil). */
      if (song) {
        song.boosts = song.boosts || {};
        Object.keys(M).forEach(k => {
          if (k === "days") return;
          song.boosts[kind + "_" + k] = (song.boosts[kind + "_" + k] || 0) + M[k];
        });
      }

      /* 2) TAKİPÇİ/TALEP BUMPI: platformlara gerçekçi oranlarda yansır */
      const pop = Math.max(5, p.popularity || 0);
      const base = Math.round(pop * 140 + (p.monthly || 0) * 0.02);
      const mul = kind === "viral" ? 3 : kind === "hit" ? 2 : kind === "flop" ? -0.5 : 1;
      p.ig = Math.max(0, Math.round((p.ig || 0) + base * 0.5 * mul));
      p.tiktok = Math.max(0, Math.round((p.tiktok || 0) + base * 0.7 * mul));
      p.x = Math.max(0, Math.round((p.x || 0) + base * 0.3 * mul));
      p.ytSubs = Math.max(0, Math.round((p.ytSubs || 0) + base * 0.25 * mul));

      /* 3) GÜNDEM + TREND (mevcut s.trends / s.agenda) */
      if (song && (kind === "viral" || kind === "hit")) {
        const tag = "#" + String(song.title || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 20);
        if (tag.length >= 5) {
          s.trends = s.trends || [];
          if (!s.trends.some(t => t.tag === tag)) {
            s.trends.unshift({ tag: tag, count: Math.round(base * 8), mine: true });
            s.trends = s.trends.slice(0, 8);
          }
        }
      }

      /* 4) MEDYA/HABER: gerçek olaydan türeyen tek satırlık haber */
      const name = p.stageName || "Oyuncu";
      const ttl = song ? `"${song.title}"` : "yeni işi";
      let news = null;
      if (kind === "viral") news = `${name}'in ${ttl} kısa videolarda viral oldu`;
      else if (kind === "hit") news = `${name}'in ${ttl} listelerde yükseliyor`;
      else if (kind === "flop") news = `${name}'in ${ttl} beklenen ilgiyi görmedi`;
      else if (kind === "release") news = `${name} ${ttl} adlı yeni işini yayınladı`;
      else if (kind === "chart_peak") news = `${name} ${ttl} ile chart'ta zirveye yaklaşıyor`;
      if (news) {
        K.industry._event(kind === "flop" ? "flop" : kind === "viral" ? "viral" : "hit",
          `${kind === "flop" ? "📉" : kind === "viral" ? "⚡" : "🎵"} ${news}`, { artistId: "player", player: true });
        K.industry._industryHistory(kind, news, ["player"]);
        if (K.news && K.news.injectMusic) K.news.injectMusic(news);
        if (kind === "viral" || kind === "hit") K.industry._notifyImportant("📰 Medya", news, "ok");
      }

      /* 5) DİĞER SANATÇILARIN TEPKİSİ: viral/hit'te erişilebilir isimler
         gerçekten sosyal tepki verir (mevcut social.reactToSong kullanılır). */
      if (song && K.social && K.social.reactToSong && (kind === "viral" || kind === "hit")) {
        const n = kind === "viral" ? 3 : 2;
        /* viral çok daha geniş bir çevreye ulaşır (erişim bonusu) */
        const reach = kind === "viral" ? 45 : 22;
        for (let i = 0; i < n; i++) {
          try { K.social.reactToSong(song, { reach: reach }); } catch (e) {}
        }
      }

      /* 6) "SICAK" PENCERESİ: FT/label/konser ilgisi buradan beslenir */
      const days = kind === "viral" ? 21 : kind === "hit" ? 14 : kind === "flop" ? 0 : 7;
      if (days > 0) p._buzzUntil = Math.max(p._buzzUntil || 0, s.day + days);

      if (K.save) K.save();
      return { kind: kind, news: news };
    },

    /* ============================================================
       v10.62.1 — OYUNCU RELEASE SONUCU (hit/flop) — tek sefer
       Yayının ilk günlerindeki GERÇEK günlük akış, başlangıç
       beklentisine göre ölçülür; eşiği aşarsa hit, altında kalırsa
       flop yankısı üretilir. Aynı şarkı için bir kez çalışır.
       ============================================================ */
    playerOutcomes() {
      const s = K.state, p = s.player;
      if (!p || !p.songs) return;
      p.songs.forEach(song => {
        if (song._outcome || !song.publishedDay || song.takenDown) return;
        const age = s.day - song.publishedDay;
        if (age < 12) return;
        song._peakDaily = Math.max(song._peakDaily || 0, song.lastDaily || 0);
        if (!song._initDaily) {
          song._initDaily = (K.game && K.game.initialDaily) ? K.game.initialDaily(song) : (song._peakDaily || 1);
        }
        const ratio = (song._initDaily > 0) ? song._peakDaily / song._initDaily : 1;
        if (song.viral || ratio >= 1.6) {
          song._outcome = "hit";
          K.industry.onPlayerEvent("hit", { song: song });
        } else if (ratio < 0.55) {
          song._outcome = "flop";
          K.industry.onPlayerEvent("flop", { song: song });
        } else if (age >= 30) {
          song._outcome = "normal";
        }
      });
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
      /* v10.62.1 — TÜR UYUMU: şirketin odak türü oyuncunun türüne
         uyuyorsa önce onlar değerlendirilir (scout mantığı). */
      const genre = (p.genre || (p.songs && p.songs[0] && p.songs[0].genre) || "");
      if (genre && K.labelSim && K.labelSim.profile) {
        const fit = pool.filter(l => {
          const pr = K.labelSim.profile(l.id);
          return pr && (pr.genres.indexOf("*") >= 0 || pr.genres.indexOf(genre) >= 0);
        });
        if (fit.length) pool = fit;
      }
      const pick = hPick("lbloffer|" + K.state.day + "|" + Math.round(pop), pool);
      return pick ? pick.id : null;
    },

    _maybeLabelOffer() {
      const s = K.state, p = s.player;
      const I = K.industry.ensure();
      if (s.label || p.labelId) return;
      /* v10.62.1 — şirket ilgisi artık yalnızca "momentum" değil:
         gerçek başarı (gündem sıcaklığı + chart + akış) de tetikler. */
      const buzz = K.industry.playerBuzz();
      const chartTop = (s.chart || []).some(e => e.mine && e.rank <= 15);
      const hot = (I.momentum || 0) >= 0.6 || buzz >= 0.5 || chartTop;
      if (!hot) return;
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

      /* v10.62 — feature yalnızca ARKADAŞ/İŞ ilişkisine ulaşmış
         (aşama ≥5) çiftler arasında olur. Tanışmayan iki sanatçı
         ortak iş yapamaz. */
      if (fired < MAX && hChance("ind|feat|" + day, 0.16)) {
        const pair = K.industry._pickPair("ind|feat|" + day, "friend", 5);
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
      /* v10.62.1 — oyuncu yayınlarının gerçek sonucu (hit/flop yankısı) */
      K.industry.playerOutcomes();

      /* 6) v10.59 — hafızanın ilişkiye yavaş etkisi + geçmiş ortakların dönüşü */
      K.industry.memoryDriftTick();
      K.industry._maybeReunite();
      K.industry._updateArcs();
      /* v10.60 — büyük NPC hit'leri gündeme düşer */
      K.industry._npcTrends();
      /* v10.62 — ilişkiler zamanla olgunlaşır + aktif viraller akış üretir */
      K.industry._npcRelTick();
      K.industry._viralTick();

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
