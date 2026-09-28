/* ============================================================
   KARMA — systems/livestream.js
   Canlı yayın (Instagram / TikTok Live) + fan etkileşimi.
   Yayın gerçek zamanlı sayılarla ilerler; etkileşimler izleyiciyi büyütür.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  let timer = null;

  const REACTIONS = [
    "🔥🔥🔥", "şarkıyı çal!!", "kral 👑", "bu sesi nerden biliyorum", "albüm ne zaman?",
    "canlı iyi gidiyor", "feature kiminle?", "seni ilk defa dinliyorum",
    "stüdyodan mı yayındasın?", "konser gelir mi?", "Efsane 💜", "ses kalitesi süper"
  ];

  K.livestream = {
    isLive() { return !!K.state.live; },
    info() { return K.state.live || null; },

    start(platform) {
      const s = K.state, p = s.player;
      if (s.live) { K.toast("Zaten canlıdasın", "", "warn"); return; }
      const base = Math.round(40 + p.popularity * 18 + Math.sqrt(Math.max(1, p.ig + p.tiktok)) * 0.5);
      s.live = {
        platform: platform || "instagram",
        startedDay: s.day,
        seconds: 0,
        viewers: base,
        peak: base,
        followers: 0,
        donations: 0,
        energy: 100,
        reactions: [],
        active: true
      };
      K.bus.emit("live:started", s.live);
      K.toast("🔴 CANLI YAYIN", `${platform === "tiktok" ? "TikTok" : "Instagram"} Live başladı · ${U.fmt(base)} izleyici`, "ok");
      K.livestream._run();
      return s.live;
    },

    _run() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        const s = K.state;
        if (!s.live || !s.live.active) { clearInterval(timer); timer = null; return; }
        const L = s.live, p = s.player;
        L.seconds += 2;
        const energyFactor = U.clamp(L.energy / 100, 0.25, 1.6);
        const virality = U.chance(0.12) ? U.rand(1.15, 1.5) : 1;
        L.viewers = Math.max(5, Math.round(L.viewers * (1 + 0.012 * energyFactor) * virality + U.rand(0, 6)));
        L.peak = Math.max(L.peak, L.viewers);
        L.followers += Math.round(L.viewers * 0.02 * energyFactor);
        L.donations += Math.round(L.viewers * 0.05 * energyFactor);
        L.energy = U.clamp(L.energy - 0.7, 0, 100);
        if (U.chance(0.5)) {
          L.reactions.unshift({ user: U.pick(["melis_", "kaan1903", "rapsever61", "34istanbul", "trapzone", "gece_kusu", "basshead_tr", "sokak_sairi"]), text: U.pick(REACTIONS) });
          L.reactions = L.reactions.slice(0, 30);
        }
        K.bus.emit("live:tick", L);
      }, 2000);
    },

    interact(kind) {
      const L = K.state.live;
      if (!L) return;
      const label = { sing: "şarkı söyledin", rap: "freestyle attın", qa: "soruları cevapladın", guest: "sürpriz konuk getirdin", shout: "izleyicileri selamladın" }[kind] || "etkileşim";
      L.energy = U.clamp(L.energy + 18, 0, 100);
      L.viewers = Math.round(L.viewers * 1.14);
      L.peak = Math.max(L.peak, L.viewers);
      L.followers += Math.round(L.viewers * 0.05);
      L.donations += Math.round(L.viewers * 0.08);
      L.reactions.unshift({ user: "sistem", text: "🎯 " + label.toUpperCase() + " · izleyici tavan yaptı!" });
      L.reactions = L.reactions.slice(0, 30);
      K.bus.emit("live:tick", L);
    },

    end() {
      const s = K.state;
      if (!s.live) return null;
      if (timer) { clearInterval(timer); timer = null; }
      const L = s.live;
      const p = s.player;
      const donations = Math.round(L.donations);
      const followers = Math.round(L.followers);
      p.ig += Math.round(followers * (L.platform === "instagram" ? 0.6 : 0.15));
      p.tiktok += Math.round(followers * (L.platform === "tiktok" ? 0.6 : 0.15));
      p.popularity = U.clamp(p.popularity + Math.min(3, L.peak / 4000), 0, 99);
      K.economy.earn(donations, "live");
      s.live = null;
      K.bus.emit("live:ended", { peak: L.peak, followers, donations, seconds: L.seconds });
      K.toast("⏹️ Yayın bitti", `${U.fmt(L.peak)} tepe izleyici · +${U.fmt(followers)} takipçi · ${U.money(donations)} bağış`, "ok");
      K.save(); K.refresh();
      return { peak: L.peak, followers, donations };
    },

    /* ---------------- fan etkileşimi (yorum yanıtlama) ---------------- */
    replyComment(seed, idx) {
      const L = K.state;
      const p = L.player;
      const gain = U.rand(0.1, 0.5);
      p.popularity = U.clamp(p.popularity + gain, 0, 99);
      p.ig += U.randInt(20, 160);
      p.reputation = Math.min(100, p.reputation + 0.2);
      K.toast("💬 Yorum yanıtlandı", "Hayran etkileşimi arttı.", "ok");
      return true;
    }
  };
})(window.K);
