#!/usr/bin/env node
/* ============================================================
   KARMA — tools/ai-enrich.js   (v10.67)

   NE YAPAR?
   ---------
   `js/data/release-intel.js` içindeki her yeni çıkışı bir dil modeline
   gönderir ve şu alanları doldurur:

     genre   tür ("trap", "drill", "rnb", "pop", "rap", ...)
     mood    atmosfer ("karanlık", "melankolik", "enerjik", ...)
     energy  1-10
     tempo   "slow" | "mid" | "fast"
     fit     her editoryal listeye uygunluk 0..1
     note    Türkçe kısa küratör notu (<= 90 karakter)
     tags    3 etiket

   NEDEN GEREKLİ?
   --------------
   iTunes yalnızca `primaryGenreName` veriyor ("Hip-Hop/Rap"). Oyunun
   "Gece Modu" listesi R&B + melankolik istiyor, "Drill Türkiye" drill
   istiyor — bu ayrım metadata'da YOK. `editorial.js` `intel.fit` alanını
   okur; doluysa şarkı doğru listeye girer, boşsa kural tabanlı tahmine
   düşer (oyun AI olmadan da çalışır).

   NEDEN TARAYICIDA DEĞİL?
   -----------------------
   Statik site. API anahtarı `js/` içine girerse 10 dakikada çalınır.
   Bu yüzden zenginleştirme BUILD-TIME'da yapılır, sonuç JSON olarak
   oyuna gömülür. Oyun çevrimdışı çalışmaya devam eder.

   TASARIM KURALLARI (hepsi bir nedene bağlı)
   ------------------------------------------
   1) MODEL ŞARKI UYDURMAZ. Girdi iTunes'tan gelir; model yalnızca
      ETİKET üretir. Çıktıda başlık/sanatçı alanı istenmez.
   2) DETERMİNİSTİK. temperature=0 + responseSchema. Aynı girdi aynı
      çıktıyı vermeli, yoksa CI'ın bayt-bayt build karşılaştırması kırılır.
   3) CACHE. `intel` doluysa ve `v` (prompt sürümü) güncelse ATLANIR.
      Böylece her koşuda tekrar para/kota harcanmaz.
   4) ASLA BLOKLAMAZ. API hatası, kota, ağ → o kayıt `intel: null`
      kalır, uyarı basılır, sıradakine geçilir. Koşu asla çökmez.
   5) DOĞRULAMA. Model ne dönerse dönsün değerler kırpılır: energy
      1-10, fit 0..1, note 90 karakter, genre beyaz listede.
   6) BAŞLIK KORUNUR. Dosyanın `fetch-new-releases.js` tarafından
      yazılan başlık yorumu AYNEN kalır; yalnızca JSON gövdesi değişir.

   KULLANIM
   --------
     export GEMINI_API_KEY=...
     node tools/ai-enrich.js                # eksikleri doldur
     node tools/ai-enrich.js --dry          # API'siz önizleme
     node tools/ai-enrich.js --limit 5      # ilk 5 kayıt
     node tools/ai-enrich.js --force        # dolu olanları da yeniden işle
     node tools/ai-enrich.js --model gemini-2.5-flash
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "js", "data", "release-intel.js");

const argv = process.argv.slice(2);
const has = (n) => argv.includes("--" + n);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };

const DRY = has("dry");
const FORCE = has("force");
const LIMIT = Number(arg("limit", 0));
const ONLY = arg("only", null);
const MODEL = arg("model", "gemini-3.5-flash");
const DELAY = Number(arg("delay", 12000));   /* 5 istek/dk ücretsiz kota → 12 sn ara */
const BATCH = Math.max(1, Math.min(8, Number(arg("batch", 6))));

