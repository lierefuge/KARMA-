/* ============================================================
   KARMA — systems/press.js
   BASIN & İMAJ
   • Popülerlikten AYRI bir "imaj" skoru (sevilen ↔ tartışmalı).
   • Podcast/dergi/TV/eleştirmen teklifleri → kabul/red.
   • Yayın sonrası "ilk dinleme" eleştirisi imajı etkiler.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.press = {

    imageLabel() {
      const im = K.state.player.image || 50;
      if (im >= 75) return "çok sevilen";
      if (im >= 60) return "sevilen";
      if (im >= 45) return "nötr";
      if (im >= 30) return "tartışmalı";
      return "kutuplaştırıcı";
    },

    baseline() {
      const p = K.state.player;
      return U.clamp(50 + (p.reputation || 0) * 0.25 - (p.popularity || 0) * 0.04, 20, 85);
    },

    tick() {
      const p = K.state.player;
      const base = K.press.baseline();
      const teamImg = (K.team && K.team.bonus) ? K.team.bonus().image : 0;   // PR + stilist
      p.image = U.clamp((p.image || 50) + (base - (p.image || 50)) * 0.03 + U.rand(-0.25, 0.25) + teamImg * 0.04, 0, 100);
      K.press.maybeOffer();
    },

    OFFER_TYPES: [
      { id: "podcast",  name: "Podcast Konuğu",       fee: 0,     img: 3,  rep: 1,   pop: 0.6, desc: "Uzun sohbet; imaj ve itibar artar." },
      { id: "magazine", name: "Dergi Röportajı",      fee: 0,     img: 4,  rep: 1.5, pop: 1.2, desc: "Özel röportaj; saygınlık kazandırır." },
      { id: "tv",       name: "TV Programı",          fee: 20000, img: 2,  rep: 1,   pop: 2.2, desc: "Geniş kitle; ücretli katılım." },
      { id: "critic",   name: "Eleştirmen Söyleşisi", fee: 0,     img: 5,  rep: 2.5, pop: 0.4, desc: "Saygın bir eleştirmenle derin söyleşi." },
      { id: "gossip",   name: "Magazin Programı",     fee: 35000, img: -6, rep: -1,  pop: 3,   desc: "Çok izlenir ama imajı yorar." }
    ],

    maybeOffer() {
      const s = K.state, p = s.player;
      if (s.pendingPress) return;
      if ((p.popularity || 0) < 12) return;
      if (!U.chance(0.035 + p.popularity / 1400)) return;
      const t = U.pick(K.press.OFFER_TYPES);
      s.pendingPress = { id: U.uid("press"), type: t.id, name: t.name, fee: t.fee, img: t.img, rep: t.rep, pop: t.pop, desc: t.desc, day: s.day };
      if (K.toast) K.toast("📰 Basın teklifi", `${t.name} seni istiyor.`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "📰 Basın", msg: `${t.name} teklifi geldi.`, kind: "ok", day: s.day
      }]).slice(-60);
      K.save();
    },

    openOffer() {
      const s = K.state, o = s.pendingPress;
      if (!o) return;
      const p = s.player;
      K.ui.modal({
        title: "📰 " + o.name,
        desc: o.desc,
        body: `<div style="font-size:12.5px;line-height:1.7;color:var(--text-1)">
            Mevcut imaj: <b>${K.press.imageLabel()}</b> (${Math.round(p.image || 50)}/100)<br>
            Kabul edersen: imaj ${o.img >= 0 ? "+" : ""}${o.img} · itibar ${o.rep >= 0 ? "+" : ""}${o.rep} · popülerlik ${o.pop >= 0 ? "+" : ""}${o.pop}${o.fee ? " · ücret " + U.money(o.fee) : ""}
          </div>`,
        actions: [
          { label: "Kabul et", cls: "btn-primary", onClick: () => K.press.resolve(true) },
          { label: "Reddet", cls: "btn-ghost", onClick: () => K.press.resolve(false) }
        ]
      });
    },

    resolve(accept) {
      const s = K.state, p = s.player, o = s.pendingPress;
      if (!o) return;
      if (accept) {
        if (o.fee) K.economy.earn(o.fee, "press");
        p.image = U.clamp((p.image || 50) + o.img, 0, 100);
        p.reputation = U.clamp((p.reputation || 0) + o.rep, 0, 100);
        /* DÜZELTME (v10.9): popülerlik doğrudan ekleniyordu; artık
           dinleyicinin hak ettiği tavanla sınırlı şöhret denetleyicisinden geçer. */
        K.game.addFame(o.pop);
        K.toast("📰 " + o.name, `Yayınlandı · imaj ${Math.round(p.image)}/100`, o.img >= 0 ? "ok" : "warn");
      } else {
        K.toast("Reddedildi", o.name + " teklifi reddedildi.", "warn");
      }
      s.pendingPress = null;
      K.save(); if (K.refresh) K.refresh();
    },

    /* ---------------- RÖPORTAJ RİSKİ ----------------
       Gazeteci mikrofonu uzatır; cevabın imaj/itibar/popülerlik dengesini değiştirir. */
    interview() {
      const s = K.state;
      if (s.pendingInterview) { K.press.openInterview(); return; }
      const topics = [
        "yeni sound'un ve piyasanın gidişatı",
        "rakipler ve husumetler",
        "para, şirket ve sözleşmeler",
        "mahalle, aile ve geçmiş"
      ];
      s.pendingInterview = { topic: U.pick(topics), day: s.day };
      K.press.openInterview();
    },

    openInterview() {
      const o = K.state.pendingInterview;
      if (!o) return;
      const body = `<div style="font-size:12.5px;line-height:1.7;color:var(--text-1)">
        Gazeteci sana <b>${U.escape(o.topic)}</b> hakkında mikrofonu uzattı. Nasıl cevap vereceksin?<br><br>
        <b>🙏 Alçakgönüllü:</b> güvenli; imaj ve itibar artar.<br>
        <b>🔥 İddialı:</b> dikkat çeker, popülerlik artar ama imaj hafif yorulur.<br>
        <b>😈 Provokatif:</b> çok konuşulur; sözlerin çarpıtılma riski var, husumet çıkabilir.</div>`;
      K.ui.modal({
        title: "🎤 Röportaj", desc: "Vereceğin cevap kariyerini etkiler.", body,
        actions: [
          { label: "🙏 Alçakgönüllü", onClick: () => K.press.resolveInterview("humble") },
          { label: "🔥 İddialı", onClick: () => K.press.resolveInterview("bold") },
          { label: "😈 Provokatif", onClick: () => K.press.resolveInterview("provocative") }
        ]
      });
    },

    resolveInterview(styleId) {
      const s = K.state, p = s.player, o = s.pendingInterview;
      if (!o) return;
      const R = {
        humble:      { rep: 1.6, img: 2,  pop: 0.4 },
        bold:        { rep: 0.3, img: -1, pop: 1.8 },
        provocative: { rep: -2,  img: -4, pop: 3.2 }
      };
      const r = R[styleId] || { rep: 0, img: 0, pop: 0 };
      p.reputation = U.clamp((p.reputation || 0) + r.rep, 0, 100);
      p.image = U.clamp((p.image || 50) + r.img, 0, 100);
      K.game.addFame(r.pop);
      let msg = "Röportaj yayınlandı.";
      if (styleId === "provocative" && U.chance(0.4)) {
        p.reputation = Math.max(0, p.reputation - 3);
        msg = "Sözlerin bağlamından koparıldı; başlıklar sert.";
        s.notifications = (s.notifications || []).concat([{
          title: "📰 Kötü alıntı", msg: "Röportajda sözlerin çarpıtıldı; itibar −3.", kind: "bad", day: s.day
        }]).slice(-60);
      } else if (styleId === "provocative") {
        msg = "Provokatif cevap sosyal medyada dolaşıma girdi.";
      }
      s.pendingInterview = null;
      K.toast("🎤 Röportaj", msg, r.img >= 0 ? "ok" : "warn");
      K.save(); if (K.refresh) K.refresh();
    },

    /* yayın sonrası "ilk dinleme" eleştirisi */
    onRelease(song) {
      const p = K.state.player;
      const q = song.quality || 50;
      const hit = q >= 72 ? 3 : q >= 55 ? 1 : -2;
      p.image = U.clamp((p.image || 50) + hit * 0.6, 0, 100);
      p.reputation = U.clamp((p.reputation || 0) + (hit > 0 ? 0.6 : -0.3), 0, 100);
      if (hit >= 3) K.toast("📝 Basın övgüsü", `"${song.title}" eleştirmenlerden geçer not aldı.`, "ok");
      else if (hit < 0) K.toast("📝 Sert eleştiri", `"${song.title}" eleştiride zayıf bulundu.`, "warn");
    }
  };
})(window.K = window.K || {});
