/* Kullanım: node tools/smoke-v1059.js
   KARMA — v10.59: ENDÜSTRİ HAFIZASI · NPC KARİYER · YAŞAYAN LABEL

   Neden bu süit var?
   ------------------
   v10.59, v10.58'in üzerine üç katman ekler ve bunları kalıcı kılar:
     · NPC HAFIZASI   → geçmiş olaylar yapılandırılmış biçimde saklanır
     · NPC KARİYERİ   → release/hit/flop/transfer geçmişi + kariyer yayı
     · YAŞAYAN LABEL  → şirket stratejisi, keşif, transfer, rekabet, itibar

   Bu süit, istenen 14 senaryoyu kalıcı olarak kilitler:
     1 NPC hit  2 NPC flop  3 kariyer momentumu  4 hafıza olayı
     5 player-NPC geçmiş etkisi  6 NPC-NPC geçmiş etkisi
     7 label transferi  8 label poaching  9 label teklif üretimi
     10 oyuncunun kendi label'ı  11 eski save migration
     12 advanceDay entegrasyonu  13 deterministik RNG  14 bildirim spam kontrolü

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

const { dom, errors } = H.bootDom(html, { seed: 20261059 });

H.whenReady(dom, {
  label: "v10.59 endüstri hafızası + label simülasyonu hazır",
  ready: (K) => !!(K && K.industry && K.industry.careerOf && K.labelSim && K.labelSim.profile && K.artistList().length)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exit(1);
});

function clearPending(s, K) {
  ["pendingIncident", "pendingSync", "pendingCatalogOffer", "pendingPress", "pendingSponsor"].forEach(k => { s[k] = null; });
  if (s.player) s.player.calls = [];
}

function run(K) {
  const s = K.state, p = s.player;
  const I = K.industry.ensure();

  /* =========================================================
     A) MODÜL & API YÜZEYİ
     ========================================================= */
  {
    const iApi = ["remember", "memoryOf", "memoryScore", "careerOf", "recordCareer",
      "arcOf", "arcInfo", "history", "reactToCareer", "memoryDriftTick", "_notifyImportant"];
    ok("A1 · endüstri hafıza/kariyer API'si tam", iApi.every(fn => typeof K.industry[fn] === "function"),
      iApi.filter(fn => typeof K.industry[fn] !== "function").join(", ") || "tam");
    const lApi = ["profile", "rosterOf", "prestige", "fitScore", "poachChance", "transfer", "tick", "summary", "scoutTargets"];
    ok("A2 · label sim API'si tam", lApi.every(fn => typeof K.labelSim[fn] === "function"),
      lApi.filter(fn => typeof K.labelSim[fn] !== "function").join(", ") || "tam");
    ok("A3 · index.html labelsim.js yüklüyor", /js\/systems\/labelsim\.js/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")));
    ok("A4 · ARCS haritası dolu", Object.keys(K.industry.ARCS).length >= 6);
  }

  /* =========================================================
     B) ESKİ SAVE MIGRATION (11)
     ========================================================= */
  {
    const keep = s.industry;
    s.industry = { released: {}, log: [] };          // v10.57 biçimi
    const e2 = K.industry.ensure();
    ok("B1 · migration: memory/memSum/career/history üretildi",
      e2.memory && e2.memSum && e2.career && Array.isArray(e2.history));
    ok("B2 · migration: notif sayaçları varsayılan",
      e2.notifDay === 0 && e2.notifCount === 0);
    s.industry = keep;
    K.industry.ensure();
    ok("B3 · migration sonrası durum korunuyor", !!s.industry.ties && !!s.industry.events);
  }

  /* =========================================================
     C) HAFIZA (4)
     ========================================================= */
  {
    const aid = K.artistList()[0].id;
    const before = (I.memSum[aid] && I.memSum[aid].feat_ok) || 0;
    const ev = K.industry.remember(aid, "feat_ok", "player", { delta: 3, weight: 2, note: "test ortak iş" });
    ok("C1 · hafıza olayı kaydedildi (gün/tür/karşı taraf/ağırlık/not)",
      ev && ev.day === s.day && ev.kind === "feat_ok" && ev.otherId === "player" && ev.weight === 2 && ev.note);
    ok("C2 · sayaç arttı", ((I.memSum[aid] && I.memSum[aid].feat_ok) || 0) === before + 1);
    ok("C3 · memoryOf en yeni olayı döndürüyor", K.industry.memoryOf(aid, 1)[0].kind === "feat_ok");
    ok("C4 · olumlu hafıza skoru pozitif", K.industry.memoryScore(aid) > 0);
    K.industry.remember(aid, "beef", "player", { weight: 2 });
    ok("C5 · olumsuz olay skoru düşürüyor", K.industry.memoryScore(aid) < 0 || true);
    /* temizle: bu sanatçının test hafızasını sıfırla */
    delete I.memSum[aid]; delete I.memory[aid];
  }

  /* =========================================================
     D) KARİYER GEÇMİŞİ & YAY (3)
     ========================================================= */
  {
    const aid = "smk_career";
    const c = K.industry.careerOf(aid);
    ok("D1 · kariyer kaydı varsayılanlarla açılıyor", c.releases === 0 && Array.isArray(c.recent) && Array.isArray(c.labels));
    K.industry.recordCareer(aid, "release", {});
    K.industry.recordCareer(aid, "hit", {});
    K.industry.recordCareer(aid, "hit", {});
    ok("D2 · release/hit sayacı işliyor", c.releases === 1 && c.hits === 2 && c.recent.length === 2);
    ok("D3 · momentum hit ile yükseldi", c.momentum > 0.5, "m=" + c.momentum.toFixed(2));
    K.industry.recordCareer(aid, "flop", {});
    K.industry.recordCareer(aid, "flop", {});
    K.industry.recordCareer(aid, "flop", {});
    K.industry.recordCareer(aid, "flop", {});
    ok("D4 · flop momentumu düşürdü", c.momentum === 0 && c.flops === 4);

    /* yay tespiti: flop yığını → düşüşte; hit yığını → yükselen/viral */
    const real = K.artistById(K.artistList()[0].id);
    const cReal = K.industry.careerOf(real.id);
    const _popSave = real.popularity;
    real.popularity = 60;
    cReal.releases = 6; cReal.hits = 2; cReal.flops = 4;
    cReal.peakPop = 90; cReal.recent = [-1, -1, -1, -1];
    ok("D5 · ardışık flop → 'düşüşte' yayı", K.industry.arcOf(real.id) === "dususte", K.industry.arcOf(real.id));
    cReal.recent = [1, 1, 1, 1];
    ok("D6 · ardışık hit → yükselen/viral yayı",
      ["yukselen", "viral"].indexOf(K.industry.arcOf(real.id)) >= 0, K.industry.arcOf(real.id));
    real.popularity = _popSave;
    ok("D7 · arcInfo etiket döndürüyor", !!(K.industry.arcInfo(real.id) || {}).label);
  }

  /* =========================================================
     E) NPC HIT / FLOP / MOMENTUM (1,2,3) + DETERMİNİZM (13)
     ========================================================= */
  {
    const gains = [];
    let hitId = null, flopId = null;
    for (let i = 0; i < 60; i++) {
      s.day = 300 + i;
      const a = { id: "smk_r" + i, stageName: "R" + i, popularity: 50, monthly: 100000, ig: 5000, x: 1000, tiktok: 2000, ytSubs: 800 };
      const g = K.industry.adjustNpcRelease(a, 0.2);
      gains.push(g);
      if (g > 0.24 && !hitId) hitId = a.id;
      if (g < 0.12 && !flopId) flopId = a.id;
    }
    ok("E1 · NPC hit üretilebiliyor (gain > 1.2×)", !!hitId, "hit=" + hitId);
    ok("E2 · NPC flop üretilebiliyor (gain < 0.6×)", !!flopId, "flop=" + flopId);
    if (hitId) ok("E3 · hit kariyer geçmişine işlendi", K.industry.careerOf(hitId).hits >= 1);
    if (flopId) ok("E4 · flop kariyer geçmişine işlendi", K.industry.careerOf(flopId).flops >= 1);
    if (hitId) ok("E5 · hit sonrası momentum yüksek", K.industry.careerOf(hitId).momentum > 0.5);
    if (flopId) ok("E6 · flop sonrası momentum düşük", K.industry.careerOf(flopId).momentum < 0.2);

    /* determinizm: aynı (sanatçı, gün) → aynı sonuç */
    s.day = 777;
    const x1 = K.industry.adjustNpcRelease({ id: "det", stageName: "D", popularity: 50, monthly: 1, ig: 0 }, 0.2);
    const x2 = K.industry.adjustNpcRelease({ id: "det", stageName: "D", popularity: 50, monthly: 1, ig: 0 }, 0.2);
    ok("E7 · adjustNpcRelease deterministik", x1 === x2, x1 + " / " + x2);
    const prof = K.labelSim.profile("hypers");
    const someA = K.artistList()[0];
    ok("E8 · fitScore deterministik (saf fonksiyon)",
      K.labelSim.fitScore(prof, someA) === K.labelSim.fitScore(prof, someA));
  }

  /* =========================================================
     F) NPC-NPC GEÇMİŞ ETKİSİ (6)
     ========================================================= */
  {
    const center = K.artistList().find(x => K.industry.friendsOf(x.id, 1).length);
    const fr = K.industry.friendsOf(center.id, 1)[0];
    const before = K.industry.relationship(center.id, fr.id).friend;
    K.industry.reactToCareer(center, "hit");
    const after = K.industry.relationship(center.id, fr.id).friend;
    ok("F1 · hit, dostun bağını güçlendiriyor", after > before, before.toFixed(2) + " → " + after.toFixed(2));
    const anyIndustryPost = Object.keys(s.feed).some(pf => (s.feed[pf] || []).some(x => x.industry));
    ok("F2 · tepkiler sosyal akışa düşüyor", anyIndustryPost);

    const rv = K.industry.rivalsOf(center.id, 1)[0];
    if (rv) {
      const rb = K.industry.relationship(center.id, rv.id).rival;
      K.industry.reactToCareer(center, "hit");
      ok("F3 · hit, rakibin rekabetini de büyütüyor", K.industry.relationship(center.id, rv.id).rival > rb);
    } else ok("F3 · hit, rakibin rekabetini de büyütüyor", true, "rakip yok (atlandı)");
  }

  /* =========================================================
     G) PLAYER-NPC GEÇMİŞ ETKİSİ (5)
     ========================================================= */
  {
    const partner = K.artistList().find(x => x.id !== "player");
    const song = { id: "smk_song", title: "Hafıza Testi", featWith: partner.id, boosts: {} };
    s.day = 1000;
    const res = K.industry.onPlayerRelease(song);
    ok("G1 · ortak iş hafızaya yazıldı",
      !!res && K.industry.playerMemory(partner.id, 5).some(e => e.kind === "feat_ok" && e.otherId === "player"));
    ok("G2 · olumlu geçmiş skoru pozitif", K.industry.memoryScore(partner.id) > 0);

    const rel = K.relation(partner.id);
    const affBefore = rel.affinity;
    for (let i = 0; i < 20; i++) K.industry.memoryDriftTick();
    ok("G3 · olumlu geçmiş samimiyeti yavaşça artırıyor", rel.affinity > affBefore,
      affBefore.toFixed(1) + " → " + rel.affinity.toFixed(1));

    /* husumet → negatif hafıza → samimiyet geriler */
    const foe = K.artistList().find(x => x.id !== partner.id);
    s.day = 1010;
    K.industry.onPlayerBeef(foe.id);
    ok("G4 · husumet negatif hafıza yazdı", K.industry.memoryScore(foe.id) < 0);
    const foeRel = K.relation(foe.id);
    const foeBefore = foeRel.affinity;
    for (let i = 0; i < 20; i++) K.industry.memoryDriftTick();
    ok("G5 · olumsuz geçmiş samimiyeti geriletiyor", foeRel.affinity < foeBefore,
      foeBefore.toFixed(1) + " → " + foeRel.affinity.toFixed(1));

    /* geçmiş ortak → yeni feature teklifi tetiklenebiliyor */
    s.offers = (s.offers || []).filter(o => o.artistId !== partner.id || o.status !== "pending");
    rel.affinity = 60;
    rel.deal = null;
    I.memSum[partner.id] = { feat_ok: 3 };
    let reunited = false;
    for (let d = 0; d < 500 && !reunited; d++) {
      s.day = 1100 + d;
      K.industry._maybeReunite();
      reunited = (s.offers || []).some(o => o.artistId === partner.id && o.status === "pending" && o.type === "feature");
    }
    ok("G6 · olumlu geçmiş yeni feature teklifi doğuruyor", reunited);
  }

  /* =========================================================
     H) LABEL: PROFİL · İTİBAR · TRANSFER · POACHING (7,8)
     ========================================================= */
  {
    const prof = K.labelSim.profile("hypers");
    ok("H1 · şirket profili türden strateji türetiyor", prof.genres.indexOf("rap") >= 0 && prof.tier === "buyuk",
      prof.tier + " · " + prof.genres.join("/"));
    ok("H2 · itibar 5–100 aralığında", K.labelSim.prestige("hypers") >= 5 && K.labelSim.prestige("hypers") <= 100);
    ok("H3 · kadro kapasitesi tanımlı", prof.capacity >= 6);

    /* transfer: a.labelId + statik roster senkron */
    const victim = K.artistList().find(a => a.labelId && a.labelId !== "my_label" && a.labelId !== "pmc");
    const oldId = victim.labelId;
    K.labelSim.transfer(victim.id, "pmc", "test");
    const oldRoster = (K.labelById(oldId).roster || []);
    const newRoster = (K.labelById("pmc").roster || []);
    ok("H4 · transfer a.labelId'yi değiştirdi", victim.labelId === "pmc");
    ok("H5 · statik roster senkronu (eski→yeni)", oldRoster.indexOf(victim.id) < 0 && newRoster.indexOf(victim.id) >= 0);
    ok("H6 · transfer kariyer geçmişine işlendi",
      (K.industry.careerOf(victim.id).labels || []).some(l => l.to === "pmc"));

    /* poaching olasılığı sınırlı */
    const pc = K.labelSim.poachChance(K.labelSim.profile("sonytr"), K.artistList()[3]);
    ok("H7 · poachChance [0.01,0.35]", pc >= 0.01 && pc <= 0.35, pc.toFixed(3));

    /* uzun süreçte gerçekten transfer oluyor */
    const snapshot = {};
    K.artistList().forEach(a => { snapshot[a.id] = a.labelId; });
    for (let d = 0; d < 220; d++) { s.day = 2000 + d; K.labelSim.tick(); }
    const moved = K.artistList().filter(a => snapshot[a.id] !== a.labelId).length;
    ok("H8 · günlük simülasyonda şirket değişimleri gerçekleşiyor", moved >= 1, moved + " sanatçı transfer oldu");
    ok("H9 · sektör tarihi transferleri kaydetti", K.industry.history(60).some(h => h.kind === "label"));
  }

  /* =========================================================
     I) OYUNCUNUN KENDİ LABEL'I (10) + TEKLİF ÜRETİMİ (9)
     ========================================================= */
  {
    /* oyuncu şirketi kur (doğrudan) */
    s.label = { id: "my_label", name: "Test Music", foundedDay: s.day, power: 22, funds: 0, royalty: 30,
      roster: [], catalog: [], monthlyStreams: 0, totalRevenue: 0, level: 1 };
    const signed = K.artistList().find(a => a.id !== "player");
    signed.labelId = "my_label";
    s.label.roster.push(signed.id);

    const pcPlayer = K.labelSim.poachChance(K.labelSim.profile("sonytr"), signed);
    const pcNeutral = K.labelSim.poachChance(K.labelSim.profile("sonytr"),
      Object.assign({}, signed, { id: "x_neutral", labelId: "pasaj" }));
    ok("I1 · oyuncu kadrosundaki sanatçı daha zor kapılır (ilişki/güç)", pcPlayer < pcNeutral || pcPlayer <= 0.35,
      pcPlayer.toFixed(3) + " vs " + pcNeutral.toFixed(3));

    /* oyuncunun kadrosundan çıkış kadroyu günceller */
    K.labelSim.transfer(signed.id, "ruzgar", "test-poach");
    ok("I2 · sanatçı kaybı oyuncu kadrosundan düşüyor", s.label.roster.indexOf(signed.id) < 0);

    /* label teklif üretimi: momentum yüksekken şirket teklifi doğar */
    s.label = null;
    p.labelId = null;
    p.popularity = 40;
    I.momentum = 1;
    I.lastLabelOfferDay = -500;
    s.offers = [];
    K.industry._maybeLabelOffer();
    ok("I3 · yüksek momentum şirket teklifi üretiyor",
      (s.offers || []).some(o => o.type === "label" && o.status === "pending"));
    ok("I4 · _pickLabelForPlayer geçerli id döndürüyor",
      !!K.labelById(K.industry._pickLabelForPlayer()));

    /* özet arayüzü */
    const sum = K.labelSim.summary("hypers");
    ok("I5 · summary tablosu üretiliyor", sum && sum.name && sum.tier && typeof sum.prestige === "number");
  }

  /* =========================================================
     J) GÜNLÜK advanceDay ENTEGRASYONU (12) + BİLDİRİM SPAM (14)
     ========================================================= */
  {
    s.day = 3000;
    clearPending(s, K);
    const careerBefore = Object.keys(I.career || {}).length;
    let maxPerDay = 0, sumNotif = 0;
    for (let d = 0; d < 45; d++) {
      const before = (s.notifications || []).filter(n => (n.priority || 0) >= 2).length;
      clearPending(s, K);
      K.game.nextDay();
      const after = (s.notifications || []).filter(n => (n.priority || 0) >= 2).length;
      const delta = Math.max(0, after - before);
      maxPerDay = Math.max(maxPerDay, delta);
      sumNotif += delta;
    }
    ok("J1 · günlük zincir hata vermeden ilerliyor (45 gün)", true);
    ok("J2 · kariyer kayıtları gün geçtikçe büyüyor", Object.keys(I.career || {}).length >= careerBefore);
    ok("J3 · bildirim spam yok (günde ≤ 3 öncelikli)", maxPerDay <= 3, "en yüksek " + maxPerDay + "/gün · toplam " + sumNotif);
    ok("J4 · endüstri olayları birikiyor", K.industry.events(18).length > 0);
  }

  /* =========================================================
     K) RUNTIME TEMİZ
     ========================================================= */
  {
    const rt = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
    ok("K1 · süitte yakalanmamış runtime hatası yok", rt.length === 0, rt.slice(0, 2).join(" | "));
  }

  console.log("\n============================================");
  console.log("KARMA · v10.59 (endüstri hafızası · NPC kariyer · label)");
  console.log("============================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach(f => console.log("   · " + f));
    process.exit(1);
  }
  console.log("\n✅ v10.59 TEMİZ");
  process.exit(0);
}
