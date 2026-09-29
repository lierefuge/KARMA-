#!/usr/bin/env node
/* ============================================================
   KARMA — tools/fetch-youtube.js   (v10.26)

   NE YAPAR?
   ---------
   Bir sanatçının YETKİLİ YouTube kanallarındaki (resmî + "- Topic")
   yüklemeleri sayfalayarak toplar, her videonun başlığını **oembed**
   ile doğrular ve oyunun şarkı listesiyle eşleştirip
   `js/data/real-youtube.js` dosyasına ekler.

   NEDEN GEREKLİ?
   --------------
   YouTube kapsamı ölçüldüğünde (v10.26) toplam **%52,6** idi; açığın
   tamamı amiral sanatçılardaydı (Şehinşah 8/187, wegh Rumi 1/48). Bu
   dosya elle üretilmişti ve yeniden üretilemiyordu. Artık üretilebilir.

   GÜVENLİK (yanlış video bağlamayı önler)
   ---------------------------------------
   1) Yalnızca YETKİLİ kanallar taranır (resmî + Topic). Fan/derleme
      kanalları asla bağlanmaz.
   2) Her video **oembed** ile doğrulanır — oembed 200 dönmeyen
      (gömülemeyen/kapalı) videolar elenir.
   3) Başlık eşleşmesi normalize edilir ve KATI kurallara tabidir:
        · şarkı adı, video başlığında KELİME ÖBEĞİ olarak geçmeli
        · KISA/genel adlar (tek kelime ve <7 karakter) fazladan kelime
          kabul etmez → "Yalan" şarkısı "Yalan Dünya" videosuna bağlanmaz
        · bir video birden çok şarkıyla eşleşirse EN UZUN şarkı adı kazanır
   4) Mevcut kayıtlar KORUNUR; yalnızca eksikler eklenir.

   KULLANIM
   --------
     node tools/fetch-youtube.js --dry                 # yazmadan önizleme
     node tools/fetch-youtube.js                       # eksikleri ekle
     node tools/fetch-youtube.js --slug sehinsah --dry
     node tools/fetch-youtube.js --find-channels "Şehinşah"
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const argOf = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const ONLY = argOf("slug", null);
const FIND = argOf("find-channels", null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------
   YETKİLİ KANALLAR — kimlikler oembed `author_url` ile doğrulandı.
   Yeni sanatçı eklerken: `--find-channels "<Ad>"` ile adayları gör,
   resmî ve "- Topic" kanalını buraya yaz.
   ------------------------------------------------------------------ */
const CHANNELS = {
  sehinsah: [
    { id: "UC5kvrlBkq31r5e36YP9UO6g", name: "ŞEHİNŞAH (resmî)" },
    { id: "UCw0ZQLuRMap9XYF-48PlhPw", name: "Şehinşah - Topic" }
  ],
  weghrumi: [
    { id: "UCx_EXk9I29_iIT0YZVAlpMA", name: "Wegh (resmî)" }
  ]
};

/* ---------------- veri oku/yaz ---------------- */
function loadData(file, varName) {
  const win = {};
  new Function("window", fs.readFileSync(path.join(ROOT, file), "utf8"))(win);
  return win.K[varName];
}
function writeData(file, varName, obj, head) {
  /* DİKKAT: yalnızca ";" — `JSON.stringify` zaten açılış/kapanış süslü
     parantezlerini üretir. Buraya "};" yazmak dosyayı "}};" ile
     bitirip GEÇERSİZ JS üretir (bizzat yaşandı, v10.26). */
  fs.writeFileSync(path.join(ROOT, file), head + JSON.stringify(obj, null, 1) + ";\n})(window.K = window.K || {});\n");
}

/* ---------------- normalleştirme ----------------
   TÜRKÇE BÜYÜK/KÜÇÜK HARF TUZAĞI: JS'te "KARARDI".toLowerCase() → "karardi"
   ama şarkının yazımı "Karardı" → "karardı". ı ≠ i olduğu için eşleşme
   sessizce düşüyordu (gerçek vaka: weghrumi "Karardı Bulutlar").
   Bu yüzden ı/İ/I/i tek harfe katlanır; ayrıca "İ".toLowerCase()'in
   ürettiği birleşik nokta (U+0307) temizlenir. */
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
    .replace(/#[\wçğıöşü]+/g, " ")
    .replace(/\b(official|video|klip|lyric|lyrics|audio|visualizer|canlı|canli|live|remix|feat|ft|shorts|müzik|music|prod|slowed|reverb|sped|topic|version|versiyon|mix|acoustic)\b/g, " ")
    .replace(/[^a-z0-9çğıöşü ]+/g, " ")
    .replace(/\s+/g, " ").trim();
}

