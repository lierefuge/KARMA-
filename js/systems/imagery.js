/* ============================================================
   KARMA — systems/imagery.js
   GERÇEK görseller:
   0) Sanatçı profil resmi (PP) → data/artist-photos.js (Deezer, 500×500)
   1) Sanatçı portresi  → Wikipedia REST API (tr) canlı çekilir
   2) Albüm kapağı      → iTunes Search API (canlı) / baked veri
   3) Hiçbiri yoksa     → gradyan avatar
   Sonuçlar localStorage'da önbelleğe alınır.

   v10.6 — HER SANATÇININ GERÇEK PP'SI VAR:
   K.ARTIST_PHOTOS (baked, 36/36 sanatçı) en yüksek önceliklidir; böylece
   Instagram/TikTok/X/Spotify/Mesajlar ve yorum balonlarında aynı gerçek
   yüz görünür. PP yoksa Wikipedia → albüm kapağı → gradyan sırası işler.
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

    /* ---- sanatçı PROFİL RESMİ (PP) ----
       Sıra: baked Deezer fotoğrafı → canlı wiki → wiki önbelleği.
       "__none__" bilinçli negatif önbellektir. */
    photo(artistId) {
      if (!artistId) return null;
      return (K.ARTIST_PHOTOS || {})[artistId] || null;
    },

    portrait(artistId) {
      const baked = K.imagery.photo(artistId);
      if (baked) return baked;
      const live = portraits[artistId] || cache["wiki:" + artistId];
      return (live && live !== "__none__") ? live : null;
    },

    /* ---- PP var mı? (arayüzler bunu sorar) ---- */
    hasPhoto(artistId) {
      return !!K.imagery.portrait(artistId);
    },

    /* ---- isme göre en iyi görsel ---- */
    byName(name) {
      if (!name || !K.resolveArtistByName) return null;
      const a = K.resolveArtistByName(name);
      if (!a) return null;
      return a.photo || K.imagery.portrait(a.id) || K.imagery.art(a.id);
    },

    byArtistId(id) {
      if (!id) return null;
      if (id === "player") return K.state.player.photo || null;
      const a = K.artistById(id);
      return (a && a.photo) || K.imagery.portrait(id) || K.imagery.art(id);
    },

    /* ---- şarkı kapağı ---- */
    songArt(song) {
      if (!song) return null;
      if (song.art) return song.art;
      return null;
    },

    /* ---- eksik PP'leri arka planda tamamla ----
       Baked fotoğrafı OLMAYAN sanatçılar için sırayla Wikipedia (tr) →
       iTunes albüm kapağı. Böylece hiçbir sanatçı PP'siz kalmaz. */
    blanketHydrate() {
      if (typeof fetch !== "function") return;
      K.artistList().forEach(a => {
        if (K.imagery.photo(a.id)) return;
        const w = cache["wiki:" + a.id];
        if (w && w !== "__none__") return;
        if (K.imagery.art(a.id)) return;
        setTimeout(() => K.imagery.hydrateArtistArt(a.id), 200 + Math.random() * 1200);
      });
    },

    /* ---- Wikipedia portrelerini arka planda çek ---- */
    hydratePortraits() {
      if (ready) return;
      ready = true;
      if (typeof fetch !== "function") return;
      K.imagery.blanketHydrate();
      const ids = Object.keys(WIKI).filter(id => !cache["wiki:" + id] && !K.imagery.photo(id));
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
      if (!a || !a.stageName || pendingPortrait[artistId]) return;
      if (K.imagery.photo(artistId) || K.imagery.art(artistId)) return;
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
