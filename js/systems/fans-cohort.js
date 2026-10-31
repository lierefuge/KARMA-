/* ============================================================
   KARMA — systems/fans-cohort.js   (v10.72)

   FAN KOHORT DÖNGÜSÜ
   ------------------
   Takipçi kitlesi tek bir sayı değil; farklı KAYNAKLARDAN gelen ve
   farklı SADAKAT seviyesinde olan topluluklardan oluşur. Bu modül
   kitleyi kaynak kohortlarına ayırır, her kohortun sadakatini izler
   ve günlük giriş/çıkışı kaynağa yazar.

   NEDEN PAY (share) TABANLI, SAYI TABANLI DEĞİL?
   ----------------------------------------------
   Takipçi sayısı zaten platform sayaçlarından türetiliyor
   (`K.fans.followers()` = ig + tiktok + x + ytSubs). Kohortları ayrı
   bir SAYI olarak tutmak iki kaynak (sayaç + kohort toplamı) yaratır ve
   er geç birbirinden ayrışır: "kohort toplamı 12.400 ama takipçi 11.900".
   Bu yüzden burada SAYI DEĞİL PAY saklanır:

       pay[id] ∈ [0,1]     Σ pay = 1        (normalize, tek kaynak)
       kişi[id] = en-büyük-kalan yuvarlama ile pay[id] × takipçi

   Böylece:
     · kohort toplamı HER ZAMAN takipçi sayısına eşittir,
     · bir fan aynı anda iki kohortta sayılamaz (paylar toplamı 1),
     · eski kayıtlar "devralınan taban" (legacy) kohortuyla açılır ve
       hiçbir fan/gelir değeri geriye dönük düşmez.

   KAYIT ŞEMASI (player.fanCohorts)
   --------------------------------
     v        şema sürümü (1)
     day      son mutabakat günü
     total    son bilinen takipçi sayısı (delta hesabı için)
     share    { legacy, shortform, playlist, radio, live, word }  → 0..1
     loyalty  aynı anahtarlar → 0..1
     in30     son 30 günün kaynak bazlı girişi (üstel sönümlü sayaç)
     out30    son 30 günün kaynak bazlı çıkışı

   MODÜL HİÇBİR GELİR HESABI YAPMAZ. Mevcut `K.fans` ekonomisi
   (fan kulübü, merch, VIP) aynen çalışır; bu katman yalnızca kitlenin
   NEREDEN geldiğini ve NE KADAR kalıcı olduğunu görünür kılar.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* Kohortlar: keşif kaynağına göre kitle. `legacy` göç kohortudur:
     v10.72 öncesi kayıtlarda tüm kitle buraya yazılır, sonra yeni
     kaynaklar büyüdükçe payı kendiliğinden azalır (sayı sabit kalır). */
  const SOURCES = [
    { id: "legacy",    name: "Devralınan taban", icon: "🏛", note: "Bu sürümden önceki kayıtlardan gelen kitle" },
    { id: "shortform", name: "Kısa video",       icon: "📱", note: "TikTok / Reels keşfi" },
    { id: "playlist",  name: "Listeler",         icon: "🎧", note: "Editoryal ve streaming listeleri" },
    { id: "radio",     name: "Radyo & basın",    icon: "📻", note: "Radyo, TV, haber" },
    { id: "live",      name: "Sahne",            icon: "🎤", note: "Konser ve festival sonrası" },
    { id: "word",      name: "Ağızdan ağıza",    icon: "💬", note: "Organik paylaşım" }
  ];
  const IDS = SOURCES.map((s) => s.id);

  /* Giriş ağırlığı: yeni kitlenin hangi kaynaktan geldiği.
     legacy 0 — göç kohortu yeni kitle ÜRETMEZ, yalnızca başlangıç tabanıdır. */
  const INFLOW_W = { legacy: 0, shortform: 0.34, playlist: 0.24, radio: 0.07, live: 0.15, word: 0.20 };

  /* Kohortun karakteristik sadakati — hedef, etkileşimle birlikte ölçeklenir.
     Sahne kitlesi en sadık, kısa video kitlesi en geçici. */
  const LOYAL_BASE = { legacy: 0.55, shortform: 0.34, playlist: 0.50, radio: 0.58, live: 0.72, word: 0.62 };

  const WINDOW = 30;                       /* giriş/çıkış penceresi (gün) */
  const DECAY = (WINDOW - 1) / WINDOW;     /* üstel sönüm katsayısı */

  const zeros = () => { const o = {}; IDS.forEach((id) => { o[id] = 0; }); return o; };

  function fresh(day, total) {
    const share = zeros(), loyalty = zeros(), in30 = zeros(), out30 = zeros();
    share.legacy = 1;                       /* göç: her şey devralınan tabanda */
    IDS.forEach((id) => { loyalty[id] = LOYAL_BASE[id]; });
    return { v: 1, day: day || 0, total: total || 0, share, loyalty, in30, out30 };
  }

  function followers() {
    return (K.fans && K.fans.followers) ? K.fans.followers() : 0;
  }

  /* Payları 1'e normalize et (bozuk/eksik alanlara karşı savunmacı). */
  function normalize(share) {
    let sum = 0;
    IDS.forEach((id) => {
      const v = Number(share[id]);
      share[id] = Number.isFinite(v) && v > 0 ? v : 0;
      sum += share[id];
    });
    if (!(sum > 0)) { share.legacy = 1; return share; }
    if (Math.abs(sum - 1) > 1e-9) IDS.forEach((id) => { share[id] = share[id] / sum; });
    return share;
  }

  K.fansCohort = {
    SOURCES, IDS, WINDOW, LOYAL_BASE, INFLOW_W,

    /* ---------------- göç / erişim ---------------- */
    state() {
      const p = K.state.player;
      const cur = followers();
      if (!p.fanCohorts || p.fanCohorts.v !== 1 || !p.fanCohorts.share) {
        p.fanCohorts = fresh(K.state.day, cur);
      }
      const c = p.fanCohorts;
      c.share = normalize(c.share);
      IDS.forEach((id) => {
        if (!Number.isFinite(c.loyalty[id])) c.loyalty[id] = LOYAL_BASE[id];
        c.loyalty[id] = clamp(c.loyalty[id], 0.15, 0.95);
        if (!Number.isFinite(c.in30[id])) c.in30[id] = 0;
        if (!Number.isFinite(c.out30[id])) c.out30[id] = 0;
      });
      if (!Number.isFinite(c.total)) c.total = cur;
      return c;
    },

    /* ---------------- kişi sayıları (toplam = takipçi) ---------------- */
    /* En-büyük-kalan yöntemi: yuvarlama farkı en yüksek kesirli paya
       eklenir, böylece toplam HER ZAMAN takipçi sayısına eşit olur. */
    counts() {
      const c = this.state();
      const total = followers();
      const raw = {};
      let sum = 0, floors = {};
      IDS.forEach((id) => {
        raw[id] = c.share[id] * total;
        floors[id] = Math.floor(raw[id]);
        sum += floors[id];
      });
      let rest = total - sum;
      const order = IDS.slice().sort((a, b) => (raw[b] - floors[b]) - (raw[a] - floors[a]));
      for (let i = 0; i < order.length && rest > 0; i++) { floors[order[i]] += 1; rest--; }
      for (let i = 0; i < order.length && rest < 0; i++) { if (floors[order[i]] > 0) { floors[order[i]] -= 1; rest++; } }
      return floors;
    },

    /* ---------------- etkileşim sinyali ---------------- */
    /* Kitle ivmesi: son 14 günün takipçi değişimi. İçerik üretimi bu
       ivmeyi besler; ivme düşerse sadakat hedefi de düşer. */
    activity() {
      let series = [];
      try { series = K.stats && K.stats.series ? K.stats.series("followers", 14) : []; } catch (e) { series = []; }
      const first = series.length ? series[0] : 0;
      const last = series.length ? series[series.length - 1] : followers();
      const growth = first > 0 ? (last - first) / first : (last > 0 ? 1 : 0);
      const pop = clamp((K.state.player.popularity || 0) / 100, 0, 1);
      return clamp(0.30 + clamp(growth * 3.5, 0, 0.45) + pop * 0.20, 0.10, 1);
    },

    loyaltyTarget(id, act) {
      const base = LOYAL_BASE[id] || 0.5;
      return clamp(base * (0.62 + 0.78 * act), 0.15, 0.95);
    },

    /* Günlük kayıp oranı (bilgi amaçlı gösterim + kayıp dağıtımında kullanılır).
       Sadakat yüksekse kayıp düşer; taban kayıp her zaman vardır. */
    churnRate(id) {
      const c = this.state();
      return clamp(0.004 + (1 - c.loyalty[id]) * 0.030, 0.004, 0.040);
    },

    /* ---------------- günlük tick ---------------- */
    tick() {
      const c = this.state();
      const day = K.state.day;
      if (c.day === day) return;                 /* aynı gün iki kez işleme */
      const total = followers();
      const prev = Number.isFinite(c.total) ? c.total : total;
      const delta = total - prev;

      /* 1) pencere sayaçlarını söndür */
      IDS.forEach((id) => {
        c.in30[id] = c.in30[id] * DECAY;
        c.out30[id] = c.out30[id] * DECAY;
      });

      /* 2) değişimi kaynaklara dağıt — pay uzayında, kişi uzayında değil.
            new_share = (share*prev + Δ*w) / total                            */
      if (delta > 0 && total > 0) {
        let wsum = 0;
        const w = {};
        IDS.forEach((id) => { w[id] = (INFLOW_W[id] || 0) * (0.5 + c.loyalty[id]); wsum += w[id]; });
        if (!(wsum > 0)) { w.legacy = 1; wsum = 1; }
        IDS.forEach((id) => {
          const add = delta * (w[id] / wsum);
          c.share[id] = (c.share[id] * prev + add) / total;
          c.in30[id] += add;
        });
      } else if (delta < 0 && total >= 0) {
        /* Kayıp, sadakati DÜŞÜK kohorttan daha çok gider: 0.15..1.15 katsayı */
        const lost = -delta;
        let lsum = 0;
        const lw = {};
        IDS.forEach((id) => {
          lw[id] = c.share[id] * (1.15 - c.loyalty[id]);
          lsum += lw[id];
        });
        if (!(lsum > 0)) { lw.legacy = 1; lsum = 1; }
        IDS.forEach((id) => {
          const cut = lost * (lw[id] / lsum);
          const next = Math.max(0, c.share[id] * prev - cut);
          c.out30[id] += cut;
          c.share[id] = total > 0 ? next / total : (id === "legacy" ? 1 : 0);
        });
      }

      /* 3) payları normalize et ve tek fana indirge (yuvarlama artığı kalmasın) */
      c.share = normalize(c.share);

      /* 4) sadakat hedefe doğru kayar (yavaş: günde en fazla 3%) */
      const act = this.activity();
      IDS.forEach((id) => {
        const target = this.loyaltyTarget(id, act);
        c.loyalty[id] = clamp(c.loyalty[id] + (target - c.loyalty[id]) * 0.03, 0.15, 0.95);
      });

      c.total = total;
      c.day = day;
    },

    /* ---------------- rapor (UI) ---------------- */
    report() {
      const c = this.state();
      const counts = this.counts();
      const total = followers();
      const rows = SOURCES.map((s) => {
        const n = counts[s.id] || 0;
        return {
          id: s.id, name: s.name, icon: s.icon, note: s.note,
          count: n,
          share: total > 0 ? n / total : 0,
          loyalty: c.loyalty[s.id],
          churn: this.churnRate(s.id),
          in30: Math.round(c.in30[s.id]),
          out30: Math.round(c.out30[s.id])
        };
      }).filter((r) => r.count > 0 || r.in30 > 0 || r.out30 > 0);

      const sum = rows.reduce((a, r) => a + r.count, 0);
      const weighted = total > 0
        ? rows.reduce((a, r) => a + r.loyalty * r.count, 0) / total
        : rows.length ? rows.reduce((a, r) => a + r.loyalty, 0) / rows.length : 0;

      return {
        total,
        sum,                                   /* kohort toplamı — total'a EŞİT olmalı */
        rows,
        loyalty: weighted,
        in30: Math.round(IDS.reduce((a, id) => a + c.in30[id], 0)),
        out30: Math.round(IDS.reduce((a, id) => a + c.out30[id], 0)),
        activity: this.activity(),
        day: c.day
      };
    },

    /* Sadakat ölçütü — UI etiketi */
    loyaltyLabel(v) {
      if (v >= 0.75) return "Çekirdek";
      if (v >= 0.60) return "Sadık";
      if (v >= 0.45) return "Isınan";
      if (v >= 0.30) return "Mesafeli";
      return "Geçici";
    },

    /* ---------------- test / araç kancaları ---------------- */
    _reset() { K.state.player.fanCohorts = fresh(K.state.day, followers()); return this.state(); },
    _fresh: fresh
  };
})(window.K = window.K || {});
