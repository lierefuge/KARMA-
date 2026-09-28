#!/usr/bin/env node
/* ============================================================
   KARMA — tools/fetch-artist-discography.js
   Bir sanatçının TÜM yayımlanmış şarkılarını iTunes (country=TR)
   üzerinden çeker ve üç veri dosyasına işler:

     js/data/real-songs.js      → şarkı adı, albüm, kapak, yıl, süre
     js/data/discography.js     → sanatçının KENDİ albüm/single listesi
     js/data/real-previews.js   → 30 sn gerçek ses + Apple Music bağlantısı

   Diğer sanatçıların verisi korunur (yalnızca hedef anahtar değişir).

   Kullanım:
     node tools/fetch-artist-discography.js <id> "<Sanatçı Adı>" [iTunes artistId]
   Örnek:
     node tools/fetch-artist-discography.js sehinsah "Şehinşah" 736313630
     node tools/fetch-artist-discography.js weghrumi "wegh"
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const [, , slug, name, forcedId] = process.argv;

if (!slug || !name) {
  console.error('Kullanım: node tools/fetch-artist-discography.js <id> "<Sanatçı Adı>" [iTunes artistId]');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 karma-data" } });
      if (r.status === 403 || r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      if (i === 3) throw e;
      await sleep(1200 * (i + 1));
    }
  }
}

/* ---------- veri dosyalarını sandbox'ta oku ---------- */
function loadData(file, varName) {
  const win = {};
  new Function("window", fs.readFileSync(path.join(ROOT, file), "utf8"))(win);
  return win.K[varName];
}
function writeData(file, varName, obj, indent, head) {
  fs.writeFileSync(path.join(ROOT, file), head + JSON.stringify(obj, null, indent) + ";\n})(window.K = window.K || {});\n");
}

/* ---------- iTunes ---------- */
async function findArtistId(q) {
  const j = await getJSON("https://itunes.apple.com/search?term=" + encodeURIComponent(q) +
    "&entity=musicArtist&country=TR&limit=25");
  const list = (j.results || []).map((a) => ({ id: a.artistId, name: a.artistName }));
  console.log("Adaylar:", list.map((a) => `${a.name} (${a.id})`).join(" · ") || "—");
  const exact = list.find((a) => a.name.toLowerCase() === q.toLowerCase());
  const loose = list.find((a) => a.name.toLowerCase().includes(q.toLowerCase().split(" ")[0]));
  const pick = exact || loose || list[0];
  return pick && pick.id;
}

