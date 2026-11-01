/* ============================================================
   KARMA — apps/campaign.js   (v10.73)
   Telefon uygulaması: KAMPANYA PANOSU (yol haritası 01)

   İki sekme:
     · Kampanyalar — yayın başına harcama + sonuç, kanal kırılımı
     · Dönüşüm     — kanal → kohort eşlemesi, kişi/₺1.000 maliyeti

   Veri `systems/campaign.js` defterinden gelir; bu dosya yalnızca
   görünüm üretir, hiçbir hesap yapmaz.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;
  const money = U.money, fmt = U.fmt;

  const pct = (v) => (v == null ? "—" : Math.round(v * 100) + "%");
  const roiTxt = (v) => (v == null ? "—" : (v >= 1 ? "×" : "×") + v.toFixed(2));
  const perfClass = (roi) => (roi == null ? "" : roi >= 1.2 ? "ok" : roi >= 0.9 ? "mid" : "bad");

  function kanalSatiri(ch) {
    return `
      <div class="cmp-ch" data-ch="${ch.id}">
        <span class="cmp-ch-ico">${ch.emoji}</span>
        <span class="cmp-ch-name">${ch.name}</span>
        <span class="cmp-ch-spend">${money(ch.spend)}</span>
        <span class="cmp-ch-out">${fmt(ch.streams)} ▶</span>
        <span class="cmp-ch-fol">+${fmt(ch.followers)}</span>
        <span class="cmp-ch-roi ${perfClass(ch.roi)}">${roiTxt(ch.roi)}</span>
      </div>`;
  }

  function kampanyaHTML() {
    const list = K.campaigns.list();
    if (!list.length) {
      return `
        <div class="fans-wrap">
          <div class="fans-card">
            <div class="fans-card-head"><div>
              <div class="fans-card-title">📊 Kampanya ölçümü</div>
              <div class="fans-card-sub">Henüz ölçülmüş kampanya yok</div>
            </div></div>
            <div class="mini-empty">Yayın hattında bir proje seç, ön kayıt kampanyası aç
              (Stüdyo → Çıkış) veya teaser paylaş. Harcamalar ve sonuçlar burada birikir.</div>
          </div>
          ${K.studio.note("📊", "Kampanya kanalı, harcama ve sonuç üçlüsü ilk teaser/ön kayıt ile birlikte oluşur. Kampanyası olmayan eski yayınlar burada görünmez.", "dim")}
        </div>`;
    }
    const cards = list.map((c) => `
      <div class="fans-card cmp-card">
        <div class="fans-card-head"><div>
          <div class="fans-card-title">${c.settled ? "📈" : "⏳"} ${c.title}</div>
          <div class="fans-card-sub">
            ${money(c.totals.spend)} harcama · ${c.settled ? "sonuç kesinleşti" : "sonuç bekleniyor"}
            ${c.teaserSpend ? ` · ${money(c.teaserSpend)} teaser` : ""}
          </div>
        </div>
        <span class="cmp-roi ${perfClass(c.roi)}">${roiTxt(c.roi)}</span></div>

        <div class="cmp-tot">
          <div><b>${fmt(c.totals.streams)}</b><span>dinlenme</span></div>
          <div><b>+${fmt(c.totals.followers)}</b><span>takipçi</span></div>
          <div><b>${money(c.totals.revenue)}</b><span>gelir</span></div>
          <div><b>${fmt(c.totals.sales)}</b><span>≈ satış</span></div>
        </div>

        <div class="cmp-head-row">
          <span>Kanal</span><span>Harcama</span><span>Dinlenme</span><span>Takipçi</span><span>Getiri</span>
        </div>
        ${c.rows.map(kanalSatiri).join("")}

        <div class="cmp-foot">
          Net <b class="${c.net >= 0 ? "ok" : "bad"}">${money(c.net)}</b>
          ${c.costPerFollower ? ` · takipçi başı ${money(Math.round(c.costPerFollower))}` : ""}
          ${c.totals.presaves ? ` · ${fmt(c.totals.presaves)} ön kayıt` : ""}
        </div>
      </div>`).join("");
    return `<div class="fans-wrap">${cards}
      ${K.studio.note("📊", "<b>Getiri (×)</b> = kanal geliri / kanal harcaması. 1,00'ın altı zarar. <b>≈ satış</b> tahminidir (1.500 dinlenme ≈ 1 birim) ve hiçbir gelir hesabına girmez.", "info")}
    </div>`;
  }

  /* ---------------- 🗓 TAKVİM (yol haritası 16) ---------------- */
  const tempoLabel = { ok: ["Tempo iyi", "ok"], idle: ["Harcama var, plan yok", "warn"], organic: ["Organik çalışıyor", "mid"] };

  function takvimHTML() {
    const r = K.contentCalendar.report();
    const p = K.state.player;
    /* öneri için yayın hattındaki en yakın proje */
    const next = (p.releases || [])
      .filter((x) => !x.done)
      .map((x) => ({ x, day0: (x.startDay || K.state.day) + (x.waitDays || 0) }))
      .filter((o) => o.day0 >= K.state.day)
      .sort((a, b) => a.day0 - b.day0)[0] || null;

    const platRows = r.rows.map((row) => {
      const t = tempoLabel[row.tempo] || tempoLabel.ok;
      const formats = (K.contentCalendar.FORMATS || []).filter((f) => f.plats.indexOf(row.id) >= 0);
      return `
        <div class="cc-plat" data-plat="${row.id}">
          <div class="cc-plat-head">
            <span class="cc-plat-ico">${row.icon}</span>
            <span class="cc-plat-name">${row.name}</span>
            <span class="cc-tempo ${t[1]}">${t[0]}</span>
          </div>
          <div class="cc-plat-nums">
            <span><b>${row.planned}</b> planlı</span>
            <span><b>${row.published}</b> yayınlandı</span>
            <span><b>${row.missed}</b> kaçtı</span>
            <span><b>${row.spend ? money(row.spend) : "—"}</b> kanal harcaması</span>
            <span><b>${row.perPost != null ? fmt(row.perPost) : "—"}</b> dinlenme/gönderi</span>
          </div>
          <div class="cc-quick">
            ${formats.map((f) => `<button class="cc-chip" data-pact="cal-plan" data-plat="${row.id}" data-fmt="${f.id}">${f.icon} + ${f.name}</button>`).join("")}
          </div>
        </div>`;
    }).join("");

    const upcoming = r.upcoming.length ? r.upcoming.map((it) => `
      <div class="cc-item" data-plan="${it.id}">
        <span class="cc-item-day">${it.daysLeft === 0 ? "bugün" : "+" + it.daysLeft + "g"}</span>
        <span class="cc-item-ico">${it.platformIcon}${it.formatIcon}</span>
        <span class="cc-item-name">${it.formatName} · ${it.platformName}</span>
        <button class="cc-mini" data-pact="cal-pub" data-plan="${it.id}">Yayınla</button>
        <button class="cc-mini ghost" data-pact="cal-cancel" data-plan="${it.id}">✕</button>
      </div>`).join("")
      : `<div class="mini-empty">Planlanmış içerik yok. Aşağıdaki hızlı plan düğmelerini kullan ya da önerilen takvimi kur.</div>`;

    return `
      <div class="fans-wrap">
        <div class="fans-card">
          <div class="fans-card-head"><div>
            <div class="fans-card-title">🗓 İçerik takvimi</div>
            <div class="fans-card-sub">Platform · format · gün · kampanya kanalı</div>
          </div>
          <b class="cmp-roi">${r.counts.planned} planlı</b></div>
          <div class="cmp-tot">
            <div><b>${r.counts.planned}</b><span>planlı</span></div>
            <div><b>${r.counts.published}</b><span>yayınlandı</span></div>
            <div><b>${r.counts.missed}</b><span>kaçtı</span></div>
            <div><b>${money(r.totalSpend)}</b><span>kanal harcaması</span></div>
          </div>
          ${r.saturatedCount ? `<div class="cc-warn">⚠ ${r.saturatedCount} günde ${K.contentCalendar.MAX_PER_DAY}'ten fazla plan var — doygunluk etkiyi böler.</div>` : ""}
          ${next ? `<button class="btn btn-primary" data-pact="cal-suggest" data-rel="${next.x.id}">Önerilen takvimi kur · ${next.x.title}</button>` : ""}
        </div>

        <div class="fans-card cc-plats">${platRows}</div>

        ${K.studio.note("🗓", "Bir platformun kanal harcaması kampanya panosundan gelir. <b>Harcama var, plan yok</b> uyarısı parayı boşa akıtmamak için; <b>organik</b> etiketi kampanya olmadan içerikle büyümek demek.", "info")}

        <div class="fans-card">
          <div class="fans-card-head"><div>
            <div class="fans-card-title">⏭ Yaklaşan içerikler</div>
            <div class="fans-card-sub">Kaçan planlar gün geçince otomatik işaretlenir</div>
          </div></div>
          <div class="cc-list">${upcoming}</div>
        </div>
      </div>`;
  }

  function donusumHTML() {
    const s = K.campaigns.summary();
    const srcInfo = {};
    ((K.fansCohort && K.fansCohort.SOURCES) || []).forEach((x) => { srcInfo[x.id] = x; });
    const rows = Object.keys(s.byCohort).map((id) => {
      const info = srcInfo[id] || { name: id, icon: "•" };
      const n = s.byCohort[id];
      const cost = s.totals.spend > 0 && s.totals.followers > 0
        ? (s.totals.spend * (n / s.totals.followers)) : null;
      const channels = Object.keys(K.campaigns.CH_COHORT)
        .filter((ch) => K.campaigns.CH_COHORT[ch] === id)
        .map((ch) => (K.rollout.ch(ch) || { name: ch, emoji: "•" }));
      return {
        id, name: info.name, icon: info.icon, followers: n,
        costPer: n > 0 && cost != null ? cost / n : null,
        channels
      };
    }).sort((a, b) => b.followers - a.followers);

    const body = rows.length ? rows.map((r) => `
      <div class="fans-card cmp-conv">
        <div class="fans-card-head"><div>
          <div class="fans-card-title">${r.icon} ${r.name}</div>
          <div class="fans-card-sub">${r.channels.map((c) => c.emoji + " " + c.name).join(" · ") || "kanal eşlemesi yok"}</div>
        </div>
        <b class="cmp-conv-n">+${fmt(r.followers)}</b></div>
        <div class="fans-line">Takipçi başı maliyet: <b>${r.costPer != null ? money(Math.round(r.costPer)) : "—"}</b></div>
      </div>`).join("")
      : `<div class="mini-empty">Dönüşüm verisi için kampanyanın sonuçlanması gerekiyor.</div>`;

    return `
      <div class="fans-wrap">
        <div class="fans-card">
          <div class="fans-card-head"><div>
            <div class="fans-card-title">🧭 Kohort dönüşümü</div>
            <div class="fans-card-sub">Kampanya harcaması hangi kohortu büyüttü?</div>
          </div></div>
          <div class="cmp-tot">
            <div><b>${s.count}</b><span>kampanya</span></div>
            <div><b>${money(s.totals.spend)}</b><span>harcama</span></div>
            <div><b>+${fmt(s.totals.followers)}</b><span>takipçi</span></div>
            <div><b>${roiTxt(s.roi)}</b><span>getiri</span></div>
          </div>
          ${s.costPerFollower ? `<div class="fans-line">Ortalama takipçi başı maliyet: <b>${money(Math.round(s.costPerFollower))}</b></div>` : ""}
        </div>
        ${body}
        ${K.studio.note("🧭", "Her kanal kendi beslediği kohorta yazılır: TikTok/Shorts → kısa video, Instagram/X → ağızdan ağıza, e-posta → listeler. Sayılar kohort farkından gelir, tahmin değildir.", "violet")}
      </div>`;
  }

  K.phone.register({
    id: "campaign", name: "Kampanya", icon: "📊", iconClass: "ic-campaign", dock: false,

    render(params) {
      return {
        title: "Kampanya", sub: "Çıkış ölçümlemesi",
        shellClass: "app-campaign",
        tabPos: "bottom",
        tabs: [
          { id: "kampanya", label: "Kampanyalar", icon: "📊" },
          { id: "takvim", label: "Takvim", icon: "🗓" },
          { id: "donusum", label: "Dönüşüm", icon: "🧭" }
        ],
        activeTab: params.tab || "kampanya",
        render: (tab) => (tab === "donusum" ? donusumHTML()
          : tab === "takvim" ? takvimHTML()
          : kampanyaHTML()),
        onAction(pact, el) {
          const CC = K.contentCalendar;
          const planId = el && el.getAttribute("data-plan");
          if (pact === "cal-plan") {
            const platform = el.getAttribute("data-plat");
            const format = el.getAttribute("data-fmt");
            const it = CC.plan(platform, format, K.state.day + 1);
            if (it && K.toast) K.toast("🗓 Planlandı", `${it.format} · yarın`, "ok");
            K.phone.renderTop();
          } else if (pact === "cal-suggest") {
            const rel = el.getAttribute("data-rel");
            const added = CC.suggest(rel);
            if (K.toast) K.toast("🗓 Takvim kuruldu", added.length + " içerik planlandı", added.length ? "ok" : "warn");
            K.phone.renderTop();
          } else if (pact === "cal-pub") {
            const done = CC.publish(planId);
            if (K.toast) K.toast(done ? "✅ Yayınlandı" : "Yayınlanamadı", done ? "İçerik sosyal akışa gitti." : "Plan bulunamadı.", done ? "ok" : "warn");
            K.phone.renderTop();
          } else if (pact === "cal-cancel") {
            CC.cancel(planId);
            K.phone.renderTop();
          }
        }
      };
    }
  });
})(window.K = window.K || {});
