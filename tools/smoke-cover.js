/* Kullanım: node tools/smoke-cover.js
   KARMA — v10.38 kapak üreticisi ve kapak düzenleyicisi.

   K-1) SEÇENEKLER   : palet/desen/şekil/düzen/yazı/font listeleri tam
   K-2) TAŞMA YOK    : hiçbir stil × desen × düzen × font kombinasyonunda
                       yazı 600×600 tuvale taşmaz (eski "mono + uzun
                       başlık" taşmasının kalıcı kilidi)
   K-3) GÖRÜNÜRLÜK   : desen ve şekil katmanları gerçekten görünür
                       (eskiden opaklık 0.07'ydi → gözle yoktu)
   K-4) GERİYE UYUM  : 7 ve 11 parçalı eski seed'ler hâlâ çözülür
   K-5) DÜZENLEYİCİ  : "Rastgele Kapak" oyuncunun font/düzen/çerçeve/
                       explicit/yıl seçimini SİLMEZ; kenar çubuğu özeti
                       ve mağaza önizlemesi güncellenir

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

const { dom, errors } = H.bootDom(html, { seed: 20261038 });

H.whenReady(dom, {
  label: "v10.38 kapak üreticisi hazır",
  ready: (K) => !!(K && K.coverSVG && K.coverParse && K.coverMeasure && K.careerUI)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const U = K.util;
  const seedOf = (o) => {
    const s = Object.assign({
      style: "gece", pattern: "flat", text: "title", hue: -1, grain: 1,
      font: "blok", align: "center", shape: "none",
      artist: "Şehinşah", title: "Anadolu Yansımaları Gece Yarısı",
      layout: "merkez", frame: 0, explicit: 0, year: "2026"
    }, o);
    return "cv~" + s.style + "~" + s.pattern + "~" + s.text + "~" + s.hue + "~" + s.grain +
      "~" + s.font + "~" + s.align + "~" + s.shape + "~" + encodeURIComponent(s.artist) +
      "~" + encodeURIComponent(s.title) + "~" + s.layout + "~" + s.frame + "~" + s.explicit +
      "~" + s.year;
  };

  /* =========================================================
     K-1) SEÇENEK LİSTELERİ
     ========================================================= */
  ok("K-1 · palet sayısı 16", K.COVER_STYLES.length === 16, K.COVER_STYLES.length);
  ok("K-1 · desen sayısı 12", K.COVER_PATTERNS.length === 12, K.COVER_PATTERNS.length);
  ok("K-1 · şekil sayısı 12", K.COVER_SHAPES.length === 12, K.COVER_SHAPES.length);
  ok("K-1 · düzen sayısı 8", K.COVER_LAYOUTS.length === 8, K.COVER_LAYOUTS.length);
  ok("K-1 · yazı modu sayısı 5", K.COVER_TEXT_MODES.length === 5, K.COVER_TEXT_MODES.length);
  ok("K-1 · font sayısı 7", K.COVER_FONTS.length === 7, K.COVER_FONTS.length);

  /* id'ler benzersiz olmalı (çift id = ölü seçenek) */
  [["stil", K.COVER_STYLES], ["desen", K.COVER_PATTERNS], ["şekil", K.COVER_SHAPES],
   ["düzen", K.COVER_LAYOUTS], ["yazı", K.COVER_TEXT_MODES], ["font", K.COVER_FONTS]]
    .forEach(([nm, list]) => {
      const ids = list.map(x => x.id);
      ok("K-1 · " + nm + " id'leri benzersiz", new Set(ids).size === ids.length);
    });

  /* her fontun genişlik katsayısı olmalı (punto hesabı buna bağlı) */
  ok("K-1 · her fontta genişlik katsayısı var",
    K.COVER_FONTS.every(f => typeof f.w === "number" && f.w > 0.3 && f.w < 0.8));

  /* generic aile şartı: data-URI SVG görüntüsü web fontlarını göremez,
     adı geçen font bulunamazsa render serif'e düşer → aile generic olmalı */
  ok("K-1 · fontlar generic aile kullanıyor",
    K.COVER_FONTS.every(f => /^(sans-serif|serif|monospace)$/.test(String(f.family).trim())),
    K.COVER_FONTS.map(f => f.family).join(" | "));

  /* =========================================================
     K-2) TAŞMA YOK — asıl regresyon kilidi
     ========================================================= */
  {
    let n = 0, bad = [];
    const check = (seed, tag) => {
      n++;
      const m = K.coverMeasure(seed);
      if (!m) { bad.push(tag + " :: ölçüm yok"); return; }
      if (m.overflow.length) bad.push(tag + " :: " + m.overflow[0].content + " (" + m.overflow[0].width + "px)");
    };

    /* en zor başlıklar */
    const TITLES = ["Anadolu Yansımaları Gece Yarısı", "Sonsuzluk", "Bir Şarkı Adı Buraya Gelecek Kadar Uzun", "K"];

    /* stil × desen × düzen × font — başlık modu */
    K.COVER_STYLES.forEach(s => K.COVER_PATTERNS.forEach(p => K.COVER_LAYOUTS.forEach(l => K.COVER_FONTS.forEach(f => {
      check(seedOf({ style: s.id, pattern: p.id, layout: l.id, font: f.id, text: "title", title: TITLES[0] }),
        s.id + "/" + p.id + "/" + l.id + "/" + f.id);
    }))));
    ok("K-2 · stil × desen × düzen × font tarandı", n >= 16 * 12 * 8 * 7, n + " kombinasyon");

    /* uzun tek kelime — en kritik taşma senaryosu */
    K.COVER_TEXT_MODES.forEach(t => K.COVER_FONTS.forEach(f => K.COVER_LAYOUTS.forEach(l => {
      check(seedOf({ text: t.id, font: f.id, layout: l.id, title: TITLES[1] }),
        "tek/" + t.id + "/" + f.id + "/" + l.id);
    })));
    /* dört zor başlık × tüm fontlar */
    TITLES.forEach((title, i) => K.COVER_FONTS.forEach(f => {
      check(seedOf({ font: f.id, title: title }), "t" + i + "/" + f.id);
    }));
    /* şekil katmanı yazıyı etkilememeli */
    K.COVER_SHAPES.forEach(sh => check(seedOf({ shape: sh.id, text: "mono", title: TITLES[0] }), "şekil/" + sh.id));

    ok("K-2 · hiçbir kombinasyonda yazı taşmıyor", bad.length === 0,
      bad.length ? bad.length + " taşma · ör: " + bad.slice(0, 3).join(" ; ") : n + " kombinasyon temiz");
  }

  /* =========================================================
     K-3) DESEN / ŞEKİL GÖRÜNÜRLÜĞÜ
     ========================================================= */
  {
    /* desenler: en az 0.13 opaklık (eski değer 0.07 idi → görünmezdi) */
    const weakPat = [];
    K.COVER_PATTERNS.filter(p => p.id !== "flat").forEach(p => {
      const svg = decodeURIComponent(K.coverSVG(seedOf({ pattern: p.id })).replace(/^data:image\/svg\+xml;charset=utf-8,/, ""));
      const vals = (svg.match(/(?:stroke|fill)-opacity="([\d.]+)"/g) || [])
        .map(s => parseFloat(s.split("=")[1].replace(/"/g, "")));
      const max = vals.length ? Math.max.apply(null, vals) : 0;
      if (max < 0.13) weakPat.push(p.id + "(" + max + ")");
    });
    ok("K-3 · her desen görünür opaklıkta (>= 0.13)", weakPat.length === 0, weakPat.join(", "));

    /* şekiller: en az 0.30 (eski değer 0.16 idi) */
    const weakShape = [];
    K.COVER_SHAPES.filter(s => s.id !== "none").forEach(s => {
      const svg = decodeURIComponent(K.coverSVG(seedOf({ shape: s.id })).replace(/^data:image\/svg\+xml;charset=utf-8,/, ""));
      const vals = (svg.match(/(?:stroke|fill)-opacity="([\d.]+)"/g) || [])
        .map(x => parseFloat(x.split("=")[1].replace(/"/g, "")));
      const max = vals.length ? Math.max.apply(null, vals) : 0;
      if (max < 0.30) weakShape.push(s.id + "(" + max + ")");
    });
    ok("K-3 · her şekil görünür opaklıkta (>= 0.30)", weakShape.length === 0, weakShape.join(", "));

    /* desen/şekil seçimi SVG'yi gerçekten değiştirmeli (ölü seçenek yok) */
    const base = K.coverSVG(seedOf({ pattern: "flat", shape: "none" }));
    const diffPat = K.COVER_PATTERNS.filter(p => p.id !== "flat")
      .filter(p => K.coverSVG(seedOf({ pattern: p.id, shape: "none" })) === base);
    const diffSh = K.COVER_SHAPES.filter(s => s.id !== "none")
      .filter(s => K.coverSVG(seedOf({ pattern: "flat", shape: s.id })) === base);
    ok("K-3 · her desen çıktıyı değiştiriyor", diffPat.length === 0, diffPat.map(x => x.id).join(", "));
    ok("K-3 · her şekil çıktıyı değiştiriyor", diffSh.length === 0, diffSh.map(x => x.id).join(", "));

    /* her düzen çıktıyı değiştirmeli */
    const baseL = K.coverSVG(seedOf({ layout: "merkez" }));
    const diffL = K.COVER_LAYOUTS.filter(l => l.id !== "merkez")
      .filter(l => K.coverSVG(seedOf({ layout: l.id })) === baseL);
    ok("K-3 · her düzen çıktıyı değiştiriyor", diffL.length === 0, diffL.map(x => x.id).join(", "));

    /* her font çıktıyı değiştirmeli */
    const baseF = K.coverSVG(seedOf({ font: "blok" }));
    const diffF = K.COVER_FONTS.filter(f => f.id !== "blok")
      .filter(f => K.coverSVG(seedOf({ font: f.id })) === baseF);
    ok("K-3 · her font çıktıyı değiştiriyor", diffF.length === 0, diffF.map(x => x.id).join(", "));
  }

  /* =========================================================
     K-4) GERİYE UYUMLULUK
     ========================================================= */
  {
    /* en eski biçim: 7 parça (font/hiza/şekil/sanatçı yok) */
    const old7 = K.coverParse("cv~ates~ring~mono~120~1~Eski Şarkı");
    ok("K-4 · 7 parçalı eski seed çözülüyor", !!old7);
    ok("K-4 · eski seed başlığı doğru", old7 && old7.title === "Eski Şarkı", old7 && old7.title);
    ok("K-4 · eski seed varsayılan font 'blok'", old7 && old7.font === "blok", old7 && old7.font);
    ok("K-4 · eski seed varsayılan düzen 'merkez'", old7 && old7.layout === "merkez", old7 && old7.layout);
    ok("K-4 · eski seed'de çerçeve kapalı", old7 && old7.frame === false);

    /* 11 parça: font/hiza/şekil/sanatçı var, düzen yok */
    const old11 = K.coverParse(seedOf({}).split("~").slice(0, 11).join("~"));
    ok("K-4 · 11 parçalı seed çözülüyor", !!old11 && old11.artist === "Şehinşah", old11 && old11.artist);
    ok("K-4 · 11 parçalı seed düzeni hizadan türetir", !!old11 && old11.layout === "merkez", old11 && old11.layout);

    /* hiza "top" → düzen "ust" */
    const topSeed = "cv~gece~flat~title~-1~1~blok~top~none~X~Başlık";
    const top = K.coverParse(topSeed);
    ok("K-4 · eski 'top' hizası 'ust' düzenine çevriliyor", top && top.layout === "ust", top && top.layout);

    /* bozuk / yabancı seed */
    ok("K-4 · 'cv~' olmayan seed null döner", K.coverParse("c1") === null);
    ok("K-4 · boş seed null döner", K.coverParse("") === null);
    ok("K-4 · coverSVG('c1') null döner", K.coverSVG("c1") === null);

    /* bilinmeyen düzen güvenli varsayılana düşer */
    const weird = K.coverParse("cv~gece~flat~mono~-1~1~blok~center~none~X~B~yokboyle~1~1~2026");
    ok("K-4 · bilinmeyen düzen 'merkez'e düşer", weird && weird.layout === "merkez", weird && weird.layout);

    /* yeni seed alanları */
    const nw = K.coverParse(seedOf({ layout: "dergi", frame: 1, explicit: 1, year: "2031" }));
    ok("K-4 · yeni seed düzeni okuyor", nw && nw.layout === "dergi", nw && nw.layout);
    ok("K-4 · yeni seed çerçeveyi okuyor", nw && nw.frame === true);
    ok("K-4 · yeni seed explicit'i okuyor", nw && nw.explicit === true);
    ok("K-4 · yeni seed yılı okuyor", nw && nw.year === "2031", nw && nw.year);
  }

  /* =========================================================
     K-5) DÜZENLEYİCİ DAVRANIŞI
     ========================================================= */
  {
    const doc = dom.window.document;
    let err = null;
    try {
      K.state = K.newGame();
      K.state.player.stageName = "Şehinşah";
      doc.querySelectorAll("#modal-root").forEach(m => { m.innerHTML = ""; });
      K.careerUI.openStudioModal({ topic: null });
      K.careerUI._studio.step = 4;
      K.careerUI.renderStudioStep();
    } catch (e) { err = e; }
    ok("K-5 · kapak adımı açıldı", !err, err ? String(err.message) : "");

    if (!err) {
      const click = (act, arg) => {
        const sel = arg ? `[data-act="${act}"][data-arg="${arg}"]` : `[data-act="${act}"]`;
        const el = doc.querySelector(sel);
        if (!el) return false;
        el.click();
        return true;
      };

      /* tüm yeni kontroller DOM'da var mı */
      ok("K-5 · düzen düğmeleri var", doc.querySelectorAll('[data-act="cover-layout"]').length === K.COVER_LAYOUTS.length,
        doc.querySelectorAll('[data-act="cover-layout"]').length);
      ok("K-5 · şekil düğmeleri var", doc.querySelectorAll('[data-act="cover-shape"]').length === K.COVER_SHAPES.length);
      ok("K-5 · font düğmeleri var", doc.querySelectorAll('[data-act="cover-font"]').length === K.COVER_FONTS.length);
      ok("K-5 · çerçeve düğmesi var", !!doc.querySelector('[data-act="cover-frame"]'));
      ok("K-5 · explicit düğmesi var", !!doc.querySelector('[data-act="cover-explicit"]'));
      ok("K-5 · yıl düğmesi var", !!doc.querySelector('[data-act="cover-year"]'));
      ok("K-5 · sıfırla düğmesi var", !!doc.querySelector('[data-act="cover-reset"]'));
      ok("K-5 · ölü 'cover-align' düğmesi yok", doc.querySelectorAll('[data-act="cover-align"]').length === 0);

      /* ayarla */
      click("cover-layout", "dergi");
      click("cover-font", "slab");
      click("cover-frame");
      click("cover-explicit");
      click("cover-style", "kan");
      const o = K.careerUI._studio.coverOpts;
      ok("K-5 · düzen seçimi yazıldı", o.layout === "dergi", o.layout);
      ok("K-5 · font seçimi yazıldı", o.font === "slab", o.font);
      ok("K-5 · çerçeve açıldı", o.frame === true);
      ok("K-5 · explicit açıldı", o.explicit === true);
      ok("K-5 · seed yeni alanları taşıyor",
        /~dergi~1~1~\d{4}$/.test(K.careerUI._studio.coverSeed), K.careerUI._studio.coverSeed);

      /* kenar çubuğu özeti güncellendi mi (eski hata: "Gece · Merkez" kalıyordu) */
      const sub = doc.querySelector('#st-steps .side-step[data-arg="4"] .ss-body span');
      const subTxt = sub ? sub.textContent : "";
      ok("K-5 · kenar çubuğu özeti yeni stili gösteriyor", /Kan/.test(subTxt), subTxt);
      ok("K-5 · kenar çubuğu özeti yeni düzeni gösteriyor", /Dergi/.test(subTxt), subTxt);

      /* mağaza önizlemesi gerçek marka logosu kullanıyor */
      const store = doc.querySelector("#cv-store");
      const storeHTML = store ? store.innerHTML : "";
      ok("K-5 · mağaza önizlemesi çizildi", /store-row/.test(storeHTML));
      ok("K-5 · mağazada emoji ikon kalmadı", !/🟢|🍎|▶️/.test(storeHTML));
      ok("K-5 · mağazada marka SVG'si var", /brand-svg/.test(storeHTML));

      /* ASIL HATA: rastgele, oyuncunun seçimlerini silmemeli */
      const before = JSON.parse(JSON.stringify(K.careerUI._studio.coverOpts));
      ok("K-5 · rastgele düğmesi var", click("cover-random"));
      const after = K.careerUI._studio.coverOpts;
      ok("K-5 · rastgele fontu koruyor", after.font === before.font, before.font + " → " + after.font);
      ok("K-5 · rastgele düzeni koruyor", after.layout === before.layout, before.layout + " → " + after.layout);
      ok("K-5 · rastgele çerçeveyi koruyor", after.frame === before.frame);
      ok("K-5 · rastgele explicit'i koruyor", after.explicit === before.explicit);
      ok("K-5 · rastgele yılı koruyor", after.year === before.year, before.year + " → " + after.year);
      ok("K-5 · rastgele en az bir görsel alanı değiştiriyor",
        after.style !== before.style || after.pattern !== before.pattern ||
        after.shape !== before.shape || after.hue !== before.hue || after.grain !== before.grain);

      /* sıfırla varsayılana döner */
      click("cover-reset");
      const r = K.careerUI._studio.coverOpts;
      ok("K-5 · sıfırla stili 'gece' yapar", r.style === "gece", r.style);
      ok("K-5 · sıfırla düzeni 'merkez' yapar", r.layout === "merkez", r.layout);
      ok("K-5 · sıfırla çerçeveyi kapatır", r.frame === false);
      ok("K-5 · sıfırla yılı korur (oyun yılı)", !!r.year, r.year);

      K.ui.closeModal();
    }
  }

  /* =========================================================
     K-6) ENTEGRASYON — kapak her yerde çiziliyor
     ========================================================= */
  {
    const seed = seedOf({ layout: "dergi", frame: 1, explicit: 1 });
    const cov = K.ui.cover(seed, "", 250);
    ok("K-6 · K.ui.cover yeni seed ile çiziyor", /class="cover"/.test(cov) && /data:image\/svg/.test(cov));
    ok("K-6 · eski 'cs:' seed'i hâlâ gradyan üretiyor", /linear-gradient/.test(K.coverGradient("cs:ates_x")));
    ok("K-6 · düz seed gradyan üretiyor", /gradient|#/.test(K.coverGradient("c1")));

    /* her düzen için kapak HTML'i üretilebiliyor */
    let bad = 0;
    K.COVER_LAYOUTS.forEach(l => {
      try { if (!/class="cover"/.test(K.ui.cover(seedOf({ layout: l.id }), "", 60))) bad++; }
      catch (e) { bad++; }
    });
    ok("K-6 · tüm düzenler kapak olarak çizildi", bad === 0, bad + " hata");
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(56));
  console.log("KARMA · v10.38 KAPAK ÜRETİCİSİ + DÜZENLEYİCİ");
  console.log("=".repeat(56));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ KAPAK SİSTEMİ TEMİZ");
  else process.exitCode = 1;
}
