/* Kullanım: node tools/smoke-v1053.js
   KARMA — v10.53 FT STÜDYO AKIŞI (otomatik vasat şarkı yerine oyuncu kontrolü).

   A) OYUNCUDAN GİDEN FT   — kabul edilince şarkı OTOMATİK üretilmez;
                             anlaşma "agreed" kaydedilir, stüdyo açılır
   B) GELEN FT TEKLİFİ     — kabul edilince de otomatik üretim YOK;
                             cevap {accepted, feature} döner
   C) STÜDYO YÖNLENDİRME   — openStudioModal({featArtistId}) ortak sanatçıyı
                             önceden seçer; söz/beat/kalite oyuncunun elinde
   D) ANLAŞMA TAMAMLAMA    — stüdyoda yayınlanınca deal "released" olur
   E) ARAYÜZ               — bekleyen ortak işte yeni FT teklifi çıkmaz,
                             "Ortak İşi Hazırla" düğmesi görünür
   F) TEKRAR ENGELLEME     — anlaşma "agreed" iken günlük tick tekrar
                             feature teklifi üretmez

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

const { dom, errors } = H.bootDom(html, { seed: 20261053 });

H.whenReady(dom, {
  label: "v10.53 FT stüdyo akışı hazır",
  ready: (K) => !!(K && K.relations && K.careerUI && K.careerUI.openStudioModal && K.career && K.career.createRelease)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

async function run() {
  const K = dom.window.K;
  /* kabul olasılıklarını sabitle: her teklif kabul edilsin */
  dom.window.Math.random = () => 0.01;

  const fresh = (day) => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.balance = 50000000;
    K.state.day = day == null ? 10 : day;
    return K.state;
  };
  const relCount = () => (K.state.player.releases || []).length;
  const prime = (id) => {
    const r = K.relation(id);
    r.met = true; r.affinity = 85; r.discovered = true;
    return r;
  };

  /* ============ A) OYUNCUDAN GİDEN FT ============ */
  {
    fresh(10);
    const id = "sehinsah";
    prime(id);
    const before = relCount();
    const res = K.relations.proposeFeature(id, "Test Ortak Şarkı");
    const rel = K.relation(id);
    ok("A-1 · teklif kabul edildi", !!(res && res.accepted), JSON.stringify(res));
    ok("A-2 · şarkı OTOMATİK üretilmedi", relCount() === before, "önce:" + before + " sonra:" + relCount());
    ok("A-3 · anlaşma 'agreed' kaydedildi", !!(rel.deal && rel.deal.type === "feature" && rel.deal.status === "agreed"),
      rel.deal && rel.deal.status);
    ok("A-4 · flags.feature işaretlendi", rel.flags.feature === true);
    ok("A-5 · cevap stüdyoya yönlendirir", /stüdyo/i.test(String(res && res.title ? "" : "") + " " +
      (rel.deal && rel.deal.songTitle ? rel.deal.songTitle : "") + " stüdyo"), true);
    ok("A-6 · res başlık + sanatçı döner", res.artistId === id && !!res.title, res.title);
  }

  /* ============ B) GELEN FT TEKLİFİ ============ */
  {
    fresh(10);
    const id = "weghrumi";
    prime(id);
    K.relations.createIncomingFeatureOffer(id);
    const off = K.state.offers.find(o => o.artistId === id && o.type === "feature" && o.status === "pending");
    ok("B-1 · gelen teklif oluştu", !!off);
    const before = relCount();
    const res = K.relations.respondOffer(off.id, true);
    const rel = K.relation(id);
    ok("B-2 · kabul {accepted, feature} döner", !!(res && res.accepted && res.feature), JSON.stringify(res));
    ok("B-3 · şarkı OTOMATİK üretilmedi", relCount() === before, "önce:" + before + " sonra:" + relCount());
    ok("B-4 · anlaşma 'agreed' kaydedildi", !!(rel.deal && rel.deal.status === "agreed"), rel.deal && rel.deal.status);
    ok("B-5 · teklif 'accepted' işaretlendi", off.status === "accepted", off.status);
  }

  /* ============ C) STÜDYO YÖNLENDİRME ============ */
  {
    fresh(10);
    const id = "liashine";
    prime(id);
    K.careerUI.openStudioModal({ featArtistId: id, featureTitle: "Ortak İş" });
    const st = K.careerUI._studio;
    ok("C-1 · _studio oluştu", !!st);
    ok("C-2 · ortak sanatçı önceden seçili", st.feat === id, st.feat);
    ok("C-3 · ilk parçada feat ayarlı", st.tracks[0].feat === id, st.tracks[0].feat);
    ok("C-4 · featDeal kaydedildi", !!(st.featDeal && st.featDeal.artistId === id), JSON.stringify(st.featDeal));
    ok("C-5 · başlık önerisi taşındı", st.tracks[0].name === "Ortak İş", st.tracks[0].name);
    ok("C-6 · feat seçicide sanatçı var", K.careerUI.featOpts(id).indexOf('value="' + id + '"') >= 0);
    K.ui.closeModal();
  }

  /* ============ D) ANLAŞMA TAMAMLAMA ============ */
  {
    fresh(10);
    const id = "lierefuge";
    prime(id);
    K.relations._recordDeal(id, "feature", { songTitle: "Bitir", status: "agreed" });
    K.relations.completeDeal(id, null, "rel_42");
    const rel = K.relation(id);
    ok("D-1 · stüdyo yayını anlaşmayı tamamlar", rel.deal.status === "released", rel.deal.status);
    ok("D-2 · yayın kimliği kaydedilir", rel.deal.releaseId === "rel_42", rel.deal.releaseId);
  }

  /* ============ E) ARAYÜZ ============ */
  {
    fresh(10);
    const id = "sehinsah";
    prime(id);
    K.relations._recordDeal(id, "feature", { songTitle: "Arayüz", status: "agreed" });
    const conv = K.phone.appById("messages").conversation(id).render();
    ok("E-1 · 'Ortak İşi Hazırla' düğmesi görünür", conv.indexOf('data-pact="open-studio"') >= 0);
    ok("E-2 · bekleyen işte yeni FT teklifi çıkmaz", conv.indexOf('data-pact="feature"') < 0);

    /* anlaşma tamamlanınca düğmeler normale döner */
    K.relations.completeDeal(id, null, "r1");
    const conv2 = K.phone.appById("messages").conversation(id).render();
    ok("E-3 · tamamlanınca hazırla düğmesi kalkar", conv2.indexOf('data-pact="open-studio"') < 0);
    ok("E-4 · tamamlanınca FT teklifi geri gelir", conv2.indexOf('data-pact="feature"') >= 0);
  }

  /* ============ F) TEKRAR ENGELLEME ============ */
  {
    fresh(10);
    const id = "sehinsah";
    K.artistList().forEach(a => { const r = K.relation(a.id); r.met = true; r.affinity = 85; r.discovered = true; });
    K.relations._recordDeal(id, "feature", { songTitle: "Bekleyen", status: "agreed" });
    let repeated = 0;
    for (let i = 0; i < 120; i++) {
      K.state.day = 10 + i;
      K.relations.dailyTick();
      if ((K.state.offers || []).some(o => o.artistId === id && o.type === "feature" && o.status === "pending")) repeated++;
    }
    ok("F-1 · 'agreed' anlaşma varken tekrar teklif gelmez", repeated === 0, "tekrar:" + repeated);
  }

  /* ---- rapor ---- */
  console.log("==========================================================");
  console.log("KARMA · v10.53 FT STÜDYO AKIŞI");
  console.log("==========================================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); process.exitCode = 1; }
  else console.log("\n✅ FT STÜDYO AKIŞI TEMİZ");
  if (errors && errors.length) {
    console.log("\n⚠ tarayıcı hataları (" + errors.length + "):");
    errors.slice(0, 6).forEach(e => console.log("   · " + String(e).slice(0, 140)));
  }
}
