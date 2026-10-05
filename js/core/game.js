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
      /* v10.30 — önce ÇALAN ARAMA (süreli, kaçırılmaması gereken bir karar) */
      if (K.calls && K.calls.ringingCount && K.calls.ringingCount() > 0) {
        setTimeout(() => K.calls.openNext(), 500);
      } else if (s.pendingIncident && K.incidents && K.incidents.openPending) {
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
      /* v10.43 — yan işler: vardiya/yorgunluk sayaçları sıfırlanır ve
         bekleyen iş başvuruları sonuçlanır (kabul/ret). */
      if (K.jobs && K.jobs.onNewDay) K.jobs.onNewDay();
      else if (K.jobs && K.jobs.resetDaily) K.jobs.resetDaily();

      // gündem/haberler tazele (kendi içinde 30 günde bir yenilenir)
      if (K.news && K.news.refresh) K.news.refresh();

      K.game.advanceReleases();
      K.game.tickAttention();      // v10.17 — dikkat dalgası söner, doygunluk azalır
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
        if (K.assets && K.assets.monthly) K.assets.monthly();      // v10.28 pasif varlık geliri
        if (K.intl && K.intl.monthly) K.intl.monthly();            // v10.28 yurt dışı telif
        if (K.economy.chargeMonthly) K.economy.chargeMonthly();
      }
      K.game.buildChart();
      K.game.buildRisingChart();
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
      /* v10.58 — yaşayan endüstri: NPC ağı + dünya olayları + oyuncu yankısı */
      if (K.industry && K.industry.tick) K.industry.tick();
      /* v10.59 — yaşayan label: keşif · transfer · rekabet · itibar */
      if (K.labelSim && K.labelSim.tick) K.labelSim.tick();
      if (K.concerts && K.concerts.tick) K.concerts.tick();
      if (K.festivals && K.festivals.tick) K.festivals.tick();
      if (K.rollout && K.rollout.tick) K.rollout.tick();
      if (K.certifications && K.certifications.tick) K.certifications.tick();
      if (K.yearwrap && K.yearwrap.tick) K.yearwrap.tick();
      if (K.awards && K.awards.tick) K.awards.tick();
      if (K.rivalry && K.rivalry.tick) K.rivalry.tick();
      if (K.beef && K.beef.dailyTick) K.beef.dailyTick();
      if (K.crisis && K.crisis.maybeStart) K.crisis.maybeStart();
      /* v10.28 — genişleme paketi (altı sistem) */
      if (K.writing && K.writing.tick) K.writing.tick();
      /* v10.54 — başkasına gönderilen sözlerin yayın telifi */
      if (K.writing && K.writing.publishingTick) K.writing.publishingTick();
      if (K.merch && K.merch.tick) K.merch.tick();
      if (K.assets && K.assets.tick) K.assets.tick();
      if (K.mental && K.mental.tick) K.mental.tick();
      if (K.shady && K.shady.tick) K.shady.tick();
      if (K.intl && K.intl.tick) K.intl.tick();
      /* v10.30 — gelen aramalar + yabancı DM'ler */
      if (K.calls && K.calls.tick) K.calls.tick();
      if (K.dms && K.dms.tick) K.dms.tick();
      if (K.stats && K.stats.record) K.stats.record();

      K.game.decayAffinity();
      K.game.silenceWarning();   // v10.32 — katalog sönümü görünür olsun

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
    /* ============================================================
       v10.17 — DİKKAT DALGASI (yüksel → zirve → düş)
       Ayrıntılı gerekçe: K.ECON içindeki attention* / fatigue* bloğu.
       ============================================================ */

    /* mevcut dalga katsayısı (1 = nötr). Katalog dinlenmesini çarpar. */
    attention() {
      const p = K.state && K.state.player;
      if (!p) return 1;
      if (p.att == null) p.att = 1;          // eski kayıtlar için güvenli başlangıç
      return U.clamp(p.att, 0.35, K.ECON.attentionMax || 2.3);
    },

    /* doygunluk seviyesi (okuma/arayüz için) */
    fatigueAttention() {
      const p = K.state && K.state.player;
      return p ? U.clamp(p.fatigueAtt || 0, 0, 1) : 0;
    },

    /* yayın yapıldığında dalgayı besle.
       strength 0..1,4 arası: kalite + tanıtım + gündem uyumu.
       Doygunluk arttıkça aynı yayının kazancı AZALIR. */
    bumpAttention(strength) {
      const p = K.state && K.state.player;
      if (!p) return 1;
      if (p.att == null) p.att = 1;
      p.fatigueAtt = p.fatigueAtt || 0;
      const st = U.clamp(strength == null ? 0.7 : strength, 0, 1.4);
      const gain = (K.ECON.attentionGain || 0.62) * st * (1 - p.fatigueAtt);
      p.att = Math.min(K.ECON.attentionMax || 2.3, p.att + gain);
      p.fatigueAtt = Math.min(K.ECON.fatigueMax || 0.74, p.fatigueAtt + (K.ECON.fatigueStep || 0.17));
      return p.att;
    },

    /* günlük: dalga nötre çöker, doygunluk çok yavaş azalır */
    tickAttention() {
      const p = K.state && K.state.player;
      if (!p) return;
      if (p.att == null) p.att = 1;
      p.fatigueAtt = p.fatigueAtt || 0;
      const d = K.ECON.attentionDecay || 0.978;
      p.att = 1 + (p.att - 1) * d;
      if (p.att < 1.001) p.att = 1;
      p.fatigueAtt *= (K.ECON.fatigueRecovery || 0.9955);
      if (p.fatigueAtt < 0.001) p.fatigueAtt = 0;
    },

    /* ---------- SON YAYINDAN BU YANA GEÇEN GÜN (v10.32) ----------
       Katalogdaki EN YENİ yayın esas alınır; demo/taslak parçalar
       (publishedDay yok) sayılmaz. Hiç yayın yoksa büyük bir değer
       döner — kariyer henüz başlamamış demektir. */
    daysSinceRelease() {
      const p = K.state.player;
      let last = -1;                       // -1 = "hiç yayın yok" işareti
      (p.songs || []).forEach(x => {
        const d = x.publishedDay;
        if (typeof d === "number" && d >= 0 && d > last) last = d;
      });
      return last >= 0 ? Math.max(0, K.state.day - last) : 999;
    },

    /* ---------- UNUTULMA ÇARPANI (v10.32) ----------
       Yayınsız ilk `silenceGrace` gün ceza yok: iki single arası 30 gün
       normaldir. Sonrasında üstel derinleşir ve `silenceFloor`'da durur.

       Neden gerekliydi? Şarkı başına dinlenme tabanı (5) katalog
       büyüklüğüyle DOĞRUSAL büyüyordu; 34 şarkılık ölü bir katalog
       günde 170 dinlenme üretip aylık ~2.500 dinleyiciyi süresiz
       koruyordu. Taban artık bu çarpanla birlikte sönümleniyor. */
    silenceDecay() {
      const silence = K.game.daysSinceRelease() - (K.ECON.silenceGrace || 30);
      if (silence <= 0) return 1;
      const d = K.ECON.silenceDecay || 0.9945;
      return Math.max(K.ECON.silenceFloor || 0.22, Math.pow(d, silence));
    },

    /* ---------- UNUTULMA UYARISI (v10.32) ----------
       Sönüm oyuncuya GÖRÜNMEZ olmamalı: kitle neden eridiğini
       anlamadan cezalandırılmak haksız hissi verir. Eşikler geçildiğinde
       TEK SEFERLİK uyarı düşer (her gün tekrarlamaz). Yeni yayın
       yapıldığında sayaç kendiliğinden sıfırlanır. */
    silenceWarning() {
      const s = K.state, p = s.player;
      const days = K.game.daysSinceRelease();
      if (days >= 999) return;                       // henüz hiç yayın yok
      const silence = days - (K.ECON.silenceGrace || 30);
      if (silence <= 0) { p._silenceWarned = 0; return; }

      const THRESHOLDS = [15, 45, 90, 180];          // ek süre (gün)
      const hit = THRESHOLDS.filter(t => silence >= t).pop() || 0;
      if (!hit || hit <= (p._silenceWarned || 0)) return;
      p._silenceWarned = hit;

      const pct = Math.round(K.game.silenceDecay() * 100);
      s.notifications = (s.notifications || []).concat([{
        title: "📉 Katalog sönümleniyor",
        msg: `${days} gündür yayın yok. Dinleyici tabanı %${pct}'ine indi — ` +
             `yeni bir yayın dalgayı yeniden besler.`,
        kind: "warn",
        day: s.day
      }]).slice(-60);
    },

    accrueStreams() {
      const s = K.state;
      const p = s.player;
      const att = K.game.attention();   // v10.17 — günün dalga katsayısı
      /* v10.32 — şarkı başına taban ARTIK SÖNÜMLÜ: sanatçı görünmez
         kaldıkça katalog da unutulur. Aktifken (≤30 gün) değer sabittir,
         yani normal oynayış hiç etkilenmez. */
      const catFloor = Math.max(0.2, (K.ECON.catalogFloor || 5) * K.game.silenceDecay());

      p.songs.forEach(song => {
        if (!song.dailyStreams && !song.takenDown) song.dailyStreams = K.game.initialDaily(song);

        /* v10.40 — A5: TEMİZLENMEMİŞ SAMPLE → TAKEDOWN RİSKİ.
           Örnek hakkı ödenmediyse yayın ilk 30 günde kaldırılabilir.
           Günlük olasılık = toplam risk / pencere; toplamı %16 civarı. */
        if (song.sampleRisk && !song.takenDown) {
          const win = (K.meta ? K.meta.SAMPLE_TAKEDOWN_DAYS : 30);
          const age = s.day - (song.publishedDay || s.day);
          if (age <= win && Math.random() < ((K.meta ? K.meta.SAMPLE_RISK : 0.16) / win)) {
            song.takenDown = true;
            song.takenDownDay = s.day;
            song.dailyStreams = 0;
            song.lastDaily = 0;
            song.playlists = [];
            song.chartRank = null;
            s.notifications = (s.notifications || []).concat([{
              title: "🚫 Yayın kaldırıldı",
              msg: `"${song.title}" örnek hakkı ödenmediği için mağazalardan çekildi. Sample clearance bedelini ödeyerek bunu önleyebilirdin.`,
              kind: "bad", day: s.day
            }]).slice(-60);
            if (K.toast) K.toast("🚫 Takedown", `"${song.title}" örnek hakkı nedeniyle kaldırıldı.`, "bad");
          }
        }
        if (song.takenDown) { song.lastDaily = 0; return; }

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
        /* v10.17 — dikkat dalgası katalogun tamamına uygulanır:
           yeni yayın dalgayı beslediğinde yalnızca yeni şarkı değil,
           tüm katalog daha çok dinlenir (gerçekte de öyle olur). */
        const daily = Math.max(0, Math.round(song.dailyStreams * mult * energy * att * U.rand(0.9, 1.12)));
        song.dailyStreams = Math.max(catFloor, song.dailyStreams * (song.viral ? 1.01 : 0.997));

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
        /* v10.42 — C4: YouTube Content ID. Başkalarının videolarında
           kullanımdan doğan ek dinlenme; "diğer mağazalar" kalemine eklenir. */
        if (song.contentId) {
          const cid = daily * (K.meta ? K.meta.CONTENT_ID_YIELD : 0.035);
          song.month.other += cid;
          song.contentIdTotal = (song.contentIdTotal || 0) + cid;
        }

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
      /* v10.16 — tembel veri katmanı (P-1) */
      const D = K.lazy ? K.lazy.raw("discography") : (K.DISCOGRAPHY || {});
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
         • yayın → GERÇEK diskoğrafiden bir şarkı (v10.16: K.lazy.songs())
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
        /* v10.56 — TAVAN: eskiden `_base` her gün çarpımsal büyüyordu (pop 88
           için ≈%31/yıl) ve hiçbir sınır yoktu; 5 oyun yılında Şehinşah
           4,2M → ~16M oluyordu. Artık lojistik büyüme: popülerliğe bağlı bir
           tavana yaklaşırken hız sıfıra iner. */
        const _cap = 500000 + (a.popularity || 50) * 110000;
        const _grow = 0.0004 * (1 + (a.popularity || 50) / 100);
        a._base = a._base * (1 + _grow * Math.max(0, 1 - a._base / _cap));
        const drift = U.rand(-0.004, 0.006);
        /* v10.61 — bu satır artık yalnızca geriye dönük uyum içindir;
           birazdan monthly GERÇEK 28 günlük stream penceresinden türetilir. */
        a.monthly = Math.max(50000, Math.round(a._base * (1 + a._boost) * (1 + drift)));
        /* ÖMÜR BOYU AKIŞ: v10.60 formülü BİREBİR korunur (yan etki yok). */
        const _r = U.rand(0.6, 1.5);
        a.streams = Math.round((a.streams || 0) + a.monthly / 30 * _r);
        /* v10.61 — katalog günlük akışı (pencere için). Aynı RNG değeri
           kullanılır; ortalama 1,0 olacak biçimde normalize edilir, yani
           EK RNG çağrısı YOK ve akış sırası bozulmaz. */
        const _npcDiv = (K.industry && K.industry.NPC_MONTHLY) ? K.industry.NPC_MONTHLY.CATALOG_DIV : 14;
        const _catDaily = Math.max(1, Math.round((a._base || a.monthly) / _npcDiv * (_r / 1.05)));
        /* v10.61 — flop sonrası kısa süreli katalog hasarı */
        const _catAdj = (a._flopUntil && s.day <= a._flopUntil) ? 0.85 : 1;
        a.popularity = U.clamp(a.popularity + U.rand(-0.15, 0.22) + a._boost * 0.5, 30, 99);
        // sosyal
        a.ig = Math.round(a.ig + a.popularity * U.rand(0.1, 0.5));
        a.tiktok = Math.round(a.tiktok + a.popularity * U.rand(0.1, 0.6));
        a.x = Math.round(a.x + a.popularity * U.rand(0.05, 0.3));
        a.ytSubs = Math.round(a.ytSubs + a.popularity * U.rand(0.05, 0.2));

        /* v10.60 — yayın sonrası dinlenme akışı (deterministik, RNG'siz).
           Release → günlük stream → sanatçı toplamı zincirini kurar. */
        if (K.industry && K.industry.decayReleaseStreams) K.industry.decayReleaseStreams(a);
        /* v10.61 — 28 günlük pencere → NPC aylık dinleyici (yaşayan değer).
           Katalog akışı da pencereye yazılır; monthly buradan türetilir. */
        if (K.industry && K.industry.npcMonthlyTick) K.industry.npcMonthlyTick(a, _catDaily * _catAdj);

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
      /* v10.16 — tembel veri katmanı (P-1) */
      const pool = K.lazy ? K.lazy.songs(a.id) : ((K.REAL_SONGS && K.REAL_SONGS[a.id]) || []);
      const next = pool.find(x => used.indexOf(x.title) < 0);

      /* gerçek diskografi bittiyse temsilî bir başlık üret */
      let song;
      if (next) {
        song = { title: next.title, art: next.art, album: next.album, year: next.year };
      } else {
        const names = ["Gece Yarısı", "Beton Çiçek", "Sessiz Şehir", "Son Mektup", "Kör Nokta",
          "Yalnız Değilim", "Ağır Gelir", "Bırakma", "Uzak İhtimal", "Kirli Hava",
          "Sabaha Karşı", "Kayıp Frekans", "Islak Sokak", "Aynı Yer", "Yeni Bir Gün"];
        /* v10.56 — yıl artık GERÇEK takvimden türetilir. Eskiden `2008 +
           gün/365` idi; oysa oyun gerçek tarihten (dateStart) başlıyor, yani
           gün 400'de şarkı "2009" etiketi alırken gerçek tarih 2027 oluyordu. */
        const relYear = (K.util.dateForDay ? K.util.dateForDay(s.day || 1).y : new Date().getFullYear());
        /* v10.60 — feature ortağı artık KİMLİK olarak da saklanır; böylece
           ortak iş iki kitlenin dinleyicisini birleştirebilir. RNG sırası
           korunur (pick(names) → chance(0.3) → pick(artists)). */
        const _name = U.pick(names);
        const _feat = U.chance(0.3) ? U.pick(K.artistList()) : null;
        song = { title: _name + (_feat ? " (feat. " + _feat.stageName + ")" : ""), art: null, album: "Single", year: String(relYear) };
        if (_feat && _feat.id !== a.id) song.featWith = _feat.id;
      }
      used.push(song.title);

      /* etki: küçük sanatçıda oransal sıçrama büyük, yıldızda küçük */
      const big = (a.popularity || 50) >= 75;
      let gain = big ? U.rand(0.04, 0.11) : U.rand(0.10, 0.32);
      /* v10.58 — her yayın tutmaz: yaşayan endüstri katmanı ara sıra
         "tutmayan iş" ya da "patlayan iş" sonucu uygular (deterministik). */
      if (K.industry && K.industry.adjustNpcRelease) gain = K.industry.adjustNpcRelease(a, gain);

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
      /* v10.61 — ESKİDEN burada `a.monthly = a.monthly * (1 + gain)` ile
         aylık dinleyici DOĞRUDAN yayın bonusuyla şişiyordu. O yapay
         sıçrama kaldırıldı; aylık dinleyici artık applyNpcRelease içinde
         28 günlük GERÇEK stream penceresinden türetiliyor. */

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

      /* v10.60 — YAŞAYAN RELEASE: sonucu oyuncunun dünyasıyla aynı
         kurallarla hesapla (ilk stream · trend · label · feature · chart).
         Mevcut RNG akışı KORUNUR; tüm ek hesaplar deterministiktir. */
      if (K.industry && K.industry.applyNpcRelease) {
        K.industry.applyNpcRelease(a, song, gain, big);
      }
    },

    /* ---------- ŞÖHRET DENETLEYİCİSİ (v10.9) ----------
       SORUN: popülerlik İKİ kaynaktan besleniyordu.
         1) `refreshMonthly` → dinleyiciye bağlı hedef (doğru model)
         2) olaylar → doğrudan ekleme: konser +5,4 · ödül +2,2 · TV +2,2
            · röportaj +3,2 · TV dizisi +... 
       Sonuç: 1.000 aylık dinleyicili bir oyuncu bir TV programıyla
       pop 30 olabiliyordu; yani popülerlik ile gerçek kitle kopuktu.
       ÇÖZÜM: tüm şöhret kazanımları bu fonksiyondan geçer ve dinleyicinin
       HAK ETTİĞİ değerin en fazla `fameHeadroom` puan üstüne çıkabilir.
       Tek bir hit ya da TV programı seni geçici olarak öne taşır, ama
       iki yıl boyunca hak etmediğin bir şöhreti taşımaz. */
    listenerTarget() {
      const p = K.state.player;
      const topChart = (p.songs || []).filter(s => s.chartRank && s.chartRank <= 20).length;
      const byListeners = Math.sqrt(Math.max(0, p.monthly) / 700);
      return U.clamp(byListeners * (1 + (p.reputation || 0) / 400) + topChart * 1.1, 0, 99);
    },

    /* şöhret ekle — dinleyicinin izin verdiği tavanla sınırlı */
    addFame(amount) {
      if (!amount) return;
      const p = K.state.player;
      const cap = Math.min(99, K.game.listenerTarget() + (K.ECON.fameHeadroom || 8));
      p.popularity = U.clamp(Math.min(cap, (p.popularity || 0) + amount), 0, 99);
    },

    /* ---------- oyuncu aylık dinleyici & popülerlik ---------- */
    refreshMonthly() {
      const p = K.state.player;
      // AYLIK DİNLEYİCİ: son 28 günün penceresi. Geçmiş dinleyici
      // üstüne eklenmez; dinlenme düşerse dinleyici de düşer.
      const win = (p.dailyHistory || []).slice(-28);
      const windowStreams = U.sum(win);
      /* v10.56 — "dinleyicisiz dinleyici" düzeltmesi: hiç yayın yapmamış bir
         sanatçının aylık dinleyicisi olmaz. Taban yalnızca yayın geçmişi
         varsa uygulanır ve daha ölçülüdür (55 → 30). */
      const hasCatalog = (p.songs || []).length > 0;
      const baseline = hasCatalog ? p.popularity * 30 : 0;
      p.monthly = Math.round(Math.max(windowStreams * 0.5, 0) + baseline);

      // popülerlik: GÜNCEL dinleyiciye bağlı (birikmez, düşebilir)
      // ------------------------------------------------------------
      // DÜZELTME (v10.7): itibar artık TOPLAMSAL değil ÇARPANSAL etki eder.
      // Eskiden `sqrt(dinleyici) + itibar×0,28` idi; bu yüzden 6,5 bin
      // aylık dinleyicili bir oyuncu 31, 50 bin dinleyicili bir oyuncu 17
      // popülerlik alabiliyordu — yani popülerlik gerçek kitleyi değil,
      // itibarı ölçüyordu. Artık itibar dinleyici tabanını katsayılar:
      // popülerlik, dinleyicinin HAK ETTİĞİNİN üstüne çıkamaz.
      /* Kalibrasyon (NPC ölçeğiyle uyumlu):
         Şehinşah ≈ 4,2M aylık dinleyici → popülerlik ≈ 88-91 (kayıtlı: 88)
         1M aylık dinleyici → ≈ 44
         550 bin aylık dinleyici → ≈ 28  (şirket kurma eşiği — bkz. labelFoundMinPop)
         40 bin dinleyici → ≈ 9
         NOT (v10.24): bu kalibrasyon artık ŞİRKET KADROSU için de tavan
         olarak kullanılıyor (systems/label.js) — aylık dinleyici ≈ pop²×700. */
      const target = K.game.listenerTarget();
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

      /* 3) v10.60 — NPC YAYINLARI: yaşayan endüstri chart'ta GERÇEK rakip.
         Oyuncunun şarkısı nasıl günlük dinlenmeyle listeye giriyorsa,
         NPC'nin yeni işi de aynı kuralla girer. Böylece NPC hit'i oyuncunun
         sırasını aşağı itebilir, oyuncunun hit'i NPC'leri geriye itebilir. */
      const lrAll = (s.industry && s.industry.lastRelease) || {};
      Object.keys(lrAll).forEach(id => {
        const lr = lrAll[id];
        if (!lr || !(lr.daily > 0)) return;
        const _age = s.day - (lr.day || 0);
        if (_age < 0 || _age > 45) return;   // henüz çıkmamış / eski iş listeye girmez
        if (lr.daily < 20000) return;         // ulusal listeye girecek eşik
        const na = K.artistById(id);
        if (!na) return;
        entries.push({
          id: "npc_" + id, title: lr.title || "Single",
          artistId: na.id, artistName: na.stageName,
          daily: Math.round(lr.daily), total: Math.round(lr.total || lr.daily),
          cover: na.id, art: lr.art || null, mine: false, npc: true,
          featWith: lr.featWith || null
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

    /* ============================================================
       v10.55 — "YÜKSELEN 20" (erken kariyer ulusal listesi)

       Sorun: ulusal KARMA Top 30, gerçek liste anlık görüntüsüyle
       kurulur; en alt sıra bile günlük ~58.000 dinlenme ister. Normal
       oynayışta (denge simülasyonu: 512 gün, tepe ~1.500/gün) oyuncu
       bu listeye HİÇ giremiyordu — yani "Listeler" sekmesinin ana
       vaadi ilk ~1,5 yıl ölüydü.

       Çözüm: gerçek listeyi bozmadan ALTINDA bir basamak ekle. Yükselen
       liste, henüz ulusal çapa ulaşmamış işleri (oyuncu + popülerliği
       düşük NPC sanatçılar) günlük dinlenmeye göre sıralar. Oyuncu ilk
       günden itibaren tırmandığı bir tablo görür; ulusal liste ise hak
       edilmiş hedef olarak kalır. ============================================ */
    /* "Yükselen" listesinde yarışan isimsiz çıkış sanatçıları.
       Neden gerçek NPC kadrosu DEĞİL? Oyundaki 37 NPC sanatçının tamamı
       yerleşik yıldızdır (Şehinşah, Ceza, Ezhel...) ve en zayıfının bile
       tek şarkısı ~800/gün eder. Oyuncunun ilk yayını ise ~10-300/gün;
       yani gerçek kadroyla kurulan bir "yükselen" listesine oyuncu asla
       giremezdi. Bu liste, oyuncunun kendi ölçeğinde yarıştığı bir
       merdivendir: isimleri sabit, günlük dinlenmesi ~15-1600 arasına
       yayılmış anonim çıkış sanatçıları. */
    RISING_NAMES: [
      "Mavi Kaset", "Sokak Şairi", "Kuzey Yıldızı", "Dumanlı", "Rota",
      "Gece Kartalı", "Islık", "Beton Gül", "Şehir Efsanesi", "Kırık Kalem",
      "Yankı", "Pusula", "Asit", "Karanlık Oda", "Serin", "Nefes",
      "Rüzgar Gülü", "Kar Tanesi", "Uzak İhtimal", "Sessiz Fırtına", "Kızıl", "Lodos"
    ],
    RISING_TITLES: [
      "İlk Adım", "Gece Yarısı", "Beton Çiçek", "Sessiz Şehir", "Son Mektup",
      "Kör Nokta", "Yalnız Değilim", "Ağır Gelir", "Bırakma", "Kirli Hava",
      "Sabaha Karşı", "Kayıp Frekans", "Islak Sokak", "Aynı Yer", "Yeni Bir Gün",
      "Karanlıkta", "Yolun Sonu", "Bir Şans", "Fırtına", "Melek", "Derin", "Kırmızı"
    ],

    buildRisingChart() {
      const s = K.state, p = s.player;
      const entries = [];
      const NAMES = K.game.RISING_NAMES;
      const TITLES = K.game.RISING_TITLES;

      /* 22 anonim çıkış sanatçısı — üstel bir merdiven (en alt ~15/gün,
         en üst ~1600/gün). Değerler tohumsuz ama gün içinde yumuşak
         salınım yapar; sıralama haftalar boyunca hafifçe karışır. */
      NAMES.forEach((name, i) => {
        const base = 15 * Math.pow(1.27, i);
        const drift = 1 + 0.16 * Math.sin((s.day + i * 7) / 23);
        /* NOT: değişken adı bilinçli olarak `daily` DEĞİL. smoke-silence A3
           invariant'ı, akış birikimindeki yapay tabanın geri gelmemesi için
           game.js'te bir `Math.max(5, …)` kalıbını yasaklıyor. Bu satır akış
           birikimiyle ilgisiz; ad çakışması testi yanlış kırmızı yapardı. */
        const riseDaily = Math.max(5, Math.round(base * drift * U.rand(0.9, 1.12)));
        entries.push({
          id: "rise_" + i, title: TITLES[i % TITLES.length], artistId: "rise_" + i,
          artistName: name, daily: riseDaily, mine: false, cover: "rise_" + i, art: null
        });
      });

      /* oyuncunun işleri — ulusal listeye göre ÇOK daha düşük eşik */
      (p.songs || []).forEach(song => {
        if (song.takenDown) return;
        const age = s.day - (song.publishedDay || s.day);
        if (age < 1) return;
        if ((song.lastDaily || 0) < 10) return;
        entries.push({
          id: song.id, title: song.title, artistId: "player",
          artistName: p.stageName, daily: song.lastDaily || 0,
          mine: true, cover: song.coverSeed, art: null
        });
      });

      entries.sort((a, b) => b.daily - a.daily);
      const prev = {};
      (s.chartRising || []).forEach((e, i) => { prev[e.id] = i + 1; });
      s.chartRising = entries.slice(0, 20).map((e, i) => {
        const rank = i + 1;
        const old = prev[e.id] || rank;
        return Object.assign({}, e, { rank, delta: old - rank });
      });

      /* oyuncu şarkısına yükselen sırası yaz (kariyer ekranı için) */
      s.chartRising.forEach(e => {
        if (!e.mine) return;
        const song = p.songs.find(x => x.id === e.id);
        if (song) {
          song.risingRank = e.rank;
          song.risingPeak = Math.min(song.risingPeak || 999, e.rank);
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
