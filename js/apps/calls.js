/* ============================================================
   KARMA — apps/calls.js   (v10.30)
   Telefon uygulaması: gelen aramalar (aç/reddet/mesaj) + arama geçmişi.
   Motor: systems/calls.js
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  K.phone.register({
    id: "calls", name: "Telefon", icon: "📞", iconClass: "ic-calls", dock: false,

    unread() { return (K.calls && K.calls.ringingCount) ? K.calls.ringingCount() : 0; },

    render() {
      return {
        title: "Telefon", sub: "Aramalar",
        shellClass: "app-calls",
        tabs: [
          { id: "incoming", label: "Gelen", icon: "📞" },
          { id: "history", label: "Geçmiş", icon: "🕓" }
        ],
        activeTab: "incoming",
        render: (tab) => (tab === "history" ? K.phone.appById("calls").historyHTML() : K.phone.appById("calls").incomingHTML()),
        onAction: (act, el) => {
          const app = K.phone.appById("calls");
          if (act === "call-open") { K.calls.open(el.dataset.arg); return; }
          if (act === "call-reject") { K.calls.reject(el.dataset.arg); K.phone.reRender(); return; }
          if (act === "call-answer") { K.calls.open(el.dataset.arg); return; }
          if (act === "call-clear") { K.state.player.callLog = []; K.save(); K.toast("🕓 Geçmiş temizlendi", "", "ok"); K.phone.reRender(); return; }
        }
      };
    },

    incomingHTML() {
      const list = K.calls.ringing();
      if (!list.length) {
        return `<div class="empty-note"><b>Gelen arama yok</b>Biri seni aradığında burada görünür. Günü bitirdikçe yeni aramalar gelir — aç, reddet ya da mesajla yanıtla.</div>`;
      }
      return `<div class="call-section-title">Şu an çalıyor (${list.length})</div>` + list.map(c => `
        <div class="call-row ringing">
          <div class="call-row-ic">${c.icon || "📞"}</div>
          <div class="grow">
            <div class="call-row-name">${U.escape(c.callerName)}</div>
            <div class="call-row-sub">${U.escape((K.calls.KINDS[c.kind] || {}).label || "Arayan")} · ${Math.max(0, (c.expiresDay || 0) - K.state.day)} gün içinde yanıtla</div>
          </div>
          <div class="call-row-actions">
            <button class="call-mini reject" data-pact="call-reject" data-arg="${c.id}" title="Reddet">📵</button>
            <button class="call-mini answer" data-pact="call-answer" data-arg="${c.id}" title="Aç">📞</button>
          </div>
        </div>`).join("");
    },

    historyHTML() {
      const list = K.calls.history();
      if (!list.length) return `<div class="empty-note"><b>Geçmiş boş</b>Cevapladığın, reddettiğin ve kaçırdığın aramalar burada listelenir.</div>`;
      const label = {
        answered: ["📞", "Cevaplandı", "money"],
        rejected: ["📵", "Reddedildi", "hot"],
        messaged: ["✉️", "Mesajla yanıtlandı", "gold"],
        missed: ["⏳", "Cevapsız", "warn"]
      };
      return `<div class="call-section-title">Arama geçmişi</div>` + list.map(h => {
        const L = label[h.status] || ["📞", h.status, ""];
        return `<div class="call-row">
          <div class="call-row-ic">${h.icon || "📞"}</div>
          <div class="grow">
            <div class="call-row-name">${U.escape(h.callerName)}</div>
            <div class="call-row-sub">${U.escape((K.calls.KINDS[h.kind] || {}).label || "")} · Gün ${h.day}</div>
            ${h.reply ? `<div class="call-row-reply">${U.escape(h.reply)}</div>` : ""}
          </div>
          <span class="pill ${L[2]}">${L[0]} ${L[1]}</span>
        </div>`;
      }).join("") + `<button class="btn btn-sm btn-ghost" data-pact="call-clear" style="margin-top:10px">🕓 Geçmişi temizle</button>`;
    }
  });
})(window.K = window.K || {});
