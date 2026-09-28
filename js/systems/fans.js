/* ============================================================
   KARMA — systems/fans.js
   SÜPERFAN EKONOMİSİ (gerçekçilik katmanı)
   • Takipçi kitlesi katmanlara ayrılır: casual / aktif / süperfan.
   • Gelir streaming'den değil, süperfandan gelir:
       - Fan kulübü aboneliği (AYLIK, otomatik günlük gelir değil)
       - Sınırlı merch drop (elle, cooldown)
       - VIP / özel içerik (elle, cooldown)
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.fans = {

    followers() {
      const p = K.state.player;
      return (p.ig || 0) + (p.tiktok || 0) + (p.x || 0) + (p.ytSubs || 0);
    },

    /* kitle modeli */
    model() {
      const p = K.state.player;
      const f = K.fans.followers();
      const popB = 1 + (p.popularity || 0) / 220;
      const casual = Math.round(f * 0.35);
      const active = Math.round(f * 0.11 * popB);
      const superfans = Math.round(f * (K.ECON.superfanRate || 0.02) * popB);
      return { followers: f, casual, active, superfans };
    },

    /* günlük: kitleyi tazele (otomatik gelir YOK, sadece sayaç) */
    dailyTick() {
      const p = K.state.player;
      const m = K.fans.model();
      p.superfans = m.superfans;
      if (p.fanClub) p.fanClub.subscribers = Math.round(m.superfans * (p.fanClub.conv || 0.05));
    },

    /* ---------------- fan kulübü ---------------- */
    startClub() {
      const p = K.state.player;
      const m = K.fans.model();
      if (m.superfans < 500) { K.toast("Henüz erken", "Fan kulübü için en az ~500 süperfan gerekli.", "warn"); return false; }
      if (p.fanClub) { K.toast("Fan kulübün var", "Kulübü geliştirebilirsin.", "warn"); return false; }
      const setup = 15000;
      if (!K.economy.canAfford(setup)) { K.toast("Yetersiz bakiye", U.money(setup) + " gerekiyor.", "bad"); return false; }
      K.economy.spend(setup, "fanclub");
      p.fanClub = { level: 1, price: 90, conv: 0.05, since: K.state.day, subscribers: 0 };
      K.toast("💜 Fan kulübü açıldı", "Aylık abonelik geliri başladı.", "ok");
      K.save(); K.refresh(); return true;
    },

    upgradeClub() {
      const p = K.state.player;
      if (!p.fanClub) return K.fans.startClub();
      const cost = 20000 * p.fanClub.level;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", U.money(cost) + " gerekiyor.", "bad"); return false; }
      K.economy.spend(cost, "fanclub_up");
      p.fanClub.level += 1;
      p.fanClub.price += 30;
      p.fanClub.conv = U.clamp((p.fanClub.conv || 0.05) + 0.02, 0, 0.25);
      K.toast("💜 Fan kulübü büyüdü", "Seviye " + p.fanClub.level + " · aidat ₺" + p.fanClub.price, "ok");
      K.save(); K.refresh(); return true;
    },

    /* AYLIK fan kulübü geliri (ay dönümünde) */
    monthly() {
      const p = K.state.player;
      if (!p.fanClub) return 0;
      const m = K.fans.model();
      const subs = Math.round(m.superfans * (p.fanClub.conv || 0.05));
      const gross = Math.round(subs * p.fanClub.price);
      const net = Math.round(gross * (1 - (K.ECON.clubPlatformCut || 0.15)));   // platform komisyonu
      p.fanClub.subscribers = subs;
      if (net > 0) {
        K.economy.earn(net, "fanclub_month");
        K.toast("💜 Fan kulübü", `${U.fmt(subs)} abone → net ${U.money(net)}`, "ok");
      }
      return net;
    },

    /* ---------------- sınırlı merch ---------------- */
    merchDrop() {
      const p = K.state.player;
      if (K.state.day - (p.merchCooldownDay || 0) < 30) {
        K.toast("Merch beklemede", `${30 - (K.state.day - (p.merchCooldownDay || 0))} gün sonra yeni drop.`, "warn");
        return false;
      }
      const m = K.fans.model();
      const buyers = Math.round(m.active * 0.02 + m.superfans * 0.15);
      if (buyers < 20) { K.toast("Kitle yetersiz", "Merch için biraz aktif kitle gerekiyor.", "warn"); return false; }
      const unitCost = 140, price = 320;
      const cost = Math.round(buyers * unitCost);
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", U.money(cost) + " gerekiyor.", "bad"); return false; }
      K.economy.spend(cost, "merch");
      const revenue = Math.round(buyers * price * U.rand(0.85, 1.05));
      const cut = (K.career && K.career.labelCut) ? K.career.labelCut("merch", revenue) : 0;
      K.economy.earn(revenue - cut, "merch_sale");
      p.merchCooldownDay = K.state.day;
      K.toast("👕 Merch drop", `${U.fmt(buyers)} satış → net +${U.money(revenue - cost - cut)}${cut ? " · 360 payı " + U.money(cut) : ""}`, "ok");
      K.save(); K.refresh(); return true;
    },

    /* ---------------- VIP / özel içerik ---------------- */
    vipDrop() {
      const p = K.state.player;
      if (K.state.day - (p.vipCooldownDay || 0) < 20) {
        K.toast("VIP beklemede", `${20 - (K.state.day - (p.vipCooldownDay || 0))} gün sonra.`, "warn");
        return false;
      }
      const m = K.fans.model();
      const buyers = Math.round(m.superfans * 0.05);
      if (buyers < 10) { K.toast("Kitle yetersiz", "VIP için süperfan gerekiyor.", "warn"); return false; }
      const revenue = Math.round(buyers * 250);
      K.economy.earn(revenue, "vip");
      p.vipCooldownDay = K.state.day;
      K.toast("⭐ VIP içerik", `${U.fmt(buyers)} süperfan → ${U.money(revenue)}`, "ok");
      K.save(); K.refresh(); return true;
    },

    /* özet (UI için) */
    summary() {
      const m = K.fans.model();
      const p = K.state.player;
      const subs = p.fanClub ? Math.round(m.superfans * (p.fanClub.conv || 0.05)) : 0;
      return {
        ...m,
        club: p.fanClub,
        subscribers: subs,
        clubMonthly: p.fanClub ? Math.round(subs * p.fanClub.price * (1 - (K.ECON.clubPlatformCut || 0.15))) : 0,
        merchReady: K.state.day - (p.merchCooldownDay || 0) >= 30,
        vipReady: K.state.day - (p.vipCooldownDay || 0) >= 20
      };
    }
  };
})(window.K = window.K || {});
