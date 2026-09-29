/* ============================================================
   KARMA — data/persona.js
   OYUNCUNUN SANATÇI KİMLİĞİ  ·  PLAYER tarafı

   ⚠️ BURASI NPC KİŞİLİĞİ DEĞİLDİR (B-6). Yan komşu `data/personality.js`
   NPC kişilik katmanıdır. İki dosyanın adı yakın olduğu için global adları
   bilinçli olarak AYRI önek taşır:

     BU DOSYA          data/persona.js       (oyuncu)
                       K.PLAYER_PERSONAS · K.playerPersonaById
                       K.playerPersonaFit · K.playerIdentityScore
     KOMŞU DOSYA       data/personality.js   (NPC)
                       K.NPC_PERSONALITY · K.npcPersonality

   Neden? Eskiden global'ler yalnızca tek bir harfle ayrılıyordu
   (`K.PERSONAS` ↔ `K.PERSONALITY`). Yanlış olanı yazmak `undefined`
   döndürüp SESSİZCE yanlış davranışa yol açıyordu. Bu ayrım
   tools/smoke-tooling.js içindeki B-6 invariant'ı ile kilitlidir.

   Oyuncu kimliği. Şarkılar kimlikle tutarlıysa itibar ve sadakat artar;
   tutarsızsa "kimliksiz" eleştirisi gelir. (Kayıtlı alan: `player.persona`)

   genres : uyumlu türler
   themes : uyumlu söz temaları
   mass / viral / loyalty : tema uyumunda etki çarpanları
   rep    : itibar kazancı çarpanı
   ============================================================ */
(function (K) {
  "use strict";

  K.PLAYER_PERSONAS = [
    {
      id: "sokak", name: "Sokak", icon: "🏙️",
      genres: ["rap", "hiphop", "drill", "boombap", "trap"],
      themes: ["street", "freedom", "money"],
      mass: 1.00, viral: 1.05, loyalty: 1.15, rep: 1.40,
      desc: "Gerçek, mahalle ve mücadele. Saygı kazandırır, sadık kitle kurar."
    },
    {
      id: "melankolik", name: "Melankolik", icon: "🌧️",
      genres: ["cloudrap", "rnb", "arabesk", "indie"],
      themes: ["loss", "love", "introspect"],
      mass: 0.96, viral: 0.98, loyalty: 1.40, rep: 1.10,
      desc: "Duygusal derinlik. En sadık dinleyiciyi getirir, hacim düşer."
    },
    {
      id: "deneysel", name: "Deneysel", icon: "🧪",
      genres: ["hyperpop", "cloudrap", "indie", "phonk"],
      themes: ["introspect", "faith", "freedom"],
      mass: 0.88, viral: 1.05, loyalty: 1.25, rep: 1.55,
      desc: "Niş ve sanatsal. Eleştirmen sevgisi yüksek, kitle dar."
    },
    {
      id: "eglence", name: "Eğlence", icon: "🔥",
      genres: ["trap", "afrotrap", "pop", "hyperpop"],
      themes: ["party", "flex", "money"],
      mass: 1.16, viral: 1.18, loyalty: 0.90, rep: 0.85,
      desc: "Yaz ve kulüp sound'u. En yüksek hacim, en hızlı tüketim."
    },
    {
      id: "hikaye", name: "Hikâye Anlatıcı", icon: "📖",
      genres: ["rap", "hiphop", "boombap", "arabesk"],
      themes: ["street", "loss", "faith", "introspect"],
      mass: 1.00, viral: 0.95, loyalty: 1.30, rep: 1.35,
      desc: "Anlatı ve derinlik. Uzun kariyer, yavaş yükseliş."
    }
  ];

  K.playerPersonaById = function (id) {
    return K.PLAYER_PERSONAS.find(p => p.id === id) || null;
  };

  /* oyuncu kimliği uyumu: 1 = tam uyum, 0 = alakasız */
  K.playerPersonaFit = function (personaId, genre, themeId) {
    const p = K.playerPersonaById(personaId);
    if (!p) return null;
    const g = p.genres.indexOf(genre) >= 0;
    const t = p.themes.indexOf(themeId) >= 0;
    return { genre: g, theme: t, score: (g ? 0.5 : 0) + (t ? 0.5 : 0), persona: p };
  };

  /* Son yayınlardan kimlik tutarlılığı (0-100) — OYUNCU */
  K.playerIdentityScore = function () {
    const p = K.state && K.state.player;
    if (!p || !p.persona) return 0;
    const songs = (p.songs || []).slice(-8);
    if (!songs.length) return 60;
    let ok = 0;
    songs.forEach(s => {
      const f = K.playerPersonaFit(p.persona, s.genre, s.lyricTheme);
      if (f && f.score >= 0.5) ok++;
    });
    return Math.max(0, Math.min(100, Math.round(40 + (ok / songs.length) * 60)));
  };
})(window.K = window.K || {});
