/* ============================================================
   KARMA — systems/time.js   (v10.52)
   OYUN-İÇİ SAAT (tek kaynak).

   Neden gerekli?
   --------------
   Oyun gün bazlı ilerliyor ama NPC rutinlerinin anlamlı olması
   için "günün hangi saatinde olduğumuz" lazım. Telefonun durum
   çubuğunda zaten bir saat vardı (09:41 temelli, gün ilerledikçe
   kayar) ama bu hesap phone.js içine gömülüydü ve başka hiçbir
   sistem ondan haberdar değildi.

   Artık saat TEK yerde: gün 0 → 09:41, her gün +47 dk. Böylece
   günler geçtikçe günün farklı saatlerini yaşarız (bazen gece,
   bazen sabah) ve "trap'çi gece ayakta, popçu gündüz" gibi
   rutinler gerçekten hissedilir.

   NOT: Saat SALT OKUNUR bir türetmedir — gün döngüsünü değiştirmez,
   yalnızca görünüm ve davranış (müsaitlik/gecikme) için kullanılır.
   ============================================================ */
(function (K) {
  "use strict";

  const BASE_MIN = 9 * 60 + 41;   // gün 0'da 09:41
  const PER_DAY  = 47;            // her gün saat bu kadar ileri kayar

  K.time = {
    /* günün kaçıncı dakikası (0-1439) */
    minutes() {
      const day = (K.state && K.state.day) || 0;
      const m = (BASE_MIN + day * PER_DAY) % 1440;
      return (m + 1440) % 1440;
    },

    hour() { return Math.floor(K.time.minutes() / 60); },

    /* "HH:MM" — telefon durum çubuğu bunu kullanır */
    label() {
      const m = K.time.minutes();
      return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
    },

    /* günün bölümü: gece / sabah / gunduz / aksam */
    phase() {
      const h = K.time.hour();
      if (h < 6)  return "gece";
      if (h < 12) return "sabah";
      if (h < 18) return "gunduz";
      if (h < 23) return "aksam";
      return "gece";
    },

    phaseLabel() {
      return { gece: "Gece", sabah: "Sabah", gunduz: "Gündüz", aksam: "Akşam" }[K.time.phase()];
    },

    /* "şu an" insan okunur: "23:14 · Gece" */
    stamp() { return K.time.label() + " · " + K.time.phaseLabel(); }
  };
})(window.K = window.K || {});
