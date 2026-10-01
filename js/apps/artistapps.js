/* ============================================================
   KARMA — apps/artistapps.js
   Telefon: SANATÇI PANELLERİ
   1) Karma for Artists  → telif ödemeleri (platform bazlı, aylık)
   2) Spotify for Artists → dinlenme, kaydetme, şehirler
   3) Apple Music for Artists → dinlenme, Shazam, liste
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep", "Trabzon", "Eskişehir", "Diyarbakır", "Mersin"];

  function cityBreakdown(seed, total) {
    const h = U.hashHue(seed || "x");
    const out = [];
    let left = 62;
    for (let i = 0; i < 5; i++) {
      const share = Math.max(4, Math.round((left * (0.45 - i * 0.06)) + ((h + i * 17) % 5)));
      left -= share;
      out.push({ city: CITIES[(h + i * 5) % CITIES.length], share, streams: Math.round(total * share / 100) });
    }
    out.sort((a, b) => b.share - a.share);
    return out;
  }

  /* =====================================================
     1) KARMA FOR ARTISTS — TELİF
     ===================================================== */
  K.phone.register({
    id: "royalty", name: "Karma Artists", icon: "₺", iconClass: "ic-royalty", dock: false,

    render(params) {
      const view = {
        title: "Karma for Artists", sub: "Telif & ödeme paneli",
        shellClass: "app-messages",
        tabPos: "bottom",
        tabs: [{ id: "sum", label: "Özet", icon: "💰" }, { id: "hist", label: "Ödemeler", icon: "🧾" }, { id: "rates", label: "Oranlar", icon: "📊" }],
        activeTab: params.tab || "sum",
        render: (tab) => {
          const p = K.state.player, s = K.state;
          const r = K.ECON.streamRates;
          const mtd = { spotify: 0, apple: 0, youtube: 0 };
          (p.songs || []).forEach(sg => { const m = sg.month || {}; mtd.spotify += m.spotify || 0; mtd.apple += m.apple || 0; mtd.youtube += m.youtube || 0; });
          const gross = mtd.spotify * r.spotify + mtd.apple * r.apple + mtd.youtube * r.youtube;
          const labelPct = p.labelId ? ((K.labelById(p.labelId) || {}).royalty || 50) : 0;
          const net = gross * (1 - labelPct / 100);
          const daysLeft = K.ECON.payoutPeriodDays - (s.day % K.ECON.payoutPeriodDays);

          if (tab === "hist") {
            const list = p.payouts || [];
            return list.length ? list.map(x => `<div class="p-row" style="cursor:default">
              ${K.ui.cover("pay" + x.day, "💰", 44)}
              <div class="grow">
                <div class="p-title">Gün ${x.day} ödemesi</div>
                <div class="p-sub">Spotify ${U.fmt(x.spotify)} · Apple ${U.fmt(x.apple)} · YT ${U.fmt(x.youtube)}${x.labelPct ? " · şirket " + U.money(x.labelPct) : ""}</div>
              </div>
              <span class="pill money">+${U.money(x.net)}</span>
            </div>`).join("")
              : `<div class="empty-note"><b>Henüz ödeme yok</b>İlk telif ödemesi ${K.ECON.payoutPeriodDays}. günde yapılır.</div>`;
          }

          if (tab === "rates") {
            return `
              ${K.ui.section("Platform Oranları")}
              <div class="sp-stat-row">
                <div class="sp-stat"><div class="k">Spotify</div><div class="v green">${U.money(r.spotify)}</div><div class="muted" style="font-size:10px">/ dinlenme</div></div>
                <div class="sp-stat"><div class="k">Apple Music</div><div class="v green">${U.money(r.apple)}</div><div class="muted" style="font-size:10px">/ dinlenme</div></div>
                <div class="sp-stat"><div class="k">YouTube</div><div class="v green">${U.money(r.youtube)}</div><div class="muted" style="font-size:10px">/ görüntülenme</div></div>
                <div class="sp-stat"><div class="k">Ödeme Periyodu</div><div class="v">${K.ECON.payoutPeriodDays} gün</div><div class="muted" style="font-size:10px">aylık</div></div>
              </div>
              <div class="bio-box">
                <b>Nasıl çalışır?</b><br>
                • Her dinlenme platform başına ayrı ücretlendirilir.<br>
                • Ödeme <b>aylık</b> yapılır (her ${K.ECON.payoutPeriodDays} günde bir).<br>
                • Sadece <b>o ayın yeni dinlenmeleri</b> ödenir — geçmiş dinlenmeler üstüne eklenmez.<br>
                • Şirket anlaşman varsa pay otomatik düşülür (%${labelPct || 0}).<br>
                • Dinlenme yoksa ödeme de yoktur.
              </div>`;
          }

          return `
            <div class="sp-hero" style="background:linear-gradient(150deg,#1ed760,#0d5c2c)">
              ${K.ui.artistAvatar("player", 56, true)}
              <div>
                <div class="h-title" style="color:#04140a">Bu Ay Tahmini Kazanç</div>
                <div class="h-sub" style="color:rgba(4,20,10,.75)">${daysLeft} gün sonra ödenecek · net ${U.money(net)}</div>
              </div>
            </div>
            <div class="sp-stat-row">
              <div class="sp-stat"><div class="k">Spotify ({U.compact(mtd.spotify)})</div><div class="v green">${U.money(mtd.spotify * r.spotify)}</div></div>
              <div class="sp-stat"><div class="k">Apple ({U.compact(mtd.apple)})</div><div class="v green">${U.money(mtd.apple * r.apple)}</div></div>
              <div class="sp-stat"><div class="k">YouTube ({U.compact(mtd.youtube)})</div><div class="v green">${U.money(mtd.youtube * r.youtube)}</div></div>
              <div class="sp-stat"><div class="k">Toplam Kazanç</div><div class="v">${U.money(p.totalStreamRevenue || 0)}</div></div>
            </div>
            ${K.ui.section("Ay Sonu Dökümü")}
            <div class="bio-box">
              Brüt: <b>${U.money(gross)}</b><br>
              ${labelPct ? `Şirket payı (%${labelPct}): <b>−${U.money(gross * labelPct / 100)}</b><br>` : "Şirket payı: <b>yok (bağımsız)</b><br>"}
              <span style="color:var(--money);font-weight:800">Net ödeme: ${U.money(net)}</span>
            </div>
            <div class="sp-stat" style="padding:10px 12px"><div class="k">Bu ay toplam dinlenme</div>
              <div class="v">${U.compact(mtd.spotify + mtd.apple + mtd.youtube)}</div></div>
            ${K.ui.section("Gelir Kaynakları", `<span class="muted">bu ay</span>`)}
            ${(() => {
              const last = (p.payouts || [])[0] || {};
              const rows = [
                ["Dinlenme (net)", net, "#1ed760"],
                ["Publishing", last.publishing || 0, "#6ec3ff"],
                ["Sponsorluk", K.sponsor ? K.sponsor.monthlyTotal() : 0, "#ffcb5c"],
                ["Fan kulübü", (p.fanClub && K.fans) ? K.fans.summary().clubMonthly : 0, "#b06cff"]
              ];
              const max = Math.max(1, ...rows.map(r => r[1]));
              return rows.map(([l, v, c]) => K.studio.row(l, Math.round((v / max) * 100), U.money(v), { color: c })).join("");
            })()}`;
        }
      };
      return view;
    }
  });

  /* =====================================================
     2) SPOTIFY FOR ARTISTS — Studio tarzı sekmeli analitik
     ===================================================== */
  K.phone.register({
    id: "spotifyartist", name: "Spotify Artist", icon: "♫", iconClass: "ic-spotart", dock: false,

    sources() {
      const p = K.state.player;
      const songs = p.songs || [];
      const pl = songs.filter(x => x.playlists && x.playlists.length);
      const algo = songs.filter(x => x.algos);
      const trend = songs.some(s => s.sound && s.sound.trend);
      const viral = songs.some(s => s.viral);
      const src = {
        "Kendi kütüphanesi / profil": 22,
        "Algoritmik (Discover/Radar)": 18,
        "Editoryal çalma listeleri": 12,
        "Diğer sanatçı profilleri": 13,
        "Radyo / istasyon": 11,
        "Arama": 8,
        "Harici (TikTok/IG)": 8,
        "Doğrudan / bilinmiyor": 8
      };
      if (pl.length) src["Editoryal çalma listeleri"] += 15;
      if (algo.length) src["Algoritmik (Discover/Radar)"] += 13;
      if (trend) src["Harici (TikTok/IG)"] += 12;
      if (viral) src["Diğer sanatçı profilleri"] += 8;
      const total = Object.keys(src).reduce((a, k) => a + src[k], 0) || 1;
      const arr = Object.keys(src).map(k => ({ name: k, pct: Math.round((src[k] / total) * 100) })).sort((a, b) => b.pct - a.pct);
      const diff = 100 - arr.reduce((a, s) => a + s.pct, 0);
      if (arr[0]) arr[0].pct += diff;
      return arr;
    },

    render(params) {
      const p = K.state.player;
      const spotifyTotal = U.sum(p.songs, x => x.spotifyStreams || 0);
      const mtd = U.sum(p.songs, x => Math.round(x.month ? (x.month.spotify || 0) : 0));
      const monthSaved = Math.round(mtd * 0.035);
      /* Spotify payı — 30 günlük global trendi Spotify'a ölçeklemek için */
      const spotifyShare = (p.songs || []).length
        ? U.clamp(U.sum(p.songs, x => (x.platforms && x.platforms.spotify) || 0.46) / p.songs.length, 0.05, 0.95)
        : 0.46;
      const plSongs = (p.songs || []).filter(x => x.playlists && x.playlists.length);
      const algoSongs = (p.songs || []).filter(x => x.algos);
      const dailyStreams = K.stats.series("streams", 30);
      const growthM = K.stats.growth("monthly", 14);
      const health = Math.round(U.clamp(
        46 + (growthM > 0 ? Math.min(24, growthM / 4) : -4) + Math.min(18, (p.monthly || 0) / 5000)
        + (plSongs.length ? 8 : 0) + ((p.songs || []).some(s => s.viral) ? 8 : 0), 0, 100));
      const healthLabel = health >= 75 ? "Mükemmel" : health >= 55 ? "İyi" : health >= 35 ? "Gelişmeli" : "Zayıf";
      const healthColor = health >= 75 ? "#1ed760" : health >= 55 ? "#facc15" : health >= 35 ? "#fb923c" : "#f87171";
      const src = K.phone.appById("spotifyartist").sources();
      const topSrc = src[0] || { name: "—", pct: 0 };

      /* ortak Studio bileşenleri (js/ui/studio.js) */
      const card = K.studio.card, note = K.studio.note, stat = K.studio.stat;

      const streamNote = growthM > 0
        ? ["📈", `Dinlenmen son 14 günde <b>%${growthM}</b> arttı. Bu ivmeyi yeni bir kısa video ile besle.`, "rgba(74,222,128,.14)"]
        : growthM < -5
          ? ["📉", `Dinlenme %${Math.abs(growthM)} geriledi. Yayınlar arasını kısaltıp sesi tazele.`, "rgba(248,113,113,.15)"]
          : ["➡️", "Dinlenme sabit. Bir playlist pitch veya TikTok snippet'i ivmeyi kırar.", "rgba(255,255,255,.06)"];
      const srcNote = topSrc.name.indexOf("Editoryal") >= 0
        ? ["📻", "Editoryal listeler ana kaynağın. Yayından 2-3 hafta önce pitch yapmayı kaçırma.", "rgba(30,215,96,.13)"]
        : topSrc.name.indexOf("Algoritmik") >= 0
          ? ["🤖", "Algoritma seni öneriyor. İlk 30 saniyeyi güçlü tut, kaydetme oranını yüksek tut.", "rgba(110,195,255,.13)"]
          : topSrc.name.indexOf("Harici") >= 0
            ? ["🎬", "Trafiğin çoğu sosyal/TikTok'tan. Short-form hunisini sıcak tut.", "rgba(255,92,122,.13)"]
            : ["🧭", `Ana kaynağın <b>${topSrc.name}</b>. Bu kanalı güçlendirmek için içerik ritmini sabit tut.`, "rgba(255,255,255,.06)"];
      const fanModel = (K.fans && K.fans.model) ? K.fans.model() : { casual: 0, active: 0, superfans: 0, followers: 0 };
      const activeRatio = fanModel.followers ? Math.round((fanModel.active / fanModel.followers) * 100) : 0;
      const fanNote = fanModel.superfans > 0 && activeRatio >= 8
        ? ["💜", `Aktif dinleyici oranın %${activeRatio} — sağlıklı. Süperfan (${U.compact(fanModel.superfans)}) için fan kulübü kur.`, "rgba(150,90,255,.14)"]
        : ["💜", "Aktif dinleyici oranı düşük. Kapak/önizleme ve tekrar dinlenebilir kısa işler sadakati artırır.", "rgba(255,255,255,.06)"];

      const view = {
        title: "Spotify for Artists", sub: "Dinlenme & kitle verisi",
        shellClass: "app-spotify",
        tabPos: "bottom",
        tabs: [
          { id: "gen", label: "Özet", icon: "🎵" },
          { id: "stream", label: "Dinlenme", icon: "📈" },
          { id: "kaynak", label: "Kaynaklar", icon: "🧭" },
          { id: "kitle", label: "Kitle", icon: "👥" },
          { id: "songs", label: "Şarkılar", icon: "💿" }
        ],
        activeTab: params.tab || "gen",
        render: (tab) => {
          if (tab === "stream") {
            /* v10.31 — yalnız SPOTIFY verisi. Global "aylık dinleyici trendi"
               kaldırıldı (o veri sol panel → Analiz'de). */
            const spotifyDaily = dailyStreams.map(v => Math.round(v * spotifyShare));
            const dailyAvg = Math.round(K.stats.summary().dailyStreams * spotifyShare);
            return card(`
              <div class="studio-head baseline">
                <div class="studio-title">Spotify Dinlenme (30 gün)</div>
                <div style="font-size:11px;color:var(--text-3)">günde ~${U.compact(dailyAvg)}</div>
              </div>
              ${K.stats.sparkline(spotifyDaily, { color: "#1ed760", h: 96 })}
              ${note(streamNote[0], streamNote[1], streamNote[2])}
            `, "#1ed760")
            + card(`
              <div class="studio-title sm">Spotify Toplamları</div>
              <div class="hint" style="line-height:1.9">
                • Toplam Spotify dinlenme: <b>${U.compact(spotifyTotal)}</b><br>
                • Bu ay dinlenme: <b>${U.compact(mtd)}</b><br>
                • Bu ay kaydetme: <b>${U.compact(monthSaved)}</b><br>
                • Editoryal listede: <b>${plSongs.length}</b> şarkı
              </div>
            `, "#6ec3ff");
          }
          if (tab === "kaynak") {
            return card(`
              <div class="studio-head">
                <div class="studio-title">Dinlenme Kaynakları</div>
                <span class="pill hot" style="font-size:9.5px">#1 ${U.escape(topSrc.name)} ${topSrc.pct}%</span>
              </div>
              ${src.map((s, i) => `<div class="studio-row">
                <div class="studio-row-label wide">${U.escape(s.name)}</div>
                <div class="studio-bar lg"><i class="studio-bar-fill" style="width:${s.pct}%;background:linear-gradient(90deg,${i === 0 ? "#1ed760,#6ec3ff" : "#7c5cff,#b06cff"})"></i></div>
                <div class="studio-row-val">${s.pct}%</div>
              </div>`).join("")}
              ${note(srcNote[0], srcNote[1], srcNote[2])}
            `, "#6ec3ff");
          }
          if (tab === "kitle") {
            const rows = cityBreakdown("spotify" + p.stageName, spotifyTotal);
            return card(`
              <div class="studio-title mb">Dinleyici Katmanları</div>
              ${[["Casual", fanModel.casual, "#8a8a99"], ["Aktif", fanModel.active, "#6ec3ff"], ["Süperfan", fanModel.superfans, "#b06cff"]].map(([l, v, c]) => {
                const pct = fanModel.followers ? Math.round((v / fanModel.followers) * 100) : 0;
                return `<div class="studio-row">
                  <div class="studio-row-label xs">${l}</div>
                  <div class="studio-bar lg"><i class="studio-bar-fill" style="width:${pct}%;background:${c}"></i></div>
                  <div class="studio-row-val wide">${U.compact(v)} · %${pct}</div>
                </div>`;
              }).join("")}
              ${note(fanNote[0], fanNote[1], fanNote[2])}
            `, "#b06cff")
            + card(`
              <div class="studio-title sm">Şehirler</div>
              ${rows.map(c => `<div class="tt-bar-row"><span class="name">${U.escape(c.city)}</span>
                <span class="bar"><i style="width:${Math.min(100, c.share * 1.6)}%"></i></span>
                <span class="pct">%${c.share}</span></div>`).join("")}
              ${note("🗺️", "Turnu rotanı en güçlü şehirlerden başlat; bilet talebi buralarda yüksek olur.", "rgba(255,255,255,.05)")}
            `, "#1ed760");
          }
          if (tab === "songs") {
            const songs = p.songs.slice().sort((a, b) => (b.spotifyStreams || 0) - (a.spotifyStreams || 0)).slice(0, 12);
            if (!songs.length) return `<div class="empty-note"><b>Veri yok</b>Şarkı yayınladığında burada görünür.</div>`;
            const inChart = songs.filter(s => s.chartRank).length;
            return card(songs.map((sg, i) => `<div class="sp-track">
              <span class="t-rank">${i + 1}</span>
              ${K.ui.cover(sg.coverSeed, (sg.title[0] || "?").toUpperCase(), 42)}
              <div class="grow" style="min-width:0"><div class="t-name">${U.escape(sg.title)}${(sg.playlists && sg.playlists.length) ? ' <span class="pill karma" style="font-size:8px">📻' + sg.playlists.length + '</span>' : ""}</div>
              <div class="t-artist">${U.compact(sg.spotifyStreams || 0)} dinlenme · ${U.compact(Math.round((sg.spotifyStreams || 0) * 0.035))} kaydetme</div></div>
              <span class="t-plays">${sg.chartRank ? "#" + sg.chartRank : "—"}</span>
            </div>`).join("")
            + note("🎵", inChart ? `<b>${inChart}</b> şarkın listede. Liste ivmesini korumak için ilk hafta promo yap.` : "Hiçbir şarkın listede değil. Yayın günü ilk 24 saat kritik — önceden tanıt.", inChart ? "rgba(30,215,96,.13)" : "rgba(255,255,255,.06)")
            , "#1ed760");
          }
          // ÖZET
          return `
            <div class="sp-hero" style="background:linear-gradient(150deg,#1ed760,#0d5c2c)">
              ${K.ui.artistAvatar("player", 56, true)}
              <div><div class="h-title" style="color:#04140a">${U.escape(p.stageName)}</div>
              <div class="h-sub" style="color:rgba(4,20,10,.75)">Spotify for Artists · doğrulanmış</div></div>
            </div>
            <div class="sp-stat-row">
              ${stat("Spotify Dinlenme", U.compact(spotifyTotal), "rgba(30,215,96,.1)")}
              ${stat("Bu Ay Dinlenme", U.compact(mtd), "rgba(30,215,96,.1)")}
              ${stat("Bu Ay Kaydetme", U.compact(monthSaved), "rgba(30,215,96,.1)")}
              ${stat("Listedeki Şarkı", String(plSongs.length), "rgba(30,215,96,.1)")}
            </div>
            ${card(`
              <div class="studio-health">
                <div><div class="studio-health-label">Sanatçı Sağlığı</div>
                  <div class="studio-health-val" style="color:${healthColor}">${health}/100 · ${healthLabel}</div></div>
                <div class="studio-health-emoji">${health >= 75 ? "🏆" : health >= 55 ? "👍" : health >= 35 ? "📊" : "⚠️"}</div>
              </div>
              <div class="studio-health-bar"><i style="width:${health}%;background:linear-gradient(90deg,${healthColor},#6ec3ff)"></i></div>
              ${note("🧭", `Dinlenme büyümesi %${growthM} · ${plSongs.length} şarkı listede · ${U.compact(fanModel.superfans)} süperfan`, "rgba(255,255,255,.06)")}
            `, healthColor)}
            ${K.ui.section("Dinlenme Trendi")}
            ${K.stats.sparkline(dailyStreams, { color: "#1ed760", h: 64 })}
            ${card(`
              <div class="studio-title mb6">Öne Çıkanlar</div>
              <div class="hint" style="line-height:1.8">
                • Listeye giren şarkı: <b>${(p.songs || []).filter(x => x.chartRank).length}</b><br>
                • Editoryal listede: <b>${plSongs.length}</b> şarkı<br>
                • Kaydetme oranı: <b>~%3.5</b> · Toplam şarkı: <b>${p.songs.length}</b>
              </div>
              ${note("💡", "Üstteki sekmelerden Dinlenme / Kaynaklar / Kitle / Şarkılar detaylarına geç.", "rgba(255,255,255,.05)")}
            `, "#7c5cff")}
          `;
        }
      };
      return view;
    }
  });

  /* =====================================================
     3) APPLE MUSIC FOR ARTISTS
     ===================================================== */
  K.phone.register({
    id: "appleartist", name: "Apple Artist", icon: "A", iconClass: "ic-appleart", dock: false,

    render(params) {
      const view = {
        title: "Apple Music for Artists", sub: "Dinlenme & liste",
        shellClass: "app-applemusic",
        tabPos: "bottom",
        tabs: [{ id: "gen", label: "Genel", icon: "" }, { id: "songs", label: "Şarkılar", icon: "💿" }, { id: "chart", label: "Liste", icon: "📊" }],
        activeTab: params.tab || "gen",
        render: (tab) => {
          const p = K.state.player;
          const appleTotal = U.sum(p.songs, x => x.appleStreams || 0);
          const shazam = Math.round(appleTotal * 0.004);
          /* Apple payı — 30 günlük global trendi Apple'a ölçeklemek için */
          const appleShare = (p.songs || []).length
            ? U.clamp(U.sum(p.songs, x => (x.platforms && x.platforms.apple) || 0.19) / p.songs.length, 0.03, 0.95)
            : 0.19;

          if (tab === "songs") {
            const songs = p.songs.slice().sort((a, b) => (b.appleStreams || 0) - (a.appleStreams || 0)).slice(0, 12);
            if (!songs.length) return `<div class="empty-note"><b>Veri yok</b>Şarkı yayınladığında burada görünür.</div>`;
            return songs.map((sg, i) => `<div class="am-chart-row">
              <span class="num">${i + 1}</span>
              ${K.ui.cover(sg.coverSeed, (sg.title[0] || "?").toUpperCase(), 38)}
              <div class="info"><div class="n">${U.escape(sg.title)}</div>
              <div class="a">${U.compact(sg.appleStreams || 0)} dinlenme · ${U.compact(Math.round((sg.appleStreams || 0) * 0.004))} Shazam</div></div>
              <span class="streams">${sg.chartPeak && sg.chartPeak < 999 ? "#" + sg.chartPeak : "—"}</span>
            </div>`).join("");
          }

          if (tab === "chart") {
            const inChart = p.songs.filter(x => x.chartRank).sort((a, b) => a.chartRank - b.chartRank).slice(0, 10);
            const rank = Math.min(999, ...p.songs.map(x => x.chartRank || 999), 999);
            return `
              <div class="am-hero">
                <div class="h-name">Liste Durumu</div>
                <div class="h-meta">Apple Music Türkiye</div>
                <div class="h-listeners">${rank === 999 ? "Henüz listeye girmedi" : "En iyi sıra: #" + rank}</div>
              </div>
              ${inChart.length ? inChart.map(sg => `<div class="am-chart-row">
                <span class="num peak">${sg.chartRank}</span>
                ${K.ui.cover(sg.coverSeed, (sg.title[0] || "?").toUpperCase(), 38)}
                <div class="info"><div class="n">${U.escape(sg.title)}</div><div class="a">en iyi #${sg.chartPeak && sg.chartPeak < 999 ? sg.chartPeak : sg.chartRank}</div></div>
                <span class="streams">${U.compact(sg.lastDaily || 0)}/g</span>
              </div>`).join("") : `<div class="mini-empty">Listeye girmek için dinlenmen artmalı.</div>`}`;
          }

          return `
            <div class="am-hero">
              <div class="h-name">${U.escape(p.stageName)}</div>
              <div class="h-meta">Apple Music for Artists</div>
              <div class="h-listeners">${U.compact(appleTotal)} Apple dinlenme · ${U.compact(shazam)} Shazam</div>
            </div>
            <div class="sp-stat-row">
              <div class="sp-stat" style="background:rgba(251,92,116,.1)"><div class="k">Apple Dinlenme</div><div class="v">${U.compact(appleTotal)}</div></div>
              <div class="sp-stat" style="background:rgba(251,92,116,.1)"><div class="k">Shazam</div><div class="v">${U.compact(shazam)}</div></div>
              <div class="sp-stat" style="background:rgba(251,92,116,.1)"><div class="k">Bu Ay Dinlenme</div><div class="v">${U.compact(U.sum(p.songs, x => Math.round((x.month ? (x.month.apple || 0) : 0))))}</div></div>
              <div class="sp-stat" style="background:rgba(251,92,116,.1)"><div class="k">Aylık Telif</div><div class="v">${U.money(U.sum(p.songs, x => Math.round((x.month ? (x.month.apple || 0) : 0))) * K.ECON.streamRates.apple)}</div></div>
            </div>
            ${K.ui.section("Apple Dinlenme Trendi (30 gün)")}
            ${K.stats.sparkline(K.stats.series("streams", 30).map(v => Math.round(v * appleShare)), { color: "#fb5c74", h: 60 })}
            ${K.ui.section("Şehirler")}
            ${cityBreakdown("apple" + p.stageName, appleTotal).map(c => `<div class="tt-bar-row">
              <span class="name">${U.escape(c.city)}</span>
              <span class="bar"><i style="width:${Math.min(100, c.share * 1.6)}%;background:linear-gradient(90deg,#fb5c74,#ffa1b3)"></i></span>
              <span class="pct" style="color:#ff97ac">%${c.share}</span>
            </div>`).join("")}`;
        }
      };
      return view;
    }
  });
})(window.K);
