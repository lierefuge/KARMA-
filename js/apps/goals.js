/* ============================================================
   KARMA — apps/goals.js
   Telefon uygulaması: HEDEFLER
   Başarımlar · Haftalık görevler · Takvim · Başlangıç rehberi
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  function achHTML() {
    const list = K.goals.achievements();
    const open = list.filter(a => a.unlocked).length;
    const rows = list.map(a => `
      <div class="gl-badge ${a.unlocked ? "on" : ""}">
        <div class="gl-badge-ic">${a.unlocked ? a.icon : "🔒"}</div>
        <div class="grow" style="min-width:0">
          <div class="gl-badge-name">${U.escape(a.name)}</div>
          <div class="gl-badge-desc">${U.escape(a.desc)}</div>
        </div>
        <div class="gl-badge-val">${a.unlocked ? "Gün " + a.day : U.money(a.reward)}</div>
      </div>`).join("");
    return `<div class="gl-top">🏆 ${open}/${list.length} başarım açıldı</div>${rows}`;
  }

  function questHTML() {
    const q = K.goals.questProgress();
    if (!q.list.length) return `<div class="empty-note"><b>Görev yok</b>Günler geçtikçe haftalık görevler oluşur.</div>`;
    return `<div class="gl-top" style="background:rgba(176,108,255,.14)">🎯 Hafta ${q.week + 1} · ${q.list.filter(x => x.done).length}/${q.list.length} tamam</div>`
      + q.list.map(x => K.studio.card(
        `<div class="studio-head"><div class="studio-title">${x.icon} ${U.escape(x.name)}</div>`
        + `<span class="pill ${x.done ? "money" : ""}">${x.done ? "✓ Bitti" : U.money(x.reward)}</span></div>`
        + `<div class="hint" style="margin-bottom:6px">${U.escape(x.desc)}</div>`
        + K.studio.bar(x.pct, { cls: "lg", color: x.done ? "linear-gradient(90deg,#4ade80,#5ce89b)" : undefined })
        + K.studio.note("🎯", x.done ? "Tamamlandı, ödül kasada." : `İlerleme: ${U.compact(x.progress)} / ${U.compact(x.target)} (%${x.pct})`, x.done ? "ok" : "violet"),
        x.done ? K.studio.ACCENT.ok : K.studio.ACCENT.violet
      )).join("");
  }

  function calHTML() {
    const s = K.state;
    const ev = K.goals.calendar(20);
    if (!ev.length) return `<div class="empty-note"><b>Yaklaşan olay yok</b>Yayın, konser veya turne planla.</div>`;
    return ev.map(e => {
      const inDays = e.day - s.day;
      return `<div class="studio-row" style="margin:8px 0">
        <div style="width:34px;font-size:20px">${e.icon}</div>
        <div class="grow" style="min-width:0">
          <div style="font-size:12.5px;font-weight:700">${U.escape(e.title)}</div>
          <div class="hint">Gün ${e.day}</div>
        </div>
        <span class="pill ${inDays <= 2 ? "hot" : ""}">${inDays <= 0 ? "bugün" : inDays + " gün"}</span>
      </div>`;
    }).join("");
  }

  function guideHTML() {
    const list = K.goals.tutorial();
    const pct = K.goals.tutorialDonePct();
    return `<div class="gl-top" style="background:rgba(110,195,255,.14)">🧭 Başlangıç rehberi · %${pct} tamam</div>`
      + list.map(t => `
        <div class="gl-badge ${t.done ? "on" : ""}">
          <div class="gl-badge-ic">${t.done ? "✅" : t.icon}</div>
          <div class="grow" style="min-width:0">
            <div class="gl-badge-name">${U.escape(t.text)}</div>
            <div class="gl-badge-desc">${U.escape(t.hint)}</div>
          </div>
        </div>`).join("");
  }

  K.phone.register({
    id: "goals", name: "Hedefler", icon: "🎯", iconClass: "ic-goals", dock: false,

    render(params) {
      return {
        title: "Hedefler", sub: "Başarımlar & görevler",
        shellClass: "app-goals",
        tabPos: "bottom",
        tabs: [
          { id: "basari", label: "Başarımlar", icon: "🏆" },
          { id: "gorev", label: "Görevler", icon: "🎯" },
          { id: "takvim", label: "Takvim", icon: "📅" },
          { id: "rehber", label: "Rehber", icon: "🧭" }
        ],
        activeTab: params.tab || "basari",
        render: (tab) => {
          if (tab === "gorev") return questHTML();
          if (tab === "takvim") return calHTML();
          if (tab === "rehber") return guideHTML();
          return achHTML();
        }
      };
    }
  });
})(window.K = window.K || {});
