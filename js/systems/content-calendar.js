/* ============================================================
   KARMA — systems/content-calendar.js   (v10.74)

   SOSYAL MEDYA İÇERİK TAKVİMİ  (yol haritası 16)
   -----------------------------------------------
   Kısa video · hikâye · canlı yayın · klip · gönderi formatlarını
   PLATFORM + GÜN + (varsa) YAYIN bazında planlar.

   NEDEN AYRI TAKVİM?
   ------------------
   Bugüne kadar içerik "o an ne paylaşırsam" mantığıyla atılıyordu
   (`K.social.playerPost`). Çıkış haftası ise plan ister: teaser günleri,
   çıkış günü, sonrası. Bu modül planı TUTAR ama paylaşımı KENDİSİ
   YAPMAZ — yayınlama mevcut sosyal sisteme devredilir
   (`K.social.playerPost`), böylece etkileşim formülü tek kaynak kalır.

   KAMPANYA PANOSUYLA BAĞ (v10.73)
   -------------------------------
   Her platform bir kampanya KANALINA eşlenir:
       instagram → igstory · tiktok → tiktok · x → x · youtube → shorts
   Takvim, kanalın kampanya harcamasını ve o kanalın ürettiği
   dinlenme/takipçi sonucunu `systems/campaign.js` defterinden okur.
   Böylece "para harcanan kanalda içerik var mı" sorusu ölçülebilir:
     · harcama var, plan yok  → tempo uyarısı
     · plan var, harcama yok  → organik çalışıyorsun

   DOYGUNLUK: aynı gün 3'ten fazla plan varsa uyarı verilir; aynı
   platform + gün + format + yayın ikinci kez PLANLANAMAZ (tekrar yok).

   ESKİ KAYITLAR: `player.contentPlan` yoksa boş açılır.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* platform → kampanya kanalı (systems/campaign.js CH_COHORT ile uyumlu) */
  const PLATFORMS = [
    { id: "ig",      name: "Instagram", icon: "📸", channel: "igstory" },
    { id: "tiktok",  name: "TikTok",    icon: "🎬", channel: "tiktok" },
    { id: "yt",      name: "YouTube",   icon: "▶️", channel: "shorts" },
    { id: "x",       name: "X",         icon: "🐦", channel: "x" }
  ];

  /* format → hangi platformlarda geçerli + gönderi türü (sosyal sisteme devredilir) */
  const FORMATS = [
    { id: "story",     name: "Hikâye",       icon: "📷", postType: "image",
      plats: ["ig"],                         desc: "Günlük görünürlük; en yüksek dönüşüm." },
    { id: "shortform", name: "Kısa video",   icon: "🎞️", postType: "reach",
      plats: ["tiktok", "yt", "ig"],         desc: "Keşif motoru; trend yakalarsa patlar." },
    { id: "live",      name: "Canlı yayın",  icon: "🔴", postType: "reach",
      plats: ["ig", "tiktok", "yt"],         desc: "Sadık kitleyi ısıtır, anlık etkileşim." },
    { id: "clip",      name: "Müzik klibi",  icon: "🎥", postType: "image",
      plats: ["yt", "ig"],                   desc: "İtibar ve kalıcı görünürlük." },
    { id: "post",      name: "Gönderi",      icon: "✍️", postType: "reach",
      plats: ["x", "ig"],                    desc: "Duyuru ve yorum; ucuz ama dönüşümü düşük." }
  ];

  const MAX_PER_DAY = 3;          /* doygunluk eşiği */
  const HORIZON = 21;             /* takvimde gösterilen gün sayısı */

  function plat(id) { return PLATFORMS.find((p) => p.id === id) || null; }
  function fmtDef(id) { return FORMATS.find((f) => f.id === id) || null; }

  function blank() { return { v: 1, items: [] }; }

  K.contentCalendar = {
    PLATFORMS, FORMATS, MAX_PER_DAY, HORIZON,
    plat, fmtDef,

    /* ---------------- durum ---------------- */
    ensure() {
      const p = K.state.player;
      if (!p.contentPlan || p.contentPlan.v !== 1 || !Array.isArray(p.contentPlan.items)) {
        p.contentPlan = blank();
      }
      return p.contentPlan;
    },

    items() { return this.ensure().items; },

    /* ---------------- planlama ---------------- */
    /* Aynı platform + gün + format + yayın ikinci kez planlanamaz. */
    canPlan(platform, format, day, releaseId) {
      if (!plat(platform)) return { ok: false, why: "Bilinmeyen platform" };
      const f = fmtDef(format);
      if (!f) return { ok: false, why: "Bilinmeyen format" };
      if (f.plats.indexOf(platform) < 0) return { ok: false, why: `${f.name} bu platformda paylaşılmaz` };
      const d = Number(day);
      if (!Number.isFinite(d)) return { ok: false, why: "Gün geçersiz" };
      if (d < K.state.day) return { ok: false, why: "Geçmiş güne plan yapılmaz" };
      const dup = this.items().some((it) => it.platform === platform && it.format === format
        && it.day === d && (it.releaseId || null) === (releaseId || null));
      if (dup) return { ok: false, why: "Bu içerik zaten planlı" };
      const sameDay = this.items().filter((it) => it.day === d && it.status === "planned").length;
      return { ok: true, why: sameDay >= MAX_PER_DAY ? `Dikkat: o gün ${sameDay} plan var (doygunluk)` : "Planlanabilir", saturated: sameDay >= MAX_PER_DAY };
    },

    plan(platform, format, day, releaseId, silent) {
      const check = this.canPlan(platform, format, day, releaseId);
      if (!check.ok) {
        if (!silent && K.toast) K.toast("Planlanamadı", check.why, "warn");
        return null;
      }
      const item = {
        id: U.uid("plan"),
        platform, format,
        day: Number(day),
        releaseId: releaseId || null,
        status: "planned",
        postId: null,
        createdDay: K.state.day
      };
      this.items().push(item);
      if (check.saturated && K.toast) {
        K.toast("Doygunluk", "Aynı güne çok fazla içerik planladın; etkisi bölünebilir.", "warn");
      }
      return item;
    },

    cancel(itemId) {
      const list = this.items();
      const i = list.findIndex((it) => it.id === itemId);
      if (i < 0) return false;
      if (list[i].status !== "planned") return false;
      list.splice(i, 1);
      return true;
    },

    /* ---------------- önerilen takvim ---------------- */
    /* Yayın gününe göre iskelet plan: teaser → çıkış → sonrası.
       Yalnızca BOŞ slotları doldurur; oyuncunun planlarına dokunmaz. */
    suggest(releaseId) {
      const p = K.state.player;
      const rel = (p.releases || []).find((r) => r.id === releaseId);
      if (!rel) return [];
      const day0 = (rel.startDay || K.state.day) + (rel.waitDays || 0);
      const slots = [
        { offset: -14, platform: "ig",     format: "story" },
        { offset: -10, platform: "tiktok", format: "shortform" },
        { offset: -7,  platform: "yt",     format: "shortform" },
        { offset: -3,  platform: "ig",     format: "story" },
        { offset: -1,  platform: "x",      format: "post" },
        { offset: 0,   platform: "tiktok", format: "shortform" },
        { offset: 0,   platform: "yt",     format: "clip" },
        { offset: 1,   platform: "ig",     format: "live" },
        { offset: 3,   platform: "x",      format: "post" },
        { offset: 7,   platform: "ig",     format: "story" }
      ];
      const added = [];
      slots.forEach((s) => {
        const day = day0 + s.offset;
        if (day < K.state.day) return;                 /* geçmiş slot atlanır */
        const it = this.plan(s.platform, s.format, day, releaseId, true);
        if (it) added.push(it);
      });
      return added;
    },

    /* ---------------- yayınlama (mevcut sosyal sisteme devredilir) ---------------- */
    publish(itemId) {
      const it = this.items().find((x) => x.id === itemId);
      if (!it || it.status !== "planned") return false;
      const f = fmtDef(it.format);
      if (!f || !K.social || !K.social.playerPost) return this.markManual(itemId);
      const res = K.social.playerPost(it.platform, null, f.postType, it.songId || null, null);
      /* playerPost { post, outcome, ... } döndürür — gönderinin kendisi `post` alanında */
      const post = (res && res.post) || res || null;
      it.status = "published";
      it.publishedDay = K.state.day;
      it.postId = (post && post.id) || null;
      it.outcome = (res && res.outcome) || null;
      it.likes = (post && post.likes) || 0;
      it.reach = (post && ((post.likes || 0) + (post.comments || 0) + (post.shares || 0))) || 0;
      return true;
    },

    /* sosyal sistem yoksa (test/çevrimdışı) elle işaretle */
    markManual(itemId) {
      const it = this.items().find((x) => x.id === itemId);
      if (!it || it.status !== "planned") return false;
      it.status = "published";
      it.publishedDay = K.state.day;
      return true;
    },

    /* ---------------- günlük: kaçan planları işaretle ---------------- */
    tick() {
      const list = this.items();
      let missed = 0;
      list.forEach((it) => {
        if (it.status === "planned" && it.day < K.state.day) { it.status = "missed"; missed++; }
      });
      /* takvimi şişirmesin: 90 günden eski kayıtlar düşer */
      const cutoff = K.state.day - 90;
      const kept = list.filter((it) => it.status === "planned" || it.day >= cutoff);
      if (kept.length !== list.length) this.ensure().items = kept;
      return missed;
    },

    /* ---------------- kampanya panosuyla bağ ---------------- */
    /* Bir platformun kampanya kanalının TOPLAM harcaması ve sonucu. */
    channelStats(channelId) {
      const out = { spend: 0, streams: 0, followers: 0, revenue: 0, campaigns: 0 };
      if (!K.campaigns || !K.campaigns.list) return out;
      K.campaigns.list().forEach((c) => {
        const row = (c.rows || []).find((r) => r.id === channelId);
        if (!row) return;
        out.spend += row.spend || 0;
        out.streams += row.streams || 0;
        out.followers += row.followers || 0;
        out.revenue += row.revenue || 0;
        out.campaigns++;
      });
      return out;
    },

    /* ---------------- rapor (UI) ---------------- */
    report() {
      const day = K.state.day;
      const list = this.items();
      const rows = PLATFORMS.map((pf) => {
        const items = list.filter((it) => it.platform === pf.id);
        const planned = items.filter((it) => it.status === "planned" && it.day >= day).length;
        const published = items.filter((it) => it.status === "published").length;
        const missed = items.filter((it) => it.status === "missed").length;
        const ch = this.channelStats(pf.channel);
        return {
          id: pf.id, name: pf.name, icon: pf.icon, channel: pf.channel,
          planned, published, missed,
          posts: published,
          spend: ch.spend,
          streams: ch.streams,
          followers: ch.followers,
          perPost: published > 0 ? Math.round(ch.streams / published) : null,
          /* tempo: harcama var ama plan yok / plan var harcama yok */
          tempo: ch.spend > 0 && planned === 0 && published === 0 ? "idle"
            : ch.spend === 0 && (planned + published) > 0 ? "organic"
            : "ok"
        };
      });

      const upcoming = list
        .filter((it) => it.status === "planned")
        .sort((a, b) => a.day - b.day)
        .slice(0, 12)
        .map((it) => ({
          ...it,
          platformName: (plat(it.platform) || {}).name || it.platform,
          platformIcon: (plat(it.platform) || {}).icon || "•",
          formatName: (fmtDef(it.format) || {}).name || it.format,
          formatIcon: (fmtDef(it.format) || {}).icon || "•",
          daysLeft: it.day - day
        }));

      const perDay = {};
      list.filter((it) => it.status === "planned").forEach((it) => {
        perDay[it.day] = (perDay[it.day] || 0) + 1;
      });
      const saturated = Object.keys(perDay).filter((d) => perDay[d] > MAX_PER_DAY).map(Number);

      return {
        day, rows, upcoming,
        counts: {
          planned: list.filter((it) => it.status === "planned").length,
          published: list.filter((it) => it.status === "published").length,
          missed: list.filter((it) => it.status === "missed").length
        },
        saturated, saturatedCount: saturated.length,
        totalSpend: rows.reduce((a, r) => a + r.spend, 0),
        totalStreams: rows.reduce((a, r) => a + r.streams, 0),
        totalFollowers: rows.reduce((a, r) => a + r.followers, 0)
      };
    },

    /* ---------------- test kancaları ---------------- */
    _reset() { K.state.player.contentPlan = blank(); return this.ensure(); }
  };
})(window.K = window.K || {});
