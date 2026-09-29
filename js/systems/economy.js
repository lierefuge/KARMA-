/* ============================================================
   KARMA — systems/economy.js
   Para akışı. Günlük otomatik gelir YOK.
   Gelir yalnızca dinlenme telifi, şirket geliri ve tekliflerden gelir.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* ============================================================
     K.econ — v10 GERÇEKLİK MOTORU
     · kur (USD/₺) dalgalanması   → telif geliri kurla ölçeklenir
     · enflasyon endeksi          → maliyet VE telif nominal artar
     · platform başına dinlenme ücreti
     · 30 saniye eşiği            → atlanan çalma gelir sayılmaz
     · kademeli gelir vergisi
     · borç gecikme faizi
     ============================================================ */
  K.econ = {
    STORES: ["spotify", "apple", "youtube", "other"],

    ensure() {
      const s = K.state;
      s.econ = s.econ || {};
      const e = s.econ;
      if (e.fx == null) e.fx = K.ECON.baseFx;
      if (e.inflationIndex == null) e.inflationIndex = 1;
      if (e.startDay == null) e.startDay = s.day;
      return e;
    },

    /* 1 USD'nin oyun başına göre kaç katı ₺ ettiği */
    fxFactor() { return K.econ.ensure().fx / K.ECON.baseFx; },

    /* enflasyon endeksi (1.00 = oyun başı) */
    infl() { return K.econ.ensure().inflationIndex; },

    /* bir mağazanın GÜNCEL ₺/dinlenme ücreti
       ------------------------------------------------------------
       DÜZELTME (v10.7): `streamRates` GERÇEK DÜNYA USD değerleridir
       (Spotify ≈ $0,005 · Apple ≈ $0,015 · YouTube ≈ $0,008). Kur
       dönüşümü (USD → ₺) eksikti; yalnızca `fxFactor()` (= fx/baseFx,
       boyutsuz) uygulanıyordu. Bu yüzden telif geliri tam **baseFx
       (32) katı eksik** ödeniyordu: 1M dinlenme ≈ ₺5.000 yerine
       gerçekçi ≈ ₺160.000. Artık USD değeri doğrudan güncel kura
       çarpılır, sonra enflasyonla nominal olarak büyür. */
    rate(store) {
      const e = K.econ.ensure();
      return (K.ECON.streamRates[store] || 0) * e.fx * K.econ.infl();
    },

    /* ---- 30 SANİYE EŞİĞİ ----
       Dinlenmenin gelir sayılan oranı. Kalite, giriş uzunluğu ve
       hook gücü belirler; feature'lı şarkı daha az atlanır. */
    skipRateFor(song) {
      const q = (song && song.quality != null) ? song.quality : 50;
      const intro = (song && song.introLength != null) ? song.introLength : 8;
      const hook = (song && song.hookStrength != null) ? song.hookStrength : (song && song.quality) || 55;
      let r = K.ECON.skipRateMax
        - (q / 100) * (K.ECON.skipRateMax - K.ECON.skipRateMin) * 1.35
        - (hook / 100) * 0.10
        + Math.max(0, intro - 8) * 0.012
        - (song && song.featureArtistId ? 0.05 : 0);
      return U.clamp(r, K.ECON.skipRateMin, K.ECON.skipRateMax);
    },

    /* gelir sayılan dinlenme çarpanı (1 − atlama) */
    billable(song) { return 1 - K.econ.skipRateFor(song); },

    /* ---- KADEMELİ GELİR VERGİSİ ---- */
    taxFor(income) {
      let left = Math.max(0, income), prev = 0, tax = 0;
      const br = K.ECON.taxBrackets || [];
      for (let i = 0; i < br.length; i++) {
        const span = br[i].upTo - prev;
        if (span <= 0) { prev = br[i].upTo; continue; }
        const part = Math.min(left, span);
        if (part <= 0) break;
        tax += part * br[i].rate;
        left -= part;
        prev = br[i].upTo;
        if (left <= 0) break;
      }
      return Math.round(tax);
    },

    taxRateFor(income) { return income > 0 ? K.econ.taxFor(income) / income : 0; },

    /* hangi dilimde olduğumuz (muhasebe paneli) */
    bracketFor(income) {
      const br = K.ECON.taxBrackets || [];
      for (let i = 0; i < br.length; i++) if (income <= br[i].upTo) return br[i];
      return br[br.length - 1] || { upTo: Infinity, rate: 0 };
    },

    /* ---- AYLIK EKONOMİ ADIMI ----
       enflasyon ilerler, kur sürüklenir (ara sıra şok), borca faiz işler. */
    monthlyTick() {
      const s = K.state, p = s.player, e = K.econ.ensure();
      e.inflationIndex *= (1 + K.ECON.inflationMonthly);
      let drift = U.rand(K.ECON.fxMonthlyDrift * 0.35, K.ECON.fxMonthlyDrift * 1.75);
      let shock = false;
      if (U.chance(K.ECON.fxShockChance)) {
        drift += U.rand(K.ECON.fxShockMin, K.ECON.fxShockMax);
        shock = true;
      }
      e.fx *= (1 + drift);
      e.lastDrift = drift;
      e.lastShock = shock;

      let interest = 0;
      if (p.debt > 0) {
        interest = Math.round(p.debt * K.ECON.debtPenaltyMonthly);
        p.debt += interest;
        e.lastDebtInterest = interest;
        s.notifications = (s.notifications || []).concat([{
          title: "\u{1F3E6} Borç faizi",
          msg: `Ödenmeyen borca ${U.money(interest)} gecikme faizi işledi · toplam borç ${U.money(p.debt)}`,
          kind: "bad", day: s.day
        }]).slice(-60);
      } else {
        e.lastDebtInterest = 0;
      }
      return { inflation: K.ECON.inflationMonthly, fxDrift: drift, shock, debtInterest: interest, fx: e.fx };
    },

    /* ---- KÂR MARJI ----
       (gelir − gider) / gelir. Negatifse iş zarar ediyor demektir. */
    margin(income, cost) {
      if (!income || income <= 0) return cost > 0 ? -1 : 0;
      return (income - cost) / income;
    }
  };

  K.economy = {
    canAfford(amount) { return K.state.balance >= amount; },

    /* son ayın muhasebe raporu */
    report() { return (K.state.player && K.state.player.lastFinance) || null; },

    /* aylık net akış tahmini (Kariyer sekmesi)
       v10: 30 sn eşiği, kur ve enflasyon hesaba katılır. */
    forecast() {
      const p = K.state.player;
      const songs = p.songs || [];
      let gross = 0;
      songs.forEach(song => {
        const bill = K.econ.billable(song);
        const perDay = (song.lastDaily || 0) * 30 * bill;
        const pl = song.platforms || { spotify: 0.46, apple: 0.19, youtube: 0.28, other: 0.07 };
        K.econ.STORES.forEach(st => { gross += perDay * (pl[st] || 0) * K.econ.rate(st); });
      });
      return Math.round(gross);
    },

    /* vadesi gelmemiş (rapor bekleyen) telif — "yolda olan para" */
    pending() {
      const p = K.state.player;
      const out = { spotify: 0, apple: 0, youtube: 0, other: 0, value: 0 };
      (p.royalties || []).forEach(r => {
        K.econ.STORES.forEach(st => {
          if (r.paid && r.paid[st]) return;
          const n = (r.streams && r.streams[st]) || 0;
          out[st] += n;
          out.value += n * K.econ.rate(st);
        });
      });
      out.value = Math.round(out.value);
      out.streams = Math.round(out.spotify + out.apple + out.youtube + out.other);
      return out;
    },

    /* kur + enflasyon + borç özeti (muhasebe paneli) */
    climate() {
      const e = K.econ.ensure();
      return {
        fx: e.fx,
        fxDrift: e.lastDrift || 0,
        shock: !!e.lastShock,
        inflationIndex: e.inflationIndex,
        debtInterest: e.lastDebtInterest || 0
      };
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

    /* ---------------- AYLIK TELİF ÖDEMESİ (v10 — GECİKMELİ) ----------------
       Gerçek dünyada mağazalar dinlenmeyi geç raporlar, ödeme gecikir:
         Spotify 60 gün · Apple 45 gün · YouTube 75 gün · diğer mağazalar 55 gün
       Bu yüzden dinlenme önce RAPOR KUYRUĞUNA girer; vadesi gelince ödenir.
       30 SANİYE EŞİĞİ: atlanan çalma gelir sayılmaz (bkz. K.econ.billable). */
    settleMonth() {
      const s = K.state, p = s.player;
      const dm = K.settings ? K.settings.diffMult().income : 1;
      const lag = K.ECON.payoutLag;
      K.econ.ensure();

      let labelPct = p.labelId ? ((K.labelById(p.labelId) || {}).royalty || 50) : 0;
      if (K.team && K.team.bonus) labelPct = Math.max(0, labelPct - K.team.bonus().lawyerCut * 100);

      /* ---- 1) BU AYIN dinlenmesini rapor kuyruğuna al (henüz para yok) ---- */
      p.royalties = p.royalties || [];
      let queued = 0;
      p.songs.forEach(song => {
        const m = song.month || {};
        const single = { spotify: 0, apple: 0, youtube: 0, other: 0 };
        const bill = K.econ.billable(song);              // 30 sn eşiği
        K.econ.STORES.forEach(st => { single[st] = (m[st] || 0) * bill; });
        const total = K.econ.STORES.reduce((n, st) => n + single[st], 0);
        song.month = { spotify: 0, apple: 0, youtube: 0, other: 0 };   // sıfırla → birikmez
        song.monthPayout = 0;
        if (total > 0.5) {
          queued += total;
          p.royalties.push({
            songId: song.id, reportedDay: s.day, streams: single,
            due: {
              spotify: s.day + lag.spotify, apple: s.day + lag.apple,
              youtube: s.day + lag.youtube, other: s.day + lag.other
            },
            paid: { spotify: false, apple: false, youtube: false, other: false }
          });
        }
      });
      if (queued > 0) {
        s.notifications = (s.notifications || []).concat([{
          title: "📊 Rapor gönderildi",
          msg: `${U.fmt(Math.round(queued))} dinlenme mağazalara raporlandı. Ödeme ${lag.spotify}–${lag.youtube} gün içinde yatar.`,
          kind: "", day: s.day
        }]).slice(-60);
      }

      /* ---- 2) VADESİ GELEN raporları tahsil et ---- */
      const songById = {};
      p.songs.forEach(x => { songById[x.id] = x; });
      const paidN = { spotify: 0, apple: 0, youtube: 0, other: 0 };
      const grossBy = { spotify: 0, apple: 0, youtube: 0, other: 0 };
      let artistPool = 0, producerCutTotal = 0, featureCutTotal = 0, masterCutTotal = 0, waiting = 0;

      p.royalties.forEach(r => {
        const song = songById[r.songId];
        K.econ.STORES.forEach(st => {
          if (r.paid[st]) return;
          if (s.day < r.due[st]) { waiting += (r.streams[st] || 0); return; }
          r.paid[st] = true;
          const n = r.streams[st] || 0;
          if (n <= 0) return;
          paidN[st] += n;
          const g = n * K.econ.rate(st) * dm;            // kur + enflasyon burada uygulanır
          grossBy[st] += g;
          if (song && song.masterSold) { masterCutTotal += g; return; }   // master satıldı → telif alıcının
          let pool = g * (1 - labelPct / 100);
          const pp = ((song && song.producerPoints) || 0) / 100;
          if (pp > 0) { const c = pool * pp; pool -= c; producerCutTotal += c; }
          const share = (song && song.revenueShare != null) ? song.revenueShare : 1;
          if (share < 1) { const c = pool * (1 - share); pool -= c; featureCutTotal += c; }
          artistPool += pool;
        });
      });
      p.royalties = p.royalties.filter(r => K.econ.STORES.some(st => !r.paid[st]));
      if (p.royalties.length > 500) p.royalties = p.royalties.slice(-500);

      const sp = Math.round(paidN.spotify), ap = Math.round(paidN.apple);
      const yt = Math.round(paidN.youtube), ot = Math.round(paidN.other);
      const gross = grossBy.spotify + grossBy.apple + grossBy.youtube + grossBy.other;
      const labelCut = Math.round(gross * labelPct / 100);
      artistPool = Math.round(artistPool);
      producerCutTotal = Math.round(producerCutTotal);
      featureCutTotal = Math.round(featureCutTotal);
      masterCutTotal = Math.round(masterCutTotal);

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

      const pend = K.economy.pending();
      const payout = {
        day: s.day, period: K.ECON.payoutPeriodDays,
        spotify: sp, apple: ap, youtube: yt, other: ot,
        gross: Math.round(gross), net, labelCut, recoup, publishing,
        producerCut: producerCutTotal, featureCut: featureCutTotal,
        masterCut: masterCutTotal,
        queued: Math.round(queued), waiting: Math.round(waiting),
        pendingValue: pend.value, pendingStreams: pend.streams,
        fx: K.econ.ensure().fx, infl: K.econ.infl(),
        recoupLeft: deal ? Math.max(0, deal.advance - (deal.recouped || 0)) : 0
      };
      p.payouts = p.payouts || [];
      p.payouts.unshift(payout);
      p.payouts = p.payouts.slice(0, 24);

      if (sp + ap + yt + ot > 0) {
        K.toast("💰 Telif ödemesi", `Spotify ${U.fmt(sp)} · Apple ${U.fmt(ap)} · YT ${U.fmt(yt)} → net ${U.money(net)}`, net > 0 ? "ok" : "warn");
      } else if (pend.streams > 0) {
        K.toast("💰 Telif ödemesi", `Bu ay tahsilat yok — ${U.fmt(pend.streams)} dinlenme rapor bekliyor (${U.money(pend.value)} yolda).`, "warn");
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
      /* v10: tüm gider kalemleri ENFLASYON endeksiyle çarpılır —
         yıllar geçtikçe aynı hayat daha pahalıya gelir. */
      const infl = K.econ.infl();
      /* KATALOG BAKIMI — DÜZELTME (v10.7)
         Eskiden `şarkı sayısı × perSongUpkeep` idi: katalog büyüdükçe
         gider DOĞRUSAL ve SINIRSIZ artıyor, ama şarkı başına telif
         zamanla düşüyordu. Sonuç: 100 şarkılık bir katalog saf yüke
         dönüşüp oyuncuyu borç sarmalına sokuyordu (simülasyonda sabit
         giderler enflasyonun 8-17 katı hızla artıyordu). Artık katalog
         bakımı o ayın gelirinin %25'ini geçemez; bir taban vardır ki
         büyük katalog yine de bir şeye mal olsun. */
      const baseCost = ((K.ECON.monthlyBase + K.ECON.equipmentUpkeep) * (1 + lvl * 0.8)
        + staffSal + teamSal) * infl;
      const catalogRaw = (p.songs || []).length * K.ECON.perSongUpkeep * infl;
      const monthInc = p.monthIncome || 0;
      const catalogCap = Math.max(K.ECON.catalogUpkeepFloor, monthInc * K.ECON.catalogUpkeepMaxShare);
      const catalogCost = Math.min(catalogRaw, catalogCap);
      const upkeepRaw = Math.round(baseCost / infl) + Math.round(catalogRaw / infl);
      const upkeep = Math.round(baseCost + catalogCost);

      /* önce mevcut borcun yarısını kapat */
      if (p.debt > 0 && s.balance > 0) {
        const pay = Math.min(p.debt, Math.round(s.balance * 0.5));
        p.debt -= pay; s.balance -= pay;
      }

      /* ACEMİ KORUMASI: kariyer henüz başlamadıysa sabit gider yok
         (genç sanatçı ailesiyle yaşar, ekipmanı yoktur).
         DÜZELTME (v10.7): koruma artık SÜRELİ.
         Eskiden koşul yalnızca popülerlik + takipçiydi; bu yüzden hiç
         ünlenmeyen bir oyuncu 420 gün boyunca HİÇ gider ödemiyordu
         (simülasyonda 420 günde sadece 32 aylık gider kaydı vardı).
         Aile desteği erken oyunun kolaylığı olmalı, kalıcı sığınağı
         değil — artık ilk `beginnerGraceDays` günle sınırlı. */
      const beginner = (p.popularity || 0) < (K.ECON.costStartPop || 5) &&
        (K.fans ? K.fans.followers() : 0) < (K.ECON.costStartFollowers || 5000) &&
        (s.day - K.econ.ensure().startDay) < (K.ECON.beginnerGraceDays || 120);
      if (beginner) {
        p.monthIncome = 0;
        return { upkeep: 0, tax: 0, debt: p.debt || 0, beginner: true };
      }

      /* gider */
      let short = 0;
      if (s.balance >= upkeep) s.balance -= upkeep;
      else { short = upkeep - s.balance; s.balance = 0; p.debt += short; }

      /* vergi — KADEMELİ DİLİM (v10): gelir arttıkça efektif oran yükselir */
      const inc = p.monthIncome || 0;
      const tax = K.econ.taxFor(inc);
      const effRate = K.econ.taxRateFor(inc);
      const bracket = K.econ.bracketFor(inc);
      let taxShort = 0;
      if (tax > 0) {
        if (s.balance >= tax) s.balance -= tax;
        else { taxShort = tax - s.balance; s.balance = 0; p.debt += taxShort; }
      }

      /* ---- v10: KÂR MARJI + kur/enflasyon/borç faizi raporu ---- */
      const climate = K.economy.climate();
      const cost = upkeep + tax;
      const margin = K.econ.margin(inc, cost);
      p.lastFinance = {
        day: s.day, income: inc, upkeep, tax, net: inc - cost, debt: p.debt || 0,
        margin, effRate, bracketRate: bracket.rate, bracketUpTo: bracket.upTo,
        fx: climate.fx, fxDrift: climate.fxDrift, fxShock: climate.shock,
        infl: climate.inflationIndex, debtInterest: climate.debtInterest,
        upkeepRaw: Math.round(upkeepRaw)
      };
      p.monthIncome = 0;

      const bad = (short + taxShort) > 0 || p.debt > 0;
      s.notifications = (s.notifications || []).concat([{
        title: "🧾 Aylık gider",
        msg: `Gider ${U.money(upkeep)} · Vergi ${U.money(tax)} (%${Math.round(effRate * 100)} efektif)`
           + `${p.debt > 0 ? " · ⚠️ borç " + U.money(p.debt) : ""}`
           + ` · marj %${Math.round(margin * 100)}`,
        kind: bad ? "bad" : "", day: s.day
      }]).slice(-60);
      if (margin < 0 && inc > 0) {
        s.notifications = (s.notifications || []).concat([{
          title: "📉 Zarar ediyorsun",
          msg: `Bu ay gelirin giderini karşılamadı (marj %${Math.round(margin * 100)}). Gider ${U.money(upkeep)}, gelir ${U.money(inc)}.`,
          kind: "bad", day: s.day
        }]).slice(-60);
      }
      K.toast("🧾 Aylık gider", `Gider ${U.money(upkeep)} · Vergi ${U.money(tax)} · marj %${Math.round(margin * 100)}`, bad ? "bad" : "warn");
      K.bus.emit("money", { amount: -cost, reason: "monthly" });
      return { upkeep, tax, debt: p.debt, margin, effRate, infl };
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
