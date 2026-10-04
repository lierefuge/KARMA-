/* ============================================================
   KARMA — systems/jobs.js   (v10.43)
   YAN İŞLER: BAŞVURU · VARDİYA · YORGUNLUK · GELİR DENGESİ

   v10.43'te değişen zihniyet
   --------------------------
   Eskiden her "açık" iş tek tıkla yapılabiliyordu; oyuncu günde
   beş iş çevirip kariyerini yan işle döndürebiliyordu. Artık işler
   gerçek hayattaki gibi:

     1) BAŞVURU   — işe girmek için başvurursun, ertesi gün yanıt
                    gelir (beceri/şöhret uygunluğuna göre kabul/ret).
                    Reddedilirsen birkaç gün tekrar başvuramazsın.
     2) VARDİYA   — her iş bir vardiyadır; günde en fazla 3 vardiya.
                    Üst üste vardiya verimi düşürür (×0,75 · ×0,56 …).
     3) YORGUNLUK — vardiya yorgunluk biriktirir. Yorgunken ücret
                    düşer, belli eşikten sonra iş yapamazsın. Günü
                    dinlenmeye ayırırsan toparlanırsın (o gün iş yok).
     4) DENGE     — ün arttıkça yan iş ücreti ve kapılar kapanır;
                    yan iş erken oyunun can simidi olur, motoru değil.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* --- v10.43 denge sabitleri (tek yerde durur) --- */
  const MAX_SHIFTS = 3;          // günde en fazla vardiya
  const FATIGUE_CAP = 80;        // bu yorgunlukta iş yapılamaz
  const MAX_PENDING = 2;         // aynı anda bekleyen başvuru
  const REJECT_COOLDOWN = 5;     // ret sonrası tekrar başvuru (gün)
  const REST_RECOVERY = 25;      // dinlenme günü yorgunluk düşüşü

  const LIST = [
    { id: "kafe",   name: "Kafede part-time",     emoji: "☕", pay: 620,  minAge: 15, perDay: 1, fatigue: 12, skill: "work",    xp: 6,  shift: "Gündüz · 09:00–15:00", desc: "Vardiya başı ödeme. Sabır işi." },
    { id: "market", name: "Market çalışanı",      emoji: "🛒", pay: 800,  minAge: 16, perDay: 1, fatigue: 14, skill: "work",    xp: 8,  shift: "Akşam · 16:00–22:00", desc: "Kasa + raf. Düzenli ama yorucu." },
    { id: "street", name: "Sokak performansı",    emoji: "🎸", pay: 480,  minAge: 15, perDay: 2, fatigue: 9,  skill: "music",   xp: 5,  shift: "Akşam · 18:00–21:00", self: true, desc: "Meydanda çal; küçük kitle ve tecrübe.", fans: 22 },
    { id: "kurye",  name: "Kurye",                emoji: "🛵", pay: 1050, minAge: 18, perDay: 1, fatigue: 17, skill: "work",    xp: 9,  shift: "Tam gün · 10:00–19:00", desc: "Trafikte gün boyu; iyi para, çok yorgunluk." },
    { id: "studio", name: "Stüdyo asistanlığı",   emoji: "🎚️", pay: 1150, minAge: 16, perDay: 1, fatigue: 10, skill: "studio",  xp: 10, shift: "Gündüz · 11:00–18:00", desc: "Kayıt odasında çıraklık; kulak gelişir.", quality: 4 },
    { id: "beat",   name: "Beat satışı",          emoji: "🎹", pay: 1400, minAge: 15, perDay: 2, fatigue: 8,  skill: "music",   xp: 7,  shift: "Esnek · online", self: true, desc: "Beat'lerini online sat.", req: { music: 12 } },
    { id: "jingle", name: "Jingle / reklam müziği", emoji: "🎼", pay: 2600, minAge: 16, perDay: 1, fatigue: 12, skill: "music", xp: 9,  shift: "Proje · teslim tarihli", desc: "Kurumsal iş; sıkıcı ama garantili para.", req: { music: 20 } },
    { id: "dj",     name: "DJ / etkinlik",        emoji: "🎧", pay: 3200, minAge: 18, perDay: 1, fatigue: 14, skill: "network", xp: 10, shift: "Gece · 22:00–03:00", desc: "Düğün/mekan seti. Network açar.", req: { network: 15 } },
    { id: "prod",   name: "Prodüktörlük işi",     emoji: "🎛️", pay: 5200, minAge: 18, perDay: 1, fatigue: 12, skill: "studio",  xp: 14, shift: "Proje · stüdyo", desc: "Başka sanatçıya prodüksiyon.", req: { studio: 30, music: 25 } },
    { id: "ses",    name: "Seslendirme / reklam vokali", emoji: "🎙️", pay: 2300, minAge: 16, perDay: 1, fatigue: 8, skill: "music", xp: 8, shift: "Gündüz · kayıt", desc: "Reklam ve dizi vokali.", req: { music: 28, network: 10 } },
    { id: "studyokirala", name: "Stüdyo kiralama", emoji: "🏠", pay: 2200, minAge: 18, perDay: 1, fatigue: 6, skill: "studio", xp: 8, shift: "Seans · saatlik", desc: "Kendi stüdyonu günlük kirala.", req: { studio: 22 } },
    { id: "ders",    name: "Müzik dersi verme", emoji: "📚", pay: 1700, minAge: 18, perDay: 1, fatigue: 9, skill: "music", xp: 7, shift: "Akşam · ders saati", desc: "Yeni başlayanlara ders ver.", req: { music: 18 } },
    { id: "set",     name: "DJ seti / kulüp gecesi", emoji: "🌃", pay: 3600, minAge: 18, perDay: 1, fatigue: 16, skill: "network", xp: 11, shift: "Gece · 23:00–04:00", desc: "Kulüp seti; network ve sahne tecrübesi.", req: { network: 20 } }
  ];

  const byId = (id) => LIST.find(j => j.id === id);

  K.jobs = {
    LIST,
    MAX_SHIFTS,
    FATIGUE_CAP,

    /* --- eski kayıt göçü -------------------------------------
       v10.43 öncesi kayıtlarda `jobApps` yoktu; oyuncuyu işsiz
       bırakmamak için giriş seviyesi işleri "işe alınmış" sayar. */
    ensure() {
      const p = K.state && K.state.player;
      if (!p) return;
      if (p.jobApps) return;
      p.jobApps = {};
      ["kafe", "market", "street"].forEach(id => {
        p.jobApps[id] = { status: "hired", appliedDay: K.state.day, hiredDay: K.state.day };
      });
    },

    resetDaily() {
      const p = K.state.player;
      p.jobLog = {};
      p.shiftsToday = 0;
      p.restedToday = false;
    },

    /* gün dönümü: sayaçlar sıfırlanır + bekleyen başvurular sonuçlanır */
    onNewDay() {
      K.jobs.ensure();
      K.jobs.resetDaily();
      K.jobs.resolveApplications();
    },

    todayCount(id) { return (K.state.player.jobLog || {})[id] || 0; },
    shiftsToday() { return K.state.player.shiftsToday || 0; },
    shiftsLeft() { return Math.max(0, MAX_SHIFTS - K.jobs.shiftsToday()); },
    restedToday() { return !!K.state.player.restedToday; },

    skill(id) { return K.skillLevel(id); },

    unlocked(job) {
      const p = K.state.player;
      if (p.age < job.minAge) return false;
      const req = job.req || {};
      if (req.popularity && p.popularity < req.popularity) return false;
      if (req.music && K.skillLevel("music") < req.music) return false;
      if (req.studio && K.skillLevel("studio") < req.studio) return false;
      if (req.network && K.skillLevel("network") < req.network) return false;
      if (req.work && K.skillLevel("work") < req.work) return false;
      return true;
    },

    /* ---------------- BAŞVURU ---------------- */
    appOf(id) { return (K.state.player.jobApps || {})[id] || null; },
    /* serbest işler (sokak, beat) başvuru gerektirmez */
    isHired(id) { const j = byId(id); if (j && j.self) return true; const a = K.jobs.appOf(id); return !!a && a.status === "hired"; },

    pendingCount() {
      const apps = K.state.player.jobApps || {};
      return Object.keys(apps).filter(id => apps[id] && apps[id].status === "pending").length;
    },

    canApply(id) {
      const job = byId(id);
      if (!job) return false;
      if (!K.jobs.unlocked(job)) return false;
      const a = K.jobs.appOf(id);
      if (job.self) return false;
      if (a && a.status === "hired") return false;
      if (a && a.status === "pending") return false;
      if (a && a.status === "rejected" && K.state.day < (a.retryDay || 0)) return false;
      return true;
    },

    apply(id) {
      K.jobs.ensure();
      const job = byId(id);
      if (!job) return false;
      if (!K.jobs.unlocked(job)) { K.toast("Bu iş kilitli", `${job.name} için şartları sağlamıyorsun.`, "warn"); return false; }
      const a = K.jobs.appOf(id);
      if (job.self) { K.toast("Başvuru gerekmez", `${job.name} serbest çalışılan bir iş — doğrudan yapabilirsin.`, "warn"); return false; }
      if (a && a.status === "hired") { K.toast("Zaten çalışıyorsun", `${job.name} kadrosundasın.`, "warn"); return false; }
      if (a && a.status === "pending") { K.toast("Yanıt bekleniyor", `${job.name} başvurun değerlendiriliyor.`, "warn"); return false; }
      if (a && a.status === "rejected" && K.state.day < (a.retryDay || 0)) {
        K.toast("Tekrar başvuru yok", `${job.name} için Gün ${a.retryDay}'den sonra tekrar deneyebilirsin.`, "warn");
        return false;
      }
      if (K.jobs.pendingCount() >= MAX_PENDING) {
        K.toast("Çok fazla başvuru", `Aynı anda en fazla ${MAX_PENDING} başvuru bekleyebilir.`, "warn");
        return false;
      }
      K.state.player.jobApps = K.state.player.jobApps || {};
      K.state.player.jobApps[id] = {
        status: "pending",
        appliedDay: K.state.day,
        decideDay: K.state.day + 1,
        tries: ((a && a.tries) || 0) + 1
      };
      K.toast("📨 Başvuru gönderildi", `${job.name} — yanıt yarın gelir.`, "");
      K.save(); K.refresh();
      return true;
    },

    /* bekleyen başvuruları sonuçlandır (gün dönümünde çağrılır) */
    resolveApplications() {
      const s = K.state, p = s.player;
      const apps = p.jobApps || {};
      Object.keys(apps).forEach(id => {
        const a = apps[id];
        if (!a || a.status !== "pending" || (a.decideDay || 0) > s.day) return;
        const job = byId(id);
        if (!job) return;
        const req = job.req || {};
        const need = req.music || req.studio || req.network || req.work || 0;
        const have = K.skillLevel(job.skill);
        const skillFit = need ? U.clamp(have / need, 0, 1.4) : 1;
        const repBonus = U.clamp((p.reputation || 0) / 300, 0, 0.2);
        /* giriş seviyesi (şart yok) neredeyse kesin; uzman iş zor */
        const base = need ? 0.34 : 0.86;
        const chance = U.clamp(base + skillFit * 0.42 + repBonus, 0.15, 0.96);
        if (U.chance(chance)) {
          a.status = "hired";
          a.hiredDay = s.day;
          a.resolvedDay = s.day;
          K.toast(job.emoji + " İşe alındın!", `${job.name} — başvurun kabul edildi.`, "ok");
          s.notifications = (s.notifications || []).concat([{
            title: job.emoji + " İşe alındın", msg: `${job.name} kadrosuna girdin.`, kind: "ok", day: s.day
          }]).slice(-60);
        } else {
          a.status = "rejected";
          a.retryDay = s.day + REJECT_COOLDOWN;
          a.resolvedDay = s.day;
          K.toast("Başvuru reddedildi", `${job.name} — Gün ${a.retryDay}'den sonra tekrar dene.`, "warn");
        }
      });
    },

    /* ---------------- DİNLENME ---------------- */
    canRest() { return !K.jobs.restedToday(); },
    rest() {
      const p = K.state.player;
      if (K.jobs.restedToday()) { K.toast("Bugün zaten dinlendin", "", "warn"); return false; }
      p.restedToday = true;
      p.shiftsToday = MAX_SHIFTS;   // bugün artık vardiya yok
      const before = p.fatigue || 0;
      p.fatigue = Math.max(0, before - REST_RECOVERY);
      K.toast("😴 Dinlendin", `Yorgunluk ${Math.round(before)} → ${Math.round(p.fatigue)} · bugün vardiya yok.`, "ok");
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- ÜCRET / DENGE ---------------- */
    fameDampen() {
      const p = K.state.player;
      const pop = p.popularity || 0;
      const followers = K.fans ? K.fans.followers() : 0;
      const byPop = 1 - 0.85 * U.clamp(pop / 60, 0, 1);
      const byFans = 1 - 0.6 * U.clamp(followers / 250000, 0, 1);
      return U.clamp(byPop * byFans, 0.08, 1);
    },

    /* yorgunluk ücreti düşürür (bitkinlikte %40'a kadar) */
    fatigueMult() {
      const f = K.state.player.fatigue || 0;
      return 1 - U.clamp(f / 200, 0, 0.4);
    },

    payMult(job) {
      const lvl = K.skillLevel(job.skill);
      const dm = K.settings ? K.settings.diffMult().jobPay : 1;
      /* v10.57 — NOMİNAL ÜCRET: 43%/yıl enflasyonda sabit 620 ₺'lik bir
         vardiya birkaç yılda değersizleşiyordu. Ücret artık endeksle
         birlikte artar (giderler de artıyor). */
      const infl = K.econ ? K.econ.infl() : 1;
      return (1 + lvl / 140) * dm * K.jobs.fameDampen() * K.jobs.fatigueMult() * infl;
    },

    /* gün içi azalan verim: 1. iş tam, sonrakiler kademeli */
    efficiency() {
      const done = Object.keys(K.state.player.jobLog || {})
        .reduce((n, k) => n + (K.state.player.jobLog[k] || 0), 0);
      return Math.pow(0.75, done);
    },

    list() {
      const p = K.state.player;
      K.jobs.ensure();
      const shiftsLeft = K.jobs.shiftsLeft();
      const rested = K.jobs.restedToday();
      const tired = (p.fatigue || 0) >= FATIGUE_CAP;
      return LIST.map(j => {
        const count = K.jobs.todayCount(j.id);
        const unlocked = K.jobs.unlocked(j);
        const a = K.jobs.appOf(j.id);
        const status = j.self ? "self" : (a ? a.status : "none");
        const hired = j.self || status === "hired";
        const eff = K.jobs.efficiency();
        const canWork = unlocked && hired && count < j.perDay &&
          shiftsLeft > 0 && !rested && !tired;
        let reason = "";
        if (!unlocked) {
          const req = j.req || {};
          if (p.age < j.minAge) reason = j.minAge + " yaş gerekli";
          else if (req.music) reason = "Müzikal Yetenek " + req.music + "+ gerekli";
          else if (req.studio) reason = "Stüdyo Becerisi " + req.studio + "+ gerekli";
          else if (req.network) reason = "Network " + req.network + "+ gerekli";
          else reason = "henüz kilitli";
        } else if (!hired && status === "none") reason = "önce başvur";
        else if (status === "pending") reason = "yanıt bekleniyor";
        else if (status === "rejected") reason = "reddedildi";
        else if (tired) reason = "bitkinsin, dinlen";
        else if (rested) reason = "bugün dinleniyorsun";
        else if (shiftsLeft <= 0) reason = "vardiya hakkı bitti";
        else if (count >= j.perDay) reason = "bugünlük yaptın";

        const canApply = K.jobs.canApply(j.id);
        let applyReason = "";
        if (!unlocked) applyReason = "kilitli";
        else if (status === "pending") applyReason = "yanıt bekleniyor";
        else if (status === "hired") applyReason = "kadrodasın";
        else if (status === "rejected") applyReason = "Gün " + (a.retryDay || 0) + " tekrar";
        else if (K.jobs.pendingCount() >= MAX_PENDING) applyReason = "çok başvuru";

        return {
          ...j, count, unlocked, hired, status, canWork, canApply, applyReason, reason,
          effectivePay: Math.round(j.pay * K.jobs.payMult(j) * eff),
          basePay: Math.round(j.pay * K.jobs.payMult(j)),
          fameCut: K.jobs.fameDampen(),
          fatigueCut: K.jobs.fatigueMult()
        };
      });
    },

    work(id) {
      const s = K.state, p = s.player;
      K.jobs.ensure();
      const job = byId(id);
      if (!job) return false;
      if (!K.jobs.unlocked(job)) { K.toast("Bu iş kilitli", `${job.name} için şartları sağlamıyorsun.`, "warn"); return false; }
      if (!K.jobs.isHired(id)) { K.toast("Kadroda değilsin", `${job.name} için önce başvurup işe alınmalısın.`, "warn"); return false; }
      if (K.jobs.restedToday()) { K.toast("Bugün dinleniyorsun", "Vardiya yapmadan önce gün geçir.", "warn"); return false; }
      if (K.jobs.shiftsLeft() <= 0) { K.toast("Vardiya hakkı bitti", `Günde en fazla ${MAX_SHIFTS} vardiya.`, "warn"); return false; }
      if ((p.fatigue || 0) >= FATIGUE_CAP) { K.toast("Bitkinsin", "Yorgunluk çok yüksek — dinlenmen gerek.", "bad"); return false; }
      if (K.jobs.todayCount(id) >= job.perDay) { K.toast("Bugünlük yeter", `${job.name} için bugünkü hakkını kullandın.`, "warn"); return false; }

      const efficiency = K.jobs.efficiency();
      const pay = Math.round(job.pay * K.jobs.payMult(job) * efficiency * U.rand(0.9, 1.15));
      K.economy.earn(pay, "job");
      p.jobEarnings = (p.jobEarnings || 0) + pay;
      p.fatigue = (p.fatigue || 0) + job.fatigue;
      p.jobLog = p.jobLog || {};
      p.jobLog[id] = (p.jobLog[id] || 0) + 1;
      p.shiftsToday = (p.shiftsToday || 0) + 1;

      // BECERİ KAZANIMI
      p.skills = p.skills || {};
      const before = K.skillLevel(job.skill);
      p.skills[job.skill] = Math.min(100, before + job.xp * U.rand(0.8, 1.3));
      const after = Math.floor(p.skills[job.skill]);
      const leveled = after > Math.floor(before);

      if (job.quality) p.qualityBonusToday = Math.max(p.qualityBonusToday || 0, job.quality);
      if (job.fans) {
        p.ig += Math.round(job.fans * U.rand(0.6, 1.4));
        p.tiktok += Math.round(job.fans * 0.6);
      }
      if (job.id === "beat" || job.id === "jingle" || job.id === "prod" || job.id === "dj") {
        p.reputation = Math.min(100, p.reputation + 0.3);
      }

      const skillName = K.SKILLS[job.skill] ? K.SKILLS[job.skill].name : job.skill;
      const left = K.jobs.shiftsLeft();
      K.toast(job.emoji + " " + job.name,
        `+${U.money(pay)} · ${skillName} +${job.xp}${leveled ? " · SEVİYE " + after : ""}`
        + (efficiency < 0.95 ? ` · bugün ${Object.keys(p.jobLog).reduce((n, k) => n + p.jobLog[k], 0)}. vardiya` : "")
        + ` · kalan vardiya ${left}`,
        leveled ? "ok" : "");
      K.save(); K.refresh();
      return true;
    },

    qualityBonus() { return K.state.player.qualityBonusToday || 0; },

    dailyTotal() {
      const p = K.state.player;
      return U.sum(Object.keys(p.jobLog || {}), id => {
        const j = byId(id);
        return j ? j.pay * (p.jobLog[id] || 0) : 0;
      });
    },

    condition() {
      const f = K.state.player.fatigue || 0;
      if (f >= FATIGUE_CAP) return { label: "Bitkin", color: "hot", penalty: "%40", block: true };
      if (f >= 65) return { label: "Çok yorgun", color: "hot", penalty: "%33", block: false };
      if (f >= 35) return { label: "Yorgun", color: "gold", penalty: "%18", block: false };
      if (f >= 15) return { label: "Hafif yorgun", color: "", penalty: "%8", block: false };
      return { label: "Dinç", color: "money", penalty: "—", block: false };
    },

    /* becerilerin müzikal etkisi */
    skillEffects() {
      return {
        musicQuality: +(K.skillLevel("music") * 0.42).toFixed(1),
        studioQuality: +(K.skillLevel("studio") * 0.34).toFixed(1),
        network: K.skillLevel("network"),
        workPay: "+%" + Math.round((K.jobs.payMult({ skill: "work" }) - 1) * 100)
      };
    }
  };
})(window.K);
