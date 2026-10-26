#!/usr/bin/env node
/* The existing single-artist CLI requires arguments. Supply the roster and
   known catalog IDs, restoring that artist's writes on failure. */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { atomicWrite } = require("./release-intel-io.js");
const ROOT = path.resolve(__dirname, "..");
const win = {};
for (const file of ["artists.js", "release-intel.js"]) {
  new Function("window", fs.readFileSync(path.join(ROOT, "js/data", file), "utf8"))(win);
}
const files = ["real-songs.js", "discography.js", "real-previews.js"].map(f => path.join(ROOT, "js/data", f));
const ids = win.K.RELEASE_INTEL.meta.artistIds || {};
const dry = process.argv.includes("--dry");
const globals = ["REAL_SONGS", "DISCOGRAPHY", "REAL_PREVIEWS"];
function readPayload(text, index) {
  const window = {};
  new Function("window", String(text))(window);
  const data = window.K && window.K[globals[index]];
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("geçersiz diskografi verisi");
  return data;
}
const ytWindow = {};
new Function("window", fs.readFileSync(path.join(ROOT, "js/data/real-youtube.js"), "utf8"))(ytWindow);
const youtube = ytWindow.K.REAL_YT;
const isURL = value => typeof value === "string" && /^https?:\/\//i.test(value);
const playable = entry => entry && isURL(entry.p) && isURL(entry.a);
const videoReady = entry => entry && /^[\w-]{11}$/.test(entry.v) && typeof entry.t === "string" && entry.t.trim();

function mergeCatalog(previous, fetched, artistId) {
  const [songs, albums, previews] = previous.map(data => data[artistId]);
  const [incomingSongs, incomingAlbums, incomingPreviews] = fetched.map(data => data[artistId]);
  if (!Array.isArray(songs) || !Array.isArray(albums) || !previews || Array.isArray(previews)
      || typeof previews !== "object") throw new Error("mevcut katalog şeması geçersiz");
  // Full preview coverage is a pre-existing build contract. Never remove a
  // usable cached preview when today's catalog omits the optional previewUrl.
  const mergedSongs = new Map(songs.map(song => [song.title, song]));
  const mergedPreviews = Object.assign({}, previews);
  let deferred = 0;
  incomingSongs.forEach(song => {
    if (!song || typeof song.title !== "string" || !song.title.trim()) throw new Error("geçersiz şarkı başlığı");
    if (typeof song.artistName !== "string" || !song.artistName.trim()
        || typeof song.album !== "string" || !song.album.trim() || !/^\d{4}$/.test(song.year)
        || !isURL(song.art) || !Number.isFinite(song.ms) || song.ms <= 0) {
      // Provider sometimes omits releaseDate (e.g. 70'lik). Preserve the
      // validated previous row; do not invent a year or discard the artist.
      deferred++;
      return;
    }
    const preview = playable(incomingPreviews[song.title]) ? incomingPreviews[song.title] : previews[song.title];
    const existing = mergedSongs.has(song.title);
    // New releases already reach the game through RELEASE_INTEL. Expanding
    // REAL_SONGS without verified media would violate its preview/YouTube gates.
    if (!playable(preview) || (!existing && !videoReady((youtube[artistId] || {})[song.title]))) {
      deferred++;
      return;
    }
    mergedSongs.set(song.title, song);
    mergedPreviews[song.title] = preview;
  });
  for (const song of mergedSongs.values()) {
    if (!playable(mergedPreviews[song.title])) throw new Error("mevcut önizleme kapsamı eksik");
  }
  const mergedAlbums = new Map(albums.map(album => [album.title, album]));
  incomingAlbums.forEach(album => {
    if (!album || typeof album.title !== "string" || !Array.isArray(album.tracks)) throw new Error("geçersiz albüm");
    const tracks = album.tracks.filter(title => mergedSongs.has(title));
    if (!tracks.length) return;
    const previousAlbum = mergedAlbums.get(album.title);
    mergedAlbums.set(album.title, Object.assign({}, album, {
      tracks: [...new Set((previousAlbum ? previousAlbum.tracks : []).concat(tracks))]
    }));
  });
  if (deferred) console.log("  " + artistId + ": " + deferred + " kayıt ertelendi (önizleme/YouTube doğrulaması eksik); yeni çıkış akışı korunuyor.");
  return [Array.from(mergedSongs.values()), Array.from(mergedAlbums.values()), mergedPreviews];
}

function writePayload(file, text, data, index) {
  const marker = "K." + globals[index] + " = ";
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("veri dosyası başlığı tanınmadı");
  atomicWrite(file, text.slice(0, start + marker.length) + JSON.stringify(data, null, index < 2 ? 2 : 1)
    + ";\n})(window.K = window.K || {});\n");
}

for (const artist of win.K.ARTISTS) {
  if (!Number.isSafeInteger(ids[artist.id]) || ids[artist.id] <= 0) {
    console.warn("::warning::Diskografi kimliği bulunamadı: " + artist.id);
    process.exitCode = 1;
    continue;
  }
  if (dry) { console.log("--dry: diskografi " + artist.id); continue; }
  const before = files.map(f => fs.readFileSync(f));
  const result = spawnSync(process.execPath, ["tools/fetch-artist-discography.js", artist.id,
    artist.stageName, String(ids[artist.id])], { cwd: ROOT, stdio: "inherit", timeout: 90000 });
  let valid = result.status === 0;
  let reason = result.error ? result.error.code : "araç hata çıkışı";
  if (valid) {
    try {
      const previous = before.map(readPayload);
      const fetched = files.map((file, index) => readPayload(fs.readFileSync(file), index));
      fetched.forEach((data, index) => {
        const target = data[artist.id];
        if (!target || (index < 2 && (!Array.isArray(target) || !target.length))
            || (index === 2 && (Array.isArray(target) || typeof target !== "object"))) throw new Error("boş diskografi");
        const others = data => Object.fromEntries(Object.entries(data).filter(([id]) => id !== artist.id));
        if (JSON.stringify(others(previous[index])) !== JSON.stringify(others(data))) throw new Error("diğer sanatçının verisi değişti");
      });
      const merged = mergeCatalog(previous, fetched, artist.id);
      // Validate everything before replacing any of the three files.
      previous.forEach((data, index) => {
        const next = Object.assign({}, data, { [artist.id]: merged[index] });
        if (JSON.stringify(data) === JSON.stringify(next)) fs.writeFileSync(files[index], before[index]);
        else writePayload(files[index], before[index].toString(), next, index);
      });
    } catch (error) {
      reason = error.message;
      valid = false;
    }
  }
  if (!valid) {
    files.forEach((f, i) => fs.writeFileSync(f, before[i]));
    console.warn("::warning::Diskografi korunuyor: " + artist.id + " (" + reason + ")");
    process.exitCode = 1;
  }
}
