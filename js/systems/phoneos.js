/* ============================================================
   KARMA — systems/phoneos.js
   TELEFON İŞLETİM SİSTEMİ EKSTRALARI
   • Pil modeli (kullanımla azalır, şarj olur)
   • Duvar kağıdı / parlaklık / pil tasarrufu tercihleri
   • Uygulama kilidi + mağaza (ilerlemeyle açılan uygulamalar)
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const WALLS = [
    { id: "karma",    name: "Karma",           css: "linear-gradient(160deg,#1b1030,#0a0a12 55%,#140a22)" },
    { id: "aurora",   name: "Kuzey Işıkları",  css: "linear-gradient(160deg,#06202e,#0b3b4a 45%,#061a12)" },
    { id: "sunset",   name: "Gün Batımı",      css: "linear-gradient(160deg,#3a1020,#5a2030 50%,#12060c)" },
    { id: "graphite", name: "Grafit",          css: "linear-gradient(160deg,#1d1d24,#0b0b0f)" },
    { id: "forest",   name: "Orman",           css: "linear-gradient(160deg,#0d2417,#07140d)" }
  ];

  /* Kilitli (mağazadan açılan) uygulamalar + koşulları */
  const LOCKS = {
    spotifyartist: { name: "Spotify for Artists",     icon: "♫", desc: "10.000 toplam dinlenme", prog: p => (p.streams || 0) / 10000,  check: p => (p.streams || 0) >= 10000 },
    appleartist:   { name: "Apple Music for Artists", icon: "A", desc: "25.000 toplam dinlenme", prog: p => (p.streams || 0) / 25000,  check: p => (p.streams || 0) >= 25000 },
    royalty:       { name: "Karma for Artists",       icon: "₺", desc: "İlk telif ödemesi",      prog: p => (p.payouts || []).length,   check: p => (p.payouts || []).length >= 1 },
    video:         { name: "Klip Stüdyosu",           icon: "🎬", desc: "3 şarkı yayınla",        prog: p => (p.songs || []).length / 3, check: p => (p.songs || []).length >= 3 },
    team:          { name: "Ekip & Sponsor",          icon: "🧑‍💼", desc: "20 popülerlik",          prog: p => (p.popularity || 0) / 20,   check: p => (p.popularity || 0) >= 20 }
  };

  K.phoneOS = {
    WALLS, LOCKS,

    /* ---------------- tercihler ---------------- */
    prefs() {
      const p = K.state.player;
      p.phone = p.phone || { theme: "dark", wallpaper: "karma", brightness: 1, batterySaver: false };
      return p.phone;
    },

    setPref(key, val) {
      K.phoneOS.prefs()[key] = val;
      K.phoneOS.apply();
      K.save();
    },

    /* parlaklık + (varsa) telefon kapsamlı tema uygula */
    apply() {
      const pr = K.phoneOS.prefs();
      try {
        const scr = document.getElementById("phone-screen");
        if (scr) {
          scr.style.filter = pr.brightness && pr.brightness < 1 ? "brightness(" + pr.brightness + ")" : "";
          scr.setAttribute("data-theme", pr.theme === "light" ? "light" : "dark");
        }
      } catch (e) {}
    },

    wallpaper() {
      const pr = K.phoneOS.prefs();
      return WALLS.find(w => w.id === pr.wallpaper) || WALLS[0];
    },

    /* ---------------- pil ---------------- */
    battery() {
      const p = K.state.player;
      return p.battery == null ? 100 : Math.round(p.battery);
    },

    charge() {
      const p = K.state.player;
      if ((p.battery || 0) >= 99) { K.toast("🔋 Pil dolu", "Şarja gerek yok.", "warn"); return false; }
      p.battery = 100;
      K.toast("🔌 Şarj edildi", "Pil %100", "ok");
      K.save();
      if (K.phone && K.phone.updateStatus) K.phone.updateStatus();
      return true;
    },

    /* ---------------- uygulama kilidi / mağaza ---------------- */
    isLocked(appId) { return !!LOCKS[appId]; },

    unlocked(appId) {
      const l = LOCKS[appId];
      if (!l) return true;
      try { return !!l.check(K.state.player, K.state); } catch (e) { return true; }
    },

    installed(appId) {
      if (!K.phoneOS.isLocked(appId)) return true;          // sistem uygulamaları hep yüklü
      const list = K.state.player.installed || [];
      return list.indexOf(appId) >= 0;
    },

    install(appId) {
      const p = K.state.player;
      if (!K.phoneOS.unlocked(appId)) { K.toast("🔒 Kilitli", (LOCKS[appId] || {}).desc || "Koşul tamamlanmadı.", "warn"); return false; }
      p.installed = p.installed || [];
      if (p.installed.indexOf(appId) < 0) p.installed.push(appId);
      K.toast("⬇️ Yüklendi", (LOCKS[appId].name || appId) + " ana ekrana eklendi.", "ok");
      if (K.phoneHome) K.phoneHome.sync();
      K.save();
      if (K.phone && K.phone.homeActive) K.phone.render();
      return true;
    },

    /* koşulu tamamlanan kilitli uygulamaları otomatik yükle */
    ensureInstalled() {
      const p = K.state.player;
      p.installed = p.installed || [];
      Object.keys(LOCKS).forEach(id => {
        if (K.phoneOS.unlocked(id) && p.installed.indexOf(id) < 0) {
          p.installed.push(id);
          K.toast("📱 Yeni uygulama", LOCKS[id].name + " kuruldu.", "ok");
          K.state.notifications = (K.state.notifications || []).concat([{
            title: "📱 Yeni uygulama", msg: LOCKS[id].name + " ana ekrana eklendi.", kind: "ok", day: K.state.day
          }]).slice(-60);
        }
      });
      if (K.phoneHome) K.phoneHome.sync();
      return p.installed;
    },

    appProgress(appId) {
      const l = LOCKS[appId];
      if (!l) return 1;
      try { return U.clamp(l.prog(K.state.player, K.state), 0, 1); } catch (e) { return 1; }
    },

    /* mağaza listesi: kilitli uygulamaların durumu */
    storeList() {
      return Object.keys(LOCKS).map(id => ({
        id, name: LOCKS[id].name, icon: LOCKS[id].icon, desc: LOCKS[id].desc,
        unlocked: K.phoneOS.unlocked(id), installed: K.phoneOS.installed(id),
        pct: Math.round(K.phoneOS.appProgress(id) * 100)
      }));
    },

    /* ---------------- günlük ---------------- */
    daily() {
      const p = K.state.player;
      if (p.battery == null) p.battery = 100;
      const pr = K.phoneOS.prefs();
      const heavy = (K.audio && K.audio.isPlaying()) ? 6 : 0;
      const live = K.state.live ? 8 : 0;
      let drain = 6 + heavy + live + U.randInt(0, 5);
      if (pr.batterySaver) drain *= 0.55;                   // pil tasarrufu
      p.battery = U.clamp(Math.round((p.battery - drain) * 10) / 10, 0, 100);
      K.phoneOS.ensureInstalled();
      if (p.battery <= 10 && !K.phoneOS._warned) {
        K.phoneOS._warned = true;
        K.toast("🪫 Pil azaldı", "Kontrol Merkezi'nden şarj et.", "warn");
      }
      if (p.battery > 25) K.phoneOS._warned = false;
    }
  };
})(window.K = window.K || {});
