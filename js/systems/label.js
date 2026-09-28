/* ============================================================
   KARMA — systems/label.js
   Oyuncunun müzik şirketi (label):
   kurma, güç hesabı, A&R adayları, sözleşme teklifi & karar motoru,
   kadro (roster) yönetimi ve günlük şirket geliri.

   NOT: Feature teklifleri burada DEĞİL, relations.js içindedir.
        Şirket teklifi (kontrat) ile feature kesinlikle ayrıdır.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;
  const MY = "my_label";

  K.label = {

    /* ---------------- kurulum ---------------- */
    canFound() {
      const s = K.state;
      return !s.label && s.balance >= K.ECON.labelFoundCost &&
        s.player.popularity >= K.ECON.labelFoundMinPop;
    },

    found(name) {
      const s = K.state;
      if (s.label) { K.toast("Şirketin zaten var", "", "warn"); return false; }
      if (s.balance < K.ECON.labelFoundCost) {
        K.toast("Yetersiz bakiye", `Şirket kurmak için ${U.money(K.ECON.labelFoundCost)} gerekiyor.`, "bad");
        return false;
      }
      if (s.player.popularity < K.ECON.labelFoundMinPop) {
        K.toast("Popülerlik yetersiz", `Şirket kurmak için en az ${K.ECON.labelFoundMinPop} popülerlik gerekli.`, "bad");
        return false;
      }
      K.economy.spend(K.ECON.labelFoundCost, "label_found");
      s.label = {
        id: MY,
        name: name || (s.player.stageName + " Music"),
        foundedDay: s.day,
        power: 22,
        funds: 0,
        royalty: 30,             // şirketin sanatçıdan aldığı pay (%)
        roster: [],              // artistId listesi
        catalog: [],             // şirket etiketiyle yayınlanan şarkı id'leri
        monthlyStreams: 0,
        totalRevenue: 0,
        level: 1
      };
      s.flags.labelUnlocked = true;
      K.toast("🏢 Şirket kuruldu!", `"${s.label.name}" artık aktif.`, "ok");
      K.save(); K.refresh();
      return true;
    },

    hasLabel() { return !!K.state.label; },

    /* ---------------- güç hesabı ---------------- */
    power() {
      const s = K.state;
      if (!s.label) return 0;
      const rosterScore = s.label.roster.reduce((sum, id) => {
        const a = K.artistById(id);
        return sum + (a ? a.popularity * 0.55 : 0);
      }, 0);
      const catalogScore = Math.min(22, s.label.catalog.length * 1.6);
      const fundScore = Math.min(18, (s.balance + s.label.funds) / 60000);
      const levelScore = (s.label.level - 1) * 4;
      const p = 18 + rosterScore * 0.5 + catalogScore + fundScore + levelScore;
      s.label.power = U.clamp(Math.round(p), 5, 100);
      return s.label.power;
    },

    /* ---------------- aday sanatçılar ---------------- */
    candidates() {
      const s = K.state;
      return K.artistList().filter(a =>
        !(s.label && s.label.roster.includes(a.id)) &&
        a.id !== "player"
      ).map(a => ({
        artist: a,
        signed: a.labelId,
        currentLabel: a.labelId ? K.labelById(a.labelId) : null,
        relation: K.relation(a.id)
      }));
    },

    /* ---------------- sözleşme teklifi değerlendirmesi ---------------- */
    /*
      Karar değişkenleri:
        - samimiyet (affinity)
        - sanatçının popülerliği
        - şirketin gücü (labelPower)
        - teklifin şartları (avans + royalty + süre)
        - sanatçının mevcut şirketi (bağlılık + güç)
    */
    evaluate(artistId, terms) {
      const s = K.state;
      const a = K.artistById(artistId);
      const rel = K.relation(artistId);
      const t = a.traits;
      const labelPower = K.label.power();

      const reasons = [];

      // 1) samimiyet
      const affScore = rel.affinity * 0.45;
      if (rel.affinity < 40) reasons.push("Seni yeterince tanımıyor (samimiyet düşük).");
      else if (rel.affinity >= 70) reasons.push("Sana güveniyor ve samimiyetiniz yüksek.");

      // 2) teklif şartları
      const advanceScore = U.clamp(terms.advance / 5000, 0, 38);
      const royaltyScore = (terms.artistRoyalty - 50) * 0.55;
      const lengthScore = terms.lengthDays <= 180 ? 4 : terms.lengthDays <= 365 ? 0 : -6;
      if (terms.artistRoyalty >= 70) reasons.push("Yüksek sanatçı payı cazip.");
      if (terms.advance >= 120000) reasons.push("Avans teklifi güçlü.");

      // 3) şirket gücü vs sanatçı popülerliği
      const powerGap = labelPower - a.popularity * 0.9;
      const powerScore = powerGap * (0.32 + t.ego * 0.05);
      if (powerGap > 10) reasons.push("Şirketinin gücü onun seviyesinin üzerinde.");
      else if (powerGap < -15) reasons.push("Şirketin onun kariyeri için yeterince güçlü görünmüyor.");

      // 4) mevcut şirket bağlılığı
      let currentPenalty = 0;
      if (a.labelId && a.labelId !== MY) {
        const cur = K.labelById(a.labelId);
        currentPenalty = (cur ? cur.power * 0.34 : 0) + t.loyalty * 3.6;
        reasons.push(`${cur ? cur.name : "Mevcut şirketi"} ile bağı var (bağlılık ${t.loyalty}/10).`);
      }

      let score = 18 + affScore + advanceScore + royaltyScore + lengthScore + powerScore - currentPenalty;
      const probability = U.clamp(score / 100, 0.02, 0.96);
      const accepted = rel.affinity >= 40 && Math.random() < probability;

      return { score: Math.round(score), probability, accepted, reasons, labelPower };
    },

    /* ---------------- teklif yap ---------------- */
    offerContract(artistId, terms) {
      const s = K.state;
      if (!K.label.hasLabel()) { K.toast("Şirketin yok", "Önce kendi şirketini kurmalısın.", "warn"); return; }
      const a = K.artistById(artistId);
      const rel = K.relation(artistId);
      if (rel.affinity < 40) {
        K.toast("Samimiyet yetersiz", `${a.stageName} henüz seni yeterince tanımıyor (min. 40).`, "warn");
        return;
      }
      if (s.label.roster.includes(artistId)) { K.toast("Zaten kadroda", `${a.stageName} şirketinde.`, "warn"); return; }

      const res = K.label.evaluate(artistId, terms);
      const arBoost = K.label.staffBonus().signing;
      if (!res.accepted && arBoost > 0 && rel.affinity + arBoost >= 40 && Math.random() < Math.min(0.5, arBoost / 40)) {
        res.accepted = true;
        res.byAR = true;
      }
      if (!res.accepted) {
        rel.affinity = U.clamp(rel.affinity - 2, 0, 100);
        rel.flags.contractOffered = true;
        s.player.reputation = Math.max(0, s.player.reputation - 1);
        K.toast("❌ Teklif reddedildi", `${a.stageName} teklifini kabul etmedi. (Şans: ${Math.round(res.probability * 100)}%)`, "bad");
        // red mesajı DM'e düşer
        K.relations.pushArtistMessage(artistId, K.relations.declineText(a), "system");
        K.save(); K.refresh();
        return { accepted: false, res };
      }

      // kabul: maliyet
      const buyout = a.labelId && a.labelId !== MY ? Math.round((K.labelById(a.labelId)?.fee || 100000) * 1.4) : 0;
      const total = terms.advance + buyout;
      if (!K.economy.canAfford(total)) {
        K.toast("Yetersiz bakiye", `Avans + buyout için ${U.money(total)} gerekiyor.`, "bad");
        return { accepted: false, res, insufficient: true };
      }
      K.economy.spend(total, "contract");

      // transfer
      if (a.labelId) a.labelId = null;
      a.labelId = MY;
      s.label.roster.push(artistId);
      s.label.catalog = s.label.catalog || [];
      s.player.reputation += 6;

      K.relations.pushArtistMessage(artistId,
        K.relations.acceptText(a), "system");
      K.toast("✅ Anlaşma sağlandı!", `${a.stageName} artık şirketinin kadrosunda.`, "ok");
      K.save(); K.refresh();
      return { accepted: true, res, cost: total };
    },

    /* ---------------- kadro ---------------- */
    rosterArtists() {
      if (!K.state.label) return [];
      return K.state.label.roster.map(id => K.artistById(id)).filter(Boolean);
    },

    /* ---------------- EKİP (personel) ---------------- */
    STAFF: {
      manager:  { name: "Menajer",     icon: "🧑‍💼", base: 90000,  max: 5, desc: "Şirket gelirini artırır (+%12/seviye).", effect: "gelir" },
      producer: { name: "Prodüktör",   icon: "🎛️", base: 75000,  max: 5, desc: "Yayın kalitesini artırır (+3/seviye).", effect: "kalite" },
      pr:       { name: "PR Uzmanı",   icon: "📣", base: 60000,  max: 5, desc: "Promosyon etkisini artırır (+%10/seviye).", effect: "promo" },
      ar:       { name: "A&R",         icon: "🔎", base: 110000, max: 5, desc: "Keşif ve imzalama şansını artırır.", effect: "signing" }
    },

    staffLevel(role) { return (K.state.staff && K.state.staff[role]) || 0; },

    staffCost(role) {
      const d = K.label.STAFF[role];
      const lvl = K.label.staffLevel(role);
      return Math.round(d.base * Math.pow(1.75, lvl));
    },

    hireStaff(role) {
      const d = K.label.STAFF[role];
      if (!d) return false;
      if (!K.label.hasLabel()) { K.toast("Şirketin yok", "Önce şirket kur.", "warn"); return false; }
      const lvl = K.label.staffLevel(role);
      if (lvl >= d.max) { K.toast("Maksimum seviye", `${d.name} zaten en üst seviyede.`, "warn"); return false; }
      const cost = K.label.staffCost(role);
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `${U.money(cost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(cost, "staff");
      K.state.staff[role] = lvl + 1;
      K.toast(d.icon + " İşe alındı", `${d.name} seviye ${lvl + 1}`, "ok");
      K.save(); K.refresh();
      return true;
    },

    staffBonus() {
      return {
        income: 1 + K.label.staffLevel("manager") * 0.12,
        quality: K.label.staffLevel("producer") * 3,
        promo: 1 + K.label.staffLevel("pr") * 0.10,
        signing: K.label.staffLevel("ar") * 4
      };
    },

    /* ---------------- KATALOG ---------------- */
    catalogAdd(title, artistId) {
      const s = K.state;
      s.catalog = s.catalog || [];
      const entry = { id: U.uid("cat"), title, artistId, day: s.day, revenue: 0 };
      s.catalog.unshift(entry);
      s.catalog = s.catalog.slice(0, 120);
      return entry;
    },

    catalogList() { return (K.state.catalog || []); },

    catalogValue() {
      const roster = K.label.rosterArtists();
      const base = roster.reduce((n, a) => n + a.monthly, 0) * 0.35;
      return Math.round(base + K.label.catalogList().length * 8000);
    },

    /* şirket gücünü yükselt (yatırım) */
    invest(amount) {
      const s = K.state;
      if (!K.economy.canAfford(amount)) { K.toast("Yetersiz bakiye", "", "bad"); return; }
      K.economy.spend(amount, "label_invest");
      s.label.funds += amount;
      const before = s.label.level;
      s.label.level = U.clamp(1 + Math.floor(s.label.funds / 400000), 1, 10);
      if (s.label.level > before) K.toast("🏆 Şirket büyüdü", `Şirket seviyesi ${s.label.level} oldu.`, "ok");
      K.save(); K.refresh();
    },

    /* kadro sanatçısı adına single yayınla (şirket kataloğu) */
    releaseForArtist(artistId, opts) {
      const s = K.state;
      const a = K.artistById(artistId);
      if (!a) return;
      const cost = 45000;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `${U.money(cost)} gerekiyor.`, "bad"); return; }
      K.economy.spend(cost, "label_release");
      a.monthly = Math.round(a.monthly * U.rand(1.02, 1.06));
      a.popularity = U.clamp(a.popularity + U.rand(0.2, 0.8), 0, 99);
      const bonus = K.label.staffBonus();
      a.popularity = U.clamp(a.popularity + bonus.quality * 0.15, 0, 99);
      K.label.catalogAdd((opts && opts.title) || (a.stageName + " — yeni single"), artistId);
      s.label.catalog.push(U.uid("cat"));
      s.label.monthlyStreams = K.label.rosterArtists().reduce((x, ar) => x + ar.monthly, 0);
      K.toast("📀 Şirket yayını", `${a.stageName} için yeni yayın çıktı.`, "ok");
      K.save(); K.refresh();
    },

    /* ---------------- OYUNCUNUN ŞİRKET SÖZLEŞMESİ ----------------
       Oyuncu bir şirkete bağlıysa: şartlar, recoup durumu, süre ve
       yayın yükümlülüğü görünür ve oyunu etkiler. */
    myDeal() {
      const p = K.state.player;
      if (!p.labelId || !p.labelDeal) return null;
      const l = K.labelById(p.labelId);
      const d = p.labelDeal;
      return {
        label: l,
        deal: d,
        recoupLeft: Math.max(0, (d.advance || 0) - (d.recouped || 0)),
        recoupPct: d.advance ? Math.round(U.clamp(((d.recouped || 0) / d.advance) * 100, 0, 100)) : 100,
        endDay: (d.startDay || 0) + (d.lengthDays || 180)
      };
    },

    /* sözleşme yükümlülüğü: uzun süre yayın yoksa şirket uyarır (itibar −) */
    playerContractTick() {
      const s = K.state, p = s.player;
      if (!p.labelId || !p.labelDeal) return;
      const lastRel = Math.max(0, p.labelDeal.startDay || 1, ...(p.songs || []).map(x => x.publishedDay || 0));
      const idle = s.day - lastRel;
      if (idle > 60 && (s.day - (p.labelDeal.warnDay || 0) > 30)) {
        p.labelDeal.warnDay = s.day;
        p.reputation = Math.max(0, (p.reputation || 0) - 2);
        const l = K.labelById(p.labelId);
        K.toast("🏢 Şirket uyarısı", (l ? l.name : "Şirket") + ": 60 gündür yayın yok. İtibar −2.", "warn");
        s.notifications = (s.notifications || []).concat([{
          title: "🏢 Şirket uyarısı", msg: (l ? l.name : "Şirket") + " yeni yayın bekliyor. Aksi hâlde sözleşme riske girer.", kind: "warn", day: s.day
        }]).slice(-60);
      }
    },

    /* ---------------- günlük tick ---------------- */
    dailyTick() {
      const s = K.state;
      if (!s.label) return;

      K.label.power();
      s.label.monthlyStreams = K.label.rosterArtists().reduce((x, ar) => x + ar.monthly, 0);

      // şirket günlük net geliri
      const net = K.economy.labelDailyNet();
      if (net > 0) {
        K.economy.earn(net, "label_income");
        s.label.totalRevenue += net;
      }

      // kadro sanatçıları şirket sayesinde büyür
      K.label.rosterArtists().forEach(ar => {
        ar.monthly = Math.round(ar.monthly * U.rand(1.0, 1.012));
        ar.popularity = U.clamp(ar.popularity + U.rand(0, 0.12), 0, 99);
      });

      // rastgele: kadro sanatçısı promosyon isteyebilir
      if (s.label.roster.length && U.chance(0.10)) {
        const ar = U.pick(K.label.rosterArtists());
        if (ar) {
          K.relations.pushArtistMessage(ar.id,
            U.pick([
              "Yeni işim için biraz promo ayarlayabilir misin? Şirket desteği lazım.",
              "Şirket olarak bu parçaya biraz bütçe ayırsak uçardı hocam.",
              "Radyo promosyonu düşünelim mi? Bu şarkının hakkı bu değil."
            ]), "chat", { topic: "promo_request" });
        }
      }
    }
  };

  K.MY_LABEL_ID = MY;
})(window.K);
