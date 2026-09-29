#!/usr/bin/env node
/* ============================================================
   KARMA — tools/sim-balance.js
   DENGE ANALİZİ: 400+ günlük tam oyun simülasyonu.

   Oyunu jsdom içinde gerçek gün döngüsüyle çalıştırır, scriptli bir
   "oyuncu politikası" uygular (yayın üret, tanıt, gerekirse yan iş yap)
   ve ekonomi / dinlenme / ilerleme dengesini ölçer.

   Kullanım:
     node tools/sim-balance.js                  # 3 profil, 420 gün
     node tools/sim-balance.js --days 600
     node tools/sim-balance.js --profile standard
     node tools/sim-balance.js --json           # ham veriyi JSON dök

   Determinizm: Math.random tohumlanır (seed), böylece aynı kod aynı
   sonucu verir; iki sürümü karşılaştırmak mümkün olur.
   ============================================================ */
const { JSDOM, VirtualConsole } = require("/home/user/node_modules/jsdom");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "KARMA-Oyun.html");

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const DAYS = parseInt(argOf("days", "420"), 10);
const ONLY = argOf("profile", null);
const AS_JSON = argv.includes("--json");
const SEED = parseInt(argOf("seed", "20260928"), 10);

/* ---------------- oyuncu profilleri ---------------- */
const PROFILES = {
  casual: {
    label: "Rahat", note: "60 günde bir single · düşük bütçe · promo yok",
    releaseGap: 60, budgetShare: 0.18, marketShare: 0.02, promo: [], jobsWhenBroke: true,
    trackCount: 1, waitDays: 24
  },
  standard: {
    label: "Standart", note: "30 günde bir single · orta bütçe · playlist promo",
    releaseGap: 30, budgetShare: 0.30, marketShare: 0.08, promo: ["playlist"], jobsWhenBroke: true,
    trackCount: 1, waitDays: 18
  },
  grinder: {
    label: "Çalışkan", note: "20 günde bir yayın · yüksek bütçe · ağır promo + yan iş",
    releaseGap: 20, budgetShare: 0.42, marketShare: 0.14, promo: ["playlist", "radio", "billboard"],
    jobsWhenBroke: true, trackCount: 2, waitDays: 13
  }
};

/* ---------------- boot ---------------- */
if (!fs.existsSync(FILE)) {
  console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js");
  process.exit(1);
}

function boot() {
  const html = fs.readFileSync(FILE, "utf8");
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { const m = e.detail ? e.detail.message : e.message; if (!/fonts/.test(m)) errs.push(m); });
  const dom = new JSDOM(html, {
    url: "https://karma.local/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error("offline"));
      /* TOHUMLU RNG — determinizm */
      let a = SEED >>> 0;
      w.Math.random = function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      w.addEventListener("error", (e) => errs.push("onerror: " + (e.error ? e.error.message : e.message)));
    }
  });
  return { dom, errs };
}

/* jsdom senkron kurulur; K birkaç tick sonra hazır olur */
function ready(dom, cb) {
  let n = 0;
  const t = setInterval(() => {
    if (dom.window.K && dom.window.K.phone && dom.window.K.career && dom.window.K.game) {
      clearInterval(t); cb(dom.window.K);
    } else if (++n > 200) { clearInterval(t); throw new Error("oyun boot edilemedi"); }
  }, 25);
}

/* ---------------- oyuncu politikası ---------------- */
/* gerçek yan iş kimlikleri (js/systems/jobs.js LIST) */
const JOB_IDS = ["prod", "set", "dj", "jingle", "ses", "studyokirala", "ders", "beat", "studio", "kurye", "market", "kafe", "street"];

function doJobs(K, maxPerDay) {
  let done = 0;
  for (const id of JOB_IDS) {
    if (done >= maxPerDay) break;
    const job = K.jobs.LIST.find((j) => j.id === id);
    if (!job) continue;
    const cap = job.perDay || 1;
    for (let n = 0; n < cap; n++) {
      if (done >= maxPerDay) break;
      if (!K.jobs.unlocked(job)) break;
      if (K.jobs.todayCount(id) >= cap) break;
      try { if (K.jobs.work(id)) done++; else break; } catch (e) { break; }
    }
  }
}

