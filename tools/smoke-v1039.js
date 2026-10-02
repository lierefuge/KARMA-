/* Kullanım: node tools/smoke-v1039.js
   KARMA — v10.39 Stüdyo: parça adımı + parça başına sözler.

   F) FORMAT       : 1 → Single · 2-8 → EP · 9+ → Albüm, tavan 30
   S) YÜKLEME      : dosya yükleme adımı TAMAMEN kaldırıldı
   P) PARÇA        : ad tekilleştirme, parça başına süre
   L) SÖZ          : her parçanın kendi sözü ve kendi skoru
   M) GERİYE UYUM  : eski tek-söz seti ilk parçaya taşınır
   R) YAYIN        : createRelease parça başına sözü taşır

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

const { dom, errors } = H.bootDom(html, { seed: 20261039 });

H.whenReady(dom, {
  label: "v10.39 stüdyo parça adımı hazır",
  ready: (K) => !!(K && K.careerUI && K.career && K.career.MAX_TRACKS === 30)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const U = K.util;
  const doc = dom.window.document;
  const SEC = K.LYRIC_SECTIONS.length;

  const clickAct = (act, arg) => {
    const sel = arg != null ? `[data-act="${act}"][data-arg="${arg}"]` : `[data-act="${act}"]`;
    const el = doc.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  };
  const openStudio = (count) => {
    K.state = K.newGame();
    K.state.player.stageName = "Şehinşah";
    K.state.balance = 9000000;
    doc.querySelectorAll("#modal-root").forEach(m => { m.innerHTML = ""; });
    const t = doc.getElementById("toast-stack"); if (t) t.innerHTML = "";
    K.careerUI.openStudioModal({ topic: null });
    const st = K.careerUI._studio;
    if (count) { st.count = count; K.careerUI._syncTracks(st); }
    K.careerUI.renderStudioStep();
    return st;
  };

  /* =========================================================
     F) FORMAT KURALI — 1 Single · 2-8 EP · 9+ Albüm
     ========================================================= */
  ok("F-1 · parça tavanı 30", K.career.MAX_TRACKS === 30, K.career.MAX_TRACKS);
  ok("F-2 · 1 → single", K.career.typeForCount(1) === "single", K.career.typeForCount(1));
  [2, 3, 5, 8].forEach(n => ok("F-3 · " + n + " → ep", K.career.typeForCount(n) === "ep", K.career.typeForCount(n)));
  [9, 12, 20, 30].forEach(n => ok("F-4 · " + n + " → album", K.career.typeForCount(n) === "album", K.career.typeForCount(n)));
  ok("F-5 · 99 tavana kırpılır → album", K.career.typeForCount(99) === "album", K.career.typeForCount(99));
  ok("F-5 · 0 ve negatif → single", K.career.typeForCount(0) === "single" && K.career.typeForCount(-5) === "single");
  ok("F-6 · kural metni yeni aralığı yazıyor",
    /2-8 → EP/.test(K.career.formatRule()) && /9\+ → Albüm/.test(K.career.formatRule()), K.career.formatRule());
  ok("F-7 · eski alt türler artık ÜRETİLMİYOR",
    !["double", "mixtape", "deluxe"].some(t => [1, 2, 5, 9, 14, 30].some(n => K.career.typeForCount(n) === t)));
  ok("F-8 · format etiketi parça sayısını yazar", /\(3 parça\)/.test(K.career.formatLabel(3)), K.career.formatLabel(3));
  {
    /* tip kartları kurala birebir uymalı: Single/EP/Albüm ve doğru aralıklar */
    const s0 = openStudio(1);
    const noteOf = () => Array.from(doc.querySelectorAll("#st-type-cards .type-card span")).map(e => e.textContent).join("|");
    const activeOf = () => (doc.querySelector("#st-type-cards .type-card.active b") || {}).textContent;
    ok("F-9 · üç kart: Single / EP / Albüm",
      Array.from(doc.querySelectorAll("#st-type-cards .type-card b")).map(e => e.textContent).join(",") === "Single,EP,Albüm");
    ok("F-9 · aralıklar 1 parça · 2–8 parça · 9+ parça", noteOf() === "1 parça|2–8 parça|9+ parça", noteOf());
    ok("F-9 · 1 parçada Single aktif", activeOf() === "Single", activeOf());
    s0.count = 5; K.careerUI._syncTracks(s0); K.careerUI.renderTypeCards();
    ok("F-9 · 5 parçada EP aktif", activeOf() === "EP", activeOf());
    s0.count = 12; K.careerUI._syncTracks(s0); K.careerUI.renderTypeCards();
    ok("F-9 · 12 parçada Albüm aktif", activeOf() === "Albüm", activeOf());
    ok("F-9 · kart tıklaması sayıyı ayarlıyor",
      (() => { const b = doc.querySelector('#st-type-cards [data-act="st-type"][data-arg="12"]');
        if (!b) return false; b.click(); return s0.count === 12; })());
  }

  /* =========================================================
     S) YÜKLEME ADIMI KALDIRILDI
     ========================================================= */
  const st = openStudio(5);
  ok("S-1 · _runUpload kaldırıldı", typeof K.careerUI._runUpload === "undefined");
  ok("S-1 · _runUploadMany kaldırıldı", typeof K.careerUI._runUploadMany === "undefined");
  ok("S-2 · 'Tümünü Yükle' düğmesi yok", !doc.querySelector('[data-act="trk-upload-all"]'));
  ok("S-2 · parça başına yükle düğmesi yok", !doc.querySelector('[data-act="trk-upload"]'));
  ok("S-3 · ilerleme çubuğu yok", !doc.querySelector("[data-upbar]"));
  ok("S-4 · parça durumunda 'uploaded' alanı yok",
    st.tracks.every(t => t.uploaded === undefined), JSON.stringify(st.tracks.map(t => t.uploaded)));
  ok("S-5 · kayıt kaynağı seçimi parça satırında duruyor", doc.querySelectorAll("[data-src]").length === 5,
    doc.querySelectorAll("[data-src]").length + " adet");
  ok("S-6 · bilgi satırı toplam süreyi yazıyor", /^\d+ parça · \d+:\d\d toplam$/.test(K.careerUI.tracksInfoText(st)),
    K.careerUI.tracksInfoText(st));
  ok("S-7 · ad girilince İleri'yi yükleme engellemiyor",
    (() => {
      st.tracks.forEach(t => { if (!t.name) t.name = "Parça"; });
      return K.careerUI.validateStep(1) === true;
    })());
  ok("S-7 · adsız İleri'yi engelliyor",
    (() => { const b = st.tracks.map(t => t.name); st.tracks.forEach(t => { t.name = ""; });
      const r = K.careerUI.validateStep(1); st.tracks.forEach((t, i) => { t.name = b[i]; }); return r === false; })());

  /* =========================================================
     P) PARÇA ADI + SÜRE
     ========================================================= */
  {
    let broken = 0;
    const samples = [];
    for (let i = 0; i < 200; i++) {
      const t = K.career.suggestTitle();
      /* iki Türkçe kelime bitişik gelirse (ör. "SisliSonu") boşluk kayıp demektir */
      if (/[a-zçğıöşü][A-ZÇĞİÖŞÜ]/.test(t)) { broken++; if (samples.length < 4) samples.push(t); }
    }
    ok("P-1 · şarkı adlarında birleşme yok", broken === 0, broken + "/200" + (samples.length ? " → " + samples.join(", ") : ""));
  }
  {
    let dupRuns = 0;
    for (let r = 0; r < 30; r++) {
      const s2 = openStudio(10);
      const names = s2.tracks.map(t => (t.name || "").trim());
      if (new Set(names).size !== names.length) dupRuns++;
    }
    ok("P-2 · sayı artırılınca isim çakışması yok", dupRuns === 0, dupRuns + "/30 tur");
  }
  {
    const s3 = openStudio(8);
    const durs = s3.tracks.map(t => t.dur);
    ok("P-3 · her parçanın kendi süresi var", new Set(durs).size === durs.length, durs.join(" · "));
    ok("P-4 · süre biçimi M:SS", durs.every(d => /^\d+:\d\d$/.test(d)), durs[0]);
    ok("P-4 · süreler makul (2:00–6:00)",
      s3.tracks.every(t => { const m = +t.dur.split(":")[0]; return m >= 2 && m <= 6; }), durs.join(" · "));
  }

  /* =========================================================
     L) PARÇA BAŞINA SÖZLER
     ========================================================= */
  {
    const s = openStudio(6);
    ok("L-1 · her parça kendi söz nesnesine sahip",
      s.tracks.every(t => t.lyrics && typeof t.lyrics === "object"));
    ok("L-1 · söz nesneleri birbirinden AYRI referans",
      new Set(s.tracks.map(t => t.lyrics)).size === 6);
    ok("L-1 · boş söz 0 bölüm sayılır",
      s.tracks.every(t => K.careerUI.lyricsFilled(t.lyrics) === 0));

    /* otomatik doldur — sadece 1. parça dolu, kalan 5 boş */
    K.careerUI.suggestInto(K.careerUI.trackLyrics(s, 0), s.lyricsTheme);
    const firstBefore = JSON.stringify(s.tracks[0].lyrics);
    ok("L-2 · seçili parça tek tuşla doldu", K.careerUI.lyricsFilled(s.tracks[0].lyrics) === SEC);

    s.step = 3; K.careerUI.renderStudioStep();
    ok("L-4 · 'Kalanları Otomatik Doldur' düğmesi var", clickAct("lyr-fill-rest"));
    ok("L-4 · dolu parça EZİLMEDİ", JSON.stringify(s.tracks[0].lyrics) === firstBefore);
    ok("L-4 · kalan 5 parça dolduruldu",
      s.tracks.slice(1).every(t => K.careerUI.lyricsFilled(t.lyrics) === SEC));
    ok("L-2 · her parçanın söz metni FARKLI",
      new Set(s.tracks.map(t => JSON.stringify(t.lyrics))).size === 6);

    /* skorlar parça başına değişebiliyor: 3. parçayı bozalım */
    const sScores = s.tracks.map((t, i) => K.careerUI.analyzeTrack(s, i).score);
    ok("L-3 · tüm parçalar yüksek skorlu (otomatik söz)", sScores.every(x => x >= 80), sScores.join(", "));
    s.tracks[2].lyrics = K.careerUI.emptyLyrics();
    s.tracks[2].lyrics.verse = "gece";
    ok("L-3 · kötü söz o parçanın skorunu düşürüyor",
      K.careerUI.analyzeTrack(s, 2).score < sScores[2],
      K.careerUI.analyzeTrack(s, 2).score + " < " + sScores[2]);
    ok("L-3 · diğer parçaların skoru DEĞİŞMEDİ",
      [0, 1, 3, 4, 5].every(i => K.careerUI.analyzeTrack(s, i).score === sScores[i]));
  }
  {
    /* parça seçici + tümüne uygula + temizle */
    const s = openStudio(4);
    s.step = 3; K.careerUI.renderStudioStep();
    ok("L-7 · parça seçici çipleri çizildi", doc.querySelectorAll(".lyr-track").length === 4,
      doc.querySelectorAll(".lyr-track").length + " çip");
    ok("L-7 · ilk parça varsayılan seçili", doc.querySelector(".lyr-track.active") &&
      doc.querySelector(".lyr-track.active").dataset.arg === "0");

    K.careerUI.suggestInto(K.careerUI.trackLyrics(s, 0), s.lyricsTheme);
    const src = JSON.stringify(s.tracks[0].lyrics);
    clickAct("lyr-apply-all");
    ok("L-5 · 'tümüne uygula' bütün parçalara kopyaladı",
      s.tracks.every(t => JSON.stringify(t.lyrics) === src));

    clickAct("lyr-track", "2");
    ok("L-7 · çipe tıklayınca seçim değişti", s.lyrTrack === 2);
    clickAct("lyr-clear");
    ok("L-6 · 'temizle' SADECE seçili parçayı sildi",
      K.careerUI.lyricsFilled(s.tracks[2].lyrics) === 0 &&
      K.careerUI.lyricsFilled(s.tracks[0].lyrics) === SEC &&
      K.careerUI.lyricsFilled(s.tracks[1].lyrics) === SEC);
  }
  {
    /* İleri kontrolü: sözü boş parça varken geçit yok */
    const s = openStudio(3);
    K.careerUI.suggestInto(K.careerUI.trackLyrics(s, 0), s.lyricsTheme);
    K.careerUI.suggestInto(K.careerUI.trackLyrics(s, 1), s.lyricsTheme);
    ok("L-8 · bir parçanın sözü boşken İleri engellenir", K.careerUI.validateStep(3) === false);
    K.careerUI.suggestInto(K.careerUI.trackLyrics(s, 2), s.lyricsTheme);
    ok("L-8 · hepsi doluyken İleri geçer", K.careerUI.validateStep(3) === true);
  }
  {
    /* kenar çubuğu özeti */
    const s = openStudio(4);
    K.careerUI.suggestInto(K.careerUI.trackLyrics(s, 0), s.lyricsTheme);
    s.step = 3; K.careerUI.renderStudioStep();
    const sub = Array.from(doc.querySelectorAll(".side-step .ss-body span")).map(e => e.textContent).join(" | ");
    ok("L-9 · kenar çubuğu 'X/Y parçanın sözü tam' yazıyor", /1\/4 parçanın sözü tam/.test(sub), sub.slice(0, 160));
  }

  /* =========================================================
     M) GERİYE UYUM — eski tek-söz seti ilk parçaya taşınır
     ========================================================= */
  {
    const s = openStudio(3);
    const legacy = { intro: "eski giriş", verse: "eski verse", hook: "eski hook", chorus: "", bridge: "", outro: "" };
    s.tracks.forEach(t => { delete t.lyrics; });
    s.lyricSections = legacy;
    delete s._lyrMigrated;
    K.careerUI._syncTracks(s);
    ok("M-1 · eski lyricSections ilk parçaya taşındı",
      s.tracks[0].lyrics && s.tracks[0].lyrics.verse === "eski verse", JSON.stringify(s.tracks[0].lyrics || {}).slice(0, 90));
    ok("M-1 · diğer parçalar eski sözü ALMADI",
      s.tracks.slice(1).every(t => K.careerUI.lyricsFilled(t.lyrics) === 0));
    ok("M-1 · geçici alan temizlendi", s.lyricSections === undefined);
  }

  /* =========================================================
     R) YAYIN — parça başına sözler yayına taşınıyor
     ========================================================= */
  {
    const s = openStudio(9);
    s.tracks.forEach((t, i) => K.careerUI.suggestInto(K.careerUI.trackLyrics(s, i), s.lyricsTheme));
    /* 4. parçayı bozalım → o parçanın skoru düşmeli, diğerleri yüksek kalmalı */
    s.tracks[3].lyrics = K.careerUI.emptyLyrics();
    s.tracks[3].lyrics.verse = "gece";
    s.step = 6; K.careerUI.renderStudioStep();

    let rel = null, err = null;
    try { rel = K.career.createRelease({
      title: "Test Albümü", genre: s.genre, type: K.career.typeForCount(9), kind: s.kind,
      beatId: s.beatId, vocalId: s.vocalId, beatQuality: s.beatQ, vocalQuality: s.vocalQ, mixQuality: s.mixQ,
      waitDays: s.wait, budget: s.budget, marketing: s.marketing,
      lyricsTheme: s.lyricsTheme,
      trackLyrics: s.tracks.map((t, i) => K.careerUI.trackLyrics(s, i)),
      trackCount: 9, trackBudgets: s.tracks.map(t => t.budget),
      tracks: s.tracks.map(t => ({ name: t.name, budget: t.budget, source: t.source }))
    }); } catch (e) { err = e; }
    ok("R-1 · 9 parçalı yayın oluştu", !err && !!rel, err ? String(err.message) : "");
    if (rel) {
      ok("R-1 · tür = album", rel.type === "album", rel.type);
      ok("R-1 · 9 parça", rel.tracks.length === 9, rel.tracks.length);
      ok("R-2 · her parçanın KENDİ söz skoru var",
        rel.tracks.every(t => t.lyrics && typeof t.lyrics.score === "number"));
      ok("R-2 · bozuk 4. parça düşük skorlu",
        rel.tracks[3].lyrics.score < rel.tracks[0].lyrics.score,
        rel.tracks[3].lyrics.score + " < " + rel.tracks[0].lyrics.score);
      ok("R-2 · söz metinleri parça başına farklı",
        new Set(rel.tracks.map(t => JSON.stringify(t.lyrics.sections))).size >= 8);
      ok("R-2 · yayın skoru parçaların ortalaması",
        rel.lyrics.score === Math.round(rel.tracks.reduce((a, t) => a + t.lyrics.score, 0) / 9),
        rel.lyrics.score + " ≈ " + Math.round(rel.tracks.reduce((a, t) => a + t.lyrics.score, 0) / 9));
      ok("R-2 · perTrack özeti yayında var", Array.isArray(rel.lyrics.perTrack) && rel.lyrics.perTrack.length === 9);
    }
  }
  {
    /* geriye uyum: eski çağrı biçimi (tek lyricSections) hâlâ çalışıyor */
    const s = openStudio(3);
    let err = null, rel = null;
    try { rel = K.career.createRelease({
      title: "Eski Biçim", genre: s.genre, type: "ep", kind: s.kind,
      beatId: s.beatId, vocalId: s.vocalId, beatQuality: s.beatQ, vocalQuality: s.vocalQ, mixQuality: s.mixQ,
      waitDays: s.wait, budget: s.budget, marketing: s.marketing, lyricsTheme: s.lyricsTheme,
      lyricSections: { intro: "", verse: "eski söz burada", hook: "", chorus: "", bridge: "", outro: "" },
      trackCount: 3, trackBudgets: s.tracks.map(t => t.budget),
      tracks: s.tracks.map(t => ({ name: t.name, budget: t.budget, source: t.source }))
    }); } catch (e) { err = e; }
    ok("R-3 · eski 'lyricSections' çağrısı hâlâ çalışıyor", !err && !!rel, err ? String(err.message) : "");
    if (rel) ok("R-3 · eski söz tüm parçalara uygulandı",
      rel.tracks.every(t => (t.lyrics.sections.verse || "") === "eski söz burada"));
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.39 STÜDYO PARÇA ADIMI + PARÇA BAŞINA SÖZLER");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ PARÇA ADIMI TEMİZ · SÖZLER PARÇA BAŞINA");
  else process.exitCode = 1;
}
