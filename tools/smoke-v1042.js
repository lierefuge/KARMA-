/* Kullanım: node tools/smoke-v1042.js
   KARMA — v10.42 Distribütör & Sözleşme.

   A) DISTRIBÜTÖR MOTORU
      ücretsiz / yayın başına / yıllık üyelik / etiket modelleri,
      kesinti, teslim süresi, premium mağaza erişimi, itibar kapısı
   B) STÜDYO ARAYÜZÜ
      distribütör seçimi, master sahipliği, premium mağaza kilidi,
      teslim süresi uyarısı, özet satırları
   C) YAYIN + EKONOMİ
      distribütör bilgisi yayına ve şarkıya işlenir; kesinti teliften
      düşülür; master sahipliği şirket payını değiştirir; yıllık plan
   D) SÖZLEŞME
      master + distribütör şartları, imzalı sözleşme kartı

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

const { dom, errors } = H.bootDom(html, { seed: 20261042 });

H.whenReady(dom, {
  label: "v10.42 distribütör hazır",
  ready: (K) => !!(K && K.careerUI && K.career && K.distro && K.distributorById)
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

  /* ============ A) DISTRIBÜTÖR MOTORU ============ */
  ok("A-0 · distribütör modülü yüklendi",
    !!(K.DISTRIBUTORS && K.distro && K.distributorById && K.distroModelLabel));
  ok("A-0 · en az 6 distribütör", (K.DISTRIBUTORS || []).length >= 6, (K.DISTRIBUTORS || []).length);
  ok("A-0 · varsayılan KARMA", K.defaultDistributor() === "karma", K.defaultDistributor());

  {
    const karma = K.distributorById("karma");
    const distro = K.distributorById("distrokid");
    const tunecore = K.distributorById("tunecore");
    const cdbaby = K.distributorById("cdbaby");
    const believe = K.distributorById("believe");

    ok("A-1 · ücretsiz distribütör yüksek kesinti", karma && karma.model === "free" && karma.commission >= 15,
      karma ? karma.model + "/" + karma.commission : "—");
    ok("A-1 · kısıtlı ücretsiz distribütör premium değil", K.distributorById("amuse").premium === false);
    ok("A-2 · yayın başına model ücreti var", tunecore && tunecore.model === "perRelease" && tunecore.fee > 0,
      tunecore ? tunecore.fee : "—");
    ok("A-2 · %0 kesintili distribütör var", tunecore && tunecore.commission === 0 && distro.commission === 0);
    ok("A-3 · tek seferlik model kesintili", cdbaby && cdbaby.model === "oneTime" && cdbaby.commission > 0);
    ok("A-4 · yıllık model", distro && distro.model === "annual");
    ok("A-5 · etiket modeli itibar kapısı taşır", believe && believe.model === "label" && believe.minRep > 0);

    /* teslim süreleri farklı olmalı (gerçekçilik) */
    const leads = K.DISTRIBUTORS.map(d => d.leadDays);
    ok("A-6 · teslim süreleri çeşitli", new Set(leads).size >= 4, JSON.stringify(leads));
    ok("A-6 · ücretsiz distribütör daha yavaş", karma.leadDays > distro.leadDays,
      karma.leadDays + " > " + distro.leadDays);

    /* feeFor */
    ok("A-7 · ücretsiz distribütör ücreti 0", K.distro.feeFor("karma", 100) === 0);
    ok("A-7 · yayın başına ücret", K.distro.feeFor("tunecore", 100) === tunecore.fee, K.distro.feeFor("tunecore", 100));
    /* yıllık: ilk kez ücret, plan işaretlenince 0 */
    K.state = K.newGame();
    ok("A-8 · yıllık distribütör ilk yayında ücretli", K.distro.feeFor("distrokid", 50) === distro.fee, K.distro.feeFor("distrokid", 50));
    K.distro.notePlan("distrokid", 50);
    ok("A-8 · yıllık plan aktifken ücretsiz", K.distro.feeFor("distrokid", 50) === 0);
    ok("A-8 · plan 365 gün sonra biter", K.distro.planUntil("distrokid") === 415, K.distro.planUntil("distrokid"));

    /* premium erişim */
    ok("A-9 · kısıtlı distribütör premium kapalı", K.distro.premiumAllowed("amuse") === false);
    ok("A-9 · premium distribütör açık", K.distro.premiumAllowed("distrokid") === true);
    ok("A-9 · major dağıtım premium", K.distro.premiumAllowed("major") === true);

    /* itibar kapısı */
    K.state = K.newGame();
    K.state.player.reputation = 0;
    K.state.label = null;
    ok("A-10 · itibarsız etiket distribütörü kilitli", K.distro.canUse("believe", 0) === false);
    K.state.player.reputation = 70;
    ok("A-10 · itibarlıysa açılır", K.distro.canUse("believe", 0) === true);

    /* model etiketi */
    ok("A-11 · model etiketleri okunur", K.distroModelLabel("karma") === "Ücretsiz" && K.distroModelLabel("tunecore") === "Yayın başına");
  }

  /* ============ B) STÜDYO ARAYÜZÜ ============ */
  {
    const st = openStudio(1, 6);
    ok("B-1 · distribütör çipleri var", doc.querySelectorAll(".dist-opt").length >= 6,
      doc.querySelectorAll(".dist-opt").length);
    ok("B-1 · st.distributor başlangıçta karma", st.distributor === "karma", st.distributor);
    ok("B-1 · master satırı var", !!doc.querySelector(".master-row"));

    /* seçim değiştir */
    click("dist-pick", "distrokid");
    ok("B-2 · distribütör seçilebiliyor", K.careerUI._studio.distributor === "distrokid", K.careerUI._studio.distributor);
    const info = (doc.querySelector("#st-dist-info") || {}).textContent || "";
    ok("B-2 · bilgi satırı kesinti + teslim yazar", /kesinti/.test(info) && /teslim/.test(info), info.slice(0, 90));

    /* premium mağaza kilidi: ücretsiz distribütöre geç → Apple kilitli */
    click("dist-pick", "amuse");
    const appleBtn = doc.querySelector('[data-act="store-toggle"][data-arg="apple"]');
    ok("B-3 · kısıtlı distribütörde premium mağaza kilitli", appleBtn && appleBtn.disabled === true,
      appleBtn ? String(appleBtn.disabled) : "yok");
    click("dist-pick", "distrokid");
    const appleBtn2 = doc.querySelector('[data-act="store-toggle"][data-arg="apple"]');
    ok("B-3 · premium distribütörde açılır", appleBtn2 && appleBtn2.disabled !== true);

    /* teslim süresi uyarısı */
    K.careerUI._studio.wait = 2;
    K.careerUI._studio.distributor = "karma"; // 10 gün teslim
    K.careerUI.renderStudioStep();
    const warn = Array.from(doc.querySelectorAll("#st-body .note-line")).map(e => e.textContent).join(" | ");
    ok("B-4 · kısa sürede teslim uyarısı çıkar", /teslim süresi/.test(warn), warn.slice(0, 110));

    /* özet satırları */
    const sumTxt = (doc.querySelector("#st-body .sum-rows") || {}).textContent || "";
    ok("B-5 · özet distribütör satırı içerir", /Distribütör/.test(sumTxt));
    ok("B-5 · özet yayın sahibi satırı içerir", /Yayın Sahibi|Yayın sahibi/.test(sumTxt));
  }

  /* ============ C) YAYIN + EKONOMİ ============ */
  {
    /* bağımsız yayın: ücretsiz distribütör */
    const st = openStudio(1, 6);
    st.distributor = "karma";
    st.wait = 20;
    K.careerUI.collectStudio();
    K.careerUI.createReleaseFromStudio();
    const rel = K.state.player.releases[K.state.player.releases.length - 1];
    ok("C-1 · yayın oluştu", !!rel, rel ? rel.title : "yok");
    ok("C-1 · distribütör yayına işlendi", rel && rel.distributorId === "karma", rel ? rel.distributorId : "—");
    ok("C-1 · kesinti yayına işlendi", rel && rel.distCommission === 18, rel ? rel.distCommission : "—");
    ok("C-1 · master sanatçıda", rel && rel.masterOwner === "artist", rel ? rel.masterOwner : "—");

    /* yayınla → şarkıya işlenir */
    const song = K.career.publishRelease(rel);
    if (song && (K.state.player.songs || []).indexOf(song) < 0) K.state.player.songs.push(song);
    ok("C-2 · şarkı distribütör taşır", song && song.distributorId === "karma", song ? song.distributorId : "—");
    ok("C-2 · şarkı kesinti taşır", song && song.distCommission === 18, song ? song.distCommission : "—");
    ok("C-2 · şarkı master taşır", song && song.masterOwner === "artist");

    /* telif: distribütör kesintisi düşülür */
    K.state.day = 200;
    song.month = { spotify: 200000, apple: 0, youtube: 0, other: 0 };
    K.economy.settleMonth();               // rapor kuyruğa girer
    (K.state.player.royalties || []).forEach(r => { Object.keys(r.due).forEach(k => { r.due[k] = 0; }); });
    const pay1 = K.economy.settleMonth();  // tahsilat
    ok("C-3 · distribütör kesintisi hesaplandı", pay1.distCut > 0, pay1.distCut);
    const expectedCut = Math.round(pay1.gross * 0.18);
    ok("C-3 · kesinti oranı doğru (~%18)", Math.abs(pay1.distCut - expectedCut) <= 2,
      pay1.distCut + " ≈ " + expectedCut);
    ok("C-3 · kesinti brütten düşük", pay1.distCut < pay1.gross, pay1.distCut + " < " + pay1.gross);

    /* %0 komisyonlu distribütör → kesinti yok */
    const st2 = openStudio(1, 6);
    st2.distributor = "distrokid";
    st2.wait = 20;
    K.careerUI.collectStudio();
    K.careerUI.createReleaseFromStudio();
    const rel2 = K.state.player.releases[K.state.player.releases.length - 1];
    const song2 = K.career.publishRelease(rel2);
    if (song2 && (K.state.player.songs || []).indexOf(song2) < 0) K.state.player.songs.push(song2);
    K.state.day = 200;
    song2.month = { spotify: 150000, apple: 0, youtube: 0, other: 0 };
    K.economy.settleMonth();
    (K.state.player.royalties || []).forEach(r => { Object.keys(r.due).forEach(k => { r.due[k] = 0; }); });
    const pay2 = K.economy.settleMonth();
    ok("C-4 · %0 komisyonlu distribütörde kesinti yok", pay2.distCut === 0, pay2.distCut);
  }

  /* ============ D) SÖZLEŞME ============ */
  {
    /* şirket altında: distribütör + master sözleşmeden */
    K.state = K.newGame();
    K.state.player.stageName = "Şehinşah";
    K.state.balance = 9000000;
    K.state.player.reputation = 70;
    const terms = K.career.labelOfferTerms("muzikon");
    ok("D-1 · sözleşme şartları master taşır", terms && (terms.master === "label" || terms.master === "artist"),
      terms ? terms.master : "—");
    ok("D-1 · sözleşme şartları distribütör taşır", terms && !!terms.distributor, terms ? terms.distributor : "—");

    K.career.signWithLabel("muzikon");
    ok("D-2 · imza sonrası labelDeal.master", K.state.player.labelDeal && !!K.state.player.labelDeal.master,
      K.state.player.labelDeal ? K.state.player.labelDeal.master : "—");
    ok("D-2 · imza sonrası labelDeal.distributor", K.state.player.labelDeal && !!K.state.player.labelDeal.distributor,
      K.state.player.labelDeal ? K.state.player.labelDeal.distributor : "—");

    /* sözleşme kartı render */
    const card = K.careerUI.renderMyDeal();
    ok("D-3 · sözleşme kartı var", /KAYIT VE LİSANS SÖZLEŞMESİ/.test(card));
    ok("D-3 · master satırı sözleşmede", /Master/.test(card));
    ok("D-3 · distribütör satırı sözleşmede", /Distribütör/.test(card));
    ok("D-3 · imza damgası var", /İMZALANDI/.test(card));

    /* şirket altında stüdyoda şirket distribütörü seçeneği */
    doc.querySelectorAll("#modal-root").forEach(m => { m.innerHTML = ""; });
    K.careerUI.openStudioModal({ topic: null });
    K.careerUI._studio.step = 6;
    K.careerUI.renderStudioStep();
    const chips = Array.from(doc.querySelectorAll(".dist-opt")).map(e => e.textContent).join(" | ");
    ok("D-4 · şirket distribütörü seçeneği var", /distribütörü/.test(chips), chips.slice(0, 100));
    ok("D-4 · 'kendi distribütörün' seçeneği var", /Kendi distribütörün/.test(chips));

    /* master şirket adına kilitli mi? */
    const labelMasterBtn = doc.querySelector('[data-act="master-pick"][data-arg="label"]');
    ok("D-4 · master seçenekleri var", !!doc.querySelector(".master-row") && !!doc.querySelector('[data-act="master-pick"][data-arg="artist"]'),
      labelMasterBtn ? String(labelMasterBtn.disabled) : "yok");
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.42 DISTRIBÜTÖR & SÖZLEŞME");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ DISTRIBÜTÖR + SÖZLEŞME TEMİZ");
  else process.exitCode = 1;
}
