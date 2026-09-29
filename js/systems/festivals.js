/* ============================================================
   KARMA — systems/festivals.js
   FESTİVAL DEVRESİ (yaz sezonu line-up'ı)

   Konser/turne sisteminden farkı
   ------------------------------
   Konserde mekânı sen seçip kiralarsın; festivalde bir LINE-UP'a
   girmeye çalışırsın ve sana verilen SLOT her şeyi belirler.
   Gündüz sahnesinde çalmak para kaybettirir ama görünürlük verir;
   headliner olmak hem büyük para hem kariyer sıçramasıdır.

   Akış
   ----
   1. Sezon takvimi: her festivalin yıl içindeki EDİSYONU hesaplanır.
   2. Başvuru penceresi: edisyondan FEST_OPEN_WINDOW gün önce açılır.
   3. Başvuruda oyuncunun popülerliğine göre SLOT tahsis edilir
      (eşikler: K.FESTIVAL_TIER_POPS) ve strateji seçilir:
        ücret odaklı · dengeli · kitle odaklı
   4. Kabul; itibar + popülerlik fazlası + menajer + şirket gücüne bağlı.
   5. Edisyon günü tick() performansı çözer: kitle, ücret, hayran,
      şöhret, itibar ve ara sıra "sahne anı" / "aksilik".
   6. Çakışma koruması: aynı gün konser/turne/festival olamaz.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* Başvuru penceresi: edisyondan kaç gün önce açılır */
  const OPEN_WINDOW = 45;
  /* Başvuru kapanışı: son kaç günde artık başvuru alınmaz */
  const CLOSE_BEFORE = 3;

  const STANCES = [
    { id: "fee",      name: "Ücret odaklı", emoji: "💰", feeMul: 1.15, fanMul: 0.80, accept: -0.05,
      desc: "Promotörden daha yüksek garanti koparır; sahne etkisini biraz geri plana atar." },
    { id: "balanced", name: "Dengeli",      emoji: "⚖️", feeMul: 1.00, fanMul: 1.00, accept: 0,
      desc: "Ne para ne kitle; sürdürülebilir ve güvenli tercih." },
    { id: "exposure", name: "Kitle odaklı", emoji: "📣", feeMul: 0.75, fanMul: 1.35, accept: 0.08,
      desc: "Düşük ücrete razı olursun; yeni hayran ve viral şansı yükselir." }
  ];

  function stanceOf(id) { return STANCES.find(x => x.id === id) || STANCES[1]; }

  /* ---- takvim matematiği ---- */
  function dayForCal(y, m, d) {
    const sd = U.fromISO(K.state.dateStart || U.todayISO());
    const a = Date.UTC(sd.y, sd.m - 1, sd.d);
    const b = Date.UTC(y, m - 1, d);
    return Math.round((b - a) / 86400000) + 1;
  }

  function nextEdition(fest) {
    const s = K.state;
    const cur = U.dateObjForDay(s.day);
    for (let y = cur.y; y <= cur.y + 2; y++) {
      const day = dayForCal(y, fest.month, fest.dom);
      if (day >= s.day) return { day, year: y, date: U.dateForDay(day) };
    }
    return null;
  }

  function tierPops(fest) {
    return K.FESTIVAL_TIER_POPS[fest.tier] || K.FESTIVAL_TIER_POPS.city;
  }

  /* Oyuncunun popülerliğine karşılık gelen slot */
  function slotIndexFor(fest, pop) {
    const pops = tierPops(fest);
    let idx = -1;
    for (let i = 0; i < pops.length; i++) if (pop >= pops[i]) idx = i;
    return idx; // -1 → hiçbir slota uygun değil
  }

  K.festivals = {
    STANCES,
    OPEN_WINDOW,
    stanceOf,

    fest(id) { return K.FESTIVALS.find(f => f.id === id) || null; },
    slot(id) { return K.FESTIVAL_SLOTS.find(x => x.id === id) || K.FESTIVAL_SLOTS[0]; },
    slotIndex(slotId) { return K.FESTIVAL_SLOTS.findIndex(x => x.id === slotId); },

    /* oyuncunun potansiyel slotu (başvuru öncesi gösterim) */
    slotFor(festId, pop) {
      const f = K.festivals.fest(festId);
      if (!f) return null;
      const i = slotIndexFor(f, pop == null ? K.state.player.popularity : pop);
      return i < 0 ? null : K.FESTIVAL_SLOTS[i];
    },

    booked() {
      return (K.state.festivals || []).filter(x => x.status === "booked")
        .sort((a, b) => a.editionDay - b.editionDay);
    },

    history() {
      return (K.state.festivals || []).filter(x => x.status === "played")
        .sort((a, b) => b.editionDay - a.editionDay);
    },

    /* --- sezon takvimi: yaklaşan edisyonlar --- */
    calendar(limitDays) {
      const s = K.state;
      const p = s.player;
      const span = limitDays || 260;
      const bookedIds = {};
      K.festivals.booked().forEach(b => { bookedIds[b.festId] = b; });

      return K.FESTIVALS.map(f => {
        const ed = nextEdition(f);
        if (!ed) return null;
        const daysLeft = ed.day - s.day;
        if (daysLeft > span) return null;
        const si = slotIndexFor(f, p.popularity || 0);
        const slot = si < 0 ? null : K.FESTIVAL_SLOTS[si];
        const booked = bookedIds[f.id] || null;
        return {
          fest: f, editionDay: ed.day, date: ed.date, year: ed.year, daysLeft,
          slot, slotIndex: si, eligible: si >= 0,
          open: daysLeft <= OPEN_WINDOW && daysLeft >= CLOSE_BEFORE,
          booked,
          conflict: K.festivals.conflictDay(ed.day, booked ? booked.festId : f.id)
        };
      }).filter(Boolean).sort((a, b) => a.editionDay - b.editionDay);
    },

    /* --- çakışma: aynı gün (±1) başka bir taahhüt var mı? --- */
    conflictDay(day, ignoreFestId) {
      const s = K.state;
      const near = (d) => Math.abs(d - day) <= 1;
      for (const cn of (s.concerts || [])) {
        if (cn.status === "planlandı" && near(cn.day)) return { kind: "konser", label: cn.city + " konseri" };
      }
      if (s.tour && s.tour.queue) {
        for (const stop of s.tour.queue) {
          if (near(stop.day)) return { kind: "turne", label: stop.city + " turne durağı" };
        }
      }
      for (const f of (s.festivals || [])) {
        if (f.status === "booked" && f.festId !== ignoreFestId && near(f.editionDay)) {
          const ff = K.festivals.fest(f.festId);
          return { kind: "festival", label: (ff ? ff.name : "Festival") };
        }
      }
      return null;
    },

    /* --- ücret / maliyet tahmini --- */
    estimate(festId, slotId, stanceId, pop) {
      const f = K.festivals.fest(festId);
      if (!f) return null;
      const slot = K.festivals.slot(slotId);
      const st = stanceOf(stanceId);
      const p = K.state.player;
      const popv = pop == null ? (p.popularity || 0) : pop;
      const repBonus = 1 + (p.reputation || 0) / 250;
      const fee = Math.round(f.baseFee * slot.fee * repBonus * st.feeMul);
      const cost = Math.round(f.travel * (0.75 + slot.prestige * 0.18) * (K.econ ? K.econ.infl() : 1));
      const crowd = Math.round(f.capacity * slot.draw * f.mult
        * (0.30 + Math.min(popv, 99) / 120) * st.fanMul);
      const fans = Math.round(crowd * (0.035 + slot.exposure * 0.020));
      const fame = +(slot.prestige * f.prestige * 1.5).toFixed(2);
      const net = fee - cost - ((K.career && K.career.labelCut) ? K.career.labelCut("touring", fee) : 0);
      return { fest: f, slot, stance: st, fee, cost, net, crowd, fans, fame, backstage: slot.backstage };
    },

    /* --- kabul olasılığı --- */
    acceptChance(festId, slotId) {
      const f = K.festivals.fest(festId);
      if (!f) return 0;
      const si = K.festivals.slotIndex(slotId);
      const pops = tierPops(f);
      const p = K.state.player;
      const pop = p.popularity || 0;
      const over = (pop - pops[Math.max(0, si)]) / 30;          // eşiği ne kadar aştın
      const rep = (p.reputation || 0) / 100;
      const mgr = (K.team && K.team.level) ? K.team.level("manager") : 0;
      const labelPower = (K.state.label && K.state.label.power) ? K.state.label.power / 100 : 0;
      let c = 0.30 + over * 0.22 + rep * 0.16 + mgr * 0.05 + labelPower * 0.07;
      return U.clamp(c, 0.05, 0.92);
    },

    /* --- başvuru --- */
    apply(festId, stanceId) {
      const s = K.state, p = s.player;
      const f = K.festivals.fest(festId);
      if (!f) return false;

      const ed = nextEdition(f);
      if (!ed) return false;
      const daysLeft = ed.day - s.day;

      if (daysLeft < CLOSE_BEFORE) { K.toast("Başvuru kapandı", `${f.name} line-up'ı kilitlendi.`, "warn"); return false; }
      if (daysLeft > OPEN_WINDOW) { K.toast("Henüz erken", `${f.name} başvuruları ${daysLeft - OPEN_WINDOW} gün sonra açılıyor.`, "warn"); return false; }

      if (K.festivals.booked().some(b => b.festId === festId)) {
        K.toast("Zaten kayıtlısın", `${f.name} için slotun var.`, "warn"); return false;
      }
      const conflict = K.festivals.conflictDay(ed.day, festId);
      if (conflict) { K.toast("Çakışma", `Aynı tarihte ${conflict.label} var.`, "bad"); return false; }

      const si = slotIndexFor(f, p.popularity || 0);
      if (si < 0) {
        K.toast("Seviye yetersiz", `${f.name} için en az ${tierPops(f)[0]} popülerlik gerekli.`, "bad");
        return false;
      }
      const slot = K.FESTIVAL_SLOTS[si];
      const st = stanceOf(stanceId);

      const chance = U.clamp(K.festivals.acceptChance(festId, slot.id) + st.accept, 0.05, 0.95);
      const ok = U.chance(chance);
      const est = K.festivals.estimate(festId, slot.id, st.id, p.popularity);

      if (!ok) {
        K.toast("❌ Reddedildin", `${f.name} · ${slot.name} başvurusu kabul edilmedi (şans %${Math.round(chance * 100)}).`, "bad");
        s.festivalAttempts = (s.festivalAttempts || 0) + 1;
        K.save(); K.refresh();
        return false;
      }

      s.festivals = s.festivals || [];
      s.festivals.push({
        id: U.uid("fs"), festId: f.id, editionDay: ed.day, year: ed.year,
        slotId: slot.id, stance: st.id,
        fee: est.fee, cost: est.cost, crowdTarget: est.crowd,
        appliedDay: s.day, status: "booked"
      });

      K.toast("🎪 Line-up'a girdin", `${f.name} · ${slot.name} · Gün ${ed.day} (${ed.date.short})`, "ok");
      K.save(); K.refresh();
      return true;
    },

    cancel(festId) {
      const s = K.state;
      const before = (s.festivals || []).length;
      s.festivals = (s.festivals || []).filter(x => !(x.festId === festId && x.status === "booked"));
      if (s.festivals.length < before) {
        K.toast("Festival iptal edildi", "Slot boşa çıktı; promotör not aldı.", "warn");
        s.festivalCancels = (s.festivalCancels || 0) + 1;
        K.save(); K.refresh();
        return true;
      }
      return false;
    },

    /* --- edisyon günü: performansı çöz --- */
    resolve(entry) {
      const s = K.state, p = s.player;
      const f = K.festivals.fest(entry.festId);
      if (!f) { entry.status = "played"; return; }
      const slot = K.festivals.slot(entry.slotId);
      const st = stanceOf(entry.stance);

      const crowd = Math.max(0, Math.round(
        (entry.crowdTarget || f.capacity * slot.draw) * U.rand(0.85, 1.15)
      ));

      let fans = Math.round(crowd * (0.035 + slot.exposure * 0.020));
      let fame = slot.prestige * f.prestige * 1.5;
      let repDelta = slot.prestige * f.prestige * 0.45;

      /* sahne anı / aksilik */
      let event = null;
      const viralP = 0.10 + st.fanMul * 0.03 + (slot.backstage * 0.02);
      const mishapP = 0.11 - slot.prestige * 0.015;
      if (U.chance(viralP)) {
        event = "viral";
        fans = Math.round(fans * 1.85);
        fame *= 1.30;
        repDelta += 0.8;
      } else if (U.chance(Math.max(0.02, mishapP))) {
        event = "mishap";
        fans = Math.round(fans * 0.68);
        fame *= 0.75;
        repDelta -= U.rand(1.8, 3.6);
      }

      const fee = entry.fee || 0;
      const cost = entry.cost || 0;
      const cut = (K.career && K.career.labelCut) ? K.career.labelCut("touring", fee) : 0;
      const net = Math.max(0, fee - cut) - cost;

      if (net >= 0) K.economy.earn(net, "festival");
      else K.economy.spend(Math.min(K.state.balance, -net), "festival_cost");

      K.game.addFame(fame);
      p.reputation = U.clamp((p.reputation || 0) + repDelta, 0, 100);
      p.ig = (p.ig || 0) + Math.round(fans * 0.55);
      p.tiktok = (p.tiktok || 0) + Math.round(fans * 0.45);
      p.festivalsPlayed = (p.festivalsPlayed || 0) + 1;
      if (slot.id === "headliner") {
        p.headlinerCount = (p.headlinerCount || 0) + 1;
        if (f.tier === "flagship") p.flagshipHeadliner = true;
      }

      /* backstage: camia teması */
      let met = null;
      if (slot.backstage > 0 && U.chance(0.35 + slot.backstage * 0.3) && K.relations) {
        const roster = (K.artistList && K.artistList()) || [];
        const cand = roster.filter(a => a && a.id);
        if (cand.length) {
          const a = U.pick(cand);
          const gain = Math.round(4 + slot.backstage * 8);
          K.relations.addAffinity(a.id, gain, "festival_backstage", { uncapped: true });
          met = { id: a.id, name: a.stageName, gain };
        }
      }

      entry.status = "played";
      entry.result = {
        crowd, capacity: f.capacity, fans, fee, cost, cut, net,
        fame: +fame.toFixed(2), repDelta: +repDelta.toFixed(2),
        slot: slot.name, slotId: slot.id, event, met
      };

      const tag = event === "viral" ? " · 🔥 sahne anı" : event === "mishap" ? " · ⚠️ aksilik" : "";
      K.toast(`🎪 ${f.name} · ${slot.name}`,
        `${U.fmt(crowd)} kişi · ${net >= 0 ? "+" : ""}${U.money(net)} · +${U.fmt(fans)} hayran${tag}`, "ok");
    },

    /* --- günlük tick --- */
    tick() {
      const s = K.state;
      if (!s.festivals || !s.festivals.length) return;
      s.festivals.forEach(entry => {
        if (entry.status !== "booked") return;
        if (s.day >= entry.editionDay) K.festivals.resolve(entry);
      });
      /* oynanmış kayıtları arşivde tut; sonsuza dek şişmesin */
      const played = s.festivals.filter(x => x.status === "played");
      if (played.length > 40) {
        const keep = played.sort((a, b) => b.editionDay - a.editionDay).slice(0, 40);
        const keepIds = {};
        keep.forEach(k => { keepIds[k.id] = true; });
        s.festivals = s.festivals.filter(x => x.status !== "played" || keepIds[x.id]);
      }
    },

    /* UI için özet */
    summary() {
      const b = K.festivals.booked();
      const h = K.festivals.history();
      const next = b[0] || null;
      const f = next ? K.festivals.fest(next.festId) : null;
      return {
        bookedCount: b.length,
        playedCount: h.length,
        nextLabel: next && f ? `${f.name} · ${K.festivals.slot(next.slotId).name} · ${Math.max(0, next.editionDay - K.state.day)} gün` : "—",
        headliners: K.state.player.headlinerCount || 0,
        flagship: !!K.state.player.flagshipHeadliner
      };
    }
  };
})(window.K);
