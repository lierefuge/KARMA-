/* ============================================================
   KARMA — systems/ai.js
   AI ÇAĞI (günümüz gerçekliği)
   • AI cover'lar viral olur (görünürlük + ama imaj riski)
   • AI vokal modelleri sesini taklit eder (dinlenme kaybı)
   • AI ghostwriter iddiaları itibarı yorar
   • AI üretim araçları trend olur (popülerlik)
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.ai = {

    /* AI konusunda kamuoyu duruşu: imaj + itibar */
    stanceLabel() {
      const p = K.state.player;
      const im = p.image || 50;
      if (im >= 65) return "insan odaklı, saygın";
      if (im >= 45) return "temkinli / kararsız";
      return "AI'ya yakın, tartışmalı";
    },

    tick() {
      const s = K.state, p = s.player;
      if (!(p.songs || []).length) return;
      if (!U.chance(0.016 + (p.popularity || 0) / 2200)) return;
      const roll = U.rand();
      if (roll < 0.34) K.ai.aiCover(p);
      else if (roll < 0.62) K.ai.vocalClone(p);
      else if (roll < 0.82) K.ai.ghostClaim(p);
      else K.ai.aiHype(p);
    },

    _notify(title, msg, kind) {
      const s = K.state;
      s.notifications = (s.notifications || []).concat([{ title, msg, kind, day: s.day }]).slice(-60);
    },

    aiCover(p) {
      const pool = (p.songs || []).filter(x => !x.masterSold);
      const song = U.pick(pool.length ? pool : p.songs);
      p.popularity = U.clamp((p.popularity || 0) + 0.5, 0, 99);
      p.image = U.clamp((p.image || 50) - 1.5, 0, 100);
      K.toast("🤖 AI cover", `"${song.title}" AI ile yeniden üretildi ve viral oldu.`, "warn");
      K.ai._notify("🤖 AI cover", `"${song.title}" AI cover'ı viral oldu: görünürlük arttı ama tartışma da.`, "warn");
    },

    vocalClone(p) {
      const song = U.pick(p.songs || []);
      if (!song) return;
      song.boosts = song.boosts || {};
      song.boosts.aiDip = (song.boosts.aiDip || 0) - 0.06;   // negatif çarpan
      p.image = U.clamp((p.image || 50) - 1, 0, 100);
      K.toast("🤖 AI vokal modeli", "Sesini klonlayan bir AI bazı dinleyicileri çalıyor.", "warn");
      K.ai._notify("🤖 AI vokal modeli", `"${song.title}" yerine AI klonu dinleniyor; kısa vadede dinlenme düşebilir.`, "warn");
    },

    ghostClaim(p) {
      p.reputation = Math.max(0, (p.reputation || 0) - 1.5);
      p.image = U.clamp((p.image || 50) - 3, 0, 100);
      K.toast("🤖 Ghostwriter iddiası", "Sözlerini AI'ya yazdırdığın iddia edildi.", "bad");
      K.ai._notify("🤖 Ghostwriter iddiası", "AI ghostwriter iddiası yayıldı; itibar ve imaj zedelendi.", "bad");
    },

    aiHype(p) {
      p.popularity = U.clamp((p.popularity || 0) + 0.35, 0, 99);
      K.toast("🤖 AI trendi", "AI üretim araçlarıyla yaptığın bir deneme gündem oldu.", "ok");
      K.ai._notify("🤖 AI trendi", "AI destekli denemen gündemde; merak uyandırdı.", "ok");
    }
  };
})(window.K = window.K || {});
