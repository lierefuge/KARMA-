/* ============================================================
   KARMA — apps/applemusic.js  (kapsamlı)
   Dinle · Listeler (canlı) · Radyo · Kütüphane · Sanatçı profili
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- gerçek Apple Music simgeleri (SVG) ----------
     v10.37 — emoji yerine SF Symbols tarzı Apple Music işaretleri.
     .a-on = aktif (dolu) · .a-off = pasif (ince çizgi). */
  const AI = {
    listen: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <rect class="a-off" x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none"/>
      <path class="a-off" d="M9.8 8.2 16 12l-6.2 3.8z" fill="currentColor" stroke="none"/>
      <rect class="a-on" x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="currentColor" stroke="none"/>
      <path class="a-on" d="M9.4 7.6 16.4 12l-7 4.4z" fill="#000" stroke="none"/>
    </svg>`,
    charts: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="2.8" y="3.2" width="8" height="8" rx="2"/><rect x="13.2" y="3.2" width="8" height="8" rx="2"/><rect x="2.8" y="13.2" width="8" height="8" rx="2"/><rect x="13.2" y="13.2" width="8" height="8" rx="2"/></svg>`,
    radio: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
      <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/>
      <path d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 7.4a6.5 6.5 0 0 1 0 9.2"/>
      <path d="M4.3 4.3a11 11 0 0 0 0 15.4M19.7 4.3a11 11 0 0 1 0 15.4"/>
    </svg>`,
    library: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="3" y="3.4" width="4.2" height="17.2" rx="1.2"/><rect x="9" y="3.4" width="4.2" height="17.2" rx="1.2"/><path d="M15.6 4.2a1.1 1.1 0 0 1 1.3-.8l3.4.9a1.1 1.1 0 0 1 .8 1.3l-3.9 15a1.1 1.1 0 0 1-1.3.8l-3.4-.9a1.1 1.1 0 0 1-.8-1.3z"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.2 19 12 8 18.8z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="7" y="5" width="3.6" height="14" rx="1"/><rect x="13.4" y="5" width="3.6" height="14" rx="1"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 11.4a8.4 8.4 0 1 0-1.6 5.6"/><path d="M20.4 5v6.4h-6.4"/></svg>`,
    radioSmall: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4"/></svg>`
  };

  /* v10.22 — Apple Music kitaplık filtresi (sekme değişince sıfırlanmasın) */
  let amFilter = "playlists";

  function amxCard(c) {
    const bg = c.color ? `linear-gradient(135deg,${c.color},#111)` : U.gradientFor(c.seed || c.title);
    return `<div class="amx-card" data-pact="${c.act}" data-arg="${c.arg}">
      <div class="art" style="background:${bg}${c.art ? `;background-image:url('${c.art}');background-size:cover` : ""}">${c.art ? "" : (c.letter || "♪")}</div>
      <div class="tt">${U.escape(c.title)}</div>
      ${c.sub ? `<div class="ss">${U.escape(c.sub)}</div>` : ""}
    </div>`;
  }

  function amxLibRow(r) {
    const bg = r.color ? `linear-gradient(135deg,${r.color},#111)` : U.gradientFor(r.seed || r.title);
    return `<div class="amx-librow" data-pact="${r.act}" data-arg="${r.arg}">
      <div class="art ${r.round ? "round" : ""}" style="background:${bg}${r.art ? `;background-image:url('${r.art}');background-size:cover` : ""}">${r.art ? "" : (r.letter || "♪")}</div>
      <div class="grow" style="min-width:0">
        <div class="tt">${U.escape(r.title)}</div>
        <div class="ss">${U.escape(r.sub || "")}</div>
      </div>
      <span style="color:var(--text-3);font-size:15px">›</span></div>`;
  }

  function chartRow(e, i) {
    return `<div class="am-chart-row">
      <span class="num ${i < 3 ? "peak" : ""}">${e.rank || i + 1}</span>
      ${K.ui.cover(e.coverSeed || ("am" + i), (e.title[0] || "?").toUpperCase(), 38, e.art)}
      <div class="info" data-pact="play" data-arg="${U.escape(e.id || e.title)}">
        <div class="n">${U.escape(e.title)}${e.mine ? ' <span class="pill karma" style="font-size:8px">SEN</span>' : ""}</div>
        <div class="a">${U.escape(e.artistName)}</div>
      </div>
      <span class="streams">${U.compact(e.streams || 0)}</span>
      ${K.ui.likeBtn((e.id || e.title), e.streams)}
      <button class="t-more" data-pact="am-more" data-arg="${U.escape(e.id || e.title)}">⋯</button>
    </div>`;
  }

  K.phone.register({
    id: "applemusic", name: "Apple Music", icon: "♪", iconClass: "ic-apple", dock: true, musicBar: true,

    render(params) {
      const view = {
        title: "Apple Music", sub: "Dinle. Keşfet. Listele.",
        shellClass: "app-applemusic", musicBar: true,
        tabPos: "bottom",
        tabs: [
          { id: "listen", label: "Şimdi Çal", icon: AI.listen },
          { id: "charts", label: "Listeler", icon: AI.charts },
          { id: "radio", label: "Radyo", icon: AI.radio },
          { id: "lib", label: "Kitaplık", icon: AI.library }
        ],
        activeTab: params.tab || "listen",
        render: (tab) => {
          const app = K.phone.appById("applemusic");
          if (tab === "charts") return app.chartsHTML();
          if (tab === "radio") return app.radioHTML();
          if (tab === "lib") return app.libraryHTML();
          return app.listenHTML();
        },
        onAction: (act, el, v) => {
          const app = K.phone.appById("applemusic");
          if (act === "open-artist") app.openArtist(el.dataset.arg);
          else if (act === "play") app.playById(el.dataset.arg);
          else if (act === "am-more") K.tracks.actionSheet(el.dataset.arg);
          else if (act === "open-upl") K.playlists.open(el.dataset.arg, { shellClass: "app-applemusic", musicBar: true });
          else if (act === "create-playlist") K.playlists.promptCreate();
          else if (act === "refresh-live") K.live.refreshChart(false).then(() => { K.phone.reRender(); K.refresh(); });
          else if (act === "station") app.startRadio(el.dataset.arg);
          else if (act === "genre") app.openGenre(el.dataset.arg);
          else if (act === "am-libfilter") { amFilter = el.dataset.arg || "playlists"; K.phone.reRender(); }
        }
      };
      return view;
    },

    /* ---------- DİNLE ---------- */
    listenHTML() {
      const p = K.state.player;
      const genres = K.GENRES.filter(g => ["rap", "trap", "drill", "pop", "rnb", "arabesk"].includes(g.id));
      const moods = [
        { id: "gece", label: "Gece Sürüşü", emoji: "🌙", color: "#4a2b8a" },
        { id: "enerji", label: "Yüksek Enerji", emoji: "⚡", color: "#b03a2e" },
        { id: "huzur", label: "Huzur", emoji: "🌊", color: "#1f6f8b" },
        { id: "odak", label: "Odaklan", emoji: "🎯", color: "#2e7d32" },
        { id: "duygusal", label: "Duygusal", emoji: "💔", color: "#7b2d5e" },
        { id: "parti", label: "Parti", emoji: "🔥", color: "#c25e00" }
      ];
      const featured = K.platforms.searchSongs("").slice(0, 6);

      /* Gerçek "Şimdi Çal" kurgusu: büyük başlık → BÜYÜK KAPAKLI yatay
         carousel'ler (En Çok Dinlenen / Çalma Listelerin / Senin için /
         Yeni Çıkanlar) → ruh hali ve tür şeritleri.
         Eski "hero kartı + düz satır listesi" kaldırıldı. */
      const charts = K.platforms.appleCharts(10).map((e, i) => ({ ...e, coverSeed: "am" + i }));
      const edito = K.platforms.editorialPlaylists ? K.platforms.editorialPlaylists() : [];
      const userPls = K.playlists.list();
      const fresh = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0)).slice(0, 8);

      return `
        <h1 class="amx-h1">Şimdi Çal</h1>
        <div class="sub" style="font-size:11.5px;color:var(--text-2);margin-bottom:2px">
          ${U.compact(p.monthly)} aylık dinleyici · ${U.compact(K.platforms.playerTotals().apple)} Apple dinlenme
        </div>

        <div class="amx-sec"><h2>En Çok Dinlenenler</h2><span class="more">Türkiye</span></div>
        <div class="amx-rail">${charts.map(e => amxCard({
          act: "play", arg: e.id || e.title, art: e.art || "", seed: e.coverSeed,
          letter: (e.title || "?")[0], title: e.title, sub: e.artistName
        })).join("")}</div>

        ${userPls.length ? `<div class="amx-sec"><h2>Çalma Listelerin</h2><span class="more">${userPls.length}</span></div>
        <div class="amx-rail">${userPls.map(pl => amxCard({
          act: "open-upl", arg: pl.id, seed: "upl_" + pl.id, letter: "🎵",
          title: pl.name, sub: pl.tracks.length + " şarkı"
        })).join("")}</div>` : ""}

        ${edito.length ? `<div class="amx-sec"><h2>Senin için seçtiklerimiz</h2><span class="more">Tümü</span></div>
        <div class="amx-rail">${edito.slice(0, 8).map(pl => amxCard({
          act: "open-playlist", arg: pl.id, color: pl.color, letter: "♪",
          title: pl.name, sub: pl.desc
        })).join("")}</div>` : ""}

        ${fresh.length ? `<div class="amx-sec"><h2>Yeni Çıkanlar</h2><span class="more">${fresh.length}</span></div>
        <div class="amx-rail">${fresh.map(sg => amxCard({
          act: "play", arg: sg.id, art: sg.art || "", seed: sg.coverSeed || sg.id,
          letter: (sg.title || "?")[0], title: sg.title, sub: p.stageName
        })).join("")}</div>` : ""}

        <div class="amx-sec"><h2>Ruh Haline Göre</h2></div>
        <div class="am-mood-grid">
          ${moods.map(m => `<div class="am-mood" style="background:linear-gradient(135deg,${m.color},#111)" data-pact="station" data-arg="${U.escape(m.label)}">
            <span class="m-emoji">${m.emoji}</span><span class="m-label">${U.escape(m.label)}</span></div>`).join("")}
        </div>

        <div class="amx-sec"><h2>Türe Göre</h2></div>
        <div class="amx-rail">${genres.map(g => amxCard({
          act: "genre", arg: g.id, color: "#2c2c2e", letter: g.icon, title: g.name, sub: "Tür"
        })).join("")}</div>

        ${featured.length ? `<div class="amx-sec"><h2>Öne Çıkanlar</h2></div>
        ${featured.map((s, i) => chartRow({ ...s, rank: i + 1, streams: s.streams }, i)).join("")}` : ""}
        ${p.songs.some(s => s.playlists && s.playlists.length) ? `
          ${K.ui.section("Listelerde")}
          ${p.songs.filter(s => s.playlists && s.playlists.length).slice(0, 5).map(s => `<div class="sp-track mine">
            <span class="t-rank">${AI.radioSmall}</span>
            <div class="grow"><div class="t-name">${U.escape(s.title)}</div><div class="t-artist">${s.playlists.length} editoryal liste</div></div>
            <span class="pill karma">SEN</span>
          </div>`).join("")}` : ""}
        ${K.ui.section("Mağaza Listelerin")}
        ${K.ui.storeLists("Apple Music")}`;
    },

    /* ---------- LİSTELER ---------- */
    chartsHTML() {
      const charts = K.platforms.appleCharts(20).map((e, i) => ({ ...e, coverSeed: "am" + i }));
      const mine = charts.filter(c => c.mine);
      const asof = (K.live && K.live.status().asof) || K.REAL_CHART_ASOF || "";
      const live = K.live && K.live.status().chartIsLive;
      return `
        <div class="am-hero">
          <div class="h-name">Türkiye Top 20</div>
          <div class="h-meta">${live ? "🟢 Canlı veri" : "📋 Gerçek liste anlık görüntüsü"}${asof ? " · " + U.escape(asof) : ""}</div>
          <div class="h-listeners">${mine.length ? `Listede ${mine.length} şarkın var!` : "Şarkının listeye girmesi için dinlenme gerekiyor."}</div>
        </div>
        <div class="action-row">
          <button class="btn btn-sm btn-primary" data-pact="refresh-live">${AI.refresh} Listeyi Canlı Yenile</button>
        </div>
        ${charts.map((e, i) => chartRow(e, i)).join("")}`;
    },

    /* ---------- RADYO ---------- */
    radioHTML() {
      const stations = [
        { name: "Apple Music 1", desc: "Global hit'ler ve yeni çıkanlar", emoji: "🌍", color: "#e8452c" },
        { name: "Apple Music Türkiye", desc: "Türkiye'nin en çok dinlenenleri", emoji: "🇹🇷", color: "#b03a2e" },
        { name: "Rap Türkiye", desc: "Türkçe rap kesintisiz", emoji: "🎤", color: "#6c4ab6" },
        { name: "Trap Zone", desc: "Sert trap sound'ları", emoji: "🔥", color: "#8a4dff" },
        { name: "Pop Türkiye", desc: "Pop hit'leri", emoji: "✨", color: "#e0a13a" },
        { name: "Gece Modu", desc: "Melankolik R&B ve lo-fi", emoji: "🌙", color: "#2b4b8a" },
        { name: "Drill TR", desc: "Drill dalgası", emoji: "🥶", color: "#3a7ca5" },
        { name: "Underground", desc: "Keşfedilmemiş isimler", emoji: "🎧", color: "#4a4a4a" }
      ];
      return `
        <div class="am-hero">
          <div class="h-name">Radyo</div>
          <div class="h-meta">Kesintisiz müzik · canlı yayınlar</div>
        </div>
        ${stations.map(s => `<div class="amx-station" style="margin-bottom:10px" data-pact="station" data-arg="${U.escape(s.name)}">
          <div class="art" style="background:linear-gradient(135deg,${s.color},#111)">${s.emoji}</div>
          <div class="grow">
            <div class="tt">${U.escape(s.name)}</div>
            <div class="ss">${U.escape(s.desc)}</div>
            <div class="amx-live"><i></i> Canlı</div>
          </div>
          <span style="color:var(--text-3)">${AI.play}</span>
        </div>`).join("")}`;
    },

    /* ---------- KİTAPLIK (gerçek Apple Music kurgusu) ----------
       Filtre çipleri + kapaklı satırlar; profil bilgisi tek satıra indi. */
    libraryHTML() {
      const p = K.state.player;
      const liked = K.interactions.likedSongs();
      const followed = K.interactions.followedArtists();
      const userPls = K.playlists.list();
      const chartRank = Math.min(999, ...p.songs.map(s => s.chartRank || 999), 999);
      const f = amFilter;

      const chips = [["playlists", "Çalma Listeleri"], ["artists", "Sanatçılar"],
                     ["albums", "Albümler"], ["songs", "Şarkılar"]];

      let body = "";
      if (f === "playlists") {
        body = userPls.length ? userPls.map(pl => amxLibRow({
          act: "open-upl", arg: pl.id, seed: "upl_" + pl.id, letter: "🎵",
          title: pl.name, sub: pl.tracks.length + " şarkı"
        })).join("") : `<div class="mini-empty">Henüz çalma listen yok.</div>`;
      } else if (f === "artists") {
        body = followed.length ? followed.map(a => amxLibRow({
          act: "open-artist", arg: a.id, round: true,
          art: K.imagery.byArtistId(a.id) !== "__none__" ? K.imagery.byArtistId(a.id) : "",
          letter: (a.stageName || "?")[0], title: a.stageName, sub: "Sanatçı"
        })).join("") : `<div class="mini-empty">Sanatçı profillerinden takip et.</div>`;
      } else if (f === "albums") {
        const albums = p.albums || [];
        body = albums.length ? albums.map(al => amxLibRow({
          /* Apple Music'te oyuncunun kendi albüm detay ekranı yok;
             satır sanatçı profiline ("player") gider — orada albüm listesi var. */
          act: "open-artist", arg: "player", art: al.cover || "", seed: al.coverSeed || al.title,
          letter: "💿", title: al.title, sub: "Albüm · " + (al.trackIds || []).length + " parça"
        })).join("") : `<div class="mini-empty">Henüz albümün yok.</div>`;
      } else {
        const songs = liked.length ? liked : (p.songs || []).slice().sort((a, b) => (b.streams || 0) - (a.streams || 0));
        body = songs.length ? songs.slice(0, 25).map(sg => amxLibRow({
          act: "play", arg: sg.id, art: sg.art || "", seed: sg.coverSeed || sg.id,
          letter: (sg.title || "?")[0], title: sg.title, sub: "Şarkı · " + U.escape(sg.artistName || p.stageName)
        })).join("") : `<div class="mini-empty">Şarkıları ♥ ile beğen.</div>`;
      }

      return `
        <h1 class="amx-h1">Kitaplık</h1>
        <div class="sub" style="font-size:11.5px;color:var(--text-2);margin-bottom:8px">
          ${U.escape(p.stageName)} · ${U.escape(p.city)} · ${K.genreById(p.genre).name}
        </div>
        <div class="sp-stat-row" style="margin-bottom:10px">
          <div class="sp-stat" style="background:rgba(250,35,59,0.10)"><div class="k">Güncel Liste</div><div class="v">${chartRank === 999 ? "—" : "#" + chartRank}</div></div>
          <div class="sp-stat" style="background:rgba(250,35,59,0.10)"><div class="k">Popülerlik</div><div class="v">${Math.round(p.popularity)}</div></div>
        </div>

        <div class="spx-chips" style="margin-bottom:4px">
          ${chips.map(([id, label]) => `<button class="spx-chip ${f === id ? "on" : ""}" data-pact="am-libfilter" data-arg="${id}">${label}</button>`).join("")}
          ${f === "playlists" ? `<button class="spx-chip" data-pact="create-playlist">＋ Yeni</button>` : ""}
        </div>

        ${body}

        ${K.queue.size() ? `<div class="sp-stat" style="padding:9px 12px;margin-top:10px"><div class="k">Çalma Kuyruğu</div><div class="v">${K.queue.size()} şarkı sırada</div></div>` : ""}
      `;
    },

    /* ---------- tür listesi ---------- */
    openGenre(genreId) {
      const g = K.genreById(genreId);
      const songs = K.platforms.searchSongs("").filter(s => {
        const a = K.artistById(s.artistId);
        return a && a.genre === genreId;
      }).slice(0, 14);
      K.phone.pushView({
        title: g.name, sub: "Apple Music · tür", shellClass: "app-applemusic", musicBar: true,
        render: () => `
          <div class="am-hero"><div class="h-name">${g.icon} ${U.escape(g.name)}</div>
            <div class="h-meta">${U.escape(g.note)}</div></div>
          ${songs.length ? songs.map((s, i) => chartRow({ ...s, rank: i + 1 }, i)).join("")
            : `<div class="mini-empty">Bu türde şarkı bulunamadı.</div>`}`,
        onAction: (act, el) => {
          if (act === "play") K.phone.appById("applemusic").playById(el.dataset.arg);
        }
      });
    },

    /* ---------- sanatçı ---------- */
    openArtist(artistId) {
      const prof = K.platforms.artistProfile(artistId);
      if (!prof) return;
      const songs = prof.songs || [];
      const followed = K.interactions.isFollowed(artistId);
      K.phone.pushView({
        title: prof.name, sub: "Apple Music profili", shellClass: "app-applemusic", musicBar: true,
        render: () => `
          <div class="am-hero" style="${prof.art ? `background:linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.8)), url('${prof.art}') center/cover` : ""}">
            <div class="h-name">${U.escape(prof.name)}</div>
            <div class="h-meta">${U.escape(prof.real || "")} ${(prof.aliases && prof.aliases.length) ? "· aka " + U.escape(prof.aliases.join(", ")) : ""}</div>
            <div class="h-listeners">${U.compact(prof.monthly)} aylık dinleyici · ${U.compact(prof.streams)} toplam dinlenme</div>
          </div>
          ${artistId !== "player" ? `<button class="btn btn-sm ${followed ? "btn-ghost" : "btn-primary"}" data-pact="follow" data-arg="${artistId}" style="align-self:flex-start">${followed ? "Takip Ediliyor" : "Takip Et"}</button>` : ""}
          <div class="sp-stat-row">
            <div class="sp-stat" style="background:rgba(251,92,116,0.1)"><div class="k">Popülerlik</div><div class="v">${Math.round(prof.popularity)}</div></div>
            <div class="sp-stat" style="background:rgba(251,92,116,0.1)"><div class="k">En İyi Liste</div><div class="v">${prof.chartPeak ? "#" + prof.chartPeak : "—"}</div></div>
          </div>
          ${K.ui.section("Şarkılar", `<span class="muted">${Math.min(20, songs.length)} / ${songs.length}</span>`)}
          ${songs.slice(0, 20).map((s, i) => chartRow({ title: s.title, artistName: prof.name, id: s.id, streams: s.streams, rank: i + 1, art: s.art }, i)).join("")}
          ${songs.length > 20
            ? `<div class="p-row" data-pact="aa-all">
                 <span style="font-size:18px">≡</span>
                 <div class="grow"><div class="p-title">Tüm şarkıları gör</div>
                 <div class="p-sub">${songs.length} şarkı · tam diskografi</div></div>
                 <span style="color:var(--text-3)">›</span>
               </div>`
            : ""}
          ${K.ui.discographySection(artistId, "aa-album")}`,
        onAction: (act, el) => {
          const app = K.phone.appById("applemusic");
          if (act === "play") app.playById(el.dataset.arg);
          else if (act === "aa-all") K.phone.appById("spotify").openAllSongs(artistId, { shellClass: "app-applemusic" });
          else if (act === "aa-album") app.openAlbumFor(artistId, el.dataset.arg);
        }
      });
    },

    /* ---------- sanatçının albümü ---------- */
    openAlbumFor(artistId, albumTitle) {
      const prof = K.platforms.artistProfile(artistId);
      if (!prof) return;
      const tracks = (prof.songs || []).filter(s => s.album === albumTitle);
      K.phone.pushView({
        title: albumTitle, sub: prof.name, shellClass: "app-applemusic", musicBar: true,
        render: () => `
          <div class="pl-hero">
            ${K.ui.cover("al_" + albumTitle, "💿", 88, tracks[0] && tracks[0].art)}
            <div class="pl-meta"><div class="pl-name">${U.escape(albumTitle)}</div>
              <div class="pl-desc">${U.escape(prof.name)} · ${tracks.length} şarkı</div></div>
          </div>
          ${tracks.length ? tracks.map((s, i) => chartRow({ title: s.title, artistName: prof.name, id: s.id, streams: s.streams, rank: i + 1, art: s.art }, i)).join("") : `<div class="mini-empty">Albüm parçaları bulunamadı.</div>`}`,
        onAction: (act, el) => {
          if (act === "play") K.phone.appById("applemusic").playById(el.dataset.arg);
        }
      });
    },

    /* radyo istasyonu: çal + kuyruğa şarkı ekle */
    startRadio(name) {
      const pool = K.platforms.searchSongs("").slice(0, 20);
      const first = U.pick(pool);
      if (first) K.interactions.play(first);
      U.shuffle(pool).slice(0, 5).forEach(s => K.queue.list().push({ id: s.id, title: s.title, artistName: s.artistName, art: s.art }));
      K.save();
      K.toast("📻 " + name, "Çalıyor · kuyruğa 5 şarkı eklendi.", "ok");
      K.phone.reRender();
    },

    playById(id) {
      const real = (K.state.chart || []).find(e => e.id === id);
      if (real) { K.interactions.play({ id, title: real.title, artistName: real.artistName, art: real.art }); K.phone.reRender(); return; }
      const [artistId, idx] = id.split("_s");
      const a = K.artistById(artistId);
      const list = a ? K.platforms.npcSongs(artistId, 5) : [];
      const sg = list[+idx];
      if (sg) { K.interactions.play({ id, title: sg.title, artistName: sg.artistName || a.stageName, art: sg.art }); K.phone.reRender(); }
      else K.toast("▶️ Apple Music", "Çalınıyor", "ok");
    }
  });
})(window.K);
