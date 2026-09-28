/* ============================================================
   KARMA — systems/skills.js
   BECERİ GELİŞİMİ & DÖKÜMÜ
   • Beceriler sadece yan işlerle değil, doğrudan PRATİKLE de gelişir.
   • Azalan verim: seviye yükseldikçe kazanç düşer, yorgunluk artar.
   • Çalışılmayan beceri zamanla dökülür.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const PRACTICE_FATIGUE = 12;
  const DECAY_AFTER_DAYS = 20;   // bu kadar gün çalışılmayan beceri dökülür
  const DECAY_PER_DAY = 0.06;

  K.skills = {

    canPractice(skill) {
      if (!K.SKILLS[skill]) return false;
      const p = K.state.player;
      return (p.skillDays || {})[skill] !== K.state.day;
    },

    practice(skill) {
      const p = K.state.player;
      if (!K.SKILLS[skill]) return false;
      if (!K.skills.canPractice(skill)) { K.toast("Bugün yeterli", "Aynı beceriye günde bir kez çalışılır.", "warn"); return false; }
      const lv = K.skillLevel(skill);
      const gain = U.clamp(1.8 - lv / 45, 0.3, 1.8);          // azalan verim
      p.skills[skill] = lv + gain;
      p.skillDays = p.skillDays || {};
      p.skillDays[skill] = K.state.day;
      p.fatigue = U.clamp((p.fatigue || 0) + PRACTICE_FATIGUE, 0, 100);
      K.toast("🎯 Pratik", `${K.SKILLS[skill].name} +${gain.toFixed(1)} · yorgunluk +${PRACTICE_FATIGUE}`, "ok");
      K.save(); if (K.refresh) K.refresh();
      return true;
    },

    /* günlük: çalışılmayan beceri DÖKÜLÜR, ama zirvenin %70'inin altına inmez
       (yani kazandığını tamamen kaybetmezsin, biraz paslanırsın) */
    decay() {
      const p = K.state.player, day = K.state.day;
      p.skillDays = p.skillDays || {};
      p.skillPeak = p.skillPeak || {};
      Object.keys(K.SKILLS).forEach(k => {
        const lv = p.skills[k] || 0;
        p.skillPeak[k] = Math.max(p.skillPeak[k] || 0, lv);
        const last = p.skillDays[k] || 0;
        const floor = p.skillPeak[k] * 0.7;
        if (day - last > DECAY_AFTER_DAYS && lv > floor) {
          p.skills[k] = Math.max(floor, lv - DECAY_PER_DAY);
        }
      });
    }
  };
})(window.K = window.K || {});
