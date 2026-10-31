#!/usr/bin/env node
/* ============================================================
   KARMA — tools/fetch-new-releases.js   (v10.67)

   NE YAPAR?
   ---------
   Oyunun kadrosundaki her sanatçının iTunes (country=TR) kataloğuna
   bakar, **son N gün içinde çıkmış** parçaları toplar ve
   `js/data/release-intel.js` dosyasına yazar.

   NEDEN GEREKLİ?
   --------------
   `js/data/real-songs.js` şarkıyı yalnızca `year` alanıyla tutuyor.
   "Bu parça yeni mi çıktı, ne zaman çıktı?" sorusu veride YOKTU.
   Bu yüzden:
     · "Yeni Çıkanlar" listesi aslında yeni çıkanları göstermiyordu
     · yeni çıkış oyuna hiç girmiyordu (v10.67 öncesi: Şehinşah'ın
       aynı gün çıkan "Sodom & Gomore" single'ı depoda yoktu)
     · playlist rotasyonu gerçek veriye bağlanamıyordu

   İKİ TUZAK — ikisi de bizzat yaşandı ve burada ÇÖZÜLDÜ:

   1) `sort=recent` ÇALIŞMIYOR. iTunes Search API bu parametreyi yok
      sayıyor ve kayıtları eskiden yeniye döndürüyor. Tarih sıralaması
      bu yüzden İSTEMCİDE yapılır.

   2) `lookup?id=<sanatçı>&entity=song` OFFSET DESTEKLEMİYOR.
      `&offset=200` gönderildiğinde aynı 200 kayıt tekrar gelir; 5
      sayfa = 1000 "şarkı" ama hepsi aynı. Bu yüzden katalog artık
      ALBÜM üzerinden gezilir:
          lookup?id=<sanatçı>&entity=album     → yeni albümler
          lookup?id=<albümler>&entity=song     → o albümlerin parçaları
      Hem doğru hem çok daha hızlı (37 sanatçı: ~35 sn → ~8 sn).

   3) KONUK TUZAĞI: iTunes, sanatçının SADECE KONUK olduğu parçaları da
      o sanatçının kataloğunda döndürür. Gerçek vaka: "Sodom & Gomore"
      hem Şehinşah'ın hem Hidra'nın kataloğunda göründü. Çözüm:
      `trackArtist` alanının **ilk** sanatçısı (iTunes birincil sanatçıyı
      başa yazar) kimse parça ona aittir. Böylece aynı şarkı iki kez
      listeye girmez.

   KORUMA
   ------
   · `intel` blokları KORUNUR — AI zenginleştirmesi yeniden çekimde
     silinmez (tools/ai-enrich.js bu alanı doldurur).
   · Penceresi geçmiş kayıtlar düşer; dosya sonsuza kadar büyümez.
   · İçerik değişmediyse dosya HİÇ yazılmaz (boş commit olmaz).
   · Tek sanatçının hatası koşuyu durdurmaz; uyarı basılır, devam edilir.

   BOZUK PARÇA (v10.71.0) — neden sanatçıyı iptal ETMİYORUZ?
   -----------------------------------------------------------
   29-30 Ekim 2026 koşularında her seferinde FARKLI üç sanatçı
   "geçersiz katalog kaydı" ile düştü ve o sanatçıların o günkü
   çıkışları hiç taranamadı. Sebep: tek bir bozuk kayıt (en tipik
   tetikleyici ön sipariş parçasının `releaseDate: null` olması)
   sanatçının TÜM taramasını iptal ediyordu. Pencere kayan 30 gün
   olduğu için her gün başka bir albüm pencereye girip aynı hatayı
   tekrarlıyordu.

   Yeni politika:
     · Parça düzeyi bozukluk  → O PARÇA atlanır, adı ve alanı loglanır,
       sanatçının geri kalanı normal taranır (koşu başarısız sayılmaz).
     · Albüm yanıtı tümden bozuk (`boş veya eksik albüm yanıtı`) ya da
       albüm tarihi geçersiz  → sanatçı REDDEDİLİR (gerçek kesinti
       koruması burada kalır, exit 1).
   Böylece ön sipariş kaydı yüzünden veri kaybı olmuyor, gerçek
   sağlayıcı kesintisi ise hâlâ yüksek sesle bildiriliyor.

   KULLANIM
   --------
     node tools/fetch-new-releases.js                 # son 30 gün
     node tools/fetch-new-releases.js --dry           # yazmadan önizleme
     node tools/fetch-new-releases.js --days 7        # dar pencere
     node tools/fetch-new-releases.js --only sehinsah # tek sanatçı
     node tools/fetch-new-releases.js --refresh-ids   # sanatçı kimliklerini yenile
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { norm, validDate, validate, atomicWrite } = require("./release-intel-io.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "js", "data", "release-intel.js");

const argv = process.argv.slice(2);
const has = (n) => argv.includes("--" + n);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };

const DRY = has("dry");
const DAYS = Number(arg("days", 30));
const ONLY = arg("only", null);
const DELAY = Number(arg("delay", 250));
const PER_ARTIST = Number(arg("per-artist", 6));
const REFRESH_IDS = has("refresh-ids");

const UA = "KARMA-release-scanner/1.0 (+https://github.com/lierefuge/KARMA-)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- veri oku / yaz ---------------- */
function loadGlobal(rel, name) {
  const win = {};
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  new Function("window", src)(win);
  return (win.K || {})[name];
}

