/* Kullanım: node tools/smoke-v1040.js
   KARMA — v10.40 Gerçek dağıtım formu: parça seviyesi + metadata + teknik.

   A) PARÇA SEVİYESİ
      A1 sıra (açılış parçası) · A2 parça bazında feat · A3 explicit bayrağı
      A4 ISRC kayıt kodu · A5 örnek hakkı kararı · A6 enstrümantal sürüm
   B) METADATA (gerçek dağıtım formunun zorunlu alanları)
      B1 krediler · B2 telif bölüşümü · B3 bölge · B4 dil · B5 ℗/© yılı
      B6 etiket adı · B7 UPC barkodu
   C) TEKNİK GEREKSİNİMLER
      C1 kapak çözünürlüğü · C2 ses formatı reddi · C3 çıkış günü (cuma)
      C4 YouTube Content ID · C5 takedown / yeniden yükleme

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

const { dom, errors } = H.bootDom(html, { seed: 20261040 });

H.whenReady(dom, {
  label: "v10.40 dağıtım formu hazır",
  ready: (K) => !!(K && K.careerUI && K.career && K.meta && K.meta.COVER_MIN_PX === 1400)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const U = K.util;
  const doc = dom.window.document;

  const openStudio = (count, step) => {
    K.state = K.newGame();
    K.state.player.stageName = "Şehinşah";
    K.state.balance = 9000000;
    doc.querySelectorAll("#modal-root").forEach(m => { m.innerHTML = ""; });
    const t = doc.getElementById("toast-stack"); if (t) t.innerHTML = "";
    K.careerUI.openStudioModal({ topic: null });
    const st = K.careerUI._studio;
    if (count) { st.count = count; K.careerUI._syncTracks(st); }
    if (step) st.step = step;
    K.careerUI.renderStudioStep();
    return st;
  };
  const click = (act, arg) => {
    const sel = arg != null ? `[data-act="${act}"][data-arg="${arg}"]` : `[data-act="${act}"]`;
    const el = doc.querySelector(sel);
    if (el) el.click();
    return !!el;
  };
  const costOf = (extra) => K.career.releaseCost("single", 12000, 3000, Object.assign({
    genre: "rap", beatId: "digital", trackCount: 1,
    trackBudgets: [12000], trackSources: ["ev"]
  }, extra || {}));

  /* ============ VERİ KATMANI ============ */
  ok("M-0 · metadata modülü yüklendi", !!(K.meta && K.meta.isrc && K.meta.upc && K.REGIONS && K.LANGUAGES && K.CREDIT_ROLES));
  ok("M-0 · ISRC biçimi CC-XXX-YY-NNNNN", /^TR-KRM-25-00042$/.test(K.meta.isrc(25, 42)), K.meta.isrc(25, 42));
  const upc = K.meta.upc("rel-1");
  ok("M-0 · UPC 13 hane", /^\d{13}$/.test(upc), upc);
  ok("M-0 · UPC EAN kontrol basamağı gerçek", K.meta.eanCheck(upc.slice(0, 12)) === upc[12], upc);

  /* ============ A) PARÇA SEVİYESİ ============ */
  {
    /* A1 — sıralama */
    const st = openStudio(4);
    const before = st.tracks.map(t => t.name);
    K.careerUI.renderTrackList();
    ok("A1 · taşıma düğmeleri var", !!doc.querySelector('[data-act="trk-move"]'));
    click("trk-move", "2");
    const up = K.careerUI._studio.tracks.map(t => t.name);
    ok("A1 · yukarı taşıma sırayı değiştirir", up[1] === before[2] && up[2] === before[1],
      JSON.stringify(before) + " → " + JSON.stringify(up));
    const el = doc.querySelector('[data-act="trk-move"][data-arg="2"][data-dir="up"]');
    if (el) el.click();
    const down = K.careerUI._studio.tracks.map(t => t.name);
    ok("A1 · aşağı taşıma geri alır", JSON.stringify(down) === JSON.stringify(before), JSON.stringify(down));
    ok("A1 · ilk parçada yukarı kapalı", !!doc.querySelector('[data-act="trk-move"][data-arg="0"][data-dir="up"][disabled]'));
    ok("A1 · son parçada aşağı kapalı",
      !!doc.querySelector('[data-act="trk-move"][data-arg="' + (K.careerUI._studio.tracks.length - 1) + '"][data-dir="down"][disabled]'));
    ok("A1 · açılış parçası işaretli", !!doc.querySelector(".trk-open-tag"));
    ok("A1 · açılış parçası etiketi doğru metin",
      /kalite \+2/.test((doc.querySelector(".trk-open-tag") || {}).textContent || ""));
  }
  {
    /* A2 — parça bazında feat */
    const st = openStudio(3);
    K.careerUI.renderTrackList();
    ok("A2 · her parçada feat seçici", doc.querySelectorAll("[data-feat]").length === 3,
      doc.querySelectorAll("[data-feat]").length + " seçici");
    const target = K.artistList()[0];
    if (target) {
      const oldCan = K.relations.canProposeFeature;
      K.relations.canProposeFeature = (id) => id === target.id;
      K.careerUI.renderTrackList();
      const sel = doc.querySelectorAll("[data-feat]");
      ok("A2 · ilişkili sanatçı listede", sel.length && sel[0].options.length > 1,
        sel.length ? sel[0].options.length + " seçenek" : "seçici yok");
      if (sel.length && sel[0].options.length > 1) {
        sel[0].value = target.id;
        sel[0].dispatchEvent(new dom.window.Event("input", { bubbles: true }));
        ok("A2 · feat parçaya yazıldı", K.careerUI._studio.tracks[0].feat === target.id);
        ok("A2 · diğer parçalar etkilenmedi",
          !K.careerUI._studio.tracks[1].feat && !K.careerUI._studio.tracks[2].feat);
      }
      K.relations.canProposeFeature = oldCan;
    }
    const st2 = openStudio(2);
    st2.feat = "sehinsah";
    st2.tracks.forEach(t => { t.feat = null; });
    K.careerUI._syncTracks(st2);
    ok("A2 · yayın-seviyesi feat tüm parçalara iner",
      st2.tracks.every(t => t.feat === "sehinsah"));
  }
  {
    /* A3 — explicit */
    openStudio(2);
    K.careerUI.renderTrackList();
    ok("A3 · explicit düğmesi var", !!doc.querySelector('[data-act="trk-explicit"]'));
    click("trk-explicit", "0");
    ok("A3 · explicit açılıyor", K.careerUI._studio.tracks[0].explicit === true);
    click("trk-explicit", "0");
    ok("A3 · explicit kapanıyor", K.careerUI._studio.tracks[0].explicit === false);
    ok("A3 · explicitCount sayar",
      K.careerUI.explicitCount({ tracks: [{ explicit: true }, {}, { explicit: true }] }) === 2);
    const eff = K.meta.explicitEffect(true);
    ok("A3 · explicit erişimi düşürür", eff.reach < 1, String(eff.reach));
    ok("A3 · explicit çekirdek kitleyi artırır", eff.core > 1, String(eff.core));
    ok("A3 · explicit editoryal listeyi kısar", eff.playlistPenalty < 1, String(eff.playlistPenalty));
    ok("A3 · explicit kapalıyken nötr", K.meta.explicitEffect(false).reach === 1);
    ok("A3 · diss türü explicit önerir", K.meta.suggestExplicit("street", "diss") === true);
    ok("A3 · sakin tema explicit önermez", K.meta.suggestExplicit("love", "normal") === false);
  }
  {
    /* A5 — örnek hakkı */
    const st = openStudio(1, 2);
    st.beatId = "sample";
    K.careerUI.renderStudioStep();
    ok("A5 · sample beat'te karar bloğu çıkar", !!doc.querySelector('[data-act="st-clear-sample"]'));
    click("st-clear-sample", "1");
    ok("A5 · hak ödeme seçilebiliyor", K.careerUI._studio.clearSample === true);
    click("st-clear-sample", "0");
    ok("A5 · risk seçilebiliyor", K.careerUI._studio.clearSample === false);
    const cClear = costOf({ beatId: "sample", clearSample: true });
    const cRisk = costOf({ beatId: "sample", clearSample: false });
    ok("A5 · hak ödemek pahalı", cClear > cRisk, cClear + " > " + cRisk);
    ok("A5 · fark tam clearance bedeli", cClear - cRisk === K.meta.clearanceCost, String(cClear - cRisk));
    ok("A5 · takedown riski tanımlı", K.meta.SAMPLE_RISK > 0 && K.meta.SAMPLE_TAKEDOWN_DAYS === 30);
  }
  {
    /* A6 — enstrümantal */
    openStudio(1, 2);
    K.careerUI.renderStudioStep();
    ok("A6 · enstrümantal düğmesi var", !!doc.querySelector('[data-act="st-instrumental"]'));
    click("st-instrumental");
    ok("A6 · enstrümantal açılıyor", K.careerUI._studio.instrumental === true);
    ok("A6 · maliyete eklenir",
      costOf({ instrumental: true }) - costOf({}) === K.meta.INSTRUMENTAL_COST,
      String(costOf({ instrumental: true }) - costOf({})));
  }
  {
    /* A4 — ISRC yayına işlenir */
    const st = openStudio(3);
    st.tracks.forEach((t, i) => { t.name = "Parça " + (i + 1); });
    K.careerUI.createReleaseFromStudio();
    const rel = K.state.player.releases[K.state.player.releases.length - 1];
    ok("A4 · parçalar ISRC taşır", !!(rel && rel.tracks[0] && rel.tracks[0].isrc), rel && rel.tracks[0] && rel.tracks[0].isrc);
    ok("A4 · ISRC'ler benzersiz", rel ? new Set(rel.tracks.map(t => t.isrc)).size === rel.tracks.length : false);
    ok("A4 · ISRC biçimi geçerli", rel ? rel.tracks.every(t => /^TR-KRM-\d{2}-\d{5}$/.test(t.isrc)) : false);
  }

  /* ============ B) METADATA ============ */
  {
    /* B3 — bölge */
    ok("B3 · REGIONS yüklü", K.REGIONS.length >= 6, K.REGIONS.length + " bölge");
    ok("B3 · dünya geneli en geniş erişim",
      K.meta.regionReach(["world"]) > K.meta.regionReach(["tr"]));
    ok("B3 · dünya geneli en pahalı",
      K.meta.regionCost(["world"]) > K.meta.regionCost(["tr"]));
    ok("B3 · boş seçim kapsamsız", K.meta.regionReach([]) < 0.5, String(K.meta.regionReach([])));
    ok("B3 · çok bölge erişimi artırır",
      K.meta.regionReach(["tr", "eu", "na", "latam"]) > K.meta.regionReach(["tr"]));
    openStudio(1, 6);
    ok("B3 · bölge çipleri render edildi", doc.querySelectorAll('[data-act="region-toggle"]').length >= 7,
      doc.querySelectorAll('[data-act="region-toggle"]').length + " çip");
    ok("B3 · varsayılan dünya geneli", !!doc.querySelector('[data-act="region-toggle"][data-arg="world"].on'));
    click("region-toggle", "tr");
    ok("B3 · bölge seçilince dünya geneli düşer",
      !(K.careerUI._studio.regions || []).includes("world"), JSON.stringify(K.careerUI._studio.regions));
    ok("B3 · seçilen bölge eklendi", (K.careerUI._studio.regions || []).includes("tr"));
    click("region-toggle", "world");
    ok("B3 · dünya geneli seçilince diğerleri temizlenir",
      JSON.stringify(K.careerUI._studio.regions) === '["world"]', JSON.stringify(K.careerUI._studio.regions));
    const cWorld = K.career.releaseCost("ep", 12000, 3000, {
      genre: "rap", beatId: "digital", trackCount: 5,
      trackBudgets: [12000, 12000, 12000, 12000, 12000],
      trackSources: ["ev", "ev", "ev", "ev", "ev"], storeCost: 1200,
      regionMult: K.meta.regionCost(["world"])
    });
    const cTr = K.career.releaseCost("ep", 12000, 3000, {
      genre: "rap", beatId: "digital", trackCount: 5,
      trackBudgets: [12000, 12000, 12000, 12000, 12000],
      trackSources: ["ev", "ev", "ev", "ev", "ev"], storeCost: 1200,
      regionMult: K.meta.regionCost(["tr"])
    });
    ok("B3 · dünya geneli maliyeti artırır", cWorld > cTr, cWorld + " > " + cTr);
  }
  {
    /* B4 — dil */
    ok("B4 · LANGUAGES yüklü", K.LANGUAGES.length >= 6, K.LANGUAGES.length + " dil");
    ok("B4 · dil uyumu bonus verir", K.meta.languageFit("tr", ["tr"]) > 1, String(K.meta.languageFit("tr", ["tr"])));
    ok("B4 · dil uyumsuzsa nötr", K.meta.languageFit("tr", ["na"]) === 1);
    ok("B4 · enstrümantal dil bariyerini aşar", K.meta.languageFit("instrumental", ["na"]) > 1);
    ok("B4 · bonus %14 ile sınırlı", K.meta.languageFit("tr", ["tr", "tr", "tr"]) <= 1.14,
      String(K.meta.languageFit("tr", ["tr", "tr", "tr"])));
    openStudio(1, 6);
    ok("B4 · dil seçici var", !!doc.querySelector("#st-lang"));
    const sel = doc.querySelector("#st-lang");
    if (sel) { sel.value = "en"; sel.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("B4 · dil seçimi kaydedildi", K.careerUI._studio.lang === "en", K.careerUI._studio.lang);
  }
  {
    /* B1/B2 — krediler + telif bölüşümü */
    ok("B1 · CREDIT_ROLES yüklü", K.CREDIT_ROLES.length >= 4, K.CREDIT_ROLES.length + " rol");
    openStudio(1, 6);
    ok("B1 · kredi satırları render edildi",
      doc.querySelectorAll(".cred-row").length === K.CREDIT_ROLES.length,
      doc.querySelectorAll(".cred-row").length + " satır");
    const holder = doc.querySelector('[data-credit="songwriter"][data-credit-field="holder"]');
    ok("B1 · kredi sahibi seçici var", !!holder);
    if (holder) { holder.value = "self"; holder.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("B1 · 'Sen' atanabiliyor", K.careerUI._studio.credits.songwriter.self === true);
    const share = doc.querySelector('[data-credit="songwriter"][data-credit-field="share"]');
    if (share) { share.value = "35"; share.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("B1 · pay değiştirilebiliyor", K.careerUI._studio.credits.songwriter.share === 35);
    if (share) { share.value = "500"; share.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("B1 · pay 0-100 arasına kırpılıyor", K.careerUI._studio.credits.songwriter.share === 100);
    const h2 = doc.querySelector('[data-credit="songwriter"][data-credit-field="holder"]');
    if (h2) { h2.value = ""; h2.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("B1 · kredi kaldırılabiliyor",
      !K.careerUI._studio.credits.songwriter.self && !K.careerUI._studio.credits.songwriter.name);

    const sheet = K.meta.splitSheet({
      credits: { songwriter: { self: true, share: 30 }, composer: { self: true, share: 20 } },
      featureShare: 100
    });
    ok("B2 · split sheet satır üretir", sheet.rows.length === 2, sheet.rows.length + " satır");
    ok("B2 · alınan pay doğru", sheet.taken === 50, String(sheet.taken));
    ok("B2 · net pay doğru", sheet.mine === 50, String(sheet.mine));
    const over = K.meta.splitSheet({
      credits: { songwriter: { self: true, share: 80 }, composer: { self: true, share: 50 } },
      featureShare: 100
    });
    ok("B2 · %100 aşımı yakalanır", over.over === true && over.mine === 0,
      JSON.stringify({ over: over.over, mine: over.mine }));
    ok("B2 · split sheet paneli render edildi", !!doc.querySelector(".split-row.mine"));
  }
  {
    /* B5/B6 — etiket + telif yılı */
    openStudio(1, 6);
    const lab = doc.querySelector("#st-label-name");
    ok("B6 · etiket adı alanı var", !!lab);
    if (lab) { lab.value = "Bağımsız Etiket"; lab.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("B6 · etiket adı kaydedildi", K.careerUI._studio.labelName === "Bağımsız Etiket");
    const yr = doc.querySelector("#st-copy-year");
    ok("B5 · telif yılı alanı var", !!yr);
    if (yr) { yr.value = "2027"; yr.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("B5 · telif yılı kaydedildi", String(K.careerUI._studio.copyrightYear) === "2027");
  }
  {
    /* B7 — UPC */
    openStudio(1, 6);
    const el = doc.querySelector(".upc-row code");
    ok("B7 · barkod gösteriliyor", !!el && /^\d{13}$/.test(el.textContent), el ? el.textContent : "yok");
  }
  {
    /* metadata yayına işlenir */
    const st = openStudio(3);
    st.tracks.forEach((t, i) => { t.name = "P" + (i + 1); });
    st.regions = ["tr", "eu"]; st.lang = "tr";
    st.credits = { songwriter: { self: true, share: 30 }, composer: { self: true, share: 20 } };
    st.labelName = "Test Etiket"; st.copyrightYear = "2028";
    K.careerUI.createReleaseFromStudio();
    const rel = K.state.player.releases[K.state.player.releases.length - 1];
    ok("B-1 · bölgeler yayında", JSON.stringify(rel.regions) === '["tr","eu"]', JSON.stringify(rel.regions));
    ok("B-2 · dil yayında", rel.lang === "tr");
    ok("B-3 · krediler yayında", !!(rel.credits && rel.credits.songwriter && rel.credits.songwriter.share === 30));
    ok("B-4 · etiket adı yayında", rel.labelName === "Test Etiket", rel.labelName);
    ok("B-5 · telif yılı yayında", rel.copyrightYear === "2028");
    ok("B-6 · UPC üretildi", /^\d{13}$/.test(rel.upc || ""), rel.upc);
    ok("B-7 · ℗ satırı üretildi", /℗ 2028/.test(rel.copyright || ""), rel.copyright);
    ok("B-8 · regionReach hesaplandı", rel.regionReach > 1, String(rel.regionReach));
    ok("B-9 · langFit hesaplandı", rel.langFit > 1, String(rel.langFit));

    K.state.day = (rel.startDay || 0) + (rel.waitDays || 0) + 1;
    K.career.publishRelease(rel);
    const songs = K.state.player.songs.filter(x => x.albumTitle === rel.title);
    ok("B-10 · şarkılar etiket adı taşır", songs.length > 0 && songs.every(x => x.labelName === "Test Etiket"));
    ok("B-11 · şarkılar UPC taşır", songs.every(x => x.upc === rel.upc));
    ok("B-12 · şarkılar kredi taşır", songs.every(x => x.credits && x.credits.songwriter));
    ok("B-13 · şarkılar telif yılı taşır", songs.every(x => x.copyrightYear === "2028"));
    ok("B-14 · şarkılar bölge taşır", songs.every(x => Array.isArray(x.regions) && x.regions.length === 2));
  }

  /* ============ C) TEKNİK ============ */
  {
    /* C1 — kapak çözünürlüğü */
    ok("C1 · mağaza alt sınırı 1400", K.meta.COVER_MIN_PX === 1400);
    ok("C1 · önerilen 3000", K.meta.COVER_GOOD_PX === 3000);
    ok("C1 · 600px reddedilir", !K.meta.coverAccepted(600));
    ok("C1 · 1400px kabul", K.meta.coverAccepted(1400));
    ok("C1 · 3000px kabul", K.meta.coverAccepted(3000));
    openStudio(1, 4);
    ok("C1 · üç çözünürlük seçeneği", doc.querySelectorAll('[data-act="cover-px"]').length === 3);
    ok("C1 · varsayılan 1400", K.careerUI._studio.coverPx === 1400);
    ok("C1 · 600px seçenek 'bad' işaretli", !!doc.querySelector('[data-act="cover-px"][data-arg="600"].bad'));
    click("cover-px", "600");
    ok("C1 · 600px seçilebiliyor", K.careerUI._studio.coverPx === 600);
    ok("C1 · düşük çözünürlükte adım geçilmez", K.careerUI.validateStep(4) === false);
    click("cover-px", "3000");
    ok("C1 · 3000px seçildi", K.careerUI._studio.coverPx === 3000);
    ok("C1 · yüksek çözünürlükte adım geçer", K.careerUI.validateStep(4) === true);
  }
  {
    /* C2 — ses formatı reddi */
    ok("C2 · WAV kabul edilir", K.meta.sourceAccepted({ file: "WAV", bit: "16-bit / 44kHz" }));
    ok("C2 · M4A 128kbps reddedilir", !K.meta.sourceAccepted({ file: "M4A", bit: "128 kbps" }));
    ok("C2 · MP3 320 kabul edilir", K.meta.sourceAccepted({ file: "MP3", bit: "320 kbps" }));
    ok("C2 · premium mağazalar doğru",
      JSON.stringify(K.meta.premiumStores(["spotify", "apple", "tidal", "amazon", "youtube"])) === '["apple","tidal","amazon"]');
    ok("C2 · Spotify kayıplıyı kabul eder", K.meta.premiumStores(["spotify"]).length === 0);
    ok("C2 · reddeden mağaza listesi",
      K.meta.rejectedBy({ file: "M4A", bit: "128 kbps" }, ["spotify", "apple"]).length === 1);
    const st = openStudio(1, 6);
    st.tracks[0].source = "telefon";
    K.careerUI.renderStudioStep();
    ok("C2 · uyumsuzluk bloğu çıkar", !!doc.querySelector('[data-act="st-drop-premium"]'));
    ok("C2 · adım 6 engellenir", K.careerUI.validateStep(6) === false);
    click("st-drop-premium");
    ok("C2 · tek tuşla premium mağazalar düşer",
      K.meta.premiumStores(K.careerUI._studio.stores).length === 0,
      JSON.stringify(K.careerUI._studio.stores));
    ok("C2 · temizlendikten sonra adım geçer", K.careerUI.validateStep(6) === true);
  }
  {
    /* C3 — çıkış günü */
    ok("C3 · yedi hafta günü", K.meta.WEEKDAYS.length === 7);
    const fri = K.meta.snapToWeekday(10, 5);
    ok("C3 · cuma'ya kaydırma doğru", K.meta.weekdayOf(fri) === 5, "gün " + fri + " = " + K.meta.weekdayName(fri));
    ok("C3 · kaydırma ileri gider", fri >= 10, String(fri));
    ok("C3 · cuma tam puan", K.meta.releaseDayFit(fri) === 1);
    ok("C3 · pazartesi cezalı", K.meta.releaseDayFit(K.meta.snapToWeekday(10, 1)) < 1,
      String(K.meta.releaseDayFit(K.meta.snapToWeekday(10, 1))));
    ok("C3 · perşembe cumaya yakın", K.meta.releaseDayFit(K.meta.snapToWeekday(10, 4)) > 0.95);
    openStudio(1, 6);
    ok("C3 · hafta günü seçici var", !!doc.querySelector("#st-weekday"));
    const sel = doc.querySelector("#st-weekday");
    if (sel) { sel.value = "1"; sel.dispatchEvent(new dom.window.Event("input", { bubbles: true })); }
    ok("C3 · hafta günü kaydedildi", K.careerUI._studio.releaseWeekday === 1);
    const info = doc.querySelector("#st-weekday-info");
    ok("C3 · bilgi satırı güncellenir", !!info && /Pazartesi/.test(info.textContent || ""),
      info ? info.textContent : "yok");
  }
  {
    /* C4 — Content ID */
    ok("C4 · Content ID bedeli tanımlı", K.meta.CONTENT_ID_COST === 3500);
    openStudio(1, 6);
    ok("C4 · Content ID düğmesi var", !!doc.querySelector('[data-act="st-content-id"]'));
    click("st-content-id");
    ok("C4 · Content ID açılıyor", K.careerUI._studio.contentId === true);
    ok("C4 · maliyete eklenir",
      costOf({ contentId: true }) - costOf({}) === K.meta.CONTENT_ID_COST,
      String(costOf({ contentId: true }) - costOf({})));
    ok("C4 · getiri oranı tanımlı", K.meta.CONTENT_ID_YIELD > 0);
  }
  {
    /* C grubu yayına işlenir */
    const st = openStudio(3, 6);
    st.tracks.forEach((t, i) => { t.name = "T" + (i + 1); });
    st.coverPx = 3000; st.contentId = true; st.releaseWeekday = 5;
    K.careerUI.createReleaseFromStudio();
    const rel = K.state.player.releases[K.state.player.releases.length - 1];
    ok("C-1 · coverPx yayında", rel.coverPx === 3000, String(rel.coverPx));
    ok("C-2 · contentId yayında", rel.contentId === true);
    ok("C-3 · releaseWeekday yayında", rel.releaseWeekday === 5);
    ok("C-4 · releaseDayFit yayında", rel.releaseDayFit === 1, String(rel.releaseDayFit));
    ok("C-5 · çıkış günü cuma", K.meta.weekdayOf(rel.startDay + rel.waitDays) === 5,
      K.meta.weekdayName(rel.startDay + rel.waitDays));

    K.state.day = (rel.startDay || 0) + (rel.waitDays || 0) + 1;
    K.career.publishRelease(rel);
    const songs = K.state.player.songs.filter(x => x.albumTitle === rel.title);
    ok("C-6 · şarkılar yayınlandı", songs.length === 2, songs.length + " şarkı");
    ok("C-7 · coverPx şarkıya geçti", songs.every(x => x.coverPx === 3000));
    ok("C-8 · contentId şarkıya geçti", songs.every(x => x.contentId === true));
    ok("C-9 · çıkış günü puanı şarkıda", songs.every(x => x.releaseDayFit === 1));
  }
  {
    /* C5 — takedown / yeniden yükleme */
    const st = openStudio(2);
    st.tracks.forEach((t, i) => { t.name = "X" + (i + 1); });
    st.coverPx = 3000;
    K.careerUI.createReleaseFromStudio();
    const rel = K.state.player.releases[K.state.player.releases.length - 1];
    K.state.day = (rel.startDay || 0) + (rel.waitDays || 0) + 1;
    K.career.publishRelease(rel);
    const song = K.state.player.songs.filter(x => x.albumTitle === rel.title)[0];
    ok("C5 · şarkı yayınlandı", !!song);
    if (song) {
      ok("C5 · takedown çalışır", K.career.takedownSong(song.id, "manual") === true);
      ok("C5 · kaldırıldı işaretlendi", song.takenDown === true);
      ok("C5 · dinlenme sıfırlandı", song.dailyStreams === 0 && song.lastDaily === 0);
      ok("C5 · listelerden düştü", (song.playlists || []).length === 0 && song.chartRank === null);
      ok("C5 · zaten kaldırılmışsa reddeder", K.career.takedownSong(song.id, "manual") === false);
      const before = K.state.balance;
      ok("C5 · yeniden yükleme çalışır", K.career.reuploadSong(song.id) === true);
      ok("C5 · kaldırma işareti temizlendi", song.takenDown === false);
      ok("C5 · örnek riski temizlendi", song.sampleRisk === false);
      ok("C5 · dinlenme geri geldi", song.dailyStreams > 0, String(song.dailyStreams));
      ok("C5 · ücret kesildi", K.state.balance < before, before + " → " + K.state.balance);
      ok("C5 · yayında olmayan şarkı yeniden yüklenemez", K.career.reuploadSong("yok-boyle-id") === false);
    }
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.40 GERÇEK DAĞITIM FORMU");
  console.log("A) parça seviyesi · B) metadata · C) teknik gereksinim");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ DAĞITIM FORMU TAM · PARÇA + METADATA + TEKNİK");
  else process.exitCode = 1;
}
