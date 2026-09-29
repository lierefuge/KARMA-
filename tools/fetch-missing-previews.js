#!/usr/bin/env node
/* ============================================================
   KARMA — tools/fetch-missing-previews.js   (v10.26)

   NE YAPAR?
   ---------
   `real-songs` içinde olup `real-previews`'ta KARŞILIĞI OLMAYAN her
   şarkı için iTunes (country=TR) üzerinden önizleme arar; bulduğunu
   `js/data/real-previews.js` dosyasına ekler.

   NEDEN AYRI ARAÇ?
   ----------------
   `tools/fetch-artist-discography.js` bir sanatçının TÜM bloğunu canlı
   veriyle YENİDEN YAZAR. Bu, elle küratörlenmiş listeleri bozar:
     · "Muti" blokunu Heijan'ın artistId'siyle çekmek 8 küratörlü
       ortak çalışmayı 68 Heijan şarkısıyla değiştirirdi
     · Lierefuge bloğundaki konuk parçalar ("Yol (feat. Lie Refuge)",
       "İnan Bana (feat. Lie Refuge)") canlı listede yok → silinirdi
   Bu araç yalnızca EKSİK ÖNİZLEMEYİ ekler; mevcut kayıtların hiçbirine
   dokunmaz. Böylece veri kaybı riski yok.

   GÜVENLİK (yanlış önizleme bağlamayı önler)
   -----------------------------------------
   1) Arama terimi şarkının KENDİ `artistName` alanıdır
      (ör. "Muti & Azer Bülbül", "Lil deez") — uydurma eşleme olmaz.
   2) Başlık normalize edilerek TAM eşleşmelidir (Türkçe ı/İ katlamasıyla).
   3) Canlı kaydın sanatçı adı, aradığımız adla en az bir anlamlı kelime
      paylaşmalıdır → aynı adlı başka sanatçının şarkısı bağlanmaz.
   4) Önizleme URL'i HEAD isteğiyle DOĞRULANIR (200 şart).

   KULLANIM
   --------
     node tools/fetch-missing-previews.js --dry    # yazmadan raporla
     node tools/fetch-missing-previews.js          # eksikleri ekle
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const UA = "Mozilla/5.0 (karma-data)";
const DRY = process.argv.includes("--dry");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Türkçe katlamalı normalleştirme ----------------
   "KARARDI".toLowerCase() → "karardi" ama şarkı "Karardı" → "karardı".
   ı ≠ i olduğu için eşleşme sessizce düşerdi. ı/İ/I/i tek harfe katlanır. */
function trFold(s) {
  return String(s || "")
    .replace(/İ/g, "i").replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/\u0307/g, "");
}
function norm(s) {
  return trFold(s)
    .replace(/[\(\[].*?[\)\]]/g, " ")
    .replace(/\b(official|video|klip|lyric|lyrics|audio|visualizer|canlı|canli|live|remix|feat|ft|version|versiyon)\b/g, " ")
    .replace(/[^a-z0-9çğıöşü ]+/g, " ").replace(/\s+/g, " ").trim();
}

function loadData(file, varName) {
  const win = {};
  new Function("window", fs.readFileSync(path.join(ROOT, file), "utf8"))(win);
  return win.K[varName];
}
function writeData(file, varName, obj, head) {
  fs.writeFileSync(path.join(ROOT, file), head + JSON.stringify(obj, null, 1) + ";\n})(window.K = window.K || {});\n");
}

async function itunes(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 403 || r.status === 429 || r.status >= 500) { await sleep(1200 * (i + 1)); continue; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) { if (i === 2) throw e; await sleep(900 * (i + 1)); }
  }
}

/* önizleme sesi gerçekten erişilebilir mi? */
async function verifyAudio(url) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
    return r.status;
  } catch (e) { return -1; }
}

/* anlamlı kelime paylaşımı (aynı adlı başka sanatçıyı dışlar) */
const STOP = new Set(["and", "the", "feat", "ft", "with", "ve", "ile", "de", "da"]);
function sharesArtistWord(a, b) {
  const wa = norm(a).split(" ").filter((w) => w && !STOP.has(w));
  const wb = new Set(norm(b).split(" ").filter((w) => w && !STOP.has(w)));
  return wa.some((w) => wb.has(w));
}

