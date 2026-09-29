/* Kullanım: node tools/smoke-rollout.js
   KARMA — ÇIKIŞ HAFTASI testi (v10.21 · systems/rollout.js)

   Neleri doğrular:
   A) VERİ: kanallar/aşamalar/dereceler tutarlı mı? (eşikler azalan,
      teaser ideal günleri geriye doğru sıralı)
   B) PENCERE: ön kayıt kampanyası doğru zaman aralığında açılıp
      kapanıyor mu? (çok erken / çok geç reddi)
   C) TOPLAMA: günlük ön kayıt gerçekten birikiyor mu, para düşüyor mu?
   D) TEASER: ideal günde tam verim, uzaklaşınca sıfır verim; hype
      birikiyor ve aşama bir kez paylaşılabiliyor mu?
   E) YAYIN: ön kayıt + hype dinlenme ivmesine dönüşüyor mu, ilk hafta
      penceresi açılıyor mu?
   F) İLK HAFTA: 7 gün toplanıp derece veriliyor mu, kalıcı çarpan
      uygulanıyor mu, sayaçta istatistik oluşuyor mu?
   G) GÜVENLİK: eksik/bozuk veriyle çökmüyor mu?

   Not: tek dosyalık KARMA-Oyun.html üzerinden test edilir;
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

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));
const { dom, errors } = H.bootDom(html, { seed: 20261021 });

H.whenReady(dom, { label: "rollout motoru hazır", ready: K => !!(K && K.rollout && K.rollout.CHANNELS) })
  .then(run).catch((err) => {
    console.error("test çöktü: " + (err && err.message ? err.message : err));
    process.exitCode = 1;
  });

function run() {
  const K = dom.window.K, s = K.state, p = s.player;

  /* =========================================================
     A) VERİ
     ========================================================= */
  ok("A · kanallar yüklendi", K.rollout.CHANNELS.length >= 4, K.rollout.CHANNELS.length + " kanal");
  ok("A · teaser aşamaları 3", K.rollout.TEASERS.length === 3);
  ok("A · derece basamakları var", K.rollout.DEBUTS.length >= 4);
  ok("A · teaser ideal günleri geriye sıralı",
    K.rollout.TEASERS[0].ideal > K.rollout.TEASERS[1].ideal && K.rollout.TEASERS[1].ideal >= K.rollout.TEASERS[2].ideal,
    K.rollout.TEASERS.map(t => t.ideal).join(" > "));
  ok("A · derece eşikleri azalan",
    (() => { for (let i = 1; i < K.rollout.DEBUTS.length; i++) if (K.rollout.DEBUTS[i].min >= K.rollout.DEBUTS[i - 1].min) return false; return true; })());
  ok("A · her kanalın maliyeti ve verimi var",
    K.rollout.CHANNELS.every(c => c.cost > 0 && c.yield > 0));

  /* =========================================================
     HAZIRLIK: sentetik bir yayın projesi kur
     ========================================================= */
  p.ig = 80000; p.tiktok = 40000;   // kitle eşiklerini geçsin
  s.balance = 800000;               // TEST kurgusu: kampanya + teaser masraflarını karşıla
                                    // (oyunun kendi başlangıç kasası ₺25.000'dir — testte
                                    //  ön kayıt 15.000 + teaser 12.000 bunu aşıyordu)
  const mkRel = (waitDays) => ({
    id: "rel_test_" + waitDays, title: "Test Çıkış", genre: "rap", type: "single", kind: "normal",
    tracks: [{ name: "T1", quality: 72 }], waitDays, startDay: s.day, stage: "queued",
    marketing: 0, coverSeed: "cv_test"
  });

  /* =========================================================
     B) PENCERE
     ========================================================= */
  {
    const early = mkRel(90);
    ok("B · çok erken başvuru reddedilir", K.rollout.canStartPresave(early).ok === false);
    const good = mkRel(30);
    ok("B · uygun pencerede başvuru açık", K.rollout.canStartPresave(good).ok === true, K.rollout.canStartPresave(good).why);
    const late = mkRel(3);
    ok("B · çıkışa 3 gün kala reddedilir", K.rollout.canStartPresave(late).ok === false);
    ok("B · geçersiz yayın kimliği çökmüyor", K.rollout.canStartPresave(null).ok === false);
  }

  /* =========================================================
     C) KAMPANYA + TOPLAMA
     ========================================================= */
  {
    const rel = mkRel(30);
    p.releases.push(rel);

    const before = s.balance;
    const started = K.rollout.startPresave(rel.id, ["igstory", "tiktok"]);
    ok("C · kampanya başladı", started === true && !!rel.presave);
    ok("C · kampanya gideri düştü", s.balance < before, U => "");
    const spent = before - s.balance;
    ok("C · gider kanalların toplamı", spent === (K.rollout.ch("igstory").cost + K.rollout.ch("tiktok").cost), spent + "");

    ok("C · ikinci kampanya engellenir", K.rollout.startPresave(rel.id, ["x"]) === false);

    /* 5 gün topla */
    for (let i = 0; i < 5; i++) { K.rollout.collectPresaves(); s.day++; }
    ok("C · ön kayıt birikti", rel.presave.collected > 0, rel.presave.collected + " ön kayıt");
    ok("C · günlük geçmiş kaydedildi", rel.presave.history.length === 5, rel.presave.history.length + " gün");
    ok("C · hype oluştu", rel.presave.hype > 0, rel.presave.hype.toFixed(3));

    /* =========================================================
       D) TEASER
       ========================================================= */
    const idealNow = Math.max(0, rel.startDay + rel.waitDays - s.day);
    ok("D · teaser idealden uzakta verim düşük/sıfır",
      (() => { const w = K.rollout.teaserWindow(rel, "reveal"); return w.eff < 0.6; })(),
      "kalan " + idealNow + " gün");

    /* snippet'ın ideal gününe gel */
    const t = K.rollout.teaser("snippet");
    s.day = rel.startDay + rel.waitDays - t.ideal;
    const w = K.rollout.teaserWindow(rel, "snippet");
    ok("D · ideal günde tam verim", w.ok === true && w.eff > 0.95, JSON.stringify(w.eff));

    const hypeBefore = rel.presave.hype;
    const fired = K.rollout.fireTeaser(rel.id, "snippet");
    ok("D · teaser paylaşıldı", fired === true);
    ok("D · hype arttı", rel.presave.hype > hypeBefore);
    ok("D · aşama bir kez paylaşılır", K.rollout.teaserWindow(rel, "snippet").ok === false);
    ok("D · kayıt tutuldu", !!rel.presave.fired.snippet);

    /* =========================================================
       E) YAYIN — ivme + ilk hafta penceresi
       ========================================================= */
    const song = { id: "song_test", title: "Test Çıkış", dailyStreams: 1000, boosts: {}, quality: 72 };
    const collected = rel.presave.collected, hype = rel.presave.hype;
    K.rollout.onPublish(rel, [song]);

    ok("E · dinlenme ivmesi uygulandı", song.dailyStreams > 1000,
      "1000 → " + Math.round(song.dailyStreams));
    ok("E · beklenen aralıkta", song.dailyStreams <= 1000 * 1.97 + 1);
    ok("E · ön kayıt sayısı şarkıya yazıldı", song.presaveCount === collected);
    ok("E · ilk hafta penceresi açıldı", !!song.firstWeek && song.firstWeek.done === false);
    ok("E · kampanya tükendi (kapatıldı)", rel.presave === null);
    ok("E · çıkış kaydı oluştu", !!rel.rollout && rel.rollout.bonus > 1, JSON.stringify(rel.rollout));

    /* =========================================================
       F) İLK HAFTA — 7 gün + derece
       ========================================================= */
    {
      s.day = song.firstWeek.day0;
      p.songs.push(song);
      const repBefore = p.reputation || 0;
      let guard = 0;
      while (!song.firstWeek.done && guard++ < 20) { K.rollout.tickFirstWeek(); s.day++; }

      ok("F · ilk hafta tamamlandı", song.firstWeek.done === true, guard + " tur");
      ok("F · 7 gün kaydedildi", song.firstWeek.days.filter(d => typeof d === "number").length === 7);
      ok("F · toplam hesaplandı", song.firstWeek.total > 0, song.firstWeek.total + " dinlenme");
      ok("F · derece atandı", !!song.debut && !!song.debut.id, song.debut ? song.debut.label : "yok");
      ok("F · kalıcı çarpan uygulandı", typeof song.debutMult === "number" && song.debutMult > 0, "×" + song.debutMult);
      ok("F · istatistik sayacı işledi", !!p.debuts && U_sum(p.debuts) >= 1, JSON.stringify(p.debuts));
      ok("F · bildirim düştü", (s.notifications || []).some(n => /İlk hafta sonucu/.test(n.title)));
      ok("F · itibar değişti ya da sabit kaldı (NaN değil)", Number.isFinite(p.reputation));
      ok("F · çift çözümleme yok", (() => { const t = song.firstWeek.total; K.rollout.tickFirstWeek(); return song.firstWeek.total === t; })());
    }

    /* =========================================================
       G) GÜVENLİK
       ========================================================= */
    ok("G · hazırlık 0-100 arası", (() => { const r = K.rollout.readiness(rel); return r >= 0 && r <= 100; })(), K.rollout.readiness(rel) + "");
    ok("G · bilinmeyen kanal filtrelenir", K.rollout.ch("__yok__") === null);
    ok("G · bilinmeyen teaser filtrelenir", K.rollout.teaser("__yok__") === null);
    ok("G · boş yayında onPublish çökmüyor", (() => { try { K.rollout.onPublish(null, null); return true; } catch (e) { return false; } })());
    ok("G · tick boş durumda çökmüyor", (() => { try { K.rollout.tick(); return true; } catch (e) { return false; } })());
    ok("G · özet üretilebiliyor", typeof K.rollout.summary().campaigns === "number");
  }

  /* ---------- rapor ---------- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(44));
  console.log("KARMA · ÇIKIŞ HAFTASI");
  console.log("=".repeat(44));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length +
    (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ ÇIKIŞ HAFTASI TEMİZ");
  else process.exitCode = 1;
}

function U_sum(o) { return Object.keys(o || {}).reduce((a, k) => a + (o[k] || 0), 0); }
