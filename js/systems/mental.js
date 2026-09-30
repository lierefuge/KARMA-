/* ============================================================
   KARMA — systems/mental.js   (v10.28)
   AKIL SAĞLIĞI & TÜKENMİŞLİK

   Neden?
   ------
   Oyunda `fatigue` vardı ama o yalnızca “dikkat dalgası”nın
   doygunluğuydu — sanatçının KAFASI değil. Günümüz rapi ise akıl
   sağlığını açıkça konuşuyor (terapi, ara, tükenme, dönüş).
   Bu sistem bir KAYNAK YÖNETİMİ ekseni ekler: stres birikir,
   performansı düşürür ve tavan yaparsa seni durdurur.

   STRES KAYNAKLARI (günlük)
     · borç · beef gerilimi · aktif kriz · üst üste yayın/konser
     · kötü imaj · yüksek şöhretin baskısı
   RAHATLAMA
     · ev (varlık) · terapi · tatil · dinlenme günü · açık konuşma
   ETKİLER
     · stres → kayıt kalitesi düşer (career.estimateQuality okur)
     · %85+ → kamusal taşma riski (pop/itibar/hayran kaybı)
     · %100 → TÜKENME: zorunlu ara (yayın yapamazsın), hayran kaybı
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const CFG = {
    restCost: 3500,          // bir günlük dinlenmenin fırsat maliyeti (bakım/kaçamak)
    therapyCostPerDay: 9000, // terapi günü başı
    holidayCost: 85000,      // tatil paketi
    holidayDays: 7,
    holidayStress: 42,
    holidayPopLoss: 1.4,
    burnoutHiatusDays: 14,
    burnoutFanLoss: 0.05,
    meltdownChance: 0.05     // stres %85+ iken günlük taşma olasılığı
  };

  K.mental = {
    CFG,

    stress() { return K.state.player.stress == null ? 10 : K.state.player.stress; },
    m() { return K.state.player.mental; },

    /* zorunlu ara aktif mi? */
    onHiatus() {
      const m = K.mental.m();
      return !!(m.hiatusUntil && K.state.day < m.hiatusUntil);
    },

    /* terapi aktif mi? */
    inTherapy() {
      const m = K.mental.m();
      return !!(m.therapyUntil && K.state.day < m.therapyUntil);
    },

    level() {
      const v = K.mental.stress();
      if (v >= 90) return { stress: v, key: "tukenmis", label: "Tükenmiş", tone: "bad", icon: "🆘" };
      if (v >= 70) return { stress: v, key: "yuksek",   label: "Yüksek",   tone: "bad", icon: "🔥" };
      if (v >= 45) return { stress: v, key: "gergin",   label: "Gergin",   tone: "warn", icon: "😰" };
      if (v >= 25) return { stress: v, key: "normal",   label: "Normal",   tone: "", icon: "🙂" };
      return { stress: v, key: "iyi", label: "İyi", tone: "ok", icon: "😌" };
    },

    /* kayıt kalitesi çarpanı — yüksek stres işi bozar */
    qualityMult() {
      const v = K.mental.stress();
      if (v <= 40) return 1;
      return U.clamp(1 - (v - 40) * 0.0028, 0.80, 1);   // 100'de ≈ 0,83
    },

    /* günlük */
    tick() {
      const s = K.state, p = s.player, m = K.mental.m();

      /* TÜKENME KONTROLÜ EN BAŞTA (DÜZELTME v10.28):
         günlük delta stresi 100'ün altına indirebiliyor (terapi, ev,
         süperfan rahatlaması). Eşik DELTA UYGULANMADAN önce bakılmazsa
         tükenme hiç tetiklenmezdi — stres tam 100'de bir gün durup sonra
         düşerdi. */
      if (p.stress >= 100 && !K.mental.onHiatus()) {
        m.hiatusUntil = s.day + CFG.burnoutHiatusDays;
        m.burnoutCount = (m.burnoutCount || 0) + 1;
        const fl = Math.round((K.fans && K.fans.followers ? K.fans.followers() : 0) * CFG.burnoutFanLoss);
        ["ig", "tiktok", "x"].forEach(k => { p[k] = Math.max(0, Math.round((p[k] || 0) - fl * 0.33)); });
        p.stress = 72;   // ara başladı, yük düşer
        s.notifications = (s.notifications || []).concat([{
          title: "🛑 TÜKENDİN — zorunlu ara",
          msg: `${CFG.burnoutHiatusDays} gün yayın yapamazsın. Yönetim “sanatçı ara verdi” açıklaması yaptı.`,
          kind: "bad", day: s.day
        }]).slice(-60);
        K.toast("🛑 Tükendin", `${CFG.burnoutHiatusDays} gün zorunlu ara. Dinlenmen şart.`, "bad");
        K.save();
        return;
      }

      let d = 0;
      if ((p.debt || 0) > 0) d += 0.45;                                  // borç baskısı
      if (K.state.crisis) d += 1.3;                                      // aktif kriz
      /* beef gerilimi: aktif husumetlerin toplam heat'i.
         NOT: beef.js'te `heat()` diye bir fonksiyon YOK — veri
         `beefs[artistId].heat` alanında durur, `K.beef.list()` okur. */
      if (K.beef && K.beef.list) {
        const heat = K.beef.list().reduce((n, b) => n + (b.heat || 0), 0);
        d += Math.min(1.6, heat / 40);
      }
      const recent = (p.songs || []).filter(x => (x.publishedDay || 0) > s.day - 7).length;
      if (recent >= 2) d += 0.5;                                         // üst üste yayın

      /* TEMPO BASKISI (DÜZELTME v10.28):
         Yalnızca kriz/borç/beef beklerken stress hiç birikmiyordu — yani
         sistem pratikte ölü kalıyordu (ölçüldü: 600 günde stres 10'da sabit).
         Normal çalışma temposu da yorar: hazırlık hattı, aktif dönem,
         yan işler, turne. Bu, sistemin aylık bir yönetim ekseni olmasını sağlar. */
      const pipeline = (p.releases || []).some(r => r && r.stage !== "released");
      if (pipeline) d += 0.35;                                           // hazırlık/çıkış hattı
      const recentAny = (p.songs || []).some(x => (x.publishedDay || 0) > s.day - 30);
      if (recentAny) d += 0.12;                                          // aktif kariyer temposu
      if (p.writing && p.writing.active) d += 0.20;                      // yazarlık işi
      if (p.merch && p.merch.active) d += 0.15;                          // drop koordinasyonu
      if (K.state.tour) d += 0.4;                                        // turne yorgunluğu
      if (p.intl && p.intl.touring) d += 0.30;                           // yurt dışı turne
      if ((p.image || 50) < 40) d += 0.25;                               // kötü imaj
      if ((p.popularity || 0) >= 60) d += 0.18;                          // şöhretin baskısı
      if ((p.reputation || 0) < 0) d += 0.2;

      /* rahatlama */
      if (K.assets && K.assets.hasEffect && K.assets.hasEffect("calm")) d -= 0.35;
      if (K.mental.inTherapy()) d -= 0.9;
      if (K.fans && K.fans.followers && p.superfans > 0) d -= Math.min(0.25, p.superfans / 60000);

      p.stress = U.clamp((p.stress == null ? 10 : p.stress) + d, 0, 100);

      /* kamusal taşma riski */
      if (p.stress >= 85 && U.chance(CFG.meltdownChance)) {
        const loss = Math.round((K.fans && K.fans.followers ? K.fans.followers() : 0) * 0.012);
        ["ig", "tiktok", "x"].forEach(k => { p[k] = Math.max(0, Math.round((p[k] || 0) - loss * 0.3)); });
        p.reputation = Math.max(0, (p.reputation || 0) - 3);
        p.image = U.clamp((p.image || 50) - 3, 0, 100);
        s.notifications = (s.notifications || []).concat([{
          title: "💥 Kamusal taşma",
          msg: "Sahnede/Canlı yayında sinirlerine hâkim olamadın — kötü klip viral oldu.",
          kind: "bad", day: s.day
        }]).slice(-60);
        K.toast("💥 Taşma", "Kontrolü kaybettin: itibar ve takipçi kaybı.", "bad");
      }

    },

    /* ---- eylemler ---- */
    rest() {
      const p = K.state.player;
      if (K.mental.onHiatus()) { K.toast("Artesin", "Zorunlu aradasın, zaten dinleniyorsun.", "warn"); return false; }
      if (!K.economy.canAfford(CFG.restCost)) { K.toast("Yetersiz bakiye", `${U.money(CFG.restCost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(CFG.restCost, "mental_rest");
      p.stress = U.clamp(p.stress - 13, 0, 100);
      K.toast("🌿 Dinlendin", `Stres −13 → ${Math.round(p.stress)}`, "ok");
      K.save(); K.refresh();
      return true;
    },

    therapy(days) {
      const s = K.state, p = s.player, m = K.mental.m();
      const n = U.clamp(Math.round(days || 3), 1, 10);
      const cost = CFG.therapyCostPerDay * n;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `${U.money(cost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(cost, "therapy");
      m.therapyUntil = Math.max(m.therapyUntil || 0, s.day + n);
      m.sessions = (m.sessions || 0) + n;
      K.toast("🛋️ Terapi başladı", `${n} gün · günlük stres −0,9 · şimdiki ${Math.round(p.stress)}`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "🛋️ Terapi", msg: `${n} seans planlandı. Düzenli destek stresi düşürür.`, kind: "ok", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    holiday() {
      const s = K.state, p = s.player;
      if (K.mental.onHiatus()) { K.toast("Artesin", "Zaten aradasın.", "warn"); return false; }
      if (p.stress < 45) { K.toast("Gerek yok", "Stresin zaten düşük — parayı boşa harcama.", "warn"); return false; }
      if (!K.economy.canAfford(CFG.holidayCost)) { K.toast("Yetersiz bakiye", `${U.money(CFG.holidayCost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(CFG.holidayCost, "holiday");
      p.stress = U.clamp(p.stress - CFG.holidayStress, 0, 100);
      /* yokluğun bedeli: momentum ve popülerlik biraz düşer */
      if (K.game && K.game.addFame) K.game.addFame(-CFG.holidayPopLoss);
      K.toast("🏖️ Tatile çıktın", `${CFG.holidayDays} gün uzakta · stres −${CFG.holidayStress} → ${Math.round(p.stress)}`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "🏖️ Tatil", msg: "Kafanı topladın. Ama sahne seni biraz unuttu (popülerlik −" + CFG.holidayPopLoss + ").",
        kind: "", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* akıl sağlığını AÇIKÇA konuşmak: imaj riski ↔ hayran bağlılığı */
    speakOut() {
      const s = K.state, p = s.player, m = K.mental.m();
      if (m.spokeOut) { K.toast("Zaten konuştun", "Bu kartı bir kez kullandın.", "warn"); return false; }
      m.spokeOut = true;
      p.stress = U.clamp(p.stress - 8, 0, 100);
      const risky = (p.image || 50) < 45;
      if (risky) {
        p.image = U.clamp((p.image || 50) - 4, 0, 100);
        s.notifications = (s.notifications || []).concat([{
          title: "🗣️ Açık konuşma", msg: "Dinleyicilerin bir kısmı “bahane” dedi — imaj hafif zedelendi.",
          kind: "warn", day: s.day
        }]).slice(-60);
        K.toast("🗣️ Konuştun", "Samimiyet bazılarını kazandı, bazılarını kaybettirdi (imaj −4).", "warn");
      } else {
        p.superfans = (p.superfans || 0) + Math.round((K.fans && K.fans.followers ? K.fans.followers() : 0) * 0.01);
        p.reputation = (p.reputation || 0) + 4;
        s.notifications = (s.notifications || []).concat([{
          title: "🗣️ Açık konuşma", msg: "Akıl sağlığı paylaşımın hayran bağlılığını artırdı (süperfan +).",
          kind: "ok", day: s.day
        }]).slice(-60);
        K.toast("🗣️ Konuştun", "Hayranlar sahiplendi: süperfan artışı + itibar.", "ok");
      }
      K.save(); K.refresh();
      return true;
    },

    summary() {
      const lv = K.mental.level(), m = K.mental.m();
      return {
        stress: Math.round(K.mental.stress()),
        level: lv,
        qualityMult: K.mental.qualityMult(),
        onHiatus: K.mental.onHiatus(),
        hiatusLeft: Math.max(0, (m.hiatusUntil || 0) - K.state.day),
        inTherapy: K.mental.inTherapy(),
        sessions: m.sessions || 0,
        burnouts: m.burnoutCount || 0,
        spokeOut: !!m.spokeOut
      };
    }
  };
})(window.K = window.K || {});
