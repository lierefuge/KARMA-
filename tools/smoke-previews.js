/* Kullanım: node tools/smoke-previews.js
   KARMA — GERÇEK ÖNİZLEME VERİSİ + SÜZGEÇ testi (v10.25)

   Neden?
   ------
   Issue #2'deki **P-2** maddesi ("real-previews.js filtrelenmiyor") bu
   süitle kapatılır. İki ayrı iş yapılır ve ikisi de KALICI olarak kilitlenir:

     1) VERİ DEĞİŞMEZİ — "filtrelenecek kayıt yok" iddiası artık makine
        tarafından denetlenir. v10.17 README'sindeki dürüst not ("497 kaydın
        tamamı kullanımda, boş URL yok") tek seferlik bir ölçümdü; veri
        yeniden üretilirken (tools/fetch-artist-discography.js) sessizce
        bozulabilirdi. Artık bozulursa test kırmızı olur.

     2) SÜZGEÇ — `preview.js` kaydı olduğu gibi döndürüyordu ve çağıran
        taraf oynatılabilirliği denetlemiyordu. `p` (30 sn ses) eksik/bozuk
        bir kayıtta `has()` yanlışlıkla true dönüyor, `play()` ise
        `audio.src = undefined` yazıyordu. Filtre eklendi; bu süit onu kilitler.

   A) VERİ     : kapsam, geçerli ses/sayfa URL'i, boş kayıt yok
   B) TUTARLILIK: her önizlemenin real-songs karşılığı var mı (boşa düşen yok),
                  kapsam tabanı (>=%98) ve önizlemesiz şarkının ZARİF düşmesi
   C) SÜZGEÇ   : oynatılabilirlik denetimi (has/isPlayable/isUsable) doğru mu
   D) BAĞLANTI : geçersiz `a` bozuk bağlantıya dönüşmüyor, arama linkine düşüyor
   E) GÜVENLİK : eksik/bozuk veriyle çökmüyor, "undefined" üretmiyor

   Not: tek dosyalık KARMA-Oyun.html üzerinden test edilir;
   önce `node tools/build-single.js` çalıştırılmalı.
*/
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const ROOT = path.resolve(__dirname, "..");

const FILE = path.join(ROOT, "KARMA-Oyun.html");
if (!fs.existsSync(FILE)) { console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js"); process.exit(1); }
const html = fs.readFileSync(FILE, "utf8");

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));

/* gerçek veri tembel katmandan gelir → HAZIR OLMA KOŞULU beklenir (B-7) */
const { dom, errors } = H.bootDom(html, { seed: 20261025 });