function startRelease(K, prof, day) {
  const s = K.state, p = s.player;
  const cash = Math.max(0, s.balance);
  const budget = Math.min(600000, Math.max(8000, Math.round(cash * prof.budgetShare)));
  const marketing = Math.min(250000, Math.max(0, Math.round(cash * prof.marketShare)));
  const count = prof.trackCount;
  const rel = K.career.createRelease({
    title: K.career.suggestTitle() + " " + day,
    genre: p.genre || "trap",
    kind: "normal",
    trackCount: count,
    budget,
    marketing,
    waitDays: prof.waitDays,
    trackBudgets: new Array(count).fill(Math.round(budget / count)),
    tracks: K.career.suggestTracks(count).map((n) => ({ name: n, budget: Math.round(budget / count), source: "study" })),
    lyricsTheme: "street",
    lyricSections: {
      intro: "",
      verse: "Betonun üstünde büyüdük biz\nHer iz bir hikâye bıraktı",
      hook: "Hayat bize gülmedi ama biz gülümsedik",
      chorus: "", bridge: "", outro: ""
    },
    conceptId: "open",
    strategy: "standard",
    stores: (K.defaultStores ? K.defaultStores() : [])
  });
  return rel;
}

function promoteNewSongs(K, prof, publishedSince) {
  const p = K.state.player;
  (p.songs || []).forEach((sg) => {
    if ((sg.publishedDay || 0) < publishedSince) return;
    if (sg._simPromoted) return;
    sg._simPromoted = true;
    prof.promo.forEach((ch) => { try { K.career.promote(sg.id, ch); } catch (e) {} });
    prof.promo.forEach(() => {});
  });
}

/* ---------------- tek koşu ---------------- */
/* nakit akışı defteri — her gelir/gider kalemini sebebine göre toplar.
   ÖNEMLİ: orijinal fonksiyonlar bir kez saklanır; her profilde yeniden
   sarmak önceki profilin defterine sızıntı yapar. */
function installLedger(K, ledger) {
  const O = K._simOrig = K._simOrig || {
    earn: K.economy.earn.bind(K.economy),
    spend: K.economy.spend.bind(K.economy)
  };
  K.economy.earn = function (amount, reason) {
    const r = O.earn(amount, reason);
    if (r && amount > 0) ledger.in[reason || "diğer"] = (ledger.in[reason || "diğer"] || 0) + amount;
    return r;
  };
  K.economy.spend = function (amount, reason) {
    const r = O.spend(amount, reason);
    if (r) ledger.out[reason || "diğer"] = (ledger.out[reason || "diğer"] || 0) + amount;
    return r;
  };
}

