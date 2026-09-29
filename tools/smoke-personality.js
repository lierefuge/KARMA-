/* Kullanım: node tools/smoke-personality.js
   KARMA — KİŞİLİK KATMANI testi (v10.14)

   Neleri doğrular:
   1) Derin kişilik profili: Şehinşah + wegh Rumi için veri var mı,
      alanları eksiksiz mi, `bias` her niyet için sayı mı?
   2) KENDİ SES: İki sanatçı, TANIMLI her niyet için kendi cümlesiyle
      konuşuyor mu? (Genel/havuz cümlesine düşme oranı ölçülür.)
   3) SES AYRIMI: Aynı mesaja Şehinşah ile wegh farklı cevap veriyor mu?
      (çakışma oranı — kendi sesi olmayan bir sanatçıyla karşılaştırma)
   4) AĞIZ TUTARLILIĞI: Şehinşah argo kullanmaz (lan/olm/amına…),
      wegh üretim sözlüğünü kullanır.
   5) KİŞİLİK AĞIRLIĞI: övgü > hakaret, müzik > flört (samimiyet etkisi).
   6) YORUM / DISS: sosyal yorum ve diss satırları sanatçıya özel mi?
   7) ABSÜRT içerik yok: undefined/NaN/boş/şablon artığı yok.

   Not: Çıktı tek dosyalık KARMA-Oyun.html üzerinden test edilir;
   önce `node tools/build-single.js` çalıştırılmalı.
*/
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const ROOT = path.resolve(__dirname, "..");

const FILE = path.join(ROOT, "KARMA-Oyun.html");
if (!fs.existsSync(FILE)) {
  console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js");
  process.exit(1);
}

const html = fs.readFileSync(FILE, "utf8");
/* ============================================================
   v10.18 (B-7) — SABİT SÜRE BEKLEME KALDIRILDI
   Eskiden `setTimeout(run, 2600)` ile "herhâlde hazırdır" deniyordu.
   Yavaş makinede/CI'da yanlış kırmızı, hızlı makinede gereksiz bekleme
   üretiyordu. Artık oyunun GERÇEKTEN boot olması bekleniyor
   (bkz. tools/harness.js → whenReady).
   ============================================================ */
const TEST_SEED = 20261018;
const { dom, errors } = H.bootDom(html, { seed: TEST_SEED });
H.whenReady(dom).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

/* ---------- test girdileri (gerçek DM cümleleri) ---------- */
const CASES = [
  ["greet", "selam"],
  ["howareyou", "nasılsın"],
  ["music", "yeni şarkı ne zaman çıkıyor"],
  ["career", "bana bir tavsiye ver"],
  ["market", "piyasa nasıl gidiyor"],
  ["compliment", "harika olmuş, çok beğendim"],
  ["critique", "sevmedim, vasat"],
  ["insult", "salak"],
  ["feature", "feature yapar mısın"],
  ["money", "kaç para"],
  ["personal", "gerçek adın ne"],
  ["flirt", "seni seviyorum"],
  ["hard", "moralim bozuk"],
  ["news", "gündem ne diyor"],
  ["laugh", "haha"],
  ["thanks", "teşekkürler"],
  ["support", "story paylaştım, destek verdim"],
  ["bye", "görüşürüz"],
  ["hangout", "takılalım mı"],
  ["company", "şirketime gel"],
  ["askmoney", "bana para ver"],
  ["family", "oğlun nasıl"],
  ["health", "uykun nasıl"],
  ["question", "neden böyle oluyor"]
];

/* argo/absürt yasakları
   DİKKAT: JS `\b` Türkçe harfleri (ı, ş, ğ…) kelime karakteri saymaz.
   Bu yüzden "yapılan" gibi kelimeler `\blan\b` desenine takılıyordu.
   Argo kontrolü kelimeye bölerek (Unicode harf sınıfı) yapılır. */
const ARGO_WORDS = new Set(["lan", "olm", "oç", "aq", "amk", "amına", "ananı", "sikeyim", "siktir", "yavşak"]);
const argoHit = (s) => String(s || "").toLocaleLowerCase("tr")
  .split(/[^\p{L}]+/u).some(w => ARGO_WORDS.has(w));
