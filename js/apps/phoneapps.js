/* ============================================================
   KARMA — apps/phoneapps.js
   Telefon OS ekstraları:
   • Kontrol Merkezi (K.cc)  — hızlı ayarlar
   • Spotlight arama (K.spotlight)
   • App Store (kilitli uygulamalar)
   • Telefon Ayarları (duvar kağıdı / parlaklık / pil)
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* =====================================================
     KONTROL MERKEZİ
     ===================================================== */
  K.cc = {
    open() { K.phone.pushView(K.cc.view()); },

    view() {
      const pr = K.phoneOS.prefs();
      const bat = K.phoneOS.battery();
      const np = (K.audio && K.audio.isPlaying()) ? K.audio.current() : (K.interactions ? K.interactions.nowPlaying() : null);
      const playing = K.audio && K.audio.isPlaying();
      const on = v => (v ? "on" : "");

      return {
        title: "Kontrol Merkezi", sub: "Hızlı ayarlar", shellClass: "app-cc", noAutoRefresh: true,
        render: () => `
          <div class="cc-grid">
            <div class="cc-tile">
              <div class="cc-row">
                ${K.ui.artistAvatar ? K.ui.avatar("K", 34, true) : ""}
                <div class="grow" style="min-width:0">
                  <div class="cc-np-title">${np ? U.escape(np.title || "—") : "Şimdi çalıyor"} </div>
                  <div class="cc-np-sub">${np ? U.escape(np.artistName || "") : "Bir şarkı seç"}</div>
                </div>
              </div>
              <div class="cc-np-ctrl">
                <button data-act="cc-toggle">${playing ? "⏸" : "▶"}</button>
                <button data-act="cc-next">⏭</button>
              </div>
            </div>

            <div class="cc-tile">
              <div class="cc-label">Parlaklık</div>
              <input type="range" id="cc-bright" min="40" max="100" value="${Math.round((pr.brightness || 1) * 100)}" />
            </div>

            <div class="cc-tile">
              <div class="cc-label">Ses</div>
              <input type="range" id="cc-vol" min="0" max="100" value="${Math.round((K.audio ? K.audio.volume() : 0.28) * 100)}" />
            </div>

            <div class="cc-tile cc-bat">
              <div class="cc-label">Pil</div>
              <div class="cc-bat-row">
                <span class="battery big"><i style="width:${bat}%;${bat <= 15 ? "background:#ff5c7a" : ""}"></i></span>
                <span class="cc-bat-val">${bat}%</span>
              </div>
              <button class="btn btn-sm ${bat <= 99 ? "btn-primary" : "btn-ghost"}" data-act="cc-charge" ${bat <= 99 ? "" : "disabled"}>${bat <= 99 ? "🔌 Şarj et" : "Dolu"}</button>
            </div>

            <div class="cc-tile">
              <button class="cc-tgl ${on(pr.theme === "light")}" data-act="cc-theme">${pr.theme === "light" ? "☀️ Açık tema" : "🌙 Koyu tema"}</button>
              <button class="cc-tgl ${on(K.settings.all().reduceMotion)}" data-act="cc-motion">🌀 Hareketi azalt</button>
              <button class="cc-tgl ${on(K.settings.all().contrast)}" data-act="cc-contrast">◐ Yüksek kontrast</button>
              <button class="cc-tgl ${on(K.state.player.ytAutoplay !== false)}" data-act="cc-autoplay">🔁 Oto sıradaki</button>
              <button class="cc-tgl ${on(pr.batterySaver)}" data-act="cc-saver">🔋 Pil tasarrufu</button>
            </div>

            <div class="cc-tile">
              <button class="cc-wide" data-act="cc-phone-settings">⚙️ Telefon Ayarları</button>
              <button class="cc-wide" data-act="cc-game-settings">🎛️ Karma Ayarları</button>
            </div>
          </div>`,
        onMount: (root) => {
          const br = root.querySelector("#cc-bright");
          if (br) br.addEventListener("input", () => K.phoneOS.setPref("brightness", (+br.value) / 100));
          const vo = root.querySelector("#cc-vol");
          if (vo) vo.addEventListener("input", () => { if (K.audio) K.audio.setVolume((+vo.value) / 100); });
        },
        onAction: (act) => {
          if (act === "cc-toggle") {
            if (K.audio) { if (K.audio.isPlaying()) K.audio.stop(); else K.audio.play(K.interactions.nowPlaying() || {}); }
            K.phone.reRender();
          } else if (act === "cc-next") {
            let t = (K.queue && K.queue.size()) ? K.queue.shift() : null;
            if (!t) { const list = K.platforms.searchSongs("").slice(0, 20); t = U.pick(list); }
            K.interactions.play(t); K.phone.reRender();
          } else if (act === "cc-charge") { K.phoneOS.charge(); K.phone.reRender(); }
          else if (act === "cc-theme") {
            K.phoneOS.setPref("theme", K.phoneOS.prefs().theme === "light" ? "dark" : "light");
            K.phone.reRender();
          }
          else if (act === "cc-motion") { K.settings.set({ reduceMotion: !K.settings.all().reduceMotion }); K.phone.reRender(); }
          else if (act === "cc-contrast") { K.settings.set({ contrast: !K.settings.all().contrast }); K.phone.reRender(); }
          else if (act === "cc-autoplay") { K.state.player.ytAutoplay = !(K.state.player.ytAutoplay !== false); K.save(); K.phone.reRender(); }
          else if (act === "cc-saver") { K.phoneOS.setPref("batterySaver", !K.phoneOS.prefs().batterySaver); K.phone.reRender(); }
          else if (act === "cc-phone-settings") { K.phone.openApp("phonesettings"); }
          else if (act === "cc-game-settings") { K.settings.openUI(); }
        }
      };
    }
  };

  /* =====================================================
     SPOTLIGHT (global arama)
     ===================================================== */
  K.spotlight = {
    open() { K.phone.pushView(K.spotlight.view()); },

    search(q) {
      q = (q || "").toLowerCase().trim();
      const apps = K.phone.apps.filter(a => K.phoneOS.installed(a.id) && a.name.toLowerCase().includes(q)).map(a => ({ id: a.id, name: a.name, icon: a.icon }));
      if (!q) return { apps: apps.slice(0, 6), locked: [], artists: [], songs: [], news: [] };
      const locked = Object.keys(K.phoneOS.LOCKS)
        .filter(id => !K.phoneOS.installed(id) && (K.phoneOS.LOCKS[id].name || "").toLowerCase().includes(q))
        .map(id => ({ id, name: K.phoneOS.LOCKS[id].name, icon: K.phoneOS.LOCKS[id].icon }));
      const artists = K.platforms.searchArtists(q).slice(0, 6);
      const songs = K.platforms.searchSongs(q).slice(0, 6);
      const news = ((K.news && K.news.current) ? K.news.current() : []).filter(t => (t.title || "").toLowerCase().includes(q)).slice(0, 4);
      return { apps, locked, artists, songs, news };
    },

    resultsHTML(q) {
      const r = K.spotlight.search(q);
      const sec = (title, inner) => inner ? K.ui.section(title) + inner : "";
      const appRows = r.apps.map(a => `<div class="sp-res" data-act="open-app" data-arg="${a.id}"><span class="sp-res-ic">${a.icon}</span><div class="grow"><div class="sp-res-name">${U.escape(a.name)}</div><div class="sp-res-sub">Uygulama</div></div></div>`).join("");
      const lockRows = r.locked.map(a => `<div class="sp-res" data-act="open-store"><span class="sp-res-ic">🛍️</span><div class="grow"><div class="sp-res-name">${U.escape(a.name)}</div><div class="sp-res-sub">Mağazada · kilitli</div></div></div>`).join("");
      const artistRows = r.artists.map(a => `<div class="sp-res" data-act="open-artist" data-arg="${a.id}"><span class="sp-res-ic">🎤</span><div class="grow"><div class="sp-res-name">${U.escape(a.name)}</div><div class="sp-res-sub">${U.compact(a.monthly)} dinleyici</div></div></div>`).join("");
      const songRows = r.songs.map(sg => `<div class="sp-res" data-act="play-song" data-arg="${U.escape(sg.id)}"><span class="sp-res-ic">🎵</span><div class="grow"><div class="sp-res-name">${U.escape(sg.title)}</div><div class="sp-res-sub">${U.escape(sg.artistName || "")}</div></div></div>`).join("");
      const newsRows = r.news.map(t => `<div class="sp-res" data-act="open-news"><span class="sp-res-ic">${(K.newsCatById(t.cat) || {}).icon || "📰"}</span><div class="grow"><div class="sp-res-name">${U.escape(t.title)}</div><div class="sp-res-sub">Gündem</div></div></div>`).join("");
      const out = sec("Uygulamalar", appRows + lockRows) + sec("Sanatçılar", artistRows) + sec("Şarkılar", songRows) + sec("Gündem", newsRows);
      return out || `<div class="mini-empty">Sonuç yok.</div>`;
    },

    view() {
      return {
        title: "Ara", sub: "Spotlight", shellClass: "app-spot", noAutoRefresh: true,
        render: () => `<div class="p-search"><span>🔎</span><input data-spot type="text" placeholder="Şarkı, sanatçı, uygulama ara" /></div><div data-spot-res></div>`,
        onMount: (root) => {
          const inp = root.querySelector("[data-spot]");
          const box = root.querySelector("[data-spot-res]");
          const draw = () => { box.innerHTML = K.spotlight.resultsHTML(inp.value); };
          inp.addEventListener("input", draw);
          draw();
          setTimeout(() => { try { inp.focus(); } catch (e) {} }, 60);
        },
        onAction: (act, el) => {
          if (act === "open-app") { K.phone.openApp(el.dataset.arg); }
          else if (act === "open-store") { K.phone.openApp("appstore"); }
          else if (act === "open-artist") {
            K.phone.openApp("spotify");
            setTimeout(() => { try { K.phone.appById("spotify").openArtist(el.dataset.arg); } catch (e) {} }, 30);
          }
          else if (act === "play-song") {
            const sg = K.platforms.findSong(el.dataset.arg) || K.platforms.searchSongs(el.dataset.arg)[0];
            if (sg) { K.interactions.play(sg); K.toast("▶️ Çalınıyor", sg.title, "ok"); }
          }
          else if (act === "open-news") { K.phone.openApp("news"); }
        }
      };
    }
  };

  /* =====================================================
     APP STORE
     ===================================================== */
  K.phone.register({
    id: "appstore", name: "App Store", icon: "🛍️", iconClass: "ic-appstore", dock: false,

    render() {
      return {
        title: "App Store", sub: "Uygulamalar", shellClass: "app-store",
        render: () => {
          const list = K.phoneOS.storeList();
          const locked = list.filter(x => !x.installed);
          const installed = list.filter(x => x.installed);
          const card = x => K.studio.card(
            `<div class="studio-head">
               <div class="studio-title">${x.icon} ${U.escape(x.name)}</div>
               ${x.installed ? `<span class="pill money">✓ Yüklü</span>` : (x.unlocked ? `<button class="btn btn-sm btn-primary" data-pact="store-install" data-arg="${x.id}">Yükle</button>` : `<span class="pill">🔒 Kilitli</span>`)}
             </div>
             <div class="hint" style="margin-bottom:6px">${U.escape(x.desc)}</div>
             ${x.installed ? "" : K.studio.bar(x.pct, { cls: "lg", color: x.unlocked ? "linear-gradient(90deg,#4ade80,#5ce89b)" : undefined }) + K.studio.note("🔓", x.unlocked ? "Koşul tamamlandı, yükleyebilirsin." : `İlerleme %${x.pct}`, x.unlocked ? "ok" : "dim")}`,
            x.installed ? K.studio.ACCENT.ok : (x.unlocked ? K.studio.ACCENT.info : K.studio.ACCENT.warn)
          );
          return `${locked.length ? "" : K.studio.note("🎉", "Tüm uygulamalar yüklü. Yeni uygulamalar kariyerinle açılır.", "ok")}`
            + (locked.length ? K.ui.section("Kilitli / Yüklenebilir") + locked.map(card).join("") : "")
            + K.ui.section("Yüklü Uygulamalar")
            + installed.map(x => `<div class="sp-res" data-pact="store-open" data-arg="${x.id}"><span class="sp-res-ic">${x.icon}</span><div class="grow"><div class="sp-res-name">${U.escape(x.name)}</div><div class="sp-res-sub">${U.escape(x.desc)}</div></div><span style="color:var(--text-3)">›</span></div>`).join("");
        },
        onAction: (act, el) => {
          if (act === "store-install") { K.phoneOS.install(el.dataset.arg); K.phone.reRender(); }
          else if (act === "store-open") { K.phone.openApp(el.dataset.arg); }
        }
      };
    }
  });

  /* =====================================================
     TELEFON AYARLARI
     ===================================================== */
  K.phone.register({
    id: "phonesettings", name: "Ayarlar", icon: "⚙️", iconClass: "ic-phone-set", dock: false,

    render() {
      return {
        title: "Ayarlar", sub: "Telefon", shellClass: "app-phset",
        render: () => {
          const pr = K.phoneOS.prefs();
          const bat = K.phoneOS.battery();
          return `
            <div class="phset-row">
              <div class="phset-swatch" style="background:${K.phoneOS.wallpaper().css}"></div>
              <div class="grow"><div class="phset-name">Duvar Kağıdı</div><div class="phset-sub">${U.escape(K.phoneOS.wallpaper().name)}</div></div>
            </div>
            <div class="phset-grid">
              ${K.phoneOS.WALLS.map(w => `<button class="phset-wall ${pr.wallpaper === w.id ? "on" : ""} ${w.dynamic ? "dyn" : ""}" data-pact="ph-wall" data-arg="${w.id}" style="background:${K.phoneOS.wallCss(w.id)}"><span>${U.escape(w.name)}</span></button>`).join("")}
            </div>

            <div class="phset-card">
              <button class="phset-item ${pr.theme === "light" ? "on" : ""}" data-pact="ph-theme">${pr.theme === "light" ? "☀️ Açık tema" : "🌙 Koyu tema"} <span>${pr.theme === "light" ? "Açık" : "Koyu"}</span></button>
              <div class="phset-sub" style="padding:2px 4px 0">Sistem yüzeylerini açar; uygulamalar kendi temasını korur.</div>
            </div>

            <div class="phset-card">
              <div class="phset-name" style="margin-bottom:6px">Parlaklık</div>
              <input type="range" id="ph-bright" min="40" max="100" value="${Math.round((pr.brightness || 1) * 100)}" />
            </div>

            <div class="phset-card">
              <div class="phset-row" style="padding:0;border:none;background:none">
                <div class="grow"><div class="phset-name">Pil</div><div class="phset-sub">${bat}% ${bat <= 15 ? "· azaldı" : ""}</div></div>
                <button class="btn btn-sm ${bat <= 99 ? "btn-primary" : "btn-ghost"}" data-pact="ph-charge" ${bat <= 99 ? "" : "disabled"}>${bat <= 99 ? "Şarj et" : "Dolu"}</button>
              </div>
              ${K.studio.bar(bat, { cls: "lg", color: bat <= 15 ? "linear-gradient(90deg,#f87171,#ff8a5c)" : "linear-gradient(90deg,#4ade80,#5ce89b)" })}
            </div>

            <div class="phset-card">
              <button class="phset-item ${pr.batterySaver ? "on" : ""}" data-pact="ph-saver">🔋 Pil tasarrufu <span>${pr.batterySaver ? "Açık" : "Kapalı"}</span></button>
              <button class="phset-item ${K.settings.all().reduceMotion ? "on" : ""}" data-pact="ph-motion">🌀 Hareketi azalt <span>${K.settings.all().reduceMotion ? "Açık" : "Kapalı"}</span></button>
              <button class="phset-item ${K.settings.all().contrast ? "on" : ""}" data-pact="ph-contrast">◐ Yüksek kontrast <span>${K.settings.all().contrast ? "Açık" : "Kapalı"}</span></button>
            </div>

            <div class="phset-card">
              <button class="phset-item" data-pact="ph-game">🎛️ Karma Ayarları (kayıt & zorluk) <span>›</span></button>
            </div>
            <div class="hint">Duvar kağıdı, parlaklık ve pil tercihleri kaydına işlenir.</div>`;
        },
        onMount: (root) => {
          const br = root.querySelector("#ph-bright");
          if (br) br.addEventListener("input", () => K.phoneOS.setPref("brightness", (+br.value) / 100));
        },
        onAction: (act, el) => {
          if (act === "ph-wall") { K.phoneOS.setPref("wallpaper", el.dataset.arg); K.phone.reRender(); }
          else if (act === "ph-theme") {
            /* v10.11 — açık tema artık gerçekten çalışıyor (CSS karşılığı var) */
            K.phoneOS.setPref("theme", K.phoneOS.prefs().theme === "light" ? "dark" : "light");
            K.phone.reRender();
          }
          else if (act === "ph-charge") { K.phoneOS.charge(); K.phone.reRender(); }
          else if (act === "ph-saver") { K.phoneOS.setPref("batterySaver", !K.phoneOS.prefs().batterySaver); K.phone.reRender(); }
          else if (act === "ph-motion") { K.settings.set({ reduceMotion: !K.settings.all().reduceMotion }); K.phone.reRender(); }
          else if (act === "ph-contrast") { K.settings.set({ contrast: !K.settings.all().contrast }); K.phone.reRender(); }
          else if (act === "ph-game") { K.settings.openUI(); }
        }
      };
    }
  });
})(window.K = window.K || {});