function runProfile(K, prof, days) {
  K.state = K.newGame();
  K.state.player.stageName = "SIM";
  K.state.player.genre = "trap";
  K.state.player.popularity = 3;
  K.state.player.age = 19;          // yetişkin: yan işler erişilebilir
  K.state.player.birth = null;
  K.state.started = true;

  const ledger = { in: {}, out: {} };
  installLedger(K, ledger);

  const rows = [];
  let lastReleaseDay = -999;
  let peak = { monthly: 0, day: 0, daily: 0, dailyDay: 0 };
  let bankruptMonths = 0, debtMonths = 0;
  let prevCum = 0;

  for (let d = 0; d < days; d++) {
    const s = K.state, p = s.player;

    /* --- politika --- */
    const activeRel = (p.releases || []).length;
    if (p.debt > 0 || s.balance < 45000) doJobs(K, prof.jobsWhenBroke ? 5 : 2);
    if (!activeRel && (s.day - lastReleaseDay) >= prof.releaseGap) {
      if (s.balance >= 15000) { if (startRelease(K, prof, s.day)) lastReleaseDay = s.day; }
      else doJobs(K, 5);
    }

    /* --- gün --- */
    K.game.nextDay();
    promoteNewSongs(K, prof, s.day - (prof.waitDays + 3));

    /* --- ölçüm --- */
    const daily = (p.songs || []).reduce((n, x) => n + (x.dailyStreams || 0), 0);
    const cum = p.streams || 0;
    const followers = (p.ig || 0) + (p.tiktok || 0) + (p.x || 0);
    const top = (p.songs || []).slice().sort((a, b) => (b.dailyStreams || 0) - (a.dailyStreams || 0))[0] || null;
    const lf = p.lastFinance || null;
    const payout = (p.payouts || [])[0] || null;

    rows.push({
      day: s.day,
      balance: Math.round(s.balance),
      debt: Math.round(p.debt || 0),
      cum, dailyStreams: Math.round(daily),
      dayStreams: Math.round(cum - prevCum),
      monthly: Math.round(p.monthly || 0),
      popularity: +(p.popularity || 0).toFixed(1),
      followers: Math.round(followers),
      songs: (p.songs || []).length,
      reputation: +(p.reputation || 0).toFixed(1),
      fx: +((s.econ && s.econ.fx) || K.ECON.baseFx).toFixed(2),
      infl: +((s.econ && s.econ.inflationIndex) || 1).toFixed(3),
      topDaily: top ? Math.round(top.dailyStreams || 0) : 0,
      topTitle: top ? top.title : "",
      topId: top ? top.id : "",
      chartMine: (s.chart || []).filter((e) => e.mine).length,
      /* liste üyeliği song.lists alanında tutulur (song.playlists değil) */
      activeLists: (p.songs || []).reduce((n, x) => n + (x.lists || []).filter((e) => !e.exitDay).length, 0),
      maxPlays: (p.songs || []).reduce((n, x) => Math.max(n, (x.lists || []).filter((e) => !e.exitDay).length), 0),
      everLists: (p.songs || []).reduce((n, x) => n + (x.lists || []).length, 0),
      avgQuality: (p.songs || []).length
        ? Math.round((p.songs || []).reduce((n, x) => n + (x.quality || 0), 0) / p.songs.length) : 0,
      finance: lf ? { income: lf.income, upkeep: lf.upkeep, tax: lf.tax, net: lf.net, margin: lf.margin } : null,
      payout: payout ? { day: payout.day, gross: payout.gross, net: payout.net, streams: payout.spotify + payout.apple + payout.youtube + payout.other, waiting: payout.waiting } : null
    });
    prevCum = cum;

    if (rows[rows.length - 1].monthly > peak.monthly) { peak.monthly = rows[rows.length - 1].monthly; peak.day = s.day; }
    if (rows[rows.length - 1].dailyStreams > peak.daily) { peak.daily = rows[rows.length - 1].dailyStreams; peak.dailyDay = s.day; }
    if (lf && lf.net < 0) bankruptMonths++;
    if ((p.debt || 0) > 0) debtMonths++;
  }

  return { rows, peak, bankruptMonths, debtMonths, ledger };
}

