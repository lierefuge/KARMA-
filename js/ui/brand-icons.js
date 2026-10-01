/* ============================================================
   KARMA — ui/brand-icons.js
   GERÇEK MARKA LOGOLARI (inline SVG)

   Telefon ikonları eskiden CSS gradyanı + emoji/karakterden
   oluşuyordu (Spotify = "♫", YouTube = "▶"). Bu modül her
   uygulama için markanın gerçek işaretini SVG olarak verir.

   K.brandIcon(id)              → SVG dizesi (logo yoksa "")
   K.brandIcon.has(id)          → logo tanımlı mı?
   K.brandIcon.tile(id, cls, g) → gradyanlı küçük kare + logo
   ============================================================ */
(function (K) {
  "use strict";

  /* Her kayıt yalnız SVG İÇERİĞİ (viewBox 0 0 24 24).
     Zemin rengi/gradyanı CSS'ten (ic-* sınıfları) gelir —
     gerçek uygulama ikonlarında olduğu gibi. */
  const MARKS = {
    /* ---- müzik ---- */
    spotify:
      '<g fill="none" stroke="#08130c" stroke-width="1.85" stroke-linecap="round">' +
      '<path d="M6.6 9.3c4-1.2 8.6-.9 12 1.2"/>' +
      '<path d="M7.3 12.6c3.3-1 7-.7 9.8.9"/>' +
      '<path d="M8.1 15.8c2.6-.8 5.5-.6 7.7.8"/></g>',

    applemusic:
      '<g fill="#fff">' +
      '<rect x="9.5" y="5.6" width="1.5" height="11.9" rx=".5"/>' +
      '<rect x="18.5" y="3.7" width="1.5" height="11.9" rx=".5"/>' +
      '<path d="M9.5 5.6 20 2.9v2.2L9.5 7.9z"/>' +
      '<circle cx="7.6" cy="17.5" r="2.6"/>' +
      '<circle cx="16.6" cy="15.6" r="2.6"/></g>',

    /* ---- video ---- */
    youtube: '<path fill="#fff" d="M9.3 7.7v8.6l7.1-4.3z"/>',

    /* ---- sosyal ---- */
    instagram:
      '<g fill="none" stroke="#fff" stroke-width="1.7">' +
      '<rect x="4.7" y="4.7" width="14.6" height="14.6" rx="4.5"/>' +
      '<circle cx="12" cy="12" r="3.5"/></g>' +
      '<circle cx="16.5" cy="7.5" r="1" fill="#fff"/>',

    tiktok:
      '<path fill="#25f4ee" d="M14.4 3h2.2c.2 1.9 1.3 3.2 3.2 3.4v2.2c-1.2.1-2.3-.2-3.3-.8v6c0 3.2-2.3 5.4-5.2 5.4-2.9 0-5-2-5-4.7 0-2.9 2.4-4.9 5.4-4.6v2.3c-.4-.1-.8-.2-1.2-.2-1.5 0-2.5 1-2.5 2.3 0 1.4 1 2.4 2.4 2.4 1.6 0 2.6-1.1 2.6-3V3z"/>' +
      '<path fill="#fe2c55" opacity=".8" d="M15 3h2.2c.2 1.9 1.3 3.2 3.2 3.4v2.2c-1.2.1-2.3-.2-3.3-.8v6c0 3.2-2.3 5.4-5.2 5.4-2.9 0-5-2-5-4.7 0-2.9 2.4-4.9 5.4-4.6v2.3c-.4-.1-.8-.2-1.2-.2-1.5 0-2.5 1-2.5 2.3 0 1.4 1 2.4 2.4 2.4 1.6 0 2.6-1.1 2.6-3V3z"/>' +
      '<path fill="#fff" d="M14.7 3h2.2c.2 1.9 1.3 3.2 3.2 3.4v2.2c-1.2.1-2.3-.2-3.3-.8v6c0 3.2-2.3 5.4-5.2 5.4-2.9 0-5-2-5-4.7 0-2.9 2.4-4.9 5.4-4.6v2.3c-.4-.1-.8-.2-1.2-.2-1.5 0-2.5 1-2.5 2.3 0 1.4 1 2.4 2.4 2.4 1.6 0 2.6-1.1 2.6-3V3z"/>',

    x:
      '<path fill="#fff" d="M17.6 4h2.8l-6.2 7.1L21.5 20h-5.7l-4.5-5.8L6.2 20H3.4l6.6-7.6L2.9 4h5.8l4.1 5.4L17.6 4zm-1 14.3h1.6L7.5 5.6H5.8l10.8 12.7z"/>',

    /* ---- iletişim ---- */
    messages:
      '<path fill="#fff" d="M12 4.2c-4.5 0-8.1 3-8.1 6.7 0 2.1 1.2 3.9 3 5.1-.1 1-.6 2-1.3 2.9 1.4-.1 2.8-.7 3.8-1.6.8.2 1.7.3 2.6.3 4.5 0 8.1-3 8.1-6.7S16.5 4.2 12 4.2z"/>',

    calls:
      '<path fill="#fff" d="M8.2 4.6c.6 0 1.1.4 1.3 1l.8 2.1c.2.5 0 1.1-.4 1.4l-1 .9c.9 1.7 2.3 3 4 4l.9-1c.4-.4.9-.5 1.4-.4l2.1.8c.6.2 1 .7 1 1.3v2.1c0 .9-.7 1.6-1.6 1.6C10.4 18.4 5.6 13.6 5.6 6.2c0-.9.7-1.6 1.6-1.6z"/>',

    /* ---- sanatçı panelleri ---- */
    spotifyartist:
      '<g fill="none" stroke="#08130c" stroke-width="1.6" stroke-linecap="round">' +
      '<path d="M6 8.6c3.6-1 7.6-.7 10.6 1"/>' +
      '<path d="M6.7 11.4c2.9-.8 6.1-.6 8.6.7"/></g>' +
      '<g fill="#fff">' +
      '<rect x="8.2" y="15.4" width="1.5" height="3.2" rx=".4"/>' +
      '<rect x="11" y="13.6" width="1.5" height="5" rx=".4"/>' +
      '<rect x="13.8" y="14.6" width="1.5" height="4" rx=".4"/></g>',

    appleartist:
      '<g fill="#fff">' +
      '<rect x="9" y="5.4" width="1.4" height="9.8" rx=".5"/>' +
      '<rect x="17.2" y="3.8" width="1.4" height="9.8" rx=".5"/>' +
      '<path d="M9 5.4 18.6 3v2.1L9 7.5z"/>' +
      '<circle cx="7.3" cy="15.6" r="2.3"/>' +
      '<circle cx="15.5" cy="14" r="2.3"/></g>',

    royalty:
      '<path fill="#fff" d="M6.8 4.6h2.7v6.3l5-6.3h3.2l-5.4 6.5 5.7 8.7h-3.2l-4.3-6.8-1 1.2v5.6H6.8z"/>',

    /* ---- sistem / diğer ---- */
    appstore:
      '<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round">' +
      '<path d="M7.2 17.2 12 6.6"/><path d="M16.8 17.2 12 6.6"/>' +
      '<path d="M9.1 12.4h5.8"/></g>',

    phonesettings:
      '<path fill="#fff" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',

    news:
      '<path fill="#fff" d="M17.6 4.8H6.3A1.2 1.2 0 0 0 5.1 6v11.5c0 .9.8 1.7 1.7 1.7h11c.9 0 1.7-.8 1.7-1.7V7.3a.6.6 0 0 0-1.1-.4c-.4.5-1 .8-1.7.8V5.4a.6.6 0 0 0-.6-.6zM7.3 8h4v1.4h-4zm0 2.8h4v1.4h-4zm0 2.8h4v1.4h-4z"/>',

    goals:
      '<g fill="none" stroke="#fff" stroke-width="1.7">' +
      '<circle cx="12" cy="12" r="6.9"/><circle cx="12" cy="12" r="3.3"/></g>' +
      '<circle cx="12" cy="12" r="1.1" fill="#fff"/>',

    team:
      '<g fill="#fff"><circle cx="12" cy="8.5" r="3.1"/>' +
      '<path d="M5.7 19.1c0-3.2 2.8-5.3 6.3-5.3s6.3 2.1 6.3 5.3c0 .5-.4.9-.9.9H6.6c-.5 0-.9-.4-.9-.9z"/></g>',

    video:
      '<g fill="#fff"><rect x="4.9" y="9.6" width="14.2" height="9.3" rx="1.5"/>' +
      '<path d="M5.4 5.4 18 4.1l.5 2.7L5.9 8.1z"/></g>' +
      '<g stroke="#b02a4a" stroke-width="1" fill="none">' +
      '<path d="M9.1 5 10.9 7.6M12.6 4.7l1.8 2.6M16.1 4.4l1.8 2.6"/></g>',

    fans:
      '<path fill="#fff" d="M12 19.4 5.3 12.9A4.3 4.3 0 0 1 11.1 6.8l.9 1 .9-1a4.3 4.3 0 0 1 5.8 6.1z"/>'
  };

  function svg(id) {
    const m = MARKS[id];
    if (!m) return "";
    return '<svg class="brand-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + m + "</svg>";
  }

  svg.has = function (id) { return !!MARKS[id]; };
  svg.ids = function () { return Object.keys(MARKS); };

  /* küçük liste satırları için: gradyanlı kare + logo (yoksa emoji) */
  svg.tile = function (id, cls, glyph) {
    const inner = svg(id) || (glyph || "");
    return '<span class="brand-ic ' + (cls || "") + '">' + inner + "</span>";
  };

  K.brandIcon = svg;
})(window.K = window.K || {});
