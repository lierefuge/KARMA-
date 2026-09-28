/* ============================================================
   KARMA — systems/team.js
   KİŞİSEL EKİP: menajer · PR · avukat · ses mühendisi · stilist
   Her rolün seviyesi vardır; işe alma ücreti + AYLIK MAAŞ (gidere eklenir).
   Bonuslar diğer sistemlere küçük çarpanlar olarak yansır.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const ROLES = {
    manager:  { name: "Menajer",       icon: "🧑‍💼", hire: 60000, salary: 9000,  max: 5, desc: "Avansları ve turne gelirini artırır." },
    pr:       { name: "PR Uzmanı",     icon: "📣", hire: 45000, salary: 7000,  max: 5, desc: "Promo etkisini ve imajı güçlendirir." },
    lawyer:   { name: "Avukat",        icon: "⚖️", hire: 80000, salary: 11000, max: 5, desc: "Şirket payını ve anlaşma maliyetini azaltır." },
    engineer: { name: "Ses Mühendisi", icon: "🎚️", hire: 70000, salary: 10000, max: 5, desc: "Şarkı kalitesini artırır." },
    stylist:  { name: "Stilist",       icon: "🧥", hire: 35000, salary: 6000,  max: 5, desc: "İmaj skorunu yükseltir." }
  };

  K.team = {
    ROLES,

    level(role) { return (K.state.player.team && K.state.player.team[role]) || 0; },

    hireCost(role) {
      const d = ROLES[role];
      return Math.round(d.hire * Math.pow(1.6, K.team.level(role)));
    },

    canHire(role) {
      const d = ROLES[role];
      return d && K.team.level(role) < d.max;
    },

    hire(role) {
      const d = ROLES[role];
      if (!d) return false;
      if (!K.team.canHire(role)) { K.toast("Maksimum seviye", d.name + " zaten en üstte.", "warn"); return false; }
      const cost = K.team.hireCost(role);
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", U.money(cost) + " gerekiyor.", "bad"); return false; }
      K.economy.spend(cost, "team_hire");
      K.state.player.team[role] = K.team.level(role) + 1;
      K.toast(d.icon + " " + d.name, "Seviye " + K.team.level(role) + " · aylık " + U.money(d.salary * K.team.level(role)), "ok");
      K.save(); if (K.refresh) K.refresh();
      return true;
    },

    fire(role) {
      const d = ROLES[role];
      if (!d || K.team.level(role) <= 0) return false;
      K.state.player.team[role] = K.team.level(role) - 1;
      K.toast("👋 Çıkarıldı", d.name + " ekibi bıraktı.", "warn");
      K.save(); if (K.refresh) K.refresh();
      return true;
    },

    /* aylık toplam maaş (economy.chargeMonthly gidere ekler) */
    salaryTotal() {
      return Object.keys(ROLES).reduce((n, r) => n + K.team.level(r) * ROLES[r].salary, 0);
    },

    /* bonus çarpanları */
    bonus() {
      const l = r => K.team.level(r);
      return {
        advance: 1 + l("manager") * 0.07,   // avans pazarlığı
        tour: 1 + l("manager") * 0.05,      // turne/konser geliri
        promo: 1 + l("pr") * 0.06,          // sosyal promo etkisi
        image: l("pr") * 0.35 + l("stylist") * 0.5,   // günlük imaj katkısı
        lawyerCut: l("lawyer") * 0.02,      // şirket payını azaltır (0.02/seviye)
        costCut: l("lawyer") * 0.03,        // sözleşme/buyout maliyeti indirimi
        quality: l("engineer") * 1.6        // şarkı kalitesi puanı
      };
    }
  };
})(window.K = window.K || {});
