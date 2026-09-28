/* ============================================================
   KARMA — apps/news.js
   GÜNDEM uygulaması: kategorilere ayrılmış haberler.
   Sözlerini gündeme bağlarsan etkileşim artar.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  function heatBar(heat) {
    const cls = heat >= 80 ? "hot" : heat >= 60 ? "warm" : "";
    return `<div class="news-heat ${cls}" title="Gündem sıcaklığı"><div class="nh-track"><i style="width:${heat}%"></i></div><span>${heat}°</span></div>`;
  }

  const app = {
    id: "news",
    name: "Gündem",
    icon: "📰",
    iconClass: "ic-news",
    dock: false,

    unread() {
      const s = K.state;
      if (!s) return 0;
      // son 3 günün önemli bildirimleri rozet olur
      return Math.min(9, (s.notifications || []).filter(n => (s.day - (n.day || 0)) <= 2).length);
    },

    render(params) {
      const tabs = [{ id: "all", label: "Tümü" }]
        .concat(K.NEWS_CATEGORIES.map(c => ({ id: c.id, label: c.icon + " " + c.name })));
      return {
        title: "Gündem",
        sub: "Haberler · sözüne konu olacak trendler",
        shellClass: "app-news",
        tabs,
        activeTab: params.cat || "all",
        navRight: `<button class="mini-btn" data-pact="refresh-news" title="Yenile">🔄</button>`,
        render: (tab) => app.listHTML(tab),
        onAction: (act, el) => {
          if (act === "write-topic") {
            const tp = K.news.topicById(el.dataset.arg);
            if (tp && K.careerUI && K.careerUI.openStudioModal) K.careerUI.openStudioModal({ topic: tp });
            else K.toast("Konu bulunamadı", "Gündem yenilenmiş olabilir.", "warn");
          } else if (act === "refresh-news") {
            K.news.refresh(true);
            K.toast("📰 Gündem güncellendi", "Yeni haberler yüklendi.", "ok");
            K.phone.reRender();
          }
        }
      };
    },

    listHTML(tab) {
      if (!K.news.current().length) K.news.refresh(true);
      const groups = K.news.byCategory().filter(g => tab === "all" || g.cat.id === tab);
      const hint = `<div class="news-hint">📝 Bir konuda söz yazıp <b>aynı dönemde</b> yayınlarsan etkileşim (dinlenme + viral) artar.</div>`;
      const hero = app.todayHTML();
      if (!groups.length) return hero + `<div class="empty-note"><b>Bu kategoride haber yok</b>Kısa süre içinde güncellenir.</div>`;
      return hint + hero + groups.map(g => `
        <div class="news-group">
          <div class="news-cat" style="--c:${g.cat.color}"><span>${g.cat.icon}</span> ${U.escape(g.cat.name)}</div>
          ${g.topics.map(tp => app.topicHTML(tp)).join("")}
        </div>`).join("");
    },

    todayHTML() {
      const tp = K.news.today ? K.news.today() : null;
      if (!tp) return "";
      const c = K.newsCatById(tp.cat);
      return `<div class="news-hero" style="--c:${c.color}">
        <div class="nh-kicker">🔥 GÜNÜN GÜNDEMİ</div>
        <div class="nh-title">${U.escape(tp.title)}</div>
        <div class="nh-meta">${c.icon} ${U.escape(c.name)} · ${tp.heat}° gündem sıcaklığı</div>
        <div class="ni-keywords">${tp.keywords.slice(0, 4).map(k => `<span>${U.escape(k)}</span>`).join("")}</div>
        <button class="btn btn-ghost btn-sm" data-pact="write-topic" data-arg="${tp.id}">📝 Günün konusunda söz yaz</button>
      </div>`;
    },

    topicHTML(tp) {
      return `<div class="news-item">
        <div class="ni-head">
          <div class="ni-title">${U.escape(tp.title)}</div>
          ${heatBar(tp.heat)}
        </div>
        <div class="ni-keywords">${tp.keywords.slice(0, 4).map(k => `<span>${U.escape(k)}</span>`).join("")}</div>
        <button class="btn btn-ghost btn-sm" data-pact="write-topic" data-arg="${tp.id}">📝 Bu konuda söz yaz</button>
      </div>`;
    }
  };

  K.phone.register(app);
})(window.K = window.K || {});
