/* ============================================================
   KARMA — apps/youtube.js  (kapsamlı)
   Ana Sayfa · Shorts · Abonelikler · Kanalım · Arama
   İzleme sayfası (beğeni, abone, açıklama, yorumlar, sıradaki)
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  function videoRow(v, channelName, channelId) {
    const bg = v.art ? `background-image:url('${v.art}');background-size:cover;background-position:center` : `background:${U.gradientFor(v.coverSeed || v.title)}`;
    return `<div class="yt-video" data-pact="watch" data-arg="${U.escape(v.id || v.title)}|${U.escape(channelName)}|${channelId || ""}|${v.views}">
      <div class="yt-thumb" style="${bg}">
        <div class="play-tri"></div>
        <span class="dur">${Math.floor((v.duration || 180) / 60)}:${String((v.duration || 180) % 60).padStart(2, "0")}</span>
      </div>
      <div class="grow" style="min-width:0">
        <div class="vt">${U.escape(v.title)}</div>
        <div class="vm">${U.escape(channelName)} · ${U.views(v.views)} · ${v.day ? U.ago(v.day, K.state.day) : "yakın zamanda"}</div>
      </div>
      <button class="t-more" data-pact="yt-more" data-arg="${U.escape(v.id)}|${U.escape(channelId || "")}" title="Diğer">⋯</button>
    </div>`;
  }

  /* =====================================================
     YOUTUBE BİLDİRİMLERİ (rozet + merkez)
     ===================================================== */
  K.ytnotif = {
    list() {
      const s = K.state, p = s.player;
      const app = K.phone.appById("youtube");
      if (!app) return [];
      const all = app.allVideos();
      const out = [];

      // abone olunan kanalların yeni videoları
      K.artistList().filter(a => K.interactions.isSubbed(a.id)).slice(0, 6).forEach((a, i) => {
        const v = all.find(x => x.channelId === a.id);
        if (!v) return;
        out.push({ id: "nv_" + a.id + s.day, kind: "video", icon: "▶️", who: a.stageName, artistId: a.id,
          text: "yeni video yayınladı: " + v.title, day: Math.max(1, s.day - i) });
      });

      // kendi videolarına beğeni / yorum
      all.filter(v => v.mine).slice(-3).forEach(v => {
        out.push({ id: "lk_" + v.id + s.day, kind: "like", icon: "❤️",
          who: K.util.compact(Math.round((v.views || 0) * 0.05)) + " kişi",
          text: '"' + v.title.replace(" (Official Video)", "") + '" videonu beğendi', day: s.day });
        out.push({ id: "cm_" + v.id + s.day, kind: "comment", icon: "💬",
          who: K.util.randInt(4, 60) + " yeni yorum",
          text: '"' + v.title.replace(" (Official Video)", "") + '" videosuna yorum yapıldı', day: s.day });
      });

      // yeni aboneler (kanalına)
      const h = K.util.hashHue(String(s.day));
      [0, 1].forEach(i => {
        const a = K.artistList()[(h + i * 7) % K.artistList().length];
        if (a) out.push({ id: "sb_" + a.id + s.day + i, kind: "sub", icon: "🔔", who: a.stageName, artistId: a.id,
          text: "kanalına abone oldu", day: s.day });
      });

      // yeni klip duyurusu
      (p.songs || []).slice(-2).forEach(sg => {
        out.push({ id: "rel_" + sg.id, kind: "release", icon: "🎬", who: p.stageName,
          text: '"' + sg.title + '" klibi yayında', day: sg.publishedDay || s.day });
      });

      return out.sort((a, b) => b.day - a.day);
    },

    unread() {
      const rd = K.state.player.ytReadDay || 0;
      return K.ytnotif.list().filter(n => (n.day || 0) > rd).length;
    },

    markRead() { K.state.player.ytReadDay = K.state.day; },

    view() {
      const U = K.util;
      const list = K.ytnotif.list();
      return {
        title: "Bildirimler", sub: "YouTube · " + list.length + " kayıt",
        shellClass: "app-youtube",
        navRight: list.length ? `<button class="mini-btn" data-pact="yt-clear">Temizle</button>` : "",
        render: () => list.length
          ? list.map(n => `<div class="x-notif">
              <div class="xf-icon ${U.escape(n.kind || "")}">${n.icon || "🔔"}</div>
              <div class="grow">
                <div class="xf-text"><b>${U.escape(n.who || "")}</b> ${U.escape(n.text || "")}</div>
                <div class="xf-day">${U.ago(n.day || 1, K.state.day)}</div>
              </div>
            </div>`).join("")
          : `<div class="empty-note"><b>Bildirim yok</b>Kanalına abone ol, video izle ve paylaş — buraya düşer.</div>`,
        onAction: (act) => {
          if (act === "yt-clear") { K.ytnotif.markRead(); K.toast("🔔 Okundu olarak işaretlendi", "", "ok"); K.phone.reRender(); }
        }
      };
    }
  };

  K.phone.register({
    id: "youtube", name: "YouTube", icon: "▶", iconClass: "ic-youtube", dock: false,
    unread: () => K.ytnotif.unread(),

    render(params) {
      const view = {
        title: "YouTube", sub: "Müzik videoları & klipler",
        shellClass: "app-youtube",
        tabPos: "bottom",
        tabs: [
          { id: "home", label: "Ana Sayfa", icon: "🏠" },
          { id: "shorts", label: "Shorts", icon: "🎬" },
          { id: "subs", label: "Abonelikler", icon: "🔔" },
          { id: "library", label: "Kütüphane", icon: "📚" },
          { id: "mine", label: "Kanalım", icon: "👤" }
        ],
        activeTab: params.tab || "home",
        state: { q: "", filter: "all" },
        navRight: (() => {
          const n = K.ytnotif.unread();
          return `<button class="nav-bell" data-pact="yt-notifs">🔔${n ? `<b>${Math.min(99, n)}</b>` : ""}</button>`;
        })(),
        render: (tab) => {
          const app = K.phone.appById("youtube");
          if (tab === "shorts") return app.shortsHTML();
          if (tab === "subs") return app.subsHTML();
          if (tab === "library") return app.libraryHTML();
          if (tab === "mine") return app.mineHTML();
          return app.homeHTML(view);
        },
        onMount: (root) => {
          const input = U.qs("[data-yt-search]", root);
          if (input) {
            const box = U.qs("[data-yt-results]", root);
            const draw = () => { box.innerHTML = input.value.trim() ? K.phone.appById("youtube").searchHTML(input.value) : ""; };
            input.addEventListener("input", draw);
          }
        },
        onAction: (act, el, v) => {
          const app = K.phone.appById("youtube");
          if (act === "watch") { const parts = el.dataset.arg.split("|"); app.watch(parts[0], parts[1], parts[2]); }
          else if (act === "open-channel") app.openChannel(el.dataset.arg);
          else if (act === "sub") { K.interactions.toggleSub(el.dataset.arg); K.phone.reRender(); }
          else if (act === "yt-more") { const q = (el.dataset.arg || "").split("|"); app.moreMenu(q[0], q[1]); }
          else if (act === "yt-shorts-save") { const on = K.interactions.toggleSave("yt_" + el.dataset.arg); K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", "", "ok"); K.phone.reRender(); }
          else if (act === "yt-shorts-cmt") { const q = (el.dataset.arg || "").split("|"); app.openComments(q[0], q[1], q[2]); }
          else if (act === "yt-comments") { app.openComments(v.id, v.channel, v.channelId); }
          else if (act === "yt-filter") {
            v.state.filter = el.dataset.arg;
            U.qsa("[data-ytf]", U.qs(".app-body")).forEach(b => b.classList.toggle("active", b.dataset.arg === el.dataset.arg));
            const box = U.qs("[data-yt-list]");
            if (box) box.innerHTML = app.listFor(v.state.filter);
          }
          else if (act === "yt-notifs") {
            K.ytnotif.markRead();
            K.phone.pushView(K.ytnotif.view());
          }
          else if (act === "yt-playlist") app.openYTPlaylist(el.dataset.arg);
          else if (act === "yt-analytics") app.openAnalytics();
        }
      };
      return view;
    },

    /* filtreye göre video listesi */
    listFor(filter) {
      const app = K.phone.appById("youtube");
      const vids = app.allVideos();
      const list = (!filter || filter === "all") ? vids
        : filter === "mine" ? vids.filter(v => v.mine)
        : vids.filter(v => v.kind === filter);
      const rows = list.slice(0, 18).map(v => videoRow(v, v.channel, v.channelId)).join("");
      return rows || `<div class="mini-empty">Bu kategoride video yok.</div>`;
    },

    /* videos listesi (gerçek şarkılar + liste müzikleri) */
    allVideos() {
      let vids = [];
      K.artistList().forEach(a => {
        K.platforms.npcSongs(a.id, 3).forEach((sg, i) => {
          vids.push({
            id: sg.id, title: sg.title + " (Official Video)", views: Math.round((sg.streams || 0) * 1.4),
            duration: sg.duration || 180, coverSeed: sg.coverSeed, art: sg.art, kind: "clip",
            channel: a.stageName, channelId: a.id, day: Math.max(1, K.state.day - ((i * 17 + 5) % 60))
          });
        });
      });
      K.state.player.songs.forEach(sg => {
        vids.push({
          id: sg.id, title: sg.title + " (Official Video)", views: sg.youtubeViews,
          duration: 185, coverSeed: sg.coverSeed, art: null, kind: "clip",
          channel: K.state.player.stageName, channelId: "player", mine: true, day: sg.publishedDay
        });
      });
      // liste (chart) müzik videoları — "Müzik" filtresi
      (K.state.chart || []).filter(e => !e.mine).slice(0, 20).forEach((e, i) => {
        vids.push({
          id: "music_" + (e.id || i), title: e.title + " (Official Video)",
          views: (e.total || (e.daily || 0) * 30), duration: 190, coverSeed: "ch" + i, art: e.art || null,
          kind: "music", channel: e.artistName, channelId: e.artistId || "", day: K.state.day
        });
      });
      return vids.sort((a, b) => b.views - a.views);
    },

    /* kanal analitiği (reklam geliri dahil) */
    analytics() {
      const p = K.state.player;
      const all = K.phone.appById("youtube").allVideos().filter(v => v.mine);
      const dailyYt = (p.songs || []).reduce((n, s) => n + (s.lastDaily || 0), 0) * 0.3;
      const monthViews = Math.round(dailyYt * 30);
      const totalViews = K.platforms.playerTotals().youtube;
      const watchHours = Math.round(totalViews * (185 / 3600));
      const estRevenue = Math.round(monthViews * 0.008);   // YouTube birim ücreti (telifle aynı)
      const top = all.slice().sort((a, b) => b.views - a.views)[0];
      return { monthViews, totalViews, watchHours, estRevenue, top, subs: p.ytSubs, count: all.length };
    },

    /* İZLEYİCİ TUTMA eğrisi (20 nokta, %).
       YouTube'da tipik: yüksek başlangıç → hızlı düşüş → plato → final düşüşü.
       Kalite düşükse tutma azalır; viral/hook işler daha iyi tutar. */
    retentionCurve(song) {
      if (!song) return [];
      const q = (song.quality || 50) / 100;
      const N = 20, raw = [];
      for (let i = 0; i < N; i++) {
        const x = i / (N - 1);
        let y = 0.55 + 0.45 * Math.exp(-x * 2.6);       // temel düşüş eğrisi
        y += q * 0.12 * (1 - x * 0.5);                  // kalite tutmayı artırır
        y -= (1 - q) * 0.25 * x;                        // düşük kalite = daha çok kayıp
        if (song.viral) y += 0.05 * (1 - x);            // viral işler daha iyi tutar
        if ((song.kind || "") === "diss") y += 0.03 * (1 - x);
        if (x > 0.88) y -= 0.05;                        // outro düşüşü
        raw.push(Math.max(0.12, y));
      }
      const first = raw[0] || 1;                         // %100'den başlat (gerçekçi)
      return raw.map(v => Math.round(Math.max(15, Math.min(100, (v / first) * 100))));
    },

    /* TRAFİK KAYNAKLARI — oyuncunun durumuna göre dağılım (toplam 100) */
    trafficSources() {
      const p = K.state.player;
      const songs = p.songs || [];
      const tiktok = songs.some(s => s.sound && s.sound.trend);
      const shorts = songs.some(s => s.sound && s.sound.videos > 5000);
      const playlists = songs.some(s => s.playlists && s.playlists.length);
      const viral = songs.some(s => s.viral);
      const famous = (p.popularity || 0) >= 40;
      const src = {
        "YouTube arama": 22,
        "Önerilen videolar": 18,
        "Ana sayfa / göz atma": 15,
        "Shorts akışı": 12,
        "Harici (TikTok/IG)": 10,
        "Doğrudan / bilinmiyor": 8,
        "Çalma listeleri": 6,
        "Bildirimler": 5
      };
      if (tiktok || shorts) { src["Shorts akışı"] += 18; src["Harici (TikTok/IG)"] += 14; }
      if (viral) src["Önerilen videolar"] += 16;
      if (playlists) src["Çalma listeleri"] += 12;
      if (famous) { src["Ana sayfa / göz atma"] += 8; src["Bildirimler"] += 6; }
      const total = Object.keys(src).reduce((a, k) => a + src[k], 0) || 1;
      const arr = Object.keys(src).map(k => ({ name: k, pct: Math.round((src[k] / total) * 100) }));
      // yuvarlama farkını en büyüğe ekle
      const diff = 100 - arr.reduce((a, s) => a + s.pct, 0);
      arr.sort((a, b) => b.pct - a.pct);
      if (arr[0]) arr[0].pct += diff;
      return arr;
    },

    /* ---------- DETAYLI ANALİTİK (YouTube Studio · SEKMELİ) ---------- */
    openAnalytics() {
      const app = K.phone.appById("youtube");
      const p = K.state.player;
      const an = app.analytics();
      const songs = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0));
      const latest = songs[0];
      const ret = latest ? app.retentionCurve(latest) : [];
      const avgRet = ret.length ? Math.round(ret.reduce((a, b) => a + b, 0) / ret.length) : 0;
      const duration = (latest && latest.duration) || 185;
      const src = app.trafficSources();
      const subsSeries = K.stats.series("ytSubs", 30);
      const subsHas = subsSeries.some(v => v > 0);
      const netSubs = subsHas ? subsSeries[subsSeries.length - 1] - subsSeries[0] : 0;
      const deltas = subsSeries.map((v, i) => i ? v - subsSeries[i - 1] : 0).slice(1);
      const bestDay = deltas.length ? Math.max.apply(null, deltas) : 0;
      const avgDay = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;
      const topSrc = src[0] || { name: "—", pct: 0 };

      /* segmentler: ilk 30 sn / orta / son */
      const N = ret.length;
      const segFirst = N ? ret[Math.min(N - 1, Math.round((30 / duration) * (N - 1)))] : 0;
      const segMid = N ? ret[Math.round((N - 1) / 2)] : 0;
      const segEnd = N ? ret[N - 1] : 0;

      /* kanal sağlığı skoru */
      const health = Math.round(U.clamp(
        avgRet * 0.55 + (subsHas ? U.clamp(netSubs / 8, 0, 25) : 12) + U.clamp(an.monthViews / 20000, 0, 20), 0, 100));
      const healthLabel = health >= 75 ? "Mükemmel" : health >= 55 ? "İyi" : health >= 35 ? "Gelişmeli" : "Zayıf";
      const healthColor = health >= 75 ? "#4ade80" : health >= 55 ? "#facc15" : health >= 35 ? "#fb923c" : "#f87171";

      /* ortak Studio bileşenleri (js/ui/studio.js) */
      const card = K.studio.card, note = K.studio.note, stat = K.studio.stat;
      const deltaChip = (v) => `<span style="font-size:11px;font-weight:700;color:${v >= 0 ? "#4ade80" : "#f87171"}">${v >= 0 ? "▲ +" : "▼ "}${U.fmt(v)} abone</span>`;

      const retNote = avgRet >= 72
        ? ["🟢", "Giriş çok iyi tutuyor; bu yapıyı bozmadan sürdür.", "rgba(74,222,128,.14)"]
        : avgRet >= 55
          ? ["🟡", "Fena değil. İlk 30 saniyeyi biraz kısaltıp hook'u daha öne al.", "rgba(250,204,21,.13)"]
          : ["🔴", "İzleyici erken kaçıyor: girişi uzatma, nakaratı ilk 15 saniyeye taşı.", "rgba(248,113,113,.15)"];
      const retNote2 = (latest && latest.viral) ? " Viral işin var — kısa videoda sesi sıcak tutmaya devam et."
        : (latest && (latest.playlists || []).length) ? " Editoryal listelerin tutmaya katkı sağlıyor."
        : " TikTok/Shorts'ta ilk 30 sn'lik bir kesit paylaşmak tutmayı artırır.";

      const trafficNote = (topSrc.name.indexOf("Shorts") >= 0 || topSrc.name.indexOf("Harici") >= 0)
        ? ["🎬", `Ana kaynağın <b>${topSrc.name}</b>. Kısa video trendini sıcak tut; TikTok ses sayfasını ihmal etme.`, "rgba(255,92,122,.13)"]
        : topSrc.name.indexOf("Önerilen") >= 0
          ? ["🔁", "YouTube seni öneriyor — izleyici videoyu bitiriyor demek; aynı tarzı sürdür.", "rgba(110,195,255,.13)"]
          : topSrc.name.indexOf("arama") >= 0
            ? ["🔍", "Trafiğin çoğu aramadan. Başlık ve etiketleri güçlendirerek bu kanalı büyüt.", "rgba(250,204,21,.13)"]
            : ["🛰️", `Trafiğin çoğu <b>${topSrc.name}</b>. Yayın öncesi pitch ve sosyal tanıtımı artır.`, "rgba(255,255,255,.06)"];

      const subsNote = subsHas
        ? (netSubs > 0
          ? ["📈", `Günde ortalama <b>${avgDay >= 0 ? "+" : ""}${U.fmt(avgDay)} abone</b>${bestDay > 0 ? ` (en iyi gün +${U.fmt(bestDay)})` : ""}. Yükleme sıklığını artırmak ivmeyi hızlandırır.`, "rgba(74,222,128,.14)"]
          : ["📉", "Abone artışı durdu. Yeni bir kısa video veya sürpriz single ivmeyi geri getirir.", "rgba(248,113,113,.15)"])
        : ["⏳", "Abone geçmişi yeni birikiyor; birkaç gün geçince grafik anlam kazanacak.", "rgba(255,255,255,.06)"];

      K.phone.pushView({
        title: "YouTube Studio", sub: "Analitik", shellClass: "app-youtube",
        tabs: [
          { id: "genel", label: "Özet" },
          { id: "tutma", label: "Tutma" },
          { id: "trafik", label: "Trafik" },
          { id: "abone", label: "Abone" }
        ],
        activeTab: "genel",
        render: (tab) => {
          if (tab === "tutma") {
            return card(`
              <div class="studio-head baseline">
                <div class="studio-title">İzleyici Tutma</div>
                <div style="font-size:11px;color:var(--text-3)">${latest ? U.escape(latest.title) : "—"} · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}</div>
              </div>
              ${latest ? K.stats.sparkline(ret, { color: "#6ec3ff", h: 96 }) : `<div class="mini-empty">Şarkı yok.</div>`}
              <div class="studio-axis"><span>0:00</span><span>Yarı</span><span>Son</span></div>
              ${note("🕒", `Ortalama izlenme süresi <b>%${avgRet}</b> · ilk 30 sn sonrası tutma <b>%${segFirst}</b>`, "rgba(110,195,255,.12)")}
              ${note(retNote[0], retNote[1] + retNote2, retNote[2])}
            `, "#6ec3ff")
            + card(`
              <div class="studio-title sm">Bölüm Bölüm Tutma</div>
              ${[["İlk 30 sn", segFirst, "#6ec3ff"], ["Orta kısım", segMid, "#a78bfa"], ["Son bölüm", segEnd, "#f472b6"]].map(([l, v, c]) => `
                <div class="studio-row">
                  <div class="studio-row-label sm">${l}</div>
                  <div class="studio-bar"><i class="studio-bar-fill" style="width:${v}%;background:${c}"></i></div>
                  <div class="studio-row-val">${v}%</div>
                </div>`).join("")}
            `, "#a78bfa");
          }
          if (tab === "trafik") {
            return card(`
              <div class="studio-head">
                <div class="studio-title">Trafik Kaynakları</div>
                <span class="pill hot" style="font-size:9.5px">#1 ${U.escape(topSrc.name)} ${topSrc.pct}%</span>
              </div>
              ${src.map((s, i) => `<div class="studio-row">
                <div class="studio-row-label">${U.escape(s.name)}</div>
                <div class="studio-bar lg"><i class="studio-bar-fill" style="width:${s.pct}%;background:linear-gradient(90deg,${i === 0 ? "#ff5c7a,#ff8a5c" : "#7c5cff,#b06cff"})"></i></div>
                <div class="studio-row-val">${s.pct}%</div>
              </div>`).join("")}
              ${note(trafficNote[0], trafficNote[1], trafficNote[2])}
            `, "#ff8a5c");
          }
          if (tab === "abone") {
            return card(`
              <div class="studio-head baseline">
                <div class="studio-title">Abone Büyümesi</div>
                <div style="font-size:11px;color:var(--text-3)">30 gün</div>
              </div>
              ${subsHas ? K.stats.sparkline(subsSeries, { color: "#ff5c7a", h: 96 }) : `<div class="mini-empty">Veri birikiyor… günler geçtikçe bu grafik dolar.</div>`}
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                <span style="font-size:11px;color:var(--text-3)">Şu an: <b style="color:var(--text-0)">${U.compact(an.subs)}</b> abone</span>
                ${subsHas ? deltaChip(netSubs) : ""}
              </div>
              ${note(subsNote[0], subsNote[1], subsNote[2])}
            `, "#ff5c7a")
            + card(`
              <div class="studio-title sm">Günlük Ortalama</div>
              <div style="display:flex;gap:8px">
                ${stat("Ort./gün", (avgDay >= 0 ? "+" : "") + U.fmt(avgDay), "rgba(255,92,122,.12)")}
                ${stat("En iyi gün", "+" + U.fmt(bestDay), "rgba(74,222,128,.12)")}
                ${stat("Toplam", U.compact(an.subs), "rgba(255,255,255,.06)")}
              </div>
            `, "#a78bfa");
          }
          // ÖZET
          return `
            <div class="sp-stat-row">
              ${stat("Aylık İzlenme", U.compact(an.monthViews))}
              ${stat("İzlenme Saati", U.fmt(an.watchHours))}
              ${stat("Abone", U.compact(an.subs))}
              ${stat("Gelir/ay", U.money(an.estRevenue))}
            </div>
            ${card(`
              <div class="studio-health">
                <div>
                  <div class="studio-health-label">Kanal Sağlığı</div>
                  <div class="studio-health-val" style="color:${healthColor}">${health}/100 · ${healthLabel}</div>
                </div>
                <div class="studio-health-emoji">${health >= 75 ? "🏆" : health >= 55 ? "👍" : health >= 35 ? "📊" : "⚠️"}</div>
              </div>
              <div class="studio-health-bar"><i style="width:${health}%;background:linear-gradient(90deg,${healthColor},#ff8a5c)"></i></div>
              ${note("🧭", `Tutma %${avgRet} · ana trafik <b>${U.escape(topSrc.name)}</b> · ${subsHas ? "günde " + (avgDay >= 0 ? "+" : "") + U.fmt(avgDay) + " abone" : "abone verisi birikiyor"}`, "rgba(255,255,255,.06)")}
            `, healthColor)}
            ${card(`
              <div class="studio-title sm">Öne Çıkan Video</div>
              ${an.top ? `<div style="display:flex;align-items:center;gap:10px">
                <div style="width:44px;height:44px;border-radius:10px;background:${U.gradientFor(an.top.id || an.top.title)}"></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.escape(an.top.title.replace(" (Official Video)", ""))}</div>
                  <div style="font-size:11px;color:var(--text-3)">${U.compact(an.top.views)} görüntülenme</div>
                </div>
                <button class="btn btn-sm btn-ghost" data-pact="open-channel" data-arg="player">Aç ›</button>
              </div>` : `<div class="mini-empty">Henüz videon yok.</div>`}
              ${note("💡", "Üstteki sekmelerden Tutma / Trafik / Abone detaylarına geçebilirsin.", "rgba(255,255,255,.05)")}
            `, "#7c5cff")}
          `;
        },
        onAction: (act) => {
          if (act === "open-channel") K.phone.openApp("youtube", { tab: "mine" });
        }
      });
    },

    homeHTML(view) {
      const app = K.phone.appById("youtube");
      const f = (view && view.state && view.state.filter) || "all";
      const chips = [["all", "Tümü"], ["clip", "Klipler"], ["music", "Müzik"], ["mine", "Kanallarım"]];
      return `
        <div class="p-search"><span>🔍</span><input data-yt-search type="text" placeholder="YouTube'da ara" /></div>
        <div class="filter-chips">
          ${chips.map(([id, l]) => `<button class="fchip ${f === id ? "active" : ""}" data-ytf data-pact="yt-filter" data-arg="${id}">${l}</button>`).join("")}
        </div>
        <div data-yt-results></div>
        ${K.ui.section("Mağaza Listelerin")}
        ${K.ui.storeLists("YouTube")}
        ${K.ui.section("Sizin için")}
        <div data-yt-list>${app.listFor(f)}</div>`;
    },

    /* ---------------- KÜTÜPHANE ---------------- */
    libraryHTML() {
      const p = K.state.player;
      const all = K.phone.appById("youtube").allVideos();
      const watched = (p.watchHistory || []).map(id => all.find(v => v.id === id)).filter(Boolean).slice(0, 8);
      const liked = all.filter(v => K.interactions.isLiked("yt_" + v.id)).slice(0, 8);
      const saved = all.filter(v => K.interactions.isSaved("yt_" + v.id)).slice(0, 8);
      const block = (title, list, empty) => `${K.ui.section(title, `<span class="muted">${list.length}</span>`)}
        ${list.length ? list.map(v => videoRow(v, v.channel, v.channelId)).join("") : `<div class="mini-empty">${empty}</div>`}`;
      const likedAll = all.filter(v => K.interactions.isLiked("yt_" + v.id));
      return `${K.ui.section("Çalma Listeleri")}
        <div class="p-search" data-pact="yt-playlist" data-arg="liked" style="cursor:pointer">
          <span>♥</span><span style="font-size:12.5px">Beğenilen Müzikler · ${likedAll.length} şarkı</span></div>
        <div class="p-search" data-pact="yt-playlist" data-arg="saved" style="cursor:pointer">
          <span>⤓</span><span style="font-size:12.5px">Kaydedilenler · ${all.filter(v => K.interactions.isSaved("yt_" + v.id)).length} video</span></div>`
        + block("İzlenenler", watched, "Henüz video izlemedin.")
        + block("Beğenilenler", liked, "Beğendiğin video yok.")
        + block("Kaydedilenler", saved, "Kaydettiğin video yok.");
    },

    searchHTML(q) {
      const vids = K.phone.appById("youtube").allVideos().filter(v =>
        v.title.toLowerCase().includes(q.toLowerCase()) || v.channel.toLowerCase().includes(q.toLowerCase()));
      if (!vids.length) return `<div class="mini-empty" style="margin-top:8px">"${U.escape(q)}" için sonuç yok.</div>`;
      return K.ui.section("Sonuçlar") + vids.slice(0, 12).map(v => videoRow(v, v.channel, v.channelId)).join("");
    },

    shortsHTML() {
      const vids = K.phone.appById("youtube").allVideos().slice(0, 10);
      return `<div class="shorts-scroll">
        ${vids.map(v => `<div class="short-card" data-pact="watch" data-arg="${U.escape(v.id)}|${U.escape(v.channel)}|${v.channelId || ""}|${v.views}" style="${v.art ? `background-image:url('${v.art}')` : `background:${U.gradientFor(v.id)}`};background-size:cover;background-position:center">
          <div class="short-ov"></div>
          <div class="short-side">
            <button class="${K.interactions.isLiked("yt_" + v.id) ? "on" : ""}" data-pact="like" data-arg="yt_${U.escape(v.id)}">${K.interactions.isLiked("yt_" + v.id) ? "♥" : "♡"}</button>
            <span>${U.compact(Math.round(v.views * 0.08))}</span>
            <button data-pact="yt-shorts-cmt" data-arg="${U.escape(v.id)}|${U.escape(v.channel)}|${v.channelId || ""}">💬</button>
            <span>${U.compact(Math.round(v.views * 0.004))}</span>
            <button class="${K.interactions.isSaved("yt_" + v.id) ? "on" : ""}" data-pact="yt-shorts-save" data-arg="${U.escape(v.id)}">${K.interactions.isSaved("yt_" + v.id) ? "🔖" : "🏷"}</button>
          </div>
          <div class="short-info">
            <div class="si-channel" data-pact="open-channel" data-arg="${v.channelId}">${U.escape(v.channel)}</div>
            <div class="si-title">${U.escape(v.title.replace(" (Official Video)", ""))}</div>
          </div>
        </div>`).join("")}
      </div>`;
    },

    subsHTML() {
      const subs = K.interactions.followedArtists();
      const subbed = K.artistList().filter(a => K.interactions.isSubbed(a.id));
      const list = subbed.length ? subbed : subs;
      if (!list.length) return `<div class="empty-note"><b>Abonelik yok</b>Kanallara abone olduğunda videolar burada listelenir.</div>`;
      const vids = K.phone.appById("youtube").allVideos().filter(v => list.some(a => a.id === v.channelId));
      return `${K.ui.section("Abone Olunan Kanallar")}
        <div class="sub-scroll">${list.map(a => `<div class="sub-chip" data-pact="open-channel" data-arg="${a.id}">
          ${K.ui.artistAvatar(a.id, 40, true)}<span>${U.escape(a.stageName)}</span></div>`).join("")}</div>
        ${K.ui.section("Yeni Videolar")}
        ${vids.length ? vids.slice(0, 14).map(v => videoRow(v, v.channel, v.channelId)).join("") : `<div class="mini-empty">Bu kanallardan yeni video yok.</div>`}`;
    },

    mineHTML() {
      const p = K.state.player;
      const an = K.phone.appById("youtube").analytics();
      const vids = K.phone.appById("youtube").allVideos().filter(v => v.mine);
      return `
        <div class="yt-channel">
          <div class="yt-channel-head">
            ${K.ui.artistAvatar("player", 54, true)}
            <div><div class="c-name">${U.escape(p.stageName)}</div><div class="c-sub">${U.compact(p.ytSubs)} abone · ${an.count} video</div></div>
          </div>
          <div class="sp-stat-row">
            <div class="sp-stat" style="background:rgba(255,80,80,0.1)"><div class="k">Aylık İzlenme</div><div class="v">${U.compact(an.monthViews)}</div></div>
            <div class="sp-stat" style="background:rgba(255,80,80,0.1)"><div class="k">İzlenme Saati</div><div class="v">${U.fmt(an.watchHours)}</div></div>
            <div class="sp-stat" style="background:rgba(255,80,80,0.1)"><div class="k">Tahmini Gelir/ay</div><div class="v money">${U.money(an.estRevenue)}</div></div>
          </div>
          ${an.top ? `<div class="hint" style="margin-top:6px">📈 En iyi video: <b>${U.escape(an.top.title.replace(" (Official Video)", ""))}</b> · ${U.compact(an.top.views)} görüntülenme · toplam ${U.compact(an.totalViews)} izlenme</div>` : ""}
          <div class="hint">💡 YouTube reklam geliri aylık telif ödemesine dahildir (ay sonunda kasadadır).</div>
          <div class="action-row" style="margin-top:8px"><button class="btn btn-sm btn-primary" data-pact="yt-analytics">📊 Detaylı Analitik (tutma · trafik · abone)</button></div>
        </div>
        ${K.ui.section("Videoların")}
        ${vids.length ? vids.map(v => videoRow(v, p.stageName, "player")).join("")
          : `<div class="mini-empty">Şarkı yayınladığında otomatik klip oluşur.</div>`}`;
    },

    /* ---------- İZLEME SAYFASI (video + gerçek çalan ses) ---------- */
    watch(videoId, channelName, channelId) {
      const app = K.phone.appById("youtube");
      const vids = app.allVideos();
      const v = vids.find(x => x.id === videoId) || vids[0];
      if (!v) return;

      // ŞARKIYI GERÇEKTEN ÇAL
      K.interactions.play({ id: v.id, title: v.title.replace(" (Official Video)", "").replace(" (Canlı Performans)", "").replace(" #shorts", ""), artistName: v.channel, art: v.art });

      // izleme geçmişi
      const p = K.state.player;
      p.watchHistory = (p.watchHistory || []).filter(x => x !== v.id);
      p.watchHistory.unshift(v.id);
      p.watchHistory = p.watchHistory.slice(0, 40);

      const liked = K.interactions.isLiked("yt_" + v.id);
      const savedVid = K.interactions.isSaved("yt_" + v.id);
      const subbed = channelId ? K.interactions.isSubbed(channelId) : false;
      const comments = K.interactions.commentsFor("yt_" + v.id, 6);
      const upNext = vids.filter(x => x.id !== v.id).slice(0, 6);
      const a = channelId && channelId !== "player" ? K.artistById(channelId) : null;
      const subs = a ? a.ytSubs : K.state.player.ytSubs;
      const bg = v.art ? `background-image:url('${v.art}');background-size:cover;background-position:center` : `background:${U.gradientFor(v.id)}`;

      K.phone.pushView({
        title: v.title, sub: channelName, shellClass: "app-youtube",
        render: () => {
          const on = K.audio && K.audio.isPlaying();
          return `
          <div class="yt-player" style="${bg}">
            <div class="yt-player-ov"></div>
            <canvas class="yt-viz" width="600" height="300" data-yt-viz></canvas>
            <button class="yt-play-big" data-pact="yt-toggle">${on ? "⏸" : "▶"}</button>
            <div class="yt-ctrl">
              <div class="yt-prog"><i data-yt-prog style="width:0%"></i></div>
              <div class="yt-times"><span data-yt-cur>0:00</span><span class="muted">önizleme · döngü</span></div>
            </div>
          </div>

          <div class="yt-watch-actions" style="justify-content:center">
            <button data-pact="yt-restart">⏮</button>
            <button class="${on ? "on" : ""}" data-pact="yt-toggle">${on ? "⏸ Duraklat" : "▶ Çal"}</button>
            <button data-pact="yt-next">⏭ Sıradaki</button>
          </div>

          <div class="yt-extras">
            <span class="muted">Hız</span>
            ${[0.75, 1, 1.25, 1.5].map(r => `<button class="yt-chip ${Math.abs((K.audio ? K.audio.rate() : 1) - r) < 0.01 ? "on" : ""}" data-pact="yt-speed" data-arg="${r}">${r}x</button>`).join("")}
            <span class="grow"></span>
            <button class="yt-chip ${(K.state.player.ytAutoplay !== false) ? "on" : ""}" data-pact="yt-autoplay">🔁 Oto sıradaki</button>
          </div>

          <div class="yt-watch-title">${U.escape(v.title)}</div>
          <div class="yt-watch-meta">${U.compact(v.views)} görüntülenme · ${U.ago(v.day || 1, K.state.day)}</div>

          <div class="yt-watch-actions" style="flex-wrap:wrap">
            <button class="${liked ? "on" : ""}" data-pact="like" data-arg="yt_${U.escape(v.id)}">${liked ? "♥" : "♡"} ${U.compact(Math.round(v.views * 0.05))}</button>
            <button data-pact="share">↗ Paylaş</button>
            <button class="${savedVid ? "on" : ""}" data-pact="save">${savedVid ? "🔖 Kaydedildi" : "🔖 Kaydet"}</button>
            <button data-pact="yt-queue-next">⏭ Sonra çal</button>
            <button data-pact="yt-queue-add">🕒 Sıraya ekle</button>
          </div>

          <div class="yt-channel-row">
            ${channelId ? K.ui.artistAvatar(channelId, 40, true) : K.ui.avatar(channelName, 40, true)}
            <div class="grow" data-pact="open-channel" data-arg="${channelId || ""}">
              <div class="cr-name">${U.escape(channelName)}</div>
              <div class="cr-subs">${U.compact(subs)} abone</div>
            </div>
            ${channelId ? `<button class="btn btn-sm ${subbed ? "btn-ghost" : "btn-primary"}" data-pact="sub" data-arg="${channelId}">${subbed ? "Abone ✓" : "Abone Ol"}</button>` : ""}
          </div>

          <div class="yt-desc">
            <b>Açıklama</b>
            <p>${U.escape(channelName)} resmî kanalı. Yeni müzik, klip ve haberler için abone olmayı unutmayın.</p>
            <div class="yt-desc-tags">#müzik #klip #${U.escape(K.state.player.genre)} #yeniyayın</div>
            <div class="hint" style="margin-top:6px">🔊 Ses, şarkının türüne göre tarayıcıda canlı üretilen temsilî bir önizlemedir.</div>
          </div>

          ${(channelId === "player" && K.state.player.songs.find(x => x.id === v.id))
            ? `${K.ui.section("İzleyici Tutma")}
              <div style="background:var(--panel,#17171c);border:1px solid var(--line,#2a2a32);border-radius:12px;padding:10px;margin-bottom:10px">
                ${K.stats.sparkline(app.retentionCurve(K.state.player.songs.find(x => x.id === v.id)), { color: "#6ec3ff", h: 72 })}
                <div class="hint">İlk 30 saniyeyi kısa tut; girişteki düşüş izlenme süresini ve önerilme şansını belirler.</div>
              </div>` : ""}

          ${K.ui.section("Bölümler")}
          <div class="yt-chapters">
            ${[["Intro", 0], ["Verse", 0.28], ["Nakarat", 0.46], ["Verse 2", 0.64], ["Outro", 0.85]].map(([t, pct]) => `
              <div class="yc-row"><span class="yc-time">${K.ui.fmtTime(pct * (v.duration || 180))}</span><span>${t}</span></div>`).join("")}
          </div>

          ${K.ui.section("Yorumlar", `<button class="mini-btn" data-pact="yt-comments">💬 Yorum yaz</button>`)}
          ${comments.map(c => `<div class="cmt">
            ${K.ui.avatar(c.user, 32, true)}
            <div class="grow"><div class="cmt-user">@${U.escape(c.user)} · ${U.ago(c.day, K.state.day)}</div>
            <div class="cmt-text">${U.escape(c.text)}</div>
            <div class="cmt-actions">♡ ${c.likes} · Yanıtla</div></div>
          </div>`).join("")}

          ${K.ui.section("Sıradaki")}
          ${upNext.map(x => videoRow(x, x.channel, x.channelId)).join("")}`;
        },
        onMountFull: (vp) => {
          const canvas = vp.querySelector("[data-yt-viz]");
          const prog = vp.querySelector("[data-yt-prog]");
          const cur = vp.querySelector("[data-yt-cur]");
          if (K.ui._ytVizStop) K.ui._ytVizStop();
          K.ui._ytVizStop = K.ui.startViz(canvas, () => {
            const top = K.phone.views[K.phone.views.length - 1];
            return !!top && top.__ytWatch === true;
          });
          if (K.ui._ytProgTimer) clearInterval(K.ui._ytProgTimer);
          let lastP = 0, loops = 0;
          K.ui._ytProgTimer = setInterval(() => {
            const top = K.phone.views[K.phone.views.length - 1];
            if (!top || !top.__ytWatch) { clearInterval(K.ui._ytProgTimer); K.ui._ytProgTimer = null; return; }
            const A = K.audio;
            const pr = A ? A.progress() : 0;
            const dur = (A && A.loopDuration) ? A.loopDuration() : 14;
            if (prog) prog.style.width = (pr * 100).toFixed(1) + "%";
            if (cur) cur.textContent = K.ui.fmtTime((A && A.elapsed ? A.elapsed() : 0));
            // döngü tamamlandı mı → otomatik sıradaki
            if (A && A.isPlaying() && pr < lastP - 0.35) {
              loops++;
              if (loops >= 2 && K.state.player.ytAutoplay !== false && upNext[0]) {
                clearInterval(K.ui._ytProgTimer); K.ui._ytProgTimer = null;
                app.watch(upNext[0].id, upNext[0].channel, upNext[0].channelId);
                return;
              }
            }
            lastP = pr;
          }, 250);
        },
        __ytWatch: true,
        onAction: (act, el) => {
          if (act === "watch") { const parts = el.dataset.arg.split("|"); app.watch(parts[0], parts[1], parts[2]); }
          else if (act === "open-channel") app.openChannel(el.dataset.arg);
          else if (act === "sub") { K.interactions.toggleSub(el.dataset.arg); K.phone.reRender(); }
          else if (act === "share") K.ui.actionSheet("Paylaş", [
            { label: "💬 DM'de paylaş", onClick: () => K.phone.openApp("messages") },
            { label: "🔗 Bağlantıyı kopyala", onClick: () => K.toast("🔗 Kopyalandı", "", "ok") },
            { label: "𝕏 X'te paylaş", onClick: () => { K.social.createPost("x", `"${v.title.replace(" (Official Video)", "")}" izleyin 🎬`); K.toast("𝕏 Paylaşıldı", "", "ok"); } }
          ]);
          else if (act === "save") {
            const on = K.interactions.toggleSave("yt_" + v.id);
            K.toast(on ? "🔖 Kaydedildi" : "Kaldırıldı", on ? "Videoyu kaydettin." : "Kaydedilenlerden çıkarıldı.", "ok");
            K.phone.reRender();
          }
          else if (act === "yt-queue-next") K.queue.addNext({ id: v.id, title: v.title.replace(" (Official Video)", ""), artistName: v.channel, art: v.art });
          else if (act === "yt-queue-add") K.queue.add({ id: v.id, title: v.title.replace(" (Official Video)", ""), artistName: v.channel, art: v.art });
          else if (act === "yt-comments") app.openComments(v.id, v.channel, v.channelId);
          else if (act === "yt-toggle") {
            if (K.audio) {
              if (K.audio.isPlaying()) K.audio.stop();
              else K.audio.play(K.interactions.nowPlaying() || {});
            }
            K.phone.reRender();
          }
          else if (act === "yt-restart") {
            if (K.audio) K.audio.play(K.interactions.nowPlaying() || {});
            K.phone.reRender();
          }
          else if (act === "yt-next") {
            const nv = upNext[0];
            if (nv) app.watch(nv.id, nv.channel, nv.channelId);
          }
          else if (act === "yt-speed") {
            if (K.audio) K.audio.setRate(parseFloat(el.dataset.arg));
            K.phone.reRender();
          }
          else if (act === "yt-autoplay") {
            K.state.player.ytAutoplay = !(K.state.player.ytAutoplay !== false);
            K.toast("🔁 Oto sıradaki", K.state.player.ytAutoplay ? "Açık" : "Kapalı", "");
            K.phone.reRender();
          }
        }
      });
    },

    /* ---------- ⋯ MENÜ / YORUMLAR ---------- */
    moreMenu(id, channelId) {
      const app = K.phone.appById("youtube");
      const v = app.allVideos().find(x => x.id === id);
      const t = K.tracks.resolve(id);
      const key = "yt_" + id;
      const saved = K.interactions.isSaved(key);
      K.ui.actionSheet((v ? v.title.replace(" (Official Video)", "") : t.title), [
        { label: "▶︎ Şimdi çal", onClick: () => { K.interactions.play({ id, title: t.title, artistName: t.artistName, art: t.art }); K.phone.reRender(); } },
        { label: "⏭ Sonra çal", onClick: () => K.queue.addNext({ id, title: t.title, artistName: t.artistName, art: t.art }) },
        { label: "🕒 Sıraya ekle", onClick: () => K.queue.add({ id, title: t.title, artistName: t.artistName, art: t.art }) },
        { label: saved ? "💾 Kaydı kaldır" : "🔖 Kaydet", onClick: () => { K.interactions.toggleSave(key); K.phone.reRender(); } },
        { label: "💬 Yorumlar", onClick: () => { if (v) app.openComments(v.id, v.channel, v.channelId); } },
        { label: "📺 Kanala git", onClick: () => { if (channelId) app.openChannel(channelId); } },
        { label: "✕ Kapat", onClick: () => {} }
      ]);
    },

    openComments(videoId, channelName, channelId) {
      const key = "yt_" + videoId;
      const list = K.interactions.commentsFor(key, 6);
      K.phone.pushView({
        title: "Yorumlar", sub: list.length + " yorum", shellClass: "app-youtube",
        render: () => `
          ${list.map((c, i) => `<div class="cmt">
            ${K.ui.avatar(c.user, 32, true)}
            <div class="grow"><div class="cmt-user">@${U.escape(c.user)} · ${U.ago(c.day, K.state.day)}${c.mine ? " · sen" : ""}</div>
            <div class="cmt-text">${U.escape(c.text)}</div>
            <div class="cmt-actions">♡ ${c.likes} · <span data-pact="yt-reply" style="cursor:pointer;color:var(--karma-2);font-weight:700">Yanıtla</span></div></div>
          </div>`).join("")}
          <div class="cmt-input"><input placeholder="Yorum ekle..." data-yt-cmt /><button data-pact="yt-cmt-send" data-arg="${U.escape(videoId)}">Gönder</button></div>`,
        onAction: (act) => {
          if (act === "yt-cmt-send") {
            const inp = U.qs("[data-yt-cmt]");
            if (inp && inp.value.trim()) { K.interactions.addComment(key, inp.value.trim()); inp.value = ""; K.toast("💬 Yorum gönderildi", "", "ok"); K.phone.reRender(); }
            else K.toast("Boş yorum", "", "warn");
          } else if (act === "yt-reply") { const inp = U.qs("[data-yt-cmt]"); if (inp) inp.focus(); }
        }
      });
    },

    /* ---------- ÇALMA LİSTESİ ---------- */
    openYTPlaylist(kind) {
      const app = K.phone.appById("youtube");
      const all = app.allVideos();
      const test = kind === "saved" ? "isSaved" : "isLiked";
      const list = all.filter(v => K.interactions[test]("yt_" + v.id));
      const title = kind === "saved" ? "Kaydedilenler" : "Beğenilen Müzikler";
      K.phone.pushView({
        title, sub: list.length + " video", shellClass: "app-youtube",
        render: () => list.length
          ? `${K.ui.section("Tümünü oynat", `<button class="mini-btn" data-pact="yt-play-all">▶</button>`)}
             ${list.map(v => videoRow(v, v.channel, v.channelId)).join("")}`
          : `<div class="empty-note"><b>Liste boş</b>Beğendiğin/kaydettiğin videolar burada birikir.</div>`,
        onAction: (act, el) => {
          if (act === "watch") { const q = el.dataset.arg.split("|"); app.watch(q[0], q[1], q[2]); }
          else if (act === "open-channel") app.openChannel(el.dataset.arg);
          else if (act === "yt-play-all" && list[0]) app.watch(list[0].id, list[0].channel, list[0].channelId);
        }
      });
    },

    /* ---------- KANAL ---------- */
    openChannel(channelId) {
      const app = K.phone.appById("youtube");
      if (channelId === "player" || !channelId) K.phone.openApp("youtube", { tab: "mine" });
      const a = K.artistById(channelId);
      if (!a) return;
      const vids = app.allVideos().filter(v => v.channelId === channelId);
      const subbed = K.interactions.isSubbed(channelId);
      K.phone.pushView({
        title: a.stageName, sub: "Kanal", shellClass: "app-youtube",
        render: () => `
          <div class="yt-banner" style="${a.ytSubs && false ? "" : U.gradientFor(a.id)}"></div>
          <div class="yt-channel">
            <div class="yt-channel-head">
              ${K.ui.artistAvatar(a.id, 54, true)}
              <div class="grow"><div class="c-name">${U.escape(a.stageName)}</div>
              <div class="c-sub">${U.compact(a.ytSubs)} abone · ${vids.length} video</div></div>
            </div>
            <div class="action-row">
              <button class="btn btn-sm ${subbed ? "btn-ghost" : "btn-primary"}" data-pact="sub" data-arg="${channelId}">${subbed ? "Abone ✓" : "🔔 Abone Ol"}</button>
              <button class="btn btn-sm btn-ghost" data-pact="dm" data-arg="${channelId}">💬 DM</button>
            </div>
          </div>
          ${K.ui.section("Videolar")}
          ${vids.length ? vids.map(v => videoRow(v, a.stageName, channelId)).join("") : `<div class="mini-empty">Video bulunamadı.</div>`}`,
        onAction: (act, el) => {
          if (act === "watch") { const [id, ch, chId] = el.dataset.arg.split("|"); app.watch(id, ch, chId); }
          else if (act === "sub") { K.interactions.toggleSub(el.dataset.arg); K.phone.reRender(); }
          else if (act === "dm") K.phone.openApp("messages", { artistId: channelId });
        }
      });
    }
  });
})(window.K);
