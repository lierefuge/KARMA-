/* ============================================================
   KARMA — systems/dms.js   (v10.30)
   YABANCI DM'LER: HAYRAN · DOLANDIRICI · GAZETECİ
   — engelle / yanıtla —

   Neden ayrı bir sistem?
   ----------------------
   Şimdiye kadar gelen kutusuna yalnızca SANATÇILAR ve mahalle çevresi
   yazıyordu. Gerçek bir sanatçının kutusuna ise üç farklı yabancı düşer:
     • 💜 Hayran       → duygusal, sadakat üretir; engellersen kaybedersin
     • ⚠️ Dolandırıcı  → sahte ödül/playlist; ödeme yaparsan paran gider
     • 📰 Gazeteci     → röportaj/alıntı; doğru yanıt itibar kazandırır
   Her mesaj SÜRELİDİR ve iki karar vardır: YANITLA (somut sonuç) veya
   ENGELLE (kalıcı; bazıları güvenli, bazıları itibar/ilişki maliyetli).
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- basit deterministik avatar (SVG data URI) ---------- */
  function avatar(seed, palette) {
    let h = 2166136261;
    const str = String(seed || "x");
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h = h >>> 0;
    const c1 = palette[(h >>> 3) % palette.length];
    const c2 = palette[(h >>> 7) % palette.length];
    const skin = ["#f2c9a4", "#e8b98d", "#d9a273", "#c98b5a", "#a8764f", "#8a5c3a"][(h >>> 11) % 6];
    const hair = ["#1b1b1f", "#2b2119", "#3d2a1a", "#111", "#4a3524", "#5c4632"][(h >>> 15) % 6];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="128" height="128" fill="url(#g)"/>` +
      `<path d="M22 128 Q24 92 64 88 Q104 92 106 128 Z" fill="${c2}"/>` +
      `<rect x="56" y="78" width="16" height="16" fill="${skin}"/>` +
      `<ellipse cx="64" cy="60" rx="30" ry="34" fill="${skin}"/>` +
      `<path d="M30 46 Q30 18 64 18 Q98 18 98 46 L98 70 Q92 54 88 46 Q64 34 40 46 Q36 54 30 70 Z" fill="${hair}"/>` +
      `<circle cx="52" cy="59" r="3.4" fill="#20202a"/><circle cx="76" cy="59" r="3.4" fill="#20202a"/>` +
      `<path d="M56 78 Q64 84 72 78" stroke="#8a3a3a" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- isim havuzları ---------- */
  const FIRST = {
    hayran: ["Zeynep", "Elif", "Merve", "Aslı", "Damla", "Büşra", "Gizem", "Ceren", "İdil", "Sude", "Yaren", "Buse"],
    dolandirici: ["Kenan", "Serkan", "Tolga", "Bora", "Cengiz", "Erhan", "Volkan", "Selim", "Murat", "Hakan"],
    gazeteci: ["Defne", "Yasemin", "Pelin", "Nazlı", "Işıl", "Arda", "Cem", "Tuna", "Deniz", "Ece"]
  };
  const LAST = ["Yıldız", "Demir", "Kaya", "Şahin", "Çelik", "Aydın", "Arslan", "Doğan", "Kılıç", "Polat"];
  const PALETTE = {
    hayran: ["#5a1f3a", "#e07fa0", "#c98b5a", "#1c1c24"],
    dolandirici: ["#3a2a1a", "#b08a5a", "#8a6a3a", "#1a1a1c"],
    gazeteci: ["#1f2f3f", "#6f9fc0", "#c98b5a", "#181820"]
  };
  const OUTFITS = ["Karma Kültür", "Ses Dergisi", "Ritim Gazetesi", "Bağımsız Müzik", "Sahne Notları", "Frekans Medya"];

  const ROLES = {
    hayran:     { label: "Hayran",      icon: "💜", badge: "fan" },
    dolandirici:{ label: "Şüpheli Hesap", icon: "⚠️", badge: "risk" },
    gazeteci:   { label: "Gazeteci",    icon: "📰", badge: "basın" }
  };

  function makeSender(role, i) {
    const seed = role + ":" + i;
    const first = FIRST[role][i % FIRST[role].length];
    const lastN = LAST[(i * 3 + 1) % LAST.length];
    const stageName = role === "hayran"
      ? (first + " " + U.pick(["Fan", "Army", "Hayran"].map(x => x + " Sayfası")))
      : (first + " " + lastN);
    return {
      id: "x_" + role + "_" + i,
      isContact: true,
      external: true,
      role,
      roleLabel: ROLES[role].label,
      roleIcon: ROLES[role].icon,
      badge: ROLES[role].badge,
      stageName,
      realName: first + " " + lastN,
      firstName: first,
      city: U.pick(["İstanbul", "Ankara", "İzmir", "Bursa", "Adana"]),
      semt: U.pick(["Çukur", "Gültepe", "Kartal", "Keçiören", "Buca"]),
      outlet: role === "gazeteci" ? OUTFITS[(i * 2) % OUTFITS.length] : null,
      genre: "pop",
      labelId: null,
      popularity: 0, monthly: 0, streams: 0,
      ig: 0, x: 0, tiktok: 0, ytSubs: 0,
      chartPeak: 999,
      traits: { openness: 5, loyalty: role === "hayran" ? 10 : 3, ego: 5, work: 5 },
      affinityStart: role === "hayran" ? 80 : 20,
      bio: role === "hayran" ? "Seni ilk günden beri dinliyor."
        : role === "dolandirici" ? "Kimliği doğrulanamadı."
        : "Müzik basınından.",
      themes: [],
      palette: PALETTE[role],
      photo: avatar(seed, PALETTE[role]),
      speech: "resmi"
    };
  }

  /* ============================================================
     MESAJ TÜRLERİ — her biri kendi seçenekleri ve sonuçları
     ============================================================ */
  const KINDS = {

    hayran: {
      expiresIn: 2,
      line: (s) => U.pick([
        `Merhaba! Ben senin en büyük hayranınım. Fan sayfası açtım, izin verir misin? 🥺`,
        `Selam! Doğum günüm bugün, bana bir selam verir misin? Tek isteğim bu.`,
        `Şarkıların hayatımı değiştirdi. Seninle tanışabilir miyim acaba?`
      ]),
      options: (s) => [
        { id: "warm", label: "Sıcak yanıt ver 💜",
          replyText: "Tabii ki, desteğin çok değerli. İyi ki varsın!",
          response: "AĞLIYORUM ŞU AN! Seni çok seviyorum, asla bırakmayacağım!",
          eff: { fans: 350, reputation: 0.4, loyalty: 3 } },
        { id: "short", label: "Kısa teşekkür et",
          replyText: "Sağ ol, destek için teşekkürler.",
          response: "Teşekkür ederim! Yine de en büyük hayranın benim.",
          eff: { fans: 80 } },
        { id: "block", label: "Engelle 🚫",
          replyText: "",
          response: "",
          eff: { fans: -250, reputation: -0.6 },
          block: true }
      ]
    },

    dolandirici: {
      expiresIn: 3,
      line: (s) => {
        const p = U.pick([
          { who: "Global Playlist Ajansı", hook: "şarkını 50 büyük listeye alacağız", fee: 4500 },
          { who: "Uluslararası Ödül Kurulu", hook: "ödül kazandınız", fee: 3200 },
          { who: "Dijital Büyüme Uzmanı", hook: "dinlenmenizi 10 katına çıkaracağız", fee: 6000 },
          { who: "Sahte Yapımcı", hook: "sizi yıldız yapacağım", fee: 7500 }
        ]);
        return `Merhaba, ben ${p.who}. Sana özel bir fırsat: ${p.hook}. ` +
          `Sadece ${U.money(p.fee)} işlem ücreti gerekiyor. IBAN göndereyim mi?`;
      },
      options: (s) => [
        { id: "pay", label: "Ücreti öde (riskli!) ⚠️",
          replyText: "Tamam, ödemeyi yapıyorum.",
          response: "Ödeme alındı... *hesap kapatıldı*",
          eff: { scam: true } },
        { id: "info", label: "Önce şirket bilgisi / sözleşme iste 🔍",
          replyText: "Önce resmi şirket bilgisi ve sözleşme gönderin.",
          response: "Eee... sistemde bir sorun var. *yanıt yok*",
          eff: { reputation: 0.4 } },
        { id: "block", label: "Engelle 🚫",
          replyText: "",
          response: "",
          eff: { reputation: 0.2 },
          block: true }
      ]
    },

    gazeteci: {
      expiresIn: 3,
      line: (s) => `Merhaba, ${U.pick(OUTFITS)} için bir dosya hazırlıyorum. ` +
        `Seninle kısa bir röportaj yapmak istiyorum. Sorularımı gönderebilir miyim?`,
      options: (s) => [
        { id: "accept", label: "Röportajı kabul et 🎤",
          replyText: "Memnuniyetle, sorularınızı gönderin.",
          response: "Harika, yarın yayında. Güzel bir yazı olacak.",
          eff: { reputation: 1.5, fame: 0.7, image: 1.5, stress: 5 } },
        { id: "quote", label: "Kısa bir alıntı ver",
          replyText: "Kısa bir alıntı verebilirim.",
          response: "Tamam, teşekkürler.",
          eff: { reputation: 0.6, fame: 0.3 } },
        { id: "block", label: "Engelle 🚫",
          replyText: "",
          response: "",
          eff: { reputation: -1.3, image: -1.5 },
          block: true }
      ]
    }
  };

  /* ---------------- sonuç uygulayıcı ---------------- */
  function applyEff(eff) {
    if (!eff) return [];
    const s = K.state, p = s.player;
    const notes = [];
    if (eff.fans) {
      const n = Math.round(eff.fans);
      p.ig = Math.max(0, Math.round((p.ig || 0) + n));
      p.tiktok = Math.max(0, Math.round((p.tiktok || 0) + n * 0.8));
      notes.push((n > 0 ? "+" : "") + U.compact(n) + " takipçi");
    }
    if (eff.reputation) { p.reputation = U.clamp((p.reputation || 0) + eff.reputation, 0, 100); }
    if (eff.image) { p.image = U.clamp((p.image == null ? 50 : p.image) + eff.image, 0, 100); }
    if (eff.stress) { p.stress = U.clamp((p.stress || 0) + eff.stress, 0, 100); }
    if (eff.fame) K.game.addFame(eff.fame);
    if (eff.loyalty) {
      p.superfans = Math.max(0, Math.round((p.superfans || 0) + eff.loyalty * 10));
    }
    if (eff.scam) {
      const loss = 3000 + U.randInt(0, 5000);
      s.balance = Math.max(0, (s.balance || 0) - loss);
      s.notifications = (s.notifications || []).concat([{
        title: "⚠️ Dolandırıldın", msg: "Ön ödemeyi yaptın ve karşı taraf kayboldu (" + U.money(loss) + ").",
        kind: "bad", day: s.day
      }]).slice(-60);
      notes.push("-" + U.money(loss));
    }
    return notes;
  }

  /* ============================================================
     SİSTEM
     ============================================================ */
  K.dms = {
    KINDS,

    _pool: null,
    ensure() {
      const s = K.state;
      s.player.extSenders = s.player.extSenders || [];
      if (!s.player.extSenders.length) {
        const out = [];
        ["hayran", "dolandirici", "gazeteci"].forEach(role => {
          for (let i = 0; i < 6; i++) out.push(makeSender(role, i));
        });
        s.player.extSenders = out;
      }
      s.player.dmBlocks = s.player.dmBlocks || {};
      return s.player.extSenders;
    },

    list() { K.dms.ensure(); return K.state.player.extSenders; },

    byId(id) {
      if (!id || String(id).indexOf("x_") !== 0) return null;
      const s = K.state;
      if (!s || !s.player || !s.player.extSenders) return null;
      return s.player.extSenders.find(x => x.id === id) || null;
    },

    isBlocked(id) {
      const s = K.state;
      return !!(s && s.player && s.player.dmBlocks && s.player.dmBlocks[id]);
    },

    blockedCount() {
      const b = (K.state.player && K.state.player.dmBlocks) || {};
      return Object.keys(b).length;
    },

    /* yeni yabancı DM isteği gönder */
    send(senderId, kindId) {
      const s = K.state;
      const sender = K.dms.byId(senderId);
      if (!sender) return null;
      const kind = kindId || sender.role;
      if (!KINDS[kind]) return null;
      if (K.dms.isBlocked(senderId)) return null;
      const req = K.dmRequest(senderId);
      req.external = true;
      req.senderId = senderId;
      req.kind = kind;
      req.day = s.day;
      req.expiresDay = s.day + (KINDS[kind].expiresIn || 3);
      req.handled = false;
      req.outcome = null;
      req.messages = [{
        id: U.uid("m"), from: "them", text: KINDS[kind].line(sender), day: s.day,
        type: "chat", kind: "text", reaction: null
      }];
      req.options = KINDS[kind].options(sender);
      s.notifications = (s.notifications || []).concat([{
        title: (ROLES[kind].icon) + " Yeni DM isteği",
        msg: sender.stageName + " sana mesaj gönderdi.", kind: kind === "dolandirici" ? "warn" : "ok", day: s.day
      }]).slice(-60);
      K.save();
      K.bus.emit("dm:new", req);
      return req;
    },

    /* yanıtla */
    reply(reqId, choiceId) {
      const s = K.state;
      const req = (s.dmRequests || {})[reqId];
      if (!req || !req.external || req.handled) return null;
      const opt = (req.options || []).find(o => o.id === choiceId);
      if (!opt) return null;
      if (opt.block) return K.dms.block(reqId);

      const notes = applyEff(opt.eff);
      req.handled = true;
      req.outcome = opt.id;
      if (opt.replyText) req.messages.push({ id: U.uid("m"), from: "me", text: opt.replyText, day: s.day, type: "chat", kind: "text", reaction: null });
      if (opt.response) req.messages.push({ id: U.uid("m"), from: "them", text: opt.response, day: s.day, type: "chat", kind: "text", reaction: null });
      K.toast((ROLES[req.kind] || {}).icon + " Yanıtlandı", notes.join(" · ") || "Mesaj gönderildi.", "ok");
      K.save(); K.refresh();
      K.bus.emit("dm:handled", req);
      return { notes, reply: opt.response };
    },

    /* engelle */
    block(reqId) {
      const s = K.state;
      const req = (s.dmRequests || {})[reqId];
      const sender = K.dms.byId(reqId) || (req && req.senderId ? K.dms.byId(req.senderId) : null);
      if (!sender) return null;
      s.player.dmBlocks = s.player.dmBlocks || {};
      if (s.player.dmBlocks[sender.id]) { K.toast("Zaten engelli", sender.stageName, "warn"); return null; }
      s.player.dmBlocks[sender.id] = s.day;
      const kind = (req && req.kind) || sender.role;
      const opt = ((req && req.options) || []).find(o => o.block);
      const notes = applyEff(opt && opt.eff);
      if (s.dmRequests) delete s.dmRequests[sender.id];
      const msg = kind === "dolandirici" ? "Şüpheli hesap engellendi — güvendesin."
        : kind === "gazeteci" ? "Gazeteci engellendi; basın ilişkilerin zedelendi."
        : "Hayran engellendi; bir kısmı seni bıraktı.";
      K.toast("🚫 Engellendi", msg + (notes.length ? " (" + notes.join(" · ") + ")" : ""),
        kind === "dolandirici" ? "ok" : "warn");
      K.save(); K.refresh();
      K.bus.emit("dm:blocked", sender.id);
      return { notes };
    },

    unblock(senderId) {
      const s = K.state;
      if (!s.player.dmBlocks || !s.player.dmBlocks[senderId]) return false;
      delete s.player.dmBlocks[senderId];
      K.toast("🔓 Engel kaldırıldı", (K.dms.byId(senderId) || {}).stageName || "", "ok");
      K.save(); K.refresh();
      return true;
    },

    blockedList() {
      const b = (K.state.player && K.state.player.dmBlocks) || {};
      return Object.keys(b).map(id => ({ id, day: b[id], sender: K.dms.byId(id) })).filter(x => x.sender);
    },

    /* ---------------- günlük tick ---------------- */
    tick() {
      const s = K.state, p = s.player;
      K.dms.ensure();
      s.dmRequests = s.dmRequests || {};

      /* süresi dolan yabancı istekler */
      Object.keys(s.dmRequests).forEach(id => {
        const req = s.dmRequests[id];
        if (!req || !req.external || req.handled) return;
        if (s.day < (req.expiresDay || 0)) return;
        if (req.kind === "hayran") {
          p.reputation = U.clamp((p.reputation || 0) - 0.3, 0, 100);
          p.ig = Math.max(0, Math.round((p.ig || 0) - 60));
        } else if (req.kind === "gazeteci") {
          p.reputation = U.clamp((p.reputation || 0) - 0.5, 0, 100);
        }
        delete s.dmRequests[id];
        K.toast("⌛ DM süresi doldu", "Bir yabancı mesajı yanıtsız kaldı.", "warn");
      });

      /* yeni yabancı DM olasılığı */
      const active = Object.keys(s.dmRequests).filter(id => s.dmRequests[id].external).length;
      if (active >= 2) return;
      const pop = p.popularity || 0;
      const chance = 0.10 + Math.min(0.18, pop / 220);
      if (!U.chance(chance)) return;

      const pool = K.dms.list().filter(x => !K.dms.isBlocked(x.id));
      const wantScam = U.chance(0.30);
      let cands = pool.filter(x => x.role === (wantScam ? "dolandirici" : "hayran"));
      if (!cands.length || (pop >= 12 && U.chance(0.3))) {
        const press = pool.filter(x => x.role === "gazeteci");
        if (press.length && pop >= 12) cands = press;
      }
      if (!cands.length) cands = pool;
      if (!cands.length) return;
      const sender = U.pick(cands);
      K.dms.send(sender.id, sender.role);
    }
  };
})(window.K);
