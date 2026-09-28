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

    yearsPassed() { return Math.floor((K.state.day - 1) / K.awards.YEAR); },

    nextCeremony() {
      const passed = K.awards.yearsPassed();
      return (passed + 1) * K.awards.YEAR + 1;
    },

    // tamamlanan yıl sayısı (tören sayacı)
    completedYears() { return Math.floor((K.state.day - 1) / K.awards.YEAR); },

    /* ---------------- aday adayları ---------------- */
    nominations() {
      const s = K.state, p = s.player;
      const chart = s.chart || [];
      const mine = chart.filter(e => e.mine);
      const topArtist = K.artistList().slice().sort((a, b) => b.popularity - a.popularity)[0];

      const nom = {};
      nom.song = mine.length ? mine[0].title : null;
      nom.artist = p.popularity >= 15 ? p.stageName : null;
      nom.breakout = (p.popularity >= 20 && p.songs.length <= 12) ? p.stageName : null;
      nom.project = p.songs.length ? (p.songs[p.songs.length - 1].albumTitle || p.songs[p.songs.length - 1].title) : null;
      nom.feature = p.songs.some(x => x.featWith) ? "Feature iş birliği" : null;
      return { nom, mine, hasAny: Object.keys(nom).some(k => nom[k]) };
    },

    /* ---------------- tören ---------------- */
    tick() {
      const s = K.state;
      s.awards = s.awards || { lastDay: 0, lastYear: 0, history: [] };
      const yp = K.awards.completedYears();
      if (yp < 1) return;
      if ((s.awards.lastYear || 0) >= yp) return;
      s.awards.lastYear = yp;
      s.awards.lastDay = s.day;

      const p = s.player;
      const noms = K.awards.nominations();
      const year = yp;
      const results = [];
      let wins = 0;

      K.awards.CATEGORIES.forEach(cat => {
        const isMine = !!noms.nom[cat.id];
        // kazanma şansı: liste performansı + popülerlik
        const chartScore = noms.mine.length ? U.clamp(noms.mine[0].rank ? (52 - noms.mine[0].rank) : 0, 0, 45) : 0;
        const prob = isMine ? U.clamp(0.12 + p.popularity / 220 + chartScore / 140, 0.05, 0.82) : 0;
        const won = isMine && Math.random() < prob;
        if (won) wins++;

        let winnerName = "";
        if (won) winnerName = p.stageName;
        else {
          const list = K.artistList().filter(a => a.id !== "player");
          const w = U.pickWeighted(list, a => a.popularity);
          winnerName = w.stageName;
        }
        results.push({ cat: cat.name, icon: cat.icon, won, winner: winnerName, nominated: isMine });
      });

      s.awards.history = s.awards.history || [];
      s.awards.history.unshift({ year: year + 1, day: s.day, wins, results });

      if (wins > 0) {
        p.popularity = U.clamp(p.popularity + wins * 2.2, 0, 99);
        p.reputation = Math.min(100, p.reputation + wins * 3);
        p.ig += wins * 12000; p.tiktok += wins * 8000;
      } else {
        if (results.some(r => r.nominated)) p.reputation = Math.min(100, p.reputation + 1);
      }

      /* TÖREN KONUŞMASI: oyuncu seçim yapar */
      const nominated = results.some(r => r.nominated);
      if (nominated) {
        s.pendingAward = { year: year + 1, wins, results, day: s.day };
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
        p.popularity = U.clamp((p.popularity || 0) + (win ? 2.5 : 1), 0, 99);
        K.toast("🎤 Tören konuşması", "Gururlu konuşma dikkat çekti; popülerlik arttı.", "ok");
      } else {
        p.popularity = U.clamp((p.popularity || 0) + 3.2, 0, 99);
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
