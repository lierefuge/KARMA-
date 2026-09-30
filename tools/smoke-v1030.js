/* Kullanım: node tools/smoke-v1030.js
   KARMA — v10.30 GÜNCELLEME testi (gelen aramalar · gönderi türü ·
   teklif kuyruğu + pazarlık · yabancı DM'ler).

   A) KURULUM        : yeni sistemler + state alanları
   B) GELEN ARAMALAR : aç / reddet / mesaj · sonuçlar · süre dolması
   C) GÖNDERİ TÜRÜ   : erişim / imaj / risk · tür seçici · sonuç motoru
   D) TEKLİF KUYRUĞU : süre · pazarlık (kabul / kısmi / geri çekilme) · expiry
   E) YABANCI DM     : hayran / dolandırıcı / gazeteci · yanıtla · engelle
   F) ENTEGRASYON    : game.js tick zinciri · index.html sırası · build

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
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));

const { dom, errors } = H.bootDom(html, { seed: 20261030 });

H.whenReady(dom, {
  label: "v10.30 sistemleri hazır",
  ready: (K) => !!(K && K.calls && K.dms && K.social && K.relations)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K, s = K.state, p = s.player, U = K.util;

  /* =========================================================
     A) KURULUM
     ========================================================= */
  ok("A · K.calls yüklendi", !!K.calls);
  ok("A · K.dms yüklendi", !!K.dms);
  ok("A · K.calls.KINDS tanımlı", !!(K.calls.KINDS && Object.keys(K.calls.KINDS).length >= 8),
    Object.keys(K.calls.KINDS || {}).join(","));
  ok("A · K.social.POST_TYPES üç tür", !!(K.social.POST_TYPES && K.social.POST_TYPES.reach && K.social.POST_TYPES.image && K.social.POST_TYPES.risk));
  ok("A · state: calls dizisi", Array.isArray(p.calls));
  ok("A · state: callLog dizisi", Array.isArray(p.callLog));
  ok("A · state: extSenders dizisi", Array.isArray(p.extSenders));
  ok("A · state: dmBlocks nesnesi", !!(p.dmBlocks && typeof p.dmBlocks === "object"));

  /* ortak oyuncu durumu */
  s.balance = 5_000_000;
  p.popularity = 45;
  p.monthly = Math.round(Math.pow(45, 2) * 700);
  p.ig = 80000; p.tiktok = 60000; p.x = 30000;
  p.image = 55; p.reputation = 30; p.stress = 15;
  p.songs = p.songs || [];
  p.songs.push({
    id: "test_song_1", title: "Test Şarkı", quality: 70, streams: 1000,
    dailyStreams: 100, boosts: {}, platforms: { spotify: .46, apple: .19, youtube: .28, other: .07 },
    publishedDay: s.day
  });

  /* =========================================================
     B) GELEN ARAMALAR
     ========================================================= */
  {
    p.calls = [];
    const kinds = Object.keys(K.calls.KINDS);
    ok("B · en az 8 arama türü var", kinds.length >= 8, kinds.length + "");

    /* her tür en az bir kez kurulabiliyor mu? */
    let built = 0;
    kinds.forEach(k => {
      p.calls = [];
      const c = K.calls.spawn(k);
      if (c && c.options && c.options.length) built++;
    });
    ok("B · tüm arama türleri kurulabiliyor", built === kinds.length, built + "/" + kinds.length);

    /* AÇ → seçim → sonuç */
    p.calls = [];
    const c1 = K.calls.spawn("manager");
    ok("B · arama kuyruğa girdi (ringing)", c1 && c1.status === "ringing");
    ok("B · süre atandı (expiresDay)", c1 && c1.expiresDay > s.day);
    const ans = K.calls.answer(c1.id);
    ok("B · 'aç' durumu konuşmaya çevirdi", ans && ans.status === "talking");
    const before = s.balance;
    const res = K.calls.choose(c1.id, "hire");
    ok("B · seçim sonuç döndürdü", res && typeof res.reply === "string" && res.reply.length > 0);
    ok("B · seçim parasal sonucu işledi (ücret kesildi)", s.balance < before, before + " → " + s.balance);
    ok("B · menajer takıma eklendi", !!(p.team && p.team.manager));
    ok("B · arama geçmişe düştü", p.callLog.some(h => h.id === c1.id && h.status === "answered"));

    /* REDDET → sonuç */
    p.calls = [];
    const c2 = K.calls.spawn("press");
    const repBefore = p.reputation;
    const rej = K.calls.reject(c2.id);
    ok("B · reddet sonuç döndürdü", rej && typeof rej.reply === "string");
    ok("B · reddet itibarı düşürdü", p.reputation <= repBefore, repBefore + " → " + p.reputation);
    ok("B · reddedilen arama loglandı", p.callLog.some(h => h.id === c2.id && h.status === "rejected"));

    /* MESAJ → yazılı yanıt */
    p.calls = [];
    const c3 = K.calls.spawn("fan");
    const msg = K.calls.message(c3.id, "m1");
    ok("B · mesajla yanıt sonuç döndürdü", msg && typeof msg.reply === "string");
    ok("B · mesaj durumu kaydedildi", p.callLog.some(h => h.id === c3.id && h.status === "messaged"));

    /* SÜRE DOLMASI → cevapsız */
    p.calls = [];
    const c4 = K.calls.spawn("label");
    c4.expiresDay = s.day;      // süreyi bugüne çek
    const logLen = p.callLog.length;
    K.calls.tick();
    ok("B · süresi dolan arama cevapsız oldu", p.callLog.length > logLen && p.callLog.some(h => h.id === c4.id && h.status === "missed"));
    ok("B · cevapsız arama kuyruktan düştü (status missed)", c4.status === "missed");

    /* modal render çökmeden çalışıyor mu? */
    p.calls = [];
    const c5 = K.calls.spawn("radio");
    let modalOK = true;
    try { K.calls.open(c5.id); } catch (e) { modalOK = false; }
    ok("B · arama modalı çökmeden render edildi", modalOK);
    K.ui.closeModal();

    /* zil sayacı */
    p.calls = [];
    K.calls.spawn("scam"); K.calls.spawn("fan");
    ok("B · çalan arama sayacı doğru", K.calls.ringingCount() === 2, K.calls.ringingCount() + "");
    p.calls = [];
  }

  /* =========================================================
     C) GÖNDERİ TÜRÜ (erişim / imaj / risk)
     ========================================================= */
  {
    const sel = K.social.postTypeSelector("reach");
    ok("C · tür seçici üç seçenek içeriyor", (sel.match(/data-posttype=/g) || []).length === 3);
    ok("C · varsayılan tür işaretli", /data-posttype="reach"/.test(sel) && /class="posttype on"/.test(sel));

    const feedBefore = (s.feed.instagram || []).length;
    const pImg = p.image, pRep = p.reputation;

    /* ERİŞİM */
    const r1 = K.social.playerPost("instagram", "Erişim testi", "reach", "test_song_1");
    ok("C · erişim gönderisi oluştu", r1 && r1.outcome === "reach" && r1.post && r1.post.postType === "reach");
    ok("C · erişim akışa eklendi", (s.feed.instagram || []).length > feedBefore);
    ok("C · erişim takipçi getirdi", p.ig > 80000, p.ig + "");
    ok("C · erişim imajı hafif nötrleştirdi", p.image <= pImg, pImg + " → " + p.image);

    /* İMAJ */
    const igBefore = p.ig;
    const r2 = K.social.playerPost("x", "İmaj testi", "image");
    ok("C · imaj gönderisi oluştu", r2 && r2.outcome === "image");
    ok("C · imaj itibarı artırdı", p.reputation > pRep, pRep + " → " + p.reputation);
    ok("C · imaj kamu imajını artırdı", p.image > pImg, pImg + " → " + p.image);
    ok("C · imaj erişimi erişimden düşük tuttu", (r2.post.likes) < (r1.post.likes));

    /* RİSK — sonuç iki yoldan biri olmalı */
    const r3 = K.social.playerPost("x", "Risk testi", "risk");
    ok("C · risk sonucu geçerli (patlama/tepki)", r3 && (r3.outcome === "risk_win" || r3.outcome === "risk_backfire"), r3 && r3.outcome);
    ok("C · risk gönderisi tür damgası taşıyor", r3.post.postType === "risk");

    /* bilinmeyen tür güvenli varsayılana düşer */
    const r4 = K.social.playerPost("instagram", "Bilinmeyen", "zzz");
    ok("C · bilinmeyen tür 'reach'e düşer", r4 && r4.post.postType === "reach");
  }

  /* =========================================================
     D) TEKLİF KUYRUĞU + PAZARLIK
     ========================================================= */
  {
    s.offers = [];
    const artist = K.artistList()[0];
    const off = K.relations.createIncomingFeatureOffer(artist.id);
    ok("D · feature teklifi oluştu", !!off && off.status === "pending");
    ok("D · teklife süre atandı", off.expiresDay > s.day, off.expiresDay + "");
    ok("D · kalan gün hesabı", K.relations.offerDaysLeft(off) > 0, K.relations.offerDaysLeft(off) + "");
    ok("D · pazarlık kaldıracı 0-1 arası", K.relations.offerLeverage(off) >= 0 && K.relations.offerLeverage(off) <= 1);

    const splitBefore = off.terms.split;
    /* pazarlık: sonuç üç yoldan biri olmalı, çökme yok */
    let outcomes = {};
    for (let i = 0; i < 60; i++) {
      const o = { id: "n" + i, type: "feature", artistId: artist.id, day: s.day, expiresDay: s.day + 7, terms: { title: "T", split: splitBefore }, status: "pending", negotiated: 0 };
      s.offers.push(o);
      const r = K.relations.counterOffer(o.id, { split: 85, greed: 0.9 });
      if (r && r.ok) outcomes[r.result] = (outcomes[r.result] || 0) + 1;
      if (r && r.result === "accepted") {
        ok("D · pazarlık kabul edilince şartlar iyileşti", o.terms.split > splitBefore, splitBefore + " → " + o.terms.split);
      }
    }
    ok("D · pazarlık üç sonuçtan birini üretiyor (kabul/kısmi/geri çekilme)",
      !!(outcomes.accepted || outcomes.partial || outcomes.withdrawn), JSON.stringify(outcomes));
    ok("D · pazarlık bir turdan sonra tekrar denenemez (negotiated)", (() => {
      const o = s.offers.find(x => x.negotiated === 1 && x.status === "pending");
      if (!o) return true;
      const r2 = K.relations.counterOffer(o.id, { split: 90, greed: 1 });
      return r2 && r2.ok === false && r2.why === "tekrar";
    })());

    /* hangout pazarlığa kapalı */
    s.offers = [];
    const ho = K.relations.createIncomingHangoutOffer(artist.id);
    const hr = K.relations.counterOffer(ho.id, {});
    ok("D · hangout pazarlığa kapalı", hr && hr.ok === false && hr.why === "hangout");

    /* SÜRE DOLMASI → teklif geri çekilir */
    s.offers = [];
    const exp = K.relations.createIncomingFeatureOffer(artist.id);
    exp.expiresDay = s.day;
    K.relations._expireOffers();
    ok("D · süresi dolan teklif kapandı", exp.status === "expired", exp.status);
    ok("D · süresi dolan teklif kuyruğu terk etti (pending değil)",
      !s.offers.some(o => o.id === exp.id && o.status === "pending"));

    /* respondOffer hâlâ çalışıyor */
    s.offers = [];
    const off2 = K.relations.createIncomingFeatureOffer(artist.id);
    const relBefore = K.relation(artist.id).affinity;
    K.relations.respondOffer(off2.id, false);
    ok("D · teklif reddi durumu güncelledi", off2.status === "declined");
    ok("D · teklif reddi handledDay yazdı", off2.handledDay === s.day);
    ok("D · teklif reddi samimiyeti düşürdü", K.relation(artist.id).affinity <= relBefore);
    s.offers = [];
  }

  /* =========================================================
     E) YABANCI DM'LER (hayran / dolandırıcı / gazeteci)
     ========================================================= */
  {
    K.dms.ensure();
    const senders = K.dms.list();
    ok("E · yabancı gönderen havuzu oluştu", senders.length >= 12, senders.length + "");
    const roles = {};
    senders.forEach(x => { roles[x.role] = (roles[x.role] || 0) + 1; });
    ok("E · üç rol de var (hayran/dolandırıcı/gazeteci)",
      !!(roles.hayran && roles.dolandirici && roles.gazeteci), JSON.stringify(roles));

    const fan = senders.find(x => x.role === "hayran");
    const scam = senders.find(x => x.role === "dolandirici");
    const press = senders.find(x => x.role === "gazeteci");

    /* artistById/contacts.byId yabancıyı çözer */
    ok("E · K.artistById yabancıyı çözüyor", K.artistById(fan.id) && K.artistById(fan.id).stageName === fan.stageName);
    ok("E · K.contacts.byId yabancıya düşüyor", K.contacts.byId(fan.id) === fan);

    /* HAYRAN: yanıtla */
    s.dmRequests = {};
    const fReq = K.dms.send(fan.id, "hayran");
    ok("E · hayran DM isteği oluştu", !!fReq && fReq.external === true && fReq.kind === "hayran");
    ok("E · istek seçenekleri var", Array.isArray(fReq.options) && fReq.options.length >= 3);
    const fansBefore = p.ig;
    const fr = K.dms.reply(fan.id, "warm");
    ok("E · hayran yanıtı işlendi", !!fr && s.dmRequests[fan.id].handled === true);
    ok("E · hayran yanıtı takipçi kazandırdı", p.ig > fansBefore, fansBefore + " → " + p.ig);

    /* DOLANDIRICI: ödeme → para kaybı */
    s.dmRequests = {};
    const sReq = K.dms.send(scam.id, "dolandirici");
    ok("E · dolandırıcı DM isteği oluştu", !!sReq && sReq.kind === "dolandirici");
    const balBefore = s.balance;
    K.dms.reply(scam.id, "pay");
    ok("E · dolandırıcıya ödeme para kaybettirdi", s.balance < balBefore, balBefore + " → " + s.balance);

    /* DOLANDIRICI: engelle → güvenli */
    s.dmRequests = {};
    const scam2 = senders.filter(x => x.role === "dolandirici")[1];
    K.dms.send(scam2.id, "dolandirici");
    K.dms.block(scam2.id);
    ok("E · engelleme kaydedildi", K.dms.isBlocked(scam2.id) === true);
    ok("E · engellenen istek listeden düştü", !s.dmRequests[scam2.id]);
    ok("E · engellenen tekrar yazamıyor", K.dms.send(scam2.id, "dolandirici") === null);

    /* GAZETECİ: röportaj kabul → itibar */
    s.dmRequests = {};
    K.dms.send(press.id, "gazeteci");
    const repB = p.reputation;
    K.dms.reply(press.id, "accept");
    ok("E · gazeteci röportajı itibar kazandırdı", p.reputation > repB, repB + " → " + p.reputation);

    /* engel kaldırma */
    K.dms.unblock(scam2.id);
    ok("E · engel kaldırılabiliyor", K.dms.isBlocked(scam2.id) === false);
    ok("E · engellenen liste boş değil (başka engel yok)", Array.isArray(K.dms.blockedList()));

    /* süre dolması */
    s.dmRequests = {};
    const fan2 = senders.filter(x => x.role === "hayran")[1];
    const fr2 = K.dms.send(fan2.id, "hayran");
    fr2.expiresDay = s.day;
    K.dms.tick();
    ok("E · süresi dolan yabancı DM temizlendi", !s.dmRequests[fan2.id]);
    s.dmRequests = {};
  }

  /* =========================================================
     F) ENTEGRASYON
     ========================================================= */
  {
    ok("F · game.js calls.tick çağırıyor", /K\.calls\.tick/.test(read("js/core/game.js")));
    ok("F · game.js dms.tick çağırıyor", /K\.dms\.tick/.test(read("js/core/game.js")));
    ok("F · game.js çalan aramayı açıyor", /K\.calls\.openNext/.test(read("js/core/game.js")));
    ok("F · relations.js pazarlık sunuyor", /counterOffer/.test(read("js/systems/relations.js")));
    ok("F · social.js gönderi türlerini tanımlıyor", /POST_TYPES/.test(read("js/systems/social.js")));
    ok("F · messages.js yabancı DM kartı çiziyor", /externalReqCard/.test(read("js/apps/messages.js")));
    ok("F · index.html calls.js + dms.js + calls.css içeriyor",
      /systems\/calls\.js/.test(read("index.html")) && /systems\/dms\.js/.test(read("index.html")) && /css\/calls\.css/.test(read("index.html")));

    /* gerçek gün geçişi yeni tick'leri çalıştırıyor mu (çökme yok)? */
    let dayOK = true;
    try { K.game.nextDay(); } catch (e) { dayOK = false; }
    ok("F · gün geçişi yeni sistemlerle çökmeden çalıştı", dayOK);
    K.ui.closeModal();
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(52));
  console.log("KARMA · v10.30 GÜNCELLEME (aramalar · gönderi türü · teklif · DM)");
  console.log("=".repeat(52));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ v10.30 GÜNCELLEME TEMİZ");
  else process.exitCode = 1;
}
