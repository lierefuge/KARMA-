/* ============================================================
   KARMA — core/events.js
   Tiny pub/sub bus + UI refresh signal.
   ============================================================ */
(function (K) {
  "use strict";

  const handlers = {};

  K.bus = {
    on(evt, fn) {
      (handlers[evt] = handlers[evt] || []).push(fn);
      return () => K.bus.off(evt, fn);
    },
    off(evt, fn) {
      if (!handlers[evt]) return;
      handlers[evt] = handlers[evt].filter(f => f !== fn);
    },
    emit(evt, payload) {
      (handlers[evt] || []).forEach(fn => {
        try { fn(payload); } catch (e) { console.error("[bus:" + evt + "]", e); }
      });
      (handlers["*"] || []).forEach(fn => {
        try { fn({ evt, payload }); } catch (e) { /* noop */ }
      });
    }
  };

  /* convenience: mark whole UI dirty */
  K.refresh = function () { K.bus.emit("refresh"); };
  K.toast = function (title, msg, kind) {
    // gün geçişi sırasında bildirimler kuyruğa alınır, sonra tek özet gösterilir
    if (K.quietMode > 0) {
      K._quietQueue = K._quietQueue || [];
      K._quietQueue.push({ title, msg, kind: kind || "" });
      return;
    }
    K.bus.emit("toast", { title, msg, kind: kind || "" });
  };
})(window.K);
