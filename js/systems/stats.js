/* ============================================================
   KARMA — systems/stats.js
   Günlük istatistik geçmişi ve SVG grafik üretimi.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.stats = {
    record() {
      const s = K.state, p = s.player;
      s.history = s.history || [];
      const snap = {
        day: s.day,
        streams: p.streams,
        balance: Math.round(s.balance),
        monthly: p.monthly,
        popularity: Math.round(p.popularity),
        songs: p.songs.length,
        followers: p.ig + p.tiktok + p.x,
        ytSubs: p.ytSubs || 0,
        roster: s.label ? s.label.roster.length : 0
      };
      const last = s.history[s.history.length - 1];
      if (last && last.day === s.day) Object.assign(last, snap);
      else s.history.push(snap);
      if (s.history.length > 400) s.history = s.history.slice(-400);
    },

    series(key, days) {
      const h = K.state.history || [];
      return h.slice(-(days || 30)).map(x => x[key] || 0);
    },

    days(days) {
      const h = K.state.history || [];
      return h.slice(-(days || 30)).map(x => x.day);
    },

    /* sparkline / alan grafiği */
    sparkline(values, opts) {
      opts = opts || {};
      const w = opts.w || 300, h = opts.h || 54, color = opts.color || "#b06cff";
      if (!values.length) return `<div class="mini-empty">Veri yok</div>`;
      const min = Math.min.apply(null, values);
      const max = Math.max.apply(null, values);
      const span = (max - min) || 1;
      const n = values.length;
      const pts = values.map((v, i) => {
        const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
        const y = h - 4 - ((v - min) / span) * (h - 10);
        return [x, y];
      });
      const line = pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
      const area = `0,${h} ` + line + ` ${w},${h}`;
      const id = "g" + Math.random().toString(36).slice(2, 7);
      return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient></defs>
        <polygon points="${area}" fill="url(#${id})"/>
        <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="2.6" fill="${color}"/>
      </svg>`;
    },

    /* çoklu seri (karşılaştırma) */
    multiChart(seriesList, opts) {
      opts = opts || {};
      const w = opts.w || 300, h = opts.h || 90;
      const all = seriesList.reduce((a, s) => a.concat(s.values), []);
      if (!all.length) return `<div class="mini-empty">Veri yok</div>`;
      const min = 0, max = Math.max.apply(null, all) || 1;
      let defs = "", paths = "";
      seriesList.forEach((s, si) => {
        const n = s.values.length;
        const pts = s.values.map((v, i) => {
          const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
          const y = h - 3 - ((v - min) / max) * (h - 8);
          return x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");
        paths += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
      });
      return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${defs}${paths}</svg>`;
    },

    /* büyüme yüzdesi */
    growth(key, days) {
      const a = K.stats.series(key, days);
      if (a.length < 2) return 0;
      const first = a[0] || 0, last = a[a.length - 1] || 0;
      if (!first) return last > 0 ? 100 : 0;
      return Math.round(((last - first) / first) * 100);
    },

    summary() {
      const s = K.state, p = s.player;
      const h = s.history || [];
      const today = h[h.length - 1] || { streams: p.streams, balance: s.balance };
      const weekAgo = h[Math.max(0, h.length - 8)] || today;
      const dailyStreams = Math.max(0, (today.streams - weekAgo.streams) / 7);
      const dailyIncome = Math.max(0, (today.balance - weekAgo.balance) / 7);
      return {
        dailyStreams: Math.round(dailyStreams),
        dailyIncome: Math.round(dailyIncome),
        growthMonthly: K.stats.growth("monthly", 14),
        growthStreams: K.stats.growth("streams", 14),
        growthFollowers: K.stats.growth("followers", 14),
        chartDays: (s.chart || []).filter(e => e.mine).length
      };
    }
  };
})(window.K);
