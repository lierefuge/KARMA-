/* ============================================================
   KARMA — systems/settings.js
   Kayıt slotları (3 + otomatik), oyun ayarları, zorluk.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;
  const SKEY = "karma_settings_v1";
  const SLOTS = [1, 2, 3];

  let cfg = { difficulty: "normal", reduceMotion: false, autosave: true, accent: "karma", contrast: false };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(SKEY) || "{}")); } catch (e) {}

  function key(n) { return "karma_save_slot_" + n; }
  function metaKey(n) { return "karma_save_meta_" + n; }

  K.settings = {
    get difficulty() { return cfg.difficulty; },
    all() { return Object.assign({}, cfg); },

    set(patch) {
      Object.assign(cfg, patch);
      try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {}
      document.body.classList.toggle("reduce-motion", !!cfg.reduceMotion);
      document.body.classList.toggle("contrast", !!cfg.contrast);
      document.body.classList.toggle("hide-values", !!K.settings.diffMult().hideValues);
      K.bus.emit("settings:changed", cfg);
    },

    /* Zorluk dengesi: gelir, maliyet, kriz, samimiyet, iş ücreti, başlangıç kasası */
    diffMult() {
      if (cfg.difficulty === "easy")
        return { income: 1.7, cost: 0.8, crisis: 0.5, affinity: 1.35, jobPay: 1.25, start: 1.6, hideValues: false, lists: 1.35, dm: 1.2 };
      if (cfg.difficulty === "hard")
        return { income: 0.6, cost: 1.3, crisis: 1.7, affinity: 0.75, jobPay: 0.85, start: 0.7, hideValues: true, lists: 0.68, dm: 0.8 };
      return { income: 1, cost: 1, crisis: 1, affinity: 1, jobPay: 1, start: 1, hideValues: false, lists: 1, dm: 1 };
    },

    /* ZOR MOD: sayısal kalite/tahmin değerleri arayüzde GİZLENİR.
       Oyuncu kulağıyla ve hissiyatla karar verir; "değer avcılığı" yapamaz.
       Zor modun altındaki zorluklarda (kolay/normal) değerler görünür. */
    valuesHidden() { return !!K.settings.diffMult().hideValues; },

    /* ---------------- slotlar ---------------- */
    slots() {
      return SLOTS.map(n => {
        let meta = null;
        try { meta = JSON.parse(localStorage.getItem(metaKey(n)) || "null"); } catch (e) {}
        return Object.assign({ n, empty: !localStorage.getItem(key(n)) }, meta || {});
      });
    },

    saveTo(n) {
      try {
        localStorage.setItem(key(n), JSON.stringify(K.state));
        localStorage.setItem(metaKey(n), JSON.stringify({
          day: K.state.day,
          stageName: K.state.player.stageName,
          balance: Math.round(K.state.balance),
          popularity: Math.round(K.state.player.popularity),
          songs: K.state.player.songs.length,
          savedAt: new Date().toISOString()
        }));
        K.toast("💾 Kaydedildi", "Slot " + n + " · Gün " + K.state.day, "ok");
        return true;
      } catch (e) { K.toast("Kayıt hatası", String(e.message || e), "bad"); return false; }
    },

    loadFrom(n) {
      const raw = localStorage.getItem(key(n));
      if (!raw) { K.toast("Boş slot", "Slot " + n + " boş.", "warn"); return false; }
      try {
        K.state = JSON.parse(raw);
        K.bus.emit("game:loaded", K.state);
        K.toast("📂 Yüklendi", "Slot " + n + " · Gün " + K.state.day, "ok");
        return true;
      } catch (e) { K.toast("Yükleme hatası", String(e.message || e), "bad"); return false; }
    },

    remove(n) {
      try {
        localStorage.removeItem(key(n));
        localStorage.removeItem(metaKey(n));
        K.toast("🗑️ Silindi", "Slot " + n + " temizlendi.", "warn");
        return true;
      } catch (e) { return false; }
    },

    newGame() {
      K.state = K.newGame();
      K.state.settings = K.settings.all();
      K.state.balance = Math.round(K.state.balance * K.settings.diffMult().start);
      K.relations.bootstrap();
      K.game.buildChart();
      K.save();
      K.bus.emit("game:loaded", K.state);
      K.toast("🎬 Yeni oyun", "Kariyerine baştan başladın.", "ok");
    },

    /* ---------------- yedekleme (dışa / içe aktarma) ---------------- */
    exportSave() {
      try {
        const data = JSON.stringify(K.state);
        const blob = new Blob([data], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "karma-kayit-gun" + (K.state.day || 1) + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
        K.toast("⬇️ Kayıt indirildi", "JSON dosyası olarak.", "ok");
      } catch (e) { K.toast("Dışa aktarma hatası", String(e.message || e), "bad"); }
    },

    importSave(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const d = JSON.parse(String(reader.result));
          if (!d || !d.player) throw new Error("geçersiz kayıt");
          K.state = d;
          K.settings.set({});                 // sınıfları yeniden uygula
          K.bus.emit("game:loaded", K.state);
          K.save();
          K.toast("📂 Kayıt yüklendi", "Gün " + (d.day || "?"), "ok");
          K.ui.closeModal(); K.refresh();
        } catch (e) { K.toast("Yükleme hatası", String(e.message || e), "bad"); }
      };
      reader.onerror = () => K.toast("Dosya okunamadı", "", "bad");
      reader.readAsText(file);
    },

    /* ---------------- ayarlar paneli ---------------- */
    openUI() {
      const slots = K.settings.slots();
      const diff = cfg.difficulty;
      const body = `
        <div class="set-section">
          <div class="set-title">Kayıt Slotları</div>
          ${slots.map(s => `
            <div class="slot-row ${s.empty ? "empty" : ""}">
              <div class="slot-num">${s.n}</div>
              <div class="grow">
                ${s.empty ? `<div class="slot-name">Boş slot</div>`
                  : `<div class="slot-name">${U.escape(s.stageName || "")}</div>
                     <div class="slot-sub">Gün ${s.day} · ${U.money(s.balance || 0)} · Pop ${s.popularity || 0} · ${s.songs || 0} şarkı</div>`}
              </div>
              <div class="action-row">
                <button class="btn btn-sm btn-primary" data-slot-save="${s.n}">Kaydet</button>
                <button class="btn btn-sm btn-ghost" data-slot-load="${s.n}" ${s.empty ? "disabled" : ""}>Yükle</button>
                <button class="btn btn-sm btn-danger" data-slot-del="${s.n}" ${s.empty ? "disabled" : ""}>Sil</button>
              </div>
            </div>`).join("")}
        </div>

        <div class="set-section">
          <div class="set-title">Zorluk</div>
          <div class="seg" style="margin:0">
            ${[["easy", "Kolay"], ["normal", "Normal"], ["hard", "Zor"]].map(([id, l]) =>
              `<button data-diff="${id}" class="${diff === id ? "active" : ""}">${l}</button>`).join("")}
          </div>
          <div class="hint">Kolay: +%35 gelir. Zor: −%28 gelir, krizler daha sık.</div>
        </div>

        <div class="set-section">
          <div class="set-title">Tercihler</div>
          <label class="switch-row"><span>Otomatik kayıt</span><input type="checkbox" id="set-autosave" ${cfg.autosave ? "checked" : ""} /></label>
          <label class="switch-row"><span>Hareketleri azalt</span><input type="checkbox" id="set-motion" ${cfg.reduceMotion ? "checked" : ""} /></label>
          <label class="switch-row"><span>Yüksek kontrast (erişilebilirlik)</span><input type="checkbox" id="set-contrast" ${cfg.contrast ? "checked" : ""} /></label>
        </div>

        <div class="set-section">
          <div class="set-title">Yedekleme</div>
          <div class="action-row">
            <button class="btn btn-sm btn-ghost" id="set-export">⬇️ Kaydı indir (JSON)</button>
            <button class="btn btn-sm btn-ghost" id="set-import">📂 Kaydı yükle</button>
          </div>
          <input type="file" id="set-import-file" accept="application/json,.json" style="display:none" />
          <div class="hint">Kayıt dosyasını indirip başka cihazda yükleyebilirsin.</div>
        </div>

        <div class="set-section">
          <div class="set-title">🧪 Test</div>
          <div class="action-row">
            <button class="btn btn-gold btn-sm" id="set-dev">Test Panelini Aç</button>
            <span class="hint" style="margin:0">Kısayol: Ctrl+Shift+D</span>
          </div>
          <div class="hint">Para, gün, popülerlik, anında yayın, takip ve bildirim testleri.</div>
        </div>

        <div class="set-section">
          <div class="action-row">
            <button class="btn btn-danger btn-sm" id="set-newgame">🎬 Yeni Oyuna Başla</button>
            <button class="btn btn-ghost btn-sm" id="set-hardreset">Tüm verileri sıfırla</button>
          </div>
        </div>`;

      const modal = K.ui.modal({
        title: "⚙️ Ayarlar & Kayıt",
        desc: "Kayıt slotları, zorluk ve tercihler",
        body,
        actions: [{ label: "Kapat" }]
      });

      const root = modal.bodyEl;
      root.addEventListener("click", e => {
        const sv = e.target.closest("[data-slot-save]");
        const ld = e.target.closest("[data-slot-load]");
        const dl = e.target.closest("[data-slot-del]");
        const df = e.target.closest("[data-diff]");
        if (sv) { K.settings.saveTo(+sv.dataset.slotSave); K.ui.closeModal(); K.settings.openUI(); }
        else if (ld) { if (K.settings.loadFrom(+ld.dataset.slotLoad)) { K.ui.closeModal(); K.refresh(); } }
        else if (dl) { K.settings.remove(+dl.dataset.slotDel); K.ui.closeModal(); K.settings.openUI(); }
        else if (df) { K.settings.set({ difficulty: df.dataset.diff }); K.ui.closeModal(); K.settings.openUI(); }
      });
      root.addEventListener("change", e => {
        if (e.target.id === "set-autosave") K.settings.set({ autosave: e.target.checked });
        if (e.target.id === "set-motion") K.settings.set({ reduceMotion: e.target.checked });
        if (e.target.id === "set-contrast") K.settings.set({ contrast: e.target.checked });
        if (e.target.id === "set-import-file") K.settings.importSave(e.target.files && e.target.files[0]);
      });
      root.addEventListener("click", e => {
        if (e.target.id === "set-dev") { K.ui.closeModal(); if (K.dev) K.dev.open(); return; }
        if (e.target.id === "set-export") { K.settings.exportSave(); return; }
        if (e.target.id === "set-import") { const f = root.querySelector("#set-import-file"); if (f) f.click(); return; }
        if (e.target.id === "set-newgame") {
          K.ui.closeModal();
          K.ui.confirm("Yeni oyun?", "Mevcut ilerleme kaydedilmediyse kaybolur.", () => {
            K.settings.newGame(); K.refresh();
          }, "Başla");
        }
        if (e.target.id === "set-hardreset") {
          K.ui.closeModal();
          K.ui.confirm("Her şeyi sil?", "Tüm slotlar, ayarlar ve önbellek silinir.", () => {
            [1, 2, 3].forEach(n => { try { localStorage.removeItem(key(n)); localStorage.removeItem(metaKey(n)); } catch (e) {} });
            try { localStorage.removeItem("karma_imagery_cache_v1"); localStorage.removeItem("karma_live_v1"); localStorage.removeItem("karma_music_game_v1"); } catch (e) {}
            K.toast("Sıfırlandı", "Sayfayı yenile.", "warn");
          }, "Sil");
        }
      });
    }
  };
})(window.K);
