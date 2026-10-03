/* ============================================================
   KARMA — systems/platforms.js
   Spotify / Apple Music / YouTube için veri üretimi:
   arama, sanatçı profili, şarkı listeleri, editoryal listeler,
   chart sistemleri ve kanal verileri.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  const SONG_WORDS = ["Gece", "Sokak", "Yalan", "Karma", "Rüya", "Ateş", "Sisli", "Kayıp",
    "Son Dans", "Bir Şans", "Kırmızı", "Derin", "Yıldız", "Sessiz", "Fırtına", "Melek",
    "Kalbim", "Şehir", "Vazgeç", "Yolun Sonu", "Beton", "Yağmur", "Küller", "Gölge",
    "Zaman", "Hâlâ", "Yarın", "Bu Gece", "Gerçek", "Hikâye", "İçimde", "Uzak", "Yakın"];

  K.platforms = {

    /* ---------- deterministik şarkı üretimi ---------- */
    npcSongs(artistId, count) {
      const a = K.artistById(artistId);
      if (!a) return [];
      const s = K.state;
      s._npcSongs = s._npcSongs || {};
      const key = artistId + ":" + (count || 5);
      if (s._npcSongs[key]) return s._npcSongs[key];

      const n = count || 5;
      /* v10.16 — gerçek şarkılar artık tembel yüklenir (P-1).
         Yüklenmemişse boş döner ve yüklemeyi tetikler; veri gelince
         `lazydata:loaded` olayı _npcSongs önbelleğini temizleyip
         arayüzü tazeler (bkz. js/main.js). */
      const real = K.lazy ? K.lazy.songs(artistId) : ((K.REAL_SONGS && K.REAL_SONGS[artistId]) || []);
      const out = [];

      if (real.length) {
        // GERÇEK şarkılar (iTunes) + gerçek albüm kapakları
        real.slice(0, Math.max(n, real.length)).forEach((sg, i) => {
          const rel = Math.max(0.04, 1 - i * 0.12);
          const streams = Math.round((a.monthly / 5) * rel * (0.75 + ((U.hashHue(sg.title) % 50) / 100)));
          out.push({
            id: artistId + "_s" + i,
            title: sg.title,
            artistId,
            artistName: sg.artistName || a.stageName,
            album: sg.album || "",
            streams,
            monthly: Math.round(streams * 0.32),
            quality: U.clamp(58 + (U.hashHue(sg.title) % 40), 40, 98),
            year: sg.year || "",
            duration: sg.ms ? Math.round(sg.ms / 1000) : 150 + (U.hashHue(sg.title) % 90),
            coverSeed: a.id + "_" + i,
            art: sg.art || null,
            /* v10.16 (P-1) — ÖNİZLEME ALANLARI BURADAN KALDIRILDI.
               Eskiden `preview` ve `appleUrl` her şarkı nesnesine gömülüyordu;
               bu, şarkı listesi çizen her ekranın (boot dahil) 143 KB'lık
               real-previews verisini çekmesine yol açıyordu.
               Artık K.preview.find() önizlemeyi ÇALMA ANINDA artistId+title
               ile kendisi arar (bkz. systems/preview.js) — davranış aynı,
               ama veri yalnızca gerçekten dinlenecekken yüklenir. */
            real: true
          });
        });
      } else {
        // gerçek veri yoksa temsili üretim
        for (let i = 0; i < n; i++) {
          const seed = U.hashHue(a.id + "_" + i);
          const title = SONG_WORDS[seed % SONG_WORDS.length] + (i % 3 === 0 ? "" : " " + SONG_WORDS[(seed * 7) % SONG_WORDS.length]);
          const rel = Math.max(0.06, 1 - i * 0.16 + ((seed % 9) / 60));
          const streams = Math.round((a.monthly / 6) * rel * (0.7 + (seed % 60) / 100));
          out.push({
            id: artistId + "_s" + i, title, artistId, artistName: a.stageName,
            streams, monthly: Math.round(streams * 0.32),
            quality: U.clamp(60 + (seed % 35), 40, 98),
            year: 2024 - (i % 4), duration: 150 + (seed % 90),
            coverSeed: a.id + "_" + i
          });
        }
      }
      s._npcSongs[key] = out;
      return out;
    },

    /* ---------- arama ---------- */
    searchArtists(q) {
      q = (q || "").toLowerCase().trim();
      const list = K.artistList().map(a => ({
        id: a.id, name: a.stageName, aliases: a.aliases || [], real: a.realName,
        monthly: a.monthly, genre: a.genre, city: a.city, popularity: a.popularity
      }));
      if (!q) return list.sort((x, y) => y.monthly - x.monthly);
      return list.filter(x =>
        x.name.toLowerCase().includes(q) ||
        x.real.toLowerCase().includes(q) ||
        x.aliases.some(al => al.toLowerCase().includes(q))
      ).sort((x, y) => y.monthly - x.monthly);
    },

    searchSongs(q) {
      q = (q || "").toLowerCase().trim();
      const out = [];
      // NPC şarkıları
      K.artistList().forEach(a => {
        K.platforms.npcSongs(a.id, 5).forEach(sg => {
          if (!q || sg.title.toLowerCase().includes(q) || a.stageName.toLowerCase().includes(q))
            out.push(sg);
        });
      });
      // oyuncu şarkıları
      K.state.player.songs.forEach(sg => {
        if (!q || sg.title.toLowerCase().includes(q)) {
          out.push({
            id: sg.id, title: sg.title, artistId: "player",
            artistName: K.state.player.stageName, streams: sg.streams,
            monthly: sg.lastDaily || 0, quality: sg.quality,
            year: U.dateForDay(sg.publishedDay || 1).label.split(" ")[1] ? 2024 : 2024,
            coverSeed: sg.coverSeed, mine: true, featName: sg.featName
          });
        }
      });
      return out.sort((a, b) => b.streams - a.streams).slice(0, 60);
    },

    /* ---------- sanatçı profili (birleşik) ---------- */
    artistProfile(artistId) {
      if (artistId === "player") {
        const p = K.state.player;
        return {
          id: "player", name: p.stageName, real: p.realName, age: p.age, city: p.city,
          genre: p.genre, monthly: p.monthly, streams: p.streams, popularity: p.popularity,
          ytSubs: p.ytSubs, ig: p.ig, x: p.x, tiktok: p.tiktok,
          chartPeak: Math.min(999, ...K.state.player.songs.map(s => s.chartPeak || 999), 999),
          songs: K.state.player.songs, mine: true
        };
      }
      const a = K.artistById(artistId);
      if (!a) return null;
      return {
        id: a.id, name: a.stageName, aliases: a.aliases || [], real: a.realName,
        age: a.age, city: a.city, genre: a.genre,
        monthly: a.monthly, streams: a.streams, popularity: a.popularity,
        ytSubs: a.ytSubs, ig: a.ig, x: a.x, tiktok: a.tiktok,
        chartPeak: a.chartPeak, labelId: a.labelId, bio: a.bio,
        songs: K.platforms.npcSongs(a.id, 6)
      };
    },

    /* ---------- bir editoryal listenin kurulmuş hâli ---------- */
    editorialPlaylist(id) {
      if (K.editorial && K.editorial.build) return K.editorial.build(id);
      return null;
    },

    /* ---------- Spotify sanatçı şarkıları (popülerlik sıralı) ---------- */
    spotifyTopSongs(artistId) {
      const prof = K.platforms.artistProfile(artistId);
      if (!prof) return [];
      return (prof.songs || []).slice().sort((a, b) => (b.streams || 0) - (a.streams || 0)).slice(0, 10);
    },

    /* ---------- editoryal / platform listeleri ----------
       v10.48 — listeler artık `data/editorial.js` içindeki KÜRATÖRLÜ
       tanımlardan kurulur: her liste gerçek sanatçıların gerçek
       şarkılarından derlenir (~10 parça). Oyuncunun şarkısı o listeye
       girdiyse/pitch'ten kabul aldıysa gerçek sanatçıların arasında görünür. */
    editorialPlaylists() {
      if (K.editorial && K.editorial.build) {
        return K.editorial.PLAYLISTS.map(p => K.editorial.build(p.id));
      }
      return [];
    },

    /* ---------- Apple Music chart ---------- */
    appleCharts(limit) {
      const chart = K.state.chart || [];
      return chart.slice(0, limit || 20).map((e, i) => ({
        rank: i + 1, title: e.title, artistName: e.artistName,
        streams: e.daily, mine: e.mine, deltas: e.delta,
        coverSeed: e.cover, art: e.art || null
      }));
    },

    /* ---------- YouTube kanalı ---------- */
    youtubeChannel(artistId) {
      const prof = K.platforms.artistProfile(artistId);
      if (!prof) return null;
      const vids = (prof.songs || []).slice(0, 6).map((sg, i) => ({
        id: sg.id, title: sg.title + " (Official Video)",
        views: Math.round((sg.streams || 0) * U.rand(0.9, 1.6)),
        likes: Math.round((sg.streams || 0) * 0.02),
        comments: Math.round((sg.streams || 0) * 0.002),
        duration: 150 + (i * 37) % 160,
        coverSeed: sg.coverSeed
      }));
      return { profile: prof, videos: vids };
    },

    /* ---------- oyuncunun toplam platform verileri ---------- */
    playerTotals() {
      const p = K.state.player;
      return {
        spotify: U.sum(p.songs, s => s.spotifyStreams || 0),
        apple: U.sum(p.songs, s => s.appleStreams || 0),
        youtube: U.sum(p.songs, s => s.youtubeViews || 0),
        all: p.streams
      };
    },

    /* ---------- oyuncunun şarkısını platforma göre bul ---------- */
    findSong(songId) {
      return K.state.player.songs.find(s => s.id === songId) || null;
    },

    /* ---------- şarkı popülerlik yüzdesi (0-100) ---------- */
    songPopularity(song) {
      const max = Math.max(1, ...(K.state.chart || []).map(e => e.daily));
      return U.clamp(Math.round(((song.lastDaily || song.dailyStreams || 0) / max) * 100), 1, 100);
    }
  };
})(window.K);
