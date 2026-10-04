/* ============================================================
   KARMA — systems/sponsor.js
   SPONSORLUK / MARKA ANLAŞMALARI
   Teklif gelir → kabul/red. Aktif anlaşma aylık gelir getirir ama
   marka kategorisine göre İMAJI etkiler (alkol/bahis imajı yakar).
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const DURATION = 180;   // gün

  const BRANDS = [
    { id: "tech",    name: "Nova Teknoloji",  cat: "Teknoloji",      icon: "📱", fee: 45000,  img: 2,  minPop: 20, note: "Yenilikçi imaj; imajı yükseltir." },
    { id: "sport",   name: "Volt Spor",        cat: "Spor Giyim",     icon: "👟", fee: 38000,  img: 1,  minPop: 15, note: "Genç ve enerjik kitle." },
    { id: "drink",   name: "Buzsu İçecek",     cat: "İçecek",         icon: "🥤", fee: 30000,  img: 0,  minPop: 10, note: "Nötr; geniş kitle." },
    { id: "energy",  name: "Turbo Enerji",     cat: "Enerji İçeceği", icon: "⚡", fee: 55000,  img: -1, minPop: 25, note: "Çok görünür ama biraz yıpratır." },
    { id: "fashion", name: "Hızlı Moda",       cat: "Moda",           icon: "👕", fee: 40000,  img: -1, minPop: 18, note: "Trend odaklı; imaj dalgalanır." },
    /* v10.56 — alkol ve bahis sponsorluğu 18+ (Türkiye'de alkol satışı ve
       bahis 18 yaş sınırına tabidir). */
    { id: "alc",     name: "Kadey Alkol",      cat: "Alkol",          icon: "🍺", fee: 90000,  img: -3, minPop: 30, minAge: 18, note: "Yüksek gelir; imajı zedeler." },
    { id: "bet",     name: "Şans Bahis",       cat: "Bahis",          icon: "🎲", fee: 140000, img: -6, minPop: 40, minAge: 18, note: "En yüksek gelir; itibar/imaj riski büyük." }
  ];

  K.sponsor = {
    BRANDS, DURATION,
    brand(id) { return BRANDS.find(b => b.id === id); },

    active() {
      const s = K.state;
      const now = s.day;
      s.player.sponsors = (s.player.sponsors || []).filter(x => (x.untilDay || 0) > now);
      return s.player.sponsors;
    },

    /* aktif anlaşmaların toplamı (K.ECON sponsorMonthly) */
    monthlyTotal() {
      return K.sponsor.active().reduce((n, x) => n + (x.fee || 0), 0);
    },

    /* günlük: teklif üret */
    tick() {
      const s = K.state, p = s.player;
      if (s.pendingSponsor) return;
      // zaten aktif olan markayı önermeyelim
      const has = (s.player.sponsors || []).map(x => x.id);
      /* v10.56 — yaş kapısı: reşit olmayan oyuncuya alkol/bahis teklifi GİTMEZ. */
      const age = K.playerAge();
      const pool = BRANDS.filter(b => (p.popularity || 0) >= b.minPop && !has.includes(b.id) &&
        (!b.minAge || age >= b.minAge));
      if (!pool.length) return;
      const chance = 0.02 + (p.popularity || 0) / 1600 + (p.image || 50) / 4000;
      if (!U.chance(chance)) return;
      const b = U.pick(pool);
      /* DÜZELTME (v10.9): marka ücretleri SABİTTİ.
         Pop 20 bir oyuncu aylık 45.000 ₺ sponsorluk alabiliyordu —
         bu, o seviyedeki telif gelirinin (aylık birkaç bin ₺) katları
         demekti, yani sponsorluk müziği eziyordu. Artık ücret, oyuncunun
         gerçek büyüklüğüne göre ölçeklenir. */
      const scale = U.clamp(0.25 + (p.popularity || 0) / 70, 0.25, 2.0);
      const fee = Math.round(b.fee * scale);
      s.pendingSponsor = {
        id: U.uid("spo"), brandId: b.id, name: b.name, cat: b.cat, icon: b.icon,
        fee, img: b.img, note: b.note, day: s.day
      };
      if (K.toast) K.toast("💼 Sponsorluk teklifi", `${b.name} seninle çalışmak istiyor.`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "💼 Sponsorluk", msg: `${b.name} · aylık ${U.money(fee)} · imaj ${b.img >= 0 ? "+" : ""}${b.img}`, kind: "ok", day: s.day
      }]).slice(-60);
      K.save();
    },

    openOffer() {
      const s = K.state, o = s.pendingSponsor;
      if (!o) return;
      K.ui.modal({
        title: `💼 ${o.name} — Sponsorluk`,
        desc: o.note,
        body: `<div style="font-size:12.5px;line-height:1.7;color:var(--text-1)">
            Kategori: <b>${U.escape(o.cat)}</b><br>
            Aylık ödeme: <b>${U.money(o.fee)}</b> · Süre: ${DURATION} gün<br>
            İmaj etkisi: <b style="color:${o.img >= 0 ? "#4ade80" : "#f87171"}">${o.img >= 0 ? "+" : ""}${o.img}</b> (kabulde ve süre boyunca)<br>
            <span style="font-size:11px;color:var(--text-3)">Alkol/bahis gibi markalar çok getirir ama imajını yorar.</span>
          </div>`,
        actions: [
          { label: "Kabul et", cls: "btn-primary", onClick: () => K.sponsor.resolve(true) },
          { label: "Reddet", cls: "btn-ghost", onClick: () => K.sponsor.resolve(false) }
        ]
      });
    },

    resolve(accept) {
      const s = K.state, o = s.pendingSponsor;
      if (!o) return;
      /* v10.56 — yaş kapısı (teklif sonradan yaş düşse bile güvenlik ağı). */
      const _b = K.sponsor.brand(o.brandId);
      if (accept && _b && _b.minAge && K.playerAge() < _b.minAge) {
        K.toast("Yaş yetersiz", `${o.name} anlaşması için ${_b.minAge} yaşında olmalısın.`, "bad");
        s.pendingSponsor = null;
        K.save(); if (K.refresh) K.refresh();
        return;
      }
      if (accept) {
        const signing = Math.round(o.fee * 0.5);   // ilk peşin (yarım ay)
        K.economy.earn(signing, "sponsor");
        s.player.sponsors = s.player.sponsors || [];
        s.player.sponsors.push({
          id: o.id, brandId: o.brandId, name: o.name, cat: o.cat, icon: o.icon,
          fee: o.fee, img: o.img, day: s.day, untilDay: s.day + DURATION
        });
        s.player.image = U.clamp((s.player.image || 50) + o.img, 0, 100);
        /* SELL-OUT: kötü imajlı marka hayran sadakatini yorar */
        if (o.img < 0) {
          s.player.selloutUntil = s.day + 25;
          s.player.reputation = Math.max(0, (s.player.reputation || 0) - Math.abs(o.img) * 0.35);
          const mult = Math.abs(o.img) / 100;
          const loss = Math.round((K.fans && K.fans.followers ? K.fans.followers() : 0) * mult * 0.5);
          ["ig", "tiktok", "x"].forEach(k => { s.player[k] = Math.max(0, Math.round((s.player[k] || 0) - loss * 0.22)); });
          s.notifications = (s.notifications || []).concat([{
            title: "😐 " + o.name + " anlaşması",
            msg: "Hayranlar 'satıldı' dedi: itibar ve takipçi kaybı.",
            kind: "warn", day: s.day
          }]).slice(-60);
          K.toast("💼 Anlaşma imzalandı", "Hayranlar tepkili: 'satıldı' yorumları geliyor.", "warn");
        } else {
          K.toast("💼 Anlaşma imzalandı", `${o.name} · aylık ${U.money(o.fee)} + peşin ${U.money(signing)}`, "ok");
        }
      } else {
        K.toast("Reddedildi", `${o.name} teklifi geri çevrildi.`, "warn");
      }
      s.pendingSponsor = null;
      K.save(); if (K.refresh) K.refresh();
    },

    /* ay dönümü: sponsor geliri + imaj etkisi */
    monthly() {
      const list = K.sponsor.active();
      if (!list.length) return 0;
      let income = 0, img = 0;
      list.forEach(x => { income += x.fee || 0; img += (x.img || 0) * 0.25; });
      if (income > 0) K.economy.earn(Math.round(income), "sponsor_month");
      const p = K.state.player;
      p.image = U.clamp((p.image || 50) + img, 0, 100);
      K.toast("💼 Sponsorluk geliri", `${list.length} anlaşma → ${U.money(Math.round(income))}${img ? " · imaj " + (img >= 0 ? "+" : "") + img.toFixed(1) : ""}`, img >= 0 ? "ok" : "warn");
      return income;
    }
  };
})(window.K = window.K || {});
