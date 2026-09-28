/* ============================================================
   KARMA — systems/imagery.js
   GERÇEK görseller:
   1) Sanatçı portresi  → Wikipedia REST API (tr) canlı çekilir
   2) Albüm kapağı      → iTunes Search API (canlı) / baked veri
   3) Hiçbiri yoksa     → gradyan avatar
   Sonuçlar localStorage'da önbelleğe alınır.
   ============================================================ */
(function (K) {
  "use strict";

  const KEY = "karma_imagery_cache_v1";

  /* güvenli Wikipedia madde adları (portre için) */
  const WIKI = {
    sehinsah: "Şehinşah",
    ceza: "Ceza (rapçi)",
    sagopa: "Sagopa Kajmer",
    ezhel: "Ezhel",
    benfero: "Ben Fero",
    saniser: "Şanışer",
    normender: "Norm Ender",
    gazapizm: "Gazapizm",
    murda: "Murda (rapçi)",
    sila: "Sıla Gençoğlu",
    edis: "Edis Görgülü",
    hadise: "Hadise",
    aleynatilki: "Aleyna Tilki",
    simge: "Simge Sağın",
    deryaulug: "Derya Uluğ",
    melekmosso: "Melek Mosso",
    patron: "Patron (rapçi)",
    contra: "Contra (rapçi)",
    joker: "Joker (rapçi)"
  };

  let cache = {};
  let portraits = {};      // artistId -> gerçek portre (wiki)
  let pendingPortrait = {};
  let ready = false;

  try { cache = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { cache = {}; }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
  }

  function upscale(url) {
    return (url || "").replace("/100x100bb", "/600x600bb").replace("/100x100", "/600x600");
  }

  K.imagery = {
    get ready() { return ready; },

    /* ---- albüm kapağı / baked sanatçı görseli ---- */
    art(artistId) {
      if (cache["art:" + artistId]) return cache["art:" + artistId];
      if (K.REAL_ART && K.REAL_ART[artistId]) return K.REAL_ART[artistId];
      return null;
    },

    /* ---- sanatçı portresi (wiki) varsa öncelikli ---- */
    portrait(artistId) {
      return portraits[artistId] || cache["wiki:" + artistId] || null;
    },

    /* ---- isme göre en iyi görsel ---- */
    byName(name) {
      if (!name || !K.resolveArtistByName) return null;
      const a = K.resolveArtistByName(name);
      if (!a) return null;
      return a.photo || K.imagery.portrait(a.id) || K.imagery.art(a.id);
    },

    byArtistId(id) {
      if (!id || id === "player") return null;
      const a = K.artistById(id);
      return (a && a.photo) || K.imagery.portrait(id) || K.imagery.art(id);
    },

    /* ---- şarkı kapağı ---- */
    songArt(song) {
      if (!song) return null;
      if (song.art) return song.art;
      return null;
    },

    /* ---- Wikipedia portrelerini arka planda çek ---- */
    hydratePortraits() {
      if (ready) return;
      ready = true;
      if (typeof fetch !== "function") return;
      const ids = Object.keys(WIKI).filter(id => !cache["wiki:" + id]);
      if (!ids.length) return;
      let i = 0;
      const next = () => {
        if (i >= ids.length) return;
        const id = ids[i++];
        const title = WIKI[id];
        fetch("https://tr.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title), {
          headers: { Accept: "application/json" }
        })
          .then(r => r.ok ? r.json() : null)
          .then(j => {
            if (j && j.thumbnail && j.thumbnail.source) {
              const url = j.thumbnail.source;
              portraits[id] = url;
              cache["wiki:" + id] = url;
              persist();
              K.bus.emit("imagery:updated", id);
            } else {
              cache["wiki:" + id] = "__none__";
              persist();
            }
          })
          .catch(() => {})
          .finally(() => setTimeout(next, 160));
      };
      setTimeout(next, 400);
    },

    /* ---- belirli bir sanatçının albüm kapağını canlı çek ---- */
    hydrateArtistArt(artistId) {
      if (typeof fetch !== "function") return;
      const a = K.artistById(artistId);
      if (!a || pendingPortrait[artistId]) return;
      pendingPortrait[artistId] = true;
      const term = encodeURIComponent(a.aliases && a.aliases[0] ? a.stageName : a.stageName);
      fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1&country=TR`)
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (j && j.results && j.results[0] && j.results[0].artworkUrl100) {
            cache["art:" + artistId] = upscale(j.results[0].artworkUrl100);
            persist();
            K.bus.emit("imagery:updated", artistId);
          }
        })
        .catch(() => {});
    }
  };
})(window.K);
