/* ============================================================
   KARMA — systems/yearwrap.js   (v10.23)
   KARMA WRAPPED — yıl sonu özeti

   Neden?
   -----
   Oyun 360 günlük yıllara bölünmüş (ödül töreni de bu takvimi
   kullanıyor) ama yılın SONUNDA oyuncuya bir "geri dönüp bakma"
   anı yoktu. Wrapped bu boşluğu doldurur: ne yaptın, ne büyüdü,
   hangi şarkın seni taşıdı.

   Veri nereden geliyor?
   ---------------------
   `stats.js` her gün bir anlık görüntü kaydediyor (day, streams,
   balance, monthly, popularity, songs, followers). Son 400 kayıt
   tutuluyor — yani bir yıllık pencere tam sığıyor. Ek olarak turne
   günlüğü, plaklar ve çıkış dereceleri kullanılır.

   Üretim ANI: yıl tamamlandığında (ödül töreniyle aynı gün) bir kez
   üretilir ve `player.wrapped` içine yazılır; tekrar üretilmez.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const YEAR = 360;   // awards.js ile aynı takvim

  function fmtDelta(a, b) {
    const d = (b || 0) - (a || 0);
    return (d >= 0 ? "+" : "−") + U.compact(Math.abs(d));
  }

  K.yearwrap = {
    YEAR,

    completedYears() { return Math.floor((K.state.day - 1) / YEAR); },

    history() { return (K.state.player.wrapped || []); },

    has(year) { return K.yearwrap.history().some(w => w.year === year); },

    latest() { const h = K.yearwrap.history(); return h.length ? h[h.length - 1] : null; },

    /* verilen güne kadarki son anlık görüntü */
    snapAt(day) {
      const h = K.state.history || [];
      let best = null;
      for (const x of h) if (x.day <= day) best = x;
      return best;
    },

    /* ---------------- özeti üret ---------------- */
    build(year) {
      const s = K.state, p = s.player;
      const start = (year - 1) * YEAR + 1;
      const end = year * YEAR;
      const a = K.yearwrap.snapAt(start) || K.yearwrap.snapAt(start + 5) || {};
      const b = K.yearwrap.snapAt(end) || {};

      /* yıl içindeki tepe değerler (history penceresinden) */
      const win = (s.history || []).filter(x => x.day >= start && x.day <= end);
      const peakMonthly = win.length ? Math.max.apply(null, win.map(x => x.monthly || 0)) : (p.monthly || 0);
      const peakPop = win.length ? Math.max.apply(null, win.map(x => x.popularity || 0)) : Math.round(p.popularity || 0);

      /* yıl içinde çıkan şarkılar */
      const rel = (p.songs || []).filter(sg => (sg.publishedDay || 0) >= start && (sg.publishedDay || 0) <= end);
      const topSong = rel.slice().sort((x, y) => (y.streams || 0) - (x.streams || 0))[0] || null;

      /* plaklar */
      const plaques = K.certifications
        ? K.certifications.list().filter(pl => pl.day >= start && pl.day <= end)
        : [];

      /* çıkış dereceleri */
      const debuts = rel.filter(sg => sg.debut).map(sg => ({ title: sg.title, id: sg.debut.id, label: sg.debut.label, total: sg.debut.total }));

      /* turne şehirleri (varsa) */
      const tour = s.tour && s.tour.log ? s.tour.log : [];
      const cities = {};
      tour.forEach(l => { cities[l.city] = (cities[l.city] || 0) + (l.attendance || 0); });
      const topCity = Object.keys(cities).sort((x, y) => cities[y] - cities[x])[0] || null;

      /* konser/festival toplamı */
      const concerts = (s.concerts || []).filter(c => c.status === "tamamlandı" && c.day >= start && c.day <= end);

      const out = {
        year,
        day: s.day,
        streams: Math.max(0, (b.streams || 0) - (a.streams || 0)),
        listeners: peakMonthly,
        followers: Math.max(0, (b.followers || 0) - (a.followers || 0)),
        balanceDelta: (b.balance || 0) - (a.balance || 0),
        popStart: a.popularity || 0,
        popEnd: b.popularity || p.popularity || 0,
        peakPop,
        songsReleased: rel.length,
        topSong: topSong ? { title: topSong.title, streams: topSong.streams || 0, id: topSong.id } : null,
        plaques: plaques.slice(0, 12),
        debuts,
        topCity,
        shows: concerts.length + tour.length,
        builtDay: s.day
      };
      p.wrapped = p.wrapped || [];
      p.wrapped.push(out);
      if (p.wrapped.length > 20) p.wrapped = p.wrapped.slice(-20);
      return out;
    },

    /* ---------------- günlük denetim ---------------- */
    tick() {
      const s = K.state;
      const yp = K.yearwrap.completedYears();
      if (yp < 1) return;
      if (K.yearwrap.has(yp)) return;
      const w = K.yearwrap.build(yp);
      s.notifications = (s.notifications || []).concat([{
        title: "📊 KARMA Wrapped hazır",
        msg: `${w.year}. yıl özetin oluştu — ${U.fmt(w.streams)} dinlenme, ${w.songsReleased} yayın.`,
        kind: "ok", day: s.day
      }]).slice(-60);
      K.toast("📊 KARMA Wrapped", "Yıl sonu özetin hazır! Kariyer sekmesinden aç.", "ok");
    },

    /* ---------------- sunum: kart verisi ---------------- */
    cards(w) {
      if (!w) return [];
      const out = [
        { icon: "🎧", label: "Bu yıl dinlendin", value: U.fmt(w.streams), sub: "toplam dinlenme", tone: "karma" },
        { icon: "👥", label: "Zirve dinleyicin", value: U.compact(w.listeners), sub: "aylık dinleyici", tone: "blue" },
        { icon: "📈", label: "Takipçi artışın", value: "+" + U.compact(w.followers), sub: "yeni takipçi", tone: "money" },
        { icon: "🎵", label: "Yayınladığın", value: String(w.songsReleased), sub: "şarkı", tone: "karma" },
        { icon: "🔥", label: "Popülerlik", value: w.popStart + " → " + w.popEnd, sub: "tepe " + w.peakPop, tone: "hot" },
        { icon: "💰", label: "Kasa değişimi", value: (w.balanceDelta >= 0 ? "+" : "−") + U.money(Math.abs(w.balanceDelta)), sub: "yıl boyunca", tone: "money" }
      ];
      /* Yılın şarkısı ÖNE ÇIKAN kart olur (grid'de değil, geniş kartta) */
      if (w.topSong) out.push({ icon: "👑", label: "Yılın şarkın", value: w.topSong.title, sub: U.fmt(w.topSong.streams) + " dinlenme", tone: "gold", feature: true });
      if (w.topCity) out.push({ icon: "🚌", label: "En çok çaldığın şehir", value: w.topCity, sub: w.shows + " sahne", tone: "blue" });
      if (w.plaques.length) out.push({ icon: "🏅", label: "Kazandığın plak", value: String(w.plaques.length), sub: w.plaques.map(pl => (K.certifications.tier(pl.tier) || {}).short).filter(Boolean).slice(0, 3).join(" · "), tone: "gold" });
      if (w.debuts.length) {
        const best = w.debuts.slice().sort((a, b) => (b.total || 0) - (a.total || 0))[0];
        out.push({ icon: "📊", label: "En iyi çıkışın", value: best.label, sub: best.title, tone: "hot" });
      }
      return out;
    },

    /* ---------------- modal ---------------- */
    open(year) {
      const list = K.yearwrap.history();
      if (!list.length) {
        K.toast("Henüz özet yok", "İlk yılın sonunda KARMA Wrapped otomatik oluşur.", "warn");
        return;
      }
      const w = (year != null ? list.find(x => x.year === year) : list[list.length - 1]) || list[list.length - 1];
      const all = K.yearwrap.cards(w);
      const feature = all.find(c => c.feature) || null;
      const cards = all.filter(c => !c.feature);
      const body = `
        <div class="wrapped-hero">
          <div class="wh-top">
            <span class="wh-year">${w.year}</span>
            <span class="wh-badge">YIL ÖZETİ</span>
          </div>
          <div class="wh-hero-num">${U.fmt(w.streams)}</div>
          <div class="wh-hero-lb">dinlenme</div>
          <div class="wh-strip">
            <span><b>${w.songsReleased}</b> yayın</span>
            <span><b>${w.shows}</b> sahne</span>
            <span><b>${w.plaques.length}</b> plak</span>
            <span><b>+${U.compact(w.followers)}</b> takipçi</span>
          </div>
        </div>
        ${feature ? `<div class="wrapped-feature">
          <span class="wf-icon">${feature.icon}</span>
          <div class="wf-txt">
            <span class="wf-label">${U.escape(feature.label)}</span>
            <span class="wf-value">${U.escape(String(feature.value))}</span>
            <span class="wf-sub">${U.escape(feature.sub || "")}</span>
          </div>
        </div>` : ""}
        <div class="wrapped-grid">
          ${cards.map(c => `<div class="wrapped-card ${c.tone || ""}">
            <span class="wc-icon">${c.icon}</span>
            <span class="wc-label">${U.escape(c.label)}</span>
            <span class="wc-value">${U.escape(String(c.value))}</span>
            <span class="wc-sub">${U.escape(c.sub || "")}</span>
          </div>`).join("")}
        </div>
        ${w.plaques.length ? `<div class="wrapped-plaques">
          ${w.plaques.map(pl => {
            const t = K.certifications.tier(pl.tier) || {};
            return `<span class="wq-pill" style="--pc:${t.color || "#ffcb5c"}">${t.emoji || "🏅"} ${U.escape(pl.title)} · ${t.short || ""}</span>`;
          }).join("")}
        </div>` : ""}
        ${list.length > 1 ? `<div class="helper">Arşiv: ${list.map(x => x.year + ". yıl").join(" · ")}</div>` : ""}`;

      K.ui.modal({ title: "📊 " + w.year + ". Yıl Özeti", desc: "Yıl boyunca ne yaptın", body, wide: true, actions: [{ label: "Kapat" }] });
    }
  };
})(window.K);
