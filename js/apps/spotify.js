/* ============================================================
   KARMA — apps/spotify.js  (kapsamlı)
   Ana Sayfa · Arama (filtreli) · Kütüphane · Sanatçı profili
   (şarkılar / albümler / benzer sanatçılar) · Playlist · Albüm
   Beğeni, şimdi çalıyor çubuğu, gerçek şarkılar ve gerçek kapaklar.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

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

  K.phone.register({
    id: "spotify", name: "Spotify", icon: "♫", iconClass: "ic-spotify", dock: true, musicBar: true,

    render(params) {
      const view = {
        title: "Spotify", sub: "Müzik her yerde",
        shellClass: "app-spotify",
        musicBar: true,
        tabPos: "bottom",
        tabs: [
          { id: "home", label: "Ana Sayfa", icon: "🏠" },
          { id: "search", label: "Ara", icon: "🔍" },
          { id: "library", label: "Kütüphane", icon: "📚" }
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
          if (input) {
            const results = U.qs("[data-sp-results]", root);
            const draw = () => { results.innerHTML = K.phone.appById("spotify").resultsHTML(input.value, view.state.filter); };
            input.addEventListener("input", draw);
            draw();
          }
        },
        onAction: (act, el, v) => {
          const app = K.phone.appById("spotify");
          if (act === "open-artist") app.openArtist(el.dataset.arg);
          else if (act === "play") app.playById(el.dataset.arg);
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
        }
      };
      return view;
    },

    /* ---------------- ANA SAYFA ---------------- */
    homeHTML() {
      const p = K.state.player;
      const pls = K.platforms.editorialPlaylists().slice(0, 6);
      const trend = (K.state.chart || []).slice(0, 8);
      /* v10.16 — tembel veri katmanı (P-1): yüklenmemişse bölüm atlanır,
         veri gelince lazydata:loaded ile arayüz tazelenir */
      const recent = (K.lazy ? K.lazy.loaded("real-songs") : !!(K.REAL_SONGS && Object.keys(K.REAL_SONGS).length))
        ? K.artistList().slice(0, 5).flatMap(a => K.platforms.npcSongs(a.id, 2)).slice(0, 6) : [];
      const hour = new Date().getHours();
      const greet = hour < 6 ? "İyi geceler" : hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

      return `
        <div class="sp-hero">
          ${K.ui.artistAvatar("player", 60, true)}
          <div>
            <div class="h-title">${greet}, ${U.escape(p.stageName)}</div>
            <div class="h-sub">${U.compact(p.monthly)} aylık dinleyici · ${U.compact(K.platforms.playerTotals().spotify)} dinlenme</div>
          </div>
        </div>

        ${K.ui.section("Hızlı Erişim")}
        <div class="sp-quick-grid">
          ${pls.slice(0, 4).map(pl => `<div class="sp-quick" data-pact="open-playlist" data-arg="${pl.id}">
            <div class="sq-art" style="background:linear-gradient(135deg,${pl.color},#111)">♫</div>
            <span>${U.escape(pl.name)}</span></div>`).join("")}
        </div>

        ${K.ui.section("Türkiye'de Trend", `<button class="mini-btn" data-pact="refresh-live">🔄</button>`)}
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

        ${K.ui.section("Editoryal Listeler", `<button class="mini-btn" data-pact="goto-library">Tümü</button>`)}
        <div class="sp-pl-scroll">${pls.map(plCard).join("")}</div>

        ${K.phone.appById("spotify").algoHTML()}

        ${K.ui.section("Mağaza Listelerin")}
        ${K.ui.storeLists("Spotify")}

        ${K.ui.section("Senin İçin")}
        ${recent.map((s, i) => trackRow(s, { index: i })).join("")}
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
      const f = view.state.filter || "all";
      const filters = [["all", "Tümü"], ["artist", "Sanatçılar"], ["song", "Şarkılar"], ["album", "Albümler"]];
      return `
        <div class="p-search">
          <span>🔍</span>
          <input data-sp-search type="text" placeholder="Sanatçı, şarkı veya albüm ara" value="${U.escape(view.state.q)}" />
        </div>
        <div class="filter-chips">
          ${filters.map(([id, label]) => `<button class="fchip ${f === id ? "active" : ""}" data-pact="filter" data-arg="${id}">${label}</button>`).join("")}
        </div>
        <div data-sp-results style="display:flex;flex-direction:column;gap:4px"></div>`;
    },

    resultsHTML(q, filter) {
      filter = filter || "all";
      q = (q || "").trim();
      const showA = filter === "all" || filter === "artist";
      const showS = filter === "all" || filter === "song";
      const showAl = filter === "all" || filter === "album";

      if (!q) {
        const top = K.platforms.searchArtists("").slice(0, 5);
        const songs = K.platforms.searchSongs("").slice(0, 8);
        return (showA ? K.ui.section("Popüler Sanatçılar") + top.map(artistRow).join("") : "")
          + (showS ? K.ui.section("Trend Şarkılar") + songs.map((s, i) => trackRow(s, { index: i })).join("") : "");
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

    /* ---------------- KÜTÜPHANE ---------------- */
    libraryHTML() {
      const p = K.state.player;
      const liked = K.interactions.likedSongs();
      const followed = K.interactions.followedArtists();
      const pls = K.platforms.editorialPlaylists();
      const totals = K.platforms.playerTotals();

      return `
        ${K.ui.section("Senin İstatistiklerin")}
        <div class="sp-stat-row">
          <div class="sp-stat"><div class="k">Aylık Dinleyici</div><div class="v green">${U.compact(p.monthly)}</div></div>
          <div class="sp-stat"><div class="k">Spotify Dinlenme</div><div class="v">${U.compact(totals.spotify)}</div></div>
          <div class="sp-stat"><div class="k">Popülerlik</div><div class="v">${Math.round(p.popularity)}</div></div>
          <div class="sp-stat"><div class="k">Şarkı</div><div class="v">${p.songs.length}</div></div>
        </div>

        ${K.ui.section("Çalma Listelerin", `<button class="mini-btn" data-pact="create-playlist">＋ Yeni</button>`)}
        ${K.playlists.list().length ? K.playlists.list().map(pl => `<div class="p-row" data-pact="open-upl" data-arg="${pl.id}">
            ${K.ui.cover("upl_" + pl.id, "🎵", 46)}
            <div class="grow"><div class="p-title">${U.escape(pl.name)}</div>
            <div class="p-sub">${pl.tracks.length} şarkı · Çalma listesi</div></div>
            <span style="color:var(--text-3)">›</span>
          </div>`).join("")
          : `<div class="mini-empty">Henüz çalma listen yok — “＋ Yeni” ile oluştur.</div>`}
        ${K.queue.size() ? `<div class="sp-stat" style="padding:9px 12px;margin-top:8px"><div class="k">Çalma Kuyruğu</div><div class="v">${K.queue.size()} şarkı sırada</div></div>` : ""}

        ${K.ui.section("Beğenilen Şarkılar", `<span class="muted">${liked.length}</span>`)}
        ${liked.length ? liked.slice(0, 10).map((s, i) => trackRow(s, { index: i })).join("")
          : `<div class="mini-empty">Şarkıları kalp ile beğen, burada birikir.</div>`}

        ${K.ui.section("Takip Edilen Sanatçılar", `<span class="muted">${followed.length}</span>`)}
        ${followed.length ? followed.slice(0, 10).map(a => artistRow({ id: a.id, name: a.stageName, monthly: a.monthly })).join("")
          : `<div class="mini-empty">Sanatçı profillerinden takip et.</div>`}

        ${K.ui.section("Şarkıların")}
        ${p.songs.length ? p.songs.slice().sort((a, b) => b.streams - a.streams).map((s, i) => trackRow({
          id: s.id, title: s.title, artistName: p.stageName, streams: s.spotifyStreams,
          coverSeed: s.coverSeed, mine: true, featName: s.featName
        }, { index: i })).join("")
          : `<div class="mini-empty">Henüz şarkın yok.</div>`}

        ${K.ui.section("Kaydedilen Listeler")}
        <div class="sp-pl-scroll">${pls.map(plCard).join("")}</div>`;
    },

    /* ---------------- KULLANICI ÇALMA LİSTESİ ---------------- */
    openUserPlaylist(id) {
      const pl = K.playlists.byId(id);
      if (!pl) return;
      K.phone.pushView({
        title: pl.name, sub: pl.tracks.length + " şarkı", shellClass: "app-spotify", musicBar: true,
        render: () => `
          <div class="pl-hero" style="background:linear-gradient(135deg,#2a2a35,#111)">
            <div class="pl-art">🎵</div>
            <div class="pl-meta"><div class="pl-name">${U.escape(pl.name)}</div>
              <div class="pl-desc">${pl.tracks.length} şarkı · Sana ait</div></div>
          </div>
          <div class="action-row">
            <button class="btn btn-sm btn-primary" data-pact="upl-play">▶ Çal</button>
            <button class="btn btn-sm btn-ghost" data-pact="upl-del">🗑️ Listeyi sil</button>
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
        tabs: [{ id: "pop", label: "Popüler" }, { id: "alb", label: "Albümler" }, { id: "rel", label: "Benzer" }],
        activeTab: "pop",
        render: (tab) => {
          const head = `
            <div class="artist-hero-sp" style="background:${prof.art ? `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.75)), url('${prof.art}') center/cover` : U.gradientFor(prof.name)}">
              <div class="ah-avatar">${prof.art ? `<div class="ah-img" style="background-image:url('${prof.art}')"></div>` : K.ui.avatar(prof.name, 86, true)}</div>
              <div class="ah-info">
                <div class="ah-verified">${prof.popularity > 75 ? "✓ Doğrulanmış Sanatçı" : "Sanatçı"}</div>
                <div class="ah-name">${U.escape(prof.name)}</div>
                <div class="ah-meta">${(prof.aliases && prof.aliases.length) ? "aka " + U.escape(prof.aliases.join(", ")) + " · " : ""}${U.escape(prof.real || "")}</div>
              </div>
            </div>
            ${artistId !== "player" ? `<button class="btn btn-sm ${followed ? "btn-ghost" : "btn-primary"}" data-pact="follow" data-arg="${artistId}" style="align-self:flex-start">${followed ? "Takip Ediliyor" : "Takip Et"}</button>` : ""}
            <div class="sp-stat-row">
              <div class="sp-stat"><div class="k">Aylık Dinleyici</div><div class="v green">${U.compact(prof.monthly)}</div></div>
              <div class="sp-stat"><div class="k">Toplam Dinlenme</div><div class="v">${U.compact(prof.streams)}</div></div>
              <div class="sp-stat"><div class="k">Popülerlik</div><div class="v">${Math.round(prof.popularity)}/100</div></div>
              <div class="sp-stat"><div class="k">En İyi Liste</div><div class="v">${prof.chartPeak ? "#" + prof.chartPeak : "—"}</div></div>
            </div>
            ${rel ? `<div class="sp-stat" style="padding:10px 12px"><div class="k">Samimiyetin</div>
              <div class="v">${(rel.discovered || rel.met) ? Math.round(rel.affinity) + "/100 · " + U.escape(K.stageFor(rel.affinity).label) : "gizli"}</div></div>` : ""}`;

          if (tab === "alb") {
            const keys = Object.keys(albumsMap);
            return head + K.ui.section("Albümler / Single'lar") + (keys.length ? keys.map(al => `
              <div class="p-row" data-pact="open-album" data-arg="${U.escape(al)}">
                ${K.ui.cover("al_" + al, "💿", 46, albumsMap[al][0].art)}
                <div class="grow"><div class="p-title">${U.escape(al)}</div>
                <div class="p-sub">${albumsMap[al].length} şarkı · ${U.escape(prof.name)}</div></div>
              </div>`).join("") : `<div class="mini-empty">Albüm bilgisi yok.</div>`);
          }

          if (tab === "rel") {
            return head + K.ui.section("Benzer Sanatçılar") + (related.length
              ? related.map(a => artistRow({ id: a.id, name: a.stageName, monthly: a.monthly })).join("")
              : `<div class="mini-empty">Benzer sanatçı bulunamadı.</div>`);
          }

          const total = (prof.songs || []).length;
          return head + K.ui.section("Popüler", `<span class="muted">${songs.length} / ${total}</span>`)
            + songs.map((s, i) => trackRow({ ...s, artistName: prof.name }, { index: i })).join("")
            + (total > songs.length
              ? `<div class="p-row" data-pact="all-songs" data-arg="${artistId}">
                   <span style="font-size:18px">≡</span>
                   <div class="grow"><div class="p-title">Tüm şarkıları gör</div>
                   <div class="p-sub">${total} şarkı · tam diskografi</div></div>
                   <span style="color:var(--text-3)">›</span>
                 </div>`
              : "")
            + K.ui.discographySection(artistId, "open-album")
            + (prof.bio ? `<div class="bio-box">${U.escape(prof.bio)}</div>` : "")
            + (artistId !== "player" ? `<button class="btn btn-ghost btn-sm" data-pact="dm" data-arg="${artistId}" style="align-self:flex-start">💬 DM Gönder</button>` : "");
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
        render: () => `
          <div class="pl-hero" style="background:linear-gradient(135deg,${pl.color},#111)">
            <div class="pl-art">♫</div>
            <div class="pl-meta"><div class="pl-name">${U.escape(pl.name)}</div>
              <div class="pl-desc">${U.escape(pl.desc)} · ${pl.songs.length} şarkı</div></div>
          </div>
          <div class="action-row">
            <button class="btn btn-sm btn-primary" data-pact="playlist-play">▶ Çal</button>
            <button class="btn btn-sm ${saved ? "btn-ghost" : "btn-ghost"}" data-pact="playlist-save" data-arg="${id}">${saved ? "✓ Kaydedildi" : "＋ Kaydet"}</button>
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
