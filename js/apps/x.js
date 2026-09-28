/* ============================================================
   KARMA — apps/x.js  (kapsamlı)
   Akış · Keşfet (gündem) · Bildirimler · Profil
   Gönderi detayı (yanıtlar) · Gönderi yazma · Etkileşim
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

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
          <span data-pact="post-open" data-arg="${post.id}" style="cursor:pointer">💬 ${U.compact(post.comments || 0)}</span>
          <span class="xp-repost ${reposted ? "on" : ""}" data-pact="x-repost" data-arg="${post.id}">↻ ${U.compact(K.interactions.repostCount(key, post.shares))}</span>
          <span class="xp-like ${liked ? "on" : ""}" data-pact="like" data-arg="${key}">${liked ? "♥" : "♡"} ${U.compact(K.interactions.likeCount(key, baseLikes))}</span>
          <span class="xp-save ${saved ? "on" : ""}" data-pact="x-save" data-arg="${post.id}">${saved ? "🔖" : "🏷"}</span>
          <span data-pact="x-share" data-arg="${post.id}" style="cursor:pointer">↗</span>
          <span class="muted">📊 ${U.compact(post.views || Math.round((post.likes || 0) * 12))}</span>
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
          { id: "feed", label: "Akış", icon: "🏠" },
          { id: "explore", label: "Keşfet", icon: "🔍" },
          { id: "notif", label: "Bildirimler", icon: "🔔" },
          { id: "mine", label: "Profilim", icon: "👤" }
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
      return `<button class="btn btn-ghost btn-sm" data-pact="new-post" style="align-self:flex-start">✏️ Gönderi Yaz</button>` +
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
          <button class="btn btn-sm btn-primary" data-pact="new-post">✏️ Gönderi Yaz</button>
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
      const body = K.ui.field("Ne düşünüyorsun?", `<textarea id="x-text" rows="3" placeholder="Bir şeyler yaz...">${U.escape(prefill || "")}</textarea>`)
        + (hashtag ? `<div class="hint">${U.escape(hashtag)} etiketi eklenecek.</div>` : "");
      K.ui.modal({
        title: "Gönderi Oluştur", body,
        actions: [
          { label: "Vazgeç" },
          { label: "Paylaş", cls: "btn-primary", onClick: () => {
            let text = U.qs("#x-text").value.trim();
            if (!text) { K.toast("Boş gönderi", "", "warn"); return false; }
            if (hashtag) text += " " + hashtag;
            K.social.createPost("x", text);
            K.state.player.x += Math.round(K.state.player.popularity * 1.2 + 5);
            K.toast("𝕏 Paylaşıldı", "", "ok");
            K.refresh();
          }}
        ]
      });
    },

    promotePicker() {
      const songs = K.state.player.songs;
      if (!songs.length) { K.toast("Şarkın yok", "Önce bir şarkı yayınla.", "warn"); return; }
      K.ui.actionSheet("X'te hangi şarkıyı paylaşmak istersin?",
        songs.map(s => ({ label: s.title, onClick: () => { K.social.promoteSong(s.id, "x"); K.refresh(); } })));
    }
  });
})(window.K);
