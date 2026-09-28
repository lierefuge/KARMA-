/* ============================================================
   KARMA — systems/playlists.js
   Kullanıcı çalma listeleri · çalma kuyruğu · şarkı çözümleyici
   (Spotify/Apple/YouTube uygulamaları ortak kullanır)
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* ---------------- KULLANICI ÇALMA LİSTELERİ ---------------- */
  K.playlists = {
    list() { const s = K.state; s.userPlaylists = s.userPlaylists || []; return s.userPlaylists; },
    byId(id) { return K.playlists.list().find(p => p.id === id); },

    create(name) {
      const s = K.state;
      const pl = { id: U.uid("upl"), name: name || ("Çalma listem " + (K.playlists.list().length + 1)), tracks: [], day: s.day };
      s.userPlaylists.push(pl);
      K.save();
      K.toast("🎵 Çalma listesi", pl.name + " oluşturuldu.", "ok");
      return pl;
    },

    add(plId, t) {
      const pl = K.playlists.byId(plId);
      if (!pl || !t) return false;
      if (pl.tracks.some(x => x.id === t.id)) { K.toast("Zaten ekli", t.title, "warn"); return false; }
      pl.tracks.push({ id: t.id, title: t.title, artistName: t.artistName, artistId: t.artistId || null, art: t.art || null, coverSeed: t.coverSeed || t.id });
      K.save();
      K.toast("＋ Eklendi", t.title + " → " + pl.name, "ok");
      return true;
    },

    remove(plId, trackId) {
      const pl = K.playlists.byId(plId);
      if (!pl) return false;
      pl.tracks = pl.tracks.filter(t => t.id !== trackId);
      K.save();
      return true;
    },

    del(plId) {
      K.state.userPlaylists = K.playlists.list().filter(p => p.id !== plId);
      K.save();
      return true;
    },

    /* platformdan bağımsız liste görünümü */
    open(plId, opts) {
      const pl = K.playlists.byId(plId);
      if (!pl) return;
      opts = opts || {};
      const rows = pl.tracks.map((t, i) => `<div class="sp-track">
        <span class="t-rank">${i + 1}</span>
        ${K.ui.cover(t.coverSeed || t.id, (t.title[0] || "?").toUpperCase(), 42, t.art)}
        <div class="grow" style="min-width:0" data-pact="pl-play" data-arg="${U.escape(t.id)}">
          <div class="t-name">${U.escape(t.title)}</div>
          <div class="t-artist">${U.escape(t.artistName || "")}</div>
        </div>
        <button class="t-more" data-pact="pl-more" data-arg="${U.escape(t.id)}">⋯</button>
      </div>`).join("");
      K.phone.pushView({
        title: pl.name, sub: pl.tracks.length + " şarkı",
        shellClass: opts.shellClass || "app-messages", musicBar: !!opts.musicBar,
        render: () => `
          <div class="pl-hero" style="background:linear-gradient(135deg,#2a2a35,#111)">
            <div class="pl-art">🎵</div>
            <div class="pl-meta"><div class="pl-name">${U.escape(pl.name)}</div><div class="pl-desc">${pl.tracks.length} şarkı · Sana ait</div></div>
          </div>
          <div class="action-row">
            <button class="btn btn-sm btn-primary" data-pact="pl-play-all">▶ Çal</button>
            <button class="btn btn-sm btn-ghost" data-pact="pl-del">🗑️ Sil</button>
          </div>
          ${rows || `<div class="mini-empty">Liste boş. Bir şarkının ⋯ menüsünden listeye ekle.</div>`}`,
        onAction: (act, el) => {
          if (act === "pl-play") { const t = K.tracks.resolve(el.dataset.arg); if (t) K.interactions.play(t); }
          else if (act === "pl-play-all") { if (pl.tracks[0]) K.interactions.play(pl.tracks[0]); }
          else if (act === "pl-more") K.tracks.actionSheet(el.dataset.arg);
          else if (act === "pl-del") { K.playlists.del(pl.id); K.toast("🗑️ Silindi", pl.name, "warn"); K.phone.back(); }
        }
      });
    },

    promptCreate(cb) {
      K.ui.modal({
        title: "Çalma listesi oluştur",
        desc: "Listene bir ad ver",
        body: `<input id="pl-name" value="Yeni Çalma Listem" style="width:100%;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;font-size:13px" />`,
        actions: [
          { label: "Oluştur", cls: "btn-primary", onClick: () => {
            const el = U.qs("#pl-name");
            const pl = K.playlists.create((el && el.value) || "Çalma listem");
            K.ui.closeModal();
            if (cb) cb(pl);
            if (K.phone) K.phone.reRender();
          } },
          { label: "İptal", cls: "btn-ghost" }
        ]
      });
    }
  };

  /* ---------------- ÇALMA KUYRUĞU ---------------- */
  K.queue = {
    list() { const s = K.state; s.queue = s.queue || []; return s.queue; },
    size() { return K.queue.list().length; },
    add(t) { K.queue.list().push(t); K.save(); K.toast("🕒 Sıraya eklendi", t.title, "ok"); },
    addNext(t) { K.queue.list().unshift(t); K.save(); K.toast("⏭ Sonra çalacak", t.title, "ok"); },
    shift() { const s = K.state; s.queue = K.queue.list(); const t = s.queue.shift(); K.save(); return t; },
    clear() { K.state.queue = []; K.save(); }
  };

  /* ---------------- ŞARKI ÇÖZÜMLEYİCİ + SATIR MENÜSÜ ---------------- */
  K.tracks = {
    resolve(id) {
      const mine = K.platforms.findSong(id);
      if (mine) return { id, title: mine.title, artistName: K.state.player.stageName, artistId: "player", art: null, coverSeed: mine.coverSeed };
      const ch = (K.state.chart || []).find(e => e.id === id);
      if (ch) return { id, title: ch.title, artistName: ch.artistName, artistId: ch.artistId, art: ch.art, coverSeed: ch.cover || ch.id };
      if (String(id).indexOf("music_") === 0) {
        const inner = String(id).slice(6);
        const e = (K.state.chart || []).find(x => x.id === inner) || (K.state.chart || [])[+inner];
        if (e) return { id, title: e.title, artistName: e.artistName, artistId: e.artistId, art: e.art, coverSeed: e.cover || id };
      }
      const parts = String(id).split("_s");
      const a = K.artistById(parts[0]);
      const list = a ? K.platforms.npcSongs(parts[0], 5) : [];
      const sg = list[+parts[1]];
      if (sg) return { id, title: sg.title, artistName: sg.artistName || a.stageName, artistId: parts[0], art: sg.art, coverSeed: sg.coverSeed };
      return { id, title: String(id), artistName: "", coverSeed: id };
    },

    play(t) { K.interactions.play(t); },

    /* satır "⋯" menüsü */
    actionSheet(id) {
      const t = K.tracks.resolve(id);
      const liked = K.interactions.isLiked(id);
      const items = [
        { label: "▶︎ Şimdi çal", onClick: () => { K.tracks.play(t); K.phone.reRender(); } },
        { label: "⏭ Sonra çal", onClick: () => K.queue.addNext(t) },
        { label: "🕒 Sıraya ekle", onClick: () => K.queue.add(t) },
        { label: liked ? "💔 Beğeniyi kaldır" : "♥ Beğen", onClick: () => { K.interactions.toggleLike(id); K.phone.reRender(); } }
      ];
      K.playlists.list().forEach(pl => {
        items.push({ label: "🎵 \"" + pl.name + "\" listesine ekle", onClick: () => { K.playlists.add(pl.id, t); K.phone.reRender(); } });
      });
      items.push({ label: "＋ Yeni çalma listesine ekle", onClick: () => {
        const pl = K.playlists.create();
        K.playlists.add(pl.id, t);
        K.phone.reRender();
      } });
      if (t.artistId && t.artistId !== "player") {
        items.push({ label: "🎤 " + t.artistName + " profiline git", onClick: () => {
          K.phone.openApp("spotify");
          setTimeout(() => { try { K.phone.appById("spotify").openArtist(t.artistId); } catch (e) {} }, 30);
        } });
      }
      items.push({ label: "✕ Kapat", onClick: () => {} });
      K.ui.actionSheet(t.title, items);
    }
  };
})(window.K = window.K || {});
