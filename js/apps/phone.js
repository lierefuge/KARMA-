/* ============================================================
   KARMA — apps/phone.js
   Telefon işletim sistemi: kilit/ana ekran, uygulama kaydı,
   görünüm yığını (push/pop), durum çubuğu, dock ve rozetler.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  K.phone = {
    apps: [],
    views: [],           // görünüm yığını
    homeActive: true,
    openAppId: null,
    editMode: false,     // ana ekran düzenleme modu

    /* ---------------- kayıt ---------------- */
    register(def) {
      K.phone.apps.push(def);
    },

    appById(id) { return K.phone.apps.find(a => a.id === id); },

    /* ---------------- init ---------------- */
    init() {
      U.on(U.qs("#home-indicator"), "click", () => { K.phone.haptic(12); K.phone.home(); });
      U.on(U.qs("#phone-viewport"), "click", K.phone.onClick);
      // durum çubuğuna dokunmak da ana ekrana döndürür (kapan tuzağına karşı emniyet)
      const sb = U.qs(".status-bar");
      if (sb) {
        sb.style.pointerEvents = "auto";
        U.on(sb, "click", (e) => {
          if (e.target.closest("#status-cc")) { if (K.cc) K.cc.open(); return; }
          K.phone.home();
        });
      }
      // ESC: önce modal, sonra telefon ekranı
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const mr = U.qs("#modal-root");
        if (mr && mr.classList.contains("open")) { K.ui.closeModal(); return; }
        if (!K.phone.homeActive) K.phone.home();
      });
      K.phone.setupSwipe();
      K.phone.render();
    },

    /* ---------------- yatay kaydırma (gesture) ----------------
       Görünümün "swipe" ayarına göre çalışır:
         swipe: { left: fn, right: fn }
       Instagram: sağa → DM, sola → canlı yayın. */
    setupSwipe() {
      const vp = U.qs("#phone-viewport");
      if (!vp) return;
      let x0 = 0, y0 = 0, t0 = 0, tracking = false;
      const pt = e => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      const start = e => {
        const t = pt(e);
        if (!t || t.clientX == null) return;
        x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); tracking = true;
      };
      const end = e => {
        if (!tracking) return;
        tracking = false;
        const t = pt(e);
        if (!t || t.clientX == null) return;
        const dx = t.clientX - x0, dy = t.clientY - y0;
        if (Date.now() - t0 > 800) return;
        if (Math.abs(dx) < 60) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.4) return;   // dikey kaydırma (besleme) sayılsın
        K.phone.doGesture(dx);
      };
      vp.addEventListener("touchstart", start, { passive: true });
      vp.addEventListener("touchend", end, { passive: true });
      vp.addEventListener("touchcancel", () => { tracking = false; }, { passive: true });
      try {
        vp.addEventListener("pointerdown", start);
        vp.addEventListener("pointerup", end);
      } catch (e) {}

      /* v10.19 — DİKEY HAREKETLER (telefon gerçekçiliği)
         Gerçek bir telefonda kenar hareketleri vardır:
           · alt kenardan yukarı çek  → ana ekran
           · üst köşeden aşağı çek    → Kontrol Merkezi
         Yalnızca touch olaylarıyla bağlanır: pointer olayları da
         bağlanırsa aynı hareket iki kez işlenir ve ekran zıplar. */
      K.phone.setupVerticalGestures();
    },

    /* kenar hareketleri: hareket YALNIZCA kenar bölgesinde başlarsa sayılır,
       aksi hâlde listeyi kaydırmak isteyen oyuncu yanlışlıkla eve dönerdi. */
    setupVerticalGestures() {
      const screen = U.qs("#phone-screen");
      if (!screen || screen._vgBound) return;
      screen._vgBound = true;
      const EDGE_BOTTOM = 70, EDGE_TOP = 54;
      let y0 = 0, x0 = 0, t0 = 0, zone = null;
      const pt = e => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      const start = e => {
        const t = pt(e);
        if (!t || t.clientY == null) return;
        const r = screen.getBoundingClientRect();
        y0 = t.clientY; x0 = t.clientX; t0 = Date.now();
        if (r.bottom - t.clientY <= EDGE_BOTTOM) zone = "bottom";
        else if (t.clientY - r.top <= EDGE_TOP) zone = "top";
        else zone = null;
      };
      const end = e => {
        const z = zone; zone = null;
        if (!z) return;
        const t = pt(e);
        if (!t || t.clientY == null) return;
        if (Date.now() - t0 > 700) return;
        const dy = t.clientY - y0, dx = t.clientX - x0;
        if (Math.abs(dy) < 55 || Math.abs(dy) < Math.abs(dx) * 1.4) return;
        if (z === "bottom" && dy < 0) { K.phone.haptic(12); K.phone.home(); }
        else if (z === "top" && dy > 0) { K.phone.haptic(10); if (K.cc) K.cc.open(); }
      };
      screen.addEventListener("touchstart", start, { passive: true });
      screen.addEventListener("touchend", end, { passive: true });
      screen.addEventListener("touchcancel", () => { zone = null; }, { passive: true });
    },

    /* dokunsal geri bildirim — destekleyen cihazda kısa titretme.
       Masaüstünde ve desteklemeyen tarayıcılarda sessizce yok sayılır. */
    haptic(ms) {
      try {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(ms || 10);
        }
      } catch (e) {}
    },

    /* dx > 0 → sağa kaydırma, dx < 0 → sola kaydırma */
    doGesture(dx) {
      const v = K.phone.views[K.phone.views.length - 1];
      if (!v || !v.swipe) return false;
      if (dx > 0 && typeof v.swipe.right === "function") { v.swipe.right(); return true; }
      if (dx < 0 && typeof v.swipe.left === "function") { v.swipe.left(); return true; }
      return false;
    },

    /* tüm zamanlayıcıları durdur (ekran değişince sızıntı/tuzağı önler) */
    clearTimers() {
      if (K.phone._barTimer) { clearInterval(K.phone._barTimer); K.phone._barTimer = null; }
      const msgApp = K.phone.appById && K.phone.appById("messages");
      if (msgApp && msgApp._watchTimer) { clearInterval(msgApp._watchTimer); msgApp._watchTimer = null; }
      if (K.phone._storyTimer) { clearInterval(K.phone._storyTimer); K.phone._storyTimer = null; }
      if (K.ui._ytProgTimer) { clearInterval(K.ui._ytProgTimer); K.ui._ytProgTimer = null; }
      if (K.ui._liveTimer) { clearInterval(K.ui._liveTimer); K.ui._liveTimer = null; }
      if (K.ui._ytVizStop) { try { K.ui._ytVizStop(); } catch (e) {} K.ui._ytVizStop = null; }
      if (K.ui._pvRaf) { try { cancelAnimationFrame(K.ui._pvRaf); } catch (e) {} K.ui._pvRaf = null; }
    },

    /* ---------------- ana ekran sayfaları ---------------- */
    _mountHome(vp) {
      const pages = vp.querySelector("[data-hp]");
      if (!pages) return;
      const dots = Array.prototype.slice.call(vp.querySelectorAll("[data-hdot]"));
      const setActive = () => {
        const w = pages.clientWidth || 1;
        const idx = Math.round(pages.scrollLeft / w);
        dots.forEach((dt, i) => dt.classList.toggle("on", i === idx));
      };
      pages.addEventListener("scroll", () => {
        if (K.phone._dotTimer) return;
        K.phone._dotTimer = setTimeout(() => { K.phone._dotTimer = null; setActive(); }, 60);
      });
      K.phone._homePages = pages;
      setActive();
    },

    goPage(i) {
      const pages = K.phone._homePages || U.qs("[data-hp]");
      if (!pages) return;
      const w = pages.clientWidth || 0;
      if (pages.scrollTo) { try { pages.scrollTo({ left: i * w, behavior: "smooth" }); } catch (e) { pages.scrollLeft = i * w; } }
      else pages.scrollLeft = i * w;
      const host = pages.parentElement || pages.parentNode;
      const dots = host ? Array.prototype.slice.call(host.querySelectorAll("[data-hdot]")) : [];
      dots.forEach((dt, k) => dt.classList.toggle("on", k === i));
    },

    /* ---------------- zaman ---------------- */
    updateStatus() {
      const s = K.state;
      const dow = U.dateForDay(s.day);
      // 09:41 temelli, gün ilerledikçe saat ilerler
      const minutes = (9 * 60 + 41 + (s.day * 47)) % (24 * 60);
      const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
      const mm = String(minutes % 60).padStart(2, "0");
      const t = U.qs("#status-time");
      if (t) t.textContent = hh + ":" + mm;
      if (K.phoneOS) K.phoneOS.apply();   // parlaklık + telefon teması
    },

    /* ---------------- ana ekran ---------------- */
    render() {
      K.phone.updateStatus();
      const vp = U.qs("#phone-viewport");
      if (K.phone.homeActive || !K.phone.views.length) {
        K.phone.clearTimers();
        vp.innerHTML = K.phone.homeHTML();
        if (K.phone._mountHome) K.phone._mountHome(vp);
      } else {
        K.phone.renderTop();
      }
    },

    homeHTML() {
      const s = K.state;
      const d = U.dateForDay(s.day);
      const unread = K.relations.unreadTotal();
      const badge = {
        messages: unread,
        instagram: Math.round(s.player.ig / 50000),
        x: Math.round(s.player.x / 90000),
        tiktok: Math.round(s.player.tiktok / 70000),
        youtube: 0
      };
      // uygulama kendi okunmamış sayısını veriyorsa onu kullan (ör. YouTube bildirimleri)
      K.phone.apps.forEach(a => {
        if (typeof a.unread === "function") { try { badge[a.id] = a.unread() || 0; } catch (e) {} }
      });

      const shown = K.phone.apps.filter(a => (K.phoneOS ? K.phoneOS.installed(a.id) : true));
      const dock = shown.filter(a => a.dock).map(a => K.phone.iconHTML(a, badge[a.id] || 0)).join("");

      const lay = K.phoneHome.layout();
      const folderIcon = (en, pi, ei) => {
        const prev = (en.items || []).slice(0, 4).map(id => {
          const a = K.phone.appById(id);
          return a ? `<span class="fl-mini ${a.iconClass || ""}">${K.brandIcon(a.id) || a.icon}</span>` : "";
        }).join("");
        return `<button class="app-icon-wrap" data-open-folder="${pi}:${ei}"><div class="app-icon folder">${prev}</div><span class="app-label">${U.escape(en.name || "Klasör")}</span></button>`;
      };
      const pages = lay.pages.map((pg, pi) => {
        const items = pg.map((en, ei) => {
          if (en.t === "folder") return folderIcon(en, pi, ei);
          const a = K.phone.appById(en.id);
          return a ? K.phone.iconHTML(a, badge[a.id] || 0) : "";
        }).join("");
        return `<div class="home-page" data-page="${pi}"><div class="app-grid">${items || '<div class="mini-empty" style="grid-column:1/-1">Boş sayfa · + Sayfa ile düzenle</div>'}</div></div>`;
      }).join("");
      const dots = lay.pages.map((pg, i) => `<button class="home-dot ${i === 0 ? "on" : ""}" data-hdot="${i}"></button>`).join("");

      const wp = K.phoneOS ? K.phoneOS.wallpaper() : null;
      const np = (K.audio && K.audio.isPlaying()) ? K.audio.current() : null;
      const mini = np ? `<div class="mini-player" data-pact="nowplaying">
          <span class="mp-art" style="background:${U.gradientFor(np.id || np.title)}"></span>
          <div class="grow" style="min-width:0"><div class="mp-title">${U.escape(np.title || "")}</div><div class="mp-sub">${U.escape(np.artistName || "")}</div></div>
          <button class="mp-btn" data-pact="np-toggle">${K.audio.isPlaying() ? "⏸" : "▶"}</button>
        </div>` : "";

      return `
        <div class="screen home-screen ${K.phone.editMode ? "editing" : ""}"${wp ? ` style="background:${wp.css}"` : ""}>
          <div class="home-top">
            <div class="home-header">
              <div class="dow">${d.dow}</div>
              <div class="full-date">${d.label}</div>
              <div class="home-chips">
                <div class="balance-chip">₺ ${U.fmt(s.balance)}</div>
                <button class="bell-chip" data-pact="home-notifs" title="Bildirimler">
                  🔔${(s.notifications || []).length ? `<b>${Math.min(99, (s.notifications || []).length)}</b>` : ""}
                </button>
                <button class="bell-chip" data-pact="home-edit" title="Düzenle">${K.phone.editMode ? "✓" : "✎"}</button>
              </div>
            </div>
            <div class="home-search" data-pact="spotlight"><span>🔎</span><span>Ara</span><span class="hs-cc" data-pact="cc" title="Kontrol Merkezi">⛭</span></div>
            ${K.phone.editMode ? `<div class="home-editbar"><span>Simgeye dokun: taşı / klasörle</span><button data-pact="home-addpage">+ Sayfa</button></div>` : ""}
          </div>
          <div class="home-pages" data-hp>${pages}</div>
          <div class="home-dots">${dots}</div>
          ${mini}
          <div class="home-dock">${dock}</div>
        </div>`;
    },

    iconHTML(a, count) {
      return `<button class="app-icon-wrap" data-open-app="${a.id}">
        <div class="app-icon ${a.iconClass || ""}">
          ${K.brandIcon(a.id) || a.icon}
          ${count > 0 ? `<span class="app-badge">${count > 99 ? "99+" : count}</span>` : ""}
        </div>
        <span class="app-label">${U.escape(a.name)}</span>
      </button>`;
    },

    /* ---------------- aç / kapat ---------------- */
    openApp(id, params) {
      const app = K.phone.appById(id);
      if (!app) { K.toast("Uygulama bulunamadı", id, "warn"); return; }
      const view = app.render(params || {});
      view.appId = id;
      view.params = params || {};
      K.phone.openAppId = id;
      K.phone.views = [view];
      K.phone.homeActive = false;
      K.phone.haptic(8);
      K.phone.render();
    },

    pushView(view) {
      K.phone.views.push(view);
      K.phone.homeActive = false;
      K.phone.render();
    },

    replaceView(view) {
      if (K.phone.views.length) K.phone.views[K.phone.views.length - 1] = view;
      else K.phone.views = [view];
      K.phone.render();
    },

    back() {
      if (K.phone.views.length > 1) {
        K.phone.views.pop();
        K.phone.render();
      } else {
        K.phone.home();
      }
    },

    home() {
      K.phone.clearTimers();
      K.phone.views = [];
      K.phone.homeActive = true;
      K.phone.openAppId = null;
      K.phone.render();
    },

    reRender() {
      if (K.phone.homeActive) K.phone.render();
      else K.phone.renderTop();
    },

    /* ---------------- görünüm render ---------------- */
    renderTop() {
      const v = K.phone.views[K.phone.views.length - 1];
      if (!v) { K.phone.render(); return; }
      const vp = U.qs("#phone-viewport");
      const bottom = v.tabPos === "bottom";
      const tabsHTML = v.tabs && v.tabs.length ? `
        <div class="seg ${bottom ? "seg-bottom" : ""}" data-tabs>
          ${v.tabs.map(t => `<button data-tab="${t.id}" class="${(v.activeTab || v.tabs[0].id) === t.id ? "active" : ""}">${t.icon ? `<span class="tb-ic">${t.icon}</span>` : ""}<span class="tb-lb">${U.escape(t.label)}</span></button>`).join("")}
        </div>` : "";
      const backBtn = `<button class="app-back" data-back>‹</button>`;
      const navRight = v.navRight || "";

      vp.innerHTML = `
        <div class="screen push app-shell ${v.shellClass || ""} ${bottom ? "has-bottom-tabs" : ""}">
          <div class="app-nav">
            ${backBtn}
            <div class="grow" style="min-width:0">
              <div class="app-nav-title">${U.escape(v.title || "")}</div>
              ${v.sub ? `<div class="app-nav-sub">${U.escape(v.sub)}</div>` : ""}
            </div>
            ${navRight}
          </div>
          ${bottom ? "" : tabsHTML}
          <div class="app-body" data-body>${v.render((v.activeTab || (v.tabs && v.tabs[0] && v.tabs[0].id)), v.params)}</div>
          ${bottom ? tabsHTML : ""}
          ${v.composer || ""}
          ${v.musicBar ? K.ui.musicBar(v.appId) : ""}
        </div>`;

      if (v.onMount) v.onMount(U.qs(".app-body", vp), v);
      if (v.onMountFull) v.onMountFull(vp, v);

      // müzik çubuğu ilerlemesi (canlı)
      if (K.phone._barTimer) { clearInterval(K.phone._barTimer); K.phone._barTimer = null; }
      if (v.musicBar) {
        K.phone._barTimer = setInterval(() => {
          const el = vp.querySelector("[data-mb-prog]");
          if (!el) return;
          const pr = K.audio ? K.audio.progress() : 0;
          el.style.width = (pr * 100).toFixed(1) + "%";
        }, 300);
      }
      K.phone.updateStatus();
    },

    /* ---------------- click delegasyonu ---------------- */
    onClick(e) {
      const folderBtn = e.target.closest("[data-open-folder]");
      if (folderBtn) {
        const parts = (folderBtn.dataset.openFolder || "").split(":");
        const pi = +parts[0], ei = +parts[1];
        if (K.phone.editMode) K.phoneHome.editFolder(pi, ei);
        else K.phoneHome.openFolder(pi, ei);
        return;
      }
      const dot = e.target.closest("[data-hdot]");
      if (dot) { K.phone.goPage(+dot.dataset.hdot); return; }

      const openBtn = e.target.closest("[data-open-app]");
      if (openBtn) {
        if (K.phone.editMode) { K.phoneHome.editApp(openBtn.dataset.openApp); return; }
        K.phone.openApp(openBtn.dataset.openApp); return;
      }

      const back = e.target.closest("[data-back]");
      if (back) { K.phone.back(); return; }

      const tab = e.target.closest("[data-tab]");
      if (tab) {
        const v = K.phone.views[K.phone.views.length - 1];
        if (v) { v.activeTab = tab.dataset.tab; K.phone.renderTop(); }
        return;
      }

      // uygulamaya özel aksiyonlar
      const actEl = e.target.closest("[data-pact]");
      if (actEl) {
        const pact = actEl.dataset.pact;

        // ---- tüm uygulamalarda geçerli ortak aksiyonlar ----
        if (pact === "like") {
          const on = K.interactions.toggleLike(actEl.dataset.arg);
          actEl.classList.toggle("on", on);
          /* SVG ikonlu beğeni düğmelerinde metni EZME (Instagram gibi);
             yalnızca .on sınıfı ile renk/dolgu değişir. */
          if (!actEl.querySelector("svg")) actEl.textContent = on ? "♥" : "♡";
          const v0 = K.phone.views[K.phone.views.length - 1];
          if (v0 && v0.state) v0.state.dirty = true;
          return;
        }
        if (pact === "np-toggle") {
          if (K.audio) {
            if (K.audio.isPlaying()) {
              K.audio.stop();
              K.toast("⏸ Duraklatıldı", (K.audio.current() || {}).title || "", "");
            } else {
              K.audio.play(K.interactions.nowPlaying() || {});
            }
          }
          K.phone.reRender();
          return;
        }
        if (pact === "np-next") {
          const list = K.platforms.searchSongs("").slice(0, 20);
          K.interactions.play(K.util.pick(list));
          K.phone.reRender();
          return;
        }
        if (pact === "nowplaying") { K.phone.pushView(K.ui.playerView()); return; }
        if (pact === "home-notifs") { K.phone.pushView(K.ui.notificationsView()); return; }
        if (pact === "home-edit") { K.phone.editMode = !K.phone.editMode; K.phone.render(); return; }
        if (pact === "home-addpage") { const i = K.phoneHome.addPage(); K.phone.render(); setTimeout(() => K.phone.goPage(i), 40); return; }
        if (pact === "cc") { if (K.cc) K.cc.open(); return; }
        if (pact === "spotlight") { if (K.spotlight) K.spotlight.open(); return; }
        if (pact === "follow") {
          const on = K.interactions.toggleFollow(actEl.dataset.arg);
          actEl.classList.toggle("following", !on);
          actEl.textContent = on ? "Takip Ediliyor" : "Takip Et";
          return;
        }

        const v = K.phone.views[K.phone.views.length - 1];
        if (v && v.onAction) v.onAction(pact, actEl, v);
      }
    },
  };
})(window.K);
