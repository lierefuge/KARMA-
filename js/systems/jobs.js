/* ============================================================
   KARMA — systems/jobs.js
   HARİCİ GELİR + BECERİ SİSTEMİ
   Her iş bir beceri geliştirir; beceri yükseldikçe ücret artar,
   daha iyi işler açılır. Yorgunluk müzik performansını düşürür.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const LIST = [
    { id: "kafe",   name: "Kafede part-time",     emoji: "☕", pay: 620,  minAge: 15, perDay: 1, fatigue: 12, skill: "work",    xp: 6,  desc: "Vardiya başı ödeme. Sabır işi." },
    { id: "market", name: "Market çalışanı",      emoji: "🛒", pay: 800,  minAge: 16, perDay: 1, fatigue: 14, skill: "work",    xp: 8,  desc: "Kasa + raf. Düzenli ama yorucu." },
    { id: "street", name: "Sokak performansı",    emoji: "🎸", pay: 480,  minAge: 15, perDay: 2, fatigue: 9,  skill: "music",   xp: 5,  desc: "Meydanda çal; küçük kitle ve tecrübe.", fans: 22 },
    { id: "kurye",  name: "Kurye",                emoji: "🛵", pay: 1050, minAge: 18, perDay: 1, fatigue: 17, skill: "work",    xp: 9,  desc: "Trafikte gün boyu; iyi para, çok yorgunluk." },
    { id: "studio", name: "Stüdyo asistanlığı",   emoji: "🎚️", pay: 1150, minAge: 16, perDay: 1, fatigue: 10, skill: "studio",  xp: 10, desc: "Kayıt odasında çıraklık; kulak gelişir.", quality: 4 },
    { id: "beat",   name: "Beat satışı",          emoji: "🎹", pay: 1400, minAge: 15, perDay: 2, fatigue: 8,  skill: "music",   xp: 7,  desc: "Beat'lerini online sat.", req: { music: 12 } },
    { id: "jingle", name: "Jingle / reklam müziği", emoji: "🎼", pay: 2600, minAge: 16, perDay: 1, fatigue: 12, skill: "music", xp: 9,  desc: "Kurumsal iş; sıkıcı ama garantili para.", req: { music: 20 } },
    { id: "dj",     name: "DJ / etkinlik",        emoji: "🎧", pay: 3200, minAge: 18, perDay: 1, fatigue: 14, skill: "network", xp: 10, desc: "Düğün/mekan seti. Network açar.", req: { network: 15 } },
    { id: "prod",   name: "Prodüktörlük işi",     emoji: "🎛️", pay: 5200, minAge: 18, perDay: 1, fatigue: 12, skill: "studio",  xp: 14, desc: "Başka sanatçıya prodüksiyon.", req: { studio: 30, music: 25 } },
    { id: "ses",    name: "Seslendirme / reklam vokali", emoji: "🎙️", pay: 2300, minAge: 16, perDay: 1, fatigue: 8, skill: "music", xp: 8, desc: "Reklam ve dizi vokali.", req: { music: 28, network: 10 } },
    { id: "studyokirala", name: "Stüdyo kiralama", emoji: "🏠", pay: 2200, minAge: 18, perDay: 1, fatigue: 6, skill: "studio", xp: 8, desc: "Kendi stüdyonu günlük kirala.", req: { studio: 22 } },
    { id: "ders",    name: "Müzik dersi verme", emoji: "📚", pay: 1700, minAge: 18, perDay: 1, fatigue: 9, skill: "music", xp: 7, desc: "Yeni başlayanlara ders ver.", req: { music: 18 } },
    { id: "set",     name: "DJ seti / kulüp gecesi", emoji: "🌃", pay: 3600, minAge: 18, perDay: 1, fatigue: 16, skill: "network", xp: 11, desc: "Kulüp seti; network ve sahne tecrübesi.", req: { network: 20 } }
  ];

  K.jobs = {
    LIST,

    resetDaily() { K.state.player.jobLog = {}; },

    todayCount(id) { return (K.state.player.jobLog || {})[id] || 0; },

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

    /* beceri ücret çarpanı */
    payMult(job) {
      const lvl = K.skillLevel(job.skill);
      const dm = K.settings ? K.settings.diffMult().jobPay : 1;
      return (1 + lvl / 140) * dm;
    },

    list() {
      const p = K.state.player;
      return LIST.map(j => {
        const count = K.jobs.todayCount(j.id);
        const unlocked = K.jobs.unlocked(j);
        let reason = "";
        if (!unlocked) {
          const req = j.req || {};
          if (p.age < j.minAge) reason = j.minAge + " yaş gerekli";
          else if (req.music) reason = "Müzikal Yetenek " + req.music + "+ gerekli";
          else if (req.studio) reason = "Stüdyo Becerisi " + req.studio + "+ gerekli";
          else if (req.network) reason = "Network " + req.network + "+ gerekli";
          else reason = "henüz kilitli";
        } else if (count >= j.perDay) reason = "bugünlük yaptın";
        return { ...j, count, unlocked, canWork: unlocked && count < j.perDay, reason, effectivePay: Math.round(j.pay * K.jobs.payMult(j)) };
      });
    },

    work(id) {
      const s = K.state, p = s.player;
      const job = LIST.find(j => j.id === id);
      if (!job) return false;
      if (!K.jobs.unlocked(job)) { K.toast("Bu iş kilitli", `${job.name} için şartları sağlamıyorsun.`, "warn"); return false; }
      if (K.jobs.todayCount(id) >= job.perDay) { K.toast("Bugünlük yeter", `${job.name} için bugünkü hakkını kullandın.`, "warn"); return false; }

      const pay = Math.round(job.pay * K.jobs.payMult(job) * U.rand(0.9, 1.15));
      K.economy.earn(pay, "job");
      p.jobEarnings = (p.jobEarnings || 0) + pay;
      p.fatigue = (p.fatigue || 0) + job.fatigue;
      p.jobLog = p.jobLog || {};
      p.jobLog[id] = (p.jobLog[id] || 0) + 1;

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
      K.toast(job.emoji + " " + job.name,
        `+${U.money(pay)} · ${skillName} +${job.xp}${leveled ? " · SEVİYE " + after : ""}`, leveled ? "ok" : "");
      K.save(); K.refresh();
      return true;
    },

    qualityBonus() { return K.state.player.qualityBonusToday || 0; },

    dailyTotal() {
      const p = K.state.player;
      return U.sum(Object.keys(p.jobLog || {}), id => {
        const j = LIST.find(x => x.id === id);
        return j ? j.pay * (p.jobLog[id] || 0) : 0;
      });
    },

    condition() {
      const f = K.state.player.fatigue || 0;
      if (f >= 65) return { label: "Bitkin", color: "hot", penalty: "%35" };
      if (f >= 35) return { label: "Yorgun", color: "gold", penalty: "%20" };
      if (f >= 15) return { label: "Hafif yorgun", color: "", penalty: "%8" };
      return { label: "Dinç", color: "money", penalty: "—" };
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
