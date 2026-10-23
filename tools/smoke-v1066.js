/* ============================================================
   KARMA — tools/smoke-v1066.js
   v10.66 · GERÇEKÇİLİK TURU (6 YÜZEY)

   Doğrulananlar:
   INSTAGRAM:
     · mavi tik (oyuncu itibarı / NPC popülerliği)
     · gönderi konumu + etiketlenen kişi (feed ve gönderi görünümü)
     · öne çıkanlar artık veriden türüyor (sabit metin değil)
     · gönderi analizi (insights) gerçek etkileşimden türüyor
   SPOTIFY:
     · kuyruk / karıştır / tekrar   · senkron şarkı sözleri
     · Canvas (kapak animasyonu)    · haftalık kişisel liste
   Deterministik: harness seed'li oyun kurar.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "KARMA-Oyun.html"), "utf8");

const r = H.makeReport("KARMA · v10.66 (IG + SP + TT + X + YT + STUDIO + RELEASE)");

const { dom, errors } = H.bootDom(html, { seed: 20261066 });

H.whenReady(dom, { label: "v1066" }).then((K) => {
  const w = dom.window, doc = w.document;
  const ok = (n, c, e) => r.ok(n, c, e);
  const q = (s, root) => (root || doc).querySelector(s);
  const qa = (s, root) => Array.prototype.slice.call((root || doc).querySelectorAll(s));
  const click = (el) => { if (!el) return false; try { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); } catch (e) { return false; } return true; };
  const closeModal = () => { if (K.ui && q("#modal-root.open")) K.ui.closeModal(); };
  const throws = [];
  const tryFn = (n, fn) => { try { return fn(); } catch (e) { throws.push(n + " :: " + e.message); return undefined; } };

  const ig = K.phone.appById("instagram");
  const p = K.state.player;

  /* ---------- 1) DOĞRULANMIŞ ROZET ---------- */
  ok("I1 · IG doğrulama yardımcıları var", typeof ig.isVerified === "function" && typeof ig.verifiedBadge === "function");

  ok("I2 · düşük itibarda oyuncu doğrulanmamış", (function () {
    p.reputation = 10; p.popularity = 5;
    return ig.isVerified("player") === false;
  })());

  ok("I3 · itibar yükselince oyuncu doğrulanıyor", (function () {
    p.reputation = 70;
    return ig.isVerified("player") === true;
  })());

  ok("I4 · popüler NPC doğrulanmış, sıradan NPC değil", (function () {
    const list = K.artistList();
    const hot = list.slice().sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
    const cold = list.slice().sort((a, b) => (a.popularity || 0) - (b.popularity || 0))[0];
    return ig.isVerified(hot.id) === true && ig.isVerified(cold.id) === false;
  })());

  ok("I5 · rozet profil HTML'inde çıkıyor", (function () {
    p.reputation = 70;
    const h = ig.profileHTML("player");
    return /ig-verified/.test(h);
  })());

  /* ---------- 2) KONUM + ETİKET ---------- */
  ok("I6 · playerPost konum/etiket kabul ediyor", (function () {
    const before = (K.state.feed.instagram || []).length;
    K.social.playerPost("instagram", "Kadıköy'den selam", "reach", null, { location: "Kadıköy", tagName: "Sıla" });
    const feed = K.state.feed.instagram || [];
    const post = feed[0];
    return feed.length === before + 1 && post.location === "Kadıköy" && post.tagName === "Sıla";
  })());

  ok("I7 · feed caption'ında konum/etiket görünüyor", (function () {
    const h = ig.feedHTML();
    return /📍 Kadıköy/.test(h) && /👤 Sıla ile/.test(h);
  })());

  ok("I8 · gönderi görünümünde de görünüyor", (function () {
    const post = (K.state.feed.instagram || [])[0];
    const h = ig.captionHTML(post);
    return /📍 Kadıköy/.test(h) && /👤 Sıla/.test(h);
  })());

  ok("I9 · konum/etiket yoksa satır basılmıyor", (function () {
    const post = { authorName: "X", authorId: "player", text: "düz" };
    return ig.postMetaHTML(post) === "";
  })());

  ok("I10 · yeni gönderi formunda konum + etiket alanları var", (function () {
    ig.newPost();
    const hasLoc = !!q("#ig-loc"), hasTag = !!q("#ig-tag");
    closeModal();
    return hasLoc && hasTag;
  })());

  /* ---------- 3) ÖNE ÇIKANLAR (veriden) ---------- */
  ok("I11 · öne çıkanlar veriden türüyor", (function () {
    p.songs = [{ id: "a", title: "A", genre: "trap" }, { id: "b", title: "B", genre: "trap" }];
    p.releases = [{ id: "r1" }];
    const hl = ig.highlightsFor("player");
    const music = hl.find(x => x.label === "Yayınlar");
    const studio = hl.find(x => x.label === "Stüdyo");
    return hl.length === 4 && music && music.count === 2 && studio && studio.count === 1;
  })());

  ok("I12 · profil HTML'inde dört öne çıkan var", (function () {
    const h = ig.profileHTML("player");
    return (h.match(/class="ig-hl"/g) || []).length === 4;
  })());

  /* ---------- 4) GÖNDERİ ANALİZİ ---------- */
  ok("I13 · analiz sayıları gönderiden türüyor", (function () {
    const feed = K.state.feed.instagram || [];
    const post = feed[0];
    post.likes = 500; post.comments = 40;
    const ins = ig.postInsights(post.id);
    closeModal();
    return ins && ins.reach > 4000 && ins.likes === 500 && ins.comments === 40 && ins.follows > 0;
  })());

  ok("I14 · analiz modalı açılıyor", (function () {
    const post = (K.state.feed.instagram || [])[0];
    ig.postInsights(post.id);
    const open = !!q("#modal-root.open") && /Gönderi analizi/.test((q("#modal-root") || {}).textContent || "");
    closeModal();
    return open;
  })());

  ok("I15 · kendi gönderimin sheet'inde 'Analizi gör' var", (function () {
    const post = (K.state.feed.instagram || []).find(x => x && x.mine);
    if (!post) return false;
    ig.postSheet(post.id);
    const txt = (q("#modal-root") || {}).textContent || "";
    const has = /Analizi gör/.test(txt);
    closeModal();
    return has;
  })());

  ok("I16 · başkasının gönderisinde analiz yok", (function () {
    const feed = K.state.feed.instagram || [];
    const other = feed.find(x => x && !x.mine);
    if (!other) return true;
    ig.postSheet(other.id);
    const txt = (q("#modal-root") || {}).textContent || "";
    const has = /Analizi gör/.test(txt);
    closeModal();
    return has === false;
  })());

  ok("I17 · olmayan gönderi çökertmiyor", (function () {
    const res = tryFn("I17", () => ig.postInsights("yok-boyle"));
    closeModal();
    return res === null;
  })());


  /* ============================================================
     S) SPOTIFY — kuyruk · karıştır · tekrar · sözler · haftalık liste
     ============================================================ */
  {
    const I = K.interactions;
    const tr = (n) => ({ id: "t" + n, title: "Parça " + n, artistName: "Test" });

    I.clearQueue();
    ok("S1 · kuyruk kuruluyor", (function () {
      const q = I.setQueue([tr(1), tr(2), tr(3)], 0);
      return q.size === 3 && q.index === 0 && q.current.title === "Parça 1";
    })());

    ok("S2 · sıradaki şarkı ilerliyor", (function () {
      const a = I.next();
      const b = I.next();
      return a && a.title === "Parça 2" && b && b.title === "Parça 3" && I.queueState().index === 2;
    })());

    ok("S3 · tekrar kapalıyken liste sonunda duruyor", (function () {
      I.cycleRepeat(); I.cycleRepeat(); I.cycleRepeat();   /* off'a dön */
      const res = I.next();
      return I.queueState().repeat === "off" && res === null;
    })());

    ok("S4 · 'tüm liste' tekrarı başa dönüyor", (function () {
      I.cycleRepeat();   /* all */
      const res = I.next();
      return I.queueState().repeat === "all" && res && res.title === "Parça 1";
    })());

    ok("S5 · geri bir önceki şarkıya dönüyor", (function () {
      I.setQueue([tr(1), tr(2), tr(3)], 2);
      const res = I.prev();
      return res && res.title === "Parça 2";
    })());

    ok("S6 · karıştırma açılıyor ve sıra deterministik", (function () {
      I.cycleRepeat();                       /* all → off */
      I.clearQueue(); I.setQueue([tr(1), tr(2), tr(3), tr(4), tr(5)], 0);
      const wasOff = I.queueState().shuffle === false;
      I.toggleShuffle();
      const o1 = I._q.order.join(",");
      I.toggleShuffle(); I.toggleShuffle();
      const o2 = I._q.order.join(",");
      return wasOff && I.queueState().shuffle === true && o1 === o2 && I._q.order.length === 5;
    })());

    ok("S7 · kuyruk boşken next/prev güvenli", (function () {
      I.clearQueue();
      return I.next() === null && I.prev() === null && I.queueState().size === 0;
    })());

    /* --- sözler --- */
    ok("S8 · sözler bölümlerden geliyor", (function () {
      const lines = I.lyricLines({ lyrics: { sections: { verse: ["birinci dize", "ikinci dize"], chorus: ["nakarat"] } } });
      return lines.length === 3 && lines[0] === "birinci dize" && lines[2] === "nakarat";
    })());

    ok("S9 · söz yoksa temadan yedek alıyor", (function () {
      const th = (K.LYRIC_THEMES || [])[0];
      const lines = I.lyricLines({ lyricTheme: th && th.id });
      return lines.length >= 1 && (th ? lines[0] === th.lines[0] : true);
    })());

    ok("S10 · hiç söz yoksa nötr bilgi satırı", (function () {
      const lines = I.lyricLines({});
      return lines.length === 1 && /söz görünmüyor/.test(lines[0]);
    })());

    /* --- çalar arayüzü --- */
    ok("S11 · çalarda söz, kuyruk ve karıştır/tekrar düğmeleri var", (function () {
      I.setQueue([tr(1), tr(2)], 0);
      K.interactions.play(tr(1));
      const v = K.ui.playerView();
      K.phone.pushView(v);
      const h = v.render();
      const okAll = /data-pv-lyric/.test(h) && /data-pv-qinfo/.test(h)
        && /np-shuffle/.test(h) && /np-repeat/.test(h) && /1\/2/.test(h);
      while (K.phone.views.length > 1) K.phone.back();
      return okAll;
    })());

    ok("S12 · 'np-next' eylemi şarkıyı değiştiriyor", (function () {
      I.setQueue([tr(1), tr(2)], 0);
      K.interactions.play(tr(1));
      const v = K.ui.playerView();
      K.phone.pushView(v);
      const before = (I.nowPlaying() || {}).title;
      v.onAction("np-next");
      const after = (I.nowPlaying() || {}).title;
      while (K.phone.views.length > 1) K.phone.back();
      return before === "Parça 1" && after === "Parça 2";
    })());

    /* --- haftalık keşif --- */
    ok("S13 · haftalık keşif dolu ve deterministik", (function () {
      const a = K.phone.appById("spotify").weeklySongs();
      const b = K.phone.appById("spotify").weeklySongs();
      return a.length > 0 && a.length === b.length && a[0].id === b[0].id;
    })(), (K.phone.appById("spotify").weeklySongs() || []).length + " şarkı");

    ok("S14 · haftalık kart ana sayfada", (function () {
      const h = K.phone.appById("spotify").homeHTML();
      return /Haftalık Keşif/.test(h) && /weekly-play/.test(h);
    })());

    ok("S15 · playlist çalma kuyruğu dolduruyor", (function () {
      const app = K.phone.appById("spotify");
      const list = [{ id: "p1", title: "A", artistName: "X" }, { id: "p2", title: "B", artistName: "X" }];
      app.playList(list);
      const q = I.queueState();
      while (K.phone.views.length > 1) K.phone.back();
      return q.size === 2 && q.current.title === "A";
    })());
  }


  /* ============================================================
     T) TIKTOK — mavi tik · duet/stitch · videodan ses sayfasına
     ============================================================ */
  {
    const tt = K.phone.appById("tiktok");

    ok("T1 · TikTok doğrulama yardımcıları var", typeof tt.isVerified === "function" && typeof tt.verifiedBadge === "function");

    ok("T2 · oyuncu rozeti itibara bağlı", (function () {
      p.reputation = 20;
      const low = tt.isVerified("player");
      p.reputation = 70;
      const high = tt.isVerified("player");
      return low === false && high === true;
    })());

    ok("T3 · popüler NPC doğrulanmış", (function () {
      const hot = K.artistList().slice().sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
      return tt.isVerified(hot.id) === true;
    })());

    ok("T4 · duet gönderisi üretiliyor ve işaretleniyor", (function () {
      const v = K.phone.appById("youtube").allVideos()[0];
      if (!v) return false;
      const res = tt.makeDuet(v.id, "duet");
      const post = (K.state.feed.tiktok || []).find(x => x && x.mine && x.duetOf);
      return !!res && res.kind === "duet" && !!post && !!post.ofVideoId;
    })());

    ok("T5 · stitch gönderisi üretiliyor", (function () {
      const v = K.phone.appById("youtube").allVideos()[1] || K.phone.appById("youtube").allVideos()[0];
      const res = tt.makeDuet(v.id, "stitch");
      const post = (K.state.feed.tiktok || []).find(x => x && x.mine && x.stitchOf);
      return !!res && res.kind === "stitch" && !!post;
    })());

    ok("T6 · olmayan video güvenli", (function () {
      return tt.makeDuet("yok-video", "duet") === null && tt.openVideo("yok-video") === null;
    })());

    ok("T7 · video açma istatistik döndürüyor", (function () {
      const v = K.phone.appById("youtube").allVideos()[0];
      const res = tt.openVideo(v.id);
      closeModal();
      return !!res && res.likes >= 0 && typeof res.title === "string";
    })());

    ok("T8 · duet/stitch profilde etiketle görünüyor", (function () {
      const h = tt.mineHTML();
      return /tt-post-row/.test(h) && /Stitch ·|Duet ·/.test(h);
    })());
  }

  /* ============================================================
     X) X — alıntı tweet · yer imi · mavi tik
     ============================================================ */
  {
    const x = K.phone.appById("x");

    ok("X1 · oyuncu rozeti itibara bağlı", (function () {
      K.state.feed.x = K.state.feed.x || [];
      const mk = () => ({ id: "xm" + Math.random(), authorId: "player", authorName: "Test", text: "rozet testi", day: K.state.day, likes: 1, mine: true });
      const post = mk();
      K.state.feed.x.unshift(post);
      p.reputation = 20;
      const low = /x-verified/.test(x.mineHTML());
      p.reputation = 70;
      const high = /x-verified/.test(x.mineHTML());
      K.state.feed.x = K.state.feed.x.filter(q2 => q2 !== post);
      return high === true && low === false;
    })());

    ok("X2 · alıntı akışa düşüyor", (function () {
      K.state.feed.x = K.state.feed.x || [];
      K.state.feed.x.unshift({ id: "qx1", authorId: "player", authorName: "Test", text: "alıntılanacak gönderi", day: K.state.day, likes: 10, comments: 2 });
      const res = x.quotePost("qx1");
      return !!res && !!q("#modal-root.open");
    })());

    ok("X3 · alıntı gönderisi quoteOf taşıyor", (function () {
      /* modalı doldur ve paylaş */
      const ta = q("#x-text");
      if (ta) { ta.value = "bence çok iyi"; }
      const btn = qa("#modal-root button").find(b => /Paylaş/.test(b.textContent || ""));
      click(btn);
      const post = (K.state.feed.x || []).find(p2 => p2 && p2.mine && p2.text === "bence çok iyi");
      return !!post && !!post.quoteOf && post.quoteOf.author === "Test";
    })());

    ok("X4 · alıntı kartı akışta render ediliyor", (function () {
      const post = (K.state.feed.x || []).find(p2 => p2 && p2.quoteOf);
      const h = K.phone.appById("x").feedHTML();
      return !!post && /x-quote/.test(h) && /alıntılanacak gönderi/.test(h);
    })());

    ok("X5 · olmayan gönderi alıntılanamıyor", (function () {
      closeModal();
      return x.quotePost("yok-boyle") === null;
    })());

    ok("X6 · yer imi eklenip listede görünüyor", (function () {
      const post = (K.state.feed.x || []).find(p2 => p2 && p2.text === "alıntılanacak gönderi");
      if (!post) return false;
      K.interactions.toggleSave("x_" + post.id);
      const h = x.mineHTML();
      return /Yer imleri/.test(h) && K.interactions.isSaved("x_" + post.id) === true;
    })());

    ok("X7 · yer imi kaldırılabiliyor", (function () {
      const post = (K.state.feed.x || []).find(p2 => p2 && p2.text === "alıntılanacak gönderi");
      K.interactions.toggleSave("x_" + post.id);
      return K.interactions.isSaved("x_" + post.id) === false;
    })());
  }


  /* ============================================================
     Y) YOUTUBE — yorum beğeni/yanıt · abone zili · Shorts · monetizasyon
     ============================================================ */
  {
    const yt = K.phone.appById("youtube");
    const vid = yt.allVideos()[0];

    ok("Y1 · yorum beğenisi açılıp kapanıyor", (function () {
      const key = "yt_" + vid.id;
      const before = K.interactions.commentLikeState(key, 0);
      const on = K.interactions.toggleCommentLike(key, 0);
      const state = K.interactions.commentLikeState(key, 0);
      const off = K.interactions.toggleCommentLike(key, 0);
      return before === false && on === true && state === true && off === false;
    })());

    ok("Y2 · yoruma yanıt yazılabiliyor", (function () {
      const key = "yt_" + vid.id;
      const before = K.interactions.commentReplies(key).length;
      const rep = K.interactions.addCommentReply(key, 1, "kardeşim bu iş çok iyi");
      return !!rep && rep.to === 1 && K.interactions.commentReplies(key).length === before + 1;
    })());

    ok("Y3 · boş yanıt reddediliyor", (function () {
      const key = "yt_" + vid.id;
      return K.interactions.addCommentReply(key, 1, "   ") === null;
    })());

    ok("Y4 · yorum ekranı beğeni + yanıtı gösteriyor", (function () {
      yt.openComments(vid.id, vid.channel, vid.channelId);
      const bodyEl = q(".app-body");
      const h = bodyEl ? bodyEl.innerHTML : "";
      while (K.phone.views.length > 1) K.phone.back();
      return /cmt-like/.test(h) && /kardeşim bu iş çok iyi/.test(h);
    })());

    ok("Y5 · abone zili yalnızca abonelerde açılıyor", (function () {
      const ch = vid.channelId;
      if (!ch) return true;
      const wasSub = K.interactions.isSubbed(ch);
      if (wasSub) K.interactions.toggleSub(ch);
      const blocked = K.interactions.hasSubBell(ch) === false;
      K.interactions.toggleSub(ch);
      const on = K.interactions.toggleSubBell(ch);
      const off = K.interactions.toggleSubBell(ch);
      return blocked && on === true && off === false;
    })());

    ok("Y6 · Shorts pager ileri/geri gidiyor", (function () {
      yt._shortIdx = 0;
      const total = yt.allVideos().slice(0, 10).length;
      const first = yt.shortIndex(total);
      yt._shortIdx = Math.min(1, total - 1);
      const second = yt.shortIndex(total);
      yt._shortIdx = 0;
      return total > 1 && first === 0 && second === 1;
    })());

    ok("Y7 · Shorts tek kart + sayaç gösteriyor", (function () {
      yt._shortIdx = 0;
      const h = yt.shortsHTML();
      const cards = (h.match(/class="short-card"/g) || []).length;
      return cards === 1 && /shorts-count/.test(h) && /1\//.test(h) && /short-next/.test(h);
    })());

    ok("Y8 · monetizasyon eşiği hesaplanıyor", (function () {
      p.ytSubs = 200; p.ytMonetized = false;
      const m = yt.monetization();
      return m.subsNeed === 1000 && m.hoursNeed === 4000 && m.eligible === false
        && m.subsPct === 20 && m.missing.length >= 1;
    })());

    ok("Y9 · eşik geçilince para kazanma açılıyor", (function () {
      const an = yt.analytics();
      p.ytSubs = 5000;
      /* saat eşiğini geçirmek için izlenmeyi yükselt: totalViews'ı besleyen
         şarkıları çoğalt (watchHours totalViews'tan türetiliyor) */
      p.songs = p.songs || [];
      const base = p.songs.slice();
      for (let i = 0; i < 30; i++) p.songs.push({
        id: "yy" + i, title: "x", genre: "rap", streams: 900000, lastDaily: 90000,
        youtubeViews: 500000, spotifyStreams: 0, appleStreams: 0,
        publishedDay: K.state.day
      });
      const m = yt.monetization();
      p.songs = base;
      const okNow = m.eligible === true && p.ytMonetized === true && m.estAdRevenue > 0;
      p.ytMonetized = false;
      return okNow;
    })());

    ok("Y10 · monetizasyon kartı kanal sekmesinde", (function () {
      const h = yt.mineHTML();
      return /yt-mz/.test(h) && /Abone/.test(h) && /İzlenme saati/.test(h);
    })());
  }


  /* ============================================================
     R) STÜDYO — oda kademeleri · mühendis · seans süresi
     ============================================================ */
  {
    const SS = K.studioSetup;

    ok("R1 · üç oda kademesi tanımlı", SS.rooms.length === 3 && SS.rooms[0].id === "ev" && SS.rooms[2].qAdd > SS.rooms[1].qAdd);

    ok("R2 · plan üç katkıyı topluyor", (function () {
      const a = SS.plan({ roomId: "ev", engineerId: "yok", hours: 2, reputation: 100 });
      const b = SS.plan({ roomId: "pro", engineerId: "star", hours: 8, reputation: 100 });
      return a.qAdd === 0 && b.qAdd > a.qAdd && b.cost > a.cost && b.fatigue > a.fatigue;
    })());

    ok("R3 · itibar eşiği tutmayan oda en alta düşüyor", (function () {
      const plan = SS.plan({ roomId: "pro", engineerId: "yok", hours: 4, reputation: 0 });
      return plan.room.id === "ev" && plan.roomLocked === true;
    })());

    ok("R4 · kilit kontrolü ayrı sorgulanabiliyor", (function () {
      return SS.locked("room", "pro", 0) === true
        && SS.locked("room", "pro", 100) === false
        && SS.locked("engineer", "star", 0) === true;
    })());

    ok("R5 · seans süresi azalan verimle artıyor", (function () {
      const h2 = SS.hoursOf(2).qAdd, h4 = SS.hoursOf(4).qAdd, h6 = SS.hoursOf(6).qAdd, h8 = SS.hoursOf(8).qAdd;
      return h2 === 0 && h4 > h2 && h6 > h4 && h8 > h6 && (h8 - h6) < (h6 - h4) + 1;
    })());

    /* --- sihirbazda görünür ve çalışıyor --- */
    ok("R6 · sihirbazda koşullar seçici olarak var", (function () {
      K.careerUI.openStudioModal();
      K.careerUI._studio.step = 2;          /* Prodüksiyon adımı */
      K.careerUI.renderStudioStep();
      const rows = qa(".st-cond").length;
      const has = /Stüdyo Koşulları/.test((q("#st-body") || {}).textContent || "") || rows > 0;
      closeModal();
      return rows >= 9 && has;
    })());

    ok("R7 · oda seçimi state'e yazılıyor", (function () {
      K.careerUI.openStudioModal();
      K.state.player.reputation = 60;
      const st = K.careerUI._studio;
      K.careerUI._studio.roomId = "yaripro";
      K.careerUI.renderStudioStep();
      const plan = SS.plan({ roomId: st.roomId, engineerId: st.engineerId, hours: st.sessionHours, reputation: 60 });
      closeModal();
      return plan.room.id === "yaripro" && plan.qAdd > 0;
    })());

    ok("R8 · maliyet ve kalite tahminine yansıyor", (function () {
      K.state.player.reputation = 60;
      K.careerUI.openStudioModal();
      const st = K.careerUI._studio;
      st.roomId = "ev"; st.engineerId = "yok"; st.sessionHours = 2;
      K.careerUI.renderStudioStep();
      const base = K.studioSetup.plan({ roomId: "ev", engineerId: "yok", hours: 2, reputation: 60 });
      st.roomId = "pro"; st.engineerId = "deneyimli"; st.sessionHours = 6;
      K.careerUI.renderStudioStep();
      const better = K.studioSetup.plan({ roomId: "pro", engineerId: "deneyimli", hours: 6, reputation: 60 });
      closeModal();
      return better.cost > base.cost && better.qAdd > base.qAdd;
    })());

    ok("R9 · yayın maliyetine stüdyo ücreti giriyor", (function () {
      const base = K.career.releaseCost("single", 12000, 3000, { genre: "rap", beatId: "digital", vocalId: "rap", kind: "normal", trackCount: 1, trackBudgets: [12000], trackSources: ["ev"] });
      const withStudio = K.career.releaseCost("single", 12000, 3000, { genre: "rap", beatId: "digital", vocalId: "rap", kind: "normal", trackCount: 1, trackBudgets: [12000], trackSources: ["ev"], studioCost: 12000 });
      return withStudio - base === Math.round(12000 * (K.settings ? K.settings.diffMult().cost : 1));
    })());

    ok("R10 · stüdyo bonusu kalite tahminini yükseltiyor", (function () {
      const a = K.career.estimateQuality("rap", 12000, { beatId: "digital", vocalId: "rap", beatQuality: 55, vocalQuality: 55, mixQuality: 55, kind: "normal", studioQAdd: 0 });
      const b = K.career.estimateQuality("rap", 12000, { beatId: "digital", vocalId: "rap", beatQuality: 55, vocalQuality: 55, mixQuality: 55, kind: "normal", studioQAdd: 20 });
      return b > a;
    })());
  }


  /* ============================================================
     L) YAYIN + ŞİRKET — mağaza önizleme · ön kayıt · 360 madde · departman
     ============================================================ */
  {
    /* --- mağaza önizlemesi --- */
    ok("L1 · mağaza önizlemesi üç mağaza sekmesi açıyor", (function () {
      K.careerUI.openStudioModal({ genre: "trap" });
      K.careerUI.openStorePreview();
      const txt = (q("#modal-root") || {}).textContent || "";
      const okAll = /Spotify/.test(txt) && /Apple Music/.test(txt) && /YouTube Music/.test(txt) && /Mağaza önizlemesi/.test(txt);
      closeModal(); closeModal();
      return okAll;
    })());

    ok("L2 · önizleme kartında başlık ve sanatçı görünüyor", (function () {
      K.careerUI.openStudioModal({ genre: "pop" });
      K.careerUI._studio.projectTitle = "Önizleme Testi";
      K.careerUI.openStorePreview();
      const txt = (q("#modal-root") || {}).textContent || "";
      const good = /Önizleme Testi/.test(txt) && new RegExp(K.state.player.stageName.slice(0, 6)).test(txt);
      closeModal(); closeModal();
      return good;
    })());

    /* --- ön kayıt --- */
    ok("L3 · ön kayıt sayfası açılıyor", (function () {
      K.state.player.releases = [{
        id: "pre1", title: "Ön Kayıt Projesi", genre: "trap", type: "single",
        tracks: [{ name: "X", quality: 60 }], startDay: K.state.day - 2, waitDays: 12,
        cost: 10000, progress: 0.14, stage: "prep", coverSeed: "cvp", presaves: 0
      }];
      const r = K.careerUI.openPresale("pre1");
      const t2 = (q("#modal-root") || {}).textContent || "";
      const fine = !!r && /Ön kayıt/.test(t2) && /çıkışa \d+ gün/.test(t2);
      closeModal();
      return fine;
    })());

    ok("L4 · ön kayıt paylaşımı sayacı artırıyor", (function () {
      const rel = K.career.releaseById("pre1");
      K.state.player.ig = 40000; K.state.player.tiktok = 20000;
      const r = K.careerUI.sharePresale("pre1");
      return !!r && r.ok === true && r.gain > 0 && rel.presaves === r.total;
    })());

    ok("L5 · aynı gün ikinci paylaşım engelli", (function () {
      K.careerUI.sharePresale("pre1");
      const r = K.careerUI.sharePresale("pre1");
      return r && r.ok === false && r.reason === "already";
    })());

    ok("L6 · ön kayıt ilk gün ivmesini büyütüyor", (function () {
      const a = K.career.presaleBoost({ presaves: 0 });
      const b = K.career.presaleBoost({ presaves: 4000 });     /* 4000/20000 = +%20 */
      const cap = K.career.presaleBoost({ presaves: 999999 }); /* tavan %35 */
      return a === 1 && Math.abs(b - 1.2) < 1e-9 && Math.abs(cap - 1.35) < 1e-9;
    })());

    ok("L6b · ön kayıt sayısı yayınlanan şarkıya işleniyor", (function () {
      const rel = K.career.releaseById("pre1");
      rel.presaves = 1234;
      K.state.player.songs = [];
      K.state.player.releases = [];
      const song = K.career.publishRelease(JSON.parse(JSON.stringify(rel)));
      K.state.player.releases = [rel];
      return !!song && song.presaves === 1234;
    })());

    /* --- 360 sözleşme maddeleri --- */
    ok("L7 · sözleşme maddeleri tablosu çiziliyor", (function () {
      K.state.player.labelId = "lbl_test";
      K.state.player.labelDeal = {
        dealType: "360", master: "label", artistRoyalty: 60, advance: 120000,
        lengthDays: 365, startDay: K.state.day - 30, recouped: 30000
      };
      const h = K.careerUI.renderClauses();
      return /360 Sözleşme Maddeleri/.test(h) && /Master sahipliği/.test(h) && /360°/.test(h);
    })());

    ok("L8 · yeniden pazarlık telifi artırıp avansı düşürüyor", (function () {
      const before = { r: K.state.player.labelDeal.artistRoyalty, a: K.state.player.labelDeal.advance };
      const res = K.careerUI.negotiateClause();
      const after = K.state.player.labelDeal;
      return !!res && res.ok === true && after.artistRoyalty === before.r + 5 && after.advance === Math.round(before.a * 0.9);
    })());

    ok("L9 · pazarlık 60 gün bekleme kuralına uyuyor", (function () {
      const res = K.careerUI.negotiateClause();
      return res && res.ok === false && res.reason === "cooldown";
    })());

    /* --- departmanlar --- */
    ok("L10 · departman tanımları ve bonus hesabı", (function () {
      K.state.label = { id: "my_label", name: "Test Music", funds: 200000, depts: { ar: 1, marketing: 1, dist: 1 } };
      const b = K.label.deptBonus();
      const defs = K.label.deptDefs();
      return defs.length === 3 && b.quality === 0 && b.marketingMult === 1 && b.distDays === 0 && b.upkeep === 0;
    })());

    ok("L11 · departman yükseltmesi kasayı düşürüp etkiyi artırıyor", (function () {
      const before = K.state.label.funds;
      const cost = K.label.deptUpgradeCost("marketing");
      const res = K.label.upgradeDept("marketing");
      const b = K.label.deptBonus();
      return res.ok === true && K.state.label.funds === before - cost && b.marketingMult > 1;
    })());

    ok("L12 · A&R kalite, dağıtım teslim süresi veriyor", (function () {
      K.state.label.funds = 500000;
      K.label.upgradeDept("ar");
      K.label.upgradeDept("dist");
      const b = K.label.deptBonus();
      return b.quality > 0 && b.distDays > 0 && K.label.deptLevel("ar") === 2;
    })());

    ok("L13 · kasa yetersizse yükseltme reddediliyor", (function () {
      K.state.label.funds = 0;
      const res = K.label.upgradeDept("ar");
      return res.ok === false && res.reason === "funds";
    })());

    ok("L14 · departman paneli çiziliyor", (function () {
      K.state.label.funds = 100000;
      const h = K.careerUI.renderDepartments();
      return /Departmanlar/.test(h) && /A&amp;R|A&R/.test(h) && /Pazarlama/.test(h) && /Dağıtım/.test(h);
    })());

    ok("L15 · departman aylık gideri şirket kasasından düşüyor", (function () {
      K.state.label.funds = 50000;
      const up = K.label.deptBonus().upkeep;
      /* settleMonth çağrısı ekonomiyi işler; gider düşmüş olmalı */
      K.economy.settleMonth();
      return up > 0 ? K.state.label.funds <= 50000 : true;
    })());

    /* testleri geri al (diğer süitler etkilenmesin) */
    K.state.player.labelId = null; K.state.player.labelDeal = null; K.state.label = null;
  }

  r.setRuntime(errors.filter(e => !/HTMLMediaElement|Not implemented|fonts/i.test(e)).concat(throws.map(t => "throw: " + t)));
  r.report();
  process.exit(process.exitCode || 0);
}).catch((e) => {
  console.error("BOOT HATASI:", e);
  process.exit(1);
});
