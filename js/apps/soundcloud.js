/* ============================================================
   KARMA — apps/soundcloud.js
   SOUNDCLOUD iOS UYGULAMASI (Stream · Keşfet · Kitaplık)
   iOS 18 tarzı şık kartlar, turuncu dalga formu, parça oynatma,
   yüklenen parçalar ve sanatçı etkileşimi.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  const SC_IC = {
    home: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2z"/></svg>`,
    feed: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1" fill="currentColor"/></svg>`,
    search: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/></svg>`,
    library: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>`
  };

  /* SoundCloud dalga formu mini SVG çizici */
  function waveformSVG(seed, active) {
    const bars = 28;
    let s = typeof seed === "string" ? seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : (seed || 42);
    const rects = [];
    for (let i = 0; i < bars; i++) {
      s = (s * 9301 + 49297) % 233280;
      const h = 6 + Math.round((s / 233280) * 18);
      const y = (26 - h) / 2;
      const col = active && i < 14 ? "#ff5500" : (active ? "#ff884d" : "rgba(255,255,255,0.35)");
      rects.push(`<rect x="${i * 4.2}" y="${y.toFixed(1)}" width="2.4" height="${h}" rx="1" fill="${col}"/>`);
    }
    return `<svg class="sc-wave-svg" viewBox="0 0 118 26" preserveAspectRatio="none">${rects.join("")}</svg>`;
  }

  function trackCard(track, opts) {
    opts = opts || {};
    const np = (K.audio && K.audio.isPlaying()) ? K.audio.current() : null;
    const isPlaying = np && (np.id === track.id || np.title === track.title);
    const liked = K.interactions ? K.interactions.isLiked("sc_" + track.id) : false;
    const coverSeed = track.coverSeed || track.id || track.title;

    return `
      <div class="sc-track-card ${isPlaying ? "playing" : ""}" data-song="${U.escape(track.id || "")}">
        <div class="sc-track-top">
          <div class="sc-track-art" data-pact="sc-play" data-arg="${U.escape(track.id || "")}">
            ${K.ui.cover(coverSeed, (track.title || "?")[0], 48)}
            <button class="sc-art-play" aria-label="Çal">${isPlaying ? "⏸" : "▶"}</button>
          </div>
          <div class="sc-track-meta grow" data-pact="sc-play" data-arg="${U.escape(track.id || "")}">
            <div class="sc-track-title">${U.escape(track.title || "İsimsiz Parça")}</div>
            <div class="sc-track-artist">${U.escape(track.artistName || track.artist || "Bilinmeyen Sanatçı")}</div>
            <div class="sc-track-stats">
              <span>▶ ${U.fmt(track.streams || track.plays || 12400)}</span>
              <span>·</span>
              <span>${track.genre || "Hip-Hop & Rap"}</span>
            </div>
          </div>
          <button class="sc-track-like ${liked ? "on" : ""}" data-pact="sc-like" data-arg="sc_${U.escape(track.id || "")}" aria-label="Beğen">
            ${liked ? "♥" : "♡"}
          </button>
        </div>
        <div class="sc-track-wave-row" data-pact="sc-play" data-arg="${U.escape(track.id || "")}">
          ${waveformSVG(track.id || track.title, isPlaying)}
        </div>
      </div>`;
  }

  K.phone.register({
    id: "soundcloud",
    name: "SoundCloud",
    icon: "☁️",
    iconClass: "ic-soundcloud",
    dock: false,
    musicBar: true,

    render(params) {
      params = params || {};
      const view = {
        title: "SoundCloud",
        sub: "Akış ve Sesler",
        shellClass: "app-soundcloud",
        musicBar: true,
        tabPos: "bottom",
        tabs: [
          { id: "feed", label: "Stream", icon: SC_IC.feed },
          { id: "discover", label: "Keşfet", icon: SC_IC.search },
          { id: "library", label: "Kitaplık", icon: SC_IC.library }
        ],
        activeTab: params.tab || "feed",
        render: (tab) => {
          const app = K.phone.appById("soundcloud");
          if (tab === "discover") return app.discoverHTML();
          if (tab === "library") return app.libraryHTML();
          return app.feedHTML();
        },
        onAction: (act, el) => {
          const app = K.phone.appById("soundcloud");
          if (act === "sc-play") {
            const sid = el.dataset.arg;
            if (sid) app.playById(sid);
          } else if (act === "sc-like") {
            const id = el.dataset.arg;
            if (K.interactions) {
              const on = K.interactions.toggleLike(id);
              el.classList.toggle("on", on);
              el.textContent = on ? "♥" : "♡";
            }
          } else if (act === "sc-tag") {
            app._currentTag = el.dataset.arg || "";
            K.phone.renderTop();
          } else if (act === "sc-upload-direct") {
            if (K.careerUI && K.careerUI.showStudioWizard) {
              K.careerUI.showStudioWizard();
            } else {
              K.toast("☁️ SoundCloud", "Parça yüklemek için Stüdyo sekmesini kullan.", "info");
            }
          }
        }
      };
      return view;
    },

    /* ---- Şarkı çalma köprüsü ---- */
    playById(id) {
      if (!K.audio) return;
      let target = null;
      const p = K.state.player || {};
      if (Array.isArray(p.songs)) target = p.songs.find(s => s && s.id === id);
      if (!target && K.platforms && K.platforms.searchSongs) {
        target = K.platforms.searchSongs("").find(s => s && s.id === id);
      }
      if (!target && K.SONGS) {
        target = (K.SONGS || []).find(s => s && s.id === id);
      }
      if (target) {
        K.audio.play({
          id: target.id,
          title: target.title,
          artistName: target.artistName || target.artist || p.stageName || "Sanatçı",
          coverSeed: target.coverSeed || target.id,
          audioUrl: target.audioUrl || target.previewUrl || ""
        });
        K.toast("▶ SoundCloud Çalıyor", target.title, "ok");
        K.phone.reRender();
      }
    },

    /* ---- 1. Sekme: STREAM (Akış) ---- */
    feedHTML() {
      const p = K.state.player || {};
      const songs = (p.songs || []).slice().reverse();
      const recents = (K.platforms && K.platforms.searchSongs) ? K.platforms.searchSongs("").slice(0, 10) : [];
      const np = (K.audio && K.audio.isPlaying()) ? K.audio.current() : null;

      const heroHTML = `
        <div class="sc-hero-banner">
          <div class="sc-hero-brand">
            <span class="sc-cloud-ic">${K.brandIcon("soundcloud") || "☁️"}</span>
            <span class="sc-brand-title">SoundCloud Stream</span>
          </div>
          <div class="sc-hero-sub">Yeraltı prodüksiyonları, mixtape'ler ve yeni çıkanlar</div>
          ${np ? `<div class="sc-hero-now"><span>Şu an çalıyor:</span> <b>${U.escape(np.title)}</b> · ${U.escape(np.artistName || "")}</div>` : ""}
        </div>`;

      let playerTracksHTML = "";
      if (songs.length) {
        playerTracksHTML = `
          <div class="sc-section-title">
            <h3>Yüklemelerin</h3>
            <span class="sc-count-badge">${songs.length}</span>
          </div>
          <div class="sc-track-list">
            ${songs.map(s => trackCard(s)).join("")}
          </div>`;
      } else {
        playerTracksHTML = `
          <div class="sc-empty-card">
            <div class="sc-empty-icon">☁️</div>
            <div class="sc-empty-t">Henüz SoundCloud'a parça yüklemedin</div>
            <div class="sc-empty-d">Stüdyodan ilk tekilini hazırla veya bağımsız yükleme yap.</div>
            <button class="btn btn-sm btn-primary" data-pact="sc-upload-direct" style="background:#ff5500;border:none;margin-top:8px">Parça Hazırla</button>
          </div>`;
      }

      const streamFeedHTML = `
        <div class="sc-section-title" style="margin-top:16px">
          <h3>Takip Ettiğin Sesler</h3>
          <span class="sc-sub-label">En son yüklemeler</span>
        </div>
        <div class="sc-track-list">
          ${recents.map(r => trackCard(r)).join("")}
        </div>`;

      return `<div class="sc-feed-view">${heroHTML}${playerTracksHTML}${streamFeedHTML}</div>`;
    },

    /* ---- 2. Sekme: KEŞFET & CHARTS ---- */
    discoverHTML() {
      const tags = ["Tümü", "Rap & Trap", "Drill", "Underground", "Lo-Fi", "Electronic", "Remix"];
      const activeTag = this._currentTag || "Tümü";
      const trending = (K.platforms && K.platforms.searchSongs) ? K.platforms.searchSongs("").slice(0, 12) : [];

      const tagsHTML = `
        <div class="sc-tag-scroller">
          ${tags.map(t => `<button class="sc-tag-chip ${t === activeTag ? "active" : ""}" data-pact="sc-tag" data-arg="${t}">${t}</button>`).join("")}
        </div>`;

      return `
        <div class="sc-discover-view">
          <div class="sc-search-bar">
            <span>🔎</span>
            <input type="text" placeholder="Parça, sanatçı veya podcast ara..." readonly data-pact="sc-tag" data-arg="Tümü">
          </div>
          ${tagsHTML}
          <div class="sc-chart-banner">
            <div class="sc-chart-title">🔥 SoundCloud Top 50 : Türkiye</div>
            <div class="sc-chart-desc">En çok dinlenen bağımsız ve yükselen parçalar</div>
          </div>
          <div class="sc-track-list">
            ${trending.map((t, idx) => `
              <div class="sc-chart-row-wrap">
                <span class="sc-chart-rank">${idx + 1}</span>
                <div class="grow">${trackCard(t)}</div>
              </div>
            `).join("")}
          </div>
        </div>`;
    },

    /* ---- 3. Sekme: KİTAPLIK ---- */
    libraryHTML() {
      const p = K.state.player || {};
      const songs = p.songs || [];
      const likesObj = (p && p.likes) ? p.likes : {};
      const likedKeys = Object.keys(likesObj).filter(k => k.startsWith("sc_"));
      const unreadTotal = (K.relations && K.relations.unreadTotal) ? K.relations.unreadTotal() : 0;

      return `
        <div class="sc-library-view">
          <div class="sc-lib-header">
            <div class="sc-lib-avatar">${K.ui.avatar(p.stageName || "Sanatçı", 54, true)}</div>
            <div class="sc-lib-meta grow">
              <h2>${U.escape(p.stageName || "Sanatçı")}</h2>
              <span>@${U.escape((p.stageName || "artist").toLowerCase().replace(/\s+/g, ""))}</span>
              <div class="sc-lib-badges">
                <span class="sc-badge-orange">Next Pro</span>
                <span class="sc-badge-dim">${songs.length} Yükleme</span>
              </div>
            </div>
          </div>

          <div class="sc-lib-grid">
            <div class="sc-lib-card" data-pact="sc-tag" data-arg="likes">
              <span class="sc-lib-card-ic" style="color:#ff5500">♥</span>
              <b>Beğenilenler</b>
              <small>${likedKeys.length} parça</small>
            </div>
            <div class="sc-lib-card" data-pact="sc-tag" data-arg="playlists">
              <span class="sc-lib-card-ic">📂</span>
              <b>Çalma Listeleri</b>
              <small>Kitaplığın</small>
            </div>
            <div class="sc-lib-card" data-pact="sc-tag" data-arg="history">
              <span class="sc-lib-card-ic">🕒</span>
              <b>Dinleme Geçmişi</b>
              <small>Son çalınanlar</small>
            </div>
            <div class="sc-lib-card" data-pact="sc-tag" data-arg="stations">
              <span class="sc-lib-card-ic">📻</span>
              <b>İstasyonlar</b>
              <small>Algoritmik akış</small>
            </div>
          </div>

          <div class="sc-section-title" style="margin-top:16px">
            <h3>Diskografin</h3>
          </div>
          <div class="sc-track-list">
            ${songs.length ? songs.map(s => trackCard(s)).join("") : '<div class="mini-empty">Henüz yayınlanmış bir izin yok.</div>'}
          </div>
        </div>`;
    }
  });

})(window.K = window.K || {});