function writeData(obj, header) {
  validate(obj);
  atomicWrite(
    OUT,
    header + JSON.stringify(obj, null, 1) + ";\n})(window.K = window.K || {});\n"
  );
}

/* ---------------- normalleştirme ----------------
   TÜRKÇE TUZAĞI: "KARARDI".toLowerCase() → "karardi" ama şarkının
   yazımı "Karardı" → "karardı". ı ≠ i olduğu için eşleşme kaçar.
   Ayrıca İ→i, I→ı dönüşümü elle yapılmalı. */
/* anahtar: "<slug>::<normalize başlık>" */
function keyOf(slug, title) { return slug + "::" + norm(title); }

/* ---------------- tarih yardımcıları ----------------
   TR saati sabit UTC+3 (2016'dan beri yaz saati yok).
   "Bugün" daima TR takvimine göre hesaplanır: 00:00'da yeni gün. */
const TR_OFFSET = 3 * 3600 * 1000;
function trToday() {
  return new Date(Date.now() + TR_OFFSET).toISOString().slice(0, 10);
}
function dayNum(isoDate) {
  const date = String(isoDate || "").slice(0, 10);
  if (!validDate(date)) return null;
  const t = Date.parse(date + "T00:00:00Z");
  return isFinite(t) ? Math.floor(t / 864e5) : null;
}
function ageDays(isoDate, todayIso) {
  const a = dayNum(isoDate), b = dayNum(todayIso);
  return a == null || b == null ? null : b - a;
}

/* ---------------- HTTP ---------------- */
async function getJSON(url, tries) {
  const n = tries || 3;
  let lastErr;
  for (let i = 0; i < n; i++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 15000);
      try {
        const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctl.signal });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const txt = await r.text();
        const data = JSON.parse(txt.replace(/^\uFEFF/, ""));
        if (!data || !Array.isArray(data.results) || data.resultCount !== data.results.length) {
          throw new Error("geçersiz katalog yanıtı");
        }
        return data;
      } finally { clearTimeout(t); }
    } catch (e) {
      lastErr = e;
      await sleep(400 + i * 700);
    }
  }
  throw lastErr;
}

/* ---------------- sanatçı kimliği ---------------- */
async function resolveArtistId(a) {
  const j = await getJSON(
    "https://itunes.apple.com/search?term=" + encodeURIComponent(a.stageName) +
    "&entity=musicArtist&limit=10&country=TR"
  );
  const list = (j.results || []).filter((x) => x.wrapperType === "artist" && x.artistId);
  if (!list.length) return null;
  const want = norm(a.stageName);
  const exact = list.find((x) => norm(x.artistName) === want);
  if (exact) return exact.artistId;
  const alias = (a.aliases || []).map(norm).filter(Boolean);
  const aliasHit = list.find((x) => alias.indexOf(norm(x.artistName)) >= 0);
  return aliasHit ? aliasHit.artistId : null;
}

/* ---------------- sahiplik denetimi ----------------
   "Şehinşah & Hidra" → birincil sanatçı "Şehinşah".
   Ayırıcılar: ", " · " & " · " feat. " · " ft. " · " x " · " X " · " / " */
function primaryArtist(trackArtist) {
  const raw = String(trackArtist || "");
  const parts = raw.split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\bx\b|\bvs\.?\b|\/)\s*/i);
  return (parts[0] || raw).trim();
}

function ownsTrack(trackArtist, artist) {
  const prim = norm(primaryArtist(trackArtist));
  return !!prim && [artist.stageName].concat(artist.aliases || []).some(n => norm(n) === prim);
}

/* ---------------- katalog: albüm üzerinden ---------------- */
/* Parça düzeyi bozukluk: hangi alanın bozuk olduğunu ADIYLA döndürür.
   Eski sürüm tek bir `throw` ile sanatçının tüm taramasını iptal ediyordu
   ve mesaj hangi kaydın bozuk olduğunu söylemiyordu (teşhis edilemezdi). */
