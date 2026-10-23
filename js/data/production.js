/* ============================================================
   KARMA — data/production.js   (v10.44)
   PRODÜKSİYON SÜRECİ: kayıt oturumu · mix · master · revizyon

   v10.44'te değişen zihniyet
   --------------------------
   Eskiden üretim sadece üç kaydırıcıydı (beat/vokal/mix kalitesi).
   Gerçekte bir şarkı şöyle çıkar:

     1) KAYIT OTURUMU — beat seçildikten sonra vokali nasıl kaydettin?
        Tek alış mı, katmanlı mı, mühendisli stüdyo oturumu mu?
     2) MIX           — kendin mi mixledin, stüdyoda mı, usta mı?
     3) MASTER        — master yok / dijital / analog?
     4) REVİZYON      — mix raporundaki sorunları kabul mü ettin,
                        yoksa para + zaman verip revize mi istedin?

   Her adımın maliyeti, gecikmesi ve kalite etkisi vardır. Revizyon
   azalan verimle çalışır: ilk revizyon çok, sonrakiler az iyileştirir.
   ============================================================ */
(function (K) {
  "use strict";
  /* util.js bu dosyadan sonra yüklenir; K.util'a çağrı anında erişilir. */
  const clamp = (v, a, b) => K.util.clamp(v, a, b);

  const SESSIONS = [
    { id: "tek",         name: "Tek alış",        icon: "🎤", cost: 0,     days: 0, vocal: 0,  risk: 0.20, desc: "Hızlı ve ucuz; ham performans, düzeltme yok." },
    { id: "katman",      name: "Katmanlı kayıt",  icon: "🎚️", cost: 6000,  days: 2, vocal: 8,  risk: 0.08, desc: "Üst üste alımlar + comp; daha temiz vokal." },
    { id: "profesyonel", name: "Stüdyo oturumu",  icon: "🏛️", cost: 18000, days: 5, vocal: 16, risk: 0.02, desc: "Mühendis + kabin; en iyi performans, en pahalı." }
  ];
  const MIXES = [
    { id: "kendin", name: "Kendi mix'in", icon: "🎛️", cost: 0,     days: 0, mix: 0,  risk: 0.18, desc: "Evde mix; bütçe dostu ama dengesiz olabilir." },
    { id: "studyo", name: "Stüdyo mix",   icon: "🎚️", cost: 8000,  days: 3, mix: 10, risk: 0.06, desc: "Profesyonel mix; dengeli ve temiz." },
    { id: "usta",   name: "Usta mix",     icon: "🏆", cost: 22000, days: 6, mix: 18, risk: 0.01, desc: "Zirve mix mühendisi; pahalı ama kusursuz." }
  ];
  const MASTERS = [
    { id: "yok",     name: "Master yok",     icon: "🚫", cost: 0,    days: 0, loud: -4, risk: 0.00, desc: "Mağaza normalizasyonuna bırakılır; ses kısık kalır." },
    { id: "dijital", name: "Dijital master", icon: "💾", cost: 1500, days: 1, loud: 0,  risk: 0.03, desc: "Online/otomatik mastering; hızlı ve yeterli." },
    { id: "analog",  name: "Analog master",  icon: "📼", cost: 9000, days: 4, loud: 3,  risk: 0.00, desc: "Analog zincir; sıcak ve yüksek ses." }
  ];

  const ISSUES = [
    { id: "vokal-geri",  text: "Vokal mix'te geride kalıyor",     fix: 0.5 },
    { id: "bas-boguk",   text: "Bas boğuk, alt frekanslar kirli", fix: 0.5 },
    { id: "nakarat-duz", text: "Nakarat yeterince yükselmiyor",   fix: 0.6 },
    { id: "tiz-sert",    text: "Tizler sert, kulağı yoruyor",     fix: 0.4 },
    { id: "ritim-kayma", text: "Ritimde küçük kaymalar var",      fix: 0.5 },
    { id: "gurultu",     text: "Arka planda dip gürültüsü",       fix: 0.3 }
  ];

  const MAX_REVISIONS = 2;
  const REVISION_COST = 5000;
  const REVISION_DAYS = 2;

  const byId = (arr, id) => arr.find(x => x.id === id);

  K.PROD = { SESSIONS, MIXES, MASTERS, ISSUES, MAX_REVISIONS, REVISION_COST, REVISION_DAYS };

  K.production = {
    sessions: SESSIONS, mixes: MIXES, masters: MASTERS,
    sessionById: (id) => byId(SESSIONS, id) || SESSIONS[0],
    mixById: (id) => byId(MIXES, id) || MIXES[0],
    masterById: (id) => byId(MASTERS, id) || MASTERS[0],

    defaultPlan() {
      return { session: "katman", mix: "studyo", master: "dijital", revisions: 0, accepted: false };
    },
    normalize(p) {
      p = p || {};
      return {
        session: byId(SESSIONS, p.session) ? p.session : "katman",
        mix: byId(MIXES, p.mix) ? p.mix : "studyo",
        master: byId(MASTERS, p.master) ? p.master : "dijital",
        revisions: clamp(Math.round(p.revisions || 0), 0, MAX_REVISIONS),
        accepted: !!p.accepted
      };
    },

    cost(p) {
      p = K.production.normalize(p);
      return K.production.sessionById(p.session).cost +
        K.production.mixById(p.mix).cost +
        K.production.masterById(p.master).cost +
        p.revisions * REVISION_COST;
    },
    days(p) {
      p = K.production.normalize(p);
      return K.production.sessionById(p.session).days +
        K.production.mixById(p.mix).days +
        K.production.masterById(p.master).days +
        p.revisions * REVISION_DAYS;
    },
    revisionCost() { return REVISION_COST; },
    maxRevisions() { return MAX_REVISIONS; },

    /* revizyon kazancı: azalan verim (0→0, 1→5, 2→8) */
    revisionBonus(n) {
      n = clamp(Math.round(n || 0), 0, MAX_REVISIONS);
      return n <= 0 ? 0 : n === 1 ? 5 : 8;
    },

    /* ham mix notları: mix riski yükseldikçe daha çok sorun.
       Deterministik (aynı tohum → aynı notlar). */
    issues(p, seed) {
      p = K.production.normalize(p);
      const m = K.production.mixById(p.mix);
      let n = m.risk >= 0.15 ? 3 : m.risk >= 0.05 ? 2 : 1;
      n = Math.max(0, n - (p.revisions > 0 ? 1 : 0));   // revizyon bir sorunu kapatır
      const str = String(seed || "karma");
      let x = 7;
      for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) % 2147483647;
      const out = [], seen = new Set();
      for (let i = 0; i < n + 2 && out.length < n; i++) {
        x = (x * 1103515245 + 12345) % 2147483648;
        const it = ISSUES[Math.abs(x) % ISSUES.length];
        if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
      }
      return out;
    },

    /* plan → kalite kazançları + puan */
    resolve(p) {
      p = K.production.normalize(p);
      const se = K.production.sessionById(p.session);
      const mi = K.production.mixById(p.mix);
      const ma = K.production.masterById(p.master);
      const rb = K.production.revisionBonus(p.revisions);
      const vocalQ = se.vocal + Math.round(rb * 0.4);
      const mixQ = mi.mix + ma.loud + rb;
      const score = clamp(
        50 + se.vocal * 1.2 + mi.mix * 1.1 + ma.loud * 1.5 + rb * 2 +
        (p.accepted ? 2 : 0), 0, 100);
      return {
        vocalQ: vocalQ, mixQ: mixQ, score: Math.round(score),
        cost: K.production.cost(p), days: K.production.days(p),
        labels: { session: se.name, mix: mi.name, master: ma.name }
      };
    }
  };
})(window.K);