(async () => {
  const SONGS = loadData("js/data/real-songs.js", "REAL_SONGS");
  const PREV = loadData("js/data/real-previews.js", "REAL_PREVIEWS");

  const missing = [];
  Object.keys(SONGS).forEach((slug) => {
    (SONGS[slug] || []).forEach((s) => {
      const have = PREV[slug] && PREV[slug][s.title];
      if (!have) missing.push({ slug, title: s.title, artist: s.artistName || "" });
    });
  });

  console.log("========================================================");
  console.log("EKSİK ÖNİZLEME TAMAMLAMA");
  console.log("========================================================");
  console.log("önizlemesi olmayan şarkı: " + missing.length);
  missing.forEach((m) => console.log("   · " + m.slug + " :: " + m.title + "  (" + m.artist + ")"));
  console.log();

  /* --- sanatçı kataloğu önbelleği (aynı sanatçı için tekrar sormayalım) --- */
  const artistCache = new Map();
  async function artistCatalog(name) {
    const key = norm(name);
    if (artistCache.has(key)) return artistCache.get(key);
    let songs = [];
    try {
      const a = await itunes(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&country=TR&limit=25`);
      const cands = (a.results || []).slice(0, 3);
      for (const c of cands) {
        const l = await itunes(`https://itunes.apple.com/lookup?id=${c.artistId}&entity=song&limit=200&country=TR`);
        const rows = (l.results || []).filter((r) => r.wrapperType === "track");
        songs = songs.concat(rows);
        await sleep(300);
      }
    } catch (e) { /* sessiz: strateji 3 yine denenir */ }
    artistCache.set(key, songs);
    return songs;
  }

  const added = [], notFound = [];
  for (const m of missing) {
    const clean = m.title.replace(/\s*[\(\[]\s*(feat|ft)\..*?[\)\]]/i, "").trim();
    let hit = null, why = "";

    /* STRATEJİ 1 — başlık + sanatçı ile şarkı araması */
    try {
      const j = await itunes(`https://itunes.apple.com/search?term=${encodeURIComponent(clean + " " + m.artist)}&entity=song&country=TR&limit=25`);
      const rows = j.results || [];
      hit = rows.find((r) => norm(r.trackName) === norm(clean) && sharesArtistWord(r.artistName || "", m.artist))
        || rows.find((r) => norm(r.trackName) === norm(m.title) && sharesArtistWord(r.artistName || "", m.artist));
      if (!hit) why = rows.length + " başlık sonucu, güvenli eşleşme yok";
    } catch (e) { why = "arama hatası: " + e.message; }

    /* STRATEJİ 2 — sanatçının KATALOĞUNU çek ve başlıkla eşleştir.
       Başlık araması iTunes'da çoğu zaman boş döner (ör. niş sanatçılar),
       ama sanatçı kataloğu şarkıyı içerir. (Kanıt: "Lie Refuge" başlık
       araması 0 sonuç verirken katalog kimliği 1632511355 üç şarkıyı da
       önizlemesiyle içeriyor.) */
    if (!hit && m.artist) {
      const cat = await artistCatalog(m.artist);
      hit = cat.find((r) => norm(r.trackName) === norm(clean) && sharesArtistWord(r.artistName || "", m.artist))
        || cat.find((r) => norm(r.trackName) === norm(m.title) && sharesArtistWord(r.artistName || "", m.artist));
      if (!hit) why = (why ? why + " · " : "") + "sanatçı kataloğunda (" + cat.length + " şarkı) yok";
      await sleep(300);
    }

    if (hit && hit.previewUrl) {
      const status = await verifyAudio(hit.previewUrl);
      if (status === 200) {
        const entry = {};
        if (hit.trackViewUrl) entry.a = hit.trackViewUrl;
        entry.p = hit.previewUrl;
        added.push({ ...m, entry, live: hit.artistName + " — " + hit.trackName });
        console.log(`  ✅ ${m.slug} :: ${m.title}`);
        console.log(`       canlı kayıt : ${hit.artistName} — ${hit.trackName}`);
        console.log(`       p           : ${hit.previewUrl.slice(0, 96)}…`);
        console.log(`       HTTP        : 200 ✅`);
      } else {
        notFoundPush(notFound, m, "önizleme URL doğrulanamadı (HTTP " + status + ")");
      }
    } else {
      notFoundPush(notFound, m, hit ? "eşleşen kayıtta önizleme yok" : why);
    }
    await sleep(450);
  }

  function notFoundPush(arr, m, reason) {
    arr.push({ ...m, reason });
    console.log(`  ⚠ ${m.slug} :: ${m.title} → ${reason}`);
  }

  console.log("\n" + "=".repeat(56));
  console.log("eklenebilir: " + added.length + " · bulunamayan: " + notFound.length);
  console.log("=".repeat(56));
  if (notFound.length) {
    console.log("BULUNAMAYANLAR (iTunes'da önizlemesi yok — oyun sentez yedeğine düşer):");
    notFound.forEach((n) => console.log("   ✖ " + n.slug + " :: " + n.title + "  (" + n.reason + ")"));
  }

  if (!added.length) { console.log("\n(eklenecek bir şey yok)"); return; }
  if (DRY) { console.log("\n(--dry: yazılmadı)"); return; }

  added.forEach((a) => {
    PREV[a.slug] = PREV[a.slug] || {};
    PREV[a.slug][a.title] = a.entry;
  });
  writeData("js/data/real-previews.js", "REAL_PREVIEWS", PREV,
    `/* ============================================================\n   KARMA — data/real-previews.js  (OTOMATİK ÜRETİLDİ)\n   Gerçek şarkılar için 30 saniyelik GERÇEK ses önizlemeleri.\n   Kaynak: iTunes Search API (country=TR) · previewUrl / trackViewUrl\n   p = doğrudan çalınabilir ses (m4a)   a = Apple Music sayfası\n   Üretici: node tools/fetch-artist-discography.js\n            node tools/fetch-missing-previews.js (eksik tamamlama)\n   Güncelleme: ${new Date().toISOString().slice(0, 10)}\n   ============================================================ */\n(function (K) {\n  "use strict";\n  K.REAL_PREVIEWS = `);
  console.log("\n✅ js/data/real-previews.js yazıldı · eklenen: " + added.length);
})().catch((e) => { console.error("HATA: " + (e && e.message ? e.message : e)); process.exit(1); });
