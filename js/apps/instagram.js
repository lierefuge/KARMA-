/* ============================================================
   KARMA — apps/instagram.js   (v10.6 — GERÇEK INSTAGRAM GÖRÜNÜMÜ)

   Yenilikler:
   • Üstte serif IG logosu + kalp (etkinlik) + uçak (DM) düğmeleri
   • Hikâye şeridi: kesilme/ezilme YOK, gerçek sanatçı PP'leri
   • Gönderide GERÇEK albüm kapağı (şarkıya bağlıysa), çift dokun → beğen
   • Alt sekme çubuğu: SVG ikonlar, profil sekmesi senin PP'n
   • Kaydırma: SAĞA → Instagram DM gelen kutusu · SOLA → canlı yayın
   • Gerçek IG profili: PP, istatistik, bio, öne çıkanlar, sekmeli ızgara

   Diğer modüllerin kullandığı API korunmuştur:
     feedHTML · reelsHTML · exploreHTML · profileHTML · openProfile
     openPost · openStory · sharePost · activityView · newPost
     promotePicker · exploreArtists
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- gerçek Instagram simgeleri (SVG) ---------- */
  const ICO = {
    home: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 10.2 12 3l9 7.2V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>`,
    search: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="7.2"/><path d="m16.2 16.2 4.6 4.6"/></svg>`,
    reels: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3.6 8.2h16.8M8.6 3.3l2.6 4.9M15 3.3l2.6 4.9"/><path d="m11 12.4 4.2 2.6-4.2 2.6z" fill="currentColor" stroke="none"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3.6 8.2h16.8M8.6 3.3l2.6 4.9M15 3.3l2.6 4.9"/><path d="m11 12.4 4.2 2.6-4.2 2.6z" fill="currentColor" stroke="none"/></svg>`,
    tagged: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 4h18v13H8l-5 4z"/></svg>`
  };

  /* ---------- yardımcılar ---------- */
  function igProfileName(id) {
    if (id === "player") return K.state.player.stageName;
    const a = K.artistById(id);
    return a ? a.stageName : "?";
  }

  function handle(id) {
    return "@" + String(igProfileName(id)).toLowerCase().replace(/\s+/g, "");
  }

  /* gönderinin medyası: şarkıya bağlıysa GERÇEK albüm kapağı */
  function postArt(post) {
    if (post && post.songId) {
      const sg = K.platforms.findSong ? K.platforms.findSong(post.songId) : null;
      if (sg && sg.art) return sg.art;
      const own = (K.state.player.songs || []).find((x) => x.id === post.songId);
      if (own && own.art) return own.art;
    }
    if (post && post.art) return post.art;
    return null;
  }

  function mediaBox(post, cls) {
    const art = postArt(post);
    const bg = art
      ? `background-image:url('${art}')`
      : `background:${U.gradientFor(post.id || post.authorId || "ig")}`;
    const tag = post.songId
      ? `<span class="ig-media-tag">♫ ${U.escape(String(post.text || "").slice(0, 48))}</span>`
      : "";
    return `<div class="ig-media ${cls || ""}" style="${bg}" data-ig-dbl="${U.escape(post.id)}" data-pact="post-open" data-arg="${U.escape(post.id)}">
      ${art ? "" : `<span class="ig-media-icon">◍</span>`}
      ${tag}
    </div>`;
  }

  function postHTML(post) {
    const liked = K.interactions.isLiked("ig_" + post.id);
    const saved = K.interactions.isSaved("ig_" + post.id);
    const likes = K.interactions.likeCount("ig_" + post.id, post.likes);
    return `<article class="ig-post">
      <div class="ig-post-head">
        <div class="iph-left" data-pact="open-profile" data-arg="${post.authorId}">
          ${K.ui.artistAvatar(post.authorId, 34, true)}
          <div style="min-width:0">
            <div class="iph-name">${U.escape(post.authorName)}</div>
            <div class="iph-sub">${post.songId ? "Şarkı tanıtımı" : "Gönderi"} · ${U.ago(post.day, K.state.day)}</div>
          </div>
        </div>
        <button class="ig-more" data-pact="post-more" data-arg="${U.escape(post.id)}">⋯</button>
      </div>

      ${mediaBox(post)}

      <div class="ig-actions">
        <button class="heart ${liked ? "on" : ""}" data-pact="like" data-arg="ig_${U.escape(post.id)}">${liked ? "♥" : "♡"}</button>
        <button data-pact="post-open" data-arg="${U.escape(post.id)}">💬</button>
        <button data-pact="post-share" data-arg="${U.escape(post.id)}">✈︎</button>
        <span class="grow"></span>
        <button class="${saved ? "on" : ""}" data-pact="ig-save" data-arg="${U.escape(post.id)}">${saved ? "🔖" : "⚑"}</button>
      </div>

      <div class="ig-body">
        <div class="ig-likes">${U.compact(likes)} beğenme</div>
        <div class="ig-caption"><b>${U.escape(post.authorName)}</b> ${U.escape(post.text)}</div>
        <div class="ig-cmt-link" data-pact="post-open" data-arg="${U.escape(post.id)}">${U.compact(post.comments)} yorumun tümünü gör</div>
        <div class="ig-meta">${U.ago(post.day, K.state.day)}</div>
      </div>
    </article>`;
  }

  /* ============================================================ */
  K.phone.register({
    id: "instagram", name: "Instagram", icon: "◍", iconClass: "ic-instagram", dock: true,

    render(params) {
      const app = K.phone.appById("instagram");
      const myPhoto = K.imagery.byArtistId("player");
      const navBadge = K.interactions.unreadNotifications("instagram");

      const profileIcon = myPhoto
        ? `<span class="ig-tab-av" style="background-image:url('${myPhoto}')"></span>`
        : `<span class="ig-tab-av">${U.escape(U.initials(K.state.player.stageName))}</span>`;

      const view = {
        title: "Instagram",
        sub: "",
        shellClass: "app-instagram",
        tabPos: "bottom",
        tabs: [
          { id: "feed", label: "Ana Sayfa", icon: ICO.home },
          { id: "explore", label: "Keşfet", icon: ICO.search },
          { id: "reels", label: "Reels", icon: ICO.reels },
          { id: "profile", label: "Profil", icon: profileIcon }
        ],
        activeTab: params.tab || "feed",
        navRight: `<div class="ig-nav-actions">
          <button class="ig-icon-btn" data-pact="ig-activity" title="Etkinlik">♡${navBadge ? `<b style="position:absolute;top:-5px;right:-7px;background:#ff3b5c;color:#fff;font-size:9px;font-weight:800;border-radius:999px;padding:1px 4px">${Math.min(99, navBadge)}</b>` : ""}</button>
          <button class="ig-icon-btn" data-pact="ig-inbox" title="Mesajlar">✈︎</button>
        </div>`,

        /* gerçek Instagram gibi: SAĞA kaydır → DM · SOLA kaydır → canlı yayın */
        swipe: {
          right: () => K.phone.pushView(K.phone.appById("instagram").inboxView()),
          left: () => { K.livestream.start("instagram"); K.phone.pushView(K.ui.liveView()); }
        },

        render: (tab) => {
          if (tab === "reels") return app.reelsHTML();
          if (tab === "explore") return app.exploreHTML();
          if (tab === "profile") return app.profileHTML("player");
          return app.feedHTML();
        },

        onMount: (root) => {
          if (!root) return;
          app._mountSearch(root);
          app._mountDoubleTap(root);
        },

        onAction: (act, el) => {
          const appR = K.phone.appById("instagram");
          if (act === "open-profile") appR.openProfile(el.dataset.arg);
          else if (act === "post-open") appR.openPost(el.dataset.arg);
          else if (act === "post-share") appR.sharePost(el.dataset.arg);
          else if (act === "post-more") appR.postSheet(el.dataset.arg);
          else if (act === "ig-save") {
            const on = K.interactions.toggleSave("ig_" + el.dataset.arg);
            K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "Koleksiyonuna eklendi.", "ok");
            K.phone.reRender();
          }
          else if (act === "ig-activity") { K.interactions.markNotifsRead("instagram"); K.phone.pushView(appR.activityView()); }
          else if (act === "ig-inbox") K.phone.pushView(appR.inboxView());
          else if (act === "new-post") appR.newPost();
          else if (act === "promote") appR.promotePicker();
          else if (act === "story") appR.openStory(el.dataset.arg);
          else if (act === "go-live") { K.livestream.start("instagram"); K.phone.pushView(K.ui.liveView()); }
        }
      };
      return view;
    },

    /* ---------- etkileşim kurulumları ---------- */
    _mountSearch(root) {
      const inp = U.qs("[data-ig-explore]", root);
      if (!inp) return;
      inp.addEventListener("input", () => {
        const box = root.querySelector("[data-ig-explore-results]");
        if (box) box.innerHTML = K.phone.appById("instagram").exploreArtists(inp.value);
      });
    },

    _mountDoubleTap(root) {
      root.querySelectorAll("[data-ig-dbl]").forEach((el) => {
        let last = 0;
        el.addEventListener("click", (e) => {
          const now = Date.now();
          if (now - last < 320) {
            e.preventDefault();
            e.stopPropagation();
            last = 0;
            K.phone.appById("instagram").doubleLike(el.dataset.igDbl, el);
          } else {
            last = now;
          }
        });
      });
    },

    doubleLike(postId, el) {
      const key = "ig_" + postId;
      if (!K.interactions.isLiked(key)) K.interactions.toggleLike(key);
      if (el && !el.querySelector(".ig-heart-burst")) {
        const heart = document.createElement("div");
        heart.className = "ig-heart-burst";
        heart.textContent = "♥";
        heart.style.color = "#ff3040";
        el.appendChild(heart);
        setTimeout(() => { if (heart.parentNode) heart.parentNode.removeChild(heart); }, 650);
      }
      K.toast("♥ Beğenildi", "", "ok");
    },

    /* ---------- AKIŞ ---------- */
    feedHTML() {
      const followed = K.interactions.followedArtists();
      const posts = K.social.feedFor("instagram", { followedOnly: true, limit: 14 });
      const stories = (followed.length ? followed : K.artistList()).slice(0, 16);
      const suggested = K.social.suggestedArtists("instagram", 4);
      const seen = (K.phone._storySeen = K.phone._storySeen || {});
      const myPhoto = K.imagery.byArtistId("player");
      const myGrad = `background:${U.gradientFor(K.state.player.stageName)}`;

      return `
        <div class="ig-gesture-hint"><span>← Canlı yayın</span><span>Mesajlar →</span></div>

        <div class="ig-stories">
          <button class="ig-story" data-pact="story" data-arg="player">
            <span class="ig-story-ring mine">
              <span class="ig-story-img" ${myPhoto ? `style="background-image:url('${myPhoto}')"` : `style="${myGrad}"`}>${myPhoto ? "" : U.escape(U.initials(K.state.player.stageName))}</span>
            </span>
            <span class="ig-story-name">Hikâyen</span>
          </button>
          ${stories.map((a) => {
            const img = K.imagery.byArtistId(a.id);
            return `<button class="ig-story" data-pact="story" data-arg="${a.id}">
              <span class="ig-story-ring ${seen[a.id] ? "seen" : ""}">
                <span class="ig-story-img" ${img ? `style="background-image:url('${img}')"` : `style="background:${U.gradientFor(a.id)}"`}>${img ? "" : U.escape(U.initials(a.stageName))}</span>
              </span>
              <span class="ig-story-name">${U.escape(a.stageName)}</span>
            </button>`;
          }).join("")}
        </div>

        <div class="ig-livebar" data-pact="go-live">
          <span class="lb-dot"></span>
          <div>
            <div class="lb-t">Canlı yayın başlat</div>
            <div class="lb-s">Takipçi kazan · bağış topla · popülerliğini artır</div>
          </div>
          <span style="margin-left:auto;font-size:10px;font-weight:800;color:#ff9db0">🔴 CANLI</span>
        </div>

        ${posts.length
          ? posts.map(postHTML).join("")
          : `<div class="ig-empty"><b>Akışın boş</b>Kimseyi takip etmiyorsun. Aşağıdaki önerilerden takip et; gönderileri burada görürsün.</div>`}

        ${suggested.length ? `
          <div class="ig-sec">Önerilen hesaplar<span style="font-size:11px;color:#a8a8a8">Tümünü gör</span></div>
          ${suggested.map((a) => `<div class="ig-suggest">
            <div class="iph-left" data-pact="open-profile" data-arg="${a.id}">
              ${K.ui.artistAvatar(a.id, 44, true)}
              <div style="min-width:0">
                <div class="iph-name">${U.escape(a.stageName)}</div>
                <div class="iph-sub">${U.escape(handle(a.id))} · ${U.compact(a.monthly)} dinleyici</div>
              </div>
            </div>
            <button class="ig-follow-btn ${K.interactions.isFollowed(a.id) ? "following" : ""}" data-pact="follow" data-arg="${a.id}">${K.interactions.isFollowed(a.id) ? "Takip Ediliyor" : "Takip Et"}</button>
          </div>`).join("")}` : ""}`;
    },

    /* ---------- REELS ---------- */
    reelsHTML() {
      const vids = K.phone.appById("youtube").allVideos().slice(0, 10);
      return `<div class="ig-reels">
        ${vids.map((v) => {
          const liked = K.interactions.isLiked("reel_" + v.id);
          const mineSong = v.mine ? (K.state.player.songs || []).find((x) => x.id === v.id) : null;
          const sn = mineSong && mineSong.sound;
          const soundTxt = (sn && sn.startedDay)
            ? `${U.compact(sn.videos)} video bu sesle · ${sn.trend ? "🔥 trend" : "yükseliyor"}`
            : "Orijinal ses · " + v.channel;
          const bg = v.art
            ? `background-image:url('${v.art}')`
            : `background:${U.gradientFor(v.id)}`;
          return `<div class="ig-reel" style="${bg}">
            <div class="r-ov"></div>
            <div class="r-side">
              <button class="${liked ? "on" : ""}" data-pact="like" data-arg="reel_${U.escape(v.id)}">${liked ? "♥" : "♡"}</button>
              <span>${U.compact(Math.round(v.views * 0.06))}</span>
              <button data-pact="reel-cmt">💬</button>
              <span>${U.compact(Math.round(v.views * 0.003))}</span>
              <button data-pact="post-share" data-arg="${U.escape(v.id)}">✈︎</button>
            </div>
            <div class="r-info">
              <div class="r-user" data-pact="open-profile" data-arg="${v.channelId || ""}">
                ${v.channelId ? K.ui.artistAvatar(v.channelId, 30, true) : U.escape(v.channel)}
                ${U.escape(v.channel)}
              </div>
              <div class="r-cap">${U.escape(v.title.replace(" (Official Video)", ""))} 🔥 #reels #rap</div>
              <div class="r-sound">♫ ${U.escape(soundTxt)}</div>
            </div>
          </div>`;
        }).join("")}
      </div>`;
    },

    /* ---------- KEŞFET ---------- */
    exploreHTML() {
      const app = K.phone.appById("instagram");
      const posts = (K.state.feed.instagram || []).slice(0, 12);
      return `
        <div class="ig-search"><input data-ig-explore type="text" placeholder="Instagram'da ara" /></div>
        <div class="ig-rule"></div>
        <div class="ig-sec">Keşfet</div>
        ${posts.length
          ? `<div class="ig-grid">${posts.map((p) => {
              const art = postArt(p);
              return `<button class="ig-cell" style="${art ? `background-image:url('${art}')` : `background:${U.gradientFor(p.id)}`}" data-pact="post-open" data-arg="${U.escape(p.id)}">
                ${art ? "" : "<span>◍</span>"}
                <span class="ov">${U.escape(String(p.text || "").slice(0, 34))}</span>
              </button>`;
            }).join("")}</div>`
          : `<div class="ig-empty"><b>Keşfet boş</b>Gönderiler oluştukça burada görünür.</div>`}
        <div class="ig-sec">Sanatçılar</div>
        <div class="ig-grid" data-ig-explore-results>${app.exploreArtists("")}</div>`;
    },

    exploreArtists(q) {
      const s = String(q || "").toLowerCase();
      const list = K.artistList().filter((a) => !s || a.stageName.toLowerCase().includes(s)).slice(0, 12);
      return list.map((a) => {
        const img = K.imagery.byArtistId(a.id);
        return `<button class="ig-cell" style="${img ? `background-image:url('${img}')` : `background:${U.gradientFor(a.id)}`}" data-pact="open-profile" data-arg="${a.id}">
          ${img ? "" : `<span>${U.escape(U.initials(a.stageName))}</span>`}
          <span class="ov">${U.escape(a.stageName)} · ${U.compact(a.monthly)}</span>
        </button>`;
      }).join("");
    },

    /* ---------- PROFİL ---------- */
    profileHTML(artistId, tab) {
      const p = K.platforms.artistProfile(artistId);
      if (!p) return `<div class="ig-empty"><b>Profil bulunamadı</b></div>`;
      const isMe = artistId === "player";
      const followed = K.interactions.isFollowed(artistId);
      const photo = K.imagery.byArtistId(artistId);
      const posts = isMe
        ? (K.state.feed.instagram || []).filter((x) => x.mine)
        : (K.state.feed.instagram || []).filter((x) => x.authorId === artistId);
      const cells = posts.length
        ? posts
        : [1, 2, 3].map((i) => ({ id: artistId + "_d" + i, text: "Yakında 🎧", art: null }));
      const active = tab || "posts";

      const grid = active === "reels"
        ? K.phone.appById("youtube").allVideos().filter((v) => isMe ? v.mine : v.channelId === artistId).slice(0, 9)
        : cells;

      return `
        <div class="ig-head">
          <div class="ig-head-ring"><div class="inner" ${photo ? `style="background-image:url('${photo}')"` : `style="background:${U.gradientFor(p.name)}"`}>${photo ? "" : U.escape(U.initials(p.name))}</div></div>
          <div style="flex:1;min-width:0">
            <div class="ig-stats">
              <div class="s"><b>${cells.length}</b><span>gönderi</span></div>
              <div class="s"><b>${U.compact(p.ig)}</b><span>takipçi</span></div>
              <div class="s"><b>${U.compact(Math.round(p.ig * 0.12))}</b><span>takip</span></div>
            </div>
          </div>
        </div>

        <div class="ig-bio">
          <div class="nm">${U.escape(p.name)}</div>
          ${(p.aliases && p.aliases.length) ? `<div class="dim">aka ${U.escape(p.aliases.join(", "))}</div>` : ""}
          <div>${K.genreById(p.genre).icon} ${U.escape(K.genreById(p.genre).name)} · ${U.escape(p.city)}</div>
          <div class="dim">${U.compact(p.monthly)} aylık dinleyici · ${U.escape(handle(artistId))}</div>
        </div>

        ${K.npcPersonality && K.npcPersonality.has(artistId) ? (() => {
          const c = K.npcPersonality.card(artistId);
          return `<div class="ig-persona">
            <div class="ig-persona-top">
              <span class="ig-persona-code">${U.escape(c.code)}</span>
              <b>${U.escape(c.title)}</b>
            </div>
            <div class="ig-persona-tag">${U.escape(c.tagline)}</div>
            <div class="ig-persona-bars">
              ${c.rows.map(r => `<div class="ig-persona-row">
                <span>${U.escape(r.label)}</span>
                <i><b style="width:${Math.max(0, Math.min(100, r.value * 10))}%"></b></i>
                <em>${r.value}</em>
              </div>`).join("")}
            </div>
            <div class="ig-persona-foot">⚡ ${U.escape(c.loves.join(" · "))}</div>
            <div class="ig-persona-foot red">⛔ ${U.escape(c.redLines.join(" · "))}</div>
            <div class="ig-persona-note">${U.escape(c.note)}</div>
          </div>`;
        })() : ""}

        <div class="ig-profile-actions">
          ${isMe
            ? `<button class="ig-btn" data-pact="new-post">Gönderi paylaş</button>
               <button class="ig-btn" data-pact="promote">Şarkını tanıt</button>`
            : `<button class="ig-btn ${followed ? "on" : "primary"}" data-pact="follow" data-arg="${artistId}">${followed ? "Takip ediliyor" : "Takip et"}</button>
               <button class="ig-btn" data-pact="dm2" data-arg="${artistId}">Mesaj</button>`}
        </div>

        <div class="ig-highlights">
          ${[["🎧", "Müzik"], ["🎤", "Sahne"], ["📸", "Kulis"], ["💜", "Fan"]].map((h, i) => `<button class="ig-hl" data-pact="story" data-arg="${artistId}">
            <span class="ig-hl-ring" ${i === 0 && photo ? `style="background-image:url('${photo}')"` : ""}>${i === 0 && photo ? "" : h[0]}</span>
            <span>${h[1]}</span></button>`).join("")}
        </div>

        <div class="ig-tabsrow">
          <button class="${active === "posts" ? "active" : ""}" data-ig-ptab="posts" data-arg="${artistId}">${ICO.grid}</button>
          <button class="${active === "reels" ? "active" : ""}" data-ig-ptab="reels" data-arg="${artistId}">${ICO.play}</button>
          <button class="${active === "tagged" ? "active" : ""}" data-ig-ptab="tagged" data-arg="${artistId}">${ICO.tagged}</button>
        </div>

        ${grid.length
          ? `<div class="ig-grid">${grid.map((c) => {
              const art = c.art || postArt(c);
              return `<button class="ig-cell" style="${art ? `background-image:url('${art}')` : `background:${U.gradientFor(c.id || c.title)}`}" data-pact="${active === "reels" ? "reel-cmt" : "post-open"}" data-arg="${U.escape(c.id || c.title || "")}">
                ${art ? "" : "<span>♫</span>"}
                <span class="ov">${U.escape(String(c.text || c.title || "").replace(" (Official Video)", "").slice(0, 40))}</span>
              </button>`;
            }).join("")}</div>`
          : `<div class="ig-empty"><b>Henüz gönderi yok</b>${isMe ? "İlk gönderini paylaş." : "Bu hesabın gönderisi yok."}</div>`}`;
    },

    openProfile(artistId) {
      if (artistId === "player") {
        const v = K.phone.views[K.phone.views.length - 1];
        if (v) { v.activeTab = "profile"; K.phone.renderTop(); }
        return;
      }
      const a = K.artistById(artistId);
      if (!a) return;
      const app = K.phone.appById("instagram");
      const view = {
        title: a.stageName,
        sub: handle(artistId),
        shellClass: "app-instagram",
        params: { artistId },
        render: () => app.profileHTML(artistId, app._profileTabOf(artistId)),
        onAction: (act, el) => {
          if (act === "dm2" || act === "dm") K.phone.pushView(app.inboxView(artistId));
          else if (act === "post-open") app.openPost(el.dataset.arg);
          else if (act === "new-post") app.newPost();
          else if (act === "promote") app.promotePicker();
          else if (act === "story") app.openStory(artistId);
          else if (act === "reel-cmt") app.openReel();
        },
        onMount: (root) => {
          if (!root) return;
          root.querySelectorAll("[data-ig-ptab]").forEach((b) => {
            b.addEventListener("click", () => {
              app._profileTabs = app._profileTabs || {};
              app._profileTabs[b.dataset.arg] = b.dataset.igPtab;
              K.phone.reRender();
            });
          });
        }
      };
      K.phone.pushView(view);
    },

    _profileTabOf(artistId) {
      this._profileTabs = this._profileTabs || {};
      return this._profileTabs[artistId] || "posts";
    },

    /* ---------- DM GELEN KUTUSU (sağa kaydırma) ---------- */
    inboxView() {
      const app = K.phone.appById("instagram");
      const s = K.state;
      const build = () => {
        const ids = Object.keys(s.threads).filter((id) => ((s.threads[id] || {}).messages || []).length > 0 && K.artistById(id));
        const sorted = ids.sort((a, b) => {
          const ta = s.threads[a].messages, tb = s.threads[b].messages;
          return ((tb[tb.length - 1] || {}).day || 0) - ((ta[ta.length - 1] || {}).day || 0);
        });
        const rows = sorted.map((id) => {
          const a = K.artistById(id);
          const th = s.threads[id];
          const last = th.messages[th.messages.length - 1];
          const preview = last ? (last.from === "me" ? "Sen: " : "") + last.text : "";
          const online = (a.id.charCodeAt(0) + a.id.length) % 3 === 0;
          return `<button class="ig-inbox-row" data-pact="ig-thread" data-arg="${id}">
            <span class="ig-inbox-av">
              ${K.ui.artistAvatar(id, 52, true)}
              ${online ? `<span class="dot"></span>` : ""}
            </span>
            <span style="flex:1;min-width:0">
              <span class="nm" style="display:block">${U.escape(a.stageName)}</span>
              <span class="last" style="display:block">${U.escape(preview).slice(0, 44)}</span>
            </span>
            ${th.unread ? `<span class="ig-unread"></span>` : `<span class="t">${U.ago(last ? last.day : s.day, s.day)}</span>`}
          </button>`;
        }).join("");

        return `
          <div class="ig-inbox-head">
            ${K.ui.artistAvatar("player", 34, true)}
            <span class="un">${U.escape(K.state.player.stageName)}</span>
            <button class="ig-icon-btn" style="margin-left:auto" data-pact="ig-newdm">✎</button>
          </div>
          ${rows || `<div class="ig-empty"><b>Mesaj yok</b>Sanatçılar sana yazdığında burada görünür. ✎ ile sen başlat.</div>`}
          <div class="ig-sec" style="border-top:1px solid rgba(255,255,255,.12)">Önerilen</div>
          ${K.artistList().slice(0, 5).map((a) => `<button class="ig-inbox-row" data-pact="ig-thread" data-arg="${a.id}">
            ${K.ui.artistAvatar(a.id, 52, true)}
            <span style="flex:1;min-width:0">
              <span class="nm" style="display:block">${U.escape(a.stageName)}</span>
              <span class="last" style="display:block">${U.escape(handle(a.id))} · ${U.compact(a.monthly)} dinleyici</span>
            </span>
          </button>`).join("")}`;
      };

      return {
        title: "Mesajlar",
        sub: "",
        shellClass: "app-instagram",
        render: build,
        onAction: (act, el) => {
          if (act === "ig-thread") K.phone.pushView(K.phone.appById("messages").conversation(el.dataset.arg));
          else if (act === "ig-newdm") K.phone.openApp("messages", { tab: "new" });
          else if (act === "open-profile") app.openProfile(el.dataset.arg);
        }
      };
    },

    openReel() {
      K.toast("🎬 Reels", "Şarkını kısa videoyla tanıtmak için TikTok sekmesini kullan.", "");
    },

    /* ---------- gönderi detayı ---------- */
    openPost(postId) {
      const app = K.phone.appById("instagram");
      const all = K.state.feed.instagram || [];
      const post = all.find((p) => p.id === postId) || {
        id: postId, authorId: "player", authorName: K.state.player.stageName,
        text: "Stüdyo günleri 🎧", day: K.state.day, likes: 120, comments: 14, shares: 3
      };
      K.phone.pushView({
        title: "Gönderi", sub: handle(post.authorId), shellClass: "app-instagram",
        render: () => {
          const liked = K.interactions.isLiked("ig_" + post.id);
          const saved = K.interactions.isSaved("ig_" + post.id);
          const comments = K.interactions.commentsFor("ig_" + post.id, 6);
          return `
            <div class="ig-post-head">
              <div class="iph-left" data-pact="open-profile" data-arg="${post.authorId}">
                ${K.ui.artistAvatar(post.authorId, 34, true)}
                <div><div class="iph-name">${U.escape(post.authorName)}</div>
                <div class="iph-sub">${U.ago(post.day, K.state.day)}</div></div>
              </div>
            </div>
            ${mediaBox(post)}
            <div class="ig-actions">
              <button class="heart ${liked ? "on" : ""}" data-pact="like" data-arg="ig_${U.escape(post.id)}">${liked ? "♥" : "♡"}</button>
              <button data-pact="focus-cmt">💬</button>
              <button data-pact="post-share" data-arg="${U.escape(post.id)}">✈︎</button>
              <span class="grow"></span>
              <button class="${saved ? "on" : ""}" data-pact="ig-save" data-arg="${U.escape(post.id)}">${saved ? "🔖" : "⚑"}</button>
            </div>
            <div class="ig-body">
              <div class="ig-likes">${U.compact(K.interactions.likeCount("ig_" + post.id, post.likes))} beğenme</div>
              <div class="ig-caption"><b>${U.escape(post.authorName)}</b> ${U.escape(post.text)}</div>
            </div>
            <div class="ig-sec">Yorumlar</div>
            ${comments.map((c, i) => `<div class="cmt">
              ${K.ui.avatar(c.user, 32, true)}
              <div class="grow"><div class="cmt-user">${U.escape(c.user)} · ${U.ago(c.day, K.state.day)}</div>
              <div class="cmt-text">${U.escape(c.text)}</div>
              <div class="cmt-actions">♡ ${c.likes} · <span data-pact="ig-reply" data-arg="${U.escape(post.id + "_" + i)}" style="cursor:pointer;color:var(--karma-2);font-weight:700">Yanıtla</span></div></div></div>`).join("")}
            <div class="cmt-input"><input placeholder="Yorum ekle..." data-ig-cmt /><button data-pact="cmt-send" data-arg="${U.escape(post.id)}">Paylaş</button></div>`;
        },
        onAction: (act, el) => {
          if (act === "open-profile") app.openProfile(el.dataset.arg);
          else if (act === "post-share") app.sharePost(el.dataset.arg);
          else if (act === "cmt-send") {
            const inp = U.qs("[data-ig-cmt]");
            if (inp && inp.value.trim()) {
              K.interactions.addComment("ig_" + post.id, inp.value.trim());
              K.toast("💬 Yorum gönderildi", "", "ok");
              inp.value = "";
              K.phone.reRender();
            } else K.toast("Boş yorum", "", "warn");
          }
          else if (act === "ig-save") { const on = K.interactions.toggleSave("ig_" + post.id); K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "", "ok"); K.phone.reRender(); }
          else if (act === "focus-cmt") { const inp = U.qs("[data-ig-cmt]"); if (inp) inp.focus(); }
        }
      });
    },

    postSheet(postId) {
      K.ui.actionSheet("Gönderi", [
        { label: "✈︎ Paylaş", onClick: () => K.toast("✈︎ Paylaşıldı", "Bağlantı kopyalandı.", "ok") },
        { label: "🔗 Bağlantıyı kopyala", onClick: () => K.toast("🔗 Kopyalandı", "", "ok") },
        { label: "🔖 Kaydet", onClick: () => { K.interactions.toggleSave("ig_" + postId); K.phone.reRender(); } },
        { label: "🚫 Bildir", cls: "destructive", onClick: () => K.toast("🚫 Bildirildi", "", "warn") }
      ]);
    },

    sharePost(id) {
      K.ui.actionSheet("Gönderiyi paylaş", [
        { label: "📸 Hikâyeme ekle", onClick: () => K.toast("📸 Hikâyene eklendi", "24 saat görünür.", "ok") },
        { label: "✈︎ DM'de paylaş", onClick: () => K.phone.pushView(K.phone.appById("instagram").inboxView()) },
        { label: "🔗 Bağlantıyı kopyala", onClick: () => K.toast("🔗 Kopyalandı", "", "ok") },
        { label: "🚫 Bildir", cls: "destructive", onClick: () => K.toast("🚫 Bildirildi", "", "warn") }
      ]);
    },

    /* ============================================================
     v10.11 GERÇEKLİK DÜZELTMESİ — HİKÂYE
     Eskiden 36 sanatçının TAMAMI 6 hazır cümleyi hikâye olarak
     atıyordu (Sıla ile Blok3 aynı metin) ve hikâyeye tepki vermek
     mümkün değildi; görüntüleyen sayısı da takipçinin %18'i gibi
     fahiş bir oranla uyduruluyordu. Artık:
       • metinler sanatçının TÜRÜNE ve KUŞAĞINA göre
       • görüntüleyen = takipçinin %5-12'si (gerçek hikâye erişimi)
       • tepki (emoji) verilebilir → DM'e gerçekten düşer
       • kendi hikâyende görüntüleyen listesi
     ============================================================ */
    /* tür bazlı hikâye metinleri */
    STORY_BY_GENRE: {
      trap:   ["Kayıt odasından 🌙", "Bu gece bitmiyor", "Yeni bir şey üstünde çalışıyorum"],
      drill:  ["Mahalle işi 🔥", "Kayıttayız", "Yakında çıkıyor"],
      rap:    ["Kalem kâğıt 🖊️", "Sözler üstünde çalışıyorum", "Sahnede görüşürüz 🎤"],
      pop:    ["Provadan ✨", "Yeni şarkı çok yakın 💫", "Sahne enerjisi 🎤"],
      rnb:    ["Gece için yazdım 🌙", "Kayıt ışıkları kapalı", "Yumuşak tonda 🎙️"],
      indie:  ["Küçük bir odada ✨", "Kendi halimde", "Kayıtlar devam 🎸"]
    },
    STORY_VET: ["Yıllardır aynı masada 🖊️", "Gençlere yer açıyoruz", "Kayıt bitti, gerisi zaman"],
    storyLines(artist, isMe) {
      if (isMe) return ["Yeni iş yolda 🎧", "Stüdyodan selamlar 🎙️", "Snippet test 👀"];
      const self = K.phone.appById("instagram");
      if ((artist && artist.age || 30) >= 40) return self.STORY_VET;
      const g = self.STORY_BY_GENRE[(artist && artist.genre) || "rap"];
      return g || self.STORY_BY_GENRE.rap;
    },

    /* ---------- hikâye (tam ekran) ---------- */
    openStory(artistId) {
      const app = K.phone.appById("instagram");
      const isMe = artistId === "player";
      const p = K.platforms.artistProfile(artistId);
      if (!p) return;
      const artist = isMe ? null : K.artistById(artistId);
      const texts = app.storyLines(artist, isMe) || [""];
      K.phone._storySeen = K.phone._storySeen || {};
      K.phone._storySeen[artistId] = (K.phone._storySeen[artistId] || 0) + 1;
      const photo = K.imagery.byArtistId(isMe ? "player" : artistId);
      /* gerçekçi hikâye erişimi: takipçinin %5-12'si */
      const viewers = Math.round((p.ig || 0) * (0.05 + Math.random() * 0.07));
      /* kendi hikâyende en yakın takipçiler "görüntüleyen" olarak listelenir */
      const seenBy = K.artistList()
        .filter(a => K.interactions.isFollowed(a.id))
        .map(a => ({ a, rel: K.relation(a.id) }))
        .sort((x, y) => (y.rel.affinity || 0) - (x.rel.affinity || 0))
        .slice(0, 3).map(x => x.a);

      K.phone.pushView({
        title: "Hikâye", sub: p.name, shellClass: "app-instagram no-pad",
        render: () => `
          <div class="story-view" style="background:${U.gradientFor(p.name)};${photo ? `background-image:url('${photo}');background-size:cover;background-position:center;` : ""}">
            <div class="story-bars"><i class="active"></i><i></i><i></i></div>
            <div class="story-head">${K.ui.artistAvatar(isMe ? "player" : artistId, 34, true)}<span>${U.escape(p.name)}</span><span class="muted">şimdi</span></div>
            <div class="story-body">
              <div class="story-text">${U.escape(texts[0])}</div>
              ${isMe
                ? `<div class="story-viewers">👁 ${U.compact(viewers)} görüntüleyen
                     ${seenBy.length ? `<div class="sv-row">${seenBy.map(a => `<span class="sv-p">${K.ui.artistAvatar(a.id, 26, true)}</span>`).join("")}<span class="sv-t">${U.escape(seenBy.map(a => a.stageName.split(" ")[0]).join(", "))}</span></div>` : ""}
                   </div>`
                : `<div class="story-react">
                     ${["❤️", "🔥", "😮", "👏"].map(em => `<button class="srb" data-pact="story-react" data-arg="${em}|${artistId}">${em}</button>`).join("")}
                     <button class="story-link" data-pact="story-dm" data-arg="${artistId}">↩ Yanıtla</button>
                   </div>`}
            </div>
            <div class="story-tap left" data-pact="story-prev"></div>
            <div class="story-tap right" data-pact="story-next"></div>
          </div>`,
        onMount: (root) => {
          if (!root) return;
          const bars = root.querySelectorAll(".story-bars i");
          let idx = 0;
          const draw = () => bars.forEach((b, i) => { b.className = i < idx ? "done" : i === idx ? "active" : ""; });
          draw();
          const step = () => {
            idx++;
            if (idx >= bars.length) { K.phone.back(); return; }
            draw();
            const t = root.querySelector(".story-text");
            if (t) t.textContent = texts[idx] || "";
          };
          if (K.phone._storyTimer) clearInterval(K.phone._storyTimer);
          K.phone._storyTimer = setInterval(step, 2600);
          const right = root.querySelector(".story-tap.right");
          const left = root.querySelector(".story-tap.left");
          if (right) right.addEventListener("click", step);
          if (left) left.addEventListener("click", () => { idx = Math.max(0, idx - 1); draw(); });
        },
        onAction: (act, el) => {
          if (act === "story-dm") {
            if (el.dataset.arg && el.dataset.arg !== "player") K.phone.pushView(K.phone.appById("instagram").inboxView());
          } else if (act === "story-react") {
            /* v10.11 — hikâyeye tepki gerçekten gönderilir ve DM'e düşer */
            const parts = String(el.dataset.arg || "").split("|");
            const em = parts[0], id = parts[1];
            if (!id) return;
            try {
              K.relations.sendMessage(id, em);
              K.toast(em + " Tepki gönderildi", (K.artistById(id) || {}).stageName || "", "ok");
            } catch (e) { K.toast(em + " Tepki", "Gönderildi.", "ok"); }
          }
        }
      });
    },

    /* ---------- etkinlik ---------- */
    activityView() {
      const list = K.interactions.notifications("instagram");
      return {
        title: "Etkinlik", sub: "Instagram", shellClass: "app-instagram",
        render: () => list.length ? list.map((n) => {
          const a = n.action || {};
          const followed = a.artistId ? K.interactions.isFollowed(a.artistId) : true;
          return `<div class="x-notif tap" data-pact="notif-open" data-ntype="${a.type || "info"}" data-artist="${a.artistId || ""}" data-song="${a.songId || ""}" data-post="${a.postId || ""}">
            <div class="xf-icon ${n.kind}">${n.icon}</div>
            <div class="grow"><div class="xf-text"><b>${U.escape(n.who)}</b> ${U.escape(n.text)}</div>
            <div class="xf-day">${U.ago(n.day, K.state.day)}</div></div>
            ${(a.type === "profile" && a.artistId && !followed)
              ? `<button class="ig-follow-btn sm" data-pact="notif-follow" data-arg="${a.artistId}">Takip Et</button>`
              : `<span class="notif-chev">›</span>`}
          </div>`;
        }).join("") : `<div class="ig-empty"><b>Etkinlik yok</b>Etkileşimler burada görünür.</div>`,
        onAction: (act, el) => {
          const app = K.phone.appById("instagram");
          if (act === "notif-follow") {
            const on = K.interactions.toggleFollow(el.dataset.arg);
            if (on) K.toast("✅ Takip edildi", (K.artistById(el.dataset.arg) || {}).stageName || "", "ok");
            K.phone.reRender();
            return;
          }
          if (act !== "notif-open") return;
          const type = el.dataset.ntype, artist = el.dataset.artist, song = el.dataset.song;
          if (type === "profile" && artist) app.openProfile(artist);
          else if (type === "dm") K.phone.pushView(app.inboxView());
          else if (type === "song" && song) {
            const sg = K.platforms.findSong(song);
            if (sg) K.interactions.play(sg); else K.toast("Şarkı bulunamadı", "", "warn");
          }
          else if (type === "post" && el.dataset.post) app.openPost(el.dataset.post);
          else if (type === "story") K.toast("👁️ Hikaye", "Hikâyeni görüntüleyenler listesi yakında.", "");
          else K.toast("Bilgi", "Bu bildirim için işlem yok.", "");
        }
      };
    },

    /* ---------- yeni gönderi ---------- */
    newPost() {
      /* v10.30 — gönderi STRATEJİSİ: içerik türü (erişim / imaj / risk) */
      const body = `
        ${K.ui.field("Gönderi metni", `<textarea id="ig-text" rows="3" placeholder="Ne paylaşmak istiyorsun?">Stüdyodan selamlar 🎧</textarea>`)}
        ${K.ui.field("Şarkı etiketle (opsiyonel)", `<select id="ig-song">
          <option value="">— Yok —</option>
          ${K.state.player.songs.map((s) => `<option value="${s.id}">${U.escape(s.title)}</option>`).join("")}
        </select>`)}
        ${K.ui.field("İçerik türü", `<div data-posttype-box>${K.social.postTypeSelector("reach")}</div>`)}`;
      const m = K.ui.modal({
        title: "Yeni Gönderi", body,
        actions: [
          { label: "Vazgeç" },
          { label: "Paylaş", cls: "btn-primary", onClick: () => {
            const text = U.qs("#ig-text").value.trim();
            const songId = U.qs("#ig-song").value || null;
            const type = K.social.selectedPostType(m.root);
            const res = K.social.playerPost("instagram", text, type, songId);
            K.toast(res.title, res.msg, res.kind);
          }}
        ]
      });
      K.social.bindPostTypes(m.root, "reach");
    },

    promotePicker() {
      const songs = K.state.player.songs;
      if (!songs.length) { K.toast("Şarkın yok", "Önce bir şarkı yayınla.", "warn"); return; }
      K.ui.actionSheet("Hangi şarkıyı tanıtmak istersin?",
        songs.map((s) => ({ label: s.title, onClick: () => { K.social.promoteSong(s.id, "instagram"); K.phone.reRender(); } })));
    }
  });
})(window.K);
