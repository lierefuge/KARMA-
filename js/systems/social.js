/* ============================================================
   KARMA — systems/social.js
   Instagram / TikTok / X / YouTube sosyal katmanı:
   gönderi oluşturma, şarkı tanıtımı (promosyon), etkileşim,
   NPC akışı ve viral/trend etkisi.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  const IG_CAPTIONS = [
    "Yeni iş yolda 🎧", "Stüdyo günleri 🎙️", "Bu akşam kayıt var 🔥",
    "Sabırla çalışıyoruz 💜", "Yakında... ⏳", "Ses seviyesi yüksek 🎚️"
  ];
  const X_POSTS = [
    "Yeni bir şey üzerinde çalışıyorum, iyi geliyor.",
    "Bu sektörde sağlam kalmak zor ama müzik her şeyi anlatıyor.",
    "Yakında sürpriz var. Takipte kalın.",
    "Stüdyodan çıktım, kulaklarım hâlâ çınlıyor.",
    "Beat seçmek de bir sanat, anlayan anlar."
  ];
  const TT_CAPTIONS = [
    "Bu ses kafanı kırar 🔥", "Part 2 geliyor 🎬", "Snippet test 🎧",
    "Trend olacak gibi 👀", "Yorumlara bekliyorum 💬"
  ];

  K.social = {

    /* ---------------- promo tanımları ---------------- */
    PROMOS: {
      instagram: { name: "Instagram", boost: 0.11, viral: 0.02, reach: 1.0, icon: "📸" },
      tiktok:    { name: "TikTok",    boost: 0.17, viral: 0.09, reach: 1.5, icon: "🎵" },
      x:         { name: "X",         boost: 0.08, viral: 0.03, reach: 0.8, icon: "𝕏" },
      youtube:   { name: "YouTube",   boost: 0.13, viral: 0.04, reach: 1.2, icon: "▶️" }
    },

    /* ---------------- şarkıyı sosyalde tanıt ---------------- */
    promoteSong(songId, platform) {
      const song = K.platforms.findSong(songId);
      if (!song) return;
      const promo = K.social.PROMOS[platform];
      if (!promo) return;
      if (song.socialPromo && song.socialPromo[platform]) {
        K.toast("Zaten paylaşıldı", `"${song.title}" bu platformda tanıtıldı.`, "warn");
        return;
      }
      song.socialPromo = song.socialPromo || {};
      song.socialPromo[platform] = K.state.day;

      // boost uygula
      const prM = (K.team && K.team.bonus) ? K.team.bonus().promo : 1;   // PR uzmanı promo etkisi
      const prBoost = promo.boost * prM;
      song.boosts[platform + "_social"] = (song.boosts[platform + "_social"] || 0) + prBoost;
      song.dailyStreams *= (1 + prBoost * 0.6);
      song.marketing = (song.marketing || 0) + 2000;

      // viral şans
      if (U.chance(promo.viral + song.quality / 900)) {
        K.game.markViral(song, "🔥 Viral!", `"${song.title}" ${promo.name}'da patladı!`);
      }

      // TikTok ise kısa video keşif hunisini besle (ses trendi)
      if (platform === "tiktok" && K.shortform && K.shortform.onPromote) K.shortform.onPromote(song);

      // oyuncu gönderisi oluştur
      K.social.createPost(platform, K.social.captionFor(platform, song), song.id);

      K.toast(promo.icon + " Paylaşıldı", `"${song.title}" ${promo.name}'da tanıtıldı.`, "ok");
      K.save(); K.refresh();
    },

    captionFor(platform, song) {
      if (platform === "instagram") return `Yeni şarkı "${song.title}" şimdi yayında 🎧 #${(song.genre || "muzik")} #yenimuzik`;
      if (platform === "x") return `"${song.title}" çıktı. Dinleyin, ne düşünüyorsunuz? 🎵`;
      if (platform === "tiktok") return `"${song.title}" ile bir bölüm hazırladım 🔥 #fyp`;
      if (platform === "youtube") return `"${song.title}" (Official) yayında! Abone olmayı unutmayın.`;
      return song.title;
    },

    /* ---------------- gönderi oluştur (oyuncu) ---------------- */
    createPost(platform, text, songId) {
      const s = K.state;
      const p = s.player;
      const post = {
        id: U.uid("post"),
        platform,
        authorId: "player",
        authorName: p.stageName,
        text: text || U.pick(platform === "x" ? X_POSTS : platform === "tiktok" ? TT_CAPTIONS : IG_CAPTIONS),
        day: s.day,
        likes: Math.round(20 + p.popularity * U.rand(5, 20)),
        comments: Math.round(p.popularity * U.rand(0.3, 1.5)),
        shares: Math.round(p.popularity * U.rand(0.2, 1.2)),
        songId: songId || null,
        mine: true
      };
      (s.feed[platform] = s.feed[platform] || []).unshift(post);
      K.bus.emit("social:post", post);
      return post;
    },

    /* ---------------- yayınlanan şarkıyı otomatik duyur ---------------- */
    onRelease(song) {
      K.social.createPost("instagram", `"${song.title}" tüm platformlarda yayında! 🎶 Şimdi dinleyin.`, song.id);
      K.social.createPost("x", `Yeni single "${song.title}" çıktı. Destek olun 🙏`, song.id);
      // bazı işler kısa videoda organik olarak tutar (ses trendi kendiliğinden başlar)
      if (K.shortform && U.chance(0.30 + ((song.viralBonus || 1) - 1) * 0.3)) K.shortform.onPromote(song);
      // basın: yayın sonrası "ilk dinleme" eleştirisi (imaj/itibar)
      if (K.press && K.press.onRelease) K.press.onRelease(song);
      // MAHALLE / SEMT ÇEVRESİ yeni şarkıya somut tepki verir (DM)
      if (K.contacts && K.contacts.releasePrompt) setTimeout(() => { try { K.contacts.releasePrompt(song); } catch (e) {} }, 1200);

      // GERÇEKLİK: sen tanınmıyorken ünlü sanatçılar sosyal akışta seni anmaz.
      // Yalnızca erişilebilir seviyeye gelince ve senin seviyende/altındaki isimler tepki verir.
      const p = K.state.player;
      if ((p.popularity || 0) >= 15) {
        const n = 1 + (U.chance(0.55) ? 1 : 0) + (U.chance(0.2) ? 1 : 0);
        for (let i = 0; i < n; i++) {
          setTimeout(() => { try { K.social.reactToSong(song); } catch (e) {} }, 1500 + i * 2400);
        }
      }
    },

    /* ---------------- başka bir sanatçının şarkıya tepkisi ---------------- */
    reactToSong(song, opts) {
      const s = K.state, p = s.player;
      if (!song) return null;
      const pool = (K.artistList() || []).filter(x => x.popularity <= (K.state.player.popularity || 0) * 1.2 + 12);
      const a = (opts && opts.artistId) ? K.artistById(opts.artistId) : (pool.length ? U.pick(pool) : null);
      if (!a) return null;
      const q = song.quality || 50;
      let kind = q >= 72 ? "praise" : q >= 50 ? "neutral" : "shade";
      if (U.chance(0.18)) kind = kind === "praise" ? "shade" : "praise"; // sürpriz tepki
      const text = (K.chat && K.chat.reaction) ? K.chat.reaction(a.id, kind, song) : `"${song.title}" çıkmış, dinleyin.`;
      // sosyal bildirim: sanatçı gönderinle etkileşti (tıklanabilir)
      if (K.interactions && K.interactions.pushAppNotif) {
        K.interactions.pushAppNotif("instagram", {
          kind: kind === "praise" ? "like" : kind === "shade" ? "comment" : "info",
          icon: kind === "praise" ? "❤️" : kind === "shade" ? "💬" : "🔔",
          who: a.stageName, text: kind === "praise" ? "gönderini beğendi" : kind === "shade" ? "gönderine yorum yaptı" : "gönderinle ilgilendi",
          action: { type: "profile", artistId: a.id }
        });
      }
      const platform = U.chance(0.55) ? "x" : "instagram";
      const post = {
        id: U.uid("post"), platform, authorId: a.id, authorName: a.stageName,
        text, day: s.day,
        likes: Math.round(a.popularity * U.rand(60, 700)),
        comments: Math.round(a.popularity * U.rand(2, 30)),
        shares: Math.round(a.popularity * U.rand(1, 20)),
        songId: song.id, mine: false, reaction: true, reactionKind: kind
      };
      (s.feed[platform] = s.feed[platform] || []).unshift(post);
      s.feed[platform] = s.feed[platform].slice(0, 60);

      // --- SOSYAL YORUMLAR: sanatçının yorumu şarkının yorumlarında da görünür ---
      if (K.interactions && K.interactions.addArtistComment) {
        K.interactions.addArtistComment("yt_" + song.id, a.id, text, { kind, songId: song.id });
        const xPost = (s.feed.x || []).find(pp => pp.mine && pp.songId === song.id);
        if (xPost) K.interactions.addArtistComment("x_" + xPost.id, a.id, text, { kind, songId: song.id });
        const igPost = (s.feed.instagram || []).find(pp => pp.mine && pp.songId === song.id);
        if (igPost) K.interactions.addArtistComment("ig_" + igPost.id, a.id, text, { kind, songId: song.id });
      }
      // şarkıya tepki kaydı (profil/kariyer için)
      song.reactions = song.reactions || [];
      song.reactions.unshift({ artistId: a.id, artistName: a.stageName, kind, text, day: s.day });
      if (song.reactions.length > 15) song.reactions.length = 15;

      // şöhret / popülerlik / takipçi etkisi
      if (kind === "praise") {
        p.popularity = U.clamp(p.popularity + 0.5, 0, 99);
        p.ig = Math.round(p.ig + a.popularity * 18 + 500);
        p.tiktok = Math.round(p.tiktok + a.popularity * 12 + 300);
        p.reputation = U.clamp(p.reputation + 0.3, 0, 100);
      } else if (kind === "shade") {
        p.popularity = U.clamp(p.popularity + 0.3, 0, 99); // tartışma da görünürlük
        p.reputation = U.clamp(p.reputation - 0.6, 0, 100);
      } else {
        p.popularity = U.clamp(p.popularity + 0.15, 0, 99);
      }
      if (K.relations && K.relations.reach(a.id) > 0.15) {
        K.relations.addAffinity(a.id, 0.5, "tepki:" + kind);
      }
      const verb = kind === "praise" ? "övdü" : kind === "shade" ? "eleştirdi" : "bahsetti";
      K.toast("💬 " + a.stageName, `"${song.title}" işini ${verb}.`, kind === "shade" ? "warn" : "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "💬 " + a.stageName, msg: `${a.stageName}, "${song.title}" işini ${verb}.`,
        kind: kind === "shade" ? "warn" : "ok", day: s.day
      }]).slice(-60);
      K.bus.emit("social:reaction", { post, artistId: a.id, songId: song.id, kind });
      K.save();
      return post;
    },

    /* ---------------- akış ---------------- */
    /* opts.followedOnly → yalnızca takip ettiğin hesaplar + kendi gönderilerin */
    feedFor(platform, opts) {
      opts = opts || {};
      const s = K.state;
      s.feed[platform] = s.feed[platform] || [];
      // NPC gönderileri yoksa oluştur
      if (s.feed[platform].filter(p => !p.mine).length < 12) {
        K.social.seedFeed(platform);
      }
      let list = s.feed[platform].slice();
      if (opts.followedOnly) {
        const ids = K.interactions.followedArtists().map(a => a.id);
        list = list.filter(p => p.mine || ids.indexOf(p.authorId) >= 0);
      }
      return list.sort((a, b) => (b.day || 0) - (a.day || 0)).slice(0, opts.limit || 40);
    },

    /* takip etmediğin, sana yakın seviyedeki sanatçılar (önerilen) */
    suggestedArtists(platform, n) {
      const ids = K.interactions.followedArtists().map(a => a.id);
      const pop = Math.max(15, K.state.player.popularity || 0);
      return K.artistList()
        .filter(a => ids.indexOf(a.id) < 0)
        .sort((a, b) => Math.abs(a.popularity - pop) - Math.abs(b.popularity - pop))
        .slice(0, n || 6);
    },

    seedFeed(platform) {
      const s = K.state;
      const artists = K.artistList();
      const texts = platform === "x" ? X_POSTS : platform === "tiktok" ? TT_CAPTIONS : IG_CAPTIONS;
      const arr = s.feed[platform] = s.feed[platform] || [];
      for (let i = 0; i < 14; i++) {
        const a = U.pick(artists);
        arr.push({
          id: U.uid("post"), platform, authorId: a.id, authorName: a.stageName,
          text: U.pick(texts), day: s.day - U.randInt(0, 6),
          likes: Math.round(a.popularity * U.rand(80, 900)),
          comments: Math.round(a.popularity * U.rand(4, 60)),
          shares: Math.round(a.popularity * U.rand(2, 40)),
          songId: null, mine: false
        });
      }
      arr.sort((a, b) => b.day - a.day);
    },

    /* ---------------- günlük tick ---------------- */
    dailyTick() {
      const s = K.state;
      // gönderi etkileşimi büyür
      Object.keys(s.feed).forEach(pf => {
        (s.feed[pf] || []).forEach(post => {
          const growth = post.mine ? (0.05 + s.player.popularity / 900) : 0.03;
          post.likes = Math.round(post.likes * (1 + growth) + U.rand(0, 5));
          post.comments = Math.round(post.comments * (1 + growth * 0.7));
          post.shares = Math.round(post.shares * (1 + growth * 0.5));
        });
        // yeni NPC gönderileri
        if (U.chance(0.7)) {
          const a = U.pick(K.artistList());
          const texts = pf === "x" ? X_POSTS : pf === "tiktok" ? TT_CAPTIONS : IG_CAPTIONS;
          (s.feed[pf] = s.feed[pf] || []).unshift({
            id: U.uid("post"), platform: pf, authorId: a.id, authorName: a.stageName,
            text: U.pick(texts), day: s.day,
            likes: Math.round(a.popularity * U.rand(80, 900)),
            comments: Math.round(a.popularity * U.rand(4, 60)),
            shares: Math.round(a.popularity * U.rand(2, 40)),
            songId: null, mine: false
          });
          s.feed[pf] = s.feed[pf].slice(0, 60);
        }
      });

      // oyuncunun şarkısı viral ise ekstra görünürlük
      s.player.songs.forEach(song => {
        if (song.viral) song.marketing = (song.marketing || 0) + 500;
      });

      // başka sanatçılar yeni/yakın tarihli şarkıya tepki verebilir
      if (s.player.songs.length && U.chance(0.22)) {
        const latest = s.player.songs.slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];
        if (latest && (s.day - (latest.publishedDay || 0)) <= 21) K.social.reactToSong(latest);
      }
    },

    /* ---------------- platform görünürlük özeti ---------------- */
    visibilityScore() {
      const p = K.state.player;
      const social = p.ig + p.tiktok + p.x + p.ytSubs;
      const streams = p.streams;
      return Math.round(Math.sqrt(social) * 2 + Math.sqrt(streams) * 1.5);
    }
  };
})(window.K);
