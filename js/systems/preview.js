/* ============================================================
   KARMA — systems/preview.js  (v10.3)
   GERÇEK MÜZİK ÇALAR — iki kaynaklı
     · "preview" : iTunes 30 sn önizleme (HTMLAudioElement) — anında, hafif
     · "full"    : YouTube tam sürüm (IFrame API) — şarkının tamamı
   Oyuncu dilerse çubuktaki 🎬 düğmesiyle tam sürüme geçer; tercih kalıcıdır.
   K.audio.play/stop/toggle/progress bu modüle devreder; böylece oyunun
   her yerinde (telefon, Spotify, Apple, YouTube) gerçek ses çıkar.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  let el = null;            // HTMLAudioElement (30 sn önizleme)
  let cur = null;           // çalınan şarkı
  let link = null;          // { p, a }
  let bar = null;           // çubuk DOM
  let ytWrap = null;        // YouTube kutusu
  let yt = null;            // YT.Player
  let ytReady = false;
  let ytLoading = null;
  let mode = "preview";     // "preview" | "full"

  /* ---------------- başlık normalleştirme ----------------
     YouTube/uygulama başlıkları süsleme taşır: “Pirana (Official Video)”,   */
  function normTitle(s) {
    let t = String(s || "").toLowerCase();
    t = t.replace(/[\(\[].*?[\)\]]/g, " ")
         .replace(/#[\wçğıöşü]+/g, " ")
         .replace(/\b(official|video|klip|lyric|lyrics|audio|visualizer|canlı|canli|live|remix|versiyon|version|shorts|müzik|music)\b/g, " ")
         .replace(/[^a-z0-9çğıöşü ]+/g, " ")
         .replace(/\s+/g, " ")
         .trim();
    return t;
  }

  let NORM_INDEX = null;
  function normIndex() {
    if (NORM_INDEX) return NORM_INDEX;
    NORM_INDEX = {};
    const P = K.REAL_PREVIEWS || {};
    for (const k in P) for (const title in P[k]) {
      const n = normTitle(title);
      if (n && !NORM_INDEX[n]) NORM_INDEX[n] = P[k][title];
    }
    return NORM_INDEX;
  }

  /* ---------------- önizleme bul ---------------- */
  function find(song) {
    if (!song) return null;
    if (song.preview) return { p: song.preview, a: song.appleUrl || "" };
    const P = K.REAL_PREVIEWS;
    if (!P) return null;
    const id = song.artistId || (song.id ? String(song.id).split("_")[0] : null);
    if (id && P[id] && song.title && P[id][song.title]) return P[id][song.title];
    if (song.title) {
      for (const k in P) if (P[k][song.title]) return P[k][song.title];
    }
    const n = normTitle(song.title);
    if (n) {
      const idx = normIndex();
      if (idx[n]) return idx[n];
      for (const key in idx) {
        if (key === n || key.startsWith(n + " ") || n.startsWith(key + " ")) return idx[key];
      }
    }
    return null;
  }

  /* ---------------- 30 sn önizleme sesi ---------------- */
  function audioEl() {
    if (el) return el;
    el = new Audio();
    el.preload = "none";
    el.volume = (K.audio && K.audio.volume) ? K.audio.volume() : 1;
    ["timeupdate", "play", "pause", "loadedmetadata", "ended"].forEach(ev =>
      el.addEventListener(ev, () => { if (mode === "preview") paint(); }));
    el.addEventListener("ended", () => {
      K.toast("⏱ 30 sn önizleme bitti", "Tamamını dinlemek için çubuktaki 🎬 düğmesine dokunun.", "warn");
    });
    el.addEventListener("error", () => {
      const t = cur; stop();
      if (t) K.toast("⚠️ Önizleme açılamadı", `"${t.title}" için ses yüklenemedi.`, "warn");
    });
    return el;
  }

  /* ---------------- YOUTUBE tam sürüm ---------------- */
  function ytQuery(song) {
    return (((song && song.artistName) ? song.artistName : "") + " " + ((song && song.title) || "")).trim();
  }

  function loadYT() {
    if (ytReady) return Promise.resolve(true);
    if (ytLoading) return ytLoading;
    ytLoading = new Promise((resolve, reject) => {
      if (!ytWrap) buildBar();
      if (typeof window === "undefined" || typeof document === "undefined") return reject(new Error("yok"));
      const host = document.getElementById("yt-full-player");
      if (!host) return reject(new Error("kutu yok"));

      const boot = () => {
        try {
          yt = new window.YT.Player("yt-full-player", {
            width: "100%", height: "100%",
            playerVars: { controls: 1, disablekb: 0, modestbranding: 1, rel: 0, playsinline: 1, fs: 0 },
            events: {
              onReady: () => { ytReady = true; resolve(true); },
              onStateChange: () => { paint(); },
              onError: () => {
                if (mode !== "full") return;
                K.toast("⚠️ Tam sürüm bulunamadı", "Bu kayıt YouTube'da oynatılamıyor — 30 sn önizlemeye dönülüyor.", "warn");
                toPreview();
              }
            }
          });
        } catch (e) { reject(e); }
      };

      if (window.YT && window.YT.Player) { boot(); return; }
      window.onYouTubeIframeAPIReady = boot;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("YouTube API yüklenemedi"));
      document.head.appendChild(tag);
      setTimeout(() => { if (!ytReady) reject(new Error("YouTube API zaman aşımı")); }, 8000);
    });
    return ytLoading;
  }

  function ytShow(on) {
    if (!ytWrap) return;
    ytWrap.classList.toggle("on", !!on);
  }

  function toPreview() {
    mode = "preview";
    try { if (yt && yt.pauseVideo) yt.pauseVideo(); } catch (e) {}
    ytShow(false);
    if (cur) { K.preview.play(cur); }
    paint();
  }

  /* ---------------- dış bağlantılar ---------------- */
  function links(song) {
    const q = encodeURIComponent(((song && song.artistName) ? song.artistName + " " : "") + ((song && song.title) || ""));
    const f = find(song);
    return {
      apple: (f && f.a) || (song && song.appleUrl) || `https://music.apple.com/tr/search?term=${q}`,
      youtube: `https://www.youtube.com/results?search_query=${q}`,
      spotify: `https://open.spotify.com/search/${q}`
    };
  }

  /* ---------------- çubuk + YouTube kutusu ---------------- */
  function buildBar() {
    if (typeof document === "undefined" || bar) return bar;

    ytWrap = document.createElement("div");
    ytWrap.id = "yt-full-wrap";
    ytWrap.className = "yt-full-wrap";
    ytWrap.innerHTML = `<div id="yt-full-player"></div>
      <div class="ytf-note">🎬 <b>Tam sürüm</b> · YouTube · çubuktaki ⏱ ile 30 sn önizlemeye dönebilirsin</div>`;
    document.body.appendChild(ytWrap);

    bar = document.createElement("div");
    bar.id = "prev-bar";
    bar.className = "prev-bar";
    bar.hidden = true;
    bar.innerHTML = `
      <div class="pb-art"></div>
      <div class="pb-meta">
        <div class="pb-title"></div>
        <div class="pb-sub"></div>
        <div class="pb-prog"><i></i></div>
      </div>
      <div class="pb-act">
        <button class="pb-btn" data-pb="toggle" title="Çal / Duraklat">⏸</button>
        <button class="pb-btn" data-pb="mode" title="Tam sürüm / 30 saniye">🎬</button>
        <button class="pb-btn" data-pb="stop" title="Durdur">⏹</button>
        <a class="pb-btn" data-pb="apple" target="_blank" rel="noopener" title="Apple Music'te aç">🍎</a>
        <a class="pb-btn" data-pb="yt" target="_blank" rel="noopener" title="YouTube'da ara">▶️</a>
        <a class="pb-btn" data-pb="sp" target="_blank" rel="noopener" title="Spotify'da ara">🟢</a>
      </div>`;

    bar.addEventListener("click", e => {
      const b = e.target.closest("[data-pb]");
      if (!b) return;
      const a = b.dataset.pb;
      if (a === "toggle") { e.preventDefault(); K.preview.toggle(cur); }
      else if (a === "stop") { e.preventDefault(); K.preview.stop(); }
      else if (a === "mode") { e.preventDefault(); K.preview.toggleMode(); }
      else if (cur) {
        const L = links(cur);
        b.href = a === "apple" ? L.apple : a === "yt" ? L.youtube : L.spotify;
        b.target = "_blank";
      } else e.preventDefault();
    });
    document.body.appendChild(bar);
    return bar;
  }

  function paint() {
    if (!bar) return;
    if (!cur) { bar.hidden = true; ytShow(false); return; }
    bar.hidden = false;

    const playing = K.preview.isPlaying();
    const art = bar.querySelector(".pb-art");
    if (art.getAttribute("data-art") !== String(cur.art)) {
      art.setAttribute("data-art", String(cur.art));
      art.setAttribute("style", cur.art
        ? `background-image:url('${cur.art}')`
        : `background:${U.gradientFor("pv" + (cur.id || cur.title))}`);
    }
    bar.querySelector(".pb-title").textContent = cur.title || "Bilinmeyen";
    const src = mode === "full" ? "tam sürüm · YouTube" : "30 sn önizleme";
    bar.querySelector(".pb-sub").textContent = (cur.artistName || "") + " · " + src + (playing ? "" : " · duraklatıldı");

    const p = K.preview.progress();
    bar.querySelector(".pb-prog > i").style.width = Math.round(p * 100) + "%";
    bar.querySelector('[data-pb="toggle"]').textContent = playing ? "⏸" : "▶";
    const mb = bar.querySelector('[data-pb="mode"]');
    mb.textContent = mode === "full" ? "⏱" : "🎬";
    mb.title = mode === "full" ? "30 saniye önizlemeye dön" : "Tam sürümü çal (YouTube)";
    bar.classList.toggle("full-mode", mode === "full");
  }

  /* ---------------- genel API ---------------- */
  K.preview = {
    has(song) { return !!find(song); },
    active() { return !!cur; },
    available() { return K.REAL_PREVIEWS ? Object.keys(K.REAL_PREVIEWS).length : 0; },
    links, mount: buildBar,
    mode() { return mode; },

    isPlaying() {
      if (mode === "full") {
        try { return !!(yt && yt.getPlayerState && yt.getPlayerState() === 1); } catch (e) { return false; }
      }
      /* NOT: currentTime kontrolü kaldırıldı — çalma başladıktan sonraki ilk
         anda 0 olabiliyor ve çubuk yanlışlıkla “duraklatıldı” gösteriyordu. */
      return !!(el && cur && !el.paused && !el.ended);
    },
    current() { return cur; },

    progress() {
      if (mode === "full") {
        try {
          const d = (yt && yt.getDuration) ? yt.getDuration() : 0;
          return d ? U.clamp((yt.getCurrentTime() || 0) / d, 0, 1) : 0;
        } catch (e) { return 0; }
      }
      if (!el || !cur || !el.duration || !isFinite(el.duration)) return 0;
      return U.clamp(el.currentTime / el.duration, 0, 1);
    },
    elapsed() {
      if (mode === "full") { try { return yt.getCurrentTime() || 0; } catch (e) { return 0; } }
      return el ? (el.currentTime || 0) : 0;
    },
    duration() {
      if (mode === "full") { try { return yt.getDuration() || 0; } catch (e) { return 0; } }
      return (el && isFinite(el.duration)) ? el.duration : 0;
    },

    volume(v) {
      if (v == null) return el ? el.volume : 1;
      const n = U.clamp(v, 0, 1);
      if (el) el.volume = n;
      try { if (yt && yt.setVolume) yt.setVolume(Math.round(n * 100)); } catch (e) {}
    },

    /* tam sürümü aç (YouTube, şarkının tamamı) */
    playFull(song) {
      if (song) { cur = song; link = find(song); }
      if (!cur) return false;
      buildBar();
      K.preview.pausePreview();
      ytShow(true);
      mode = "full";
      paint();
      loadYT().then(() => {
        if (!yt || !yt.loadPlaylist) throw new Error("oynatıcı hazır değil");
        yt.loadPlaylist({ listType: "search", list: ytQuery(cur), index: 0 });
        try { if (yt.setVolume && K.audio && K.audio.volume) yt.setVolume(Math.round(K.audio.volume() * 100)); } catch (e) {}
        yt.playVideo();
        if (K.state && K.state.player) K.state.player.fullPlay = true;
        paint();
      }).catch(err => {
        mode = "preview";
        K.toast("⚠️ Tam sürüm açılamadı", "YouTube oynatıcısı yüklenemedi — 30 sn önizleme ile devam.", "warn");
        toPreview();
      });
      return true;
    },

    /* 30 sn önizleme */
    play(song) {
      if (song) { cur = song; link = find(song); }
      const f = link || find(cur);
      if (!f) {
        /* önizleme yoksa yine de tam sürüm denenebilir */
        if (cur && K.preview.has(cur)) return K.preview.playFull(cur);
        return false;
      }
      /* kullanıcı tam sürümü tercih ettiyse doğrudan ona git */
      if (K.state && K.state.player && K.state.player.fullPlay) return K.preview.playFull(cur);

      mode = "preview";
      ytShow(false);
      try { if (yt && yt.pauseVideo) yt.pauseVideo(); } catch (e) {}
      buildBar();
      const a = audioEl();
      if (a.getAttribute("data-src") !== f.p) {
        a.setAttribute("data-src", f.p);
        a.src = f.p;
        a.currentTime = 0;
      }
      try {
        const pr = a.play();
        if (pr && pr.catch) pr.catch(() => {
          paint();
          K.toast("▶ Dokun ve çal", "Tarayıcı otomatik başlatmayı engelledi — çubuktaki ▶ düğmesine dokunun.", "warn");
        });
      } catch (e) {}
      paint();
      K.bus.emit("audio:changed", {
        id: cur.id, title: cur.title, artistName: cur.artistName,
        art: cur.art || null, genre: "real", quality: cur.quality || 80
      });
      return true;
    },

    pausePreview() { if (el && !el.paused) { try { el.pause(); } catch (e) {} } },

    pause() {
      if (mode === "full") { try { if (yt && yt.pauseVideo) yt.pauseVideo(); } catch (e) {} paint(); return; }
      if (el && cur) { el.pause(); paint(); }
    },
    resume() {
      if (mode === "full") { try { if (yt && yt.playVideo) yt.playVideo(); } catch (e) {} paint(); return; }
      if (el && cur) { el.play().catch(() => {}); paint(); }
    },

    stop() {
      try { if (el) { el.pause(); el.currentTime = 0; } } catch (e) {}
      try { if (yt && yt.stopVideo) yt.stopVideo(); } catch (e) {}
      const was = cur;
      cur = null; link = null; mode = "preview";
      ytShow(false);
      paint();
      if (was) K.bus.emit("audio:stopped", null);
    },

    toggle(song) {
      if (cur && song && cur !== song) return K.preview.play(song);
      if (K.preview.isPlaying()) { K.preview.pause(); return false; }
      if (cur) { K.preview.resume(); return true; }
      if (song) return K.preview.play(song);
      return false;
    },

    /* 🎬 / ⏱ geçişi */
    toggleMode() {
      if (!cur) return false;
      if (mode === "full") { if (K.state && K.state.player) K.state.player.fullPlay = false; toPreview(); return false; }
      return K.preview.playFull(cur);
    }
  };
})(window.K = window.K || {});
