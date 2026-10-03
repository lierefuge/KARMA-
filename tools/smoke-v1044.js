/* Kullanım: node tools/smoke-v1044.js
   KARMA — v10.44 Prodüksiyon Süreci: kayıt oturumu · mix · master · revizyon.

   A) MOTOR     — oturum/mix/master seçenekleri, maliyet, gün, puan,
                  revizyon azalan verim, deterministik mix notları
   B) ARAYÜZ    — "Kayıt & Mix Süreci" bloğu, seçim düğmeleri, revizyon
                  kararı, kabul/revize akışı
   C) ENTEGRASYON — süreç kaliteyi yukarı çeker, maliyete girer ve yayına
                  prodPlan olarak işlenir

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

const { dom, errors } = H.bootDom(html, { seed: 20261044 });

H.whenReady(dom, {
  label: "v10.44 prodüksiyon süreci hazır",
  ready: (K) => !!(K && K.production && K.production.defaultPlan && K.PROD && K.PROD.SESSIONS)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const doc = dom.window.document;
  const P = K.production;

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

  /* ============ A) MOTOR ============ */
  ok("A-0 · prodüksiyon modülü yüklendi", !!(K.PROD && P && P.resolve && P.issues));
  ok("A-0 · 3 kayıt oturumu", K.PROD.SESSIONS.length === 3, K.PROD.SESSIONS.length);
  ok("A-0 · 3 mix seçeneği", K.PROD.MIXES.length === 3, K.PROD.MIXES.length);
  ok("A-0 · 3 master seçeneği", K.PROD.MASTERS.length === 3, K.PROD.MASTERS.length);
  ok("A-0 · mix notları tanımlı", K.PROD.ISSUES.length >= 4, K.PROD.ISSUES.length);

  {
    const d = P.defaultPlan();
    ok("A-1 · varsayılan plan katman/stüdyo/dijital",
      d.session === "katman" && d.mix === "studyo" && d.master === "dijital",
      JSON.stringify(d));
    ok("A-1 · varsayılan revizyon 0", d.revisions === 0 && d.accepted === false);

    const n = P.normalize({ session: "yok", mix: "xyz", master: null, revisions: 99 });
    ok("A-2 · geçersiz id varsayılana döner",
      n.session === "katman" && n.mix === "studyo" && n.master === "dijital");
    ok("A-2 · revizyon üst sınıra kırpılır", n.revisions === P.maxRevisions(), n.revisions);
    ok("A-2 · negatif revizyon 0'a iner", P.normalize({ revisions: -3 }).revisions === 0);

    /* maliyet = seçilenlerin toplamı */
    const cheap = { session: "tek", mix: "kendin", master: "yok", revisions: 0 };
    const rich = { session: "profesyonel", mix: "usta", master: "analog", revisions: 0 };
    ok("A-3 · en ucuz plan maliyetsiz", P.cost(cheap) === 0, P.cost(cheap));
    ok("A-3 · en pahalı plan maliyetli", P.cost(rich) === 18000 + 22000 + 9000, P.cost(rich));
    ok("A-3 · revizyon maliyeti eklenir",
      P.cost({ session: "tek", mix: "kendin", master: "yok", revisions: 1 }) === P.revisionCost(),
      P.cost({ session: "tek", mix: "kendin", master: "yok", revisions: 1 }));

    /* gün */
    ok("A-4 · en ucuz plan aynı gün", P.days(cheap) === 0, P.days(cheap));
    ok("A-4 · en pahalı plan en yavaş", P.days(rich) === 5 + 6 + 4, P.days(rich));
    ok("A-4 · revizyon gecikme ekler",
      P.days({ session: "tek", mix: "kendin", master: "yok", revisions: 2 }) === 4,
      P.days({ session: "tek", mix: "kendin", master: "yok", revisions: 2 }));

    /* revizyon azalan verim */
    ok("A-5 · revizyonsuz bonus 0", P.revisionBonus(0) === 0);
    ok("A-5 · ilk revizyon 5 puan", P.revisionBonus(1) === 5, P.revisionBonus(1));
    ok("A-5 · ikinci revizyon 8 puan", P.revisionBonus(2) === 8, P.revisionBonus(2));
    ok("A-5 · azalan verim (artış küçülür)", (P.revisionBonus(1) - P.revisionBonus(0)) > (P.revisionBonus(2) - P.revisionBonus(1)));
    ok("A-5 · en fazla 2 revizyon", P.maxRevisions() === 2);

    /* mix notları deterministik */
    const seed = "Test Şarkı";
    const i1 = P.issues({ mix: "kendin" }, seed).map(x => x.id).join(",");
    const i2 = P.issues({ mix: "kendin" }, seed).map(x => x.id).join(",");
    ok("A-6 · mix notları deterministik", i1 === i2 && i1.length > 0, i1);
    const risky = P.issues({ mix: "kendin" }, seed).length;
    const clean = P.issues({ mix: "usta" }, seed).length;
    ok("A-6 · riskli mix daha çok sorun", risky > clean, risky + " > " + clean);
    const revised = P.issues({ mix: "kendin", revisions: 1 }, seed).length;
    ok("A-6 · revizyon bir sorunu kapatır", revised < risky, revised + " < " + risky);

    /* resolve: kalite + puan */
    const cheapR = P.resolve(cheap);
    const richR = P.resolve(rich);
    ok("A-7 · en ucuz plan vokal kazancı yok", cheapR.vocalQ === 0, cheapR.vocalQ);
    ok("A-7 · stüdyo oturumu vokal kazandırır", richR.vocalQ > 0, richR.vocalQ);
    ok("A-7 · master yok mix'i geriye çeker", cheapR.mixQ < 0, cheapR.mixQ);
    ok("A-7 · usta mix + analog master yüksek", richR.mixQ >= 20, richR.mixQ);
    ok("A-8 · pahalı plan daha yüksek üretim puanı", richR.score > cheapR.score,
      richR.score + " > " + cheapR.score);
    ok("A-8 · puan 0-100 arası", richR.score <= 100 && cheapR.score >= 0);
    ok("A-8 · resolve etiketleri taşır",
      richR.labels.session === "Stüdyo oturumu" && richR.labels.mix === "Usta mix" && richR.labels.master === "Analog master",
      JSON.stringify(richR.labels));
    ok("A-8 · revizyon puanı yükseltir",
      P.resolve({ mix: "studyo", revisions: 1 }).score > P.resolve({ mix: "studyo", revisions: 0 }).score);
  }

  /* ============ B) ARAYÜZ ============ */
  {
    const st = openStudio(1, 2);
    ok("B-0 · _studio.prod varsayılan planla açılır",
      st.prod && st.prod.session === "katman" && st.prod.mix === "studyo",
      st.prod ? JSON.stringify(st.prod) : "yok");

    const body = doc.querySelector(".st-step-body") || doc.body;
    const txt = body.textContent || "";
    ok("B-1 · 'Kayıt & Mix Süreci' bloğu var", /Kayıt & Mix Süreci/.test(txt));
    ok("B-1 · kayıt oturumu başlığı", /Kayıt oturumu/.test(txt));
    ok("B-1 · revizyon kararı başlığı", /Revizyon kararı/.test(txt));
    ok("B-2 · oturum seçim düğmeleri", doc.querySelectorAll('[data-act="prod-session"]').length === 3);
    ok("B-2 · mix seçim düğmeleri", doc.querySelectorAll('[data-act="prod-mix"]').length === 3);
    ok("B-2 · master seçim düğmeleri", doc.querySelectorAll('[data-act="prod-master"]').length === 3);
    ok("B-2 · kabul düğmesi", doc.querySelectorAll('[data-act="prod-accept"]').length === 1);
    ok("B-2 · revize düğmesi", doc.querySelectorAll('[data-act="prod-revise"]').length === 1);
    ok("B-3 · varsayılan seçim işaretli", doc.querySelectorAll('[data-act="prod-session"].on').length === 1);
    ok("B-3 · mix notları görünür", doc.querySelectorAll(".prod-note").length >= 1,
      doc.querySelectorAll(".prod-note").length);

    /* seçim değiştir */
    click("prod-session", "profesyonel");
    ok("B-4 · oturum seçimi değişir", K.careerUI._studio.prod.session === "profesyonel",
      K.careerUI._studio.prod.session);
    click("prod-master", "analog");
    ok("B-4 · master seçimi değişir", K.careerUI._studio.prod.master === "analog");

    /* revizyon akışı */
    click("prod-revise");
    ok("B-5 · revize isteği revizyonu artırır", K.careerUI._studio.prod.revisions === 1,
      K.careerUI._studio.prod.revisions);
    click("prod-revise");
    click("prod-revise");
    ok("B-5 · revizyon üst sınırda durur", K.careerUI._studio.prod.revisions === 2,
      K.careerUI._studio.prod.revisions);
    ok("B-5 · üst sınırda düğme pasif", doc.querySelector('[data-act="prod-revise"]').disabled === true);

    /* mix değişince revizyon sıfırlanır */
    click("prod-mix", "kendin");
    ok("B-6 · mix değişince revizyon sıfırlanır", K.careerUI._studio.prod.revisions === 0,
      K.careerUI._studio.prod.revisions);

    /* kabul */
    click("prod-accept");
    ok("B-6 · mix kabul edildi işaretlenir", K.careerUI._studio.prod.accepted === true);
    ok("B-6 · kabul sonrası metin değişir", /kabul edildi/i.test(doc.body.textContent));

    /* özet satırı */
    K.careerUI.updateStudioEstimate();
    const info = doc.getElementById("st-prod-info");
    ok("B-7 · üretim özet satırı dolar", info && info.textContent.length > 10,
      info ? info.textContent.slice(0, 40) : "yok");
    ok("B-7 · özet zinciri gösterir", /→/.test(info ? info.textContent : ""));
    ok("B-7 · özet üretim puanı gösterir", /üretim puanı/.test(info ? info.textContent : ""));
  }

  /* ============ C) ENTEGRASYON ============ */
  {
    /* ucuz plan */
    let st = openStudio(1, 6);
    st.distributor = "karma";
    st.prod = { session: "tek", mix: "kendin", master: "yok", revisions: 0, accepted: false };
    K.careerUI.collectStudio();
    K.careerUI.createReleaseFromStudio();
    const relCheap = K.state.player.releases[K.state.player.releases.length - 1];
    ok("C-1 · yayın oluştu", !!relCheap, relCheap ? relCheap.title : "yok");
    ok("C-1 · prodPlan yayına işlendi", relCheap && relCheap.prodPlan && relCheap.prodPlan.session === "tek",
      relCheap && relCheap.prodPlan ? relCheap.prodPlan.session : "yok");

    /* pahalı plan */
    st = openStudio(1, 6);
    st.distributor = "karma";
    st.prod = { session: "profesyonel", mix: "usta", master: "analog", revisions: 2, accepted: true };
    K.careerUI.collectStudio();
    K.careerUI.createReleaseFromStudio();
    const relRich = K.state.player.releases[K.state.player.releases.length - 1];
    ok("C-2 · pahalı süreç daha maliyetli", relRich && relCheap && relRich.cost > relCheap.cost,
      relRich && relCheap ? (relRich.cost + " > " + relCheap.cost) : "—");
    ok("C-2 · fark süreç maliyetini yansıtır",
      relRich && relCheap && (relRich.cost - relCheap.cost) >= 20000,
      relRich && relCheap ? (relRich.cost - relCheap.cost) : "—");
    ok("C-2 · üretim puanı yayına işlendi",
      relRich && relRich.prodPlan && relRich.prodPlan.score > 0, relRich && relRich.prodPlan ? relRich.prodPlan.score : "—");

    ok("C-3 · süreç vokal kalitesini yükseltir", relRich.vocalQuality > relCheap.vocalQuality,
      relRich.vocalQuality + " > " + relCheap.vocalQuality);
    ok("C-3 · süreç mix kalitesini yükseltir", relRich.mixQuality > relCheap.mixQuality,
      relRich.mixQuality + " > " + relCheap.mixQuality);
    ok("C-3 · kalite 0-100 aralığında", relRich.mixQuality <= 100 && relCheap.mixQuality >= 0);
    ok("C-3 · prodPlan kalite kazancını taşır",
      relRich.prodPlan && relRich.prodPlan.revisions === 2);
  }

  /* ============ D) ÇIKIŞ GÜNÜ TUTARLILIĞI ============ */
  {
    const st = openStudio(1, 6);
    st.wait = 18;
    const day = K.state.day;
    const sel = doc.getElementById("st-weekday");
    const seen = {};
    ok("D-0 · hedef gün seçicisi var", !!sel);
    for (const w of [5, 4, 1, 0]) {
      sel.value = String(w);
      sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      K.careerUI.updateStudioEstimate();
      const sum = doc.querySelector("#st-summary");
      const txt = sum ? sum.textContent : "";
      const m = txt.match(/ÇıkışGün\s*(\d+)/);
      const shown = m ? +m[1] : null;
      const expected = K.meta.snapToWeekday(day + 18, w);
      seen[w] = shown;
      ok("D-1 · hedef " + K.meta.WEEKDAYS[w] + " → özet doğru günü gösterir",
        shown === expected, shown + " ≈ " + expected);
      ok("D-2 · hedef " + K.meta.WEEKDAYS[w] + " → hafta günü doğru",
        K.meta.weekdayOf(expected) === w, K.meta.weekdayName(expected));
    }
    const vals = Object.keys(seen).map(k => seen[k]);
    ok("D-3 · farklı hedef günler farklı çıkış günü verir",
      new Set(vals).size === vals.length, JSON.stringify(seen));
    ok("D-3 · plannedRelDay tek kaynak",
      K.careerUI.plannedRelDay({ wait: 18, releaseWeekday: 5 }) === K.meta.snapToWeekday(day + 18, 5));

    /* gerçek yayın da aynı mantığı kullanır */
    st.releaseWeekday = 1;                 // Pazartesi
    st.distributor = "karma";
    const before = K.state.player.releases.length;
    K.careerUI.collectStudio();
    K.careerUI.createReleaseFromStudio();
    const rel = K.state.player.releases[K.state.player.releases.length - 1];
    ok("D-4 · yayın oluştu", K.state.player.releases.length === before + 1 && !!rel);
    if (rel) {
      ok("D-4 · yayın hafta günü kayda işlendi",
        rel.releaseWeekday === K.meta.weekdayOf(rel.startDay + rel.waitDays),
        rel.releaseWeekday + " = " + K.meta.weekdayOf(rel.startDay + rel.waitDays));
      ok("D-4 · hazırlık süresi en az wait", rel.waitDays >= 18, rel.waitDays);
    }
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.44 PRODÜKSİYON SÜRECİ (KAYIT · MIX · REVİZYON)");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ PRODÜKSİYON SÜRECİ TEMİZ · KAYIT + MIX + MASTER + REVİZYON");
  else process.exitCode = 1;
}
