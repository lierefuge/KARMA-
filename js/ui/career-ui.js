/* ============================================================
   KARMA — ui/career-ui.js
   Sol panel: Kariyer, Stüdyo, Yayınlar, Listeler, Şirket, Kadro.
   Şarkı oluşturma/yayınlama burada (kariyer tarafı).
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;
  let currentTab = "career";
  const ui = {
    tourCities: [], festStance: "balanced", presaveRel: null, presaveChans: [],
    /* v10.28 — Girişim sekmesi geçici form durumu (render sırasında korunur) */
    mrcItem: "tee", mrcDesign: "basic", mrcStock: 200, mrcPriceMult: 1, botTier: "s"
  };
  const subTab = { label: "genel", events: "awards" };

  K.careerUI = {
    init() {
      U.qsa("#career-tabs .tab").forEach(t => {
        t.addEventListener("click", () => {
          currentTab = t.dataset.tab;
          K.careerUI.setActive();
          K.careerUI.render();
        });
      });
      U.qs("#career-body").addEventListener("click", K.careerUI.onClick);
      U.qs("#career-body").addEventListener("input", K.careerUI.onInput);
      U.qs("#career-body").addEventListener("change", K.careerUI.onInput);
      K.careerUI.render();
    },

    setActive() {
      U.qsa("#career-tabs .tab").forEach(t =>
        t.classList.toggle("active", t.dataset.tab === currentTab));
    },

    render() {
      const body = U.qs("#career-body");
      const scroll = body.scrollTop;
      const map = {
        career: K.careerUI.renderCareer,
        studio: K.careerUI.renderStudio,
        jobs: K.careerUI.renderJobs,
        releases: K.careerUI.renderReleases,
        albums: K.careerUI.renderAlbums,
        charts: K.careerUI.renderCharts,
        analytics: K.careerUI.renderAnalytics,
        concerts: K.careerUI.renderConcerts,
        festivals: K.careerUI.renderFestivals,
        label: K.careerUI.renderLabelTab,
        business: K.careerUI.renderBusiness,
        events: K.careerUI.renderEventsTab
      };
      body.innerHTML = (map[currentTab] || map.career)();
      if (currentTab === "studio") K.careerUI.updateStudioEstimate();
      if (currentTab === "concerts") K.careerUI.updateConcertEstimate();
      body.scrollTop = scroll;
    },

    /* =====================================================
       KARİYER
       ===================================================== */
    renderCareer() {
      const s = K.state;
      const p = s.player;
      const label = p.labelId ? K.labelById(p.labelId) : null;
      const totals = K.platforms.playerTotals();
      const top = p.songs.slice().sort((a, b) => b.streams - a.streams).slice(0, 5);
      const persona = p.persona ? K.playerPersonaById(p.persona) : null;
      const ident = K.playerIdentityScore ? K.playerIdentityScore() : 0;

      return `
        <div class="c-block">
          <div class="artist-hero">
            ${K.ui.avatar(p.stageName, 74)}
            <div class="meta">
              <div class="stage">${U.escape(p.stageName)}</div>
              <div class="real">${U.escape(p.realName || "Gerçek ad henüz girilmedi")} · ${p.age} yaş · ${U.escape(p.city)}</div>
              <div class="tags">
                <span class="pill karma">${K.genreById(p.genre).icon} ${K.genreById(p.genre).name}</span>
                ${label ? `<span class="pill gold">🏢 ${U.escape(label.name)}</span>` : `<span class="pill">Bağımsız</span>`}
                ${s.label ? `<span class="pill money">Kendi şirketi: ${U.escape(s.label.name)}</span>` : ""}
              </div>
              <div class="action-row" style="margin-top:8px">
                <button class="btn btn-ghost btn-sm" data-act="edit-identity">Profili Düzenle</button>
              </div>
            </div>
          </div>

          <div class="stat-grid">
            <div class="stat-card"><span class="k">Kasa</span><span class="v money">${U.money(s.balance)}</span><span class="d">Toplam kazanç ${U.money(p.totalEarned)}</span></div>
            <div class="stat-card"><span class="k">Aylık Dinleyici</span><span class="v">${U.compact(p.monthly)}</span><span class="d">Spotify temelli</span></div>
            <div class="stat-card"><span class="k">Toplam Dinlenme</span><span class="v">${U.compact(p.streams)}</span><span class="d">Tüm platformlar</span></div>
            <div class="stat-card"><span class="k">Popülerlik</span><span class="v">${Math.round(p.popularity)}</span><span class="d">0-100 ölçek</span></div>
            <div class="stat-card"><span class="k">İtibar</span><span class="v gold">${Math.round(p.reputation)}</span><span class="d">Endüstri itibarı</span></div>
            <div class="stat-card"><span class="k">Şarkılar</span><span class="v">${p.songs.length}</span><span class="d">${p.releases.length} yayın hattı</span></div>
            <div class="stat-card"><span class="k">Yaş</span><span class="v">${p.age}</span><span class="d">yan iş kazancı ${U.money(p.jobEarnings || 0)}</span></div>
            <div class="stat-card"><span class="k">Durum</span><span class="v ${K.jobs.condition().color}">${K.jobs.condition().label}</span><span class="d">yorgunluk ${Math.round(p.fatigue || 0)}</span></div>
          </div>

          <div class="c-head" style="margin-top:4px"><div><h2>Sanatçı Kimliği</h2><div class="sub">Şarkıların personanla tutarlıysa itibar ve sadakat artar</div></div>
            <button class="btn btn-ghost btn-sm" data-act="persona">${persona ? "Değiştir" : "Kimlik Seç"}</button></div>
          ${persona ? `
            <div class="persona-card">
              <span class="persona-icon">${persona.icon}</span>
              <div class="grow"><b>${U.escape(persona.name)}</b><span>${U.escape(persona.desc)}</span></div>
              <div class="persona-ident"><span>Tutarlılık</span><b>${ident}%</b></div>
            </div>` : `<div class="helper">Henüz kimlik seçmedin. Kimlik, hangi tür ve temalarda güçlü olduğunu belirler.</div>`}

          ${(function () {
            /* v10.28 — AKIL SAĞLIĞI kartı: stres kaliteyi ve kararları etkiler */
            const mh = K.mental.summary();
            const cls = (mh.level.key === "tukenmis" || mh.level.key === "yuksek") ? "bad"
              : mh.level.key === "gergin" ? "warn" : "";
            return `<div class="c-head" style="margin-top:6px"><div><h2>Akıl Sağlığı</h2><div class="sub">Stres kayıt kalitesini ve kararlarını etkiler</div></div></div>
            <div class="mh-card ${cls}">
              <span class="mh-face">${mh.level.icon}</span>
              <div class="mh-main">
                <h3>${mh.level.label} · ${mh.stress}/100</h3>
                <div class="xg-bar ${mh.stress >= 70 ? "hot" : "cool"}" style="margin-top:6px"><i style="width:${mh.stress}%"></i></div>
                <p>${mh.onHiatus
                    ? `🛑 ZORUNLU ARA — ${mh.hiatusLeft} gün yayın yapamazsın.`
                    : mh.inTherapy ? "🛋️ Terapi devam ediyor (günlük stres azalıyor)."
                    : `Kayıt kalitesi çarpanı ×${mh.qualityMult.toFixed(2)}${mh.stress >= 60 ? " · dikkat: işler bozuluyor" : ""}`}</p>
              </div>
              <div class="action-row">
                <button class="btn btn-ghost btn-xs" data-act="mh-rest">🌿 Dinlen</button>
                <button class="btn btn-ghost btn-xs" data-act="mh-therapy">🛋️ Terapi</button>
                <button class="btn btn-ghost btn-xs" data-act="mh-holiday">🏖️ Tatil</button>
                ${mh.spokeOut ? "" : `<button class="btn btn-ghost btn-xs" data-act="mh-speak">🗣️ Açık konuş</button>`}
              </div>
            </div>`;
          })()}

          ${(function () {
            const fin = K.economy && K.economy.report ? K.economy.report() : null;
            if (!fin) return "";
            return `<div class="c-head" style="margin-top:6px"><div><h2>Muhasebe</h2><div class="sub">Son ayın gelir/gider dökümü</div></div></div>
            <div class="stat-grid">
              <div class="stat-card"><span class="k">Gelir</span><span class="v money">${U.money(fin.income)}</span><span class="d">telif + iş</span></div>
              <div class="stat-card"><span class="k">Gider</span><span class="v">${U.money(fin.upkeep)}</span><span class="d">ekip / stüdyo / kira</span></div>
              <div class="stat-card"><span class="k">Vergi</span><span class="v">${U.money(fin.tax)}</span><span class="d">aylık</span></div>
              <div class="stat-card"><span class="k">Net</span><span class="v ${fin.net >= 0 ? "money" : "hot"}">${U.money(fin.net)}</span><span class="d">Gün ${fin.day}</span></div>
            </div>`;
          })()}

          <div class="c-head" style="margin-top:4px"><div><h2>Platform Görünürlüğü</h2><div class="sub">Sosyal medya erişimin şarkılarının dinlenmesini etkiler</div></div></div>
          <div class="stat-grid">
            <div class="stat-card"><span class="k">Spotify</span><span class="v">${U.compact(totals.spotify)}</span><span class="d">dinlenme</span></div>
            <div class="stat-card"><span class="k">Apple Music</span><span class="v">${U.compact(totals.apple)}</span><span class="d">dinlenme</span></div>
            <div class="stat-card"><span class="k">YouTube</span><span class="v">${U.compact(totals.youtube)}</span><span class="d">görüntülenme</span></div>
            <div class="stat-card"><span class="k">Instagram</span><span class="v">${U.compact(p.ig)}</span><span class="d">takipçi</span></div>
            <div class="stat-card"><span class="k">TikTok</span><span class="v">${U.compact(p.tiktok)}</span><span class="d">takipçi</span></div>
            <div class="stat-card"><span class="k">X</span><span class="v">${U.compact(p.x)}</span><span class="d">takipçi</span></div>
          </div>

          <div class="c-head" style="margin-top:6px"><div><h2>En Çok Dinlenen Şarkıların</h2><div class="sub">Kariyerinin zirvesindeki işler</div></div></div>
          ${top.length ? `<div class="row-list">${top.map(song => `
            <div class="row-item">
              ${K.ui.cover(song.coverSeed, (song.title[0] || "?").toUpperCase())}
              <div class="grow">
                <div class="title">${U.escape(song.title)}</div>
                <div class="sub">${U.compact(song.streams)} dinlenme · ${K.genreById(song.genre).name}${song.chartRank ? ` · Liste #${song.chartRank}` : ""}${song.viral ? " · 🔥 Viral" : ""}</div>
              </div>
            </div>`).join("")}</div>`
          : `<div class="empty-note"><b>Henüz şarkın yok</b>Stüdyo sekmesinden ilk şarkını oluştur ve yayın sırasına ekle.</div>`}
        </div>`;
    },

    /* =====================================================
       STÜDYO — şarkı oluşturma
       ===================================================== */
    /* =====================================================
       STÜDYO — üretim merkezi (hub) + tek ekran üretim modalı
       ===================================================== */
    /* =====================================================
       STÜDYO — üretim merkezi (hub)
       ===================================================== */
    /* =====================================================
       STÜDYO — üretim merkezi (hub)
       ===================================================== */
    renderStudio() {
      const s = K.state;
      const p = s.player;
      const rels = p.releases || [];

      const rows = rels.map(r => {
        const left = Math.max(0, r.startDay + r.waitDays - s.day);
        const first = (r.tracks && r.tracks[0]) ? r.tracks[0].name : r.title;
        return `
        <div class="row-item">
          ${K.ui.cover(r.coverSeed, (first[0] || "?").toUpperCase())}
          <div class="grow">
            <div class="title">${U.escape(r.title)}</div>
            <div class="sub">${K.career.formatLabel(r.tracks.length)} · ${K.genreById(r.genre).name} · ${left} gün kaldı</div>
          </div>
          <span class="pill">${U.money(r.cost)}</span>
        </div>`;
      }).join("");

      return `
        <div class="c-block">
          <div class="c-head"><div><h2>Stüdyo</h2><div class="sub">Şarkını adım adım üret ve mağazalara gönder.</div></div></div>

          <div class="studio-hub">
            <div class="studio-hub-card primary">
              <div class="hub-icon">🎧</div>
              <div class="hub-title">Yeni Yayın Oluştur</div>
              <div class="hub-sub">Parçalar → prodüksiyon → kapak → tanıtım → dağıtım. Beş adımda hazır.</div>
              <button class="btn btn-primary" data-act="open-studio">🎧 Stüdyoyu Aç</button>
            </div>
            <div class="studio-hub-card">
              <div class="hub-title">Durum</div>
              <div class="hub-stats">
                <div><span class="k">Müzikal Yetenek</span><span class="v">${Math.floor(K.skillLevel("music"))}</span></div>
                <div><span class="k">Stüdyo Becerisi</span><span class="v">${Math.floor(K.skillLevel("studio"))}</span></div>
                <div><span class="k">Yorgunluk</span><span class="v">${Math.round(p.fatigue || 0)}</span></div>
                <div><span class="k">Hattaki İş</span><span class="v">${rels.length}</span></div>
              </div>
            </div>
          </div>

          ${rels.length ? `
          <div class="c-head" style="margin-top:4px"><div><h2>Yayın Hattı</h2><div class="sub">Hazırlanıyor</div></div></div>
          <div class="row-list">${rows}</div>` : ""}
        </div>`;
    },

    /* =====================================================
       YAYIN YÖNETİCİSİ (5 adımlı dağıtım sihirbazı)
       1 Parçalar · 2 Prodüksiyon & Sözler · 3 Kapak · 4 Tanıtım · 5 Dağıtım
       ===================================================== */
    WIZ_STEPS: [
      { id: 1, label: "Parçalar",     desc: "Yayın türünü seç, parça adlarını gir ve dosyaları yükle." },
      { id: 2, label: "Prodüksiyon",  desc: "Altyapı, vokal, tür ve mix ayarları." },
      { id: 3, label: "Söz Atölyesi", desc: "Bölüm bölüm yaz: Verse, Hook, Chorus, Bridge..." },
      { id: 4, label: "Kapak",        desc: "Kapağını tasarla, mağazada nasıl görüneceğini gör." },
      { id: 5, label: "Tanıtım",      desc: "Pazarlama bütçesi ve çıkış planı." },
      { id: 6, label: "Dağıtım",      desc: "Mağaza · bölge · kredi · telif bölüşümü · barkod ve son kontrol." }
    ],

    DISTRO_STORES: [
      { id: "spotify", name: "Spotify", icon: "🟢" },
      { id: "apple", name: "Apple Music", icon: "🍎" },
      { id: "youtube", name: "YouTube Music", icon: "▶️" },
      { id: "deezer", name: "Deezer", icon: "🎵" },
      { id: "amazon", name: "Amazon Music", icon: "📦" },
      { id: "tiktok", name: "TikTok", icon: "🎬" }
    ],

    openStudioModal(opts) {
      opts = opts || {};
      const p = K.state.player;

      /* Diss / gündem girişleri */
      const dissArtist = opts.dissArtistId ? K.artistById(opts.dissArtistId) : null;
      const topic = opts.topic || null;
      const topicTheme = topic ? (K.NEWS_CAT_THEME[topic.cat] || null) : null;
      let lyrics = "";
      if (dissArtist && K.beef) lyrics = K.beef.dissLine(dissArtist.id);
      else if (topic && K.news) lyrics = K.news.suggest(topicTheme, topic.id);

      K.careerUI._studio = {
        step: 1,
        genre: p.genre,
        count: 1,
        /* v10.39 — parça artık kendi SÖZÜNÜ taşır (eskiden tek bir
           lyricSections vardı ve albümdeki her şarkı aynı sözü alıyordu) */
        tracks: [{
          name: K.career.suggestTitle(), budget: 12000, source: "ev",
          lyrics: { intro: "", verse: lyrics || "", hook: "", chorus: "", bridge: "", outro: "" }
        }],
        lyrTrack: 0,
        kind: dissArtist ? "diss" : "normal",
        beatId: "digital", beatQ: 55,
        vocalId: "rap", vocalQ: 55,
        mixQ: 55,
        /* v10.44 — prodüksiyon süreci: kayıt oturumu · mix · master · revizyon */
        prod: K.production.defaultPlan(),
        feat: null,
        lyricsTheme: topicTheme || "street",
        topic: topic,
        dissArtist: dissArtist,
        conceptId: "open",
        projectTitle: "",
        coverOpts: K.careerUI.defaultCoverOpts(),
        stores: (K.defaultStores ? K.defaultStores() : []),
        /* v10.42 — distribütör seçimi + master sahipliği */
        distributor: (K.defaultDistributor ? K.defaultDistributor() : "karma"),
        useLabelDist: true,
        masterOwner: null,
        inventoryBeat: null,
        strategy: "standard",
        ghost: false,
        /* v10.40 — sample hakkı ve enstrümantal sürüm (A5/A6) */
        clearSample: false,
        instrumental: false,
        /* v10.41 — B grubu metadata: bölge, dil, krediler, label, telif yılı */
        regions: (K.defaultRegions ? K.defaultRegions() : ["world"]),
        lang: "tr",
        credits: (K.meta && K.meta.defaultCredits) ? K.meta.defaultCredits({ ghost: false }) : {},
        labelName: "",
        copyrightYear: String(U.dateForDay(K.state.day).y),
        publishTab: "dist",       // dağıtım adımındaki alt sekme
        /* v10.42 — C grubu teknik gereksinimler */
        coverPx: 1400,            // kapak dışa aktarma çözünürlüğü (mağaza alt sınırı 1400)
        contentId: false,         // YouTube Content ID kaydı
        releaseWeekday: 5,        // hedef çıkış günü (5 = Cuma)
        budget: 12000,
        marketing: 3000,
        wait: 18
      };
      K.careerUI._studioDir = "fwd";
      K.careerUI._syncTracks(K.careerUI._studio);
      K.careerUI._syncCover(K.careerUI._studio);

      const { box } = K.ui.modal({
        title: "🎧 Yayın Yöneticisi",
        desc: "Yayınını hazırla ve mağazalara gönder.",
        wide: true,
        className: "modal-studio",
        body: `<div class="studio-app">
            <aside class="studio-side">
              <div class="side-head">
                <span class="side-mark">K</span>
                <div class="side-brand"><b>KARMA DISTRO</b><span>Yayın Yöneticisi</span></div>
              </div>
              <div class="side-steps" id="st-steps"></div>
              <div class="side-sum" id="st-summary"></div>
            </aside>
            <section class="studio-main">
              <header class="main-head">
                <div><h2 id="st-step-title">Parçalar</h2><p id="st-step-desc"></p></div>
                <span class="main-stepno" id="st-stepno">1 / 5</span>
              </header>
              <div class="studio-form" id="st-body"></div>
            </section>
          </div>`,
        actions: []
      });

      const foot = U.qs(".modal-foot", box);
      foot.innerHTML = `<button class="btn btn-ghost" id="st-cancel">Vazgeç</button>
        <div class="st-foot-right">
          <span class="st-nav-info"></span>
          <div class="st-nav" id="st-nav"></div>
        </div>`;
      U.qs("#st-cancel", foot).addEventListener("click", () => K.ui.closeModal());

      const bodyEl = U.qs(".modal-body", box);
      bodyEl.addEventListener("input", K.careerUI.onStudioInput);
      bodyEl.addEventListener("change", K.careerUI.onStudioInput);
      box.addEventListener("click", K.careerUI.onStudioClick);

      K.careerUI.renderStudioStep();
    },

    /* ---------------- parça başına sözler (v10.39 · v10.41) ---------------- */
    emptyLyrics() {
      const o = {};
      K.LYRIC_SECTIONS.forEach(s => {
        o[s.id] = "";
        if (s.mode === "indexed") { o[s.id + "2"] = ""; o[s.id + "3"] = ""; }
      });
      /* v10.41 — son nakarat varyasyonu ayrı anahtardır (opsiyonel) */
      o.chorusLast = "";
      return o;
    },
    lyrIndex(st) {
      const n = (st.tracks || []).length;
      const i = Math.round(+st.lyrTrack || 0);
      return (i >= 0 && i < n) ? i : 0;
    },
    trackLyrics(st, i) {
      const tr = (st.tracks || [])[i];
      if (!tr) return K.careerUI.emptyLyrics();
      if (!tr.lyrics || typeof tr.lyrics !== "object") tr.lyrics = K.careerUI.emptyLyrics();
      return tr.lyrics;
    },
    /* v10.41 — parçanın şarkı biçimi (slot dizisi). Yoksa klasik atanır. */
    trackSlots(st, i) {
      const tr = (st.tracks || [])[i];
      if (!tr) return K.lyricTemplateById("classic").slots.slice();
      if (!Array.isArray(tr.slots) || !tr.slots.length) {
        tr.slots = K.lyricTemplateById("classic").slots.slice();
      }
      return tr.slots;
    },
    /* yapıdaki benzersiz bölüm sayısı (yazılacak bölüm) */
    lyricsTotal(slots) {
      if (Array.isArray(slots) && slots.length) return K.lyricStructureUnique(slots).length;
      return K.LYRIC_SECTIONS.length;
    },
    lyricsFilled(sec, slots) {
      if (Array.isArray(slots) && slots.length) return K.lyrics.structure(sec, slots).have;
      return K.LYRIC_SECTIONS.filter(s => String((sec || {})[s.id] || "").trim()).length;
    },
    /* bir parça TAM sayılır: ya temel bölümlerin hepsi dolu ya da
       yapıdaki bütün bölümler yazılmış (eski kayıtlar geriye uyumlu). */
    trackLyricsDone(st, i) {
      const t = (st.tracks || [])[i];
      if (!t) return false;
      if (K.careerUI.lyricsFilled(t.lyrics) === K.LYRIC_SECTIONS.length) return true;
      const s = K.careerUI.trackSlots(st, i);
      return K.careerUI.lyricsFilled(t.lyrics, s) === K.careerUI.lyricsTotal(s);
    },
    lyricsDone(st) {
      return (st.tracks || []).filter((t, i) => K.careerUI.trackLyricsDone(st, i)).length;
    },
    /* bir bölüm setini temaya göre doldurur (yerinde).
       Hem temel 7 bölümü hem de yapıdaki varyant anahtarları
       (verse2/verse3/prechorus2/chorusLast) doldurur; böylece
       yapı tamamen yazılmış sayılır. */
    suggestInto(sec, theme, slots) {
      K.LYRIC_SECTIONS.forEach(s => { sec[s.id] = K.lyrics.suggestSection(theme, s.id).join("\n"); });
      if (Array.isArray(slots) && slots.length) {
        const usedVerse = {};
        K.lyricStructureUnique(slots).forEach(k => {
          if (k === "chorusLast") { sec[k] = ""; return; }  // opsiyonel varyasyon → düz nakarata düşer
          const type = K.lyricKeyType(k).id;
          if (type === "verse") {
            const c = K.LYRIC_CONTENT[theme] || K.LYRIC_CONTENT.street;
            const pool = c.couplets;
            let idx = Math.floor(Math.random() * pool.length), guard = 0;
            while (usedVerse[idx] && guard++ < 30) idx = Math.floor(Math.random() * pool.length);
            usedVerse[idx] = true;
            sec[k] = pool[idx].join("\n");
          } else if (type === "chorus") {
            sec[k] = sec.chorus || K.lyrics.suggestSection(theme, "chorus").join("\n");
          } else {
            sec[k] = K.lyrics.suggestSection(theme, k).join("\n");
          }
        });
      }
      return sec;
    },
    /* söz analizi pahalı; tuş başına 30 parçayı yeniden analiz etmemek
       için küçük bir önbellek (içerik + tema + tür + YAPI anahtarı). */
    _lyrCache: {},
    analyzeTrack(st, i) {
      const sec = K.careerUI.trackLyrics(st, i);
      const slots = K.careerUI.trackSlots(st, i);
      const key = st.lyricsTheme + "|" + st.genre + "|" + st.kind + "|" + slots.join(",") + "|" +
        K.lyricStructureUnique(slots).map(k => k + ":" + String(sec[k] || "")).join("\u0001");
      const c = K.careerUI._lyrCache;
      if (Object.prototype.hasOwnProperty.call(c, key)) return c[key];
      if (Object.keys(c).length > 160) K.careerUI._lyrCache = {};
      const r = K.lyrics.analyze(sec, st.lyricsTheme, st.genre, st.kind, slots);
      c[key] = r;
      return r;
    },

    /* ---------------- durum yardımcıları ---------------- */
    _syncTracks(st) {
      st.tracks = st.tracks || [];
      const def = st.budget || 12000;
      st.count = Math.max(1, Math.min(K.career.MAX_TRACKS, Math.round(+st.count || 1)));
      if (st.tracks.length > st.count) st.tracks = st.tracks.slice(0, st.count);
      /* v10.39 — YENİ PARÇALAR TEKİLLEŞTİRİLİR. Eskiden körlemesine
         suggestTitle() ekleniyordu; 10 parçalı bir projede 30 denemenin
         12'sinde aynı ad iki kez geliyordu (ör. iki tane "Gölge"). */
      /* v10.41 — yeni parçalara ÇEŞİTLİ şarkı biçimi atanır; hepsi
         aynı kalıp olmaz. "short" atanmaz (2 dakikanın altına inmesin). */
      const VAR_SLOTS = ["classic", "three", "hookfirst", "bridge", "epic", "bars"];
      const used = new Set(st.tracks.map(t => String(t.name || "").trim()).filter(Boolean));
      while (st.tracks.length < st.count) {
        let nm = K.career.suggestTitle(), guard = 0;
        while (used.has(nm) && guard++ < 40) nm = K.career.suggestTitle();
        used.add(nm);
        st.tracks.push({ name: nm, budget: def, source: "ev" });
      }
      /* eski kayıtlardan gelen TEK söz seti ilk parçaya taşınır */
      if (st.lyricSections && !st._lyrMigrated) {
        st.tracks.forEach((t, i) => { if (i === 0 && !t.lyrics) t.lyrics = Object.assign(K.careerUI.emptyLyrics(), st.lyricSections); });
        st._lyrMigrated = true;
        delete st.lyricSections;
      }
      st.tracks.forEach((t, i) => {
        if (t.budget == null) t.budget = def;
        if (!t.source) t.source = "ev";
        /* v10.41 — biçim yoksa ata (eski kayıtlar bozulmaz) */
        if (!Array.isArray(t.slots) || !t.slots.length) {
          const tmpl = K.lyricTemplateById(VAR_SLOTS[i % VAR_SLOTS.length]);
          t.slots = ((tmpl && tmpl.slots) || K.lyricTemplateById("classic").slots).slice();
        }
        if (!t.lyrics || typeof t.lyrics !== "object") t.lyrics = K.careerUI.emptyLyrics();
        /* v10.40 — parça bazında feat ve explicit bayrağı */
        if (t.feat === undefined) t.feat = null;
        if (t.explicit === undefined) t.explicit = false;
        /* v10.41 — süre artık biçimden türer (deterministik) */
        t.dur = K.career.durationForSlots(t.slots, t.name);
      });
      /* v10.40 — yayın-seviyesi feat artık "tümüne uygula" kolaylığıdır;
         gerçek kredi parça bazında tutulur (t.feat). */
      if (st.feat && st.tracks.every(t => !t.feat)) {
        st.tracks.forEach(t => { t.feat = st.feat; });
      }
      if (!(st.lyrTrack >= 0 && st.lyrTrack < st.tracks.length)) st.lyrTrack = 0;
      if (st.count > 1 && (st.autoCount !== st.count || !st.autoProjectTitle)) {
        st.autoProjectTitle = K.career.suggestProjectTitle(st.count);
        st.autoCount = st.count;
      }
      return st.tracks;
    },

    projectName(st) {
      if (st.count <= 1) return (st.tracks[0] && st.tracks[0].name) || "İsimsiz";
      return ((st.projectTitle || "").trim()) || st.autoProjectTitle || K.career.suggestProjectTitle(st.count);
    },

    /* v10.38 — kapak seçeneklerinin tek kaynağı. Yeni alanlar burada
       varsayılana düşer; eski kayıtlar (align) düzene çevrilir. */
    defaultCoverOpts() {
      return {
        style: "gece", pattern: "flat", text: "mono", hue: -1, grain: 1,
        font: "blok", layout: "merkez", align: "center", shape: "none",
        showArtist: true, frame: false, explicit: false,
        year: String(U.dateForDay(K.state.day).y)
      };
    },

    _syncCover(st) {
      st.coverOpts = st.coverOpts || {};
      const o = st.coverOpts;
      if (!o.style) o.style = "gece";
      if (!o.pattern) o.pattern = "flat";
      if (!o.text) o.text = "mono";
      if (o.hue == null) o.hue = -1;
      if (o.grain == null) o.grain = 1;
      if (!o.font) o.font = "blok";
      /* eski kayıtta düzen yok → hizadan türet */
      if (!o.layout) o.layout = o.align === "top" ? "ust" : o.align === "bottom" ? "alt" : "merkez";
      if (!o.align) o.align = o.layout === "ust" ? "top" : o.layout === "alt" ? "bottom" : "center";
      if (!o.shape) o.shape = "none";
      if (o.showArtist == null) o.showArtist = true;
      if (o.frame == null) o.frame = false;
      if (o.explicit == null) o.explicit = false;
      if (o.year == null) o.year = String(U.dateForDay(K.state.day).y);
      const artist = o.showArtist ? (K.state.player.stageName || "") : "";
      st.coverSeed = "cv~" + o.style + "~" + o.pattern + "~" + o.text + "~" + o.hue + "~" + o.grain +
        "~" + o.font + "~" + o.align + "~" + o.shape + "~" + encodeURIComponent(artist) +
        "~" + encodeURIComponent(K.careerUI.projectName(st)) +
        "~" + o.layout + "~" + (o.frame ? 1 : 0) + "~" + (o.explicit ? 1 : 0) +
        "~" + encodeURIComponent(o.year || "");
    },

    collectField(id, el) {
      const st = K.careerUI._studio;
      if (!st || !id) return;
      const v = el.value;
      switch (id) {
        case "st-genre": st.genre = v; break;
        case "st-kind": st.kind = v; break;
        case "st-beat": st.beatId = v; break;
        case "st-beat-q": st.beatQ = +v; break;
        case "st-vocal": st.vocalId = v; break;
        case "st-vocal-q": st.vocalQ = +v; break;
        case "st-mix-q": st.mixQ = +v; break;
        /* v10.40 — A2: bu seçim artık TÜM parçalara uygulanan kolaylıktır.
           Gerçek kredi parça bazında tutulur (parça satırındaki Feat alanı). */
        case "st-feat":
          st.feat = v || null;
          st.tracks.forEach(t => { t.feat = st.feat; });
          K.careerUI.renderTrackList();
          break;
        case "st-lyric-theme": st.lyricsTheme = v; break;
        case "st-lyrics": st.lyricsText = v; break;
        case "st-concept": st.conceptId = v; break;
        case "st-project": st.projectTitle = v; break;
        case "st-budget": st.budget = +v; break;
        case "st-marketing": st.marketing = +v; break;
        case "st-wait": st.wait = +v; break;
        /* v10.41 — B4/B5/B6: dil, etiket adı, telif yılı */
        case "st-lang": st.lang = v; K.careerUI.renderRegionChips(); break;
        case "st-label-name": st.labelName = v; break;
        case "st-copy-year": st.copyrightYear = v; break;
        /* v10.42 — C3: hedef çıkış günü */
        case "st-weekday": st.releaseWeekday = +v; K.careerUI.updateStudioEstimate(); break;
      }
    },

    collectStudio() {
      const st = K.careerUI._studio;
      if (!st) return;
      ["st-genre", "st-kind", "st-beat", "st-vocal", "st-feat", "st-lyric-theme",
        "st-lyrics", "st-concept", "st-project", "st-lang", "st-label-name",
        "st-copy-year", "st-weekday"].forEach(id => {
        const el = U.qs("#" + id);
        if (el) K.careerUI.collectField(id, el);
      });
      [["st-beat-q", "beatQ"], ["st-vocal-q", "vocalQ"], ["st-mix-q", "mixQ"],
        ["st-budget", "budget"], ["st-marketing", "marketing"], ["st-wait", "wait"]].forEach(pair => {
        const el = U.qs("#" + pair[0]);
        if (el) st[pair[1]] = +el.value;
      });
      (st.tracks || []).forEach((t, i) => {
        const n = U.qs('[data-trk="' + i + '"]'); if (n) t.name = n.value;
        const b = U.qs('[data-trkb="' + i + '"]'); if (b) t.budget = +b.value;
      });
      const sec = K.careerUI.trackLyrics(st, K.careerUI.lyrIndex(st));
      const slots = K.careerUI.trackSlots(st, K.careerUI.lyrIndex(st));
      K.lyricStructureUnique(slots).forEach(k => {
        const el = U.qs('[data-lyrsec="' + k + '"]');
        if (el) sec[k] = el.value;
      });
      K.careerUI._syncCover(st);
    },

    /* ---------------- giriş olayları ---------------- */
    onStudioInput(e) {
      const st = K.careerUI._studio;
      if (!st) return;
      const el = e.target;
      const ds = el.dataset || {};

      if (ds.trk != null) {
        const i = +ds.trk;
        if (st.tracks[i]) st.tracks[i].name = el.value;
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (ds.trkb != null) {
        const i = +ds.trkb;
        if (st.tracks[i]) st.tracks[i].budget = +el.value;
        const lab = el.parentNode && el.parentNode.querySelector(".trk-budget-val");
        const hide = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();
        if (lab) lab.textContent = hide ? "🔒" : U.money(+el.value);
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (el.id === "st-count") {
        st.count = +el.value;
        K.careerUI._syncTracks(st);
        K.careerUI.renderTrackList();
        K.careerUI.renderProjectField();
        K.careerUI.renderTypeCards();
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (ds.src != null) {
        const i = +ds.src;
        if (st.tracks[i]) st.tracks[i].source = el.value;
        K.careerUI.renderTrackList();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.40 — A2: parça bazında featuring */
      if (ds.feat != null) {
        const i = +ds.feat;
        if (st.tracks[i]) st.tracks[i].feat = el.value || null;
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.41 — B1/B2: kredi sahibi ve payı */
      if (ds.credit != null) {
        st.credits = st.credits || K.meta.defaultCredits(st);
        const role = ds.credit;
        const c = st.credits[role] || (st.credits[role] = { self: false, name: null, share: K.creditRoleById(role).share });
        if (ds.creditField === "holder") {
          if (el.value === "self") { c.self = true; c.name = null; }
          else if (el.value) { c.self = false; c.name = el.value; }
          else { c.self = false; c.name = null; }
          K.careerUI.renderCredits();
        } else {
          c.share = U.clamp(+el.value || 0, 0, 100);
        }
        K.careerUI.renderSplitSheet();
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (el.id === "st-inv-beat") { st.inventoryBeat = el.value || null; K.careerUI.updateStudioEstimate(); return; }
      if (el.id === "st-hue") {
        st.coverOpts.hue = +el.value;
        const lab = U.qs("#st-hue-val");
        if (lab) lab.textContent = (+el.value < 0 ? "Otomatik" : el.value + "°");
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        return;
      }
      if (ds.lyrsec != null) {
        K.careerUI.trackLyrics(st, K.careerUI.lyrIndex(st))[ds.lyrsec] = el.value;
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (el.id === "st-project") {
        K.careerUI.collectField(el.id, el);
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        K.careerUI.updateStudioEstimate();
        return;
      }

      K.careerUI.collectField(el.id, el);
      K.careerUI.updateStudioEstimate();
    },

    validateStep(n) {
      const st = K.careerUI._studio;
      if (n === 1) {
        const anyName = (st.tracks || []).some(t => (t.name || "").trim());
        if (!anyName) { K.toast("Parça adı gerekli", "En az bir parça adı gir.", "warn"); return false; }
        st.count = st.tracks.length;
      }
      /* v10.39 — her parçanın sözü olmalı; tek tuşla doldurma var */
      if (n === 3) {
        const bos = st.tracks.filter((t, i) => K.careerUI.lyricsFilled(t.lyrics, K.careerUI.trackSlots(st, i)) === 0);
        if (bos.length) {
          K.toast("Söz eksik", bos.length + " parçada hiç söz yok. \"Kalanları Otomatik Doldur\" ile tamamlayabilirsin.", "warn");
          return false;
        }
      }
      /* v10.42 — C1: kapak mağaza alt sınırının altındaysa yayın reddedilir */
      if (n === 4) {
        if (!K.meta.coverAccepted(st.coverPx)) {
          K.toast("Kapak reddedilir", "Mağazalar " + K.meta.COVER_MIN_PX + "×" + K.meta.COVER_MIN_PX + " altındaki kapağı kabul etmez. Teknik Gereksinim bölümünden yükselt.", "bad");
          return false;
        }
      }
      /* v10.42 — C2: düşük kaliteli kaynak + premium mağaza = ret */
      if (n === 6) {
        const bad = (st.tracks || []).filter(t => !K.meta.sourceAccepted(K.sourceById(t.source)));
        const badStores = bad.length ? K.meta.premiumStores(st.stores) : [];
        if (badStores.length) {
          const names = badStores.map(id => (K.storeById(id) || {}).name).join(", ");
          K.toast("Format uyumsuz", names + " düşük kaliteli kaydı kabul etmez. Kaynağı yükselt ya da o mağazaları kaldır.", "bad");
          return false;
        }
      }
      return true;
    },

    onStudioClick(e) {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      const st = K.careerUI._studio;
      if (!st) return;

      if (act === "st-next") {
        K.careerUI.collectStudio();
        if (!K.careerUI.validateStep(st.step)) return;
        K.careerUI._studioDir = "fwd";
        st.step = Math.min(6, st.step + 1);
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "st-back") {
        K.careerUI.collectStudio();
        K.careerUI._studioDir = "back";
        st.step = Math.max(1, st.step - 1);
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "st-jump") {
        K.careerUI.collectStudio();
        const to = +btn.dataset.arg;
        K.careerUI._studioDir = to >= st.step ? "fwd" : "back";
        st.step = to;
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "st-publish") {
        if (K.careerUI.createReleaseFromStudio()) K.ui.closeModal();
        return;
      }

      /* yayın türü kartları */
      if (act === "st-type") {
        const c = +btn.dataset.arg;
        st.count = c;
        K.careerUI._syncTracks(st);
        const sl = U.qs("#st-count"); if (sl) sl.value = st.count;
        K.careerUI.renderTypeCards();
        K.careerUI.renderTrackList();
        K.careerUI.renderProjectField();
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        K.careerUI.updateStudioEstimate();
        return;
      }

      /* v10.41 — B3: bölge seçimi. "world" seçilirse diğer bölgeler
         listeden düşer (dünya geneli zaten hepsini kapsar). */
      if (act === "region-toggle") {
        const id = btn.dataset.arg;
        let set = new Set(st.regions && st.regions.length ? st.regions : ["world"]);
        if (id === "world") {
          set = new Set(set.has("world") ? [] : ["world"]);
        } else {
          set.delete("world");
          if (set.has(id)) set.delete(id); else set.add(id);
        }
        st.regions = Array.from(set);
        if (!st.regions.length) st.regions = ["world"];
        K.careerUI.renderRegionChips();
        K.careerUI.updateStudioEstimate();
        return;
      }

      /* v10.44 — prodüksiyon süreci: kayıt · mix · master · revizyon */
      if (act === "prod-session") {
        st.prod = K.production.normalize(st.prod); st.prod.session = btn.dataset.arg;
        K.careerUI.renderStudioStep(); K.careerUI.updateStudioEstimate(); return;
      }
      if (act === "prod-mix") {
        st.prod = K.production.normalize(st.prod); st.prod.mix = btn.dataset.arg;
        st.prod.revisions = 0; st.prod.accepted = false;
        K.careerUI.renderStudioStep(); K.careerUI.updateStudioEstimate(); return;
      }
      if (act === "prod-master") {
        st.prod = K.production.normalize(st.prod); st.prod.master = btn.dataset.arg;
        K.careerUI.renderStudioStep(); K.careerUI.updateStudioEstimate(); return;
      }
      if (act === "prod-revise") {
        st.prod = K.production.normalize(st.prod);
        if (st.prod.revisions < K.PROD.MAX_REVISIONS) st.prod.revisions++;
        st.prod.accepted = false;
        K.careerUI.renderStudioStep(); K.careerUI.updateStudioEstimate(); return;
      }
      if (act === "prod-accept") {
        st.prod = K.production.normalize(st.prod); st.prod.accepted = true;
        K.careerUI.renderStudioStep(); K.careerUI.updateStudioEstimate(); return;
      }
      if (act === "store-toggle") {
        const id = btn.dataset.arg;
        const set = new Set(st.stores || []);
        if (set.has(id)) set.delete(id); else set.add(id);
        st.stores = Array.from(set);
        K.careerUI.renderStoreChips();
        K.careerUI.updateStudioEstimate();
        return;
      }

      /* v10.42 — distribütör seçimi + master sahipliği */
      if (act === "dist-pick") {
        const id = btn.dataset.arg;
        if (K.distro.canUse(id, K.state.day)) {
          st.distributor = id;
          st.useLabelDist = false;
          K.careerUI.renderDistributorChips();
          K.careerUI.renderStoreChips();
          K.careerUI.updateStudioEstimate();
        }
        return;
      }
      if (act === "dist-label-mode") {
        st.useLabelDist = btn.dataset.arg === "1";
        K.careerUI.renderDistributorChips();
        K.careerUI.renderStoreChips();
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (act === "master-pick") {
        st.masterOwner = btn.dataset.arg === "label" ? "label" : "artist";
        K.careerUI.renderDistributorChips();
        K.careerUI.updateStudioEstimate();
        return;
      }

      /* parça listesi */
      if (act === "trk-add") {
        if (st.tracks.length >= K.career.MAX_TRACKS) { K.toast("En fazla " + K.career.MAX_TRACKS + " parça", "", "warn"); return; }
        st.count = st.tracks.length + 1;
        K.careerUI._syncTracks(st);   // ad tekilleştirme + süre burada
        const sl = U.qs("#st-count"); if (sl) sl.value = st.count;
        K.careerUI.renderTrackList();
        K.careerUI.renderProjectField();
        K.careerUI.renderTypeCards();
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (act === "trk-remove") {
        if (st.tracks.length <= 1) { K.toast("En az 1 parça", "", "warn"); return; }
        st.tracks.splice(+btn.dataset.arg, 1);
        st.count = st.tracks.length;
        const sl = U.qs("#st-count"); if (sl) sl.value = st.count;
        K.careerUI.renderTrackList();
        K.careerUI.renderProjectField();
        K.careerUI.renderTypeCards();
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.40 — A1: parça sırası. Albümde açılış parçası +2 kalite
         bonusu aldığı için sıralama artık gerçek bir sanat kararı. */
      if (act === "trk-move") {
        const i = +btn.dataset.arg;
        const dir = btn.dataset.dir === "up" ? -1 : 1;
        const j = i + dir;
        if (j < 0 || j >= st.tracks.length) return;
        const tmp = st.tracks[i];
        st.tracks[i] = st.tracks[j];
        st.tracks[j] = tmp;
        /* söz atölyesi seçili parçayı takip etsin */
        if (st.lyrTrack === i) st.lyrTrack = j;
        else if (st.lyrTrack === j) st.lyrTrack = i;
        K.careerUI.renderTrackList();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.40 — A3: explicit bayrağı (mağazaya bildirilir) */
      if (act === "trk-explicit") {
        const i = +btn.dataset.arg;
        if (st.tracks[i]) st.tracks[i].explicit = !st.tracks[i].explicit;
        K.careerUI.renderTrackList();
        K.careerUI.updateStudioEstimate();
        return;
      }
      if (act === "trk-reroll") {
        K.career.suggestTracks(st.tracks.length).forEach((nm, i) => { if (st.tracks[i]) st.tracks[i].name = nm; });
        K.careerUI.renderTrackList();
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.40 — A5: sample hakkı kararı */
      if (act === "st-clear-sample") {
        st.clearSample = btn.dataset.arg === "1";
        K.careerUI.renderStudioStep();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.40 — A6: enstrümantal sürüm */
      if (act === "st-instrumental") {
        st.instrumental = !st.instrumental;
        K.careerUI.renderStudioStep();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.42 — C1: kapak dışa aktarma çözünürlüğü */
      if (act === "cover-px") {
        st.coverPx = +btn.dataset.arg || 1400;
        K.careerUI.renderStudioStep();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.42 — C4: YouTube Content ID */
      if (act === "st-content-id") {
        st.contentId = !st.contentId;
        K.careerUI.renderStudioStep();
        K.careerUI.updateStudioEstimate();
        return;
      }
      /* v10.42 — C2: uyumsuz premium mağazaları tek tuşla düşür */
      if (act === "st-drop-premium") {
        const bad = new Set(K.meta.premiumStores(st.stores));
        st.stores = (st.stores || []).filter(id => !bad.has(id));
        K.careerUI.renderStoreChips();
        K.careerUI.renderStudioStep();
        K.careerUI.updateStudioEstimate();
        K.toast("Mağazalar güncellendi", bad.size + " mağaza çıkarıldı; yayın artık gönderilebilir.", "ok");
        return;
      }
      if (act === "trk-budget-all") {
        const def = st.budget || 12000;
        st.tracks.forEach(t => { t.budget = def; });
        K.careerUI.renderBudgetList();
        K.careerUI.renderTrackList();
        K.careerUI.updateStudioEstimate();
        K.toast("💸 Bütçe uygulandı", `Tüm parçalara parça başı ${U.money(def)} atandı.`, "ok");
        return;
      }

      /* söz atölyesi — v10.39: hepsi SEÇİLİ PARÇA üzerinde çalışır */
      if (act === "lyr-track") {
        st.lyrTrack = Math.round(+btn.dataset.arg || 0);
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "lyr-suggest") {
        const sec = K.careerUI.trackLyrics(st, K.careerUI.lyrIndex(st));
        sec[btn.dataset.arg] = K.lyrics.suggestSection(st.lyricsTheme, btn.dataset.arg).join("\n");
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "lyr-suggest-all") {
        const i = K.careerUI.lyrIndex(st);
        K.careerUI.suggestInto(K.careerUI.trackLyrics(st, i), st.lyricsTheme, K.careerUI.trackSlots(st, i));
        K.careerUI.renderStudioStep();
        K.toast("🎲 Söz önerildi", (st.tracks[i].name || "Parça " + (i + 1)) + " dolduruldu.", "ok");
        return;
      }
      if (act === "lyr-fill-rest") {
        let n = 0;
        st.tracks.forEach((t, i) => {
          if (K.careerUI.trackLyricsDone(st, i)) return;
          K.careerUI.suggestInto(K.careerUI.trackLyrics(st, i), st.lyricsTheme, K.careerUI.trackSlots(st, i));
          n++;
        });
        K.careerUI.renderStudioStep();
        K.toast(n ? "🎲 " + n + " parça dolduruldu" : "Zaten hazır",
          n ? "Sözler temaya göre yazıldı." : "Bütün parçaların sözü tam.", n ? "ok" : "warn");
        return;
      }
      if (act === "lyr-apply-all") {
        const src = JSON.parse(JSON.stringify(K.careerUI.trackLyrics(st, K.careerUI.lyrIndex(st))));
        st.tracks.forEach(t => { t.lyrics = JSON.parse(JSON.stringify(src)); });
        K.careerUI.renderStudioStep();
        K.toast("📋 Uygulandı", "Bu söz bütün parçalara kopyalandı.", "ok");
        return;
      }
      /* v10.41 — ŞARKI BİÇİMİ düzenleme */
      if (act === "lyr-template") {
        const tpl = K.lyricTemplateById(btn.dataset.arg);
        const i = K.careerUI.lyrIndex(st);
        if (tpl.slots) st.tracks[i].slots = tpl.slots.slice();
        K.careerUI._syncTracks(st);
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "lyr-add") {
        const i = K.careerUI.lyrIndex(st);
        st.tracks[i].slots = K.careerUI.trackSlots(st, i).slice();
        st.tracks[i].slots.push(btn.dataset.arg || "verse");
        K.careerUI._syncTracks(st);
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "lyr-del") {
        const i = K.careerUI.lyrIndex(st);
        const idx = Math.round(+btn.dataset.arg || 0);
        const slots = K.careerUI.trackSlots(st, i);
        if (slots.length <= 2) { K.toast("En az 2 bölüm", "Bir şarkı en az iki bölümden oluşur.", "warn"); return; }
        slots.splice(idx, 1);
        K.careerUI._syncTracks(st);
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "lyr-mv") {
        const i = K.careerUI.lyrIndex(st);
        const idx = Math.round(+btn.dataset.arg || 0);
        const dir = btn.dataset.dir === "-1" ? -1 : 1;
        const slots = K.careerUI.trackSlots(st, i);
        const j = idx + dir;
        if (j < 0 || j >= slots.length) return;
        const tmp = slots[idx]; slots[idx] = slots[j]; slots[j] = tmp;
        K.careerUI._syncTracks(st);
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "lyr-apply-struct") {
        const i = K.careerUI.lyrIndex(st);
        const src = K.careerUI.trackSlots(st, i).slice();
        st.tracks.forEach(t => { t.slots = src.slice(); });
        K.careerUI._syncTracks(st);
        K.careerUI.renderStudioStep();
        K.toast("🎼 Biçim uygulandı", "Bu şarkı biçimi bütün parçalara uygulandı.", "ok");
        return;
      }
      if (act === "lyr-clear") {
        st.tracks[K.careerUI.lyrIndex(st)].lyrics = K.careerUI.emptyLyrics();
        K.careerUI.renderStudioStep();
        return;
      }
      if (act === "lyr-ghost") {
        if (st.ghost) { st.ghost = false; K.careerUI.renderStudioStep(); K.toast("Söz yazarı bırakıldı", "Kendi sözlerini yazacaksın.", ""); return; }
        if (!K.economy.canAfford(15000)) { K.toast("Yetersiz bakiye", "Söz yazarı için ₺15.000 gerekiyor.", "bad"); return; }
        K.economy.spend(15000, "ghostwriter");
        st.ghost = true;
        st.tracks.forEach((t, i) => K.careerUI.suggestInto(K.careerUI.trackLyrics(st, i), st.lyricsTheme, K.careerUI.trackSlots(st, i)));
        K.careerUI.renderStudioStep();
        K.toast("✍️ Söz yazarı tutuldu", "Bütün parçaların sözleri yazıldı — sızma riski var.", "warn");
        return;
      }

      /* beat pazarı */
      if (act === "beat-buy") {
        const o = K.careerUI._beatOffers().find(x => x.id === btn.dataset.arg);
        if (!o) return;
        if (!K.economy.canAfford(o.cost)) { K.toast("Yetersiz bakiye", U.money(o.cost) + " gerekiyor.", "bad"); return; }
        K.economy.spend(o.cost, "beat_purchase");
        const b = { id: U.uid("beat"), name: o.name, producer: o.producer, quality: o.quality, cost: o.cost };
        K.state.player.beats.push(b);
        st.inventoryBeat = b.id;
        K.careerUI.renderBeatMarket();
        K.careerUI.updateStudioEstimate();
        K.toast("🥁 Beat alındı", `${o.name} · ${o.producer}`, "ok");
        return;
      }

      /* yayın stratejisi */
      if (act === "strategy") { st.strategy = btn.dataset.arg; K.careerUI.renderStudioStep(); return; }

      /* kapak */
      if (act === "cover-style")  { st.coverOpts.style = btn.dataset.arg;  K.careerUI._afterCoverChange(); return; }
      if (act === "cover-pattern"){ st.coverOpts.pattern = btn.dataset.arg; K.careerUI._afterCoverChange(); return; }
      if (act === "cover-text")   { st.coverOpts.text = btn.dataset.arg;   K.careerUI._afterCoverChange(); return; }
      if (act === "cover-font")   { st.coverOpts.font = btn.dataset.arg;   K.careerUI._afterCoverChange(); return; }
      if (act === "cover-layout") { st.coverOpts.layout = btn.dataset.arg; K.careerUI._afterCoverChange(); return; }
      if (act === "cover-shape")  { st.coverOpts.shape = btn.dataset.arg;  K.careerUI._afterCoverChange(); return; }
      if (act === "cover-artist") { st.coverOpts.showArtist = !st.coverOpts.showArtist; K.careerUI._afterCoverChange(); return; }
      if (act === "cover-grain")  { st.coverOpts.grain = st.coverOpts.grain ? 0 : 1; K.careerUI._afterCoverChange(); return; }
      if (act === "cover-frame")  { st.coverOpts.frame = !st.coverOpts.frame; K.careerUI._afterCoverChange(); return; }
      if (act === "cover-explicit") { st.coverOpts.explicit = !st.coverOpts.explicit; K.careerUI._afterCoverChange(); return; }
      if (act === "cover-year")   {
        st.coverOpts.year = st.coverOpts.year ? "" : String(U.dateForDay(K.state.day).y);
        K.careerUI._afterCoverChange();
        return;
      }
      if (act === "cover-reset")  {
        st.coverOpts = K.careerUI.defaultCoverOpts();
        K.careerUI._afterCoverChange();
        return;
      }
      if (act === "cover-hue-auto") { st.coverOpts.hue = -1; K.careerUI._syncCover(st); K.careerUI.renderCoverControls(); K.careerUI.renderCoverPreview(); return; }
      /* v10.38 — Rastgele artık yalnız stil/desen/şekil/ton/grain değiştirir.
         Öncesinde tüm nesne değiştiriliyordu ve oyuncunun font, düzen,
         çerçeve, explicit ve yıl seçimleri sessizce sıfırlanıyordu. */
      if (act === "cover-random") {
        const o = st.coverOpts;
        o.style = U.pick(K.COVER_STYLES).id;
        o.pattern = U.pick(K.COVER_PATTERNS).id;
        o.shape = U.pick(K.COVER_SHAPES).id;
        o.hue = U.chance(0.45) ? U.randInt(0, 359) : -1;
        o.grain = U.chance(0.6) ? 1 : 0;
        K.careerUI._afterCoverChange();
        return;
      }

      if (act === "roll-project") {
        st.projectTitle = K.career.suggestProjectTitle(st.count);
        const el = U.qs("#st-project"); if (el) el.value = st.projectTitle;
        K.careerUI._syncCover(st);
        K.careerUI.renderCoverPreview();
        return;
      }
    },

    _afterCoverChange() {
      const st = K.careerUI._studio;
      K.careerUI._syncCover(st);
      K.careerUI.renderCoverControls();
      K.careerUI.renderCoverPreview();
      K.careerUI.renderStepList();
      const cv = U.qs("#cv-preview");
      if (cv) { cv.classList.remove("cv-pop"); void cv.offsetWidth; cv.classList.add("cv-pop"); }
    },

    /* ---------------- parça / bütçe / proje listeleri ---------------- */
    renderTrackList() {
      const wrap = U.qs("#st-track-list");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      K.careerUI._syncTracks(st);
      const srcOpts = id => K.TRACK_SOURCES.map(s =>
        `<option value="${s.id}" ${s.id === id ? "selected" : ""}>${s.icon} ${s.name}</option>`).join("");
      /* v10.39 — DOSYA YÜKLEME ADIMI KALDIRILDI. Oyuncuya hiçbir şey
         katmıyordu (sadece ilerleme çubuğu izletiyordu); kaynak seçimi
         kalite ve maliyeti zaten belirliyor. Kaynak satırı kaldı ve
         artık etkisini açıkça yazıyor. */
      /* v10.40 — parça satırı artık gerçek dağıtım formunun parçası:
         sıra (açılış parçası kalite bonusu alır), feat (parça bazında),
         explicit bayrağı (mağazaya bildirilir). */
      const last = st.tracks.length - 1;
      const expHint = K.meta ? K.meta.suggestExplicit(st.lyricsTheme, st.kind) : false;
      wrap.innerHTML = st.tracks.map((t, i) => {
        const src = K.sourceById(t.source);
        const q = src.qAdd > 0 ? "+" + src.qAdd : String(src.qAdd);
        const isExp = !!t.explicit;
        const expSuggested = !isExp && expHint;
        return `
        <div class="trk-card${i === 0 && st.count > 1 ? " trk-open" : ""}">
          <div class="trk-head">
            <span class="t-rank">${i + 1}</span>
            <input type="text" data-trk="${i}" value="${U.escape(t.name || "")}" placeholder="Parça adı" />
            <span class="t-dur">${U.escape(t.dur || K.career.suggestDuration())}</span>
            <div class="trk-order">
              <button class="btn btn-ghost btn-sm" data-act="trk-move" data-arg="${i}" data-dir="up" title="Yukarı taşı" ${i === 0 ? "disabled" : ""}>${K.careerUI.ico("arrowUp")}</button>
              <button class="btn btn-ghost btn-sm" data-act="trk-move" data-arg="${i}" data-dir="down" title="Aşağı taşı" ${i === last ? "disabled" : ""}>${K.careerUI.ico("arrowDown")}</button>
              <button class="btn btn-ghost btn-sm" data-act="trk-remove" data-arg="${i}" title="Parçayı çıkar">${K.careerUI.ico("trash")}</button>
            </div>
          </div>
          <div class="trk-up">
            <select data-src="${i}" title="Kayıt kaynağı">${srcOpts(t.source)}</select>
            <span class="trk-src ${src.qAdd > 0 ? "good" : src.qAdd < 0 ? "weak" : ""}">${src.file} · ${src.bit} · ${src.size} · kalite ${q}</span>
          </div>
          <div class="trk-meta">
            <label class="trk-fld"><span>Feat</span>
              <select data-feat="${i}" title="Bu parçaya ortak sanatçı">${K.careerUI.featOpts(t.feat)}</select>
            </label>
            <button class="trk-exp${isExp ? " on" : ""}${expSuggested ? " suggest" : ""}" data-act="trk-explicit" data-arg="${i}" title="Müstehcen içerik bayrağı — mağazaya bildirilir, radyo/editoryal listeleri düşürür ama çekirdek kitleyi güçlendirir">
              <b>E</b><span>Explicit</span>
            </button>
            ${i === 0 && st.count > 1 ? `<span class="trk-open-tag">Açılış parçası · kalite +2</span>` : ""}
          </div>
        </div>`;
      }).join("");
      K.careerUI.refreshTracksInfo();
    },

    /* v10.40 — parça bazında featuring seçenekleri. Eskiden tek bir
       yayın-seviyesi feat vardı ve 12 parçalı albümde 12 parçaya da
       aynı ortak sanatçı yazılıyordu. */
    featOpts(sel) {
      const featable = K.artistList().concat(K.contacts && K.contacts.list ? K.contacts.list() : [])
        .filter(a => K.relations.canProposeFeature(a.id));
      const seen = new Set();
      const opts = [`<option value="">—</option>`];
      featable.forEach(a => {
        if (seen.has(a.id)) return;
        seen.add(a.id);
        opts.push(`<option value="${a.id}" ${sel === a.id ? "selected" : ""}>${U.escape(a.stageName)}</option>`);
      });
      return opts.join("");
    },

    /* v10.40 — hangi parçada kimin feature'ı var? Parçalar adımındaki
       satırlardan değiştirilince burada özet çıkar. */
    featSummary(st) {
      const withFeat = (st.tracks || []).map((t, i) => ({ i, f: t.feat })).filter(x => x.f);
      if (!withFeat.length) return "Henüz hiçbir parçada ortak sanatçı yok.";
      const parts = withFeat.slice(0, 6).map(x => {
        const a = K.artistById(x.f);
        return `<b>${x.i + 1}</b> ${a ? U.escape(a.stageName) : "?"}`;
      });
      const more = withFeat.length > 6 ? ` … +${withFeat.length - 6}` : "";
      return "Ortaklı parçalar: " + parts.join(" · ") + more;
    },

    /* v10.40 — A3: explicit dağılımı (yayın özeti ve adım göstergesi için) */
    explicitCount(st) {
      return (st.tracks || []).filter(t => t.explicit).length;
    },

    /* v10.39 — parça sayacının TEK kaynağı. Eskiden renderTrackList
       "N parça · N yüklendi" yazıyor, updateStudioEstimate ise hemen
       ardından bunu "N parça" ile eziyordu; yükleme sayacı bir tuşa
       dokunulunca kayboluyordu. */
    tracksInfoText(st) {
      if (!st) return "";
      /* yükleme adımı kalktığı için sayaç artık TOPLAM SÜREyi gösterir */
      let sec = 0;
      (st.tracks || []).forEach(t => {
        const m = String(t.dur || "").match(/^(\d+):(\d+)$/);
        if (m) sec += (+m[1]) * 60 + (+m[2]);
      });
      return st.count + " parça · " + Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0") + " toplam";
    },
    refreshTracksInfo() {
      const info = U.qs("#st-tracks-info");
      if (info) info.textContent = K.careerUI.tracksInfoText(K.careerUI._studio);
    },

    /* stüdyo düğme ikonları (emoji yerine gerçek SVG) */
    ico(name) {
      const P = {
        dice:    '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
        trash:   '<path d="M4 6.5h16M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.4 6.5 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.9-12.5"/><path d="M10.4 10.4v6.4M13.6 10.4v6.4"/>',
        plus:    '<path d="M12 5v14M5 12h14"/>',
        upload:  '<path d="M12 16.5V4.8"/><path d="m7.6 9.2 4.4-4.4 4.4 4.4"/><path d="M4.8 15.5v2.4a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6v-2.4"/>',
        refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3.6V9h-5.4"/>',
        reset:   '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 3.6V9h5.4"/>',
        sparkle: '<path d="M12 3.5 13.9 9 19.5 11 13.9 13 12 18.5 10.1 13 4.5 11 10.1 9z"/><path d="M18.6 3.4v3.2M20.2 5h-3.2"/>',
        copy:    '<rect x="9" y="9" width="11.5" height="11.5" rx="2.4"/><path d="M15 6.5V5.4A1.9 1.9 0 0 0 13.1 3.5H5.4A1.9 1.9 0 0 0 3.5 5.4v7.7A1.9 1.9 0 0 0 5.4 15h1.1"/>',
        download:'<path d="M12 4.8v11.7"/><path d="m7.6 12.1 4.4 4.4 4.4-4.4"/><path d="M4.8 15.5v2.4a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6v-2.4"/>',
        money:   '<rect x="2.6" y="6" width="18.8" height="12" rx="2.6"/><circle cx="12" cy="12" r="2.7"/>',
        pen:     '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m14.5 6.5 3 3"/>',
        film:    '<rect x="3" y="4.5" width="18" height="15" rx="2.6"/><path d="M7.5 4.5v15M16.5 4.5v15M3 9.2h18M3 14.8h18"/>',
        zap:     '<path d="M13 2.5 4.8 13.6H11L10 21.5l8.2-11.1H12z"/>',
        play:    '<path d="M7.5 5.2 19 12 7.5 18.8z"/>',
        building:'<path d="M4 20V6.6A1.6 1.6 0 0 1 5.6 5h6.8A1.6 1.6 0 0 1 14 6.6V20"/><path d="M14 10.2h4.4A1.6 1.6 0 0 1 20 11.8V20"/><path d="M2.6 20h18.8"/><path d="M7.3 8.8h3.4M7.3 12.4h3.4M7.3 16h3.4"/>',
        rocket:  '<path d="M12 3.2c3.3 1.7 5.1 4.8 5.1 8.5 0 1.4-.3 2.8-.8 3.9H7.7a9.9 9.9 0 0 1-.8-3.9c0-3.7 1.8-6.8 5.1-8.5z"/><circle cx="12" cy="10.2" r="1.9"/><path d="m9.3 15.6-1.2 4.6 2.7-1.4M14.7 15.6l1.2 4.6-2.7-1.4"/>',
        arrowUp: '<path d="M12 19.5V5"/><path d="m5.8 11.2 6.2-6.2 6.2 6.2"/>',
        arrowDown:'<path d="M12 4.5V19"/><path d="m5.8 12.8 6.2 6.2 6.2-6.2"/>'
      };
      const d = P[name];
      if (!d) return "";
      return '<svg class="st-ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
        'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    },

    /* v10.42 — etkin distribütör (şirket modu dahil) */
    effectiveDistId(st) {
      const s = K.state;
      const myLabel = s.player.labelId ? K.labelById(s.player.labelId) : null;
      if (myLabel && st.useLabelDist !== false) {
        return K.distro.descriptorFor(myLabel.distributor).id;
      }
      return st.distributor || K.defaultDistributor();
    },
    effectiveDistDesc(st) {
      return K.distro.descById(K.careerUI.effectiveDistId(st));
    },

    /* v10.42 — distribütör seçimi. Bağımsızsan distribütörü seçersin;
       şirket altındaysan "şirketin distribütörü" ya da "kendi
       distribütörün" arasında karar verirsin. Master sahipliği de burada. */
    renderDistributorChips() {
      const wrap = U.qs("#st-dist-chips");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      const s = K.state;
      const myLabel = s.player.labelId ? K.labelById(s.player.labelId) : null;
      const dealMaster = (s.player.labelDeal && s.player.labelDeal.master) || (myLabel ? "label" : "artist");
      const usingLabelDist = !!(myLabel && st.useLabelDist !== false);
      const opts = K.distro.options(s.day);

      let html = "";
      if (myLabel) {
        const ld = K.distro.descriptorFor(myLabel.distributor);
        html += `<button class="dist-opt ${usingLabelDist ? "on" : ""}" data-act="dist-label-mode" data-arg="1">
          <span class="do-icon">🏢</span>
          <span class="do-body"><b>${U.escape(myLabel.name)} distribütörü · ${U.escape(ld.name)}</b>
            <span>kesinti %${ld.commission} · teslim ${ld.leadDays} gün · masrafı şirket üstlenir</span></span>
          <span class="do-check">${usingLabelDist ? "✓" : "+"}</span>
        </button>`;
        html += `<button class="dist-opt ${!usingLabelDist ? "on" : ""}" data-act="dist-label-mode" data-arg="0">
          <span class="do-icon">🎛️</span>
          <span class="do-body"><b>Kendi distribütörün</b><span>Ücretini sen ödersin; şirket payı yine geçerli.</span></span>
          <span class="do-check">${!usingLabelDist ? "✓" : "+"}</span>
        </button>`;
      }
      if (!myLabel || !usingLabelDist) {
        html += opts.map(d => {
          const active = d.id === (st.distributor || K.defaultDistributor());
          return `<button class="dist-opt ${active ? "on" : ""}${d.locked ? " locked" : ""}" data-act="dist-pick" data-arg="${d.id}" ${d.locked ? "disabled" : ""}>
            <span class="do-icon">${d.icon}</span>
            <span class="do-body"><b>${U.escape(d.name)}</b>
              <span>${K.distroModelLabel(d.id)} · kesinti %${d.commission} · teslim ${d.leadDays} gün${d.premium ? " · premium ✓" : " · premium ✗"}</span></span>
            <span class="do-check">${d.locked ? "🔒" : (active ? "✓" : "+")}</span>
          </button>`;
        }).join("");
      }
      wrap.innerHTML = html;

      /* master sahipliği (yayın kime ait?) */
      const masterWrap = U.qs("#st-master");
      if (masterWrap) {
        const mo = st.masterOwner || dealMaster;
        const lockLabel = myLabel && dealMaster === "label";
        masterWrap.innerHTML = `<div class="master-row">
          <span class="mr-lbl">Yayın sahibi (master)</span>
          <button class="mr-opt ${mo === "label" ? "on" : ""}" data-act="master-pick" data-arg="label" ${(!myLabel || lockLabel) ? "disabled" : ""}>Şirket adına</button>
          <button class="mr-opt ${mo === "artist" ? "on" : ""}" data-act="master-pick" data-arg="artist">Kendi adına</button>
        </div>`;
      }

      const info = U.qs("#st-dist-info");
      if (info) {
        const desc = K.careerUI.effectiveDistDesc(st);
        const fee = usingLabelDist ? 0 : K.distro.feeFor(st.distributor || K.defaultDistributor(), s.day);
        info.textContent = "Dağıtım: " + desc.name + " · kesinti %" + desc.commission + " · teslim " + desc.leadDays +
          " gün · ücret " + (fee ? U.money(fee) : "yok") +
          (desc.premium ? " · premium mağazalar açık" : " · premium mağazalar kapalı");
      }
    },

    renderStoreChips() {
      const wrap = U.qs("#st-store-chips");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      /* v10.42 — premium mağaza erişimi distribütöre bağlı */
      const premiumOk = K.distro.premiumAllowed(K.careerUI.effectiveDistId(st));
      if (!premiumOk) {
        const bad = new Set(K.meta.premiumStores(st.stores || []));
        if (bad.size) st.stores = (st.stores || []).filter(id => !bad.has(id));
      }
      const sel = new Set(st.stores || []);
      wrap.innerHTML = K.DISTRO_STORES.map(s => {
        const isPrem = K.meta.PREMIUM_STORES.indexOf(s.id) >= 0;
        const blocked = isPrem && !premiumOk;
        return `
        <button class="store-opt ${sel.has(s.id) ? "on" : ""}${blocked ? " locked" : ""}" data-act="store-toggle" data-arg="${s.id}" ${blocked ? "disabled" : ""}>
          <span class="so-icon">${s.icon}</span>
          <span class="so-body"><b>${s.name}</b><span>${U.money(s.cost)} · erişim ${s.reach.toFixed(2)}${blocked ? " · distribütör desteklemiyor" : ""}</span></span>
          <span class="so-check">${blocked ? "🔒" : (sel.has(s.id) ? "✓" : "+")}</span>
        </button>`;
      }).join("");
      const info = U.qs("#st-store-info");
      if (info) info.textContent = (st.stores || []).length + " mağaza seçili · dağıtım ücreti " +
        U.money(K.distroCost(st.stores)) + " · erişim ×" + K.distroReach(st.stores).toFixed(2);
    },

    /* v10.41 — B3: dağıtım bölgeleri. Dünya geneli bir kısayoldur;
       seçilirse diğer bölgelerin hepsini kapsar. */
    renderRegionChips() {
      const wrap = U.qs("#st-region-chips");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      st.regions = (st.regions && st.regions.length) ? st.regions : ["world"];
      const sel = new Set(st.regions);
      const world = sel.has("world");
      const opts = [{ id: "world", name: "Dünya Geneli", icon: "🌍", reach: 1.30, cost: 1.55, note: "Tüm pazarlar açık; en yüksek erişim, en yüksek maliyet." }]
        .concat(K.REGIONS);
      wrap.innerHTML = opts.map(r => `
        <button class="region-opt ${sel.has(r.id) ? "on" : ""}" data-act="region-toggle" data-arg="${r.id}">
          <span class="ro-icon">${r.icon}</span>
          <span class="ro-body"><b>${r.name}</b><span>erişim ${(+r.reach).toFixed(2)} · maliyet ×${(+r.cost).toFixed(2)}</span></span>
          <span class="ro-check">${sel.has(r.id) ? "✓" : "+"}</span>
        </button>`).join("");
      const info = U.qs("#st-region-info");
      if (info) {
        const reach = K.meta.regionReach(st.regions);
        const cost = K.meta.regionCost(st.regions);
        const fit = K.meta.languageFit(st.lang, st.regions);
        const lang = K.languageById(st.lang);
        info.textContent = K.meta.regionLabel(st.regions) + " · erişim ×" + reach.toFixed(2) +
          " · dağıtım maliyeti ×" + cost.toFixed(2) +
          (fit > 1.001 ? " · " + lang.name + " uyumu +%" + Math.round((fit - 1) * 100) : "");
      }
    },

    /* v10.41 — B1: kredi listesi. Her rol için kime kredi verileceği ve
       yüzde payı. Gerçek dağıtım formlarında bu alan zorunludur. */
    renderCredits() {
      const wrap = U.qs("#st-credit-list");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      st.credits = st.credits || K.meta.defaultCredits(st);
      const seen = new Set();
      const people = [];
      K.artistList().concat(K.contacts && K.contacts.list ? K.contacts.list() : []).forEach(a => {
        if (seen.has(a.id)) return;
        seen.add(a.id);
        people.push({ id: a.id, name: a.stageName });
      });
      wrap.innerHTML = K.CREDIT_ROLES.map(r => {
        const c = st.credits[r.id] || { self: false, name: null, share: r.share };
        const holder = c.self ? "self" : (c.name || "");
        const share = c.share != null ? c.share : r.share;
        const on = c.self || !!c.name;
        const opts = [`<option value="">— kredi yok —</option>`, `<option value="self" ${holder === "self" ? "selected" : ""}>Sen</option>`]
          .concat(people.map(p => `<option value="${p.id}" ${holder === p.id ? "selected" : ""}>${U.escape(p.name)}</option>`)).join("");
        return `
        <div class="cred-row${on ? " on" : ""}">
          <span class="cr-ico">${r.icon}</span>
          <span class="cr-body"><b>${r.name}</b><span>${r.note}</span></span>
          <select data-credit="${r.id}" data-credit-field="holder">${opts}</select>
          <label class="cr-share"><input type="number" min="0" max="100" step="1" value="${share}" data-credit="${r.id}" data-credit-field="share" ${on ? "" : "disabled"} /><span>%</span></label>
        </div>`;
      }).join("");
    },

    /* v10.41 — B2: telif bölüşümü (split sheet) */
    renderSplitSheet() {
      const wrap = U.qs("#st-split-sheet");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      const pseudo = {
        credits: st.credits || {},
        featWith: (st.tracks.find(t => t.feat) || {}).feat || st.feat || null,
        featureShare: 100 - ((K.meta.defaultFeatureCut != null) ? K.meta.defaultFeatureCut : 15),
        licensePoints: 0
      };
      const sheet = K.meta.splitSheet(pseudo);
      const myLabel = K.state.player.labelId ? K.labelById(K.state.player.labelId) : null;
      wrap.innerHTML = `
        <div class="split-rows">
          ${sheet.rows.map(r => `<div class="split-row"><span>${r.icon} ${r.name} <em>${U.escape(r.holder)}</em></span><b>%${r.share}</b></div>`).join("")}
          <div class="split-row mine"><span>💼 Senin net payın</span><b>%${sheet.mine}</b></div>
        </div>
        ${sheet.over ? `<div class="note-line bad">⚠️ Toplam pay %100'ü aşıyor (%${sheet.taken}). Kredi paylarını düşür.</div>` : ""}
        ${myLabel ? `<div class="helper">🏢 ${U.escape(myLabel.name)} bünyesindesin — şirket sözleşmesi bu payların üzerine uygulanır.</div>` : ""}`;
    },

    renderBudgetList() {
      const wrap = U.qs("#st-budget-list");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      const hide = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();
      K.careerUI._syncTracks(st);
      wrap.innerHTML = st.tracks.map((t, i) => `
        <div class="trk-budget-row">
          <span class="trk-budget-name">${i + 1}. ${U.escape((t.name || ("Parça " + (i + 1))).slice(0, 22))}</span>
          <input type="range" data-trkb="${i}" min="3000" max="120000" step="1000" value="${t.budget || st.budget}" />
          <span class="trk-budget-val">${hide ? "🔒" : U.money(t.budget || st.budget)}</span>
        </div>`).join("");
    },

    renderProjectField() {
      const el = U.qs("#st-project-wrap");
      if (!el) return;
      const st = K.careerUI._studio;
      if (!st || st.count <= 1) { el.innerHTML = ""; el.style.display = "none"; return; }
      el.style.display = "";
      el.innerHTML = K.ui.field("💿 Proje adı (isteğe bağlı)",
        `<div class="range-row">
           <input id="st-project" type="text" value="${U.escape(st.projectTitle || "")}" placeholder="${U.escape(st.autoProjectTitle || K.career.suggestProjectTitle(st.count))}" style="flex:1" />
           <button class="btn btn-ghost btn-sm" data-act="roll-project" title="Yeni ad öner">${K.careerUI.ico("dice")}</button>
         </div>`,
        "Boş bırakırsan otomatik ad kullanılır.");
    },

    renderTypeCards() {
      const wrap = U.qs("#st-type-cards");
      if (!wrap) return;
      const st = K.careerUI._studio;
      const type = K.career.typeForCount(st.count);
      /* v10.39 — kartlar yeni kurala birebir uyar:
         1 → Single · 2-8 → EP · 9+ → Albüm (en fazla 30 parça) */
      const cards = [
        { id: "single", label: "Single", count: 1, note: "1 parça", on: type === "single" },
        { id: "ep", label: "EP", count: 5, note: "2–8 parça", on: type === "ep" },
        { id: "album", label: "Albüm", count: 12, note: "9+ parça", on: type === "album" }
      ];
      wrap.innerHTML = cards.map(c => `
        <button class="type-card ${c.on ? "active" : ""}" data-act="st-type" data-arg="${c.count}">
          <b>${c.label}</b><span>${c.note}</span>
          ${c.on ? `<em>otomatik</em>` : ""}
        </button>`).join("");
    },

    /* kenar çubuğundaki adım özetleri. Kapak seçenekleri değişince
       (font/düzen/stil) yeniden çizilmesi gerektiği için ayrı duruyor;
       aksi halde kenar çubuğu "Gece · Merkez" gibi eski değeri gösteriyordu. */
    stepSubs(st) {
      const beat = K.beatById(st.beatId), vocal = K.vocalById(st.vocalId);
      const coverSt = (K.COVER_STYLES.find(x => x.id === st.coverOpts.style) || {}).name || "";
      const layout = (K.COVER_LAYOUTS.find(l => l.id === st.coverOpts.layout) || {}).name || "";
      /* v10.39 — söz artık parça başına; kenar çubuğu "kaç parçanın sözü
         tam" diyor (eskiden tek setin kaç bölümü dolu olduğunu yazıyordu). */
      const filled = K.careerUI.lyricsDone(st);
      return {
        1: st.count + " parça · " + K.career.typeName(st.count),
        2: beat.name + " · " + vocal.name,
        3: filled + "/" + st.count + " parçanın sözü tam",
        4: coverSt + " · " + layout,
        5: U.money(st.marketing) + " · " + st.wait + " gün",
        6: "Son kontrol"
      };
    },

    renderStepList() {
      const st = K.careerUI._studio;
      const stepsEl = U.qs("#st-steps");
      if (!st || !stepsEl) return;
      const subs = K.careerUI.stepSubs(st);
      stepsEl.innerHTML = K.careerUI.WIZ_STEPS.map(s => {
        const state = s.id < st.step ? "done" : s.id === st.step ? "active" : "todo";
        return `<button class="side-step" data-state="${state}" data-act="st-jump" data-arg="${s.id}">
          <span class="ss-no">${s.id < st.step ? "✓" : s.id}</span>
          <span class="ss-body"><b>${s.label}</b><span>${U.escape(subs[s.id] || "")}</span></span>
        </button>`;
      }).join("");
    },

    /* ---------------- adım render ---------------- */
    renderStudioStep() {
      const st = K.careerUI._studio;
      if (!st) return;
      K.careerUI._syncTracks(st);
      K.careerUI._syncCover(st);

      const stepDef = K.careerUI.WIZ_STEPS[st.step - 1];
      const bodyEl = U.qs("#st-body");
      const navEl = U.qs("#st-nav");
      if (!bodyEl) return;

      /* kenar çubuğu adımları */
      K.careerUI.renderStepList();

      /* başlık */
      U.qs("#st-step-title").textContent = stepDef.label;
      U.qs("#st-step-desc").textContent = stepDef.desc;
      U.qs("#st-stepno").textContent = st.step + " / " + K.careerUI.WIZ_STEPS.length;

      /* gövde + geçiş animasyonu */
      const stepFn = [null, K.careerUI.stepTracks, K.careerUI.stepContent, K.careerUI.stepLyrics,
        K.careerUI.stepCover, K.careerUI.stepMarketing, K.careerUI.stepPublish][st.step];
      bodyEl.innerHTML = stepFn.call(K.careerUI);
      bodyEl.classList.remove("anim-fwd", "anim-back");
      void bodyEl.offsetWidth;
      bodyEl.classList.add(K.careerUI._studioDir === "back" ? "anim-back" : "anim-fwd");

      navEl.innerHTML =
        `<button class="btn btn-ghost" data-act="st-back" ${st.step === 1 ? "disabled" : ""}>‹ Geri</button>` +
        (st.step < 6
          ? `<button class="btn btn-primary" data-act="st-next">İleri ›</button>`
          : `<button class="btn btn-primary" data-act="st-publish">${K.state.player.labelId ? K.careerUI.ico("building") + " Şirkete Gönder" : K.careerUI.ico("rocket") + " Mağazalara Gönder"}</button>`);

      K.careerUI.renderTypeCards();
      K.careerUI.renderTrackList();
      K.careerUI.renderBudgetList();
      K.careerUI.renderProjectField();
      K.careerUI.renderCoverControls();
      K.careerUI.renderCoverPreview();
      K.careerUI.renderDistributorChips();
      K.careerUI.renderStoreChips();
      K.careerUI.renderRegionChips();
      K.careerUI.renderCredits();
      K.careerUI.renderSplitSheet();
      K.careerUI.renderBeatMarket();
      K.careerUI.updateStudioEstimate();
    },

    /* ---- beat pazarı ---- */
    _beatOffers() {
      const day = K.state.day;
      const seed = day * 977;
      const producers = ["KRM Beats", "VolkanProd", "DJ Sefa", "Barış On The Beat", "Sinan Sound", "Taner 808"];
      const names = ["Gece Modu", "Sokak Riffi", "Karanlık 808", "Altın Melodi", "Sisli Piyano", "Beton Loop", "Uzak Şehir", "Yıldız Arpej"];
      const out = [];
      for (let i = 0; i < 3; i++) {
        const h = (seed + i * 131) % 1000;
        out.push({
          id: "off" + day + "_" + i,
          name: names[h % names.length],
          producer: producers[(h >> 3) % producers.length],
          quality: 48 + (h % 40),
          cost: Math.round((6000 + (h % 30) * 900) / 100) * 100
        });
      }
      return out;
    },

    renderBeatMarket() {
      const wrap = U.qs("#st-beat-market");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      const hide = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();
      wrap.innerHTML = K.careerUI._beatOffers().map(o => `
        <div class="beat-row">
          <div class="grow"><b>${U.escape(o.name)}</b><span>${U.escape(o.producer)} · kalite ${hide ? "🔒" : o.quality}</span></div>
          <span class="beat-price">${U.money(o.cost)}</span>
          <button class="btn btn-ghost btn-sm" data-act="beat-buy" data-arg="${o.id}">Satın Al</button>
        </div>`).join("");
      const inv = U.qs("#st-beat-inv");
      if (!inv) return;
      const beats = (K.state.player.beats || []);
      if (!beats.length) { inv.innerHTML = `<div class="helper">Envanterde beat yok — yukarıdan satın alabilirsin.</div>`; return; }
      inv.innerHTML = K.ui.field("Envanterden beat kullan",
        `<select id="st-inv-beat"><option value="">— Kullanma —</option>` +
        beats.map(b => `<option value="${b.id}" ${st.inventoryBeat === b.id ? "selected" : ""}>${U.escape(b.name)} · ${U.escape(b.producer)} · +${Math.max(0, b.quality - 50)}</option>`).join("") +
        `</select>`);
    },

    /* --- Adım 1: parçalar --- */
    stepTracks() {
      const st = K.careerUI._studio;
      const s = K.state;
      const genres = K.GENRES.map(g => `<option value="${g.id}" ${g.id === st.genre ? "selected" : ""}>${g.name}</option>`).join("");
      return `
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">1</span><div><h4>Yayın Bilgileri</h4><p>Sanatçı bilgisi kimliğinden gelir; tür ve format yayını belirler.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Sanatçı", `<input type="text" value="${U.escape(s.player.stageName)}" readonly />`)}
            ${K.ui.field("🎼 Tür", `<select id="st-genre">${genres}</select>`)}
            ${K.ui.field("📦 Format", `<div class="readout" id="st-format">${K.career.formatLabel(st.count)}</div>`)}
            ${K.ui.field("📅 Tahmini Çıkış", `<div class="readout" id="st-releaseday">Gün ${K.careerUI.plannedRelDay(st)} · ${K.meta.weekdayName(K.careerUI.plannedRelDay(st))}</div>`)}
          </div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">2</span><div><h4>Yayın Türü</h4><p>Parça sayısı türü otomatik belirler; karta dokunarak hızlı seçebilirsin.</p></div></div>
          <div class="type-cards" id="st-type-cards"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">3</span><div><h4>Parça Listesi</h4><p>Parça adını ve kayıt kaynağını seç. Kaynak kaliteyi ve maliyeti belirler.</p></div></div>
          <div class="st-list-head">
            <span class="st-list-count" id="st-tracks-info"></span>
            <div class="action-row">
              <button class="btn btn-ghost btn-sm" data-act="trk-reroll">${K.careerUI.ico("dice")} Adları Yenile</button>
              <button class="btn btn-ghost btn-sm" data-act="trk-add">${K.careerUI.ico("plus")} Parça Ekle</button>
            </div>
          </div>
          <div class="trk-list" id="st-track-list"></div>
          <div class="st-count-slider">
            <span>Parça sayısı</span>
            <input id="st-count" type="range" min="1" max="${K.career.MAX_TRACKS}" step="1" value="${st.count}" />
            <span class="range-val" id="st-count-val">${st.count}</span>
          </div>
          <div id="st-project-wrap" style="display:none"></div>
        </div>`;
    },

    /* --- Adım 2: prodüksiyon & sözler --- */
    stepContent() {
      const st = K.careerUI._studio;
      const beats = K.BEAT_TYPES.map(b => `<option value="${b.id}" ${b.id === st.beatId ? "selected" : ""}>${b.icon} ${b.name}</option>`).join("");
      const vocals = K.VOCAL_STYLES.map(v => `<option value="${v.id}" ${v.id === st.vocalId ? "selected" : ""}>${v.icon} ${v.name}</option>`).join("");
      const kinds = Object.values(K.TRACK_KINDS).map(k => `<option value="${k.id}" ${k.id === st.kind ? "selected" : ""}>${k.icon} ${k.name}</option>`).join("");
      const themes = K.LYRIC_THEMES.map(t => `<option value="${t.id}" ${t.id === st.lyricsTheme ? "selected" : ""}>${t.icon || ""} ${t.name}</option>`).join("");
      const concepts = K.ALBUM_CONCEPTS.map(c => `<option value="${c.id}" ${c.id === st.conceptId ? "selected" : ""}>${c.icon || ""} ${c.name}</option>`).join("");
      const featable = K.artistList().concat(K.contacts && K.contacts.list ? K.contacts.list() : [])
        .filter(a => K.relations.canProposeFeature(a.id));
      const featOptions = [`<option value="">— Yok —</option>`]
        .concat(featable.map(a => `<option value="${a.id}" ${st.feat === a.id ? "selected" : ""}>${U.escape(a.stageName)}</option>`)).join("");
      const range = (id, min, max, step, val, valId) => `
        <div class="range-row">
          <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" />
          <span class="range-val" id="${valId}">${val}</span>
        </div>`;

      /* v10.40 — form blok numarası artık sayaçla yürür; yeni blok
         eklendiğinde (sample hakkı, enstrümantal) elle yeniden
         numaralandırmak gerekmiyor. */
      let bn = 4;
      const needsClearance = st.beatId === "sample";
      const clearCost = K.meta ? K.meta.clearanceCost : 14000;
      const instCost = K.meta ? K.meta.INSTRUMENTAL_COST : 5000;

      return `
        ${st.dissArtist ? `<div class="note-line hot">🔥 Diss modu: <b>${U.escape(st.dissArtist.stageName)}</b> hedef alındı. Sözlerinde adı geçerse husumet sayılır.</div>` : ""}
        ${st.topic ? `<div class="note-line gold">📰 Gündemden geldin: <b>${U.escape(st.topic.title)}</b> · sıcaklık ${st.topic.heat}°</div>` : ""}

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">1</span><div><h4>Altyapı</h4><p>Beat türü ve işçilik kalitesi.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Altyapı Türü", `<select id="st-beat">${beats}</select>`)}
            ${K.ui.field("Altyapı Kalitesi", range("st-beat-q", 0, 100, 5, st.beatQ, "st-beat-q-val"))}
          </div>
          <div class="helper" id="st-beat-info"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">2</span><div><h4>Vokal</h4><p>Ses tonu ve performans kalitesi.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Vokal Stili", `<select id="st-vocal">${vocals}</select>`)}
            ${K.ui.field("Vokal Kalitesi", range("st-vocal-q", 0, 100, 5, st.vocalQ, "st-vocal-q-val"))}
          </div>
          <div class="helper" id="st-vocal-info"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">3</span><div><h4>Parça Türü & Mix</h4><p>Parçanın türü ve son ses işleme.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Parça Türü", `<select id="st-kind">${kinds}</select>`)}
            ${K.ui.field("Mix Kalitesi", range("st-mix-q", 0, 100, 5, st.mixQ, "st-mix-q-val"))}
          </div>
          <div class="helper" id="st-mix-info"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">4</span><div><h4>Beat Pazarı</h4><p>Prodüktörlerden beat al ve envanterinde tut. Envanterden kullanırsan kalite artar.</p></div></div>
          <div class="beat-market" id="st-beat-market"></div>
          <div id="st-beat-inv"></div>
        </div>

        ${st.count >= 4 ? `
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${++bn}</span><div><h4>Albüm Konsepti</h4><p>Çok parçalı projelerde bütünlük puanını belirler.</p></div></div>
          ${K.ui.field("Konsept", `<select id="st-concept">${concepts}</select>`)}
        </div>` : ""}

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${++bn}</span><div><h4>Prodüksiyon Bütçesi</h4><p>Her parçanın kendi bütçesi olur ve kalitesini o belirler.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Parça Başına Bütçe", range("st-budget", 3000, 120000, 1000, st.budget, "st-budget-val"))}
            <div class="st-align-end"><button class="btn btn-ghost btn-sm" data-act="trk-budget-all">${K.careerUI.ico("money")} Tüm parçalara uygula</button></div>
          </div>
          <div id="st-budget-list" class="st-budget-list"></div>
        </div>

        ${needsClearance ? `
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${++bn}</span><div><h4>Örnek Hakkı (Sample Clearance)</h4><p>Sample tabanlı altyapıda örnek hakkını ödemek yayını güvenceye alır; ödemezsen ilk 30 günde kaldırılma riski var.</p></div></div>
          <div class="clr-row">
            <button class="clr-opt${st.clearSample ? " on" : ""}" data-act="st-clear-sample" data-arg="1">
              <b>Hakkı öde</b><span>${U.money(clearCost)} · takedown riski yok</span>
            </button>
            <button class="clr-opt${st.clearSample ? "" : " on risk"}" data-act="st-clear-sample" data-arg="0">
              <b>Riski göze al</b><span>Ücretsiz · %${Math.round((K.meta ? K.meta.SAMPLE_RISK : 0.16) * 100)} takedown riski</span>
            </button>
          </div>
        </div>` : ""}

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${++bn}</span><div><h4>Ek Sürümler</h4><p>Enstrümantal (sözsüz) sürüm karaoke/sync kullanımı açar; küçük ama istikrarlı ekstra gelir.</p></div></div>
          <button class="clr-opt wide${st.instrumental ? " on" : ""}" data-act="st-instrumental">
            <b>${st.instrumental ? "✓ Enstrümantal sürüm üretilecek" : "Enstrümantal sürüm ekle"}</b>
            <span>${U.money(instCost)} · günlük dinlenmeye +%${Math.round((K.meta ? K.meta.INSTRUMENTAL_BONUS : 0.05) * 100)}</span>
          </button>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${++bn}</span><div><h4>Feature</h4><p>Yalnızca samimiyet kurduğun isimler listelenir. Bu seçim <b>tüm parçalara</b> uygulanır; tek tek değiştirmek için Parçalar adımındaki satırları kullan.</p></div></div>
          ${K.ui.field("Tüm parçalara ortak sanatçı", `<select id="st-feat">${featOptions}</select>`)}
          <div class="helper">${K.careerUI.featSummary(st)}</div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${++bn}</span><div><h4>Kayıt & Mix Süreci</h4><p>Beat seçildikten sonra kayıt oturumu, mix-master ve revizyon kararları kaliteyi, bütçeyi ve gecikmeyi belirler.</p></div></div>
          ${(st.prod = st.prod || K.production.defaultPlan(), "")}
          <div class="prod-sec">
            <div class="ps-title">🎤 Kayıt oturumu</div>
            <div class="prod-chips">
              ${K.PROD.SESSIONS.map(x => `<button class="prod-chip${st.prod.session === x.id ? " on" : ""}" data-act="prod-session" data-arg="${x.id}"><b>${x.icon} ${x.name}</b><span>${x.desc}</span><em>${x.cost ? U.money(x.cost) : "ücretsiz"} · ${x.days} gün · vokal +${x.vocal}</em></button>`).join("")}
            </div>
          </div>
          <div class="prod-sec">
            <div class="ps-title">🎚️ Mix</div>
            <div class="prod-chips">
              ${K.PROD.MIXES.map(x => `<button class="prod-chip${st.prod.mix === x.id ? " on" : ""}" data-act="prod-mix" data-arg="${x.id}"><b>${x.icon} ${x.name}</b><span>${x.desc}</span><em>${x.cost ? U.money(x.cost) : "ücretsiz"} · ${x.days} gün · mix +${x.mix}</em></button>`).join("")}
            </div>
          </div>
          <div class="prod-sec">
            <div class="ps-title">💿 Master</div>
            <div class="prod-chips">
              ${K.PROD.MASTERS.map(x => `<button class="prod-chip${st.prod.master === x.id ? " on" : ""}" data-act="prod-master" data-arg="${x.id}"><b>${x.icon} ${x.name}</b><span>${x.desc}</span><em>${x.cost ? U.money(x.cost) : "ücretsiz"} · ${x.days} gün · ses ${x.loud >= 0 ? "+" : ""}${x.loud}</em></button>`).join("")}
            </div>
          </div>
          <div class="prod-rev">
            <div class="ps-title">📝 Revizyon kararı</div>
            <div class="prod-notes">${K.production.issues(st.prod, (st.tracks[0] && st.tracks[0].name) || "karma").map(n => `<span class="prod-note">⚠ ${n.text}</span>`).join("") || `<span class="prod-note ok">✓ Mix temiz görünüyor</span>`}</div>
            <div class="prod-actions">
              <button class="btn btn-sm${st.prod.accepted ? " btn-ghost" : " btn-primary"}" data-act="prod-accept">${st.prod.accepted ? "✓ Mix kabul edildi" : "✓ Mix'i kabul et"}</button>
              <button class="btn btn-sm btn-ghost" data-act="prod-revise" ${st.prod.revisions >= K.PROD.MAX_REVISIONS ? "disabled" : ""}>🔁 Revize iste (${U.money(K.production.revisionCost())})</button>
            </div>
            <div class="helper">Revizyon ${st.prod.revisions}/${K.PROD.MAX_REVISIONS} · her revizyon kaliteyi artırır ama maliyet ve gecikme ekler (azalan verim).</div>
          </div>
          <div class="helper" id="st-prod-info"></div>
        </div>`;
    },

    /* --- Adım 3: SÖZ ATÖLYESİ --- */
    stepLyrics() {
      const st = K.careerUI._studio;
      const idx = K.careerUI.lyrIndex(st);
      const cur = st.tracks[idx] || {};
      const themes = K.LYRIC_THEMES.map(t => `<option value="${t.id}" ${t.id === st.lyricsTheme ? "selected" : ""}>${t.icon || ""} ${t.name}</option>`).join("");
      const sec = K.careerUI.trackLyrics(st, idx);
      const slots = K.careerUI.trackSlots(st, idx);
      const keys = K.lyricStructureKeys(slots);
      const uniq = K.lyricStructureUnique(slots);

      /* v10.41 — hazır biçim çipleri (8) */
      const activeTpl = K.lyricTemplateOf(slots);
      const tmplChips = K.LYRIC_TEMPLATES.map(t => `
        <button class="lyr-tmpl${t.id === activeTpl ? " active" : ""}" data-act="lyr-template" data-arg="${t.id}" title="${U.escape(t.desc || "")}">
          <span class="lt-ic">${t.icon}</span><b>${U.escape(t.name)}</b>
        </button>`).join("");

      /* v10.41 — zaman çizelgesi: yuvalar, taşıma ve çıkarma */
      const timeline = keys.map((key, i) => {
        const type = K.lyricKeyType(key);
        return `<span class="sl-slot" data-kind="${type.id}" data-idx="${i}">
          <span class="ss-name">${U.escape(K.lyricKeyLabel(key))}</span>
          <span class="ss-mv">
            <button data-act="lyr-mv" data-arg="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""}>‹</button>
            <button data-act="lyr-mv" data-arg="${i}" data-dir="1" ${i === keys.length - 1 ? "disabled" : ""}>›</button>
          </span>
          <button class="ss-del" data-act="lyr-del" data-arg="${i}" ${keys.length <= 2 ? "disabled" : ""}>×</button>
        </span>`;
      }).join("");
      const addBtns = K.LYRIC_SECTIONS.map(s =>
        `<button class="sl-add" data-act="lyr-add" data-arg="${s.id}">+ ${s.icon} ${U.escape(s.name)}</button>`).join("");
      const writable = uniq.filter(k => k !== "chorusLast").length;
      const stats = `<div class="sl-stats">
          <span class="sl-stat"><b>${K.career.durationForSlots(slots, cur.name || "")}</b> tahmini süre</span>
          <span class="sl-stat"><b>${K.lyricStructureScore(slots)}</b> biçim puanı</span>
          <span class="sl-stat"><b>${writable}</b> yazılacak bölüm</span>
          <span class="sl-stat"><b>${slots.length}</b> bölüm · ${U.escape(K.lyricTemplateById(activeTpl).name)}</span>
        </div>`;

      const chorusRep = K.lyricKeyRepeat(slots, "chorus");
      const cards = uniq.map(k => {
        const type = K.lyricKeyType(k);
        const raw = String(sec[k] || "");
        const effective = K.lyrics.sectionText(sec, k) || "";
        const lines = effective.split(/\n+/).filter(x => x.trim()).length;
        const opt = k === "chorusLast";
        const rep = (type.id === "chorus" && chorusRep > 1) ? `<span class="lyr-rep">×${chorusRep}</span>` : "";
        return `
        <div class="lyr-card ${effective.trim() ? "filled" : ""}${opt ? " opt" : ""}" data-kind="${type.id}">
          <div class="lyr-card-head">
            <span class="lyr-ic">${type.icon}</span>
            <div class="lyr-meta"><b>${U.escape(K.lyricKeyLabel(k))}</b><span>${U.escape(type.hint)}</span></div>
            ${rep}
            <span class="lyr-lines">${lines} mısra</span>
            <button class="btn btn-ghost btn-sm" data-act="lyr-suggest" data-arg="${k}">${K.careerUI.ico("dice")} Öner</button>
          </div>
          <textarea data-lyrsec="${k}" rows="${Math.max(2, type.lines)}" placeholder="${U.escape(K.lyricKeyLabel(k))} mısralarını yaz...">${U.escape(raw)}</textarea>
        </div>`;
      }).join("");
      const done = K.careerUI.lyricsDone(st);
      const chips = st.tracks.map((t, k) => {
        const s = K.careerUI.trackSlots(st, k);
        const f = K.careerUI.lyricsFilled(t.lyrics, s);
        const total = K.careerUI.lyricsTotal(s);
        const cls = f === total ? "done" : f ? "part" : "";
        return `<button class="lyr-track ${k === idx ? "active" : ""} ${cls}" data-act="lyr-track" data-arg="${k}">
          <span class="lt-no">${k + 1}</span>
          <span class="lt-body"><b>${U.escape((t.name || ("Parça " + (k + 1))).slice(0, 24))}</b><span>${f}/${total} bölüm</span></span>
        </button>`;
      }).join("");
      const name = U.escape(cur.name || ("Parça " + (idx + 1)));
      const no = st.count > 1 ? 3 : 2;

      return `
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">1</span><div><h4>Söz Teması</h4><p>Tema bütün projeye işler; gündem uyumunu o belirler. Gündemi sözlerde anmak zorunda değilsin.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Tema", `<select id="st-lyric-theme">${themes}</select>`)}
            ${K.ui.field("Lirikal Açı", `<div class="readout" id="st-angle">—</div>`)}
          </div>
          <div class="helper" id="st-theme-info"></div>
        </div>

        ${st.count > 1 ? `
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">2</span><div><h4>Hangi Parça?</h4><p>Her parçanın sözü ayrıdır. Parçaya dokun, sözlerini yaz.</p></div></div>
          <div class="lyr-tracks" id="st-lyr-tracks">${chips}</div>
          <div class="lyr-bulk">
            <span class="lyr-bulk-count">${done}/${st.count} parçanın sözü tam</span>
            <button class="btn btn-primary btn-sm" data-act="lyr-fill-rest">${K.careerUI.ico("sparkle")} Kalanları Otomatik Doldur</button>
            <button class="btn btn-ghost btn-sm" data-act="lyr-apply-all">${K.careerUI.ico("copy")} Bu sözü tümüne uygula</button>
          </div>
        </div>` : ""}

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${no}</span><div><h4>Şarkı Biçimi</h4><p>Parçanın bölüm sırası ve tekrarları. Hazır bir biçim seç ya da zaman çizelgesinden kendin kur. Süre ve biçim puanı bu yapıdan türer.</p></div></div>
          <div class="lyr-tmpl-row">${tmplChips}</div>
          <div class="sl-timeline">${timeline}</div>
          <div class="sl-add-row">${addBtns}</div>
          ${stats}
          <div class="range-row" style="margin-top:10px">
            <button class="btn btn-ghost btn-sm" data-act="lyr-apply-struct">${K.careerUI.ico("copy")} Biçimi tümüne uygula</button>
          </div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${no + 1}</span><div><h4>${name} — Bölümler</h4><p>Seçili parçanın sözleri. Yapıdaki her bölüm için ayrı yaz; nakarat bütün geçişlerde paylaşılır.</p></div></div>
          <div class="range-row">
            <button class="btn btn-ghost btn-sm" data-act="lyr-suggest-all">${K.careerUI.ico("dice")} Bu parçayı öner</button>
            <button class="btn btn-ghost btn-sm" data-act="lyr-clear">${K.careerUI.ico("trash")} Bu parçayı temizle</button>
            <button class="btn ${st.ghost ? "btn-gold" : "btn-ghost"} btn-sm" data-act="lyr-ghost">${K.careerUI.ico("pen")} Söz yazarı tut (₺15.000)</button>
            <button class="btn btn-ghost btn-sm" data-act="audio-listen">${K.careerUI.ico("play")} Dinle</button>
            <span class="hint" id="st-lyric-info" style="margin:0"></span>
          </div>
          ${st.ghost ? `<div class="note-line gold">✍️ Ghostwriter devrede: sözler güçlenir ama sızma riski var (itibar −6).</div>` : ""}
          <div class="lyr-grid">${cards}</div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${no + 2}</span><div><h4>Kafiye & Analiz</h4><p>Seçili parçanın satır sonu sesleri ve akış değerlendirmesi.</p></div></div>
          <div class="lyr-analysis" id="st-lyric-analysis"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">${no + 3}</span><div><h4>Aktüel Gündem</h4><p>Gündem ayrı takip edilir; sözlerine konu yazmana gerek yok. Tema, gündeme denk gelirse ivme kazanırsın.</p></div></div>
          <div class="agenda-box" id="st-agenda-info"></div>
        </div>`;
    },

    /* --- Adım 4: kapak --- */
    stepCover() {
      const st = K.careerUI._studio;
      return `
        <div class="cover-studio">
          <div class="cv-left">
            <div class="cv-canvas" id="cv-preview"></div>
            <div class="cv-actions">
              <button class="btn btn-ghost btn-sm" data-act="cover-random">${K.careerUI.ico("dice")} Rastgele Kapak</button>
            </div>
            <div class="cv-store" id="cv-store"></div>
            <div class="form-block cv-tech">
              <div class="form-block-head"><span class="fb-no">✓</span><div><h4>Teknik Gereksinim</h4><p>Mağazalar kapağı <b>${K.meta.COVER_MIN_PX}×${K.meta.COVER_MIN_PX}</b> alt sınırının altında kabul etmez. Önerilen: ${K.meta.COVER_GOOD_PX}×${K.meta.COVER_GOOD_PX} (Apple Music).</p></div></div>
              <div class="px-row">
                ${[600, 1400, 3000].map(px => `
                  <button class="px-opt${st.coverPx === px ? " on" : ""}${K.meta.coverAccepted(px) ? "" : " bad"}" data-act="cover-px" data-arg="${px}">
                    <b>${px}×${px}</b>
                    <span>${px < K.meta.COVER_MIN_PX ? "✕ mağaza reddeder" : (px >= K.meta.COVER_GOOD_PX ? "✓ önerilen · editoryal avantaj" : "✓ asgari kabul")}</span>
                  </button>`).join("")}
              </div>
              <div class="helper">${K.meta.coverAccepted(st.coverPx) ? "Kapak teknik gereksinimini karşılıyor." : "<b class='warn-txt'>Bu çözünürlükte yayın gönderilemez</b> — mağazalar kapağı reddeder."}</div>
            </div>
          </div>
          <div class="cv-controls" id="cv-controls"></div>
        </div>`;
    },

    renderCoverPreview() {
      const st = K.careerUI._studio;
      if (!st) return;
      /* mağaza satırlarında emoji yerine gerçek marka logosu (v10.38) */
      const brand = (id, cls) => (K.brandIcon && K.brandIcon.has(id)) ? K.brandIcon.tile(id, cls) : "";
      const el = U.qs("#cv-preview");
      if (el) el.innerHTML = K.ui.cover(st.coverSeed, "", 250);
      const store = U.qs("#cv-store");
      if (store) {
        const title = K.careerUI.projectName(st);
        const artist = K.state.player.stageName;
        store.innerHTML = `
          <div class="store-title">Mağazada görünüm</div>
          <div class="store-row sp"><span class="st-icon">${brand("spotify", "ic-spotify")}</span>${K.ui.cover(st.coverSeed, "", 44)}
            <div class="grow"><b>${U.escape(title)}</b><span>${U.escape(artist)}</span></div><em>Spotify</em></div>
          <div class="store-row ap"><span class="st-icon">${brand("applemusic", "ic-apple")}</span>${K.ui.cover(st.coverSeed, "", 44)}
            <div class="grow"><b>${U.escape(title)}</b><span>${U.escape(artist)}</span></div><em>Apple</em></div>
          <div class="store-row yt"><span class="st-icon">${brand("youtube", "ic-youtube")}</span>${K.ui.cover(st.coverSeed, "", 44)}
            <div class="grow"><b>${U.escape(title)}</b><span>${U.escape(artist)}</span></div><em>YouTube</em></div>`;
      }
    },

    renderCoverControls() {
      const wrap = U.qs("#cv-controls");
      if (!wrap) return;
      const st = K.careerUI._studio;
      if (!st) return;
      const o = st.coverOpts;
      const styles = K.COVER_STYLES.map(cs => `
        <button class="cv-style ${o.style === cs.id ? "active" : ""}" data-act="cover-style" data-arg="${cs.id}">
          <span class="cv-swatch" style="background:linear-gradient(135deg, ${cs.c1}, ${cs.c2})"></span>
          <span class="cv-name">${cs.name}</span>
        </button>`).join("");
      const layouts = K.COVER_LAYOUTS.map(l => `
        <button class="cv-chip ${o.layout === l.id ? "active" : ""}" data-act="cover-layout" data-arg="${l.id}" title="${U.escape(l.hint || "")}">${l.name}</button>`).join("");
      const patterns = K.COVER_PATTERNS.map(p => `
        <button class="cv-chip ${o.pattern === p.id ? "active" : ""}" data-act="cover-pattern" data-arg="${p.id}">${p.name}</button>`).join("");
      const texts = K.COVER_TEXT_MODES.map(t => `
        <button class="cv-chip ${o.text === t.id ? "active" : ""}" data-act="cover-text" data-arg="${t.id}">${t.name}</button>`).join("");
      const fonts = K.COVER_FONTS.map(f => `
        <button class="cv-chip ${o.font === f.id ? "active" : ""}" data-act="cover-font" data-arg="${f.id}" style="font-family:${f.family};font-weight:${f.weight}">${f.name}</button>`).join("");
      const shapes = K.COVER_SHAPES.map(s => `
        <button class="cv-chip ${o.shape === s.id ? "active" : ""}" data-act="cover-shape" data-arg="${s.id}">${s.name}</button>`).join("");
      wrap.innerHTML = `
        <div class="ctrl-group">
          <label>Stil <span class="hint">${K.COVER_STYLES.length} palet</span></label>
          <div class="cv-styles">${styles}</div>
        </div>
        <div class="ctrl-group">
          <label>Düzen <span class="hint">yazının kompozisyonu</span></label>
          <div class="cv-chips">${layouts}</div>
        </div>
        <div class="ctrl-group">
          <label>Desen</label>
          <div class="cv-chips">${patterns}</div>
        </div>
        <div class="ctrl-group">
          <label>Şekil</label>
          <div class="cv-chips">${shapes}</div>
        </div>
        <div class="ctrl-group">
          <label>Yazı</label>
          <div class="cv-chips">${texts}</div>
        </div>
        <div class="ctrl-group">
          <label>Yazı Tipi</label>
          <div class="cv-chips">${fonts}</div>
        </div>
        <div class="ctrl-group">
          <label>Renk Tonu <span class="hint" id="st-hue-val">${o.hue < 0 ? "Otomatik" : o.hue + "°"}</span></label>
          <div class="range-row">
            <input id="st-hue" type="range" min="-1" max="359" step="1" value="${o.hue}" />
            <button class="btn btn-ghost btn-sm" data-act="cover-hue-auto">Otomatik</button>
          </div>
        </div>
        <div class="ctrl-group">
          <label>Ek</label>
          <div class="cv-chips">
            <button class="cv-chip ${o.showArtist ? "active" : ""}" data-act="cover-artist">Sanatçı adı</button>
            <button class="cv-chip ${o.grain ? "active" : ""}" data-act="cover-grain">Grain</button>
            <button class="cv-chip ${o.frame ? "active" : ""}" data-act="cover-frame">Çerçeve</button>
            <button class="cv-chip ${o.explicit ? "active" : ""}" data-act="cover-explicit">Explicit (E)</button>
            <button class="cv-chip ${o.year ? "active" : ""}" data-act="cover-year">Yıl${o.year ? " · " + U.escape(o.year) : ""}</button>
          </div>
        </div>
        <div class="ctrl-group">
          <label>Baştan</label>
          <div class="cv-chips">
            <button class="cv-chip" data-act="cover-reset">${K.careerUI.ico("reset")} Sıfırla</button>
          </div>
        </div>`;
    },

    /* --- Adım 4: tanıtım --- */
    stepMarketing() {
      const st = K.careerUI._studio;
      const s = K.state;
      const waits = K.RELEASE_WAIT_PRESETS.map(w =>
        `<option value="${w.days}" ${w.days === st.wait ? "selected" : ""}>${w.label} · ${w.days} gün</option>`).join("");
      const range = (id, min, max, step, val, valId) => `
        <div class="range-row">
          <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" />
          <span class="range-val" id="${valId}">${val}</span>
        </div>`;
      return `
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">1</span><div><h4>Tanıtım Bütçesi</h4><p>İlk gün ivmesini ve liste şansını artırır.</p></div></div>
          ${K.ui.field("Pazarlama Bütçesi", range("st-marketing", 0, 80000, 1000, st.marketing, "st-marketing-val"))}
        </div>
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">2</span><div><h4>Çıkış Planı</h4><p>Yayına hazırlık süresi. Uzun hazırlık daha güçlü çıkış sağlar.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("⏳ Lansman Süresi", `<select id="st-wait">${waits}</select>`)}
            ${K.ui.field("📅 Çıkış Günü", `<div class="readout" id="st-releaseday2">Gün ${K.careerUI.plannedRelDay(st)} · ${K.meta.weekdayName(K.careerUI.plannedRelDay(st))}</div>`)}
          </div>
          <div class="helper">Yayın sırasına girdikten sonra <b>Yayınlar</b> sekmesinden editoryal listelere pitch gönderebilirsin. Pitch yayından 7–22 gün önce yapılmalıdır.</div>
        </div>
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">3</span><div><h4>Yayın Stratejisi</h4><p>Snippet beklenti kurar (ilk gün ivmesi +), sürpriz çıkış sessiz başlar.</p></div></div>
          <div class="cv-chips" style="margin-left:14px;margin-right:14px">
            <button class="cv-chip ${st.strategy === "standard" ? "active" : ""}" data-act="strategy" data-arg="standard">Standart</button>
            <button class="cv-chip ${st.strategy === "snippet" ? "active" : ""}" data-act="strategy" data-arg="snippet">${K.careerUI.ico("film")} Snippet paylaş (+₺8.000)</button>
            <button class="cv-chip ${st.strategy === "surprise" ? "active" : ""}" data-act="strategy" data-arg="surprise">${K.careerUI.ico("zap")} Sürpriz çıkış</button>
          </div>
        </div>`;
    },

    /* --- Adım 6: dağıtım --- */
    stepPublish() {
      const st = K.careerUI._studio;
      const s = K.state;
      const type = K.career.typeForCount(st.count);
      const hide = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();
      const genre = K.genreById(st.genre);
      const lyrList = st.tracks.map((t, i) => K.careerUI.analyzeTrack(st, i));
      const lyrics = lyrList[0] || K.lyrics.analyze("", st.lyricsTheme, st.genre, st.kind);
      const avgLyric = Math.round(U.sum(lyrList, x => x.score) / Math.max(1, lyrList.length));
      const isProject = st.count >= 2;
      const cohesion = isProject ? K.lyrics.cohesion(st.conceptId, st.genre, st.kind, st.lyricsTheme, st.count) : null;
      const ag = (K.news && K.news.themeAffinity) ? K.news.themeAffinity(st.lyricsTheme, st.genre) : { score: 0, hits: [] };
      const trackBudgets = st.tracks.map(t => t.budget || st.budget);
      const trackSources = st.tracks.map(t => K.sourceById(t.source).id);
      const storeCost = K.distroCost(st.stores);
      const storeReach = K.distroReach(st.stores);
      /* v10.42 — C2: düşük kaliteli kaynak + premium mağaza = RET */
      const badSrcTracks = st.tracks.slice(0, st.count).filter(t => !K.meta.sourceAccepted(K.sourceById(t.source)));
      const conflictStores = badSrcTracks.length ? K.meta.premiumStores(st.stores) : [];
      const conflict = conflictStores.length > 0;
      const conflictNames = conflictStores.map(id => (K.storeById(id) || {}).name).join(", ");
      const badList = badSrcTracks.map(t => (t.name || "?") + " (" + K.sourceById(t.source).file + ")").join(", ");
      /* v10.40 — A5/A6: örnek hakkı ve enstrümantal sürüm maliyete girer
         v10.41 — B3: bölge kapsamı dağıtım maliyetini çarpar */
      const pr = K.production.resolve(st.prod || K.production.defaultPlan());
      const opts = { genre: st.genre, beatId: st.beatId, vocalId: st.vocalId, beatQuality: st.beatQ, vocalQuality: U.clamp(st.vocalQ + pr.vocalQ, 0, 100), mixQuality: U.clamp(st.mixQ + pr.mixQ, 0, 100), kind: st.kind, lyricScore: avgLyric, cohesion, agendaScore: ag.score, trackCount: st.count, trackBudgets, trackSources, storeCost, clearSample: !!st.clearSample, instrumental: !!st.instrumental, regionMult: K.meta.regionCost(st.regions) };
      const qList = trackBudgets.map((tb, i) => K.career.estimateQuality(st.genre, tb, Object.assign({}, opts, {
        sourceQAdd: K.sourceById(trackSources[i]).qAdd,
        lyricScore: (lyrList[i] || lyrics).score
      })));
      const qMin = Math.min.apply(null, qList), qMax = Math.max.apply(null, qList);
      const cost = K.career.releaseCost(type, st.budget, st.marketing, opts) + pr.cost;
      const canAfford = s.balance >= cost;
      const title = K.careerUI.projectName(st);
      const featArtist = st.feat ? K.artistById(st.feat) : null;
      const row = (k, v) => `<div class="sum-row"><span>${k}</span><b>${v}</b></div>`;

      const myLabel = s.player.labelId ? K.labelById(s.player.labelId) : null;
      /* v10.42 — distribütör + teslim süresi + master sahipliği */
      const distDesc = K.careerUI.effectiveDistDesc(st);
      const distLead = distDesc.leadDays || 7;
      const dealMaster = (s.player.labelDeal && s.player.labelDeal.master) || (myLabel ? "label" : "artist");
      const masterOwner = st.masterOwner || dealMaster;
      const curRelDay = K.meta.snapToWeekday(s.day + (st.wait || 18), st.releaseWeekday != null ? st.releaseWeekday : 5);
      const leadShort = curRelDay < s.day + distLead;
      return `
        ${myLabel ? `<div class="note-line ok">🏢 <b>${U.escape(myLabel.name)}</b> bünyesindesin: bu yayını şirket çıkarır. Distribütör: <b>${U.escape(distDesc.name)}</b> · masrafın bir kısmını şirket üstlenir.</div>` : ""}
        <div class="publish-hero">
          <div class="ph-art">${K.ui.cover(st.coverSeed, "", 140)}</div>
          <div class="ph-info">
            <span class="ph-badge">${K.career.formatLabel(st.count)}</span>
            <h3>${U.escape(title)}</h3>
            <div class="ph-sub">${genre.icon} ${genre.name} · ${st.count} parça · Gün ${curRelDay} · ${K.meta.weekdayName(curRelDay)}${featArtist ? " · feat. " + U.escape(featArtist.stageName) : ""}</div>
          </div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">🚚</span><div><h4>Distribütör</h4><p>Yayınını mağazalara kim gönderiyor? Ücretsiz distribütör çok keser ve geç teslim eder; pahalısı az keser, hızlı teslim eder, tüm mağazalara sokar.</p></div></div>
          <div class="dist-chips" id="st-dist-chips"></div>
          <div class="master" id="st-master"></div>
          <div class="helper" id="st-dist-info"></div>
          ${leadShort ? `<div class="note-line gold">⏳ <b>${U.escape(distDesc.name)}</b> teslim süresi <b>${distLead} gün</b>. Seçili çıkış Gün ${curRelDay}; en erken <b>Gün ${s.day + distLead}</b>. Yayın otomatik olarak ${distLead} güne kaydırılır.</div>` : ""}
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">1</span><div><h4>Dağıtım Yapılacak Mağazalar</h4><p>Mağaza seçimi erişimini ve dağıtım ücretini belirler. Liste ve sıralama yine performansa bağlıdır. Premium mağazalar distribütöre bağlıdır.</p></div></div>
          <div class="store-opts" id="st-store-chips"></div>
          <div class="helper" id="st-store-info"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">2</span><div><h4>Bölge & Dil</h4><p>Nerede yayınlanacak? Dünya geneli en geniş erişimi verir ama en pahalıdır; seçili bölgeler ucuz, kapsamı dar. Dil bölgeyle uyuşursa erişim artar.</p></div></div>
          <div class="region-chips" id="st-region-chips"></div>
          <div class="form-grid" style="margin-top:10px">
            ${K.ui.field("Yayın Dili", `<select id="st-lang">${K.LANGUAGES.map(l => `<option value="${l.id}" ${st.lang === l.id ? "selected" : ""}>${l.icon} ${l.name}</option>`).join("")}</select>`)}
          </div>
          <div class="helper" id="st-region-info"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">3</span><div><h4>Krediler</h4><p>Dağıtım formlarında zorunlu: söz yazarı, besteci, prodüktör. Kime kredi vereceğini ve yüzde payını sen belirlersin.</p></div></div>
          <div class="cred-list" id="st-credit-list"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">4</span><div><h4>Telif Bölüşümü</h4><p>Krediler + feature payı + beat lisans puanı. Kalan senin net payın.</p></div></div>
          <div id="st-split-sheet"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">5</span><div><h4>Etiket & Telif</h4><p>Yayında görünecek etiket adı ve ℗/© telif yılı. Bağımsızsan kendi adını kullanabilirsin.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Etiket Adı", `<input type="text" id="st-label-name" value="${U.escape(st.labelName || "")}" placeholder="${U.escape(myLabel ? myLabel.name : s.player.stageName + " Müzik")}" />`)}
            ${K.ui.field("Telif Yılı (℗/©)", `<input type="number" id="st-copy-year" min="1990" max="2099" value="${U.escape(st.copyrightYear || "")}" />`)}
          </div>
          <div class="helper" id="st-label-info"></div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">6</span><div><h4>Kayıt Kodları</h4><p>Distribütörün atadığı UPC barkodu ve parça başına ISRC kodu. Katalogda ve telif takibinde bunlarla görünür.</p></div></div>
          <div class="upc-row"><span>UPC / Barkod</span><code>${(K.meta && K.meta.upc) ? K.meta.upc(s.player.stageName + st.count + s.day) : "—"}</code></div>
          <div class="isrc-list">
            ${st.tracks.slice(0, st.count).map((t, i) => {
              const code = (K.meta && K.meta.isrc) ? K.meta.isrc(U.dateForDay(s.day).y, ((s.player.releases || []).length * 100) + i + 1) : "—";
              return `<div class="isrc-row"><span class="isrc-no">${i + 1}</span><span class="isrc-nm">${U.escape(t.name || "")}</span><code>${code}</code>${t.explicit ? '<em class="exp-tag">E</em>' : ""}</div>`;
            }).join("")}
          </div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">7</span><div><h4>Çıkış Planı & Ek Hizmetler</h4><p>Endüstri standardı yeni yayınların <b>cuma</b> çıkmasıdır; diğer günler algoritmaya yakalanma şansını düşürür.</p></div></div>
          <div class="form-grid">
            ${K.ui.field("Hedef Çıkış Günü", `<select id="st-weekday">${K.meta.WEEKDAYS.map((n, i) => `<option value="${i}" ${st.releaseWeekday === i ? "selected" : ""}>${n}${i === 5 ? " (önerilen)" : ""}</option>`).join("")}</select>`)}
          </div>
          <div class="helper" id="st-weekday-info"></div>
          <button class="clr-opt wide${st.contentId ? " on" : ""}" data-act="st-content-id" style="margin-top:10px">
            <b>${st.contentId ? "✓ YouTube Content ID kaydı açık" : "YouTube Content ID kaydı ekle"}</b>
            <span>${U.money(K.meta.CONTENT_ID_COST)} · başkaları şarkını kullanınca otomatik telif geliri</span>
          </button>
        </div>

        ${conflict ? `
        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">!</span><div><h4>Format Uyumsuzluğu</h4><p>Seçtiğin mağazalar bu kayıt kalitesini kabul etmiyor.</p></div></div>
          <div class="note-line bad">
            <b>${conflictNames}</b> yalnızca yüksek kaliteli dosya kabul eder; <b>${badList}</b> düşük kaliteli.
            Kaynağı yükselt ya da bu mağazaları listeden çıkar.
          </div>
          <button class="clr-opt wide" data-act="st-drop-premium"><b>Sorunlu mağazaları kaldır</b><span>Yayına devam et — bu mağazalarda çıkmayacak</span></button>
        </div>` : ""}

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">8</span><div><h4>Yayın Özeti</h4><p>Göndermeden önce son kontrol.</p></div></div>
          <div class="sum-rows">
            ${row("Kalite", hide ? "🔒" : (st.count > 1 ? qMin + "–" + qMax : qList[0]))}
            ${row("Söz", lyrics.empty ? "Sözsüz" : (hide ? "Yazıldı" : K.lyrics.feedback(lyrics)))} 
            ${row("Kafiye", lyrics.rhyme ? "%" + Math.round((lyrics.rhyme.density || 0) * 100) : "—")}
            ${row("Lirikal Açı", lyrics.angle ? U.escape(K.lyricAngleById(lyrics.angle).name) : "—")}
            ${row("Gündem", ag.hits.length ? "🔥 Gündemde" : "Sakin")}
            ${isProject ? row("Bütünlük", hide ? K.lyrics.cohesionLabel(cohesion) : cohesion + "/100") : ""}
            ${row("Explicit", st.count > 1 ? K.careerUI.explicitCount(st) + "/" + st.count + " parça" : (st.tracks[0] && st.tracks[0].explicit ? "<em class='exp-tag'>E</em> Var" : "Yok"))}
            ${st.beatId === "sample" ? row("Örnek Hakkı", st.clearSample ? "Ödendi ✓" : "<span class='warn-txt'>Riskli</span>") : ""}
            ${st.instrumental ? row("Enstrümantal", "Dahil ✓") : ""}
            ${row("Distribütör", U.escape(distDesc.name) + " · %" + distDesc.commission + " kesinti")}
            ${row("Yayın Sahibi", masterOwner === "label" ? "Şirket adına" : "Kendi adına")}
          </div>
        </div>

        <div class="form-block">
          <div class="form-block-head"><span class="fb-no">9</span><div><h4>Maliyet</h4><p>Üretim, pazarlama ve dağıtım toplamı.</p></div></div>
          <div class="sum-rows">
            ${row("Prodüksiyon", hide ? "🔒" : U.money(U.sum(trackBudgets)))}
            ${row("Pazarlama", U.money(st.marketing))}
            ${row("Dağıtım (" + (st.stores || []).length + " mağaza)", U.money(((K.RELEASE_TYPES[type] || {}).dist || 0) + storeCost))}
            ${row("Distribütör ücreti", K.distro.feeFor(K.careerUI.effectiveDistId(st), s.day) ? U.money(K.distro.feeFor(K.careerUI.effectiveDistId(st), s.day)) : "yok")}
            ${row("Erişim", "×" + storeReach.toFixed(2))}
            ${row("Toplam", "<em class='total'>" + U.money(cost) + "</em>")}
            ${row("Kasa Sonrası", U.money(s.balance - cost))}
          </div>
        </div>

        ${canAfford ? "" : `<div class="note-line bad">⚠️ Kasan yetersiz. Bu yayın için <b>${U.money(cost)}</b> gerekiyor, kasanda <b>${U.money(s.balance)}</b> var.</div>`}`;
    },

    /* v10.44.1 — planlanan çıkış günü TEK yerde hesaplanır:
       hazırlık süresi (st.wait) bir alt sınırdır, takvim hedef hafta gününe
       kaydırılır. Özet, okuma alanları ve yayın oluşturma hep bunu kullanır;
       böylece "18 gün sonra" ile seçilen gün çelişmez. */
    plannedRelDay(st) {
      st = st || K.careerUI._studio || {};
      return K.meta.snapToWeekday(
        K.state.day + (st.wait || 18),
        st.releaseWeekday != null ? st.releaseWeekday : 5);
    },

    /* ---------------- canlı özet + bilgi satırları ---------------- */
    updateStudioEstimate() {
      const st = K.careerUI._studio;
      if (!st) return;
      const q = id => U.qs(id);
      const hide = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();

      if (q("#st-count-val")) q("#st-count-val").textContent = st.count;
      if (q("#st-format")) q("#st-format").textContent = K.career.formatLabel(st.count);
      /* v10.42 — C3: gerçek çıkış günü hedef hafta gününe kaydırılır */
      const relDay = K.careerUI.plannedRelDay(st);
      const relDayTxt = "Gün " + relDay + " · " + K.meta.weekdayName(relDay);
      if (q("#st-releaseday")) q("#st-releaseday").textContent = relDayTxt;
      if (q("#st-releaseday2")) q("#st-releaseday2").textContent = relDayTxt;
      const wdInfo = q("#st-weekday-info");
      if (wdInfo) {
        const fit = K.meta.releaseDayFit(relDay);
        const wd = K.meta.weekdayOf(relDay);
        wdInfo.textContent = K.meta.weekdayName(relDay) + " · Gün " + relDay +
          (fit >= 1 ? " · ideal çıkış günü" : " · algoritma erişimi ×" + fit.toFixed(2) + " (cuma önerilir)");
        wdInfo.className = fit >= 1 ? "helper" : "helper warn-txt";
      }
      if (q("#st-budget-val")) q("#st-budget-val").textContent = hide ? "🔒" : U.money(st.budget) + " / parça";
      if (q("#st-marketing-val")) q("#st-marketing-val").textContent = hide ? "🔒" : U.money(st.marketing);
      if (q("#st-beat-q-val")) q("#st-beat-q-val").textContent = st.beatQ;
      if (q("#st-vocal-q-val")) q("#st-vocal-q-val").textContent = st.vocalQ;
      if (q("#st-mix-q-val")) q("#st-mix-q-val").textContent = st.mixQ;
      K.careerUI.refreshTracksInfo();

      const beat = K.beatById(st.beatId);
      const vocal = K.vocalById(st.vocalId);
      const kind = K.kindById(st.kind);
      const type = K.career.typeForCount(st.count);
      /* parça başına analiz: arayüz seçili parçayı, kalite hesabı ortalamayı
         ve her parçanın kendi skorunu kullanır */
      const lyrList = st.tracks.map((t, i) => K.careerUI.analyzeTrack(st, i));
      const lyrics = lyrList[K.careerUI.lyrIndex(st)] || lyrList[0];
      const avgLyric = Math.round(U.sum(lyrList, x => x.score) / Math.max(1, lyrList.length));
      const theme = K.lyricThemeById(st.lyricsTheme);
      const ag = (K.news && K.news.themeAffinity) ? K.news.themeAffinity(st.lyricsTheme, st.genre) : { score: 0, hits: [] };
      /* createRelease ile aynı eşik: konsept/kohzyon 4+ parçada devreye girer */
      const isProject = st.count >= 4;
      const cohesion = isProject ? K.lyrics.cohesion(st.conceptId, st.genre, st.kind, st.lyricsTheme, st.count) : null;
      const trackBudgets = st.tracks.map(t => t.budget || st.budget);
      const trackSources = st.tracks.map(t => K.sourceById(t.source).id);
      const storeCost = K.distroCost(st.stores);
      const storeReach = K.distroReach(st.stores);
      /* v10.42 — C2: düşük kaliteli kaynak + premium mağaza = RET */
      const badSrcTracks = st.tracks.slice(0, st.count).filter(t => !K.meta.sourceAccepted(K.sourceById(t.source)));
      const conflictStores = badSrcTracks.length ? K.meta.premiumStores(st.stores) : [];
      const conflict = conflictStores.length > 0;
      const conflictNames = conflictStores.map(id => (K.storeById(id) || {}).name).join(", ");
      const badList = badSrcTracks.map(t => (t.name || "?") + " (" + K.sourceById(t.source).file + ")").join(", ");
      /* v10.40 — A5/A6: örnek hakkı ve enstrümantal sürüm maliyete girer
         v10.41 — B3: bölge kapsamı dağıtım maliyetini çarpar */
      const pr = K.production.resolve(st.prod || K.production.defaultPlan());
      const opts = { genre: st.genre, beatId: st.beatId, vocalId: st.vocalId, beatQuality: st.beatQ, vocalQuality: U.clamp(st.vocalQ + pr.vocalQ, 0, 100), mixQuality: U.clamp(st.mixQ + pr.mixQ, 0, 100), kind: st.kind, lyricScore: avgLyric, cohesion, agendaScore: ag.score, trackCount: st.count, trackBudgets, trackSources, storeCost, clearSample: !!st.clearSample, instrumental: !!st.instrumental, regionMult: K.meta.regionCost(st.regions) };
      const qList = trackBudgets.map((tb, i) => K.career.estimateQuality(st.genre, tb, Object.assign({}, opts, {
        sourceQAdd: K.sourceById(trackSources[i]).qAdd,
        lyricScore: (lyrList[i] || lyrics).score
      })));
      const qMin = Math.min.apply(null, qList), qMax = Math.max.apply(null, qList);
      const cost = K.career.releaseCost(type, st.budget, st.marketing, opts) + pr.cost;

      /* kenar özeti */
      const sum = q("#st-summary");
      if (sum) {
        const qTxt = st.count > 1 ? (hide ? "🔒" : qMin + "–" + qMax) : (hide ? "🔒" : String(qList[0]));
        sum.innerHTML = `
          <div class="side-sum-row"><span>Format</span><b>${K.career.formatLabel(st.count).replace(/^\S+\s/, "")}</b></div>
          <div class="side-sum-row"><span>Kalite</span><b>${qTxt}</b></div>
          <div class="side-sum-row"><span>Mağaza</span><b>${(st.stores || []).length} · ×${storeReach.toFixed(2)}</b></div>
          <div class="side-sum-row"><span>Maliyet</span><b class="money">${U.money(cost)}</b></div>
          <div class="side-sum-row"><span>Çıkış</span><b>Gün ${relDay} · ${K.meta.weekdayName(relDay)}</b></div>`;
      }
      const navInfo = U.qs(".st-nav-info");
      if (navInfo) navInfo.textContent = "Adım " + st.step + "/" + K.careerUI.WIZ_STEPS.length + " · " + K.career.formatLabel(st.count).replace(/^\S+\s/, "");

      /* kısa bilgi satırları */
      const setLine = (id, txt) => { const el = q(id); if (el) el.textContent = txt; };
      setLine("#st-beat-info", `${beat.icon} ${beat.name} — ${beat.note} · kalite ${st.beatQ}/100 · maliyet ×${beat.costMult.toFixed(2)}`);
      setLine("#st-vocal-info", `${vocal.icon} ${vocal.name} — ${vocal.note} · kalite ${st.vocalQ}/100 · maliyet ×${vocal.costMult.toFixed(2)}`);
      const mixNote = st.mixQ < 35 ? "Ham mix; ses zayıf kalır." : st.mixQ < 65 ? "Dengeli ama mütevazı." : st.mixQ < 85 ? "Temiz ve güçlü." : "Radyo standardı, en yüksek netlik.";
      setLine("#st-mix-info", `🎚️ Mix ${U.clamp(st.mixQ + pr.mixQ, 0, 100)}/100 — ${mixNote} · ${kind.icon} ${kind.name}: ${kind.note}`);
      setLine("#st-prod-info", `🎙️ ${pr.labels.session} → ${pr.labels.mix} → ${pr.labels.master} · üretim +${U.money(pr.cost)} · +${pr.days} gün · üretim puanı ${pr.score}/100${st.prod && st.prod.accepted ? " · mix onaylı" : ""}`);
      setLine("#st-theme-info", `${theme.icon} ${theme.name} — ${theme.desc || ""}`);
      const li = q("#st-lyric-info");
      if (li) li.textContent = lyrics.empty
        ? (theme.icon + " " + (lyrics.fit ? "tema uyumlu" : "tema uyumsuz"))
        : `${theme.icon} ${lyrics.lines} mısra · ${lyrics.words} kelime`;

      /* lirikal açı rozeti */
      const angEl = q("#st-angle");
      if (angEl) angEl.textContent = lyrics.angle
        ? (K.lyricAngleById(lyrics.angle).icon + " " + K.lyricAngleById(lyrics.angle).name) : "—";

      /* kafiye & analiz paneli (yapıcı dil, sayı yerine anlam) */
      const anEl = q("#st-lyric-analysis");
      if (anEl) {
        const r = lyrics.rhyme || { scheme: "", density: 0, pairs: [] };
        const row = (k, v) => `<div class="lyr-stat"><span>${k}</span><b>${v}</b></div>`;
        const m = lyrics.meter || { avg: 0, spread: 0, steady: 0 };
        const intern = lyrics.internal || { count: 0 };
        const punch = lyrics.punches || [];
        anEl.innerHTML =
          row("Kafiye Şeması", r.scheme ? U.escape(r.scheme) : "—") +
          row("Kafiye Yoğunluğu", Math.round((r.density || 0) * 100) + "%") +
          row("İç Kafiye", intern.count + " satır içi") +
          row("Ölçü (hece)", m.avg ? m.avg + " hece · sapma " + m.spread : "—") +
          row("Ölçü Dengesi", m.avg ? Math.round((m.steady || 0) * 100) + "%" : "—") +
          row("Vurucu Mısra", punch.length ? punch.length + " adet" : "yok") +
          row("Mısra", lyrics.lines || 0) +
          row("Bölüm", (lyrics.structure ? lyrics.structure.have : 0) + "/" + (lyrics.structure ? lyrics.structure.total : K.LYRIC_SECTIONS.length)) +
          row("Biçim Puanı", (lyrics.formScore != null ? lyrics.formScore : 0)) +
          row("Tahmini Süre", lyrics.estSeconds ? Math.floor(lyrics.estSeconds / 60) + ":" + String(lyrics.estSeconds % 60).padStart(2, "0") : "—") +
          `<div class="lyr-feedback">${U.escape(K.lyrics.feedback(lyrics))}</div>`;
      }

      /* gündem kutusu */
      const agInfo = q("#st-agenda-info");
      if (agInfo) {
        const hits = ag.hits || [];
        const hot = (K.news && K.news.hot) ? K.news.hot(5) : [];
        const chip = (t, cls) => {
          const c = K.newsCatById(t.cat);
          return `<span class="ag-pill ${cls || ""}" style="--c:${c.color}">${c.icon} ${U.escape(t.title)} <span class="ag-heat">${t.heat}°</span></span>`;
        };
        const matchHTML = hits.length
          ? `<div class="ag-line"><b>Teman şu gündem konularına denk geliyor:</b><div class="ag-pills">${hits.map(h => chip(h, "hit")).join("")}</div></div>`
          : `<div class="ag-line muted">Teman şu an sıcak bir gündem konusuna denk gelmiyor.</div>`;
        const hotHTML = hot.length
          ? `<div class="ag-line"><b>Ülke gündemi (ayrı takip edilir):</b><div class="ag-pills">${hot.map(t => chip(t)).join("")}</div></div>`
          : `<div class="ag-line muted">Gündem yükleniyor…</div>`;
        agInfo.innerHTML = matchHTML + hotHTML;
      }
    },

    /* ---------------- yayını oluştur ---------------- */
    createReleaseFromStudio() {
      K.careerUI.collectStudio();
      const st = K.careerUI._studio;
      if (!st) return false;
      const count = st.count;
      const type = K.career.typeForCount(count);
      const tracks = st.tracks.slice(0, count).map(t => ({
        name: (t.name || "").trim() || K.career.suggestTitle(),
        budget: t.budget,
        source: t.source,
        /* v10.40 — A2/A3: parça bazında feat + explicit */
        feat: t.feat || null,
        explicit: !!t.explicit
      }));
      const title = K.careerUI.projectName(st) || tracks[0].name;
      K.careerUI._syncCover(st);
      /* v10.42 — distribütör: premium mağaza filtresi + teslim süresi.
         Distribütör premium mağazaları desteklemiyorsa onlar düşürülür;
         teslim süresi kısa seçilirse çıkış tarihi otomatik kaydırılır. */
      const distDesc = K.careerUI.effectiveDistDesc(st);
      const usingLabelDist = !!(K.state.player.labelId && st.useLabelDist !== false);
      let stores = (st.stores || []).slice();
      if (!distDesc.premium) stores = stores.filter(id => K.meta.PREMIUM_STORES.indexOf(id) < 0);
      /* v10.42 — C3: hazırlık süresi en az st.wait, ama takvim hedef
         hafta gününe (varsayılan cuma) kaydırılır. */
      const relDay0 = K.careerUI.plannedRelDay(st);
      const relDay = Math.max(relDay0, K.state.day + (distDesc.leadDays || 0));
      const waitDays = Math.max(1, relDay - K.state.day);
      const pr = K.production.resolve(st.prod || K.production.defaultPlan());

      const rel = K.career.createRelease({
        title, genre: st.genre, type, kind: st.kind,
        beatId: st.beatId, vocalId: st.vocalId,
        beatQuality: st.beatQ, vocalQuality: U.clamp(st.vocalQ + pr.vocalQ, 0, 100), mixQuality: U.clamp(st.mixQ + pr.mixQ, 0, 100),
        prodCost: pr.cost, prodPlan: Object.assign({}, K.production.normalize(st.prod), { score: pr.score }),
        waitDays: waitDays, budget: st.budget, marketing: st.marketing,
        featWith: st.feat, lyricsTheme: st.lyricsTheme,
        /* parça başına sözler — albümde her şarkı kendi sözünü alır */
        trackLyrics: st.tracks.slice(0, count).map((t, i) => K.careerUI.trackLyrics(st, i)),
        /* v10.41 — parça başına şarkı biçimi (slot dizisi) */
        trackSlots: st.tracks.slice(0, count).map((t, i) => K.careerUI.trackSlots(st, i).slice()),
        lyricSections: K.careerUI.trackLyrics(st, 0),
        conceptId: st.conceptId, coverSeed: st.coverSeed,
        strategy: st.strategy, ghost: st.ghost, inventoryBeat: st.inventoryBeat,
        stores: stores,
        /* v10.42 — distribütör + master sahipliği */
        distributorId: usingLabelDist ? null : (st.distributor || K.defaultDistributor()),
        masterOwner: st.masterOwner || null,
        /* v10.40 — A5/A6: örnek hakkı kararı + enstrümantal sürüm */
        clearSample: !!st.clearSample,
        instrumental: !!st.instrumental,
        /* v10.41 — B grubu metadata */
        regions: st.regions, lang: st.lang, credits: st.credits,
        labelName: st.labelName, copyrightYear: st.copyrightYear,
        /* v10.42 — C grubu teknik */
        coverPx: st.coverPx, contentId: !!st.contentId, releaseWeekday: st.releaseWeekday,
        trackCount: count, trackBudgets: tracks.map(t => t.budget), tracks
      });
      if (rel) K.refresh();
      return !!rel;
    },

    /* =====================================================
       YAYINLAR — pipeline + yayınlananlar
       ===================================================== */
    /* =====================================================
       ÇIKIŞ HAFTASI (v10.21) — systems/rollout.js
       Ön kayıt kampanyası + teaser zinciri + ilk hafta takibi.
       ===================================================== */
    rolloutHTML() {
      const s = K.state, p = s.player;
      const pipe = K.rollout.activePipeline();
      const live = K.rollout.liveFirstWeeks();
      const recent = (p.songs || []).filter(x => x.debut)
        .sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0)).slice(0, 4);
      if (!pipe.length && !live.length && !recent.length) return "";

      const sum = K.rollout.summary();
      const fans = K.fans.followers() || 0;

      const relCards = pipe.map(r => {
        const d = Math.max(0, r.startDay + r.waitDays - s.day);
        const ready = K.rollout.readiness(r);
        const ps = r.presave;
        const can = K.rollout.canStartPresave(r);
        const open = ui.presaveRel === r.id;
        const selected = open ? ui.presaveChans : [];

        const teasers = K.rollout.TEASERS.map(t => {
          const w = K.rollout.teaserWindow(r, t.id);
          const done = !!(ps && ps.fired && ps.fired[t.id]);
          const cls = done ? "done" : w.ok ? "" : "off";
          const body = done
            ? `<span class="rs-eff">paylaşıldı</span>`
            : w.ok
              ? `<span class="rs-eff">${U.escape(w.why)}</span>`
              : `<span class="rs-sub">${U.escape(w.why)}</span>`;
          const tag = w.ok ? ` data-act="ro-teaser" data-arg="${r.id}|${t.id}"` : "";
          return `<button class="ro-stage ${cls}"${tag} ${w.ok ? "" : "disabled"}>
            <span class="rs-top">${t.emoji} ${t.name}${done ? " ✓" : ""}</span>
            <span class="rs-sub">${U.escape(t.desc)}</span>
            ${body}
            <span class="rs-cost">${U.money(t.cost)}</span>
          </button>`;
        }).join("");

        const chans = K.rollout.CHANNELS.map(c => {
          const locked = fans < c.minFan;
          const on = selected.indexOf(c.id) >= 0;
          const tag = locked ? "" : ` data-act="ro-chan" data-arg="${c.id}"`;
          return `<button class="ro-chan ${on ? "on" : ""} ${locked ? "locked" : ""}"${tag} ${locked ? "disabled" : ""}>
            <span class="rc-top"><span>${c.emoji} ${U.escape(c.name)}</span><span>${U.money(c.cost)}</span></span>
            <span class="rc-desc">${U.escape(locked ? "En az " + U.fmt(c.minFan) + " takipçi gerekli" : c.desc)}</span>
          </button>`;
        }).join("");

        const chanCost = U.sum(selected, id => (K.rollout.ch(id) || {}).cost || 0);

        return `<div class="studio-card" style="margin-top:10px">
          <div class="ro-head">
            <div class="ro-ring" style="--pct:${ready}"><b>${ready}%</b></div>
            <div class="ro-head-txt">
              <h3>${U.escape(r.title)}</h3>
              <p>${d} gün kaldı · ${K.RELEASE_TYPES[r.type] ? K.RELEASE_TYPES[r.type].name : "Yayın"} · ${r.tracks.length} parça${ps ? ` · <b style="color:var(--money)">${U.fmt(ps.collected)} ön kayıt</b>` : ""}</p>
            </div>
          </div>

          <div style="margin-top:14px">
            <div class="sub" style="margin-bottom:7px">Teaser zinciri — zamanlama verimi belirler</div>
            <div class="ro-stages">${teasers}</div>
          </div>

          ${ps ? `<div class="ro-nums" style="margin-top:14px">
            <div class="ro-num"><span class="k">Toplanan Ön Kayıt</span><span class="v money">${U.fmt(ps.collected)}</span><span class="d">her gün artıyor</span></div>
            <div class="ro-num"><span class="k">Hype</span><span class="v">${(ps.hype || 0).toFixed(2)}</span><span class="d">teaser'lardan</span></div>
            <div class="ro-num"><span class="k">Beklenen İvme</span><span class="v">+%${Math.round(Math.min(0.55, ps.collected / 1200) * 100 + Math.min(0.42, (ps.hype || 0) * 0.35) * 100)}</span><span class="d">yayın günü</span></div>
            <div class="ro-num"><span class="k">Kampanya Gideri</span><span class="v">${U.money(ps.cost || 0)}</span><span class="d">harcandı</span></div>
          </div>` : ""}

          <div style="margin-top:14px">
            <div class="sub" style="margin-bottom:7px">Ön kayıt kanalları — çıkışa 5 gün kalana kadar toplanır</div>
            ${open ? `<div class="ro-chans">${chans}</div>
              <div class="action-row" style="margin-top:10px">
                <button class="btn btn-primary btn-sm" data-act="ro-start" ${can.ok && selected.length ? "" : "disabled"}>🎯 Kampanyayı Başlat (${U.money(chanCost)})</button>
                <button class="btn btn-ghost btn-sm" data-act="ro-close">Kapat</button>
                <span class="hint" style="align-self:center">${U.escape(selected.length ? selected.length + " kanal seçili" : "kanal seç")}</span>
              </div>`
              : `<div class="action-row">
                <button class="btn ${can.ok ? "btn-primary" : "btn-ghost"} btn-sm" data-act="ro-open" data-arg="${r.id}" ${can.ok ? "" : "disabled"}>${ps ? "Kampanya sürüyor" : "🎯 Ön Kayıt Kampanyası Aç"}</button>
                <span class="hint" style="align-self:center">${U.escape(ps ? "kanallar seçildi, toplama devam ediyor" : can.why)}</span>
              </div>`}
          </div>
        </div>`;
      }).join("");

      const liveHTML = live.map(sg => {
        const fw = sg.firstWeek;
        const idx = Math.min(K.rollout.FIRST_WEEK_DAYS, s.day - fw.day0);
        const days = Array.from({ length: K.rollout.FIRST_WEEK_DAYS }, (_, i) => {
          const v = fw.days[i];
          const max = Math.max.apply(null, fw.days.filter(d => typeof d === "number").concat([1]));
          const h = v ? Math.max(8, Math.round(v / max * 100)) : 0;
          return `<div class="ro-day ${typeof v === "number" ? "filled" : ""}">${v ? `<i style="height:${h}%"></i>` : ""}<span>${i + 1}</span></div>`;
        }).join("");
        const total = U.sum(fw.days.filter(x => typeof x === "number"), x => x);
        return `<div class="ro-week" style="margin-top:10px">
          <div class="ro-week-head"><span>📊 ${U.escape(sg.title)}</span><span class="money">${U.fmt(total)} dinlenme</span></div>
          <div class="sub" style="font-size:11px">${idx}. gün / ${K.rollout.FIRST_WEEK_DAYS} · ${fw.presave ? U.fmt(fw.presave) + " ön kayıt ile başladı" : "ön kayıtsız çıkış"}</div>
          <div class="ro-days">${days}</div>
        </div>`;
      }).join("");

      const debutHTML = recent.map(sg => `<div class="ro-debut ${sg.debut.id}" style="margin-top:8px">
        <span class="rb-badge">${sg.debut.label}</span>
        <div class="grow">
          <div class="title" style="font-size:12.5px;font-weight:800">${U.escape(sg.title)}</div>
          <div class="sub" style="font-size:11px;color:var(--text-2)">ilk hafta ${U.fmt(sg.debut.total)} dinlenme · kalıcı etki ×${(sg.debutMult || 1).toFixed(2)}</div>
        </div>
      </div>`).join("");

      return `<div class="c-block">
        <div class="c-head"><div><h2>🎯 Çıkış Haftası</h2><div class="sub">Ön kayıt topla · teaser paylaş · ilk haftayı kazan</div></div></div>
        <div class="ro-nums">
          <div class="ro-num"><span class="k">Aktif Kampanya</span><span class="v">${sum.campaigns}</span><span class="d">${U.fmt(sum.collected)} ön kayıt toplandı</span></div>
          <div class="ro-num"><span class="k">Süren İlk Hafta</span><span class="v">${sum.liveWeeks}</span><span class="d">çıkış penceresi açık</span></div>
          <div class="ro-num"><span class="k">En İyi Derece</span><span class="v">${U.escape(sum.best)}</span><span class="d">${(sum.debuts.smash || 0) + (sum.debuts.hit || 0)} hit · ${(sum.debuts.flop || 0)} sessiz</span></div>
        </div>
        ${pipe.length ? `<div class="sub" style="margin-top:12px;font-weight:700">Yayın hattındaki projeler</div>${relCards}` : `<div class="empty-note" style="margin-top:12px"><b>Hazırlıkta proje yok</b>Stüdyodan yeni bir yayın oluştur; ön kayıt kampanyası burada açılır.</div>`}
        ${liveHTML ? `<div class="sub" style="margin-top:16px;font-weight:700">Süren ilk haftalar</div>${liveHTML}` : ""}
        ${debutHTML ? `<div class="sub" style="margin-top:16px;font-weight:700">Son çıkış dereceleri</div>${debutHTML}` : ""}
      </div>`;
    },

    renderReleases() {
      const s = K.state;
      const rels = s.player.releases;
      const songs = s.player.songs.slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0));

      const stages = ["prep", "queued", "editorial", "released"];
      const stageNames = { prep: "Prodüksiyon", queued: "Dağıtım Kuyruğu", editorial: "Editoryal İnceleme", released: "Yayınlandı" };

      let pipelineHTML = rels.length ? `<div class="pipeline">${rels.map(r => {
        const remaining = Math.max(0, r.startDay + r.waitDays - s.day);
        const chips = stages.map(st => {
          const order = stages.indexOf(st), cur = stages.indexOf(r.stage);
          const cls = order < cur ? "done" : order === cur ? "active" : "";
          return `<span class="stage-chip ${cls}">${stageNames[st]}</span>`;
        }).join("");
        const pw = K.career.pitchWindow(r);
        return `<div class="release-card">
          <div class="release-top">
            ${K.ui.cover(r.coverSeed, K.genreById(r.genre).icon)}
            <div class="grow">
              <div class="title">${U.escape(r.title)}</div>
              <div class="sub">${K.RELEASE_TYPES[r.type].name} · ${r.tracks.length} track · ${K.genreById(r.genre).name}${r.featWith ? " · feat. " + U.escape((K.artistById(r.featWith) || {}).stageName || "") : ""}</div>
            </div>
            <div class="countdown">${remaining} gün</div>
          </div>
          <div class="release-stages">${chips}</div>
          <div class="action-row" style="margin-top:8px">
            ${r.playlistPitch
              ? `<span class="pill ${r.playlistPitch.accepted ? "hot" : ""}">📻 ${r.playlistPitch.accepted ? r.playlistPitch.playlists.length + " editoryal liste ✓" : "Pitch reddedildi"}</span>`
              : `<button class="btn btn-sm ${pw.ok ? "btn-primary" : "btn-ghost"}" data-act="pitch-playlist" data-rel="${r.id}" ${pw.ok ? "" : "disabled"}>📻 Playlist Pitch · ₺9.000</button>
                 <span style="font-size:10px;color:var(--text-3);align-self:center;margin-left:6px">${pw.label}</span>`}
          </div>
        </div>`;
      }).join("")}</div>`
        : `<div class="empty-note"><b>Yayın hattı boş</b>Stüdyo sekmesinden yeni bir yayın oluştur.</div>`;

      let songsHTML = songs.length ? `<div class="row-list">${songs.map(song => {
        const promos = ["instagram", "x", "tiktok", "youtube"].map(pf => {

          const done = song.socialPromo && song.socialPromo[pf];
          return `<button class="btn btn-sm ${done ? "btn-ghost" : "btn-primary"}" data-act="promo-social" data-song="${song.id}" data-platform="${pf}" ${done ? "disabled" : ""}>${K.social.PROMOS[pf].icon}${done ? " ✓" : ""}</button>`;
        }).join("");
        return `<div class="release-card">
          <div class="release-top">
            ${K.ui.cover(song.coverSeed, (song.title[0] || "?").toUpperCase())}
            <div class="grow">
              <div class="title">${U.escape(song.title)} ${song.viral ? '<span class="pill hot">🔥 Viral</span>' : ""}${song.takenDown ? '<span class="pill" style="color:#ff8fa3">🚫 Kaldırıldı</span>' : ""}${song.contentId ? '<span class="pill">🆔 Content ID</span>' : ""}${song.explicit ? '<em class="exp-tag">E</em>' : ""}</div>
              <div class="sub">Yayın: Gün ${song.publishedDay} · ${U.compact(song.streams)} dinlenme · Kalite ${song.quality}${song.chartRank ? ` · Liste #${song.chartRank}` : ""}</div>
              <div class="sub" style="margin-top:4px">Spotify ${U.compact(song.spotifyStreams)} · Apple ${U.compact(song.appleStreams)} · YouTube ${U.compact(song.youtubeViews)}</div>
            </div>
            <div class="chart-delta ${(song.lastDaily || 0) > 0 ? "up" : "same"}">+${U.compact(song.lastDaily || 0)}/g</div>
          </div>
          <div class="action-row">
            <button class="play-mini" data-act="preview-song" data-song="${song.id}">▶ Dinle</button>
            <span style="font-size:10px;color:var(--text-3);align-self:center;margin-right:2px">Sosyal tanıtım:</span>
            ${promos}
            ${song.sound && song.sound.startedDay
              ? `<span class="pill ${song.sound.trend ? "hot" : ""}" style="align-self:center">🎬 ${U.compact(song.sound.videos)} video</span>`
              : `<button class="btn btn-sm btn-primary" data-act="snippet" data-song="${song.id}" style="margin-left:6px">🎬 Kısa video</button>`}
            ${song.takenDown
              ? `<button class="btn btn-sm btn-primary" data-act="song-reupload" data-song="${song.id}" style="margin-left:6px">♻️ Yeniden yükle · ${U.money(K.meta.REUPLOAD_COST)}</button>`
              : `<button class="btn btn-sm btn-ghost" data-act="song-takedown" data-song="${song.id}" style="margin-left:6px" title="Yayını mağazalardan çek">🚫 Kaldır</button>`}
          </div>
        </div>`;
      }).join("")}</div>`
        : `<div class="empty-note"><b>Henüz yayınlanan şarkın yok</b>Yayın hattı tamamlandığında şarkıların burada görünür.</div>`;

      const arPending = rels.filter(r => r.arRequest);
      const arBlock = arPending.length ? `
        <div class="c-block">
          <div class="c-head"><div><h2>A&R Notu</h2><div class="sub">Şirketin revizyon isteği — uygula ya da yoksay</div></div></div>
          ${arPending.map(r => `<div class="ar-card">
            <b>${U.escape(r.title)}</b>
            <div class="ar-note">🔧 ${U.escape(r.arRequest.note)}</div>
            <div class="action-row">
              <button class="btn btn-primary btn-sm" data-act="ar-apply" data-arg="${r.id}">Uygula (₺8.000 · +3 gün)</button>
              <button class="btn btn-ghost btn-sm" data-act="ar-ignore" data-arg="${r.id}">Yoksay</button>
            </div>
          </div>`).join("")}
        </div>` : "";

      return K.careerUI.rolloutHTML() + arBlock + `
        <div class="c-block">
          <div class="c-head"><div><h2>Yayın Hattı</h2><div class="sub">Hazırlık → Kuyruk → Editoryal → Yayın süreci</div></div></div>
          ${pipelineHTML}
        </div>
        <div class="c-block">
          <div class="c-head"><div><h2>Yayınlanan Şarkılar</h2><div class="sub">Sosyal medyada tanıtarak dinlenmeyi artır</div></div></div>
          ${songsHTML}
        </div>`;
    },

    /* =====================================================
       ŞİRKET (tek sekme, alt sekmeler)
       ===================================================== */
    renderLabelTab() {
      const tabs = [["genel", "Genel & A&R"], ["roster", "Kadro"], ["staff", "Ekip & Katalog"]];
      const bar = `<div class="sub-tabs">${tabs.map(([id, l]) =>
        `<button class="${subTab.label === id ? "active" : ""}" data-act="subtab" data-arg="label:${id}">${l}</button>`).join("")}</div>`;
      let body = "";
      if (subTab.label === "roster") body = K.careerUI.renderRoster();
      else if (subTab.label === "staff") body = K.careerUI.renderStaff();
      else body = K.careerUI.renderLabel();
      return bar + `<div class="label-console">` + K.careerUI.renderMyDeal() + body + `</div>`;
    },

    /* oyuncunun bağlı olduğu şirket SÖZLEŞMESİ (v10.42 — tam metin + imza) */
    renderMyDeal() {
      const d = (K.label && K.label.myDeal) ? K.label.myDeal() : null;
      if (!d) return "";
      const l = d.label || {};
      const sp = d.deal.splits || {};
      const is360 = d.deal.dealType === "360";
      const master = d.deal.master || "label";
      const dist = d.deal.distributor || l.distributor || "—";
      const row = (k, v) => `<div class="sum-row"><span>${k}</span><b>${v}</b></div>`;
      return `<div class="c-block">
        <div class="c-head"><div><h2>Sözleşme</h2><div class="sub">İmzalı anlaşma şartları ve yükümlülükler</div></div></div>
        <div class="contract">
          <div class="ct-head">
            <span class="ct-seal">✍️</span>
            <div><b>KAYIT VE LİSANS SÖZLEŞMESİ</b><span>${U.escape(l.name || "Şirket")} ↔ ${U.escape(K.state.player.stageName)}</span></div>
          </div>
          <div class="sum-rows ct-rows">
            ${row("Anlaşma türü", is360 ? "360 Anlaşma" : "Standart")}
            ${row("Avans", U.money(d.deal.advance || 0))}
            ${row("Şirket payı", "%" + (d.deal.labelRoyalty || 0))}
            ${row("Sanatçı payı", "%" + (d.deal.artistRoyalty || 100))}
            ${row("Master (yayın sahibi)", master === "label" ? "Şirket" : "Sanatçı (sen)")}
            ${row("Distribütör", U.escape(dist))}
            ${row("Süre", (d.deal.lengthDays || 180) + " gün · bitiş Gün " + d.endDay)}
            ${is360 ? row("360 payları", "turne %" + (sp.touring || 0) + " · merch %" + (sp.merch || 0) + " · sync %" + (sp.sync || 0)) : ""}
          </div>
          ${K.studio.row("Avans recoup", d.recoupPct, U.money(d.recoupLeft) + " kaldı", { color: "linear-gradient(90deg,#ffcb5c,#5ce89b)" })}
          <div class="ct-note">📌 Şirket destek verir (A&R kalite +2) ve yayınını kendi distribütörüyle çıkarır. Karşılığında 60 günde bir yeni yayın bekler; çıkmazsa itibar düşer.</div>
          <div class="ct-sign">
            <span>İmza: <b>${U.escape(K.state.player.stageName)}</b></span>
            <span>Gün ${d.deal.startDay || 0} · <em class="ct-ok">İMZALANDI ✓</em></span>
          </div>
        </div>
      </div>`;
    },

    /* =====================================================
       OLAYLAR (ödüller + rakipler/kriz)
       ===================================================== */
    renderEventsTab() {
      const tabs = [["awards", "🏆 Ödüller"], ["rivals", "⚔️ Rakipler & Kriz"]];
      const bar = `<div class="sub-tabs">${tabs.map(([id, l]) =>
        `<button class="${subTab.events === id ? "active" : ""}" data-act="subtab" data-arg="events:${id}">${l}</button>`).join("")}</div>`;
      const inc = (K.incidents && K.incidents.pending) ? K.incidents.pending() : null;
      const incCard = inc ? `<div class="c-block">
          <div class="crisis-card" style="border-color:rgba(176,108,255,.4)">
            <div class="cr-tag">🎲 ${U.escape(inc.tag)} · GÜNLÜK OLAY</div>
            <div class="cr-title">${U.escape(inc.title)}</div>
            <div class="cr-desc">${U.escape(inc.desc)}</div>
            <div class="cr-choices">
              ${inc.choices.map((ch, i) => `<button class="cr-choice" data-act="incident-choice" data-arg="${i}">
                <span class="cc-label">${U.escape(ch.label)}</span>
                <span class="cc-note">${U.escape(ch.note || "")}</span>
              </button>`).join("")}
            </div>
          </div>
        </div>` : "";
      const evActions = `<div class="action-row" style="margin:8px 0">
        <button class="btn btn-ghost btn-sm" data-act="interview">🎤 Röportaj ver</button>
        ${K.state.pendingAward ? `<button class="btn btn-gold btn-sm" data-act="ceremony">🎬 Tören konuşması</button>` : ""}
      </div>`;
      return bar + evActions + incCard + (subTab.events === "rivals" ? K.careerUI.renderRivals() : K.careerUI.renderAwards());
    },

    /* =====================================================
       ALBÜMLER
       ===================================================== */
    renderAlbums() {
      const s = K.state, p = s.player;
      const albums = p.albums || [];
      const chart = s.albumChart || [];
      const typeName = id => (K.RELEASE_TYPES[id] || {}).name || id;

      return `
        <div class="c-block">
          <div class="c-head"><div><h2>Albümlerim</h2><div class="sub">Konsept bütünlüğü albümün dinlenmesini ve kritiğini belirler</div></div></div>
          ${albums.length ? `<div class="album-grid">${albums.map(a => `
            <div class="album-card">
              <div class="ac-cover" style="background:${U.gradientFor(a.id)}">💿</div>
              <div class="ac-body">
                <div class="ac-title">${U.escape(a.title)}</div>
                <div class="ac-sub">${a.conceptIcon || "💿"} ${U.escape(a.conceptName || "")} · ${U.escape(typeName(a.type))} · Gün ${a.releasedDay}${a.trackCount ? " · " + a.trackCount + " parça" : ""}</div>
                <div class="ac-stats">
                  <span class="pill ${a.cohesion >= 70 ? "money" : a.cohesion >= 45 ? "gold" : "hot"}">bütünlük %${a.cohesion}</span>
                  <span class="pill ${a.critics >= 80 ? "gold" : ""}">kritik ${a.critics != null ? a.critics + "/100" : "beklemede"}</span>
                  <span class="pill">${U.compact(a.streams || 0)} dinlenme</span>
                  <span class="pill">liste ${a.chartRank ? "#" + a.chartRank : "—"}</span>
                  <span class="pill ${a.risingRank && a.risingRank <= 10 ? "money" : ""}">yükselen ${a.risingRank ? "#" + a.risingRank : "—"}</span>
                </div>
                <div class="bar"><i style="width:${a.cohesion}%"></i></div>
              </div>
            </div>`).join("")}</div>`
            : `<div class="empty-note"><b>Henüz albümün yok</b>Stüdyoda <b>EP / Mixtape / Albüm / Deluxe</b> seç, bir konsept belirle ve projeyi çıkar.</div>`}
        </div>

        <div class="c-block">
          <div class="c-head"><div><h2>Albüm Listesi · Top 20</h2><div class="sub">Günlük albüm dinlenmesine göre</div></div></div>
          ${chart.length ? `<div class="chart-list">${chart.slice(0, 20).map(e => `
            <div class="chart-row ${e.mine ? "me" : ""}">
              <span class="chart-rank ${e.rank <= 3 ? "top" : ""}">${e.rank}</span>
              ${K.ui.cover("alb" + e.id, "💿", 38, e.art)}
              <div class="grow">
                <div class="title" style="font-size:12.5px;font-weight:700">${U.escape(e.title)}${e.mine ? ' <span class="pill karma" style="font-size:8px">SEN</span>' : ""}</div>
                <div class="sub" style="font-size:10.5px;color:var(--text-2)">${U.escape(e.artistName)}${e.concept ? " · " + U.escape(e.concept) : ""}${e.critics != null ? " · kritik " + e.critics : ""}</div>
              </div>
              <span style="font-size:10.5px;color:var(--text-3);font-weight:700;width:70px;text-align:right">${U.compact(e.daily)}/g</span>
            </div>`).join("")}</div>`
            : `<div class="empty-note"><b>Albüm listesi oluşuyor</b>Bir gün ilerlet.</div>`}
        </div>

        <div class="c-block">
          <div class="c-head"><div><h2>Yükselen Albümler · Top 20</h2><div class="sub">Bağımsız ve alt seviye sanatçılar — burada yarışabilirsin</div></div></div>
          ${(s.albumChartRising || []).length ? `<div class="chart-list">${(s.albumChartRising || []).map(e => `
            <div class="chart-row ${e.mine ? "me" : ""}">
              <span class="chart-rank ${e.rank <= 3 ? "top" : ""}">${e.rank}</span>
              ${K.ui.cover("ris" + e.id, "💿", 38, e.art)}
              <div class="grow">
                <div class="title" style="font-size:12.5px;font-weight:700">${U.escape(e.title)}${e.mine ? ' <span class="pill karma" style="font-size:8px">SEN</span>' : ""}</div>
                <div class="sub" style="font-size:10.5px;color:var(--text-2)">${U.escape(e.artistName)}${e.critics != null ? " · kritik " + e.critics : ""}</div>
              </div>
              <span style="font-size:10.5px;color:var(--text-3);font-weight:700;width:70px;text-align:right">${U.compact(e.daily)}/g</span>
            </div>`).join("")}</div>`
            : `<div class="empty-note"><b>Liste oluşuyor</b>Bir gün ilerlet.</div>`}
        </div>`;
    },

    /* =====================================================
       LİSTELER
       ===================================================== */
    /* =====================================================
       ANALİZ — yayın performansı
       ===================================================== */
    /* =====================================================
       PLAKLAR + KARMA WRAPPED (v10.23)
       systems/certifications.js · systems/yearwrap.js
       ===================================================== */
    certificationsHTML() {
      const p = K.state.player;
      const sum = K.certifications.summary();
      const wall = K.certifications.list().slice(0, 8);
      const top = (p.songs || []).slice().sort((a, b) => (b.streams || 0) - (a.streams || 0))[0] || null;
      const prog = top ? K.certifications.progress(top.streams || 0) : null;
      const wl = K.yearwrap.history();
      const lastW = wl.length ? wl[wl.length - 1] : null;
      const nextWrappedDay = (K.yearwrap.completedYears() + 1) * K.yearwrap.YEAR + 1;

      /* kademe madalyonu: sayı + kilit durumu */
      const tierMedal = (t) => {
        const n = K.certifications.count(t.id);
        const locked = n === 0;
        return `<div class="plq-tier ${t.id} ${locked ? "locked" : ""}" style="--pc:${t.color}">
          <span class="pt-medal">${t.emoji}</span>
          <span class="pt-n">${n}</span>
          <span class="pt-lb">${t.short}</span>
          <span class="pt-th">${U.fmt(t.streams)}+</span>
        </div>`;
      };

      return `
        <div class="c-block">
          <div class="c-head"><div><h2>🏅 Plak Vitrini</h2><div class="sub">Altın · Platin · Elmas — kalıcı katalog etkisi</div></div>
            ${lastW ? `<button class="btn btn-primary btn-sm" data-act="open-wrapped">📊 Wrapped</button>` : ""}</div>

          <!-- vitrin başlığı: toplam koleksiyon + ödül ağırlığı -->
          <div class="plq-showcase">
            <div class="plq-total">
              <span class="pt-big">${sum.total}</span>
              <div class="pt-txt">
                <span class="pt-k">Toplam plak</span>
                <span class="pt-v">ödül ağırlığı <b>+${sum.awardWeight}</b></span>
                <span class="pt-v2">${sum.diamond} elmas · ${sum.platinum} platin · ${sum.gold} altın</span>
              </div>
            </div>
            <div class="plq-tiers">${K.certifications.TIERS.map(tierMedal).join("")}</div>
          </div>

          <!-- sıradaki plak: hedefi görünür kılar -->
          ${top && prog && prog.next ? `<div class="plq-next" style="--pc:${prog.next.color}">
            <div class="pn-head">
              <span class="pn-tag">Sıradaki</span>
              <span class="pn-song">${U.escape(top.title)}</span>
              <span class="pn-to">${prog.next.emoji} ${prog.next.name}</span>
            </div>
            <div class="pn-bar"><i style="width:${prog.pct}%"></i></div>
            <div class="pn-foot">
              <span>%${prog.pct} tamam</span>
              <span>${U.fmt(top.streams || 0)} / ${U.fmt(prog.next.streams)}</span>
              <span class="pn-left">${U.fmt(prog.remaining)} kaldı</span>
            </div>
          </div>` : ""}

          ${wall.length ? `<div class="plq-wall">${wall.map(pl => {
            const t = K.certifications.tier(pl.tier) || {};
            const sg = (p.songs || []).find(x => x.title === pl.title && pl.kind === "song");
            const al = (p.albums || []).find(x => x.title === pl.title && pl.kind === "album");
            const streams = (sg && sg.streams) || (al && al.streams) || 0;
            return `<div class="plq-row" style="--pc:${t.color || "#ffcb5c"}">
              <span class="plq-medal">${t.emoji || "🏅"}</span>
              <div class="grow" style="min-width:0">
                <div class="tt">${U.escape(pl.title)}</div>
                <div class="ss">${pl.kind === "album" ? "Albüm" : "Şarkı"} · ${U.fmt(streams)} dinlenme</div>
              </div>
              <div class="pr-right">
                <span class="kk">${t.short || ""}</span>
                <span class="pd">Gün ${pl.day}</span>
              </div>
            </div>`;
          }).join("")}</div>`
          : `<div class="plq-empty">
              <div class="pe-title">Vitrin henüz boş</div>
              <div class="pe-sub">Şarkıların şu eşiklere ulaşınca plak gelir:</div>
              <div class="plq-tiers" style="margin-top:10px">${K.certifications.TIERS.map(tierMedal).join("")}</div>
            </div>`}
        </div>

        <div class="c-block">
          <div class="c-head"><div><h2>📊 KARMA Wrapped</h2><div class="sub">Yılda bir otomatik yıl sonu özeti</div></div></div>
          ${lastW ? `<div class="wrapped-hero">
            <div class="wh-top">
              <span class="wh-year">${lastW.year}</span>
              <span class="wh-badge">YIL ÖZETİ</span>
            </div>
            <div class="wh-hero-num">${U.fmt(lastW.streams)}</div>
            <div class="wh-hero-lb">dinlenme</div>
            <div class="wh-strip">
              <span><b>${lastW.songsReleased}</b> yayın</span>
              <span><b>${lastW.shows}</b> sahne</span>
              <span><b>${lastW.plaques.length}</b> plak</span>
              <span><b>+${U.compact(lastW.followers)}</b> takipçi</span>
            </div>
          </div>
          <div class="action-row" style="margin-top:10px">
            <button class="btn btn-primary btn-sm" data-act="open-wrapped">📊 Özeti Aç</button>
            <span class="hint" style="align-self:center">${wl.length} yıllık arşiv</span>
          </div>`
          : `<div class="empty-note"><b>Henüz özet yok</b>İlk yılın sonunda (Gün ${nextWrappedDay}) KARMA Wrapped otomatik oluşur — şu an ${Math.max(0, nextWrappedDay - K.state.day)} gün kaldı.</div>`}
        </div>`;
    },

    renderAnalytics() {
      const s = K.state, p = s.player;
      const hide = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();
      const songs = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0));
      if (!songs.length) return K.careerUI.certificationsHTML() + `<div class="empty-note"><b>Analiz için veri yok</b>İlk yayınını çıkarınca dinlenme, liste ve mağaza verileri burada görünür.</div>`;

      const total = U.sum(songs, x => x.streams || 0);
      const activeLists = K.lists ? K.lists.summary().filter(r => !r.exitDay) : [];
      const bestRank = Math.min.apply(null, songs.map(x => x.chartPeak || 999).concat([999]));
      const last14 = (p.dailyHistory || []).slice(-14);
      const maxH = Math.max(1, Math.max.apply(null, last14.concat([1])));
      const bars = last14.map((v, i) => `<i style="height:${Math.round(v / maxH * 100)}%" title="${U.compact(v)}"></i>`).join("");

      const plat = songs.reduce((a, x) => {
        const w = x.platforms || { spotify: 0.5, apple: 0.2, youtube: 0.3 };
        a.spotify += (x.streams || 0) * (w.spotify || 0);
        a.apple += (x.streams || 0) * (w.apple || 0);
        a.youtube += (x.streams || 0) * (w.youtube || 0);
        return a;
      }, { spotify: 0, apple: 0, youtube: 0 });
      const platMax = Math.max(1, plat.spotify, plat.apple, plat.youtube);
      const platRow = (name, val, color) => `
        <div class="an-plat">
          <span class="an-plat-name">${name}</span>
          <div class="an-bar"><i style="width:${Math.round(val / platMax * 100)}%;background:${color}"></i></div>
          <span class="an-plat-val">${hide ? "🔒" : U.compact(val)}</span>
        </div>`;

      const card = (k, v, cls) => `<div class="an-card"><span class="k">${k}</span><span class="v ${cls || ""}">${v}</span></div>`;

      /* v10.31 — "Kariyer Detayı" modalı kaldırıldı; tek analiz yuvası burası.
         Kariyer durumu / şirket / anlaşma / kalite özeti artık burada. */
      const avgQuality = songs.length ? Math.round(U.sum(songs, x => x.quality || 0) / songs.length) : 0;
      const statusLabel = p.popularity >= 70 ? "Yıldız seviyesi"
        : p.popularity >= 45 ? "Yükselen sanatçı"
        : p.popularity >= 20 ? "Tanınan isim" : "Yeni başlayan";
      const labelLine = s.label ? U.escape(s.label.name) + " · güç " + K.label.power()
        : (p.labelId ? U.escape((K.labelById(p.labelId) || {}).name || "Şirket") : "Bağımsız");
      const dealLine = p.labelDeal ? ("avans " + U.money(p.labelDeal.advance) + " · %" + (p.labelDeal.artistRoyalty || 100))
        : (s.label ? "kendi şirketi" : "sözleşmesiz");

      const rows = songs.slice(0, 12).map(sg => {
        const age = s.day - (sg.publishedDay || s.day);
        const lists = (sg.lists || []).filter(e => !e.exitDay).length;
        const stores = (sg.stores || []).length;
        const peak = (sg.chartPeak && sg.chartPeak < 999) ? sg.chartPeak : null;
        return `<div class="an-row">
          <span class="an-age">${age}g</span>
          ${K.ui.cover(sg.coverSeed, (sg.title[0] || "?").toUpperCase(), 34)}
          <div class="grow">
            <div class="an-title">${U.escape(sg.title)}</div>
            <div class="an-sub">${U.escape(K.genreById(sg.genre).name)} · ${sg.type || "single"} · ${stores} mağaza</div>
          </div>
          <div class="an-metrics">
            <span class="an-m"><b>${hide ? "🔒" : U.compact(sg.streams || 0)}</b>dinlenme</span>
            <span class="an-m"><b>${lists}</b>liste</span>
            <span class="an-m"><b>${peak || "—"}</b>zirve</span>
          </div>
        </div>`;
      }).join("");

      return K.careerUI.certificationsHTML() + `
        <div class="c-block">
          <div class="c-head"><div><h2>Analiz</h2><div class="sub">Yayın performansı, mağaza kırılımı ve liste takibi.</div></div></div>
          <div class="an-cards">
            ${card("Toplam Dinlenme", hide ? "🔒" : U.compact(total))}
            ${card("Aylık Dinleyici", hide ? "🔒" : U.compact(p.monthly || 0))}
            ${card("Aktif Liste", String(activeLists.length))}
            ${card("En İyi Sıra", bestRank < 999 ? "#" + bestRank : "—")}
          </div>
          <div class="an-panel">
            <div class="an-panel-head">Son 14 gün dinlenme</div>
            <div class="an-chart">${bars || `<span class="muted" style="font-size:11px">Veri birikiyor…</span>`}</div>
          </div>
          <div class="an-panel">
            <div class="an-panel-head">Platform kırılımı</div>
            ${platRow("Spotify", plat.spotify, "#1ed760")}
            ${platRow("Apple Music", plat.apple, "#d64b6a")}
            ${platRow("YouTube", plat.youtube, "#ff4b4b")}
          </div>
          <div class="an-panel">
            <div class="an-panel-head">Son yayınlar</div>
            ${rows}
          </div>
          <div class="an-panel">
            <div class="an-panel-head">Kariyer durumu</div>
            <div class="an-cards">
              ${card("Kariyer", statusLabel)}
              ${card("Ortalama Kalite", String(avgQuality))}
              ${card("Görünürlük", String(K.social.visibilityScore()))}
              ${card("Toplam Kazanç", U.money(p.totalEarned), "money")}
              ${card("Şirket", labelLine)}
              ${card("Anlaşma", dealLine)}
            </div>
          </div>
        </div>`;
    },

    renderCharts() {
      const s = K.state;
      const chart = s.chart || [];
      const hideV = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();

      /* ---------- 1) oyuncunun platform listeleri (Spotify/Apple/YT/airplay) ---------- */
      let listsHTML = "";
      if (K.lists) {
        const rows = K.lists.summary();
        const active = rows.filter(r => !r.exitDay);
        if (active.length) {
          listsHTML = `
            <div class="c-block">
              <div class="c-head"><div><h2>Platform Listelerin</h2><div class="sub">Editoryal, algoritmik ve viral listeler — girişler kendiliğinden olmaz</div></div></div>
              <div class="list-board">
                ${active.sort((a, b) => a.platform.localeCompare(b.platform)).map(r => `
                  <div class="list-board-row">
                    <div class="lb-icon">${r.icon || "🎵"}</div>
                    <div class="grow">
                      <div class="lb-name">${U.escape(r.name)}</div>
                      <div class="lb-sub">${U.escape(r.platform)} · ${U.escape(r.song.title)} · sıra ~${r.rank}${hideV ? "" : " · çekiş " + (r.pull || 0)}</div>
                    </div>
                    <span class="pill money">${r.days}. gün</span>
                  </div>`).join("")}
              </div>
            </div>`;
        }
      }

      if (!chart.length) return listsHTML + `<div class="empty-note"><b>Liste oluşuyor</b>Bir gün ilerlet ve listeleri gör.</div>`;

      const rows = chart.slice(0, 30).map(e => {
        const d = e.delta > 0 ? `<span class="chart-delta up">▲${e.delta}</span>`
          : e.delta < 0 ? `<span class="chart-delta down">▼${Math.abs(e.delta)}</span>`
          : `<span class="chart-delta same">—</span>`;
        const artistLabel = e.mine ? s.player.stageName : e.artistName;
        return `<div class="chart-row ${e.mine ? "me" : ""}">
          <span class="chart-rank ${e.rank <= 3 ? "top" : ""}">${e.rank}</span>
          ${K.ui.cover(e.cover, (e.title[0] || "?").toUpperCase(), 38, e.art)}
          <div class="grow">
            <div class="title" style="font-size:12.5px;font-weight:700">${U.escape(e.title)}</div>
            <div class="sub" style="font-size:10.5px;color:var(--text-2)">${U.escape(artistLabel)}</div>
          </div>
          ${d}
          <span style="font-size:10.5px;color:var(--text-3);font-weight:700;width:70px;text-align:right">${hideV ? "🔒" : U.compact(e.daily) + "/g"}</span>
        </div>`;
      }).join("");

      const st = K.live ? K.live.status() : null;
      return listsHTML + `
        <div class="c-block">
          <div class="c-head">
            <div>
              <h2>KARMA Top 30</h2>
              <div class="sub">Günlük dinlenmeye göre ulusal liste${st && st.chartIsLive ? ` · canlı veri (${U.escape(st.asof || "")})` : " · gerçek liste anlık görüntüsü"}</div>
            </div>
            <div class="action-row">
              <button class="btn btn-primary btn-sm" data-act="refresh-chart">🔄 Canlı Yenile</button>
            </div>
          </div>
          ${hideV ? `<div class="opt-info" style="margin-bottom:8px">🔒 Zor mod: sayısal değerler gizli. Yalnızca sıralamaya bak.</div>` : ""}
          <div class="chart-list">${rows}</div>
        </div>`;
    },

    /* =====================================================
       ŞİRKET (LABEL)
       ===================================================== */
    renderLabel() {
      const s = K.state;

      if (!s.label) {
        const can = K.label.canFound();
        return `
          <div class="c-block">
            <div class="c-head"><div><h2>Şirket Kur</h2><div class="sub">Kendi müzik şirketini kur, sanatçı imzala ve kariyerini yönet.</div></div></div>
            <div class="label-hero">
              <h3>🏢 Kendi Label'ını Kur</h3>
              <div class="stat-grid">
                <div class="stat-card"><span class="k">Kuruluş Maliyeti</span><span class="v money">${U.money(K.ECON.labelFoundCost)}</span><span class="d">Tek seferlik</span></div>
                <div class="stat-card"><span class="k">Gereken Popülerlik</span><span class="v ${s.player.popularity >= K.ECON.labelFoundMinPop ? "" : "hot"}">${K.ECON.labelFoundMinPop}</span><span class="d">Mevcut: ${Math.round(s.player.popularity)}</span></div>
                <div class="stat-card"><span class="k">Mevcut Kasa</span><span class="v ${s.balance >= K.ECON.labelFoundCost ? "money" : "hot"}">${U.money(s.balance)}</span><span class="d">Gereken: ${U.money(K.ECON.labelFoundCost)}</span></div>
              </div>
              <div class="field"><label>Şirket Adı</label>
                <input id="lbl-name" type="text" value="${U.escape(s.player.stageName)} Music" />
              </div>
              <div class="action-row">
                <button class="btn btn-primary" data-act="found-label" ${can ? "" : "disabled"}>
                  🏢 Şirketi Kur
                </button>
              </div>
              ${can ? "" : `<span class="hint" style="color:var(--gold);font-size:11px">Kuruluş için yeterli bakiye ve popülerliğe ulaşmalısın.</span>`}
            </div>
          </div>`;
      }

      const lbl = s.label;
      const power = K.label.power();
      const roster = K.label.rosterArtists();
      const dailyNet = K.economy.labelDailyNet();
      const candidates = K.label.candidates().slice(0, 12);

      return `
        <div class="c-block">
          <div class="label-hero">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="brand-mark" style="width:46px;height:46px">🏢</div>
              <div style="flex:1">
                <h3>${U.escape(lbl.name)}</h3>
                <div class="sub" style="font-size:11.5px;color:var(--text-2)">Kuruluş: Gün ${lbl.foundedDay} · Seviye ${lbl.level}</div>
              </div>
            </div>
            <div class="label-power">
              <span style="font-size:11px;font-weight:700;color:var(--text-2);width:70px">Şirket Gücü</span>
              <div class="bar"><i style="width:${power}%"></i></div>
              <span style="font-weight:900;color:var(--karma-2)">${power}</span>
            </div>
            <div class="stat-grid">
              <div class="stat-card"><span class="k">Kadro</span><span class="v">${roster.length}</span><span class="d">sanatçı</span></div>
              <div class="stat-card"><span class="k">Katalog</span><span class="v">${lbl.catalog.length}</span><span class="d">çıkan iş</span></div>
              <div class="stat-card"><span class="k">Aylık Dinlenme</span><span class="v">${U.compact(lbl.monthlyStreams)}</span><span class="d">kadro toplamı</span></div>
              <div class="stat-card"><span class="k">Günlük Net</span><span class="v money">${U.money(dailyNet)}</span><span class="d">şirket geliri</span></div>
            </div>
            <div class="action-row">
              <button class="btn btn-ghost btn-sm" data-act="invest-label" data-amount="100000">₺100K Yatır</button>
              <button class="btn btn-ghost btn-sm" data-act="invest-label" data-amount="300000">₺300K Yatır</button>
              <button class="btn btn-gold btn-sm" data-act="invest-label" data-amount="1000000">₺1M Yatır</button>
            </div>
          </div>

          <div class="c-head" style="margin-top:6px"><div><h2>A&R — Aday Sanatçılar</h2><div class="sub">Samimiyet ve şirket gücüne göre sözleşme teklif et</div></div></div>
          ${candidates.length ? `<div class="row-list">${candidates.map(c => {
            const rel = c.relation;
            const stage = K.stageFor(rel.affinity);
            const discovered = rel.discovered || rel.met;
            const cur = c.currentLabel ? c.currentLabel.name : "Bağımsız";
            return `<div class="candidate-row">
              ${K.ui.avatar(c.artist.stageName, 44)}
              <div class="grow">
                <div class="title" style="font-size:13px;font-weight:700">${U.escape(c.artist.stageName)}</div>
                <div class="sub" style="font-size:11px;color:var(--text-2)">${U.compact(c.artist.monthly)} dinleyici · Pop ${Math.round(c.artist.popularity)} · ${U.escape(cur)}</div>
                <div class="sub" style="font-size:10.5px;color:var(--karma-2);margin-top:3px">Samimiyet: ${discovered ? U.escape(stage.label) + " (" + Math.round(rel.affinity) + ")" : "gizli"}</div>
              </div>
              <button class="btn btn-sm btn-primary" data-act="contract" data-artist="${c.artist.id}">Teklif</button>
            </div>`;
          }).join("")}</div>`
            : `<div class="empty-note"><b>Uygun aday yok</b>Tüm sanatçılar kadronda ya da erişilemez durumda.</div>`}
        </div>`;
    },

    /* =====================================================
       KADRO
       ===================================================== */
    renderRoster() {
      const s = K.state;
      if (!s.label) return `<div class="empty-note"><b>Şirketin yok</b>Önce "Şirket" sekmesinden kendi label'ını kur.</div>`;
      const roster = K.label.rosterArtists();
      if (!roster.length) return `<div class="empty-note"><b>Kadro boş</b>Şirket sekmesinden A&R adaylarına sözleşme teklif et.</div>`;

      return `
        <div class="c-block">
          <div class="c-head"><div><h2>Şirket Kadrosu</h2><div class="sub">${roster.length} sanatçı · Şirket gücü ${K.label.power()}</div></div></div>
          <div class="roster-grid">
            ${roster.map(a => {
              const rel = K.relation(a.id);
              return `<div class="roster-card">
                <div class="roster-head">
                  ${K.ui.avatar(a.stageName, 42)}
                  <div class="grow">
                    <div class="title" style="font-size:13px;font-weight:800">${U.escape(a.stageName)}</div>
                    <div class="sub" style="font-size:10.5px;color:var(--text-2)">${K.genreById(a.genre).name} · ${U.escape(a.city)}</div>
                  </div>
                </div>
                <div class="roster-nums">
                  <div class="roster-num">Aylık Dinleyici<b>${U.compact(a.monthly)}</b></div>
                  <div class="roster-num">Popülerlik<b>${Math.round(a.popularity)}</b></div>
                  <div class="roster-num">Toplam Dinlenme<b>${U.compact(a.streams)}</b></div>
                  <div class="roster-num">Samimiyet<b>${Math.round(rel.affinity)}</b></div>
                </div>
                <div class="action-row">
                  <button class="btn btn-sm btn-primary" data-act="roster-release" data-artist="${a.id}">📀 Single Çıkar</button>
                  <button class="btn btn-sm btn-ghost" data-act="open-dm" data-artist="${a.id}">💬 DM</button>
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>`;
    },

    /* =====================================================
       KONSER & TURNE
       ===================================================== */
    renderConcerts() {
      const s = K.state, p = s.player;
      const cities = K.concerts.CITIES.map(c => `<option value="${c.name}">${c.name} (x${c.mult})</option>`).join("");
      const venues = K.concerts.VENUES.map(v => `<option value="${v.id}" ${v.minPop <= p.popularity ? "" : "disabled"}>${v.emoji} ${v.name} · ${U.fmt(v.capacity)} kişi${v.minPop > p.popularity ? " (min pop " + v.minPop + ")" : ""}</option>`).join("");
      const prods = K.concerts.PRODUCTIONS.map(pr => `<option value="${pr.id}">${pr.emoji} ${pr.name}${pr.cost ? " · " + U.money(pr.cost) : " · ücretsiz"}</option>`).join("");
      const openerList = K.concerts.openers();
      const openers = `<option value="">— Yok —</option>` + openerList.map(o => `<option value="${o.artist.id}">${U.escape(o.artist.stageName)} · ${U.money(o.fee)}</option>`).join("");
      const upcoming = (s.concerts || []).filter(c => c.status === "planlandı").sort((a, b) => a.day - b.day);
      const done = (s.concerts || []).filter(c => c.status === "tamamlandı").sort((a, b) => b.day - a.day).slice(0, 4);
      const tp = K.concerts.tourProgress();

      return `
        <div class="c-block">
          <div class="c-head"><div><h2>Konser Planla</h2><div class="sub">Mekân, sahne prodüksiyonu ve açılış sanatçısını seç</div></div></div>
          <div class="studio-card">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
              <div class="field"><label>Şehir</label><select id="cn-city">${cities}</select></div>
              <div class="field"><label>Mekân</label><select id="cn-venue">${venues}</select></div>
              <div class="field"><label>Gün Sonra</label><select id="cn-days"><option value="5">5 gün</option><option value="10" selected>10 gün</option><option value="21">21 gün</option><option value="35">35 gün</option></select></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
              <div class="field"><label>🎬 Sahne Prodüksiyonu</label><select id="cn-prod">${prods}</select>
                <span class="hint" id="cn-prod-desc"></span></div>
              <div class="field"><label>🎤 Açılış Sanatçısı</label><select id="cn-opener">${openers}</select>
                <span class="hint">Açılışçının kitlesi katılımı artırır, sanatçı da ünlenir.</span></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
              <div class="field"><label>💼 Anlaşma Tipi</label><select id="cn-deal">
                <option value="door" selected>Kapı Payı (%62 · risk/ödül)</option>
                <option value="guarantee">Garanti (sabit ücret · risksiz)</option>
              </select></div>
              <div class="field"><label>👕 Konser Merch</label><select id="cn-merch">
                <option value="1" selected>Sat (stok maliyeti var)</option>
                <option value="0">Satma</option>
              </select></div>
            </div>
            <div class="field"><label>Bilet Fiyatı</label>
              <div class="range-row"><input id="cn-price" type="range" min="100" max="3500" step="50" value="450" /><span class="range-val" id="cn-price-val">₺450</span></div>
            </div>
            <div class="stat-grid" id="cn-est">
              <div class="stat-card"><span class="k">Katılım</span><span class="v" id="cn-att">—</span><span class="d" id="cn-cap">—</span></div>
              <div class="stat-card"><span class="k">Brüt Gelir</span><span class="v money" id="cn-rev">—</span><span class="d" id="cn-net">—</span></div>
              <div class="stat-card"><span class="k">Şöhret Etkisi</span><span class="v" id="cn-fame">—</span><span class="d" id="cn-fans">—</span></div>
            </div>
            <div class="action-row"><button class="btn btn-primary" data-act="plan-concert">🎫 Konseri Planla</button></div>
          </div>
        </div>

        <div class="c-block">
          <div class="c-head"><div><h2>Turne</h2><div class="sub">Çok şehirli tur · şehir bazlı hayran artışı</div></div></div>
          <div class="studio-card">
            <div class="field"><label>Şehirler (seç)</label>
              <div class="filter-chips" style="flex-wrap:wrap">
                ${K.concerts.CITIES.map(c => `<button class="fchip ${ui.tourCities.includes(c.name) ? "active" : ""}" data-act="tour-city" data-arg="${c.name}">${c.name}</button>`).join("")}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
              <div class="field"><label>Mekân</label><select id="tr-venue">${venues}</select></div>
              <div class="field"><label>Prodüksiyon</label><select id="tr-prod">${prods}</select></div>
              <div class="field"><label>Açılış Act</label><select id="tr-opener">${openers}</select></div>
              <div class="field"><label>Bilet</label><input id="tr-price" type="number" min="100" step="50" value="450" /></div>
              <div class="field"><label>Duraklar arası</label><select id="tr-gap"><option value="2">2 gün</option><option value="3" selected>3 gün</option><option value="5">5 gün</option></select></div>
            </div>
            <div class="action-row">
              <button class="btn btn-primary" data-act="start-tour">🚌 Turneyi Başlat (${ui.tourCities.length} şehir)</button>
              ${tp ? `<button class="btn btn-danger btn-sm" data-act="cancel-tour">Turneyi İptal Et</button>` : ""}
            </div>
            ${tp ? `<div class="tour-progress">
              <div class="bar"><i style="width:${(tp.done / tp.total * 100).toFixed(0)}%"></i></div>
              <div class="sub" style="font-size:11px;color:var(--text-2);margin-top:6px">${tp.done}/${tp.total} durak · ${U.escape(tp.production.name)} · katılım ${U.fmt(tp.attendance)} · gelir ${U.money(tp.gross)} · <b style="color:var(--money)">+${U.fmt(tp.followers)} hayran</b>${tp.next ? " · sıradaki: " + U.escape(tp.next.city) + " (Gün " + tp.next.day + ")" : ""}</div>
            </div>` : ""}
          </div>
        </div>

        ${tp && tp.log && tp.log.length ? `<div class="c-block">
          <div class="c-head"><div><h2>🗺️ Turne · Şehir Bazlı Hayran Artışı</h2><div class="sub">Her durakta kazanılan yeni hayran</div></div></div>
          <div class="tour-log">${(() => {
            const maxF = Math.max.apply(null, tp.log.map(x => x.followers).concat([1]));
            return tp.log.map((x, i) => `<div class="tl-row">
              <span class="tl-idx">${i + 1}</span>
              <div class="tl-city"><b>${U.escape(x.city)}</b><span>Gün ${x.day} · ${U.fmt(x.attendance)}/${U.fmt(x.capacity)} kişi · ${U.money(x.revenue)}</span></div>
              <div class="tl-bar"><i style="width:${Math.max(6, (x.followers / maxF) * 100)}%"></i></div>
              <span class="tl-fans">+${U.fmt(x.followers)}</span>
            </div>`).join("");
          })()}</div>
        </div>` : ""}

        <div class="c-block">
          <div class="c-head"><div><h2>Planlanan Konserler & Bilet Satışı</h2><div class="sub">${upcoming.length} etkinlik · günlük satış eğrisi</div></div></div>
          ${upcoming.length ? `<div class="row-list">${upcoming.map(c => {
            const v = K.concerts.venue(c.venueId);
            const prod = K.concerts.production(c.productionId);
            const opera = c.openerId ? K.artistById(c.openerId) : null;
            const st = K.concerts.sellThrough(c);
            const hist = K.concerts.salesChart(c);
            return `<div class="concert-card">
              <div class="cc-top">
                <div class="cover" style="background:${U.gradientFor(c.city)}">${v.emoji}</div>
                <div class="grow">
                  <div class="title">${U.escape(c.city)} · ${U.escape(v.name)}</div>
                  <div class="sub">Gün ${c.day} · ${prod.emoji} ${U.escape(prod.name)}${opera ? " · açılış: " + U.escape(opera.stageName) : ""}</div>
                </div>
                <span class="pill ${st >= 95 ? "money" : st >= 60 ? "gold" : ""}">%${st} satıldı</span>
              </div>
              <div class="cc-sales">
                <div class="cc-sales-head"><span>🎟️ ${U.fmt(c.sold)} / ${U.fmt(c.capacity)} bilet</span>
                <span class="muted">hedef ${U.fmt(c.target)} · ${K.concerts.remainingDays(c)} gün kaldı</span></div>
                ${K.stats.sparkline(hist, { color: "#ffcb5c", h: 46 })}
              </div>
              <div class="cc-foot">
                <span>Bilet ${U.money(c.price)}</span><span>· ön ödeme ${U.money(c.advance)}</span>
                <span class="grow"></span>
                <span style="color:var(--money);font-weight:800">tahmini brüt ${U.money(Math.round(c.target * c.price))}</span>
              </div>
            </div>`;
          }).join("")}</div>` : `<div class="empty-note"><b>Konser yok</b>Yukarıdan ilk konserini planla.</div>`}
        </div>

        ${done.length ? `<div class="c-block">
          <div class="c-head"><div><h2>Son Konserler</h2><div class="sub">Gerçekleşen etkinlikler</div></div></div>
          <div class="row-list">${done.map(c => {
            const r = c.result || {};
            return `<div class="row-item">
              <div class="cover" style="background:${U.gradientFor(c.city)}">✅</div>
              <div class="grow"><div class="title">${U.escape(c.city)}</div>
              <div class="sub">${U.fmt(r.attendance || 0)} kişi · ${U.money(r.revenue || 0)} · +${U.fmt(r.followers || 0)} hayran · şöhret +${r.fame || 0}</div></div>
            </div>`;
          }).join("")}</div>
        </div>` : ""}`;
    },

    updateConcertEstimate() {
      const q = id => U.qs(id);
      if (!q("#cn-price")) return;
      q("#cn-price-val").textContent = U.money(+q("#cn-price").value);
      const prod = K.concerts.production(q("#cn-prod") ? q("#cn-prod").value : "basic");
      const openerId = q("#cn-opener") ? q("#cn-opener").value : "";
      const pd = q("#cn-prod-desc");
      if (pd) pd.textContent = prod.desc + " · katılım x" + prod.draw.toFixed(2);
      const est = K.concerts.estimate(q("#cn-city").value, q("#cn-venue").value, +q("#cn-price").value, prod.id, openerId || null,
        { dealType: q("#cn-deal") ? q("#cn-deal").value : "door", merch: q("#cn-merch") ? (q("#cn-merch").value !== "0") : true });
      q("#cn-att").textContent = U.fmt(est.attendance);
      q("#cn-cap").textContent = "kapasite " + U.fmt(est.capacity) + (est.soldOut ? " · SOLD OUT" : "");
      q("#cn-rev").textContent = U.money(est.revenue);
      q("#cn-net").textContent = (est.net >= 0 ? "net +" : "net ") + U.money(est.net) + " · masraf " + U.money(est.cost);
      q("#cn-fame").textContent = "+" + est.fame;
      const cf = q("#cn-fans");
      if (cf) cf.textContent = "+" + U.fmt(est.fans) + " hayran";
    },

    /* =====================================================
       FESTİVAL DEVRESİ — yaz sezonu line-up'ı
       ===================================================== */
    renderFestivals() {
      const s = K.state, p = s.player;
      const sum = K.festivals.summary();
      const cal = K.festivals.calendar();
      const booked = K.festivals.booked();
      const hist = K.festivals.history().slice(0, 8);
      const stance = K.festivals.stanceOf(ui.festStance);

      const rounds = cal.filter(x => x.daysLeft <= 150);
      const later = cal.filter(x => x.daysLeft > 150);

      const tierBadge = (f) => {
        const t = K.FESTIVAL_TIER_LABEL[f.tier] || { label: f.tier, color: "#888" };
        return `<span class="fest-tier" style="--ftc:${t.color}">${t.label}</span>`;
      };

      const row = (x) => {
        const f = x.fest;
        const est = x.eligible ? K.festivals.estimate(f.id, x.slot.id, ui.festStance) : null;
        const chance = x.eligible ? Math.round(K.festivals.acceptChance(f.id, x.slot.id) * 100) : 0;
        let action = "";
        if (x.booked) {
          action = `<button class="btn btn-danger btn-sm" data-act="fest-cancel" data-arg="${f.id}">İptal</button>`;
        } else if (!x.eligible) {
          const need = (K.FESTIVAL_TIER_POPS[f.tier] || [0])[0];
          action = `<span class="fest-lock">🔒 ${need}+ pop gerekli</span>`;
        } else if (x.open && !x.conflict) {
          action = `<button class="btn btn-primary btn-sm" data-act="fest-apply" data-arg="${f.id}">Başvur</button>`;
        } else if (x.conflict) {
          action = `<span class="fest-lock">⚠ ${U.escape(x.conflict.label)} ile çakışıyor</span>`;
        } else if (x.daysLeft > K.festivals.OPEN_WINDOW) {
          action = `<span class="fest-lock">Başvuru ${x.daysLeft - K.festivals.OPEN_WINDOW} gün sonra</span>`;
        } else {
          action = `<span class="fest-lock">Kapandı</span>`;
        }

        return `<div class="fest-card ${x.booked ? "booked" : ""}">
          <div class="fest-main">
            <div class="fest-name">${U.escape(f.name)} ${tierBadge(f)}</div>
            <div class="fest-meta">${U.escape(f.city)} · ${U.escape(x.date.label)} · ${U.fmt(f.capacity)} kişi · ${x.daysLeft} gün kaldı</div>
            <div class="fest-desc">${U.escape(f.desc)}</div>
          </div>
          <div class="fest-slotcol">
            <div class="fest-slot">${x.slot ? x.slot.emoji + " " + x.slot.name : "—"}</div>
            ${est ? `<div class="fest-nums"><span class="money">${U.money(est.net)}</span> net · ~${U.fmt(est.crowd)} kişilik alan · +${U.fmt(est.fans)} hayran</div>` : `<div class="fest-nums">${x.eligible ? "" : "henüz uygun slot yok"}</div>`}
            ${x.eligible ? `<div class="fest-chance">kabul şansı ~%${chance}</div>` : ""}
          </div>
          <div class="fest-actions">${action}</div>
        </div>`;
      };

      return `
        <div class="c-block">
          <div class="c-head"><div><h2>🎪 Festival Devresi</h2><div class="sub">Yaz sezonu line-up'ları · slot merdiveni: gündüz sahnesi → headliner</div></div></div>
          <div class="stat-grid">
            <div class="stat-card"><span class="k">Kesinleşen</span><span class="v">${sum.bookedCount}</span><span class="d">festival slotu</span></div>
            <div class="stat-card"><span class="k">Sıradaki</span><span class="v" style="font-size:13px">${U.escape(sum.nextLabel)}</span><span class="d">takvimde</span></div>
            <div class="stat-card"><span class="k">Headliner</span><span class="v">${sum.headliners}</span><span class="d">${sum.flagship ? "Büyük Sahne headliner'ı" : "kapanış sahnesi sayısı"}</span></div>
            <div class="stat-card"><span class="k">Toplam</span><span class="v">${sum.playedCount}</span><span class="d">festival performansı</span></div>
          </div>

          <div class="studio-card">
            <div class="field"><label>Başvuru stratejisi</label>
              <div class="filter-chips">
                ${K.festivals.STANCES.map(st => `<button class="fchip ${ui.festStance === st.id ? "active" : ""}" data-act="fest-stance" data-arg="${st.id}">${st.emoji} ${st.name}</button>`).join("")}
              </div>
              <span class="hint">${U.escape(stance.desc)}</span>
            </div>
          </div>
        </div>

        <div class="c-block">
          <div class="c-head"><div><h2>Sezon Takvimi</h2><div class="sub">${rounds.length} edisyon yaklaşıyor · başvuru penceresi ${K.festivals.OPEN_WINDOW} gün</div></div></div>
          ${rounds.length ? `<div class="fest-list">${rounds.map(row).join("")}</div>` : `<div class="empty-note"><b>Bu sezonda edisyon yok</b>Festival sezonu haziran–eylül arasındadır; takvim ilerledikçe açılır.</div>`}
          ${later.length ? `<div class="fest-later">Daha sonra: ${later.map(x => U.escape(x.fest.name)).join(" · ")}</div>` : ""}
        </div>

        ${booked.length ? `<div class="c-block">
          <div class="c-head"><div><h2>Kesinleşen Slotlar</h2><div class="sub">Line-up'ta adın var</div></div></div>
          <div class="row-list">${booked.map(b => {
            const f = K.festivals.fest(b.festId);
            const sl = K.festivals.slot(b.slotId);
            return `<div class="row-item"><div class="cover" style="background:${U.gradientFor(f ? f.name : "fest")}">🎪</div>
              <div class="grow"><div class="title">${U.escape(f ? f.name : "Festival")}</div>
              <div class="sub">${sl.emoji} ${sl.name} · Gün ${b.editionDay} · ücret ${U.money(b.fee)} · maliyet ${U.money(b.cost)}</div></div>
              <button class="btn btn-ghost btn-sm" data-act="fest-cancel" data-arg="${b.festId}">İptal</button></div>`;
          }).join("")}</div>
        </div>` : ""}

        ${hist.length ? `<div class="c-block">
          <div class="c-head"><div><h2>Festival Geçmişi</h2><div class="sub">Sahne anları ve aksilikler dahil</div></div></div>
          <div class="row-list">${hist.map(h => {
            const f = K.festivals.fest(h.festId);
            const r = h.result || {};
            const tag = r.event === "viral" ? " · 🔥 sahne anı" : r.event === "mishap" ? " · ⚠️ aksilik" : "";
            const met = r.met ? ` · backstage: ${U.escape(r.met.name)} +${r.met.gain} samimiyet` : "";
            return `<div class="row-item"><div class="cover" style="background:${U.gradientFor(f ? f.name : "fest")}">${h.slotId === "headliner" ? "👑" : "🎪"}</div>
              <div class="grow"><div class="title">${U.escape(f ? f.name : "Festival")} · ${U.escape(r.slot || "")}</div>
              <div class="sub">${U.fmt(r.crowd || 0)} kişi · ${(r.net || 0) >= 0 ? "+" : ""}${U.money(r.net || 0)} · +${U.fmt(r.fans || 0)} hayran · itibar ${(r.repDelta || 0) >= 0 ? "+" : ""}${r.repDelta || 0}${tag}${met}</div></div></div>`;
          }).join("")}</div>
        </div>` : ""}`;
    },

    /* =====================================================
       YAN İŞLER (harici gelir)
       ===================================================== */
    renderJobs() {
      const s = K.state, p = s.player;
      const cond = K.jobs.condition();
      const jobs = K.jobs.list();
      const shiftsLeft = K.jobs.shiftsLeft();
      const restBtn = K.jobs.canRest()
        ? `<button class="btn btn-sm btn-ghost" data-act="rest-day">😴 Bugünü dinlenmeye ayır</button>`
        : `<span class="pill">😴 bugün dinlendin</span>`;
      return `
        <div class="c-block">
          <div class="c-head"><div><h2>Yan İşler</h2><div class="sub">Müzikten geçinmek yıllar sürer — kiranı ve ekipmanı bunlarla çıkarırsın</div></div></div>
          <div class="stat-grid">
            <div class="stat-card"><span class="k">Bugünkü Kazanç</span><span class="v money">${U.money(K.jobs.dailyTotal())}</span><span class="d">yan işlerden</span></div>
            <div class="stat-card"><span class="k">Vardiya Hakkı</span><span class="v ${shiftsLeft ? "" : "hot"}">${shiftsLeft}/${K.jobs.MAX_SHIFTS}</span><span class="d">bugün kalan</span></div>
            <div class="stat-card"><span class="k">Durum</span><span class="v ${cond.color}">${cond.label}</span><span class="d">ücret & kalite cezası ${cond.penalty}</span></div>
            <div class="stat-card"><span class="k">Toplam Yan İş</span><span class="v">${U.money(p.jobEarnings || 0)}</span><span class="d">kariyer boyunca</span></div>
          </div>
          <div class="job-fatigue">
            ${K.studio.row("Yorgunluk", Math.round(p.fatigue || 0), Math.round(p.fatigue || 0) + "/100", { color: "linear-gradient(90deg,#5ce89b,#ffcb5c,#ff6b6b)" })}
            <div class="jf-row">
              <span class="helper">Vardiya yorgunluk biriktirir. <b>${K.jobs.FATIGUE_CAP}+</b> yorgunlukta iş yapamazsın; ücret de yorgunlukla düşer.</span>
              ${restBtn}
            </div>
          </div>
          <div class="c-head" style="margin-top:4px"><div><h2 style="font-size:15px">Beceriler</h2><div class="sub">Her iş bir beceri geliştirir; beceri ücretini ve şarkı kaliteni artırır</div></div></div>
          <div class="skill-grid">
            ${Object.keys(K.SKILLS).map(k => {
              const lv = Math.floor(K.skillLevel(k));
              const info = K.SKILLS[k];
              return `<div class="skill-card">
                <div class="sk-head"><span class="sk-icon">${info.icon}</span>
                  <div class="grow"><div class="sk-name">${U.escape(info.name)}</div>
                  <div class="sk-desc">${U.escape(info.desc)}</div></div>
                  <span class="sk-lv">${lv}</span>
                </div>
                <div class="bar"><i style="width:${lv}%"></i></div>
                ${K.skills && K.skills.canPractice(k)
                  ? `<button class="btn btn-sm btn-ghost" data-act="practice" data-arg="${k}">🎯 Pratik yap</button>`
                  : `<span class="pill">bugün çalışıldı ✓</span>`}
              </div>`;
            }).join("")}
          </div>

          <div class="job-grid">
            ${jobs.map(j => {
              const pill = j.status === "self" ? `<span class="pill karma">serbest</span>`
                : j.hired ? `<span class="pill money">kadroda ✓</span>`
                : j.status === "pending" ? `<span class="pill gold">başvuru bekliyor</span>`
                : j.status === "rejected" ? `<span class="pill">reddedildi</span>`
                : `<span class="pill">başvurulmadı</span>`;
              const action = j.canWork
                ? `<button class="btn btn-sm btn-primary" data-act="work-job" data-arg="${j.id}">💼 Vardiyaya gir</button>`
                : j.canApply
                  ? `<button class="btn btn-sm btn-primary" data-act="apply-job" data-arg="${j.id}">📨 Başvur</button>`
                  : `<button class="btn btn-sm btn-ghost" data-act="work-job" data-arg="${j.id}" disabled>${U.escape(j.reason || j.applyReason || "kilitli")}</button>`;
              return `
              <div class="job-card ${j.unlocked ? "" : "locked"}">
                <div class="jc-head">
                  <span class="jc-icon">${j.emoji}</span>
                  <div class="grow">
                    <div class="jc-name">${U.escape(j.name)} ${pill}</div>
                    <div class="jc-desc">${U.escape(j.desc)}</div>
                  </div>
                  <span class="pill money">${U.money(j.effectivePay || j.pay)}</span>
                </div>
                <div class="jc-meta">
                  <span>${U.escape(j.shift || "")}</span>
                  <span>Yaş ${j.minAge}+</span><span>Yorgunluk +${j.fatigue}</span>
                  <span>Bugün ${j.count}/${j.perDay}</span>
                  ${j.quality ? `<span class="pill karma">kalite +${j.quality}</span>` : ""}
                  ${j.fans ? `<span class="pill">+${j.fans} hayran</span>` : ""}
                  <span class="pill">${K.SKILLS[j.skill] ? K.SKILLS[j.skill].icon + " " + K.SKILLS[j.skill].name + " +" + j.xp : ""}</span>
                </div>
                ${action}
              </div>`;
            }).join("")}
          </div>
          <div class="hint">Vardiya hakkın günde ${K.jobs.MAX_SHIFTS}. Üst üste çalışırsan verim düşer (×0,75 · ×0,56 …). Başvurun ertesi gün yanıtlanır; reddedilirsen birkaç gün bekle.</div>
        </div>`;
    },

    /* =====================================================
       EKİP & KATALOG
       ===================================================== */
    renderStaff() {
      const s = K.state;
      if (!s.label) return `<div class="empty-note"><b>Şirketin yok</b>Önce "Şirket" sekmesinden kendi label'ını kur.</div>`;
      const bonus = K.label.staffBonus();
      const catalog = K.label.catalogList().slice(0, 20);
      return `
        <div class="c-block">
          <div class="c-head"><div><h2>Şirket Ekibi</h2><div class="sub">Personel al, şirketini büyüt</div></div></div>
          <div class="stat-grid">
            <div class="stat-card"><span class="k">Gelir Çarpanı</span><span class="v money">x${bonus.income.toFixed(2)}</span></div>
            <div class="stat-card"><span class="k">Kalite Bonusu</span><span class="v">+${bonus.quality}</span></div>
            <div class="stat-card"><span class="k">Promo Çarpanı</span><span class="v">x${bonus.promo.toFixed(2)}</span></div>
            <div class="stat-card"><span class="k">A&R Etkisi</span><span class="v">+${bonus.signing}</span></div>
          </div>
          <div class="roster-grid">
            ${Object.keys(K.label.STAFF).map(role => {
              const d = K.label.STAFF[role];
              const lvl = K.label.staffLevel(role);
              const cost = K.label.staffCost(role);
              const maxed = lvl >= d.max;
              return `<div class="roster-card">
                <div class="roster-head">
                  <div class="brand-mark" style="width:42px;height:42px;font-size:19px">${d.icon}</div>
                  <div class="grow"><div class="title" style="font-size:13px;font-weight:800">${d.name}</div>
                  <div class="sub" style="font-size:10.5px;color:var(--text-2)">Seviye ${lvl}/${d.max}</div></div>
                </div>
                <div class="sp-pl-desc">${U.escape(d.desc)}</div>
                <div class="bar"><i style="width:${(lvl / d.max * 100)}%"></i></div>
                <button class="btn btn-sm ${maxed ? "btn-ghost" : "btn-primary"}" data-act="hire-staff" data-arg="${role}" ${maxed ? "disabled" : ""}>
                  ${maxed ? "Maksimum" : "İşe Al · " + U.money(cost)}
                </button>
              </div>`;
            }).join("")}
          </div>
        </div>

        <div class="c-block">
          <div class="c-head"><div><h2>Şirket Kataloğu</h2><div class="sub">${catalog.length} kayıt · değer ${U.money(K.label.catalogValue())}</div></div></div>
          ${catalog.length ? `<div class="row-list">${catalog.map(c => {
            const a = K.artistById(c.artistId);
            return `<div class="row-item">
              ${K.ui.artistAvatar(c.artistId, 40, true)}
              <div class="grow"><div class="title">${U.escape(c.title)}</div>
              <div class="sub">${a ? U.escape(a.stageName) : ""} · Gün ${c.day}</div></div>
            </div>`;
          }).join("")}</div>` : `<div class="empty-note"><b>Katalog boş</b>Kadrondan sanatçı adına yayın çıkar.</div>`}
        </div>`;
    },

    /* =====================================================
       ÖDÜLLER
       ===================================================== */
    renderAwards() {
      const s = K.state;
      const next = K.awards.nextCeremony();
      const noms = K.awards.nominations();
      const hist = (s.awards && s.awards.history) || [];
      const totalWins = K.awards.totalWins();
      return `
        <div class="c-block">
          <div class="c-head"><div><h2>Müzik Ödülleri</h2><div class="sub">Her 360 günde bir tören · toplam ${totalWins} ödül</div></div></div>
          <div class="label-hero">
            <h3>🏆 Sıradaki Tören</h3>
            <div class="stat-grid">
              <div class="stat-card"><span class="k">Kalan Gün</span><span class="v gold">${Math.max(0, next - s.day)}</span><span class="d">Gün ${next}</span></div>
              <div class="stat-card"><span class="k">Kazanılan</span><span class="v">${totalWins}</span><span class="d">toplam ödül</span></div>
              <div class="stat-card"><span class="k">Adaylık</span><span class="v">${noms.hasAny ? "VAR" : "—"}</span><span class="d">bu yıl</span></div>
            </div>
          </div>
          <div class="c-head"><h2 style="font-size:15px">Adaylıkların</h2></div>
          <div class="stat-grid">
            ${K.awards.CATEGORIES.map(c => `<div class="stat-card">
              <span class="k">${c.icon} ${U.escape(c.name)}</span>
              <span class="v" style="font-size:13px">${noms.nom[c.id] ? U.escape(noms.nom[c.id]) : "—"}</span>
            </div>`).join("")}
          </div>
        </div>

        <div class="c-block">
          <div class="c-head"><h2 style="font-size:15px">Tören Geçmişi</h2></div>
          ${hist.length ? hist.map(h => `<div class="award-card">
            <div class="aw-head"><b>${h.year}. Yıl Töreni</b><span class="pill ${h.wins ? "gold" : ""}">${h.wins} ödül</span></div>
            <div class="row-list">${h.results.map(r => `<div class="aw-row ${r.won ? "won" : ""}">
              <span>${r.icon}</span><span class="grow">${U.escape(r.cat)}</span>
              <span class="muted">${U.escape(r.winner)}</span>${r.won ? '<span class="pill gold">SEN</span>' : ""}
            </div>`).join("")}</div>
          </div>`).join("") : `<div class="empty-note"><b>Henüz tören yapılmadı</b>İlk tören Gün ${360 + 1}'de.</div>`}
        </div>`;
    },

    /* =====================================================
       RAKİPLER & KRİZ
       ===================================================== */
    renderRivals() {
      const s = K.state;
      const rivals = K.rivalry.list();
      const crisis = K.crisis.active();
      return `
        ${crisis ? `<div class="c-block">
          <div class="crisis-card">
            <div class="cr-tag">⚠️ ${U.escape(crisis.tag)}</div>
            <div class="cr-title">${U.escape(crisis.title)}</div>
            <div class="cr-desc">${U.escape(crisis.desc)}</div>
            <div class="cr-choices">
              ${crisis.choices.map((ch, i) => `<button class="cr-choice" data-act="crisis-choice" data-arg="${i}">
                <span class="cc-label">${U.escape(ch.label)}</span>
                <span class="cc-note">${U.escape(ch.note || "")}</span>
              </button>`).join("")}
            </div>
          </div>
        </div>` : ""}

        ${(() => {
          const allies = (K.beef && K.beef.allies) ? K.beef.allies() : [];
          const ci = (K.beef && K.beef.crewInfo) ? K.beef.crewInfo() : { members: [], power: 0, name: null };
          const crewBlock = `<div class="c-block">
            <div class="c-head"><div><h2>🔥 Çete</h2><div class="sub">${ci.name ? U.escape(ci.name) + " · güç " + Math.round(ci.power) : "Müttefiklerini birleştir — diss savaşlarında yanında olsunlar"}</div></div></div>
            <div class="rival-card">
              <div class="sub" style="font-size:11px;color:var(--text-2)">Müttefikler (samimiyet 65+): ${allies.length ? allies.slice(0, 8).map(a => U.escape(a.stageName)).join(", ") : "henüz yok — DM/hediye ile samimiyet kur"}</div>
              ${ci.name
                ? `<div class="sub" style="font-size:11px;color:var(--text-2);margin-top:6px">Üyeler: ${ci.members.map(a => U.escape(a.stageName)).join(", ") || "—"}</div>`
                : (allies.length >= 3
                  ? `<div class="action-row" style="margin-top:8px"><button class="btn btn-sm btn-primary" data-act="crew-found">🔥 Çete Kur (${U.money(50000)})</button></div>`
                  : `<div class="sub" style="font-size:10.5px;color:var(--text-3);margin-top:6px">Çete için en az 3 müttefik gerekli.</div>`)}
            </div>
          </div>`;

          const beefs = (K.beef && K.beef.list) ? K.beef.list().filter(b => b.heat >= 6 || b.dissCount || b.iDissedCount) : [];
          if (!beefs.length) return crewBlock;
          const beefBlock = `<div class="c-block">
            <div class="c-head"><div><h2>⚔️ Husumet & Diss</h2><div class="sub">Sana diss atanlar · husumet bir süre yüksek kalır, barışırsan düşer</div></div></div>
            ${beefs.map(b => `<div class="rival-card">
              <div class="rival-head">
                ${K.ui.artistAvatar(b.artistId, 44, true)}
                <div class="grow">
                  <div class="title" style="font-size:13px;font-weight:800">${U.escape(b.artist.stageName)} <span class="pill ${b.heat >= 70 ? "hot" : b.heat >= 40 ? "gold" : ""}">${U.escape(b.status)}</span></div>
                  <div class="sub" style="font-size:10.5px;color:var(--text-2)">Ondan ${b.dissCount} diss · senden ${b.iDissedCount} cevap${b.reason ? " · sebep: " + U.escape(b.reason) : ""}</div>
                </div>
                <span class="pill ${b.heat >= 70 ? "hot" : b.heat >= 40 ? "gold" : ""}">heat ${Math.round(b.heat)}</span>
              </div>
              <div class="bar"><i style="width:${Math.round(b.heat)}%;background:linear-gradient(90deg,#ffcb5c,#ff5c7a)"></i></div>
              ${(b.log && b.log.length) ? `<div class="beef-log">${b.log.slice(-4).map(l => `<div class="bl-row ${l.who}"><b>${l.who === "me" ? "Sen" : U.escape(b.artist.stageName)}</b><span>${U.escape(l.text).slice(0, 80)}</span><em>Gün ${l.day}</em></div>`).join("")}</div>` : ""}
              <div class="action-row" style="margin-top:8px">
                <button class="btn btn-sm btn-primary" data-act="beef-studio" data-arg="${b.artistId}">🔥 Diss ile cevap ver</button>
                <button class="btn btn-sm btn-ghost" data-act="beef-action" data-arg="${b.artistId}:peace">🤝 Barış</button>
                <button class="btn btn-sm btn-ghost" data-act="beef-action" data-arg="${b.artistId}:ignore">🙈 Yok say</button>
              </div>
            </div>`).join("")}
          </div>`;
          return crewBlock + beefBlock;
        })()}

        <div class="c-block">
          <div class="c-head"><div><h2>Rakipler</h2><div class="sub">Gerilim (heat) yükselirse diss atışı başlar</div></div></div>
          ${rivals.length ? `<div class="row-list">${rivals.map(r => `
            <div class="rival-card">
              <div class="rival-head">
                ${K.ui.artistAvatar(r.artistId, 44, true)}
                <div class="grow"><div class="title" style="font-size:13px;font-weight:800">${U.escape(r.artist.stageName)}</div>
                <div class="sub" style="font-size:10.5px;color:var(--text-2)">Pop ${Math.round(r.artist.popularity)} · durum: ${U.escape(r.status)}</div></div>
                <span class="pill ${r.heat >= 70 ? "hot" : r.heat >= 40 ? "gold" : ""}">heat ${Math.round(r.heat)}</span>
              </div>
              <div class="bar"><i style="width:${r.heat}%;background:linear-gradient(90deg,#ffcb5c,#ff5c7a)"></i></div>
              <div class="action-row">
                <button class="btn btn-sm btn-danger" data-act="rival-action" data-arg="${r.artistId}" data-kind="diss">🔥 Diss Kaydet</button>
                <button class="btn btn-sm btn-ghost" data-act="rival-action" data-arg="${r.artistId}" data-kind="smooth">🤝 Barış</button>
                <button class="btn btn-sm btn-ghost" data-act="rival-action" data-arg="${r.artistId}" data-kind="ignore">🙈 Yok Say</button>
              </div>
            </div>`).join("")}</div>` : `<div class="empty-note"><b>Rakip yok</b>Bir gün ilerlet, rakipler belirir.</div>`}
        </div>`;
    },

    /* =====================================================
       İSTATİSTİK
       ===================================================== */

    /* =====================================================
       EVENTS
       ===================================================== */
    onClick(e) {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;

      if (act === "subtab") {
        const parts = String(btn.dataset.arg || "").split(":");
        if (parts[0] === "label") subTab.label = parts[1];
        if (parts[0] === "events") subTab.events = parts[1];
        K.careerUI.render();
        return;
      }
      if (act === "open-studio") {
        K.careerUI.openStudioModal();
        return;
      }
      if (act === "persona") { K.careerUI.openPersonaModal(); return; }
      if (act === "interview") { K.press.interview(); return; }
      if (act === "ceremony") { K.awards.openCeremony(); return; }
      if (act === "ar-apply") { K.career.resolveAr(btn.dataset.arg, true); return; }
      if (act === "ar-ignore") { K.career.resolveAr(btn.dataset.arg, false); return; }
      if (act === "audio-listen") {
        const st2 = K.careerUI._studio;
        K.audio.play({ id: "preview", title: (st2 && K.careerUI.projectName(st2)) || "Önizleme", genre: st2 ? st2.genre : "trap", kind: st2 ? st2.kind : "normal", quality: 60 });
        K.toast("▶ Dinleniyor", "Stüdyo önizlemesi çalıyor.", "");
        return;
      }

      /* not: stüdyo sihirbazı kendi olay yöneticisini kullanır (openStudioModal) */
      if (act === "promo-social") K.social.promoteSong(btn.dataset.song, btn.dataset.platform);
      else if (act === "pitch-playlist") K.career.pitchPlaylist(btn.dataset.rel);
      /* v10.42 — C5: takedown / yeniden yükleme */
      else if (act === "song-takedown") K.career.takedownSong(btn.dataset.song, "manual");
      else if (act === "song-reupload") K.career.reuploadSong(btn.dataset.song);
      else if (act === "snippet") K.shortform.startSnippet(btn.dataset.song, "tiktok");
      else if (act === "practice") K.skills.practice(btn.dataset.arg);
      else if (act === "preview-song") {
        const song = K.platforms.findSong(btn.dataset.song);
        if (!song) return;
        K.interactions.play({ id: song.id, title: song.title, artistName: K.state.player.stageName, art: null });
        K.phone.pushView(K.ui.playerView());
        if (K.appSetView) K.appSetView("phone");
      }
      else if (act === "found-label") K.label.found(U.qs("#lbl-name").value.trim());
      else if (act === "invest-label") K.label.invest(+btn.dataset.amount);
      else if (act === "contract") K.careerUI.openContractModal(btn.dataset.artist);
      else if (act === "roster-release") K.label.releaseForArtist(btn.dataset.artist);
      else if (act === "open-dm") K.phone.openApp("messages", { artistId: btn.dataset.artist });
      else if (act === "edit-identity") K.careerUI.openIdentityModal();
      else if (act === "refresh-chart") {
        K.toast("🔄 Yenileniyor", "Gerçek liste çekiliyor…", "");
        K.live.refreshChart(false).then(ok => { if (ok) K.refresh(); });
      }
      else if (act === "refresh-songs") {
        K.toast("🎵 Şarkı verisi", "Tüm sanatçılar güncelleniyor, biraz sürebilir…", "");
        K.live.refreshAllArtists(false).then(() => K.refresh());
      }
      else if (act === "plan-concert") {
        K.concerts.schedule(
          U.qs("#cn-city").value, U.qs("#cn-venue").value, +U.qs("#cn-price").value,
          +U.qs("#cn-days").value,
          U.qs("#cn-prod") ? U.qs("#cn-prod").value : "basic",
          U.qs("#cn-opener") ? (U.qs("#cn-opener").value || null) : null,
          U.qs("#cn-deal") ? U.qs("#cn-deal").value : "door",
          U.qs("#cn-merch") ? (U.qs("#cn-merch").value !== "0") : true
        );
      }
      else if (act === "tour-city") {
        const c = btn.dataset.arg;
        const i = ui.tourCities.indexOf(c);
        if (i >= 0) ui.tourCities.splice(i, 1); else ui.tourCities.push(c);
        K.careerUI.render();
      }
      else if (act === "start-tour") {
        const v = U.qs("#tr-venue").value, price = +U.qs("#tr-price").value || 450, gap = +U.qs("#tr-gap").value || 3;
        const prod = U.qs("#tr-prod") ? U.qs("#tr-prod").value : "basic";
        const opener = U.qs("#tr-opener") ? (U.qs("#tr-opener").value || null) : null;
        if (K.concerts.startTour(ui.tourCities.slice(), v, price, gap, prod, opener)) ui.tourCities = [];
      }
      else if (act === "cancel-tour") K.concerts.cancelTour();
      else if (act === "fest-stance") { ui.festStance = btn.dataset.arg || "balanced"; K.careerUI.render(); }
      else if (act === "fest-apply") K.festivals.apply(btn.dataset.arg, ui.festStance);
      else if (act === "fest-cancel") K.festivals.cancel(btn.dataset.arg);
      else if (act === "ro-open") { ui.presaveRel = btn.dataset.arg; ui.presaveChans = []; K.careerUI.render(); }
      else if (act === "ro-close") { ui.presaveRel = null; ui.presaveChans = []; K.careerUI.render(); }
      else if (act === "ro-chan") {
        const id = btn.dataset.arg;
        const i = ui.presaveChans.indexOf(id);
        if (i >= 0) ui.presaveChans.splice(i, 1); else ui.presaveChans.push(id);
        K.careerUI.render();
      }
      else if (act === "ro-start") {
        if (K.rollout.startPresave(ui.presaveRel, ui.presaveChans.slice())) { ui.presaveRel = null; ui.presaveChans = []; }
      }
      else if (act === "ro-teaser") {
        const parts = String(btn.dataset.arg || "").split("|");
        K.rollout.fireTeaser(parts[0], parts[1]);
      }
      else if (act === "open-wrapped") K.yearwrap.open();
      else if (act === "hire-staff") K.label.hireStaff(btn.dataset.arg);
      else if (act === "work-job") K.jobs.work(btn.dataset.arg);
      else if (act === "apply-job") K.jobs.apply(btn.dataset.arg);
      else if (act === "rest-day") K.jobs.rest();
      else if (act === "crisis-choice") K.crisis.resolve(+btn.dataset.arg);
      else if (act === "incident-choice") K.incidents.resolve(+btn.dataset.arg);
      else if (act === "beef-action") { const parts = String(btn.dataset.arg || "").split(":"); K.beef.respond(parts[0], parts[1]); }
      else if (act === "beef-studio") K.beef.openDissStudio(btn.dataset.arg);
      else if (act === "crew-found") K.beef.promptFoundCrew();
      else if (act === "rival-action") K.rivalry.respond(btn.dataset.arg, btn.dataset.kind);
      /* =========================================================
         v10.28 — GENİŞLEME PAKETİ eylemleri
         ========================================================= */
      else if (act === "mrc-found") {
        const el = U.qs("#mrc-brand");
        K.merch.found(el ? el.value : "");
      }
      else if (act === "mrc-launch") K.merch.launch(ui.mrcItem, ui.mrcDesign, ui.mrcStock, ui.mrcPriceMult);
      else if (act === "ast-buy") K.assets.buy(btn.dataset.arg);
      else if (act === "ast-sell") K.assets.sell(btn.dataset.arg);
      else if (act === "wr-accept") K.writing.accept(btn.dataset.arg, btn.dataset.mode);
      else if (act === "wr-decline") K.writing.decline(btn.dataset.arg);
      else if (act === "in-enter") K.intl.enter(btn.dataset.arg);
      else if (act === "in-tour") K.intl.tour(btn.dataset.arg);
      else if (act === "in-feature") K.intl.foreignFeature(btn.dataset.arg);
      else if (act === "sh-bot") K.shady.buyBots(btn.dataset.arg);
      else if (act === "sh-payola") K.shady.payCurator();
      else if (act === "mh-rest") K.mental.rest();
      else if (act === "mh-therapy") K.mental.therapy(3);
      else if (act === "mh-holiday") K.mental.holiday();
      else if (act === "mh-speak") K.mental.speakOut();
    },

    onInput(e) {
      if (["cn-price", "cn-city", "cn-venue", "cn-days", "cn-prod", "cn-opener", "cn-deal", "cn-merch"].includes(e.target.id)) {
        K.careerUI.updateConcertEstimate();
      }
      /* v10.28 — Girişim sekmesi: form değerleri render arasında korunur */
      const id = e.target.id;
      if (id === "mrc-item") ui.mrcItem = e.target.value;
      else if (id === "mrc-design") ui.mrcDesign = e.target.value;
      else if (id === "mrc-stock") ui.mrcStock = U.clamp(parseInt(e.target.value, 10) || 0, 0, 5000);
      else if (id === "mrc-price") ui.mrcPriceMult = U.clamp(parseFloat(e.target.value) || 1, 0.6, 1.8);
    },

    /* ---------------- SANATÇI KİMLİĞİ (persona) ---------------- */
    openPersonaModal() {
      const p = K.state.player;
      const body = `<div class="persona-grid">${K.PLAYER_PERSONAS.map(ps => `
        <button class="persona-opt ${p.persona === ps.id ? "active" : ""}" data-act="pick-persona" data-arg="${ps.id}">
          <span class="po-icon">${ps.icon}</span>
          <b>${U.escape(ps.name)}</b>
          <span>${U.escape(ps.desc)}</span>
          <em>${ps.genres.slice(0, 3).map(g => K.genreById(g).name).join(" · ")}</em>
        </button>`).join("")}</div>
        <div class="helper" style="margin-top:10px">Kimliğini değiştirirsen yeniden markalama itibarını biraz yorar.</div>`;
      const { bodyEl } = K.ui.modal({ title: "🎭 Sanatçı Kimliği", desc: "Kimliğin, hangi tür ve temalarda güçlü olduğunu belirler.", body, wide: true, actions: [{ label: "Kapat" }] });
      bodyEl.addEventListener("click", (e) => { const b = e.target.closest('[data-act="pick-persona"]'); if (b) K.careerUI.setPersona(b.dataset.arg); });
    },

    setPersona(id) {
      const p = K.state.player;
      const old = p.persona;
      if (!K.playerPersonaById(id)) return;
      p.persona = id;
      if (old && old !== id) p.reputation = Math.max(0, (p.reputation || 0) - 3);
      K.save();
      K.ui.closeModal();
      K.careerUI.render();
      K.toast("🎭 Kimlik", K.playerPersonaById(id).name + " kimliğini seçtin." + (old && old !== id ? " Yeniden markalama itibarı biraz yordu." : ""), "ok");
    },

    /* ---------------- kimlik modalı ---------------- */
    openIdentityModal() {
      const p = K.state.player;
      const genres = K.GENRES.map(g => `<option value="${g.id}" ${g.id === p.genre ? "selected" : ""}>${g.name}</option>`).join("");
      const b = p.birth || { m: 1, d: 1 };
      const dayOpts = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${(i + 1) === b.d ? "selected" : ""}>${i + 1}</option>`).join("");
      const monOpts = U.MONTHS.map((mn, i) => `<option value="${i + 1}" ${(i + 1) === b.m ? "selected" : ""}>${mn}</option>`).join("");
      const body = `
        ${K.ui.field("Sahne Adı", `<input id="id-stage" value="${U.escape(p.stageName)}" />`)}
        ${K.ui.field("Gerçek Ad", `<input id="id-real" value="${U.escape(p.realName || "")}" />`)}
        ${K.ui.field("Yaş", `<input id="id-age" type="number" min="12" max="80" value="${p.age}" />`)}
        ${K.ui.field("Doğum Günü (gün / ay)",
          `<div style="display:flex;gap:8px"><select id="id-bday" style="flex:1">${dayOpts}</select><select id="id-bmonth" style="flex:2">${monOpts}</select></div>`) }
        ${K.ui.field("Şehir", `<input id="id-city" value="${U.escape(p.city)}" />`)}
        ${K.ui.field("Ana Tür", `<select id="id-genre">${genres}</select>`)}`;
      K.ui.modal({
        title: "Sanatçı Profilini Düzenle",
        body,
        actions: [
          { label: "Vazgeç" },
          { label: "Kaydet", cls: "btn-primary", onClick: () => {
            const age = U.clamp(+U.qs("#id-age").value || 24, 12, 80);
            const bday = K.util.clamp(+U.qs("#id-bday").value || 1, 1, 31);
            const bmonth = K.util.clamp(+U.qs("#id-bmonth").value || 1, 1, 12);
            // Doğum yılı, bugünkü oyun tarihinde yaş = girilen yaş olacak şekilde
            const now = U.dateForDay(K.state.day);
            let by = now.y - age;
            if (now.m < bmonth || (now.m === bmonth && now.d < bday)) by -= 1;
            K.career.setIdentity({
              stageName: U.qs("#id-stage").value.trim() || p.stageName,
              realName: U.qs("#id-real").value.trim(),
              age: age,
              birth: { y: by, m: bmonth, d: bday },
              city: U.qs("#id-city").value.trim() || "İstanbul",
              genre: U.qs("#id-genre").value
            });
            K.toast("Profil güncellendi", "", "ok");
            K.refresh();
          }}
        ]
      });
    },

    /* ---------------- sözleşme modalı ---------------- */
    openContractModal(artistId) {
      const a = K.artistById(artistId);
      const rel = K.relation(artistId);
      const cur = a.labelId && a.labelId !== K.MY_LABEL_ID ? K.labelById(a.labelId) : null;
      const buyout = cur ? Math.round(cur.fee * 1.4) : 0;

      const body = `
        <div style="display:flex;align-items:center;gap:12px">
          ${K.ui.avatar(a.stageName, 50)}
          <div>
            <div style="font-weight:800;font-size:15px">${U.escape(a.stageName)}</div>
            <div style="font-size:11.5px;color:var(--text-2)">${U.compact(a.monthly)} dinleyici · Pop ${Math.round(a.popularity)} · Samimiyet ${Math.round(rel.affinity)}</div>
            <div style="font-size:11px;color:var(--text-2);margin-top:2px">Mevcut şirket: ${cur ? U.escape(cur.name) : "Bağımsız"}</div>
          </div>
        </div>
        ${K.ui.field("Avans Teklifi (₺)", `<input id="ct-advance" type="number" min="0" step="5000" value="${cur ? 80000 : 30000}" />`, cur ? `Buyout (eski şirkete): ${U.money(buyout)}` : "")}
        ${K.ui.field("Sanatçı Payı (%)", `<input id="ct-royalty" type="range" min="40" max="90" step="5" value="70" />`, "Şirketin aldığı pay: %<span id='ct-label-cut'>30</span>")}
        ${K.ui.field("Sözleşme Süresi", `<select id="ct-length">
          <option value="180">6 ay</option>
          <option value="365" selected>1 yıl</option>
          <option value="730">2 yıl</option>
        </select>`)}
        <div id="ct-eval" style="font-size:12px;color:var(--text-1);background:var(--bg-1);border:1px solid var(--stroke);border-radius:10px;padding:12px;line-height:1.6"></div>`;

      const modal = K.ui.modal({
        title: "Sözleşme Teklifi",
        desc: "Şirketine katılması için teklif şartlarını belirle.",
        body,
        actions: [
          { label: "Vazgeç" },
          { label: "Teklif Gönder", cls: "btn-primary", close: true, onClick: () => {
            const terms = {
              advance: +U.qs("#ct-advance").value || 0,
              artistRoyalty: +U.qs("#ct-royalty").value,
              lengthDays: +U.qs("#ct-length").value
            };
            K.label.offerContract(artistId, terms);
            K.refresh();
          }}
        ]
      });

      const update = () => {
        const terms = {
          advance: +U.qs("#ct-advance").value || 0,
          artistRoyalty: +U.qs("#ct-royalty").value,
          lengthDays: +U.qs("#ct-length").value
        };
        U.qs("#ct-label-cut").textContent = 100 - terms.artistRoyalty;
        const res = K.label.evaluate(artistId, terms);
        const chance = Math.round(res.probability * 100);
        const color = chance >= 60 ? "var(--money)" : chance >= 35 ? "var(--gold)" : "var(--hot)";
        U.qs("#ct-eval").innerHTML = `
          <b>Tahmini kabul şansı: <span style="color:${color}">${chance}%</span></b>
          <div style="margin-top:6px;color:var(--text-2)">${res.reasons.map(r => "• " + U.escape(r)).join("<br>")}</div>`;
      };
      ["#ct-advance", "#ct-royalty", "#ct-length"].forEach(sel => {
        U.qs(sel).addEventListener("input", update);
        U.qs(sel).addEventListener("change", update);
      });
      update();
    },

    /* =====================================================
       v10.28 — GİRİŞİM SEKMESİ
       Altı yeni sistemi tek yerde toplar: ürün, varlık, yazarlık,
       uluslararası ve karanlık taraf. Her biri KENDİ durum başlığıyla
       özetlenir; ayrıntı altına açılır.
       ===================================================== */
    renderBusiness() {
      const p = K.state.player;
      const parts = [];

      /* ---------- 1) ÜRÜN / STREETWEAR ---------- */
      {
        const m = K.merch.summary();
        const a = m.active;
        const item = K.merch.ITEMS[ui.mrcItem] || K.merch.ITEMS.tee;
        const design = K.merch.DESIGNS[ui.mrcDesign] || K.merch.DESIGNS.basic;
        const est = K.merch.cost(ui.mrcItem, ui.mrcDesign, ui.mrcStock);
        const priced = Math.round(item.price * ui.mrcPriceMult);
        parts.push(`<div class="c-block">
          <div class="xg-head">
            <span class="xg-ico">👕</span>
            <div class="xg-txt">
              <h3>${m.brand ? U.escape(m.brand) : "Ürün Markası Kurulmadı"}</h3>
              <p>${m.brand
                ? `Marka değeri ${Math.round(m.brandValue)}/100 · talep çarpanı ×${m.mult.toFixed(2)} · potansiyel alıcı havuzu ${U.compact(m.audience)}`
                : "Drop bazlı ürün işi kur — günümüz rapçisinin en büyük bağımsız geliri."}</p>
            </div>
            <div class="xg-big">${U.money(m.profit)}</div>
          </div>
          ${m.brand ? `<div class="xg-bar-row"><span style="font-size:11px;color:var(--text-3)">Marka</span><div class="xg-bar"><i style="width:${Math.round(m.brandValue)}%"></i></div><b>${Math.round(m.brandValue)}</b></div>` : ""}
          ${!m.brand ? `<div class="xg-fields">
              <div class="field"><label>Marka adı</label><input id="mrc-brand" class="input" placeholder="ör. SOKAK MODA" maxlength="22"></div>
            </div>
            <button class="btn btn-primary btn-sm" data-act="mrc-found">Marka Kur</button>` : ""}
          ${a ? `
            <div class="xg-rows">
              <div class="xg-row">
                <span class="xg-row-ico">${K.merch.ITEMS[a.itemId].icon}</span>
                <div class="xg-row-main"><b>Drop sürüyor · ${a.sold}/${a.units} satıldı</b>
                  <span>${U.money(a.price)}/adet · ${a.daysLeft} gün kaldı · gelir ${U.money(a.revenue)}</span></div>
              </div>
              <div class="xg-bar"><i style="width:${Math.round(a.sold / a.units * 100)}%"></i></div>
            </div>` : (m.brand ? `
            <div class="xg-fields">
              <div class="field"><label>Ürün</label><select id="mrc-item">${Object.values(K.merch.ITEMS).map(x => `<option value="${x.id}" ${ui.mrcItem === x.id ? "selected" : ""}>${x.icon} ${x.name}</option>`).join("")}</select></div>
              <div class="field"><label>Tasarım</label><select id="mrc-design">${Object.values(K.merch.DESIGNS).map(x => `<option value="${x.id}" ${ui.mrcDesign === x.id ? "selected" : ""}>${x.icon} ${x.name}</option>`).join("")}</select></div>
              <div class="field"><label>Adet</label><input id="mrc-stock" class="input" type="number" min="50" max="5000" step="50" value="${ui.mrcStock}"></div>
              <div class="field"><label>Fiyat ×</label><input id="mrc-price" class="input" type="number" min="0.6" max="1.8" step="0.05" value="${ui.mrcPriceMult}"></div>
            </div>
            <div class="xg-stats">
              <div class="xg-stat"><div class="k">Maliyet</div><div class="v hot">${U.money(est)}</div></div>
              <div class="xg-stat"><div class="k">Birim fiyat</div><div class="v">${U.money(priced)}</div></div>
              <div class="xg-stat"><div class="k">Tükense gelir</div><div class="v money">${U.money(priced * ui.mrcStock)}</div></div>
              <div class="xg-stat"><div class="k">Tahmini kâr</div><div class="v ${priced * ui.mrcStock - est > 0 ? "money" : "hot"}">${U.money(priced * ui.mrcStock - est)}</div></div>
            </div>
            <div class="helper">Fiyat yükseldikçe satış düşer. Stok fazlaysa elde kalır — üretim maliyeti geri gelmez.</div>
            <button class="btn btn-primary btn-sm" data-act="mrc-launch">Drop Başlat · ${U.money(est)}</button>
            ${K.state.day < m.cooldownDay ? `<div class="helper">Üretim molası: ${m.cooldownDay - K.state.day} gün.</div>` : ""}` : "")}
          ${m.drops.length ? `<div class="xg-rows">${m.drops.slice(0, 4).map(d => `
            <div class="xg-row done">
              <span class="xg-row-ico">${K.merch.ITEMS[d.itemId].icon}</span>
              <div class="xg-row-main"><b>${d.sold}/${d.units} ${d.soldOut ? "· TÜKENDİ 🔥" : ""}</b>
                <span>gelir ${U.money(d.revenue)} · net ${U.money(d.profit)}</span></div>
            </div>`).join("")}</div>` : ""}
        </div>`);
      }

      /* ---------- 2) VARLIK & GÖSTERİŞ ---------- */
      {
        const sum = K.assets.summary();
        parts.push(`<div class="c-block">
          <div class="xg-head">
            <span class="xg-ico">🏎️</span>
            <div class="xg-txt"><h3>Varlık & Gösteriş</h3>
              <p>Varlıklar statü kazandırır ama <b>aylık bakım</b> ister. Ödeyemezsen imaj zarar görür.</p></div>
            <div class="xg-big">${sum.count}</div>
          </div>
          <div class="xg-stats">
            <div class="xg-stat"><div class="k">Toplam değer</div><div class="v">${U.money(sum.totalCost)}</div></div>
            <div class="xg-stat"><div class="k">Aylık bakım</div><div class="v hot">${U.money(sum.upkeep)}</div></div>
            <div class="xg-stat"><div class="k">Pasif gelir</div><div class="v money">${U.money(sum.income)}</div></div>
          </div>
          ${sum.owned.length ? `<div class="xg-rows">${sum.owned.map(x => `
            <div class="xg-row">
              <span class="xg-row-ico">${x.icon}</span>
              <div class="xg-row-main"><b>${U.escape(x.name)}</b>
                <span>aylık bakım ${U.money(x.upkeep)}${x.income ? " · gelir " + U.money(x.income) : ""}</span></div>
              <button class="btn btn-ghost btn-xs" data-act="ast-sell" data-arg="${x.id}">Sat</button>
            </div>`).join("")}</div>` : ""}
          <div class="xg-grid">
            ${K.assets.ASSETS.filter(x => !K.assets.owns(x.id)).map(x => {
              const c = K.assets.canBuy(x.id);
              return `<button class="xg-opt ${c.ok ? "" : "locked"}" ${c.ok ? `data-act="ast-buy" data-arg="${x.id}"` : "disabled"}>
                <b>${x.icon} ${U.escape(x.name)}</b>
                <span class="xg-cost">${U.money(x.cost)}</span>
                <span>bakım ${U.money(x.upkeep)}/ay · imaj +${x.img}</span>
                <span>${c.ok ? U.escape(x.note) : U.escape(c.why)}</span>
              </button>`; }).join("")}
          </div>
        </div>`);
      }

      /* ---------- 3) BAŞKASI İÇİN YAZMAK ---------- */
      {
        const w = K.writing.summary();
        parts.push(`<div class="c-block">
          <div class="xg-head">
            <span class="xg-ico">✍️</span>
            <div class="xg-txt"><h3>Başkası İçin Yazmak</h3>
              <p>Hook/verse yaz, para kazan, network kur. <b>Gölge</b> seçersen adın geçmez (ücret ×1,35) ama açığa çıkma riski birikir.</p></div>
            <div class="xg-big">${w.craft}</div>
          </div>
          <div class="xg-stats">
            <div class="xg-stat"><div class="k">Ustalık</div><div class="v">${w.craft}</div></div>
            <div class="xg-stat"><div class="k">Kredili iş</div><div class="v">${w.credited}</div></div>
            <div class="xg-stat"><div class="k">Gölge iş</div><div class="v hot">${w.ghostJobs}</div></div>
            <div class="xg-stat"><div class="k">Toplam</div><div class="v money">${U.money(w.totalEarned)}</div></div>
          </div>
          ${w.exposed ? `<div class="helper">⚠️ ${w.exposed} kez açığa çıktın — imaj ve itibar zarar gördü.</div>` : ""}
          ${w.active ? `<div class="xg-rows"><div class="xg-row">
              <span class="xg-row-ico">${w.active.icon}</span>
              <div class="xg-row-main"><b>${U.escape(w.active.artistName)} · ${U.escape(w.active.scopeName)}</b>
                <span>${w.active.daysLeft} gün kaldı · ${w.active.mode === "ghost" ? "GÖLGE" : "kredili"} · ${U.money(w.active.fee)}</span></div>
            </div></div>` : (w.offers.length ? `<div class="xg-rows">${w.offers.map(o => `
            <div class="xg-row">
              <span class="xg-row-ico">${o.icon}</span>
              <div class="xg-row-main"><b>${U.escape(o.artistName)} · ${U.escape(o.scopeName)}</b>
                <span>${U.money(o.fee)} · ${o.days} gün · ustalık ${o.quality}</span></div>
              <button class="btn btn-primary btn-xs" data-act="wr-accept" data-arg="${o.id}" data-mode="credit">Kredili</button>
              <button class="btn btn-ghost btn-xs" data-act="wr-accept" data-arg="${o.id}" data-mode="ghost">Gölge</button>
              <button class="btn btn-ghost btn-xs" data-act="wr-decline" data-arg="${o.id}">Ret</button>
            </div>`).join("")}</div>` : `<div class="helper">Şu an teklif yok. Şöhretin ve ustalığın arttıkça daha çok iş gelir.</div>`)}
        </div>`);
      }

      /* ---------- 4) ULUSLARARASI ---------- */
      {
        const it2 = K.intl.summary();
        parts.push(`<div class="c-block">
          <div class="xg-head ok">
            <span class="xg-ico">🌍</span>
            <div class="xg-txt"><h3>Uluslararası · ${U.escape(it2.stageLabel)}</h3>
              <p>Diaspora pazarına gir, turne yap, yabancı feature al. Nüfuz aylık <b>yurt dışı telif</b> üretir.</p></div>
            <div class="xg-big">${U.money(it2.monthly)}</div>
          </div>
          ${it2.touring ? `<div class="helper">✈️ Turne sürüyor: ${U.escape((K.intl.market(it2.touring.marketId) || {}).name || "")} · ${it2.touring.daysLeft} gün kaldı.</div>` : ""}
          <div class="xg-rows">${it2.markets.map(m => `
            <div class="xg-row ${m.entered ? "" : "locked"}">
              <span class="xg-row-ico">${m.icon}</span>
              <div class="xg-row-main">
                <b>${U.escape(m.name)}${m.entered ? ` · nüfuz ${m.pen}` : ""}</b>
                <span>${m.entered ? `hedef ${m.target} · pazar gücü ×${m.size}` : `giriş ${U.money(m.unlock)} · pop ${m.minPop}`}</span>
                ${m.entered ? `<div class="xg-bar" style="margin-top:5px"><i style="width:${m.pen}%"></i></div>` : ""}
              </div>
              ${m.entered
                ? `<button class="btn btn-ghost btn-xs" data-act="in-tour" data-arg="${m.id}">Turne</button>
                   <button class="btn btn-ghost btn-xs" data-act="in-feature" data-arg="${m.id}">Feature</button>`
                : `<button class="btn btn-primary btn-xs" data-act="in-enter" data-arg="${m.id}">Gir</button>`}
            </div>`).join("")}</div>
          <div class="helper">Not: yurt dışı vergi ve lojistik kalemleri dahildir; vize reddi ya da bütçe aşımı olabilir.</div>
        </div>`);
      }

      /* ---------- 5) KARANLIK TARAF ---------- */
      {
        const sh = K.shady.summary();
        parts.push(`<div class="c-block">
          <div class="xg-dark">
            <h3>🎰 Karanlık Taraf — kısa yol</h3>
            <p>Sahte dinlenme ve playlist payolası sana zaman kazandırır. Ama iz bırakır:
tespit edilirse dinlenme silinir, imaj ve itibar yanar. <b>3 strike = 60 gün platform yasağı</b> (telif ×0,45).</p>
            ${sh.banned ? `<div class="xg-warn">⛔ Şu an YASAKLISIN — ${sh.bannedLeft} gün kaldı (telif ×${sh.incomeMult.toFixed(2)})</div>` : ""}
            <div class="xg-bar-row" style="margin-top:9px"><span style="font-size:11px;color:var(--text-3)">Şüphe</span>
              <div class="xg-bar hot"><i style="width:${sh.suspicion}%"></i></div><b>${sh.suspicion}</b></div>
            <div class="helper">Günlük tespit şansı: %${(sh.detectChance * 100).toFixed(1)} · strike ${sh.strikes}/3${sh.everUsed ? "" : " · hiç kullanmadın (temiz kariyer ödülü 360. günde)"}</div>
          </div>
          <div class="xg-grid">
            ${K.shady.BOT_TIERS.map(t => `<button class="xg-opt" data-act="sh-bot" data-arg="${t.id}" ${sh.banned ? "disabled" : ""}>
              <b>${t.icon} ${U.escape(t.name)}</b>
              <span class="xg-cost">${U.money(t.cost)}</span>
              <span>+${U.compact(t.streams)} dinlenme · şüphe +${t.susp}</span>
            </button>`).join("")}
            <button class="xg-opt" data-act="sh-payola" ${sh.banned ? "disabled" : ""}>
              <b>📻 Küratör (payola)</b>
              <span class="xg-cost">${U.money(K.shady.PAYOLA_COST)}</span>
              <span>en yeni şarkıyı listeye sokar · şüphe +10</span>
            </button>
          </div>
        </div>`);
      }

      return `<div class="xg-block">${parts.join("")}</div>`;
    },

    /* ---------------- kariyer detayı ---------------- */
  };
})(window.K);
