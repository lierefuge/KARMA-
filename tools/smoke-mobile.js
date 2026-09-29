/* Kullanım: node tools/smoke-mobile.js
   KARMA — MOBİL / DOKUNMATİK KATMAN testi (v10.15)

   Neleri doğrular (hepsi gerçek mobil kırılma sınıfları):
   M-1  #app yüksekliği dinamik görünüm birimi (dvh) kullanıyor mu,
        yoksa 100vh + adres çubuğu payı yine içeriği keser mi?
   M-2  viewport-fit=cover var mı ve güvenli alan (safe-area) kuralları
        tanımlı mı? (çentik + home göstergesi dokunuşu yiyordu)
   M-3  16px girdi kuralı var mı? (iOS odak zoom'u düzeni bozuyordu)
   M-4  overscroll-behavior: none var mı? (pull-to-refresh kayıp riski)
   M-5  touch-action: manipulation + :active geri bildirimi var mı?
   M-6  alt gezinme çubuğu payı .layout'a eklenmiş mi?
   M-7  ≤620px'te telefon çerçevesi sabit oranı bırakıyor mu?
   +    mobile.css EN SON yükleniyor mu? (yükleme sırası kritik)
   +    tek dosya build'e gömülmüş ve doğru SIRADA mı?
   +    önbellek sürümü içerik hash'i ile tutarlı mı?
*/
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { readStampedVersion, computeVersion } = require("./cache-version.js");

const pass = [], fail = [];
const ok = (name, cond, extra) => (cond ? pass : fail).push(name + (extra ? " — " + extra : ""));

const indexFile = path.join(ROOT, "index.html");
const mobileFile = path.join(ROOT, "css", "mobile.css");
const buildFile = path.join(ROOT, "KARMA-Oyun.html");

const index = fs.readFileSync(indexFile, "utf8");
const mobile = fs.existsSync(mobileFile) ? fs.readFileSync(mobileFile, "utf8") : "";
const build = fs.existsSync(buildFile) ? fs.readFileSync(buildFile, "utf8") : "";

/* ---------- 0) dosya var mı ---------- */
ok("css/mobile.css mevcut", mobile.length > 0);
if (!mobile.length) { report(); }

/* ---------- yükleme sırası: EN SON olmalı ---------- */
const cssRefs = (index.match(/<link[^>]*rel="stylesheet"[^>]*href="(css\/[^"?]+)[^"]*"[^>]*>/g) || [])
  .map(t => (t.match(/href="([^"?]+)/) || [])[1]);
ok("mobile.css yerel CSS listesinde", cssRefs.indexOf("css/mobile.css") >= 0);
ok("mobile.css EN SON yükleniyor (diğerlerini ezebilsin)",
  cssRefs.length > 0 && cssRefs[cssRefs.length - 1] === "css/mobile.css",
  "son sıradaki: " + cssRefs[cssRefs.length - 1]);