/* ============================================================
   v10.66 — STÜDYO KOŞULLARI (oda kademesi · mühendis · seans süresi)
   Kayıt kaynağı (dosya) ile KARIŞTIRILMAMALI: kaynak dosyanın kalitesi,
   koşullar ise kaydın yapıldığı yer/kişi/süredir. Üçü birlikte çalışır.
   ============================================================ */
(function (K) {
  "use strict";

  const ROOMS = [
    { id: "ev",      name: "Ev stüdyosu",      icon: "🏠", qAdd: 0,  fee: 0,     fatigue: 0, minRep: 0,
      desc: "Kendi odan, tek mikrofon. Ucuz ama akustik yok." },
    { id: "yaripro", name: "Yarı-profesyonel", icon: "🎛️", qAdd: 5,  fee: 6000,  fatigue: 3, minRep: 10,
      desc: "Kiralık kabin + temel akustik. Dengeyi burada kurarsın." },
    { id: "pro",     name: "Profesyonel",      icon: "🏛️", qAdd: 11, fee: 18000, fatigue: 6, minRep: 35,
      desc: "Gerçek stüdyo, akustik oda, kiralık ekipman. En temiz kayıt." }
  ];

  const ENGINEERS = [
    { id: "yok",       name: "Kendin",              icon: "🎚️", qAdd: 0,  fee: 0,     risk: 0.10, minRep: 0,
      desc: "Kendi kaydın: bedava, ama hataları sen düzeltirsin." },
    { id: "genc",      name: "Genç mühendis",       icon: "🧑‍🔧", qAdd: 4,  fee: 3500,  risk: 0.04, minRep: 0,
      desc: "Ucuz ve hevesli; iyi performans yakalarsa iş görür." },
    { id: "deneyimli", name: "Deneyimli mühendis",  icon: "🎧", qAdd: 9,  fee: 9000,  risk: 0.02, minRep: 20,
      desc: "Oturumu yönetir, en iyi alımı çıkarır." },
    { id: "star",      name: "Yıldız mühendis",     icon: "🏆", qAdd: 14, fee: 22000, risk: 0.01, minRep: 50,
      desc: "Sektörün zirvesi; her saat pahalı ama sonuç referans olur." }
  ];

  /* seans süresi: azalan verim — 2s temel, 4s +3, 6s +5, 8s +6 */
  const HOURS = [
    { id: 2, name: "2 saat", qAdd: 0, fee: 0,    fatigue: 3,  desc: "Hızlı seans; acele kayıt." },
    { id: 4, name: "4 saat", qAdd: 3, fee: 2500, fatigue: 7,  desc: "Standart seans; birkaç alım denenir." },
    { id: 6, name: "6 saat", qAdd: 5, fee: 5000, fatigue: 12, desc: "Uzun seans; comp ve düzeltmeye zaman var." },
    { id: 8, name: "8 saat", qAdd: 6, fee: 8000, fatigue: 18, desc: "Tam gün; en iyi alım, en yüksek yorgunluk." }
  ];

  const pick = (arr, id) => arr.find(x => String(x.id) === String(id)) || arr[0];

  K.STUDIO_ROOMS = ROOMS;
  K.STUDIO_ENGINEERS = ENGINEERS;
  K.STUDIO_HOURS = HOURS;

  K.studioSetup = {
    rooms: ROOMS, engineers: ENGINEERS, hours: HOURS,
    room: (id) => pick(ROOMS, id),
    engineer: (id) => pick(ENGINEERS, id),
    hoursOf: (id) => pick(HOURS, id),

    /* kapı: itibar eşiği tutmuyorsa o seçenek KİLİTLİ (en alt kademeye düşer) */
    locked: (kind, id, reputation) => {
      const rep = Number(reputation) || 0;
      const item = kind === "room" ? pick(ROOMS, id) : pick(ENGINEERS, id);
      return (item.minRep || 0) > rep;
    },

    /* tüm koşulların toplam etkisi — tek kaynak */
    plan(opts) {
      opts = opts || {};
      const rep = opts.reputation != null ? Number(opts.reputation) : ((K.state.player || {}).reputation || 0);
      const room0 = pick(ROOMS, opts.roomId);
      const eng0 = pick(ENGINEERS, opts.engineerId);
      const hrs = pick(HOURS, opts.hours);
      const room = (room0.minRep || 0) > rep ? ROOMS[0] : room0;
      const eng = (eng0.minRep || 0) > rep ? ENGINEERS[0] : eng0;
      const qAdd = (room.qAdd || 0) + (eng.qAdd || 0) + (hrs.qAdd || 0);
      const cost = (room.fee || 0) + (eng.fee || 0) + (hrs.fee || 0);
      const fatigue = (room.fatigue || 0) + (hrs.fatigue || 0);
      return {
        room, engineer: eng, hours: hrs,
        qAdd, cost, fatigue,
        risk: eng.risk || 0,
        roomLocked: room0 !== room,
        engineerLocked: eng0 !== eng,
        label: room.name + " · " + eng.name + " · " + hrs.name
      };
    }
  };
})(window.K = window.K || {});
