/* ============================================================
   KARMA — systems/relations.js
   SANATÇI İLİŞKİLERİ — oyunun merkezi sistemi.
   - Gizli/açık SAMİMİYET değeri ve aşamaları
   - DM (çift yönlü): oyuncu ↔ sanatçı, sanatçılar da mesaj atar
   - Hangout etkinlikleri
   - FEATURE teklifleri (ayrı sistem)
   - ŞİRKET / sözleşme teklifleri (ayrı sistem)
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* mesaj havuzları */
  const GREET = [
    "Selam, yeni işlerini görüyorum. Devam böyle.",
    "Naber? Sektörde adını duymaya başladım, iyi gidiyorsun.",
    "Yo, son şarkın fena değildi. Beat kimindi?",
    "Selam kardeşim, bi ara stüdyoya uğra.",
    "Naber? Bu ara çok üretiyorsun, takipteyim.",
    "Selam, son işini dinledim. Yolun açık.",
    "Naber? Sessizsin, kayıtta mısın yine?",
    "Selam, bir haber aldım seninle ilgili. Doğru mu?"
  ];
  const CHAT_MID = [
    "Aynen öyle, bu piyasada sağlam kalmak zor.",
    "Ben de aynı şeyi düşünüyordum.",
    "Bu sound'u sevdim, üstünde çalışalım mı?",
    "Sektörde herkes birbirini kolluyor, sen iyi birisin.",
    "Doğru diyorsun. Yeni albüm üstünde çalışıyorum.",
    "Bu aralar kafam dolu ama seninle konuşmak iyi geliyor.",
    "Bak, doğru düşünüyorsun. Ben de oradan geçtim.",
    "Senin o son nakarat aklımda kaldı, iyi iş.",
    "Piyasa kötü ama sağlam iş her zaman kazanır."
  ];
  const CHAT_HIGH = [
    "Kardeşim seninle çalışmak isterim, ciddi söylüyorum.",
    "Bir gün stüdyoda oturup bir şeyler yapalım, söz.",
    "Sana güveniyorum, bu işin içinde birlikte olmalıyız.",
    "Sen yaz, ben gelirim. Yeter ki doğru zaman olsun.",
    "Seni kendi ekibime almak isterim, bunu bir düşün.",
    "Yeni projede seni düşündüm, olur mu?",
    "Seninle bir iş çıkarsak ses getirir, inanıyorum buna.",
    "Bu işe ciddi bakıyorsan, ben de ciddi bakarım."
  ];

  K.relations = {

    /* ---------------- yardımcı ---------------- */
    _ensure(artistId) {
      const a = K.artistById(artistId);
      if (!a || a.mergedInto) return null;
      const rel = K.relation(artistId);
      return { a, rel, th: K.thread(artistId) };
    },

    /* ilişki seviyesi etiketi */
    stageLabel(artistId) {
      const r = K.relation(artistId);
      return K.stageFor(r.affinity);
    },

    /* ---------------- başlangıç: birkaç sanatçı tanışır ---------------- */
    /* GERÇEKÇİLİK: Kimse genç ve tanınmayan birine kendiliğinden DM atmaz.
       Oyuncu iletişimi KENDİ başlatır; cevap almak popülerliğe bağlıdır. */
    bootstrap() {
      const s = K.state;
      s.flags.introSeen = true;
      // mahalle/semt çevresini kur (kalıcı, isimli, yüzlü kişiler)
      if (K.contacts && K.contacts.ensureRoster) K.contacts.ensureRoster();
      K.save();
      setTimeout(() => {
        K.toast("📱 İlk adım", "Tanıdığın sanatçılara sen yazmalısın. Mahalle çevren zaten Mesajlar'da seni bekliyor.", "");
      }, 1500);
    },

    /* =====================================================
       ULAŞILABİLİRLİK (reach)
       Ünlü bir sanatçıya yazmak kolay değildir: seni görmeyebilir,
       görmesine rağmen cevap vermeyebilir. Popülerliğin ve
       dinlenmelerin yükseldikçe cevap alma şansın artar.
       ===================================================== */
    reach(artistId) {
      const s = K.state, p = s.player;
      const a = K.artistById(artistId);
      const rel = K.relation(artistId);
      if (!a) return 1;
      const popGap = (p.popularity + 3) / (a.popularity + 10);
      const streamGap = Math.sqrt((p.streams + 1) / (a.streams + 1));
      const aff = (rel.affinity || 0) / 260;
      const metBonus = rel.met ? 0.12 : 0;
      const rep = (p.reputation || 0) / 400;
      return U.clamp(popGap * 1.6 + streamGap * 0.8 + aff * 0.25 + metBonus + rep, 0, 1.3);
    },

    reachLabel(artistId) {
      const r = K.relations.reach(artistId);
      if (r >= 0.75) return "ulaşabilirsin";
      if (r >= 0.45) return "zamanla";
      if (r >= 0.22) return "zor";
      return "çok zor";
    },

    replyPolicy(artistId) {
      const r = K.relations.reach(artistId);
      const rel = K.relation(artistId);
      const seenChance = r < 0.08 ? 0.28 : r < 0.2 ? 0.62 : r < 0.45 ? 0.88 : 0.97;
      const replyChance = U.clamp(r * 0.9 + (rel.met ? 0.12 : 0) + Math.min(0.15, rel.interactions * 0.006), 0.02, 0.92);
      return { reach: r, seenChance, replyChance };
    },

    /* ---------------- mesaj gönder (oyuncu → sanatçı) ---------------- */
    sendMessage(artistId, text, opts) {
      const e = K.relations._ensure(artistId);
      if (!e) return;
      const s = K.state;
      const { rel, th } = e;

      if (s.player.messagesSentToday >= K.ECON.dailyMessageLimit) {
        K.toast("Bugünlük yeterli mesaj", "Yarın tekrar yazabilirsin.", "warn");
        return;
      }
      text = (text || "").trim();
      if (!text) return;

      th.messages.push({ id: U.uid("m"), from: "me", text, day: s.day, type: "chat", seen: false, replyTo: (opts && opts.replyTo) || null });
      s.player.messagesSentToday++;
      rel.interactions++;
      rel.lastInteract = s.day;

      // istikrar küçük bir iz bırakır (çok küçük: samimiyet zor kazanılır)
      K.relations.addAffinity(artistId, 0.18, "mesaj_gonderildi");

      setTimeout(() => K.relations._deliver(artistId, text), U.randInt(700, 1500));
    },

    /* mesaj iletilir → görülür → belki cevap */
    _deliver(artistId, text, sync) {
      const e = K.relations._ensure(artistId);
      if (!e) return;
      const { rel, th } = e;
      const pol = K.relations.replyPolicy(artistId);
      const my = th.messages.slice().reverse().find(m => m.from === "me");
      if (!my) return;

      /* Selam/selamün aleyküm gibi mesajlara ulaşılabilirlik ne olursa olsun
         karşılık verilir; kimse bir selama cevapsız kalmaz. */
      const isGreet = !!(K.chat && K.chat.greetForm && K.chat.greetForm(text));

      if (isGreet || Math.random() < pol.seenChance) {
        my.seen = true;
        rel.met = true;
        rel.discovered = true;
        K.bus.emit("dm:seen", { artistId });
        if (isGreet || Math.random() < pol.replyChance) {
          if (sync) { K.relations.artistReply(artistId, text, pol); }
          else {
            rel._typing = true;
            K.bus.emit("dm:typing", { artistId, on: true });
            setTimeout(() => K.relations.artistReply(artistId, text, pol), U.randInt(900, 2000));
          }
        }
      }
      K.save();
    },

    /* sanatçının serbest metne verdiği bağlamsal yanıt */
    artistReply(artistId, playerText, pol) {
      const e = K.relations._ensure(artistId);
      if (!e) return;
      e.rel._typing = false;
      K.bus.emit("dm:typing", { artistId, on: false });
      const out = K.chat.reply(artistId, playerText || "", pol || K.relations.replyPolicy(artistId));
      K.relations.addAffinity(artistId, out.delta, "sohbet:" + out.intent);
      e.rel.lastInteract = K.state.day;

      out.msgs.forEach((m, i) => {
        if (i === 0) K.relations.pushArtistMessage(artistId, m, "chat");
        else setTimeout(() => K.relations.pushArtistMessage(artistId, m, "chat", { silent: true }), 750 * i);
      });

      if (out.action) {
        const hint = K.chat.hintFor(out.action);
        if (hint) setTimeout(() => K.relations.pushArtistMessage(artistId, hint, "system", { silent: true }), 650 * out.msgs.length + 500);
      }
    },

    /* ---------------- sanatçıdan mesaj ---------------- */
    pushArtistMessage(artistId, text, type, opts) {
      const th = K.thread(artistId);
      const s = K.state;
      const msg = {
        id: U.uid("m"), from: "them", text, day: s.day,
        type: type || "chat", offerId: (opts && opts.offerId) || null,
        topic: (opts && opts.topic) || null
      };
      th.messages.push(msg);
      th.unread = (th.unread || 0) + 1;
      th.lastDay = s.day;
      const a = K.artistById(artistId);
      K.bus.emit("dm:new", { artistId, msg });
      if (type !== "system" && !(opts && opts.silent)) {
        K.toast("💬 " + (a ? a.stageName : "Yeni mesaj"), text.slice(0, 60) + (text.length > 60 ? "…" : ""), "ok");
      }
      return msg;
    },

    /* ---------------- samimiyet ekle ---------------- */
    addAffinity(artistId, amount, reason, opts) {
      opts = opts || {};
      const rel = K.relation(artistId);
      const before = rel.affinity;
      const beforeStage = K.stageIndexFor(before);

      /* ZORLAŞTIRMA:
         - zorluk çarpanı
         - ulaşılabilirlik zayıfsa ilişki çok yavaş büyür
         - aynı gün içinde kazanç tavanı (spam engeli) */
      const diff = K.settings ? K.settings.diffMult().affinity : 1;
      const reach = K.relations.reach(artistId);
      // mesaj/sohbet spam'i tavanla sınırlı; hediye/hangout gibi
      // emek/para harcanan etkinlikler tavanı aşar (uncapped)
      const reachFactor = opts.uncapped ? 1 : 0.4 + Math.min(1, reach) * 0.6;
      const cap = opts.uncapped ? 999 : 2.4;
      if (rel.lastGainDay !== K.state.day) { rel.lastGainDay = K.state.day; rel.gainToday = 0; }

      let gain = amount * diff * reachFactor;
      if (gain > 0) {
        const room = Math.max(0, cap - (rel.gainToday || 0));
        gain = Math.min(gain, room);
        rel.gainToday = (rel.gainToday || 0) + gain;
      } else {
        gain = Math.max(gain, -cap);
      }

      rel.affinity = U.clamp(before + gain, 0, 100);
      rel.discovered = true;
      const afterStage = K.stageIndexFor(rel.affinity);
      rel.history.push({ day: K.state.day, delta: Math.round(amount * 10) / 10, reason: reason || "" });

      if (afterStage > beforeStage) {
        const st = K.AFFINITY_STAGES[afterStage];
        const a = K.artistById(artistId);
        K.toast("🤝 İlişki gelişti", `${a.stageName} ile yeni aşama: ${st.label}`, "ok");
      }
      K.bus.emit("affinity", { artistId, before, after: rel.affinity });
      return rel.affinity;
    },

    /* ---------------- hediye ---------------- */
    sendGift(artistId) {
      const e = K.relations._ensure(artistId);
      if (!e) return;
      const rel = e.rel;
      if (K.state.day - rel.giftCooldown < 5) { K.toast("Çok sık hediye", "Birkaç gün bekle.", "warn"); return; }
      if (!K.economy.canAfford(K.ECON.giftCost)) { K.toast("Yetersiz bakiye", "", "bad"); return; }
      K.economy.spend(K.ECON.giftCost, "gift");
      rel.giftCooldown = K.state.day;
      K.relations.addAffinity(artistId, 5 + U.rand(0, 3), "hediye", { uncapped: true });
      K.relations.pushArtistMessage(artistId, U.pick([
        "Hediye için sağ ol, beklemiyordum. Vefalısın.",
        "Ya çok teşekkür ederim, karşılığını veririm.",
        "Adamsın. Bir şey lazım olursa haber et."
      ]), "chat");
    },

    /* ---------------- HANGOUT ---------------- */
    canHangout(artistId) {
      const rel = K.relation(artistId);
      const stage = K.stageIndexFor(rel.affinity);
      return stage >= 3 && (K.state.day - rel.hangoutCooldown >= 3);
    },

    hangout(artistId, kind) {
      const e = K.relations._ensure(artistId);
      if (!e) return;
      const rel = e.rel;
      if (K.stageIndexFor(rel.affinity) < 3) {
        K.toast("Henüz erken", "Hangout için samimiyet yetersiz (aşama: Birlikte Takılma).", "warn");
        return;
      }
      if (K.state.day - rel.hangoutCooldown < 3) { K.toast("Yakın zamanda takıldınız", "Birkaç gün bekle.", "warn"); return; }
      if (!K.economy.canAfford(K.ECON.hangoutCost)) { K.toast("Yetersiz bakiye", "", "bad"); return; }

      const activity = kind || U.pick(["studio", "coffee", "dinner", "game", "party"]);
      K.economy.spend(K.ECON.hangoutCost, "hangout");
      rel.hangoutCooldown = K.state.day;
      const gain = 6 + e.a.traits.openness * 0.6 + U.rand(0, 3);
      K.relations.addAffinity(artistId, gain, "hangout", { uncapped: true });
      rel.flags.hangout = true;
      rel.lastInteract = K.state.day;

      const lines = {
        studio: "Stüdyoda takıldık, beat'ler üzerine konuştuk. Enerji çok iyiydi.",
        coffee: "Bir kahve içtik, kariyer ve müzik hakkında uzun uzun sohbet ettik.",
        dinner: "Akşam yemeğinde samimi bir sohbet oldu, birbirimizi daha iyi tanıdık.",
        game: "Maç izledik, kafa dağıttık. İyi bağ kurduk.",
        party: "Bir etkinlikte takıldık, sektörden insanlarla tanıştık."
      };
      K.relations.pushArtistMessage(artistId, lines[activity], "system");
      K.toast("🎉 Hangout yapıldı", lines[activity], "ok");
      K.save(); K.refresh();
    },

    /* ---------------- FEATURE TEKLİFİ (oyuncu → sanatçı) ---------------- */
    canProposeFeature(artistId) {
      const rel = K.relation(artistId);
      return K.stageIndexFor(rel.affinity) >= 4;
    },

    proposeFeature(artistId, songTitle) {
      const e = K.relations._ensure(artistId);
      if (!e) return;
      const rel = e.rel;
      const a = e.a;
      if (K.stageIndexFor(rel.affinity) < 4) {
        K.toast("Feature için erken", "Samimiyet 'Feature Teklifi' aşamasına gelmeli.", "warn");
        return;
      }
      const p = K.state.player;
      const cost = 15000;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `Stüdyo için ${U.money(cost)} gerekiyor.`, "bad"); return; }

      // kabul olasılığı
      const prob = U.clamp(
        (rel.affinity - 55) / 70 + a.traits.work / 22 + (p.popularity - a.popularity) / 260,
        0.05, 0.94
      );
      const accepted = Math.random() < prob;

      K.economy.spend(cost, "feature_studio");
      rel.lastInteract = K.state.day;

      if (!accepted) {
        K.relations.pushArtistMessage(artistId, U.pick([
          "Kardeşim şu an yoğunum, bu aralar feature almayayım. Ama aklımda.",
          "Şu dönem kendi projeme odaklandım. Belki sonra oturabiliriz.",
          "Süper fikir ama zamanlama uymuyor şu an. Haberdar ederim seni."
        ]), "system");
        K.toast("Feature teklifi beklemeye alındı", `${a.stageName} şu an müsait değil.`, "warn");
      } else {
        K.relations.addAffinity(artistId, 6, "feature_kabul", { uncapped: true });
        rel.flags.feature = true;
        K.relations.pushArtistMessage(artistId, U.pick([
          "Tamam kardeşim, gel yapalım. Sen beat hazırla, ben yazarım.",
          "Onay! Stüdyo ayarları bende. Şu başlıkla girelim.",
          "Anlaştık. Bu şarkı güzel olacak, hissediyorum."
        ]), "system");
        // ortak yayın oluştur
        K.career.createRelease({
          title: songTitle || (K.career.suggestTitle() + " (feat. " + a.stageName + ")"),
          genre: p.genre, type: "single", waitDays: 13,
          budget: 30000, marketing: 5000, featWith: artistId
        });
        K.toast("🔥 Feature anlaşması!", `${a.stageName} ile ortak şarkı yayın sırasına girdi.`, "ok");
      }
      K.save(); K.refresh();
    },

    /* ---------------- ORTAK PROJE (EP düzeyi iş birliği) ---------------- */
    canCollabProject(artistId) {
      const rel = K.relation(artistId);
      return K.stageIndexFor(rel.affinity) >= 5;
    },

    proposeCollabProject(artistId, projectTitle) {
      const e = K.relations._ensure(artistId);
      if (!e) return;
      const rel = e.rel, a = e.a;
      if (K.stageIndexFor(rel.affinity) < 5) {
        K.toast("Ortak proje için erken", "Samimiyet 'Ortak Proje' aşamasına gelmeli.", "warn");
        return;
      }
      const cost = 60000;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `Ortak EP için ${U.money(cost)} gerekiyor.`, "bad"); return; }

      const prob = U.clamp((rel.affinity - 60) / 60 + a.traits.work / 18, 0.2, 0.95);
      const accepted = Math.random() < prob;
      K.economy.spend(cost, "collab_project");
      rel.lastInteract = K.state.day;

      if (!accepted) {
        K.relations.pushArtistMessage(artistId, "Ortak EP fikrini sevdim ama şu an kendi albümüme odaklıyım. Sonra oturalım.", "system");
        K.toast("Ortak proje ertelendi", a.stageName + " şu an müsait değil.", "warn");
      } else {
        rel.flags.collab = true;
        K.relations.addAffinity(artistId, 9, "ortak_proje", { uncapped: true });
        K.relations.pushArtistMessage(artistId, "Ortak proje için varım! Bir EP çıkaralım, ikimizin sound'u uyar.", "system");
        K.career.createRelease({
          title: projectTitle || ("Ortak Proje: " + a.stageName),
          genre: K.state.player.genre, type: "ep", trackCount: 4, waitDays: 24,
          budget: 18000, marketing: 8000, featWith: artistId
        });
        K.toast("🤝 Ortak proje başladı!", a.stageName + " ile ortak EP yayın sırasına girdi.", "ok");
      }
      K.save(); K.refresh();
    },

    /* ---------------- sanatçıdan gelen feature teklifi (DM) ---------------- */
    createIncomingFeatureOffer(artistId) {
      const a = K.artistById(artistId);
      const offer = {
        id: U.uid("off"), type: "feature", direction: "incoming",
        artistId, day: K.state.day,
        terms: { title: K.career.suggestTitle(), split: U.pick([50, 60, 70]) },
        status: "pending"
      };
      K.state.offers.push(offer);
      K.relations.pushArtistMessage(artistId,
        U.pick([
          "Kardeşim sana bir feature teklifim var. Şu iş beraber olsun.",
          "Aklımda bir parça var, ikimiz yapsak çok iyi olur.",
          "Seninle bir şey kaydetmek istiyorum. Ne dersin?"
        ]), "offer_feature", { offerId: offer.id });
      K.bus.emit("offer:new", offer);
      return offer;
    },

    /* ---------------- sanatçıdan gelen hangout daveti ---------------- */
    createIncomingHangoutOffer(artistId) {
      const a = K.artistById(artistId);
      const offer = {
        id: U.uid("off"), type: "hangout", direction: "incoming",
        artistId, day: K.state.day,
        terms: { activity: U.pick(["studio", "coffee", "dinner", "game", "party"]) },
        status: "pending"
      };
      K.state.offers.push(offer);
      K.relations.pushArtistMessage(artistId, U.pick([
        "Bu akşam müsait misin? Takılalım biraz.",
        "Stüdyoya gel, hem çalışırız hem kafa dağıtırız.",
        "Bir kahve içelim mi? Konuşacaklarım var."
      ]), "offer_hangout", { offerId: offer.id });
      K.bus.emit("offer:new", offer);
      return offer;
    },

    /* ---------------- sanatçı → oyuncunun şirketine katılma isteği ---------------- */
    createJoinLabelOffer(artistId) {
      const a = K.artistById(artistId);
      const lbl = K.state.label;
      if (!lbl) return null;
      const offer = {
        id: U.uid("off"), type: "label", direction: "incoming",
        artistId, day: K.state.day,
        terms: {
          advance: Math.round(U.rand(0, 1) * (a.labelId ? 80000 : 20000)),
          artistRoyalty: U.clamp(75 - a.traits.ego * 2, 60, 85),
          lengthDays: 365
        },
        status: "pending"
      };
      K.state.offers.push(offer);
      K.relations.pushArtistMessage(artistId,
        `${lbl.name} kadrosuna katılmak istiyorum. Şartları konuşabilir miyiz?`,
        "offer_label", { offerId: offer.id });
      K.bus.emit("offer:new", offer);
      return offer;
    },

    /* ---------------- NPC label → oyuncuyu imzalamak istiyor ---------------- */
    createLabelSignsPlayerOffer(labelId) {
      const l = K.labelById(labelId);
      if (!l) return null;
      const t = K.career.labelOfferTerms(labelId);
      const offer = {
        id: U.uid("off"), type: "label", direction: "incoming", labelId,
        artistId: null, day: K.state.day,
        terms: t, status: "pending"
      };
      K.state.offers.push(offer);
      K.toast("📨 Şirket teklifi", `${l.name} sana sözleşme teklif ediyor.`, "ok");
      K.bus.emit("offer:new", offer);
      return offer;
    },

    /* ---------------- teklife yanıt ---------------- */
    respondOffer(offerId, accept) {
      const s = K.state;
      const offer = s.offers.find(o => o.id === offerId);
      if (!offer || offer.status !== "pending") return;

      if (offer.type === "feature") {
        if (accept) {
          const a = K.artistById(offer.artistId);
          offer.status = "accepted";
          K.relations.addAffinity(offer.artistId, 5, "feature_ortak", { uncapped: true });
          K.relations.pushArtistMessage(offer.artistId,
            "Harika! O zaman stüdyo senin, ben geliyorum.", "system");
          K.career.createRelease({
            title: offer.terms.title + (a ? " (feat. " + a.stageName + ")" : ""),
            genre: s.player.genre, type: "single", waitDays: 13,
            budget: 25000, marketing: 0, featWith: offer.artistId
          });
          K.toast("🔥 Feature kabul edildi", "Ortak şarkı yayın sırasına eklendi.", "ok");
        } else {
          offer.status = "declined";
          K.relations.addAffinity(offer.artistId, -1, "feature_red");
          K.relations.pushArtistMessage(offer.artistId, "Anladım kardeşim, sorun değil. Başka zaman.", "system");
          K.toast("Feature reddedildi", "", "warn");
        }
      }

      else if (offer.type === "hangout") {
        if (accept) {
          offer.status = "accepted";
          const probs = {
            studio: "Stüdyoda buluştuk, birlikte bir şeyler denedik.",
            coffee: "Kahve içtik, sohbet çok iyiydi.",
            dinner: "Akşam yemeğinde samimi bir ortam oldu.",
            game: "Maç izledik, çok eğlendik.",
            party: "Etkinlikte takıldık, sektörden insanlarla tanıştık."
          };
          K.relations.addAffinity(offer.artistId, 7, "hangout", { uncapped: true });
          const rel = K.relation(offer.artistId);
          rel.hangoutCooldown = s.day;
          rel.flags.hangout = true;
          K.toast("🎉 Hangout", probs[offer.terms.activity] || "Birlikte vakit geçirdiniz.", "ok");
        } else {
          offer.status = "declined";
          K.relations.pushArtistMessage(offer.artistId, "Yok sorun, müsait olunca haber ederim.", "system");
        }
      }

      else if (offer.type === "label") {
        if (offer.artistId) {
          // sanatçı oyuncunun şirketine katılıyor
          if (accept) {
            if (!K.label.hasLabel()) { K.toast("Şirketin yok", "", "warn"); return; }
            const a = K.artistById(offer.artistId);
            const cost = offer.terms.advance;
            if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `Avans ${U.money(cost)} gerekiyor.`, "bad"); return; }
            K.economy.spend(cost, "contract");
            a.labelId = K.MY_LABEL_ID;
            K.state.label.roster.push(offer.artistId);
            K.state.player.reputation += 4;
            offer.status = "accepted";
            K.relations.addAffinity(offer.artistId, 8, "sozlesme", { uncapped: true });
            K.relations.pushArtistMessage(offer.artistId, "Sağ ol, artık sizinleyim. Güzel işler yapacağız!", "system");
            K.toast("✅ Kadroya katıldı", `${a.stageName} şirketine katıldı.`, "ok");
          } else {
            offer.status = "declined";
            K.relations.pushArtistMessage(offer.artistId, "Anladım, başka kapıya bakarım.", "system");
            K.relations.addAffinity(offer.artistId, -3, "sozlesme_red");
          }
        } else {
          // label oyuncuyu imzalıyor
          if (accept) {
            if (K.state.player.labelId) { K.toast("Zaten bir şirkettesin", "", "warn"); return; }
            K.state.player.labelId = offer.labelId;
            /* AVANS BORÇ + (varsa) 360 PAYLAŞIMI */
            K.state.player.labelDeal = {
              labelId: offer.labelId, advance: offer.terms.advance, recouped: 0,
              labelRoyalty: offer.terms.royalty, artistRoyalty: offer.terms.artistRoyalty,
              startDay: s.day, lengthDays: offer.terms.lengthDays,
              dealType: offer.terms.dealType || "standard",
              splits: offer.terms.splits || { touring: 0, merch: 0, sync: 0 }
            };
            K.economy.earn(offer.terms.advance, "advance");
            offer.status = "accepted";
            K.toast("✍️ Sözleşme imzalandı", `${offer.terms.labelName} · avans ${U.money(offer.terms.advance)} (recoup edilecek)${offer.terms.dealType === "360" ? " · 360 anlaşma" : ""}`, "ok");
          } else {
            offer.status = "declined";
            K.toast("Teklif reddedildi", `${offer.terms.labelName} teklifini geri çevirdin.`, "warn");
          }
        }
      }

      K.save(); K.refresh();
      K.bus.emit("offer:resolved", offer);
    },

    /* ---------------- metin havuzları ---------------- */
    acceptText(a) {
      return U.pick([
        "Anlaştık! Aramızda kalmayacak, birlikte büyüyeceğiz.",
        "Kabul ediyorum. Bu şirketle bir şey başaracağımıza inanıyorum.",
        "Tamam kardeşim, kalem elimde. Hayırlı olsun."
      ]);
    },
    declineText(a) {
      return U.pick([
        "Teklifin için sağ ol ama mevcut düzenimden memnunum.",
        "Şu an geçmeyi düşünmüyorum, kusura bakma.",
        "İlgin için teşekkürler, ama şimdi doğru zaman değil."
      ]);
    },

    /* ---------------- günlük tick: sanatçılar kendiliğinden yazar ---------------- */
    dailyTick() {
      const s = K.state;

      // 1) Mevcut ilişkilerden mesaj — SADECE gerçekten samimi olduklarında
      //    (sanatçılar tanımadıkları birine kendiliğinden yazmaz)
      K.artistList().forEach(a => {
        const rel = s.relations[a.id];
        if (!rel || !rel.met) return;
        if (rel.affinity < 25) return;
        const idx = K.stageIndexFor(rel.affinity);

        const chance = 0.012 + a.traits.openness * 0.0015 + (idx >= 4 ? 0.01 : 0);

        if (U.chance(chance)) {
          const pool = idx >= 4 ? CHAT_HIGH : idx >= 2 ? CHAT_MID : GREET;
          const custom = (K.chat && K.chat.ambient) ? K.chat.ambient(a.id, idx) : null;
          K.relations.pushArtistMessage(a.id, custom || U.pick(pool), "chat");
          K.relations.addAffinity(a.id, 0.6 + a.traits.openness * 0.1, "sanatçı_mesaj");
        }
      });

      // 2) Feature teklifi (samimiyet yüksekse)
      const featureCandidates = K.artistList().filter(a => {
        const rel = s.relations[a.id];
        return rel && rel.met && K.stageIndexFor(rel.affinity) >= 4 && !rel.flags.feature
          && K.relations.reach(a.id) >= 0.25;
      });
      // Feature (ft) teklifi gelme ihtimali: %5
      if (featureCandidates.length && U.chance(0.09)) {
        const a = U.pick(featureCandidates);
        K.relations.createIncomingFeatureOffer(a.id);
      }

      // 3) Hangout daveti
      const hangoutCandidates = K.artistList().filter(a => {
        const rel = s.relations[a.id];
        return rel && rel.met && K.stageIndexFor(rel.affinity) >= 3 &&
          (s.day - (rel.hangoutCooldown || 0) >= 4) && K.relations.reach(a.id) >= 0.2;
      });
      if (hangoutCandidates.length && U.chance(0.13)) {
        const a = U.pick(hangoutCandidates);
        const rel = s.relations[a.id];
        rel.hangoutCooldown = s.day;
        K.relations.createIncomingHangoutOffer(a.id);
      }

      // 4) Oyuncunun şirketi varsa: sanatçı katılmak isteyebilir
      if (s.label) {
        const joinCandidates = K.artistList().filter(a => {
          const rel = s.relations[a.id];
          return rel && rel.met && K.stageIndexFor(rel.affinity) >= 5 &&
            !s.label.roster.includes(a.id) && K.relations.reach(a.id) >= 0.3;
        });
        if (joinCandidates.length && U.chance(0.10)) {
          const a = U.pick(joinCandidates);
          K.relations.createJoinLabelOffer(a.id);
        }
      }

      // 5) Oyuncu henüz sözleşmesizse: NPC label teklifi
      if (!s.player.labelId && !s.label && s.player.popularity >= 25 && U.chance(0.09)) {
        const l = U.pick(K.LABELS);
        K.relations.createLabelSignsPlayerOffer(l.id);
      }

      // 6) Bekleyen eski teklifleri temizle
      s.offers = s.offers.filter(o => o.status === "pending" || (s.day - o.day) < 6);

      // 7) GERÇEKLİK: Ünlü sanatçı, sen 1-4 şarkı çıkarmışken SANA YAZMAZ.
      //    Ancak ciddi bir dinlenme/popülerlik eşiğini geçince ve genelde
      //    SENİN SEVİYENDE ya da ALTINDA kalan isimler kendiliğinden yazar.
      const songCount = (s.player.songs || []).length;
      const canBeNoticed = songCount >= 5 && s.player.popularity >= 20 && s.player.monthly >= 60000;
      const dmMult = (K.settings && K.settings.diffMult().dm) || 1;
      if (canBeNoticed && U.chance(0.03 * dmMult)) {
        // popülerliğin arttıkça KADEMELİ olarak daha büyük isimler yazabilir
        const cap = s.player.popularity * (0.75 + s.player.popularity / 200);
        const unknown = K.artistList()
          .filter(a => !s.relations[a.id] || !s.relations[a.id].met)
          .filter(a => a.popularity <= cap);   // senden çok büyük isim yazmaz
        if (unknown.length) {
          const a = U.pick(unknown);
          const rel = K.relation(a.id);
          rel.met = true;
          rel.discovered = true;
          const custom = (K.chat && K.chat.ambient) ? K.chat.ambient(a.id, 0) : null;
          K.relations.pushArtistMessage(a.id, custom || U.pick(GREET), "chat");
          rel.affinity = Math.max(rel.affinity, 6);
        }
      }

      // 8) MAHALLE / SEMT ÇEVRESİ — asıl sosyal hayat burada
      //    Her mesaj somut bir olaya bağlıdır (yeni şarkı, liste, gündem, sessizlik).
      if (K.contacts && K.contacts.dailyTick) K.contacts.dailyTick();

      K.save();
    },

    /* Liste/chart başarısını tebrik eden DM (erişilebilir sanatçılar) */
    maybeListCongrats(song, listName) {
      if (!song) return;
      const s = K.state, p = s.player;
      if ((p.popularity || 0) < 22) return;
      const dmMult = (K.settings && K.settings.diffMult().dm) || 1;
      if (!U.chance(0.35 * dmMult)) return;
      const pool = K.artistList().filter(a => {
        if (a.popularity > p.popularity * 1.6 + 20) return false;
        return K.relations.reach(a.id) >= 0.22;
      });
      if (!pool.length) return;
      const a = U.pick(pool);
      const rel = K.relation(a.id);
      rel.met = true; rel.discovered = true;
      const lines = [
        `"${song.title}" ${listName} listesine girmiş, tebrikler. Takip ediyorum.`,
        `Listede seni gördüm — "${song.title}". Böyle devam et.`,
        `${listName} olmuş, iyi iş çıkarmışsın. Bir ara konuşalım.`,
        `"${song.title}" listeye girmiş, duydun mu kendin? Tebrikler kardeşim.`
      ];
      K.relations.pushArtistMessage(a.id, U.pick(lines), "chat", { topic: "liste" });
      K.relations.addAffinity(a.id, 1.6, "liste_tebrik");
    },

    /* okunmamış toplam */
    unreadTotal() {
      const s = K.state;
      return Object.keys(s.threads).reduce((n, id) => n + (s.threads[id].unread || 0), 0);
    },

    markRead(artistId) {
      const s = K.state;
      if (s.threads[artistId]) s.threads[artistId].unread = 0;
    }
  };
})(window.K);