const ARTIFACT = /(undefined|NaN|\[object|%s|\{song\}|\{t\}|\{p\}|null)/;

function run() {
  const win = dom.window, K = win.K;
  const pass = [], fail = [];
  const ok = (name, cond, extra) => (cond ? pass : fail).push(name + (extra ? " — " + extra : ""));
  const uniq = a => Array.from(new Set(a));
  const seen = new Set();
  const ask = (id, text) => {
    const out = K.chat.reply(id, text, { reach: 1 });
    const m = out && out.msgs && out.msgs[0] ? out.msgs[0] : "";
    seen.add(id + "|" + text + "|" + m);
    return { msg: m, delta: out ? out.delta : 0, intent: out ? out.intent : null };
  };

  /* =========================================================
     1) PROFİL VERİSİ
     ========================================================= */
  const IDS = ["sehinsah", "weghrumi"];
  ok("K.npcPersonality motoru yüklendi", !!(K.npcPersonality && K.npcPersonality.byId));
  IDS.forEach(id => {
    const p = K.npcPersonality && K.npcPersonality.byId(id);
    ok("Profil var: " + id, !!p);
    if (!p) return;
    ok("Alan: archetype/" + id, !!p.archetype);
    ok("Alan: essence/" + id, !!p.essence && p.essence.length > 40);
    ok("Alan: loves/" + id, Array.isArray(p.loves) && p.loves.length >= 4);
    ok("Alan: redLines/" + id, Array.isArray(p.redLines) && p.redLines.length >= 3);
    ok("Alan: test kartı/" + id, !!(p.test && p.test.rows && p.test.rows.length >= 4));
    ok("bias her niyet için sayı: " + id,
      Object.keys(p.bias || {}).every(k => typeof p.bias[k] === "number"),
      Object.keys(p.bias || {}).length + " niyet");
    ok("bias: müzik > flört: " + id, p.bias.music > p.bias.flirt);
    ok("bias: övgü > hakaret: " + id, p.bias.compliment > p.bias.insult);
    ok("card() üretilebiliyor: " + id, !!K.npcPersonality.card(id));
  });

  /* =========================================================
     2+3) KENDİ SES ve SES AYRIMI
     ========================================================= */
  const SEP = null; // karşılaştırma: kendi profili olmayan bir sanatçı
  const voices = {};
  IDS.concat(["uzi"]).forEach(id => {
    voices[id] = {};
    CASES.forEach(([intent, text]) => {
      const set = []; let blank = 0, art = 0, bad = 0, long = 0;
      for (let i = 0; i < 12; i++) {
        const r = ask(id, text);
        if (!r.msg || !r.msg.trim()) blank++;
        if (ARTIFACT.test(r.msg)) art++;
        if (r.msg.length > 420) long++;
        if (argoHit(r.msg)) bad++;
        set.push(r.msg);
      }
      voices[id][intent] = uniq(set);
      ok(`Boş cevap yok: ${id}/${intent}`, blank === 0, blank + " boş");
      ok(`Şablon artığı yok: ${id}/${intent}`, art === 0, art + " artık");
      ok(`Makul uzunluk: ${id}/${intent}`, long === 0, long + " uzun");
  });
  });

  /* argo yalnızca 'argo' etiketli profilde olmalı */
  ["sehinsah", "weghrumi"].forEach(id => {
    const all = Object.keys(voices[id]).flatMap(k => voices[id][k]).join(" \n ");
    ok(`Argo yok (ağız tutarlı): ${id}`, !argoHit(all));
  });

  /* iki sanatçı aynı mesaja aynı cevabı vermemeli */
  let overlap = 0, compared = 0;
  CASES.forEach(([intent]) => {
    const a = new Set(voices.sehinsah[intent] || []);
    const b = new Set(voices.weghrumi[intent] || []);
    if (!a.size || !b.size) return;
    compared++;
    const shared = Array.from(a).filter(x => b.has(x)).length;
    if (shared > 0) overlap++;
  });
  ok("İki sanatçı kendi sesiyle konuşuyor (çakışma yok)",
    overlap === 0, `${compared} niyet karşılaştırıldı, ${overlap} çakışma`);

  /* profil sahibi sanatçı, genel havuza düşen sanatçıdan ayrışmalı */
  IDS.forEach(id => {
    let shared = 0, total = 0;
    CASES.forEach(([intent]) => {
      const a = voices[id][intent] || [];
      const b = new Set(voices.uzi[intent] || []);
      a.forEach(x => { total++; if (b.has(x)) shared++; });
    });
    const ratio = total ? shared / total : 1;
    ok(`Genel havuza düşmüyor: ${id}`, ratio <= 0.25,
      `benzerlik %${Math.round(ratio * 100)} (${shared}/${total})`);
  });

  /* wegh üretim sözlüğünü kullanmalı (kayıt/mix/beat/sound) */
  const weghAll = CASES.flatMap(([i]) => voices.weghrumi[i] || []).join(" ");
  ok("wegh üretim sözlüğü kullanıyor",
    /(kayıt|mix|beat|sound)/i.test(weghAll));

  /* Şehinşah ölçülü ton: samimiyetsiz 'kanka' ağzı yok */
  const sehAll = CASES.flatMap(([i]) => voices.sehinsah[i] || []).join(" ");
  ok("Şehinşah ölçülü ton (kanka/lan yok)",
    !String(sehAll).toLocaleLowerCase("tr").split(/[^\p{L}]+/u).some(w => w === "kanka" || w === "lan" || w === "olm"));

  /* =========================================================
     5) KİŞİLİK AĞIRLIĞI (delta)
     ========================================================= */
  IDS.forEach(id => {
    const avg = (text, n) => {
      let s = 0;
      for (let i = 0; i < 10; i++) s += (ask(id, text).delta || 0);
      return s / 10;
    };
    const ovgu = avg("harika olmuş, çok beğendim");
    const hakaret = avg("salak");
    const muzik = avg("yeni şarkı ne zaman çıkıyor");
    const flirt = avg("seni seviyorum");
    ok(`Övgü > hakaret: ${id}`, ovgu > hakaret, `${ovgu.toFixed(2)} vs ${hakaret.toFixed(2)}`);
    ok(`Müzik > flört: ${id}`, muzik > flirt, `${muzik.toFixed(2)} vs ${flirt.toFixed(2)}`);
  });

  /* =========================================================
     6) YORUM ve DISS
     ========================================================= */
  const song = { title: "Test Parçası" };
  IDS.forEach(id => {
    const praise = K.chat.reaction(id, "praise", song);
    const shade = K.chat.reaction(id, "shade", song);
    ok(`Yorum üretiliyor: ${id}/praise`, !!praise && praise.indexOf("Test Parçası") >= 0);
    ok(`Yorum üretiliyor: ${id}/shade`, !!shade && shade.indexOf("Test Parçası") >= 0);
    ok(`Yorumda şablon artığı yok: ${id}`, !ARTIFACT.test(praise + " " + shade));
    const d = K.chat.diss(id, "TestRapçi");
    ok(`Diss üretiliyor: ${id}`, !!d && d.indexOf("TestRapçi") >= 0);
    ok(`Diss'te argo yok: ${id}`, !argoHit(d));
  });

  /* yorumlar sanatçıya özel olmalı */
  const rSeh = new Set(Array.from({ length: 8 }, () => K.chat.reaction("sehinsah", "praise", song)));
  const rWgh = new Set(Array.from({ length: 8 }, () => K.chat.reaction("weghrumi", "praise", song)));
  const sharedR = Array.from(rSeh).filter(x => rWgh.has(x)).length;
  ok("Yorumlar sanatçıya özel", sharedR === 0, sharedR + " çakışma");

  /* =========================================================
     7) KİŞİLİK KARTI GÖRÜNÜMÜ
     ========================================================= */
  IDS.forEach(id => {
    let rendered = "";
    try {
      rendered = K.phone.appById("instagram").profileHTML(id, "posts") || "";
    } catch (e) { errors.push("profileHTML hatası: " + e.message); }
    ok(`Profilde kişilik kartı: ${id}`, /ig-persona/.test(rendered) && /ig-persona-code/.test(rendered));
    ok(`Kişilik kartı içeriği: ${id}`,
      rendered.indexOf(K.npcPersonality.byId(id).code) >= 0 &&
      rendered.indexOf(K.npcPersonality.byId(id).test.title) >= 0);
  });

  /* ------------------------------------------------ SONUÇ ------ */
  const total = pass.length + fail.length;
  console.log("\n================= SONUÇ ==================");
  console.log(`Değerlendirilen kontrol: ${total}`);
  console.log(`Geçen: ${pass.length} · Kalan: ${fail.length} · Runtime hata: ${errors.length}`);
  console.log(`Üretilen farklı cevap (tekrar sayacı): ${seen.size}`);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ KONTROLLER");
    fail.forEach(f => console.log("   · " + f));
  }
  if (errors.length) {
    console.log("\n⚠️ RUNTIME HATALARI");
    uniq(errors).slice(0, 12).forEach(e => console.log("   · " + e));
  }
  if (!fail.length && !errors.length) {
    console.log("\n✅ KİŞİLİK KATMANI TEMİZ — iki sanatçı kendi sesiyle konuşuyor");
  } else {
    process.exitCode = 1;
  }
}
