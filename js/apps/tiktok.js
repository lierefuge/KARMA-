/* ============================================================
   KARMA — apps/tiktok.js  (kapsamlı)
   Senin İçin · Takip · Trend Sesler · Profil
   Ses sayfası · Viral göstergeleri · Şarkı tanıtımı
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- gerçek TikTok simgeleri (SVG) ----------
     v10.37 — emoji yerine gerçek TikTok işaretleri.
     .t-on = aktif (dolu) · .t-off = pasif (ince çizgi). */
  const TI = {
    home: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
      <path class="t-off" d="M3.2 9.6 12 3l8.8 6.6V20a1.4 1.4 0 0 1-1.4 1.4H4.6A1.4 1.4 0 0 1 3.2 20z" fill="none"/>
      <path class="t-on" d="M12.7 2.5a1.2 1.2 0 0 0-1.4 0L2.6 8.9A1.6 1.6 0 0 0 2 10.2V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9.8a1.6 1.6 0 0 0-.6-1.3z" fill="currentColor" stroke="none"/>
    </svg>`,
    users: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
      <circle class="t-off" cx="9.4" cy="8.4" r="3.7" fill="none"/>
      <path class="t-off" d="M2.8 19.8c.5-3.1 3.3-5.2 6.6-5.2s6.1 2.1 6.6 5.2" fill="none"/>
      <path class="t-off" d="M16.4 5.2a3.3 3.3 0 0 1 0 6.4M18 14.9c2 .6 3.4 2.2 3.7 4.4" fill="none"/>
      <circle class="t-on" cx="9.4" cy="8.2" r="4.1" fill="currentColor" stroke="none"/>
      <path class="t-on" d="M9.4 13.4c-3.9 0-7 2.5-7 5.6 0 .5.4.9.9.9h12.2c.5 0 .9-.4.9-.9 0-3.1-3.1-5.6-7-5.6z" fill="currentColor" stroke="none"/>
      <path class="t-on" d="M16.7 5.5a3 3 0 0 1 0 5.6v-1.7a1.4 1.4 0 0 0 0-2.2zM17.9 15.3c1.8.6 3 2 3.3 4a1 1 0 0 1-2 .3c-.2-1.4-1-2.4-2.2-2.9z" fill="currentColor" stroke="none"/>
    </svg>`,
    music: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.6 2.4a1 1 0 0 0-1.2-.8l-9.6 2.2a1 1 0 0 0-.8 1v11.4a3.9 3.9 0 1 0 2 3.4V7.6l8-1.8v8.4a3.9 3.9 0 1 0 2 3.4z"/></svg>`,
    user: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
      <circle class="t-off" cx="12" cy="8" r="4.2" fill="none"/>
      <path class="t-off" d="M4.4 20.6c.6-3.6 3.8-6 7.6-6s7 2.4 7.6 6" fill="none"/>
      <circle class="t-on" cx="12" cy="7.8" r="4.6" fill="currentColor" stroke="none"/>
      <path class="t-on" d="M12 13.6c-4.4 0-8 2.8-8 6.4 0 .6.4 1 1 1h14c.6 0 1-.4 1-1 0-3.6-3.6-6.4-8-6.4z" fill="currentColor" stroke="none"/>
    </svg>`,
    /* sağ taraf eylemleri — gerçek TikTok beyaz DOLU simgeler kullanır */
    heart: `<svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path class="t-off" d="M12 20.6 3.9 12.5a5.2 5.2 0 0 1 7.4-7.4l.7.7.7-.7a5.2 5.2 0 0 1 7.4 7.4z" fill="none"/><path class="t-on" d="M12 20.6 3.9 12.5a5.2 5.2 0 0 1 7.4-7.4l.7.7.7-.7a5.2 5.2 0 0 1 7.4 7.4z" fill="currentColor"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M12 2.6C6.4 2.6 2 6.3 2 11c0 2.6 1.4 4.9 3.7 6.5-.2 1.3-.8 2.6-1.7 3.7 1.8-.2 3.6-.9 4.9-2 .9.2 2 .3 3.1.3 5.6 0 10-3.7 10-8.5S17.6 2.6 12 2.6z"/></svg>`,
    share: `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M13.5 3.4a1 1 0 0 0-1.6.8v3C6.3 8 2.6 11.8 1.6 19.2a1 1 0 0 0 1.7.8c2.4-2.8 5.1-4 8.6-4.3v3a1 1 0 0 0 1.6.8l8.4-7.1a1 1 0 0 0 0-1.5z"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path class="t-off" d="M5.5 3h13a1 1 0 0 1 1 1v17l-7.5-5.2L4.5 21V4a1 1 0 0 1 1-1z" fill="none"/><path class="t-on" d="M5.5 3h13a1 1 0 0 1 1 1v17l-7.5-5.2L4.5 21V4a1 1 0 0 1 1-1z" fill="currentColor"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`
  };

  function ttCard(v, i) {
    const liked = K.interactions.isLiked("tt_" + v.id);
    const saved = K.interactions.isSaved("tt_" + v.id);
    const bg = v.art ? `background-image:url('${v.art}');background-size:cover;background-position:center` : `background:${U.gradientFor(v.id)}`;
    return `<div class="tt-card" style="${bg}">
      <div class="tt-ov"></div>
      <div class="tt-side">
        <div class="tt-av" data-pact="open-profile" data-arg="${v.channelId}">${v.channelId && v.channelId !== "player" ? K.ui.artistAvatar(v.channelId, 40, true) : K.ui.avatar(v.channel, 40, true)}</div>
        <button class="tt-act ${liked ? "on" : ""}" data-pact="like" data-arg="tt_${U.escape(v.id)}">${TI.heart}<span>${U.compact(Math.round(v.views * 0.1))}</span></button>
        <button class="tt-act" data-pact="tt-comments" data-arg="${U.escape(v.id)}">${TI.comment}<span>${U.compact(Math.round(v.views * 0.004))}</span></button>
        <button class="tt-act" data-pact="tt-share">${TI.share}<span>${U.compact(Math.round(v.views * 0.002))}</span></button>
        <button class="tt-act ${saved ? "on" : ""}" data-pact="save" data-arg="tt_${U.escape(v.id)}">${TI.bookmark}</button>
      </div>
      <div class="tt-bottom">
        <div class="tt-user">@${U.escape(v.channel.toLowerCase().replace(/\s/g, ""))}${v.mine ? ' <span class="pill hot" style="font-size:8px">SEN</span>' : ""}</div>
        <div class="tt-desc">${U.escape(v.title.replace(" (Official Video)", ""))} 🔥 #fyp #rap</div>
        <div class="tt-sound" data-pact="sound" data-arg="${U.escape(v.title.replace(" (Official Video)", ""))}">${TI.music} Orijinal ses · ${U.escape(v.channel)}</div>
      </div>
    </div>`;
  }

  K.phone.register({
    id: "tiktok", name: "TikTok", icon: "♪", iconClass: "ic-tiktok", dock: false,

    render(params) {
      const view = {
        title: "TikTok", sub: "Ses trendleri & viral",
        shellClass: "app-tiktok snap",
        tabPos: "bottom",
        /* sola kaydır → kamera/oluştur · sağa kaydır → mesajlar */
        swipe: {
          right: () => K.phone.openApp("messages"),
          left: () => K.toast("🎬 Oluştur", "Kamera açılıyor… (demo)", "ok")
        },
        tabs: [
          { id: "foryou", label: "Senin İçin", icon: TI.home },
          { id: "following", label: "Takip", icon: TI.users },
          { id: "trend", label: "Trend Sesler", icon: TI.music },
          { id: "mine", label: "Profilim", icon: TI.user }
        ],
        activeTab: params.tab || "trend",
        render: (tab) => {
          const app = K.phone.appById("tiktok");
          if (tab === "foryou") return app.forYouHTML();
          if (tab === "following") return app.followingHTML();
          if (tab === "mine") return app.mineHTML();
          return app.trendHTML();
        },
        onAction: (act, el) => {
          const app = K.phone.appById("tiktok");
          if (act === "sound") app.openSound(el.dataset.arg);
          else if (act === "open-profile") app.openProfile(el.dataset.arg);
          else if (act === "tt-comments") app.comments(el.dataset.arg);
          else if (act === "tt-share") K.toast("↗ Paylaşıldı", "Bağlantı kopyalandı.", "ok");
          else if (act === "save") {
            const on = K.interactions.toggleSave(el.dataset.arg || ("tt_" + el.dataset.arg));
            K.toast(on ? "★ Kaydedildi" : "Kaldırıldı", "", "ok");
            K.phone.reRender();
          }
          else if (act === "promote") app.promotePicker();
          else if (act === "tt-analytics") app.openAnalytics();
          else if (act === "create") K.toast("🎬 Oluştur", "Kamera açılıyor… (demo)", "ok");
          else if (act === "go-live") { K.livestream.start("tiktok"); K.phone.pushView(K.ui.liveView()); }
        }
      };
      return view;
    },

    forYouHTML() {
      const vids = K.phone.appById("youtube").allVideos().slice(0, 12);
      return `
        <div class="live-cta" data-pact="go-live">
          <span class="live-dot"></span>
          <div class="grow"><b style="font-size:12.5px">TikTok Live Başlat</b>
          <div class="muted" style="font-size:10.5px">Anlık izleyici ve takipçi kazan</div></div>
          <span style="font-weight:900;color:#ff9db0">🔴 CANLI</span>
        </div>
        <div class="tt-feed">${vids.map((v, i) => ttCard(v, i)).join("")}</div>`;
    },

    followingHTML() {
      const followed = K.interactions.followedArtists();
      /* GERÇEKLİK: takip etmediğin hesabın videosu görünmez. */
      const vids = followed.length
        ? K.phone.appById("youtube").allVideos().filter(v => followed.some(a => a.id === v.channelId))
        : [];
      const suggested = K.social.suggestedArtists("tiktok", 5);
      return `
        ${vids.length
          ? `<div class="tt-feed">${vids.slice(0, 12).map((v, i) => ttCard(v, i)).join("")}</div>`
          : `<div class="empty-note"><b>Takip ettiğin hesap yok</b>Takip ettiğin sanatçıların videoları burada görünür.</div>`}
        ${suggested.length ? `
          ${K.ui.section("Takip etmek isteyebilirsin")}
          ${suggested.map(a => `<div class="ig-suggest">
            <div class="iph-left" data-pact="open-profile" data-arg="${a.id}">
              ${K.ui.artistAvatar(a.id, 40, true)}
              <div><div class="iph-name">@${U.escape(a.stageName.toLowerCase().replace(/\s/g, ""))}</div>
              <div class="iph-sub">${U.compact(a.monthly)} dinleyici · ${U.escape(K.genreById(a.genre).name)}</div></div>
            </div>
            <button class="ig-follow-btn ${K.interactions.isFollowed(a.id) ? "following" : ""}" data-pact="follow" data-arg="${a.id}">${K.interactions.isFollowed(a.id) ? "Takip Ediliyor" : "Takip Et"}</button>
          </div>`).join("")}` : ""}`;
    },

    trendHTML() {
      const songs = K.platforms.searchSongs("").slice(0, 18);
      const mine = (K.shortform && K.shortform.trendList) ? K.shortform.trendList(8) : [];
      const mineHTML = mine.length ? `
        ${K.ui.section("Seslerin (gerçek veri)")}
        ${mine.map((t, i) => `<div class="tt-song" data-pact="sound" data-arg="${U.escape(t.title)}">
          <div style="font-size:24px">${t.trend ? "🔥" : "🎬"}</div>
          <div class="grow" style="min-width:0">
            <div class="s-name">${U.escape(t.title)} <span class="pill hot" style="font-size:8px">SEN</span></div>
            <div class="s-artist">${t.trend ? "Şu an trend" : "Yükseliyor"} · günde +${U.compact(t.gain)} video</div>
            <div class="tt-videos">🎬 ${U.compact(t.videos)} video bu sesle</div>
          </div>
          <span style="font-size:13px;font-weight:900;color:var(--text-3)">#${i + 1}</span>
        </div>`).join("")}` : "";
      return mineHTML + `
        <div class="tt-song" style="background:linear-gradient(120deg,rgba(37,244,238,0.2),rgba(254,44,85,0.2))">
          <div style="font-size:30px">🔥</div>
          <div class="grow"><div class="s-name">Trend Olan Sesler</div><div class="s-artist">Bu hafta çıkışta olan şarkılar</div></div>
          <button class="btn btn-sm btn-primary" data-pact="create">🎬</button>
        </div>
        ${songs.map((sg, i) => {
          const videos = Math.round((sg.streams || 0) / 240);
          return `<div class="tt-song" data-pact="sound" data-arg="${U.escape(sg.title)}">
            ${K.ui.cover(sg.coverSeed || sg.id, (sg.title[0] || "?").toUpperCase(), 50, sg.art)}
            <div class="grow" style="min-width:0">
              <div class="s-name">${U.escape(sg.title)}${sg.mine ? ' <span class="pill hot" style="font-size:8px">SEN</span>' : ""}</div>
              <div class="s-artist">${U.escape(sg.artistName)}</div>
              <div class="tt-videos">🎬 ${U.compact(videos)} video bu sesle</div>
            </div>
            <span style="font-size:13px;font-weight:900;color:var(--text-3)">#${i + 1}</span>
          </div>`;
        }).join("")}`;
    },

    mineHTML() {
      const p = K.state.player;
      const vids = K.phone.appById("youtube").allVideos().filter(v => v.mine);
      return `
        <div class="tt-song">
          ${K.ui.artistAvatar("player", 50, true)}
          <div class="grow">
            <div class="s-name">${U.escape(p.stageName)}</div>
            <div class="s-artist">${U.compact(p.tiktok)} takipçi · @${U.escape(p.stageName.toLowerCase().replace(/\s/g, ""))}</div>
          </div>
        </div>
        <div class="sp-stat-row">
          <div class="sp-stat" style="background:rgba(37,244,238,0.1)"><div class="k">Viral Şarkı</div><div class="v">${p.songs.filter(s => s.viral).length}</div></div>
          <div class="sp-stat" style="background:rgba(254,44,85,0.1)"><div class="k">Takipçi</div><div class="v">${U.compact(p.tiktok)}</div></div>
          <div class="sp-stat" style="background:rgba(255,255,255,0.06)"><div class="k">Video</div><div class="v">${vids.length}</div></div>
          <div class="sp-stat" style="background:rgba(255,255,255,0.06)"><div class="k">Beğeni</div><div class="v">${U.compact(Math.round(p.tiktok * 0.3))}</div></div>
        </div>
        <div class="action-row">
          <button class="btn btn-sm btn-primary" data-pact="promote">🎵 Şarkını Tanıt</button>
          <button class="btn btn-sm btn-ghost" data-pact="create">🎬 Video Oluştur</button>
          <button class="btn btn-sm btn-ghost" data-pact="tt-analytics">📊 Creator Analitik</button>
        </div>
        ${vids.length ? `<div class="tt-grid">${vids.map(v => `<div class="tt-grid-cell" style="${v.art ? `background-image:url('${v.art}')` : `background:${U.gradientFor(v.id)}`};background-size:cover">
          <div class="ttg-ov">▶ ${U.compact(Math.round(v.views * 0.4))}</div></div>`).join("")}</div>`
          : `<div class="mini-empty">Henüz videon yok. Şarkı yayınlayınca otomatik oluşur.</div>`}`;
    },

    /* ---------- CREATOR STUDIO (sekmeli analitik) ---------- */
    openAnalytics() {
      const app = K.phone.appById("tiktok");
      const p = K.state.player;
      const sounds = (K.shortform && K.shortform.trendList) ? K.shortform.trendList(10) : [];
      const soundVideos = sounds.reduce((n, t) => n + (t.videos || 0), 0);
      const mine = K.phone.appById("youtube").allVideos().filter(v => v.mine);
      const topVids = mine.slice().sort((a, b) => b.views - a.views).slice(0, 10);
      const videoViews = Math.round((p.tiktok || 0) * 15 + soundVideos * 300);
      const likes = Math.round(videoViews * 0.09);
      const fanModel = (K.fans && K.fans.model) ? K.fans.model() : { followers: 0, casual: 0, active: 0, superfans: 0 };
      const trending = sounds.filter(t => t.trend).length;
      const health = Math.round(U.clamp(
        40 + Math.min(25, (p.tiktok || 0) / 12000) + trending * 10 + (soundVideos > 5000 ? 15 : 0), 0, 100));
      const healthLabel = health >= 75 ? "Mükemmel" : health >= 55 ? "İyi" : health >= 35 ? "Gelişmeli" : "Zayıf";
      const healthColor = health >= 75 ? "#25f4ee" : health >= 55 ? "#facc15" : health >= 35 ? "#fb923c" : "#f87171";

      /* ortak Studio bileşenleri (js/ui/studio.js) */
      const card = K.studio.card, note = K.studio.note, stat = K.studio.stat;

      const soundNote = trending > 0
        ? ["🔥", `<b>${trending}</b> sesin şu an trend. Bu pencereyi kaçırma: her gün yeni bir kısa video at.`, "rgba(255,92,122,.14)"]
        : soundVideos > 0
          ? ["🎬", "Sesin yükseliyor. Trend eşiğini geçmek için kendi videolarınla sesi besle.", "rgba(37,244,238,.12)"]
          : ["🎵", "Hiç aktif sesin yok. Yayınlar sekmesinden 'Kısa video' başlat.", "rgba(255,255,255,.06)"];
      const videoNote = topVids.length
        ? ["📹", `En iyi videon <b>${U.compact(topVids[0].views)}</b> görüntülenme. Aynı format/tarzı tekrarla.`, "rgba(37,244,238,.12)"]
        : ["📹", "Henüz videon yok. Bir şarkı yayınlayınca otomatik oluşur.", "rgba(255,255,255,.06)"];
      const activeRatio = fanModel.followers ? Math.round((fanModel.active / fanModel.followers) * 100) : 0;
      const fanNote = fanModel.superfans > 0 && activeRatio >= 8
        ? ["💜", `Aktif kitle oranın %${activeRatio} — sağlıklı. Süperfanları (${U.compact(fanModel.superfans)}) tutmak için canlı yayın yap.`, "rgba(150,90,255,.14)"]
        : ["💜", "Aktif kitle oranı düşük. Trend ses + düzenli yükleme etkileşimi artırır.", "rgba(255,255,255,.06)"];

      K.phone.pushView({
        title: "Creator Studio", sub: "TikTok Analitik", shellClass: "app-tiktok",
        tabs: [
          { id: "gen", label: "Özet" },
          { id: "ses", label: "Sesler" },
          { id: "video", label: "Videolar" },
          { id: "kitle", label: "Kitle" }
        ],
        activeTab: "gen",
        render: (tab) => {
          if (tab === "ses") {
            const max = Math.max(1, sounds.reduce((m, s) => Math.max(m, s.videos), 0));
            return card(`
              <div class="studio-title mb">Seslerin (UGC videolar)</div>
              ${sounds.length ? sounds.map(t => `<div style="margin:9px 0">
                <div style="display:flex;justify-content:space-between;font-size:11.5px"><span>${U.escape(t.title)}${t.trend ? ' <span class="pill hot" style="font-size:8px">🔥 trend</span>' : ""}</span><span style="color:var(--text-3)">${U.compact(t.videos)} video</span></div>
                <div class="studio-bar block"><i class="studio-bar-fill" style="width:${Math.round((t.videos / max) * 100)}%;background:linear-gradient(90deg,#25f4ee,#fe2c55)"></i></div>
                <div style="font-size:10px;color:var(--text-3);margin-top:2px">günde +${U.compact(t.gain)} video · zirve ${U.compact(t.peak || 0)}</div>
              </div>`).join("") : `<div class="mini-empty">Ses verisi yok. 'Kısa video' başlatınca burada birikir.</div>`}
              ${note(soundNote[0], soundNote[1], soundNote[2])}
            `, "#fe2c55");
          }
          if (tab === "video") {
            const max = Math.max(1, topVids.reduce((m, v) => Math.max(m, v.views), 0));
            return card(`
              <div class="studio-title mb">Video Performansı</div>
              ${topVids.length ? topVids.map((v, i) => `<div style="margin:9px 0">
                <div style="display:flex;justify-content:space-between;font-size:11.5px"><span>${i + 1}. ${U.escape(v.title.replace(" (Official Video)", ""))}</span><span style="color:var(--text-3)">${U.compact(v.views)}</span></div>
                <div class="studio-bar block"><i class="studio-bar-fill" style="width:${Math.round((v.views / max) * 100)}%;background:linear-gradient(90deg,#fe2c55,#25f4ee)"></i></div>
              </div>`).join("") : `<div class="mini-empty">Video yok.</div>`}
              ${note(videoNote[0], videoNote[1], videoNote[2])}
            `, "#25f4ee");
          }
          if (tab === "kitle") {
            return card(`
              <div class="studio-title mb">Kitle</div>
              ${[["Casual", fanModel.casual, "#8a8a99"], ["Aktif", fanModel.active, "#25f4ee"], ["Süperfan", fanModel.superfans, "#fe2c55"]].map(([l, v, c]) => {
                const pct = fanModel.followers ? Math.round((v / fanModel.followers) * 100) : 0;
                return `<div class="studio-row">
                  <div class="studio-row-label xs">${l}</div>
                  <div class="studio-bar lg"><i class="studio-bar-fill" style="width:${pct}%;background:${c}"></i></div>
                  <div class="studio-row-val wide">${U.compact(v)} · %${pct}</div>
                </div>`;
              }).join("")}
              ${note(fanNote[0], fanNote[1], fanNote[2])}
            `, "#b06cff");
          }
          // ÖZET
          return `
            <div class="sp-stat-row">
              ${stat("Takipçi", U.compact(p.tiktok))}
              ${stat("Video Görüntülenme", U.compact(videoViews))}
              ${stat("Beğeni", U.compact(likes))}
              ${stat("Ses Kullanımı", U.compact(soundVideos))}
            </div>
            ${card(`
              <div class="studio-health">
                <div><div class="studio-health-label">Yaratıcı Sağlığı</div>
                  <div class="studio-health-val" style="color:${healthColor}">${health}/100 · ${healthLabel}</div></div>
                <div class="studio-health-emoji">${trending > 0 ? "🔥" : health >= 55 ? "👍" : "📊"}</div>
              </div>
              <div class="studio-health-bar"><i style="width:${health}%;background:linear-gradient(90deg,#25f4ee,#fe2c55)"></i></div>
              ${note("🧭", `${trending} trend ses · ${sounds.length} aktif ses · ${U.compact(fanModel.superfans)} süperfan`, "rgba(255,255,255,.06)")}
            `, healthColor)}
            ${card(`
              <div class="studio-title mb6">Özet</div>
              <div class="hint" style="line-height:1.8">
                • Trend sesin: <b>${trending}</b> · aktif ses: <b>${sounds.length}</b><br>
                • En iyi video: <b>${topVids[0] ? U.compact(topVids[0].views) : "—"}</b> görüntülenme<br>
                • Takipçi: <b>${U.compact(p.tiktok)}</b>
              </div>
              ${note("💡", "Üstteki sekmelerden Sesler / Videolar / Kitle detaylarına geç.", "rgba(255,255,255,.05)")}
            `, "#7c5cff")}
          `;
        }
      });
    },

    /* ---------- ses sayfası ---------- */
    openSound(soundTitle) {
      const app = K.phone.appById("tiktok");
      const t = (soundTitle || "").toLowerCase();
      const mySongs = K.state.player.songs || [];
      const mineSong = mySongs.find(s => s.title.toLowerCase() === t) || mySongs.find(s => s.title && t.includes(s.title.toLowerCase()));
      const sn = mineSong && mineSong.sound;
      const vids = K.phone.appById("youtube").allVideos().filter(v => v.title.toLowerCase().includes(t));
      const uses = (sn && sn.videos) ? sn.videos : Math.round((vids.reduce((s, v) => s + v.views, 0) || 40000) / 240);
      const song = K.platforms.searchSongs(soundTitle)[0];
      const started = !!(sn && sn.startedDay);
      K.phone.pushView({
        title: "Ses", sub: soundTitle, shellClass: "app-tiktok",
        render: () => `
          <div class="tt-song">
            ${K.ui.cover(song ? song.coverSeed : (mineSong && mineSong.coverSeed) || "snd", "♫", 54, song && song.art)}
            <div class="grow">
              <div class="s-name">${U.escape(soundTitle)}${mineSong ? ' <span class="pill hot" style="font-size:8px">SEN</span>' : ""}</div>
              <div class="s-artist">${U.escape(mineSong ? K.state.player.stageName : (song ? song.artistName : "Bilinmiyor"))}</div>
              <div class="tt-videos">🎬 ${U.compact(uses)} video bu sesle kullanıldı</div>
            </div>
          </div>
          ${sn ? `<div class="sp-stat-row">
            <div class="sp-stat" style="background:rgba(37,244,238,0.1)"><div class="k">Durum</div><div class="v">${sn.trend ? "🔥 Trend" : "Yükseliyor"}</div></div>
            <div class="sp-stat" style="background:rgba(254,44,85,0.1)"><div class="k">Günlük Artış</div><div class="v">+${U.compact(sn.lastGain || 0)}</div></div>
            <div class="sp-stat" style="background:rgba(255,255,255,0.06)"><div class="k">Zirve</div><div class="v">${U.compact(sn.peak || 0)}</div></div>
          </div>` : ""}
          <div class="action-row" style="flex-wrap:wrap">
            <button class="btn btn-sm btn-primary" data-pact="sound-play">▶ Sesi çal</button>
            <button class="btn btn-sm btn-ghost" data-pact="sound-queue">🕒 Sıraya ekle</button>
            ${(mineSong && !started)
              ? `<button class="btn btn-sm btn-primary" data-pact="start-sound" data-arg="${U.escape(mineSong.id)}">🎬 Kısa video başlat</button>`
              : `<button class="btn btn-sm btn-ghost" data-pact="create">🎬 Bu sesi kullan</button>`}
            <button class="btn btn-sm btn-ghost" data-pact="share">↗ Paylaş</button>
          </div>
          ${K.ui.section("Bu sesle yapılan videolar")}
          ${vids.length ? `<div class="tt-grid">${vids.map(v => `<div class="tt-grid-cell" style="${v.art ? `background-image:url('${v.art}')` : `background:${U.gradientFor(v.id)}`};background-size:cover">
            <div class="ttg-ov">▶ ${U.compact(Math.round(v.views * 0.4))}</div></div>`).join("")}</div>`
            : `<div class="mini-empty">Henüz video yok.</div>`}`,
        onAction: (act, el) => {
          const pick = () => K.platforms.searchSongs(soundTitle)[0] || (mineSong ? { id: mineSong.id, title: mineSong.title, artistName: K.state.player.stageName, art: null } : null);
          if (act === "create") K.toast("🎬 Oluştur", "Kamera açılıyor… (demo)", "ok");
          else if (act === "share") K.toast("↗ Paylaşıldı", "", "ok");
          else if (act === "sound-play") { const sg = pick(); if (sg) K.interactions.play(sg); else K.toast("Şarkı bulunamadı", "", "warn"); }
          else if (act === "sound-queue") { const sg = pick(); if (sg) K.queue.add(sg); }
          else if (act === "start-sound") {
            if (K.shortform.startSnippet(el.dataset.arg, "tiktok")) { K.phone.back(); K.phone.appById("tiktok"); }
          }
        }
      });
    },

    openProfile(artistId) {
      if (artistId === "player" || !artistId) {
        const v = K.phone.views[K.phone.views.length - 1]; v.activeTab = "mine"; K.phone.renderTop(); return;
      }
      const a = K.artistById(artistId);
      if (!a) return;
      const vids = K.phone.appById("youtube").allVideos().filter(v => v.channelId === artistId);
      K.phone.pushView({
        title: a.stageName, sub: "@" + a.stageName.toLowerCase().replace(/\s/g, ""), shellClass: "app-tiktok",
        render: () => `
          <div class="tt-song">
            ${K.ui.artistAvatar(a.id, 60, true)}
            <div class="grow"><div class="s-name">${U.escape(a.stageName)}</div>
            <div class="s-artist">${U.compact(a.tiktok)} takipçi · ${U.compact(a.monthly)} dinleyici</div></div>
          </div>
          <div class="action-row">
            <button class="btn btn-sm btn-primary" data-pact="follow" data-arg="${artistId}">${K.interactions.isFollowed(artistId) ? "Takip Ediliyor" : "Takip Et"}</button>
            <button class="btn btn-sm btn-ghost" data-pact="dm" data-arg="${artistId}">💬 DM</button>
          </div>
          ${vids.length ? `<div class="tt-grid">${vids.map(v => `<div class="tt-grid-cell" style="${v.art ? `background-image:url('${v.art}')` : `background:${U.gradientFor(v.id)}`};background-size:cover"><div class="ttg-ov">▶ ${U.compact(Math.round(v.views * 0.4))}</div></div>`).join("")}</div>`
            : `<div class="mini-empty">Video yok.</div>`}`,
        onAction: (act, el) => {
          if (act === "dm") K.phone.openApp("messages", { artistId: el.dataset.arg });
        }
      });
    },

    comments(videoId) {
      const key = "tt_" + videoId;
      const list = K.interactions.commentsFor(key, 8);
      K.phone.pushView({
        title: "Yorumlar", sub: list.length + " yorum", shellClass: "app-tiktok",
        render: () => `
          ${list.map(c => `<div class="cmt">
            ${K.ui.avatar(c.user, 32, true)}
            <div class="grow"><div class="cmt-user">@${U.escape(c.user)} · ${U.ago(c.day, K.state.day)}${c.mine ? " · sen" : ""}</div>
            <div class="cmt-text">${U.escape(c.text)}</div>
            <div class="cmt-actions">♡ ${c.likes} · <span data-pact="tt-reply" style="cursor:pointer;color:var(--karma-2);font-weight:700">Yanıtla</span></div></div>
          </div>`).join("")}
          <div class="cmt-input"><input placeholder="Yorum ekle..." data-tt-cmt /><button data-pact="tt-cmt-send" data-arg="${U.escape(videoId)}">Gönder</button></div>`,
        onAction: (act) => {
          if (act === "tt-cmt-send") {
            const inp = U.qs("[data-tt-cmt]");
            if (inp && inp.value.trim()) { K.interactions.addComment(key, inp.value.trim()); inp.value = ""; K.toast("💬 Yorum gönderildi", "", "ok"); K.phone.reRender(); }
            else K.toast("Boş yorum", "", "warn");
          } else if (act === "tt-reply") { const inp = U.qs("[data-tt-cmt]"); if (inp) inp.focus(); }
        }
      });
    },

    promotePicker() {
      const songs = K.state.player.songs;
      if (!songs.length) { K.toast("Şarkın yok", "Önce bir şarkı yayınla.", "warn"); return; }
      K.ui.actionSheet("Hangi şarkıyı TikTok'ta tanıtmak istersin?",
        songs.map(s => ({ label: s.title, onClick: () => { K.social.promoteSong(s.id, "tiktok"); K.refresh(); } })));
    }
  });
})(window.K);
