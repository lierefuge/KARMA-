/* Build-time only: preserve the existing browser data format. */
const fs = require("fs");

function norm(s) {
  return String(s == null ? "" : s).replace(/İ/g, "i").replace(/I/g, "ı")
    .toLowerCase().replace(/[’'`´]/g, "").replace(/["“”„]/g, "")
    .replace(/\s+/g, " ").trim();
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validate(data) {
  if (!data || !data.meta || !data.releases || Array.isArray(data.releases)
      || typeof data.releases !== "object" || data.meta.source !== "itunes-lookup-tr") {
    throw new Error("release-intel veri şeması geçersiz");
  }
  const entries = Object.entries(data.releases);
  for (const [key, r] of entries) {
    if (!r || ![r.title, r.artistId, r.artistName, r.trackArtist].every(s => typeof s === "string" && s.trim())
        || key !== r.artistId + "::" + norm(r.title) || !validDate(r.releaseDate)
        || typeof r.isNew !== "boolean" || !Number.isFinite(r.ms) || r.ms < 0
        || !(r.intel === null || (typeof r.intel === "object" && !Array.isArray(r.intel)))) {
      throw new Error("release-intel kayıt şeması geçersiz");
    }
  }
  if (data.meta.count !== entries.length || data.meta.newCount !== entries.filter(([, r]) => r.isNew).length) {
    throw new Error("release-intel sayaçları tutarsız");
  }
  return data;
}

function atomicWrite(file, text) {
  const temp = file + "." + process.pid + ".tmp";
  try {
    fs.writeFileSync(temp, text, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

module.exports = { norm, validDate, validate, atomicWrite };
