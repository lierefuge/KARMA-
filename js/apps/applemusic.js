/* ============================================================
   KARMA — apps/applemusic.js  (kapsamlı)
   Dinle · Listeler (canlı) · Radyo · Kütüphane · Sanatçı profili
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

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
          { id: "listen", label: "Dinle", icon: "🎧" },
          { id: "charts", label: "Listeler", icon: "📊" },
          { id: "radio", label: "Radyo", icon: "📻" },
          { id: "lib", label: "Kütüphane", icon: "📚" }
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

      return `
        <div class="am-hero">
          <div class="h-name">Dinle</div>
          <div class="h-meta">Türkiye · kişiselleştirilmiş</div>
          <div class="h-listeners">${U.compact(p.monthly)} aylık dinleyici · ${U.compact(K.platforms.playerTotals().apple)} Apple dinlenme</div>
        </div>
        ${K.ui.section("Ruh Haline Göre")}
        <div class="am-mood-grid">
          ${moods.map(m => `<div class="am-mood" style="background:linear-gradient(135deg,${m.color},#111)" data-pact="station" data-arg="${U.escape(m.label)}">
            <span class="m-emoji">${m.emoji}</span><span class="m-label">${U.escape(m.label)}</span></div>`).join("")}
        </div>
        ${K.ui.section("Türe Göre")}
        <div class="am-genre-scroll">
          ${genres.map(g => `<div class="am-genre" data-pact="genre" data-arg="${g.id}">
            <span class="g-icon">${g.icon}</span><span>${U.escape(g.name)}</span></div>`).join("")}
        </div>
        ${K.ui.section("Öne Çıkanlar")}
        ${featured.map((s, i) => chartRow({ ...s, rank: i + 1, streams: s.streams }, i)).join("")}
        ${p.songs.some(s => s.playlists && s.playlists.length) ? `
          ${K.ui.section("Listelerde")}
          ${p.songs.filter(s => s.playlists && s.playlists.length).slice(0, 5).map(s => `<div class="sp-track mine">
            <span class="t-rank">📻</span>
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
          <button class="btn btn-sm btn-primary" data-pact="refresh-live">🔄 Listeyi Canlı Yenile</button>
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
        ${stations.map(s => `<div class="am-station" data-pact="station" data-arg="${U.escape(s.name)}">
          <div class="st-icon" style="background:linear-gradient(135deg,${s.color},#111)">${s.emoji}</div>
          <div class="grow"><div class="st-name">${U.escape(s.name)}</div><div class="st-desc">${U.escape(s.desc)}</div></div>
          <span class="st-play">▶</span>
        </div>`).join("")}`;
    },

    /* ---------- KÜTÜPHANE ---------- */
    libraryHTML() {
      const p = K.state.player;
      const liked = K.interactions.likedSongs();
      const chartRank = Math.min(999, ...p.songs.map(s => s.chartRank || 999), 999);
      return `
        <div class="am-hero">
          <div class="h-name">${U.escape(p.stageName)}</div>
          <div class="h-meta">${U.escape(p.city)} · ${K.genreById(p.genre).name}</div>
          <div class="h-listeners">${U.compact(p.monthly)} aylık dinleyici</div>
        </div>
        <div class="sp-stat-row">
          <div class="sp-stat" style="background:rgba(251,92,116,0.1)"><div class="k">Güncel Liste</div><div class="v">${chartRank === 999 ? "—" : "#" + chartRank}</div></div>
          <div class="sp-stat" style="background:rgba(251,92,116,0.1)"><div class="k">Popülerlik</div><div class="v">${Math.round(p.popularity)}</div></div>
        </div>
        ${K.ui.section("Çalma Listelerin", `<button class="mini-btn" data-pact="create-playlist">＋ Yeni</button>`)}
        ${K.playlists.list().length ? K.playlists.list().map(pl => `<div class="p-row" data-pact="open-upl" data-arg="${pl.id}">
            ${K.ui.cover("upl_" + pl.id, "🎵", 46)}
            <div class="grow"><div class="p-title">${U.escape(pl.name)}</div><div class="p-sub">${pl.tracks.length} şarkı · Çalma listesi</div></div>
            <span style="color:var(--text-3)">›</span></div>`).join("") : `<div class="mini-empty">Çalma listesi oluştur.</div>`}
        ${K.queue.size() ? `<div class="sp-stat" style="padding:9px 12px;margin-top:8px"><div class="k">Çalma Kuyruğu</div><div class="v">${K.queue.size()} şarkı sırada</div></div>` : ""}

        ${K.ui.section("Beğenilenler", `<span class="muted">${liked.length}</span>`)}
        ${liked.length ? liked.slice(0, 8).map((s, i) => chartRow({ ...s, rank: i + 1 }, i)).join("")
          : `<div class="mini-empty">Şarkıları ♥ ile beğen.</div>`}
        ${K.ui.section("Şarkıların")}
        ${p.songs.length ? p.songs.slice().sort((a, b) => b.streams - a.streams).map((s, i) => chartRow({
          title: s.title, artistName: p.stageName, id: s.id, streams: s.appleStreams, rank: i + 1, art: null
        }, i)).join("")
          : `<div class="mini-empty">Henüz şarkın yok.</div>`}`;
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
