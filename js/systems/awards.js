/* ============================================================
   KARMA — systems/awards.js
   Yıllık müzik ödülleri: adaylık, tören, kazanma etkisi.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.awards = {
    YEAR: 360,
    CATEGORIES: [
      { id: "song", name: "Yılın Şarkısı", icon: "🎵" },
      { id: "artist", name: "Yılın Sanatçısı", icon: "🏆" },
      { id: "breakout", name: "En İyi Çıkış Yapan", icon: "🚀" },
      { id: "project", name: "Yılın Projesi", icon: "💿" },
      { id: "feature", name: "En İyi Feature", icon: "🤝" }
    ],

    /* v10.57 — ÖDÜL SEZONU. Eskiden tören gün sayacıyla (her 360 gün)
       yılın rastgele bir ortasında yapılıyordu. Gerçekte ödül törenleri
       yıl sonunda (Kasım–Ocak) toplanır. Artık tören her takvim yılının
       OCAK ayında (15'i) yapılır — kariyer ritmi takvime oturur. */
    CEREMONY_MONTH: 1,   // Ocak
    CEREMONY_DOM: 15,

    /* verilen takvim tarihinin oyun günü (1 tabanlı) */
    dayForCal(y, m, d) {
      const sd = U.fromISO((K.state && K.state.dateStart) || U.todayISO());
      const a = Date.UTC(sd.y, sd.m - 1, sd.d);
      const b = Date.UTC(y, m - 1, d);
      return Math.round((b - a) / 86400000) + 1;
    },

    yearsPassed() { return Math.floor((K.state.day - 1) / K.awards.YEAR); },

    nextCeremony() {
      const cur = U.dateObjForDay(K.state.day);
      for (let y = cur.y; y <= cur.y + 3; y++) {
        const day = K.awards.dayForCal(y, K.awards.CEREMONY_MONTH, K.awards.CEREMONY_DOM);
        if (day >= K.state.day) return day;
      }
      return K.state.day + K.awards.YEAR;
    },

    // tamamlanan yıl sayısı (tören sayacı)
    completedYears() { return Math.floor((K.state.day - 1) / K.awards.YEAR); },

    /* ---------------- aday adayları ---------------- */
    nominations() {
      const s = K.state, p = s.player;
      const chart = s.chart || [];
      const mine = chart.filter(e => e.mine);
      const topArtist = K.artistList().slice().sort((a, b) => b.popularity - a.popularity)[0];

      /* DÜZELTME (v10.9): adaylık eşikleri gülünç derecede düşüktü.
         `pop >= 15` ile "Yılın Sanatçısı", `songs.length` olması yeterli
         "Yılın Projesi", ve `feature` kategorisi sabit bir yer tutucu
         metindi ("Feature iş birliği"). Gerçekte ödül adaylığı için
         listede olmak, ciddi dinleyici tabanı ve nitelikli iş gerekir. */
      const nom = {};
      const charting = mine.filter(e => (e.rank || 999) <= 30);   // ilk 30'da olmalı
      const best = charting[0] || null;
      nom.song = best ? best.title : null;
      nom.artist = p.popularity >= 45 ? p.stageName : null;
      nom.breakout = (p.popularity >= 25 && (p.songs || []).length <= 12) ? p.stageName : null;
      const lastRel = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];
      nom.project = (lastRel && (lastRel.quality || 0) >= 60) ? (lastRel.albumTitle || lastRel.title) : null;
      const featSong = (p.songs || []).find(x => x.featWith);
      nom.feature = featSong
        ? featSong.title + " (feat. " + (((K.artistById(featSong.featWith) || {}).stageName) || "sanatçı") + ")"
        : null;
      return { nom, mine, hasAny: Object.keys(nom).some(k => nom[k]) };
    },

    /* ---------------- tören ---------------- */
    tick() {
      const s = K.state;
      s.awards = s.awards || { lastDay: 0, lastYear: 0, history: [] };
      const cday = K.awards.nextCeremony();
      if (s.day < cday) return;
      if ((s.awards.lastDay || 0) >= cday) return;   // bu tören zaten yapıldı
      s.awards.lastDay = cday;

      const p = s.player;
      const noms = K.awards.nominations();
      const year = ((s.awards.history || []).length) + 1;
      s.awards.lastYear = year;
      const results = [];
      let wins = 0;

      K.awards.CATEGORIES.forEach(cat => {
        const isMine = !!noms.nom[cat.id];
        // kazanma şansı: liste performansı + popülerlik
        const chartScore = noms.mine.length ? U.clamp(noms.mine[0].rank ? (52 - noms.mine[0].rank) : 0, 0, 45) : 0;
        /* Kazanma şansı: liste performansı + popülerlik farkı.
           Eskiden `0,12 + pop/220` idi; pop 20 ile %21 şans → ödül dağıtıyordu. */
        const prob = isMine
          ? U.clamp(0.05 + Math.max(0, p.popularity - 40) / 180 + chartScore / 200, 0.03, 0.55)
          : 0;
        const won = isMine && Math.random() < prob;
        if (won) wins++;

        let winnerName = "";
        if (won) winnerName = p.stageName;
        else {
          /* Rakipler YALNIZCA ciddi isimlerden seçilir. Eskiden 36
             sanatçının tamamı eşit şansla havuzdaydı; pop 54 bir isim
             "Yılın Sanatçısı" alabiliyordu. */
          let list = K.artistList().filter(a => a.popularity >= 60);
          if (list.length < 4) list = K.artistList().slice().sort((x, y) => y.popularity - x.popularity).slice(0, 12);
          const w = U.pickWeighted(list, a => Math.pow(a.popularity, 2));
          winnerName = w.stageName;
        }
        results.push({ cat: cat.name, icon: cat.icon, won, winner: winnerName, nominated: isMine });
      });

      s.awards.history = s.awards.history || [];
      s.awards.history.unshift({ year, day: s.day, wins, results });

      if (wins > 0) {
        K.game.addFame(wins * 2.2);
        p.reputation = Math.min(100, p.reputation + wins * 3);
        p.ig += wins * 12000; p.tiktok += wins * 8000;
      } else {
        if (results.some(r => r.nominated)) p.reputation = Math.min(100, p.reputation + 1);
      }

      /* TÖREN KONUŞMASI: oyuncu seçim yapar */
      const nominated = results.some(r => r.nominated);
      if (nominated) {
        s.pendingAward = { year, wins, results, day: s.day };
        K.toast(wins > 0 ? "🏆 ÖDÜL KAZANDIN!" : "🎬 Ödül Töreni",
          (wins > 0 ? wins + " ödül · " : "Adaylık aldın · ") + "Konuşmanı seç (Olaylar sekmesi).", wins > 0 ? "ok" : "warn");
      } else {
        K.toast("🎬 Ödül Töreni", "Bu yıl adaylık yoktu; gelecek yıl tekrar.", "warn");
      }
      K.save();
    },

    /* TÖREN KONUŞMASI: imaj/itibar/hayran tepkisini belirler */
    openCeremony() {
      const s = K.state, pa = s.pendingAward;
      if (!pa) { K.toast("Tören yok", "Şu an bekleyen bir ödül töreni yok.", "warn"); return; }
      const wonList = pa.results.filter(r => r.won).map(r => r.icon + " " + r.cat).join(", ");
      const body = `<div style="font-size:12.5px;line-height:1.7;color:var(--text-1)">
        <b>${pa.year}. yıl töreni</b><br>
        ${pa.wins > 0 ? `Kazandığın ödüller: <b>${U.escape(wonList)}</b>` : "Adaylık aldın ama ödül gelmedi."}<br><br>
        Sahneye çıkıp konuşman gerekiyor. Nasıl bir konuşma yapacaksın?</div>`;
      K.ui.modal({
        title: pa.wins > 0 ? "🏆 Ödül Töreni" : "🎬 Ödül Töreni", desc: "Konuşma tarzın kariyerine yansır.", body,
        actions: [
          { label: "🙏 Alçakgönüllü", onClick: () => K.awards.speech("humble") },
          { label: "😎 Gururlu", onClick: () => K.awards.speech("proud") },
          { label: "😈 Rakibe gönderme", onClick: () => K.awards.speech("shade") }
        ]
      });
    },

    speech(style) {
      const s = K.state, p = s.player, pa = s.pendingAward;
      if (!pa) return;
      const win = pa.wins > 0;
      if (style === "humble") {
        p.image = U.clamp((p.image || 50) + 4, 0, 100);
        p.reputation = Math.min(100, (p.reputation || 0) + 2);
        K.toast("🎤 Tören konuşması", "Alçakgönüllü konuşma beğenildi; imaj +4, itibar +2.", "ok");
      } else if (style === "proud") {
        K.game.addFame(win ? 2.5 : 1);
        K.toast("🎤 Tören konuşması", "Gururlu konuşma dikkat çekti; popülerlik arttı.", "ok");
      } else {
        K.game.addFame(3.2);
        p.reputation = Math.max(0, (p.reputation || 0) - 3);
        p.image = U.clamp((p.image || 50) - 3, 0, 100);
        s.notifications = (s.notifications || []).concat([{
          title: "😈 Tören göndermesi", msg: "Sahneden rakip hedef aldın; gündem oldu ama itibar yoruldu.", kind: "warn", day: s.day
        }]).slice(-60);
        K.toast("🎤 Tören konuşması", "Gönderme gündem oldu; popülerlik + ama itibar −3.", "warn");
      }
      s.pendingAward = null;
      K.save(); if (K.refresh) K.refresh();
    },

    lastCeremonyResult() {
      const h = (K.state.awards && K.state.awards.history) || [];
      return h[0] || null;
    },

    totalWins() {
      const h = (K.state.awards && K.state.awards.history) || [];
      return h.reduce((n, x) => n + x.wins, 0);
    }
  };
})(window.K);
