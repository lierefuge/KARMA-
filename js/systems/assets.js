/* ============================================================
   KARMA — systems/assets.js   (v10.28)
   VARLIK & GÖSTERİŞ (para harcama + statü)

   Neden?
   ------
   Oyunda para yalnızca ÜRETİM giderine gidiyordu; biriken parayı
   harcayacak “statü” kalemi yoktu. Rap kültüründe varlık hem ödüldür
   hem tuzaktır: gösteriş imajı yükseltir ama BAKIM GİDERİ getirir.
   Bakımı ödeyemezsen “gösterişi sürdüremeyen” sanatçı durumuna
   düşersin — klasik bir rap hikâyesi.

   İKİ KATMANLI ETKİ
   -----------------
   1) ALIM ANI   : imaj + itibar + bazıları işlevsel bonus
   2) AYLIK      : bakım gideri (chargeMonthly'ye eklenir) + imaj etkisi
   Bazı varlıklar PASİF GELİR (kafe/kulüp) veya başka sistemlere
   bonus verir (stüdyo → kayıt maliyeti, ev → stres, bina → şirket gücü).
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const ASSETS = [
    { id: "watch",    name: "Kol Saati",      icon: "⌚", cost: 180000,  upkeep: 900,   img: 4,  rep: 1,  minPop: 15,
      note: "Sessiz gösteriş; imajı yükseltir.", effect: "flex" },
    { id: "chain",    name: "Elmas Zincir",   icon: "💎", cost: 260000,  upkeep: 1200,  img: 6,  rep: 2,  minPop: 18,
      note: "Gösterişin zirvesi — ama soyulma riski var.", effect: "flex", risk: "theft" },
    { id: "studio",   name: "Kendi Stüdyosu", icon: "🎛️", cost: 350000,  upkeep: 6000,  img: 3,  rep: 6,  minPop: 22,
      note: "Kayıt maliyeti düşer, kayıt kalitesi artar.", effect: "studio" },
    { id: "business", name: "Kafe / Kulüp",   icon: "☕", cost: 700000,  upkeep: 8000,  img: 1,  rep: 3,  minPop: 28,
      note: "Aylık pasif gelir getirir.", effect: "income", income: 26000 },
    { id: "car",      name: "Lüks Araba",     icon: "🏎️", cost: 900000,  upkeep: 9000,  img: 5,  rep: 4,  minPop: 30,
      note: "Gösteriş; imajı belirgin yükseltir.", effect: "flex" },
    { id: "label",    name: "Şirket Binası",  icon: "🏢", cost: 1200000, upkeep: 18000, img: 2,  rep: 10, minPop: 32,
      note: "Şirket gücünü ve prestijini artırır.", effect: "label" },
    { id: "house",    name: "Şehir Evi",      icon: "🏠", cost: 1400000, upkeep: 14000, img: 2,  rep: 8,  minPop: 34,
      note: "Huzur: her gün stres azaltır.", effect: "calm" }
  ];

  const SELL_RATIO = 0.6;   // satışta değer kaybı

  K.assets = {
    ASSETS, SELL_RATIO,

    list() { return K.state.player.assets || []; },
    def(id) { return ASSETS.find(a => a.id === id); },
    owns(id) { return K.assets.list().some(x => x.id === id); },
    count() { return K.assets.list().length; },

    /* bir etkiye sahip mi (stüdyo bonusu, huzur, pasif gelir…) */
    hasEffect(effect) { return K.assets.list().some(x => (K.assets.def(x.id) || {}).effect === effect); },

    /* aylık bakım toplamı (chargeMonthly okur) */
    upkeepTotal() {
      const infl = K.econ ? K.econ.infl() : 1;
      return Math.round(K.assets.list().reduce((n, x) => n + ((K.assets.def(x.id) || {}).upkeep || 0), 0) * infl);
    },

    /* aylık pasif gelir */
    incomeTotal() {
      return K.assets.list().reduce((n, x) => n + ((K.assets.def(x.id) || {}).income || 0), 0);
    },

    /* stüdyo bonusu: kayıt maliyeti çarpanı + kalite */
    studioBonus() {
      if (!K.assets.hasEffect("studio")) return { costMult: 1, quality: 0 };
      return { costMult: 0.85, quality: 2 };
    },

    canBuy(id) {
      const a = K.assets.def(id);
      if (!a) return { ok: false, why: "Bilinmeyen varlık" };
      if (K.assets.owns(id)) return { ok: false, why: "Zaten sende" };
      if ((K.state.player.popularity || 0) < a.minPop) {
        return { ok: false, why: `Popülerlik ${a.minPop} olmalı` };
      }
      if (!K.economy.canAfford(a.cost)) return { ok: false, why: `Yetersiz bakiye (${U.money(a.cost)})` };
      return { ok: true };
    },

    buy(id) {
      const a = K.assets.def(id);
      const c = K.assets.canBuy(id);
      if (!c.ok) { K.toast("Alınamadı", c.why, "warn"); return false; }
      K.economy.spend(a.cost, "asset");
      const p = K.state.player;
      p.assets = p.assets || [];
      p.assets.push({ id: a.id, day: K.state.day, price: a.cost });
      p.image = U.clamp((p.image || 50) + (a.img || 0), 0, 100);
      p.reputation = (p.reputation || 0) + (a.rep || 0);
      K.toast(a.icon + " Alındı", `${a.name} · imaj +${a.img} · itibar +${a.rep} · aylık bakım ${U.money(a.upkeep)}`, "ok");
      K.state.notifications = (K.state.notifications || []).concat([{
        title: a.icon + " Varlık alındı",
        msg: `${a.name} — aylık bakım ${U.money(a.upkeep)} giderlerine eklendi.`,
        kind: "ok", day: K.state.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    sell(id) {
      const a = K.assets.def(id);
      if (!a || !K.assets.owns(id)) return false;
      const back = Math.round(a.cost * SELL_RATIO);
      const p = K.state.player;
      p.assets = (p.assets || []).filter(x => x.id !== id);
      K.economy.earn(back, "asset_sale");
      p.image = U.clamp((p.image || 50) - (a.img || 0) * 0.6, 0, 100);
      K.toast("Satıldı", `${a.name} → ${U.money(back)} (değer kaybı %${Math.round((1 - SELL_RATIO) * 100)})`, "warn");
      K.save(); K.refresh();
      return true;
    },

    /* Ay dönümü: yalnızca PASİF GELİR.
       Bakım gideri ve ödenememe cezası `economy.chargeMonthly` içindedir
       (orada TÜM giderler tek yerde toplanıyor; ayrıca burada yapılırsa
       tick sırasına bağlı bir hata doğardı). */
    monthly() {
      const list = K.assets.list();
      if (!list.length) return { income: 0 };
      const income = K.assets.incomeTotal();
      if (income > 0) {
        K.economy.earn(income, "asset_income");
        K.toast("☕ Varlık geliri", `${list.length} varlık → ${U.money(income)}`, "ok");
      }
      return { income };
    },

    /* günlük: huzur + soyulma riski */
    tick() {
      const s = K.state, p = s.player;
      /* ev: stres azaltır (mental sistemiyle sinerji) */
      if (K.assets.hasEffect("calm") && p.stress != null) {
        p.stress = U.clamp(p.stress - 0.35, 0, 100);
      }
      /* zincir soyulma riski */
      if (K.assets.owns("chain") && U.chance(0.0016)) {
        p.assets = (p.assets || []).filter(x => x.id !== "chain");
        p.image = U.clamp((p.image || 50) - 5, 0, 100);
        s.notifications = (s.notifications || []).concat([{
          title: "🚨 Zincirin çalındı",
          msg: "Bir etkinlikte zincirin çalındı. Hem mal hem itibar gitti.",
          kind: "bad", day: s.day
        }]).slice(-60);
        K.toast("🚨 Zincir çalındı!", "Gösterişin bedeli: hem varlık hem imaj.", "bad");
        K.save();
      }
    },

    summary() {
      const list = K.assets.list();
      const owned = list.map(x => ({ ...(K.assets.def(x.id) || {}), day: x.day, price: x.price }));
      return {
        owned,
        totalCost: owned.reduce((n, a) => n + (a.cost || 0), 0),
        upkeep: K.assets.upkeepTotal(),
        income: K.assets.incomeTotal(),
        count: owned.length
      };
    }
  };
})(window.K = window.K || {});
