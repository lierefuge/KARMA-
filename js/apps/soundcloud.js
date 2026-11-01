/* ============================================================
   KARMA — apps/soundcloud.js   (v10.75)
   SOUNDCLOUD iOS UYGULAMASI (Stream · Keşfet · Kitaplık)

   v10.75 DÜZELTMELERİ (PR #9 incelemesi)
   --------------------------------------
   1) ETİKET FİLTRESİ GERÇEK: eskiden çipe basmak yalnızca rengi
      değiştiriyordu, liste AYNI kalıyordu. Artık filtre sanatçının
      GERÇEK türüne (`ARTISTS[].genre`) göre çalışır.
      "Lo-Fi / Electronic / Remix" etiketleri KALDIRILDI — oyunun veri
      modelinde böyle türler yok; sahte filtre göstermek yerine gerçek
      türler listelenir.
   2) KİTAPLIK KARTLARI GERÇEK: "Beğenilenler · Çalma Listeleri ·
      Dinleme Geçmişi · İstasyonlar" artık içerik açıyor
      (`K.playlists`, `player.likes`, `player.scHistory`).
   3) ARAMA GERÇEK: salt-okunur sahte kutu yerine yazılabilir arama;
      parça adı ve sanatçıya göre filtreler (onMount ile bağlanır).
   4) UYDURMA SAYI YOK: dinlenme bilinmiyorsa "—" gösterilir
      (eskiden `|| 12400` ile sahte sayı basılıyordu).
   5) Ölü değişken (`unreadTotal`) ve gereksiz inline stiller temizlendi.
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

  /* ETİKETLER — yalnızca veri modelinde KARŞILIĞI OLAN türler.
     Oyunun sanatçı türleri: trap · rap · drill · rnb · pop · indie. */
  const TAGS = [
    { id: "all",     label: "Tümü",        genres: null },
    { id: "raptrap", label: "Rap & Trap",  genres: ["rap", "trap"] },
    { id: "drill",   label: "Drill",       genres: ["drill"] },
    { id: "rnb",     label: "R&B",         genres: ["rnb"] },
    { id: "pop",     label: "Pop",         genres: ["pop"] },
    { id: "indie",   label: "Bağımsız",    genres: ["indie"] }
  ];

  const HISTORY_MAX = 20;

  /* sanatçı kimliği → tür (tek kaynak: js/data/artists.js) */
  function genreOf(track) {
    if (track && typeof track.genre === "string" && track.genre) return track.genre;
    const id = track && track.artistId;
    if (!id || !K.ARTISTS) return "";
    const a = K.ARTISTS.find((x) => x && x.id === id);
    return (a && a.genre) || "";
  }

  /* tüm parçalar tek yerden (oyuncu + katalog) */
  function allTracks() {
    const p = K.state.player || {};
    const own = Array.isArray(p.songs) ? p.songs : [];
    const cat = (K.platforms && K.platforms.searchSongs) ? K.platforms.searchSongs("") : [];
    const seen = new Set();
    return cat.concat(own).filter((t) => {
      if (!t) return false;
      const k = t.id || t.title;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function tagById(id) { return TAGS.find((t) => t.id === id) || TAGS[0]; }

  function matchesTag(track, tag) {
    if (!tag || !tag.genres) return true;
    const g = genreOf(track);
    return !!g && tag.genres.indexOf(g) >= 0;
  }

  function matchesQuery(track, q) {
    if (!q) return true;
    const needle = String(q).toLowerCase();
    const hay = ((track.title || "") + " " + (track.artistName || track.artist || "")).toLowerCase();
    return hay.indexOf(needle) >= 0;
  }

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

  function isTrackPlaying(track) {
    if (!K.audio || !K.audio.isPlaying()) return false;
    const np = K.audio.current();
    if (!np) return false;
    return np.id === track.id || np.title === track.title;
  }

  function getTrackMeta(track) {
    const title = track.title || "İsimsiz Parça";
    const artist = track.artistName || track.artist || "Bilinmeyen Sanatçı";
    /* UYDURMA YOK: bilinmiyorsa null → arayüz "—" basar */
    const plays = (typeof track.streams === "number" ? track.streams
      : typeof track.plays === "number" ? track.plays : null);
    const g = genreOf(track);
    const genre = g ? (TAGS.find(t => t.genres && t.genres.indexOf(g) >= 0) || {}).label || g : "—";
    const coverSeed = track.coverSeed || track.id || title;
    return { title, artist, plays, genre, coverSeed };
  }

  function trackCard(track) {
    const isPlaying = isTrackPlaying(track);
    const meta = getTrackMeta(track);
    const trackId = track.id || "";
    const liked = !!(K.interactions && K.interactions.isLiked("sc_" + trackId));

    return `
      <div class="sc-track-card ${isPlaying ? "playing" : ""}" data-song="${U.escape(trackId)}">
        <div class="sc-track-top">
          <div class="sc-track-art" data-pact="sc-play" data-arg="${U.escape(trackId)}">
            ${K.ui.cover(meta.coverSeed, meta.title[0], 48)}
            <button class="sc-art-play" aria-label="Çal">${isPlaying ? "⏸" : "▶"}</button>
          </div>
          <div class="sc-track-meta grow" data-pact="sc-play" data-arg="${U.escape(trackId)}">
            <div class="sc-track-title">${U.escape(meta.title)}</div>
            <div class="sc-track-artist">${U.escape(meta.artist)}</div>
            <div class="sc-track-stats">
              <span>▶ ${meta.plays == null ? "—" : U.fmt(meta.plays)}</span>
              <span>·</span>
              <span>${U.escape(meta.genre)}</span>
            </div>
          </div>
          <button class="sc-track-like ${liked ? "on" : ""}" data-pact="sc-like" data-arg="sc_${U.escape(trackId)}" aria-label="Beğen">
            ${liked ? "♥" : "♡"}
          </button>
        </div>
        <div class="sc-track-wave-row" data-pact="sc-play" data-arg="${U.escape(trackId)}">
          ${waveformSVG(meta.coverSeed, isPlaying)}
        </div>
      </div>`;
  }

  function listHTML(tracks, emptyMsg) {
    if (!tracks.length) return `<div class="mini-empty">${emptyMsg}</div>`;
    return `<div class="sc-track-list">${tracks.map(trackCard).join("")}</div>`;
  }

  K.phone.register({
    id: "soundcloud",
    name: "SoundCloud",
    icon: "☁️",
    iconClass: "ic-soundcloud",
    dock: false,
    musicBar: true,

    /* görünüm durumu (kayıt gerektirmez) */
    _tag: "all",
    _lib: null,
    _q: "",

    render(params) {
      params = params || {};
      const app = K.phone.appById("soundcloud");
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
          if (tab === "discover") return app.discoverHTML();
          if (tab === "library") return app.libraryHTML();
          return app.feedHTML();
        },
        /* v10.75 — arama kutusunu GERÇEKTEN bağla */
        onMount: (root) => {
          if (!root) return;
          const inp = root.querySelector("[data-sc-search]");
          if (inp) {
            inp.value = app._q || "";
            inp.addEventListener("input", () => {
              app._q = inp.value;
              const box = root.querySelector("[data-sc-results]");
              if (box) box.innerHTML = app.resultsHTML();
            });
          }
        },
        onAction: (act, el) => {
          if (act === "sc-play") {
            const sid = el.dataset.arg;
            if (sid) app.playById(sid);
          } else if (act === "sc-like") {
            const id = el.dataset.arg;
            if (K.interactions) {
              const on = K.interactions.toggleLike(id);
              el.classList.toggle("on", on);
              el.textContent = on ? "♥" : "♡";
              /* kitaplık açıksa beğeni sayacı tazelensin */
              if (app._lib === "likes") K.phone.renderTop();
            }
          } else if (act === "sc-tag") {
            app._tag = el.dataset.arg || "all";
            K.phone.renderTop();
          } else if (act === "sc-lib") {
            const key = el.dataset.arg;
            app._lib = (app._lib === key) ? null : key;   /* aynı karta basınca geri */
            K.phone.renderTop();
          } else if (act === "sc-lib-back") {
            app._lib = null;
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
      if (!K.audio) return false;
      const target = allTracks().find((s) => s && s.id === id);
      if (!target) return false;
      const p = K.state.player || {};
      K.audio.play({
        id: target.id,
        title: target.title,
        artistName: target.artistName || target.artist || p.stageName || "Sanatçı",
        coverSeed: target.coverSeed || target.id,
        audioUrl: target.audioUrl || target.previewUrl || ""
      });
      /* v10.75 — dinleme geçmişi (kitaplıkta gerçek liste) */
      p.scHistory = (p.scHistory || []).filter((x) => x !== target.id);
      p.scHistory.unshift(target.id);
      p.scHistory = p.scHistory.slice(0, HISTORY_MAX);
      K.toast("▶ SoundCloud Çalıyor", target.title, "ok");
      K.phone.reRender();
      return true;
    },

    /* ---- 1. Sekme: STREAM (Akış) ---- */
    feedHTML() {
      const p = K.state.player || {};
      const songs = (p.songs || []).slice().reverse();
      const recents = allTracks().filter((t) => songs.every((s) => (s.id || s.title) !== (t.id || t.title))).slice(0, 10);
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

      const playerTracksHTML = songs.length
        ? `<div class="sc-section-title">
             <h3>Yüklemelerin</h3>
             <span class="sc-count-badge">${songs.length}</span>
           </div>${listHTML(songs, "Yükleme yok")}`
        : `<div class="sc-empty-card">
             <div class="sc-empty-icon">☁️</div>
             <div class="sc-empty-t">Henüz SoundCloud'a parça yüklemedin</div>
             <div class="sc-empty-d">Stüdyodan ilk tekilini hazırla veya bağımsız yükleme yap.</div>
             <button class="btn btn-sm btn-primary sc-cta" data-pact="sc-upload-direct">Parça Hazırla</button>
           </div>`;

      const streamFeedHTML = `
        <div class="sc-section-title sc-section-gap">
          <h3>Takip Ettiğin Sesler</h3>
          <span class="sc-sub-label">En son yüklemeler</span>
        </div>
        ${listHTML(recents, "Katalog boş")}`;

      return `<div class="sc-feed-view">${heroHTML}${playerTracksHTML}${streamFeedHTML}</div>`;
    },

    /* ---- 2. Sekme: KEŞFET (gerçek filtre + gerçek arama) ---- */
    discoverHTML() {
      const tag = tagById(this._tag);
      const tagsHTML = `
        <div class="sc-tag-scroller">
          ${TAGS.map((t) => `<button class="sc-tag-chip ${t.id === tag.id ? "active" : ""}" data-pact="sc-tag" data-arg="${t.id}">${t.label}</button>`).join("")}
        </div>`;

      return `
        <div class="sc-discover-view">
          <div class="sc-search-bar">
            <span>🔎</span>
            <input type="text" placeholder="Parça veya sanatçı ara…" data-sc-search
                   value="${U.escape(this._q || "")}" aria-label="SoundCloud araması">
          </div>
          ${tagsHTML}
          <div class="sc-chart-banner">
            <div class="sc-chart-title">🔥 SoundCloud Top 50 : Türkiye</div>
            <div class="sc-chart-desc">${tag.genres ? tag.label + " · " : ""}en çok dinlenen parçalar</div>
          </div>
          <div data-sc-results>${this.resultsHTML()}</div>
        </div>`;
    },

    /* Keşfet sonuçları: tür + arama birlikte uygulanır (tek kaynak) */
    resultsHTML() {
      const tag = tagById(this._tag);
      const list = allTracks()
        .filter((t) => matchesTag(t, tag) && matchesQuery(t, this._q))
        .slice(0, 20);
      if (!list.length) {
        return `<div class="mini-empty">Bu filtrede parça yok${this._q ? ' ("' + U.escape(this._q) + '" için sonuç bulunamadı)' : ""}.</div>`;
      }
      return `<div class="sc-track-list">${list.map((t, idx) => `
        <div class="sc-chart-row-wrap">
          <span class="sc-chart-rank">${idx + 1}</span>
          <div class="grow">${trackCard(t)}</div>
        </div>`).join("")}</div>`;
    },

    /* ---- 3. Sekme: KİTAPLIK (kartlar GERÇEK içerik açar) ---- */
    libraryHTML() {
      const p = K.state.player || {};
      const songs = p.songs || [];
      const liked = this.likedTracks();
      const history = this.historyTracks();
      const playlists = this.userPlaylists();
      const station = this.stationTracks();
      const cur = this._lib;

      const cards = `
        <div class="sc-lib-grid">
          <div class="sc-lib-card ${cur === "likes" ? "active" : ""}" data-pact="sc-lib" data-arg="likes">
            <span class="sc-lib-card-ic sc-ic-orange">♥</span>
            <b>Beğenilenler</b>
            <small>${liked.length} parça</small>
          </div>
          <div class="sc-lib-card ${cur === "playlists" ? "active" : ""}" data-pact="sc-lib" data-arg="playlists">
            <span class="sc-lib-card-ic">📂</span>
            <b>Çalma Listeleri</b>
            <small>${playlists.length} liste</small>
          </div>
          <div class="sc-lib-card ${cur === "history" ? "active" : ""}" data-pact="sc-lib" data-arg="history">
            <span class="sc-lib-card-ic">🕒</span>
            <b>Dinleme Geçmişi</b>
            <small>${history.length} parça</small>
          </div>
          <div class="sc-lib-card ${cur === "stations" ? "active" : ""}" data-pact="sc-lib" data-arg="stations">
            <span class="sc-lib-card-ic">📻</span>
            <b>İstasyonlar</b>
            <small>Algoritmik akış</small>
          </div>
        </div>`;

      let detail = "";
      if (cur === "likes") {
        detail = `<div class="sc-section-title sc-section-gap"><h3>Beğenilenler</h3>
            <button class="sc-back" data-pact="sc-lib-back">‹ Geri</button></div>
          ${listHTML(liked, "Henüz parça beğenmedin.")}`;
      } else if (cur === "history") {
        detail = `<div class="sc-section-title sc-section-gap"><h3>Dinleme Geçmişi</h3>
            <button class="sc-back" data-pact="sc-lib-back">‹ Geri</button></div>
          ${listHTML(history, "Henüz bir şey dinlemedin.")}`;
      } else if (cur === "playlists") {
        detail = `<div class="sc-section-title sc-section-gap"><h3>Çalma Listeleri</h3>
            <button class="sc-back" data-pact="sc-lib-back">‹ Geri</button></div>
          ${playlists.length ? `<div class="sc-track-list">${playlists.map((pl) => `
            <div class="sc-pl-row">
              <span class="sc-pl-ic">📂</span>
              <div class="grow"><b>${U.escape(pl.name)}</b>
                <small>${pl.count} parça</small></div>
            </div>`).join("")}</div>`
            : `<div class="mini-empty">Henüz çalma listesi yok (Kitaplık → yeni liste).</div>`}`;
      } else if (cur === "stations") {
        detail = `<div class="sc-section-title sc-section-gap"><h3>${U.escape(this.stationName())}</h3>
            <button class="sc-back" data-pact="sc-lib-back">‹ Geri</button></div>
          ${listHTML(station, "İstasyon için yeterli veri yok.")}`;
      }

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
          ${cards}
          ${detail}
          <div class="sc-section-title sc-section-gap"><h3>Diskografin</h3></div>
          ${listHTML(songs, "Henüz yayınlanmış bir izin yok.")}
        </div>`;
    },

    /* ---- kitaplık yardımcıları (hepsi GERÇEK veriden) ---- */
    likedTracks() {
      const p = K.state.player || {};
      const keys = Object.keys(p.likes || {});
      const ids = new Set(keys.filter((k) => k.indexOf("sc_") === 0).map((k) => k.slice(3)));
      return allTracks().filter((t) => t && ids.has(t.id));
    },

    historyTracks() {
      const p = K.state.player || {};
      const ids = p.scHistory || [];
      const byId = {};
      allTracks().forEach((t) => { if (t && t.id) byId[t.id] = t; });
      return ids.map((id) => byId[id]).filter(Boolean);
    },

    userPlaylists() {
      if (!K.playlists || !K.playlists.list) return [];
      try {
        return (K.playlists.list() || []).map((pl) => ({
          name: pl.name || "Liste",
          count: (pl.songIds || pl.tracks || []).length
        }));
      } catch (e) { return []; }
    },

    /* İstasyon: en çok beğenilen sanatçının türünden deterministik akış */
    stationSeed() {
      const liked = this.likedTracks();
      const src = liked.length ? liked : allTracks().slice(0, 3);
      const counts = {};
      src.forEach((t) => {
        const g = genreOf(t);
        if (g) counts[g] = (counts[g] || 0) + 1;
      });
      const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "";
      return top;
    },

    stationName() {
      const g = this.stationSeed();
      const tag = TAGS.find((t) => t.genres && t.genres.indexOf(g) >= 0);
      return g ? (tag ? tag.label : g) + " İstasyonu" : "Karışık İstasyon";
    },

    stationTracks() {
      const g = this.stationSeed();
      const pool = allTracks().filter((t) => (g ? genreOf(t) === g : true));
      return pool.slice(0, 12);
    }
  });

})(window.K = window.K || {});
