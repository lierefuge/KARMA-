/* Shared phone actions: real in-game sharing, clipboard and feed preferences. */
(function (K) {
  "use strict";
  const U = K.util;
  K.socialActions = {
    prefs() {
      const p = K.state.player;
      p.socialPrefs = p.socialPrefs || {};
      p.socialPrefs.hidden = p.socialPrefs.hidden || {};
      p.socialPrefs.blocked = p.socialPrefs.blocked || {};
      return p.socialPrefs;
    },
    visible(platform, item) {
      const p = K.socialActions.prefs();
      return !(p.hidden[platform] || []).includes(item.id) && !(p.blocked[platform] || []).includes(item.authorId || item.channelId);
    },
    hide(platform, id) {
      const p = K.socialActions.prefs();
      p.hidden[platform] = Array.from(new Set((p.hidden[platform] || []).concat(id))).slice(-200);
      K.save(); K.phone.reRender();
      K.toast("Akıştan gizlendi", "Akış tercihleri bölümünden geri alabilirsin.", "");
    },
    preferences(platform) {
      K.phone.pushView({ title: "Akış tercihleri", shellClass: "app-" + platform,
        render: () => `<div class="empty-note"><b>Gizlenen içerikler</b>${(K.socialActions.prefs().hidden[platform] || []).length} içerik akışından gizlendi.</div><button class="btn" data-pact="reset-hidden">Gizlenenleri tekrar göster</button>`,
        onAction: act => { if (act === "reset-hidden") { K.socialActions.prefs().hidden[platform] = []; K.save(); K.phone.reRender(); } }
      });
    },
    async copy(text) {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(text);
        K.toast("Kopyalandı", "Paylaşım metni panoya kopyalandı.", "ok");
      } catch (_) {
        K.ui.modal({ title: "Paylaşım metni", body: `<label class="field">Metni seçip kopyalayabilirsin<textarea readonly rows="4">${U.escape(text)}</textarea></label>`, actions: [{ label: "Tamam" }] });
      }
    },
    share(platform, item) {
      if (!item) return;
      const text = `${item.authorName || item.channel || K.state.player.stageName}: ${item.text || item.title || ""}`;
      K.phone.pushView({ title: "Paylaş", shellClass: "app-" + platform,
        render: () => `<div class="social-share-preview">${U.escape(text)}</div>
          <button class="social-menu-row" data-pact="copy-share">Paylaşım metnini kopyala <span>↗</span></button>
          <button class="social-menu-row" data-pact="send-share">Mesajla gönder <span>›</span></button>
          ${platform === "x" ? '<button class="social-menu-row" data-pact="quote-share">Alıntıla <span>›</span></button>' : ''}
          <button class="social-menu-row" data-pact="hide-share">Bu içerikle ilgilenmiyorum <span>−</span></button><button class="social-menu-row" data-pact="feed-preferences">Akış tercihleri <span>›</span></button>`,
        onAction: act => {
          if (act === "feed-preferences") K.socialActions.preferences(platform);
          else if (act === "copy-share") K.socialActions.copy(text);
          else if (act === "send-share") K.socialActions.sendPicker(text);
          else if (act === "quote-share") K.phone.appById("x").quotePost(item.id);
          else if (act === "hide-share") { K.phone.back(); K.socialActions.hide(platform, item.id); }
        }
      });
    },
    sendPicker(text) {
      let sent = false;
      const list = K.contacts.list().concat(K.interactions.followedArtists());
      const people = list.filter((a, i) => list.findIndex(b => b.id === a.id) === i);
      K.phone.pushView({ title: "Mesajla gönder", shellClass: "social-picker",
        render: () => `<p class="muted">Bir alıcı seç</p>` + people.map(a => `<button class="social-person" data-pact="send-person" data-arg="${U.escape(a.id)}">${K.ui.artistAvatar(a.id, 36, true)}<span>${U.escape(a.stageName)}</span><span>Gönder</span></button>`).join(""),
        onAction: (act, el) => {
          if (act !== "send-person" || sent) return;
          const before = K.state.player.messagesSentToday;
          K.relations.sendMessage(el.dataset.arg, text);
          if (K.state.player.messagesSentToday === before) return;
          sent = true; K.save(); K.phone.back(); K.toast("Mesaj gönderildi", "Paylaştığın içerik sohbete eklendi.", "ok");
        }
      });
    },
    comments(key, title) {
      K.phone.pushView({ title: "Yorumlar", sub: title || "", shellClass: "social-comments",
        render: () => K.interactions.commentsFor(key, 6).map(c => `<div class="social-comment">${K.ui.avatar(c.user, 30, true)}<div><b>${U.escape(c.user)}</b><p>${U.escape(c.text)}</p></div></div>`).join(""),
        composer: '<form class="social-comment-form"><input data-social-comment maxlength="500" aria-label="Yorum yaz" placeholder="Yorum ekle…"><button type="button" data-pact="send-comment">Gönder</button></form>',
        onAction: act => {
          if (act !== "send-comment") return;
          const input = document.querySelector('[data-social-comment]');
          if (!input || !input.value.trim()) return;
          K.interactions.addComment(key, input.value.trim()); K.phone.reRender();
        },
        onMountFull: root => { const form = root.querySelector('form'); if (form) form.addEventListener('submit', e => { e.preventDefault(); form.querySelector('button').click(); }); }
      });
    }
  };
})(window.K);
