/* ============================================================
   KARMA — core/util.js
   Global namespace, formatting, RNG, DOM helpers.
   ============================================================ */
window.K = window.K || {};

(function (K) {
  "use strict";

  K.util = {
    /* ---------- number formatting ---------- */
    fmt(n) {
      n = Math.round(n || 0);
      return n.toLocaleString("tr-TR");
    },
    money(n) {
      return "₺" + Math.round(n || 0).toLocaleString("tr-TR");
    },
    /* compact: 12.3M, 4.5B, 980K */
    compact(n) {
      n = Math.round(n || 0);
      if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(".", ",") + " Mr";
      if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",") + " Mn";
      if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(".", ",") + " B";
      return String(n);
    },
    listeners(n) { return K.util.compact(n) + " aylık dinleyici"; },
    streams(n) { return K.util.compact(n) + " dinlenme"; },
    views(n) { return K.util.compact(n) + " görüntülenme"; },
    pct(n) { return Math.round(n) + "%"; },

    /* ---------- RNG ---------- */
    rand(min, max) { return Math.random() * (max - min) + min; },
    randInt(min, max) { return Math.floor(K.util.rand(min, max + 1)); },
    chance(p) { return Math.random() < p; },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    pickWeighted(arr, weightFn) {
      const total = arr.reduce((s, x) => s + weightFn(x), 0);
      let r = Math.random() * total;
      for (const x of arr) { r -= weightFn(x); if (r <= 0) return x; }
      return arr[arr.length - 1];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
    uid(prefix) { return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9); },

    /* ---------- time / dates ---------- */
    // Gerçek takvim: oyun gün 1 = K.state.dateStart tarihi.
    // Her yeni gün takvimde gerçek bir gün ilerler (30 günlük yapay ay YOK).
    MONTHS: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
    MONTHS_SHORT: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
    DOW: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],

    /* bugünün tarihi (YYYY-MM-DD) */
    todayISO() {
      const d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    },
    fromISO(iso) {
      const p = String(iso || K.util.todayISO()).split("-").map(Number);
      /* v10.56 — varsayılan yıl 2008 DEĞİL, o anki gerçek yıldır (oyun
         gerçek takvimden başlar; bkz. state.dateStart = todayISO()). */
      return { y: p[0] || new Date().getFullYear(), m: p[1] || 1, d: p[2] || 1 };
    },
    toISO(o) {
      return o.y + "-" + String(o.m).padStart(2, "0") + "-" + String(o.d).padStart(2, "0");
    },
    /* bir tarihe N gün ekle (ay/yıl uzunlukları ve artık yıl gerçek) */
    addDays(o, n) {
      const dt = new Date(o.y, o.m - 1, o.d);
      dt.setDate(dt.getDate() + n);
      return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
    },
    /* oyun gününü gerçek takvim tarihine çevir */
    dateObjForDay(day) {
      const start = (K.state && K.state.dateStart) ? K.state.dateStart : K.util.todayISO();
      return K.util.addDays(K.util.fromISO(start), (day - 1));
    },
    dateForDay(day) {
      const o = K.util.dateObjForDay(day);
      const dowIdx = (new Date(o.y, o.m - 1, o.d).getDay() + 6) % 7; // Pazartesi=0
      const mon = K.util.MONTHS[o.m - 1];
      return {
        y: o.y, m: o.m, dayOfMonth: o.d,
        month: mon, monthIndex: o.m, monthShort: K.util.MONTHS_SHORT[o.m - 1],
        dow: K.util.DOW[dowIdx],
        label: o.d + " " + mon + " " + o.y,
        short: o.d + " " + mon,
        iso: K.util.toISO(o)
      };
    },
    /* iki tarih arasındaki tam yıl (yaş). birth = {y,m,d} */
    ageOn(birth, date) {
      if (!birth || !birth.y) return 0;
      let a = date.y - birth.y;
      if (date.m < birth.m || (date.m === birth.m && date.d < birth.d)) a -= 1;
      return a;
    },
    /* doğum günü bu tarihe denk geliyor mu? (29 Şubat güvenli) */
    isBirthdayOn(birth, date) {
      if (!birth || !birth.m || !birth.d) return false;
      if (date.m === birth.m && date.d === birth.d) return true;
      // 29 Şubat doğanlar, artık olmayan yıllarda 1 Mart'ta kutlar
      if (birth.m === 2 && birth.d === 29 && date.m === 3 && date.d === 1) return true;
      return false;
    },

    /* ---------- colors from string (deterministic) ---------- */
    hashHue(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
      return h;
    },
    gradientFor(seed) {
      const h = K.util.hashHue(seed || "x");
      return `linear-gradient(135deg, hsl(${h} 62% 58%), hsl(${(h + 48) % 360} 62% 42%))`;
    },
    colorFor(seed) {
      return `hsl(${K.util.hashHue(seed || "x")} 70% 62%)`;
    },
    initials(name) {
      return (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    },
    escape(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    /* ---------- DOM ---------- */
    el(tag, cls, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    qs(sel, root) { return (root || document).querySelector(sel); },
    qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },
    on(el, ev, fn) { if (el) el.addEventListener(ev, fn); return el; },

    /* ---------- misc ---------- */
    sum(arr, fn) { return arr.reduce((s, x) => s + (fn ? fn(x) : x), 0); },
    deepClone(o) { return JSON.parse(JSON.stringify(o)); },
    plural(n, one, many) { return n === 1 ? one : many; },
    ago(day, cur) {
      const d = cur - day;
      if (d <= 0) return "şimdi";
      if (d === 1) return "dün";
      return d + " gün önce";
    }
  };
})(window.K);