function trackDefect(x) {
  if (typeof x.trackName !== "string" || !x.trackName.trim()) return "trackName";
  if (!x.artistName) return "artistName";
  if (dayNum(x.releaseDate) == null) return "releaseDate";
  if (!x.trackId) return "trackId";
  return null;
}
async function recentAlbums(artistId, todayIso, windowDays) {
  const j = await getJSON(
    "https://itunes.apple.com/lookup?id=" + artistId +
    "&entity=album&limit=200&country=TR"
  );
  const albums = (j.results || []).filter((x) => x.wrapperType === "collection" && x.collectionId);
  if (!albums.length || !j.results.some(x => x.wrapperType === "artist" && x.artistId === artistId)) {
    throw new Error("boş veya eksik sanatçı kataloğu; eski kayıtlar korunuyor");
  }
  if (albums.some(al => dayNum(al.releaseDate) == null)) throw new Error("geçersiz albüm tarihi");
  return albums.filter((al) => {
    const age = ageDays(al.releaseDate, todayIso);
    /* +2 gün tolerans: iTunes bazı ülkelerde tarihi 1 gün kaydırabiliyor */
    return age != null && age >= -1 && age <= windowDays + 2;
  });
}

/* Dönen değer: { tracks, skipped }. `skipped` parça düzeyi bozuk kayıtlar;
   sanatçıyı iptal etmez, çağıran taraf adıyla loglar. */
async function albumTracks(albumIds) {
  const out = [];
  const skipped = [];
  for (let i = 0; i < albumIds.length; i += 100) {
    const ids = albumIds.slice(i, i + 100).join(",");
    const j = await getJSON(
      "https://itunes.apple.com/lookup?id=" + ids + "&entity=song&limit=200&country=TR"
    );
    for (const id of albumIds.slice(i, i + 100)) {
      if (!j.results.some(x => x.wrapperType === "collection" && x.collectionId === id)
          || !j.results.some(x => x.wrapperType === "track" && x.collectionId === id)) {
        throw new Error("boş veya eksik albüm yanıtı; eski kayıtlar korunuyor");
      }
    }
    j.results.forEach((x) => {
      if (x.wrapperType !== "track") return;
      const field = trackDefect(x);
      if (field) { skipped.push({ field, track: x }); return; }
      out.push(x);
    });
    await sleep(DELAY);
  }
  return { tracks: out, skipped };
}

/* ---------------- sanatçı taraması ---------------- */
async function scanArtist(a, artistId, ctx) {
  const albums = await recentAlbums(artistId, ctx.today, DAYS);
  if (!albums.length) return { scanned: 0, fresh: 0, rows: [], skipped: [] };

  await sleep(DELAY);
  const { tracks, skipped } = await albumTracks(albums.map((al) => al.collectionId));

  const rows = [];
  const seen = new Set();
  let scanned = 0;
  tracks.forEach((t) => {
    scanned++;
    const age = ageDays(t.releaseDate, ctx.today);
    if (age == null || age < -1 || age > DAYS) return;
    /* konuk tuzağı: parça bu sanatçının değilse atla */
    if (!ownsTrack(t.artistName, a)) return;

    const key = keyOf(a.id, t.trackName);
    if (seen.has(key)) return;
    seen.add(key);
    const known = ctx.knownBySlug[a.id] || new Set();
    rows.push({
      title: t.trackName,
      artistId: a.id,
      artistName: a.stageName,
      album: t.collectionName || null,
      art: String(t.artworkUrl100 || "").replace("/100x100bb", "/600x600bb"),
      releaseDate: String(t.releaseDate || "").slice(0, 10),
      ms: t.trackTimeMillis || 0,
      url: t.trackViewUrl || null,
      preview: t.previewUrl || null,
      trackArtist: t.artistName || "",
      isNew: !known.has(norm(t.trackName))
    });
  });

  rows.sort((x, y) => (x.releaseDate < y.releaseDate ? 1 : x.releaseDate > y.releaseDate ? -1 : 0));
  return { scanned, fresh: rows.length, rows: rows.slice(0, PER_ARTIST), skipped };
}

