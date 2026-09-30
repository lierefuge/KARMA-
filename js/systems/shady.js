/* ============================================================
   KARMA — systems/shady.js   (v10.28)
   KARANLIK TARAF: BOT DİNLENME & PLAYLIST PAYOLASI

   Neden?
   ------
   Oyun dürüst yolları ödüllendiriyordu ama endüstrinin gerçeği olan
   KISA YOLU hiç sunmuyordu. Bu sistem bir AHLAKİ SEÇİM ekler:
   hızlı liste/şöhret, ama tespit riski gerçek.

   · 🎰 Bot dinlenme : anlık dinlenme şişmesi → liste/chart etkisi
                       HER kullanım ŞÜPHE biriktirir
   · 📻 Payola       : küratöre para → playlist girişi (daha az riskli)
   TESPİT
     · günlük tespit şansı şüphe ile artar
     · tespitte: bot dinlenmenin çoğu GERİ ALINIR, imaj/itibar yanar,
       1 strike. 3 strike → platform yasağı (60 gün, telif geliri ×0,45)
   Dürüst kalana ödül: hiç kullanmayan oyuncuya itibar + bildirim.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  const BOT_TIERS = [
    { id: "s", name: "Küçük Paket",  icon: "🐜", cost: 45000,  streams: 250000,  susp: 8,  mult: 1.25 },
    { id: "m", name: "Orta Paket",   icon: "🐝", cost: 140000, streams: 900000,  susp: 18, mult: 1.45 },
    { id: "l", name: "Büyük Paket",  icon: "🦗", cost: 400000, streams: 3000000, susp: 34, mult: 1.75 }
  ];

  const PAYOLA_COST = 60000;
  const PAYOLA_SUSP = 10;
  const BAN_DAYS = 60;
  const CLEAN_DAY = 360;

  K.shady = {
    BOT_TIERS, PAYOLA_COST, BAN_DAYS, CLEAN_DAY,

    st() { return K.state.player.shady; },

    /* telif geliri çarpanı — platform yasağı sırasında düşer */
    incomeMult() {
      const st = K.shady.st();
      return (st.bannedUntil && K.state.day < st.bannedUntil) ? 0.45 : 1;
    },

    isBanned() {
      const st = K.shady.st();
      return !!(st.bannedUntil && K.state.day < st.bannedUntil);
    },

    /* tespit şansı (günlük) */
    detectChance() {
      const sus = K.shady.st().suspicion || 0;
      return U.clamp((sus / 100) * 0.075, 0, 0.35);
    },

    /* ---- bot dinlenme satın al ---- */
    buyBots(tierId, songId) {
      const s = K.state, p = s.player, st = K.shady.st();
      const t = BOT_TIERS.find(x => x.id === tierId);
      if (!t) return false;
      if (K.shady.isBanned()) { K.toast("Platform yasağı", "Yasak süresince bu işe bulaşamazsın.", "bad"); return false; }
      const song = songId
        ? (p.songs || []).find(x => x.id === songId)
        : (p.songs || []).slice().sort((a, b) => (b.streams || 0) - (a.streams || 0))[0];
      if (!song) { K.toast("Şarkı yok", "Önce bir şarkı yayınla.", "warn"); return false; }
      if (!K.economy.canAfford(t.cost)) { K.toast("Yetersiz bakiye", `${U.money(t.cost)} gerekiyor.`, "bad"); return false; }

      K.economy.spend(t.cost, "bot_streams");
      st.everUsed = true;
      st.botStreams = (st.botStreams || 0) + t.streams;
      st.suspicion = U.clamp((st.suspicion || 0) + t.susp, 0, 100);

      song.streams = (song.streams || 0) + t.streams;
      song.boosts = song.boosts || {};
      song.boosts.bot = (song.boosts.bot || 0) + 0.35;
      song.botBoost = { streams: t.streams, mult: t.mult, until: s.day + 30, tier: t.id };

      K.toast("🎰 Bot dinlenme", `${U.fmt(t.streams)} dinlenme eklendi · şüphe ${Math.round(st.suspicion)}/100`, "warn");
      s.notifications = (s.notifications || []).concat([{
        title: "🎰 Bot dinlenme alındı",
        msg: `"${song.title}" için ${U.fmt(t.streams)} sahte dinlenme. Şüphe ${Math.round(st.suspicion)}/100 — tespit edilirse ağır bedel.`,
        kind: "warn", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* ---- küratöre para (payola) ---- */
    payCurator() {
      const s = K.state, p = s.player, st = K.shady.st();
      if (K.shady.isBanned()) { K.toast("Platform yasağı", "Yasak süresince olmaz.", "bad"); return false; }
      const song = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];
      if (!song) { K.toast("Şarkı yok", "Önce bir şarkı yayınla.", "warn"); return false; }
      if (!K.economy.canAfford(PAYOLA_COST)) { K.toast("Yetersiz bakiye", `${U.money(PAYOLA_COST)} gerekiyor.`, "bad"); return false; }

      K.economy.spend(PAYOLA_COST, "payola");
      st.everUsed = true;
      st.suspicion = U.clamp((st.suspicion || 0) + PAYOLA_SUSP, 0, 100);
      st.curatorDeals = (st.curatorDeals || []).concat([{ songId: song.id, day: s.day }]).slice(-20);

      song.boosts = song.boosts || {};
      song.boosts.playlist = Math.max(song.boosts.playlist || 0, 0.4);
      song.listPitch = { accepted: true, paidDay: s.day, score: 90 };
      song.dailyStreams = Math.round((song.dailyStreams || 0) * 1.15);

      K.toast("📻 Küratör anlaşması", `"${song.title}" liste kapısından geçti · şüphe ${Math.round(st.suspicion)}/100`, "warn");
      s.notifications = (s.notifications || []).concat([{
        title: "📻 Payola",
        msg: `Küratöre ${U.money(PAYOLA_COST)} gitti; "${song.title}" editoryal listeye girdi. Bu iş kayıt altında.`,
        kind: "warn", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* ---- günlük: tespit + bot etkisinin sönmesi ---- */
    tick() {
      const s = K.state, p = s.player, st = K.shady.st();
      if (!st || !st.everUsed) {
        /* dürüst kaldıysan (360. gün) ödül */
        if (s.day === CLEAN_DAY && !st.cleanRewarded) {
          st.cleanRewarded = true;
          p.reputation = (p.reputation || 0) + 8;
          s.notifications = (s.notifications || []).concat([{
            title: "🕊️ Temiz kariyer",
            msg: "360 gündür tek bir sahte dinlenme/payola kullanmadın. Camia bunu biliyor (itibar +8).",
            kind: "ok", day: s.day
          }]).slice(-60);
          K.toast("🕊️ Temiz kariyer", "Hiç kısa yol kullanmadın — itibar +8.", "ok");
        }
        return;
      }

      /* bot etkisi 30 günde söner */
      (p.songs || []).forEach(sg => {
        if (sg.botBoost && s.day >= (sg.botBoost.until || 0)) {
          if (sg.boosts && sg.boosts.bot) delete sg.boosts.bot;
          sg.botBoost = null;
        }
      });

      /* şüphe doğal olarak çok yavaş azalır (zamanla unutulur) */
      st.suspicion = U.clamp((st.suspicion || 0) - 0.06, 0, 100);

      /* tespit */
      if (!U.chance(K.shady.detectChance())) return;

      st.strikes = (st.strikes || 0) + 1;
      /* bot dinlenmenin %70'i geri alınır */
      let rolled = 0;
      (p.songs || []).forEach(sg => {
        if (!sg.botBoost || !sg.botBoost.streams) return;
        const cut = Math.round(sg.botBoost.streams * 0.7);
        rolled += cut;
        sg.streams = Math.max(0, (sg.streams || 0) - cut);
        sg.botBoost = null;
        if (sg.boosts && sg.boosts.bot) delete sg.boosts.bot;
      });
      p.image = U.clamp((p.image || 50) - 8, 0, 100);
      p.reputation = Math.max(0, (p.reputation || 0) - 10);
      st.suspicion = U.clamp((st.suspicion || 0) + 25, 0, 100);

      s.notifications = (s.notifications || []).concat([{
        title: "🚨 Sahte dinlenme tespit edildi (" + st.strikes + "/3)",
        msg: rolled ? `${U.fmt(rolled)} dinlenme silindi. ` : "" +
          "Platform soruşturma açtı; imaj ve itibar zarar gördü.",
        kind: "bad", day: s.day
      }]).slice(-60);
      K.toast("🚨 Tespit edildin!", `${st.strikes}/3 strike · ${U.fmt(rolled)} dinlenme silindi`, "bad");

      if (st.strikes >= 3) {
        st.bannedUntil = s.day + BAN_DAYS;
        s.notifications = (s.notifications || []).concat([{
          title: "⛔ Platform yasağı",
          msg: `${BAN_DAYS} gün boyunca telif gelirin %45'e düştü. Dağıtımcı sözleşmeyi askıya aldı.`,
          kind: "bad", day: s.day
        }]).slice(-60);
        K.toast("⛔ Platform yasağı", `${BAN_DAYS} gün · telif geliri ×0,45`, "bad");
      }
      K.save(); K.refresh();
    },

    summary() {
      const st = K.shady.st();
      return {
        suspicion: Math.round(st.suspicion || 0),
        detectChance: K.shady.detectChance(),
        strikes: st.strikes || 0,
        banned: K.shady.isBanned(),
        bannedLeft: Math.max(0, (st.bannedUntil || 0) - K.state.day),
        botStreams: st.botStreams || 0,
        curatorDeals: (st.curatorDeals || []).length,
        everUsed: !!st.everUsed,
        incomeMult: K.shady.incomeMult()
      };
    }
  };
})(window.K = window.K || {});
