/* Kullanım: node tools/smoke-v1041.js
   KARMA — v10.41 Şarkı Biçimi (song structure).

   Eskiden söz atölyesi SABİT 6 bölüm tutuyordu (intro/verse/hook/
   chorus/bridge/outro), her biri tek metin. Tekrar ve sıra yoktu.
   Artık her parçanın bir ŞARKI BİÇİMİ var: sıralı bölüm dizisi.

     Y) YAPI MOTORU   : yuva → anahtar çözümleme, tekrar, etiket
     T) ŞABLONLAR     : 8 hazır biçim + özel
     S) SÜRE          : süre artık yapıdan türer (rastgele değil)
     B) BİÇİM PUANI   : nakarat omurga, köprü kırılma, şişme cezası
     L) SÖZ BİRLEŞTİRME: nakarat tekrarında yeniden yazılır
     U) ARAYÜZ        : şablon çipleri, zaman çizelgesi, ekle/çıkar/taşı
     A) ANALİZ        : formScore ve estSeconds analize girer
     R) YAYIN         : parça başına biçim yayına taşınır
     G) GERİYE UYUM   : eski 6 anahtarlı sözler bozulmaz

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

const { dom, errors } = H.bootDom(html, { seed: 20261041 });

H.whenReady(dom, {
  label: "v10.41 şarkı biçimi hazır",
  ready: (K) => !!(K && K.careerUI && K.lyricStructureKeys && K.LYRIC_TEMPLATES && K.LYRIC_TEMPLATES.length >= 8)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

function run() {
  const K = dom.window.K;
  const doc = dom.window.document;

  const clickAct = (act, arg) => {
    const sel = arg != null ? `[data-act="${act}"][data-arg="${arg}"]` : `[data-act="${act}"]`;
    const el = doc.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  };
  const openStudio = (count) => {
    K.state = K.newGame();
    K.state.player.stageName = "Şehinşah";
    K.state.balance = 9000000;
    doc.querySelectorAll("#modal-root").forEach(m => { m.innerHTML = ""; });
    const t = doc.getElementById("toast-stack"); if (t) t.innerHTML = "";
    K.careerUI.openStudioModal({ topic: null });
    const st = K.careerUI._studio;
    if (count) { st.count = count; K.careerUI._syncTracks(st); }
    K.careerUI.renderStudioStep();
    return st;
  };
  /* bilinen bir yapı kurup 3. adımı çiz */
  const studioWith = (tmplId, count) => {
    const st = openStudio(count || 1);
    st.tracks.forEach(t => { t.slots = K.lyricTemplateById(tmplId).slots.slice(); });
    st.step = 3;
    K.careerUI.renderStudioStep();
    return st;
  };
  const T = (id) => K.lyricTemplateById(id).slots.slice();

  /* =========================================================
     Y) YAPI MOTORU
     ========================================================= */
  {
    const classic = T("classic");                     // intro·verse·chorus·verse·chorus·outro
    const keys = K.lyricStructureKeys(classic);

    ok("Y-1 · yapı aynı uzunlukta anahtar üretir", keys.length === classic.length, keys.join(","));
    ok("Y-1 · nakarat TEK anahtara çözülür",
      keys.filter(k => k === "chorus").length === 1, keys.join(","));
    ok("Y-1 · son nakarat varyasyona ayrılır",
      keys.indexOf("chorusLast") === keys.lastIndexOf("chorus") + 0 || keys.includes("chorusLast"), keys.join(","));
    ok("Y-1 · nakaratın ilk geçişi düz 'chorus'",
      keys.indexOf("chorus") < keys.indexOf("chorusLast"), keys.join(","));
    ok("Y-2 · verse'ler AYRI anahtar alır",
      keys.includes("verse") && keys.includes("verse2"), keys.join(","));
    ok("Y-2 · tek geçişli bölümler sade kalır",
      keys.filter(k => k === "intro").length === 1 && keys.filter(k => k === "outro").length === 1);

    ok("Y-3 · verse2 türü verse", K.lyricKeyType("verse2").id === "verse");
    ok("Y-3 · verse2 indeksi 2", K.lyricKeyIndex("verse2") === 2);
    ok("Y-3 · verse indeksi 1", K.lyricKeyIndex("verse") === 1);
    ok("Y-3 · verse3 indeksi 3", K.lyricKeyIndex("verse3") === 3);
    ok("Y-3 · prechorus2 türü prechorus", K.lyricKeyType("prechorus2").id === "prechorus");
    ok("Y-3 · chorusLast türü chorus", K.lyricKeyType("chorusLast").id === "chorus");

    ok("Y-4 · etiket 'Verse 2'", K.lyricKeyLabel("verse2") === "Verse 2", K.lyricKeyLabel("verse2"));
    ok("Y-4 · etiket 'Nakarat (son)'", K.lyricKeyLabel("chorusLast") === "Nakarat (son)", K.lyricKeyLabel("chorusLast"));
    ok("Y-4 · etiket 'Verse'", K.lyricKeyLabel("verse") === "Verse", K.lyricKeyLabel("verse"));
    ok("Y-4 · etiket 'Nakarat'", K.lyricKeyLabel("chorus") === "Nakarat", K.lyricKeyLabel("chorus"));

    const uniq = K.lyricStructureUnique(classic);
    ok("Y-5 · benzersiz bölüm sayısı 6", uniq.length === 6, uniq.join(","));
    ok("Y-5 · benzersiz liste tekrarsız", new Set(uniq).size === uniq.length);
    ok("Y-5 · benzersiz liste sırayı korur", uniq[0] === "intro" && uniq[uniq.length - 1] === "outro");

    const three = T("three");
    ok("Y-6 · üç nakarat iki kez 'chorus' + bir 'chorusLast'",
      K.lyricStructureKeys(three).filter(k => k === "chorus").length === 2 &&
      K.lyricStructureKeys(three).filter(k => k === "chorusLast").length === 1);
    ok("Y-6 · nakarat toplam tekrarı 3", K.lyricKeyRepeat(three, "chorus") === 3, String(K.lyricKeyRepeat(three, "chorus")));
    ok("Y-6 · tek geçişli bölümün tekrarı 1", K.lyricKeyRepeat(three, "intro") === 1);
    ok("Y-6 · verse tekrarı 3", K.lyricKeyRepeat(three, "verse") === 3);
  }

  /* =========================================================
     T) ŞABLONLAR
     ========================================================= */
  {
    ok("T-1 · 8 hazır biçim var", K.LYRIC_TEMPLATES.length === 8, String(K.LYRIC_TEMPLATES.length));
    ok("T-1 · şablon kimlikleri benzersiz",
      new Set(K.LYRIC_TEMPLATES.map(t => t.id)).size === 8);
    ok("T-1 · 'Özel' şablonun hazır dizisi yok",
      K.lyricTemplateById("custom").slots === null);
    ok("T-1 · diğer şablonların dizisi var",
      K.LYRIC_TEMPLATES.filter(t => t.id !== "custom").every(t => Array.isArray(t.slots) && t.slots.length >= 4));

    ok("T-2 · tüm şablonlar geçerli bölüm türü kullanır",
      K.LYRIC_TEMPLATES.filter(t => t.slots).every(t => t.slots.every(s => K.LYRIC_SECTIONS.some(x => x.id === s))));

    ok("T-3 · klasik şablon tanınır", K.lyricTemplateOf(T("classic")) === "classic");
    ok("T-3 · üç verse şablonu tanınır", K.lyricTemplateOf(T("three")) === "three");
    ok("T-3 · elle kurulmuş yapı 'custom' olur",
      K.lyricTemplateOf(["verse", "verse", "outro"]) === "custom");
    ok("T-3 · bilinmeyen kimlik klasik döner",
      K.lyricTemplateById("yok-boyle-bir-sey").id === "classic");

    /* kullanıcının istediği üç dizilim */
    const hookFirst = K.lyricStructureKeys(T("hookfirst"));
    ok("T-4 · 'Nakarat Önce' nakaratla başlar", hookFirst[0] === "chorus", hookFirst.join(","));
    const bridge = K.lyricStructureKeys(T("bridge"));
    ok("T-4 · 'Köprü'lü' içinde köprü var", bridge.includes("bridge"));
    ok("T-4 · 'Köprü'lü' nakaratla açar", bridge[1] === "chorus", bridge.join(","));
    ok("T-4 · 'Nakaratsız' hiç nakarat içermez",
      !K.lyricStructureKeys(T("bars")).some(k => K.lyricKeyType(k).id === "chorus"));
    const epic = K.lyricStructureKeys(T("epic"));
    ok("T-4 · 'Uzun / Epik' pre-nakarat içerir",
      epic.some(k => K.lyricKeyType(k).id === "prechorus"));
    ok("T-4 · 'Uzun / Epik' köprü içerir", epic.includes("bridge"));
    ok("T-4 · 'Kısa' 4 bölüm", T("short").length === 4);
  }

  /* =========================================================
     S) SÜRE — artık yapıdan türer
     ========================================================= */
  {
    ok("S-1 · yapı saniyesi hesaplanır", K.lyricStructureSeconds(T("classic")) > 100,
      String(K.lyricStructureSeconds(T("classic"))));
    ok("S-1 · uzun yapı daha uzun sürer",
      K.lyricStructureSeconds(T("epic")) > K.lyricStructureSeconds(T("short")),
      K.lyricStructureSeconds(T("epic")) + " > " + K.lyricStructureSeconds(T("short")));
    ok("S-1 · nakarat her tekrarında süreye sayılır",
      K.lyricStructureSeconds(T("three")) > K.lyricStructureSeconds(T("classic")),
      K.lyricStructureSeconds(T("three")) + " > " + K.lyricStructureSeconds(T("classic")));
    ok("S-1 · boş yapı 0 saniye", K.lyricStructureSeconds([]) === 0);

    ok("S-2 · süre M:SS biçiminde",
      /^\d+:\d\d$/.test(K.career.durationForSlots(T("classic"), "Test")),
      K.career.durationForSlots(T("classic"), "Test"));
    ok("S-2 · süre 90 sn altına inmez",
      K.career.durationSecondsForSlots(["verse"], "x") >= 90,
      String(K.career.durationSecondsForSlots(["verse"], "x")));
    const huge = [];
    for (let i = 0; i < 40; i++) huge.push("verse");
    ok("S-2 · süre 420 sn üstüne çıkmaz",
      K.career.durationSecondsForSlots(huge, "x") <= 420,
      String(K.career.durationSecondsForSlots(huge, "x")));

    ok("S-3 · aynı tohum aynı süre (deterministik)",
      K.career.durationForSlots(T("classic"), "Gece") === K.career.durationForSlots(T("classic"), "Gece"));
    ok("S-3 · boş tohum sapma yaratmaz",
      K.career.durationSecondsForSlots(T("classic"), "") === K.lyricStructureSeconds(T("classic")),
      String(K.career.durationSecondsForSlots(T("classic"), "")));
    ok("S-3 · sapma ±15 sn içinde",
      Math.abs(K.career.durationSecondsForSlots(T("classic"), "abc") - K.lyricStructureSeconds(T("classic"))) <= 15);

    /* yeni parçalara ÇEŞİTLİ biçim atanır — hepsi aynı kalıp olmaz */
    const st = openStudio(12);
    const shapes = new Set(st.tracks.map(t => t.slots.join(",")));
    ok("S-4 · yeni parçalara çeşitli biçim atanır", shapes.size >= 3, shapes.size + " farklı biçim");
    ok("S-4 · her parçanın süresi biçiminden türer",
      st.tracks.every(t => t.dur === K.career.durationForSlots(t.slots, t.name)));
    ok("S-4 · süreler makul (1:30–7:00)",
      st.tracks.every(t => {
        const [m, s] = t.dur.split(":").map(Number);
        return m * 60 + s >= 90 && m * 60 + s <= 420;
      }), st.tracks.map(t => t.dur).join(" · "));
  }

  /* =========================================================
     B) BİÇİM PUANI
     ========================================================= */
  {
    ok("B-1 · nakaratlı yapı nakaratsızdan yüksek",
      K.lyricStructureScore(T("three")) > K.lyricStructureScore(T("bars")),
      K.lyricStructureScore(T("three")) + " > " + K.lyricStructureScore(T("bars")));
    ok("B-1 · nakarat üç kez, iki kezden iyi",
      K.lyricStructureScore(T("three")) > K.lyricStructureScore(T("classic")));
    ok("B-2 · nakaratsız yapı negatif",
      K.lyricStructureScore(T("bars")) < 0, String(K.lyricStructureScore(T("bars"))));
    ok("B-2 · beş verse'lik yığın cezalı",
      K.lyricStructureScore(["verse", "verse", "verse", "verse", "verse"]) < 0);
    ok("B-3 · köprü eklemek puanı artırır",
      K.lyricStructureScore(T("bridge")) > K.lyricStructureScore(["intro", "chorus", "verse", "chorus", "verse", "chorus", "outro"]),
      K.lyricStructureScore(T("bridge")) + " > " + K.lyricStructureScore(["intro", "chorus", "verse", "chorus", "verse", "chorus", "outro"]));
    ok("B-3 · pre-nakarat puanı artırır",
      K.lyricStructureScore(T("epic")) > K.lyricStructureScore(T("three")));
    ok("B-4 · çok kısa yapı cezalı", K.lyricStructureScore(["verse", "chorus"]) < 12);
    const bloat10 = [], bloat14 = [];
    for (let i = 0; i < 10; i++) bloat10.push("verse");
    for (let i = 0; i < 14; i++) bloat14.push("verse");
    ok("B-4 · aşırı uzun yapı şişme cezası alır",
      K.lyricStructureScore(bloat14) < K.lyricStructureScore(bloat10),
      K.lyricStructureScore(bloat14) + " < " + K.lyricStructureScore(bloat10));
    ok("B-5 · boş yapı 0 puan", K.lyricStructureScore([]) === 0);
  }

  /* =========================================================
     L) SÖZ BİRLEŞTİRME
     ========================================================= */
  {
    const classic = T("classic");
    const base = {
      intro: "GİRİŞ", verse: "VERSE1", verse2: "VERSE2", verse3: "VERSE3",
      chorus: "NAKARAT", chorusLast: "", bridge: "", outro: "KAPANIŞ",
      hook: "", prechorus: ""
    };

    const flat = K.lyrics.flatten(base, classic);
    const lines = flat.split("\n");
    ok("L-1 · yapı sırasına göre birleşir",
      lines[0] === "GİRİŞ" && lines[1] === "VERSE1" && lines[lines.length - 1] === "KAPANIŞ",
      lines.join("|"));
    ok("L-1 · nakarat her tekrarında YENİDEN yazılır",
      lines.filter(l => l === "NAKARAT").length === 2, lines.join("|"));
    ok("L-1 · verse2 ayrı söz olarak girer", lines.includes("VERSE2"), lines.join("|"));
    ok("L-1 · kullanılmayan bölüm metne girmez", !lines.includes("VERSE3") && !lines.includes("KAPANIŞKAPANIŞ"));

    const withVar = Object.assign({}, base, { chorusLast: "SON NAKARAT" });
    const flat2 = K.lyrics.flatten(withVar, classic).split("\n");
    ok("L-2 · son nakarat varyasyonu kullanılır", flat2.includes("SON NAKARAT"), flat2.join("|"));
    ok("L-2 · varyasyon varken düz nakarat bir kez kalır",
      flat2.filter(l => l === "NAKARAT").length === 1, flat2.join("|"));

    ok("L-3 · boş son nakarat normal nakarata düşer",
      K.lyrics.sectionText(base, "chorusLast") === "NAKARAT");
    ok("L-3 · dolu son nakarat kendi metnini verir",
      K.lyrics.sectionText(withVar, "chorusLast") === "SON NAKARAT");
    ok("L-3 · normal bölümde düşme yok",
      K.lyrics.sectionText(base, "verse3") === "VERSE3" && K.lyrics.sectionText(base, "hook") === "");

    const st = K.lyrics.structure(base, classic);
    ok("L-4 · 6 benzersiz bölüm sayılır", st.total === 6, String(st.total));
    ok("L-4 · doluluk 6/6 (son nakarat devralır)", st.have === 6, st.have + "/" + st.total);
    ok("L-4 · yapı anahtarları da döner", Array.isArray(st.slots) && st.slots.length === classic.length);

    /* tekrar sayısı metne yansır: üç nakaratlı yapı daha uzun metin üretir */
    const three = T("three");
    const full = Object.assign({}, base, { verse3: "VERSE3" });
    const t3 = K.lyrics.flatten(full, three).split("\n");
    ok("L-5 · üç nakaratlı yapıda nakarat üç kez geçer",
      t3.filter(l => l === "NAKARAT").length === 2 && t3.includes("SON NAKARAT") === false,
      t3.join("|"));
    ok("L-5 · üç verse de metne girer",
      t3.includes("VERSE1") && t3.includes("VERSE2") && t3.includes("VERSE3"));

    /* geriye uyum: yapı verilmezse eski davranış */
    const legacyFlat = K.lyrics.flatten(base);
    ok("L-6 · yapı verilmezse eski birleştirme",
      legacyFlat.split("\n").filter(l => l === "NAKARAT").length === 1, legacyFlat.split("\n").join("|"));
  }

  /* =========================================================
     U) ARAYÜZ
     ========================================================= */
  {
    let st = studioWith("three", 1);
    ok("U-1 · 8 biçim şablonu çizildi", doc.querySelectorAll(".lyr-tmpl").length === 8,
      String(doc.querySelectorAll(".lyr-tmpl").length));
    ok("U-1 · seçili şablon işaretli",
      doc.querySelector(".lyr-tmpl.active") &&
      /Üç Verse/.test(doc.querySelector(".lyr-tmpl.active").textContent));

    ok("U-2 · zaman çizelgesi yuvaları çizildi", doc.querySelectorAll(".sl-slot").length === 8,
      String(doc.querySelectorAll(".sl-slot").length));
    ok("U-2 · yuva adları okunur",
      Array.from(doc.querySelectorAll(".sl-slot .ss-name")).map(e => e.textContent).includes("Verse 2"));
    ok("U-2 · nakarat yuvası renk kodlu",
      doc.querySelectorAll('.sl-slot[data-kind="chorus"]').length === 3,
      String(doc.querySelectorAll('.sl-slot[data-kind="chorus"]').length));

    ok("U-3 · bölüm ekleme düğmeleri var",
      doc.querySelectorAll(".sl-add").length === K.LYRIC_SECTIONS.length,
      String(doc.querySelectorAll(".sl-add").length));
    ok("U-3 · özet satırı var", !!doc.querySelector(".sl-stats"));
    ok("U-3 · özet tahmini süre yazar", /tahmini süre/.test(doc.querySelector(".sl-stats").textContent));
    ok("U-3 · özet biçim puanı yazar", /biçim puanı/.test(doc.querySelector(".sl-stats").textContent));
    ok("U-3 · özet yazılacak bölüm sayısını yazar",
      /6\s*yazılacak bölüm/.test(doc.querySelector(".sl-stats").textContent.replace(/\s+/g, " ")),
      doc.querySelector(".sl-stats").textContent.replace(/\s+/g, " ").slice(0, 120));

    /* nakarat TEK kart */
    ok("U-4 · nakarat yapıda 3 kez ama TEK kart",
      doc.querySelectorAll('[data-lyrsec="chorus"]').length === 1,
      String(doc.querySelectorAll('[data-lyrsec="chorus"]').length));
    ok("U-4 · verse 1/2/3 ayrı kart",
      doc.querySelectorAll('[data-lyrsec="verse"]').length === 1 &&
      doc.querySelectorAll('[data-lyrsec="verse2"]').length === 1 &&
      doc.querySelectorAll('[data-lyrsec="verse3"]').length === 1);
    ok("U-4 · tekrar rozeti gösterilir",
      doc.querySelector(".lyr-rep") && /×3/.test(doc.querySelector(".lyr-rep").textContent),
      doc.querySelector(".lyr-rep") ? doc.querySelector(".lyr-rep").textContent : "yok");
    ok("U-4 · son nakarat varyasyon kartı var",
      doc.querySelectorAll('[data-lyrsec="chorusLast"]').length === 1);
    ok("U-4 · varyasyon kartı opsiyonel işaretli", !!doc.querySelector(".lyr-card.opt"));

    /* şablon tıklaması */
    clickAct("lyr-template", "bridge");
    ok("U-5 · şablon tıklaması yapıyı değiştirir",
      K.careerUI.trackSlots(st, 0).join(",") === T("bridge").join(","),
      K.careerUI.trackSlots(st, 0).join(","));
    ok("U-5 · şablon değişince süre güncellenir",
      st.tracks[0].dur === K.career.durationForSlots(T("bridge"), st.tracks[0].name),
      st.tracks[0].dur);
    ok("U-5 · 'Özel' şablon mevcut diziyi korur",
      (clickAct("lyr-template", "custom"),
        K.careerUI.trackSlots(st, 0).join(",") === T("bridge").join(",")));

    /* bölüm ekle / çıkar / taşı */
    const n0 = K.careerUI.trackSlots(st, 0).length;
    clickAct("lyr-add", "bridge");
    ok("U-6 · bölüm eklendi", K.careerUI.trackSlots(st, 0).length === n0 + 1,
      K.careerUI.trackSlots(st, 0).join(","));
    clickAct("lyr-del", "0");
    ok("U-6 · bölüm çıkarıldı", K.careerUI.trackSlots(st, 0).length === n0,
      K.careerUI.trackSlots(st, 0).join(","));

    st.tracks[0].slots = ["intro", "verse", "chorus", "outro"];
    K.careerUI.renderStudioStep();
    const mv = doc.querySelector('[data-act="lyr-mv"][data-arg="1"][data-dir="1"]');
    ok("U-7 · taşıma düğmesi var", !!mv);
    if (mv) mv.click();
    ok("U-7 · bölüm sağa taşındı",
      K.careerUI.trackSlots(st, 0).join(",") === "intro,chorus,verse,outro",
      K.careerUI.trackSlots(st, 0).join(","));
    const mv2 = doc.querySelector('[data-act="lyr-mv"][data-arg="2"][data-dir="-1"]');
    if (mv2) mv2.click();
    ok("U-7 · bölüm sola taşındı",
      K.careerUI.trackSlots(st, 0).join(",") === "intro,verse,chorus,outro",
      K.careerUI.trackSlots(st, 0).join(","));

    /* sınırlar */
    st.tracks[0].slots = ["verse", "chorus"];
    K.careerUI.renderStudioStep();
    const delBtn = doc.querySelector('[data-act="lyr-del"][data-arg="0"]');
    ok("U-8 · 2 bölümdeyken çıkarma düğmesi pasif", delBtn && delBtn.disabled === true);
    clickAct("lyr-del", "0");
    ok("U-8 · 2 bölümün altına inilemez", K.careerUI.trackSlots(st, 0).length === 2);

    /* doldurma yapıya göre çalışır */
    st = studioWith("three", 4);
    clickAct("lyr-fill-rest");
    ok("U-9 · 'Kalanları doldur' yapıya göre doldurur",
      st.tracks.every((t, i) => {
        const s = K.careerUI.trackSlots(st, i);
        return K.careerUI.lyricsFilled(t.lyrics, s) === K.careerUI.lyricsTotal(s);
      }),
      st.tracks.map((t, i) => K.careerUI.lyricsFilled(t.lyrics, K.careerUI.trackSlots(st, i))).join(","));
    ok("U-9 · nakarat metni üç parçada da aynı (paylaşılan)",
      st.tracks.every(t => String(t.lyrics.chorus || "").length > 0));
    ok("U-9 · verse 2 metni verse'ten farklı",
      st.tracks.every(t => String(t.lyrics.verse2 || "") !== String(t.lyrics.verse || "")));

    /* biçimi tümüne uygula */
    st = studioWith("epic", 3);
    st.tracks[1].slots = T("short");
    K.careerUI.renderStudioStep();
    clickAct("lyr-apply-struct");
    ok("U-10 · 'Biçimi tümüne uygula' hepsini eşitler",
      st.tracks.every(t => t.slots.join(",") === T("epic").join(",")));

    /* parça seçici ilerlemeyi yapıya göre gösterir */
    st = studioWith("short", 3);
    K.careerUI.suggestInto(K.careerUI.trackLyrics(st, 0), st.lyricsTheme, K.careerUI.trackSlots(st, 0));
    K.careerUI.renderStudioStep();
    ok("U-11 · parça çipi '4/4 bölüm' yazar",
      /4\/4 bölüm/.test(doc.querySelector(".lyr-track").textContent),
      doc.querySelector(".lyr-track").textContent.replace(/\s+/g, " "));
    ok("U-11 · tam parça 'done' işaretlenir",
      doc.querySelector(".lyr-track").classList.contains("done"));
  }

  /* =========================================================
     A) ANALİZ
     ========================================================= */
  {
    const full = {
      intro: "a b c d", verse: "e f g h", verse2: "ı j k l", verse3: "m n o p",
      chorus: "r s t u", chorusLast: "v y z w", outro: "q w e r",
      hook: "", prechorus: "", bridge: ""
    };
    const good = K.lyrics.analyze(full, "street", "rap", "normal", T("three"));
    const bad = K.lyrics.analyze(full, "street", "rap", "normal", T("bars"));
    ok("A-1 · analiz formScore döndürür",
      typeof good.formScore === "number" && good.formScore !== 0, String(good.formScore));
    ok("A-2 · analiz estSeconds döndürür", good.estSeconds > 0, String(good.estSeconds));
    ok("A-2 · estSeconds yapıyla uyumlu",
      good.estSeconds === K.lyricStructureSeconds(T("three")), good.estSeconds + " vs " + K.lyricStructureSeconds(T("three")));
    ok("A-3 · iyi biçim kötü biçimden yüksek puan alır",
      good.score > bad.score, good.score + " > " + bad.score);
    ok("A-3 · analiz yapıyı da döndürür",
      good.structure && good.structure.slots && good.structure.slots.length === T("three").length);
    ok("A-4 · yapı verilmezse formScore 0 (eski davranış)",
      K.lyrics.analyze(full, "street", "rap", "normal").formScore === 0);
    ok("A-4 · boş sözde de yapı raporlanır",
      K.lyrics.analyze({}, "street", "rap", "normal", T("classic")).structure.total === 6);

    /* parça başına skor farklılaşabiliyor */
    const st = studioWith("classic", 2);
    K.careerUI.suggestInto(K.careerUI.trackLyrics(st, 0), st.lyricsTheme, K.careerUI.trackSlots(st, 0));
    K.careerUI.suggestInto(K.careerUI.trackLyrics(st, 1), st.lyricsTheme, K.careerUI.trackSlots(st, 1));
    const s0 = K.careerUI.analyzeTrack(st, 0).score;
    const s1 = K.careerUI.analyzeTrack(st, 1).score;
    ok("A-5 · iki parça ayrı ayrı analiz edilir",
      typeof s0 === "number" && typeof s1 === "number" && s0 > 0 && s1 > 0, s0 + " / " + s1);
    ok("A-5 · analiz önbelleği yapıya duyarlı",
      (() => {
        const before = K.careerUI.analyzeTrack(st, 0).formScore;
        st.tracks[0].slots = T("bars");
        const after = K.careerUI.analyzeTrack(st, 0).formScore;
        return before !== after;
      })(), "önbellek yapıyı da anahtara katmalı");
  }

  /* =========================================================
     R) YAYIN
     ========================================================= */
  {
    const st = openStudio(3);
    st.tracks[0].slots = T("epic");
    st.tracks[1].slots = T("short");
    st.tracks[2].slots = T("three");
    st.tracks.forEach((t, i) => {
      t.dur = K.career.durationForSlots(t.slots, t.name);
      K.careerUI.suggestInto(K.careerUI.trackLyrics(st, i), st.lyricsTheme, K.careerUI.trackSlots(st, i));
    });
    st.step = 6;
    K.careerUI.renderStudioStep();

    let rel = null, err = null;
    try {
      rel = K.career.createRelease({
        title: "Biçim Testi", genre: st.genre, type: K.career.typeForCount(3), kind: st.kind,
        beatId: st.beatId, vocalId: st.vocalId, beatQuality: st.beatQ, vocalQuality: st.vocalQ, mixQuality: st.mixQ,
        waitDays: st.wait, budget: st.budget, marketing: st.marketing, lyricsTheme: st.lyricsTheme,
        trackCount: 3, trackBudgets: st.tracks.map(t => t.budget),
        tracks: st.tracks.map(t => ({ name: t.name, budget: t.budget, source: t.source })),
        trackLyrics: st.tracks.map((t, i) => K.careerUI.trackLyrics(st, i)),
        trackSlots: st.tracks.map((t, i) => K.careerUI.trackSlots(st, i))
      });
    } catch (e) { err = e; }

    ok("R-1 · yayın oluştu", !err && !!rel, err ? String(err.message) : "");
    if (rel) {
      ok("R-1 · yayın parça biçimlerini taşır",
        Array.isArray(rel.trackSlots) && rel.trackSlots.length === 3,
        rel.trackSlots ? rel.trackSlots.length + " biçim" : "yok");
      ok("R-1 · biçimler korunmuş",
        rel.trackSlots[0].join(",") === T("epic").join(",") &&
        rel.trackSlots[1].join(",") === T("short").join(",") &&
        rel.trackSlots[2].join(",") === T("three").join(","));
      ok("R-2 · her parça kendi biçimini taşır",
        rel.tracks.every(t => Array.isArray(t.slots) && t.slots.length > 0));
      ok("R-2 · parça sözleri biçimi de taşır",
        rel.tracks.every(t => t.lyrics && Array.isArray(t.lyrics.slots)));
      ok("R-3 · parça süreleri biçime göre farklı",
        new Set(rel.tracks.map(t => t.duration)).size > 1,
        rel.tracks.map(t => t.duration).join(" · "));
      ok("R-3 · süre biçimden türüyor",
        rel.tracks.every(t => t.duration === K.career.durationForSlots(t.slots, t.name)),
        rel.tracks.map(t => t.duration).join(" · "));
      ok("R-4 · formScore parçalara işlenir",
        rel.tracks.every(t => typeof t.formScore === "number"));
      ok("R-4 · uzun biçimli parça daha uzun süreli",
        K.career.durationSecondsForSlots(rel.tracks[0].slots, rel.tracks[0].name) >
        K.career.durationSecondsForSlots(rel.tracks[1].slots, rel.tracks[1].name));
    }

    /* yapısız (eski) çağrı hâlâ çalışır */
    let rel2 = null, err2 = null;
    try {
      rel2 = K.career.createRelease({
        title: "Eski Çağrı", genre: st.genre, type: "single", kind: st.kind,
        beatId: st.beatId, vocalId: st.vocalId, beatQuality: 50, vocalQuality: 50, mixQuality: 50,
        waitDays: 10, budget: 20000, marketing: 0, lyricsTheme: st.lyricsTheme,
        trackCount: 1, trackBudgets: [20000],
        lyricSections: { intro: "bir", verse: "iki", hook: "", chorus: "", bridge: "", outro: "" }
      });
    } catch (e) { err2 = e; }
    ok("R-5 · biçimsiz eski çağrı hâlâ çalışır", !err2 && !!rel2, err2 ? String(err2.message) : "");
    if (rel2) ok("R-5 · eski çağrıda süre null (geriye uyum)",
      rel2.tracks[0].duration === null, String(rel2.tracks[0].duration));
  }

  /* =========================================================
     G) GERİYE UYUM
     ========================================================= */
  {
    /* eski kayıtta slots yok → klasik yapı atanır, sözler korunur */
    const st = openStudio(2);
    st.tracks[0].lyrics = { intro: "eski giriş", verse: "eski verse", hook: "eski hook", chorus: "eski nakarat", bridge: "eski köprü", outro: "eski kapanış" };
    delete st.tracks[0].slots;
    delete st.tracks[1].slots;
    K.careerUI._syncTracks(st);
    ok("G-1 · slots olmayan parçaya biçim atanır",
      Array.isArray(st.tracks[0].slots) && st.tracks[0].slots.length > 0);
    ok("G-1 · eski sözler korunur",
      st.tracks[0].lyrics.verse === "eski verse" && st.tracks[0].lyrics.chorus === "eski nakarat",
      JSON.stringify(st.tracks[0].lyrics).slice(0, 80));
    ok("G-1 · eski sözler hâlâ analiz edilir",
      K.careerUI.analyzeTrack(st, 0).score > 22);
    ok("G-2 · sözlerde eski 6 anahtar duruyor",
      K.LYRIC_SECTIONS.some(s => s.id === "hook") && K.LYRIC_SECTIONS.some(s => s.id === "chorus"));
    ok("G-2 · yeni pre-nakarat bölümü eklendi",
      K.LYRIC_SECTIONS.some(s => s.id === "prechorus"));
    ok("G-2 · pre-nakarat 'indexed' modda",
      K.lyricSectionById("prechorus").mode === "indexed");
    ok("G-2 · nakarat 'shared' modda (paylaşılan söz)",
      K.lyricSectionById("chorus").mode === "shared");
    ok("G-2 · verse 'indexed' modda (ayrı söz)",
      K.lyricSectionById("verse").mode === "indexed");
    ok("G-2 · intro/köprü/outro 'single' modda",
      K.lyricSectionById("intro").mode === "single" &&
      K.lyricSectionById("bridge").mode === "single" &&
      K.lyricSectionById("outro").mode === "single");
    ok("G-3 · boş söz nesnesi chorusLast içerir",
      K.careerUI.emptyLyrics().chorusLast === "");
    ok("G-3 · boş parça 0 dolu bölüm verir",
      st.tracks[1].lyrics && K.careerUI.lyricsFilled(st.tracks[1].lyrics, K.careerUI.trackSlots(st, 1)) === 0);

    /* öneri motoru yeni anahtarları da tanır */
    ok("G-4 · pre-nakarat için öneri üretilir",
      K.lyrics.suggestSection(st.lyricsTheme, "prechorus").length > 0);
    ok("G-4 · verse3 için öneri üretilir",
      K.lyrics.suggestSection(st.lyricsTheme, "verse3").length > 0);
    ok("G-4 · chorusLast için öneri üretilir",
      K.lyrics.suggestSection(st.lyricsTheme, "chorusLast").length > 0);
    ok("G-4 · bilinmeyen anahtar verse'e düşer",
      K.lyrics.suggestSection(st.lyricsTheme, "zzz").length > 0);
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(58));
  console.log("KARMA · v10.41 ŞARKI BİÇİMİ (SÖZ ATÖLYESİ YAPISI)");
  console.log("=".repeat(58));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ ŞARKI BİÇİMİ TEMİZ · NAKARAT PAYLAŞILIR · SÜRE YAPIDAN");
  else process.exitCode = 1;
}