/* ---------------- ana akış ---------------- */
(async function main() {
  if (!Number.isInteger(DAYS) || DAYS < 1 || !Number.isInteger(PER_ARTIST) || PER_ARTIST < 1
      || !Number.isFinite(DELAY) || DELAY < 0) throw new Error("geçersiz tarama seçenekleri");
  const started = Date.now();
  const today = trToday();

  const ARTISTS = loadGlobal("js/data/artists.js", "ARTISTS") || [];
  const SONGS = loadGlobal("js/data/real-songs.js", "REAL_SONGS") || {};

  /* eski dosyayı oku — meta ve intel blokları taşınacak */
  let prev = { meta: {}, releases: {} };
  if (fs.existsSync(OUT)) {
    prev = validate(loadGlobal("js/data/release-intel.js", "RELEASE_INTEL"));
  }
  const prevMeta = prev.meta || {};
  const prevReleases = prev.releases || {};

  const knownBySlug = {};
  Object.keys(SONGS).forEach((slug) => {
    knownBySlug[slug] = new Set((SONGS[slug] || []).map((s) => norm(s.title)));
  });

  const roster = ONLY ? ARTISTS.filter((a) => a.id === ONLY) : ARTISTS;
  if (!roster.length) {
    console.error("HATA: sanatçı bulunamadı" + (ONLY ? " (" + ONLY + ")" : ""));
    process.exit(1);
  }

  console.log("\nKARMA — yeni çıkış taraması");
  console.log("  bugün (TR) : " + today);
  console.log("  pencere    : son " + DAYS + " gün");
  console.log("  sanatçı    : " + roster.length + (ONLY ? " (--only)" : ""));
  console.log("  kaynak     : iTunes Lookup API (album → song, country=TR)\n");

  const ids = Object.assign({}, prevMeta.artistIds || {});
  const releases = Object.assign({}, prevReleases);
  const successful = new Set();
  let scannedTotal = 0, freshTotal = 0, added = 0, updated = 0, errors = 0, skippedTotal = 0;

  for (let i = 0; i < roster.length; i++) {
    const a = roster[i];
    const tag = "[" + String(i + 1).padStart(2) + "/" + roster.length + "] " + (a.stageName || a.id).padEnd(18);
    try {
      let artistId = REFRESH_IDS ? null : ids[a.id];
      if (!artistId) {
        artistId = await resolveArtistId(a);
        await sleep(DELAY);
      }
      if (!artistId) { console.log(tag + " ⚠ iTunes kimliği bulunamadı"); errors++; continue; }
      ids[a.id] = artistId;

      const res = await scanArtist(a, artistId, { today, knownBySlug });
      successful.add(a.id);
      scannedTotal += res.scanned;
      freshTotal += res.fresh;

      /* Parça düzeyi bozukluk: ATLA, adıyla bildir. Sanatçı reddedilmez:
         tek bir ön sipariş kaydı yüzünden o günün çıkışları kaybolmasın. */
      res.skipped.forEach((s) => {
        skippedTotal++;
        const t = s.track || {};
        const raw = s.field === "releaseDate" ? t.releaseDate : t[s.field];
        const nm = (typeof t.trackName === "string" && t.trackName.trim())
          ? t.trackName : "(adsız parça)";
        console.log(tag + " ⚠ atlandı: \"" + String(nm).slice(0, 40) + "\" · alan: " + s.field
          + " · değer: " + String(raw === undefined || raw === null ? "null" : raw).slice(0, 30)
          + (t.collectionName ? " · albüm: " + String(t.collectionName).slice(0, 30) : ""));
      });

      const line = [];
      res.rows.forEach((r) => {
        const k = keyOf(a.id, r.title);
        const old = releases[k] || null;
        const rec = {
          title: r.title,
          artistId: r.artistId,
          artistName: r.artistName,
          album: r.album,
          art: r.art,
          releaseDate: r.releaseDate,
          ms: r.ms,
          url: r.url,
          preview: r.preview || null,
          trackArtist: r.trackArtist,
          isNew: r.isNew,
          /* AI zenginleştirmesi KORUNUR */
          intel: old && old.intel ? old.intel : null
        };
        if (!old) added++;
        else if (JSON.stringify(old) !== JSON.stringify(rec)) updated++;
        releases[k] = rec;
        line.push(r.releaseDate.slice(5) + " " + r.title + (r.isNew ? " ★" : ""));
      });

      console.log(tag + String(res.scanned).padStart(4) + " şarkı · " +
        String(res.fresh).padStart(2) + " taze" +
        (line.length ? "  → " + line.slice(0, 3).join(" · ") + (line.length > 3 ? " …" : "") : ""));
    } catch (e) {
      errors++;
      console.log(tag + " ✗ " + (e && e.message ? e.message : e));
    }
    await sleep(DELAY);
  }

  /* ---- penceresi geçen kayıtları düşür (dosya büyümesin) ---- */
  const kept = {};
  Object.keys(releases).forEach((k) => {
    const r = releases[k];
    if (!r || !r.releaseDate) return;
    const age = ageDays(r.releaseDate, today);
    if (successful.has(r.artistId) && (age == null || age > DAYS)) return;
    kept[k] = r;
  });

  if (!Object.keys(kept).length && Object.keys(prevReleases).length) {
    console.warn("⚠ Boş sonuç mevcut veriyi ezmeyecek; dosya korunuyor.");
    process.exitCode = 1;
    return;
  }
  if (errors) process.exitCode = 1;

  /* ---- deterministik sıra: yeni → eski, eşitlikte başlık ---- */
  const ordered = {};
  Object.keys(kept)
    .sort((x, y) => {
      const dx = kept[x].releaseDate, dy = kept[y].releaseDate;
      if (dx !== dy) return dx < dy ? 1 : -1;
      return norm(kept[x].title) < norm(kept[y].title) ? -1 : 1;
    })
    .forEach((k) => { ordered[k] = kept[k]; });

  /* ---- yalnızca bir sanatçı tarandıysa diğerlerinin meta'sı korunur ---- */
  const meta = {
    asof: today,
    window: DAYS,
    source: "itunes-lookup-tr",
    count: Object.keys(ordered).length,
    newCount: Object.keys(ordered).filter((k) => ordered[k].isNew).length,
    artistIds: ids,
    generated: prevMeta.generated || null
  };

  const changed = JSON.stringify(prevReleases) !== JSON.stringify(ordered) ||
                  JSON.stringify(prevMeta.artistIds || {}) !== JSON.stringify(ids);

  console.log("\n  taranan şarkı : " + scannedTotal);
  console.log("  pencerede     : " + freshTotal + " (" + meta.newCount + " tanesi depoda yok)");
  console.log("  kayıt         : " + meta.count + " · yeni: " + added + " · güncellenen: " + updated
    + " · hata: " + errors
    + (skippedTotal ? " · atlanan parça: " + skippedTotal : ""));
  console.log("  süre          : " + ((Date.now() - started) / 1000).toFixed(1) + " sn");

  if (!changed) {
    console.log("\n⏭  İçerik değişmedi — dosya yazılmadı (boş commit olmaz).");
    return;
  }

  meta.generated = new Date().toISOString();
  const payload = { meta, releases: ordered };
  const header =
`/* ============================================================
   KARMA — data/release-intel.js  (OTOMATİK ÜRETİLDİ)
   Son ${DAYS} günde çıkan GERÇEK parçalar + AI zenginleştirme alanı.

   Üretici : node tools/fetch-new-releases.js
   Kaynak  : iTunes Lookup API (country=TR) — albüm → parça
   Tarih   : ${today}  ·  ${meta.count} kayıt (${meta.newCount} tanesi depoda yok)

   ŞEMA (kayıt başına)
   -------------------
     title        gerçek parça adı
     artistId     oyundaki sanatçı kimliği (js/data/artists.js)
     artistName   oyundaki sahne adı
     album        albüm/single adı
     art          600x600 kapak
     releaseDate  YYYY-MM-DD (iTunes, TR)
     ms           süre (milisaniye)
     url          iTunes sayfası
     preview      30 sn ses önizlemesi (iTunes previewUrl) — yeni çıkışın
                  oyunda ÇALINABİLMESİNİ sağlar; yoksa null
     trackArtist  iTunes'un tam sanatçı dizesi ("Şehinşah & Hidra")
     isNew        real-songs.js'te YOK mu?
     intel        AI zenginleştirmesi — null ise henüz işlenmedi.
                  tools/ai-enrich.js doldurur; fetch bu alanı KORUR.
                  { genre, mood, energy, tempo, fit{playlistId:0..1},
                    note, tags[], model, v }

   DÜZENLEMEYİN — bir sonraki çalıştırmada üzerine yazılır.
   ============================================================ */
(function (K) {
  "use strict";
  K.RELEASE_INTEL = `;

  if (DRY) {
    console.log("\n  (--dry: yazılmadı) ilk 5 kayıt:");
    Object.keys(ordered).slice(0, 5).forEach((k) => {
      const r = ordered[k];
      console.log("    " + r.releaseDate + "  " + r.artistName + " — " + r.title +
        (r.isNew ? "  ★YENİ" : "") + "  [" + k + "]");
    });
    return;
  }

  writeData(payload, header);
  console.log("\n✅ js/data/release-intel.js yazıldı · " +
    (fs.statSync(OUT).size / 1024).toFixed(1) + " KB · " + meta.count + " kayıt");
})().catch((e) => {
  console.error("HATA: " + (e && e.message ? e.message : e));
  process.exit(1);
});
