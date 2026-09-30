/* ============================================================
   KARMA — systems/writing.js   (v10.28)
   BAŞKASI İÇİN ŞARKI YAZMAK (toplining / gölge yazarlık)

   Neden?
   ------
   Oyuncu zaten bir GÖLGE YAZAR TUTABİLİYORDU (`player.ghost`) ama
   kendisi bir başkası için yazamıyordu. Gerçekte bu, genç bir
   söz yazarının en yaygın gelir ve network yoludur:
       hook/vokal yaz → ücret → samimiyet → itibar
   Ayrıca rap sahnesinin en tartışmalı konusunu oyuna taşır:
       “şarkıyı YAZAN mı konuşur, söyleyen mi?”

   İKİ MOD (asıl gerilim burada)
   -----------------------------
     🎭 GÖLGE  : adın geçmez → ücret ×1,35 (daha çok para)
                 ama iş sayısı arttıkça AÇIĞA ÇIKMA riski birikir
     ✍️ ADINLA : kredilendirilirsin → ücret düşük, ama itibar +
                 samimiyet + “yazarlık” itibarı kazanırsın
   Açığa çıkma: gölge iş sayısı ve düşük samimiyet riski büyütür.
   Yakalanırsan imaj ve itibar yanar (“kendi işini yapmıyor”).
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* kapsam: ne yazıyorsun? */
  const SCOPES = {
    hook:  { id: "hook",  name: "Hook / Nakarat",  icon: "🎣", base: 1.00, days: 2, minSkill: 0 },
    verse: { id: "verse", name: "Verse (16'lık)",  icon: "📝", base: 1.55, days: 3, minSkill: 0 },
    full:  { id: "full",  name: "Tam Şarkı",       icon: "🎼", base: 2.60, days: 5, minSkill: 12 }
  };

  K.writing = {
    SCOPES,

    /* müzik + stüdyo becerisi yazarlık kalitesini belirler (0-100) */
    craft() {
      const sk = (K.state.player.skills) || {};
      return U.clamp(Math.round((sk.music || 0) * 6 + (sk.studio || 0) * 3.2), 12, 96);
    },

    active() { return K.state.player.writing.active || null; },

    /* ---------------- günlük ---------------- */
    tick() {
      const s = K.state, p = s.player, w = p.writing;
      w.offers = w.offers || [];

      /* --- aktif işi ilerlet --- */
      if (w.active) {
        w.active.daysLeft = (w.active.daysLeft || 0) - 1;
        if (w.active.daysLeft <= 0) K.writing._resolve();
      }

      /* --- teklif üret --- */
      if (w.active) return;
      if (w.offers.length >= 3) return;
      const pop = p.popularity || 0;
      if (pop < 12) return;                     // kimse tanımıyorsa teklif gelmez
      const chance = 0.03 + pop / 1400 + K.writing.craft() / 1800;
      if (!U.chance(chance)) return;

      /* yazacak sanatçı: yeterli samimiyet ya da yeterli şöhret */
      const pool = (K.artistList ? K.artistList() : []).filter(a => {
        if (!a || a.id === "player") return false;
        if (K.state.label && (K.state.label.roster || []).indexOf(a.id) >= 0) return false;
        const rel = K.relation ? K.relation(a.id) : null;
        const aff = rel ? (rel.affinity || 0) : 0;
        return aff >= 40 || (a.popularity || 0) < pop + 12;
      });
      if (!pool.length) return;
      const a = U.pick(pool);
      const scopes = ["hook", "verse"].concat(pop >= 25 ? ["full"] : []);
      const sid = U.pick(scopes);
      const sc = SCOPES[sid];
      if ((K.writing.craft() < sc.minSkill) && sid === "full") return;

      /* ücret: müşterinin büyüklüğü × kapsam × senin ustalığın */
      const size = 1 + (a.popularity || 0) / 26;
      const fee = Math.round(K.ECON.writingBase * sc.base * size * (0.7 + K.writing.craft() / 100));
      const offer = {
        id: U.uid("wr"), artistId: a.id, artistName: a.stageName, icon: sc.icon,
        scope: sc.id, scopeName: sc.name, fee, days: sc.days, day: s.day,
        quality: K.writing.craft()
      };
      w.offers.push(offer);
      if (K.toast) K.toast("✍️ Yazarlık teklifi", `${a.stageName} ${sc.name.toLowerCase()} istiyor.`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "✍️ Yazarlık teklifi",
        msg: `${a.stageName} · ${sc.name} · ${U.money(fee)} · ${sc.days} gün`,
        kind: "ok", day: s.day
      }]).slice(-60);
      K.save();
    },

    /* ---------------- kabul / ret ---------------- */
    accept(offerId, mode) {
      const s = K.state, w = s.player.writing;
      const o = (w.offers || []).find(x => x.id === offerId);
      if (!o) return false;
      if (w.active) { K.toast("Zaten bir işin var", "Önce mevcut işi bitir.", "warn"); return false; }
      w.offers = w.offers.filter(x => x.id !== offerId);
      w.active = {
        ...o, mode: mode === "ghost" ? "ghost" : "credit",
        fee: mode === "ghost" ? Math.round(o.fee * 1.35) : Math.round(o.fee * 0.85),
        daysLeft: o.days, startDay: s.day
      };
      K.toast("✍️ İş kabul edildi",
        `${o.artistName} için ${o.scopeName} · ${o.days} gün` +
        (mode === "ghost" ? " · GÖLGE (adın geçmeyecek)" : " · adın geçecek"), "ok");
      K.save(); K.refresh();
      return true;
    },

    decline(offerId) {
      const w = K.state.player.writing;
      const o = (w.offers || []).find(x => x.id === offerId);
      if (!o) return false;
      w.offers = w.offers.filter(x => x.id !== offerId);
      if (K.relation && o.artistId) {
        const rel = K.relation(o.artistId);
        if (rel) rel.affinity = U.clamp((rel.affinity || 0) - 1, 0, 100);
      }
      K.toast("Teklif reddedildi", `${o.artistName} başka birine soracak.`, "warn");
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- iş bitişi ---------------- */
    _resolve() {
      const s = K.state, p = s.player, w = p.writing;
      const j = w.active;
      w.active = null;
      if (!j) return;

      /* kalite: ustalık + biraz şans */
      const roll = U.clamp(j.quality + U.rand(-9, 9), 10, 99);
      const paid = Math.max(0, Math.round(j.fee * (0.75 + roll / 200)));
      K.economy.earn(paid, "writing");
      w.totalEarned = (w.totalEarned || 0) + paid;
      w.done = (w.done || []).concat([{ artistId: j.artistId, artistName: j.artistName, scope: j.scope, roll, paid, mode: j.mode, day: s.day }]).slice(-40);

      const rel = K.relation ? K.relation(j.artistId) : null;
      if (j.mode === "ghost") {
        /* gölge: daha çok para, samimiyet daha az, risk birikir */
        p.shady = p.shady || {};
        if (rel) rel.affinity = U.clamp((rel.affinity || 0) + 3, 0, 100);
        const risk = U.clamp(0.05 + (w.done.filter(d => d.mode === "ghost").length) * 0.035, 0.05, 0.42);
        if (U.chance(risk)) {
          w.exposed = (w.exposed || 0) + 1;
          p.image = U.clamp((p.image || 50) - 6, 0, 100);
          p.reputation = Math.max(0, (p.reputation || 0) - 4);
          s.notifications = (s.notifications || []).concat([{
            title: "🕵️ Gölge yazarlık açığa çıktı",
            msg: `${j.artistName}'ın şarkısını senin yazdığın ortaya çıktı — imaj ve itibar zarar gördü.`,
            kind: "bad", day: s.day
          }]).slice(-60);
          K.toast("🕵️ Açığa çıktın!", "“Kendi işini yapmıyor” eleştirisi yayıldı.", "bad");
        } else {
          K.toast("✍️ İş bitti (gölge)", `${j.artistName} · ${U.money(paid)} · kalite ${roll}`, "ok");
        }
      } else {
        /* adın geçti: itibar + samimiyet, ücret düşük */
        w.credited = (w.credited || 0) + 1;
        p.reputation = (p.reputation || 0) + 3;
        if (rel) rel.affinity = U.clamp((rel.affinity || 0) + 5, 0, 100);
        if (K.game && K.game.addFame) K.game.addFame(0.6 + roll / 120);
        K.toast("✍️ İş bitti (kredili)", `${j.artistName} · ${U.money(paid)} · itibar +3`, "ok");
      }
      K.save(); K.refresh();
    },

    /* özet (UI) */
    summary() {
      const w = K.state.player.writing;
      return {
        craft: K.writing.craft(),
        active: w.active || null,
        offers: (w.offers || []).slice(),
        credited: w.credited || 0,
        ghostJobs: (w.done || []).filter(d => d.mode === "ghost").length,
        exposed: w.exposed || 0,
        totalEarned: w.totalEarned || 0
      };
    }
  };
})(window.K = window.K || {});
