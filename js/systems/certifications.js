/* ============================================================
   KARMA — systems/certifications.js   (v10.23)
   ALTIN · PLATİN · ELMAS PLAK

   Neden gerekli?
   --------------
   Oyunda uzun vadeli bir "skor tahtası" yoktu: şarkı milyonlarca
   dinlenme toplasa bile bunun KALICI bir karşılığı olmuyordu.
   Gerçek endüstride plak; itibar, katalog değeri ve müzakere gücüdür.

   Nasıl çalışır?
   --------------
     · Şarkı kümülatif dinlenmesi eşiği aştığında plak verilir.
     · Plak KALICI iz bırakır: şarkının günlük dinlenmesine çarpan
       (katalog klasiği etkisi) + itibar + ödül ağırlığı.
     · Albümler de toplam dinlenmeden plak alır.
     · Her plak bir "tören anı" bildirimi üretir.

   EŞİKLER HAKKINDA (dürüst not)
   ----------------------------
   RIAA sertifikaları SATIŞ BİRİMİ üzerinden verilir ve 1 birim =
   1.500 dinlenme sayılır:
       Altın    =   500.000 birim ≈   750 milyon dinlenme
       Platin   = 1.000.000 birim ≈ 1,5 milyar dinlenme
       Elmas    = 10.000.000 birim ≈ 15 milyar dinlenme
   Oyunun eşikleri (1M / 5M / 25M) RIAA'nın BİREBİR kopyası DEĞİLDİR;
   RIAA MANTIĞINDAN esinlenip Türkiye pazarı ve oyun ölçeğine
   uyarlanmıştır. Türkiye'de yayın çağı için resmî bir akış sertifikası
   olmadığından (MÜYAP tarihsel olarak fiziksel satış sayardı) daha
   küçük, oyuncunun kariyeri boyunca ulaşabileceği eşikler seçildi.
   Yani buradaki "Platin", global RIAA platininden çok daha kolaydır —
   bilinçli bir tasarım kararıdır, hata değildir.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const TIERS = [
    { id: "gold",     name: "Altın Plak",  short: "ALTIN",   emoji: "🥇",
      streams: 1_000_000,  mult: 0.06, rep: 2.0,  award: 0.05, color: "#ffcb5c" },
    { id: "platinum", name: "Platin Plak", short: "PLATİN",  emoji: "💿",
      streams: 5_000_000,  mult: 0.14, rep: 4.0,  award: 0.12, color: "#d8e3ef" },
    { id: "diamond",  name: "Elmas Plak",  short: "ELMAS",   emoji: "💎",
      streams: 25_000_000, mult: 0.30, rep: 8.0,  award: 0.22, color: "#6ec3ff" }
  ];

  function tier(id) { return TIERS.find(t => t.id === id) || null; }
  function tierIndex(id) { return TIERS.findIndex(t => t.id === id); }

  K.certifications = {
    TIERS, tier, tierIndex,

    /* oyuncunun tüm plakları */
    list() {
      const p = K.state && K.state.player;
      return (p && p.plaques) ? p.plaques : [];
    },

    count(tierId) {
      return K.certifications.list().filter(pl => pl.tier === tierId).length;
    },

    /* şarkının hak ettiği EN YÜKSEK kademe (henüz verilmemişse farkı döndürür) */
    earnedFor(streams) {
      let out = null;
      TIERS.forEach(t => { if ((streams || 0) >= t.streams) out = t; });
      return out;
    },

    /* verilmemiş ama hak edilmiş kademeler */
    pendingFor(song) {
      const have = {};
      ((song && song.certifications) || []).forEach(c => { have[c] = true; });
      return TIERS.filter(t => (song.streams || 0) >= t.streams && !have[t.id]);
    },

    /* ---------------- ödül ver ---------------- */
    award(kind, obj, t) {
      const s = K.state, p = s.player;
      p.plaques = p.plaques || [];
      obj.certifications = obj.certifications || [];
      obj.certifications.push(t.id);

      /* kalıcı iz: katalog klasiği etkisi (günlük dinlenmeye çarpan) */
      if (kind === "song") {
        obj.dailyStreams = Math.max(5, (obj.dailyStreams || 5) * (1 + t.mult));
        obj.plaqueMult = +(((obj.plaqueMult || 1) * (1 + t.mult))).toFixed(3);
      }
      p.plaqueMult = +(((p.plaqueMult || 1) + t.mult * 0.35).toFixed(3));
      p.plaqueAwardWeight = +(((p.plaqueAwardWeight || 0) + t.award).toFixed(3));
      p.reputation = U.clamp((p.reputation || 0) + t.rep, 0, 100);

      const rec = {
        id: U.uid("plq"), kind, tier: t.id, tierName: t.name,
        title: obj.title, day: s.day, art: obj.art || null, coverSeed: obj.coverSeed || obj.id || obj.title
      };
      p.plaques.unshift(rec);
      if (p.plaques.length > 120) p.plaques = p.plaques.slice(0, 120);

      s.notifications = (s.notifications || []).concat([{
        title: t.emoji + " " + t.name + "!",
        msg: `"${obj.title}" ${U.fmt(t.streams)}+ dinlenmeye ulaştı — plak duvara girdi.`,
        kind: "ok", day: s.day
      }]).slice(-60);

      K.toast(t.emoji + " " + t.name,
        `"${obj.title}" · ${U.fmt(obj.streams || 0)} dinlenme · itibar +${t.rep} · kalıcı çarpan ×${(1 + t.mult).toFixed(2)}`, "ok");
      return rec;
    },

    /* ---------------- günlük denetim ---------------- */
    tick() {
      const s = K.state, p = s.player;
      if (!p) return;

      /* şarkılar */
      (p.songs || []).forEach(song => {
        const pend = K.certifications.pendingFor(song);
        pend.forEach(t => K.certifications.award("song", song, t));
      });

      /* albümler */
      (p.albums || []).forEach(al => {
        const have = {};
        (al.certifications || []).forEach(c => { have[c] = true; });
        TIERS.forEach(t => {
          const total = al.streams || 0;
          if (total >= t.streams && !have[t.id]) K.certifications.award("album", al, t);
        });
      });
    },

    /* sıradaki plağa ne kadar kaldı (UI için) */
    progress(streams) {
      const s0 = streams || 0;
      for (const t of TIERS) {
        if (s0 < t.streams) return { next: t, pct: Math.round((s0 / t.streams) * 100), remaining: t.streams - s0 };
      }
      return { next: null, pct: 100, remaining: 0 };
    },

    summary() {
      const p = K.state.player || {};
      const plaques = K.certifications.list();
      return {
        total: plaques.length,
        gold: K.certifications.count("gold"),
        platinum: K.certifications.count("platinum"),
        diamond: K.certifications.count("diamond"),
        awardWeight: +(p.plaqueAwardWeight || 0).toFixed(2),
        recently: plaques.slice(0, 5)
      };
    }
  };
})(window.K);
