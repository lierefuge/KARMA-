/* ============================================================
   KARMA — apps/x.js  (kapsamlı)
   Akış · Keşfet (gündem) · Bildirimler · Profil
   Gönderi detayı (yanıtlar) · Gönderi yazma · Etkileşim
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- gerçek X simgeleri (SVG) ----------
     v10.37 — emoji yerine gerçek X işaretleri.
     .x-off = pasif (ince çizgi) · .x-on = aktif (dolu).
     Gerçek X'te alt sekmede aktif simge DOLAR, pasif ince kalır. */
  const XI = {
    home: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
      <path class="x-off" d="M3.2 9.6 12 3l8.8 6.6V20a1.4 1.4 0 0 1-1.4 1.4h-4.9v-6.6H9.5v6.6H4.6A1.4 1.4 0 0 1 3.2 20z" fill="none"/>
      <path class="x-on" d="M12.7 2.5a1.2 1.2 0 0 0-1.4 0L2.6 8.9A1.6 1.6 0 0 0 2 10.2V20a2 2 0 0 0 2 2h4.3v-6.4h7.4V22H20a2 2 0 0 0 2-2v-9.8a1.6 1.6 0 0 0-.6-1.3z" fill="currentColor" stroke="none"/>
    </svg>`,
    search: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.6" cy="10.6" r="7"/><path d="m15.8 15.8 5 5"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
      <path class="x-off" d="M18.4 8.2a6.4 6.4 0 1 0-12.8 0c0 6.8-2.6 8.4-2.6 8.4h18s-2.6-1.6-2.6-8.4" fill="none"/>
      <path class="x-off" d="M13.9 20.6a2.2 2.2 0 0 1-3.8 0" fill="none"/>
      <path class="x-on" d="M12 1.6a6.7 6.7 0 0 0-6.7 6.7c0 3.4-.6 5.6-1.2 7-.6 1.3-1.3 1.9-1.3 1.9a1 1 0 0 0 .6 1.8h17.2a1 1 0 0 0 .6-1.8s-.7-.6-1.3-1.9c-.6-1.4-1.2-3.6-1.2-7A6.7 6.7 0 0 0 12 1.6z" fill="currentColor" stroke="none"/>
      <path class="x-on" d="M12 22.6a2.9 2.9 0 0 0 2.7-2h-5.4a2.9 2.9 0 0 0 2.7 2z" fill="currentColor" stroke="none"/>
    </svg>`,
    user: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
      <circle class="x-off" cx="12" cy="8" r="4.2" fill="none"/>
      <path class="x-off" d="M4.4 20.6c.6-3.6 3.8-6 7.6-6s7 2.4 7.6 6" fill="none"/>
      <circle class="x-on" cx="12" cy="7.8" r="4.6" fill="currentColor" stroke="none"/>
      <path class="x-on" d="M12 13.6c-4.4 0-8 2.8-8 6.4 0 .6.4 1 1 1h14c.6 0 1-.4 1-1 0-3.6-3.6-6.4-8-6.4z" fill="currentColor" stroke="none"/>
    </svg>`,
    /* gönderi eylemleri */
    reply: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20.6 11.5a8.2 8.2 0 0 1-8.3 8.3 9 9 0 0 1-3.3-.6L3.6 20.7l1.6-4.7a8.2 8.2 0 0 1-1-4.5A8.2 8.2 0 0 1 12.5 3.2a8.2 8.2 0 0 1 8.1 8.3z"/></svg>`,
    repost: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.5l3.6 3.6L17 9.7"/><path d="M3.4 11.6V10a3.9 3.9 0 0 1 3.9-3.9h13.3"/><path d="M7 21.5l-3.6-3.6L7 14.3"/><path d="M20.6 12.4V14a3.9 3.9 0 0 1-3.9 3.9H3.4"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path class="x-off" d="M12 20.6 3.9 12.5a5.2 5.2 0 0 1 7.4-7.4l.7.7.7-.7a5.2 5.2 0 0 1 7.4 7.4z" fill="none"/><path class="x-on" d="M12 20.6 3.9 12.5a5.2 5.2 0 0 1 7.4-7.4l.7.7.7-.7a5.2 5.2 0 0 1 7.4 7.4z" fill="currentColor"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><rect x="3.2" y="10.5" width="2.7" height="10.5" rx=".6"/><rect x="8.1" y="3" width="2.7" height="18" rx=".6"/><rect x="13" y="6.8" width="2.7" height="14.2" rx=".6"/><rect x="17.9" y="12.8" width="2.7" height="8.2" rx=".6"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path class="x-off" d="M5.5 3h13a1 1 0 0 1 1 1v17l-7.5-5.2L4.5 21V4a1 1 0 0 1 1-1z" fill="none"/><path class="x-on" d="M5.5 3h13a1 1 0 0 1 1 1v17l-7.5-5.2L4.5 21V4a1 1 0 0 1 1-1z" fill="currentColor"/></svg>`,
    share: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.2V3.4"/><path d="M7.8 7.6 12 3.4l4.2 4.2"/><path d="M4.6 13v6.2a1.4 1.4 0 0 0 1.4 1.4h12a1.4 1.4 0 0 0 1.4-1.4V13"/></svg>`,
    compose: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 12.6v6.6a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.2V5.4A1.8 1.8 0 0 1 4.8 3.6h6.6"/><path d="M18.1 2.9a2 2 0 0 1 2.8 2.8L12.6 14l-3.7 1 1-3.7z"/></svg>`
  };

  function postHTML(post, opts) {
    opts = opts || {};
    const a = post.authorId !== "player" ? K.artistById(post.authorId) : null;
    const verified = a && a.popularity > 78;
    const handle = "@" + post.authorName.toLowerCase().replace(/\s/g, "");
    const key = "x_" + post.id;
    const liked = K.interactions.isLiked(key);
    const reposted = K.interactions.isReposted(key);
    const saved = K.interactions.isSaved(key);
    const baseLikes = post.likes || 0;
    return `<div class="x-post ${verified ? "verified" : ""}">
      ${post.authorId && post.authorId !== "player" ? K.ui.artistAvatar(post.authorId, 40, true) : K.ui.avatar(post.authorName, 40, true)}
      <div style="flex:1;min-width:0">
        <div class="xp-head">
          <span class="xp-name" style="cursor:pointer" data-pact="open-profile" data-arg="${post.authorId}">${U.escape(post.authorName)}</span>
          <span class="xp-handle">${U.escape(handle)} · ${U.ago(post.day, K.state.day)}</span>
        </div>
        <div class="xp-text" ${opts.clickable ? `data-pact="post-open" data-arg="${post.id}" style="cursor:pointer"` : ""}>${U.escape(post.text)}</div>
        <div class="xp-actions">
          <span class="xp-act" data-pact="post-open" data-arg="${post.id}" style="cursor:pointer">${XI.reply}<b>${U.compact(post.comments || 0)}</b></span>
          <span class="xp-act xp-repost ${reposted ? "on" : ""}" data-pact="x-repost" data-arg="${post.id}">${XI.repost}<b>${U.compact(K.interactions.repostCount(key, post.shares))}</b></span>
          <span class="xp-act xp-like ${liked ? "on" : ""}" data-pact="like" data-arg="${key}">${XI.heart}<b>${U.compact(K.interactions.likeCount(key, baseLikes))}</b></span>
          <span class="xp-act xp-save ${saved ? "on" : ""}" data-pact="x-save" data-arg="${post.id}">${XI.bookmark}</span>
          <span class="xp-act" data-pact="x-share" data-arg="${post.id}" style="cursor:pointer">${XI.share}</span>
          <span class="xp-act muted">${XI.chart}<b>${U.compact(post.views || Math.round((post.likes || 0) * 12))}</b></span>
        </div>
      </div>
    </div>`;
  }

  K.phone.register({
    id: "x", name: "X", icon: "𝕏", iconClass: "ic-x", dock: false,

    render(params) {
      const view = {
        title: "X", sub: "Ne oluyor?",
        shellClass: "app-x",
        tabPos: "bottom",
        tabs: [
          { id: "feed", label: "Akış", icon: XI.home },
          { id: "explore", label: "Keşfet", icon: XI.search },
          { id: "notif", label: "Bildirimler", icon: XI.bell },
          { id: "mine", label: "Profilim", icon: XI.user }
        ],
        activeTab: params.tab || "feed",
        render: (tab) => {
          const app = K.phone.appById("x");
          if (tab === "explore") return app.exploreHTML();
          if (tab === "notif") { K.interactions.markNotifsRead("x"); return app.notifHTML(); }
          if (tab === "mine") return app.mineHTML();
          return app.feedHTML();
        },
        onAction: (act, el) => {
          const app = K.phone.appById("x");
          if (act === "open-profile") app.openProfile(el.dataset.arg);
          else if (act === "post-open") app.openPost(el.dataset.arg);
          else if (act === "x-repost") { const on = K.interactions.toggleRepost("x_" + el.dataset.arg); K.toast(on ? "↻ Yeniden gönderildi" : "Geri alındı", "", "ok"); K.phone.reRender(); }
          else if (act === "x-save") { const on = K.interactions.toggleSave("x_" + el.dataset.arg); K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "", "ok"); K.phone.reRender(); }
          else if (act === "x-share") K.ui.actionSheet("Gönderiyi paylaş", [
            { label: "↻ Yeniden gönder", onClick: () => { K.interactions.toggleRepost("x_" + el.dataset.arg); K.phone.reRender(); } },
            { label: "✍️ Alıntıla", onClick: () => { const p = (K.state.feed.x || []).find(x => x.id === el.dataset.arg); app.newPost(p ? "\u201C" + p.text + "\u201D" : ""); } },
            { label: "💬 DM'de paylaş", onClick: () => K.phone.openApp("messages") },
            { label: "🔗 Bağlantıyı kopyala", onClick: () => K.toast("🔗 Kopyalandı", "", "ok") }
          ]);
          else if (act === "post-more") K.ui.actionSheet("Gönderi", [
            { label: "↻ Yeniden gönder", onClick: () => { K.interactions.toggleRepost("x_" + el.dataset.arg); K.toast("↻ Paylaşıldı", "", "ok"); K.phone.reRender(); } },
            { label: "✍️ Alıntıla", onClick: () => { const p = (K.state.feed.x || []).find(x => x.id === el.dataset.arg); app.newPost(p ? "\u201C" + p.text + "\u201D" : ""); } },
            { label: "🚫 Engelle", cls: "destructive", onClick: () => K.toast("🚫 Engellendi", "", "warn") }
          ]);
          else if (act === "new-post") app.newPost();
          else if (act === "promote") app.promotePicker();
          else if (act === "trend-open") app.openTrend(el.dataset.arg);
        }
      };
      return view;
    },

    feedHTML() {
      const posts = K.social.feedFor("x").slice().sort((a, b) => b.day - a.day);
      return `<button class="btn btn-ghost btn-sm" data-pact="new-post" style="align-self:flex-start">${XI.compose} Gönderi Yaz</button>` +
        posts.map(p => postHTML(p, { clickable: true })).join("");
    },

    exploreHTML() {
      const trends = K.state.trends || [];
      const news = K.phone.appById("x").newsItems();
      return `
        ${K.ui.section("Türkiye Gündemi")}
        ${trends.map((t, i) => `
          <div class="x-trend" data-pact="trend-open" data-arg="${U.escape(t.tag)}">
            <div class="cat">${i + 1} · ${t.mine ? "Senin şarkın 🔥" : "Trend"} · Gündem</div>
            <div class="tag">${U.escape(t.tag)}</div>
            <div class="cnt">${U.compact(t.count)} gönderi</div>
          </div>`).join("")}
        ${(K.shortform && K.shortform.trendList(3).length) ? `
          ${K.ui.section("Ses Trendi")}
          ${K.shortform.trendList(3).map(t => `<div class="x-trend">
            <div class="cat">${t.trend ? "🔥 Trend" : "🎬 Yükseliyor"} · TikTok</div>
            <div class="tag">#${U.escape(String(t.title).replace(/\s+/g, ""))}</div>
            <div class="cnt">${U.compact(t.videos)} video bu sesle · +${U.compact(t.gain)}/gün</div>
          </div>`).join("")}` : ""}
        ${K.ui.section("Müzik Haberleri")}
        ${news.map(n => `<div class="x-news">
          <div class="xn-cat">${U.escape(n.cat)}</div>
          <div class="xn-title">${U.escape(n.title)}</div>
          <div class="xn-meta">${U.escape(n.who)} · ${U.compact(n.views)} görüntülenme</div>
        </div>`).join("")}`;
    },

    newsItems() {
      const list = K.artistList();
      const h = U.hashHue(String(K.state.day));
      const picks = [list[h % list.length], list[(h + 7) % list.length], list[(h + 13) % list.length]];
      const s = K.state;
      const mineRecent = (s.player.songs || []).slice(-1)[0];
      const items = picks.filter(Boolean).map((a, i) => ({
        cat: ["MÜZİK", "RAP", "SEKTÖR"][i % 3],
        title: U.pick([
          `${a.stageName} yeni albümünü duyurdu`,
          `${a.stageName}'dan sürpriz single`,
          `${a.stageName} liste başında`,
          `${a.stageName} konser takvimini açıkladı`
        ]),
        who: a.stageName, views: U.randInt(20, 400) * 1000
      }));
      if (mineRecent) items.unshift({ cat: "SEN", title: `${s.player.stageName} — "${mineRecent.title}" yayında`, who: s.player.stageName, views: mineRecent.streams || 1200 });
      return items;
    },

    notifHTML() {
      const notifs = K.interactions.notifications("x");
      if (!notifs.length) return `<div class="empty-note"><b>Bildirim yok</b>Etkileşimler burada görünür.</div>`;
      return notifs.map(n => `<div class="x-notif">
        <div class="xf-icon ${n.kind}">${n.icon}</div>
        <div class="grow"><div class="xf-text"><b>${U.escape(n.who)}</b> ${U.escape(n.text)}</div>
        <div class="xf-day">${U.ago(n.day, K.state.day)}</div></div>
      </div>`).join("");
    },

    mineHTML() {
      const p = K.state.player;
      const myPosts = (K.state.feed.x || []).filter(x => x.mine);
      return `
        <div class="ig-profile" style="align-items:flex-start">
          ${K.ui.artistAvatar("player", 64, true)}
          <div style="flex:1">
            <div style="font-size:16px;font-weight:900">${U.escape(p.stageName)}</div>
            <div style="font-size:11px;color:var(--text-3)">@${U.escape(p.stageName.toLowerCase().replace(/\s/g, ""))}</div>
            <div class="ig-stats" style="margin-top:8px">
              <div class="s"><b>${U.compact(p.x)}</b><span>takipçi</span></div>
              <div class="s"><b>${myPosts.length}</b><span>gönderi</span></div>
            </div>
          </div>
        </div>
        <div class="action-row">
          <button class="btn btn-sm btn-primary" data-pact="new-post">${XI.compose} Gönderi Yaz</button>
          <button class="btn btn-sm btn-ghost" data-pact="promote">🎵 Şarkı Paylaş</button>
        </div>
        ${myPosts.map(p2 => postHTML(p2, { clickable: true })).join("") || `<div class="mini-empty">Gönderin yok.</div>`}`;
    },

    openPost(postId) {
      const all = (K.state.feed.x || []);
      const post = all.find(p => p.id === postId) || { id: postId, authorId: "player", authorName: K.state.player.stageName, text: "Yeni bir şey üzerinde çalışıyorum.", day: K.state.day, likes: 40, comments: 8, shares: 2 };
      const gen = K.interactions.commentsFor("x_" + post.id, 5);
      const mine = (K.state.xReplies && K.state.xReplies[post.id]) || [];
      const reposted = K.interactions.isReposted("x_" + post.id);
      const saved = K.interactions.isSaved("x_" + post.id);
      K.phone.pushView({
        title: "Gönderi", sub: "@" + post.authorName.toLowerCase().replace(/\s/g, ""), shellClass: "app-x",
        render: () => `
          ${postHTML(post, {})}
          <div class="x-detail-actions">
            <span class="xp-repost ${reposted ? "on" : ""}" data-pact="x-repost" data-arg="${post.id}">↻ Yeniden gönder</span>
            <span class="xp-save ${saved ? "on" : ""}" data-pact="x-save" data-arg="${post.id}">🔖 Kaydet</span>
            <span data-pact="x-share" data-arg="${post.id}">↗ Paylaş</span>
          </div>
          <div class="x-reply-hint">${U.escape(post.authorName)} kişisine yanıt ver</div>
          ${K.ui.section("Yanıtlar", `<span class="muted">${mine.length + gen.length}</span>`)}
          ${mine.map(r => `<div class="x-post">
            ${K.ui.artistAvatar("player", 36, true)}
            <div style="flex:1"><div class="xp-head"><span class="xp-name">${U.escape(r.user)}</span>
            <span class="xp-handle">· ${U.ago(r.day, K.state.day)}</span></div>
            <div class="xp-text">${U.escape(r.text)}</div>
            <div class="xp-actions"><span>♡ ${r.likes || 0}</span></div></div>
          </div>`).join("")}
          ${gen.map(r => `<div class="x-post">
            ${K.ui.avatar(r.user, 36, true)}
            <div style="flex:1"><div class="xp-head"><span class="xp-name">@${U.escape(r.user)}</span>
            <span class="xp-handle">· ${U.ago(r.day, K.state.day)}</span></div>
            <div class="xp-text">${U.escape(r.text)}</div>
            <div class="xp-actions"><span>♡ ${r.likes}</span><span>↻</span><span>💬</span></div></div>
          </div>`).join("")}
          <div class="cmt-input"><input placeholder="Yanıtını yaz..." data-x-reply /><button data-pact="reply-send" data-arg="${post.id}">Yanıtla</button></div>`,
        onAction: (act, el) => {
          const app = K.phone.appById("x");
          if (act === "open-profile") app.openProfile(el.dataset.arg);
          else if (act === "post-open") app.openPost(el.dataset.arg);
          else if (act === "x-repost") { const on = K.interactions.toggleRepost("x_" + post.id); K.toast(on ? "↻ Yeniden gönderildi" : "Geri alındı", "", "ok"); K.phone.reRender(); }
          else if (act === "x-save") { const on = K.interactions.toggleSave("x_" + post.id); K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "", "ok"); K.phone.reRender(); }
          else if (act === "x-share") K.ui.actionSheet("Paylaş", [
            { label: "↻ Yeniden gönder", onClick: () => { K.interactions.toggleRepost("x_" + post.id); K.phone.reRender(); } },
            { label: "💬 DM'de paylaş", onClick: () => K.phone.openApp("messages") },
            { label: "🔗 Bağlantıyı kopyala", onClick: () => K.toast("🔗 Kopyalandı", "", "ok") }
          ]);
          else if (act === "reply-send") {
            const inp = U.qs("[data-x-reply]");
            if (inp && inp.value.trim()) {
              const s = K.state; s.xReplies = s.xReplies || {};
              (s.xReplies[post.id] = s.xReplies[post.id] || []).unshift({ user: s.player.stageName, text: inp.value.trim(), day: s.day, likes: U.randInt(0, 24) });
              K.save(); inp.value = "";
              K.toast("↩ Yanıt gönderildi", "", "ok"); K.phone.reRender();
            } else K.toast("Boş yanıt", "", "warn");
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
      const posts = (K.state.feed.x || []).filter(x => x.authorId === artistId);
      K.phone.pushView({
        title: a.stageName, sub: "@" + a.stageName.toLowerCase().replace(/\s/g, ""), shellClass: "app-x",
        render: () => `
          <div class="x-banner" style="background:${U.gradientFor(a.id)}"></div>
          <div class="ig-profile" style="align-items:flex-start;margin-top:-30px">
            ${K.ui.artistAvatar(a.id, 64, true)}
            <div style="flex:1">
              <div style="font-size:16px;font-weight:900">${U.escape(a.stageName)} ${a.popularity > 78 ? '<span style="color:#1d9bf0">✓</span>' : ""}</div>
              <div style="font-size:11px;color:var(--text-3)">@${U.escape(a.stageName.toLowerCase().replace(/\s/g, ""))}</div>
              <div class="ig-stats" style="margin-top:8px">
                <div class="s"><b>${U.compact(a.x)}</b><span>takipçi</span></div>
                <div class="s"><b>${U.compact(Math.round(a.x * 0.06))}</b><span>takip</span></div>
                <div class="s"><b>${U.compact(a.monthly)}</b><span>dinleyici</span></div>
              </div>
            </div>
          </div>
          <div class="ig-bio">${K.genreById(a.genre).icon} ${K.genreById(a.genre).name} · ${U.escape(a.city)}${a.popularity > 78 ? "<br>Doğrulanmış hesap ✓" : ""}</div>
          <div class="action-row">
            <button class="btn btn-sm btn-primary" data-pact="follow" data-arg="${artistId}">${K.interactions.isFollowed(artistId) ? "Takip Ediliyor" : "Takip Et"}</button>
            <button class="btn btn-sm btn-ghost" data-pact="dm" data-arg="${artistId}">💬 DM</button>
          </div>
          ${posts.map(p => postHTML(p, { clickable: true })).join("") || `<div class="mini-empty">Gönderi yok.</div>`}`,
        onAction: (act, el) => {
          if (act === "dm") K.phone.openApp("messages", { artistId: el.dataset.arg });
          else if (act === "post-open") K.phone.appById("x").openPost(el.dataset.arg);
        }
      });
    },

    openTrend(tag) {
      const posts = (K.state.feed.x || []).filter(p => p.text.toLowerCase().includes(tag.replace("#", "").toLowerCase()));
      const list = posts.length ? posts : (K.state.feed.x || []).slice(0, 8);
      const count = U.randInt(20, 300) * 1000;
      const app = K.phone.appById("x");
      K.phone.pushView({
        title: tag, sub: U.compact(count) + " gönderi", shellClass: "app-x",
        render: () => `
          <div class="x-trend big">
            <div class="cat">Gündem · Türkiye</div>
            <div class="tag">${U.escape(tag)}</div>
            <div class="cnt">${U.compact(count)} gönderi</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-pact="trend-post" data-arg="${U.escape(tag)}" style="align-self:flex-start">✏️ Bu gündeme gönderi yaz</button>
          ${list.map(p => postHTML(p, { clickable: true })).join("")}`,
        onAction: (act, el) => {
          if (act === "post-open") app.openPost(el.dataset.arg);
          else if (act === "open-profile") app.openProfile(el.dataset.arg);
          else if (act === "x-repost") { const on = K.interactions.toggleRepost("x_" + el.dataset.arg); K.toast(on ? "↻ Yeniden gönderildi" : "Geri alındı", "", "ok"); K.phone.reRender(); }
          else if (act === "x-save") { const on = K.interactions.toggleSave("x_" + el.dataset.arg); K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "", "ok"); K.phone.reRender(); }
          else if (act === "trend-post") { K.phone.back(); setTimeout(() => app.newPost("", el.dataset.arg), 40); }
        }
      });
    },

    newPost(prefill, hashtag) {
      /* v10.30 — gönderi STRATEJİSİ: içerik türü (erişim / imaj / risk) */
      const body = K.ui.field("Ne düşünüyorsun?", `<textarea id="x-text" rows="3" placeholder="Bir şeyler yaz...">${U.escape(prefill || "")}</textarea>`)
        + (hashtag ? `<div class="hint">${U.escape(hashtag)} etiketi eklenecek.</div>` : "")
        + K.ui.field("İçerik türü", `<div data-posttype-box>${K.social.postTypeSelector("reach")}</div>`);
      const m = K.ui.modal({
        title: "Gönderi Oluştur", body,
        actions: [
          { label: "Vazgeç" },
          { label: "Paylaş", cls: "btn-primary", onClick: () => {
            let text = U.qs("#x-text").value.trim();
            if (!text) { K.toast("Boş gönderi", "", "warn"); return false; }
            if (hashtag) text += " " + hashtag;
            const type = K.social.selectedPostType(m.root);
            const res = K.social.playerPost("x", text, type);
            K.toast(res.title, res.msg, res.kind);
          }}
        ]
      });
      K.social.bindPostTypes(m.root, "reach");
    },

    promotePicker() {
      const songs = K.state.player.songs;
      if (!songs.length) { K.toast("Şarkın yok", "Önce bir şarkı yayınla.", "warn"); return; }
      K.ui.actionSheet("X'te hangi şarkıyı paylaşmak istersin?",
        songs.map(s => ({ label: s.title, onClick: () => { K.social.promoteSong(s.id, "x"); K.refresh(); } })));
    }
  });
})(window.K);
