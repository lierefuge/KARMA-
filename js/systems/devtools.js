/* ============================================================
   KARMA — systems/devtools.js
   TEST PANELİ (yalnızca geliştirme/test amaçlı)

   Amacı: oyunu saatlerce oynamadan yeni özellikleri hızlı denemek.
   Para, gün, popülerlik, anında yayın, takip, bildirim, sözleşme...
   Kısayol: Ctrl+Shift+D  ·  Ayarlar → Test Paneli
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  function safe(fn, label) {
    try { return fn(); }
    catch (e) { K.toast("Test hatası", label + ": " + (e.message || e), "bad"); return null; }
  }

  K.dev = {

    open() {
      const s = K.state, p = s.player;
      const b = (label, arg, cls) => `<button class="btn ${cls || "btn-ghost"} btn-sm" data-dev="${arg}">${label}</button>`;
      const body = `
        <div class="dev-panel">
          <div class="dev-info">
            Gün <b>${s.day}</b> · Kasa <b>${U.money(s.balance)}</b> · Pop <b>${Math.round(p.popularity)}</b>
            · Şarkı <b>${(p.songs || []).length}</b> · Takip <b>${K.interactions.followedArtists().length}</b>
          </div>

          <div class="dev-sec"><b>💸 Para & Zaman</b><div class="dev-row">
            ${b("+₺100K", "money100")} ${b("+₺1M", "money1m")} ${b("+₺10M", "money10m")}
            ${b("+1 gün", "day1")} ${b("+7 gün", "day7")} ${b("+30 gün", "day30")}
          </div></div>

          <div class="dev-sec"><b>📈 Kariyer</b><div class="dev-row">
            ${b("Pop +10", "pop10")} ${b("Pop +30", "pop30")}
            ${b("Takipçi +50K", "fans50")} ${b("Takipçi +1M", "fans1m")}
            ${b("İtibar +25", "rep25")} ${b("İmaj 90", "img90")}
          </div></div>

          <div class="dev-sec"><b>🎧 Hızlı Yayın</b><div class="dev-row">
            ${b("Yayın hattını bitir", "flush")} ${b("Rastgele single", "randomRelease")}
            ${b("Rastgele EP (4 parça)", "randomEp")} ${b("Test için 3 single", "demoSongs")}
          </div></div>

          <div class="dev-sec"><b>💬 Sosyal Test</b><div class="dev-row">
            ${b("5 sanatçıyı takip et", "follow5")} ${b("Takipleri temizle", "unfollow")}
            ${b("IG bildirimi", "notifIG")} ${b("TikTok bildirimi", "notifTT")} ${b("YouTube bildirimi", "notifYT")}
          </div></div>

          <div class="dev-sec"><b>🏢 Endüstri</b><div class="dev-row">
            ${b("PMC sözleşmesi", "signPmc")} ${b("Sözleşmeyi bitir", "unsign")}
            ${b("A&R notu üret", "ar")} ${b("Günlük olay", "incident")} ${b("Kriz", "crisis")}
            ${b("Ödül töreni", "award")} ${b("Röportaj", "interview")}
          </div></div>

          <div class="dev-sec"><b>⚙️ Sistem</b><div class="dev-row">
            ${b("Kolay", "diffEasy")} ${b("Normal", "diffNormal")} ${b("Zor", "diffHard")}
            ${b("Yeni oyun", "newgame", "btn-danger")}
          </div></div>

          ${(K.err && K.err.panelHTML) ? K.err.panelHTML() : ""}

          <div class="hint">Bu panel test içindir; normal oyunda görünmez (Ctrl+Shift+D).</div>
        </div>`;

      const { bodyEl } = K.ui.modal({
        title: "🧪 Test Paneli",
        desc: "Yeni özellikleri hızlı denemek için kısayollar",
        body, wide: true,
        actions: [{ label: "Kapat" }]
      });
      bodyEl.addEventListener("click", (e) => {
        const row = e.target.closest(".err-row");
        if (row) { const d = row.querySelector(".err-detail"); if (d) d.style.display = d.style.display === "none" ? "block" : "none"; return; }
        const btn = e.target.closest("[data-dev]");
        if (!btn) return;
        K.dev.run(btn.dataset.dev);
        if (btn.dataset.dev === "err-report") return;   // bildirim modalı kendi açar
        K.ui.closeModal();
        K.dev.open();      // paneli güncel değerlerle yeniden aç
      });
    },

    run(action) {
      const s = K.state, p = s.player;
      const arts = () => K.artistList();
      const flash = (msg) => K.toast("🧪 Test", msg, "ok");

      switch (action) {
        /* ---- para & zaman ---- */
        case "money100": K.economy.earn(100000, "dev"); flash("+₺100.000"); break;
        case "money1m": K.economy.earn(1000000, "dev"); flash("+₺1.000.000"); break;
        case "money10m": K.economy.earn(10000000, "dev"); flash("+₺10.000.000"); break;
        case "day1": safe(() => K.game.nextDay()); flash("1 gün ilerledi"); break;
        case "day7": for (let i = 0; i < 7; i++) safe(() => K.game.nextDay()); flash("7 gün ilerledi"); break;
        case "day30": for (let i = 0; i < 30; i++) safe(() => K.game.nextDay()); flash("30 gün ilerledi"); break;

        /* ---- kariyer ---- */
        case "pop10": p.popularity = U.clamp((p.popularity || 0) + 10, 0, 99); flash("Popülerlik +10"); break;
        case "pop30": p.popularity = U.clamp((p.popularity || 0) + 30, 0, 99); flash("Popülerlik +30"); break;
        case "fans50":
          ["ig", "tiktok", "x", "ytSubs"].forEach(k => { p[k] = (p[k] || 0) + 50000; });
          flash("4 platforma +50K takipçi"); break;
        case "fans1m":
          ["ig", "tiktok", "x", "ytSubs"].forEach(k => { p[k] = (p[k] || 0) + 1000000; });
          flash("4 platforma +1M takipçi"); break;
        case "rep25": p.reputation = U.clamp((p.reputation || 0) + 25, 0, 100); flash("İtibar +25"); break;
        case "img90": p.image = 90; flash("İmaj 90"); break;

        /* ---- hızlı yayın ---- */
        case "flush": {
          (p.releases || []).forEach(r => { r.startDay = s.day - (r.waitDays || 1) - 1; });
          safe(() => K.game.advanceReleases());
          flash("Yayın hattı boşaltıldı");
          break;
        }
        case "randomRelease": K.dev._publish(1); flash("1 şarkı yayınlandı"); break;
        case "randomEp": K.dev._publish(4); flash("4 parçalı EP yayınlandı"); break;
        case "demoSongs": for (let i = 0; i < 3; i++) K.dev._publish(1); flash("3 şarkı yayınlandı"); break;

        /* ---- sosyal ---- */
        case "follow5": {
          const list = U.shuffle(arts()).slice(0, 5);
          list.forEach(a => { K.interactions._p().follows[a.id] = s.day; });
          K.save(); flash(list.map(a => a.stageName).join(", ") + " takip edildi");
          break;
        }
        case "unfollow": p.follows = {}; K.save(); flash("Takipler temizlendi"); break;
        case "notifIG": {
          const a = U.pick(arts());
          K.interactions.pushAppNotif("instagram", { kind: "follow", icon: "👤", who: a.stageName, text: "seni takip etmeye başladı", action: { type: "profile", artistId: a.id } });
          flash("IG bildirimi: " + a.stageName); break;
        }
        case "notifTT": {
          const a = U.pick(arts());
          K.interactions.pushAppNotif("tiktok", { kind: "duet", icon: "🎬", who: a.stageName, text: "seninle duet yaptı", action: { type: "profile", artistId: a.id } });
          flash("TikTok bildirimi: " + a.stageName); break;
        }
        case "notifYT": {
          const a = U.pick(arts());
          K.interactions.pushAppNotif("youtube", { kind: "subscribe", icon: "🔔", who: a.stageName, text: "kanalına abone oldu", action: { type: "profile", artistId: a.id } });
          flash("YouTube bildirimi: " + a.stageName); break;
        }

        /* ---- endüstri ---- */
        case "signPmc": p.labelId = "pmc"; K.save(); flash("PMC Music sözleşmesi yapıldı"); break;
        case "unsign": p.labelId = null; p.labelDeal = null; K.save(); flash("Sözleşme bitirildi"); break;
        case "ar": {
          const rel = (p.releases || [])[0];
          if (!rel) { K.toast("Önce yayın oluştur", "Test: 'Rastgele single' kullan.", "warn"); break; }
          rel.arRequest = { id: "mix", note: "Nakarat biraz geride kalmış; mix'i yukarı çekelim." };
          rel.arResolved = false; K.save(); flash("A&R notu üretildi (Yayınlar sekmesi)"); break;
        }
        case "incident": safe(() => K.incidents.maybeFire(), "incident"); flash("Günlük olay denendi (Olaylar sekmesi)"); break;
        case "crisis": safe(() => K.crisis.maybeStart(), "crisis"); flash("Kriz denendi (Olaylar sekmesi)"); break;
        case "award":
          s.pendingAward = { year: 2, wins: 1, day: s.day, results: [{ cat: "Yılın Şarkısı", icon: "🎵", won: true, nominated: true }, { cat: "Yılın Sanatçısı", icon: "🏆", won: false, nominated: true }] };
          K.save(); K.awards.openCeremony(); return;
        case "interview": K.press.interview(); return;

        /* ---- sistem ---- */
        case "diffEasy": K.settings.set({ difficulty: "easy" }); flash("Zorluk: Kolay"); break;
        case "diffNormal": K.settings.set({ difficulty: "normal" }); flash("Zorluk: Normal"); break;
        case "diffHard": K.settings.set({ difficulty: "hard" }); flash("Zorluk: Zor"); break;
        case "newgame":
          K.ui.closeModal();
          K.settings.newGame();
          flash("Yeni oyun başlatıldı");
          return;

        /* ---- v10.62.2 self-diagnostic ---- */
        case "err-report":
          if (!K.err) break;
          K.ui.modal({
            title: "✍️ Hata Bildir",
            desc: "Ne olduğunu kısaca yaz; ekran/gün/olay bağlamı otomatik eklenir.",
            body: K.ui.field("Hata açıklaması", `<textarea id="err-note" rows="4" placeholder="ör. Instagram bildirimlerine girince oyundan attı."></textarea>`),
            actions: [
              { label: "Vazgeç" },
              { label: "Gönder", cls: "btn-primary", onClick: () => {
                const txt = (U.qs("#err-note") || {}).value || "";
                const r = K.err.report(txt.trim());
                K.toast(r ? "📝 Bildirildi" : "Bildirilemedi", r ? "Test Paneli → Son Hatalar" : "", r ? "ok" : "bad");
              } }
            ]
          });
          return;
        case "err-export":
          if (K.err) { const ok = K.err.download(); K.toast(ok ? "⬇️ İndirildi" : "İndirilemedi", "KARMA-BUG-REPORT.json", ok ? "ok" : "bad"); }
          break;
        case "err-validate": {
          if (!K.err) break;
          const found = K.err.validateState();
          K.toast(found.length ? "🔎 " + found.length + " uyarı" : "🔎 Temiz", found.length ? "Test Paneli → Son Hatalar" : "State tutarlı görünüyor.", found.length ? "warn" : "ok");
          break;
        }
        case "err-clear":
          if (K.err) { K.err.clear(); flash("Hata günlüğü temizlendi"); }
          break;
      }
      K.refresh && K.refresh();
    },

    /* hızlı yayın: gerçek üretim hattından geçirir, sonra anında yayınlar */
    _publish(count) {
      const s = K.state, p = s.player;
      const rel = K.career.createRelease({
        title: K.career.suggestTitle(),
        genre: p.genre || "trap",
        kind: "normal",
        trackCount: count,
        budget: 25000,
        marketing: 5000,
        waitDays: 7,
        trackBudgets: new Array(count).fill(25000),
        tracks: K.career.suggestTracks(count).map(n => ({ name: n, budget: 25000, source: "ev" })),
        lyricsTheme: "street",
        lyricSections: {
          intro: "", verse: "Betonun üstünde büyüdük biz\nHer iz bir hikâye bıraktı",
          hook: "Hayat bize gülmedi", chorus: "", bridge: "", outro: ""
        },
        conceptId: "open",
        stores: (K.defaultStores ? K.defaultStores() : [])
      });
      if (!rel) return null;
      rel.startDay = s.day - (rel.waitDays || 1) - 1;
      K.game.advanceReleases();
      return rel;
    }
  };
})(window.K = window.K || {});
