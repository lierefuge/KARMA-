/* ============================================================
   KARMA — systems/rivalry.js
   Rakiplik: rakip sanatçılar, gerilim (heat), diss ve yanıtlar.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* DÜZELTME (v10.9): 5 diss satırı 36 sanatçı için ortaktı — bir pop
     sanatçısı da "flow'un taklit" diyordu. Artık tür havuzu var. */
  const DISS_BY_GENRE = {
    trap:  ["Konuşuyorsun ama listede yoksun.", "Sound'un tanıdık, kimin beat'i bu?", "Sahnede görürüz, orada konuşuruz."],
    drill: ["Hız sende var ama söz yok.", "Akışın taklit, üzerine bir şey koymuyorsun.", "Konuşma, çıkar da görsünler."],
    rap:   ["Söz yazmayı öğren, sonra konuşalım.", "Flow'un vitrin, içi boş.", "Rap zanaattır, sen sadece poz veriyorsun."],
    pop:   ["Aynı şarkıyı yirmi kere söylüyorsun.", "Kitle var ama iş yok.", "Manşetlerle kariyer kurulmaz."],
    rnb:   ["Tonu taklit ediyorsun.", "Yumuşaklık zayıflık değil ama sende ikisi de yok.", "Vokalini düz tut, konuşma."],
    indie: ["Bağımsız görünüp aynı fabrikadan çıkıyorsun.", "Samimiyet satılmaz.", "Kendi sesin yok, kopyalıyorsun."]
  };
  const DISS_LINES = [
    "Bazıları konuşuyor ama sahnede yok.",
    "Kopya çekenler bir gün hesap verir.",
    "Senin seviyen benim ısınma turlarım."
  ];
  function dissFor(a) {
    const g = DISS_BY_GENRE[(a && a.genre) || "rap"];
    if (g && g.length) return U.pick(g);
    return U.pick(DISS_LINES);
  }

  const CHALLENGE = [
    "Aramızda tatlı bir rekabet olsun, ne dersin?",
    "Listede seninle yarışmak keyifli olur.",
    "İşini takip ediyorum, iyi gidiyorsun."
  ];

  K.rivalry = {
    MAX_HEAT: 100,

    ensure() {
      const s = K.state, p = s.player;
      s.rivals = s.rivals || [];
      /* DÜZELTME (v10.9): rakipler oyunun İLK GÜNÜNDE seçiliiytor ve bir
         daha hiç değişmiyordu — oyuncu 2 yıl sonra tamamen farklı bir
         seviyeye gelse de karşısında hâlâ aynı üç isim vardı.
         Artık kopan rakipler güncel seviyeye göre yenilenir. */
      if (s.rivals.length >= 3) {
        const cur = Math.max(20, p.popularity);
        s.rivals.forEach((r, i) => {
          const a = K.artistById(r.artistId);
          if (!a) return;
          if (Math.abs(a.popularity - cur) > 32 && s.day - (s.rivalRefreshDay || 0) > 40) {
            const repl = K.artistList()
              .filter(x => !s.rivals.some(z => z.artistId === x.id))
              .sort((x, y) => Math.abs(x.popularity - cur) - Math.abs(y.popularity - cur))[0];
            if (repl) {
              s.rivalRefreshDay = s.day;
              s.rivals[i] = { artistId: repl.id, heat: U.randInt(5, 20), lastMoveDay: s.day, status: "nötr", moves: 0 };
            }
          }
        });
        return;
      }
      const pool = K.artistList()
        .filter(a => !s.rivals.some(r => r.artistId === a.id))
        .map(a => ({ a, d: Math.abs(a.popularity - Math.max(20, p.popularity)) }))
        .sort((x, y) => x.d - y.d);
      while (s.rivals.length < 3 && pool.length) {
        const pick = pool.shift().a;
        s.rivals.push({ artistId: pick.id, heat: U.randInt(5, 25), lastMoveDay: s.day, status: "nötr", moves: 0 });
      }
    },

    list() {
      K.rivalry.ensure();
      return K.state.rivals.map(r => ({ ...r, artist: K.artistById(r.artistId) })).filter(r => r.artist);
    },

    addHeat(artistId, amount) {
      const r = (K.state.rivals || []).find(x => x.artistId === artistId);
      if (!r) return;
      r.heat = U.clamp(r.heat + amount, 0, K.rivalry.MAX_HEAT);
      r.status = r.heat >= 70 ? "savaş" : r.heat >= 40 ? "geriliyor" : r.heat >= 20 ? "rekabet" : "nötr";
    },

    /* ---------------- oyuncu aksiyonları ---------------- */
    respond(artistId, action) {
      const r = (K.state.rivals || []).find(x => x.artistId === artistId);
      if (!r) return;
      const a = K.artistById(artistId);

      if (action === "diss") {
        const cost = 20000;
        if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `Diss kaydı için ${U.money(cost)} gerekiyor.`, "bad"); return; }
        K.economy.spend(cost, "diss");
        K.career.createRelease({
          title: K.career.suggestTitle() + " (Diss)", genre: K.state.player.genre,
          type: "single", waitDays: 13, budget: 25000, marketing: 12000
        });
        K.rivalry.addHeat(artistId, 22);
        K.state.player.reputation = Math.max(0, K.state.player.reputation - 1);
        K.game.addFame(0.8);
        if (K.social) K.social.createPost("x", `"${a.stageName}" hakkında cevabım yolda. Yakında.`, null);
        K.toast("🔥 Diss kaydın hazırlanıyor", `${a.stageName}'e cevap yayın sırasına girdi.`, "ok");
      }

      else if (action === "smooth") {
        const cost = 8000;
        if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", "", "bad"); return; }
        K.economy.spend(cost, "smooth");
        K.rivalry.addHeat(artistId, -18);
        if (K.relation(artistId).met) K.relations.addAffinity(artistId, 3, "barış", { uncapped: true });
        K.relations.pushArtistMessage(artistId, "Saygı duydum, aramızda sorun yok. İşimize bakalım.", "system");
        K.toast("🤝 Gerilim azaldı", `${a.stageName} ile aranızda yumuşama var.`, "ok");
      }

      else if (action === "ignore") {
        K.rivalry.addHeat(artistId, -5);
        K.toast("🙈 Görmezden geldin", "Gerilim biraz azaldı.", "");
      }
      K.save(); K.refresh();
    },

    /* ---------------- günlük tick ---------------- */
    tick() {
      const s = K.state, p = s.player;
      K.rivalry.ensure();
      (s.rivals || []).forEach(r => {
        // doğal sürüklenme
        const drift = p.popularity > (K.artistById(r.artistId) || { popularity: 50 }).popularity ? 0.5 : -0.3;
        r.heat = U.clamp(r.heat + drift + U.rand(-0.3, 0.5), 0, K.rivalry.MAX_HEAT);
        r.status = r.heat >= 70 ? "savaş" : r.heat >= 40 ? "geriliyor" : r.heat >= 20 ? "rekabet" : "nötr";

        const gap = s.day - (r.lastMoveDay || 0);
        if (gap < 6) return;

        const chance = (0.03 + r.heat / 900) * (K.settings ? K.settings.diffMult().crisis : 1);
        if (!U.chance(chance)) return;
        r.lastMoveDay = s.day;
        r.moves = (r.moves || 0) + 1;
        const a = K.artistById(r.artistId);

        if (r.heat >= 55 && U.chance(0.55)) {
          const line = dissFor(a);
          K.rivalry.addHeat(r.artistId, 8);
          /* HATA DÜZELTMESİ (v10.9): burada `K.social.createPost("x", ...)`
             çağrılıyordu — bu fonksiyon gönderiyi OYUNCUNUN hesabından
             paylaşır. Yani rakip diss atınca oyuncu kendi kendine diss
             atıyor gibi görünüyordu (feed'de "ben" olarak). Kaldırıldı;
             gönderi artık yalnızca RAKİBİN adına düşüyor. */
          const feed = (s.feed.x = s.feed.x || []);
          const eng = K.socialEngagement(a.ig || 0);
          feed.unshift({
            id: U.uid("post"), platform: "x",
            authorId: r.artistId, authorName: a.stageName,
            text: line, day: s.day,
            likes: eng.likes, comments: eng.comments, shares: eng.shares,
            songId: null, mine: false
          });
          s.feed.x = s.feed.x.slice(0, 60);
          K.toast("⚔️ Rakip hamle yaptı", `${a.stageName} seni hedef alan bir gönderi paylaştı.`, "bad");
        } else {
          K.relations.pushArtistMessage(r.artistId, U.pick(CHALLENGE), "chat", { topic: "rivalry" });
        }
      });
      K.save();
    }
  };
})(window.K);
