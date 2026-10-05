/* Kullanım: node tools/smoke-v1058.js
   KARMA — v10.58: YAŞAYAN ENDÜSTRİ (NPC ağı · kariyer olayları · oyuncu yankısı)

   Neden bu süit var?
   ------------------
   v10.58, KARMA'yı "menülerle dolu oyun"dan "yaşayan sektör"e taşıyan
   katmanı ekler (systems/industry.js). Bu süit o katmanın temel
   sözleşmelerini kalıcı olarak kilitler:

     A) Modül ve API yüzeyi
     B) Kalıcı NPC ilişki ağı (ties) + eski kayıt göçü
     C) Oyuncudan bağımsız günlük dünya olayları (yayın/transfer/konser/gerilim)
     D) Yayın sonucu çeşitliliği (tutmayan iş / patlayan iş)
     E) Oyuncunun feature yayınının sektöre yankısı (kitle + ağ + bildirim)
     F) Oyuncunun husumetinin sektöre yankısı
     G) Öncelikli bildirim + endüstri akışı

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

const { dom, errors } = H.bootDom(html, { seed: 20261058 });

H.whenReady(dom, {
  label: "v10.58 endüstri katmanı hazır",
  ready: (K) => !!(K && K.industry && K.industry.tick && K.artistList && K.artistList().length)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exit(1);
});

/* modalların test dışında açılmasını engelle (gün döngüsü güvenliği) */
function clearPending(s, K) {
  ["pendingIncident", "pendingSync", "pendingCatalogOffer", "pendingPress", "pendingSponsor"].forEach(k => { s[k] = null; });
  if (s.player) s.player.calls = [];
}

