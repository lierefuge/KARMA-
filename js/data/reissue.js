/* ============================================================
   KARMA — data/reissue.js   (v10.46)
   KATALOG: REMASTER · DELUXE SÜRÜM · YILDÖNÜMÜ

   Yayınlanmış iş bir gün "eski" olur ve dinlenmesi düşer. Katalog
   yönetimi bu düşüşe karşı oynanan oyundur:

     1) 🎚️ REMASTER (şarkı)  — eski bir parçayı yeniden master'lar.
        Kalite yükselir, ivme eklenir, çürüme yavaşlar. Şarkı başına 1.
     2) 💎 DELUXE SÜRÜM (albüm) — albümü bonus parçalarla yeniden yayınlar.
        Mevcut parçalara ivme ekler + yeni bonus parçalar katalogda doğar.
     3) 🎂 YILDÖNÜMÜ (albüm)  — bir yılını dolduran albüm kutlanır; bütün
        parçalar kısa ve güçlü bir nostalji ivmesi kazanır.

   Her işlem bir yaş eşiği ister: katalog, taze işin değil geçmişin işidir.
   ============================================================ */
(function (K) {
  "use strict";
  const clamp = (v, a, b) => K.util.clamp(v, a, b);

  /* ---------------- REMASTER KADEMELERİ ---------------- */
  const REMASTER = [
    { id: "studio", name: "Stüdyo Remaster", icon: "🎚️", cost: 30000, q: 3, boost: 0.12, minAge: 90,  note: "Yeniden mixdown; netlik ve güç artar." },
    { id: "analog", name: "Analog Remaster", icon: "📼", cost: 75000, q: 6, boost: 0.20, minAge: 120, note: "Analog zincirden geçirilmiş sıcak master." }
  ];

  /* ---------------- DELUXE / YILDÖNÜMÜ ---------------- */
  const DELUXE = { cost: 150000, minAge: 120, bonus: 2, boost: 0.22, rep: 2 };
  const ANNIV  = { minAge: 365, boost: 0.45, rep: 3, fame: 1.5 };

  K.REISSUE = { REMASTER, DELUXE, ANNIV };

  K.reissue = {
    REMASTER: REMASTER, DELUXE: DELUXE, ANNIV: ANNIV,
    remasterById(id) { return REMASTER.find(x => x.id === id) || REMASTER[0]; },

    /* ---- yaş ---- */
    songAge(song) { return (song && song.publishedDay != null) ? K.state.day - song.publishedDay : 0; },
    albumAge(album) { return (album && album.releasedDay != null) ? K.state.day - album.releasedDay : 0; },

    /* ================= REMASTER (şarkı) ================= */
    hasRemaster(song) { return !!(song && song.remaster); },

    canRemaster(song, tierId) {
      if (!song || song.takenDown || K.reissue.hasRemaster(song)) return false;
      const t = tierId ? K.reissue.remasterById(tierId) : null;
      const minAge = t ? t.minAge : Math.min.apply(null, REMASTER.map(r => r.minAge));
      return K.reissue.songAge(song) >= minAge;
    },

    remaster(songId, tierId) {
      const song = K.platforms.findSong(songId);
      if (!song) { K.toast("Şarkı bulunamadı", "", "warn"); return false; }
      if (K.reissue.hasRemaster(song)) {
        K.toast("Zaten remasterlandı", `"${song.title}" için remaster yapıldı.`, "warn");
        return false;
      }
      const t = K.reissue.remasterById(tierId);
      if (K.reissue.songAge(song) < t.minAge) {
        K.toast("Henüz erken", `Remaster için şarkının en az ${t.minAge} günlük olması gerek.`, "warn");
        return false;
      }
      if (!K.economy.canAfford(t.cost)) {
        K.toast("Yetersiz bakiye", `${t.name} için ${K.util.money(t.cost)} gerekiyor.`, "bad");
        return false;
      }
      K.economy.spend(t.cost, "remaster");
      song.quality = clamp((song.quality || 50) + t.q, 0, 99);
      song.boosts = song.boosts || {};
      song.boosts.remaster = (song.boosts.remaster || 0) + t.boost;
      song.dailyStreams = (song.dailyStreams || 0) * (1 + t.boost);
      song.decayRate = clamp((song.decayRate || 1.6) * 0.92, 0.5, 2.2);
      song.remaster = { tier: t.id, name: t.name, icon: t.icon, day: K.state.day };
      K.toast("🎚️ Remaster yayında", `"${song.title}" ${t.name} ile yenilendi · kalite ${Math.round(song.quality)}.`, "good");
      if (K.refresh) K.refresh();
      return true;
    },

    /* ================= DELUXE SÜRÜM (albüm) ================= */
    hasDeluxe(album) { return !!(album && album.deluxe); },
    canDeluxe(album) {
      return !!album && !K.reissue.hasDeluxe(album) && K.reissue.albumAge(album) >= DELUXE.minAge;
    },

    deluxe(albumId) {
      const p = K.state.player;
      const album = (p.albums || []).find(a => a.id === albumId);
      if (!album) { K.toast("Albüm bulunamadı", "", "warn"); return false; }
      if (K.reissue.hasDeluxe(album)) { K.toast("Deluxe zaten var", `"${album.title}" için deluxe sürüm çıktı.`, "warn"); return false; }
      if (K.reissue.albumAge(album) < DELUXE.minAge) {
        K.toast("Henüz erken", `Deluxe sürüm için albümün en az ${DELUXE.minAge} günlük olması gerek.`, "warn");
        return false;
      }
      if (!K.economy.canAfford(DELUXE.cost)) {
        K.toast("Yetersiz bakiye", `Deluxe sürüm için ${K.util.money(DELUXE.cost)} gerekiyor.`, "bad");
        return false;
      }
      K.economy.spend(DELUXE.cost, "deluxe_reissue");

      const tracks = (album.trackIds || []).map(id => (p.songs || []).find(x => x.id === id)).filter(Boolean);

      /* bonus parçalar: albümün en iyi parçalarının klonu */
      const bonusIds = [];
      const pool = tracks.slice().sort((a, b) => (b.quality || 0) - (a.quality || 0)).slice(0, DELUXE.bonus);
      pool.forEach(src => {
        const bonus = Object.assign({}, src);
        bonus.id = K.util.uid("song");
        bonus.title = src.title + " (Bonus)";
        bonus.isBonus = true;
        bonus.bonusOf = src.id;
        bonus.albumId = album.id;
        bonus.publishedDay = K.state.day;
        bonus.streams = 0; bonus.spotifyStreams = 0; bonus.appleStreams = 0; bonus.youtubeViews = 0;
        bonus.lastDaily = 0;
        bonus.dailyStreams = Math.max(60, (src.dailyStreams || 0) * 0.5);
        bonus.boosts = {};
        bonus.chartRank = null; bonus.chartPeak = 999;
        bonus.lists = []; bonus.listPeak = 999; bonus.listLift = 0;
        bonus.playlists = [];
        bonus.viral = false; bonus.mv = null; bonus.sound = null; bonus.takenDown = false;
        bonus.socialPromo = {};
        bonus.quality = clamp((src.quality || 50) + 2, 0, 99);
        bonus.decayRate = clamp(2.4 - bonus.quality / 60, 0.7, 2.2);
        p.songs.push(bonus);
        bonusIds.push(bonus.id);
      });
      album.trackIds = (album.trackIds || []).concat(bonusIds);
      album.trackCount = (album.trackCount || tracks.length) + bonusIds.length;

      /* mevcut parçalara ivme */
      tracks.forEach(t => {
        t.boosts = t.boosts || {};
        t.boosts.deluxe = (t.boosts.deluxe || 0) + DELUXE.boost;
        t.dailyStreams = (t.dailyStreams || 0) * (1 + DELUXE.boost);
      });
      album.deluxe = { day: K.state.day, bonus: bonusIds.length };
      p.reputation = Math.min(100, (p.reputation || 0) + DELUXE.rep);
      K.toast("💎 Deluxe sürüm yayında",
        `"${album.title}" ${bonusIds.length} bonus parça ve yeni ivmeyle yeniden yayınlandı.`, "good");
      if (K.refresh) K.refresh();
      return true;
    },

    /* ================= YILDÖNÜMÜ (albüm) ================= */
    hasAnniversary(album) { return !!(album && album.anniversary); },
    canAnniversary(album) {
      return !!album && !K.reissue.hasAnniversary(album) && K.reissue.albumAge(album) >= ANNIV.minAge;
    },

    anniversary(albumId) {
      const p = K.state.player;
      const album = (p.albums || []).find(a => a.id === albumId);
      if (!album) { K.toast("Albüm bulunamadı", "", "warn"); return false; }
      if (K.reissue.hasAnniversary(album)) { K.toast("Kutlama yapıldı", `"${album.title}" yıldönümü zaten kutlandı.`, "warn"); return false; }
      if (K.reissue.albumAge(album) < ANNIV.minAge) {
        K.toast("Henüz yıldönümü değil", `Albümün en az ${ANNIV.minAge} günlük olması gerek.`, "warn");
        return false;
      }
      const tracks = (album.trackIds || []).map(id => (p.songs || []).find(x => x.id === id)).filter(Boolean);
      tracks.forEach(t => {
        t.boosts = t.boosts || {};
        t.boosts.anniversary = (t.boosts.anniversary || 0) + ANNIV.boost;
        t.dailyStreams = (t.dailyStreams || 0) * (1 + ANNIV.boost);
      });
      album.anniversary = { day: K.state.day };
      p.reputation = Math.min(100, (p.reputation || 0) + ANNIV.rep);
      if (K.game && K.game.addFame) K.game.addFame(ANNIV.fame);
      K.toast("🎂 Yıldönümü kutlaması", `"${album.title}" bir yaşında! Katalog yeniden canlandı.`, "good");
      if (K.refresh) K.refresh();
      return true;
    }
  };
})(window.K = window.K || {});
