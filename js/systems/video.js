/* ============================================================
   KARMA — systems/video.js
   KLİP (MUSIC VIDEO) SİSTEMİ
   Bütçe kademesine göre klip çekilir; şarkıya kalıcı YouTube/dinlenme
   ivmesi (song.boosts.mv), görüntülenme ve viral şansı ekler.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const TIERS = [
    { id: "street",    name: "Sokak Klibi",    icon: "📱", cost: 15000,  boost: 0.10, pop: 0.4, views: 25000,  viral: 0.06, note: "Telefonla çekim; düşük bütçe, samimi." },
    { id: "studio",    name: "Stüdyo Klibi",   icon: "🎬", cost: 65000,  boost: 0.20, pop: 0.9, views: 120000, viral: 0.12, note: "Profesyonel ekip ve ışık." },
    { id: "cinematic", name: "Sinematik Klip", icon: "🎥", cost: 240000, boost: 0.34, pop: 1.8, views: 450000, viral: 0.20, note: "Yönetmen + set; büyük lansman." }
  ];

  K.video = {
    TIERS,

    tier(id) { return TIERS.find(t => t.id === id) || TIERS[0]; },

    /* kliplenebilir şarkılar (yayınlanmış ve klibi olmayanlar önce) */
    candidates() {
      return (K.state.player.songs || []).slice().sort((a, b) => (b.streams || 0) - (a.streams || 0));
    },

    shoot(songId, tierId) {
      const song = K.platforms.findSong(songId);
      if (!song) { K.toast("Şarkı bulunamadı", "", "warn"); return false; }
      if (song.mv) { K.toast("Bu şarkının klibi var", `"${song.title}" için zaten klip çektin.`, "warn"); return false; }
      const t = K.video.tier(tierId);
      if (!K.economy.canAfford(t.cost)) { K.toast("Yetersiz bakiye", `${t.name} için ${U.money(t.cost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(t.cost, "music_video");

      const p = K.state.player;
      song.mv = { tier: t.id, name: t.name, icon: t.icon, day: K.state.day, cost: t.cost };
      song.boosts = song.boosts || {};
      song.boosts.mv = (song.boosts.mv || 0) + t.boost;                 // kalıcı ivme (accrueStreams çarpanı)
      song.dailyStreams *= (1 + t.boost * 0.8);
      song.youtubeViews = (song.youtubeViews || 0) + t.views;           // klip açılışında gelen görüntülenme
      p.popularity = U.clamp((p.popularity || 0) + t.pop, 0, 99);
      p.image = U.clamp((p.image || 50) + 0.8, 0, 100);
      if (U.chance(t.viral + (song.quality || 50) / 1200)) {
        song.viral = true;
        K.toast("🔥 Klip patladı!", `"${song.title}" klibi viral oldu.`, "ok");
      }
      if (K.social && K.social.createPost) K.social.createPost("youtube", `"${song.title}" (Official Video) yayında! 🎬`, song.id);
      K.toast(t.icon + " Klip yayında", `"${song.title}" · ${t.name} · ${U.money(t.cost)}`, "ok");
      K.state.notifications = (K.state.notifications || []).concat([{
        title: t.icon + " Klip çekildi", msg: `"${song.title}" için ${t.name} yayında.`, kind: "ok", day: K.state.day
      }]).slice(-60);
      K.save(); if (K.refresh) K.refresh();
      return true;
    },

    summary() {
      const songs = K.state.player.songs || [];
      return {
        total: songs.filter(s => s.mv).length,
        spend: songs.reduce((n, s) => n + ((s.mv && s.mv.cost) || 0), 0)
      };
    }
  };
})(window.K = window.K || {});