function run(K) {
  const s = K.state, p = s.player;
  const I = K.industry.ensure();

  /* =========================================================
     A) MODÜL & API
     ========================================================= */
  {
    const api = ["ensure", "init", "tick", "onPlayerRelease", "onPlayerBeef",
      "adjustNpcRelease", "feedHTML", "setTie", "friendsOf", "rivalsOf", "events"];
    ok("A1 · endüstri API yüzeyi tam", api.every(fn => typeof K.industry[fn] === "function"),
      api.filter(fn => typeof K.industry[fn] !== "function").join(", ") || "tam");
    const wantKinds = ["feature", "label", "concert", "tension", "flop", "hit", "award", "player_feature", "player_beef"];
    ok("A2 · olay türleri tanımlı", wantKinds.every(k => !!K.industry.KINDS[k]));
    ok("A3 · index.html modülü yüklüyor", /js\/systems\/industry\.js/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")));
  }

  /* =========================================================
     B) DURUM & GÖÇ + İLİŞKİ AĞI
     ========================================================= */
  {
    /* eski kayıt simülasyonu: alanları sil, ensure tamamlamalı */
    const keep = s.industry;
    s.industry = { released: {} };
    const e2 = K.industry.ensure();
    ok("B1 · ensure eksik alanları tamamlıyor",
      e2.ties && e2.events && e2.label && e2.awards && e2.momentum != null,
      "ties=" + !!e2.ties + " events=" + !!e2.events);
    s.industry = keep;

    K.industry.init();
    const artists = K.artistList();
    const withTies = artists.filter(a => s.industry.ties[a.id]).length;
    ok("B2 · tüm sanatçılar için ilişki kaydı var", withTies === artists.length,
      withTies + "/" + artists.length);

    /* çift yönlülük: a→b dostluğu b→a ile aynı olmalı */
    let edges = 0, asym = 0;
    Object.keys(s.industry.ties).forEach(a => {
      const f = s.industry.ties[a].friend || {};
      Object.keys(f).forEach(b => {
        edges++;
        const back = (s.industry.ties[b] && s.industry.ties[b].friend && s.industry.ties[b].friend[a]) || 0;
        if (Math.abs(back - f[b]) > 1e-9) asym++;
      });
    });
    ok("B3 · ilişki kenarları çift yönlü (simetrik)", asym === 0, asym + " asimetrik / " + edges + " kenar");
    ok("B4 · ağ yeterince yoğun (dostluk kenarı var)", edges >= 5, edges + " kenar");

    const someId = artists[0].id;
    ok("B5 · friendsOf/rivalsOf sanatçı döndürüyor",
      Array.isArray(K.industry.friendsOf(someId, 3)) && Array.isArray(K.industry.rivalsOf(someId, 3)));

    /* yeniden init ağı bozmamalı */
    const before = JSON.stringify(s.industry.ties[someId]);
    K.industry.init();
    ok("B6 · init idempotent (ağ bozulmuyor)", JSON.stringify(s.industry.ties[someId]) === before);
  }

  /* =========================================================
     C) OYUNCUDAN BAĞIMSIZ DÜNYA
     ========================================================= */
  {
    const feedBefore = Object.keys(s.feed).reduce((n, pf) => n + (s.feed[pf] || []).filter(x => x.industry).length, 0);
    for (let d = 0; d < 90; d++) {
      clearPending(s, K);
      K.game.nextDay();
    }
    const evs = K.industry.events(18);
    ok("C1 · dünya olayları birikiyor", evs.length > 0, evs.length + " olay");
    ok("C2 · olay günleri geçmişte", evs.every(e => e.day <= s.day));
    const kinds = {};
    evs.forEach(e => { kinds[e.kind] = 1; });
    ok("C3 · en az iki farklı olay türü üretildi", Object.keys(kinds).length >= 2, Object.keys(kinds).join(", "));

    const feedAfter = Object.keys(s.feed).reduce((n, pf) => n + (s.feed[pf] || []).filter(x => x.industry).length, 0);
    ok("C4 · endüstri sosyal akışa gönderi bıraktı", feedAfter > feedBefore, feedBefore + " → " + feedAfter);

    /* transfer mekaniği doğrudan: farklı şirkete geçiş */
    const cand = K.artistList().find(a => a.labelId !== "my_label");
    const oldLabel = cand ? cand.labelId : null;
    if (cand) {
      K.industry._npcLabelChange(cand);
      ok("C5 · şirket değişimi labelId'yi günceller", cand.labelId !== oldLabel,
        (oldLabel || "bağımsız") + " → " + cand.labelId);
    } else {
      ok("C5 · şirket değişimi labelId'yi günceller", false, "aday yok");
    }

    /* feedHTML arayüz için metin üretir */
    ok("C6 · feedHTML boş olmayan metin üretiyor", K.industry.feedHTML().length > 20);
  }

  /* =========================================================
     D) YAYIN SONUCU ÇEŞİTLİLİĞİ (tutmayan / patlayan)
     ========================================================= */
  {
    const gain = 0.2;
    const seen = [];
    for (let i = 0; i < 40; i++) {
      const fake = { id: "smk" + i, popularity: 50, stageName: "Test" + i, ig: 1000, monthly: 100000 };
      const r = K.industry.adjustNpcRelease(fake, gain);
      seen.push(r);
    }
    ok("D1 · sonuç her zaman sonlu ve makul", seen.every(r => isFinite(r) && r > 0 && r < gain * 3));
    ok("D2 · en az bir 'tutmayan iş' var", seen.some(r => r < gain * 0.6),
      "en düşük " + Math.min.apply(null, seen).toFixed(3));
    ok("D3 · en az bir 'patlayan iş' var", seen.some(r => r > gain * 1.2),
      "en yüksek " + Math.max.apply(null, seen).toFixed(3));

    const a1 = { id: "det", popularity: 50, stageName: "Det", ig: 0 };
    const a2 = { id: "det", popularity: 50, stageName: "Det", ig: 0 };
    ok("D4 · aynı (sanatçı, gün) → aynı sonuç (determinizm)",
      K.industry.adjustNpcRelease(a1, gain) === K.industry.adjustNpcRelease(a2, gain));
  }

  /* =========================================================
     E) OYUNCU FEATURE YANKISI
     ========================================================= */
  {
    const partner = K.artistList().find(a => a.id !== "player") || K.artistList()[0];
    const song = { id: "smk_feat", title: "Test Ortak İş", featWith: partner.id, boosts: {} };
    const momBefore = K.industry.ensure().momentum || 0;
    const relBefore = (K.relation(partner.id).affinity || 0);
    const res = K.industry.onPlayerRelease(song);

    ok("E1 · feature yankısı işlendi", !!res && res.partnerId === partner.id);
    ok("E2 · şarkıya kitle aktarımı ivmesi eklendi",
      Object.keys(song.boosts).some(k => k.indexOf("feat_") === 0));
    ok("E3 · sektör momentumu arttı", (K.industry.ensure().momentum || 0) > momBefore,
      momBefore.toFixed(2) + " → " + (K.industry.ensure().momentum || 0).toFixed(2));
    ok("E4 · partnerle samimiyet arttı", K.relation(partner.id).affinity > relBefore,
      relBefore.toFixed(1) + " → " + K.relation(partner.id).affinity.toFixed(1));
    ok("E5 · olay kaydı düştü (player_feature)",
      K.industry.events(20).some(e => e.kind === "player_feature"));
    ok("E6 · öncelikli bildirim düştü",
      (s.notifications || []).some(n => (n.priority || 0) >= 2 && n.day === s.day && /Ortak iş yankılandı/.test(n.title)));
    ok("E7 · trend listesine girdi", (s.trends || []).some(t => t.mine));

    /* ikinci kez işlenmez */
    const momAfter = K.industry.ensure().momentum;
    K.industry.onPlayerRelease(song);
    ok("E8 · aynı şarkı iki kez işlenmez", Math.abs((K.industry.ensure().momentum) - momAfter) < 1e-9);
  }

  /* =========================================================
     F) OYUNCU HUSUMET YANKISI
     ========================================================= */
  {
    const target = K.artistList().find(a => K.industry.friendsOf(a.id, 1).length) || K.artistList()[1];
    const res = K.industry.onPlayerBeef(target.id);
    ok("F1 · husumet yankısı işlendi", !!res);
    ok("F2 · olay kaydı düştü (player_beef)",
      K.industry.events(20).some(e => e.kind === "player_beef"));
    ok("F3 · öncelikli bildirim düştü",
      (s.notifications || []).some(n => (n.priority || 0) >= 2 && /Husumet yankısı/.test(n.title)));
  }

  /* =========================================================
     G) ÖNCELİKLİ BİLDİRİM ALANI
     ========================================================= */
  {
    const industryNotes = (s.notifications || []).filter(n => typeof n.priority === "number");
    ok("G1 · endüstri bildirimleri priority alanı taşıyor", industryNotes.length > 0, industryNotes.length + " kayıt");
    ok("G2 · notification dizisi sınırlı (spam yok)", (s.notifications || []).length <= 60);
  }

  /* =========================================================
     H) RUNTIME TEMİZ
     ========================================================= */
  {
    const rt = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
    ok("H1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));
  }

  console.log("\n============================================");
  console.log("KARMA · v10.58 (yaşayan endüstri)");
  console.log("============================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach(f => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ v10.58 TEMİZ");
  process.exit(0);
}