async function allSongs(artistId) {
  const out = [];
  const seen = new Set();
  for (let offset = 0; offset < 2000; offset += 200) {
    const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=song&limit=200&offset=${offset}&country=TR`;
    const j = await getJSON(url);
    const rows = (j.results || []).filter((r) => r.wrapperType === "track");
    if (!rows.length) break;
    let fresh = 0;
    for (const t of rows) {
      const key = (t.trackName || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key); fresh++;
      out.push({
        title: t.trackName,
        artistName: t.artistName,
        album: t.collectionName,
        art: (t.artworkUrl100 || "").replace("/100x100bb", "/600x600bb").replace("/100x100", "/600x600"),
        year: (t.releaseDate || "").slice(0, 4),
        ms: t.trackTimeMillis || 0,
        preview: t.previewUrl || "",
        url: t.trackViewUrl || ""
      });
    }
    console.log(`  offset ${offset} → ${fresh} yeni (toplam ${out.length})`);
    if (rows.length < 200) break;
    if (!fresh) break;              // iTunes offset'i yok sayıyor → tekrar denemeyi kes
    await sleep(400);
  }
  return out;
}

(async () => {
  const artistId = forcedId ? Number(forcedId) : await findArtistId(name);
  if (!artistId) { console.error("artistId bulunamadı"); process.exit(1); }
  console.log("artistId:", artistId);

  let songs = await allSongs(artistId);
  songs = songs.filter((s) => !/\(mixed\)/i.test(s.title));   // DJ mix tekrarlarını at
  console.log("Toplam şarkı:", songs.length);
  if (!songs.length) { console.error("Şarkı bulunamadı — veri dosyaları DEĞİŞTİRİLMEDİ."); process.exit(1); }

  /* ---------- sıralama: sanatçının kendi işleri önce, sonra yeni→eski ---------- */
  const isOwn = (s) => (s.artistName || "").toLowerCase().startsWith(name.toLowerCase());
  const isSingle = (s) => /- single$/i.test(s.album || "");
  songs = songs
    .map((s) => ({ ...s, _score: (isOwn(s) ? 100 : 0) + (isSingle(s) ? 20 : 0) + (parseInt(s.year, 10) || 0) }))
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...s }) => s);

  /* ---------- real-songs ---------- */
  const songsFile = loadData("js/data/real-songs.js", "REAL_SONGS");
  songsFile[slug] = songs.map((s) => ({ title: s.title, artistName: s.artistName, album: s.album, art: s.art, year: s.year, ms: s.ms }));

  /* ---------- real-previews ---------- */
  const prevFile = loadData("js/data/real-previews.js", "REAL_PREVIEWS");
  const pv = {};
  songs.forEach((s) => {
    if (!s.preview) return;
    const e = {};
    if (s.url) e.a = s.url;
    e.p = s.preview;
    pv[s.title] = e;
  });
  prevFile[slug] = pv;

  /* ---------- discography (yalnızca KENDİ albümleri) ---------- */
  const albumMap = new Map();
  songs.forEach((s) => {
    const key = s.album || "(bilinmiyor)";
    if (!albumMap.has(key)) albumMap.set(key, { title: key, year: s.year, art: s.art, tracks: [], own: false });
    const al = albumMap.get(key);
    al.tracks.push(s.title);
    if (isOwn(s)) al.own = true;
    if (!al.art && s.art) al.art = s.art;
  });
  const albums = [...albumMap.values()].filter((al) => al.own)
    .sort((a, b) => (b.year || "").localeCompare(a.year || ""))
    .map((al) => {
      let type = "Albüm";
      if (/-\s*single$/i.test(al.title)) type = "Single";
      else if (/\bEP\b/i.test(al.title)) type = "EP";
      else if (al.tracks.length <= 2) type = "Single";
      return { title: al.title, type, year: al.year, art: al.art, tracks: al.tracks };
    });
  const discoFile = loadData("js/data/discography.js", "DISCOGRAPHY");
  discoFile[slug] = albums;

  const stamp = new Date().toISOString().slice(0, 10);
  writeData("js/data/real-songs.js", "REAL_SONGS", songsFile, 2,
    `/* ============================================================\n   KARMA — data/real-songs.js  (OTOMATİK ÜRETİLDİ)\n   Her sanatçı için GERÇEK şarkılar + gerçek albüm kapağı görselleri.\n   Kaynak: iTunes Search/Lookup API (country=TR).\n   Üretici: node tools/fetch-artist-discography.js\n   Güncelleme: ${stamp}\n   ============================================================ */\n(function (K) {\n  "use strict";\n  K.REAL_SONGS = `);
  writeData("js/data/discography.js", "DISCOGRAPHY", discoFile, 2,
    `/* ============================================================\n   KARMA — data/discography.js  (OTOMATİK ÜRETİLDİ)\n   Her sanatçının GERÇEK albüm/single listesi + kapak görselleri.\n   Kaynak: iTunes Search API (entity=album, country=TR).\n   Üretici: node tools/fetch-artist-discography.js\n   Güncelleme: ${stamp}\n   ============================================================ */\n(function (K) {\n  "use strict";\n  K.DISCOGRAPHY = `);
  writeData("js/data/real-previews.js", "REAL_PREVIEWS", prevFile, 1,
    `/* ============================================================\n   KARMA — data/real-previews.js  (OTOMATİK ÜRETİLDİ)\n   Gerçek şarkılar için 30 saniyelik GERÇEK ses önizlemeleri.\n   Kaynak: iTunes Search API (country=TR) · previewUrl / trackViewUrl\n   p = doğrudan çalınabilir ses (m4a)   a = Apple Music sayfası\n   Üretici: node tools/fetch-artist-discography.js\n   Güncelleme: ${stamp}\n   ============================================================ */\n(function (K) {\n  "use strict";\n  K.REAL_PREVIEWS = `);

  console.log(`\n=== ${name} ===`);
  console.log(`  şarkı        : ${songsFile[slug].length} (kendi: ${songs.filter(isOwn).length} · feature: ${songs.filter((s) => !isOwn(s)).length})`);
  console.log(`  önizleme     : ${Object.keys(pv).length}`);
  console.log(`  kendi albümü : ${albums.length} / toplam albüm ${albumMap.size}`);
  console.log(`  REAL_SONGS   : ${Object.values(songsFile).reduce((a, b) => a + b.length, 0)} şarkı (tüm sanatçılar)`);
})();
