/* ============================================================
   KARMA — js/version.js   (v10.18)
   İNSAN OKUNUR YAYIN SÜRÜMÜ.

   Önbellek sürümü (`?v=<içerik hash'i>`) her dosya değişiminde
   kendiliğinden değişir — makine için doğru, insan için okunaksız.
   Bu dosya "canlıda hangi sürüm var?" sorusunun tek satırlık cevabıdır.

   Güncelleme:  node tools/release.js patch|minor|major
   (release.js bu dosyayı ve package.json'u birlikte yazar.)
   ============================================================ */
(function (K) {
  "use strict";
  K.VERSION = "10.71.0";
  K.VERSION_DATE = "2026-10-31";
})(window.K = window.K || {});
/* v10.67.0 — yeni çıkış akışı (release-intel) + takvim tabanlı playlist rotasyonu. */
/* v10.70.0 — stüdyo odası: eşya, yerleşim, masa üstü katmanı (js/systems/studioroom.js). */
/* v10.71.0 — kendi WebGL motoru: serbest kamera, gerçek geometri, raycast sürükle-bırak (js/systems/roomgl.js). */