/* ---------------- analiz ---------------- */
function analyze(run) {
  const rows = run.rows;
  const last = rows[rows.length - 1];
  const fin = rows.map((r) => r.finance).filter(Boolean);
  const payouts = rows.map((r) => r.payout).filter(Boolean);

  const firstMonthIncome = fin.length ? fin[0].income : 0;
  const lastMonthIncome = fin.length ? fin[fin.length - 1].income : 0;
  const totalIncome = fin.reduce((n, f) => n + f.income, 0);
  const totalUpkeep = fin.reduce((n, f) => n + f.upkeep, 0);
  const totalTax = fin.reduce((n, f) => n + f.tax, 0);
  const avgMargin = fin.length ? fin.reduce((n, f) => n + f.margin, 0) / fin.length : 0;

  /* dinlenme eğrisi: tepe günü ve sonrası */
  const half = Math.floor(rows.length / 2);
  const firstHalfStreams = rows.slice(0, half).reduce((n, r) => n + r.dayStreams, 0);
  const secondHalfStreams = rows.slice(half).reduce((n, r) => n + r.dayStreams, 0);

  /* monotonluk: kaç gün üst üste günlük dinlenme arttı */
  let run2 = 0, maxRise = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].dayStreams > rows[i - 1].dayStreams) run2++; else run2 = 0;
    if (run2 > maxRise) maxRise = run2;
  }

  /* gider artışı (nominal) — enflasyonla karşılaştır */
  const upkeepGrowth = fin.length > 1 && fin[0].upkeep ? (fin[fin.length - 1].upkeep / fin[0].upkeep - 1) : 0;
  const inflGrowth = rows[rows.length - 1].infl - 1;

  /* son 30 günün gerçek günlük dinlenmesi */
  const last30 = rows.slice(-30);
  const daily30 = last30.reduce((n, r) => n + r.dayStreams, 0) / Math.max(1, last30.length);

  /* gerçek nakit defteri */
  const L = run.ledger || { in: {}, out: {} };
  const sum = (o) => Object.keys(o).reduce((n, k) => n + o[k], 0);
  const ledgerIn = sum(L.in), ledgerOut = sum(L.out);

  return {
    last,
    ledgerIn, ledgerOut, ledger: L,
    totalIncome, totalUpkeep, totalTax,
    firstMonthIncome, lastMonthIncome,
    avgMargin,
    peak: run.peak,
    firstHalfStreams, secondHalfStreams,
    maxRise,
    upkeepGrowth, inflGrowth,
    daily30,
    months: fin.length,
    bankruptMonths: run.bankruptMonths,
    debtMonths: run.debtMonths,
    /* gerçek brüt ₺/ödeme-alınan-dinlenme (kusur filtresi + kur + enflasyon dahil) */
    perStream: payouts.length && payouts[payouts.length - 1].streams
      ? payouts[payouts.length - 1].gross / Math.max(1, payouts[payouts.length - 1].streams) : 0
  };
}

/* ---------------- bulgular ---------------- */
function findings(name, a, rows) {
  const F = [];
  const add = (sev, text) => F.push({ sev, text });

  /* 1) iflas / borç sarmalı */
  if (a.debtMonths > a.months * 0.5) add("YÜKSEK", `Kariyerin %${Math.round(a.debtMonths / Math.max(1, a.months) * 100)}'inde borç var — gider yapısı geliri aşıyor.`);
  if (a.bankruptMonths > a.months * 0.4) add("YÜKSEK", `${a.bankruptMonths}/${a.months} ay zarar (net < 0).`);

  /* 2) sonsuz büyüme */
  if (a.secondHalfStreams > a.firstHalfStreams * 2.2) add("ORTA", `Dinlenme ikinci yarıda ${(a.secondHalfStreams / Math.max(1, a.firstHalfStreams)).toFixed(1)}× arttı — doğrusal değil, üstel büyüme eğilimi.`);
  if (a.maxRise > 120) add("YÜKSEK", `Günlük dinlenme ${a.maxRise} gün boyunca hiç düşmedi — düşüş (decay) mekanizması yeterince çalışmıyor.`);

  /* 3) tepe sonrası düşüş var mı */
  const peakIdx = rows.findIndex((r) => r.monthly === Math.max(...rows.map((x) => x.monthly)));
  const afterPeak = rows.slice(peakIdx);
  const decline = afterPeak.length > 60 && afterPeak[afterPeak.length - 1].monthly < afterPeak[0].monthly * 0.8;
  if (!decline && rows.length > 200) add("ORTA", `Dinleyici sayısı tepeden sonra anlamlı düşmüyor — "yüksel → zirve → düş" döngüsü zayıf.`);

  /* 4) gelir/gider makası */
  if (a.lastMonthIncome > a.firstMonthIncome * 30 && a.firstMonthIncome > 0) add("ORTA", `Gelir ${(a.lastMonthIncome / a.firstMonthIncome).toFixed(0)}× büyüdü — ölçeklenme çok hızlı.`);
  if (a.avgMargin < -0.15) add("YÜKSEK", `Ortalama kâr marjı %${(a.avgMargin * 100).toFixed(0)} — kalıcı zarar.`);
  if (a.avgMargin > 0) add("BİLGİ", `Ortalama kâr marjı %${(a.avgMargin * 100).toFixed(0)}.`);

  /* 5) enflasyon koruması */
  if (a.upkeepGrowth < a.inflGrowth * 0.6) add("DÜŞÜK", `Giderler enflasyonun altında arttı (gider ${(a.upkeepGrowth * 100).toFixed(0)}% vs enflasyon ${(a.inflGrowth * 100).toFixed(0)}%) — masraf tarafı enflasyona tam bağlı değil.`);

  /* 6) dinlenme/kasa tutarlılığı */
  if (a.last.monthly > 0 && a.last.balance < 0) add("YÜKSEK", "Popülerlik varken kasa negatif.");
  if (a.last.monthly > 3e6 && a.last.balance < 200000) add("ORTA", `${(a.last.monthly / 1e6).toFixed(1)}M aylık dinleyiciye rağmen kasa ${a.last.balance} ₺ — telif geliri ölçeklenmiyor.`);

  /* 7) liste doygunluğu */
  const chartMax = Math.max(...rows.map((r) => r.chartMine));
  if (chartMax > 20) add("DÜŞÜK", `Aynı anda ${chartMax} şarkın listede — liste etkisi doyuma uğramıyor olabilir.`);

  if (!F.length) F.push({ sev: "OK", text: "Belirgin tutarsızlık bulunamadı." });
  return F;
}

