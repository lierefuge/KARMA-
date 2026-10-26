/* First month: persistent local relationships, commitments and visible consequences.
   Offers follow actual releases; a missed deadline never blocks the normal career. */
(function (K) {
  "use strict";
  const U = K.util;
  const EVENTS = {
    circle: { title: "İlk çevren", role: "producer", text: "Semt prodüktörün iki gün sonra ev stüdyosunda. İlk adımını nasıl atmak istersin?", choices: [
      { id: "meet", label: "Dinlemeye git", note: "2 gün sonra · yorgunluk +6 · prodüktörle samimiyet artar", days: 2, fatigue: 6 },
      { id: "practice", label: "Evde prova yap", note: "2 gün sonra · yorgunluk +10 · müzik becerisi +1", days: 2, fatigue: 10 },
      { id: "pass", label: "Şimdilik kendi planım", note: "Masraf ve ceza yok" }
    ] },
    session: { title: "Yayın öncesi son dinleme", role: "producer", text: "Prodüktörün hazırladığın parçayı birlikte dinlemeyi öneriyor. Kayıt hâlâ düzenlenebilir durumda.", choices: [
      { id: "together", label: "Birlikte düzenle", note: "₺1.200 · 2 gün sonra · kalite +3 · yorgunluk +8 · samimiyet artar", cost: 1200, days: 2, fatigue: 8 },
      { id: "solo", label: "Kendim prova edeyim", note: "Ücretsiz · 2 gün sonra · kalite +1 · yorgunluk +12", days: 2, fatigue: 12 },
      { id: "pass", label: "Mevcut kaydı koru", note: "Masraf ve ceza yok" }
    ] },
    stage: { title: "İlk küçük sahne", role: "dj", text: "Mahalli DJ, yayınladığın şarkıyla açık mikrofon gecesinde kısa bir set istiyor. Sabit ücret ₺1.500; ulaşım ₺400.", choices: [
      { id: "show", label: "Sahneye söz ver", note: "₺400 şimdi · 3 gün sonra ₺1.500 · yorgunluk +12 · DJ ile samimiyet artar", cost: 400, days: 3, fatigue: 12 },
      { id: "share", label: "Evden tanıtım hazırla", note: "Ücretsiz · 2 gün sonra · şarkıya küçük tanıtım etkisi · yorgunluk +6", days: 2, fatigue: 6 },
      { id: "pass", label: "Bu kez katılma", note: "Masraf ve ceza yok" }
    ] },
    followup: { title: "Seni yeniden dinleyen biri", role: "fan", text: "İlk dinleyicilerinden biri yeni şarkını soruyor. Bu küçük çevreyle bağını nasıl sürdüreceksin?", choices: [
      { id: "reply", label: "Sohbet için vakit ayır", note: "1 gün sonra · hayranla samimiyet artar · yorgunluk +4", days: 1, fatigue: 4 },
      { id: "practice", label: "Yeni işe hazırlan", note: "2 gün sonra · müzik becerisi +1 · yorgunluk +10", days: 2, fatigue: 10 },
      { id: "pass", label: "Biraz ara ver", note: "Masraf ve ceza yok" }
    ] }
  };
  K.journey = {
    EVENTS,
    ensure() {
      const s = K.state;
      // Established careers are not restarted when an older save is loaded.
      if (!s.journey && s.day <= 30) s.journey = { closed: {}, history: [], milestones: {}, lastDay: -2 };
      const j = s.journey;
      if (!j) return null;
      j.closed = j.closed || {}; j.history = j.history || []; j.milestones = j.milestones || {};
      return j;
    },
    contact(role) { return K.contacts.list().find(c => c.role === role); },
    tell(role, text, affinity) {
      const c = K.journey.contact(role);
      if (!c) return;
      K.relation(c.id).met = true;
      if (affinity) K.relations.addAffinity(c.id, affinity, "ilk_ay", { uncapped: true });
      K.relations.pushArtistMessage(c.id, text, "chat", { topic: "ilk_ay", silent: true });
    },
    note(title, text) {
      const s = K.state, j = K.journey.ensure();
      j.history.unshift({ day: s.day, title, text });
      j.history = j.history.slice(0, 16);
      s.notifications = (s.notifications || []).concat({ day: s.day, title, msg: text, kind: "" }).slice(-60);
      K.toast(title, text, "");
    },
    targets() {
      const p = K.state.player, j = K.state.journey || {};
      const sg = (p.songs || []);
      return [
        { id: "release", title: "İlk şarkını yayınla", done: sg.length > 0, act: "open-studio", label: "Stüdyoya git" },
        { id: "listeners", title: "50 aylık dinleyiciye ulaş", done: (p.monthly || 0) >= 50 && sg.length > 0, act: "go-tab", arg: "releases", label: "Şarkını tanıt" },
        { id: "income", title: "Müzikten ilk ₺1.000 gelir", done: (p.totalStreamRevenue || 0) + (j.showIncome || 0) >= 1000, act: "go-tab", arg: "analytics", label: "Gelirleri gör" }
      ];
    },
    tick() {
      const s = K.state, p = s.player, j = K.journey.ensure();
      if (!j) return;
      if (j.booking && s.day >= j.booking.dueDay) K.journey.finish();
      K.journey.targets().forEach(t => {
        if (t.done && !j.milestones[t.id]) {
          j.milestones[t.id] = s.day;
          K.journey.note("Kariyer adımı", t.title + " — tamamlandı.");
        }
      });
      if (j.pending && s.day > j.pending.deadline) {
        j.closed[j.pending.id] = "missed";
        K.journey.note("Fırsatın zamanı geçti", EVENTS[j.pending.id].title + ": kendi planınla devam edebilirsin.");
        j.pending = null; j.lastDay = s.day;
      }
      if (s.day > 30 || j.pending || j.booking || s.day - j.lastDay < 2) return;
      const rel = (p.releases || []).find(r => r.stage === "prep" && (s.day + 2 - r.startDay) / Math.max(1, r.waitDays) < 0.4);
      const song = (p.songs || []).find(x => !x.takenDown);
      let id;
      if (!j.closed.circle) id = "circle";
      else if (!j.closed.session && rel) id = "session";
      else if (!j.closed.stage && song) id = "stage";
      else if (!j.closed.followup && j.closed.stage && song && s.day >= 20) id = "followup";
      if (!id) return;
      j.pending = { id, deadline: Math.min(30, s.day + 5), targetId: id === "session" ? rel.id : (song && song.id) };
      const e = EVENTS[id];
      K.journey.tell(e.role, e.text, 0);
      K.journey.note(e.title, "Kariyerindeki İlk Ay kartında kararını verebilirsin. Son gün: " + j.pending.deadline + ".");
    },
    choose(id, choiceId) {
      const s = K.state, p = s.player, j = K.journey.ensure();
      if (!j || !j.pending || j.pending.id !== id || j.booking || s.day > j.pending.deadline) return false;
      const e = EVENTS[id], ch = e.choices.find(c => c.id === choiceId);
      if (!ch) return false;
      if (ch.days && ((p.fatigue || 0) + ch.fatigue > 100 || (K.mental && K.mental.onHiatus()))) {
        K.toast("Biraz dinlen", "Bu hazırlık için yeterli enerjin yok.", "warn"); return false;
      }
      const dueDay = s.day + (ch.days || 0);
      if (id === "session" && ch.days) {
        const rel = (p.releases || []).find(r => r.id === j.pending.targetId);
        if (!rel || rel.stage !== "prep" || (dueDay - rel.startDay) / Math.max(1, rel.waitDays) >= 0.4) {
          K.toast("Seans için süre kalmadı", "Proje dağıtıma geçiyor. Mevcut kaydı koruyarak devam edebilirsin.", "warn"); return false;
        }
      }
      if (choiceId === "show" && K.journey.busyOn(dueDay)) {
        K.toast("Takvim çakışıyor", "Aynı gün başka bir sahneye söz verdin.", "warn"); return false;
      }
      if (ch.cost && !K.economy.spend(ch.cost, id === "stage" ? "journey_travel" : "journey_session")) {
        K.toast("Yetersiz bakiye", U.money(ch.cost) + " gerekiyor.", "warn"); return false;
      }
      const targetId = j.pending.targetId;
      j.pending = null; j.closed[id] = choiceId; j.lastDay = s.day;
      if (ch.days) {
        p.fatigue = U.clamp((p.fatigue || 0) + ch.fatigue, 0, 100);
        j.booking = { id, choiceId, targetId, dueDay, cost: ch.cost || 0 };
        K.journey.note(e.title, ch.label + ": Gün " + dueDay + " için planlandı. " + ch.note);
      } else K.journey.note(e.title, "Bu fırsatı pas geçtin; kariyerine kendi planınla devam ediyorsun.");
      K.save(); K.refresh(); return true;
    },
    busyOn(day) {
      const s = K.state;
      return (s.concerts || []).some(c => c.status === "planlandı" && c.day === day) ||
        !!(s.tour && s.tour.queue.some(c => c.day === day));
    },
    cancel(systemReason) {
      const j = K.journey.ensure(), b = j && j.booking;
      if (!b) return false;
      j.booking = null; j.lastDay = K.state.day;
      const refund = systemReason ? b.cost : Math.floor(b.cost / 2);
      if (refund) K.economy.earn(refund, "cancel_refund");
      const promised = ["meet", "together", "show", "reply"].includes(b.choiceId);
      const text = systemReason || ("Planı iptal ettin. İade: " + U.money(refund) + (promised ? "; verdiğin söz nedeniyle samimiyet azalır." : "."));
      if (!systemReason && ["meet", "together", "show", "reply"].includes(b.choiceId)) K.journey.tell(EVENTS[b.id].role, "Bu kez olmadı. Bir daha plan yaparken haberleşelim.", -2);
      K.journey.note(EVENTS[b.id].title, text);
      K.save(); K.refresh(); return true;
    },
    finish() {
      const s = K.state, p = s.player, j = K.journey.ensure(), b = j.booking;
      if (!b) return;
      const rel = (p.releases || []).find(x => x.id === b.targetId);
      const song = (p.songs || []).find(x => x.id === b.targetId && !x.takenDown);
      if (b.id === "session" && (!rel || rel.stage !== "prep")) {
        K.journey.cancel("Kayıt artık düzenlenebilir durumda değil. Seans ücreti tamamen iade edildi."); return;
      }
      if (b.id === "stage" && (!song || (b.choiceId === "show" && (K.journey.busyOn(b.dueDay) || K.mental.onHiatus())))) {
        K.journey.cancel("Şarkı veya sahne takvimi değişti. Plan iptal edildi; ödenen masraf iade edildi."); return;
      }
      j.booking = null; j.lastDay = s.day;
      let text;
      if (b.choiceId === "practice") {
        p.skills.music = U.clamp((p.skills.music || 0) + 1, 0, 100);
        text = "Prova tamamlandı. Müzik becerin +1; bir sonraki kayda daha hazırsın.";
      } else if (b.id === "circle") {
        K.journey.tell("producer", "Geldiğin iyi oldu. Kaydın hazır olunca birlikte dinleyelim.", 4);
        text = "Ev stüdyosunda tanıştınız. Prodüktörle samimiyet arttı; ilk projen hazır olunca yeni bir seans fırsatı doğacak.";
      } else if (b.id === "session") {
        const gain = b.choiceId === "together" ? 3 : 1;
        (rel.tracks || []).forEach(t => { t.quality = U.clamp((t.quality || 50) + gain, 0, 99); });
        if (b.choiceId === "together") K.journey.tell("producer", "Söz verdiğin gibi geldin. Nakaratı toparladık; çıkınca bana da yolla.", 3);
        text = "“" + rel.title + "” düzenlendi. Parça kaliteleri +" + gain + " (en fazla 99).";
      } else if (b.id === "stage") {
        song.boosts = song.boosts || {};
        song.boosts.journey = (song.boosts.journey || 0) + (b.choiceId === "show" ? 0.08 : 0.12);
        if (b.choiceId === "show") {
          K.economy.earn(1500, "journey_show"); j.showIncome = (j.showIncome || 0) + 1500;
          K.journey.tell("dj", "Küçük bir geceydi ama sözünü tuttun. Set ücretin gönderildi. Bir sonraki işte haberleşiriz.", 4);
          text = "Açık mikrofon setini tamamladın. ₺1.500 ücret − ₺400 ulaşım = ₺1.100 net; DJ ile samimiyet artar. Şarkın küçük bir tanıtım etkisi kazandı.";
        } else text = "Evden hazırladığın tanıtım yayında. “" + song.title + "” küçük bir dinlenme desteği aldı; etkisini sonraki günlerde göreceksin.";
      } else {
        K.journey.tell("fan", j.showIncome ? "O küçük sahneden beri dinliyorum. Cevap vermen mutlu etti; yeni parçanı bekliyorum." : "İlk parçandan beri buradayım. Sohbet için sağ ol, yeni işini bekliyorum.", 5);
        text = "İlk dinleyicinle bağını güçlendirdin. Samimiyet arttı; aynı kişi Mesajlar'da seni hatırlıyor.";
      }
      K.journey.note(EVENTS[b.id].title, text);
    },
    html() {
      const s = K.state, j = s.journey;
      if (!j) return "";
      const pending = j.pending, b = j.booking;
      const e = pending && EVENTS[pending.id];
      const name = e && (s.contacts || []).find(c => c.role === e.role);
      return `<section class="journey-card" aria-label="Kariyerindeki ilk ay">
        <div class="journey-head"><div><span class="ob-hint">KARİYERİNDEKİ İLK AY</span><h2>${s.day <= 30 ? "Kendi çevreni kur" : "İlk ayın hikâyesi"}</h2></div><span class="pill">${Math.min(30, s.day)} / 30 gün</span></div>
        <div class="journey-targets">${K.journey.targets().map(t => `<div><b>${j.milestones[t.id] || t.done ? "✓" : "○"} ${U.escape(t.title)}</b>${j.milestones[t.id] || t.done ? "" : `<button class="btn btn-xs btn-ghost" data-act="${t.act}" data-arg="${t.arg || ""}">${t.label}</button>`}</div>`).join("")}</div>
        ${e ? `<h3>${U.escape(e.title)}</h3><p>${name ? U.escape(name.stageName) + " · " : ""}${U.escape(e.text)}</p><p class="ob-hint">Karar için son gün: ${pending.deadline}</p><div class="journey-choices">${e.choices.map(c => `<button class="btn btn-ghost" data-act="journey-choice" data-event="${pending.id}" data-choice="${c.id}" ${(c.cost || 0) > s.balance ? "disabled" : ""}><b>${c.label}</b><span>${c.note}</span></button>`).join("")}</div>` : b ? `<h3>${U.escape(EVENTS[b.id].title)} · Gün ${b.dueDay}</h3><p>${U.escape(EVENTS[b.id].choices.find(c => c.id === b.choiceId).note)}</p><p class="ob-hint">İptal edersen ${U.money(Math.floor(b.cost / 2))} iade edilir.${["meet", "together", "show", "reply"].includes(b.choiceId) ? " Verdiğin söz nedeniyle samimiyet azalır." : ""}</p><button class="btn btn-sm btn-ghost" data-act="journey-cancel">Planı iptal et</button>` : `<p class="ob-hint">${s.day <= 30 ? "Yeni fırsatlar projen ve yayının ilerledikçe gelecek. Beklerken üret, dinlen veya yan işlerinden gelir kazan." : "İlk ay tamamlandı. Yayınların, ilişkilerin ve gelir hedeflerinle kariyerine devam et."}</p>`}
        ${j.history.length ? `<details><summary>Kariyer günlüğü (${j.history.length})</summary>${j.history.map(h => `<div class="journey-entry"><b>Gün ${h.day} · ${U.escape(h.title)}</b><p>${U.escape(h.text)}</p></div>`).join("")}</details>` : ""}
      </section>`;
    }
  };
})(window.K);
