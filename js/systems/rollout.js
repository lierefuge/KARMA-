/* ============================================================
   KARMA — systems/rollout.js   (v10.21)
   ÇIKIŞ HAFTASI: ön kayıt · teaser zinciri · ilk hafta

   Neden ayrı sistem?
   ------------------
   Oyunun yayın hattı "bekle → çıkar" mantığındaydı. Günümüz rapinde
   ise kariyerin tamamı ÇIKIŞ etrafında döner:
     duyuru → teaser → ön kayıt (pre-save) → çıkış gecesi → İLK HAFTA
   İlk hafta sayıları sanatçının bir sonraki yılını belirler.

   Üç alt sistem
   -------------
   1. ÖN KAYIT — yayın hattındaki bir proje için kampanya açılır; her gün
      seçilen kanallardan ön kayıt toplanır. Yayın günü bu sayı ilk 24
      saatin ivmesine dönüşür (gerçekte de böyle çalışır).
   2. TEASER ZİNCİRİ — üç aşama (duyuru · snippet · kapak/tracklist).
      Zamanlama kritiktir: çok erken paylaşırsan heyecan söner, çok geç
      kalırsan yayılamaz. Hype 0-1 arası birikir.
   3. İLK HAFTA — yayından sonraki 7 gün kaydedilir; hafta sonunda
      ÇIKIŞ DERECESİ hesaplanır ve şarkıya kalıcı bir iz bırakır
      (güçlü hafta → şarkı uzun yaşar, zayıf hafta → hızla söner).

   Mevcut modele bağlanışı: dikkat dalgası (attention) ve günlük dinlenme
   çürümesi (dailyStreams) zaten var. Bu modül onları BESLER, değiştirmez.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* ---------- 1) ÖN KAYIT KANALLARI ----------
     yield  : kanalın toplam toplama kapasitesi (kitleye göre ölçeklenir)
     cost   : kampanya başına sabit gider
     minFan : gereken en düşük takipçi (kanalın işlemesi için) */
  const CHANNELS = [
    { id: "igstory", name: "Instagram Hikâye", emoji: "📸", cost: 6000,  yield: 0.85, minFan: 800,   desc: "Bağlantı sticker'ı; en yüksek dönüşüm." },
    { id: "tiktok",  name: "TikTok Snippet",   emoji: "🎬", cost: 9000,  yield: 1.15, minFan: 2500,  desc: "Ses trendine girebilir; en oynak kanal." },
    { id: "x",       name: "X Duyurusu",       emoji: "🐦", cost: 4000,  yield: 0.55, minFan: 500,   desc: "Ucuz ama dönüşümü düşük." },
    { id: "shorts",  name: "YouTube Shorts",   emoji: "▶️", cost: 7500,  yield: 0.95, minFan: 1500,  desc: "Uzun kuyruklu görüntülenme getirir." },
    { id: "mail",    name: "E-posta Listesi",  emoji: "✉️", cost: 3000,  yield: 0.70, minFan: 0,     desc: "Küçük ama sadık; her zaman işler." }
  ];

  /* ---------- 2) TEASER AŞAMALARI ----------
     ideal: yayına kaç gün kala paylaşılırsa tam verim alınır
     loose: bu kadar gün dışına çıkınca verim düşer (çok erken = söner,
            çok geç = yayılamaz) */
  const TEASERS = [
    { id: "announce", name: "Duyuru",           emoji: "📢", cost: 5000,  hype: 0.30, ideal: 20, loose: 12,
      desc: "Tarihi açıkla. Erken heyecan başlatır." },
    { id: "snippet",  name: "Snippet Paylaş",   emoji: "🎧", cost: 12000, hype: 0.45, ideal: 10, loose: 7,
      desc: "En vurucu 15 saniyeyi yayınla; hype'ın bel kemiği." },
    { id: "reveal",   name: "Kapak & Tracklist",emoji: "🖼️", cost: 8000,  hype: 0.25, ideal: 4,  loose: 4,
      desc: "Çıkıştan hemen önce son dürtme." }
  ];

  /* ilk hafta dereceleri: eşikler TOPLAM ilk hafta dinlenmesine göre */
  const DEBUTS = [
    { id: "smash",   min: 4_000_000, label: "💥 PATLAMA",     mult: 1.55, rep: 5.0,
      msg: "Çıkış haftası patladı — liste üst sıralarından girdin." },
    { id: "hit",     min: 1_200_000, label: "🔥 HİT",         mult: 1.30, rep: 3.0,
      msg: "Güçlü bir çıkış haftası; şarkı ana akışa oturdu." },
    { id: "solid",   min: 350_000,   label: "✅ SAĞLAM",      mult: 1.12, rep: 1.4,
      msg: "Sağlam bir ilk hafta; katalogda yerini aldı." },
    { id: "soft",    min: 90_000,    label: "😐 SÖNÜK",       mult: 0.92, rep: 0.0,
      msg: "İlk hafta beklenenin altında kaldı; şarkı hızla soğuyor." },
    { id: "flop",    min: 0,         label: "📉 SESSİZ ÇIKIŞ", mult: 0.72, rep: -1.5,
      msg: "Çıkış kimsenin dikkatini çekmedi." }
  ];

  const PRESAVE_CLOSE_BEFORE = 5;   // çıkışa bu kadar gün kalınca kampanya kapanır
  const FIRST_WEEK_DAYS = 7;

  function ch(id) { return CHANNELS.find(c => c.id === id) || null; }
  function teaser(id) { return TEASERS.find(t => t.id === id) || null; }

  /* ---------------- yardımcılar ---------------- */
  function relById(id) {
    const p = K.state && K.state.player;
    return p && p.releases ? p.releases.find(r => r.id === id) : null;
  }

  /* yayına kalan gün (negatifse çıkmış) */
  function daysToRelease(rel) {
    const s = K.state;
    if (!rel) return 0;
    return (rel.startDay + rel.waitDays) - s.day;
  }

  function audience() {
    return (K.fans && K.fans.followers) ? K.fans.followers() : 0;
  }

  K.rollout = {
    CHANNELS, TEASERS, DEBUTS, FIRST_WEEK_DAYS,
    ch, teaser,

    /* =====================================================
       ÖN KAYIT
       ===================================================== */

    /* kampanya açılabilir mi? */
    canStartPresave(rel) {
      const s = K.state;
      if (!rel) return { ok: false, why: "Yayın bulunamadı" };
      if (rel.presave) return { ok: false, why: "Kampanya zaten açık" };
      const d = daysToRelease(rel);
      if (d <= PRESAVE_CLOSE_BEFORE) return { ok: false, why: `Çıkışa ${Math.max(0, d)} gün kaldı — pencere kapandı` };
      if (d > 60) return { ok: false, why: `Çıkışa ${d} gün var — çok erken` };
      return { ok: true, why: `Çıkışa ${d} gün · kampanya açılabilir` };
    },

    startPresave(relId, channelIds) {
      const rel = relById(relId);
      const check = K.rollout.canStartPresave(rel);
      if (!check.ok) { K.toast("Ön kayıt açılamadı", check.why, "warn"); return false; }
      const ids = (channelIds || []).filter(id => ch(id));
      if (!ids.length) { K.toast("Kanal seç", "En az bir tanıtım kanalı seç.", "warn"); return false; }

      const fans = audience();
      const blocked = ids.filter(id => fans < ch(id).minFan);
      if (blocked.length) {
        K.toast("Kitle yetersiz",
          blocked.map(id => `${ch(id).name} (en az ${U.fmt(ch(id).minFan)} takipçi)`).join(" · "), "bad");
        return false;
      }

      const cost = U.sum(ids, id => ch(id).cost);
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `${U.money(cost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(cost, "presave");

      rel.presave = {
        channels: ids, cost, startedDay: K.state.day,
        collected: 0, history: [], hype: 0, fired: {}
      };
      K.toast("🎯 Ön kayıt kampanyası açıldı",
        `${ids.length} kanal · ${U.money(cost)} · çıkışa ${Math.max(0, daysToRelease(rel))} gün`, "ok");
      K.save(); K.refresh();
      return true;
    },

    /* günlük ön kayıt toplama */
    collectPresaves() {
      const s = K.state, p = s.player;
      (p.releases || []).forEach(rel => {
        const ps = rel.presave;
        if (!ps) return;
        const d = daysToRelease(rel);
        if (d <= 0) return;                       // çıkış oldu, toplama biter
        if (d <= PRESAVE_CLOSE_BEFORE) return;    // pencere kapandı

        const fans = audience();
        /* kitleye bağlı günlük taban; kanallar çarpan verir */
        const base = Math.max(1, fans * 0.0016 + (p.popularity || 0) * 0.9);
        const mul = U.sum(ps.channels, id => ch(id).yield);
        const noise = U.rand(0.75, 1.25);
        /* çıkış yaklaştıkça ilgi artar (rampa) */
        const ramp = 1 + U.clamp((30 - d) / 30, 0, 1) * 0.6;
        const gain = Math.max(0, Math.round(base * mul * noise * ramp));

        ps.collected += gain;
        ps.history.push(gain);
        ps.hype = U.clamp(ps.hype + gain / 4000, 0, 1);
      });
    },

    /* =====================================================
       TEASER ZİNCİRİ
       ===================================================== */

    /* bu aşama şimdi paylaşılabilir mi? verim ne olur? */
    teaserWindow(rel, teaserId) {
      const t = teaser(teaserId);
      if (!rel || !t) return { ok: false, why: "—", eff: 0 };
      if (rel.presave && rel.presave.fired && rel.presave.fired[teaserId]) {
        return { ok: false, why: "Zaten paylaşıldı", eff: 0 };
      }
      const d = daysToRelease(rel);
      if (d <= 0) return { ok: false, why: "Yayın çıktı", eff: 0 };
      /* ideale göre sapma → verim */
      const off = Math.abs(d - t.ideal);
      const eff = U.clamp(1 - off / t.loose, 0, 1);
      if (eff <= 0.05) {
        return { ok: false, eff: 0, days: d,
          why: d > t.ideal ? `Çok erken (ideal ${t.ideal} gün kala)` : `Çok geç (ideal ${t.ideal} gün kala)` };
      }
      return { ok: true, eff, days: d, why: `Verim %${Math.round(eff * 100)}` };
    },

    fireTeaser(relId, teaserId) {
      const rel = relById(relId);
      const t = teaser(teaserId);
      const win = K.rollout.teaserWindow(rel, teaserId);
      if (!t) return false;
      if (!win.ok) { K.toast("Teaser paylaşılamaz", win.why, "warn"); return false; }
      if (!K.economy.canAfford(t.cost)) { K.toast("Yetersiz bakiye", `${U.money(t.cost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(t.cost, "teaser");

      /* kampanya yoksa hype için geçici kap kur */
      if (!rel.presave) rel.presave = { channels: [], cost: 0, startedDay: K.state.day, collected: 0, history: [], hype: 0, fired: {} };
      if (!rel.presave.fired) rel.presave.fired = {};
      rel.presave.fired[teaserId] = K.state.day;
      rel.presave.hype = U.clamp(rel.presave.hype + t.hype * win.eff, 0, 1.2);

      /* organik yan etki: küçük takipçi/etkileşim artışı */
      const fans = audience();
      const organic = Math.round(fans * 0.006 * win.eff + (K.state.player.popularity || 0) * 1.2 * win.eff);
      K.state.player.ig = (K.state.player.ig || 0) + Math.round(organic * 0.6);
      K.state.player.tiktok = (K.state.player.tiktok || 0) + Math.round(organic * 0.4);

      const flag = win.eff >= 0.75 ? "ok" : win.eff >= 0.4 ? "" : "warn";
      K.toast(`${t.emoji} ${t.name}`,
        `${win.why} · hype +${(t.hype * win.eff).toFixed(2)} · +${U.fmt(organic)} etkileşim`, flag);
      K.save(); K.refresh();
      return true;
    },

    /* =====================================================
       YAYIN ANI — ön kayıt + hype dinlenmeye dönüşür
       ===================================================== */
    onPublish(rel, songs) {
      if (!rel || !songs || !songs.length) return;
      const ps = rel.presave;
      const hype = ps ? (ps.hype || 0) : 0;
      const collected = ps ? (ps.collected || 0) : 0;

      /* gerçek karşılık: 1.200 ön kayıt ≈ %55 ivme tavanı */
      const presaveFactor = U.clamp(collected / 1200, 0, 0.55);
      const hypeFactor = U.clamp(hype * 0.35, 0, 0.42);
      const bonus = 1 + presaveFactor + hypeFactor;

      songs.forEach(song => {
        song.dailyStreams = (song.dailyStreams || 0) * bonus;
        song.presaveCount = collected;
        song.presaveBoost = both(presaveFactor, hypeFactor);
        /* İLK HAFTA penceresi başlar */
        song.firstWeek = {
          day0: K.state.day, total: 0, days: [], done: false,
          presave: collected, hype: +hype.toFixed(2)
        };
      });

      if (collected > 0 || hype > 0) {
        K.toast("🎯 Ön kayıt ivmesi",
          `${U.fmt(collected)} ön kayıt · hype ${hype.toFixed(2)} → çıkış ivmesi +%${Math.round((bonus - 1) * 100)}`, "ok");
      }
      rel.presave = null;   // kampanya tükendi
      rel.rollout = { presave: collected, hype: +hype.toFixed(2), bonus: +bonus.toFixed(3) };
    },

    /* =====================================================
       İLK HAFTA — 7 gün toplanır, sonda derece verilir
       ===================================================== */
    tickFirstWeek() {
      const s = K.state, p = s.player;
      (p.songs || []).forEach(song => {
        const fw = song.firstWeek;
        if (!fw || fw.done) return;
        const dayIdx = s.day - fw.day0;                  // 0 = çıkış günü
        if (dayIdx < 0) return;

        /* bugünkü dinlenmeyi haftaya yaz */
        const today = Math.max(0, Math.round(song.dailyStreams || 0));
        if (fw.days.length <= dayIdx) fw.days[dayIdx] = today;
        else fw.days[dayIdx] = today;
        fw.total = U.sum(fw.days.filter(d => typeof d === "number"), x => x);

        if (dayIdx >= FIRST_WEEK_DAYS - 1) {
          fw.done = true;
          K.rollout.settleFirstWeek(song);
        }
      });
    },

    settleFirstWeek(song) {
      const fw = song.firstWeek;
      const tier = DEBUTS.find(d => fw.total >= d.min) || DEBUTS[DEBUTS.length - 1];
      song.debut = { id: tier.id, label: tier.label, total: fw.total, day: fw.total };
      /* kalıcı iz: güçlü hafta şarkıyı uzun yaşatır, zayıf hafta söndürür */
      song.dailyStreams = Math.max(5, (song.dailyStreams || 5) * tier.mult);
      song.debutMult = tier.mult;
      if (song.boosts) song.boosts.debut = (song.boosts.debut || 0) + (tier.mult - 1);

      const p = K.state.player;
      p.reputation = U.clamp((p.reputation || 0) + tier.rep, 0, 100);
      p.debuts = p.debuts || {};
      p.debuts[tier.id] = (p.debuts[tier.id] || 0) + 1;

      K.state.notifications = (K.state.notifications || []).concat([{
        title: "📊 İlk hafta sonucu",
        msg: `"${song.title}" · ${U.fmt(fw.total)} dinlenme · ${tier.label} — ${tier.msg}`,
        kind: tier.id === "flop" || tier.id === "soft" ? "warn" : "ok",
        day: K.state.day
      }]).slice(-60);

      K.toast(`📊 İlk hafta: ${tier.label}`,
        `"${song.title}" · ${U.fmt(fw.total)} dinlenme · itibar ${tier.rep >= 0 ? "+" : ""}${tier.rep}`, "ok");
    },

    /* =====================================================
       günlük tick
       ===================================================== */
    tick() {
      K.rollout.collectPresaves();
      K.rollout.tickFirstWeek();
    },

    /* =====================================================
       UI yardımcıları
       ===================================================== */
    /* yayın hattındaki, hâlâ çıkışı gelmemiş projeler */
    activePipeline() {
      const p = K.state.player;
      return (p.releases || [])
        .filter(r => daysToRelease(r) > 0)
        .sort((a, b) => daysToRelease(a) - daysToRelease(b));
    },

    /* bir projenin çıkış hazırlık özeti (0-100) */
    readiness(rel) {
      const ps = rel.presave;
      if (!ps) return 0;
      const fired = ps.fired || {};
      const teaserScore = U.sum(TEASERS, t => fired[t.id] ? 1 : 0) / TEASERS.length;
      const presaveScore = U.clamp(ps.collected / 1200, 0, 1);
      const hypeScore = U.clamp((ps.hype || 0) / 1.1, 0, 1);
      return Math.round((teaserScore * 0.35 + presaveScore * 0.40 + hypeScore * 0.25) * 100);
    },

    /* ilk haftası süren şarkılar */
    liveFirstWeeks() {
      return (K.state.player.songs || []).filter(s => s.firstWeek && !s.firstWeek.done);
    },

    summary() {
      const p = K.state.player;
      const camps = K.rollout.activePipeline().filter(r => r.presave);
      const live = K.rollout.liveFirstWeeks();
      const debuts = p.debuts || {};
      return {
        campaigns: camps.length,
        collected: U.sum(camps, r => (r.presave && r.presave.collected) || 0),
        liveWeeks: live.length,
        debuts,
        best: debuts.smash ? "PATLAMA" : debuts.hit ? "HİT" : debuts.solid ? "SAĞLAM" : "—"
      };
    }
  };

  function both(a, b) { return +(a + b).toFixed(3); }
})(window.K);
