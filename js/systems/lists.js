/* ============================================================
   KARMA — systems/lists.js
   PLATFORM LİSTELERİ (gerçekçi giriş/çıkış)

   Kural: bir şarkı çıktığı GÜN listeye girmez. Her şarkı her
   listeye de girmez. Giriş; kalite + pazarlama + PR/biçim +
   gündem + takipçi + şirket desteği + etiket pitch'inin
   birleşiminden gelen bir "çekiş" puanı ile OLASILIKSALDIR.

   Listeler:
     SPOTIFY   Yeni Müzik Cuma (editoryal) · RapCaviar TR ·
               Viral 50 TR · Release Radar (algoritmik)
     APPLE     Yeni Çıkanlar · Türkiye Top 100 (zor)
     YOUTUBE   Trendler · Müzik Yeni Çıkanlar
     DEĞİŞİM   Radyo / kulüp airplay (DJ + mahalli destek)

   Bir şarkı listedeyken sırası günlük oynar; çekiş düşerse
   düşer ve birkaç gün içinde listeyi terk eder.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* level = rekabet seviyesi (günlük dinlenme eşdeğeri).
     cap   = listede tutulan azami oyuncu şarkısı
     minAge= şarkının en az kaç günlük olması gerekir
     chi   = gereken asgari çekiş puanı (0-100)                    */
  const DEFS = [
    { id: "sp_newmusic", platform: "Spotify", name: "Yeni Müzik Cuma", icon: "🆕", level: 9000, cap: 3, minAge: 1, chi: 34, kind: "editoryal", days: [5, 12] },
    { id: "sp_rapcaviar", platform: "Spotify", name: "RapCaviar TR", icon: "🔥", level: 22000, cap: 3, minAge: 2, chi: 52, kind: "editoryal", days: [4, 10] },
    { id: "sp_viral", platform: "Spotify", name: "Viral 50 TR", icon: "⚡", level: 14000, cap: 3, minAge: 1, chi: 44, kind: "viral", days: [3, 9] },
    { id: "sp_release", platform: "Spotify", name: "Release Radar", icon: "🛰️", level: 2500, cap: 4, minAge: 1, chi: 12, kind: "algoritmik", days: [3, 7] },
    { id: "ap_new", platform: "Apple Music", name: "Yeni Çıkanlar", icon: "🆕", level: 12000, cap: 3, minAge: 1, chi: 38, kind: "editoryal", days: [5, 12] },
    { id: "ap_top100", platform: "Apple Music", name: "Türkiye Top 100", icon: "🏆", level: 42000, cap: 2, minAge: 3, chi: 66, kind: "chart", days: [3, 8] },
    { id: "yt_trend", platform: "YouTube", name: "Trendler", icon: "📈", level: 26000, cap: 3, minAge: 2, chi: 58, kind: "viral", days: [2, 6] },
    { id: "yt_new", platform: "YouTube", name: "Müzik · Yeni Çıkanlar", icon: "🆕", level: 7000, cap: 4, minAge: 1, chi: 26, kind: "editoryal", days: [5, 12] },
    { id: "radio_air", platform: "Radyo/Kulüp", name: "Airplay", icon: "📻", level: 4000, cap: 5, minAge: 1, chi: 18, kind: "airplay", days: [4, 14] }
  ];

  function listById(id) { return DEFS.find(d => d.id === id) || null; }

  /* ---------- çekiş gücü (0-100) ----------
     Oyuncunun kendi kaynakları + şarkının nitelikleri.          */
  K.lists = {
    DEFS,
    listById,

    /* v10 — liste etkisinin doyum sınırı: kümülatif ~2,1 → en fazla ~3,1× taban.
       Tek bir liste şarkıyı efsane yapmaz; gerçekte de yapmıyor. */
    LIFT_CAP: 2.1,

    pull(song) {
      if (!song) return 0;
      const p = K.state.player;
      const q = song.quality || 50;
      const boosts = U.sum(Object.keys(song.boosts || {}), k => song.boosts[k]);
      const mkt = (song.marketing || 0) / 80000;                     // 0-1
      const img = (p.image || 50) / 100;
      const rep = (p.reputation || 0) / 100;
      const agenda = U.clamp(song.agendaBoost || 0, 0, 1);
      const followers = K.fans ? K.fans.followers() : 0;
      const foll = U.clamp(Math.sqrt(followers / 400000), 0, 1);
      const pop = U.clamp((p.popularity || 0) / 80, 0, 1);
      const label = p.labelId ? 0.12 : 0;
      const pitch = (song.boosts && song.boosts.playlist) ? 0.2 : 0;
      const teamPR = (K.team && K.team.bonus) ? K.team.bonus().promo * 0.06 : 0;

      let s = 0;
      s += (q / 100) * 42;
      s += U.clamp(boosts * 26, 0, 20);
      s += mkt * 12;
      s += img * 9;
      s += rep * 7;
      s += agenda * 10;
      s += foll * 9;
      s += pop * 8;
      s += (label + pitch + teamPR) * 100 * 0.14;

      /* etiket pitch'i: kabul edilmişse ciddi avantaj */
      if (song.listPitch && song.listPitch.accepted) s += 8;

      /* mağaza dağıtım genişliği: ne kadar mağazaya gittiysen o kadar görünürsün */
      s += ((song.storeReach || 1) - 1) * 22;

      return U.clamp(Math.round(s), 0, 100);
    },

    /* bir platformdaki aktif liste girişleri (mağaza uygulamaları kullanır) */
    forPlatform(platform) {
      return K.lists.summary().filter(r => !r.exitDay && r.platform === platform);
    },

    /* son N günde yayınlanan oyuncu şarkıları ("Yeni Çıkanlar") */
    newReleases(days, limit) {
      const p = K.state.player;
      const d = days == null ? 30 : days;
      const list = (p.songs || [])
        .filter(s => (K.state.day - (s.publishedDay || 0)) <= d)
        .sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0));
      return list.slice(0, limit || 10);
    },

    /* oyuncunun bir mağazadaki toplam aktif liste sayısı */
    storeCount(platform) {
      return K.lists.forPlatform(platform).length;
    },

    /* mağaza dağıtım özeti: şarkının gittiği mağazalar */
    storesFor(song) {
      if (!song || !song.stores) return [];
      return song.stores.map(K.storeById).filter(Boolean);
    },

    /* ---------- günlük değerlendirme ---------- */
    daily() {
      const s = K.state, p = s.player;
      (p.songs || []).forEach(song => {
        song.lists = song.lists || [];
        const age = s.day - (song.publishedDay || s.day);

        /* v10.48 — LİSTE BAKIMI: aktifse şarkı listeden düşmez, sırası iyileşir */
        const care = (K.editorial && K.editorial.careActive) ? K.editorial.careActive(song) : false;

        /* 1) mevcut liste üyeliğini güncelle */
        song.lists.forEach(entry => {
          const def = listById(entry.id);
          if (!def) return;
          const pull = K.lists.pull(song);
          // sıra: rekabet / çekiş + gündelik salınım
          const target = Math.max(1, Math.round(def.level / Math.max(1, pull) * 6.5));
          entry.rank = U.clamp(Math.round(entry.rank + (target - entry.rank) * 0.35 + U.rand(-2, 2)), 1, def.cap * 30);
          entry.days = (entry.days || 0) + 1;
          entry.pull = pull;
          entry.care = false;
          /* bakım: şarkıyı listenin üst sıralarına çek ve düşüşü engelle */
          if (care) {
            const boost = (song.listCare && song.listCare.boost) || 0.1;
            const good = Math.max(1, Math.round(def.cap * (2 - boost) + U.rand(0, 2)));
            entry.rank = U.clamp(good, 1, def.cap * 30);
            entry.care = true;
          }
          // çok düşük çekiş ya da süre aşımı → listeden düşer (bakım varken düşmez)
          const [mn, mx] = def.days;
          if (!care && (pull < def.chi * 0.6 || entry.days > mx + Math.round(pull / 12))) {
            entry.exitDay = entry.exitDay || s.day;
          }
        });
        // süresi dolanları ayıkla (3 gün sonra temizle)
        song.lists = song.lists.filter(e => !(e.exitDay && s.day - e.exitDay > 3));

        /* 2) yeni girişler */
        if (age >= 1 && song.lists.length < 6) {
          const pull = K.lists.pull(song);
          DEFS.forEach(def => {
            if (age < def.minAge) return;
            if (song.lists.some(e => e.id === def.id && !e.exitDay)) return;
            if (song.lists.some(e => e.id === def.id && e.exitDay && s.day - e.exitDay < 21)) return; // kısa sürede tekrar girmez
            if (song.lists.filter(e => !e.exitDay).length >= 3) return;   // aynı anda en fazla 3 liste
            if (pull < def.chi) return;

            // olasılık: çekiş eşiği aştıkça artar, ama asla garanti değil
            const over = (pull - def.chi) / 34;
            let chance = U.clamp(0.06 + over * 0.16, 0.02, 0.42);
            chance *= 0.55;                                   // gerçekçilik: nadir
            if (def.kind === "algoritmik") chance *= 1.7;      // algoritma daha kolay
            if (def.kind === "airplay") chance *= 1.35;        // mahalli destek/DJ
            if (def.kind === "chart") chance *= 0.7;           // top 100 zor
            if (song.viral && (def.kind === "viral" || def.kind === "algoritmik")) chance *= 2.1;
            if (song.listPitch && song.listPitch.accepted && def.kind === "editoryal") chance *= 1.8;
            // zorluk: kolayda daha kolay giriş, zorda daha zor (denge)
            chance *= ((K.settings && K.settings.diffMult().lists) || 1);
            // aynı anda listeye giren oyuncu şarkı sayısı sınırlı
            const holders = (p.songs || []).filter(x => (x.lists || []).some(e => e.id === def.id && !e.exitDay)).length;
            if (holders >= def.cap) return;

            if (U.chance(chance)) {
              const rank = U.clamp(Math.round(def.level / Math.max(1, pull) * 6.5 + U.rand(-3, 4)), 1, def.cap * 30);
              song.lists.push({
                id: def.id, name: def.name, platform: def.platform, icon: def.icon,
                kind: def.kind, rank, enteredDay: s.day, days: 0, pull
              });
              K.lists._announce(song, def, rank);
              // listeye girmek dinlenmeyi besler
              song.boosts = song.boosts || {};
              song.boosts["list_" + def.id] = (song.boosts["list_" + def.id] || 0) + 0.06 + (def.kind === "viral" ? 0.06 : 0);
            }
          });
        }
      });
    },

    _announce(song, def, rank) {
      const s = K.state;
      const reach = 0.04 + (K.lists.pull(song) / 100) * 0.12;
      /* v10 GERÇEKLİK DÜZELTMESİ — LİSTE ETKİSİ SINIRLI, AZALAN VERİMLİ.
         Eski hâlde her liste girişi dailyStreams'i KALICI olarak çarpıyordu;
         çok listeye giren şarkı üstel biçimde büyüyordu (400 günde 30 kat).
         Gerçekte liste etkisi doyuma ulaşır: bir playlist şarkıyı 2-3 katına
         çıkarır, 30 katına değil. Geçici etki ayrıca "boosts" ile sürüyor. */
      song.listLift = song.listLift || 0;
      const room = Math.max(0, K.lists.LIFT_CAP - song.listLift);
      const gain = Math.min(reach, room * 0.45);
      if (gain > 0.001) {
        song.listLift += gain;
        song.dailyStreams = (song.dailyStreams || 0) * (1 + gain);
      }
      // listedeki başarı DM'e yansır: erişilebilir sanatçılar tebrik eder
      if (K.relations && K.relations.maybeListCongrats) {
        setTimeout(() => { try { K.relations.maybeListCongrats(song, def.name); } catch (e) {} }, 1800);
      }
      K.toast(def.icon + " Listeye girdin!", `"${song.title}" → ${def.platform} · ${def.name}`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: def.icon + " " + def.platform + " listesi",
        msg: `"${song.title}" ${def.name} listesine girdi (sıra ~${rank}).`,
        kind: "ok", day: s.day
      }]).slice(-60);
      song.listPeak = Math.min(song.listPeak || 999, rank);
    },

    /* bir şarkının aktif listeleri */
    active(song) {
      return (song && song.lists) ? song.lists.filter(e => !e.exitDay) : [];
    },

    /* tüm oyuncu şarkılarının kazandığı listeler (Listeler sekmesi) */
    summary() {
      const p = K.state.player;
      const rows = [];
      (p.songs || []).forEach(song => {
        (song.lists || []).forEach(e => {
          rows.push(Object.assign({ song }, e));
        });
      });
      return rows;
    },

    /* platform bazlı toplam aktif listeler */
    platformCount() {
      const out = {};
      K.lists.summary().forEach(r => {
        if (r.exitDay) return;
        out[r.platform] = (out[r.platform] || 0) + 1;
      });
      return out;
    }
  };
})(window.K = window.K || {});
