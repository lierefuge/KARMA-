/* ============================================================
   KARMA — systems/merch.js   (v10.28)
   ÜRÜN / STREETWEAR MARKASI

   Neden ayrı sistem?
   ------------------
   Oyunda merch yalnızca KONSERE bağlıydı (katılımın %18'i × 250 ₺).
   Günümüz rapçisinin en büyük BAĞIMSIZ geliri ise drop bazlı ürün
   işidir: tasarım → üretim → stok → drop heyecanı → tükenme/yeniden
   stok. Burada kendi markanı kurup drop çıkarırsın.

   GERÇEKÇİLİK
   -----------
   · Fiyat duyarlılığı: pahalı fiyat → az satış ama iyi marj
   · Stok yanlış tahmini → elde kalan ürün = ZARAR (geri dönmez)
   · Tükenme (sell-out) → marka değeri + heyecan + hayran memnuniyeti
   · Marka değeri büyüdükçe daha büyük stok/premium tasarım açılır
   · Moda sponsorluğu varsa talep artar (sponsor sistemiyle sinerji)
   · Drop sonrası bekleme süresi var → spam yok
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* ürün tipleri: birim maliyet / referans fiyat / göreli talep */
  const ITEMS = {
    tee:    { id: "tee",    name: "Tişört",  icon: "👕", unit: 120, price: 450,  demand: 1.00 },
    cap:    { id: "cap",    name: "Şapka",   icon: "🧢", unit: 90,  price: 380,  demand: 0.85 },
    hoodie: { id: "hoodie", name: "Hoodie",  icon: "🧥", unit: 320, price: 1100, demand: 0.62 },
    vinyl:  { id: "vinyl",  name: "Plak",    icon: "💿", unit: 260, price: 900,  demand: 0.35 },
    chain:  { id: "chain",  name: "Zincir",  icon: "⛓️", unit: 900, price: 3200, demand: 0.22 }
  };

  /* tasarım kademesi: maliyet + çekicilik */
  const DESIGNS = {
    basic:   { id: "basic",   name: "Basit Baskı",    icon: "🖨️", cost: 4000,   appeal: 1.00 },
    solid:   { id: "solid",   name: "Sağlam Tasarım", icon: "🎨", cost: 18000,  appeal: 1.22, minBrand: 0 },
    premium: { id: "premium", name: "Premium Koleksiyon", icon: "✨", cost: 60000, appeal: 1.45, minBrand: 25 }
  };

  const DROP_DAYS = 7;         // drop penceresi
  const COOLDOWN = 14;         // iki drop arası

  K.merch = {
    ITEMS, DESIGNS, DROP_DAYS, COOLDOWN,

    st() { return K.state.player.merch; },

    /* marka değeri çarpanı (talep + prestij) */
    brandMult() {
      const m = K.merch.st();
      return 1 + (m.brandValue || 0) / 200;
    },

    /* günlük potansiyel alıcı havuzu */
    audience() {
      const p = K.state.player;
      const ig = p.ig || 0, tt = p.tiktok || 0, x = p.x || 0;
      return Math.round((ig + tt) * 0.012 + x * 0.006 + (p.superfans || 0) * 0.4 + (p.popularity || 0) * 40);
    },

    /* drop maliyeti (tasarım + stok) */
    cost(itemId, designId, stock) {
      const it = ITEMS[itemId], d = DESIGNS[designId];
      if (!it || !d) return 0;
      return Math.round(d.cost + it.unit * stock);
    },

    /* drop başlat */
    launch(itemId, designId, stock, priceMult) {
      const s = K.state, m = K.merch.st(), it = ITEMS[itemId], d = DESIGNS[designId];
      if (!it || !d) return false;
      /* DÜZELTME (v10.28): marka kurulmadan drop başlatılamaz.
         (Eskiden bu kontrol yoktu; marka adı olmadan ürün çıkabiliyordu.) */
      if (!m.brand) { K.toast("Marka yok", "Önce bir ürün markası kur.", "warn"); return false; }
      if (m.active) { K.toast("Drop sürüyor", "Önce mevcut drop bitsin.", "warn"); return false; }
      if ((m.brandValue || 0) < (d.minBrand || 0)) {
        K.toast("Marka değeri yetersiz", `${d.name} için marka değeri ${d.minBrand} olmalı.`, "warn");
        return false;
      }
      if (s.day < (m.cooldownDay || 0)) {
        K.toast("Üretim molası", `Yeni drop için ${(m.cooldownDay || 0) - s.day} gün beklemelisin.`, "warn");
        return false;
      }
      const units = U.clamp(Math.round(stock || 0), 50, 5000);
      const mult = U.clamp(priceMult || 1, 0.6, 1.8);
      const total = K.merch.cost(itemId, designId, units);
      if (!K.economy.canAfford(total)) {
        K.toast("Yetersiz bakiye", `Bu drop ${U.money(total)} gerektiriyor.`, "bad");
        return false;
      }
      K.economy.spend(total, "merch");
      m.active = {
        id: U.uid("drop"), itemId, designId, units, sold: 0,
        price: Math.round(it.price * mult), priceMult: mult,
        startDay: s.day, daysLeft: DROP_DAYS, revenue: 0, cost: total, hype: 1
      };
      K.toast("👕 Drop başladı!", `${it.icon} ${d.name} · ${units} adet · ${U.money(m.active.price)}`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "👕 Drop başladı",
        msg: `${d.name} ${it.name} · ${units} adet · birim ${U.money(m.active.price)}`,
        kind: "ok", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* günlük satış */
    tick() {
      const s = K.state, p = s.player, m = K.merch.st();
      if (!m.active) return;
      const a = m.active, it = ITEMS[a.itemId], d = DESIGNS[a.designId];
      if (!a || !it || !d) { m.active = null; return; }

      /* talep: havuz × çekicilik × ürün × marka × fiyat duyarlılığı */
      let value = (d.appeal || 1) * (it.demand || 1) * K.merch.brandMult();
      value *= U.clamp(1.35 - (a.price / (it.price || 1)) * 0.35, 0.35, 1.45);
      if (p.image != null && p.image < 40) value *= 0.85;         // imaj kötüyse talep düşer
      if (K.sponsor && K.sponsor.active) {
        const hasFashion = K.sponsor.active().some(x => /Moda|Spor Giyim/i.test(x.cat || ""));
        if (hasFashion) value *= 1.18;                             // moda sponsorluğu sinerjisi
      }
      /* viral trend varsa ürün de talep görür (shortform sinerjisi) */
      if (K.shortform && K.shortform.trendList && K.shortform.trendList(1).length) value *= 1.15;

      const perDay = Math.max(0, Math.round(K.merch.audience() * value / 60));
      const sold = Math.min(perDay, Math.max(0, a.units - a.sold));
      a.sold += sold;
      a.revenue += sold * a.price;
      a.daysLeft -= 1;

      if (a.sold >= a.units) {
        /* TÜKENDİ → marka değeri + heyecan */
        m.brandValue = Math.min(100, (m.brandValue || 0) + 6);
        if (K.game && K.game.addFame) K.game.addFame(0.5);
        K.toast("🔥 Drop TÜKENDİ!", `${a.units} adet bitti · gelir ${U.money(a.revenue)}`, "ok");
        s.notifications = (s.notifications || []).concat([{
          title: "🔥 Drop tükendi",
          msg: `${d.name} ${it.name} tükendi — marka değeri yükseldi. Yeniden stok düşünülebilir.`,
          kind: "ok", day: s.day
        }]).slice(-60);
        K.merch._close(a, true);
        return;
      }
      if (a.daysLeft <= 0) {
        /* süre bitti: kalan stok ZARAR */
        const left = a.units - a.sold;
        m.brandValue = Math.min(100, (m.brandValue || 0) + 2);
        const profit = a.revenue - a.cost;
        if (left > 0) {
          s.notifications = (s.notifications || []).concat([{
            title: "📦 Drop bitti (stok kaldı)",
            msg: `${left} adet elde kaldı — üretim maliyeti geri gelmedi. Net ${U.money(profit)}`,
            kind: profit >= 0 ? "" : "warn", day: s.day
          }]).slice(-60);
          K.toast("📦 Drop bitti", `${left} adet elde kaldı · net ${U.money(profit)}`, profit >= 0 ? "ok" : "warn");
        } else {
          K.toast("📦 Drop bitti", `net ${U.money(profit)}`, "ok");
        }
        K.merch._close(a, false);
      }
    },

    _close(a, soldOut) {
      const m = K.merch.st();
      const profit = a.revenue - a.cost;
      m.totalRevenue = (m.totalRevenue || 0) + a.revenue;
      m.drops = (m.drops || []).concat([{
        itemId: a.itemId, designId: a.designId, units: a.units, sold: a.sold,
        revenue: a.revenue, cost: a.cost, profit, soldOut: !!soldOut, day: K.state.day
      }]).slice(-30);
      m.cooldownDay = K.state.day + COOLDOWN;
      m.active = null;
      K.bus.emit("merch:dropEnded", { profit, soldOut: !!soldOut });
      K.save(); if (K.refresh) K.refresh();
    },

    /* marka kur (tek seferlik) */
    found(brandName) {
      const m = K.merch.st();
      if (m.brand) { K.toast("Markan zaten var", m.brand, "warn"); return false; }
      const name = String(brandName || "").trim().slice(0, 22);
      if (!name) { K.toast("İsim gerekli", "Markaya bir isim ver.", "warn"); return false; }
      m.brand = name;
      m.brandValue = Math.max(m.brandValue || 0, 4);
      K.toast("👕 Marka kuruldu", `"${name}" artık senin markan.`, "ok");
      K.save(); K.refresh();
      return true;
    },

    summary() {
      const m = K.merch.st();
      const done = m.drops || [];
      return {
        brand: m.brand, brandValue: m.brandValue || 0,
        active: m.active || null, cooldownDay: m.cooldownDay || 0,
        drops: done.slice().reverse().slice(0, 8),
        totalRevenue: m.totalRevenue || 0,
        profit: done.reduce((n, d) => n + (d.profit || 0), 0),
        audience: K.merch.audience(),
        mult: K.merch.brandMult()
      };
    }
  };
})(window.K = window.K || {});
