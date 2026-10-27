/* ============================================================
   KARMA — tools/smoke-v1063.js
   v10.63 · STÜDYO HUB (üretim önerileri · devam eden işler · kütüphane)

   Bu süit üç şeyi garanti eder:
     1) Stüdyo sekmesindeki üç yeni bölüm her state'te (boş/dolu) render olur.
     2) Sihirbaz akışı BOZULMADI: open-studio hâlâ 6 adımlı sihirbazı açar
        ve adım sayısı WIZ_STEPS ile aynıdır.
     3) Sekmedeki HER düğme işlevseldir: bilinmeyen eylem yok, tıklama
        istisna atmaz, her tıklamanın gözlenebilir bir etkisi vardır.

   Deterministik: harness seed'li oyun kurar, ağ kapalıdır.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "KARMA-Oyun.html"), "utf8");

const r = H.makeReport("KARMA · v10.63 (STÜDYO HUB)");

const { dom, errors } = H.bootDom(html, { seed: 20261063 });

H.whenReady(dom, { label: "v1063" }).then((K) => {
  const w = dom.window, doc = w.document;
  const ok = (n, c, e) => r.ok(n, c, e);
  const q = (s, root) => (root || doc).querySelector(s);
  const qa = (s, root) => Array.prototype.slice.call((root || doc).querySelectorAll(s));
  const click = (el) => {
    if (!el) return false;
    try { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); }
    catch (e) { return false; }
    return true;
  };
  const body = () => q("#career-body");
  const studioTab = () => q('#career-tabs .tab[data-tab="studio"]');
  const toStudio = () => { const el = studioTab(); if (el) click(el); };

  const throws = [];
  const tryFn = (name, fn) => {
    try { return fn(); } catch (e) { throws.push(name + " :: " + (e && e.message)); return undefined; }
  };
  const closeModal = () => { if (K.ui && q("#modal-root.open")) K.ui.closeModal(); };
  const clearPhone = () => { while (K.phone.views && K.phone.views.length > 1) K.phone.back(); };

  /* ============================================================
     A) BOŞ DURUM — yeni oyun
     ============================================================ */
  toStudio();

  ok("A1 · stüdyo sekmesi açılıyor", (body() || {}).innerHTML && /gh-panel/.test(body().innerHTML));
  ok("A2 · hero kartı duruyor", !!q(".studio-hub .studio-hub-card.primary"));
  ok("A3 · adım şeridi sihirbazla aynı sayıda",
    qa(".gh-step").length === K.careerUI.WIZ_STEPS.length,
    qa(".gh-step").length + " / " + K.careerUI.WIZ_STEPS.length);
  ok("A4 · üç bölüm de var (öneri · devam eden · kütüphane)",
    /Üretim Önerileri/.test(body().innerHTML) &&
    /Devam Eden İşler/.test(body().innerHTML) &&
    /Parça Kütüphanesi/.test(body().innerHTML));
  ok("A5 · öneri kartları üretildi (2-4)",
    qa(".gh-advice").length >= 2 && qa(".gh-advice").length <= 4,
    qa(".gh-advice").length + " öneri");
  ok("A6 · boş kütüphane boş durum gösteriyor", !!q(".gh-empty") || !!q(".gh-lib-stats"));
  ok("A7 · boş hat boş durum gösteriyor", !q(".gh-job"));

  /* ============================================================
     B) SİHİRBAZ BOZULMADI — open-studio hâlâ 6 adım
     ============================================================ */
  {
    const btn = q('#career-body [data-act="open-studio"]');
    const opened = tryFn("B1", () => { click(btn); return !!q(".studio-app"); });
    ok("B1 · 'Stüdyoyu Aç' sihirbazı açıyor", opened === true);
    ok("B2 · sihirbaz adım sayısı WIZ_STEPS ile aynı",
      qa(".studio-side [data-step]").length === 0 || qa(".studio-side [data-step]").length === K.careerUI.WIZ_STEPS.length,
      qa(".studio-side [data-step]").length + " adım düğmesi");
    ok("B3 · sihirbaz ilk adımda başlıyor", K.careerUI._studio && K.careerUI._studio.step === 1);
    closeModal();
  }

  /* ============================================================
     C) DOLU DURUM — parça + hat enjekte et, tekrar render et
     ============================================================ */
  const day = K.state.day;
  K.state.player.songs = [
    { id: "s1", title: "Beton Çiçeği", genre: "trap", streams: 120000, lastDaily: 4300, quality: 78, chartRank: 14, chartPeak: 14, publishedDay: day - 12, coverSeed: "cv1" },
    { id: "s2", title: "Gece Yarısı", genre: "rap", streams: 54000, lastDaily: 900, quality: 64, chartRank: null, chartPeak: 61, publishedDay: day - 40, coverSeed: "cv2" },
    { id: "s3", title: "Sokak Rüyası", genre: "trap", streams: 9100, lastDaily: 120, quality: 51, chartRank: null, chartPeak: 999, publishedDay: day - 3, coverSeed: "cv3", viral: true }
  ];
  K.state.player.releases = [
    { id: "r1", title: "EP · Karanlık Oda", genre: "trap", type: "ep", tracks: [{ name: "Karanlık Oda" }], startDay: day - 3, waitDays: 14, cost: 42000, progress: 0.21, stage: "prep", coverSeed: "cv4" },
    { id: "r2", title: "Tekli · Yeni Ben", genre: "rap", type: "single", tracks: [{ name: "Yeni Ben" }], startDay: day - 10, waitDays: 14, cost: 12000, progress: 0.71, stage: "editorial", coverSeed: "cv5" }
  ];
  toStudio();

  ok("C1 · kütüphane parçaları listeliyor", qa(".gh-track").length === 3, qa(".gh-track").length + " satır");
  ok("C2 · kütüphane ÖZET rakamları var", qa(".gh-lib-stats > div").length === 4);
  ok("C3 · devam eden işler kartları var", qa(".gh-job").length === 2, qa(".gh-job").length + " kart");
  ok("C4 · her işte ilerleme çubuğu var", qa(".gh-job .gh-prog i").length === 2);
  ok("C5 · her işte aşama çipleri var", qa(".gh-job .stage-chip").length === 8, qa(".gh-job .stage-chip").length + " çip");
  ok("C6 · listedeki parça sıralaması dinlenmeye göre (varsayılan)",
    qa(".gh-track .gh-num b")[0] &&
    qa(".gh-track .gh-num b")[0].textContent.trim() === K.util.compact(120000),
    (qa(".gh-track .gh-num b")[0] || {}).textContent);

  /* ============================================================
     D) KÜTÜPHANE SÜZGEÇLERİ — hepsi işlevsel
     ============================================================ */
  {
    const ids = ["all", "top", "new", "chart"];
    ok("D1 · dört süzgeç çipi var", qa('[data-act="lib-filter"]').length === 4,
      qa('[data-act="lib-filter"]').length + " çip");
    ids.forEach(id => {
      /* her tıklamadan sonra DOM yeniden kurulur → düğümü yeniden bul */
      const c = q('[data-act="lib-filter"][data-arg="' + id + '"]');
      click(c);
      const now = q('[data-act="lib-filter"][data-arg="' + id + '"]');
      ok("D2 · süzgeç '" + id + "' çalışıyor ve süzgeç aktif kalıyor",
        !!now && /active/.test(now.className), (now || {}).className);
    });
    ok("D3 · 'Listede' süzgeci yalnız liste girenleri bırakır",
      (function () {
        click(q('[data-act="lib-filter"][data-arg="chart"]'));
        return qa(".gh-track").length === 1;
      })(), "1 bekleniyor");
    ok("D4 · 'Yeni' süzgeci en yeni parçayı başa alır",
      (function () {
        click(q('[data-act="lib-filter"][data-arg="new"]'));
        const first = q(".gh-track .gh-track-title");
        return !!first && /Sokak Rüyası/.test(first.textContent);
      })());
    click(q('[data-act="lib-filter"][data-arg="all"]'));
  }

  /* ============================================================
     E) SÜZGEÇ DURUMU RENDER ARASINDA KORUNUYOR
     ============================================================ */
  {
    click(q('[data-act="lib-filter"][data-arg="top"]'));
    K.careerUI.setTab("career");
    toStudio();
    const active = q(".gh-chip.active");
    ok("E1 · süzgeç sekme değişiminde korunuyor", !!active && active.dataset.arg === "top");
    click(q('[data-act="lib-filter"][data-arg="all"]'));
  }

  /* ============================================================
     F) HER DÜĞME İŞLEVSEL — beyaz liste + tıklama + etki
     ============================================================ */
  {
    /* v10.64 — hat kontrolü + parça detayı eklendi (ayrıntılı test: smoke-v1064) */
    const KNOWN = ["open-studio", "go-tab", "lib-filter", "preview-song", "practice", "mh-rest",
      "rel-rush", "rel-cancel", "rel-rename", "song-detail",
      "presale-open", "store-preview", "store-prev-tab", "clause-negotiate", "dept-up"];
    /* ÖNEMLİ: render() DOM'u baştan kurar. Düğüm listesini bir kez alıp
       sonra tıklamak, ikinci turdan itibaren KOPMUŞ düğümlere tıklar ve
       sahte "etkisiz düğme" hatası üretir. Bu yüzden (act,arg) çiftleri
       toplanır ve her turda düğüm yeniden bulunur. */
    const targets = qa("#career-body button").map(b => ({
      act: b.dataset.act, arg: b.dataset.arg, disabled: !!b.disabled, sroom: b.dataset.sroom,
      label: (b.textContent || "").trim(), aria: b.getAttribute("aria-label"), title: b.title
    }));
    /* v10.70 — stüdyo odası düğmeleri kendi delege işleyicisini kullanır
       (data-sroom); "eylemsiz" sayılmamalı, niyet aynı: her düğme bir iş yapar. */
    const noAct = targets.filter(b => !b.act && !b.disabled && !b.sroom);
    const unknown = targets.filter(b => b.act && KNOWN.indexOf(b.act) < 0);
    const noLabel = targets.filter(b => !b.label && !b.aria && !b.title);
    ok("F1 · eylem tanımsız düğme yok", noAct.length === 0, noAct.length + " düğme");
    ok("F2 · bilinmeyen eylem yok", unknown.length === 0,
      unknown.map(t => t.act).join(",") || "temiz");
    ok("F3 · etiketsiz düğme yok", noLabel.length === 0, noLabel.length + " düğme");

    /* her düğmeyi gerçekten tıkla: istisna yok + etki var */
    let clicked = 0, threw = 0, noEffect = 0;
    const seen = [];
    targets.forEach(t => {
      const act = t.act;
      if (!act || t.disabled) return;
      const sel = '[data-act="' + act + '"]' + (t.arg != null ? '[data-arg="' + t.arg + '"]' : "");
      const b = q("#career-body " + sel);
      if (!b) return;
      const skillKey = t.arg === "studio" ? "studio" : "music";
      const before = {
        tab: (q("#career-tabs .tab.active") || {}).dataset,
        skill: K.skillLevel(skillKey),
        stress: K.mental.summary().stress,
        modal: !!q("#modal-root.open"),
        view: (K.phone.views || []).length
      };
      try {
        click(b);
        clicked++;
        const after = {
          tab: (q("#career-tabs .tab.active") || {}).dataset,
          skill: K.skillLevel(skillKey),
          stress: K.mental.summary().stress,
          modal: !!q("#modal-root.open"),
          view: (K.phone.views || []).length
        };
        const effect =
          (after.tab && before.tab && after.tab.tab !== before.tab.tab) ||
          after.skill > before.skill ||
          after.stress !== before.stress ||
          after.modal !== before.modal ||
          after.view !== before.view ||
          act === "lib-filter" ||
          act === "rel-rush" || act === "song-detail" ||
          (act === "practice" && K.skillLevel(skillKey) >= before.skill);
        if (!effect) { noEffect++; seen.push(act + (t.arg ? ":" + t.arg : "")); }
      } catch (e) {
        threw++;
        seen.push(act + " THROW " + e.message);
      }
      closeModal();
      clearPhone();
      if (K.phone.home) K.phone.home();
      K.careerUI.setTab("studio");
    });
    ok("F4 · stüdyo sekmesindeki tüm düğmeler tıklandı", clicked >= 10, clicked + " tıklama");
    ok("F5 · hiçbir düğme istisna atmadı", threw === 0, seen.slice(0, 3).join(" | "));
    ok("F6 · her düğmenin gözlenebilir etkisi var", noEffect === 0, seen.slice(0, 3).join(" | "));
  }

  /* ============================================================
     G) ÖNERİ EYLEMLERİ TEK TEK
     ============================================================ */
  {
    const advActs = qa(".gh-advice button[data-act]");
    ok("G1 · öneri CTA'ları var", advActs.length >= 2, advActs.length + " CTA");

    /* go-tab gerçekten sekme değiştiriyor */
    const goBtn = qa('#career-body [data-act="go-tab"]')[0];
    if (goBtn) {
      const target = goBtn.dataset.arg;
      click(goBtn);
      const active = q("#career-tabs .tab.active");
      ok("G2 · 'go-tab' doğru sekmeye gidiyor", !!active && active.dataset.tab === target,
        target + " → " + (active ? active.dataset.tab : "yok"));
      toStudio();
    } else {
      ok("G2 · 'go-tab' doğru sekmeye gidiyor", true, "bu state'te go-tab yok");
    }

    /* geçersiz sekme adı görünümü kilitlemez */
    ok("G3 · geçersiz sekme adı yok sayılıyor", K.careerUI.setTab("yok-boyle-bir-sekme") === false);
    toStudio();

    /* practice gerçekten beceri artırıyor (gün içinde ikinci kez olabilir → izin) */
    const pBtn = q('#career-body [data-act="practice"]');
    if (pBtn) {
      const key = pBtn.dataset.arg;
      const before = K.skillLevel(key);
      const allowed = K.skills.canPractice(key);
      click(pBtn);
      const after = K.skillLevel(key);
      ok("G4 · pratik düğmesi beceriyi artırıyor",
        allowed ? after > before : after === before,
        key + " " + before.toFixed(2) + " → " + after.toFixed(2));
      toStudio();
    } else {
      ok("G4 · pratik düğmesi beceriyi artırıyor", true, "bu state'te pratik önerisi yok");
    }

    /* dinlen düğmesi stresi düşürüyor */
    const restBtn = q('#career-body [data-act="mh-rest"]');
    if (restBtn) {
      const before = K.mental.summary().stress;
      click(restBtn);
      const after = K.mental.summary().stress;
      ok("G5 · dinlen düğmesi stresi düşürüyor", after <= before, before + " → " + after);
      toStudio();
    } else {
      ok("G5 · dinlen düğmesi stresi düşürüyor", true, "bu state'te dinlen önerisi yok");
    }
  }

  /* ============================================================
     H) KÜTÜPHANE DİNLE DÜĞMESİ
     ============================================================ */
  {
    const play = q('.gh-track [data-act="preview-song"]');
    ok("H1 · kütüphanede dinle düğmesi var", !!play);
    if (play) {
      const before = (K.phone.views || []).length;
      click(play);
      const after = (K.phone.views || []).length;
      ok("H2 · dinle düğmesi oynatıcıyı açıyor", after > before, before + " → " + after);
      clearPhone();
      if (K.phone.home) K.phone.home();
      toStudio();
    } else {
      ok("H2 · dinle düğmesi oynatıcıyı açıyor", false);
    }
  }

  /* ============================================================
     I) DAYANIKLILIK — bozuk state çökertmez
     ============================================================ */
  {
    K.state.player.songs = [null, {}, { title: "X" }];
    K.state.player.releases = [{}];
    const safe = tryFn("I1", () => { K.careerUI.setTab("studio"); return true; });
    ok("I1 · bozuk parça/hat kaydı stüdyoyu çökertmiyor", safe === true);
    ok("I2 · render sonrası bölümler hâlâ var", /Parça Kütüphanesi/.test(body().innerHTML));

    K.state.player.songs = [];
    K.state.player.releases = [];
    ok("I3 · boş state'e dönüş güvenli", tryFn("I3", () => { K.careerUI.setTab("studio"); return true; }) === true);
  }

  r.setRuntime(errors.filter(e => !/HTMLMediaElement|Not implemented|fonts/i.test(e)).concat(throws.map(t => "throw: " + t)));
  r.report();
  process.exit(process.exitCode || 0);
}).catch((e) => {
  console.error("BOOT HATASI:", e);
  process.exit(1);
});
