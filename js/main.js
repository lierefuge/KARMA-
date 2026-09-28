/* ============================================================
   KARMA — main.js
   Uygulama başlatma, üst bar, yenileme döngüsü ve giriş akışı.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  function updateTopbar() {
    const s = K.state;
    U.qs("#stat-day").textContent = s.day;
    const d = U.dateForDay(s.day);
    const dEl = U.qs("#stat-date");
    if (dEl) dEl.textContent = d.short + " " + d.y;
    const aEl = U.qs("#stat-age");
    if (aEl) aEl.textContent = s.player.age;
    const balEl = U.qs("#stat-balance");
    if (balEl) {
      balEl.textContent = U.money(s.balance) + (s.player.debt > 0 ? " ⚠️" : "");
      balEl.title = s.player.debt > 0 ? "Borç: " + U.money(s.player.debt) : "Kasa bakiyesi";
      balEl.style.color = s.player.debt > 0 ? "#ff6b6b" : "";
    }
    U.qs("#stat-pop").textContent = Math.round(s.player.popularity);
    U.qs("#stat-monthly").textContent = U.compact(s.player.monthly);
    const np = U.qs("#next-day-preview");
    if (np) np.textContent = U.dateForDay(s.day + 1).short;
  }

  function renderAll() {
    updateTopbar();
    K.careerUI.render();
    if (K.phone.homeActive || !K.phone.views.length) K.phone.render();
    else K.phone.renderTop();
  }

  function setView(v) {
    document.body.classList.remove("view-career", "view-phone");
    document.body.classList.add("view-" + v);
    U.qsa("#view-switch .vs-btn").forEach(x =>
      x.classList.toggle("active", x.dataset.view === v));
  }

  K.appSetView = setView;

  function bindViewSwitch() {
    const sw = U.qs("#view-switch");
    if (!sw) return;
    sw.addEventListener("click", e => {
      const b = e.target.closest(".vs-btn");
      if (b) setView(b.dataset.view);
    });
  }

  function bindTopbar() {
    U.on(U.qs("#btn-next-day"), "click", () => {
      K.game.nextDay();
      if (K.settings && K.settings.all().autosave) {
        try { K.save(); } catch (e) {}
      }
      // NOT: oyuncu bulunduğu yerden koparılmaz; 
      // olaylar bildirim merkezine düşer, telefonda zil rozeti görünür.
    });
    U.on(U.qs("#btn-save"), "click", () => {
      K.save();
      K.toast("💾 Kaydedildi", "Oyun durumu kaydedildi.", "ok");
    });
    U.on(U.qs("#btn-settings"), "click", () => K.settings.openUI());
  }

  /* ---------------- giriş ---------------- */
  function intro() {
    const s = K.state;
    const body = `
      <div style="font-size:12.5px;color:var(--text-1);line-height:1.7">
        <b>KARMA Music Game</b>'e hoş geldin. Bir sanatçı olarak kariyerine başlıyorsun.<br><br>
        • <b>Şirket / Kariyer</b> paneli (solda): şarkı oluştur, yayınla, listeleri takip et.<br>
        • <b>Telefon</b> (sağda): Spotify, Apple Music, YouTube, Instagram, TikTok, X ve DM.<br>
        • Sanatçılarla <b>samimiyet</b> kur; feature ve şirket teklifleri açılır.<br>
        • Yeterince güçlenince <b>kendi şirketini kur</b> ve sanatçı imzala.<br><br>
        <b>Gerçekçi başlangıç:</b> yaşını ve doğum gününü sen seçiyorsun. Müzikten ilk yıllarda <b>neredeyse hiç para kazanamazsın</b> —
        geçimini <b>Yan İş</b> sekmesinden sağlarsın. Ünlü sanatçılara DM atabilirsin ama çoğu ya
        <b>görmez</b> ya da <b>cevap vermez</b>; dinlenmen ve popülerliğin arttıkça sana dönmeye başlarlar.<br><br>
        Oyun <b>gerçek takvim</b> üzerinden ilerler; her yeni günde tarih bir gün atar ve
        <b>doğum günün geldiğinde yaşın +1 artar</b>. 🎂<br><br>
        Başlangıç kasan: <b>${U.money(s.balance)}</b>
      </div>
      <div style="height:10px"></div>
      ${K.ui.field("Sahne Adın", `<input id="intro-stage" value="KARMA" />`)}
      ${K.ui.field("Adın", `<input id="intro-real" placeholder="ör. Ada" />`)}
      ${K.ui.field("Soyadın", `<input id="intro-surname" placeholder="ör. Yılmaz" />`)}
      ${K.ui.field("Yaşın", `<input id="intro-age" type="number" min="12" max="80" value="${K.ECON.startAge}" />`)}
      ${K.ui.field("Doğum Günün (gün / ay)",
        `<div style="display:flex;gap:8px">` +
        `<select id="intro-bday" style="flex:1">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select>` +
        `<select id="intro-bmonth" style="flex:2">${U.MONTHS.map((mn, i) => `<option value="${i + 1}">${mn}</option>`).join("")}</select>` +
        `</div>`) }
      ${K.ui.field("Şehir", `<input id="intro-city" value="İstanbul" />`)}`;
    K.ui.modal({
      title: "🎤 Kariyerine Başla",
      desc: "Sahne kimliğini, yaşını ve doğum gününü oluştur.",
      body,
      actions: [
        { label: "Başla", cls: "btn-primary", onClick: () => {
          const stage = U.qs("#intro-stage").value.trim() || "KARMA";
          const first = U.qs("#intro-real").value.trim();
          const last = U.qs("#intro-surname").value.trim();
          const real = (first + " " + last).trim() || first;
          const city = U.qs("#intro-city").value.trim() || "İstanbul";
          const age = K.util.clamp(parseInt(U.qs("#intro-age").value, 10) || K.ECON.startAge, 12, 80);
          const bday = K.util.clamp(parseInt(U.qs("#intro-bday").value, 10) || 1, 1, 31);
          const bmonth = K.util.clamp(parseInt(U.qs("#intro-bmonth").value, 10) || 1, 1, 12);
          // Doğum yılı: oyunun başlangıç tarihinde yaş = girilen yaş olacak şekilde hesaplanır
          const start = U.dateObjForDay(1);
          let birthYear = start.y - age;
          if (start.m < bmonth || (start.m === bmonth && start.d < bday)) birthYear -= 1;
          const birth = { y: birthYear, m: bmonth, d: bday };
          K.career.setIdentity({ stageName: stage, realName: real, firstName: first, lastName: last, city, age, birth });
          K.relations.bootstrap();
          renderAll();
          K.toast("Hoş geldin " + stage, "Doğum günün " + bday + " " + U.MONTHS[bmonth - 1] + ". İlk şarkını Stüdyo sekmesinden oluştur.", "ok");
        }}
      ]
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    const loaded = K.load();
    if (!loaded) {
      K.state = K.newGame();
      K.state.balance = Math.round(K.state.balance * K.settings.diffMult().start);
    }
    K.state.settings = K.state.settings || K.settings.all();

    K.ui.initToasts();
    // 🧪 TEST PANELİ kısayolu: Ctrl+Shift+D
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        if (K.dev && K.dev.open) K.dev.open();
      }
    });
    bindTopbar();
    bindViewSwitch();
    setView("career");
    // dar ekranda bölüm değiştiriciyi görünür kıl
    U.qs("#view-switch").style.display = window.innerWidth <= 1080 ? "flex" : "none";
    window.addEventListener("resize", () => {
      U.qs("#view-switch").style.display = window.innerWidth <= 1080 ? "flex" : "none";
    });
    if (K.phoneOS) { K.phoneOS.ensureInstalled(); K.phoneOS.apply(); }
    // mahalle/semt çevresi (kalıcı kişiler)
    if (K.contacts && K.contacts.ensureRoster) K.contacts.ensureRoster();
    // ZOR MOD: sayısal değerler gizli
    document.body.classList.toggle("hide-values", !!(K.settings && K.settings.valuesHidden && K.settings.valuesHidden()));
    K.careerUI.init();
    K.phone.init();

    // kayıtlı canlı veriyi uygula (varsa), sonra listeyi kur
    if (K.live && K.live.restore) K.live.restore();
    if (K.news && K.news.refresh) K.news.refresh();
    K.game.buildChart();
    K.game.tickTrends();

    // yenileme sinyali
    K.bus.on("refresh", () => {
      updateTopbar();
      K.careerUI.render();
      // mesaj/teklif akışı için telefonu güncel tut
      if (K.phone.homeActive || !K.phone.views.length) { K.phone.render(); return; }
      const v = K.phone.views[K.phone.views.length - 1];
      if (v && v.noAutoRefresh) return;  // DM sohbeti kendi izleyicisiyle güncellenir (titreme yok)
      K.phone.renderTop();
    });
    K.bus.on("dm:new", () => {
      if (K.phone.homeActive) K.phone.render();
    });

    // gerçek görseller yüklendikçe arayüzü tazele (debounce)
    let artTimer = null;
    K.bus.on("imagery:updated", () => {
      if (artTimer) return;
      artTimer = setTimeout(() => { artTimer = null; renderAll(); }, 1200);
    });

    renderAll();

    // gerçek sanatçı portrelerini arka planda çek
    if (K.imagery && K.imagery.hydratePortraits) K.imagery.hydratePortraits();

    // canlı liste eskiyse sessizce yenile + güncellemelerde arayüzü tazele
    K.bus.on("live:updated", () => renderAll());
    if (K.live && K.live.autoRefresh) K.live.autoRefresh();

    // kayıt yüklendiğinde her yeri tazele
    K.bus.on("game:loaded", () => {
      if (K.contacts && K.contacts.ensureRoster) K.contacts.ensureRoster();
      renderAll();
    });
    // zorluk değişince değer maskesini yeniden uygula
    K.bus.on("settings:changed", () => {
      document.body.classList.toggle("hide-values", !!(K.settings && K.settings.valuesHidden && K.settings.valuesHidden()));
    });

    // kriz çıktığında oyuncu başka sekmeye SÜRÜKLENMEZ; sadece bildirim düşer
    K.bus.on("crisis:new", (c) => {
      if (K.state) K.state.notifications = (K.state.notifications || []).concat([{ title: "⚠️ Kriz", msg: (c && c.title) || "Karar bekliyor", kind: "bad", day: K.state.day }]).slice(-60);
      if (K.phone && K.phone.homeActive) K.phone.render();
    });

    // ilk istatistik kaydı
    if (K.stats && K.stats.record) K.stats.record();
    document.body.classList.toggle("reduce-motion", !!K.settings.all().reduceMotion);
    document.body.classList.toggle("contrast", !!K.settings.all().contrast);

    // kayıt yoksa veya profil boşsa giriş ekranı
    if (!loaded || !K.state.player.realName) {
      intro();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.K);
