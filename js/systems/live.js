/* ============================================================
   KARMA — systems/live.js
   CANLI VERİ YENİLEME
   - Gerçek Türkiye listesini internetten çeker (çok kaynaklı,
     CORS açık uçlar öncelikli) ve oyuna uygular.
   - Sanatçı şarkılarını iTunes Search API'den canlı günceller.
   - Sonuçlar localStorage'da saklanır; çevrimdışıyken baked veri
     kullanılmaya devam eder (oyun bozulmaz).
   ============================================================ */
(function (K) {
  "use strict";

  const KEY = "karma_live_v1";
  const UP = u => (u || "").replace("/170x170bb.png", "/600x600bb.jpg")
    .replace("/170x170bb.jpg", "/600x600bb.jpg")
    .replace("/100x100bb", "/600x600bb");

  let store = { asof: null, source: null, chart: null, songs: {}, art: {} };
  try { Object.assign(store, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }

  /* ---------------- kaynak tanımları ---------------- */
  const MOST_PLAYED = "https://rss.marketingtools.apple.com/api/v2/tr/music/most-played/50/songs.json";
  const ITUNES_RSS = "https://itunes.apple.com/tr/rss/topsongs/limit=50/json";

  const SOURCES = [
    // Apple Music streaming listesi (CORS yok → proxy ile denenir)
    { id: "apple-most-played", url: MOST_PLAYED, parse: parseMostPlayed, direct: true },
    { id: "proxy-allorigins", url: "https://api.allorigins.win/raw?url=" + encodeURIComponent(MOST_PLAYED), parse: parseMostPlayed },
    { id: "proxy-codetabs", url: "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(MOST_PLAYED), parse: parseMostPlayed },
    { id: "proxy-thingproxy", url: "https://thingproxy.freeboard.io/fetch/" + MOST_PLAYED, parse: parseMostPlayed },
    // iTunes Store TR listesi (CORS açık → garantili çalışır)
    { id: "itunes-rss", url: ITUNES_RSS, parse: parseItunesRSS, direct: true },
    { id: "itunes-rss-proxy", url: "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(ITUNES_RSS), parse: parseItunesRSS }
  ];

  /* ---------------- format çözümleyiciler ---------------- */
  function parseMostPlayed(j) {
    const res = (j && j.feed && j.feed.results) || [];
    if (!res.length) return null;
    return res.map((r, i) => ({
      rank: i + 1, title: r.name, artistName: r.artistName,
      art: UP(r.artworkUrl100), url: r.url || ""
    }));
  }

  function parseItunesRSS(j) {
    const e = (j && j.feed && j.feed.entry) || [];
    if (!e.length) return null;
    return e.map((x, i) => {
      const imgs = x["im:image"] || [];
      const art = imgs.length ? UP(imgs[imgs.length - 1].label) : null;
      return {
        rank: i + 1,
        title: x["im:name"] && x["im:name"].label,
        artistName: x["im:artist"] && x["im:artist"].label,
        art, url: (x.id && x.id.label) || ""
      };
    }).filter(x => x.title && x.artistName);
  }

  /* ---------------- yardımcı ---------------- */
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
    ]);
  }

  K.live = {
    get asof() { return store.asof; },
    get source() { return store.source; },

    /* boot: kayıtlı canlı veriyi baked verinin üzerine uygula */
    restore() {
      if (store.chart && store.chart.length) K.REAL_CHART = store.chart;
      if (store.songs) {
        Object.keys(store.songs).forEach(id => { K.REAL_SONGS[id] = store.songs[id]; });
      }
      if (store.art) {
        Object.keys(store.art).forEach(id => { K.REAL_ART[id] = store.art[id]; });
      }
      if (K.state) K.state._npcSongs = {};
    },

    /* ---------------- LİSTE YENİLE ---------------- */
    async refreshChart(silent) {
      if (typeof fetch !== "function") { if (!silent) K.toast("Çevrimdışı", "İnternet yok, mevcut liste kullanılıyor.", "warn"); return false; }

      for (const src of SOURCES) {
        try {
          const r = await withTimeout(fetch(src.url, { headers: { Accept: "application/json" } }), 9000);
          if (!r.ok) continue;
          const txt = await r.text();
          let j;
          try { j = JSON.parse(txt.replace(/^\uFEFF/, "")); } catch (e) { continue; }
          const chart = src.parse(j);
          if (!chart || chart.length < 10) continue;

          K.REAL_CHART = chart;
          store.chart = chart;
          store.asof = new Date().toISOString().slice(0, 10);
          store.source = src.id;
          persist();
          if (K.state) K.state._npcSongs = {};
          K.game.buildChart();
          K.bus.emit("live:updated", { kind: "chart", source: src.id });
          if (!silent) K.toast("🔄 Liste yenilendi", `${chart.length} gerçek şarkı · kaynak: ${src.id}`, "ok");
          return true;
        } catch (e) { /* sıradaki kaynağı dene */ }
      }
      if (!silent) K.toast("Yenilenemedi", "Canlı kaynağa ulaşılamadı, mevcut liste korunuyor.", "warn");
      return false;
    },

    /* ---------------- SANATÇI ŞARKILARINI YENİLE ---------------- */
    async refreshArtist(artistId, silent) {
      if (typeof fetch !== "function") return false;
      const a = K.artistById(artistId);
      if (!a) return false;
      try {
        const term = encodeURIComponent(a.stageName);
        const r = await withTimeout(fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=10&country=TR`, { headers: { Accept: "application/json" } }), 9000);
        if (!r.ok) return false;
        const j = await r.json();
        const first = a.stageName.split(" ")[0].toLowerCase();
        let list = (j.results || []).filter(x => (x.artistName || "").toLowerCase().includes(first));
        if (!list.length) list = (j.results || []);
        const songs = list.slice(0, 8).map(x => ({
          title: x.trackName, artistName: x.artistName, album: x.collectionName,
          art: UP(x.artworkUrl100), year: (x.releaseDate || "").slice(0, 4), ms: x.trackTimeMillis || 0
        }));
        if (!songs.length) return false;
        K.REAL_SONGS[artistId] = songs;
        store.songs[artistId] = songs;
        if (songs[0].art) { K.REAL_ART[artistId] = songs[0].art; store.art[artistId] = songs[0].art; }
        store.asof = new Date().toISOString().slice(0, 10);
        persist();
        if (K.state) K.state._npcSongs = {};
        K.bus.emit("live:updated", { kind: "artist", artistId });
        if (!silent) K.toast("🎵 Şarkılar yenilendi", `${a.stageName}: ${songs.length} gerçek şarkı`, "ok");
        return true;
      } catch (e) { return false; }
    },

    /* ---------------- TÜM SANATÇILARI YENİLE (yavaş, arka plan) ---------------- */
    async refreshAllArtists(silent) {
      const ids = K.artistList().map(a => a.id);
      let ok = 0, i = 0;
      for (const id of ids) {
        i++;
        const done = await K.live.refreshArtist(id, true);
        if (done) ok++;
        await new Promise(res => setTimeout(res, 260));
      }
      if (!silent) K.toast("🎵 Şarkı verisi güncellendi", `${ok}/${ids.length} sanatçı yenilendi`, "ok");
      K.bus.emit("live:updated", { kind: "all" });
      return ok;
    },

    /* boot sırasında: veri eskimişse sessizce yenile */
    autoRefresh() {
      if (!K.state) return;
      const today = new Date().toISOString().slice(0, 10);
      if (store.asof === today) return;
      setTimeout(() => K.live.refreshChart(true), 2500);
    },

    /* ---------------- durum özeti ---------------- */
    status() {
      return {
        asof: store.asof,
        source: store.source,
        chartCount: (K.REAL_CHART || []).length,
        chartIsLive: !!store.chart,
        artistCount: Object.keys(store.songs || {}).length
      };
    }
  };
})(window.K);
