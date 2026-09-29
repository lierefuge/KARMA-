/* ============================================================
   KARMA — tools/harness.js   (v10.18 · B-7)
   ORTAK TEST ALTYAPISI

   Neden var?
   ----------
   Altı test aracının her biri kendi jsdom kurulumunu, kendi jsdom
   çözümlemesini ve kendi raporlamasını tekrar ediyordu. Dahası
   boot için SABİT SÜRE bekliyorlardı:

       setTimeout(run, 2600);   // "2,6 saniye yeter herhâlde"

   Bu kırılgandır: yüklü bir makinede veya CI'da oyun 2,6 saniyede
   hazır olmazsa test yanlış kırmızı verir; hızlı makinede ise boşuna
   bekler. Doğru ölçüt SÜRE değil, HAZIR OLMA DURUMUDUR.

   Bu modül:
     · jsdom'u bulur (KARMA_JSDOM → yerel → ev dizini)
     · seed'li (deterministik) bir oyun örneği kurar
     · `whenReady()` ile oyunun gerçekten boot olduğunu BEKLER
       (sabit süre yok; üst sınır var)
     · ortak pass/fail raporu üretir

   Kullanım:
     const H = require("./harness.js");
     const { dom } = H.bootDom(html, { seed: 42 });
     H.whenReady(dom).then(K => { ...testler...; H.report("ad"); });
   ============================================================ */
const path = require("path");
const os = require("os");

/* jsdom'u bul: ortam değişkeni → yerel node_modules → ev dizini */
function resolveJsdom() {
  const cands = [
    process.env.KARMA_JSDOM,
    "jsdom",
    path.join(process.env.HOME || os.homedir() || "/home/user", "node_modules", "jsdom")
  ].filter(Boolean);
  for (const c of cands) {
    try { return require(c); } catch (e) {}
  }
  console.error("jsdom bulunamadı. Kur: npm install  (veya KARMA_JSDOM ile yolu ver)");
  process.exit(1);
}

let JSDOM = null, VirtualConsole = null;
function jsdomLibs() {
  if (!JSDOM) { const m = resolveJsdom(); JSDOM = m.JSDOM; VirtualConsole = m.VirtualConsole; }
  return { JSDOM, VirtualConsole };
}

/* deterministik RNG — aynı tohum aynı oyun */
function seededRandom(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------
   bootDom(html, opts)
     html        : test edilecek HTML (tek dosya build metni)
     opts.seed   : sayı → Math.random tohumlanır (determinizm)
     opts.blockLazy : true → requestIdleCallback no-op (tembel veri hiç gelmez)
     opts.onError: (mesaj) => void   (runtime hata toplayıcı)
   Döner: { dom, errors }
   ------------------------------------------------------------------ */
function bootDom(html, opts) {
  const o = opts || {};
  const { JSDOM: J, VirtualConsole: VC } = jsdomLibs();
  const errors = o.errors || [];
  const vc = new VC();
  vc.on("jsdomError", (e) => {
    const m = e.detail ? e.detail.message : e.message;
    /* Google Fonts gibi ağ hataları önemsiz */
    if (!/fonts/i.test(m)) errors.push("jsdomError: " + m);
  });

  const dom = new J(html, {
    url: "https://karma.local/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      /* ağ kapalı: testler çevrimdışı ve deterministik olsun */
      w.fetch = () => Promise.reject(new Error("offline"));
      if (o.seed != null) w.Math.random = seededRandom(o.seed);
      if (o.blockLazy && typeof w.requestIdleCallback === "undefined") {
        w.requestIdleCallback = function () { return 0; };
      } else if (o.blockLazy) {
        w.requestIdleCallback = function () { return 0; };
      }
      w.addEventListener("error", (e) => {
        const s = e.error ? (e.error.stack || e.error.message) : e.message;
        errors.push("onerror: " + s);
      });
      if (typeof o.beforeParse === "function") o.beforeParse(w);
    }
  });
  return { dom, errors };
}

/* ------------------------------------------------------------------
   whenReady(dom, opts) → Promise<K>
   SABİT SÜRE BEKLEMEZ. K.phone + K.career + K.game hazır olana kadar
   kısa aralıklarla yoklar; `timeoutMs` (varsayılan 20 sn) aşılırsa
   reddeder. Böylece yavaş makinede yanlış kırmızı, hızlı makinede
   gereksiz bekleme olmaz.
   ------------------------------------------------------------------ */
function whenReady(dom, opts) {
  const o = opts || {};
  const timeoutMs = o.timeoutMs || 20000;
  const interval = o.interval || 20;
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const K = dom.window && dom.window.K;
      const booted = !!(K && K.phone && K.career && K.game && K.state);
      /* EK KOŞUL: testler veriye ihtiyaç duyuyorsa onu BURADA bildirir.
         Örnek: içerik kontrolü yapan test `ready: K => K.lazy.loaded(...)`
         geçmeli — yoksa boot anında veri henüz gelmemiş olur ve test
         yanlış kırmızı verir (B-7'nin asıl dersi: SÜRE değil, KOŞUL bekle). */
      let extra = true;
      if (booted && typeof o.ready === "function") {
        try { extra = !!o.ready(K); } catch (e) { extra = false; }
      }
      if (booted && extra) return resolve(K);
      if (Date.now() - started > timeoutMs) {
        return reject(new Error(
          (booted ? "ek koşul sağlanmadı" : "oyun boot edilemedi") +
          " (" + timeoutMs + " ms içinde" + (o.label ? ": " + o.label : "") + ")"
        ));
      }
      setTimeout(tick, interval);
    };
    tick();
  });
}

/* bir DURUM gerçekleşene kadar bekle (ör. veri yüklenmesi) */
function until(fn, opts) {
  const o = opts || {};
  const timeoutMs = o.timeoutMs || 8000;
  const interval = o.interval || 20;
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let v = false;
      try { v = fn(); } catch (e) { v = false; }
      if (v) return resolve(v);
      if (Date.now() - started > timeoutMs) return reject(new Error(o.label || "koşul sağlanmadı"));
      setTimeout(tick, interval);
    };
    tick();
  });
}

/* ------------------------------------------------------------------
   Ortak raporlayıcı.
     const r = makeReport("MOBİL KATMAN");
     r.ok("ad", koşul, "ek bilgi");
     r.report();   // → process.exitCode ayarlanır
   ------------------------------------------------------------------ */
function makeReport(title) {
  const pass = [], fail = [];
  let runtime = [];
  return {
    pass, fail,
    setRuntime(list) { runtime = list || []; },
    ok(name, cond, extra) { (cond ? pass : fail).push(name + (extra ? " — " + extra : "")); },
    report() {
      const total = pass.length + fail.length;
      console.log("\n" + "=".repeat(Math.max(24, title.length + 10)));
      console.log(title);
      console.log("=".repeat(Math.max(24, title.length + 10)));
      console.log("Değerlendirilen kontrol: " + total);
      console.log("Geçen: " + pass.length + " · Kalan: " + fail.length +
        (runtime.length ? " · Runtime hata: " + runtime.length : ""));
      if (fail.length) {
        console.log("\n❌ BAŞARISIZ");
        fail.forEach(f => console.log("   · " + f));
      }
      if (runtime.length) {
        console.log("\n⚠️ RUNTIME");
        Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e));
      }
      const clean = !fail.length && !runtime.length;
      if (clean) console.log("\n✅ " + title + " TEMİZ");
      else process.exitCode = 1;
      return clean;
    }
  };
}

module.exports = { resolveJsdom, bootDom, whenReady, until, makeReport, seededRandom };
