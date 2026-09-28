/* ============================================================
   KARMA — ui/studio.js
   ORTAK "STUDIO" BİLEŞENLERİ (tüm telefon uygulamaları için)
   Rehber: docs/studio-components.md · Yapı: css/studio.css
   Renkler: css/studio-theme.css

   Kullanım:
     const card = K.studio.card, note = K.studio.note, stat = K.studio.stat;
     card(note("🟢", "Güzel gidiyor.", "ok"), K.studio.ACCENT.ok)
     K.studio.row("TikTok", 42, "42%")
     K.studio.health({ label: "Kanal Sağlığı", score: 78, text: "İyi", color: ..., toColor: ... })
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* yorum tonları */
  const TONES = ["ok", "warn", "bad", "info", "violet", "hot", "dim"];

  /* geriye dönük uyumluluk: eski rgba() arka planlarını tona çevirir */
  const RGBA_TONE = {
    "rgba(74,222,128,.14)": "ok", "rgba(30,215,96,.13)": "ok",
    "rgba(250,204,21,.13)": "warn",
    "rgba(248,113,113,.15)": "bad",
    "rgba(110,195,255,.12)": "info", "rgba(110,195,255,.13)": "info", "rgba(37,244,238,.12)": "info",
    "rgba(150,90,255,.14)": "violet",
    "rgba(255,92,122,.13)": "hot", "rgba(255,92,122,.14)": "hot",
    "rgba(255,255,255,.05)": "dim", "rgba(255,255,255,.06)": "dim"
  };

  function esc(s) { return (U && U.escape) ? U.escape(s) : String(s); }
  function clampPct(p) { return Math.max(0, Math.min(100, Number(p) || 0)); }

  const studio = {

    TONES,

    /* aksan presetleri (css/studio-theme.css ile aynı değerler) */
    ACCENT: {
      hot: "#ff5c7a", ok: "#4ade80", warn: "#facc15", bad: "#f87171",
      info: "#6ec3ff", violet: "#b06cff", money: "#5ce89b", gold: "#ffcb5c",
      youtube: "#ff5c7a", spotify: "#1ed760", tiktok: "#fe2c55"
    },

    /* bir ton adı ya da eski rgba() alır → ton adı döner */
    tone(v) {
      if (!v) return "dim";
      if (TONES.indexOf(v) >= 0) return v;
      return RGBA_TONE[v] || "dim";
    },

    /* ---- kart (sol aksan çubuğu) ---- */
    card(inner, accent) {
      return `<div class="studio-card"${accent ? ` style="--studio-accent:${accent}"` : ""}>${inner}</div>`;
    },

    /* ---- yorum / öneri satırı ---- */
    note(icon, text, toneOrRgba) {
      return `<div class="studio-note ${studio.tone(toneOrRgba)}">${icon}&nbsp; ${text}</div>`;
    },

    /* ---- metrik kutusu (.sp-stat) ---- */
    stat(label, value, bg) {
      return `<div class="sp-stat"${bg ? ` style="background:${bg}"` : ""}><div class="k">${esc(label)}</div><div class="v">${value}</div></div>`;
    },

    /* ---- başlık ---- */
    title(text, cls) {
      return `<div class="studio-title${cls ? " " + cls : ""}">${esc(text)}</div>`;
    },

    /* ---- yatay bar ---- */
    bar(pct, opts) {
      opts = opts || {};
      const cls = ["studio-bar", opts.cls || ""].filter(Boolean).join(" ");
      const w = clampPct(pct);
      const style = `width:${w}%` + (opts.color ? `;background:${opts.color}` : "");
      return `<div class="${cls}"><i class="studio-bar-fill" style="${style}"></i></div>`;
    },

    /* ---- etiket + bar + değer satırı ---- */
    row(label, pct, value, opts) {
      opts = opts || {};
      const lc = ["studio-row-label", opts.labelCls || ""].filter(Boolean).join(" ");
      const vc = ["studio-row-val", opts.valCls || ""].filter(Boolean).join(" ");
      const val = (value != null) ? value : Math.round(clampPct(pct)) + "%";
      return `<div class="studio-row">`
        + `<div class="${lc}">${esc(label)}</div>`
        + studio.bar(pct, { cls: opts.barCls, color: opts.color })
        + `<div class="${vc}">${val}</div>`
        + `</div>`;
    },

    /* ---- sağlık skoru bloğu ---- */
    health(opts) {
      opts = opts || {};
      const score = clampPct(opts.score);
      const color = opts.color || "#4ade80";
      const toColor = opts.toColor || color;
      return `<div class="studio-health">`
        + `<div><div class="studio-health-label">${esc(opts.label || "Sağlık")}</div>`
        + `<div class="studio-health-val" style="color:${color}">${Math.round(score)}/100${opts.text ? " · " + esc(opts.text) : ""}</div></div>`
        + `<div class="studio-health-emoji">${opts.emoji || "📊"}</div>`
        + `</div>`
        + `<div class="studio-health-bar"><i style="width:${score}%;background:linear-gradient(90deg,${color},${toColor})"></i></div>`;
    }
  };

  K.studio = studio;
})(window.K = window.K || {});
