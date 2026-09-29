/* Kullanım: node tools/smoke-certifications.js
   KARMA — PLAK + WRAPPED testi (v10.23)

   A) VERİ: kademeler artan mı, etkiler pozitif mi?
   B) İLERLEME: sıradaki plak ve yüzde doğru hesaplanıyor mu?
   C) BEKLEYEN: hak edilmiş ama verilmemiş kademeler doğru mu?
   D) ÖDÜL: plak kaydı, kalıcı çarpan, itibar, bildirim üretiliyor mu?
   E) DENETİM: tick eşiği aşan şarkıya plak veriyor mu, İKİ KEZ vermiyor mu?
   F) ALBÜM: toplam dinlenmeden albüm plağı geliyor mu?
   G) ÖZET: sayaçlar tutarlı mı?
   H) WRAPPED: yıl tamamlanınca bir kez üretiliyor mu, kartları dolu mu?
   I) GÜVENLİK: eksik veriyle çökmüyor mu?

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
const { dom, errors } = H.bootDom(html, { seed: 20261023 });

H.whenReady(dom, { label: "plak motoru hazır", ready: K => !!(K && K.certifications && K.yearwrap) })
  .then(run).catch((err) => { console.error("test çöktü: " + (err && err.message ? err.message : err)); process.exitCode = 1; });

function run() {
  const K = dom.window.K, s = K.state, p = s.player;

  /* A) VERİ */
  ok("A · üç kademe", K.certifications.TIERS.length === 3);
  ok("A · eşikler artan", (() => { const T = K.certifications.TIERS; for (let i = 1; i < T.length; i++) if (T[i].streams <= T[i - 1].streams) return false; return true; })());
  ok("A · etkiler pozitif", K.certifications.TIERS.every(t => t.mult > 0 && t.rep > 0 && t.award > 0));
  ok("A · Yearwrap takvimi 360", K.yearwrap.YEAR === 360);

  /* B) İLERLEME */
  {
    const pr0 = K.certifications.progress(0);
    ok("B · sıfır dinlenmede sıradaki Altın", pr0.next && pr0.next.id === "gold", pr0.next ? pr0.next.name : "yok");
    const pr1 = K.certifications.progress(500_000);
    ok("B · yarıda yüzde ~50", pr1.pct === 50, pr1.pct + "%");
    const pr2 = K.certifications.progress(1_500_000);
    ok("B · Altın geçilince sıradaki Platin", pr2.next && pr2.next.id === "platinum");
    const pr3 = K.certifications.progress(30_000_000);
    ok("B · hepsi geçilince sıradaki yok", pr3.next === null);
  }

  /* C) BEKLEYEN */
  {
    const sg = { id: "sg_c1", title: "Test Şarkı", streams: 6_000_000, dailyStreams: 1000, certifications: [] };
    const pend = K.certifications.pendingFor(sg);
    ok("C · 6M → Altın ve Platin bekliyor", pend.length === 2 && pend[0].id === "gold" && pend[1].id === "platinum", pend.map(x => x.id).join(","));
    sg.certifications = ["gold"];
    ok("C · verilen kademe tekrar beklemiyor", K.certifications.pendingFor(sg).length === 1);
  }

  /* D) ÖDÜL */
  {
    const before = { rep: p.reputation || 0, plaques: K.certifications.list().length };
    const sg = { id: "sg_c2", title: "Plaklı Şarkı", streams: 1_200_000, dailyStreams: 1000, certifications: [] };
    const rec = K.certifications.award("song", sg, K.certifications.tier("gold"));
    ok("D · kayıt döndü", !!rec && rec.tier === "gold" && rec.title === "Plaklı Şarkı");
    ok("D · şarkıya kademe yazıldı", sg.certifications.indexOf("gold") >= 0);
    ok("D · günlük dinlenme çarpanlandı", sg.dailyStreams > 1000, "1000 → " + Math.round(sg.dailyStreams));
    ok("D · kalıcı çarpan kaydedildi", sg.plaqueMult > 1, "×" + sg.plaqueMult);
    ok("D · itibar arttı", (p.reputation || 0) > before.rep);
    ok("D · duvara eklendi", K.certifications.list().length === before.plaques + 1);
    ok("D · bildirim düştü", (s.notifications || []).some(n => /Altın Plak/.test(n.title)));
    ok("D · ödül ağırlığı arttı", (p.plaqueAwardWeight || 0) > 0, "+" + p.plaqueAwardWeight);
  }

  /* E) DENETİM — otomatik + tekrar yok */
  {
    const sg = { id: "sg_c3", title: "Otomatik Plak", streams: 1_100_000, dailyStreams: 500, certifications: [], quality: 70 };
    p.songs.push(sg);
    K.certifications.tick();
    const after1 = K.certifications.list().filter(pl => pl.title === "Otomatik Plak").length;
    ok("E · tick otomatik plak verdi", after1 === 1, after1 + " plak");
    K.certifications.tick(); K.certifications.tick();
    const after3 = K.certifications.list().filter(pl => pl.title === "Otomatik Plak").length;
    ok("E · tekrar tekrar verilmiyor", after3 === 1, after3 + " plak");
  }

  /* F) ALBÜM */
  {
    p.albums = p.albums || [];
    const al = { id: "alb_c1", title: "Test Albüm", streams: 1_400_000, certifications: [] };
    p.albums.push(al);
    K.certifications.tick();
    ok("F · albüm plağı verildi", al.certifications.indexOf("gold") >= 0, al.certifications.join(","));
    ok("F · albüm kaydı doğru türde", K.certifications.list().some(pl => pl.kind === "album" && pl.title === "Test Albüm"));
  }

  /* G) ÖZET */
  {
    const sum = K.certifications.summary();
    const real = K.certifications.list().length;
    ok("G · toplam tutarlı", sum.total === real, sum.total + " vs " + real);
    ok("G · kademe kırılımı toplamı tutuyor", (sum.gold + sum.platinum + sum.diamond) === sum.total);
    ok("G · en yeni plaklar listeleniyor", Array.isArray(sum.recently) && sum.recently.length > 0);
  }

  /* H) WRAPPED */
  {
    /* yıl 1'i tamamla + geçmiş verisi besle */
    s.history = s.history || [];
    s.history.push({ day: 1, streams: 10_000, balance: 25_000, monthly: 500, popularity: 3, songs: 0, followers: 1000, ytSubs: 0, roster: 0 });
    s.history.push({ day: 360, streams: 9_000_000, balance: 900_000, monthly: 220_000, popularity: 46, songs: 6, followers: 88_000, ytSubs: 0, roster: 0 });
    s.day = 361;
    K.yearwrap.tick();
    const wl = K.yearwrap.history();
    ok("H · yıl sonunda özet üretildi", wl.length === 1 && wl[0].year === 1, wl.length + " özet");
    const w = wl[0];
    ok("H · dinlenme deltası hesaplandı", w.streams === 8_990_000, w.streams + "");
    ok("H · takipçi deltası hesaplandı", w.followers === 87_000, w.followers + "");
    ok("H · popülerlik başı/sonu", w.popStart === 3 && w.popEnd === 46, w.popStart + "→" + w.popEnd);
    ok("H · plaklar özete girdi", Array.isArray(w.plaques) && w.plaques.length > 0, w.plaques.length + " plak");
    K.yearwrap.tick(); K.yearwrap.tick();
    ok("H · özet tekrar üretilmiyor", K.yearwrap.history().length === 1, K.yearwrap.history().length + " özet");
    const cards = K.yearwrap.cards(w);
    ok("H · kartlar üretiliyor", cards.length >= 6, cards.length + " kart");
    ok("H · kartlarda değer var", cards.every(c => c.value !== undefined && c.value !== "" && c.value !== "NaN"));
    ok("H · NaN/u ndefined yok", !JSON.stringify(cards).match(/NaN|undefined/));
  }

  /* I) GÜVENLİK */
  {
    ok("I · boş özet çökmüyor", (() => { try { return K.yearwrap.cards(null).length === 0; } catch (e) { return false; } })());
    ok("I · bilinmeyen kademe null", K.certifications.tier("__yok__") === null);
    ok("I · eksik dinlenmeyle progress", (() => { try { return K.certifications.progress().next !== undefined; } catch (e) { return false; } })());
    ok("I · tick boş şarkıda çökmüyor", (() => { try { const bak = p.songs; p.songs = []; K.certifications.tick(); p.songs = bak; return true; } catch (e) { return false; } })());
    ok("I · open() özet yokken çökmüyor", (() => { try { const bak = p.wrapped; p.wrapped = []; K.yearwrap.open(); p.wrapped = bak; return true; } catch (e) { return false; } })());
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(48));
  console.log("KARMA · PLAK + WRAPPED");
  console.log("=".repeat(48));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ PLAK + WRAPPED TEMİZ");
  else process.exitCode = 1;
}
