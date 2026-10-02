/* ============================================================
   KARMA — ui/cover.js   (v10.38)
   ALBÜM KAPAĞI ÜRETİCİSİ

   Kapak tanımı (seed) kısa bir metindir — 15 parça:
     cv~stil~desen~yazı~ton~grain~font~hiza~şekil~sanatçı~başlık
       ~düzen~çerçeve~explicit~yıl

   Örnek:
     cv~gece~ring~mono~-1~1~blok~center~none~Şehinşah~Gece Yarısı
       ~merkez~1~0~2026

   Geriye uyumluluk: eski 7 ve 11 parçalı seed'ler de çözülür
   (eksik alanlar varsayılana düşer).

   v10.38 — NELER DEĞİŞTİ:
   • Yazı artık TAŞMIYOR: satırlar genişliğe göre sarılır, sığmazsa
     punto otomatik küçülür (eski "mono + uzun başlık" taşması kapandı).
   • Desenler ve şekiller görünür: opaklıklar 0.07 → 0.20 bandına çıktı.
   • 8 düzen (kompozisyon), 16 palet, 12 desen, 12 şekil, 5 yazı modu,
     7 font eklendi.
   • Yeni katmanlar: çerçeve · explicit (E) işareti · yıl etiketi.
   ============================================================ */
