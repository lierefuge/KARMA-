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

   v10.54 — SÖZ GÖNDER (oyuncu → sanatçı)
   --------------------------------------
   Yukarıdaki akış TERS yöndeydi: sanatçı teklif eder, oyuncu yazar.
   Artık oyuncu DM'den kendi sözünü bir sanatçıya GÖNDEREBİLİR:
     · sanatçı sözü değerlendirir (samimiyet + ustalık + müsaitlik)
     · kabul ederse şarkıyı KENDİ ADINA yayınlar
     · oyuncu SÖZ YAZARI olarak kredilenir (peşin ücret + yayın telifi)
   Kabul edilen her söz state.player.writing.sent'e yazılır ve
   publishingTick() ile günlük telif üretir (yayın döngüsü gibi azalarak).
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

    /* ---------------- v10.54 · SÖZ GÖNDER ---------------- */
    /* söz gönderebilmek için: tanışmış + en az "Daha Fazla İletişim" (≥45) */
    canSendLyrics(artistId) {
      const rel = K.relation ? K.relation(artistId) : null;
      if (!rel || !rel.met) return false;
      return K.stageIndexFor(rel.affinity || 0) >= 2;
    },

    /* oyuncunun bir sanatçıya söz göndermesi. Sanatçı kabul ederse
       şarkıyı kendi adına yayınlar; oyuncu söz yazarı olarak kredilenir.
       Dönüş: { accepted, reason?, title?, fee?, quality?, royaltyPerDay? } */
    sendLyrics(artistId, text, themeId) {
      const s = K.state, p = s.player, w = p.writing;
      w.sent = w.sent || [];
      const a = K.artistById ? K.artistById(artistId) : null;
      if (!a) return { accepted: false, reason: "no_artist" };

      const t = String(text || "").trim();
      const words = t ? t.split(/\s+/).filter(Boolean) : [];
      if (words.length < 12) return { accepted: false, reason: "short", words: words.length };

      const theme = K.lyricThemeById ? K.lyricThemeById(themeId).id : (themeId || "street");
      const craft = K.writing.craft();
      const an = K.lyrics ? K.lyrics.analyze(t, theme, a.genre) : { score: craft };
      const quality = U.clamp(Math.round((an.score || craft) * 0.6 + craft * 0.4), 10, 99);

      const rel = K.relation(artistId);
      const aff = rel ? (rel.affinity || 0) : 0;
      let prob = U.clamp(
        (aff - 40) / 60 + (quality - 45) / 90 + ((a.traits && a.traits.work) || 50) / 300,
        0.08, 0.92
      );
      /* müsaitlik: turne/albüm/uyku → daha zor kabul */
      if (K.routine && K.routine.status) {
        const st = K.routine.status(artistId);
        if (st && st.available != null) prob *= (0.6 + 0.4 * st.available);
      }
      const accepted = Math.random() < prob;
      if (rel) rel.lastInteract = s.day;

      if (!accepted) {
        if (rel) rel.affinity = U.clamp(aff - 1, 0, 100);
        if (K.relations && K.relations.pushArtistMessage) {
          K.relations.pushArtistMessage(artistId, U.pick([
            "Sözleri okudum, bana göre değil. Kızma, yolu açık olsun.",
            "Emek var ama benim sound'uma oturmadı. Başka zaman bakalım.",
            "Sağ ol ama şu an kendi yazdıklarımı okuyorum. İyi işler dilerim."
          ]), "chat", { topic: "music" });
        }
        K.toast("Söz kabul görmedi", `${a.stageName} şimdilik almadı. Ustalık ve samimiyet arttıkça şans yükselir.`, "warn");
        K.save(); K.refresh();
        return { accepted: false, reason: "declined", quality };
      }

      /* --- KABUL: sanatçı kendi adına yayınlar, oyuncu söz yazarı --- */
      const title = K.career.suggestTitle();
      const size = 1 + (a.popularity || 0) / 26;
      const fee = Math.round(K.ECON.writingBase * size * (0.8 + quality / 120));
      const royaltyDays = 40;
      const royaltyPerDay = Math.round((a.popularity || 30) * 14 * (0.5 + quality / 140));

      const song = {
        id: U.uid("pub"), artistId: artistId, artistName: a.stageName, title: title,
        theme: theme, quality: quality, fee: fee,
        royaltyPerDay: royaltyPerDay, royaltyDays: royaltyDays,
        daysLeft: royaltyDays, elapsed: 0, day: s.day, streams: 0, earned: fee,
        credit: { role: "songwriter", holder: "Sen" }
      };
      w.sent.push(song);
      w.credited = (w.credited || 0) + 1;
      w.totalEarned = (w.totalEarned || 0) + fee;
      w.done = (w.done || []).concat([{
        artistId: artistId, artistName: a.stageName, scope: "lyrics",
        roll: quality, paid: fee, mode: "credit", via: "sent", day: s.day
      }]).slice(-40);

      K.economy.earn(fee, "writing");
      p.reputation = (p.reputation || 0) + 4;
      if (rel) rel.affinity = U.clamp(aff + 7, 0, 100);
      if (K.npcMind && K.npcMind.promise) K.npcMind.promise(artistId, "them", 'Söz yazarı: "' + title + '"');

      /* sanatçı "yayınladı": endüstri etkisi (npcRelease benzeri) */
      const gain = U.clamp(0.06 + quality / 400, 0.05, 0.30);
      a._boost = Math.min(0.6, (a._boost || 0) + gain);
      a.popularity = U.clamp((a.popularity || 50) + U.rand(0.4, 1.6), 30, 99);
      a.monthly = Math.round((a.monthly || 0) * (1 + gain));
      a.lastReleaseDay = s.day;

      s.industry = s.industry || { released: {}, log: [] };
      s.industry.written = s.industry.written || [];
      s.industry.written.push({ artistId: artistId, title: title, day: s.day, quality: quality, byPlayer: true });

      s.notifications = (s.notifications || []).concat([{
        title: "🎉 Sözün yayınlandı",
        msg: `${a.stageName} — "${title}" · söz yazarı: SEN · peşin ${U.money(fee)}`,
        kind: "ok", day: s.day
      }]).slice(-60);
      if (K.relations && K.relations.pushArtistMessage) {
        K.relations.pushArtistMessage(artistId, U.pick([
          `Sözleri aldım, bu iş olur. "${title}" diye çıkarıyorum, adın söz yazarı olarak geçecek.`,
          `Kalemin sağlam. "${title}" benden çıkıyor — krediyi sana yazdım.`,
          `Tamam, kaydettim. "${title}" yayında, söz yazarı sensin.`
        ]), "system");
      }
      K.toast("🎉 Sözün yayınlandı!", `${a.stageName} "${title}" yayınladı · söz yazarı: SEN`, "ok");
      K.save(); K.refresh();
      return { accepted: true, song: song, title: title, fee: fee, quality: quality, royaltyPerDay: royaltyPerDay };
    },

    /* günlük yayın telifi: yayın döngüsü gibi azalarak öder */
    publishingTick() {
      const s = K.state, w = s.player && s.player.writing;
      if (!w || !w.sent || !w.sent.length) return 0;
      let total = 0;
      w.sent.forEach(song => {
        if ((song.daysLeft || 0) <= 0) return;
        const decay = Math.max(0.28, Math.pow(0.94, song.elapsed || 0));
        const earn = Math.round((song.royaltyPerDay || 0) * decay);
        song.streams = (song.streams || 0) + Math.round((song.royaltyPerDay || 0) * 40 * decay);
        song.earned = (song.earned || 0) + earn;
        song.daysLeft -= 1;
        song.elapsed = (song.elapsed || 0) + 1;
        total += earn;
      });
      if (total > 0) {
        K.economy.earn(total, "publishing");
        w.totalEarned = (w.totalEarned || 0) + total;
      }
      return total;
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
      const sent = (w.sent || []).slice().sort((a, b) => b.day - a.day);
      let daily = 0;
      sent.forEach(song => {
        if ((song.daysLeft || 0) <= 0) return;
        const decay = Math.max(0.28, Math.pow(0.94, song.elapsed || 0));
        daily += Math.round((song.royaltyPerDay || 0) * decay);
      });
      return {
        craft: K.writing.craft(),
        active: w.active || null,
        offers: (w.offers || []).slice(),
        sent: sent,
        publishedCount: sent.length,
        publishingDaily: daily,
        credited: w.credited || 0,
        ghostJobs: (w.done || []).filter(d => d.mode === "ghost").length,
        exposed: w.exposed || 0,
        totalEarned: w.totalEarned || 0
      };
    }
  };
})(window.K = window.K || {});
