/* ============================================================
   KARMA — systems/interactions.js
   Ortak etkileşim katmanı: beğeni, takip, abone, kaydetme,
   şimdi çalıyor, yorumlar ve bildirimler.
   Tüm uygulamalar bu katmanı kullanır (kalıcıdır).
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  const COMMENT_USERS = ["melis_", "kaan1903", "rapsever61", "ayse.y", "beatmaker_tr", "gece_kusu",
    "34istanbul", "xanax_rap", "muzikdelisi", "sokak_sairi", "sessizdinleyici", "trapzone",
    "yildizkaymas", "kirmizigoz", "duman34", "kalpsiz_34", "velet_2005", "basshead_tr"];
  const COMMENT_TEXTS = [
    "bu şarkı çok iyi ya 🔥", "sabah akşam dinliyorum", "beat efsane olmuş",
    "nakarat kafamda dönüyor", "Türkçe rap sonunda hak ettiği yerde",
    "kimse konuşmuyor ama bu iş büyük", "albüm baştan sona sağlam",
    "sesi çok temiz, prodüksiyon iyi", "sözler yürekten", "mix mükemmel",
    "bu adam hak ettiğini alacak", "playlistime ekledim", "keşke daha erken keşfetseydim",
    "konserde söylemek lazım bunu", "flow deli", "klip de çok iyi",
    "bu ses trend olmalı", "söz yazarlığı üst seviye", "her dinlediğimde başka bir şey buluyorum",
    "sound'u eskisi gibi ama gelişmiş", "adamsın 👑",
    "kimse beğenmemiş ama ben sevdim", "overrated bence ama fena değil",
    "bu iş patlar", "algoritma bunu görmüyor, yazık", "sahne performansı ayrı güzel"
  ];

  K.interactions = {
    _p() {
      const p = K.state.player;
      p.likes = p.likes || {};
      p.follows = p.follows || {};
      p.subs = p.subs || {};
      p.saved = p.saved || {};
      p.reposts = p.reposts || {};
      if (typeof p.notifsRead === "number") p.notifsRead = {};
      p.notifsRead = p.notifsRead || {};
      p.notifsSeenIds = p.notifsSeenIds || {};
      return p;
    },

    /* ---------------- beğeni ---------------- */
    isLiked(key) { return !!K.interactions._p().likes[key]; },
    likeCount(key, base) { return (base || 0) + (K.interactions.isLiked(key) ? 1 : 0); },
    toggleLike(key) {
      const p = K.interactions._p();
      if (p.likes[key]) { delete p.likes[key]; return false; }
      p.likes[key] = K.state.day;
      return true;
    },
    likedSongs() {
      const p = K.interactions._p();
      return Object.keys(p.likes).map(k => {
        const found = K.platforms.searchSongs("").find(s => s.id === k);
        return found || { id: k, title: k, artistName: "Bilinmiyor", streams: 0 };
      });
    },

    /* ---------------- takip / abone ---------------- */
    isFollowed(id) { return !!K.interactions._p().follows[id]; },
    toggleFollow(id) {
      const p = K.interactions._p();
      const a = K.artistById(id);
      if (p.follows[id]) { delete p.follows[id]; return false; }
      p.follows[id] = K.state.day;
      if (a) {
        if (K.relation(id).met || K.relation(id).discovered) K.relations.addAffinity(id, 1.2, "takip");
        K.toast("✅ Takip edildi", a.stageName, "ok");
      }
      return true;
    },
    followedArtists() {
      const p = K.interactions._p();
      return Object.keys(p.follows).map(id => K.artistById(id)).filter(Boolean);
    },

    isSubbed(id) { return !!K.interactions._p().subs[id]; },
    toggleSub(id) {
      const p = K.interactions._p();
      const a = K.artistById(id);
      if (p.subs[id]) { delete p.subs[id]; return false; }
      p.subs[id] = K.state.day;
      if (a) K.toast("🔔 Abone olundu", a.stageName + " kanalına abone oldun.", "ok");
      return true;
    },

    /* ---------------- kaydet ---------------- */
    isSaved(id) { return !!K.interactions._p().saved[id]; },
    toggleSave(id) {
      const p = K.interactions._p();
      if (p.saved[id]) { delete p.saved[id]; return false; }
      p.saved[id] = K.state.day;
      return true;
    },

    /* ---------------- yeniden paylaşım (repost / retweet) ---------------- */
    isReposted(key) { return !!K.interactions._p().reposts[key]; },
    toggleRepost(key) {
      const p = K.interactions._p();
      if (p.reposts[key]) { delete p.reposts[key]; return false; }
      p.reposts[key] = K.state.day;
      return true;
    },
    repostCount(key, base) { return (base || 0) + (K.interactions.isReposted(key) ? 1 : 0); },

    /* kullanıcının kendi yorumunu ekle (kalıcı) */
    addComment(seed, text, user) {
      const s = K.state;
      s._comments = s._comments || {};
      const list = s._comments[seed] = s._comments[seed] || [];
      const c = { user: user || s.player.stageName, mine: true, text: text, likes: 1, day: s.day };
      list.unshift(c);
      if (list.length > 40) list.length = 40;
      K.save();
      return c;
    },

    /* ============================================================
       v10.66 — ÇALMA KUYRUĞU · KARIŞTIR · TEKRAR
       Spotify'ın temel davranışları: sıradaki şarkı, karıştırma sırası ve
       tekrar modu. Durum modül içinde tutulur (save'e yazılmaz, oturumluk).
       ============================================================ */
    _q: { list: [], idx: -1, shuffle: false, repeat: "off", order: [] },

    queueState() {
      const q = K.interactions._q;
      return {
        size: q.list.length,
        index: q.idx,
        shuffle: q.shuffle,
        repeat: q.repeat,
        current: q.list[q.idx] || null,
        upcoming: K.interactions.queueUpcoming(3)
      };
    },

    queueUpcoming(n) {
      const q = K.interactions._q;
      if (!q.list.length) return [];
      const seq = q.order.length ? q.order : q.list.map((_, i) => i);
      const pos = seq.indexOf(q.idx);
      const out = [];
      for (let i = 1; i <= (n || 3); i++) {
        let p2 = pos + i;
        if (p2 >= seq.length) {
          if (q.repeat === "off") break;
          p2 = p2 % seq.length;
        }
        const tr = q.list[seq[p2]];
        if (tr) out.push(tr);
      }
      return out;
    },

    /* deterministik karıştırma: aynı gün + aynı liste → aynı sıra */
    _shuffleOrder(n) {
      let seed = ((K.state.day || 1) * 2654435761 + n * 97) >>> 0;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const arr = [];
      for (let i = 0; i < n; i++) arr.push(i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },

    setQueue(tracks, startIndex) {
      const q = K.interactions._q;
      q.list = (tracks || []).filter(Boolean).slice(0, 200);
      q.idx = Math.max(0, Math.min(q.list.length - 1, Number(startIndex) || 0));
      q.order = q.shuffle ? K.interactions._shuffleOrder(q.list.length) : [];
      return K.interactions.queueState();
    },

    enqueue(track) {
      const q = K.interactions._q;
      if (!track || !track.title) return null;
      q.list.push(track);
      if (q.idx < 0) q.idx = 0;
      if (q.shuffle) q.order = K.interactions._shuffleOrder(q.list.length);
      return K.interactions.queueState();
    },

    clearQueue() {
      const q = K.interactions._q;
      q.list = []; q.idx = -1; q.order = [];
      return K.interactions.queueState();
    },

    toggleShuffle() {
      const q = K.interactions._q;
      q.shuffle = !q.shuffle;
      q.order = q.shuffle ? K.interactions._shuffleOrder(q.list.length) : [];
      return q.shuffle;
    },

    cycleRepeat() {
      const q = K.interactions._q;
      q.repeat = q.repeat === "off" ? "all" : q.repeat === "all" ? "one" : "off";
      return q.repeat;
    },

    _playQueueAt(i) {
      const q = K.interactions._q;
      const tr = q.list[i];
      if (!tr) return null;
      q.idx = i;
      K.interactions.play(tr);
      return tr;
    },

    next(opts) {
      const q = K.interactions._q;
      if (!q.list.length) return null;
      if (q.repeat === "one" && opts && opts.auto) return K.interactions._playQueueAt(q.idx);
      const seq = q.order.length ? q.order : q.list.map((_, i) => i);
      const pos = seq.indexOf(q.idx);
      let npos = pos + 1;
      if (npos >= seq.length) {
        if (q.repeat === "off") return null;
        npos = 0;
      }
      return K.interactions._playQueueAt(seq[npos]);
    },

    prev() {
      const q = K.interactions._q;
      if (!q.list.length) return null;
      const seq = q.order.length ? q.order : q.list.map((_, i) => i);
      const pos = seq.indexOf(q.idx);
      let ppos = pos - 1;
      if (ppos < 0) ppos = (q.repeat === "off" ? pos : seq.length - 1);
      return K.interactions._playQueueAt(seq[ppos]);
    },

    /* şarkı sözü satırları (sahne → düz satır → tema yedeği) */
    lyricLines(song) {
      const sg = song || {};
      let lines = [];
      const secs = sg.lyrics && sg.lyrics.sections;
      if (secs && typeof secs === "object") {
        ["intro", "verse", "hook", "chorus", "bridge", "outro"].forEach(k => {
          if (Array.isArray(secs[k])) secs[k].forEach(x => { if (typeof x === "string" && x.trim()) lines.push(x.trim()); });
        });
      }
      if (!lines.length && sg.lyrics && Array.isArray(sg.lyrics.lines)) {
        lines = sg.lyrics.lines.filter(x => typeof x === "string" && x.trim());
      }
      if (!lines.length && sg.lyricTheme && K.lyricThemeById) {
        const th = K.lyricThemeById(sg.lyricTheme);
        if (th && Array.isArray(th.lines)) lines = th.lines.slice();
      }
      return lines.length ? lines : ["(bu parça için söz görünmüyor)"];
    },

    /* ============================================================
       v10.66 — YOUTUBE: yorum beğenisi · yorum yanıtı · abone zili
       ============================================================ */
    commentLikeState(key, idx) {
      const m = ((K.state.player || {}).cmtLikes || {})[key] || {};
      return !!m[idx];
    },

    toggleCommentLike(key, idx) {
      const p = K.state.player;
      p.cmtLikes = p.cmtLikes || {};
      const m = p.cmtLikes[key] = p.cmtLikes[key] || {};
      m[idx] = !m[idx];
      K.save();
      return m[idx];
    },

    commentReplies(key) {
      return (((K.state.player || {}).cmtReplies || {})[key]) || [];
    },

    addCommentReply(key, idx, text) {
      const p = K.state.player;
      p.cmtReplies = p.cmtReplies || {};
      const arr = p.cmtReplies[key] = p.cmtReplies[key] || [];
      const t = String(text || "").trim().slice(0, 160);
      if (!t) return null;
      arr.push({ to: idx, user: p.stageName, text: t, day: K.state.day });
      if (arr.length > 40) arr.splice(0, arr.length - 40);
      K.save();
      return arr[arr.length - 1];
    },

    toggleSubBell(channelId) {
      const p = K.state.player;
      p.ytBell = p.ytBell || {};
      p.ytBell[channelId] = !p.ytBell[channelId];
      K.save();
      return p.ytBell[channelId];
    },

    hasSubBell(channelId) {
      return !!(((K.state.player || {}).ytBell || {})[channelId]);
    },

    /* ---------------- şimdi çalıyor ---------------- */
    play(track) {
      K.state.player.nowPlaying = {
        id: track.id, title: track.title, artistName: track.artistName,
        art: track.art || null, src: track.src || "spotify", day: K.state.day
      };
      K.bus.emit("nowplaying", K.state.player.nowPlaying);
      // gerçek ses önizlemesi başlat (Web Audio ile üretilir)
      const ok = K.audio ? K.audio.play(track) : false;
      K.toast(ok ? "▶️ Önizleme çalıyor" : "⏸ Önizleme",
        track.title + " · " + track.artistName + (ok ? "" : " (bu ortamda ses desteklenmiyor)"),
        ok ? "ok" : "warn");
    },
    stop() {
      K.state.player.nowPlaying = null;
      K.bus.emit("nowplaying", null);
    },
    nowPlaying() { return K.state.player.nowPlaying || null; },

    /* ---------------- yorumlar ---------------- */
    commentsFor(seed, count) {
      const s = K.state;
      s._comments = s._comments || {};
      const n = count || 5;
      const existing = s._comments[seed] || [];
      // sanatçı yorumları (artist:true) ve oyuncunun kendi yorumları korunur, üstte kalır
      const artistComments = existing.filter(c => c.artist || c.mine);
      if (existing.length >= n) return existing;
      const h = U.hashHue(seed || "x");
      const out = artistComments.slice();
      for (let i = out.length; i < n; i++) {
        out.push({
          user: COMMENT_USERS[(h + i * 7) % COMMENT_USERS.length],
          text: COMMENT_TEXTS[(h * 3 + i * 11) % COMMENT_TEXTS.length],
          likes: (h + i * 13) % 900 + 3,
          day: Math.max(1, s.day - ((h + i * 5) % 9))
        });
      }
      s._comments[seed] = out;
      return out;
    },

    /* bir sanatçının yorumunu ekle (sosyal yorumlarda görünür) */
    addArtistComment(seed, artistId, text, meta) {
      const s = K.state;
      s._comments = s._comments || {};
      const a = K.artistById(artistId);
      const list = s._comments[seed] = s._comments[seed] || [];
      const c = {
        user: a ? a.stageName : "Sanatçı",
        artistId,
        artist: true,
        text: text,
        kind: (meta && meta.kind) || null,
        likes: Math.round(((a ? a.popularity : 50) || 50) * U.rand(20, 260)),
        day: s.day,
        songId: (meta && meta.songId) || null
      };
      list.unshift(c);
      if (list.length > 40) list.length = 40;
      return c;
    },

    /* ============================================================
       BİLDİRİMLER — UYGULAMA BAŞINA
       Her uygulama YALNIZCA kendi bildirimlerini gösterir ve her
       bildirim TIKLANABİLİR (profile / gönderi / şarkı / DM gider).
       ============================================================ */
    appNotifStore() {
      const s = K.state;
      s.appNotifs = s.appNotifs || { instagram: [], tiktok: [], youtube: [], x: [] };
      return s.appNotifs;
    },

    /* sistemlerin ürettiği kalıcı bildirim (ör. sanatçı seni takip etti) */
    pushAppNotif(app, n) {
      const store = K.interactions.appNotifStore();
      const item = Object.assign({ id: U.uid("an"), day: K.state.day, icon: "•", kind: "info" }, n, { app: app });
      (store[app] = store[app] || []).unshift(item);
      if (store[app].length > 60) store[app].length = 60;
      K.bus.emit("notif:new", { app: app, n: item });
      return item;
    },

    /* uygulamanın bildirimleri (app verilmezse hepsi) */
    notifications(app) {
      const s = K.state;
      const out = [];
      const day = s.day;
      const followed = K.interactions.followedArtists();
      const pool = followed.length ? followed : K.artistList();
      const apps = app ? [app] : ["instagram", "tiktok", "x"];
      const lastSong = (s.player.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];

      apps.forEach((ap, k) => {
        const h = U.hashHue(String(day) + ap);
        const pickA = i => pool[(h + i * 7 + k * 3) % Math.max(1, pool.length)];
        if (ap === "instagram") {
          const a1 = pickA(1);
          if (a1) out.push({ app: ap, id: "igfol" + day, kind: "follow", icon: "👤", who: a1.stageName,
            text: "seni takip etmeye başladı", day, action: { type: "profile", artistId: a1.id } });
          if (lastSong) out.push({ app: ap, id: "iglike" + lastSong.id + day, kind: "like", icon: "❤️",
            who: U.compact(Math.round((lastSong.streams || 0) * 0.01) + 18) + " kişi",
            text: `gönderini beğendi: "${lastSong.title}"`, day, action: { type: "song", songId: lastSong.id } });
          const a2 = pickA(3);
          if (a2) out.push({ app: ap, id: "igcmt" + day, kind: "comment", icon: "💬", who: a2.stageName,
            text: "gönderine yorum yaptı: “bu iş sağlam 🔥”", day, action: { type: "profile", artistId: a2.id } });
          out.push({ app: ap, id: "igstory" + day, kind: "story", icon: "👁️",
            who: U.compact(Math.round((s.player.ig || 0) * 0.06)) + " kişi",
            text: "hikayeni görüntüledi", day, action: { type: "story" } });
        } else if (ap === "tiktok") {
          const a1 = pickA(2);
          if (a1) out.push({ app: ap, id: "ttfol" + day, kind: "follow", icon: "👥", who: a1.stageName,
            text: "seni TikTok'ta takip etti", day, action: { type: "profile", artistId: a1.id } });
          if (lastSong) out.push({ app: ap, id: "ttlike" + day, kind: "like", icon: "❤️",
            who: U.compact(Math.round((lastSong.streams || 0) * 0.02) + 40) + " kişi",
            text: `videonu beğendi · ses: "${lastSong.title}"`, day, action: { type: "song", songId: lastSong.id } });
          if (lastSong) out.push({ app: ap, id: "ttsound" + day, kind: "sound", icon: "🎵",
            who: U.compact(Math.round((lastSong.streams || 0) * 0.004) + 25) + " video",
            text: `"${lastSong.title}" sesini kullandı`, day, action: { type: "song", songId: lastSong.id } });
          const a3 = pickA(5);
          if (a3) out.push({ app: ap, id: "ttduet" + day, kind: "duet", icon: "🎬", who: a3.stageName,
            text: "seninle duet yaptı", day, action: { type: "profile", artistId: a3.id } });
        } else if (ap === "x") {
          const a1 = pickA(4);
          if (a1) out.push({ app: ap, id: "xfol" + day, kind: "follow", icon: "👤", who: a1.stageName,
            text: "seni takip etti", day, action: { type: "profile", artistId: a1.id } });
          if (lastSong) out.push({ app: ap, id: "xrt" + day, kind: "repost", icon: "🔁",
            who: U.compact(Math.round((lastSong.streams || 0) * 0.004) + 12) + " kişi",
            text: `gönderini yeniden paylaştı: "${lastSong.title}"`, day, action: { type: "song", songId: lastSong.id } });
        }
      });

      /* teklifler (DM ile ilgili) */
      (s.offers || []).filter(o => o && o.status === "pending").slice(0, 4).forEach(o => {
        const a = o.artistId ? K.artistById(o.artistId) : null;
        out.push({
          app: "instagram", id: "off_" + o.id, kind: o.type,
          icon: o.type === "feature" ? "🎵" : o.type === "hangout" ? "🎉" : "🏢",
          who: a ? a.stageName : (o.terms && o.terms.labelName) || "Şirket",
          text: o.type === "feature" ? "sana feature teklif etti"
            : o.type === "hangout" ? "seni takılmaya davet etti"
            : "sözleşme teklif ediyor",
          day: o.day, action: { type: "dm", artistId: o.artistId || null }
        });
      });

      /* kalıcı olay bildirimleri (sistemlerin ürettiği) */
      const store = K.interactions.appNotifStore();
      (app ? [app] : Object.keys(store)).forEach(ap => {
        (store[ap] || []).forEach(n => {
          /* v10.62.2 — bozuk/eski kayıt hijyeni: null girdi veya eksik
             `app` alanı (eski kayıt) bildirim listesini bozmasın. */
          if (!n || typeof n !== "object") return;
          if (!n.app) n.app = ap;
          out.push(n);
        });
      });

      const list = app ? out.filter(n => n.app === app) : out;
      return list.sort((a, b) => (b.day || 0) - (a.day || 0)).slice(0, 40);
    },

    unreadNotifications(app) {
      const p = K.interactions._p();
      p.notifsRead = p.notifsRead || {};
      const total = K.interactions.notifications(app).length;
      const seen = p.notifsRead[app || "all"] || 0;
      p.notifsSeenIds = p.notifsSeenIds || {};
      const ids = p.notifsSeenIds[app || "all"] || [];
      if (seen && !ids.length) return Math.max(0, total - seen);
      const fresh = K.interactions.notifications(app).filter(n => ids.indexOf(n.id) < 0).length;
      return Math.max(0, fresh || Math.max(0, total - seen));
    },

    markNotifsRead(app) {
      const p = K.interactions._p();
      p.notifsRead = p.notifsRead || {};
      p.notifsSeenIds = p.notifsSeenIds || {};
      const list = K.interactions.notifications(app);
      p.notifsRead[app || "all"] = list.length;
      p.notifsSeenIds[app || "all"] = list.map(n => n.id).slice(0, 80);
    }
  };
})(window.K);