const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const PROMPT_VERSION = 1;
const PLAYLISTS = ["rapturkiye", "traptr", "drilltr", "newmusic", "nightmode", "popturkiye"];
const GENRES = ["rap", "trap", "drill", "rnb", "pop", "rock", "arabesk", "electronic", "other"];
const TEMPOS = ["slow", "mid", "fast"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- dosya oku / yaz ---------------- */
function load() {
  const win = {};
  new Function("window", fs.readFileSync(FILE, "utf8"))(win);
  return win.K.RELEASE_INTEL;
}

/* Başlık yorumunu KORU: yalnızca "K.RELEASE_INTEL = " sonrasını değiştir.
   Böylece fetch-new-releases.js'in ürettiği künye bozulmaz. */
function write(obj) {
  const raw = fs.readFileSync(FILE, "utf8");
  const marker = "K.RELEASE_INTEL = ";
  const i = raw.indexOf(marker);
  if (i < 0) throw new Error("release-intel.js biçimi tanınmadı (işaret bulunamadı)");
  const head = raw.slice(0, i + marker.length);
  const tail = ";\n})(window.K = window.K || {});\n";
  fs.writeFileSync(FILE, head + JSON.stringify(obj, null, 1) + tail, "utf8");
}

/* ---------------- model çağrısı ---------------- */
const ITEM = {
  type: "object",
  properties: {
    i: { type: "integer" },
    genre: { type: "string", enum: GENRES },
    mood: { type: "string" },
    energy: { type: "integer" },
    tempo: { type: "string", enum: TEMPOS },
    fit: {
      type: "object",
      properties: PLAYLISTS.reduce((o, p) => { o[p] = { type: "number" }; return o; }, {})
    },
    note: { type: "string" },
    tags: { type: "array", items: { type: "string" } }
  },
  required: ["i", "genre", "mood", "energy", "tempo", "fit", "note", "tags"]
};

/* TOPLU ŞEMA — neden tek nesne değil?
   Ücretsiz katman DAKİKADA 5 istek veriyor (ölçüldü: FreeTier
   generate_content_free_tier_requests, quotaValue 5). 24 şarkıyı
   tek tek göndermek 24 istek = 5 dakika ve kota duvarı demekti.
   Toplu gönderim 24 şarkıyı 4 isteğe indiriyor. */
const SCHEMA = {
  type: "object",
  properties: { items: { type: "array", items: ITEM } },
  required: ["items"]
};

function promptFor(batch) {
  const lines = batch.map((r, idx) =>
    "  [" + idx + "] " + r.title + " — " + r.trackArtist
    + " · albüm: " + (r.album || "-")
    + " · çıkış: " + r.releaseDate
  ).join("\n");

  return (
    "Sen bir Türk müzik endüstrisi editörüsün. Aşağıdaki GERÇEK şarkıları "
    + "oyunun editoryal listeleri için etiketle.\n\n"
    + "ŞARKILAR\n" + lines + "\n\n"
    + "LİSTELER (fit = bu listeye uygunluk, 0.0-1.0)\n"
    + "  rapturkiye Rap Türkiye — klasik/güncel Türk rap\n"
    + "  traptr     Trap Zone TR — sert trap, yeni jenerasyon\n"
    + "  drilltr    Drill Türkiye — drill\n"
    + "  newmusic   Yeni Çıkanlar — yeni çıkmış, öne çıkan işler\n"
    + "  nightmode  Gece Modu — R&B, melankolik, gece dinlemelik\n"
    + "  popturkiye Pop Türkiye — pop\n\n"
    + "KURALLAR\n"
    + "  · Her şarkı için TAM BİR nesne döndür; `i` alanı yukarıdaki köşeli parantez numarasıdır.\n"
    + "  · Sadece JSON döndür, açıklama yazma.\n"
    + "  · note: Türkçe, en fazla 90 karakter, şarkının sesini anlatan tek cümle.\n"
    + "  · Emin değilsen fit değerini düşük tut (0.2). Uydurma.\n"
    + "  · tags: 3 kısa Türkçe etiket.\n"
  );
}

async function askModelOnce(batch) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/"
    + encodeURIComponent(MODEL) + ":generateContent";
  const body = {
    contents: [{ parts: [{ text: promptFor(batch) }] }],
    generationConfig: {
      temperature: 0,            /* determinizm: aynı girdi → aynı çıktı */
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      /* DİKKAT: 512 çok düşüktü — JSON yarıda kesilip "Unterminated string"
         hatası veriyordu (bizzat yaşandı). Toplu yanıtta daha da kritik. */
      maxOutputTokens: 4096
    }
  };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 45000);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify(body),
    signal: ctl.signal
  });
  clearTimeout(t);
  if (!res.ok) {
    const txt = (await res.text()).slice(0, 200);
    const err = new Error("HTTP " + res.status + " " + txt.replace(/\s+/g, " "));
    err.status = res.status;
    throw err;
  }
  const j = await res.json();
  const cand = (j.candidates || [])[0];
  const txt = cand && cand.content && cand.content.parts
    && cand.content.parts.map((p) => p.text || "").join("");
  if (!txt) throw new Error("boş yanıt (blockReason: "
    + ((j.promptFeedback && j.promptFeedback.blockReason) || "-") + ")");
  const parsed = JSON.parse(txt);
  const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
  if (!items.length) throw new Error("şema dışı yanıt (items yok)");
  return items;
}

/* Geçici hatalar (429 kota / 500 / 503 aşırı yük) için 3 deneme.
   Kalıcı hatalar (400 şema, 404 model) hemen yukarı fırlatılır. */
async function askModel(batch) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await askModelOnce(batch);
    } catch (e) {
      lastErr = e;
      const s = e && e.status;
      const retryable = s === 429 || s >= 500 || /Unterminated|JSON/i.test(String(e && e.message));
      if (!retryable) throw e;
      /* 429 = dakikalık kota → 15 sn bekle, hız sınırı penceresi kapansın */
      const wait = s === 429 ? 15000 : 1500 * (attempt + 1);
      if (attempt < 3) await sleep(wait);
    }
  }
  throw lastErr;
}

