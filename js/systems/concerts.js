/* ============================================================
   KARMA — systems/concerts.js
   Konser & turne sistemi:
   - Sahne prodüksiyonu (ışık/LED/sinematik show)
   - Açılış sanatçısı (opening act) seçimi
   - Bilet satış grafiği (günlük satış eğrisi)
   - Turne boyunca ŞEHİR BAZLI hayran artışı
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.concerts = {
    VENUES: [
      { id: "club", name: "Kulüp Sahnesi", emoji: "🎤", capacity: 600, cost: 15000, prestige: 1, minPop: 0 },
      { id: "hall", name: "Konser Salonu", emoji: "🎭", capacity: 2500, cost: 45000, prestige: 2, minPop: 18 },
      { id: "arena", name: "Arena", emoji: "🏟️", capacity: 12000, cost: 180000, prestige: 3, minPop: 42 },
      { id: "stadium", name: "Stadyum", emoji: "🏟️", capacity: 45000, cost: 600000, prestige: 4, minPop: 68 }
    ],

    CITIES: [
      { name: "İstanbul", mult: 1.30 }, { name: "Ankara", mult: 1.14 }, { name: "İzmir", mult: 1.12 },
      { name: "Bursa", mult: 1.00 }, { name: "Antalya", mult: 1.00 }, { name: "Adana", mult: 0.92 },
      { name: "Konya", mult: 0.88 }, { name: "Gaziantep", mult: 0.86 }, { name: "Trabzon", mult: 0.90 },
      { name: "Eskişehir", mult: 0.94 }, { name: "Diyarbakır", mult: 0.90 }, { name: "Mersin", mult: 0.90 }
    ],

    /* ---- sahne prodüksiyonu ---- */
    PRODUCTIONS: [
      { id: "basic", name: "Standart Sahne", emoji: "🎚️", cost: 0, draw: 1.00, prestige: 0.0, desc: "Klasik kurulum, ekstra maliyet yok." },
      { id: "light", name: "Işık + LED Ekran", emoji: "💡", cost: 40000, draw: 1.12, prestige: 0.3, desc: "Sahne daha etkileyici, katılımı artırır." },
      { id: "full", name: "Tam Prodüksiyon", emoji: "🎬", cost: 120000, draw: 1.28, prestige: 0.7, desc: "LED duvar, koreografi, canlı bant." },
      { id: "cinematic", name: "Sinematik Show", emoji: "✨", cost: 300000, draw: 1.45, prestige: 1.2, desc: "Turne düzeyi görsel şölen; prestij patlatır." }
    ],

    /* DÜZELTME (v10.9): 320 ₺ 2026 Türkiye'sinde KULÜP bileti bile
       değil (gerçek aralık: kulüp 600–1.200 ₺, salon 900–2.500 ₺,
       arena 1.800–5.000 ₺, stadyum 2.500–7.000 ₺). Taban 850 ₺. */
    BASE_TICKET: 850,

    /* v10.57 — ENFLASYON TUTARLILIĞI. Bilet tabanı, mekân/prodüksiyon
       maliyeti, merch ve açılış ücreti SABİT nominal değerlerdi; oysa
       bakım/gider kalemleri `K.econ.infl()` ile artıyordu. 43%/yıl
       enflasyonda konserler yıllar geçtikçe gerçekte bedava kâra
       dönüşüyordu. Artık hepsi enflasyon endeksiyle çarpılır. */
    infl() { return (K.econ && K.econ.infl) ? K.econ.infl() : 1; },
    baseTicket() { return Math.round(K.concerts.BASE_TICKET * K.concerts.infl()); },

    /* v10.57 — SEZON. Gerçek turnede katılım yaz aylarında zirve yapar
       (okul tatili, açık hava mekânları, festival sezonu), kışın düşer.
       Ulusal bir turne planlarken zamanlama artık gerçekten önemlidir. */
    seasonMult(day) {
      const d = U.dateObjForDay(day == null ? K.state.day : day);
      const m = d.m;
      if (m >= 6 && m <= 8) return 1.15;                     // yaz zirvesi
      if (m === 5 || m === 9) return 1.06;                   // yaz geçişi
      if (m === 12 || m === 1 || m === 2) return 0.90;       // kış durgunluğu
      return 1.0;
    },

    production(id) { return K.concerts.PRODUCTIONS.find(p => p.id === id) || K.concerts.PRODUCTIONS[0]; },
    venue(id) { return K.concerts.VENUES.find(v => v.id === id) || K.concerts.VENUES[0]; },
    city(name) { return K.concerts.CITIES.find(c => c.name === name) || K.concerts.CITIES[0]; },

    /* -----------------------------------------------------------------
       KONSER EKONOMİSİ: garanti vs kapı payı + konser merch'i
       guarantee: promatör sabit ücret verir (risksiz, tavan düşük)
       door: kapı hasılatının %62'si sanatçıya (dolu salon = büyük ödül)
       ---------------------------------------------------------------- */
    settleNumbers(attendance, price, dealType, pop, merchOn) {
      const gross = Math.round(attendance * price);
      const guarantee = Math.round(gross * U.clamp(0.5 + (pop || 0) / 220, 0.45, 0.8));
      const ticket = dealType === "guarantee" ? guarantee : Math.round(gross * 0.62);
      const merchUnits = merchOn ? Math.round(attendance * 0.18) : 0;
      const mInfl = K.concerts.infl();
      const merchGross = Math.round(merchUnits * 250 * mInfl);
      const merchCost = Math.round(merchUnits * 90 * mInfl);
      return { gross, guarantee, ticket, merchGross, merchCost, merchUnits };
    },

    /* ---- açılış sanatçısı adayları ---- */
    openers() {
      const s = K.state;
      const roster = s.label ? K.label.rosterArtists().map(a => a.id) : [];
      return K.artistList()
        .filter(a => roster.includes(a.id) || (s.relations[a.id] && s.relations[a.id].met))
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 10)
        .map(a => ({ artist: a, fee: Math.round((a.popularity * 900 + 8000) * K.concerts.infl()) }));
    },
    openerFee(id) {
      const a = K.artistById(id);
      return a ? Math.round((a.popularity * 900 + 8000) * K.concerts.infl()) : 0;
    },

    /* ---------------- katılım & gelir tahmini ---------------- */
    estimate(cityName, venueId, price, productionId, openerId, opts) {
      const s = K.state, p = s.player;
      const v = K.concerts.venue(venueId);
      const c = K.concerts.city(cityName);
      const prod = K.concerts.production(productionId);
      const opener = openerId ? K.artistById(openerId) : null;

      const pop = U.clamp(p.popularity, 0, 99);
      /* DÜZELTME (v10.9): talep artık POPÜLERLİĞE DEĞİL DİNLEYİCİYE bağlı.
         Eskiden `kapasite × (0,06 + pop/85)` idi; pop 42 (arena eşiği)
         bir oyuncu 12.000 kişilik arenada 6.600 bilet satıyordu — ki
         800 bin dinleyicisi olan bir sanatçı için bile çok iyimser.
         Artık aylık dinleyiciden türetiliyor (dönüşüm ≈ %3,5 +
         küçük sanatçıya taban):
           1 bin dinleyici → ~100 kişi (kulüp)
           47 bin → ~2.100 kişi (salon)
           1 milyon → ~37.000 kişi (arena)  */
      const monthly = Math.max(0, p.monthly || 0);
      const demandBase = (monthly * 0.035 + Math.sqrt(monthly) * 2) * c.mult * K.concerts.seasonMult();
      /* Fiyat esnekliği (v10.9): eskiden 2× fiyat katılımı %12'ye
         düşürüyordu — gerçekte bilet fiyatı iki katına çıkınca katılım
         %40-50 civarında azalır. Eğri yumuşatıldı. */
      const priceRatio = price / (K.concerts.baseTicket() * (1 + pop / 120));
      const priceFactor = U.clamp(1.3 - priceRatio * 0.5, 0.3, 1.15);
      const openerBoost = opener ? U.clamp(opener.popularity / 260, 0.03, 0.18) : 0;

      let attendance = Math.round(demandBase * priceFactor * prod.draw * (1 + openerBoost));
      attendance = U.clamp(attendance, 0, v.capacity);

      const dealType = (opts && opts.dealType) || "door";
      const merchOn = !(opts && opts.merch === false);
      const nums = K.concerts.settleNumbers(attendance, price, dealType, pop, merchOn);
      const openerFee = opener ? K.concerts.openerFee(openerId) : 0;
      const infl = K.concerts.infl();
      const venueCost = Math.round(v.cost * c.mult * infl);
      const prodCost = Math.round(prod.cost * infl);
      const cost = venueCost + prodCost + openerFee + nums.merchCost;
      const revenue = nums.ticket + nums.merchGross;
      const net = revenue - cost;
      const fame = +(attendance / v.capacity * (v.prestige + prod.prestige) * 1.35).toFixed(2);
      const hype = Math.round(attendance / 40 + v.prestige * 6 + prod.prestige * 8);
      /* DÜZELTME (v10.9): katılımcıların %22'si takip etmiyordu.
         Gerçek dönüşüm %5-12 arasıdır; prodüksiyon kalitesi üst uca taşır. */
      const fans = Math.round(attendance * (0.06 + prod.prestige * 0.03) * c.mult);

      return {
        attendance, capacity: v.capacity, revenue, cost, net, fame, hype, fans,
        openerFee, prodCost, venueCost, dealType, merch: merchOn,
        gross: nums.gross, ticket: nums.ticket, guarantee: nums.guarantee, merchGross: nums.merchGross, merchCost: nums.merchCost,
        venue: v, city: c, production: prod, opener,
        soldOut: attendance >= v.capacity * 0.97
      };
    },

    /* günlük satış planı (satış eğrisi) */
    salesCurve(target, days) {
      const w = [];
      for (let i = 0; i < days; i++) w.push(Math.pow(i + 1, 1.6));
      const sum = w.reduce((a, b) => a + b, 0) || 1;
      return w.map(x => Math.round((x / sum) * target));
    },

    /* ---------------- konser planla ---------------- */
    schedule(cityName, venueId, price, daysAhead, productionId, openerId, dealType, merch) {
      const s = K.state, p = s.player;
      const v = K.concerts.venue(venueId);
      const prod = K.concerts.production(productionId);
      if (p.popularity < v.minPop) { K.toast("Popülerlik yetersiz", `${v.name} için en az ${v.minPop} popülerlik gerekli.`, "warn"); return false; }

      const est = K.concerts.estimate(cityName, venueId, price, productionId, openerId, { dealType, merch });
      const advance = Math.round(est.cost * 0.4);
      if (!K.economy.canAfford(advance)) { K.toast("Yetersiz bakiye", `Ön ödeme ${U.money(advance)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(advance, "concert_advance");

      const day = s.day + (daysAhead || 10);
      const target = Math.max(1, Math.round(est.attendance * U.rand(0.9, 1.08)));
      const plan = K.concerts.salesCurve(target, Math.max(1, daysAhead || 10));
      const presale = Math.round(target * 0.08);

      s.concerts = s.concerts || [];
      s.concerts.push({
        id: U.uid("cn"), city: cityName, venueId, price,
        productionId: prod.id, openerId: openerId || null,
        dealType: est.dealType, merch: est.merch,
        cost: est.cost, advance, day,
        scheduledDay: s.day, target, dailyPlan: plan,
        capacity: v.capacity, sold: presale, salesHistory: [presale],
        status: "planlandı", tour: false
      });

      if (openerId) {
        const a = K.artistById(openerId);
        if (a && K.relation(openerId).met) K.relations.addAffinity(openerId, 3, "acilis_act", { uncapped: true });
        if (a) K.relations.pushArtistMessage(openerId, `Açılışımı yapmaktan onur duyarım kardeşim. Sahneyi ısıtacağım!`, "system");
      }

      K.toast("🎫 Konser planlandı", `${cityName} · ${v.name} · ${prod.name} · Gün ${day}`, "ok");
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- turne ---------------- */
    startTour(cityNames, venueId, price, gapDays, productionId, openerId, dealType, merch) {
      const s = K.state;
      if (!cityNames.length) return false;
      const v = K.concerts.venue(venueId);
      const prod = K.concerts.production(productionId);
      const openerFeeAll = openerId ? K.concerts.openerFee(openerId) * cityNames.length : 0;
      const totalAdvance = Math.round((v.cost * 0.4 + prod.cost * 0.4) * cityNames.length + openerFeeAll);
      if (!K.economy.canAfford(totalAdvance)) { K.toast("Yetersiz bakiye", `Turne ön ödemesi ${U.money(totalAdvance)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(totalAdvance, "tour_advance");

      const gap = gapDays || 3;
      const queue = cityNames.map((c, i) => ({ city: c, day: s.day + 7 + i * gap }));
      s.tour = {
        venueId, price, productionId: prod.id, openerId: openerId || null,
        dealType: dealType || "door", merch: merch !== false,
        cities: cityNames, queue, startedDay: s.day,
        gross: 0, attendance: 0, shows: 0, followers: 0, log: []
      };
      K.toast("🚌 Turne başladı", `${cityNames.length} şehir · ${prod.name} · ilk durak ${queue[0].city} (Gün ${queue[0].day})`, "ok");
      K.save(); K.refresh();
      return true;
    },

    tourProgress() {
      const t = K.state.tour;
      if (!t) return null;
      return {
        total: t.cities.length, done: t.shows, next: t.queue[0] || null,
        gross: t.gross, attendance: t.attendance, followers: t.followers || 0,
        log: t.log || [], production: K.concerts.production(t.productionId)
      };
    },

    cancelTour() {
      if (!K.state.tour) return;
      K.state.tour = null;
      K.toast("Turne iptal edildi", "Kalan şehirler iptal edildi.", "warn");
      K.save(); K.refresh();
    },

    /* ---------------- günlük çözümleme ---------------- */
    tick() {
      const s = K.state;

      (s.concerts || []).forEach(cn => {
        if (cn.status !== "planlandı") return;

        // --- bilet satışı ilerlet (etkinlikten önceki günler) ---
        if (s.day < cn.day) {
          const idx = s.day - cn.scheduledDay - 1;
          const inc = (cn.dailyPlan && cn.dailyPlan[idx] != null) ? cn.dailyPlan[idx] : Math.round(cn.target * 0.05);
          cn.sold = Math.min(cn.capacity, (cn.sold || 0) + inc);
          cn.salesHistory = cn.salesHistory || [];
          cn.salesHistory.push(cn.sold);
          if (cn.sold >= cn.capacity * 0.995 && !cn.soldOutFlag) {
            cn.soldOutFlag = true;
            K.toast("🎟️ SOLD OUT!", `${cn.city} konseri tamamen satıldı!`, "ok");
          }
        }

        // --- etkinlik günü: sonuçlandır ---
        if (s.day >= cn.day) {
          const est = K.concerts.estimate(cn.city, cn.venueId, cn.price, cn.productionId, cn.openerId, { dealType: cn.dealType || "door", merch: cn.merch !== false });
          const attendance = U.clamp(Math.max(cn.sold || 0, Math.round(est.attendance * 0.65)), 0, cn.capacity);
          const nums = K.concerts.settleNumbers(attendance, cn.price, cn.dealType || "door", s.player.popularity, cn.merch !== false);
          const grossRev = nums.ticket + nums.merchGross;
          const cut = (K.career && K.career.labelCut) ? K.career.labelCut("touring", grossRev) : 0;
          const revenue = Math.max(0, grossRev - cut);
          K.economy.earn(revenue, "concert");
          if (cut > 0) K.toast("🏢 360 payı", `Şirket konser gelirinden ${U.money(cut)} aldı.`, "warn");
          /* v10.29 — AKIL SAĞLIĞI: sahne performansı stresten etkilenir.
             Dağınık kafayla çıkılan sahne daha az şöhret/hayran kazandırır.
             (Bilet satışı etkilenmez — salon doludur; kazanç ve izlenim düşer.) */
          const perf = (K.mental && K.mental.performanceMult) ? K.mental.performanceMult() : 1;
          const fameGain = +(est.fame * perf).toFixed(2);
          K.game.addFame(fameGain);
          s.player.reputation = Math.min(100, s.player.reputation + est.fame * 0.6 * perf);
          const gained = Math.round(est.fans * (attendance / Math.max(1, est.attendance)) * perf);
          s.player.ig += Math.round(gained * 0.6);
          s.player.tiktok += Math.round(gained * 0.4);
          if (perf < 0.85) {
            s.notifications = (s.notifications || []).concat([{
              title: "🎤 Sahne performansın düşüktü",
              msg: `${cn.city} konserinde dağınıktın (stres ${Math.round(s.player.stress)}/100) — şöhret ve hayran kazancı %${Math.round((1 - perf) * 100)} azaldı.`,
              kind: "warn", day: s.day
            }]).slice(-60);
          }
          if (cn.openerId) {
            const a = K.artistById(cn.openerId);
            if (a) a.popularity = U.clamp(a.popularity + 0.6, 0, 99);
          }
          cn.status = "tamamlandı";
          cn.result = { attendance, revenue, gross: grossRev, labelCut: cut, merch: nums.merchGross, fame: fameGain, followers: gained, performance: +perf.toFixed(2) };
          K.toast("🎤 Konser tamamlandı",
            `${cn.city} · ${U.fmt(attendance)} kişi · ${U.money(revenue)} · +${U.fmt(gained)} hayran${cn.dealType === "guarantee" ? " · garanti" : ""}` +
            (perf < 0.85 ? " · ⚠️ düşük performans" : ""), perf < 0.85 ? "warn" : "ok");
        }
      });

      // tamamlananları kısa süre tut
      s.concerts = (s.concerts || []).filter(cn => cn.status !== "tamamlandı" || (s.day - cn.day) < 5);

      // --- turne durağı ---
      if (s.tour && s.tour.queue.length && s.day >= s.tour.queue[0].day) {
        const stop = s.tour.queue.shift();
        const est = K.concerts.estimate(stop.city, s.tour.venueId, s.tour.price, s.tour.productionId, s.tour.openerId, { dealType: s.tour.dealType || "door", merch: s.tour.merch !== false });
        const nums = K.concerts.settleNumbers(est.attendance, s.tour.price, s.tour.dealType || "door", s.player.popularity, s.tour.merch !== false);
        const grossRev = nums.ticket + nums.merchGross;
        const cut = (K.career && K.career.labelCut) ? K.career.labelCut("touring", grossRev) : 0;
        const revenue = Math.max(0, grossRev - cut);
        /* v10.29 — turne durağında da sahne performansı stresten etkilenir */
        const perfT = (K.mental && K.mental.performanceMult) ? K.mental.performanceMult() : 1;
        const fans = Math.round(est.fans * perfT);
        K.economy.earn(revenue, "tour");
        s.tour.gross += revenue;

        /* DÜZELTME (v10.9): turne sabit gideri YOKTU.
           Gerçek turnede ekip, otobüs, konaklama her durak için sabit maliyet
           doğurur; eskiden sadece ön ödeme vardı ve turne bedava kâr demekti. */
        const showCost = Math.round((K.concerts.venue(s.tour.venueId).prestige * 22000 + 18000)
          * (K.econ ? K.econ.infl() : 1));
        K.economy.spend(Math.min(showCost, K.state.balance), "tour_cost");
        s.tour.totalCost = (s.tour.totalCost || 0) + showCost;
        s.tour.attendance += est.attendance;
        s.tour.followers = (s.tour.followers || 0) + fans;
        s.tour.shows++;
        K.game.addFame(+(est.fame * perfT).toFixed(2));
        s.player.ig += Math.round(fans * 0.6);
        s.player.tiktok += Math.round(fans * 0.4);

        // şehir bazlı kayıt
        s.tour.log = s.tour.log || [];
        s.tour.log.push({
          city: stop.city, day: stop.day,
          attendance: est.attendance, capacity: est.capacity,
          revenue, followers: fans,
          performance: +perfT.toFixed(2),
          production: K.concerts.production(s.tour.productionId).name
        });

        K.toast("🚌 Turne durağı", `${stop.city} · ${U.fmt(est.attendance)} kişi · +${U.fmt(fans)} hayran` +
          (perfT < 0.85 ? " · ⚠️ düşük performans" : ""), perfT < 0.85 ? "warn" : "ok");

        if (!s.tour.queue.length) {
          K.toast("🏁 Turne bitti",
            `${s.tour.shows} şehir · ${U.money(s.tour.gross)} · +${U.fmt(s.tour.followers)} hayran`, "ok");
          s.tour = null;
        }
      }
    },

    /* ---------------- grafik verisi ---------------- */
    salesChart(concert) {
      if (!concert || !concert.salesHistory) return [];
      return concert.salesHistory.slice();
    },
    sellThrough(concert) {
      if (!concert) return 0;
      return Math.round(((concert.sold || 0) / Math.max(1, concert.capacity)) * 100);
    },
    remainingDays(concert) {
      return Math.max(0, concert.day - K.state.day);
    }
  };
})(window.K);
