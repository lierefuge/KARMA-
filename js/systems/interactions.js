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