(function (K) {
  "use strict";

  const W = 600, H = 600;

  /* ============================================================
     1) PALETLER — 16 stil
     `ink` yazı rengi (açık paletlerde koyu).
     ============================================================ */
  K.COVER_STYLES = [
    { id: "gece",      name: "Gece",       c1: "#101a33", c2: "#4a2f6b" },
    { id: "ates",      name: "Ateş",       c1: "#2a0f0f", c2: "#c0392b" },
    { id: "buz",       name: "Buz",        c1: "#0d2733", c2: "#38a3c4" },
    { id: "altin",     name: "Altın",      c1: "#2e2408", c2: "#d4a72c" },
    { id: "neon",      name: "Neon",       c1: "#22082e", c2: "#e83fa6" },
    { id: "orman",     name: "Orman",      c1: "#0d1f14", c2: "#3f8a4f" },
    { id: "kum",       name: "Kum",        c1: "#2e2416", c2: "#cf9a5e" },
    { id: "beton",     name: "Beton",      c1: "#1a1a20", c2: "#71717c" },
    { id: "mor",       name: "Mor",        c1: "#1d1036", c2: "#7b4bd6" },
    { id: "kan",       name: "Kan",        c1: "#1c0606", c2: "#8e1b1b" },
    { id: "okyanus",   name: "Okyanus",    c1: "#06202e", c2: "#1f7a8c" },
    { id: "gul",       name: "Gül",        c1: "#33101f", c2: "#d4627f" },
    { id: "retro",     name: "Retro",      c1: "#3a1f08", c2: "#e07a3f" },
    { id: "zehir",     name: "Zehir",      c1: "#14210a", c2: "#8fc93a" },
    { id: "gunbatimi", name: "Gün Batımı", c1: "#2b1030", c2: "#f2724b" },
    { id: "kagit",     name: "Kâğıt",      c1: "#e9e3d6", c2: "#c9bda6", ink: "#171410" }
  ];

  /* ============================================================
     2) DESENLER — 12
     ============================================================ */
  K.COVER_PATTERNS = [
    { id: "flat",     name: "Düz" },
    { id: "ring",     name: "Halka" },
    { id: "line",     name: "Çizgi" },
    { id: "grid",     name: "Izgara" },
    { id: "dots",     name: "Nokta" },
    { id: "wave",     name: "Dalga" },
    { id: "halftone", name: "Noktalı Ton" },
    { id: "cross",    name: "Çapraz" },
    { id: "bars",     name: "Bantlar" },
    { id: "circles",  name: "Daireler" },
    { id: "scratch",  name: "Çizik" },
    { id: "blocks",   name: "Kareler" }
  ];

  /* ============================================================
     3) ŞEKİLLER — 12
     ============================================================ */
  K.COVER_SHAPES = [
    { id: "none",     name: "Yok" },
    { id: "circle",   name: "Daire" },
    { id: "triangle", name: "Üçgen" },
    { id: "block",    name: "Blok" },
    { id: "arc",      name: "Yay" },
    { id: "diamond",  name: "Elmas" },
    { id: "band",     name: "Bant" },
    { id: "topband",  name: "Üst Bant" },
    { id: "botband",  name: "Alt Bant" },
    { id: "diag",     name: "Köşegen" },
    { id: "semi",     name: "Yarım Daire" },
    { id: "ring2",    name: "Kalın Halka" }
  ];

  /* ============================================================
     4) DÜZENLER — 8 kompozisyon
     Metnin kapakta nasıl yerleştiğini belirler.
     ============================================================ */
  K.COVER_LAYOUTS = [
    { id: "merkez",  name: "Merkez",   hint: "Ortada, dengeli" },
    { id: "ust",     name: "Üst",      hint: "Yazı yukarıda" },
    { id: "alt",     name: "Alt",      hint: "Yazı aşağıda" },
    { id: "serit",   name: "Şerit",    hint: "Ortada yatay bant" },
    { id: "altblok", name: "Alt Blok", hint: "Alt kısımda karartmalı blok" },
    { id: "devharf", name: "Dev Harf", hint: "Monogram tüm kapağa yayılır" },
    { id: "kose",    name: "Köşe",     hint: "Sol üstte blok" },
    { id: "dergi",   name: "Dergi",    hint: "Büyük başlık + ince çizgi" }
  ];

  /* ============================================================
     5) YAZI MODLARI — 5
     ============================================================ */
  K.COVER_TEXT_MODES = [
    { id: "mono",  name: "Monogram" },
    { id: "title", name: "Başlık" },
    { id: "kisa",  name: "Kısa" },
    { id: "buyuk", name: "Büyük" },
    { id: "none",  name: "Yazısız" }
  ];

  /* ============================================================
     6) FONTLAR — 7
     `w` = karakter başına genişlik katsayısı (yazı taşmasını
     önlemek için punto hesabında kullanılır).
     ============================================================ */
  /* v10.38 — fontlar artık GERÇEKTEN ayrışıyor.

     ÖNEMLİ: kapak bir `data:` SVG GÖRÜNTÜSÜ olarak çizilir. Görüntü
     bağlamındaki SVG, sayfanın web fontlarına (Inter, Nunito, …)
     ERİŞEMEZ — adı geçen font bulunamazsa render motoru SERIF'e düşer.
     Bu yüzden fontlar yalnız GENERIC ailelerden (sans-serif / serif /
     monospace) kurulur ve fark; ağırlık, harf aralığı ve `textLength`
     sıkıştırmasıyla üretilir. Böylece her platformda aynı görünür.

     Eskiden "İnce" Inter 300 istiyordu (yüklü değildi, 400'e düşüyordu),
     "Dar" ise sistemde bulunmayan Arial Narrow'a güveniyordu — ikisi de
     Blok'tan ayırt edilemiyordu. */
  K.COVER_FONTS = [
    { id: "blok",  name: "Blok",  family: "sans-serif", weight: 900, spacing: -2, w: 0.56 },
    { id: "ince",  name: "İnce",  family: "sans-serif", weight: 300, spacing: 7,  w: 0.50 },
    { id: "serif", name: "Serif", family: "serif",      weight: 700, spacing: 0,  w: 0.50 },
    { id: "mono",  name: "Mono",  family: "monospace",  weight: 700, spacing: 0,  w: 0.62 },
    { id: "dar",   name: "Dar",   family: "sans-serif", weight: 800, spacing: 0,  w: 0.56, condense: 0.78 },
    { id: "genis", name: "Geniş", family: "sans-serif", weight: 700, spacing: 9,  w: 0.54 },
    { id: "slab",  name: "Slab",  family: "serif",      weight: 900, spacing: -1, w: 0.55 }
  ];

  /* metin güvenli alanı (kenar boşluğu). 68px pay, model hatası
     payıyla birlikte yazının 600px tuvale taşmamasını garanti eder. */
  const MARGIN = 68;
  const MAXW = W - MARGIN * 2;

  /* ---------------- yardımcılar ---------------- */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const fontById = (id) => K.COVER_FONTS.find((f) => f.id === id) || K.COVER_FONTS[0];
  const styleById = (id) => K.COVER_STYLES.find((s) => s.id === id) || K.COVER_STYLES[0];

  /* tahmini metin genişliği — punto hesabının temeli.
     `condense` varsa gerçek genişlik textLength ile sıkıştırılır,
     bu yüzden modelde de sıkıştırılmış genişlik kullanılır. */
  function textW(str, size, font) {
    const n = String(str || "").length;
    if (!n) return 0;
    const nat = n * size * font.w + Math.max(0, n - 1) * (font.spacing || 0);
    return nat * (font.condense || 1);
  }

  /* kelimeleri genişliğe göre satırlara böl */
  function wrapWords(words, size, font, maxW) {
    const lines = [];
    let cur = "";
    words.forEach((w) => {
      const test = cur ? cur + " " + w : w;
      if (!cur || textW(test, size, font) <= maxW) cur = test;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  /* PUNTOYU SIĞDIR: satırlar sarılır, sığmazsa punto küçülür.
     Son çare olarak genişlikten geriye ölçekler — taşma imkânsız. */
  function fitLines(words, font, maxW, base, minSize, maxLines) {
    let size = base;
    let lines = [];
    const cap = maxLines || 3;
    for (let guard = 0; guard < 80; guard++) {
      lines = wrapWords(words, size, font, maxW).slice(0, cap);
      const widest = lines.reduce((m, l) => Math.max(m, textW(l, size, font)), 0);
      if (widest <= maxW) return { lines, size };
      if (size <= minSize) {
        const k = maxW / Math.max(1, widest);
        return { lines, size: Math.max(10, Math.floor(size * k)) };
      }
      size -= 2;
    }
    return { lines, size };
  }

  /* tek bir metin satırı */
  /* data-w: punto hesabında kullanılan genişlik katsayısı. SVG'ye
     yazılır çünkü aynı font-family birden çok kayıtta geçebiliyor
     (blok/ince) ve ölçüm testinin doğru katsayıyı bulması gerekiyor. */
  function line(str, size, x, y, anchor, font, ink, opacity) {
    const n = String(str == null ? "" : str).length;
    let cond = "";
    if (font.condense) {
      const nat = n * size * font.w + Math.max(0, n - 1) * (font.spacing || 0);
      cond = ` textLength="${Math.round(nat * font.condense)}" lengthAdjust="spacingAndGlyphs"`;
    }
    return `<text x="${x}" y="${Math.round(y)}" text-anchor="${anchor}" dominant-baseline="central"` +
      ` font-family="${font.family}" font-weight="${font.weight}" letter-spacing="${font.spacing}"` +
      ` font-size="${size}" data-w="${font.w}"` + (font.condense ? ` data-c="${font.condense}"` : "") + cond +
      ` fill="${ink}" fill-opacity="${opacity == null ? 0.95 : opacity}">${esc(str)}</text>`;
  }

  /* çok satırlı blok — cy merkezli */
  function block(lines, size, cx, cy, anchor, font, ink, leading) {
    const lh = size * (leading || 1.14);
    const startY = cy - ((lines.length - 1) * lh) / 2;
    return lines.map((l, i) => line(l, size, cx, startY + i * lh, anchor, font, ink)).join("");
  }

  /* sanatçı adı — uzunsa küçülür */
  function artistLine(artist, cx, cy, anchor, ink) {
    if (!artist) return "";
    const af = { family: "Inter, Arial, sans-serif", weight: 600, spacing: 4, w: 0.58 };
    let size = 26;
    while (textW(artist, size, af) > MAXW && size > 12) size -= 1;
    return line(artist.toUpperCase(), size, cx, cy, anchor, af, ink, 0.78);
  }

  /* ============================================================
     7) SEED ÇÖZÜMLEME
     ============================================================ */
  K.coverParse = function (seed) {
    const s = String(seed == null ? "" : seed);
    if (s.indexOf("cv~") !== 0) return null;
    const p = s.split("~");
    const dec = (i) => { try { return decodeURIComponent(p[i] || ""); } catch (e) { return ""; } };

    const hasFont   = p.length >= 11;   // v10.18+ : font/hiza/şekil/sanatçı eklendi
    const hasLayout = p.length >= 12;   // v10.38  : düzen/çerçeve/explicit/yıl

    /* hiza → düzen (eski kayıtlarda düzen alanı yok) */
    const align = hasFont ? (p[7] || "center") : "center";
    const legacyLayout = align === "top" ? "ust" : align === "bottom" ? "alt" : "merkez";

    const layout = hasLayout ? (p[11] || legacyLayout) : legacyLayout;
    const okLayout = K.COVER_LAYOUTS.some((l) => l.id === layout);

    return {
      style:   p[1] || "gece",
      pattern: p[2] || "flat",
      text:    p[3] || "mono",
      hue:     (p[4] != null && p[4] !== "") ? +p[4] : -1,
      grain:   p[5] === "0" ? 0 : 1,
      font:    hasFont ? (p[6] || "blok") : "blok",
      align:   align,
      shape:   hasFont ? (p[8] || "none") : "none",
      artist:  hasFont ? dec(9) : "",
      title:   dec(hasFont ? 10 : 6),
      layout:  okLayout ? layout : "merkez",
      frame:   hasLayout ? p[12] !== "0" : false,
      explicit: hasLayout ? p[13] === "1" : false,
      year:    hasLayout ? (p[14] || "") : ""
    };
  };

  /* ============================================================
     8) DESEN KATMANI
     Opaklıklar v10.38'de belirgin şekilde artırıldı; eskiden
     0.07–0.13 idi ve desenler gözle görünmüyordu.
     ============================================================ */
  function patternSVG(id, ink) {
    const o = (v) => v; // okunabilirlik
    if (id === "ring") {
      return [120, 186, 252, 318, 384].map((r) =>
        `<circle cx="300" cy="300" r="${r}" fill="none" stroke="${ink}" stroke-opacity="${o(0.20)}" stroke-width="2.5"/>`).join("");
    }
    if (id === "line") {
      let g = "";
      for (let i = -8; i < 16; i++) {
        g += `<line x1="${i * 60}" y1="0" x2="${i * 60 + 380}" y2="600" stroke="${ink}" stroke-opacity="${o(0.19)}" stroke-width="2.5"/>`;
      }
      return g;
    }
    if (id === "grid") {
      let g = "";
      for (let i = 1; i < 8; i++) {
        g += `<line x1="${i * 75}" y1="0" x2="${i * 75}" y2="600" stroke="${ink}" stroke-opacity="${o(0.18)}" stroke-width="2"/>`;
        g += `<line x1="0" y1="${i * 75}" x2="600" y2="${i * 75}" stroke="${ink}" stroke-opacity="${o(0.18)}" stroke-width="2"/>`;
      }
      return g;
    }
    if (id === "dots") {
      let g = "";
      for (let y = 40; y < 600; y += 56) {
        for (let x = 40 + (((y / 56) | 0) % 2) * 28; x < 600; x += 56) {
          g += `<circle cx="${x}" cy="${y}" r="3.5" fill="${ink}" fill-opacity="${o(0.26)}"/>`;
        }
      }
      return g;
    }
    if (id === "wave") {
      let g = "";
      for (let k = 0; k < 5; k++) {
        const y = 110 + k * 95;
        g += `<path d="M0 ${y} Q150 ${y - 55} 300 ${y} T600 ${y}" fill="none" stroke="${ink}" stroke-opacity="${o(0.22)}" stroke-width="3.5"/>`;
      }
      return g;
    }
    if (id === "halftone") {
      let g = "";
      for (let y = 20; y < 600; y += 30) {
        for (let x = 20; x < 600; x += 30) {
          const r = 1 + (x / 600) * 5;
          g += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${ink}" fill-opacity="${o(0.20)}"/>`;
        }
      }
      return g;
    }
    if (id === "cross") {
      let g = "";
      for (let i = -14; i < 24; i++) {
        g += `<line x1="${i * 60}" y1="0" x2="${i * 60 + 380}" y2="600" stroke="${ink}" stroke-opacity="${o(0.15)}" stroke-width="2"/>`;
        g += `<line x1="${i * 60}" y1="600" x2="${i * 60 + 380}" y2="0" stroke="${ink}" stroke-opacity="${o(0.15)}" stroke-width="2"/>`;
      }
      return g;
    }
    if (id === "bars") {
      let g = "";
      for (let i = 0; i < 11; i++) {
        const w = 22 + (i % 4) * 14;
        g += `<rect x="${i * 56 + 8}" y="0" width="${w}" height="600" fill="${ink}" fill-opacity="${o(0.13)}"/>`;
      }
      return g;
    }
    if (id === "circles") {
      const pts = [[110, 130, 78], [470, 170, 120], [200, 430, 150], [520, 480, 70], [60, 500, 52]];
      return pts.map(([cx, cy, r]) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink}" stroke-opacity="${o(0.20)}" stroke-width="3"/>`).join("");
    }
    if (id === "scratch") {
      let g = "";
      for (let k = 0; k < 26; k++) {
        const y = 14 + k * 23;
        const len = 90 + ((k * 97) % 420);
        const x = (k * 61) % (600 - len);
        g += `<rect x="${x}" y="${y}" width="${len}" height="${1 + (k % 3)}" fill="${ink}" fill-opacity="${o(0.22)}"/>`;
      }
      return g;
    }
    if (id === "blocks") {
      const b = [[40, 40, 150, 150], [330, 70, 200, 120], [70, 350, 180, 200], [380, 330, 170, 170]];
      return b.map(([x, y, w, h]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${ink}" stroke-opacity="${o(0.20)}" stroke-width="3"/>`).join("");
    }
    return "";
  }

  /* ============================================================
     9) ŞEKİL KATMANI — eskiden hepsi %16 siyahtı (görünmez).
     ============================================================ */
  function shapeSVG(id, dark) {
    const d = dark ? "#000" : "#fff";
    const o = dark ? 0.34 : 0.20;
    if (id === "circle")   return `<circle cx="300" cy="300" r="238" fill="${d}" fill-opacity="${o}"/>`;
    if (id === "triangle") return `<polygon points="300,96 500,470 100,470" fill="${d}" fill-opacity="${o}"/>`;
    if (id === "block")    return `<rect x="84" y="84" width="432" height="432" fill="${d}" fill-opacity="${o}"/>`;
    if (id === "arc")      return `<path d="M0 452 Q300 322 600 452 L600 600 L0 600 Z" fill="${d}" fill-opacity="${o + 0.16}"/>`;
    if (id === "diamond")  return `<polygon points="300,58 542,300 300,542 58,300" fill="${d}" fill-opacity="${o}"/>`;
    if (id === "band")     return `<rect x="0" y="238" width="600" height="124" fill="${d}" fill-opacity="${o + 0.14}"/>`;
    if (id === "topband")  return `<rect x="0" y="0" width="600" height="196" fill="${d}" fill-opacity="${o + 0.12}"/>`;
    if (id === "botband")  return `<rect x="0" y="404" width="600" height="196" fill="${d}" fill-opacity="${o + 0.12}"/>`;
    if (id === "diag")     return `<polygon points="0,0 600,0 600,300 0,600" fill="${d}" fill-opacity="${o}"/>`;
    if (id === "semi")     return `<path d="M60 470 A240 240 0 0 1 540 470 Z" fill="${d}" fill-opacity="${o}"/>`;
    if (id === "ring2")    return `<circle cx="300" cy="300" r="236" fill="none" stroke="${d}" stroke-opacity="${o + 0.14}" stroke-width="26"/>`;
    return "";
  }

  /* ============================================================
     10) YAZI KATMANI — düzene göre yerleşir, asla taşmaz
     ============================================================ */
  function textSVG(p, font, ink) {
    const title = (p.title || "").trim();
    const words = title.split(/\s+/).filter(Boolean);
    const artist = p.artist || "";
    const anchorMid = "middle";
    const cx = 300;
    let out = "";
    let extra = "";

    /* --- düzen: konum + dekor --- */
    let cy = 300, anchor = anchorMid, tx = cx, leading = 1.14;
    let base = 74, mode = p.text;

    if (p.layout === "ust")       { cy = 176; }
    else if (p.layout === "alt")  { cy = 424; }
    else if (p.layout === "serit") {
      extra += `<rect x="0" y="222" width="600" height="156" fill="#000" fill-opacity="0.34"/>`;
      cy = 300;
    } else if (p.layout === "altblok") {
      extra += `<rect x="0" y="336" width="600" height="264" fill="#000" fill-opacity="0.46"/>`;
      cy = 452;
    } else if (p.layout === "devharf") {
      cy = 300;
      if (mode === "mono") base = 620;
    } else if (p.layout === "kose") {
      anchor = "start"; tx = MARGIN; cy = 150; leading = 1.1;
    } else if (p.layout === "dergi") {
      anchor = "start"; tx = MARGIN; cy = 214; leading = 1.05;
    }

    /* --- yazı modu --- */
    if (mode === "none") {
      out = "";
      if (p.layout === "serit") extra = extra.replace(/<rect[^>]*>/, ""); // yazısızsa şerit de gereksiz
    } else if (mode === "mono") {
      const ch = (title ? title.charAt(0) : "?").toUpperCase();
      let size = base;
      while (textW(ch, size, font) > MAXW && size > 40) size -= 4;
      out = line(ch, size, tx, cy, anchor, font, ink, 0.92);
    } else if (mode === "kisa") {
      const w0 = words[0] || title || "";
      const f = fitLines([w0], font, MAXW, 92, 20, 1);
      out = block(f.lines, f.size, tx, cy, anchor, font, ink, leading);
    } else if (mode === "buyuk") {
      /* her kelime kendi satırında, sıkı satır aralığı */
      const shown = words.slice(0, 4);
      const f = fitLines(shown, font, MAXW, 96, 22, 4);
      const lines = f.lines.length ? f.lines : [title];
      const lh = f.size * 0.98;
      const startY = cy - ((lines.length - 1) * lh) / 2;
      out = lines.map((l, i) => line(l, f.size, tx, startY + i * lh, anchor, font, ink)).join("");
    } else {
      /* title — sarılır ve sığar */
      const f = fitLines(words, font, MAXW, base === 620 ? 74 : base, 18, 3);
      const lines = f.lines.length ? f.lines : [title];
      out = block(lines, f.size, tx, cy, anchor, font, ink, leading);
    }

    /* --- sanatçı adı --- */
    if (artist) {
      if (anchor === "start") {
        /* sol hizalı düzenlerde başlığın altında */
        const f = fitLines(words, font, MAXW, 74, 18, 3);
        const n = (out ? (f.lines.length || 1) : 1);
        const ay = cy + (n * f.size * leading) / 2 + 34;
        out += artistLine(artist, tx, Math.min(ay, H - 46), anchor, ink);
      } else if (p.layout === "devharf") {
        out += artistLine(artist, tx, 552, anchor, ink);
      } else {
        const f = fitLines(words, font, MAXW, base, 18, 3);
        const n = (out ? (f.lines.length || 1) : 1);
        const half = (n * f.size * leading) / 2;
        let ay = cy + half + 38;
        if (p.layout === "alt" || p.layout === "altblok") ay = cy - half - 38;
        if (p.layout === "ust") ay = cy + half + 38;
        out += artistLine(artist, tx, Math.max(40, Math.min(ay, H - 40)), anchor, ink);
      }
    }

    /* --- dergi düzeni: ince ayırıcı çizgi --- */
    if (p.layout === "dergi") {
      const f = fitLines(words, font, MAXW, 74, 18, 3);
      const y = cy - (f.size * 1.05) / 2 - 22;
      extra += `<rect x="${MARGIN}" y="${Math.round(y)}" width="86" height="4" fill="${ink}" fill-opacity="0.75"/>`;
    }

    return extra + out;
  }

  /* ============================================================
     11) KAPAK ÜRETİCİSİ
     ============================================================ */
  K.coverSVG = function (seed) {
    const p = K.coverParse(seed);
    if (!p) return null;

    const st = styleById(p.style);
    const font = fontById(p.font);
    const ink = st.ink || "#ffffff";
    const darkShape = true;                       // şekiller karartma olarak çalışır
    let c1 = st.c1, c2 = st.c2;
    if (p.hue >= 0) {
      c1 = "hsl(" + p.hue + " 45% 14%)";
      c2 = "hsl(" + ((p.hue + 38) % 360) + " 62% 47%)";
    }

    /* desen + şekil */
    const pat = patternSVG(p.pattern, ink);
    const shape = shapeSVG(p.shape, darkShape);

    /* metin okunurluğu için radyal karartma */
    const scrim = p.text !== "none"
      ? `<rect width="600" height="600" fill="url(#sc)"/>` : "";

    /* çerçeve */
    const frame = p.frame
      ? `<rect x="24" y="24" width="552" height="552" fill="none" stroke="${ink}" stroke-opacity="0.42" stroke-width="3"/>`
      : "";

    /* explicit işareti */
    const badge = p.explicit
      ? `<rect x="524" y="26" width="50" height="50" rx="7" fill="#111" fill-opacity="0.72"/>` +
        `<text x="549" y="52" text-anchor="middle" dominant-baseline="central" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="700" fill="#fff">E</text>`
      : "";

    /* yıl etiketi */
    const year = (p.year && String(p.year).trim())
      ? `<text x="576" y="566" text-anchor="end" dominant-baseline="central" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600" letter-spacing="2" fill="${ink}" fill-opacity="0.7">${esc(String(p.year).trim())}</text>`
      : "";

    const grain = p.grain
      ? `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>` +
        `<feColorMatrix type="saturate" values="0"/></filter>` +
        `<rect width="600" height="600" filter="url(#gr)" opacity="0.09"/>`
      : "";

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">` +
      `<defs>` +
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>` +
      `<radialGradient id="sc" cx="0.5" cy="0.42" r="0.78">` +
      `<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/></radialGradient>` +
      `</defs>` +
      `<rect width="600" height="600" fill="url(#bg)"/>` +
      pat + shape + scrim +
      textSVG(p, font, ink) +
      frame + badge + year + grain +
      `</svg>`;

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  /* ============================================================
     11b) ESKİ BİÇİM — "cs:<stil>_..." seed'i için gradyan
     (kapak üreticisi gelmeden önce üretilmiş kayıtlar)
     ============================================================ */
  K.coverGradient = function (seed) {
    const str = String(seed == null ? "" : seed);
    if (str.indexOf("cs:") === 0) {
      const sid = str.slice(3).split("_")[0];
      const st = styleById(sid);
      if (st) return "linear-gradient(135deg, " + st.c1 + ", " + st.c2 + ")";
    }
    return K.util.gradientFor(str || "x");
  };

  /* ============================================================
     12) ÖLÇÜM — testlerin taşma kontrolü için
     Üretilen SVG'deki her metin parçasının tahmini genişliğini
     döndürür. `overflow` true ise yazı güvenli alanı aşmıştır.
     ============================================================ */
  K.coverMeasure = function (seed) {
    const uri = K.coverSVG(seed);
    if (!uri) return null;
    let svg = "";
    try { svg = decodeURIComponent(uri.replace(/^data:image\/svg\+xml;charset=utf-8,/, "")); }
    catch (e) { return null; }

    const items = [];
    const re = /<text([^>]*)>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(svg))) {
      const attrs = m[1];
      const content = m[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      const fs = +(attrs.match(/font-size="([\d.]+)"/) || [])[1] || 0;
      const ls = +(attrs.match(/letter-spacing="(-?[\d.]+)"/) || [])[1] || 0;
      const fam = (attrs.match(/font-family="([^"]*)"/) || [])[1] || "";
      const dw = (attrs.match(/data-w="([\d.]+)"/) || [])[1];
      const anchor = (attrs.match(/text-anchor="([^"]*)"/) || [])[1] || "start";
      const x = +(attrs.match(/ x="([\d.-]+)"/) || [])[1] || 0;
      /* genişlik katsayısı: önce SVG'nin bildirdiği data-w, yoksa
         font ailesinden tahmin (eski kapaklar için) */
      const wf = dw != null ? +dw : (K.COVER_FONTS.find((ff) => ff.family === fam) || { w: 0.62 }).w;
      const dc = (attrs.match(/data-c="([\d.]+)"/) || [])[1];
      const cf = dc != null ? +dc : 1;
      const width = (content.length * fs * wf + Math.max(0, content.length - 1) * ls) * cf;
      const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
      items.push({ content, size: fs, width: Math.round(width), left: Math.round(left), right: Math.round(left + width) });
    }
    const overflow = items.filter((i) => i.left < 0 || i.right > 600 || i.width > MAXW);
    return { items, overflow, maxW: MAXW };
  };
})(window.K = window.K || {});
