#!/usr/bin/env node
/* The existing single-artist CLI requires arguments. Supply the roster and
   known catalog IDs, restoring that artist's writes on failure. */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
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
  if (valid) {
    try {
      files.forEach((file, index) => {
        const prev = readPayload(before[index], index);
        const next = readPayload(fs.readFileSync(file), index);
        const target = next[artist.id];
        if (!target || (index < 2 && (!Array.isArray(target) || !target.length))
            || (index === 2 && typeof target !== "object")) throw new Error("boş diskografi");
        if (index === 0 && target.some(r => !r || typeof r.title !== "string" || !r.title.trim())) throw new Error("geçersiz şarkı");
        const others = data => Object.fromEntries(Object.entries(data).filter(([id]) => id !== artist.id));
        if (JSON.stringify(others(prev)) !== JSON.stringify(others(next))) throw new Error("diğer sanatçının verisi değişti");
        // Date-only headers must not create a daily commit.
        if (JSON.stringify(prev) === JSON.stringify(next)) fs.writeFileSync(file, before[index]);
      });
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    files.forEach((f, i) => fs.writeFileSync(f, before[i]));
    console.warn("::warning::Diskografi korunuyor: " + artist.id);
    process.exitCode = 1;
  }
}
