/* ============================================================
   KARMA — systems/social.js
   Instagram / TikTok / X / YouTube sosyal katmanı:
   gönderi oluşturma, şarkı tanıtımı (promosyon), etkileşim,
   NPC akışı ve viral/trend etkisi.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ============================================================
     v10.8 GERÇEKLİK DÜZELTMESİ — SANATÇI SESİ
     Eskiden 36 sanatçının TAMAMI 6 hazır cümleyi paylaşıyordu
     (Ceza ile Aleyna Tilki aynı satırı atıyordu). Artık her sanatçı
     türüne + kuşağına göre konuşur; VOICE_BY_ID'deki 8 sanatçının
     kendi ağzı vardır (sayı v10.14'te kodla eşitlendi).
     Üstelik gönderiler GERÇEK şarkıya bağlanır (eskiden songId hep null'dı,
     yani hiçbir sanatçı kendi işini paylaşmıyordu).
     ============================================================ */
  const VOICE = {
    trap: {
      ig: ["Kayıtta kaldık yine 🌙", "Sesi açın, gerisi gelir 🎚️", "Bu gece bitmiyor gibi", "Stüdyo kokusu üstüme sindi", "Yarın değil, şimdi 🖤", "Bir şey hazır, acele etmiyorum"],
      x:  ["Yeni bir şeyi bitirdim, karar vermek zor.", "Bu iş aceleye gelmiyor, sindire sindire.", "Sound oturdu, kayıt bitti sayılır.", "Bir gün çıkacak, o gün herkes anlar.", "Gece çalışmak daha kolay."],
      tt: ["Bu ses kafanı kırar 🔥", "Snippet test 👀", "Part 2 yolda 🎬", "Trend olacak gibi", "Kayıttan bir parça"]
    },
    drill: {
      ig: ["Mahalle işi, gerisi teferruat", "Sokak bize öğretti 🔥", "Hızlı yaşıyoruz", "Kayıt odasından 🎙️", "Durmak yok"],
      x:  ["Bazı şeyleri anlatmak için kelime yetmiyor.", "Bu sound İstanbul'da büyüdü.", "Yeni parça yakında.", "Söz bitti, gerisi teknik."],
      tt: ["Part 2 🔥", "Bu akış sert 🥶", "Snippet 👀", "Trend 🎬", "Sesi kısma"]
    },
    rap: {
      ig: ["Kalem kâğıt, klasik 🖊️", "Sözler yolda", "Sahnede görüşürüz 🎤", "Kayıtta olgunlaşıyor", "Sabırla yazıyorum"],
      x:  ["Bu iş yazmakla oluyor, kalanı vitrin.", "Rap bir zanaat, acele kabul etmiyor.", "Yeni bir metin üstünde çalışıyorum.", "Sahnede anlatmak daha kolay.", "Sözü olmayan müzik bana yetmiyor."],
      tt: ["Sözleri dinle 🎤", "Kayıttan bir bölüm", "Yakında 🎧", "Bu akış klasik", "Sahne özeti"]
    },
    pop: {
      ig: ["Yeni şarkım çok yakında 💫", "Sahneler çok güzel geçiyor ✨", "Provadan 🎤", "Kulis anları 💛", "Sevgiyle hazırlıyorum"],
      x:  ["Yeni şarkı için çok heyecanlıyım.", "Sahne enerjisi başka bir şey.", "Bu kayıt içime sindi.", "Yakında sizinle.", "Bu şarkı çok emek istedi."],
      tt: ["Bu melodi kafanda kalır 🎶", "Sahnede dans et 🎤", "Yakında 💫", "Kulis 🥰", "Söyleyince belli oluyor"]
    },
    rnb: {
      ig: ["Gece için yazdım 🌙", "Yumuşak tonda 🎙️", "Sessizlikte dinle", "Kayıt ışıkları kapalı"],
      x:  ["Bu kayıt gece için.", "Yumuşak olan kalıcı oluyor.", "Yeni bir şey üstünde çalışıyorum.", "Sessizlikte iyi gidiyor."],
      tt: ["Gece sesi 🌙", "Kulaklıkla dinle", "Yakında 🎧", "Yeni bölüm"]
    },
    indie: {
      ig: ["Küçük bir odada büyük bir şey", "Gitarla akşam", "Kendi halimde ✨", "Kayıtlar devam"],
      x:  ["Bağımsız kalmak zor ama doğru.", "Kendi müziğimi kendim yapıyorum.", "Bu kayıt beni anlatıyor.", "Yakında çıkar."],
      tt: ["Akustik akşam 🎸", "Küçük ama gerçek", "Yakında ✨"]
    }
  };
  /* kıdemli (35+ yaş) sanatçı ağzı — tecrübe tonu */
  const VETERAN = {
    ig: ["Yıllardır aynı masada 🖊️", "Gençlere yer açıyoruz", "Kayıt bitti, gerisi zaman", "Bu iş bitmez, öğrenilir"],
    x:  ["Bu sektörde kalmak ayrı bir beceri.", "Yıllar geçti, hâlâ yazıyorum.", "Yeni kuşak iyi iş çıkarıyor.", "Vitrin değişti, zanaat aynı."],
    tt: ["Klasikler bitmez", "Yılların kaydı", "Yeni kuşağa selam"]
  };
  /* kendi ağzı olan sanatçılar (tür havuzunu geçersiz kılar) */
  const VOICE_BY_ID = {
    sehinsah: {
      ig: [
        "Kayıt odasından selam 🖤 Kelime tartıyorum yine",
        "Sesin rengi değişti; bu sefer farklı bir kapı açtım",
        "Uzun sürdü ama oldu. Sabreden kazanıyor",
        "Gece çalışmak daha sakin. Söz orada oturuyor",
        "Yeni bir metin üstünde iki hafta düşündüm. Öyle çıkacak"
      ],
      x:  [
        "Kimseye bir şey ispat etme derdim kalmadı; iş konuşsun.",
        "Aynı masada oturuyorum, acelem yok. Kelime ağırlığı sayıyla ölçülmüyor.",
        "Bu sound'u zamanla anlatacağım; acele eden bir şey anlatamaz.",
        "Eleştiri gelirse oturur dinlerim, ama övgü zorla alınmıyor benden.",
        "Yıllar geçince anladım: sessizlik de bir cevaptır."
      ],
      tt: ["Bir bölüm kayıttan", "Sesi aç, sözü dinle"],
    },
    ceza: {
      ig: ["Kalem elden düşmez 🖊️", "Sahne bizim evimiz", "Gençlere selam"],
      x:  ["Rap bir dildir; onu konuşan çok, anlayan az.", "Sahnede anlatmadığın söz yarım kalır.", "Ustayım diye sustum, kayıt anlatır."],
      tt: ["Klasik akış", "Sahneden"],
    },
    sagopa: {
      ig: ["Gece, sessizlik, kalem 🌙", "Notlarım bitmiyor", "Sükûnet içinde"],
      x:  ["Sözün ağırlığı ritimden fazladır.", "Yalnızlık en iyi stüdyo.", "Kelimeler üstünde çalışıyorum."],
      tt: ["Sessizlikte dinle", "Yeni mısra"],
    },
    hadise: {
      ig: ["Sahne ışıkları hazır ✨", "Provada son rötuş", "Sizi görünce mutlu oluyorum 💛"],
      x:  ["Sahne enerjisi her şeyi unutturuyor.", "Yeni şarkı yolda, heyecanlıyım.", "Seyircimle aram başka."],
      tt: ["Sahne özeti 🎤", "Yakında💫"],
    },
    edis: {
      ig: ["Kayıt odasından 💫", "Yeni iş çok yakın", "Stüdyoda akşam"],
      x:  ["Bu şarkı üstünde uzun çalıştım.", "Sahnede söylemek için sabırsızım.", "Yakında sizinle."],
      tt: ["Yakında 💫", "Bu bölümü dinle"],
    },
    aleynatilki: {
      ig: ["Farklı bir şey deniyorum ✨", "Provadan hızlı bir bakış", "Yakında görürsünüz"],
      x:  ["Ben kalıba girmiyorum.", "Denemekten korkmuyorum.", "Yeni şey yolda."],
      tt: ["Bu farklı 👀", "Deneme sürümü"],
    },
    weghrumi: {
      ig: [
        "Rize'den İstanbul'a 🌙 kayıt bitti, mix kaldı",
        "Bu gece de bitmiyor; mix oturmadan çıkmıyor",
        "Melodiyi kendim kurdum, davulu da kendim vurdum",
        "Stüdyo kokusu üstüme sindi, iyi ki sindi",
        "Bir şey var ama erken konuşmayacağım"
      ],
      x:  [
        "Bağımsız kalıyorum, daha rahat; kontrol bende oluyor.",
        "Sound'u kendim yapıyorum, dışarıdan hazır beat almam.",
        "Kısa içerik şarkıyı yiyor ama ben yine bütün şarkı yapıyorum.",
        "Özel hayatım bende kalsın, iş konuşalım.",
        "Net söylüyorum: sound'unu kurmazsan başkasının sesi oluyorsun."
      ],
      tt: ["Bu ses sert 🥶", "Snippet", "Mix'ten bir parça"],
    },
    lierefuge: {
      ig: ["İzmir'den selam 🌊", "Kayıtta kaldım", "D'ÜNYAM sonrası devam"],
      x:  ["Kendi işimi kendim yapıyorum.", "Sözler ağır, beat hafif olsun.", "Yeni bir şey geliyor."],
      tt: ["Bu akış sert", "Snippet 👀"],
    }
  };

  /* sanatçının ses (gönderi) havuzu */
  function voiceFor(a, platform) {
    const p = platform === "x" ? "x" : platform === "tiktok" ? "tt" : "ig";
    const ov = VOICE_BY_ID[a.id];
    if (ov && ov[p] && ov[p].length) return ov[p];
    if ((a.age || 30) >= 38) return VETERAN[p] || VETERAN.ig;
    const g = VOICE[a.genre] || VOICE.rap;
    return g[p] || g.ig;
  }

  /* AYNI etkileşim formülü hem NPC hem oyuncu için geçerli.
     Eskiden NPC gönderileri `pop × rand(80,900)` alırken oyuncunun
     gönderisi `20 + pop × rand(5,20)` alıyordu — aynı popülerlikte
     100 kat fark. Artık ikisi de takipçi × gerçekçi etkileşim oranı. */
  K.socialEngagement = function (followers) {
    const f = Math.max(0, followers || 0);
    const rate = 0.018 + Math.random() * 0.045;     // %1,8 – %6,3 etkileşim oranı
    const likes = Math.round(f * rate);
    return {
      likes,
      comments: Math.round(likes * (0.015 + Math.random() * 0.03)),
      shares: Math.round(likes * (0.006 + Math.random() * 0.02))
    };
  };

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
      /* oyuncunun gönderisi de NPC'lerle AYNI formülü kullanır
         (takipçi × gerçekçi etkileşim oranı) */
      const eng = K.socialEngagement((p.ig || 0) + (p.tiktok || 0) + (p.x || 0));
      const post = {
        id: U.uid("post"),
        platform,
        authorId: "player",
        authorName: p.stageName,
        text: text || U.pick(VOICE[K.state.player.genre] ? VOICE[K.state.player.genre][platform === "x" ? "x" : platform === "tiktok" ? "tt" : "ig"] : VOICE.rap.ig),
        day: s.day,
        likes: eng.likes,
        comments: eng.comments,
        shares: eng.shares,
        songId: songId || null,
        mine: true
      };
      (s.feed[platform] = s.feed[platform] || []).unshift(post);
      K.bus.emit("social:post", post);
      return post;
    },

    /* ============================================================
       v10.30 — GÖNDERİ STRATEJİSİ: İÇERİK TÜRÜ
       Oyuncu artık gönderi atarken NE tür bir içerik olduğunu seçer.
       Üç yol var ve her biri farklı bir kaynağı besler:
         📈 Erişim : en çok kişiye ulaşır, imajı pek beslemez
         ✨ İmaj   : itibar/imaj kazandırır, erişim daha düşük
         🎲 Risk   : ya patlar (viral) ya batar (tartışma/imaj kaybı)
       ============================================================ */
    POST_TYPES: {
      reach: { id: "reach", name: "Erişim", icon: "📈", tone: "info",
        desc: "Daha çok kişiye ulaşır; imajı ve itibarı pek beslemez." },
      image: { id: "image", name: "İmaj", icon: "✨", tone: "ok",
        desc: "İtibarını ve kamu imajını güçlendirir; erişim daha düşük kalır." },
      risk:  { id: "risk",  name: "Risk", icon: "🎲", tone: "warn",
        desc: "Ya patlar ya batar: yüksek erişim şansı, ama tartışma riski de var." }
    },

    /* tür seçici HTML — uygulama modalları kullanır */
    postTypeSelector(selected) {
      const cur = selected || "reach";
      return `<div class="posttype-grid">` +
        Object.keys(K.social.POST_TYPES).map(id => {
          const t = K.social.POST_TYPES[id];
          return `<button type="button" class="posttype ${id === cur ? "on" : ""}" data-posttype="${id}">` +
            `<span class="pt-ic">${t.icon}</span><span class="pt-nm">${U.escape(t.name)}</span>` +
            `<span class="pt-desc">${U.escape(t.desc)}</span></button>`;
        }).join("") + `</div>`;
    },

    /* modal içindeki tür seçimini bağla (idempotent — tekrar bağlanmaz) */
    bindPostTypes(root, initial) {
      const box = (root || document).querySelector("[data-posttype-box]");
      if (!box) return;
      if (box.dataset.bound === "1") return;
      box.dataset.bound = "1";
      box.dataset.selected = initial || "reach";
      box.querySelectorAll("[data-posttype]").forEach(b => {
        b.addEventListener("click", () => {
          box.dataset.selected = b.dataset.posttype;
          box.querySelectorAll("[data-posttype]").forEach(x => x.classList.toggle("on", x === b));
        });
      });
    },

    /* modal içinde seçili tür */
    selectedPostType(root) {
      const box = (root || document).querySelector("[data-posttype-box]");
      return (box && box.dataset.selected) || "reach";
    },

    /* oyuncunun STRATEJİLİ gönderisi: tür + sonuç motoru */
    playerPost(platform, text, typeId, songId) {
      const s = K.state, p = s.player;
      const type = K.social.POST_TYPES[typeId] ? typeId : "reach";
      const post = K.social.createPost(platform, text, songId || null);
      post.postType = type;

      /* şarkı etiketliyse o şarkıya küçük bir tanıtım ivmesi */
      if (songId) {
        const song = K.platforms.findSong(songId);
        if (song) {
          song.boosts = song.boosts || {};
          const key = platform + "_social";
          song.boosts[key] = (song.boosts[key] || 0) + 0.08;
          song.dailyStreams *= 1.05;
        }
      }

      let outcome = type, title = "", msg = "", kind = "ok";

      if (type === "reach") {
        post.likes = Math.round(post.likes * 1.45);
        post.comments = Math.round(post.comments * 1.3);
        const gain = Math.round((p.popularity || 0) * 3 + 40);
        p.ig += platform === "instagram" ? gain : Math.round(gain * 0.4);
        p.tiktok += platform === "tiktok" ? gain : Math.round(gain * 0.3);
        p.x += platform === "x" ? gain : Math.round(gain * 0.2);
        p.image = U.clamp((p.image == null ? 50 : p.image) - 0.6, 0, 100);
        title = "📈 Erişim gönderisi";
        msg = "Geniş kitleye ulaştı (+takipçi), imaj biraz nötrleşti.";
      } else if (type === "image") {
        post.likes = Math.round(post.likes * 0.72);
        post.comments = Math.round(post.comments * 1.15);
        p.reputation = U.clamp((p.reputation || 0) + 1.2, 0, 100);
        p.image = U.clamp((p.image == null ? 50 : p.image) + 2.5, 0, 100);
        p.ig += Math.round((p.popularity || 0) * 1.1 + 15);
        title = "✨ İmaj gönderisi";
        msg = "İtibar ve kamu imajı güçlendi; erişim daha sınırlı kaldı.";
      } else {
        /* RİSK: kumar. 0,52 patlama · 0,48 tepki */
        if (U.chance(0.52)) {
          outcome = "risk_win";
          post.likes = Math.round(post.likes * 2.4);
          post.shares = Math.round((post.shares || 0) * 2.2);
          K.game.addFame(1.2);
          p.ig += Math.round((p.popularity || 0) * 5 + 200);
          p.tiktok += Math.round((p.popularity || 0) * 4 + 150);
          p.image = U.clamp((p.image == null ? 50 : p.image) - 0.8, 0, 100);
          title = "🎲 Risk tuttu!";
          msg = "Gönderi patladı, gündem oldu ve takipçi fırladı.";
        } else {
          outcome = "risk_backfire";
          post.likes = Math.round(post.likes * 0.6);
          p.reputation = U.clamp((p.reputation || 0) - 1.4, 0, 100);
          p.image = U.clamp((p.image == null ? 50 : p.image) - 3, 0, 100);
          p.stress = U.clamp((p.stress || 0) + 5, 0, 100);
          p.ig = Math.max(0, Math.round(p.ig - ((p.popularity || 0) * 20 + 30)));
          title = "🎲 Risk tepki çekti";
          msg = "Gönderi tartışma yarattı; itibar ve imaj zedelendi.";
          kind = "warn";
          s.notifications = (s.notifications || []).concat([{
            title: "⚠️ Tartışma", msg: "Riskli gönderin tepki topladı; takipçi kaybettin.",
            kind: "warn", day: s.day
          }]).slice(-60);
          /* küçük bir kriz ihtimali (gerçek sonuç) */
          if (U.chance(0.22) && K.crisis && K.crisis.maybeStart) {
            try { K.crisis.maybeStart(); } catch (e) {}
          }
        }
      }

      /* createPost gönderiyi akışa zaten ekledi — burada yalnızca sınırla */
      s.feed[platform] = (s.feed[platform] || []).slice(0, 60);
      K.save();
      K.refresh();
      return { post, outcome, title, msg, kind };
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
      /* v10.62.1 — VİRAL/HİT ERİŞİMİ: bir şarkı viral olduğunda onu
         yalnızca senin seviyendeki isimler değil, daha geniş bir çevre
         duyar. `opts.reach` bu ek erişimi (popülerlik puanı) ekler;
         normal release'te 0'dır ve eski davranış aynen korunur. */
      const reach = (opts && opts.reach) || 0;
      const pool = (K.artistList() || []).filter(x => x.popularity <= (K.state.player.popularity || 0) * 1.2 + 12 + reach);
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
        K.game.addFame(0.5);
        p.ig = Math.round(p.ig + a.popularity * 18 + 500);
        p.tiktok = Math.round(p.tiktok + a.popularity * 12 + 300);
        p.reputation = U.clamp(p.reputation + 0.3, 0, 100);
      } else if (kind === "shade") {
        K.game.addFame(0.3); // tartışma da görünürlük
        p.reputation = U.clamp(p.reputation - 0.6, 0, 100);
      } else {
        K.game.addFame(0.15);
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

    /* ---------------- v10.60 — PLATFORMA ÖZEL TAKİPÇİ ----------------
       Eskiden NPC gönderilerinin etkileşimi HER platformda Instagram
       takipçisinden hesaplanıyordu: X gönderisi TikTok kitlesiyle,
       YouTube yorumu IG kitlesiyle ölçülüyordu. Artık her platform
       KENDİ kitlesini kullanır (X→x, TikTok→tiktok, YouTube→ytSubs,
       Instagram→ig). Veri yoksa güvenli geri dönüş: IG, o da yoksa
       popülerlikten türetilmiş makul bir taban. */
    platformFollowers(a, platform) {
      if (!a) return 0;
      const key = platform === "tiktok" ? "tiktok"
        : platform === "x" ? "x"
        : (platform === "youtube" || platform === "yt") ? "ytSubs" : "ig";
      const v = a[key];
      if (v != null && isFinite(v) && v > 0) return v;
      if (key !== "ig" && a.ig > 0) return a.ig;
      return Math.max(0, Math.round((a.popularity || 0) * 1200));
    },

    /* ---------------- NPC gönderisi (tek yol) ----------------
       Ses havuzu sanatçıya özel; gönderilerin bir kısmı GERÇEK
       şarkısına bağlanır (eskiden songId hep null'dı). */
    npcPost(a, platform, opts) {
      opts = opts || {};
      const pool = voiceFor(a, platform);
      let song = null;
      if (opts.song) song = opts.song;
      else if (U.chance(0.38)) {
        /* v10.16 — tembel veri katmanı (P-1) */
        const real = K.lazy ? K.lazy.songs(a.id) : ((K.REAL_SONGS && K.REAL_SONGS[a.id]) || []);
        if (real.length) song = U.pick(real);
      }
      const eng = K.socialEngagement(K.social.platformFollowers(a, platform));
      const text = opts.text || (song
        ? (platform === "x"
            ? `"${song.title}" - sözler ve kayıt bitti, dinleyin.`
            : `"${song.title}" 🎧 ${U.pick(pool)}`)
        : U.pick(pool));
      return {
        id: U.uid("post"), platform,
        authorId: a.id, authorName: a.stageName,
        text, day: K.state.day,
        likes: eng.likes, comments: eng.comments, shares: eng.shares,
        songId: song ? song.title : null,
        songTitle: song ? song.title : null,
        art: song ? song.art : null,
        mine: false
      };
    },

    seedFeed(platform) {
      const s = K.state;
      const artists = K.artistList();
      const arr = s.feed[platform] = s.feed[platform] || [];
      for (let i = 0; i < 14; i++) {
        const a = U.pick(artists);
        const post = K.social.npcPost(a, platform);
        post.day = s.day - U.randInt(0, 6);
        arr.push(post);
      }
      arr.sort((a, b) => b.day - a.day);
    },

    /* ---------------- NPC'nin YENİ ŞARKISI duyurusu -------------
       Endüstri canlandırma motoru (game.npcRelease) bunu çağırır. */
    npcReleasePost(a, song) {
      const s = K.state;
      const platforms = ["instagram", "x", "tiktok"];
      platforms.forEach((pf) => {
        const post = K.social.npcPost(a, pf, {
          song,
          text: pf === "x"
            ? `Yeni şarkı "${song.title}" çıktı. Dinleyin, ne düşünüyorsunuz?`
            : pf === "tiktok"
              ? `"${song.title}" ile bir bölüm 🎬 #fyp`
              : `"${song.title}" şimdi yayında 🎧`
        });
        (s.feed[pf] = s.feed[pf] || []).unshift(post);
        s.feed[pf] = s.feed[pf].slice(0, 60);
      });
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
        // yeni NPC gönderileri (sanatçının kendi sesiyle)
        if (U.chance(0.7)) {
          const a = U.pick(K.artistList());
          const post = K.social.npcPost(a, pf);
          (s.feed[pf] = s.feed[pf] || []).unshift(post);
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
