/* ============================================================
   KARMA — data/distributors.js   (v10.42)
   DISTRIBÜTÖR KATMANI

   Neden var?
   ----------
   v10.40 dağıtım formunu gerçekçi yaptı ama tek bir şey eksikti:
   "kim dağıtıyor?". Oyunda sanatçı hep kendi kendine dağıtıyormuş gibi
   sabit maliyetle çalışıyordu. Gerçekte sanatçı bir distribütöre
   (DistroKid / TuneCore / CD Baby / Amuse / Ditto) kaydolur ve o
   distribütörün TİCARİ MODELİ kariyeri doğrudan etkiler:

     · ücret    — ücretsiz / yayın başına / yıllık üyelik / tek seferlik
     · kesinti  — streaming gelirinden alınan % (komisyon)
     · teslim   — yayının mağazalara ulaşması için gereken ön süre
     · mağaza   — premium mağazalara (Apple/TIDAL/Amazon) erişim

   Denge şudur: ucuz distribütör çok keser ve geç teslim eder;
   pahalı distribütör az keser, hızlı teslim eder, tüm mağazalara sokar.
   ============================================================ */
(function (K) {
  "use strict";

  /* model:
       free       — ücretsiz, yüksek kesinti
       perRelease — yayın başına ücret
       oneTime    — yayın başına tek ödeme (katalog kalıcı)
       annual     — yıllık üyelik (365 günde bir ücret, sınırsız yayın)
       label      — şirket/major dağıtımı (itibar kapısı)              */
  K.DISTRIBUTORS = [
    { id: "karma", name: "KARMA Dağıtım", icon: "🅺", model: "free", fee: 0, commission: 18, leadDays: 10, premium: true, minRep: 0,
      note: "Varsayılan. Ücretsiz ve tüm mağazalara açık; karşılığında yüksek kesinti ve geç teslim." },

    { id: "amuse", name: "Amuse", icon: "🅰️", model: "free", fee: 0, commission: 25, leadDays: 14, premium: false, minRep: 0,
      note: "Ücretsiz katman. En yüksek kesinti; en yavaş teslim, premium mağaza yok." },

    { id: "cdbaby", name: "CD Baby", icon: "🎸", model: "oneTime", fee: 2600, commission: 9, leadDays: 7, premium: true, minRep: 0,
      note: "Yayın başına tek ödeme + %9 kesinti. Katalog kalıcı, tüm mağazalar." },

    { id: "tunecore", name: "TuneCore", icon: "🎼", model: "perRelease", fee: 1400, commission: 0, leadDays: 5, premium: true, minRep: 0,
      note: "Yayın başına ücret, %0 kesinti. Tüm mağazalar." },

    { id: "ditto", name: "Ditto Music", icon: "🎧", model: "annual", fee: 6900, commission: 0, leadDays: 6, premium: true, minRep: 0,
      note: "Yıllık üyelik. Sınırsız yayın, %0 kesinti." },

    { id: "distrokid", name: "DistroKid", icon: "🎤", model: "annual", fee: 9900, commission: 0, leadDays: 3, premium: true, minRep: 0,
      note: "Yıllık üyelik. En hızlı teslim, %0 kesinti, tüm mağazalar." },

    { id: "believe", name: "Believe", icon: "💠", model: "label", fee: 0, commission: 5, leadDays: 4, premium: true, minRep: 45,
      note: "Etiket seviyesi dağıtım. Şirketin varsa ya da itibarın 45+ ise açılır." },

    { id: "orchard", name: "The Orchard", icon: "🌿", model: "label", fee: 0, commission: 3, leadDays: 3, premium: true, minRep: 60,
      note: "Major dağıtım. Şirketin varsa ya da itibarın 60+ ise açılır." }
  ];

  K.distributorById = function (id) {
    return K.DISTRIBUTORS.find(d => d.id === id) || null;
  };

  K.defaultDistributor = function () { return "karma"; };

  /* distribütör modelinin okunur etiketi */
  K.distroModelLabel = function (id) {
    const d = K.distributorById(id);
    if (!d) return "—";
    return ({
      free: "Ücretsiz",
      perRelease: "Yayın başına",
      oneTime: "Tek seferlik",
      annual: "Yıllık üyelik",
      label: "Etiket dağıtımı"
    })[d.model] || d.model;
  };

  /* bilinen bir distribütör adını id'ye çevir (şirket distribütörleri için) */
  K.distroByName = function (name) {
    const n = String(name || "").toLowerCase().trim();
    if (!n) return null;
    const hit = K.DISTRIBUTORS.find(d => {
      const dn = d.name.toLowerCase();
      return dn === n || n.indexOf(dn) >= 0;
    });
    return hit ? hit.id : null;
  };

  K.distro = {
    list() { return K.DISTRIBUTORS; },
    byId(id) { return K.distributorById(id); },
    byName(name) { return K.distroByName(name); },

    /* isimden tam tanımlayıcı üret; bilinmeyen (major) kollar için
       makul bir varsayılan döndür. Şirket distribütörleri buradan geçer. */
    descriptorFor(name) {
      const id = K.distroByName(name);
      if (id) {
        const d = K.distributorById(id);
        return { id, name: d.name, commission: d.commission, leadDays: d.leadDays, premium: d.premium, fee: 0, model: d.model };
      }
      return { id: "major", name: name || "Major Dağıtım", commission: 4, leadDays: 4, premium: true, fee: 0, model: "label" };
    },

    /* yayın için ödenecek distribütör ücreti.
       annual modelde yıl içinde tekrar ödenmez. */
    feeFor(id, day) {
      const d = K.distributorById(id) || K.distributorById(K.defaultDistributor());
      if (!d) return 0;
      if (d.model === "free" || d.model === "label") return 0;
      const today = (day != null) ? day : ((K.state && K.state.day) || 0);
      if (d.model === "annual") {
        const plans = (K.state && K.state.player && K.state.player.distroPlans) || {};
        if ((plans[d.id] || 0) > today) return 0;
      }
      return d.fee || 0;
    },

    /* yıllık planı işaretle (ücret ödendikten sonra çağrılır) */
    notePlan(id, day) {
      const d = K.distributorById(id);
      if (!d || d.model !== "annual") return;
      const p = K.state && K.state.player;
      if (!p) return;
      p.distroPlans = p.distroPlans || {};
      p.distroPlans[d.id] = ((day != null) ? day : (K.state.day || 0)) + 365;
    },

    /* yıllık planın bitiş günü (yoksa 0) */
    planUntil(id) {
      const p = K.state && K.state.player;
      const plans = (p && p.distroPlans) || {};
      return plans[id] || 0;
    },

    commission(id) {
      const d = K.distributorById(id);
      return d ? (d.commission || 0) : 0;
    },

    leadDays(id) {
      const d = K.distributorById(id);
      return d ? (d.leadDays || 7) : 7;
    },

    premiumAllowed(id) {
      if (id === "major") return true;
      const d = K.distributorById(id);
      return !!(d && d.premium);
    },

    /* id'den tam tanımlayıcı ("major" dahil) */
    descById(id) {
      if (id === "major") return { id: "major", name: "Major Dağıtım", commission: 4, leadDays: 4, premium: true, fee: 0, model: "label" };
      const d = K.distributorById(id);
      if (!d) return { id: "karma", name: "KARMA Dağıtım", commission: 18, leadDays: 10, premium: false, fee: 0, model: "free" };
      return { id: d.id, name: d.name, commission: d.commission, leadDays: d.leadDays, premium: d.premium, fee: K.distro.feeFor(d.id), model: d.model };
    },

    /* bu distribütör oyuncu için kullanılabilir mi? */
    canUse(id, day) {
      const d = K.distributorById(id);
      if (!d) return false;
      if (d.model === "label") {
        const p = K.state && K.state.player;
        const rep = (p && p.reputation) || 0;
        const hasLabel = !!(K.label && K.label.hasLabel && K.label.hasLabel());
        return hasLabel || rep >= (d.minRep || 0);
      }
      return true;
    },

    /* seçilebilir distribütörler + kilit gerekçesi */
    options(day) {
      return K.DISTRIBUTORS.map(d => {
        const ok = K.distro.canUse(d.id, day);
        return {
          id: d.id, name: d.name, icon: d.icon, model: d.model,
          fee: K.distro.feeFor(d.id, day), baseFee: d.fee,
          commission: d.commission, leadDays: d.leadDays,
          premium: d.premium, locked: !ok, minRep: d.minRep, note: d.note
        };
      });
    },

    /* bir distribütörün toplam maliyet etkisi (yayın başına) */
    feeLabel(id, day) {
      const f = K.distro.feeFor(id, day);
      const d = K.distributorById(id);
      if (!d) return "—";
      if (d.model === "annual") {
        const until = K.distro.planUntil(id);
        const today = (day != null) ? day : ((K.state && K.state.day) || 0);
        if (until > today) return "yıllık plan aktif";
        return f + " ₺/yıl";
      }
      if (d.model === "free" || d.model === "label") return "ücretsiz";
      return f + " ₺/yayın";
    }
  };
})(window.K = window.K || {});
