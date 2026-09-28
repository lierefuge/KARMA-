/* ============================================================
   KARMA — systems/catalog.js
   KATALOG · SYNC (film/dizi/reklam/oyun) · PUBLISHING HAKKI
   • Publishing: telif gelirinin bir kısmı bestecı/yayın hakkı olarak
     AYRICA ödenir. Anlaşma varsa yayıncı pay alır.
   • Sync: bir yapım şarkını kullanmak ister → kabul/red (modal).
   • Katalog satışı: master haklarını toptan sat (yıllık gelirin ~7 katı).
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.catalog = {

    PUB_RATE: 0.18,       // telif brütünün publishing payı
    PUB_DEAL_CUT: 0.40,   // yayıncı anlaşması varsa yayıncının payı

    /* ---------------- PUBLISHING GELİRİ ---------------- */
    publishingIncome(gross) {
      if (!gross || gross <= 0) return 0;
      const p = K.state.player;
      const base = gross * K.catalog.PUB_RATE;
      const net = p.publishingDeal ? base * (1 - K.catalog.PUB_DEAL_CUT) : base;
      p.publishingEarned = (p.publishingEarned || 0) + net;
      if (net > 0) K.economy.earn(Math.round(net), "publishing");
      return Math.round(net);
    },

    /* ---------------- SYNC (senkronizasyon) ---------------- */
    SYNC_TYPES: [
      { id: "series", name: "Dizi",   mult: 4,  exclusive: false },
      { id: "film",   name: "Film",   mult: 8,  exclusive: true },
      { id: "ad",     name: "Reklam", mult: 12, exclusive: true },
      { id: "game",   name: "Oyun",   mult: 6,  exclusive: false }
    ],

    maybeSyncOffer() {
      const s = K.state, p = s.player;
      if (s.pendingSync) return;
      if (!(p.songs || []).length) return;
      if (s.catalogSold && !(p.songs || []).some(x => !x.masterSold)) return;
      const chance = 0.025 + p.popularity / 1100 + Math.min(0.05, p.songs.length / 500);
      if (!U.chance(chance)) return;
      const pool = p.songs.filter(x => !x.masterSold).slice().sort((a, b) => (b.streams || 0) - (a.streams || 0)).slice(0, 8);
      if (!pool.length) return;
      const song = U.pick(pool);
      const t = U.pick(K.catalog.SYNC_TYPES);
      const base = Math.max(12000, (song.streams || 0) * 0.004);
      const fee = Math.round(base * t.mult * U.rand(0.7, 1.4) / 1000) * 1000;
      s.pendingSync = { id: U.uid("sync"), type: t.id, typeName: t.name, exclusive: t.exclusive, songId: song.id, songTitle: song.title, fee, day: s.day };
      if (K.toast) K.toast("🎬 Sync teklifi", `"${song.title}" bir ${t.name} için isteniyor.`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "🎬 Sync teklifi", msg: `"${song.title}" · ${t.name}${t.exclusive ? " (exclusive)" : ""} · ${U.money(fee)}`, kind: "ok", day: s.day
      }]).slice(-60);
      K.save();
    },

    openSyncOffer() {
      const s = K.state, o = s.pendingSync;
      if (!o) return;
      K.ui.modal({
        title: `🎬 ${o.typeName} — Sync Teklifi`,
        desc: `"${o.songTitle}" şarkın bir ${o.typeName.toLowerCase()} yapımında kullanılmak isteniyor.`,
        body: `<div style="font-size:12.5px;line-height:1.7;color:var(--text-1)">
            Teklif bedeli: <b>${U.money(o.fee)}</b><br>
            ${o.exclusive ? "⚠️ <b>Exclusive (özel)</b>: şarkı başka yapımlarda kullanılamaz." : "İsim hakkı sana kalır, başka yerde de kullanılabilir."}<br>
            <span style="font-size:11px;color:var(--text-3)">Sync, katalog gelirinin en büyük kalemlerinden biridir.</span>
          </div>`,
        actions: [
          { label: "Kabul et", cls: "btn-primary", onClick: () => K.catalog.resolveSync(true) },
          { label: "Reddet", cls: "btn-ghost", onClick: () => K.catalog.resolveSync(false) }
        ]
      });
    },

    resolveSync(accept) {
      const s = K.state, o = s.pendingSync;
      if (!o) return;
      if (accept) {
        const cut = (K.career && K.career.labelCut) ? K.career.labelCut("sync", o.fee) : 0;
        K.economy.earn(o.fee - cut, "sync");
        const song = s.player.songs.find(x => x.id === o.songId);
        if (song) {
          song.sync = song.sync || [];
          song.sync.push({ type: o.typeName, fee: o.fee, day: s.day, exclusive: o.exclusive });
          if (o.exclusive) song.exclusiveSync = true;
        }
        s.player.popularity = U.clamp(s.player.popularity + (o.exclusive ? 0.8 : 0.4), 0, 99);
        s.player.reputation = U.clamp((s.player.reputation || 0) + 0.4, 0, 100);
        K.toast("🎬 Sync anlaşması", `${o.typeName} · +${U.money(o.fee - cut)}${cut ? " · 360 payı " + U.money(cut) : ""}`, "ok");
      } else {
        K.toast("Sync reddedildi", `${o.typeName} teklifi reddedildi.`, "warn");
      }
      s.pendingSync = null;
      K.save(); if (K.refresh) K.refresh();
    },

    /* ---------------- KATALOG DEĞERİ & SATIŞI ---------------- */
    annualRevenue() {
      const pay = (K.state.player.payouts || []).slice(0, 12);
      return pay.reduce((n, x) => n + (x.net || 0), 0);
    },

    valuation() {
      const p = K.state.player;
      const annual = K.catalog.annualRevenue();
      const base = annual * 7 + (p.songs || []).length * 4000 + (p.popularity || 0) * 1500;
      return Math.round(base / 1000) * 1000;
    },

    maybeCatalogOffer() {
      const s = K.state, p = s.player;
      if (s.pendingCatalogOffer || s.catalogSold) return;
      if ((p.songs || []).length < 4) return;
      const val = K.catalog.valuation();
      if (val < 400000) return;
      if (U.chance(0.004)) {
        s.pendingCatalogOffer = { valuation: val, day: s.day };
        if (K.toast) K.toast("💼 Katalog teklifi", `Yatırımcı kataloğuna ${U.money(val)} teklif ediyor.`, "ok");
        s.notifications = (s.notifications || []).concat([{
          title: "💼 Katalog teklifi", msg: `Kataloğun ${U.money(val)} karşılığında satın alınmak isteniyor.`, kind: "ok", day: s.day
        }]).slice(-60);
        K.save();
      }
    },

    openCatalogOffer() {
      const s = K.state, o = s.pendingCatalogOffer;
      if (!o) return;
      K.ui.modal({
        title: "💼 Katalog Satın Alma Teklifi",
        desc: "Bir müzik yatırım fonu master haklarını toptan satın almak istiyor.",
        body: `<div style="font-size:12.5px;line-height:1.7;color:var(--text-1)">
            Teklif: <b>${U.money(o.valuation)}</b> (yıllık gelirinin ~7 katı)<br>
            <span style="font-size:11px;color:var(--text-3)">Satarsan: mevcut şarkılarının telif/publishing geliri artık sana gelmez; yalnızca bundan sonra çıkaracağın YENİ şarkılar gelir getirir.</span>
          </div>`,
        actions: [
          { label: "Sat (nakit al)", cls: "btn-primary", onClick: () => K.catalog.sellCatalog() },
          { label: "Reddet", cls: "btn-ghost", onClick: () => { K.state.pendingCatalogOffer = null; K.save(); if (K.refresh) K.refresh(); } }
        ]
      });
    },

    sellCatalog() {
      const s = K.state, p = s.player;
      const o = s.pendingCatalogOffer;
      if (!o) return;
      K.economy.earn(o.valuation, "catalog_sale");
      (p.songs || []).forEach(song => { song.masterSold = true; });
      s.catalogSold = true;
      s.pendingCatalogOffer = null;
      K.toast("💼 Katalog satıldı", `+${U.money(o.valuation)} · yeni şarkıların yine senin.`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "💼 Katalog satıldı", msg: `${U.money(o.valuation)} karşılığında master hakların satıldı. Yeni yayınlar yine sana gelir.`, kind: "ok", day: s.day
      }]).slice(-60);
      K.save(); if (K.refresh) K.refresh();
    },

    /* günlük tick */
    tick() {
      K.catalog.maybeSyncOffer();
      K.catalog.maybeCatalogOffer();
    }
  };
})(window.K = window.K || {});
