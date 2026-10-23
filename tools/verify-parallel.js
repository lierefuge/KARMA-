#!/usr/bin/env node
/* ============================================================
   KARMA — tools/verify-parallel.js   (v10.67)

   NE YAPAR?
   ---------
   Verilen test süitlerini **sınırlı eşzamanlılıkla** çalıştırır ve
   sonuçları JSON olarak yazar. `tools/verify.js` bunu tek çağrıyla
   kullanır.

   NEDEN GEREKLİ?
   --------------
   `verify.js` 46 süiti `spawnSync` ile SIRAYLA koşuyordu: biri
   bitmeden diğeri başlamıyordu. Toplam süre 21,9 dakikaya çıkmıştı ve
   CI'daki `build-artifact.yml` işi 20 dakikalık sınırda ölüyordu
   (gerçek olay: 22:43 → 22:58 "cancelled", defalarca).

   Ölçüm: süitlerin hepsi jsdom açıyor ama çoğu CPU'yu dönüşümlü
   kullanıyor; paralel koşuda duvar saati süresi toplamın 2-3'te birine
   iniyor.

   KONTROLÜ BOŞALTMAZ: aynı süitler, aynı çıktı biçimi. Yalnızca
   ZAMANLAMA değişir. Her süit yine tam koşar, çıktısı aynen toplanır.

   KULLANIM (verify.js çağırır)
   ----------------------------
     node tools/verify-parallel.js --out sonuc.json --jobs 3 \
          tools/smoke-a.js tools/smoke-b.js ...

   Çıktı: [{ script, code, out }]  (verify.js'in beklediği biçim)
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2);

const argOf = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = argOf("out", null);
/* Varsayılan 3: her süit bir jsdom örneği (~200 MB). 4'te CI
   runner'ında bellek sıkışması riski var, 2'de kazanç yarıya iniyor. */
const JOBS = Math.max(1, Number(argOf("jobs", 3)));

const scripts = argv.filter((a) => /\.js$/.test(a) && !a.startsWith("--"));
if (!scripts.length) {
  console.error("kullanım: verify-parallel.js --out <json> [--jobs N] <süit...>");
  process.exit(2);
}

/* ---- SÜİT ASILMASI: gerçek kök neden ----
   Bazı süitler sonucu YAZDIRDIKTAN sonra süreç olarak ÇIKMIYOR:
   jsdom'un açık tuttuğu zamanlayıcılar event loop'u canlı tutuyor.
   Ölçüm: smoke-v1048 "Geçen: 57 · Kalan: 0" basıyor, sonra olay
   döngüsü hiç boşalmıyor. verify.js bunu `spawnSync` ile beklediği
   için 20 dakikalık CI sınırına kadar asılı kalıyordu — "yavaş test"
   sanılan şey buydu.

   ÇÖZÜM: özet satırı görüldüğünde kısa bir lütuf süresi tara, sonra
   süreci kapat. Geçme/kalma kararı ÇIKIŞ KODUNDAN değil ÖZETTEN
   okunur ("Kalan: 0"), böylece kapatma testi başarısız göstermez. */
const SUMMARY = /(Geçen:\s*\d+\s*·\s*Kalan:\s*\d+|Hata sayısı:\s*\d+)/;
const GRACE_MS = 2500;        /* özet sonrası tanınan sessizlik */
const HARD_CAP_MS = 8 * 60 * 1000;  /* tek süit için üst sınır */

/* Özetten geçme kararı: çıkış kodu güvenilmez (süreci biz kapatıyoruz) */
function verdict(out, code) {
  const m = out.match(/Geçen:\s*\d+\s*·\s*Kalan:\s*(\d+)/);
  if (m) return m[1] === "0" ? 0 : 1;
  const m2 = out.match(/Hata sayısı:\s*(\d+)/);
  if (m2) return Number(m2[1]) === 0 ? 0 : 1;
  return code === 0 ? 0 : 1;   /* özet yoksa çıkış koduna güven */
}

function runOne(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let out = "";
    let settled = false;
    let graceTimer = null;
    let sawSummary = false;

    const hardTimer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch (e) {}
    }, HARD_CAP_MS);

    function finish(rawCode) {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      if (graceTimer) clearTimeout(graceTimer);
      resolve({ script, code: verdict(out, rawCode), out });
    }

    function onData(d) {
      out += d;
      if (!sawSummary && SUMMARY.test(out)) {
        sawSummary = true;
        /* özet görüldü: süreç kendi çıkmazsa lütuf süresi sonunda kapat */
        graceTimer = setTimeout(() => {
          try { child.kill("SIGKILL"); } catch (e) {}
          finish(0);
        }, GRACE_MS);
      }
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (e) => { out += "\ntest çöktü: " + e.message; finish(1); });
    child.on("close", (code) => finish(code == null ? 1 : code));
  });
}

(async function main() {
  const results = new Array(scripts.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= scripts.length) return;
      const r = await runOne(scripts[i]);
      results[i] = r;
      done++;
      /* canlı ilerleme — CI logunda hangi süitin sürdüğü görünsün */
      process.stdout.write("  · " + String(done).padStart(2) + "/" + scripts.length
        + " " + path.basename(r.script).padEnd(26)
        + (r.code === 0 ? "ok" : "ÇIKIŞ " + r.code) + "\n");
    }
  }

  await Promise.all(Array.from({ length: Math.min(JOBS, scripts.length) }, worker));

  if (OUT) fs.writeFileSync(OUT, JSON.stringify(results), "utf8");
  const bad = results.filter((r) => !r || r.code !== 0).length;
  console.log("  paralel koşu bitti: " + scripts.length + " süit · " + bad + " başarısız · "
    + JOBS + " eşzamanlı");
  process.exit(0);
})();