/* sanatçı adlarından izin verilen "fazladan kelime" sözlüğü */
function artistTokens(K) {
  const set = new Set();
  (K.ARTISTS || []).forEach((a) => {
    [a.stageName, a.realName].concat(a.aliases || []).forEach((n) => {
      const t = norm(n);
      if (t) { set.add(t); t.split(" ").forEach((w) => set.add(w)); }
    });
  });
  return set;
}

/* şarkı OLMAYAN video işaretleri.
   DİKKAT: bu kontrol HAM başlık üzerinde yapılır — çünkü `norm()`
   parantez içeriğini siler ve "Kunteper (Teaser) ''SOON''" başlığındaki
   "Teaser" işareti kaybolurdu (gerçek vaka: yanlışlıkla bağlandı). */
const NON_SONG = new Set([
  "kamera", "arkasi", "cam", "vlog", "teaser", "trailer", "fragman",
  "reaction", "behind", "scenes", "making", "roportaj", "interview",
  "podcast", "konser", "challenge", "karaoke", "instrumental", "acapella",
  "snippet", "beat", "beats", "type", "freestyle", "ders", "review", "unboxing"
].map((t) => trFold(t)));

/* KATI eşleşme: şarkı adı, video başlığında KELİME ÖBEĞİ olarak geçmeli.

   Video başlıkları sanatçı adı ve süsleme taşır ("Wegh - Tuzak (Official
   Lyrics Video)", "Şehinşah feat. X - ..."). Bu yüzden:
     · KISA/genel adlar (tek kelime ve <7 karakter) → fazladan kelimeler
       yalnızca SANATÇI SÖZLÜĞÜNDEN olabilir. Böylece "Yalan" şarkısı
       "Yalan Dünya" videosuna bağlanmaz.
     · UZUN/çok kelimeli adlar → fazladan kelime serbest (prodüktör ve
       konuk sanatçı adları sözlükte olmayabilir). Kelime öbeği zorunluluğu
       zaten yanlış eşleşmeye karşı asıl korumadır: "Son Gaz" adı
       "Son Gazete" başlığıyla EŞLEŞMEZ ("gaz" ≠ "gazete").
   İki aday da uyduğunda en AZ fazladan kelimeli video seçilir. */
function matchTitle(videoTitle, songTitle, allowed) {
  const v = norm(videoTitle), s = norm(songTitle);
  if (!s || !v) return false;
  const vt = v.split(" "), st = s.split(" ");
  if (st.length > vt.length) return false;
  let at = -1;
  for (let i = 0; i + st.length <= vt.length; i++) {
    if (st.every((w, j) => vt[i + j] === w)) { at = i; break; }
  }
  if (at < 0) return false;
  /* ŞARKI OLMAYAN videoları ele: "... Kamera Arkası", "... (Teaser)",
     "... Röportaj", "... Reaction" gibi başlıklar şarkının kendisi değildir.
     HAM başlıktan (parantezler silinmeden) bakılır. */
  const rawTokens = trFold(videoTitle).replace(/[^a-z0-9çğıöşü]+/g, " ").replace(/\s+/g, " ").trim().split(" ");
  if (rawTokens.some((t) => NON_SONG.has(t))) return false;
  const extra = vt.slice(0, at).concat(vt.slice(at + st.length));
  const strong = st.length >= 2 || s.length >= 7;
  if (strong) return true;
  return extra.every((t) => allowed.has(t));
}

/* ---------------- YouTube HTML/JSON ---------------- */
async function getText(url, json) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9" } });
  if (json) { if (!r.ok) return null; try { return await r.json(); } catch (e) { return null; } }
  return await r.text();
}
function extractJson(html, marker) {
  const at = html.indexOf(marker); if (at < 0) return null;
  let i = html.indexOf("{", at); if (i < 0) return null;
  const start = i; let depth = 0, inStr = false, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { try { return JSON.parse(html.slice(start, i + 1)); } catch (e) { return null; } } }
  }
  return null;
}
function videoIds(d) {
  const out = [], seen = new Set();
  (function walk(o) {
    if (!o || typeof o !== "object") return;
    if (typeof o.videoId === "string" && /^[\w-]{11}$/.test(o.videoId) && !seen.has(o.videoId)) {
      seen.add(o.videoId); out.push(o.videoId);
    }
    for (const k in o) walk(o[k]);
  })(d);
  return out;
}
function contToken(d) {
  let t = null;
  (function walk(o) {
    if (!o || typeof o !== "object" || t) return;
    if (o.continuationCommand && typeof o.continuationCommand.token === "string") t = o.continuationCommand.token;
    for (const k in o) walk(o[k]);
  })(d);
  return t;
}

