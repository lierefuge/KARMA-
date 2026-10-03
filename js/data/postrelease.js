/* ============================================================
   KARMA — data/postrelease.js   (v10.45)
   YAYIN SONRASI KARİYER: radyo kampanyası · remix · klip

   Bir şarkı yayınlandıktan sonra kariyer bitmez; asıl iş orada başlar.
   Oyuncu üç kaldıraç kullanır:

     1) 📻 RADYO KAMPANYASI — belirli bir süre airplay desteği satın alır.
        Şarkıya radyo ivmesi (boosts.radio) ve liste çekişi ekler.
     2) 🔀 REMİX — şarkının yeni bir sürümünü katalogda yayınlar; remix
        kendi dinlenmesini toplar, orijinal şarkıya da can suyu olur.
     3) 🎬 KLİP — mevcut K.video sistemi (telefon uygulaması) burada da
        yüzeye çıkarılır.

   Radyo kampanyası biter (süre dolar), remix kalıcıdır (şarkı başına 1).
   ============================================================ */
(function (K) {
  "use strict";
  const clamp = (v, a, b) => K.util.clamp(v, a, b);

  /* ---------------- RADYO KAMPANYASI ---------------- */
  const RADIO = [
    { id: "yerel",    name: "Yerel Radyo",     icon: "📻", cost: 20000, days: 10, boost: 0.14, pull: 6,  note: "Bölgesel istasyonlar + mahalli DJ desteği." },
    { id: "internet", name: "Dijital Airplay", icon: "🛰️", cost: 35000, days: 12, boost: 0.20, pull: 10, note: "İnternet radyoları ve çalma listesi servisleri." },
    { id: "ulusal",   name: "Ulusal Radyo",    icon: "📡", cost: 75000, days: 14, boost: 0.28, pull: 16, note: "Ulusal müzik kanalları; geniş erişim." }
  ];

  /* ---------------- REMİX ---------------- */
  const REMIX = [
    { id: "prod",  name: "Prodüktör Remixi", icon: "🎛️", cost: 18000,  boost: 0.16, streams: 0.12, quality: -2, note: "Beat yeniden işlenir; kulüp remixi." },
    { id: "feat",  name: "Feat. Remix",      icon: "🤝", cost: 55000,  boost: 0.28, streams: 0.22, quality: 2,  note: "Başka bir sanatçıyla düet remix." },
    { id: "buyuk", name: "Büyük Remix",      icon: "🌟", cost: 160000, boost: 0.42, streams: 0.38, quality: 4,  note: "Yıldız prodüktör/düet; şarkıyı yeniden canlandırır." }
  ];

  K.POSTRELEASE = { RADIO, REMIX };

  K.postRelease = {
    RADIO: RADIO, REMIX: REMIX,

    radioById(id) { return RADIO.find(x => x.id === id) || RADIO[0]; },
    remixById(id) { return REMIX.find(x => x.id === id) || REMIX[0]; },

    /* ---- radyo kampanyası durumu ---- */
    radioActive(song) {
      return !!(song && song.radioCampaign && song.radioCampaign.untilDay > K.state.day);
    },
    radioDaysLeft(song) {
      return K.postRelease.radioActive(song) ? song.radioCampaign.untilDay - K.state.day : 0;
    },
    canRadio(song) {
      return !!song && !song.takenDown && !K.postRelease.radioActive(song);
    },

    runRadio(songId, tierId) {
      const song = K.platforms.findSong(songId);
      if (!song) { K.toast("Şarkı bulunamadı", "", "warn"); return false; }
      if (!K.postRelease.canRadio(song)) {
        K.toast("Kampanya sürüyor", `"${song.title}" için aktif bir radyo kampanyası var.`, "warn");
        return false;
      }
      const t = K.postRelease.radioById(tierId);
      if (!K.economy.canAfford(t.cost)) {
        K.toast("Yetersiz bakiye", `${t.name} için ${K.util.money(t.cost)} gerekiyor.`, "bad");
        return false;
      }
      K.economy.spend(t.cost, "radio_campaign");
      song.radioCampaign = { tier: t.id, name: t.name, icon: t.icon, day: K.state.day, untilDay: K.state.day + t.days };
      song.boosts = song.boosts || {};
      song.boosts.radio = (song.boosts.radio || 0) + t.boost;
      K.toast("📻 Radyo kampanyası başladı",
        `"${song.title}" ${t.days} gün boyunca ${t.name} desteğinde.`, "good");
      if (K.refresh) K.refresh();
      return true;
    },

    /* ---- remix ---- */
    hasRemix(song) { return !!(song && song.remix); },
    canRemix(song) {
      return !!song && !song.takenDown && !song.isRemix && !K.postRelease.hasRemix(song);
    },

    makeRemix(songId, tierId) {
      const song = K.platforms.findSong(songId);
      if (!song) { K.toast("Şarkı bulunamadı", "", "warn"); return false; }
      if (!K.postRelease.canRemix(song)) {
        K.toast("Remix zaten var", `"${song.title}" için zaten remix yayınladın.`, "warn");
        return false;
      }
      const t = K.postRelease.remixById(tierId);
      if (!K.economy.canAfford(t.cost)) {
        K.toast("Yetersiz bakiye", `${t.name} için ${K.util.money(t.cost)} gerekiyor.`, "bad");
        return false;
      }
      K.economy.spend(t.cost, "remix");

      const s = K.state;
      /* remix, orijinalin klonu olarak doğar; kimlik ve ivme alanları
         sıfırlanır, kalite kademeye göre kayar. */
      const remix = Object.assign({}, song);
      remix.id = K.util.uid("sng");
      remix.title = song.title + " (Remix)";
      remix.isRemix = true;
      remix.remixOf = song.id;
      remix.remixTier = t.id;
      remix.publishedDay = s.day;
      remix.streams = 0; remix.spotifyStreams = 0; remix.appleStreams = 0; remix.youtubeViews = 0;
      remix.lastDaily = 0;
      remix.dailyStreams = Math.max(40, (song.dailyStreams || 0) * t.streams + (song.streams || 0) * 0.0015);
      remix.boosts = {};
      remix.chartRank = null; remix.chartPeak = 999;
      remix.lists = []; remix.listPeak = 999; remix.listLift = 0;
      remix.playlists = [];
      remix.viral = false; remix.mv = null; remix.sound = null; remix.takenDown = false;
      remix.socialPromo = {};
      remix.quality = clamp((song.quality || 50) + t.quality, 18, 99);
      remix.decayRate = clamp(2.4 - remix.quality / 60, 0.7, 2.2);
      remix.remixDay = s.day;
      (s.player.songs = s.player.songs || []).push(remix);

      /* orijinal şarkı can suyu alır */
      song.remix = { tier: t.id, name: t.name, icon: t.icon, day: s.day, songId: remix.id };
      song.boosts = song.boosts || {};
      song.boosts.remix = (song.boosts.remix || 0) + t.boost * 0.6;
      song.dailyStreams = (song.dailyStreams || 0) * (1 + t.streams * 0.5);

      K.toast("🔀 Remix yayınlandı",
        `"${song.title} (Remix)" katalogda — orijinal şarkı da ivme kazandı.`, "good");
      if (K.refresh) K.refresh();
      return true;
    }
  };
})(window.K);