/* ---------- M-1: dinamik görünüm yüksekliği ---------- */
ok("M-1 · 100dvh kuralı var", /100dvh/.test(mobile));
ok("M-1 · 100dvh için @supports yedeği var",
  /@supports[^{]*100dvh/.test(mobile));
ok("M-1 · #app hâlâ 100vh yedeğine sahip (eski tarayıcı)",
  /#app\s*\{[^}]*height:\s*100vh/.test(mobile));
ok("M-1 · #app dvh ile eziliyor (@supports içinde)",
  /@supports[^{]*100dvh[\s\S]{0,200}?#app\s*\{[^}]*height:\s*100dvh/.test(mobile));
ok("M-1 · küçük görünüm birimi (svh) koruması var", /100svh/.test(mobile));
/* GERÇEK INVARYANT: başka bir dosyada `height: 100vh !important` varsa
   mobil dvh düzeltmesini ezer ve kesilme geri gelir. Böyle bir kural olmamalı. */
{
  const cssDir = path.join(ROOT, "css");
  const offenders = fs.readdirSync(cssDir).filter(f => f.endsWith(".css")).filter(f => {
    const s = fs.readFileSync(path.join(cssDir, f), "utf8");
    return /height:\s*100vh\s*!important/.test(s) || /min-height:\s*100vh\s*!important/.test(s);
  });
  ok("M-1 · hiçbir CSS dosyası 100vh'ı !important ile sabitlemiyor",
    offenders.length === 0, offenders.join(", ") || "temiz");
}

/* ---------- M-2: güvenli alan ---------- */
ok("M-2 · viewport-fit=cover (index.html)",
  /viewport-fit\s*=\s*cover/.test(index));
ok("M-2 · --safe-top/--safe-bottom tanımlı",
  /--safe-top:\s*env\(safe-area-inset-top/.test(mobile) &&
  /--safe-bottom:\s*env\(safe-area-inset-bottom/.test(mobile));
ok("M-2 · üst bar güvenli alanına uyuyor",
  /\.topbar\s*\{[^}]*padding-top:\s*calc\([^)]*--safe-top/.test(mobile));
ok("M-2 · alt çubuk güvenli alanına uyuyor",
  /\.view-switch\s*\{[^}]*bottom:\s*calc\([^)]*--safe-bottom/.test(mobile));
ok("M-2 · yan güvenli alanlar kullanılıyor",
  /--safe-left/.test(mobile) && /--safe-right/.test(mobile));

/* ---------- M-3: iOS odak zoom'u ---------- */
ok("M-3 · dokunmatikte 16px girdi kuralı var",
  /input[^{,]*,[\s\S]{0,500}?font-size:\s*16px\s*!important/.test(mobile) &&
  /font-size:\s*16px\s*!important/.test(mobile));
ok("M-3 · metin otomatik büyütme kapatılmış",
  /text-size-adjust:\s*100%/.test(mobile));

/* ---------- M-4: overscroll ---------- */
ok("M-4 · overscroll-behavior: none", /overscroll-behavior(-y)?:\s*none/.test(mobile));

/* ---------- M-5: dokunuş ---------- */
ok("M-5 · touch-action: manipulation", /touch-action:\s*manipulation/.test(mobile));
ok("M-5 · tap-highlight temizlenmiş", /-webkit-tap-highlight-color:\s*transparent/.test(mobile));
ok("M-5 · :active geri bildirimi var", /\.btn:active[\s\S]{0,200}transform:\s*scale/.test(mobile));
ok("M-5 · dokunma hedefi 44px kuralı var", /min-height:\s*44px/.test(mobile));

/* ---------- M-6: alt çubuk payı ---------- */
ok("M-6 · --mobilnav-h tanımlı", /--mobilnav-h:\s*\d+px/.test(mobile));
ok("M-6 · .layout alt çubuk payını ekliyor",
  /\.layout\s*\{[^}]*padding[^;]*--mobilnav-h/.test(mobile));

/* ---------- M-7: küçük ekranda telefon çerçevesi ---------- */
ok("M-7 · ≤620px'te sabit oran bırakılıyor",
  /@media\s*\(max-width:\s*620px\)[\s\S]*?\.phone-frame\s*\{[\s\S]{0,600}?aspect-ratio:\s*auto/.test(mobile));
ok("M-7 · çerçeve köşe yarıçapı küçültülüyor",
  /--radius-device:\s*2[0-9]px/.test(mobile));
ok("M-7 · yan fiziksel tuşlar küçük ekranda gizli",
  /\.phone-frame::(before|after)[\s\S]{0,120}display:\s*none/.test(mobile));

/* ============================================================
   M-8 (v10.17.1) — DOKUNMA ERGONOMİSİ KAPSAMI
   Dış cihaz ergonomisi (44/48 px hedef, 16 px girdi) SİMÜLE
   TELEFONUN İÇİNE uygulanmamalı. O arayüz 390×800 minyatür olarak
   tasarlandı; oraya dış ölçüleri zorlamak mobilde düzeni bozuyordu.

   INVARYANT: dokunmatik blokta 44 px+ hedef veren HER kural
   KAPSAMLI olmalı (seçicisinde boşluk = torun seçici). Çıplak
   `.ig-btn { min-height: 44px }` gibi kurallar yasak.
   ============================================================ */
{
  /* YORUMLARI ÇIKAR — aksi hâlde yorum içindeki örnek kod gerçek
     kural sanılır (ilk denemede tam bu oldu: bir düzeltme yorumunu
     ihlal olarak işaretledi). */
  const css = mobile.replace(/\/\*[\s\S]*?\*\//g, "");

  /* yalnızca (pointer: coarse) bloklarını ayıkla */
  const blocks = [];
  const re = /@media\s*\(pointer:\s*coarse\)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let i = m.index + m[0].length, depth = 1, j = i;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    blocks.push(css.slice(i, j - 1));
  }
  ok("M-8 · dokunmatik blokları bulundu", blocks.length >= 2, blocks.length + " blok");

  /* Simüle telefon ekranının İÇİNDE kullanılan sınıflar. Bunlar
     yalnızca bir OYUN KABUĞU kapsamı ile hedeflenebilir. */
  const innerUI = ["ig-btn", "ig-tab", "ig-cell", "ig-hl", "phone-tab", "p-row", "dm-select-row", "dm-send"];
  const chromeScopes = [".topbar", ".modal-root", ".career-panel", ".view-switch", ".toast-stack"];
  const offenders = [];

  blocks.forEach((blk) => {
    const rules = blk.match(/[^{}]+\{[^{}]*\}/g) || [];
    rules.forEach((r) => {
      const sel = r.slice(0, r.indexOf("{")).trim();
      const body = r.slice(r.indexOf("{"));
      const big = /min-height:\s*(4[4-9]|[5-9][0-9])px/.test(body) || /width:\s*4[4-9]px/.test(body);
      if (!big) return;

      /* kural birden çok seçici taşıyabilir (virgüllü) */
      const sels = sel.split(",").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
      sels.forEach((one) => {
        /* (1) kapsamlı olmalı: torun ilişkisi içermeli */
        if (one.indexOf(" ") < 0) offenders.push(one + " → kapsamsız hedef");
        /* (2) iç telefon UI sınıfı hedefliyorsa kabuk kapsamı şart */
        innerUI.forEach((c) => {
          if (new RegExp("\\." + c + "\\b").test(one)) {
            const okScope = chromeScopes.some((s) => one.indexOf(s) === 0);
            if (!okScope) offenders.push(one + " → iç telefon UI'ını (." + c + ") kabuk kapsamı olmadan hedefliyor");
          }
        });
      });
    });
  });
  ok("M-8 · hedef büyütme kapsamlı ve sadece oyun kabuğunda",
    offenders.length === 0, offenders.slice(0, 3).join(" | ") || "temiz");

  /* oyun kabuğu hedefleri gerçekten var mı (aşırı geri çekme olmasın) */
  const coarseAll = blocks.join("\n");
  ok("M-8 · oyun kabuğu hedefleri korunuyor",
    /\.topbar \.btn/.test(coarseAll) && /\.view-switch \.vs-btn/.test(coarseAll),
    "üst bar + alt çubuk kuralları mevcut");

  /* --mobilnav-h tanımı yalnızca :root bloklarında olmalı; başka bir
     seçicide tanımlanırsa aşağı doğru yayılmaz ve .layout onu okuyamaz. */
  const navRules = (css.match(/[^{}]+\{[^{}]*\}/g) || [])
    .filter((r) => /--mobilnav-h:/.test(r))
    .map((r) => r.slice(0, r.indexOf("{")).trim())
    .filter((s) => s !== ":root" && s !== "html");
  ok("M-8 · --mobilnav-h yalnızca :root'ta tanımlı", navRules.length === 0,
    navRules.join(" | ") || "temiz");

  /* flex'te `stretch` geçersizdir → justify-content'te olmamalı */
  ok("M-8 · geçersiz `justify-content: stretch` yok",
    !/justify-content:\s*stretch/.test(css));

  /* kaydırıcı/onay kutusu 16px'e zorlanmamalı */
  ok("M-8 · 16px kuralı range/checkbox/radio dışında",
    /input:not\(\[type="range"\]\)/.test(css));
}

/* ---------- etiketler: kısa/uzun ---------- */
ok("etiketler: kısa biçim markup'ta", /class="vs-mini"/.test(index));
ok("etiketler: kısa biçim yalnızca dar ekranda",
  /\.vs-mini\s*\{\s*display:\s*none/.test(mobile) && /\.vs-long\s*\{\s*display:\s*none/.test(mobile));

/* ---------- tek dosya build'e gömülü mü ve SIRASI doğru mu ---------- */
if (build) {
  ok("build: mobile.css gömülü", /==== css\/mobile\.css ====/.test(build));
  const order = ["css/main.css", "css/ytplayer.css", "css/mobile.css"]
    .map(n => ({ n, i: build.indexOf("==== " + n + " ====") }));
  ok("build: mobile.css gömme sırası EN SON",
    order.every(o => o.i >= 0) && order[2].i > order[1].i && order[1].i > order[0].i,
    order.map(o => o.n + "@" + o.i).join(" · "));
  ok("build: viewport-fit=cover taşınıyor", /viewport-fit\s*=\s*cover/.test(build));
  ok("build: alt çubuk etiketleri taşınıyor", /vs-mini/.test(build));
  ok("build: gömülü mobile.css dvh kuralı içeriyor", /100dvh/.test(build));
  /* eski hatalı durum geri gelmesin: gömülü CSS'te tüm .field girdileri 13px
     kalabilir (masaüstü), ama dokunmatik kuralı 16px olmalı */
  ok("build: dokunmatik 16px kuralı gömülü",
    /font-size:\s*16px\s*!important/.test(build));
} else {
  fail.push("build: KARMA-Oyun.html yok — önce: node tools/build-single.js");
}

/* ---------- önbellek sürümü tutarlı mı ---------- */
const stamped = readStampedVersion(index);
const { version } = computeVersion(ROOT);
ok("önbellek sürümü içerik hash'i ile güncel (B-8)", stamped === version,
  "index ?v=" + stamped + " · içerik ?v=" + version);

report();

function report() {
  console.log("\n============ MOBİL KATMAN SONUCU ============");
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length);
  if (fail.length) {
    console.log("\n❌ BAŞARISIZ");
    fail.forEach(f => console.log("   · " + f));
  }
  if (!fail.length) console.log("\n✅ MOBİL KATMAN TAM — kırılma sınıfları kapatıldı");
  else process.exitCode = 1;
}