/* kanalın TÜM yüklemelerini sayfalayarak topla */
async function channelUploads(channelId) {
  const base = "https://www.youtube.com/channel/" + channelId + "/videos";
  const html = await getText(base);
  const d = extractJson(html, "ytInitialData");
  const mKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const apiKey = mKey ? mKey[1] : null;
  if (!d) return { ids: [], note: "ytInitialData yok" };
  const ids = videoIds(d);
  let cont = contToken(d);
  let pages = 1;
  while (cont && apiKey && pages < 12) {
    const r = await fetch("https://www.youtube.com/youtubei/v1/browse?key=" + apiKey + "&prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9" },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "tr", gl: "TR" } },
        continuation: cont
      })
    });
    if (!r.ok) break;
    const j = await r.json();
    const more = videoIds(j);
    more.forEach((v) => { if (!ids.includes(v)) ids.push(v); });
    const next = contToken(j);
    if (!next || next === cont) break;
    cont = next; pages++;
    await sleep(700);
  }
  return { ids, note: "sayfa " + pages };
}

/* oembed: hem başlık hem GÖMÜLEBİLİRLİK doğrulaması */
async function oembed(vid) {
  const j = await getText("https://www.youtube.com/oembed?url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + vid) + "&format=json", true);
  if (!j) return null;
  return { id: vid, title: j.title || "", ch: j.author_name || "" };
}

/* kanal adaylarını listele */
async function findChannels(q) {
  const html = await getText("https://www.youtube.com/results?search_query=" + encodeURIComponent(q));
  const d = extractJson(html, "ytInitialData");
  if (!d) return [];
  const list = [];
  (function walk(o) {
    if (!o || typeof o !== "object") return;
    if (o.channelRenderer && o.channelRenderer.channelId) {
      list.push({ id: o.channelRenderer.channelId, name: (o.channelRenderer.title && o.channelRenderer.title.simpleText) || "" });
    }
    for (const k in o) walk(o[k]);
  })(d);
  return list;
}

/* ---------------- ana akış ---------------- */
(async () => {
  if (FIND) {
    console.log('Aday kanallar: "' + FIND + '"');
    const list = await findChannels(FIND);
    list.slice(0, 20).forEach((c) => console.log("   ", c.id, "|", c.name));
    return;
  }

  const SONGS = loadData("js/data/real-songs.js", "REAL_SONGS");
  const YT = loadData("js/data/real-youtube.js", "REAL_YT");
  /* DİKKAT: artists.js `window.K.ARTISTS` yazar, `window.ARTISTS` DEĞİL.
     (Eskiden `{ARTISTS: []}` verilip `K.ARTISTS` okunuyordu → sözlük BOŞ
     kalıyordu ve "Wegh - Tuzak" gibi başlıklar gereksiz reddediliyordu.) */
  const artists = loadData("js/data/artists.js", "ARTISTS") || [];
  const allowed = artistTokens({ ARTISTS: artists });
  console.log("sanatçı sözlüğü: " + allowed.size + " kelime (" + artists.length + " sanatçı)");

  const sligs = ONLY ? [ONLY] : Object.keys(CHANNELS);
  let totalAdded = 0;

  for (const slug of sligs) {
    const chans = CHANNELS[slug];
    if (!chans) { console.log("⏭  " + slug + ": kayıtlı yetkili kanal yok (CHANNELS haritasına ekle)"); continue; }
    const songs = (SONGS[slug] || []).map((s) => s.title);
    const have = YT[slug] || {};
    console.log("\n" + "=".repeat(66));
    console.log(`${slug} — ${songs.length} şarkı · mevcut ${Object.keys(have).length} kayıt`);
    console.log("=".repeat(66));

    /* 1) yetkili kanallardan tüm videoId'ler */
    const vids = [];
    for (const ch of chans) {
      const r = await channelUploads(ch.id);
      console.log(`  [${ch.name}] ${r.ids.length} video (${r.note})`);
      r.ids.forEach((v) => { if (!vids.includes(v)) vids.push(v); });
      await sleep(900);
    }

    /* 2) oembed ile başlık + gömülebilirlik */
    const vidsInfo = [];
    for (const v of vids) {
      const o = await oembed(v);
      if (o) vidsInfo.push(o);
      await sleep(200);
    }
    console.log(`  oembed doğrulanan: ${vidsInfo.length}/${vids.length}`);

    /* 3) eşleştirme — şarkı bazında en iyi (en AZ fazladan kelimeli) video */
    const raw = [];
    songs.forEach((title) => {
      if (have[title]) return;
      let best = null, bestExtra = Infinity;
      vidsInfo.forEach((v) => {
        if (!matchTitle(v.title, title, allowed)) return;
        const extra = norm(v.title).split(" ").length - norm(title).split(" ").length;
        if (extra < bestExtra) { best = v; bestExtra = extra; }
      });
      if (best) raw.push({ title, v: best });
    });

    /* ÇAKIŞMA ÇÖZÜMÜ — aynı video birden çok şarkıya bağlanamaz.
       (ör. "Karma" ve "Karma (Groovypedia Live)" ikisi de norm'da
       "karma" olur.) Kaba (loose) token örtüşmesi en yüksek olan
       şarkı videoyu alır; diğerleri atlanır ve raporlanır. */
    const loose = (s) => String(s || "").toLowerCase()
      .replace(/[^a-z0-9çğıöşü]+/g, " ").replace(/\s+/g, " ").trim();
    const byVideo = {};
    raw.forEach((p) => { (byVideo[p.v.id] = byVideo[p.v.id] || []).push(p); });
    const proposed = [];
    const conflicts = [];
    Object.keys(byVideo).forEach((vid) => {
      const group = byVideo[vid];
      if (group.length === 1) { proposed.push(group[0]); return; }
      const vt = new Set(loose(group[0].v.title).split(" "));
      /* KESİNLİK (precision) = ortak kelime / şarkı kelime sayısı.
         Sadece "ortak kelime" saymak yanıltıcıydı: "Prenses [Remix]"
         (2 kelime, 1 ortak) ile "Prenses" (1 kelime, 1 ortak) eşit
         görünüp ÖZGÜN şarkının videosu yanlışlıkla remix'e bağlanıyordu.
         Kesinlik bunu çözer: 1/1=1.0 > 1/2=0.5 → özgün ad kazanır. */
      const scored = group.map((p) => {
        const st = loose(p.title).split(" ");
        const score = st.filter((w) => vt.has(w)).length;
        return { p, precision: st.length ? score / st.length : 0, n: st.length, exact: loose(p.title) === loose(p.v.title) };
      }).sort((a, b) => (b.exact - a.exact) || (b.precision - a.precision) || (a.n - b.n));
      proposed.push(scored[0].p);
      scored.slice(1).forEach((s) => conflicts.push({ title: s.p.title, vid, winner: scored[0].p.title }));
    });

    console.log("\n  EŞLEŞEN (" + proposed.length + "):");
    proposed.forEach((p) => console.log(`    + ${p.title.slice(0, 34).padEnd(36)} → ${p.v.id} | ${p.v.title.slice(0, 44)}`));
    if (conflicts.length) {
      console.log(`\n  ⚠ AYNI VİDEO ÇAKIŞMASI (${conflicts.length}) — daha zayıf ad atlandı:`);
      conflicts.forEach((c) => console.log(`    – ${c.title.slice(0, 36).padEnd(38)} (video ${c.vid} → ${c.winner.slice(0, 30)})`));
    }
    const unmatched = songs.filter((t) => !have[t] && !proposed.some((p) => p.title === t));
    console.log(`\n  EŞLEŞMEYEN (${unmatched.length}): ${unmatched.slice(0, 12).join(" · ")}${unmatched.length > 12 ? " …" : ""}`);

    if (proposed.length && !DRY) {
      YT[slug] = YT[slug] || {};
      proposed.forEach((p) => {
        YT[slug][p.title] = { a: p.v.ch, t: p.v.title, v: p.v.id };
      });
      totalAdded += proposed.length;
      console.log(`\n  ✅ ${slug}: +${proposed.length} kayıt eklendi (toplam ${Object.keys(YT[slug]).length})`);
    } else if (proposed.length) {
      console.log("\n  (--dry: yazılmadı)");
    }
  }

  if (!DRY && totalAdded) {
    writeData("js/data/real-youtube.js", "REAL_YT", YT,
      `/* ============================================================\n   KARMA — data/real-youtube.js  (OTOMATİK ÜRETİLDİ)\n   Gerçek şarkılar için GÖMÜLEBİLİR YouTube video kimlikleri.\n   v = videoId · t = video başlığı · a = kanal\n   Doğrulama: youtube.com/oembed (gömme kapalı videolar elendi)\n   Üretici: node tools/fetch-youtube.js   ·   Güncelleme: ${new Date().toISOString().slice(0, 10)}\n   ============================================================ */\n(function (K) {\n  "use strict";\n  K.REAL_YT = `);
    console.log("\n✅ js/data/real-youtube.js yazıldı · toplam eklenen: " + totalAdded);
  } else {
    console.log("\n(hiçbir dosya değişmedi)");
  }
})().catch((e) => { console.error("HATA: " + (e && e.message ? e.message : e)); process.exit(1); });
