/* Kullanım: node tools/smoke-v1052.js
   KARMA — v10.52 GÜNDELİK RUTİN + ANLAYAN DM + FT İŞLEME.

   A) ZAMAN + RUTİN    — oyun-içi saat, kronotip (gece/gündüz),
                         müsaitlik, gecikme, "müsait değil" yanıtı
   B) ANLAYAN KATMAN   — çoklu niyet, varlık (şarkı/sanatçı/para/zaman),
                         duygu tonu, ÖĞRENEN sözlük
   C) FT İŞLEME        — DM'de feature anlaşması kalıcı işlenir;
                         sanatçı tekrar teklif göndermez
   D) TUTARLILIK       — "nasılsın" gerçek duruma göre cevap verir;
                         cevaplarda undefined/NaN yok
   E) ARAYÜZ           — DM başlığı rutin rozeti + saat basar

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

const { dom, errors } = H.bootDom(html, { seed: 20261052 });

H.whenReady(dom, {
  label: "v10.52 rutin + anlayan DM hazır",
  ready: (K) => !!(K && K.time && K.routine && K.dmAI && K.chat && K.relations)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

async function run() {
  const K = dom.window.K;

  const fresh = (day) => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.balance = 50000000;
    K.state.day = day == null ? 10 : day;
    return K.state;
  };

  /* türü belirli, OVERRIDE'da olmayan sanatçılar seç */
  const trapId = (K.artistList().find(a => a.genre === "trap" &&
    ["uzi", "ezhel", "murda", "khontkar", "lilzey", "sehinsah", "weghrumi", "lierefuge", "liashine"].indexOf(a.id) < 0) || {}).id;
  const popId = (K.artistList().find(a => a.genre === "pop" &&
    ["hadise", "edis", "sila", "aleynatilki"].indexOf(a.id) < 0) || {}).id;

  /* ============ A) ZAMAN + RUTİN ============ */
  {
    fresh(10);
    ok("A-0 · time modülü yüklendi", !!(K.time && K.time.label));
    ok("A-0 · routine modülü yüklendi", !!(K.routine && K.routine.status));
    ok("A-1 · saat HH:MM biçiminde", /^\d{2}:\d{2}$/.test(K.time.label()), K.time.label());
    const h = K.time.hour();
    ok("A-1 · saat 0-23 aralığında", h >= 0 && h < 24, h);

    ok("A-2 · trap sanatçısı gece kuşu", K.routine.chronotype(trapId).key === "gece", trapId + " → " + K.routine.chronotype(trapId).key);
    ok("A-2 · pop sanatçısı gündüzcü", K.routine.chronotype(popId).key === "gunduz", popId + " → " + K.routine.chronotype(popId).key);

    /* gece sanatçısının uyuduğu bir gün bul (saat türetimi) */
    let asleepDay = null, awakeDay = null;
    for (let d = 0; d < 40; d++) {
      K.state.day = d;
      const st = K.routine.status(trapId);
      if (asleepDay == null && st.key === "uyuyor") asleepDay = d;
      if (awakeDay == null && st.key === "musait") awakeDay = d;
      if (asleepDay != null && awakeDay != null) break;
    }
    ok("A-3 · gece sanatçısı gündüz uyuyor", asleepDay != null, "gün " + asleepDay);
    ok("A-3 · gece sanatçısı gece müsait", awakeDay != null, "gün " + awakeDay);

    K.state.day = asleepDay != null ? asleepDay : 0;
    const stA = K.routine.status(trapId);
    ok("A-3 · müsaitlik 0-1 arasında", stA.available > 0 && stA.available <= 1, stA.available);
    const ar = K.routine.autoReply(trapId);
    ok("A-4 · müsait değilken otomatik yanıt üretir", typeof ar === "string" && ar.length > 4, ar);

    K.state.day = awakeDay != null ? awakeDay : 15;
    ok("A-4 · müsaitken otomatik yanıt yok", K.routine.autoReply(trapId) === null);
    ok("A-5 · gecikme pozitif", K.routine.replyWait(trapId) > 0);
    ok("A-5 · durum özeti alanları tam", (() => { const s = K.routine.summary(trapId); return s && s.chrono && s.status && s.statusLabel; })());
  }

  /* ============ B) ANLAYAN KATMAN ============ */
  {
    fresh(10);
    const an = K.dmAI.analyze("selam nasılsın", "sehinsah");
    ok("B-0 · analiz nesnesi döner", !!(an && an.primary && an.entities && an.tone), an && an.primary);

    const e1 = K.dmAI.entities("sana 5000 tl veririm", "sehinsah");
    ok("B-1 · para miktarı çıkarılır", e1.money === 5000, e1.money);
    const e2 = K.dmAI.entities("5 bin lira bütçem var", "sehinsah");
    ok("B-1 · '5 bin lira' = 5000", e2.money === 5000, e2.money);

    const other = K.artistList().find(a => a.id !== "sehinsah");
    const e3 = K.dmAI.entities("bence " + other.stageName + " ile iş yapmalısın", "sehinsah");
    ok("B-2 · geçen sanatçı adı yakalanır", e3.artists.length > 0, e3.artists[0]);

    ok("B-3 · öfkeli ton", K.dmAI.tone("bu çok berbat, nefret ettim") === "ofkeli");
    ok("B-3 · üzgün ton", K.dmAI.tone("çok yalnızım, dibe vurdum") === "uzgun");
    ok("B-3 · nötr ton", K.dmAI.tone("yarın stüdyoya geliyorum") === "notr" || K.dmAI.tone("yarın stüdyoya geliyorum") === "aceleci");

    /* ÖĞRENME: yeni bir kelimeyi niyete bağla, sonra tanısın */
    for (let i = 0; i < 3; i++) K.dmAI.learn("zumbara ritmi yapalım", "music");
    ok("B-4 · öğrenilen kelimeden niyet çıkar", K.dmAI.learnedIntent("zumbara") === "music", K.dmAI.learnedIntent("zumbara"));
    ok("B-4 · öğrenme istatistiği artar", K.dmAI.stats().words > 0, JSON.stringify(K.dmAI.stats()));
    ok("B-4 · sözlük kayıtta saklanır", !!(K.state.dmLex && Object.keys(K.state.dmLex).length));
  }

  /* ============ C) FT İŞLEME ============ */
  {
    fresh(10);
    const id = "sehinsah";
    K.relation(id).affinity = 85;   // Feature Teklifi aşaması
    K.relation(id).met = true;
    const out = K.chat.reply(id, "seninle feature yapalım mı?", { reach: 1 });
    const rel = K.relation(id);
    ok("C-1 · DM'de feature anlaşması kaydedilir", !!(rel.deal && rel.deal.type === "feature" && rel.deal.status === "pending"),
      rel.deal && rel.deal.status);
    ok("C-2 · 'featureTalked' işaretlenir", rel.flags.featureTalked === true);
    const txt = (out.msgs || []).join(" ").toLocaleLowerCase("tr");
    ok("C-3 · cevap anlaşmaya atıf yapar", /stüdyo|anlaş|buton/.test(txt), out.msgs[0].slice(0, 60));

    /* kalıcı anlaşma kaydı */
    K.relations._recordDeal(id, "feature", { songTitle: "Test Şarkı" });
    ok("C-4 · anlaşma 'agreed' olur", rel.deal.status === "agreed" && rel.flags.feature === true);
    ok("C-4 · hafızaya söz olarak yazılır", (() => { const m = K.npcMind.mind(id); return m.promises.some(p => /Test Şarkı/.test(p.text)); })());

    /* günlük tick aynı sanatçıdan tekrar feature teklifi üretmemeli */
    fresh(10);
    K.artistList().forEach(a => {
      const r = K.relation(a.id); r.met = true; r.affinity = 85; r.discovered = true;
    });
    K.relation(id).deal = { type: "feature", status: "pending", day: 10 };
    K.relation(id).flags.featureTalked = true;
    let repeated = 0;
    for (let i = 0; i < 120; i++) {
      K.state.day = 10 + i;
      K.relations.dailyTick();
      if ((K.state.offers || []).some(o => o.artistId === id && o.type === "feature" && o.status === "pending")) repeated++;
    }
    ok("C-5 · anlaşma varken tekrar teklif gelmez", repeated === 0, "tekrar:" + repeated);
  }

  /* ============ D) TUTARLILIK ============ */
  {
    fresh(10);
    const id = "liashine";
    K.relation(id).affinity = 40; K.relation(id).met = true;
    const r1 = K.chat.reply(id, "naber nasılsın?", { reach: 1 });
    const t1 = (r1.msgs || []).join(" ");
    ok("D-1 · 'nasılsın'a dolu cevap", t1.length > 4 && !/undefined|NaN/.test(t1), t1.slice(0, 50));
    ok("D-1 · niyet howareyou", r1.intent === "howareyou", r1.intent);

    /* aynı mesaja farklı durumda farklı cevap (bağlam farkındalığı) */
    K.state.day = 0;
    const a0 = K.chat.reply(id, "naber nasılsın?", { reach: 1 }).msgs.join(" ");
    K.state.day = 25;
    const a1 = K.chat.reply(id, "naber nasılsın?", { reach: 1 }).msgs.join(" ");
    ok("D-2 · cevap duruma göre değişir", a0 !== a1, a0.slice(0, 28) + " | " + a1.slice(0, 28));

    /* rastgele bir dizi mesajda undefined/NaN olmamalı */
    let bad = null;
    ["selam", "feature yapalım", "5000 tl bütçem var", "kötüyüm bugün", "haha", "görüşürüz"].forEach(t => {
      const o = K.chat.reply(id, t, { reach: 1 });
      const s = (o.msgs || []).join(" ");
      if (/undefined|NaN/.test(s)) bad = t + " → " + s;
    });
    ok("D-3 · cevaplarda undefined/NaN yok", !bad, bad || "");
  }

  /* ============ E) ARAYÜZ ============ */
  {
    fresh(10);
    const id = "sehinsah";
    K.relation(id).met = true;
    const app = K.phone.appById("messages");
    const html2 = app.conversation(id).render();
    ok("E-1 · DM başlığı rutin rozeti basar", html2.indexOf("dm-routine") >= 0);
    ok("E-2 · DM başlığı ruh hali rozeti basar", html2.indexOf("dm-mood") >= 0);
    ok("E-3 · DM başlığı saat basar", html2.indexOf("dm-clock") >= 0);
  }

  /* ---- rapor ---- */
  console.log("==========================================================");
  console.log("KARMA · v10.52 GÜNDELİK RUTİN + ANLAYAN DM + FT İŞLEME");
  console.log("==========================================================");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); process.exitCode = 1; }
  else console.log("\n✅ RUTİN + ANLAYAN DM TEMİZ");
  if (errors && errors.length) {
    console.log("\n⚠ tarayıcı hataları (" + errors.length + "):");
    errors.slice(0, 6).forEach(e => console.log("   · " + String(e).slice(0, 140)));
  }
}
