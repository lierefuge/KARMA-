/* ============================================================
   KARMA — systems/economy.js
   Para akışı. Günlük otomatik gelir YOK.
   Gelir yalnızca dinlenme telifi, şirket geliri ve tekliflerden gelir.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.economy = {
    canAfford(amount) { return K.state.balance >= amount; },

    /* son ayın muhasebe raporu */
    report() { return (K.state.player && K.state.player.lastFinance) || null; },

    /* aylık net akış tahmini (Kariyer sekmesi) */
    forecast() {
      const p = K.state.player;
      const monthly = (p.songs || []).reduce((n, x) => n + (x.lastDaily || 0), 0) * 30;
      const rates = K.ECON.streamRates;
      const gross = monthly * ((rates.spotify + rates.apple + rates.youtube) / 3);
      return Math.round(gross);
    },

    spend(amount, reason) {
      if (!K.economy.canAfford(amount)) return false;
      K.state.balance -= amount;
      K.bus.emit("money", { amount: -amount, reason });
      return true;
    },

    earn(amount, reason) {
      K.state.balance += amount;
      K.state.player.totalEarned += amount;
      if (amount > 0) K.state.player.monthIncome = (K.state.player.monthIncome || 0) + amount;
      K.bus.emit("money", { amount, reason });
      return true;
    },

    /* ---------------- AYLIK TELİF ÖDEMESİ ----------------
       Her platformun dinlenme başına ücreti vardır ve ödeme
       AYLIK yapılır. Sadece O AYIN yeni dinlenmeleri ödenir;
       geçmiş toplam dinlenmeler tekrar ödenmez. */
    settleMonth() {
      const s = K.state, p = s.player;
      const rates = K.ECON.streamRates;
      const dm = K.settings ? K.settings.diffMult().income : 1;

      let sp = 0, ap = 0, yt = 0, artistPool = 0, producerCutTotal = 0, featureCutTotal = 0;
      let labelPct = p.labelId ? ((K.labelById(p.labelId) || {}).royalty || 50) : 0;
      if (K.team && K.team.bonus) labelPct = Math.max(0, labelPct - K.team.bonus().lawyerCut * 100);   // avukat şirket payını düşürür
      p.songs.forEach(song => {
        const m = song.month || { spotify: 0, apple: 0, youtube: 0 };
        const ssp = m.spotify || 0, sap = m.apple || 0, syt = m.youtube || 0;
        if (!song.masterSold) {          // satılan katalog master'ı → telif alıcıya gider
          sp += ssp; ap += sap; yt += syt;
          const sg = (ssp * rates.spotify + sap * rates.apple + syt * rates.youtube) * dm;
          let pool = sg * (1 - labelPct / 100);
          // prodüktör puanı (ör. exclusive beat %3)
          const pp = (song.producerPoints || 0) / 100;
          if (pp > 0) { const cut = pool * pp; pool -= cut; producerCutTotal += cut; }
          // feature / söz paylaşımı (ör. %50 → sanatçı payı yarıya iner)
          const share = (song.revenueShare != null) ? song.revenueShare : 1;
          if (share < 1) { const cut = pool * (1 - share); pool -= cut; featureCutTotal += cut; }
          artistPool += pool;
        }
        song.month = { spotify: 0, apple: 0, youtube: 0 };   // sıfırla → birikmez
        song.monthPayout = 0;
      });

      sp = Math.round(sp); ap = Math.round(ap); yt = Math.round(yt);
      const gross = (sp * rates.spotify + ap * rates.apple + yt * rates.youtube) * dm;
      const labelCut = Math.round(gross * labelPct / 100);
      artistPool = Math.round(artistPool);
      producerCutTotal = Math.round(producerCutTotal);
      featureCutTotal = Math.round(featureCutTotal);

      /* --- AVANS RECOUP: sanatçıya kalan pay ÖNCE avans borcunu kapatır --- */
      let recoup = 0, recoupedNow = false;
      const deal = p.labelDeal;
      if (deal && (deal.recouped || 0) < deal.advance) {
        recoup = Math.min(artistPool, deal.advance - (deal.recouped || 0));
        deal.recouped = (deal.recouped || 0) + recoup;
        if (deal.recouped >= deal.advance) { recoupedNow = true; deal.recoupedDay = s.day; }
      }
      const net = Math.max(0, artistPool - recoup);

      if (net > 0) K.economy.earn(net, "royalty_month");
      p.totalStreamRevenue = (p.totalStreamRevenue || 0) + net;

      /* PUBLISHING (yayın hakkı) — telif brütünün ayrı bir kalemi */
      let publishing = 0;
      if (K.catalog && K.catalog.publishingIncome && gross > 0) {
        publishing = K.catalog.publishingIncome(gross);
      }

      if (recoup > 0) {
        const left = deal ? Math.max(0, deal.advance - deal.recouped) : 0;
        K.toast("🏦 Avans geri ödemesi", `Teliften ${U.money(recoup)} kesildi · kalan avans ${U.money(left)}`, recoupedNow ? "ok" : "warn");
        if (recoupedNow) {
          s.notifications = (s.notifications || []).concat([{
            title: "🏦 Avans kapandı", msg: "Avansın tamamı geri ödendi. Bundan sonra telif doğrudan sana geliyor.", kind: "ok", day: s.day
          }]).slice(-60);
        }
      }

      const payout = {
        day: s.day, period: K.ECON.payoutPeriodDays,
        spotify: sp, apple: ap, youtube: yt,
        gross: Math.round(gross), net, labelCut, recoup, publishing,
        producerCut: producerCutTotal, featureCut: featureCutTotal,
        recoupLeft: deal ? Math.max(0, deal.advance - (deal.recouped || 0)) : 0
      };
      p.payouts = p.payouts || [];
      p.payouts.unshift(payout);
      p.payouts = p.payouts.slice(0, 24);

      if (sp + ap + yt > 0) {
        K.toast("💰 Telif ödemesi", `Spotify ${U.fmt(sp)} · Apple ${U.fmt(ap)} · YT ${U.fmt(yt)} → net ${U.money(net)}`, net > 0 ? "ok" : "warn");
      } else {
        K.toast("💰 Telif ödemesi", "Bu ay dinlenme yok — ödeme yok.", "warn");
      }
      return payout;
    },

    /* ---------------- AYLIK GİDER + VERGİ (gerçekçilik) ----------------
       Ay dönümünde sabit giderler (kira, ekipman, personel maaşı,
       katalog bakımı) ve gelir vergisi düşülür. Ödenemezse BORÇ oluşur. */
    chargeMonthly() {
      const s = K.state, p = s.player;
      let staffSal = 0;
      if (s.label && K.label && K.label.STAFF) {
        Object.keys(K.label.STAFF).forEach(r => {
          const lvl = (s.staff && s.staff[r]) || 0;
          if (lvl) staffSal += lvl * Math.round(K.label.STAFF[r].base * 0.06);
        });
      }
      /* kariyer seviyesi: genç/tanınmayan sanatçı az masraf eder,
         yıldızlaştıkça hayat pahalanır (ekip, stüdyo, şehir). */
      const lvl = U.clamp(
        Math.floor((p.popularity || 0) / 12) + Math.floor((K.fans ? K.fans.followers() : 0) / 200000),
        0, 10
      );
      const teamSal = (K.team && K.team.salaryTotal) ? K.team.salaryTotal() : 0;
      const upkeep = Math.round(
        (K.ECON.monthlyBase + K.ECON.equipmentUpkeep) * (1 + lvl * 0.8)
        + staffSal
        + teamSal
        + (p.songs || []).length * K.ECON.perSongUpkeep
      );

      /* önce mevcut borcun yarısını kapat */
      if (p.debt > 0 && s.balance > 0) {
        const pay = Math.min(p.debt, Math.round(s.balance * 0.5));
        p.debt -= pay; s.balance -= pay;
      }

      /* ACEMİ KORUMASI: kariyer henüz başlamadıysa sabit gider yok
         (genç sanatçı ailesiyle yaşar, ekipmanı yoktur). */
      const beginner = (p.popularity || 0) < (K.ECON.costStartPop || 5) &&
        (K.fans ? K.fans.followers() : 0) < (K.ECON.costStartFollowers || 5000);
      if (beginner) {
        p.monthIncome = 0;
        return { upkeep: 0, tax: 0, debt: p.debt || 0, beginner: true };
      }

      /* gider */
      let short = 0;
      if (s.balance >= upkeep) s.balance -= upkeep;
      else { short = upkeep - s.balance; s.balance = 0; p.debt += short; }

      /* vergi (bu ayın geliri üzerinden) */
      const inc = p.monthIncome || 0;
      const taxable = Math.max(0, inc - K.ECON.taxFreeMonthly);
      const tax = Math.round(taxable * K.ECON.taxRate);
      let taxShort = 0;
      if (tax > 0) {
        if (s.balance >= tax) s.balance -= tax;
        else { taxShort = tax - s.balance; s.balance = 0; p.debt += taxShort; }
      }
      /* MUHASEBE RAPORU (Kariyer sekmesinde görünür) */
      p.lastFinance = { day: s.day, income: inc, upkeep, tax, net: inc - upkeep - tax, debt: p.debt || 0 };
      p.monthIncome = 0;

      const bad = (short + taxShort) > 0 || p.debt > 0;
      s.notifications = (s.notifications || []).concat([{
        title: "🧾 Aylık gider",
        msg: `Gider ${U.money(upkeep)} · Vergi ${U.money(tax)}${p.debt > 0 ? " · ⚠️ borç " + U.money(p.debt) : ""}`,
        kind: bad ? "bad" : "", day: s.day
      }]).slice(-60);
      K.toast("🧾 Aylık gider", `Gider ${U.money(upkeep)} · Vergi ${U.money(tax)}`, bad ? "bad" : "warn");
      K.bus.emit("money", { amount: -(upkeep + tax), reason: "monthly" });
      return { upkeep, tax, debt: p.debt };
    },

    /* günlük şirket kârı (oyuncunun label'ı varsa) */
    labelDailyNet() {
      const s = K.state;
      if (!s.label) return 0;
      const rosterStreams = (s.label.monthlyStreams || 0) / 30;
      const gross = rosterStreams * K.ECON.royaltyPerStream;
      const share = 1 - (s.label.royalty || 30) / 100;  // şirketin payı
      const staffMult = 1 + ((s.staff && s.staff.manager) || 0) * 0.12;
      const costs = (s.label.roster || []).length * 900; // personel/gider
      return Math.max(0, gross * share * staffMult - costs);
    }
  };
})(window.K);
