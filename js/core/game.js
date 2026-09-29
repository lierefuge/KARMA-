/* ============================================================
   KARMA — core/game.js
   Gün döngüsü: yayın hattı, dinlenme akışı, listeler,
   NPC dalgalanması, günlük olay tetikleyicileri.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  K.game = {

    /* ---------------- advance one day ---------------- */
    nextDay() {
      const s = K.state;
      K.quietMode = (K.quietMode || 0) + 1;
      K._quietQueue = [];
      try { K.game._advanceDay(); } finally { K.quietMode--; }

      // gün olayları → bildirim merkezi + TEK özet bildirim (oyuncuyu başka yere götürmez)
      const q = K._quietQueue || [];
      K._quietQueue = [];
      s.notifications = (s.notifications || []).concat(q.map(x => ({ title: x.title, msg: x.msg, kind: x.kind, day: s.day }))).slice(-60);
      const dateLabel = U.dateForDay(s.day).label;
      if (q.length) {
        const top = q.slice(0, 3).map(x => String(x.title).replace(/^[^\p{L}\p{N}]+/u, "")).join(" · ");
        K.toast("📅 " + dateLabel, q.length + " olay · " + top + (q.length > 3 ? " …" : ""), "");
      } else {
        K.toast("📅 " + dateLabel, "Sakin bir gün.", "");
      }

      // karar bekleyen günlük olay varsa oyuncuya sor (tek modal)
      if (s.pendingIncident && K.incidents && K.incidents.openPending) {
        setTimeout(() => K.incidents.openPending(), 500);
      } else if (s.pendingSync && K.catalog && K.catalog.openSyncOffer) {
        setTimeout(() => K.catalog.openSyncOffer(), 500);
      } else if (s.pendingCatalogOffer && K.catalog && K.catalog.openCatalogOffer) {
        setTimeout(() => K.catalog.openCatalogOffer(), 500);
      } else if (s.pendingPress && K.press && K.press.openOffer) {
        setTimeout(() => K.press.openOffer(), 500);
      } else if (s.pendingSponsor && K.sponsor && K.sponsor.openOffer) {
        setTimeout(() => K.sponsor.openOffer(), 500);
      }
    },

    _advanceDay() {
      const s = K.state;
      s.day += 1;
      s.player.messagesSentToday = 0;

      // YAŞ: oyun gerçek takvim üzerinden ilerler. Oyuncunun doğum günü
      // tarihe denk geldiğinde yaş otomatik +1 artar.
      const today = U.dateForDay(s.day);
      const pl = s.player;
      if (pl.birth) pl.age = K.util.ageOn(pl.birth, today);
      if (pl.birth && K.util.isBirthdayOn(pl.birth, today)) {
        K.toast("🎂 Doğum günün kutlu olsun!", `${pl.stageName} artık ${pl.age} yaşında.`, "ok");
        s.notifications = (s.notifications || []).concat([{
          title: "🎂 Doğum günü",
          msg: `${pl.stageName} ${pl.age} yaşına girdi.`,
          kind: "ok",
          day: s.day
        }]).slice(-60);
      }
      // günlük dinlenme: yorgunluk azalır, iş kaydı sıfırlanır
      s.player.fatigue = Math.max(0, (s.player.fatigue || 0) - 6);
      s.player.jobLog = {};
      if (K.jobs && K.jobs.resetDaily) K.jobs.resetDaily();

      // gündem/haberler tazele (kendi içinde 30 günde bir yenilenir)
      if (K.news && K.news.refresh) K.news.refresh();

      K.game.advanceReleases();
      K.game.accrueStreams();
      K.game.accrueArtistWorld();
      K.game.accrueAlbums();
      K.game.refreshMonthly();
      // ay sonu: platform bazlı telif ödemesi + fan kulübü geliri + gider/vergi
      if (K.ECON.payoutPeriodDays && s.day % K.ECON.payoutPeriodDays === 0) {
        // v10: önce enflasyon + kur + borç faizi ilerler, sonra tahsilat/gider
        if (K.econ && K.econ.monthlyTick) K.econ.monthlyTick();
        if (K.economy.settleMonth) K.economy.settleMonth();
        if (K.fans && K.fans.monthly) K.fans.monthly();
        if (K.sponsor && K.sponsor.monthly) K.sponsor.monthly();
        if (K.economy.chargeMonthly) K.economy.chargeMonthly();
      }
      K.game.buildChart();
      K.game.buildAlbumChart();
      K.game.tickTrends();
      // platform listeleri (Spotify/Apple/YouTube/airplay) — olasılıksal giriş/çıkış
      if (K.lists && K.lists.daily) K.lists.daily();

      // sistem tick'leri
      if (K.relations && K.relations.dailyTick) K.relations.dailyTick();
      if (K.fans && K.fans.dailyTick) K.fans.dailyTick();
      if (K.shortform && K.shortform.tick) K.shortform.tick();
      if (K.catalog && K.catalog.tick) K.catalog.tick();
      if (K.press && K.press.tick) K.press.tick();
      if (K.ai && K.ai.tick) K.ai.tick();
      if (K.skills && K.skills.decay) K.skills.decay();
      if (K.goals && K.goals.tick) K.goals.tick();
      if (K.sponsor && K.sponsor.tick) K.sponsor.tick();
      if (K.phoneOS && K.phoneOS.daily) K.phoneOS.daily();
      if (K.label && K.label.dailyTick) K.label.dailyTick();
      if (K.label && K.label.playerContractTick) K.label.playerContractTick();
      if (K.social && K.social.dailyTick) K.social.dailyTick();
      if (K.concerts && K.concerts.tick) K.concerts.tick();
      if (K.awards && K.awards.tick) K.awards.tick();
      if (K.rivalry && K.rivalry.tick) K.rivalry.tick();
      if (K.beef && K.beef.dailyTick) K.beef.dailyTick();
      if (K.crisis && K.crisis.maybeStart) K.crisis.maybeStart();
      if (K.stats && K.stats.record) K.stats.record();

      K.game.decayAffinity();

      // günlük rastgele olay (%10-15) — para / ün / itibar / hayran etkisi
      if (K.incidents && K.incidents.maybeFire) K.incidents.maybeFire();

      K.save();
      K.refresh();
      K.bus.emit("day:passed", s.day);
    },

    /* ---------------- release pipeline ---------------- */
    advanceReleases() {
      const s = K.state;
      const still = [];
      s.player.releases.forEach(rel => {
        const progress = (s.day - rel.startDay) / Math.max(1, rel.waitDays);
        rel.progress = U.clamp(progress, 0, 1);
        rel.stage = progress >= 1 ? "released"
          : progress >= 0.7 ? "editorial"
          : progress >= 0.4 ? "queued" : "prep";

        if (progress >= 1) {
          // YAYINLA (publishRelease birincil şarkıyı döner, ek track'ler state'e eklenir)
          const song = K.career.publishRelease(rel);
          s.player.songs.push(song);
          K.bus.emit("release:published", song);
          K.toast("🎉 Yayınlandı!", `"${rel.title}" artık tüm platformlarda.`, "ok");
          if (K.social && K.social.onRelease) K.social.onRelease(song);
        } else {
          still.push(rel);
        }
      });
      s.player.releases = still;
    },

    /* ---------------- stream accrual ---------------- */
    accrueStreams() {
      const s = K.state;
      const p = s.player;

      p.songs.forEach(song => {
        if (!song.dailyStreams) song.dailyStreams = K.game.initialDaily(song);

        /* v10 GERÇEKLİK DÜZELTMESİ — VİRAL ARTIK SÜRELİ.
           Eski hâlde song.viral bir kez true olduktan sonra ASLA sönmüyordu;
           bu da dailyStreams'i her gün %1 büyütüp şarkıyı sonsuza dek
           şişiriyordu. Gerçekte viral bir pencere 2-5 hafta sürer, sonra
           şarkı normal seyrine döner. */
        if (song.viral && song.viralUntil && s.day > song.viralUntil) {
          song.viral = false;
          song.viralEndedDay = s.day;
          if (!song.viralEndNotified) {
            song.viralEndNotified = true;
            s.notifications = (s.notifications || []).concat([{
              title: "📉 Viral dönemi bitti",
              msg: `"${song.title}" trend penceresini kapattı; dinlenme normal seyrine dönüyor.`,
              kind: "warn", day: s.day
            }]).slice(-60);
          }
        }

        // yaşlanma + promosyon + trend çarpanları
        let mult = 1;
        const ageDays = s.day - (song.publishedDay || s.day);

        // doğal düşüş
        song.dailyStreams *= (1 - song.decayRate * 0.01);

        // platform promo çarpanları (zamanla söner)
        song.boosts = song.boosts || {};
        Object.keys(song.boosts).forEach(k => {
          mult += song.boosts[k];
          song.boosts[k] *= 0.86;                 // günlük sönüm
          if (song.boosts[k] < 0.01) delete song.boosts[k];
        });

        // chart ivmesi
        if (song.chartRank && song.chartRank <= 10) mult += 0.12;
        if (song.viral) mult += 0.5;

        // KISA VİDEO (ses trendi) hunisi: UGC video sayısı dinlenmeyi besler
        if (K.shortform) mult += K.shortform.boostFor(song);

        // KAMU İMAJI etkisi (iyi imaj → biraz daha dinlenme, kötü imaj → az)
        mult += ((p.image || 50) - 50) / 500;

        // yorgunluk (yan iş) müzik performansını düşürür
        const energy = 1 - Math.min(0.35, (s.player.fatigue || 0) / 220);
        const daily = Math.max(5, Math.round(song.dailyStreams * mult * energy * U.rand(0.9, 1.12)));
        song.dailyStreams = Math.max(5, song.dailyStreams * (song.viral ? 1.01 : 0.997));

        song.streams += daily;
        song.lastDaily = daily;
        song.ageDays = ageDays;

        // platform dağılımı (temsilî) — v10: 4. kalem "diğer mağazalar"
        // (Deezer/Amazon/TIDAL/SoundCloud/Instagram vb. toplamı)
        song.platforms = song.platforms || { spotify: 0.46, apple: 0.19, youtube: 0.28, other: 0.07 };
        if (song.platforms.other == null) {
          const s0 = song.platforms;
          const sum = (s0.spotify || 0) + (s0.apple || 0) + (s0.youtube || 0);
          const k = sum > 0 ? (1 - 0.07) / sum : 1;
          song.platforms = {
            spotify: (s0.spotify || 0) * k,
            apple: (s0.apple || 0) * k,
            youtube: (s0.youtube || 0) * k,
            other: 0.07
          };
        }
        song.spotifyStreams = Math.round(song.streams * song.platforms.spotify);
        song.appleStreams = Math.round(song.streams * song.platforms.apple);
        song.youtubeViews = Math.round(song.streams * song.platforms.youtube * 1.1);

        // AYLIK TELİF: günlük gelir YOK. Platform bazlı biriktirilir,
        // ay sonunda ödenir. Sadece o ayın YENİ dinlenmeleri ödenir.
        song.month = song.month || { spotify: 0, apple: 0, youtube: 0, other: 0 };
        if (song.month.other == null) song.month.other = 0;
        song.month.spotify += daily * song.platforms.spotify;
        song.month.apple += daily * song.platforms.apple;
        song.month.youtube += daily * song.platforms.youtube;
        song.month.other += daily * (song.platforms.other || 0);

        p.streams += daily;

        // sözlere bağlı hayran dönüşümü (duygusal temalar daha sadık kitle)
        const loy = song.lyricLoyalty || 1;
        p.ig += Math.round(daily * 0.0016 * loy);
        p.tiktok += Math.round(daily * 0.0012 * loy);
      });

      // günlük toplam dinlenme geçmişi (hareketli pencere — birikmez)
      const dailyTotal = U.sum(p.songs, x => x.lastDaily || 0);
      p.dailyHistory = p.dailyHistory || [];
      p.dailyHistory.push(dailyTotal);
      if (p.dailyHistory.length > 90) p.dailyHistory = p.dailyHistory.slice(-90);

      // oyuncunun toplam sosyal takipçi organik büyümesi
      const pop = p.popularity;
      p.ig = Math.round(p.ig + Math.max(0, pop * U.rand(0.4, 1.2)));
      p.tiktok = Math.round(p.tiktok + Math.max(0, pop * U.rand(0.5, 1.6)));
      p.x = Math.round(p.x + Math.max(0, pop * U.rand(0.2, 0.8)));
      p.ytSubs = Math.round(p.ytSubs + Math.max(0, pop * U.rand(0.15, 0.6)));
    },

    /* ---------------- ALBÜMLER ---------------- */
    accrueAlbums() {
      const s = K.state, p = s.player;
      (p.albums || []).forEach(alb => {
        const tracks = (alb.trackIds || []).map(id => p.songs.find(x => x.id === id)).filter(Boolean);
        alb.streams = U.sum(tracks, t => t.streams);
        alb.lastDaily = U.sum(tracks, t => t.lastDaily || 0);
        alb.trackCount = tracks.length;
        const age = s.day - alb.releasedDay;
        if (!alb.critics && age >= 7) {
          const avgQ = tracks.length ? U.sum(tracks, q => q.quality) / tracks.length : 50;
          const crit = U.clamp(Math.round(avgQ * 0.55 + (alb.cohesion || 50) * 0.35 + Math.min(10, (alb.lastDaily || 0) / 9000)), 20, 100);
          alb.critics = crit;
          K.toast("📝 Albüm kritiği", `"${alb.title}" — ${crit}/100 (${crit >= 80 ? "övgü aldı" : crit >= 60 ? "olumlu" : "karışık"})`, crit >= 70 ? "ok" : "");
        }
      });
    },

    buildAlbumChart() {
      const s = K.state, p = s.player;
      const entries = [];
      const D = K.DISCOGRAPHY || {};
      const rising = [];
      K.artistList().forEach(a => {
        (D[a.id] || []).slice(0, 2).forEach((al, i) => {
          const daily = Math.round((a.monthly / 30) * U.rand(0.35, 0.9) * (1 - i * 0.15) * 0.4);
          const e = { id: "npc_" + a.id + "_" + i, title: al.title, artistId: a.id, artistName: a.stageName, daily, art: al.art, mine: false, pop: a.popularity };
          entries.push(e);
          if (a.popularity <= 60) rising.push(e);
        });
      });
      (p.albums || []).forEach(alb => {
        const e = { id: alb.id, title: alb.title, artistId: "player", artistName: p.stageName, daily: alb.lastDaily || 0, art: null, mine: true, critics: alb.critics, concept: alb.conceptName };
        entries.push(e);
        if (p.popularity <= 60) rising.push(e);
      });
      entries.sort((a, b) => b.daily - a.daily);
      const prev = {}; (s.albumChart || []).forEach((e, i) => { prev[e.id] = i + 1; });
      // tüm albümleri sırala (oyuncunun albümü listeye girmese de sırasını bilir)
      const ranked = entries.map((e, i) => {
        const rank = i + 1; const old = prev[e.id] || rank;
        return { ...e, rank, delta: old - rank };
      });
      /* yükselen (bağımsız/alt seviye) albüm listesi */
      rising.sort((a, b) => b.daily - a.daily);
      const risingRanked = rising.map((e, i) => ({ ...e, rank: i + 1 }));

      ranked.forEach(e => {
        if (e.mine) {
          const alb = (p.albums || []).find(x => x.id === e.id);
          if (alb) {
            alb.chartRank = e.rank;
            alb.chartPeak = Math.min(alb.chartPeak || 999, e.rank);
            const r = risingRanked.find(x => x.id === e.id);
            alb.risingRank = r ? r.rank : null;
            alb.risingPeak = Math.min(alb.risingPeak || 999, alb.risingRank || 999);
          }
        }
      });
      s.albumChart = ranked.slice(0, 50);
      s.albumChartRising = risingRanked.slice(0, 20);
    },

    initialDaily(song) {
      const g = K.genreById(song.genre);
      // gerçekçi: yeni bir bağımsız yayın ilk günlerde çok az dinlenir
      const base = 45 + ((song.budget || 0) / 1000) * 1.3 + ((song.marketing || 0) / 1000) * 2.4;
      // mağaza dağıtım genişliği ilk gün ivmesini etkiler
      return Math.round(base * (song.quality / 65) * g.mass * (song.storeReach || 1) * U.rand(0.7, 1.35));
    },

    /* ---------------- NPC dünyası ---------------- */
    /* ---------------- ENDÜSTRİ (NPC sanatçı dünyası) -------------
       v10.8 GERÇERLİK DÜZELTMESİ — eskiden NPC sanatçıların dinleyicisi
       günde ±%0,6 RASTGELE sallanıyordu; hiçbiri 420 gün boyunca TEK
       ŞARKI bile çıkarmıyordu. Ama IG'de "Yeni iş yolda 🎧", DM'de
       "yeni işim için promo ayarlar mısın" yazıyorlardı — sözleriyle
       çelişiyorlardı. Artık her sanatçının KENDİ yayın kadansı var:
         • yayın → GERÇEK diskoğrafiden bir şarkı (K.REAL_SONGS)
         • dinleyici sıçraması + popülerlik artışı, sonra 3 haftada söner
         • sosyal medyada gerçekten duyurulur (gerçek kapakla)
         • takip ediyorsan DM/bildirim gelir
       Böylece liste de, sanatçı sayfaları da, sosyal akış da canlı kalır. */
    accrueArtistWorld() {
      const s = K.state;
      s.industry = s.industry || { released: {}, log: [] };
      K.artistList().forEach(a => {
        /* temel çizgi + sönümlenen yayın etkisi */
        a._base = a._base || a.monthly;
        a._boost = (a._boost || 0) * 0.97;                 // yayın etkisi ~3 haftada söner
        a._base = a._base * (1 + 0.0004 * (1 + (a.popularity || 50) / 100));  // yavaş kariyer büyümesi
        const drift = U.rand(-0.004, 0.006);
        a.monthly = Math.max(50000, Math.round(a._base * (1 + a._boost) * (1 + drift)));
        a.streams = Math.round(a.streams + a.monthly / 30 * U.rand(0.6, 1.5));
        a.popularity = U.clamp(a.popularity + U.rand(-0.15, 0.22) + a._boost * 0.5, 30, 99);
        // sosyal
        a.ig = Math.round(a.ig + a.popularity * U.rand(0.1, 0.5));
        a.tiktok = Math.round(a.tiktok + a.popularity * U.rand(0.1, 0.6));
        a.x = Math.round(a.x + a.popularity * U.rand(0.05, 0.3));
        a.ytSubs = Math.round(a.ytSubs + a.popularity * U.rand(0.05, 0.2));

        /* --- YAYIN KADANSI --- */
        if (a._nextRelease == null) {
          /* ilk yayın: oyun başında sanatçı başına dağıtılmış */
          a._nextRelease = s.day + U.randInt(12, 120);
        }
        if (s.day >= a._nextRelease) K.game.npcRelease(a);
      });
    },

    /* bir NPC sanatçının yeni şarkısı */
    npcRelease(a) {
      const s = K.state;
      s.industry = s.industry || { released: {}, log: [] };
      const used = (s.industry.released[a.id] = s.industry.released[a.id] || []);
      const pool = (K.REAL_SONGS && K.REAL_SONGS[a.id]) || [];
      const next = pool.find(x => used.indexOf(x.title) < 0);

      /* gerçek diskografi bittiyse temsilî bir başlık üret */
      let song;
      if (next) {
        song = { title: next.title, art: next.art, album: next.album, year: next.year };
      } else {
        const names = ["Gece Yarısı", "Beton Çiçek", "Sessiz Şehir", "Son Mektup", "Kör Nokta",
          "Yalnız Değilim", "Ağır Gelir", "Bırakma", "Uzak İhtimal", "Kirli Hava",
          "Sabaha Karşı", "Kayıp Frekans", "Islak Sokak", "Aynı Yer", "Yeni Bir Gün"];
        song = { title: U.pick(names) + (U.chance(0.3) ? " (feat. " + U.pick(K.artistList()).stageName + ")" : ""), art: null, album: "Single", year: String(2008 + Math.floor((s.day || 1) / 365)) };
      }
      used.push(song.title);

      /* etki: küçük sanatçıda oransal sıçrama büyük, yıldızda küçük */
      const big = (a.popularity || 50) >= 75;
      let gain = big ? U.rand(0.04, 0.11) : U.rand(0.10, 0.32);

      /* OYUNCUNUN ŞİRKETİNDEYSE: gerçek destek.
         Şirket gücü + personel → daha büyük sıçrama; yani "kadroya
         almak" somut bir getiri sağlar (eskiden sadece rastgele büyüyordu). */
      const onMyRoster = !!(s.label && a.labelId === "my_label");
      if (onMyRoster) {
        const support = 1 + Math.min(0.5, K.label.power() / 250) +
          (K.label.staffLevel("producer") || 0) * 0.05 + (K.label.staffLevel("pr") || 0) * 0.04;
        gain *= support;
      }
      a._boost = Math.min(0.6, (a._boost || 0) + gain);
      a.popularity = U.clamp((a.popularity || 50) + (big ? U.rand(0.3, 1.1) : U.rand(0.6, 2.4)), 30, 99);
      a.monthly = Math.round(a.monthly * (1 + gain));

      /* sonraki yayına kadar: popüler sanatçı sık, diğeri seyrek */
      const gap = Math.round(U.rand(50, 150) * (1.7 - (a.popularity || 50) / 100));
      a._nextRelease = s.day + gap;
      a.lastReleaseDay = s.day;

      /* şirket etiketiyle çıktıysa şirket kataloğuna yaz */
      if (onMyRoster) {
        s.label.catalog = s.label.catalog || [];
        s.label.catalog.unshift({ title: song.title, artistId: a.id, day: s.day });
        s.label.catalog = s.label.catalog.slice(0, 60);
        s.notifications = (s.notifications || []).concat([{
          title: "🏢 Şirket yayını",
          msg: `${a.stageName} — "${song.title}" şirketin etiketiyle çıktı.`,
          kind: "ok", day: s.day
        }]).slice(-60);
      }

      s.industry.log.unshift({ day: s.day, artistId: a.id, artistName: a.stageName, title: song.title, art: song.art });
      s.industry.log = s.industry.log.slice(0, 40);

      /* sosyal medyada gerçekten duyur (gerçek kapakla) */
      if (K.social && K.social.npcReleasePost) K.social.npcReleasePost(a, song);

      /* takip ediyorsan haberdar ol */
      if (K.interactions && K.interactions.isFollowed && K.interactions.isFollowed(a.id)) {
        s.notifications = (s.notifications || []).concat([{
          title: "🎧 Yeni yayın: " + a.stageName,
          msg: `"${song.title}" çıktı.`, kind: "ok", day: s.day
        }]).slice(-60);
      }
    },

    /* ---------- oyuncu aylık dinleyici & popülerlik ---------- */
    refreshMonthly() {
      const p = K.state.player;
      // AYLIK DİNLEYİCİ: son 28 günün penceresi. Geçmiş dinleyici
      // üstüne eklenmez; dinlenme düşerse dinleyici de düşer.
      const win = (p.dailyHistory || []).slice(-28);
      const windowStreams = U.sum(win);
      const baseline = p.popularity * 55;                        // organik taban
      p.monthly = Math.round(Math.max(windowStreams * 0.5, 0) + baseline);

      // popülerlik: GÜNCEL dinleyiciye bağlı (birikmez, düşebilir)
      // ------------------------------------------------------------
      // DÜZELTME (v10.7): itibar artık TOPLAMSAL değil ÇARPANSAL etki eder.
      // Eskiden `sqrt(dinleyici) + itibar×0,28` idi; bu yüzden 6,5 bin
      // aylık dinleyicili bir oyuncu 31, 50 bin dinleyicili bir oyuncu 17
      // popülerlik alabiliyordu — yani popülerlik gerçek kitleyi değil,
      // itibarı ölçüyordu. Artık itibar dinleyici tabanını katsayılar:
      // popülerlik, dinleyicinin HAK ETTİĞİNİN üstüne çıkamaz.
      const topChart = p.songs.filter(s => s.chartRank && s.chartRank <= 20).length;
      /* Kalibrasyon (NPC ölçeğiyle uyumlu):
         Şehinşah ≈ 4,2M aylık dinleyici → popülerlik ≈ 88-91 (kayıtlı: 88)
         1M aylık dinleyici → ≈ 44  (şirket kurma eşiği 45 → hak edilmiş sınır)
         40 bin dinleyici → ≈ 9 */
      const byListeners = Math.sqrt(Math.max(0, p.monthly) / 700);
      const target = U.clamp(
        byListeners * (1 + (p.reputation || 0) / 400) + topChart * 1.1,
        0, 99
      );
      p.popularity = U.clamp(p.popularity + (target - p.popularity) * 0.045 + U.rand(-0.15, 0.18), 0, 99);
    },

    /* ---------------- listeler ---------------- */
    npcTrack(a) {
      const s = K.state;
      s._npcTracks = s._npcTracks || {};
      if (!s._npcTracks[a.id]) {
        const pool = ["Gece", "Sokak", "Yalan", "Karma", "Rüya", "Ateş", "Sisli", "Kayıp",
          "Son Dans", "Bir Şans", "Kırmızı", "Derin", "Yıldız", "Sessiz", "Fırtına", "Melek",
          "Kalbim", "Şehir", "Vazgeç", "Yolun Sonu"];
        const pool2 = ["Prodüksiyon", "Beat", "Remix", "Live", "Freestyle", "Snippet", "Acoustic"];
        const t = U.pick(pool) + (U.chance(0.4) ? " " + U.pick(pool2) : "");
        s._npcTracks[a.id] = { title: t, artistId: a.id };
      }
      return s._npcTracks[a.id];
    },

    buildChart() {
      const s = K.state;
      const entries = [];

      // 1) GERÇEK liste (Apple Music Türkiye Top 50 anlık görüntüsü)
      (K.REAL_CHART || []).forEach((e, i) => {
        const base = Math.round(640000 * Math.pow(0.952, i));
        const jitter = Math.round(base * 0.02);
        let daily = Math.max(900, base + U.randInt(-jitter, jitter));
        /* v10.8 — NPC sanatçı yeni şarkı çıkardıysa listede YÜKSELİR.
           Eskiden liste donmuş bir anlık görüntüydü; şimdi endüstri hareket ediyor. */
        const art = (e.artistName && K.resolveArtistByName) ? K.resolveArtistByName(e.artistName) : null;
        if (art && art._boost) daily = Math.round(daily * (1 + art._boost));
        entries.push({
          id: "real_" + i,
          title: e.title,
          artistId: "real",
          artistName: e.artistName,
          daily,
          total: daily * (40 + (i % 25)),
          cover: "real" + i,
          art: e.art || null,
          mine: false,
          real: true
        });
      });

      // 2) oyuncunun şarkıları (dinlenmelerine göre listeye girer)
      //    GERÇEKLİK: yayınlandığı GÜN ulusal listeye girilmez; en az 2 gün gerekir.
      s.player.songs.forEach(song => {
        const age = s.day - (song.publishedDay || s.day);
        if (age < 2) return;
        if ((song.lastDaily || 0) < 500) return;   // eşik altındaki iş listeye girmez
        entries.push({
          id: song.id, title: song.title, artistId: "player",
          artistName: s.player.stageName, daily: song.lastDaily || 0,
          total: song.streams, cover: song.coverSeed, mine: true,
          art: null, featWith: song.featWith || null
        });
      });

      entries.sort((a, b) => b.daily - a.daily);
      const prev = {};
      (s.chart || []).forEach((e, i) => { prev[e.id] = i + 1; });

      s.chart = entries.slice(0, 50).map((e, i) => {
        const rank = i + 1;
        const old = prev[e.id] || rank;
        return { ...e, rank, delta: old - rank, prevRank: old };
      });

      // oyuncu şarkılarına chart bilgisi yaz
      s.chart.forEach(e => {
        if (e.mine) {
          const song = s.player.songs.find(x => x.id === e.id);
          if (song) {
            song.chartRank = e.rank;
            song.chartPeak = Math.min(song.chartPeak || 999, e.rank);
          }
        }
      });
    },

    /* Bir şarkıyı SÜRELİ viral yapar. Süre dolunca viral kendiliğinden
       söner (accrueStreams içinde kontrol edilir). */
    markViral(song, title, msg, days) {
      if (!song) return false;
      const s = K.state;
      const dur = days || U.randInt(16, 34);
      song.viral = true;
      song.viralUntil = s.day + dur;
      song.viralStartDay = song.viralStartDay || s.day;
      song.viralEndNotified = false;
      if (title) K.toast(title, msg || song.title, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: title || "🔥 Viral", msg: (msg || song.title) + ` (${dur} günlük trend penceresi)`,
        kind: "ok", day: s.day
      }]).slice(-60);
      return true;
    },

    tickTrends() {
      const s = K.state;
      // son yayınlanan şarkı viral olabilir
      s.player.songs.forEach(song => {
        if (!song.viral && song.ageDays <= 3 && (song.lastDaily || 0) > 4000 && U.chance((0.06 + song.quality / 1200) * (song.viralBonus || 1))) {
          K.game.markViral(song, "📈 Viral oldu!", `"${song.title}" TikTok'ta trend oluyor!`);
        }
      });
      // trend listesi (X)
      const base = ["#TrapTürkiye", "#YeniŞarkı", "#Rap", "#SpotifyTürkiye", "#TikTokTrend",
        "#KarmaMusic", "#Underground", "#Feature", "#DrillTR", "#Gündem"];
      s.trends = U.shuffle(base).slice(0, 6).map(tag => ({
        tag, count: U.randInt(8, 480) * 1000
      }));

      // GÜNDEM: en sıcak haberler X gündemine düşer
      if (K.news && K.news.hot) {
        K.news.hot(3).forEach(tp => {
          const tag = "#" + tp.title.split(" ").filter(w => w.length > 3).slice(0, 2).join("");
          s.trends.unshift({ tag, count: U.randInt(30, 260) * 1000, news: true, cat: tp.cat });
        });
      }

      // oyuncunun gündemli şarkıları trend olabilir
      const agendaSongs = s.player.songs.filter(x => (x.agendaBoost || 0) > 0.15 || x.viral).slice(0, 2);
      agendaSongs.forEach(v => s.trends.unshift({
        tag: "#" + v.title.replace(/\s+/g, ""),
        count: U.randInt(20, 300) * 1000,
        mine: true,
        agenda: (v.agendaBoost || 0) > 0.15
      }));
      s.trends = s.trends.slice(0, 8);
    },

    /* ---------------- samimiyet doğal sönümü ---------------- */
    decayAffinity() {
      const s = K.state;
      Object.keys(s.relations).forEach(id => {
        const r = s.relations[id];
        if (!r.met) return;
        const idle = s.day - (r.lastInteract || 0);
        if (idle > 6) r.affinity = U.clamp(r.affinity - 0.5, 0, 100);
      });
    },

    /* ---------------- şarkı yayınlama (career tarafı) ---------------- */
    // (career.js içinde detaylandırıldı)
  };
})(window.K);