/* ---------------- rapor ---------------- */
const fmt = (n) => {
  n = Math.round(n || 0);
  const s = n < 0 ? "-" : "";
  n = Math.abs(n);
  if (n >= 1e9) return s + (n / 1e9).toFixed(2) + " Mr";
  if (n >= 1e6) return s + (n / 1e6).toFixed(2) + " Mn";
  if (n >= 1e3) return s + (n / 1e3).toFixed(1) + " B";
  return s + String(n);
};
const money = (n) => "₺" + fmt(n);

(async () => {
  const { dom, errs } = boot();
  const results = {};

  await new Promise((resolve) => {
    ready(dom, (K) => {
      const names = ONLY ? [ONLY] : Object.keys(PROFILES);
      names.forEach((name) => {
        const prof = PROFILES[name];
        const run = runProfile(K, prof, DAYS);
        results[name] = { prof, run, a: analyze(run) };
      });
      resolve();
    });
  });

  if (AS_JSON) {
    const out = {};
    Object.keys(results).forEach((n) => { out[n] = { analysis: results[n].a, rows: results[n].run.rows }; });
    fs.writeFileSync("/tmp/sim-balance.json", JSON.stringify(out, null, 1));
    console.log("JSON yazıldı: /tmp/sim-balance.json");
    return;
  }

  console.log("\n" + "=".repeat(74));
  console.log(`KARMA DENGE SİMÜLASYONU · ${DAYS} gün · tohum ${SEED}`);
  console.log("=".repeat(74));

  const cols = Object.keys(results);
  const line = (label, fn) => console.log("  " + label.padEnd(26) + cols.map((c) => String(fn(results[c])).padStart(16)).join(""));

  console.log("\n  " + "METRİK".padEnd(26) + cols.map((c) => PROFILES[c].label.padStart(16)).join(""));
  console.log("  " + "-".repeat(26 + 16 * cols.length));
  cols.forEach((c) => console.log("  " + "".padEnd(26) + PROFILES[c].note.padStart(60)));
  console.log("");

  line("Son kasa", (r) => money(r.a.last.balance) + (r.a.last.debt ? " / borç " + fmt(r.a.last.debt) : ""));
  line("Toplam dinlenme", (r) => fmt(r.a.last.cum));
  line("Günlük dinlenme (son 30g)", (r) => fmt(r.a.daily30));
  line("Aylık dinleyici", (r) => fmt(r.a.last.monthly));
  line("Popülerlik", (r) => r.a.last.popularity.toFixed(0) + "/100");
  line("Takipçi (IG+TT+X)", (r) => fmt(r.a.last.followers));
  line("Şarkı sayısı", (r) => String(r.a.last.songs));
  line("Ortalama şarkı kalitesi", (r) => String(r.a.last.avgQuality) + "/100");
  line("Aktif platform listesi", (r) => String(r.a.last.activeLists) + " (tepe " + r.a.last.maxPlays + ")");
  line("Toplam liste girişi", (r) => String(r.a.last.everLists));
  line("Ulusal listede şarkı", (r) => String(Math.max(...r.run.rows.map((x) => x.chartMine))));
  line("Zirve günlük dinlenme", (r) => fmt(r.a.peak.daily) + " (gün " + r.a.peak.dailyDay + ")");
  line("Zirve aylık dinleyici", (r) => fmt(r.a.peak.monthly) + " (gün " + r.a.peak.day + ")");
  line("Ay sayısı", (r) => String(r.a.months));
  line("Toplam aylık gelir (oyun)", (r) => money(r.a.totalIncome));
  line("Toplam sabit gider", (r) => money(r.a.totalUpkeep));
  line("Toplam vergi", (r) => money(r.a.totalTax));
  line("Ortalama kâr marjı", (r) => "%" + (r.a.avgMargin * 100).toFixed(0));
  line("Zararlı ay", (r) => r.a.bankruptMonths + "/" + r.a.months);
  line("Borçlu ay", (r) => r.a.debtMonths + "/" + r.a.months);
  line("İlk ay geliri", (r) => money(r.a.firstMonthIncome));
  line("Son ay geliri", (r) => money(r.a.lastMonthIncome));
  line("Dinlenme artışı (1./2. yarı)", (r) => (r.a.secondHalfStreams / Math.max(1, r.a.firstHalfStreams)).toFixed(2) + "×");
  line("En uzun kesintisiz artış", (r) => r.a.maxRise + " gün");
  line("Gider artışı / enflasyon", (r) => (r.a.upkeepGrowth * 100).toFixed(0) + "% / " + (r.a.inflGrowth * 100).toFixed(0) + "%");
  line("₺/dinlenme (son ödeme)", (r) => r.a.perStream.toFixed(5));

  console.log("\n" + "=".repeat(74));
  console.log("BULGULAR");
  console.log("=".repeat(74));
  cols.forEach((c) => {
    const { run, a } = results[c];
    console.log(`\n▌ ${PROFILES[c].label.toUpperCase()} (${PROFILES[c].note})`);
    const topIn = Object.entries(a.ledger.in).sort((x, y) => y[1] - x[1]).slice(0, 5)
      .map(([k, v]) => `${k} ${money(v)}`).join(" · ") || "—";
    const topOut = Object.entries(a.ledger.out).sort((x, y) => y[1] - x[1]).slice(0, 5)
      .map(([k, v]) => `${k} ${money(v)}`).join(" · ") || "—";
    console.log(`   💰 Gelir: ${money(a.ledgerIn)}  →  ${topIn}`);
    console.log(`   💸 Gider: ${money(a.ledgerOut)}  →  ${topOut}`);
    console.log(`   🧮 Gerçek net (defter): ${money(a.ledgerIn - a.ledgerOut)}`);
    findings(c, a, run.rows).forEach((f) => {
      const mark = f.sev === "YÜKSEK" ? "🔴" : f.sev === "ORTA" ? "🟠" : f.sev === "DÜŞÜK" ? "🟡" : f.sev === "OK" ? "✅" : "•";
      console.log(`   ${mark} [${f.sev}] ${f.text}`);
    });
  });

  /* yörünge örneklemesi (standart profil) */
  const sample = results[cols.includes("standard") ? "standard" : cols[0]].run.rows;
  console.log("\n" + "=".repeat(74));
  console.log("YÖRÜNGE ÖRNEKLEMESİ (her 30 gün)");
  console.log("=".repeat(74));
  console.log("   gün |        kasa | aylık dinleyici | pop | günlük dinlenme | liste");
  sample.filter((_, i) => i % 30 === 0).forEach((r) => {
    console.log("  " + String(r.day).padStart(4) + " | " + money(r.balance).padStart(12) + " | "
      + fmt(r.monthly).padStart(15) + " | " + String(Math.round(r.popularity)).padStart(3)
      + " | " + fmt(r.dailyStreams).padStart(15) + " | " + String(r.chartMine).padStart(5));
  });

  if (errs.length) { console.log("\n⚠️ Çalışma zamanı hataları:"); errs.slice(0, 6).forEach((e) => console.log("   " + e)); }
  console.log("");
  process.exit(0);
})();
