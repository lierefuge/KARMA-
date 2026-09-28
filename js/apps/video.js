/* ============================================================
   KARMA — apps/video.js
   Telefon uygulaması: KLİP STÜDYOSU
   Şarkıya music video çekimi (bütçe kademeleri) + arşiv
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  function shootHTML() {
    const songs = K.video.candidates().filter(s => !s.mv);
    const sum = K.video.summary();
    const tiers = K.video.TIERS;
    if (!songs.length) {
      return `<div class="empty-note"><b>Kliplenecek şarkı yok</b>${K.state.player.songs.length ? "Tüm şarkılarının klibi var 🎬" : "Önce bir şarkı yayınla, sonra klip çek."}</div>`
        + `<div class="sp-stat-row">${K.studio.stat("Çekilen Klip", sum.total)}${K.studio.stat("Harcama", U.money(sum.spend))}</div>`;
    }
    const list = songs.slice(0, 12).map(sg => K.studio.card(
      `<div class="studio-head">
         <div class="studio-title">${U.escape(sg.title)}</div>
         <div class="studio-row-val">${U.compact(sg.streams || 0)} dinlenme</div>
       </div>
       <div class="action-row" style="flex-wrap:wrap">
         ${tiers.map(t => `<button class="btn btn-sm ${K.economy.canAfford(t.cost) ? "btn-primary" : "btn-ghost"}" data-pact="shoot" data-arg="${sg.id}|${t.id}">${t.icon} ${U.escape(t.name)} · ${U.money(t.cost)}</button>`).join("")}
       </div>`,
      K.studio.ACCENT.info
    )).join("");

    return `<div class="sp-stat-row">
        ${K.studio.stat("Çekilen Klip", sum.total, "rgba(110,195,255,.1)")}
        ${K.studio.stat("Klip Harcaması", U.money(sum.spend), "rgba(110,195,255,.1)")}
      </div>`
      + K.ui.section("Kademe Rehberi")
      + tiers.map(t => K.studio.row(t.icon + " " + t.name, Math.round(t.boost / tiers[2].boost * 100),
        "+%" + Math.round(t.boost * 100) + " ivme · " + U.money(t.cost), { color: "linear-gradient(90deg,#6ec3ff,#b06cff)" })).join("")
      + K.studio.note("🎥", "Kademe yükseldikçe kalıcı dinlenme ivmesi, YouTube görüntülenmesi ve viral şansı artar. Klip sonradan çekilir, yayın öncesi zorunlu değildir.", "info")
      + K.ui.section("Klip Çekilecek Şarkılar", `<span class="muted">${songs.length}</span>`)
      + list;
  }

  function archiveHTML() {
    const sum = K.video.summary();
    const withMv = (K.state.player.songs || []).filter(s => s.mv).sort((a, b) => (b.mv.day || 0) - (a.mv.day || 0));
    if (!withMv.length) return `<div class="empty-note"><b>Arşiv boş</b>Henüz klip çekmedin. “Klip Çek” sekmesinden başla.</div>`;
    return `<div class="sp-stat-row">
        ${K.studio.stat("Toplam Klip", sum.total, "rgba(74,222,128,.1)")}
        ${K.studio.stat("Toplam Harcama", U.money(sum.spend), "rgba(74,222,128,.1)")}
      </div>`
      + withMv.map(s => K.studio.card(
        `<div class="studio-head">
           <div class="studio-title">${s.mv.icon} ${U.escape(s.title)}</div>
           <span class="pill hot">${U.escape(s.mv.name)}</span>
         </div>
         <div class="hint">Gün ${s.mv.day} · ${U.money(s.mv.cost)} · YouTube ${U.compact(s.youtubeViews || 0)} görüntülenme</div>
         ${K.studio.row("İvme", Math.round((s.boosts && s.boosts.mv || 0) / 0.34 * 100), "+%" + Math.round(((s.boosts && s.boosts.mv) || 0) * 100), { color: "linear-gradient(90deg,#4ade80,#6ec3ff)" })}
         ${K.studio.note("🎬", s.viral ? "Bu klip viral oldu — ses trendiyle birlikte beslemeye devam et." : "Klip ivmesi kalıcıdır; şarkı zaten yayında olduğu için buradan yükselir.", s.viral ? "ok" : "dim")}`,
        K.studio.ACCENT.ok
      )).join("");
  }

  K.phone.register({
    id: "video", name: "Klip", icon: "🎬", iconClass: "ic-video", dock: false,

    render(params) {
      return {
        title: "Klip Stüdyosu", sub: "Music video üretimi",
        shellClass: "app-video",
        tabPos: "bottom",
        tabs: [
          { id: "cek", label: "Klip Çek", icon: "🎬" },
          { id: "arsiv", label: "Arşiv", icon: "📼" }
        ],
        activeTab: params.tab || "cek",
        render: (tab) => (tab === "arsiv" ? archiveHTML() : shootHTML()),
        onAction(act, el) {
          if (act !== "shoot") return;
          const parts = (el.dataset.arg || "").split("|");
          K.video.shoot(parts[0], parts[1]);
          K.phone.renderTop();
        }
      };
    }
  });
})(window.K = window.K || {});
