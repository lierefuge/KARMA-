#!/usr/bin/env node
/* ============================================================
   KARMA — tools/fetch-artist-photos.js
   Her sanatçının GERÇEK profil resmini (PP) çeker ve
   js/data/artist-photos.js dosyasına gömer.

   Kaynak: Deezer açık API (api.deezer.com/search/artist → picture_xl)
   Neden bake ediliyor? Deezer CORS başlığı (Access-Control-Allow-Origin)
   göndermediği için tarayıcıdan doğrudan çağrılamaz. Veriyi bir kez
   çekip oyuna gömmek hem çevrimdışı çalışır hem de anında yüklenir.

   Kullanım:
     node tools/fetch-artist-photos.js
     node tools/fetch-artist-photos.js --only sehinsah weghrumi
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "js/data/artist-photos.js");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const only = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv.slice(i + 1) : null;
})();

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİi]/g, "i")
    .replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

async function getJSON(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 karma-pp" } });
      if (r.status === 403 || r.status === 429 || r.status >= 500) { await sleep(1200 * (i + 1)); continue; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      if (i === 3) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

/* Deezer'ın boş/varsayılan görselleri */
function isPlaceholder(url) {
  if (!url) return true;
  if (/\/artist\/\//.test(url)) return true;
  if (/blank|default|placeholder/i.test(url)) return true;
  return false;
}

async function urlAlive(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok && /image/.test(r.headers.get("content-type") || "");
  } catch (e) { return false; }
}

function loadArtists() {
  const code = fs.readFileSync(path.join(ROOT, "js/data/artists.js"), "utf8");
  const win = {};
  new Function("window", code)(win);
  return win.K.ARTISTS;
}

function loadExisting() {
  if (!fs.existsSync(OUT)) return {};
  const win = {};
  new Function("window", fs.readFileSync(OUT, "utf8"))(win);
  return win.K.ARTIST_PHOTOS || {};
}

(async () => {
  const artists = loadArtists().filter((a) => !only || only.includes(a.id));
  const photos = loadExisting();
  const report = [];

  for (const a of artists) {
    const names = [a.stageName].concat(a.aliases || []);
    let found = null, matched = null;

    for (const nm of names) {
      if (!nm) continue;
      let j;
      try { j = await getJSON("https://api.deezer.com/search/artist?q=" + encodeURIComponent(nm) + "&limit=8"); }
      catch (e) { continue; }
      const list = (j && j.data) || [];
      const target = norm(nm);
      const exact = list.find((x) => norm(x.name) === target);
      const loose = list.find((x) => {
        const n = norm(x.name);
        return n && (n.includes(target) || target.includes(n)) && Math.abs(n.length - target.length) <= 4;
      });
      const pick = exact || loose;
      if (pick && pick.picture_xl && !isPlaceholder(pick.picture_xl)) {
        found = pick.picture_xl.replace("/1000x1000-", "/500x500-");
        matched = pick.name;
        break;
      }
      await sleep(160);
    }

    if (found && await urlAlive(found)) {
      photos[a.id] = found;
      report.push({ id: a.id, name: a.stageName, ok: true, matched });
    } else {
      report.push({ id: a.id, name: a.stageName, ok: false, matched });
    }
    console.log((photos[a.id] ? "✅" : "❌") + " " + a.id.padEnd(14) + " " + a.stageName + (matched ? "  →  " + matched : ""));
    await sleep(200);
  }

  const head = `/* ============================================================
   KARMA — data/artist-photos.js  (OTOMATİK ÜRETİLDİ)
   Her sanatçının GERÇEK profil resmi (Deezer açık API, 500×500).
   Kaynak: api.deezer.com/search/artist → picture_xl
   Üretici: node tools/fetch-artist-photos.js
   Kullanım: K.imagery.portrait(id) bu haritayı ilk sırada kullanır.
   Güncelleme: ${new Date().toISOString().slice(0, 10)}
   ============================================================ */
(function (K) {
  "use strict";
  K.ARTIST_PHOTOS = `;

  fs.writeFileSync(OUT, head + JSON.stringify(photos, null, 1) + ";\n})(window.K = window.K || {});\n");

  const ok = report.filter((r) => r.ok).length;
  console.log(`\n=== ${ok}/${report.length} sanatçı için gerçek PP · toplam kayıt: ${Object.keys(photos).length} ===`);
  const missing = report.filter((r) => !r.ok).map((r) => r.name);
  if (missing.length) console.log("Bulunamayanlar:", missing.join(", "));
  console.log("Yazıldı:", path.relative(ROOT, OUT));
})();
