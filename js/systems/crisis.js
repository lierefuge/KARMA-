/* ============================================================
   KARMA — systems/crisis.js
   Kriz yönetimi: skandal, sansür, intihal iddiası, sızıntı…
   Oyuncu seçim yapar; itibar / popülerlik / para / hayran etkilenir.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  K.crisis = {
    POOL: [
      {
        id: "scandal", tag: "SKANDAL", minPop: 22, title: "Eski bir paylaşımın gündem oldu",
        desc: "Yıllar önce yaptığın bir paylaşım ekran görüntüsü olarak yayıldı. Sosyal medya karışık.",
        choices: [
          { label: "Özür dile (samimi video)", effects: { rep: 3, pop: -0.5, fans: -4000, money: 0 }, note: "İtibar korunur, kısa vadede hayran kaybı." },
          { label: "PR ekibi tut", effects: { rep: 1, pop: 0, money: -60000, fans: 0 }, note: "Kriz yönetimi parayla." },
          { label: "Görmezden gel", effects: { rep: -6, pop: -1.5, fans: -12000, money: 0 }, note: "Riskli: gündem büyür." }
        ]
      },
      {
        id: "censorship", tag: "SANSÜR", minPop: 12, title: "Şarkın platformdan kaldırıldı",
        desc: "Bir şarkının sözleri nedeniyle platform incelemesi başlatıldı ve yayın geçici kaldırıldı.",
        choices: [
          { label: "Sözleri yumuşat, tekrar yükle", effects: { rep: -1, pop: 0.5, money: -15000, fans: 0 }, note: "Hızlı çözüm, sanatsal taviz." },
          { label: "Karara itiraz et", effects: { rep: 4, pop: 0, money: -30000, fans: 6000 }, note: "Duruş sergilersin." },
          { label: "Bağımsız yayınla", effects: { rep: 2, pop: 1, money: -8000, fans: 9000 }, note: "Kitle desteği gelir." }
        ]
      },
      {
        id: "plagiarism", tag: "İDDİA", minPop: 15, title: "Beat'in çalıntı olduğu iddia edildi",
        desc: "Bir prodüktör, beat'inin izinsiz kullanıldığını öne sürüyor. Konu hızla yayılıyor.",
        choices: [
          { label: "Prodüktörle anlaş (telif öde)", effects: { rep: 2, pop: 0, money: -90000, fans: 0 }, note: "Temiz çözüm." },
          { label: "Kanıtları yayınla", effects: { rep: 3, pop: 1, money: 0, fans: 5000 }, note: "Haklıysan itibar artar." },
          { label: "Sessiz kal", effects: { rep: -4, pop: -1, money: 0, fans: -5000 }, note: "Şüphe büyür." }
        ]
      },
      {
        id: "leak", tag: "SIZINTI", minPop: 12, title: "Yayınlanmamış şarkın sızdı",
        desc: "Bitmemiş bir kaydın internete düştü. Dinleyiciler bölünmüş durumda.",
        choices: [
          { label: "Erken yayınla", effects: { rep: 1, pop: 1.5, money: 25000, fans: 8000 }, note: "Sızıntıyı fırsata çevir." },
          { label: "Yayını iptal et", effects: { rep: 0, pop: -1, money: 0, fans: -6000 }, note: "Temiz ama kayıplı." },
          { label: "Sızıntıyı görmezden gel", effects: { rep: -2, pop: 0.5, money: 10000, fans: 2000 }, note: "Doğal yayılım." }
        ]
      },
      {
        id: "beef", tag: "GERİLİM", minPop: 12, title: "Bir sanatçı seni canlı yayında eleştirdi",
        desc: "Popüler bir rapçi canlı yayında senin sound'unu eleştirdi, klipler kesildi ve viral oldu.",
        choices: [
          { label: "Şarkıyla cevap ver", effects: { rep: 2, pop: 2, money: -20000, fans: 12000 }, note: "Diss kültürü işler." },
          { label: "Zarif cevap yaz", effects: { rep: 3, pop: 0.5, money: 0, fans: 4000 }, note: "Olgunluk kazandırır." },
          { label: "Hiç cevap verme", effects: { rep: -1, pop: -0.5, money: 0, fans: -2000 }, note: "Sessizlik zayıflık sayılabilir." }
        ]
      }
    ],

    active() { return K.state.crisis || null; },

    maybeStart() {
      const s = K.state;
      if (s.crisis) return;
      const mult = K.settings ? K.settings.diffMult().crisis : 1;
      /* DÜZELTME (v10.9): kriz art arda gelebiliyor ve aynı senaryo
         tekrar tekrar seçilebiliyordu. Artık asgari arayı var ve
         henüz yaşanmamış senaryolar öncelikli. */
      /* v10.33 — krizler belirgin şekilde seyreldi (asgari 30 gün ara) ve
         ancak belli bir ünden sonra mümkün: tanınmayan sanatçının skandalı
         olmaz. Senaryolar minPop eşiğiyle süzülür. */
      if (s.day - (s.lastCrisisDay || -999) < 30) return;
      const pop = s.player.popularity || 0;
      const chance = 0.02 * mult * (1 + pop / 70);
      if (!U.chance(chance)) return;
      const base = K.crisis.POOL.filter(c => pop >= (c.minPop || 0));
      if (!base.length) return;
      const seen = s.crisisSeen = s.crisisSeen || [];
      const fresh = base.filter(c => seen.indexOf(c.id) < 0);
      const evt = U.pick(fresh.length ? fresh : base);
      s.lastCrisisDay = s.day;
      if (seen.indexOf(evt.id) < 0) seen.push(evt.id);
      s.crisis = {
        id: evt.id, tag: evt.tag, title: evt.title, desc: evt.desc,
        choices: evt.choices, day: s.day
      };
      K.toast("⚠️ KRİZ: " + evt.title, "Karar vermen gerekiyor.", "bad");
      K.bus.emit("crisis:new", s.crisis);
      K.save();
    },

    resolve(index) {
      const s = K.state;
      if (!s.crisis) return;
      const ch = s.crisis.choices[index];
      if (!ch) return;
      const e = ch.effects || {};
      const p = s.player;
      if (e.rep) p.reputation = U.clamp(p.reputation + e.rep, 0, 100);
      if (e.pop) K.game.addFame(e.pop);
      /* DÜZELTME (v10.9): hayran etkisi SABİT SAYIYDI (ör. -12.000).
         Bu yüzden 5.000 takipçili bir oyuncu için kriz yıkıcı, 2 milyon
         takipçili bir yıldız için görünmezdi. Artık kariyer büyüklüğüne
         göre ölçekleniyor (100 bin takipçi = referans). */
      if (e.fans) {
        const f = (K.fans && K.fans.followers) ? K.fans.followers()
          : ((p.ig || 0) + (p.tiktok || 0) + (p.x || 0));
        const scale = U.clamp(f / 100000, 0.12, 3);
        const applied = Math.round(e.fans * scale);
        p.ig = Math.max(0, p.ig + Math.round(applied * 0.6));
        p.tiktok = Math.max(0, p.tiktok + Math.round(applied * 0.4));
      }
      if (e.money) {
        if (e.money < 0) K.economy.spend(Math.min(-e.money, s.balance), "crisis");
        else K.economy.earn(e.money, "crisis");
      }
      const title = s.crisis.title;
      s.crisis = null;
      K.toast("✅ Karar verildi", `${title} · ${ch.note || ""}`, "ok");
      K.bus.emit("crisis:resolved");
      K.save(); K.refresh();
    }
  };
})(window.K);
