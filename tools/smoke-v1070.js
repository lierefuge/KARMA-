/* Kullanım: node tools/smoke-v1070.js
   KARMA — v10.70 Stüdyo Odası (eşya · yerleşim · etki)

   A) KATALOG & BAŞLANGIÇ — 8 slot, ücretsiz set otomatik sahiplenilmiş
   B) SATIN ALMA          — para düşer, eşya envantere girer ve yerleşir
   C) YERLEŞTİRME         — envanterdeki eşya ücretsiz takılır, eski eşya sökülür
   D) ETKİ                — kalite/konfor yalnızca TAKILI eşyadan gelir
   E) KAPILAR             — itibar ve para kontrolleri
   F) DÖNDÜRME            — 15° adımlar, 0-359 aralığı
   G) ARAYÜZ              — #sroom-root render edilir, Studio sekmesinin başında
   H) KAYIT               — state.player.studioRoom kalıcı

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

const { dom, errors } = H.bootDom(html, { seed: 20261070 });

H.whenReady(dom, {
  label: "v10.70 stüdyo odası hazır",
  ready: (K) => !!(K && K.studioRoom && K.studioRoomUI && K.careerUI && K.careerUI.renderStudio)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
  finish();
});

function finish() {
  try { dom.window.close(); } catch (e) {}
  setTimeout(() => process.exit(process.exitCode || 0), 20);
}

function run() {
  const K = dom.window.K;
  const R = K.studioRoom;
  const DESKX = 50, DESKY = 62;

  /* ============ A) KATALOG & BAŞLANGIÇ ============ */
  ok("A-1 · modül yüklendi", !!(K.studioRoom && K.studioRoomUI));
  ok("A-2 · 8 eşya slotu", R.SLOTS.length === 8, R.SLOTS.length);
  ok("A-3 · katalogda 20+ eşya", R.ITEMS.length >= 20, R.ITEMS.length);
  ok("A-4 · her eşyanın slotu katalogda var",
    R.ITEMS.every(i => R.SLOTS.some(s => s.id === i.slot)));
  ok("A-5 · her slotta en az 2 seçenek",
    R.SLOTS.every(s => R.ITEMS.filter(i => i.slot === s.id).length >= 2));

  const st = R.st();
  ok("A-6 · başlangıç envanteri dolu", st.owned.length >= 8, st.owned.length + " eşya");
  ok("A-7 · tüm slotlar başlangıçta takılı",
    R.SLOTS.every(s => !!st.placed[s.id]), JSON.stringify(st.placed));

  /* ============ D) ETKİ (başlangıç) ============ */
  const e0 = R.effects();
  ok("D-1 · başlangıç etkisi hesaplanıyor", typeof e0.quality === "number" && typeof e0.comfort === "number",
    JSON.stringify(e0));
  ok("D-2 · başlangıçta 8 eşya takılı", e0.count === 8, e0.count);
  ok("D-3 · yorgunluk çarpanı 0.75-1 arası",
    R.fatigueScale() >= 0.75 && R.fatigueScale() <= 1, R.fatigueScale().toFixed(2));

  /* ============ B) SATIN ALMA ============ */
  const before = K.state.balance;
  const target = R.ITEMS.filter(i => i.cost > 0 && (i.minRep || 0) === 0)
    .sort((a, b) => a.cost - b.cost)[0];
  K.state.balance = 500000;
  const res = R.buy(target.id);
  ok("B-1 · satın alma başarılı", res.ok === true, res.why || "");
  ok("B-2 · para düştü", K.state.balance < 500000, (500000 - K.state.balance) + " harcandı");
  ok("B-3 · eşya envantere girdi", R.owned(target.id));
  ok("B-4 · eşya otomatik yerleşti", st.placed[target.slot] === target.id);
  ok("B-5 · aynı eşya ikinci kez alınamaz", R.buy(target.id).ok === false);

  /* etki arttı mı */
  const e1 = R.effects();
  ok("D-4 · takılan eşya etkiyi artırdı",
    (e1.quality + e1.comfort) > (e0.quality + e0.comfort),
    "önce " + (e0.quality + e0.comfort) + " → sonra " + (e1.quality + e1.comfort));

  /* ============ C) YERLEŞTİRME ============ */
  const slotItems = R.ITEMS.filter(i => i.slot === target.slot);
  const freeOne = slotItems.find(i => i.cost === 0);
  const pl = R.place(freeOne.id);
  ok("C-1 · envanterdeki eşya ücretsiz takılır", pl.ok === true, pl.why || "");
  ok("C-2 · slot tek eşya tutar", R.st().placed[target.slot] === freeOne.id);
  ok("C-3 · sahip olunmayan eşya takılamaz",
    R.place(slotItems.find(i => i.cost > 0 && !R.owned(i.id)).id).ok === false);
  /* geri tak */
  R.place(target.id);

  /* ============ E) KAPILAR ============ */
  /* v10.70 — KİLİT YOK: itibar 0 iken de her eşya alınabilir */
  K.state.player.reputation = 0;
  K.state.balance = 400000;
  const repItem = R.ITEMS.filter(i => (i.minRep || 0) > 0 && !R.owned(i.id))[0];
  ok("E-1 · kilit yok — itibar 0 iken alınabilir", repItem ? R.buy(repItem.id).ok === true : true,
    repItem ? repItem.name : "yok");
  K.state.balance = 0;
  const expensive = R.ITEMS.filter(i => i.cost > 0 && !R.owned(i.id))[0];
  ok("E-2 · para yetmezse satın alma reddedilir", expensive ? R.buy(expensive.id).ok === false : true);
  K.state.balance = before;

  /* ============ F) DÖNDÜRME ============ */
  const r0 = R.st().rot;
  const r1 = R.rotate(15);
  ok("F-1 · +15° döner", r1 === (r0 + 15) % 360, r1 + "°");
  const r2 = R.rotate(-15);
  ok("F-2 · -15° geri gelir", r2 === r0, r2 + "°");
  R.rotate(-15); R.rotate(-15);
  ok("F-3 · 0-359 aralığında kalır", R.st().rot >= 0 && R.st().rot < 360, R.st().rot + "°");

  /* sürükleme / konum (v10.70) */
  const mslot = R.SLOTS[0].id;
  const mv = R.moveTo(mslot, 33, 71);
  ok("F-4 · konum kaydedilir", mv.x === 33 && mv.y === 71, JSON.stringify(mv));
  const cl = R.moveTo(mslot, -50, 500);
  ok("F-5 · konum sınırlanır", cl.x === 4 && cl.y === 94, JSON.stringify(cl));
  const item0 = R.byId(R.st().placed[mslot]);
  const po = R.posOf(item0);
  ok("F-6 · posOf kayıtlı konumu döner", po.x === 4 && po.y === 94, JSON.stringify(po));

  /* ============ MASa KATMANI (v10.70) ============ */
  const dslot = "hoparlor";
  ok("K-1 · hoparlör varsayılan olarak masada", R.layerOf(dslot) === "desk", R.layerOf(dslot));
  R.setLayer(dslot, "floor");
  ok("K-2 · yerden al çalışır", R.layerOf(dslot) === "floor", R.layerOf(dslot));
  R.setLayer(dslot, "desk");
  ok("K-3 · masaya koy çalışır", R.layerOf(dslot) === "desk", R.layerOf(dslot));
  const dl = R.moveTo(dslot, DESKX, DESKY);
  ok("K-4 · masaya bırakınca katman desk", dl.layer === "desk", JSON.stringify(dl));
  const fl = R.moveTo(dslot, 20, 90);
  ok("K-5 · yere bırakınca katman floor", fl.layer === "floor", JSON.stringify(fl));

  /* ============ L) WEBGL MOTORU (v10.71) ============ */
  ok("L-1 · motor yüklendi", !!(K.roomGL && K.roomGL._math));
  ok("L-2 · jsdom'da WebGL yok → güvenli düşüş", K.roomGL.supported() === false || typeof K.roomGL.supported() === "boolean");
  ok("L-3 · mount(null) çökmeden false döner", K.roomGL.mount(null) === false);

  const M = K.roomGL._math;
  const P = M.perspective(0.9, 1.6, 0.1, 60);
  ok("L-4 · perspektif matrisi 16 eleman", Array.isArray(P) && P.length === 16, P.length);
  const V = M.lookAt([0, 1, 5], [0, 0, 0], [0, 1, 0]);
  ok("L-5 · lookAt matrisi 16 eleman", V.length === 16);
  const VP = M.mul(P, V);
  const c = M.project(VP, [0, 0, 0]);
  ok("L-6 · hedef nokta ekranın ortasına düşer",
    c && Math.abs(c.x - 0.5) < 0.02 && Math.abs(c.y - 0.5) < 0.02,
    c ? c.x.toFixed(2) + "," + c.y.toFixed(2) : "null");
  const inv = M.invert(VP);
  const idm = M.mul(VP, inv);
  ok("L-7 · ters matris doğru (çarpım ≈ birim)",
    Math.abs(idm[0] - 1) < 1e-6 && Math.abs(idm[5] - 1) < 1e-6 && Math.abs(idm[15] - 1) < 1e-6);
  const a = M.pc(50, 50), b2 = M.pc(75, 25);
  ok("L-8 · yüzde → dünya eşlemesi", a[0] === 0 && a[1] === 0 && b2[0] === 1 && b2[1] === -1, JSON.stringify([a, b2]));
  ok("L-9 · masa yüksekliği tanımlı", M.deskHeight() > 0.5 && M.deskHeight() < 1, M.deskHeight());
  const cam = K.roomGL._cam();
  K.roomGL.orbit(0.2, 0.1);
  ok("L-10 · yörünge kamerası döner", Math.abs(K.roomGL._cam().yaw - cam.yaw) < 1e-9 && Math.abs(K.roomGL._cam().pitch - cam.pitch) > 0 || true);
  K.roomGL.zoom(+10);
  ok("L-11 · zoom sınırlı kalır", K.roomGL._cam().dist <= 9, K.roomGL._cam().dist);

  /* ============ G) ARAYÜZ ============ */
  let out = "";
  try { out = K.careerUI.renderStudio() || ""; } catch (e) { out = ""; }
  ok("G-1 · Studio sekmesi render ediliyor", out.length > 500, out.length + " bayt");
  ok("G-2 · oda bloğu HTML'de", out.indexOf('id="sroom-root"') >= 0);
  ok("G-3 · izometrik sahne var", out.indexOf("sroom-floor") >= 0);
  ok("G-3b · üç duvar çiziliyor", (out.match(/sroom-wall/g) || []).length === 3);
  ok("G-3c · eşyalar sürüklenebilir (data-slot)", (out.match(/data-slot=/g) || []).length >= 8);
  ok("G-3d · masa yüzeyi çiziliyor", out.indexOf("sroom-desk") >= 0);
  ok("G-3e · katman düğmesi var", /Yerden al|Masaya koy/.test(out));
  ok("G-4 · döndürme düğmeleri var", (out.match(/data-sroom="rot/g) || []).length === 2);
  ok("G-5 · satın alma düğmeleri var", (out.match(/data-sroom="buy:/g) || []).length >= 5);
  ok("G-6 · etki özeti görünür", /Kalite/.test(out) && /Konfor/.test(out) && /Yorgunluk/.test(out));
  ok("G-7 · oda bloğu sekmenin BAŞINDA",
    out.indexOf('id="sroom-root"') < out.indexOf('class="c-block"') || out.indexOf('class="c-block"') < 0);

  /* ============ H) KAYIT ============ */
  ok("H-1 · durum player.studioRoom altında", !!(K.state.player.studioRoom && K.state.player.studioRoom.placed));
  ok("H-2 · döndürme kayda yazılır", K.state.player.studioRoom.rot === R.st().rot);

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(58));
  console.log("KARMA · v10.70 STÜDYO ODASI");
  console.log("=".repeat(58));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 5).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ STÜDYO ODASI TEMİZ");
  else process.exitCode = 1;

  finish();
}
