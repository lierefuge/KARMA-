/* ============================================================
   KARMA — apps/spotify.js  (kapsamlı)
   Ana Sayfa · Arama (filtreli) · Kütüphane · Sanatçı profili
   (şarkılar / albümler / benzer sanatçılar) · Playlist · Albüm
   Beğeni, şimdi çalıyor çubuğu, gerçek şarkılar ve gerçek kapaklar.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* Gerçek Spotify alt sekme simgeleri (currentColor ile boyanır) */
  const SP_IC = {
    home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 3.2a1 1 0 0 0-1 0l-8 5A1 1 0 0 0 3 9v10a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1V9a1 1 0 0 0-.5-.87z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>',
    library: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="2.2" height="16" rx="1"/><rect x="7.2" y="4" width="2.2" height="16" rx="1"/><path d="M12.6 5.1 14.6 4.5l4.3 14.6-2 .6z"/></svg>'
  };

  /* Son aramalar — gerçek Spotify'ın arama ekranında görünür */
  function recents() {
    const p = K.state && K.state.player;
    if (!p) return [];
    p.spRecent = p.spRecent || [];
    return p.spRecent;
  }
  function pushRecent(q) {
    q = String(q || "").trim();
    if (q.length < 2) return;
    const list = recents();
    const i = list.findIndex(x => x.toLowerCase() === q.toLowerCase());
    if (i >= 0) list.splice(i, 1);
    list.unshift(q);
    if (list.length > 8) list.length = 8;
  }

  function trackRow(t, opts) {
    opts = opts || {};
    const letter = (t.title[0] || "?").toUpperCase();
    const liked = K.interactions.isLiked(t.id);
    return `<div class="sp-track">
      ${opts.index != null ? `<span class="t-rank">${opts.index + 1}</span>` : `<span class="t-rank">♪</span>`}
      ${K.ui.cover(t.coverSeed || t.id, letter, 42, t.art)}
      <div class="grow" style="min-width:0" data-pact="play" data-arg="${U.escape(t.id)}">
        <div class="t-name">${U.escape(t.title)}${t.mine ? ' <span class="pill karma" style="font-size:8px">SEN</span>' : ""}</div>
        <div class="t-artist">${U.escape(t.artistName)}${t.year ? " · " + t.year : ""}</div>
      </div>
      <span class="t-plays">${U.compact(t.streams || 0)}</span>
      <button class="t-more" data-pact="row-more" data-arg="${U.escape(t.id)}" title="Diğer">⋯</button>
      ${K.ui.likeBtn(t.id, t.streams)}
    </div>`;
  }

  function artistRow(a) {
    return `<div class="p-row" data-pact="open-artist" data-arg="${a.id}">
      ${K.ui.artistAvatar(a.id, 46, true)}
      <div class="grow">
        <div class="p-title">${U.escape(a.name || a.stageName)}</div>
        <div class="p-sub">Sanatçı · ${U.compact(a.monthly || 0)} aylık dinleyici</div>
      </div>
      <span style="color:var(--text-3)">›</span>
    </div>`;
  }

  function plCard(p) {
    return `<div class="sp-pl-card" data-pact="open-playlist" data-arg="${p.id}">
      <div class="sp-pl-art" style="background:linear-gradient(135deg,${p.color},#111)">♫</div>
      <div class="sp-pl-name">${U.escape(p.name)}</div>
      <div class="sp-pl-desc">${U.escape(p.desc)}</div>
    </div>`;
  }

  /* =========================================================
     v10.22 — GERÇEK SPOTIFY YERLEŞİM PARÇALARI
     Kitaplık filtresi modül düzeyinde tutulur (sekme değişince sıfırlanmasın).
     ========================================================= */
  let libFilter = "playlists";

  /* 2 sütunlu kutucuk (ana sayfa) */
  function spxTile(t) {
    const bg = t.color ? `linear-gradient(135deg,${t.color},#111)` : U.gradientFor(t.seed || t.title);
    return `<div class="spx-tile" data-pact="${t.act}" data-arg="${t.arg}">
      <div class="art" style="background:${bg}">${t.letter || "♫"}</div>
      <span class="tt">${U.escape(t.title)}</span></div>`;
  }

  /* yatay carousel kartı */
  function spxCard(c) {
    const bg = c.color ? `linear-gradient(135deg,${c.color},#111)` : U.gradientFor(c.seed || c.title);
    return `<div class="spx-card" data-pact="${c.act}" data-arg="${c.arg}">
      <div class="art ${c.round ? "round" : ""}" style="background:${bg}${c.art ? `;background-image:url('${c.art}');background-size:cover` : ""}">${c.art ? "" : (c.letter || "♫")}</div>
      <div class="tt">${U.escape(c.title)}</div>
      ${c.sub ? `<div class="ss">${U.escape(c.sub)}</div>` : ""}
    </div>`;
  }

  /* kitaplık satırı */
  function spxLibRow(r) {
    const bg = r.color ? `linear-gradient(135deg,${r.color},#111)` : U.gradientFor(r.seed || r.title);
    return `<div class="spx-librow" data-pact="${r.act}" data-arg="${r.arg}">
      <div class="art ${r.round ? "round" : ""}" style="background:${bg}${r.art ? `;background-image:url('${r.art}');background-size:cover` : ""}">${r.art ? "" : (r.letter || "♫")}</div>
      <div class="grow" style="min-width:0">
        <div class="tt">${U.escape(r.title)}</div>
        <div class="ss">${U.escape(r.sub || "")}</div>
      </div>
      <span class="rt">›</span></div>`;
  }

  K.phone.register({
    id: "spotify", name: "Spotify", icon: "♫", iconClass: "ic-spotify", dock: true, musicBar: true,

    render(params) {
      const view = {
        title: "Spotify", sub: "Müzik her yerde",
        shellClass: "app-spotify",
        musicBar: true,
        tabPos: "bottom",
        tabs: [
          { id: "home", label: "Ana Sayfa", icon: SP_IC.home },
          { id: "search", label: "Ara", icon: SP_IC.search },
          { id: "library", label: "Kitaplığın", icon: SP_IC.library }
        ],
        activeTab: params.tab || "home",
        state: { q: "", filter: "all" },
        render: (tab) => {
          if (tab === "search") return K.phone.appById("spotify").searchHTML(view);
          if (tab === "library") return K.phone.appById("spotify").libraryHTML();
          return K.phone.appById("spotify").homeHTML();
        },
        onMount: (root) => {
          const input = U.qs("[data-sp-search]", root);
          if (!input) return;
          const results = U.qs("[data-sp-results]", root);
          const draw = () => { results.innerHTML = K.phone.appById("spotify").resultsHTML(input.value, view.state.filter); };
          input.addEventListener("input", draw);
          input.addEventListener("keydown", (e) => { if (e.key === "Enter") { pushRecent(input.value); draw(); } });
          draw();
        },
        onAction: (act, el, v) => {
          const app = K.phone.appById("spotify");
          if (act === "open-artist") { pushRecent((U.qs("[data-sp-search]") || {}).value); app.openArtist(el.dataset.arg); }
          else if (act === "play") { pushRecent((U.qs("[data-sp-search]") || {}).value); app.playById(el.dataset.arg); }
          else if (act === "open-liked") app.openLiked();
          else if (act === "sp-recent") {
            const input = U.qs("[data-sp-search]");
            if (input) { input.value = el.dataset.arg || ""; input.dispatchEvent(new Event("input", { bubbles: true })); }
          }
          else if (act === "sp-clear-recent") { K.state.player.spRecent = []; K.phone.reRender(); }
          else if (act === "sp-share") K.toast("🔗 Bağlantı kopyalandı", el.dataset.arg || "", "ok");
          else if (act === "playlist-shuffle") {
            const list = (K.phone.views[K.phone.views.length - 1] || {})._plSongs || [];
            if (list.length) { app.playSong(list[Math.floor(Math.random() * list.length)]); K.toast("🔀 Karıştır", list.length + " şarkı", "ok"); }
          }
          else if (act === "row-more") K.tracks.actionSheet(el.dataset.arg);
          else if (act === "create-playlist") K.playlists.promptCreate((pl) => app.openUserPlaylist(pl.id));
          else if (act === "open-upl") app.openUserPlaylist(el.dataset.arg);
          else if (act === "open-playlist") app.openPlaylist(el.dataset.arg);
          else if (act === "goto-library") { v.activeTab = "library"; K.phone.renderTop(); }
          else if (act === "filter") {
            v.state.filter = el.dataset.arg;
            U.qsa("[data-filter]", U.qs(".app-body")).forEach(x => x.classList.toggle("active", x.dataset.arg === el.dataset.arg));
            const input = U.qs("[data-sp-search]");
            if (input) U.qs("[data-sp-results]").innerHTML = app.resultsHTML(input.value, v.state.filter);
          }
          else if (act === "open-album") app.openAlbum(el.dataset.arg);
          else if (act === "sp-libfilter") { libFilter = el.dataset.arg || "playlists"; K.phone.reRender(); }
          else if (act === "sp-genre") {
            /* "Hepsini keşfet" kutucuğu → arama alanına tür adını yaz */
            const input = U.qs("[data-sp-search]");
            if (input) { input.value = el.dataset.arg || ""; input.dispatchEvent(new Event("input", { bubbles: true })); }
          }
        }
      };
      return view;
    },

    /* ---------------- ANA SAYFA (gerçek Spotify kurgusu) ----------------
       Gerçek uygulamada: kaydırılabilir filtre çipleri → selamlama başlığı
       → 2 SÜTUNLU kutucuk ızgarası → yatay carousel'ler.
       Eski "hero kartı" kaldırıldı; gerçek Spotify'da böyle bir kart yok. */
    homeHTML() {
      const p = K.state.player;
      const pls = K.platforms.editorialPlaylists();
      const trend = (K.state.chart || []).slice(0, 6);
      const userPls = K.playlists.list();
      const recent = (K.lazy ? K.lazy.loaded("real-songs") : !!(K.REAL_SONGS && Object.keys(K.REAL_SONGS).length))
        ? K.artistList().slice(0, 5).flatMap(a => K.platforms.npcSongs(a.id, 2)).slice(0, 6) : [];
      const hour = new Date().getHours();
      const greet = hour < 6 ? "İyi geceler" : hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

      /* ızgara: önce kendi listelerin, sonra editoryal — en çok 6 kutu */
      const tiles = [
        ...userPls.slice(0, 3).map(pl => ({ act: "open-upl", arg: pl.id, seed: "upl_" + pl.id, letter: "🎵", title: pl.name })),
        ...pls.slice(0, 3).map(pl => ({ act: "open-playlist", arg: pl.id, color: pl.color, letter: "♫", title: pl.name }))
      ].slice(0, 6);

      return `
        <div class="spx-chips">
          <button class="spx-chip on">Tümü</button>
          <button class="spx-chip">Müzik</button>
          <button class="spx-chip">Podcast'ler</button>
        </div>
        <h1 class="spx-h1">${greet}</h1>

        ${tiles.length ? `<div class="spx-grid">${tiles.map(spxTile).join("")}</div>` : ""}

        <div class="spx-sec"><h2>Senin için hazırladıklarımız</h2><span class="more">Tümü</span></div>
        <div class="spx-rail">${pls.slice(0, 8).map(pl => spxCard({
          act: "open-playlist", arg: pl.id, color: pl.color, letter: "♫",
          title: pl.name, sub: pl.desc
        })).join("")}</div>

        <div class="spx-sec"><h2>Türkiye'de Trend</h2>
          <button class="mini-btn" data-pact="refresh-live">🔄 Canlı</button></div>
        ${trend.map((e, i) => `
          <div class="sp-track ${e.mine ? "mine" : ""}">
            <span class="t-rank">${i + 1}</span>
            ${K.ui.cover(e.cover, (e.title[0] || "?").toUpperCase(), 42, e.art)}
            <div class="grow" style="min-width:0" data-pact="play" data-arg="${U.escape(e.id)}">
              <div class="t-name">${U.escape(e.title)}${e.mine ? ' <span class="pill karma" style="font-size:8px">SEN</span>' : ""}</div>
              <div class="t-artist">${U.escape(e.artistName)}</div>
            </div>
            <span class="t-plays">${U.compact(e.daily)}</span>
          </div>`).join("")}

        ${userPls.length ? `<div class="spx-sec"><h2>Çalma listelerin</h2><span class="more">${userPls.length}</span></div>
        <div class="spx-rail">${userPls.slice(0, 8).map(pl => spxCard({
          act: "open-upl", arg: pl.id, seed: "upl_" + pl.id, letter: "🎵",
          title: pl.name, sub: pl.tracks.length + " şarkı"
        })).join("")}</div>` : ""}

        ${recent.length ? `<div class="spx-sec"><h2>Senin için</h2><span class="more">${recent.length}</span></div>
        ${recent.map((s, i) => trackRow(s, { index: i })).join("")}` : ""}

        ${K.phone.appById("spotify").algoHTML()}

        <div class="spx-sec"><h2>Mağaza Listelerin</h2></div>
        ${K.ui.storeLists("Spotify")}
      `;
    },

    /* ---------------- ALGORİTMİK LİSTELER ---------------- */
    algoHTML() {
      const p = K.state.player;
      const songs = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0));
      if (!songs.length) return `${K.ui.section("Algoritmik Listeler")}<div class="mini-empty">Şarkı yayınlayınca Release Radar ve Discover Weekly oluşur.</div>`;
      const rr = songs.filter(s => (s.algos && s.algos.releaseRadar > 0) || (K.state.day - (s.publishedDay || 0)) <= 10);
      const dw = songs.filter(s => s.algos && s.algos.discoverWeekly > 0);
      const block = (title, desc, list) => `${K.ui.section(title, `<span class="muted">${desc}</span>`)}
        ${list.length ? list.slice(0, 5).map((s, i) => trackRow({ ...s, artistName: p.stageName, rank: i + 1 }, { index: i })).join("") : `<div class="mini-empty">Bu listede şarkın yok.</div>`}`;
      const pls = songs.filter(s => s.playlists && s.playlists.length);
      const edito = pls.length ? `${K.ui.section("Editoryal Listelerinde", `<span class="muted">${pls.length}</span>`)}
        ${pls.slice(0, 5).map(s => `<div class="sp-track mine"><span class="t-rank">📻</span>
          <div class="grow"><div class="t-name">${U.escape(s.title)}</div><div class="t-artist">${s.playlists.length} editoryal liste</div></div>
          <span class="pill karma">SEN</span></div>`).join("")}` : "";
      return block("Release Radar", "takipçilerine öneriliyor", rr)
        + block("Discover Weekly", "benzer dinleyicilere", dw)
        + edito;
    },

    /* ---------------- ARAMA ---------------- */
    searchHTML(view) {
      /* Gerçek Spotify: filtre çipi YOK — yalnız arama alanı,
         altında "Son aramalar" + "Hepsini keşfet" renkli ızgarası. */
      return `
        <h1 class="spx-h1">Ara</h1>
        <div class="p-search">
          <span>🔍</span>
          <input data-sp-search type="text" placeholder="Ne dinlemek istersin?" value="${U.escape(view.state.q)}" />
        </div>
        <div data-sp-results style="display:flex;flex-direction:column;gap:4px"></div>`;
    },

    resultsHTML(q, filter) {
      filter = filter || "all";
      q = (q || "").trim();
      const showA = filter === "all" || filter === "artist";
      const showS = filter === "all" || filter === "song";
      const showAl = filter === "all" || filter === "album";

      /* Boş sorgu → gerçek Spotify'ın "Hepsini keşfet" RENKLİ ızgarası.
         Her tür kendi rengiyle bir kutucuk; tıklayınca o tür aranır. */
      if (!q) {
        const rec = recents();
        const recHTML = rec.length
          ? `${K.ui.section("Son aramalar", `<button class="mini-btn" data-pact="sp-clear-recent">Tümünü temizle</button>`)}
             ${rec.map(r => `<div class="spx-librow" data-pact="sp-recent" data-arg="${U.escape(r)}">
               <div class="art" style="background:#2a2a2a;font-size:16px">🕘</div>
               <div class="grow" style="min-width:0"><div class="tt">${U.escape(r)}</div></div>
               <span class="rt">↗</span></div>`).join("")}`
          : "";
        const palette = ["#e13300", "#7358ff", "#1e3264", "#e8115b", "#148a08",
                         "#8d67ab", "#ba5d07", "#0d73ec", "#537aa1", "#777777"];
        const genres = K.GENRES.slice(0, 10);
        return recHTML + `<div class="spx-sec"><h2>Hepsini keşfet</h2></div>
          <div class="spx-explore">${genres.map((g, i) => `
            <div class="spx-gen" style="background:${palette[i % palette.length]}"
                 data-pact="sp-genre" data-arg="${U.escape(g.name)}">
              <span class="nm">${U.escape(g.name)}</span>
              <span class="ic">${g.icon}</span>
            </div>`).join("")}</div>`;
      }
      const artists = showA ? K.platforms.searchArtists(q).slice(0, 5) : [];
      const songs = showS ? K.platforms.searchSongs(q).slice(0, 15) : [];
      // albümler: gerçek şarkıların albüm adından türet
      let albums = [];
      if (showAl) {
        const all = K.platforms.searchSongs(q);
        const map = {};
        all.forEach(s => { if (s.album && !map[s.album]) map[s.album] = s; });
        albums = Object.keys(map).slice(0, 6).map(al => ({ album: al, song: map[al] }));
      }
      if (!artists.length && !songs.length && !albums.length)
        return `<div class="empty-note" style="margin-top:10px"><b>Sonuç yok</b>"${U.escape(q)}" için bir şey bulunamadı.</div>`;

      return (artists.length ? K.ui.section("Sanatçılar") + artists.map(artistRow).join("") : "")
        + (songs.length ? K.ui.section("Şarkılar") + songs.map((s, i) => trackRow(s, { index: i })).join("") : "")
        + (albums.length ? K.ui.section("Albümler") + albums.map(a => `
            <div class="p-row" data-pact="open-album" data-arg="${U.escape(a.album)}">
              ${K.ui.cover(a.song.coverSeed, "💿", 46, a.song.art)}
              <div class="grow"><div class="p-title">${U.escape(a.album)}</div>
              <div class="p-sub">${U.escape(a.song.artistName)} · Albüm</div></div>
              <span style="color:var(--text-3)">›</span>
            </div>`).join("") : "");
    },

    /* ---------------- KİTAPLIĞIN (gerçek Spotify kurgusu) ----------------
       Gerçek uygulama: filtre ÇİPLERİ (Çalma listeleri / Sanatçılar /
       Albümler) + kapaklı satırlar. Eski "istatistik + alt alta bölümler"
       düzeni kaldırıldı; istatistik tek satır şeride indi. */
    libraryHTML() {
      const p = K.state.player;
      const liked = K.interactions.likedSongs();
      const followed = K.interactions.followedArtists();
      const userPls = K.playlists.list();
      const edito = K.platforms.editorialPlaylists();
      const f = libFilter;

      const chips = [["playlists", "Çalma listeleri"], ["artists", "Sanatçılar"],
                     ["albums", "Albümler"], ["songs", "Şarkılar"]];

      let body = "";
      if (f === "playlists") {
        const rows = [
          ...userPls.map(pl => ({ act: "open-upl", arg: pl.id, seed: "upl_" + pl.id, letter: "🎵",
            title: pl.name, sub: "Çalma listesi · " + pl.tracks.length + " şarkı" })),
          ...edito.map(pl => ({ act: "open-playlist", arg: pl.id, color: pl.color, letter: "♫",
            title: pl.name, sub: "Spotify · " + (pl.desc || "Editoryal") }))
        ];
        body = rows.length ? rows.map(spxLibRow).join("")
          : `<div class="mini-empty">Henüz çalma listen yok — “＋ Yeni” ile oluştur.</div>`;
      } else if (f === "artists") {
        body = followed.length ? followed.map(a => spxLibRow({
          act: "open-artist", arg: a.id, art: K.imagery.byArtistId(a.id) !== "__none__" ? K.imagery.byArtistId(a.id) : "",
          round: true, letter: (a.stageName || "?")[0], title: a.stageName, sub: "Sanatçı"
        })).join("") : `<div class="mini-empty">Sanatçı profillerinden takip et.</div>`;
      } else if (f === "albums") {
        const albums = (p.albums || []);
        body = albums.length ? albums.map(al => spxLibRow({
          act: "open-album", arg: al.title, art: al.cover || "", seed: al.coverSeed || al.title,
          letter: "💿", title: al.title, sub: "Albüm · " + (al.trackIds || []).length + " parça"
        })).join("") : `<div class="mini-empty">Henüz albümün yok — stüdyoda proje oluştur.</div>`;
      } else {
        const songs = liked.length ? liked : (p.songs || []).slice().sort((a, b) => (b.streams || 0) - (a.streams || 0));
        body = songs.length ? songs.slice(0, 25).map(s => spxLibRow({
          act: "play", arg: s.id, art: s.art || "", seed: s.coverSeed || s.id, letter: (s.title || "?")[0],
          title: s.title, sub: "Şarkı · " + U.escape(s.artistName || p.stageName)
        })).join("") : `<div class="mini-empty">Şarkıları kalp ile beğen, burada birikir.</div>`;
      }

      /* Gerçek Spotify: "Beğenilen Şarkılar" kitaplığın EN ÜSTÜNDE sabit satır.
         İstatistik kartları kaldırıldı (gerçek uygulamada kitaplıkta yok). */
      const likedRow = `<div class="spx-librow liked" data-pact="open-liked">
        <div class="art liked-art">♥</div>
        <div class="grow" style="min-width:0">
          <div class="tt">Beğenilen Şarkılar</div>
          <div class="ss">Çalma listesi · ${liked.length} şarkı</div>
        </div>
        <span class="rt">›</span></div>`;

      return `
        <h1 class="spx-h1">Kitaplığın</h1>
        ${likedRow}
        <div class="spx-chips" style="margin:10px 0 4px">
          ${chips.map(([id, label]) => `<button class="spx-chip ${f === id ? "on" : ""}" data-pact="sp-libfilter" data-arg="${id}">${label}</button>`).join("")}
          ${f === "playlists" ? `<button class="spx-chip" data-pact="create-playlist">＋ Yeni</button>` : ""}
        </div>
        ${body}
      `;
    },

    /* ---------------- BEĞENİLEN ŞARKILAR ---------------- */
    openLiked() {
      const songs = K.interactions.likedSongs();
      K.phone.pushView({
        title: "Beğenilen Şarkılar", sub: songs.length + " şarkı", shellClass: "app-spotify", musicBar: true,
        _plSongs: songs,
        render: () => `
          <div class="pl-hero liked-hero">
            <div class="pl-art liked-art">♥</div>
            <div class="pl-meta">
              <div class="pl-name">Beğenilen Şarkılar</div>
              <div class="pl-desc">${songs.length} şarkı</div>
            </div>
          </div>
          <div class="sp-actions">
            <button class="sp-play-btn" data-pact="playlist-play">▶</button>
            <button class="btn btn-sm btn-ghost" data-pact="playlist-shuffle">🔀 Karıştır</button>
          </div>
          ${songs.length
            ? songs.map((s, i) => trackRow({ ...s, coverSeed: s.coverSeed || s.id, artistName: s.artistName || K.state.player.stageName }, { index: i })).join("")
            : `<div class="mini-empty">Hiç beğenin yok — şarkıların yanındaki ♡ ile beğen.</div>`}`,
        onAction: (act, el) => {
          const app = K.phone.appById("spotify");
          if (act === "play") app.playById(el.dataset.arg);
          else if (act === "row-more") K.tracks.actionSheet(el.dataset.arg);
          else if (act === "playlist-play") { if (songs[0]) app.playSong(songs[0]); }
        }
      });
    },

    /* ---------------- KULLANICI ÇALMA LİSTESİ ---------------- */
    openUserPlaylist(id) {
      const pl = K.playlists.byId(id);
      if (!pl) return;
      K.phone.pushView({
        title: pl.name, sub: pl.tracks.length + " şarkı", shellClass: "app-spotify", musicBar: true,
        _plSongs: pl.tracks,
        render: () => `
          <div class="pl-hero" style="background:linear-gradient(135deg,#2a2a35,#111)">
            <div class="pl-art">🎵</div>
            <div class="pl-meta"><div class="pl-name">${U.escape(pl.name)}</div>
              <div class="pl-desc">${pl.tracks.length} şarkı</div>
              <div class="pl-owner">Spotify · Senin çalma listen</div></div>
          </div>
          <div class="sp-actions">
            <button class="sp-play-btn" data-pact="upl-play" title="Çal">▶</button>
            <button class="btn btn-sm btn-ghost" data-pact="playlist-shuffle">🔀 Karıştır</button>
            <button class="btn btn-sm btn-ghost" data-pact="upl-del">🗑️ Sil</button>
          </div>
          ${pl.tracks.length ? pl.tracks.map((t, i) => trackRow({ ...t, streams: 0 }, { index: i })).join("")
            : `<div class="mini-empty">Liste boş. Bir şarkının ⋯ menüsünden “listesine ekle” seç.</div>`}`,
        onAction: (act, el) => {
          const app = K.phone.appById("spotify");
          if (act === "play") app.playById(el.dataset.arg);
          else if (act === "row-more") K.tracks.actionSheet(el.dataset.arg);
          else if (act === "upl-play") { if (pl.tracks[0]) app.playSong(pl.tracks[0]); }
          else if (act === "upl-del") { K.playlists.del(pl.id); K.toast("🗑️ Silindi", pl.name, "warn"); K.phone.back(); }
        }
      });
    },

    /* ---------------- SANATÇI PROFİLİ ---------------- */
    openArtist(artistId) {
      const prof = K.platforms.artistProfile(artistId);
      if (!prof) return;
      const songs = K.platforms.spotifyTopSongs(artistId);
      const rel = artistId !== "player" ? K.relation(artistId) : null;
      const followed = K.interactions.isFollowed(artistId);
      const related = K.phone.appById("spotify").relatedArtists(artistId);

      // albümler (gerçek şarkıların albüm adına göre)
      const albumsMap = {};
      songs.forEach(s => { if (s.album) albumsMap[s.album] = (albumsMap[s.album] || []).concat(s); });

      K.phone.pushView({
        title: prof.name, sub: "Sanatçı", shellClass: "app-spotify", musicBar: true,
        /* Gerçek Spotify'da sanatçı sayfası SEKMEsizdir: tek kaydırma
           içinde Popüler → Diskografi → Fans also like → Hakkında. */
        render: () => {
          const head = `
            <div class="artist-hero-sp" style="background:${prof.art ? `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.75)), url('${prof.art}') center/cover` : U.gradientFor(prof.name)}">
              <div class="ah-avatar">${prof.art ? `<div class="ah-img" style="background-image:url('${prof.art}')"></div>` : K.ui.avatar(prof.name, 86, true)}</div>
              <div class="ah-info">
                <div class="ah-verified">${prof.popularity > 75 ? "✓ Doğrulanmış Sanatçı" : "Sanatçı"}</div>
                <div class="ah-name">${U.escape(prof.name)}</div>
                <div class="ah-meta">${U.compact(prof.monthly)} aylık dinleyici</div>
              </div>
            </div>
            <div class="sp-actions">
              ${artistId !== "player" ? `<button class="btn btn-sm ${followed ? "btn-ghost" : "btn-primary"}" data-pact="follow" data-arg="${artistId}">${followed ? "Takip Ediliyor" : "Takip Et"}</button>` : ""}
              ${artistId !== "player" ? `<button class="btn btn-sm btn-ghost" data-pact="dm" data-arg="${artistId}" title="DM">💬</button>` : ""}
              <button class="btn btn-sm btn-ghost" data-pact="sp-share" data-arg="${U.escape(prof.name)}" title="Paylaş">⋮</button>
            </div>`;

          /* Popüler — gerçek Spotify ilk 5 şarkıyı gösterir */
          const total = (prof.songs || []).length;
          const top = songs.slice(0, 5);
          const popular = K.ui.section("Popüler", `<span class="muted">${songs.length} / ${total}</span>`)
            + top.map((s, i) => trackRow({ ...s, artistName: prof.name }, { index: i })).join("")
            + (total > top.length
              ? `<div class="p-row" data-pact="all-songs" data-arg="${artistId}">
                   <span style="font-size:18px">≡</span>
                   <div class="grow"><div class="p-title">Tümünü gör</div>
                   <div class="p-sub">${total} şarkı · tam diskografi</div></div>
                   <span style="color:var(--text-3)">›</span>
                 </div>`
              : "");

          /* Diskografi — yatay raf (gerçek Spotify'da albüm kartları) */
          const albKeys = Object.keys(albumsMap);
          const disc = albKeys.length
            ? K.ui.section("Diskografi", `<span class="muted">${albKeys.length} yayın</span>`)
              + `<div class="spx-rail">${albKeys.slice(0, 10).map(al => spxCard({
                  act: "open-album", arg: U.escape(al),
                  seed: "al_" + al, letter: "💿", art: albumsMap[al][0].art,
                  title: al, sub: albumsMap[al].length + " şarkı"
                })).join("")}</div>`
            : "";

          /* Fans also like — yuvarlak sanatçı kartları */
          const fansAlso = related.length
            ? K.ui.section("Fans also like")
              + `<div class="spx-rail">${related.map(a => spxCard({
                  act: "open-artist", arg: a.id, round: true,
                  seed: a.id, letter: (a.stageName || "?")[0],
                  title: a.stageName, sub: "Sanatçı"
                })).join("")}</div>`
            : "";

          const about = prof.bio
            ? K.ui.section("Hakkında") + `<div class="bio-box">${U.escape(prof.bio)}</div>`
            : "";

          const affinity = rel && (rel.discovered || rel.met)
            ? `<div class="sp-stat" style="padding:10px 12px"><div class="k">Samimiyetin</div>
                 <div class="v">${Math.round(rel.affinity)}/100 · ${U.escape(K.stageFor(rel.affinity).label)}</div></div>`
            : "";

          return head + popular + disc + fansAlso + about + affinity;
        },
        onAction: (act, el, v) => {
          const app = K.phone.appById("spotify");
          if (act === "play") app.playById(el.dataset.arg);
          else if (act === "open-artist") app.openArtist(el.dataset.arg);
          else if (act === "all-songs") app.openAllSongs(el.dataset.arg);
          else if (act === "open-album") app.openAlbum(el.dataset.arg);
          else if (act === "dm" && el.dataset.arg !== "player") K.phone.openApp("messages", { artistId: el.dataset.arg });
          else if (act === "refresh-live") K.live.refreshChart(false).then(() => K.phone.reRender());
        }
      });
    },

    /* ---------------- TÜM ŞARKILAR (tam diskografi) --------------
       Şehinşah 187 · wegh Rumi 48 şarkı gibi büyük kataloglar için
       ayrı görünüm. Yıl başlıkları altında gruplanır, arama kutusu vardır.
       shellClass verilirse Apple Music kabuğuyla da çalışır. */
    openAllSongs(artistId, opts) {
      opts = opts || {};
      const prof = K.platforms.artistProfile(artistId);
      if (!prof) return;
      const all = (prof.songs || []).slice();
      const shell = opts.shellClass || "app-spotify";

      const body = (q) => {
        const s = String(q || "").toLowerCase();
        const list = all.filter((x) => !s || x.title.toLowerCase().includes(s))
          .sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));

        if (!list.length) return `<div class="mini-empty">Şarkı bulunamadı.</div>`;

        const groups = [];
        list.forEach((x) => {
          const y = x.year || "—";
          let g = groups.find((z) => z.year === y);
          if (!g) { g = { year: y, songs: [] }; groups.push(g); }
          g.songs.push(x);
        });

        return groups.map((g) => `
          ${K.ui.section(g.year, `<span class="muted">${g.songs.length} şarkı</span>`)}
          ${g.songs.map((song, i) => trackRow({ ...song, artistName: song.artistName || prof.name }, { index: i })).join("")}
        `).join("");
      };

      K.phone.pushView({
        title: "Tüm şarkılar", sub: prof.name + " · " + all.length + " şarkı",
        shellClass: shell, musicBar: true,
        params: { artistId },
        render: () => `<div class="p-search"><span>🔍</span><input data-all-q type="text" placeholder="Şarkı ara..." /></div>
          <div data-all-list>${body("")}</div>`,
        onMount: (root) => {
          if (!root) return;
          const inp = U.qs("[data-all-q]", root);
          const box = U.qs("[data-all-list]", root);
          if (inp && box) inp.addEventListener("input", () => { box.innerHTML = body(inp.value); });
        },
        onAction: (act, el) => {
          if (act === "play") K.phone.appById("spotify").playById(el.dataset.arg);
          else if (act === "row-more") K.tracks.actionSheet(el.dataset.arg);
        }
      });
    },

    relatedArtists(artistId) {
      const a = K.artistById(artistId);
      if (!a) return [];
      return K.artistList()
        .filter(x => x.id !== artistId)
        .map(x => ({ a: x, score: (x.genre === a.genre ? 40 : 0) + (x.city === a.city ? 15 : 0) - Math.abs(x.popularity - a.popularity) }))
        .sort((p, q) => q.score - p.score)
        .slice(0, 6).map(x => x.a);
    },

    /* ---------------- PLAYLIST ---------------- */
    openPlaylist(id) {
      const pl = K.platforms.editorialPlaylists().find(p => p.id === id);
      if (!pl) return;
      const saved = K.interactions.isSaved(id);
      K.phone.pushView({
        title: pl.name, sub: pl.desc, shellClass: "app-spotify", musicBar: true,
        _plSongs: pl.songs,
        render: () => `
          <div class="pl-hero" style="background:linear-gradient(135deg,${pl.color},#111)">
            <div class="pl-art">♫</div>
            <div class="pl-meta"><div class="pl-name">${U.escape(pl.name)}</div>
              <div class="pl-desc">${U.escape(pl.desc)}</div>
              <div class="pl-owner">Spotify · ${pl.songs.length} şarkı</div></div>
          </div>
          <div class="sp-actions">
            <button class="sp-play-btn" data-pact="playlist-play" title="Çal">▶</button>
            <button class="btn btn-sm btn-ghost" data-pact="playlist-shuffle">🔀 Karıştır</button>
            <button class="btn btn-sm btn-ghost" data-pact="playlist-save" data-arg="${id}">${saved ? "✓ Kaydedildi" : "＋ Kaydet"}</button>
          </div>
          ${pl.songs.map((s, i) => trackRow({ ...s, coverSeed: s.coverSeed || s.id }, { index: i })).join("")}`,
        onAction: (act, el, v) => {
          const app = K.phone.appById("spotify");
          if (act === "play") app.playById(el.dataset.arg);
          else if (act === "playlist-play") {
            if (pl.songs[0]) app.playSong(pl.songs[0]);
          }
          else if (act === "playlist-save") {
            const on = K.interactions.toggleSave(el.dataset.arg);
            K.toast(on ? "✓ Kaydedildi" : "Kaldırıldı", pl.name, on ? "ok" : "warn");
            K.phone.reRender();
          }
        }
      });
    },

    /* ---------------- ALBÜM ---------------- */
    openAlbum(albumName) {
      const all = K.platforms.searchSongs("");
      const tracks = all.filter(s => s.album === albumName);
      if (!tracks.length) return;
      K.phone.pushView({
        title: albumName, sub: tracks[0].artistName, shellClass: "app-spotify", musicBar: true,
        render: () => `
          <div class="pl-hero">
            ${K.ui.cover("al_" + albumName, "💿", 90, tracks[0].art)}
            <div class="pl-meta"><div class="pl-name">${U.escape(albumName)}</div>
              <div class="pl-desc">${U.escape(tracks[0].artistName)} · ${tracks.length} şarkı</div></div>
          </div>
          ${tracks.map((s, i) => trackRow(s, { index: i })).join("")}`,
        onAction: (act, el) => {
          const app = K.phone.appById("spotify");
          if (act === "play") app.playById(el.dataset.arg);
          else if (act === "open-artist") app.openArtist(el.dataset.arg);
        }
      });
    },

    /* ---------------- çalma ---------------- */
    playById(id) {
      const direct = K.platforms.findSong(id);
      if (direct) { K.interactions.play({ id, title: direct.title, artistName: K.state.player.stageName, art: null }); K.phone.reRender(); return; }
      const real = (K.state.chart || []).find(e => e.id === id);
      if (real) { K.interactions.play({ id, title: real.title, artistName: real.artistName, art: real.art }); K.phone.reRender(); return; }
      const [artistId, idx] = id.split("_s");
      const a = K.artistById(artistId);
      const list = a ? K.platforms.npcSongs(artistId, 5) : [];
      const sg = list[+idx];
      if (sg) { K.interactions.play({ id, title: sg.title, artistName: sg.artistName || a.stageName, art: sg.art }); K.phone.reRender(); }
    },

    playSong(sg) {
      K.interactions.play({ id: sg.id, title: sg.title, artistName: sg.artistName, art: sg.art });
      K.phone.reRender();
    }
  });
})(window.K);