/* ---------------- doğrulama / kırpma ---------------- */
const clamp01 = (n) => (typeof n === "number" && isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

function sanitize(out, r) {
  if (!out || typeof out !== "object") throw new Error("nesne değil");
  const genre = GENRES.indexOf(out.genre) >= 0 ? out.genre : "other";
  const tempo = TEMPOS.indexOf(out.tempo) >= 0 ? out.tempo : "mid";
  const energy = Math.min(10, Math.max(1, Math.round(Number(out.energy) || 5)));
  const fit = {};
  PLAYLISTS.forEach((p) => { fit[p] = clamp01(out.fit && out.fit[p]); });
  const note = String(out.note || "").replace(/\s+/g, " ").trim().slice(0, 90);
  const tags = (Array.isArray(out.tags) ? out.tags : [])
    .map((x) => String(x).replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 3);
  if (!note) throw new Error("not boş");
  return {
    genre: genre,
    mood: String(out.mood || "").replace(/\s+/g, " ").trim().slice(0, 24) || "nötr",
    energy: energy,
    tempo: tempo,
    fit: fit,
    note: note,
    tags: tags,
    model: MODEL,
    v: PROMPT_VERSION
  };
}

/* ---------------- ana akış ---------------- */
(async function main() {
  if (!fs.existsSync(FILE)) {
    console.error("HATA: " + FILE + " yok — önce: node tools/fetch-new-releases.js");
    process.exit(1);
  }

  const data = load();
  const releases = data.releases || {};
  const keys = Object.keys(releases);

  const todo = keys.filter((k) => {
    const r = releases[k];
    if (!r) return false;
    if (ONLY && r.artistId !== ONLY) return false;
    if (FORCE) return true;
    if (!r.intel) return true;
    return (r.intel.v || 0) < PROMPT_VERSION;   /* prompt güncellendiyse yeniden işle */
  });

  const slice = LIMIT > 0 ? todo.slice(0, LIMIT) : todo;

  console.log("\nKARMA — AI zenginleştirme");
  console.log("  dosya    : js/data/release-intel.js");
  console.log("  model    : " + MODEL + "  (prompt v" + PROMPT_VERSION + ")");
  console.log("  kayıt    : " + keys.length + " · işlenecek: " + slice.length);

  if (!slice.length) {
    console.log("\n⏭  Yapılacak iş yok — hepsi zenginleştirilmiş.");
    return;
  }

  if (DRY) {
    console.log("  mod      : --dry (API çağrısı YOK)\n");
    slice.forEach((k) => {
      const r = releases[k];
      console.log("  · " + r.releaseDate + "  " + r.artistName + " — " + r.title);
    });
    console.log("\n  ipucu: gerçek koşu için GEMINI_API_KEY gerekir.");
    return;
  }

  if (!KEY) {
    console.error("\nHATA: GEMINI_API_KEY tanımlı değil.");
    console.error("  export GEMINI_API_KEY=...     (veya GitHub Secrets)");
    process.exit(1);
  }

  let done = 0, skipped = 0, failed = 0;

  /* TOPLU İŞLEME — kota nedeniyle zorunlu (5 istek/dk) */
  for (let b = 0; b < slice.length; b += BATCH) {
    const batch = slice.slice(b, b + BATCH);
    const recs = batch.map((k) => releases[k]);
    const tag = "[" + String(b + 1).padStart(2) + "-" + (b + batch.length) + "/" + slice.length + "]";
    try {
      const items = await askModel(recs);
      let hit = 0;
      batch.forEach((k, idx) => {
        /* model `i` vermezse sıraya güven (en yaygın durum) */
        const out = items.find((x) => Number(x && x.i) === idx) || items[idx];
        if (!out) return;
        try {
          releases[k].intel = sanitize(out, releases[k]);
          hit++; done++;
          console.log(tag + " ✅ " + releases[k].artistName.padEnd(13) + " "
            + releases[k].intel.genre.padEnd(6) + " " + releases[k].intel.note.slice(0, 42));
        } catch (e) {
          failed++;
          console.log(tag + " ✗ " + releases[k].artistName + " — " + e.message);
        }
      });
      if (!hit) console.log(tag + " ⚠️  hiçbir kayıt doğrulanamadı");
    } catch (e) {
      failed += batch.length;
      console.log(tag + " ✗ toplu hata: " + String(e && e.message).slice(0, 90));
      if (/HTTP 429|quota|RESOURCE_EXHAUSTED/i.test(String(e && e.message))) {
        console.log("\n  ⏸  kota sınırı — kalan kayıtlar sonraki koşuya bırakıldı.");
        break;
      }
    }
    if (b + BATCH < slice.length) await sleep(DELAY);
  }

  if (!done && !skipped) {
    console.log("\n⚠️  Hiçbir kayıt güncellenmedi — dosya yazılmadı.");
    process.exit(failed ? 1 : 0);
  }

  write(data);
  const filled = Object.keys(releases).filter((x) => releases[x].intel).length;
  console.log("\n✅ intel dolduruldu: " + done + " · hata: " + failed
    + " · toplam dolu: " + filled + "/" + keys.length);
  console.log("   js/data/release-intel.js güncellendi.");
})().catch((e) => {
  console.error("HATA: " + (e && e.message ? e.message : e));
  process.exit(1);
});