H.whenReady(dom, {
  label: "real-previews tembel verisi hazır",
  ready: (K) => K.lazy && K.lazy.loaded("real-previews") && K.lazy.loaded("real-songs")
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const P = K.REAL_PREVIEWS || {};
  const S = K.REAL_SONGS || {};

  const isAudio = (u) => typeof u === "string" && (/^https?:\/\//i.test(u.trim()) || /^data:audio\//i.test(u.trim()));
  const isPage = (u) => typeof u === "string" && /^https?:\/\//i.test(u.trim());

  /* =========================================================
     A) VERİ DEĞİŞMEZİ — P-2'nin asıl kilidi
     ========================================================= */
  const artistKeys = Object.keys(P);
  let total = 0, badP = 0, badA = 0, notObject = 0, emptyEntry = 0;
  const badSamples = [];

  artistKeys.forEach((k) => {
    const block = P[k];
    if (!block || typeof block !== "object" || Array.isArray(block)) { notObject++; return; }
    Object.keys(block).forEach((title) => {
      total++;
      const e = block[title];
      if (!e || typeof e !== "object") { emptyEntry++; return; }
      if (!isAudio(e.p)) { badP++; if (badSamples.length < 5) badSamples.push(k + " :: " + title + " (p=" + String(e.p).slice(0, 40) + ")"); }
      if (!isPage(e.a)) badA++;
      const keys = Object.keys(e);
      if (!keys.length) emptyEntry++;
    });
  });

  ok("A · önizleme kaydı var (>=400)", total >= 400, total + " kayıt");
  ok("A · tüm sanatçı blokları nesne", notObject === 0, notObject + " bozuk blok");
  ok("A · boş kayıt yok", emptyEntry === 0, emptyEntry + " boş kayıt");
  ok("A · HER kayıtta geçerli 30 sn ses URL'i (p)", badP === 0,
    badP ? badP + " eksik/bozuk · ör: " + badSamples[0] : "497/497 benzeri tam kapsam");
  ok("A · HER kayıtta geçerli Apple Music URL'i (a)", badA === 0, badA + " eksik/bozuk");
  ok("A · kayıt başına 1–3 alan (şişme yok)", (() => {
    let bad = 0;
    artistKeys.forEach((k) => Object.keys(P[k]).forEach((t) => {
      const ks = Object.keys(P[k][t]);
      if (ks.length < 1 || ks.length > 3) bad++;
    }));
    return bad === 0;
  })());

  /* =========================================================
     B) TUTARLILIK — boşa düşen önizleme yok
     ========================================================= */
  {
    let dangling = 0, danglingArtist = 0;
    const samples = [];
    artistKeys.forEach((k) => {
      const titles = new Set((S[k] || []).map((s) => s.title));
      Object.keys(P[k]).forEach((t) => {
        if (!titles.has(t)) { dangling++; if (samples.length < 5) samples.push(k + " :: " + t); }
      });
    });
    /* real-songs'ta hiç kaydı olmayan sanatçı bloğu da boşa düşer */
    artistKeys.forEach((k) => { if (!(S[k] || []).length) danglingArtist++; });
    ok("B · her önizlemenin real-songs karşılığı var (boşa düşen yok)", dangling === 0,
      dangling ? dangling + " boşa düşen · ör: " + samples[0] : artistKeys.length + " sanatçı temiz");
    ok("B · real-songs'ta karşılıksız sanatçı bloğu yok", danglingArtist === 0, danglingArtist + " blok");
    /* Ters yön — ölçülen gerçek durum (dürüst kayıt):
       504 gerçek şarkının 497'sinde önizleme VAR, 5'inde YOK.
       Bu bir hata değil: iTunes her kayıt için 30 sn önizleme vermiyor
       ve önizlemesi olmayan şarkıda `audio.js` ZARİF biçimde sentezlenmiş
       döngüye düşer (bkz. audio.js `K.audio.play`). Burada amaç kapsamı
       "tam" iddia etmek değil, sessiz bir ÇÖKÜŞÜ (ör. veri üreticisi
       önizlemeleri topluca kaybederse) yakalamaktır. */
    let uncovered = 0, uncoveredSample = "";
    const missing = [];
    Object.keys(S).forEach((k) => {
      (S[k] || []).forEach((s) => {
        if (!(P[k] && P[k][s.title])) {
          uncovered++;
          missing.push({ id: k, title: s.title });
          if (!uncoveredSample) uncoveredSample = k + " :: " + s.title;
        }
      });
    });
    const songTotal = Object.values(S).reduce((a, b) => a + b.length, 0);
    const coverage = songTotal ? (songTotal - uncovered) / songTotal : 0;
    ok("B · önizleme kapsamı >= %98 (toplu kayıp yok)", coverage >= 0.98,
      "%" + (coverage * 100).toFixed(1) + " (" + uncovered + " eksik: " + uncoveredSample + ")");
    ok("B · önizlemesiz şarkı sayısı sınırlı (<=15)", uncovered <= 15, uncovered + " şarkı");

    /* ÖNİZLEMESİZ şarkılar ZARİF düşmeli: has() false + play() çökmemeli.
       (Yedek: sentezlenmiş döngü — oyun çalınabilir kalır.) */
    {
      let graceful = true, detail = "";
      missing.forEach((m) => {
        const track = { id: m.id + "_x", artistId: m.id, title: m.title, artistName: "Test" };
        try {
          if (K.preview.has(track) !== false) { graceful = false; if (!detail) detail = m.id + " :: " + m.title + " (has true)"; }
          K.audio.play(track);            // fırlatmamalı; sentez yoluna düşer
        } catch (e) { graceful = false; if (!detail) detail = m.id + " :: " + m.title + " (" + e.message + ")"; }
      });
      ok("B · önizlemesiz şarkılar zarif düşüyor (has false + play çökmüyor)", graceful,
        detail || uncovered + " şarkı sentez yedeğine düştü");
    }
  }

  /* =========================================================
     C) SÜZGEÇ — oynatılabilirlik denetimi
     ========================================================= */
  {
    ok("C · süzgeç API'si dışa açık (isPlayable/isUsable)",
      typeof K.preview.isPlayable === "function" && typeof K.preview.isUsable === "function");

    /* gerçek kayıt: oynatılabilir olmalı */
    const realKey = artistKeys.find((k) => Object.keys(P[k]).length);
    const realTitle = Object.keys(P[realKey])[0];
    const realEntry = P[realKey][realTitle];
    ok("C · gerçek kayıt oynatılabilir", K.preview.isPlayable(realEntry) === true);
    ok("C · gerçek kayıtla has() true",
      K.preview.has({ artistId: realKey, title: realTitle }) === true);

    /* --- enjeksiyon: p'siz / bozuk p'li kayıtlar --- */
    const FAKE = "__p2_test__";
    const cases = {
      "p yok (yalnız a)": { a: "https://music.apple.com/tr/album/x/1" },
      "p boş string": { p: "", a: "https://music.apple.com/tr/album/x/1" },
      "p literal 'undefined'": { p: "undefined", a: "https://music.apple.com/tr/album/x/1" },
      "p null": { p: null, a: "https://music.apple.com/tr/album/x/1" },
      "p kötü şema": { p: "javascript:alert(1)", a: "https://music.apple.com/tr/album/x/1" },
      "boş nesne": {}
    };
    K.REAL_PREVIEWS[FAKE] = {};
    Object.keys(cases).forEach((t) => { K.REAL_PREVIEWS[FAKE][t] = cases[t]; });
    K.preview.resetIndex();          // normalleştirilmiş indeks tazelenir

    Object.keys(cases).forEach((t) => {
      const song = { artistId: FAKE, title: t, artistName: "Test" };
      ok(`C · has() false — ${t}`, K.preview.has(song) === false,
        "has=" + K.preview.has(song));
      ok(`C · isPlayable false — ${t}`, K.preview.isPlayable(cases[t]) === false);
    });

    /* geçerli ses URL'i eklenince oynatılabilir olmalı (aşırı süzme yok) */
    K.REAL_PREVIEWS[FAKE]["p geçerli"] = { p: "https://example.com/a.m4a", a: "https://x.test/y" };
    ok("C · geçerli p varken has() true (aşırı süzme yok)",
      K.preview.has({ artistId: FAKE, title: "p geçerli" }) === true);

    /* isUsable: p yok ama a var → kullanılabilir (bağlantı kaybı olmasın) */
    ok("C · isUsable: p yok + a var → true", K.preview.isUsable(cases["p yok (yalnız a)"]) === true);
    ok("C · isUsable: tamamen boş kayıt → false", K.preview.isUsable(cases["boş nesne"]) === false);

    /* temizlik */
    delete K.REAL_PREVIEWS[FAKE];
    K.preview.resetIndex();
  }

  /* =========================================================
     D) BAĞLANTI — geçersiz `a` bozuk bağlantıya dönüşmesin
     ========================================================= */
  {
    const FAKE = "__p2_link__";
    K.REAL_PREVIEWS[FAKE] = {
      "kötü a": { p: "https://example.com/a.m4a", a: "undefined" },
      "a yok": { p: "https://example.com/b.m4a" }
    };
    K.preview.resetIndex();

    ["kötü a", "a yok"].forEach((t) => {
      const L = K.preview.links({ artistId: FAKE, title: t, artistName: "Test Sanatçı" });
      ok(`D · "${t}" → Apple bağlantısı geçerli (bozuk değil)`,
        isPage(L.apple), String(L.apple).slice(0, 60));
      ok(`D · "${t}" → 'undefined' metni yok`,
        !/undefined|null/.test(L.apple), L.apple);
      ok(`D · "${t}" → YouTube/Spotify arama linkleri var`,
        isPage(L.youtube) && isPage(L.spotify));
    });

    /* geçerli `a` korunmalı */
    K.REAL_PREVIEWS[FAKE]["iyi a"] = { p: "https://example.com/c.m4a", a: "https://music.apple.com/tr/album/iyi/1" };
    const good = K.preview.links({ artistId: FAKE, title: "iyi a", artistName: "Test" });
    ok("D · geçerli Apple linki korunuyor", /music\.apple\.com/.test(good.apple), good.apple);

    delete K.REAL_PREVIEWS[FAKE];
    K.preview.resetIndex();
  }

  /* =========================================================
     E) GÜVENLİK — eksik/bozuk veriyle çökmeme
     ========================================================= */
  {
    const safe = (name, fn) => {
      try { return fn(); } catch (e) { ok(name, false, e.message); return null; }
    };
    ok("E · has(null) çökmüyor", safe("E", () => K.preview.has(null)) === false);
    ok("E · has({}) çökmüyor", safe("E", () => K.preview.has({})) === false);
    ok("E · has başlıksız çökmüyor", safe("E", () => K.preview.has({ artistId: "sehinsah" })) === false);
    ok("E · links(null) çökmüyor", (() => {
      try { const L = K.preview.links(null); return isPage(L.apple) && isPage(L.youtube); }
      catch (e) { return false; }
    })());
    ok("E · isPlayable(null/undefined/string) güvenli",
      K.preview.isPlayable(null) === false &&
      K.preview.isPlayable(undefined) === false &&
      K.preview.isPlayable("abc") === false);
    ok("E · tüm gerçek kayıtlar NaN/undefined içermiyor",
      !/NaN|undefined/.test(JSON.stringify(P)));
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(48));
  console.log("KARMA · GERÇEK ÖNİZLEME + SÜZGEÇ");
  console.log("=".repeat(48));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ ÖNİZLEME VERİSİ + SÜZGEÇ TEMİZ");
  else process.exitCode = 1;
}
