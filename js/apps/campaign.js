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
          { id: "donusum", label: "Dönüşüm", icon: "🧭" }
        ],
        activeTab: params.tab || "kampanya",
        render: (tab) => (tab === "donusum" ? donusumHTML() : kampanyaHTML()),
        onAction() { /* salt okunur pano */ }
      };
    }
  });
})(window.K = window.K || {});
