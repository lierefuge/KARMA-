/* ============================================================
   KARMA — systems/shortform.js
   KISA VİDEO KEŞİF HUNİSİ (TikTok / Reels / Shorts)
   • Bir şarkı "ses" (sound) olur. Kullanıcı videoları (UGC) çoğaldıkça
     şarkının dinlenmesi artar: snippet → tam şarkı → playlist → chart.
   • Trend penceresi KISA: momentum yükselir, zirve yapar, söner.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.shortform = {

    PLATFORMS: {
      tiktok: { name: "TikTok", icon: "🎵", eff: 1.25 },
      reels:  { name: "Reels",  icon: "◍",  eff: 1.05 },
      shorts: { name: "Shorts", icon: "▶️", eff: 0.95 }
    },

    sound(song) {
      if (!song) return null;
      if (!song.sound) song.sound = { videos: 0, momentum: 0, peak: 0, startedDay: null, lastGain: 0, platform: null, trend: false, ever: false };
      return song.sound;
    },

    /* şarkının "trend olma potansiyeli" (0.1 - 1.6) */
    potential(song) {
      const q = (song.quality || 50) / 100;
      const genre = K.genreById(song.genre);
      const viralB = song.viralBonus || 1;
      return U.clamp(0.25 + q * 0.7 + (genre.mass - 1) * 0.5 + (viralB - 1) * 0.6, 0.1, 1.6);
    },

    /* oyuncu kısa video (snippet) atar → ses trendini başlatır */
    startSnippet(songId, platform) {
      const song = K.platforms.findSong(songId);
      if (!song) return false;
      const pf = platform || "tiktok";
      const sn = K.shortform.sound(song);
      if (sn.startedDay) { K.toast("Ses zaten yayında", `"${song.title}" için kısa video başlatıldı.`, "warn"); return false; }
      const cost = 4000;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", U.money(cost) + " gerekiyor.", "bad"); return false; }
      K.economy.spend(cost, "snippet");
      const pot = K.shortform.potential(song);
      sn.startedDay = K.state.day;
      sn.platform = pf;
      sn.ever = true;
      sn.videos = Math.round(U.rand(30, 120) * K.shortform.PLATFORMS[pf].eff);
      sn.momentum = U.clamp(pot * U.rand(0.5, 1.1), 0.15, 1.5);
      if (K.social && K.social.createPost) {
        K.social.createPost("tiktok", `"${song.title}" için kısa video yayında 🎬 #fyp #kesfet`, song.id);
      }
      K.toast("🎬 Kısa video", `"${song.title}" sesi ${K.shortform.PLATFORMS[pf].name}'da. Trend tutarsa dinlenme patlar.`, "ok");
      K.save(); if (K.refresh) K.refresh();
      return true;
    },

    /* TikTok promosu yapılınca ses trendini besle (ekstra ücret yok) */
    onPromote(song) {
      if (!song) return;
      const sn = K.shortform.sound(song);
      const pot = K.shortform.potential(song);
      if (!sn.startedDay) {
        sn.startedDay = K.state.day; sn.platform = "tiktok"; sn.ever = true;
        sn.videos = Math.round(U.rand(40, 150));
      }
      sn.momentum = U.clamp(sn.momentum + pot * U.rand(0.3, 0.7), 0, 1.6);
    },

    /* günlük: tüm ses trendlerini ilerlet */
    tick() {
      const s = K.state;
      (s.player.songs || []).forEach(song => {
        const sn = K.shortform.sound(song);
        if (!sn.startedDay) return;
        const pot = K.shortform.potential(song);
        const age = s.day - sn.startedDay;
        if (age <= 2) sn.momentum += pot * U.rand(0.2, 0.6);           // ilk günler yükseliş
        else sn.momentum *= (0.85 + pot * 0.085) - (pot < 0.5 ? 0.03 : 0);
        /* v10 — SES ÖMRÜ: trend 2 hafta yükselir, sonra hızla söner.
           Eski hâlde video sayısı sonsuza kadar büyüyordu; bu, ses trendinin
           asla bitmemesi demekti. Artık momentum eşiğin altına düşünce trend
           KAPANIR ve etkisi 20 gün içinde sıfıra iner. */
        if (age > 45) sn.momentum *= 0.82;
        if (age > 70) sn.momentum *= 0.75;
        sn.momentum = U.clamp(sn.momentum, 0, 1.6);

        if (sn.momentum < 0.03) sn.ended = true;
        if (sn.ended) {
          sn.lastGain = 0;
          sn.trend = false;
          sn.decay = Math.max(0, (sn.decay == null ? 1 : sn.decay) - 0.05);
          return;                                                       // trend bitti → yeni video yok
        }
        const grow = sn.momentum * U.rand(250, 1000) * (0.6 + pot * 0.6) + (song.viral ? 200 : 0);
        sn.videos = Math.round(sn.videos + grow);
        sn.lastGain = Math.round(grow);
        sn.peak = Math.max(sn.peak, sn.videos);
        sn.trend = sn.momentum > 0.45;
        sn.decay = 1;
      });
    },

    /* accrueStreams içinde kullanılacak çarpan */
    boostFor(song) {
      const sn = song && song.sound;
      if (!sn || !sn.videos) return 0;
      const decay = sn.decay == null ? 1 : sn.decay;      // trend kapandıysa söner
      return (U.clamp(sn.videos / 20000, 0, 0.9) + (sn.trend ? 0.12 : 0)) * decay;
    },

    /* trend listesi (TikTok uygulaması / kariyer için) */
    trendList(limit) {
      const list = (K.state.player.songs || [])
        .filter(x => x.sound && x.sound.videos > 0)
        .map(x => ({ songId: x.id, title: x.title, videos: x.sound.videos, gain: x.sound.lastGain, trend: x.sound.trend, platform: x.sound.platform }))
        .sort((a, b) => b.videos - a.videos);
      return list.slice(0, limit || 10);
    }
  };
})(window.K = window.K || {});
