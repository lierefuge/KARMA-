/* ============================================================
   KARMA — apps/fans.js
   Telefon uygulaması: FANBASE (süperfan ekonomisi paneli)
   Kitle · Fan Kulübü · Merch & VIP  (alt navigasyonlu)
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;
  const money = U.money, fmt = U.fmt;

  function kitleHTML() {
    const f = K.fans.summary();
    const series = K.stats.series("followers", 30);
    return `
      <div class="fans-wrap">
        <div class="fans-hero">
          <div class="fans-hero-title">💜 Kitle Sağlığı</div>
          <div class="fans-hero-followers">${fmt(f.followers)} <span>takipçi</span></div>
          <div class="fans-tier-row">
            <div class="fans-tier"><b>${fmt(f.casual)}</b><span>Casual</span></div>
            <div class="fans-tier"><b>${fmt(f.active)}</b><span>Aktif</span></div>
            <div class="fans-tier hot"><b>${fmt(f.superfans)}</b><span>Süperfan</span></div>
          </div>
          <div class="fans-note">Gelir streaming'den değil, süperfandan gelir. Süperfan ≈ takipçinin %2'si + popülerlik bonusu.</div>
        </div>
        ${K.ui.section("Takipçi Büyümesi", `<span class="muted">30 gün</span>`)}
        ${series.some(v => v > 0) ? K.stats.sparkline(series, { color: "#b06cff", h: 64 }) : `<div class="mini-empty">Veri birikiyor…</div>`}
        ${K.studio.note("💜", "Kitleyi büyütmek için: kısa video (TikTok sesi), düzenli yayın ve canlı yayın. Süperfan oranı etkileşimle artar.", "violet")}
      </div>`;
  }

  function kulupHTML() {
    const f = K.fans.summary();
    const club = f.club;
    const pct = club ? Math.round((club.level / 5) * 100) : 0;
    return `
      <div class="fans-wrap">
        <div class="fans-card">
          <div class="fans-card-head">
            <div>
              <div class="fans-card-title">💜 Fan Kulübü</div>
              <div class="fans-card-sub">${club ? `Seviye ${club.level} · aidat ₺${club.price}/ay · ${fmt(f.subscribers)} abone` : "Aylık abonelik geliri kur"}</div>
            </div>
          </div>
          ${club
            ? K.studio.row("Seviye", pct, club.level + "/5", { color: "linear-gradient(90deg,#b06cff,#6ec3ff)" })
              + `<div class="fans-line">Aylık gelir (tahmini): <b>${money(f.clubMonthly)}</b></div>
                 <button class="btn btn-primary" data-pact="fans-club">Kulübü Geliştir (₺${fmt(20000 * club.level)})</button>`
            : `<div class="fans-line">Kurulum: ₺15.000 · en az ~500 süperfan gerekli</div>
               <button class="btn btn-primary" data-pact="fans-club">Fan Kulübü Aç</button>`}
        </div>
        ${K.studio.note("📈", club
          ? `Kulüp geliri her ay otomatik yatar (<b>${money(f.clubMonthly)}</b>). Seviye yükseldikçe aidat ve dönüşüm artar.`
          : "Fan kulübü, süperfandan düzenli aylık gelir sağlar — streaming'den daha güvenilirdir.", club ? "ok" : "dim")}
      </div>`;
  }

  function urunHTML() {
    const f = K.fans.summary();
    const p = K.state.player;
    return `
      <div class="fans-wrap">
        <div class="fans-card">
          <div class="fans-card-head"><div>
            <div class="fans-card-title">👕 Sınırlı Fan Merch</div>
            <div class="fans-card-sub">Aktif + süperfan kitlesine tişört/kapüşon · (marka ürünü değil, fan ürünü)</div>
          </div></div>
          <div class="fans-line">Birim maliyet ₺140 · satış ₺320 · 30 günde bir</div>
          <button class="btn ${f.merchReady ? "btn-primary" : "btn-ghost"}" data-pact="fans-merch" ${f.merchReady ? "" : "disabled"}>
            ${f.merchReady ? "Fan Merch Drop Yap" : "Beklemede"}
          </button>
        </div>
        <div class="fans-card">
          <div class="fans-card-head"><div>
            <div class="fans-card-title">⭐ VIP / Özel İçerik</div>
            <div class="fans-card-sub">Ses kaydı, DM, erken dinleme</div>
          </div></div>
          <div class="fans-line">Süperfan başına ₺750 gelir · 20 günde bir</div>
          <button class="btn ${f.vipReady ? "btn-primary" : "btn-ghost"}" data-pact="fans-vip" ${f.vipReady ? "" : "disabled"}>
            ${f.vipReady ? "VIP İçerik Yayınla" : "Beklemede"}
          </button>
        </div>
        ${K.studio.note("💡", "Fan merch'i ve VIP anlık nakit sağlar; kulüp ise düzenli aylık gelir. (Kendi streetwear markan için sol panel → Girişim.)", "info")}
        <div class="fans-foot">Toplam kazanç: ${money(p.totalEarned || 0)} · Borç: ${money(p.debt || 0)}</div>
      </div>`;
  }

  K.phone.register({
    id: "fans", name: "Fanbase", icon: "💜", iconClass: "ic-fans", dock: false,

    render(params) {
      return {
        title: "Fanbase", sub: "Süperfan ekonomisi",
        shellClass: "app-fans",
        tabPos: "bottom",
        tabs: [
          { id: "kitle", label: "Kitle", icon: "💜" },
          { id: "kulup", label: "Fan Kulübü", icon: "🎟️" },
          { id: "urun", label: "Fan Merch & VIP", icon: "👕" }
        ],
        activeTab: params.tab || "kitle",
        render: (tab) => (tab === "kulup" ? kulupHTML() : tab === "urun" ? urunHTML() : kitleHTML()),
        onAction(pact) {
          if (pact === "fans-club") {
            const p = K.state.player;
            if (p.fanClub) K.fans.upgradeClub(); else K.fans.startClub();
            K.phone.renderTop();
          } else if (pact === "fans-merch") { K.fans.merchDrop(); K.phone.renderTop(); }
          else if (pact === "fans-vip") { K.fans.vipDrop(); K.phone.renderTop(); }
        }
      };
    }
  });
})(window.K = window.K || {});
