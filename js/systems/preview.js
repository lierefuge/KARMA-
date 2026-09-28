/* ============================================================
   KARMA — systems/preview.js  (v10.2)
   GERÇEK MÜZİK ÇALAR
   · Gerçek katalog şarkıları için iTunes önizlemesini (30 sn, m4a)
     HTMLAudioElement ile çalar — GERÇEK kayıt, sentez değil.
   · Oyuncunun kendi ürettiği şarkılar için K.audio (sentez) devam eder.
   · K.audio.play/stop/toggle/progress bu modüle devreder; böylece
     oyunun her yerinde (telefon, Spotify, Apple, YouTube) gerçek ses çıkar.
   · Alt kısımda küçük bir çalar çubuğu: kapak, ad, ilerleme,
     Apple Music / YouTube / Spotify bağlantıları.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  let el = null;        // HTMLAudioElement
  let cur = null;       // çalınan şarkı nesnesi
  let link = null;      // { p, a }
  let bar = null;       // çubuk DOM
  let blocked = false;  // tarayıcı otomatik oynatmayı engelledi mi

  /* ---------------- başlık normalleştirme -------------
     YouTube/uygulama başlıkları süsleme taşır: “Pirana (Official Video)”,
     “#shorts”, “Lyric Video”… Eşleştirme için bunları temizleriz. */
  function normTitle(s) {
    let t = String(s || "").toLowerCase();
    t = t.replace(/[\(\[].*?[\)\]]/g, " ")          // parantez içi
         .replace(/#[\wçğıöşü]+/g, " ")                // hashtag
         .replace(/\b(official|video|klip|lyric|lyrics|audio|visualizer|canlı|canli|live|remix|versiyon|version|shorts|müzik|music)\b/g, " ")
         .replace(/[^a-z0-9çğıöşü ]+/g, " ")           // noktalama
         .replace(/\s+/g, " ")
         .trim();
    return t;
  }

  let NORM_INDEX = null;
  function normIndex() {
    if (NORM_INDEX) return NORM_INDEX;
    NORM_INDEX = {};
    const P = K.REAL_PREVIEWS || {};
    for (const k in P) {
      for (const title in P[k]) {
        const n = normTitle(title);
        if (n && !NORM_INDEX[n]) NORM_INDEX[n] = P[k][title];
      }
    }
    return NORM_INDEX;
  }

  /* ---------------- önizleme bul ---------------- */
  function find(song) {
    if (!song) return null;
    if (song.preview) return { p: song.preview, a: song.appleUrl || "" };
    const P = K.REAL_PREVIEWS;
    if (!P) return null;

    /* 1) sanatçı anahtarı + tam başlık (en hızlı ve en kesin) */
    const id = song.artistId || (song.id ? String(song.id).split("_")[0] : null);
    if (id && P[id] && song.title && P[id][song.title]) return P[id][song.title];

    /* 2) tüm katalogda tam başlık */
    if (song.title) {
      for (const k in P) if (P[k][song.title]) return P[k][song.title];
    }

    /* 3) normalleştirilmiş başlık (YouTube süslemelerini temizler) */
    const n = normTitle(song.title);
    if (n) {
      const idx = normIndex();
      if (idx[n]) return idx[n];
      /* 4) içerme: “Pirana” ↔ “pirana feat x” gibi durumlar */
      for (const key in idx) {
        if (key === n || key.startsWith(n + " ") || n.startsWith(key + " ")) return idx[key];
      }
    }
    return null;
  }

  /* ---------------- ses elementi ---------------- */
  function audioEl() {
    if (el) return el;
    el = new Audio();
    el.preload = "none";
    el.volume = (K.audio && K.audio.volume) ? K.audio.volume() : 1;
    ["timeupdate", "play", "pause", "loadedmetadata", "ended"].forEach(ev =>
      el.addEventListener(ev, () => paint()));
    el.addEventListener("error", () => {
      const t = cur;
      stop();
      if (t) K.toast("⚠️ Önizleme açılamadı", `"${t.title}" için ses yüklenemedi.`, "warn");
    });
    return el;
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

  /* ---------------- çalar çubuğu ---------------- */
  function mount() {
    if (bar || typeof document === "undefined") return bar;
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
    if (!cur) { bar.hidden = true; return; }
    bar.hidden = false;
    const playing = K.preview.isPlaying();
    const art = bar.querySelector(".pb-art");
    const bg = cur.art ? `background-image:url('${cur.art}')` : `background:${U.gradientFor("pv" + (cur.id || cur.title))}`;
    if (art.getAttribute("data-art") !== String(cur.art)) {
      art.setAttribute("data-art", String(cur.art));
      art.setAttribute("style", bg);
    }
    bar.querySelector(".pb-title").textContent = cur.title || "Bilinmeyen";
    bar.querySelector(".pb-sub").textContent = (cur.artistName || "") + (playing ? " · gerçek kayıt" : " · duraklatıldı");
    const p = K.preview.progress();
    bar.querySelector(".pb-prog > i").style.width = Math.round(p * 100) + "%";
    bar.querySelector('[data-pb="toggle"]').textContent = playing ? "⏸" : "▶";
  }

  /* ---------------- genel API ---------------- */
  K.preview = {
    has(song) { return !!find(song); },
    active() { return !!cur; },
    isPlaying() { return !!(el && cur && !el.paused && !el.ended && el.currentTime > 0); },
    current() { return cur; },
    available() { return K.REAL_PREVIEWS ? Object.keys(K.REAL_PREVIEWS).length : 0; },
    links,
    mount,

    progress() {
      if (!el || !cur || !el.duration || !isFinite(el.duration)) return 0;
      return U.clamp(el.currentTime / el.duration, 0, 1);
    },
    elapsed() { return el ? (el.currentTime || 0) : 0; },
    duration() { return (el && isFinite(el.duration)) ? el.duration : 0; },

    volume(v) {
      if (v == null) return el ? el.volume : 1;
      if (el) el.volume = U.clamp(v, 0, 1);
    },

    play(song) {
      const f = find(song);
      if (!f) return false;
      cur = song; link = f;
      mount();
      const a = audioEl();
      const target = f.p;
      if (a.getAttribute("data-src") !== target) {
        a.setAttribute("data-src", target);
        a.src = target;
        a.currentTime = 0;
      }
      try {
        const pr = a.play();
        if (pr && pr.catch) pr.catch(() => {
          /* mobil tarayıcı otomatik oynatmayı engelledi → kullanıcıya bırak */
          blocked = true;
          paint();
          K.toast("▶ Dokun ve çal", "Tarayıcı otomatik başlatmayı engelledi — çubuktaki ▶ düğmesine dokunun.", "warn");
        });
      } catch (e) { blocked = true; }
      paint();
      K.bus.emit("audio:changed", {
        id: song.id, title: song.title, artistName: song.artistName,
        art: song.art || null, genre: "real", quality: song.quality || 80
      });
      return true;
    },

    pause() { if (el && cur) { el.pause(); paint(); } },
    resume() { if (el && cur) { el.play().catch(() => {}); paint(); } },

    stop() {
      if (el) { try { el.pause(); el.currentTime = 0; } catch (e) {} }
      const was = cur;
      cur = null; link = null; blocked = false;
      paint();
      if (was) K.bus.emit("audio:stopped", null);
    },

    toggle(song) {
      if (cur && song && cur !== song) return K.preview.play(song);
      if (K.preview.isPlaying()) { K.preview.pause(); return false; }
      if (cur) { K.preview.resume(); return true; }
      if (song) return K.preview.play(song);
      return false;
    }
  };
})(window.K = window.K || {});
