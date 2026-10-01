/* ============================================================
   KARMA — apps/team.js
   Telefon uygulaması: EKİP
   Kişisel ekip (menajer/PR/avukat/mühendis/stilist) + Sponsorluklar
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  function teamHTML() {
    const p = K.state.player;
    const sal = K.team.salaryTotal();
    const roles = Object.keys(K.team.ROLES).map(id => {
      const d = K.team.ROLES[id];
      const lvl = K.team.level(id);
      const cost = K.team.hireCost(id);
      const maxed = lvl >= d.max;
      return K.studio.card(
        `<div class="studio-head">
           <div class="studio-title">${d.icon} ${U.escape(d.name)} ${lvl ? `<span class="pill">Sv ${lvl}</span>` : ""}</div>
           <div class="studio-row-val">${lvl ? U.money(d.salary * lvl) + "/ay" : "—"}</div>
         </div>
         <div class="hint" style="margin-bottom:8px">${U.escape(d.desc)}</div>
         <div class="studio-row"><div class="studio-row-label">Seviye</div>${K.studio.bar((lvl / d.max) * 100, { cls: "lg" })}<div class="studio-row-val">${lvl}/${d.max}</div></div>
         <div class="action-row">
           <button class="btn btn-sm ${maxed ? "btn-ghost" : "btn-primary"}" data-pact="team-hire" data-arg="${id}" ${maxed ? "disabled" : ""}>${maxed ? "Maks." : (lvl ? "Yükselt " : "İşe al ") + U.money(cost)}</button>
           ${lvl ? `<button class="btn btn-sm btn-ghost" data-pact="team-fire" data-arg="${id}">Çıkar</button>` : ""}
         </div>`,
        lvl ? K.studio.ACCENT.ok : K.studio.ACCENT.info
      );
    }).join("");
    return `<div class="sp-stat-row">
        ${K.studio.stat("Aylık Maaş", U.money(sal), "rgba(110,195,255,.1)")}
        ${K.studio.stat("Toplam Seviye", Object.keys(K.team.ROLES).reduce((n, r) => n + K.team.level(r), 0), "rgba(110,195,255,.1)")}
      </div>`
      + K.studio.note("💡", sal > 0 ? `Ekip sana aylık <b>${U.money(sal)}</b> masraf; buna karşılık avans, kalite, promo ve imajda artı sağlar.` : "Henüz ekip yok. Küçük bir ekiple başlamak net kazanç getirir.", sal > 0 ? "info" : "dim")
      + roles;
  }

  function sponsorHTML() {
    const list = K.sponsor.active();
    const monthly = K.sponsor.monthlyTotal();
    const rows = list.length ? list.map(x => `
      <div class="gl-badge on">
        <div class="gl-badge-ic">${x.icon || "💼"}</div>
        <div class="grow" style="min-width:0">
          <div class="gl-badge-name">${U.escape(x.name)}</div>
          <div class="gl-badge-desc">${U.escape(x.cat)} · imaj ${x.img >= 0 ? "+" : ""}${x.img} · ${x.untilDay - K.state.day} gün kaldı</div>
        </div>
        <div class="gl-badge-val">${U.money(x.fee)}/ay</div>
      </div>`).join("")
      : `<div class="empty-note"><b>Aktif sponsorluk yok</b>Popülerliğin yükseldikçe markalar teklif getirir.</div>`;
    return `<div class="sp-stat-row">
        ${K.studio.stat("Aylık Sponsor Geliri", U.money(monthly), "rgba(255,203,92,.12)")}
        ${K.studio.stat("Aktif Anlaşma", list.length, "rgba(255,203,92,.12)")}
      </div>`
      + K.studio.note("💼", "Yüksek getirili markalar (alkol/bahis) imajı yorar; teknoloji/spor markaları güçlendirir. Dengeli seç.", "hot")
      + rows;
  }

  K.phone.register({
    id: "team", name: "Kişisel Ekip", icon: "🧑‍💼", iconClass: "ic-team", dock: false,

    render(params) {
      return {
        title: "Kişisel Ekip & Sponsor", sub: "Sana bağlı çalışanlar ve marka anlaşmaları",
        shellClass: "app-team",
        tabPos: "bottom",
        tabs: [{ id: "kadro", label: "Kişisel Ekip", icon: "🧑‍💼" }, { id: "sponsor", label: "Sponsorluk", icon: "💼" }],
        activeTab: params.tab || "kadro",
        render: (tab) => (tab === "sponsor" ? sponsorHTML() : teamHTML()),
        onAction: (act, el) => {
          if (act === "team-hire") { K.team.hire(el.dataset.arg); K.phone.renderTop(); }
          else if (act === "team-fire") { K.team.fire(el.dataset.arg); K.phone.renderTop(); }
        }
      };
    }
  });
})(window.K = window.K || {});
