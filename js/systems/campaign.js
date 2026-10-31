/* ============================================================
   KARMA — systems/campaign.js   (v10.73)

   ÇIKIŞ KAMPANYASI ÖLÇÜMLEME PANOSU  (yol haritası 01)
   ---------------------------------------------------
   Ön kayıt / teaser kampanyalarında harcanan paranın kanal bazında
   NE DÖNDÜRDÜĞÜNÜ ölçer: dinlenme · takipçi · gelir (ve tahmini satış).

   NEDEN AYRI DEFTER?
   ------------------
   `systems/rollout.js` kampanyayı YÜRÜTÜR (kanal seçimi, günlük ön kayıt
   toplama, teaser zinciri) ama sonucu ölçmez: yayın çıkınca
   `rel.presave = null` olur ve "hangi kanal ne kazandırdı" bilgisi
   kaybolur. Bu modül o bilgiyi AYRI bir defterde tutar ve rollout'u
   DEĞİŞTİRMEZ — yalnızca onun ürettiği olayları dinler.

   ATIF (attribution) KURALLARI
   ----------------------------
   1) HARCAMA — kanal başına gerçek `CHANNELS[].cost` yazılır; teaser
      harcamaları ayrı satırda tutulur. `totalSpend` = kanal + teaser.
   2) DİNLENME / GELİR — yayının ilk hafta toplamı, kanallara
      `harcama × kanal verimi` ağırlığıyla bölünür. Yuvarlama artığı
      en büyük kesirli paya eklenir; kanal toplamı yayın raporuyla
      BİREBİR tutar (bkz. `distribute`).
   3) TAKİPÇİ — kohort verisine bağlanır (`systems/fans-cohort.js`).
      Kampanya açılırken kohort sayıları fotoğraflanır, yayın oturduğunda
      fark alınır. Her kanal kendi beslediği kohorta yazılır:
        tiktok/shorts → shortform · igstory/x → word · mail → playlist
      Aynı kohorta bakan kanallar harcama ağırlığıyla paylaşır.
   4) SATIŞ — motorun yayın başına birim satışı YOK. Bu yüzden
      `sales` bir TAHMİNDİR: `streams / 1500`. Panelde "≈ satış
      (tahmini)" olarak etiketlenir; hiçbir gelir hesabına girmez.

   ESKİ KAYITLAR: defter yoksa boş açılır; kampanyası olmayan yayınlar
   panelde görünmez, hiçbir değer geriye dönük değişmez.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* Kanal → kohort kaynağı eşlemesi (bkz. fans-cohort.js SOURCES) */
  const CH_COHORT = { tiktok: "shortform", shorts: "shortform", igstory: "word", x: "word", mail: "playlist" };

  /* Tahmini satış dönüşümü: 1.500 dinlenme ≈ 1 birim (panelde tahmin olarak yazılır) */
  const STREAMS_PER_SALE = 1500;

  const zeros = () => ({ spend: 0, presaves: 0, streams: 0, followers: 0, revenue: 0, sales: 0 });

  /* Toplamı TAM koruyan tamsayı dağıtımı (en-büyük-kalan). */
  function distribute(total, weights) {
    const keys = Object.keys(weights);
    const out = {};
    let sumW = 0;
    keys.forEach((k) => { if (weights[k] > 0) sumW += weights[k]; });
    if (!(sumW > 0) || !(total > 0)) { keys.forEach((k) => { out[k] = 0; }); return out; }
    const raw = {}, floor = {};
    let acc = 0;
    keys.forEach((k) => {
      raw[k] = (Math.max(0, weights[k]) / sumW) * total;
      floor[k] = Math.floor(raw[k]);
      acc += floor[k];
    });
    let rest = total - acc;
    keys.sort((a, b) => (raw[b] - floor[b]) - (raw[a] - floor[a]));
    for (let i = 0; i < keys.length && rest > 0; i++) { floor[keys[i]] += 1; rest--; }
    keys.forEach((k) => { out[k] = floor[k]; });
    return out;
  }

  function channels() { return (K.rollout && K.rollout.CHANNELS) || []; }
  function chDef(id) { return channels().find((c) => c.id === id) || null; }

  K.campaigns = {
    CH_COHORT, STREAMS_PER_SALE,
    _distribute: distribute,

    /* ---------------- defter ---------------- */
    all() {
      const p = K.state.player;
      if (!p.campaigns || typeof p.campaigns !== "object") p.campaigns = {};
      return p.campaigns;
    },

    ledger(relId) {
      const all = this.all();
      const led = all[relId];
      if (!led || led.v !== 1) return null;
      return led;
    },

    open(relId, title) {
      const all = this.all();
      if (all[relId] && all[relId].v === 1) return all[relId];
      all[relId] = {
        v: 1, relId, title: title || relId, openDay: K.state.day,
        channels: {}, teasers: {}, teaserSpend: 0, totalSpend: 0,
        snap: this.cohortSnapshot(), settled: false, settleDay: null,
        totals: zeros()
      };
      return all[relId];
    },

    /* Kohort sayılarının fotoğrafı — dönüşüm farkı için */
    cohortSnapshot() {
      const snap = {};
      if (!K.fansCohort || !K.fansCohort.counts) return snap;
      try {
        const c = K.fansCohort.counts();
        Object.keys(c).forEach((k) => { snap[k] = c[k]; });
      } catch (e) { /* kohort katmanı yoksa boş fotoğraf */ }
      return snap;
    },

    /* ---------------- olay kancaları (rollout çağırır) ---------------- */

    /* Ön kayıt kampanyası açıldı: kanal başına gerçek maliyet yazılır. */
    trackPresave(relId, ids, title) {
      const led = this.open(relId, title);
      (ids || []).forEach((id) => {
        const def = chDef(id);
        if (!def) return;
        if (!led.channels[id]) led.channels[id] = zeros();
        led.channels[id].spend += def.cost;
        led.totalSpend += def.cost;
      });
      led.totalSpend = this.recalcSpend(led);
      return led;
    },

    /* Teaser paylaşıldı: aşama harcaması ayrı satırda. */
    trackTeaser(relId, teaserId, cost, eff, title) {
      const led = this.open(relId, title);
      const prev = led.teasers[teaserId];
      if (!prev) {
        led.teasers[teaserId] = { cost: cost || 0, eff: eff || 0, day: K.state.day };
      }
      led.teaserSpend = Object.keys(led.teasers).reduce((a, k) => a + (led.teasers[k].cost || 0), 0);
      led.totalSpend = this.recalcSpend(led);
      return led;
    },

    /* Günlük ön kayıt toplandı: kanallara kanal verimine göre yazılır. */
    trackCollect(relId, ids, amount) {
      const led = this.ledger(relId);
      if (!led || !(amount > 0)) return;
      /* Yalnızca KAMPANYAYA GİREN kanallar pay alır. Defterde olmayan bir
         kanal sonradan eklenirse geçmiş harcaması olmadığı için sonucu da
         olmamalı (panelde "harcamasız kanal" satırı oluşmasın). */
      const w = {};
      (ids || []).forEach((id) => { const d = chDef(id); if (d && led.channels[id]) w[id] = d.yield; });
      const dist = distribute(amount, w);
      Object.keys(dist).forEach((id) => {
        if (!led.channels[id]) led.channels[id] = zeros();
        led.channels[id].presaves += dist[id];
      });
    },

    recalcSpend(led) {
      const chSum = Object.keys(led.channels).reduce((a, k) => a + (led.channels[k].spend || 0), 0);
      return chSum + (led.teaserSpend || 0);
    },

    /* ---------------- yayın oturdu: sonuçları kanallara dağıt ---------------- */
    settle(relId, result) {
      const led = this.ledger(relId);
      if (!led || led.settled) return led;          /* çift sayım yok */
      const streams = Math.max(0, Math.round((result && result.streams) || 0));
      const revenue = Math.max(0, Math.round((result && result.revenue) || 0));

      const ids = Object.keys(led.channels);
      if (!ids.length) { led.settled = true; led.settleDay = K.state.day; return led; }

      /* ağırlık: harcama × kanal verimi (para boşa gitmesin, verim de sayılsın) */
      const wStream = {};
      ids.forEach((id) => {
        const def = chDef(id);
        wStream[id] = (led.channels[id].spend || 0) * ((def && def.yield) || 1);
      });

      const sDist = distribute(streams, wStream);
      const rDist = distribute(revenue, wStream);
      ids.forEach((id) => {
        led.channels[id].streams += sDist[id];
        led.channels[id].revenue += rDist[id];
        led.channels[id].sales = Math.round(led.channels[id].streams / STREAMS_PER_SALE);
        led.channels[id].followers += 0;             /* aşağıda kohort farkından doldurulur */
      });

      /* ---- takipçi: kohort farkı → kanal ----
         Her kohort kaynağının büyümesi, o kaynağı besleyen kanallara
         harcama ağırlığıyla yazılır. Toplam, büyümenin tamamına eşit olur. */
      const now = {};
      if (K.fansCohort && K.fansCohort.counts) {
        try { Object.assign(now, K.fansCohort.counts()); } catch (e) { /* yok */ }
      }
      const growth = {};
      Object.keys(CH_COHORT).forEach((chId) => {
        const src = CH_COHORT[chId];
        if (growth[src] == null) {
          const before = (led.snap && led.snap[src]) || 0;
          const after = now[src] || 0;
          growth[src] = Math.max(0, after - before);   /* negatif büyüme atfedilmez */
        }
      });
      const srcChannels = {};
      Object.keys(CH_COHORT).forEach((chId) => {
        const src = CH_COHORT[chId];
        if (!led.channels[chId]) return;               /* o kanal kullanılmadı */
        (srcChannels[src] = srcChannels[src] || []).push(chId);
      });
      Object.keys(srcChannels).forEach((src) => {
        const list = srcChannels[src];
        const w = {};
        list.forEach((chId) => { w[chId] = led.channels[chId].spend || 1; });
        const dist = distribute(growth[src] || 0, w);
        list.forEach((chId) => { led.channels[chId].followers += dist[chId] || 0; });
      });

      led.settled = true;
      led.settleDay = K.state.day;
      led.totals = this.totals(led);
      return led;
    },

    totals(led) {
      const t = zeros();
      t.spend = led.totalSpend || 0;
      Object.keys(led.channels).forEach((id) => {
        const c = led.channels[id];
        t.presaves += c.presaves || 0;
        t.streams += c.streams || 0;
        t.followers += c.followers || 0;
        t.revenue += c.revenue || 0;
        t.sales += c.sales || 0;
      });
      return t;
    },

    /* ---------------- rapor (UI) ---------------- */
    rows(led) {
      return Object.keys(led.channels).map((id) => {
        const def = chDef(id) || { name: id, emoji: "•", yield: 1 };
        const c = led.channels[id];
        return {
          id, name: def.name, emoji: def.emoji, cohort: CH_COHORT[id] || null,
          spend: c.spend || 0,
          presaves: c.presaves || 0,
          streams: c.streams || 0,
          followers: c.followers || 0,
          revenue: c.revenue || 0,
          sales: c.sales || 0,
          roi: c.spend > 0 ? (c.revenue || 0) / c.spend : null,
          costPerFollower: (c.followers || 0) > 0 ? (c.spend || 0) / c.followers : null
        };
      }).sort((a, b) => b.spend - a.spend);
    },

    report(relId) {
      const led = this.ledger(relId);
      if (!led) return null;
      const totals = this.totals(led);
      const teaserCost = led.teaserSpend || 0;
      return {
        relId: led.relId, title: led.title, openDay: led.openDay,
        settled: !!led.settled, settleDay: led.settleDay,
        rows: this.rows(led), totals,
        teaserSpend: teaserCost,
        teaserList: Object.keys(led.teasers).map((k) => ({ id: k, ...led.teasers[k] })),
        net: totals.revenue - totals.spend,
        roi: totals.spend > 0 ? totals.revenue / totals.spend : null,
        costPerFollower: totals.followers > 0 ? totals.spend / totals.followers : null
      };
    },

    list() {
      const all = this.all();
      return Object.keys(all)
        .filter((k) => all[k] && all[k].v === 1)
        .map((k) => this.report(k))
        .filter(Boolean)
        .sort((a, b) => (b.openDay || 0) - (a.openDay || 0));
    },

    /* Tüm kampanyaların toplamı (panel üst şeridi) */
    summary() {
      const rows = this.list();
      const s = zeros();
      const byCohort = {};
      rows.forEach((r) => {
        s.spend += r.totals.spend;
        s.streams += r.totals.streams;
        s.followers += r.totals.followers;
        s.revenue += r.totals.revenue;
        s.sales += r.totals.sales;
        s.presaves += r.totals.presaves;
        r.rows.forEach((ch) => {
          if (!ch.cohort) return;
          byCohort[ch.cohort] = (byCohort[ch.cohort] || 0) + ch.followers;
        });
      });
      return {
        count: rows.length,
        totals: s,
        byCohort,
        net: s.revenue - s.spend,
        roi: s.spend > 0 ? s.revenue / s.spend : null,
        costPerFollower: s.followers > 0 ? s.spend / s.followers : null
      };
    }
  };
})(window.K = window.K || {});
