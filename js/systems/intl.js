/* ============================================================
   KARMA — systems/intl.js   (v10.28)
   ULUSLARARASI / DİASPORA ÇIKIŞI

   Neden?
   ------
   Türk rapinin son yıllardaki gerçek hikâyesi bu: Almanya/Hollanda
   diasporası, Avrupa kulüpleri, yabancı feature'lar, global listeler.
   Oyunda yalnızca bir “Euro Trap” tür etiketi vardı; mekanik yoktu.

   NASIL ÇALIŞIR?
   --------------
   Her pazarın bir BÜYÜKLÜĞÜ (diaspora + pazar gücü) ve SENİN
   NÜFUZUN (0-100) var. Pazara girersin, nüfuz zamanla hedefe doğru
   kayar; hedef popülerlik + yabancı feature + turne + global
   dinlenmeyle büyür. Nüfuz aylık YURT DIŞI TELİF geliri üretir.

   RİSKLER (gerçekçilik)
     · Vize reddi (turne parası yanar)
     · Lojistik aşımı (bütçe artar)
     · İlgisiz kalırsan nüfuz SÖNER
   AŞAMALAR: kapalı → diasporaya açıldı → Avrupa turu → küresel
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const MARKETS = [
    { id: "de", name: "Almanya",   icon: "🇩🇪", size: 3.0, minPop: 25, unlock: 260000, cities: ["Berlin", "Köln", "Stuttgart"] },
    { id: "nl", name: "Hollanda",  icon: "🇳🇱", size: 1.1, minPop: 28, unlock: 180000, cities: ["Amsterdam", "Rotterdam"] },
    { id: "fr", name: "Fransa",    icon: "🇫🇷", size: 1.2, minPop: 32, unlock: 240000, cities: ["Paris", "Lyon"] },
    { id: "uk", name: "İngiltere", icon: "🇬🇧", size: 0.9, minPop: 38, unlock: 320000, cities: ["Londra", "Manchester"] },
    { id: "us", name: "ABD",       icon: "🇺🇸", size: 1.6, minPop: 48, unlock: 900000, cities: ["New York", "Los Angeles"] }
  ];

  const TOUR_COST = 150000;      // turne ön ödemesi
  const TOUR_DAYS = 5;
  const FEATURE_COST = 220000;   // yabancı sanatçıya ödenen
  const VISA_FAIL = 0.15;
  const OVERRUN = 0.18;

  K.intl = {
    MARKETS, TOUR_COST, TOUR_DAYS, FEATURE_COST,

    st() { return K.state.player.intl; },
    market(id) { return MARKETS.find(m => m.id === id); },

    entered() {
      const st = K.intl.st();
      return MARKETS.filter(m => (st.markets || {})[m.id] != null);
    },

    pen(id) { return (K.intl.st().markets || {})[id] || 0; },

    /* bir pazarın nüfuz HEDEFİ */
    target(id) {
      const p = K.state.player, st = K.intl.st();
      const m = K.intl.market(id);
      if (!m) return 0;
      let t = (p.popularity || 0) * 0.55;
      if (/euro|hyperpop|drill|phonk/.test(p.genre || "")) t += 8;      // sound uyumu
      t += (st.features || 0) * 4;                                     // yabancı feature
      const tour = (st.tours || []).filter(x => x.marketId === id && K.state.day - x.day < 120).length;
      t += tour * 6;
      t += Math.min(12, (st.globalPlays || 0) / 400000);
      return U.clamp(t, 0, 100);
    },

    /* ---- pazara gir ---- */
    enter(id) {
      const s = K.state, p = s.player, st = K.intl.st();
      const m = K.intl.market(id);
      if (!m) return false;
      if (st.markets && st.markets[id] != null) { K.toast("Zaten içerdesin", `${m.name} pazarı açık.`, "warn"); return false; }
      if ((p.popularity || 0) < m.minPop) { K.toast("Şöhret yetersiz", `${m.name} için popülerlik ${m.minPop} olmalı.`, "warn"); return false; }
      if (!K.economy.canAfford(m.unlock)) { K.toast("Yetersiz bakiye", `${U.money(m.unlock)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(m.unlock, "intl_enter");
      st.markets = st.markets || {};
      st.markets[id] = 10;
      st.stage = Math.max(st.stage || 0, 1);
      K.toast(m.icon + " Pazar açıldı", `${m.name} · dağıtım + yerel PR ayarlandı.`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: m.icon + " " + m.name + " pazarı",
        msg: `${m.name} için dağıtım ve yerel tanıtım başladı. Nüfuz zamanla büyür.`,
        kind: "ok", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* ---- diasporaya turne ---- */
    tour(id) {
      const s = K.state, p = s.player, st = K.intl.st();
      const m = K.intl.market(id);
      if (!m || (st.markets || {})[id] == null) { K.toast("Pazar kapalı", "Önce pazara gir.", "warn"); return false; }
      if (st.touring) { K.toast("Turne sürüyor", "Bitmesini bekle.", "warn"); return false; }
      if (K.mental && K.mental.onHiatus()) { K.toast("Artesin", "Zorunlu arada turne yapamazsın.", "warn"); return false; }
      if (!K.economy.canAfford(TOUR_COST)) { K.toast("Yetersiz bakiye", `${U.money(TOUR_COST)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(TOUR_COST, "intl_tour");

      /* VİZE RİSKİ */
      if (U.chance(VISA_FAIL)) {
        st.markets[id] = Math.max(0, (st.markets[id] || 0) - 4);
        s.notifications = (s.notifications || []).concat([{
          title: "🛂 Vize reddi",
          msg: `${m.name} turne vizesi reddedildi — ön ödeme yandı (${U.money(TOUR_COST)}).`,
          kind: "bad", day: s.day
        }]).slice(-60);
        K.toast("🛂 Vize reddi", "Turne iptal, ön ödeme gitti.", "bad");
        K.save(); K.refresh();
        return false;
      }

      /* LOJİSTİK AŞIMI */
      let extra = 0;
      if (U.chance(OVERRUN)) {
        extra = Math.round(TOUR_COST * 0.3);
        if (K.economy.canAfford(extra)) K.economy.spend(extra, "intl_tour");
        else { s.player.debt = (s.player.debt || 0) + extra; }
      }

      st.touring = { marketId: id, daysLeft: TOUR_DAYS, startDay: s.day };
      K.toast(m.icon + " Diaspora turnesi", `${m.name} · ${m.cities.join(" → ")}${extra ? " · lojistik aşımı " + U.money(extra) : ""}`, "ok");
      K.save(); K.refresh();
      return true;
    },

    /* ---- yabancı feature ---- */
    foreignFeature(id) {
      const s = K.state, p = s.player, st = K.intl.st();
      const m = K.intl.market(id);
      if (!m || (st.markets || {})[id] == null) { K.toast("Pazar kapalı", "Önce pazara gir.", "warn"); return false; }
      if (!K.economy.canAfford(FEATURE_COST)) { K.toast("Yetersiz bakiye", `${U.money(FEATURE_COST)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(FEATURE_COST, "intl_feature");
      st.features = (st.features || 0) + 1;
      st.markets[id] = U.clamp((st.markets[id] || 0) + 6, 0, 100);
      p.reputation = (p.reputation || 0) + 5;
      if (K.game && K.game.addFame) K.game.addFame(1.1);
      K.toast("🤝 Yabancı feature", `${m.name} pazarından bir sanatçıyla ortak iş · itibar +5`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "🤝 Yabancı feature",
        msg: `${m.name} pazarında ortak çalışma yayınlandı — yurt dışı nüfuz arttı.`,
        kind: "ok", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* ---- günlük ---- */
    tick() {
      const s = K.state, p = s.player, st = K.intl.st();
      if (!st) return;

      /* turne ilerlemesi */
      if (st.touring) {
        st.touring.daysLeft -= 1;
        if (st.touring.daysLeft <= 0) {
          const mid = st.touring.marketId;
          const m = K.intl.market(mid);
          st.markets[mid] = U.clamp((st.markets[mid] || 0) + 18, 0, 100);
          st.tours = (st.tours || []).concat([{ marketId: mid, day: s.day }]).slice(-20);
          /* Takipçi kazancı: fans.js'te `add()` YOK — sosyal sayaçlara
             doğrudan dağıtılır (fans.followers() bu alanları toplar). */
          const gain = Math.round((K.fans && K.fans.followers ? K.fans.followers() : 0) * 0.03);
          p.ig = (p.ig || 0) + Math.round(gain * 0.50);
          p.tiktok = (p.tiktok || 0) + Math.round(gain * 0.35);
          p.x = (p.x || 0) + Math.round(gain * 0.15);
          p.reputation = (p.reputation || 0) + 3;
          st.touring = null;
          K.toast(m.icon + " Turne bitti", `${m.name} nüfuz +18 · itibar +3`, "ok");
          s.notifications = (s.notifications || []).concat([{
            title: m.icon + " " + m.name + " turnesi tamam",
            msg: `${m.cities.join(", ")} — diaspora yoğun ilgi gösterdi. Nüfuz yükseldi.`,
            kind: "ok", day: s.day
          }]).slice(-60);
        }
      }

      /* nüfuz hedefe doğru kayar, ilgisiz kalırsa söner */
      K.intl.entered().forEach(m => {
        const cur = st.markets[m.id] || 0;
        const tgt = K.intl.target(m.id);
        const drift = (tgt - cur) * 0.02;
        const decay = cur > tgt ? -0.15 : 0;
        st.markets[m.id] = U.clamp(cur + drift + decay, 0, 100);
        st.globalPlays = (st.globalPlays || 0) + Math.round(st.markets[m.id] * m.size * 40);
      });

      /* aşama ilerlemesi */
      const eu = ["de", "nl", "fr"].filter(id => (st.markets[id] || 0) >= 40).length;
      const us = (st.markets.us || 0) >= 50;
      const newStage = us ? 3 : (eu >= 2 ? 2 : (K.intl.entered().length ? 1 : 0));
      if (newStage > (st.stage || 0)) {
        st.stage = newStage;
        const label = ["", "Diaspora", "Avrupa turu", "Küresel"][newStage];
        s.notifications = (s.notifications || []).concat([{
          title: "🌍 Uluslararası aşama: " + label,
          msg: "Kariyerin artık yurt dışında da sayılıyor.",
          kind: "ok", day: s.day
        }]).slice(-60);
        K.toast("🌍 Aşama atladın", label, "ok");
      }
    },

    /* aylık yurt dışı telif geliri */
    monthly() {
      const st = K.intl.st();
      const list = K.intl.entered();
      if (!list.length) return 0;
      const p = K.state.player;
      let income = 0;
      list.forEach(m => {
        const pen = st.markets[m.id] || 0;
        income += m.size * (pen / 100) * (1 + (p.popularity || 0) / 50) * 12000;
      });
      income = Math.round(income * K.intl._shadyMult());
      if (income > 0) {
        K.economy.earn(income, "intl_royalty");
        K.toast("🌍 Yurt dışı telif", `${list.length} pazar → ${U.money(income)}`, "ok");
      }
      return income;
    },

    /* payola yasağı yurt dışı gelirini de etkiler (tek yerden) */
    _shadyMult() { return (K.shady && K.shady.incomeMult) ? K.shady.incomeMult() : 1; },

    stageLabel() { return ["Kapalı", "Diaspora", "Avrupa turu", "Küresel"][K.intl.st().stage || 0]; },

    summary() {
      const st = K.intl.st();
      return {
        stage: st.stage || 0,
        stageLabel: K.intl.stageLabel(),
        markets: MARKETS.map(m => ({
          ...m, entered: (st.markets || {})[m.id] != null,
          pen: Math.round(st.markets[m.id] || 0), target: Math.round(K.intl.target(m.id))
        })),
        touring: st.touring || null,
        tours: (st.tours || []).length,
        features: st.features || 0,
        globalPlays: st.globalPlays || 0,
        monthly: (() => {
          const p = K.state.player;
          return Math.round(MARKETS.reduce((n, m) =>
            n + (st.markets && st.markets[m.id] != null
              ? m.size * ((st.markets[m.id] || 0) / 100) * (1 + (p.popularity || 0) / 50) * 12000 : 0), 0));
        })()
      };
    }
  };
})(window.K = window.K || {});
