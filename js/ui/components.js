/* ============================================================
   KARMA — ui/components.js
   Toast, modal, avatar ve ortak UI yardımcıları.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  K.ui = {
    /* ---------------- toasts ---------------- */
    initToasts() {
      const stack = U.qs("#toast-stack");
      K.bus.on("toast", ({ title, msg, kind }) => {
        const el = U.el("div", "toast " + (kind || ""));
        el.innerHTML = `<div class="toast-title">${U.escape(title || "")}</div>` +
          (msg ? `<div class="toast-msg">${U.escape(msg)}</div>` : "");
        stack.appendChild(el);
        setTimeout(() => {
          el.classList.add("removing");
          setTimeout(() => el.remove(), 320);
        }, 4200);
        while (stack.children.length > 5) stack.firstChild.remove();
      });
    },

    /* ---------------- modal ---------------- */
    modal({ title, desc, body, actions, wide, className }) {
      const root = U.qs("#modal-root");
      root.innerHTML = "";
      root.classList.add("open");

      const back = U.el("div", "modal-backdrop");
      const box = U.el("div", "modal" + (wide ? " modal-wide" : "") + (className ? " " + className : ""));
      box.innerHTML = `
        <div class="modal-head">
          <h3>${U.escape(title || "")}</h3>
          ${desc ? `<p>${U.escape(desc)}</p>` : ""}
        </div>
        <div class="modal-body"></div>
        <div class="modal-foot"></div>`;

      const bodyEl = U.qs(".modal-body", box);
      if (typeof body === "string") bodyEl.innerHTML = body;
      else if (body) bodyEl.appendChild(body);

      const foot = U.qs(".modal-foot", box);
      (actions || []).forEach(a => {
        const b = U.el("button", "btn " + (a.cls || "btn-ghost"), a.label);
        b.addEventListener("click", () => {
          if (a.onClick) {
            const keep = a.onClick(bodyEl);
            if (keep === false) return;
          }
          if (a.close !== false) K.ui.closeModal();
        });
        foot.appendChild(b);
      });

      back.appendChild(box);
      back.addEventListener("click", e => { if (e.target === back) K.ui.closeModal(); });
      root.appendChild(back);
      return { root, box, bodyEl };
    },

    closeModal() {
      const root = U.qs("#modal-root");
      root.classList.remove("open");
      root.innerHTML = "";
    },

    /* ---------------- confirm ---------------- */
    confirm(title, desc, onYes, yesLabel) {
      K.ui.modal({
        title, desc,
        actions: [
          { label: "Vazgeç" },
          { label: yesLabel || "Onayla", cls: "btn-primary", onClick: onYes }
        ]
      });
    },

    /* ---------------- avatar ---------------- */
    // Gerçek görsel varsa fotoğraf, yoksa gradyan + baş harfler
    avatar(name, size, round) {
      const s = size || 44;
      const url = K.imagery && K.imagery.byName ? K.imagery.byName(name) : null;
      if (url && url !== "__none__") {
        const style = `width:${s}px;height:${s}px;background-color:${U.colorFor(name || "x")};` +
          `background-image:url('${url}');background-size:cover;background-position:center;` +
          (round ? "border-radius:50%;" : "");
        return `<div class="avatar" style="${style}"></div>`;
      }
      const bg = U.gradientFor(name || "x");
      const style = `width:${s}px;height:${s}px;font-size:${Math.round(s * 0.36)}px;background:${bg};` +
        (round ? "border-radius:50%;" : "");
      return `<div class="avatar" style="${style}">${U.escape(U.initials(name))}</div>`;
    },

    // artistId ile doğrudan (oyuncu dahil)
    artistAvatar(artistId, size, round) {
      if (artistId === "player" || !artistId) {
        const p = K.state.player;
        return K.ui.avatar(p.stageName, size, round);
      }
      const url = K.imagery.byArtistId(artistId);
      const a = K.artistById(artistId);
      const nm = a ? a.stageName : "?";
      if (url && url !== "__none__") {
        const s = size || 44;
        const style = `width:${s}px;height:${s}px;background-color:${U.colorFor(nm)};` +
          `background-image:url('${url}');background-size:cover;background-position:center;` +
          (round ? "border-radius:50%;" : "");
        return `<div class="avatar" style="${style}"></div>`;
      }
      return K.ui.avatar(nm, size, round);
    },

    // kapak: gerçek albüm kapağı varsa onu, yoksa gradyan
    cover(seed, letter, size, artUrl) {
      const s = size || 46;
      if (artUrl) {
        return `<div class="cover" style="width:${s}px;height:${s}px;background-image:url('${artUrl}');background-size:cover;background-position:center"></div>`;
      }
      const str = String(seed == null ? "" : seed);
      if (str.indexOf("cv~") === 0) {
        const uri = K.coverSVG(str);
        return `<div class="cover" style="width:${s}px;height:${s}px;background-image:url('${uri}');background-size:cover;background-position:center"></div>`;
      }
      const bg = K.coverGradient(str);
      return `<div class="cover" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.4)}px;background:${bg}">${U.escape(letter || "")}</div>`;
    },

    /* ---------------- mağaza içi listeler ----------------
       Bir mağazada oyuncunun girdiği listeler + yeni çıkanlar.
       Spotify / Apple Music / YouTube sayfalarında kullanılır. */
    storeLists(platform) {
      if (!K.lists || !K.state || !K.state.player) return "";
      const p = K.state.player;
      const entries = K.lists.forPlatform(platform);
      const news = K.lists.newReleases(45, 4);
      const entryHTML = entries.length
        ? entries.map(r => `<div class="sl-row">
            <span class="sl-ic">${r.icon}</span>
            <div class="grow"><b>${U.escape(r.name)}</b><span>${U.escape(r.song.title)} · ~${r.rank}. sıra · ${r.days}. gün</span></div>
            <span class="sl-badge karma">listede</span>
          </div>`).join("")
        : `<div class="sl-empty">Bu mağazadaki listelere henüz girmedin. Liste girişi yayın performansına bağlıdır.</div>`;
      const newsHTML = news.length
        ? news.map(sg => `<div class="sl-row">
            ${K.ui.cover(sg.coverSeed, (sg.title[0] || "?").toUpperCase(), 34)}
            <div class="grow"><b>${U.escape(sg.title)}</b><span>${U.escape(p.stageName)} · ${(K.lists.storesFor(sg).length || 0)} mağaza</span></div>
            <span class="sl-badge ok">yeni</span>
          </div>`).join("")
        : `<div class="sl-empty">Son 45 günde yayınlanan iş yok.</div>`;
      return `
        <div class="store-lists">
          <div class="sl-head">${U.escape(platform)} listelerin</div>
          ${entryHTML}
          <div class="sl-head" style="margin-top:8px">Yeni çıkanlar</div>
          ${newsHTML}
        </div>`;
    },

    /* ---------------- affinity bar ---------------- */
    affinityBar(artistId) {
      const rel = K.relation(artistId);
      const next = K.nextStageFor(rel.affinity);
      const label = K.stageFor(rel.affinity);
      if (!rel.discovered && !rel.met) {
        return `<div class="dm-affinity" style="flex-direction:row;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--text-3)">Samimiyet gizli · iletişim kur</span>
        </div>`;
      }
      return `<div class="dm-affinity">
        <div class="dm-affinity-top">
          <span class="lv">${U.escape(label.label)}</span>
          <span class="val">${Math.round(rel.affinity)}/100</span>
        </div>
        <div class="bar"><i style="width:${rel.affinity}%"></i></div>
        ${next ? `<div class="next-unlock">Sıradaki: ${U.escape(next.label)} (${next.min}) · ${U.escape(next.desc)}</div>`
          : `<div class="next-unlock">Maksimum seviyeye ulaşıldı.</div>`}
      </div>`;
    },

    /* ---------------- field builders ---------------- */
    field(label, inputHTML, hint) {
      return `<div class="field"><label>${U.escape(label)}</label>${inputHTML}${hint ? `<span class="hint">${U.escape(hint)}</span>` : ""}</div>`;
    },

    /* ---------------- bildirim merkezi ---------------- */
    notificationsView() {
      const U = K.util;
      const all = (K.state.notifications || []).slice().reverse();
      const list = all.slice(0, 50);
      return {
        title: "Bildirimler",
        sub: list.length + " kayıt · seni başka yere sürüklemez",
        shellClass: "app-messages",
        navRight: list.length ? `<button class="mini-btn" data-pact="clear-notifs">Temizle</button>` : "",
        render: () => list.length
          ? list.map(n => `<div class="x-notif">
              <div class="xf-icon ${U.escape(n.kind || "")}">🔔</div>
              <div class="grow">
                <div class="xf-text"><b>${U.escape(n.title || "")}</b> ${U.escape(n.msg || "")}</div>
                <div class="xf-day">${U.ago(n.day || 1, K.state.day)}</div>
              </div>
            </div>`).join("")
          : `<div class="empty-note"><b>Bildirim yok</b>Gün geçtikçe olaylar buraya düşer — seni başka yere sürüklemez.</div>`,
        onAction: (act) => {
          if (act === "clear-notifs") { K.state.notifications = []; K.toast("🔔 Temizlendi", "", "ok"); K.phone.reRender(); }
        }
      };
    },

    /* ---------------- canlı yayın görünümü ---------------- */
    liveView() {
      const U = K.util;
      const L = K.livestream.info();
      const platform = (L && L.platform) === "tiktok" ? "TikTok Live" : "Instagram Live";
      return {
        title: "Canlı Yayın",
        sub: platform,
        appIdLive: true,
        shellClass: "app-instagram",
        render: () => {
          const l = K.livestream.info() || { viewers: 0, peak: 0, followers: 0, donations: 0, energy: 100, reactions: [] };
          return `
            <div class="live-top">
              <span class="live-badge"><span class="live-dot"></span> CANLI</span>
              <span class="muted">${U.escape(platform)}</span>
              <span class="grow"></span>
              <span class="muted" id="lv-energy">${Math.round(l.energy)}% enerji</span>
            </div>
            <div class="live-stats">
              <div class="live-stat"><div class="k">İzleyici</div><div class="v" id="lv-viewers">${U.fmt(l.viewers)}</div></div>
              <div class="live-stat"><div class="k">Tepe</div><div class="v" id="lv-peak">${U.fmt(l.peak)}</div></div>
              <div class="live-stat"><div class="k">Bağış</div><div class="v" id="lv-don">${U.money(Math.round(l.donations))}</div></div>
            </div>
            <div class="live-stats" style="grid-template-columns:1fr;margin-top:8px">
              <div class="live-stat"><div class="k">Yeni Takipçi</div><div class="v" id="lv-followers">+${U.fmt(Math.round(l.followers))}</div></div>
            </div>
            <div class="live-reactions" id="lv-reactions">
              ${(l.reactions || []).slice(0, 12).map(x => `<div class="live-reaction"><b>${U.escape(x.user)}</b><span>${U.escape(x.text)}</span></div>`).join("")}
            </div>
            <div class="live-actions">
              <button data-pact="lv-sing">🎤 Şarkı Söyle</button>
              <button data-pact="lv-rap">🔥 Freestyle</button>
              <button data-pact="lv-qa">💬 Soru Cevap</button>
              <button data-pact="lv-guest">🤝 Konuk Al</button>
              <button data-pact="lv-shout">👋 Selam Ver</button>
              <button data-pact="lv-end" style="background:rgba(255,59,92,0.22);border-color:rgba(255,59,92,0.4)">⏹ Bitir</button>
            </div>`;
        },
        onMountFull: (vp) => {
          if (K.ui._liveTimer) { clearInterval(K.ui._liveTimer); K.ui._liveTimer = null; }
          K.ui._liveTimer = setInterval(() => {
            const top = K.phone.views[K.phone.views.length - 1];
            if (!top || !top.appIdLive || !K.livestream.isLive()) {
              clearInterval(K.ui._liveTimer); K.ui._liveTimer = null; return;
            }
            const l = K.livestream.info();
            const set = (sel, val) => { const el = vp.querySelector(sel); if (el) el.textContent = val; };
            set("#lv-viewers", U.fmt(l.viewers));
            set("#lv-peak", U.fmt(l.peak));
            set("#lv-don", U.money(Math.round(l.donations)));
            set("#lv-followers", "+" + U.fmt(Math.round(l.followers)));
            set("#lv-energy", Math.round(l.energy) + "% enerji");
            const r = vp.querySelector("#lv-reactions");
            if (r) r.innerHTML = (l.reactions || []).slice(0, 12).map(x => `<div class="live-reaction"><b>${U.escape(x.user)}</b><span>${U.escape(x.text)}</span></div>`).join("");
          }, 1000);
        },
        onAction: (act) => {
          const map = { "lv-sing": "sing", "lv-rap": "rap", "lv-qa": "qa", "lv-guest": "guest", "lv-shout": "shout" };
          if (map[act]) K.livestream.interact(map[act]);
          else if (act === "lv-end") {
            if (K.ui._liveTimer) { clearInterval(K.ui._liveTimer); K.ui._liveTimer = null; }
            K.livestream.end();
            K.phone.back();
          }
        }
      };
    },

    /* ---------------- diskografi bölümü ---------------- */
    discographySection(artistId, pactName) {
      /* v10.16 — tembel veri katmanı (P-1) */
      const disc = K.lazy ? K.lazy.discography(artistId) : ((K.DISCOGRAPHY && K.DISCOGRAPHY[artistId]) || []);
      if (!disc.length) return "";
      return K.ui.section("Diskografi", `<span class="muted">${disc.length} yayın</span>`) +
        disc.map(al => `<div class="p-row" data-pact="${pactName}" data-arg="${U.escape(al.title)}">
          ${K.ui.cover("al_" + al.title, "💿", 52, al.art)}
          <div class="grow">
            <div class="p-title">${U.escape(al.title)}</div>
            <div class="p-sub">${U.escape(al.type)} · ${U.escape(al.year)} · ${al.tracks.length} şarkı</div>
          </div>
          <span style="color:var(--text-3)">›</span>
        </div>`).join("");
    },

    /* ---------------- bölüm başlığı ---------------- */
    section(title, right) {
      return `<div class="ui-section"><span class="ui-sec-title">${U.escape(title)}</span>${right || ""}</div>`;
    },

    /* ---------------- beğeni butonu ---------------- */
    likeBtn(key, base, cls) {
      const on = K.interactions && K.interactions.isLiked(key);
      return `<button class="like-btn ${on ? "on" : ""} ${cls || ""}" data-pact="like" data-arg="${U.escape(key)}">${on ? "♥" : "♡"}</button>`;
    },

    /* ---------------- şimdi çalıyor çubuğu ---------------- */
    musicBar(appId) {
      const np = K.interactions && K.interactions.nowPlaying();
      if (!np) return "";
      const on = K.audio && K.audio.isPlaying();
      const art = np.art
        ? `<div class="mb-art" style="background-image:url('${np.art}');background-size:cover"></div>`
        : `<div class="mb-art" style="background:${U.gradientFor(np.title)}"></div>`;
      return `<div class="music-bar" data-pact="nowplaying">
        ${art}
        <div class="mb-info">
          <div class="mb-title">${U.escape(np.title)}</div>
          <div class="mb-artist">${U.escape(np.artistName)}</div>
          <div class="mb-prog"><i data-mb-prog style="width:0%"></i></div>
        </div>
        <button class="mb-btn" data-pact="np-toggle">${on ? "⏸" : "▶"}</button>
        <button class="mb-btn" data-pact="np-next">⏭</button>
      </div>`;
    },

    /* ---------------- ses görselleştirici bağlayıcı ---------------- */
    startViz(canvas, shouldContinue) {
      if (!canvas) return () => {};
      let ctx2d = null;
      try { ctx2d = canvas.getContext ? canvas.getContext("2d") : null; } catch (e) { ctx2d = null; }
      let raf = null;
      const draw = () => {
        if (shouldContinue && !shouldContinue()) { raf = null; return; }
        if (ctx2d) {
          const A = K.audio, an = A && A.analyser ? A.analyser() : null;
          const W = canvas.width, H = canvas.height;
          ctx2d.clearRect(0, 0, W, H);
          const bars = 52, bw = W / bars;
          let data = null;
          if (an) { try { data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data); } catch (e) { data = null; } }
          for (let i = 0; i < bars; i++) {
            const v = data ? data[Math.floor(i * data.length / bars)] / 255
              : ((A && A.isPlaying && A.isPlaying()) ? 0.10 + Math.random() * 0.07 : 0.05);
            const h = Math.max(3, v * H * 0.95);
            ctx2d.fillStyle = "rgba(" + Math.round(255 - v * 60) + "," + Math.round(60 + v * 120) + "," + Math.round(90 + v * 100) + ",0.9)";
            ctx2d.fillRect(i * bw + 1, H - h, bw - 2, h);
          }
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      return () => { if (raf) cancelAnimationFrame(raf); };
    },

    fmtTime(sec) {
      const s = Math.max(0, Math.floor(sec || 0));
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    },

    /* ---------------- şarkı önizleme / oynatıcı ekranı ---------------- */
    playerView() {
      const np = K.interactions.nowPlaying();
      const A = K.audio;
      const song = (A && A.current()) || np || { title: "—", artistName: "" };
      const genreName = (K.genreById(song.genre) || {}).name || "—";
      return {
        title: "Şimdi Çalıyor",
        sub: "önizleme · " + genreName,
        shellClass: "app-spotify",
        render: () => {
          const on = A && A.isPlaying();
          const art = song.art
            ? `<div class="pv-art" style="background-image:url('${song.art}');background-size:cover"></div>`
            : `<div class="pv-art" style="background:${U.gradientFor(song.title)}"><span>♫</span></div>`;
          return `
            ${art}
            <div class="pv-meta">
              <div class="pv-title">${U.escape(song.title || "—")}</div>
              <div class="pv-artist">${U.escape(song.artistName || "")}</div>
              <div class="pv-tags">
                <span class="pill karma">${U.escape(genreName)}</span>
                <span class="pill">kalite ${song.quality || 50}</span>
                <span class="pill">${(A && A.supported()) ? "🎧 ses açık" : "🔇 ses desteklenmiyor"}</span>
              </div>
            </div>
            <canvas class="pv-viz" width="600" height="120" data-pv-viz></canvas>
            <div class="pv-prog"><i data-pv-prog style="width:0%"></i></div>
            <div class="pv-controls">
              <button class="pv-btn" data-pact="np-restart">⏮</button>
              <button class="pv-btn main" data-pact="np-toggle">${on ? "⏸" : "▶"}</button>
              <button class="pv-btn" data-pact="np-next">⏭</button>
            </div>
            <div class="pv-vol">
              <span>🔈</span>
              <input type="range" min="0" max="100" value="${Math.round((A ? A.volume() : 0.3) * 100)}" data-pv-vol />
              <span>🔊</span>
            </div>
            <div class="bio-box">
              Bu <b>temsilî bir önizlemedir</b>: şarkının türüne, kalitesine ve yapısına göre
              tarayıcıda <b>canlı olarak üretilir</b> (808, kick, hi-hat, clap, cowbell, akor, melodi).
              Gerçek kayıt değildir; dışa ses dosyası indirilmez.
            </div>`;
        },
        onMountFull: (vp) => {
          const canvas = vp.querySelector("[data-pv-viz]");
          const progEl = vp.querySelector("[data-pv-prog]");
          const vol = vp.querySelector("[data-pv-vol]");
          if (vol) vol.addEventListener("input", () => { if (K.audio) K.audio.setVolume(+vol.value / 100); });
          if (K.ui._pvRaf) cancelAnimationFrame(K.ui._pvRaf);
          let ctx2d = null;
          try { ctx2d = canvas && canvas.getContext ? canvas.getContext("2d") : null; } catch (e) { ctx2d = null; }
          const draw = () => {
            const top = K.phone.views[K.phone.views.length - 1];
            if (!top || !top.title || top.title !== "Şimdi Çalıyor") { K.ui._pvRaf = null; return; }
            if (progEl && K.audio) progEl.style.width = (K.audio.progress() * 100).toFixed(1) + "%";
            if (ctx2d && canvas) {
              const A2 = K.audio, an = A2 && A2.analyser();
              const W = canvas.width, H = canvas.height;
              ctx2d.clearRect(0, 0, W, H);
              const bars = 48, bw = W / bars;
              let data = null;
              if (an) { data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data); }
              for (let i = 0; i < bars; i++) {
                const v = data ? data[Math.floor(i * data.length / bars)] / 255 : (A2 && A2.isPlaying() ? 0.12 + Math.random() * 0.06 : 0.06);
                const h = Math.max(3, v * H * 0.92);
                ctx2d.fillStyle = "rgba(" + Math.round(176 + v * 60) + "," + Math.round(108 + v * 120) + ",255,0.85)";
                ctx2d.fillRect(i * bw + 1, H - h, bw - 2, h);
              }
            }
            K.ui._pvRaf = requestAnimationFrame(draw);
          };
          K.ui._pvRaf = requestAnimationFrame(draw);
        },
        onAction: (act) => {
          if (act === "np-toggle") {
            if (K.audio && !K.audio.isPlaying()) K.audio.play(K.interactions.nowPlaying() || {});
            else if (K.audio) K.audio.stop();
            K.phone.reRender();
          } else if (act === "np-restart") {
            if (K.audio) K.audio.play(K.interactions.nowPlaying() || {});
            K.phone.reRender();
          }
        }
      };
    },

    /* ---------------- action sheet ---------------- */
    actionSheet(title, options) {
      const root = U.qs("#modal-root");
      root.innerHTML = "";
      root.classList.add("open");
      const back = U.el("div", "modal-backdrop");
      back.style.placeItems = "end center";
      const sheet = U.el("div", "sheet");
      sheet.style.position = "relative";
      sheet.style.bottom = "auto";
      sheet.style.left = "auto";
      sheet.style.right = "auto";
      sheet.style.width = "min(360px,92vw)";
      sheet.innerHTML = `<div class="sheet-title">${U.escape(title || "")}</div>`;
      options.forEach(o => {
        const b = U.el("button", o.cls || "", o.label);
        b.addEventListener("click", () => {
          K.ui.closeModal();
          if (o.onClick) o.onClick();
        });
        sheet.appendChild(b);
      });
      const cancel = U.el("button", "cancel", "Vazgeç");
      cancel.addEventListener("click", K.ui.closeModal);
      sheet.appendChild(cancel);
      back.appendChild(sheet);
      back.addEventListener("click", e => { if (e.target === back) K.ui.closeModal(); });
      root.appendChild(back);
    }
  };
})(window.K);
