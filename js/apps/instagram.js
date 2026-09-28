/* ============================================================
   KARMA — apps/instagram.js  (kapsamlı)
   Akış (gönderiler + beğeni/yorum) · Reels · Keşfet · Profil
   Story görüntüleyici · Gönderi detayı ve yorumlar · Paylaşım
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  function igPost(post) {
    const liked = K.interactions.isLiked("ig_" + post.id);
    const saved = K.interactions.isSaved("ig_" + post.id);
    return `<div class="ig-post">
      <div class="ig-post-head">
        <div class="iph-left" data-pact="open-profile" data-arg="${post.authorId}">
          ${K.ui.artistAvatar(post.authorId, 36, true)}
          <div><div class="iph-name">${U.escape(post.authorName)}</div>
          <div class="iph-sub">${post.songId ? "Şarkı tanıtımı" : "Gönderi"} · ${U.ago(post.day, K.state.day)}</div></div>
        </div>
        <button class="iph-more" data-pact="post-more" data-arg="${post.id}">⋯</button>
      </div>
      <div class="ig-photo" style="background:${U.gradientFor(post.id)}" data-pact="post-open" data-arg="${post.id}">
        <span class="ig-photo-icon">${post.songId ? "♫" : "◍"}</span>
        ${post.songId ? `<span class="ig-photo-label">${U.escape(post.text.slice(0, 60))}</span>` : ""}
      </div>
      <div class="ig-post-actions">
        <button class="${liked ? "on" : ""}" data-pact="like" data-arg="ig_${post.id}">${liked ? "♥" : "♡"}</button>
        <button data-pact="post-open" data-arg="${post.id}">💬</button>
        <button data-pact="post-share" data-arg="${post.id}">↗</button>
        <span class="grow"></span>
        <button class="ig-save ${saved ? "on" : ""}" data-pact="ig-save" data-arg="${post.id}" title="Kaydet">🔖</button>
      </div>
      <div class="ig-post-body">
        <div class="ig-likes">${U.compact(K.interactions.likeCount("ig_" + post.id, post.likes))} beğenme</div>
        <div class="ig-caption"><b>${U.escape(post.authorName)}</b> ${U.escape(post.text)}</div>
        <div class="ig-open-cmt" data-pact="post-open" data-arg="${post.id}">${U.compact(post.comments)} yorumun tümünü gör</div>
      </div>
    </div>`;
  }

  K.phone.register({
    id: "instagram", name: "Instagram", icon: "◍", iconClass: "ic-instagram", dock: true,

    render(params) {
      const view = {
        title: "Instagram", sub: "@" + K.state.player.stageName.toLowerCase().replace(/\s/g, ""),
        shellClass: "app-instagram snap",
        tabPos: "bottom",
        tabs: [
          { id: "feed", label: "Akış", icon: "🏠" },
          { id: "reels", label: "Reels", icon: "🎬" },
          { id: "explore", label: "Keşfet", icon: "🔍" },
          { id: "profile", label: "Profilim", icon: "👤" }
        ],
        activeTab: params.tab || "feed",
        navRight: (() => {
          const n = K.interactions.unreadNotifications("instagram");
          return `<button class="nav-bell" data-pact="ig-activity">♡${n ? `<b>${Math.min(99, n)}</b>` : ""}</button>`;
        })(),
        /* gerçek Instagram gibi: sağa kaydır → DM · sola kaydır → canlı yayın */
        swipe: {
          right: () => K.phone.openApp("messages"),
          left: () => { K.livestream.start("instagram"); K.phone.pushView(K.ui.liveView()); }
        },
        render: (tab) => {
          const app = K.phone.appById("instagram");
          if (tab === "reels") return app.reelsHTML();
          if (tab === "explore") return app.exploreHTML();
          if (tab === "profile") return app.profileHTML("player");
          return app.feedHTML();
        },
        onMount: (root) => {
          const inp = U.qs("[data-ig-explore]", root);
          if (inp) inp.addEventListener("input", () => {
            const box = root.querySelector("[data-ig-explore-results]");
            if (box) box.innerHTML = K.phone.appById("instagram").exploreArtists(inp.value);
          });
        },
        onAction: (act, el) => {
          const app = K.phone.appById("instagram");
          if (act === "open-profile") app.openProfile(el.dataset.arg);
          else if (act === "post-open") app.openPost(el.dataset.arg);
          else if (act === "post-share") app.sharePost(el.dataset.arg);
          else if (act === "ig-save") {
            const on = K.interactions.toggleSave("ig_" + el.dataset.arg);
            K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "Koleksiyonuna eklendi.", "ok");
            K.phone.reRender();
          }
          else if (act === "ig-activity") { K.interactions.markNotifsRead("instagram"); K.phone.pushView(app.activityView()); }
          else if (act === "post-more") K.ui.actionSheet("Gönderi", [
            { label: "↗ Paylaş", onClick: () => K.toast("↗ Paylaşıldı", "Bağlantı kopyalandı.", "ok") },
            { label: "🔗 Bağlantıyı kopyala", onClick: () => K.toast("🔗 Kopyalandı", "", "ok") },
            { label: "🚫 Bildir", cls: "destructive", onClick: () => K.toast("🚫 Bildirildi", "", "warn") }
          ]);
          else if (act === "new-post") app.newPost();
          else if (act === "promote") app.promotePicker();
          else if (act === "story") app.openStory(el.dataset.arg);
          else if (act === "go-live") { K.livestream.start("instagram"); K.phone.pushView(K.ui.liveView()); }
        }
      };
      return view;
    },

    feedHTML() {
      /* YALNIZCA takip ettiğin hesaplar + kendi gönderilerin */
      const posts = K.social.feedFor("instagram", { followedOnly: true, limit: 20 });
      const followed = K.interactions.followedArtists();
      const stories = (followed.length ? followed : K.artistList()).slice(0, 14);
      const suggested = K.social.suggestedArtists("instagram", 5);
      const seen = K.phone._storySeen = K.phone._storySeen || {};
      return `
        <div class="ig-gesture-hint"><span>← Canlı yayın</span><span>Mesajlar →</span></div>
        <div class="live-cta" data-pact="go-live">
          <span class="live-dot"></span>
          <div class="grow"><b style="font-size:12.5px">Canlı Yayın Başlat</b>
          <div class="muted" style="font-size:10.5px">Takipçi kazan, bağış topla, popülerliğini artır</div></div>
          <span style="font-weight:900;color:#ff9db0">🔴 CANLI</span>
        </div>

        <div class="story-row">
          <div class="story-item" data-pact="story" data-arg="player">
            <div class="story-ring mine"><div class="story-av">${U.initials(K.state.player.stageName)}</div></div>
            <span>Senin</span>
          </div>
          ${stories.map(a => {
            const isSeen = !!seen[a.id];
            const img = K.imagery.byArtistId(a.id);
            return `<div class="story-item" data-pact="story" data-arg="${a.id}">
              <div class="story-ring ${isSeen ? "seen" : ""}"><div class="story-av" ${img ? `style="background-image:url('${img}');background-size:cover"` : `style="background:${U.gradientFor(a.id)}"`}></div></div>
              <span>${U.escape(a.stageName.split(" ")[0])}</span></div>`;
          }).join("")}
        </div>

        ${posts.length ? posts.map(igPost).join("") : `
          <div class="empty-note"><b>Akışın boş</b>Kimseyi takip etmiyorsun. Aşağıdaki önerilerden takip et, gönderileri akışında görürsün.</div>`}

        ${suggested.length ? `
          ${K.ui.section("Önerilen hesaplar")}
          ${suggested.map(a => `<div class="ig-suggest">
            <div class="iph-left" data-pact="open-profile" data-arg="${a.id}">
              ${K.ui.artistAvatar(a.id, 40, true)}
              <div><div class="iph-name">${U.escape(a.stageName)}</div>
              <div class="iph-sub">${U.compact(a.monthly)} aylık dinleyici · ${U.escape(K.genreById(a.genre).name)}</div></div>
            </div>
            <button class="ig-follow-btn ${K.interactions.isFollowed(a.id) ? "following" : ""}" data-pact="follow" data-arg="${a.id}">${K.interactions.isFollowed(a.id) ? "Takip Ediliyor" : "Takip Et"}</button>
          </div>`).join("")}` : ""}`;
    },

    reelsHTML() {
      const vids = K.phone.appById("youtube").allVideos().slice(0, 10);
      return `<div class="reels-scroll">
        ${vids.map(v => {
          const mineSong = v.mine ? K.state.player.songs.find(x => x.id === v.id) : null;
          const sn = mineSong && mineSong.sound;
          const soundTxt = (sn && sn.startedDay)
            ? `${U.compact(sn.videos)} video bu sesle · ${sn.trend ? "🔥 trend" : "yükseliyor"}`
            : "Orijinal ses · " + U.escape(v.channel);
          return `<div class="reel-card" style="${v.art ? `background-image:url('${v.art}')` : `background:${U.gradientFor(v.id)}`};background-size:cover;background-position:center">
          <div class="reel-ov"></div>
          <div class="reel-side">
            <button class="${K.interactions.isLiked("reel_" + v.id) ? "on" : ""}" data-pact="like" data-arg="reel_${U.escape(v.id)}">${K.interactions.isLiked("reel_" + v.id) ? "♥" : "♡"}</button>
            <span>${U.compact(Math.round(v.views * 0.06))}</span>
            <button>💬</button><span>${U.compact(Math.round(v.views * 0.003))}</span>
            <button>↗</button>
          </div>
          <div class="reel-info">
            <div class="ri-channel">${U.escape(v.channel)}</div>
            <div class="ri-title">${U.escape(v.title.replace(" (Official Video)", ""))}</div>
            <div class="ri-sound">♫ ${soundTxt}</div>
          </div>
        </div>`;
        }).join("")}
      </div>`;
    },

    exploreHTML() {
      const app = K.phone.appById("instagram");
      const posts = (K.state.feed.instagram || []).slice(0, 12);
      return `
        <div class="p-search"><span>🔍</span><input data-ig-explore type="text" placeholder="Instagram'da ara" /></div>
        ${posts.length ? `${K.ui.section("Keşfet")}<div class="ig-grid">${posts.map(p => `<div class="ig-cell" style="background:${U.gradientFor(p.id)}" data-pact="post-open" data-arg="${p.id}"><span>◍</span><div class="ov">${U.escape((p.text || "").slice(0, 34))}</div></div>`).join("")}</div>` : ""}
        ${K.ui.section("Sanatçılar")}
        <div class="ig-grid" data-ig-explore-results>${app.exploreArtists("")}</div>`;
    },

    profileHTML(artistId) {
      const p = K.platforms.artistProfile(artistId);
      if (!p) return `<div class="empty-note">Profil bulunamadı</div>`;
      const isMe = artistId === "player";
      const followed = K.interactions.isFollowed(artistId);
      const posts = isMe
        ? (K.state.feed.instagram || []).filter(x => x.mine)
        : (K.state.feed.instagram || []).filter(x => x.authorId === artistId);
      const cells = posts.length ? posts : [{ id: artistId + "p1", text: "Yakında yeni iş 🎧" }, { id: artistId + "p2", text: "Stüdyo 🔥" }, { id: artistId + "p3", text: "Snippet 👀" }];

      return `
        <div class="ig-profile">
          <div class="ig-avatar-ring"><div class="inner" ${K.imagery.byArtistId(artistId) ? `style="background-image:url('${K.imagery.byArtistId(artistId)}');background-size:cover"` : `style="background:${U.gradientFor(p.name)}"`}>${K.imagery.byArtistId(artistId) ? "" : U.escape(U.initials(p.name))}</div></div>
          <div style="flex:1">
            <div class="ig-stats">
              <div class="s"><b>${cells.length}</b><span>gönderi</span></div>
              <div class="s"><b>${U.compact(p.ig)}</b><span>takipçi</span></div>
              <div class="s"><b>${U.compact(Math.round(p.ig * 0.12))}</b><span>takip</span></div>
            </div>
            <div style="margin-top:10px;display:flex;gap:8px">
              ${isMe
                ? `<button class="ig-follow-btn" data-pact="new-post">+ Gönderi Paylaş</button>`
                : `<button class="ig-follow-btn ${followed ? "following" : ""}" data-pact="follow" data-arg="${artistId}">${followed ? "Takip Ediliyor" : "Takip Et"}</button>
                   <button class="ig-follow-btn" style="background:rgba(255,255,255,0.12)" data-pact="dm2" data-arg="${artistId}">Mesaj</button>`}
            </div>
          </div>
        </div>
        <div class="ig-bio">
          <b>${U.escape(p.name)}</b>${(p.aliases && p.aliases.length) ? ` <span style="color:var(--text-3)">aka ${U.escape(p.aliases.join(", "))}</span>` : ""}<br>
          ${K.genreById(p.genre).icon} ${K.genreById(p.genre).name} · ${U.escape(p.city)} · ${U.compact(p.monthly)} aylık dinleyici
        </div>
        <div class="ig-highlights">
          ${[["🎧", "Müzik"], ["🎤", "Sahne"], ["📸", "Kulis"], ["💜", "Fan"]].map(h => `<div class="ig-hl" data-pact="story" data-arg="${artistId}"><div class="ig-hl-ring">${h[0]}</div><span>${h[1]}</span></div>`).join("")}
        </div>
        ${isMe ? `<button class="btn btn-primary btn-sm" data-pact="promote">📸 Şarkını Tanıt</button>` : ""}
        <div class="ig-grid">
          ${cells.map(c => `<div class="ig-cell" style="background:${U.gradientFor(c.id)}" data-pact="post-open" data-arg="${c.id}"><span>♫</span><div class="ov">${U.escape((c.text || "").slice(0, 40))}</div></div>`).join("")}
        </div>`;
    },

    /* ---------- paylaş / etkinlik ---------- */
    sharePost(id) {
      K.ui.actionSheet("Gönderiyi paylaş", [
        { label: "📸 Hikayeme ekle", onClick: () => K.toast("📸 Hikayene eklendi", "24 saat görünür.", "ok") },
        { label: "💬 DM'de paylaş", onClick: () => K.phone.openApp("messages") },
        { label: "🔗 Bağlantıyı kopyala", onClick: () => K.toast("🔗 Kopyalandı", "", "ok") },
        { label: "🚫 Bildir", cls: "destructive", onClick: () => K.toast("🚫 Bildirildi", "", "warn") }
      ]);
    },

    activityView() {
      const list = K.interactions.notifications("instagram");
      return {
        title: "Etkinlik", sub: "Instagram", shellClass: "app-instagram",
        render: () => list.length ? list.map(n => {
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
        }).join("") : `<div class="empty-note"><b>Etkinlik yok</b>Etkileşimler burada görünür.</div>`,
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
          else if (type === "dm") K.phone.openApp("messages", artist ? { artistId: artist } : undefined);
          else if (type === "song" && song) {
            const sg = K.platforms.findSong(song);
            if (sg) K.interactions.play(sg); else K.toast("Şarkı bulunamadı", "", "warn");
          }
          else if (type === "post" && el.dataset.post) app.openPost(el.dataset.post);
          else if (type === "story") K.toast("👁️ Hikaye", "Hikayeni görüntüleyenler listesi yakında.", "");
          else K.toast("Bilgi", "Bu bildirim için işlem yok.", "");
        }
      };
    },

    /* ---------- gönderi detayı ---------- */
    openPost(postId) {
      const all = K.state.feed.instagram || [];
      const post = all.find(p => p.id === postId) || { id: postId, authorId: "player", authorName: K.state.player.stageName, text: "Stüdyo günleri 🎧", day: K.state.day, likes: 120, comments: 14, shares: 3 };
      const liked = K.interactions.isLiked("ig_" + post.id);
      const savedPost = K.interactions.isSaved("ig_" + post.id);
      const comments = K.interactions.commentsFor("ig_" + post.id, 6);
      K.phone.pushView({
        title: "Gönderi", sub: post.authorName, shellClass: "app-instagram",
        render: () => `
          <div class="ig-post-head">
            <div class="iph-left" data-pact="open-profile" data-arg="${post.authorId}">
              ${K.ui.artistAvatar(post.authorId, 36, true)}
              <div><div class="iph-name">${U.escape(post.authorName)}</div>
              <div class="iph-sub">${U.ago(post.day, K.state.day)}</div></div>
            </div>
          </div>
          <div class="ig-photo big" style="background:${U.gradientFor(post.id)}"><span class="ig-photo-icon">◍</span></div>
          <div class="ig-post-actions">
            <button class="${liked ? "on" : ""}" data-pact="like" data-arg="ig_${post.id}">${liked ? "♥" : "♡"}</button>
            <button data-pact="focus-cmt">💬</button>
            <button data-pact="post-share" data-arg="${post.id}">↗</button>
            <span class="grow"></span>
            <button class="ig-save ${savedPost ? "on" : ""}" data-pact="ig-save" data-arg="${post.id}">🔖</button>
          </div>
          <div class="ig-post-body">
            <div class="ig-likes">${U.compact(K.interactions.likeCount("ig_" + post.id, post.likes))} beğenme</div>
            <div class="ig-caption"><b>${U.escape(post.authorName)}</b> ${U.escape(post.text)}</div>
          </div>
          ${K.ui.section("Yorumlar")}
          ${comments.map((c, i) => `<div class="cmt">
            ${K.ui.avatar(c.user, 32, true)}
            <div class="grow"><div class="cmt-user">${U.escape(c.user)} · ${U.ago(c.day, K.state.day)}</div>
            <div class="cmt-text">${U.escape(c.text)}</div>
            <div class="cmt-actions">♡ ${c.likes} · <span data-pact="ig-reply" data-arg="${U.escape(post.id + '_' + i)}" style="cursor:pointer;color:var(--karma-2);font-weight:700">Yanıtla</span></div></div></div>`).join("")}
          <div class="cmt-input"><input placeholder="Yorum ekle..." data-ig-cmt /><button data-pact="cmt-send" data-arg="${post.id}">Paylaş</button></div>`,
        onAction: (act, el) => {
          const app = K.phone.appById("instagram");
          if (act === "open-profile") app.openProfile(el.dataset.arg);
          else if (act === "post-share") app.sharePost(el.dataset.arg);
          else if (act === "cmt-send") {
            const inp = U.qs("[data-ig-cmt]");
            if (inp && inp.value.trim()) { K.interactions.addComment("ig_" + post.id, inp.value.trim()); K.toast("💬 Yorum gönderildi", "", "ok"); inp.value = ""; K.phone.reRender(); }
            else K.toast("Boş yorum", "", "warn");
          }
          else if (act === "ig-save") { const on = K.interactions.toggleSave("ig_" + post.id); K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "", "ok"); K.phone.reRender(); }
          else if (act === "focus-cmt") { const inp = U.qs("[data-ig-cmt]"); if (inp) inp.focus(); }
        }
      });
    },

    /* ---------- story ---------- */
    openStory(artistId) {
      const isMe = artistId === "player";
      const p = K.platforms.artistProfile(artistId);
      if (!p) return;
      const texts = U.shuffle([
        "Yeni iş yolda 🎧", "Stüdyodan selamlar 🎙️", "Bu akşam kayıt var 🔥",
        "Yakında... ⏳", "Ses seviyesi yüksek 🎚️", "Snippet test 👀"
      ]).slice(0, 3);
      K.phone._storySeen = K.phone._storySeen || {};
      K.phone._storySeen[artistId] = (K.phone._storySeen[artistId] || 0) + 1;
      K.phone.pushView({
        title: "Hikaye", sub: p.name, shellClass: "app-instagram no-pad",
        render: () => `
          <div class="story-view" style="background:${U.gradientFor(p.name)};background-image:${K.imagery.byArtistId(artistId) ? `url('${K.imagery.byArtistId(artistId)}')` : "none"};background-size:cover;background-position:center">
            <div class="story-bars"><i class="active"></i><i></i><i></i></div>
            <div class="story-head">${K.ui.artistAvatar(artistId, 34, true)}<span>${U.escape(p.name)}</span><span class="muted">şimdi</span></div>
            <div class="story-body">
              <div class="story-text">${U.escape(texts[0])}</div>
              <div class="story-link" data-pact="story-dm" data-arg="${isMe ? "player" : artistId}">${isMe ? "👁 Görüntüleyen: " + U.compact(Math.round((p.ig || 0) * 0.18)) : "↩ Yanıtla"}</div>
            </div>
            <div class="story-tap left" data-pact="story-prev"></div>
            <div class="story-tap right" data-pact="story-next"></div>
          </div>`,
        onMount: (root) => {
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
          if (act === "story-dm") { if (el.dataset.arg && el.dataset.arg !== "player") K.phone.openApp("messages", { artistId: el.dataset.arg }); }
        }
      });
    },

    exploreArtists(q) {
      const cats = K.artistList().filter(a => !q || a.stageName.toLowerCase().includes(String(q).toLowerCase())).slice(0, 12);
      return cats.map(a => `<div class="ig-cell" style="background:${U.gradientFor(a.id)}" data-pact="open-profile" data-arg="${a.id}"><span>${U.escape(U.initials(a.stageName))}</span><div class="ov">${U.escape(a.stageName)} · ${U.compact(a.monthly)}</div></div>`).join("");
    },

    openProfile(artistId) {
      if (artistId === "player") {
        const v = K.phone.views[K.phone.views.length - 1];
        v.activeTab = "profile"; K.phone.renderTop(); return;
      }
      const a = K.artistById(artistId);
      if (!a) return;
      K.phone.pushView({
        title: "Profil", sub: "@" + a.stageName.toLowerCase().replace(/\s/g, ""),
        shellClass: "app-instagram",
        render: () => K.phone.appById("instagram").profileHTML(artistId),
        onAction: (act, el) => {
          const app = K.phone.appById("instagram");
          if (act === "dm2" || act === "dm") K.phone.openApp("messages", { artistId });
          else if (act === "post-open") app.openPost(el.dataset.arg);
          else if (act === "new-post") app.newPost();
          else if (act === "promote") app.promotePicker();
        }
      });
    },

    newPost() {
      const body = `
        ${K.ui.field("Gönderi metni", `<textarea id="ig-text" rows="3" placeholder="Ne paylaşmak istiyorsun?">Stüdyodan selamlar 🎧</textarea>`)}
        ${K.ui.field("Şarkı etiketle (opsiyonel)", `<select id="ig-song">
          <option value="">— Yok —</option>
          ${K.state.player.songs.map(s => `<option value="${s.id}">${U.escape(s.title)}</option>`).join("")}
        </select>`)}`;
      K.ui.modal({
        title: "Yeni Gönderi", body,
        actions: [
          { label: "Vazgeç" },
          { label: "Paylaş", cls: "btn-primary", onClick: () => {
            const text = U.qs("#ig-text").value.trim();
            const songId = U.qs("#ig-song").value || null;
            K.social.createPost("instagram", text, songId);
            if (songId) {
              const song = K.platforms.findSong(songId);
              if (song) { song.boosts.instagram_social = (song.boosts.instagram_social || 0) + 0.08; song.dailyStreams *= 1.05; }
            }
            K.state.player.ig += Math.round(K.state.player.popularity * 2 + 10);
            K.toast("📸 Paylaşıldı", "Instagram gönderisi yayında.", "ok");
            K.refresh();
          }}
        ]
      });
    },

    promotePicker() {
      const songs = K.state.player.songs;
      if (!songs.length) { K.toast("Şarkın yok", "Önce bir şarkı yayınla.", "warn"); return; }
      K.ui.actionSheet("Hangi şarkıyı tanıtmak istersin?",
        songs.map(s => ({ label: s.title, onClick: () => { K.social.promoteSong(s.id, "instagram"); K.phone.reRender(); } })));
    }
  });
})(window.K);
