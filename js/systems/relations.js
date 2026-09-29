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
      /* v10.13 — NaN KORUMASI
         `streams` eksik/bozuksa sqrt NaN üretiyor ve bu değer aşağıdaki
         TÜM zincire yayılıyordu (cevap şansı, demo dinleme süresi,
         olasılıklar) — arayüzde “%NaN” görünürdü. Artık sayı olmayan
         değerler güvenli varsayılana düşer. */
      const pPop = Number.isFinite(p.popularity) ? p.popularity : 0;
      const aPop = Number.isFinite(a.popularity) ? a.popularity : 50;
      const pStr = Number.isFinite(p.streams) ? p.streams : 0;
      const aStr = Number.isFinite(a.streams) ? a.streams : 0;
      const popGap = (pPop + 3) / (aPop + 10);
      const streamGap = Math.sqrt((pStr + 1) / (aStr + 1));
      const aff = (Number.isFinite(rel.affinity) ? rel.affinity : 0) / 260;
      const metBonus = rel.met ? 0.12 : 0;
      const rep = (Number.isFinite(p.reputation) ? p.reputation : 0) / 400;
      const out = popGap * 1.6 + streamGap * 0.8 + aff * 0.25 + metBonus + rep;
      return U.clamp(Number.isFinite(out) ? out : 0, 0, 1.3);
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

    /* ============================================================
       v10.12 — YENİ DM MEKANİKLERİ
       ============================================================ */

    /* --- MESAJ TEPKİSİ (emoji) ---
       Gerçek DM'lerin temel parçasıydı ama hiç yoktu. Hem oyuncu
       sanatçının mesajına tepki verebilir, hem sanatçı oyuncunun
       mesajına tepki verir. */
    reactToMessage(artistId, msgId, emoji) {
      const th = K.thread(artistId);
      const m = th.messages.find(x => x.id === msgId);
      if (!m) return false;
      m.reaction = (m.reaction === emoji) ? null : emoji;
      K.save();
      return true;
    },

    /* --- DEMO GÖNDERİMİ ---
       Oyuncu kendi şarkısını sanatçıya dinletir. Sanatçı birkaç gün
       sonra dinler ve tepki verir: beğeni / eleştiri / feature teklifi /
       iş birliği. Tanımadığın sanatçıya gönderirsen çoğu zaman açılmaz. */
    /* ============================================================
       DEMO KULAĞI (v10.13)
       Her sanatçı demoda FARKLI ŞEYE bakar. Eskiden tek ölçüt genel
       `quality` idi; yani sözü mükemmel ama beat'i zayıf bir şarkı
       Şehinşah'tan da UZI'den de aynı puanı alıyordu. Artık:
         • lyric → söz / teknik / lirikal derinlik
         • sound → altyapı + mix / prodüksiyon kalitesi
         • hook  → nakarat, akılda kalıcılık, vokal tınısı
       Sanatçının türü, üretim disiplini (work) ve egosu hem
       NEYE baktığını hem barın ne kadar yüksek olduğunu belirler.
       ============================================================ */
    DEMO_EAR_BY_ID: {
      sehinsah: { key: "lyric", why: "sözü ve tekniği" },
      ceza: { key: "lyric", why: "lirikal derinliği" },
      sagopa: { key: "lyric", why: "sözün ağırlığını" },
      normender: { key: "lyric", why: "tekniği" },
      joker: { key: "lyric", why: "söz oyunlarını" },
      contra: { key: "lyric", why: "flow ve tekniği" },
      hidra: { key: "lyric", why: "anlatıyı" },
      saniser: { key: "lyric", why: "metni ve derdini" },
      melekmosso: { key: "lyric", why: "samimiyeti ve sözü" },
      uzi: { key: "hook", why: "nakaratı ve tınıyı" },
      blok3: { key: "hook", why: "vuruculuğu ve hook'u" },
      lvbelc5: { key: "hook", why: "akılda kalıcılığı" },
      cakal: { key: "hook", why: "melodiyi" },
      reckol: { key: "hook", why: "hook'u" },
      ati242: { key: "hook", why: "viral potansiyeli" },
      ezhel: { key: "sound", why: "sound'u ve prodüksiyonu" },
      murda: { key: "sound", why: "altyapı kalitesini" },
      khontkar: { key: "sound", why: "prodüksiyonu" },
      lilzey: { key: "sound", why: "atmosferi ve mixi" },
      sila: { key: "hook", why: "melodiyi" },
      edis: { key: "sound", why: "prodüksiyon parlaklığını" },
      hadise: { key: "hook", why: "nakaratı" },
      aleynatilki: { key: "hook", why: "yeniliği ve tınıyı" }
    },

    demoEar(artistId) {
      const a = K.artistById(artistId) || {};
      const ov = K.relations.DEMO_EAR_BY_ID[artistId];
      let key = (ov && ov.key) || null;
      if (!key) {
        const g = a.genre || "rap";
        if (["rap", "boombap", "cloudrap", "hiphop", "indie"].indexOf(g) >= 0) key = "lyric";
        else if (["pop", "drill", "phonk", "afrotrap", "euro"].indexOf(g) >= 0) key = "hook";
        else key = "sound";
      }
      const t = a.traits || {};
      /* bar: ego yüksek → zor beğenir; openness yüksek → iyi niyetli; work disiplinli */
      const bar = U.clamp(48 + (t.ego || 5) * 2.6 - (t.openness || 5) * 1.4 + (t.work || 5) * 1.1, 34, 82);
      const label = { lyric: "söz/teknik", sound: "sound/prodüksiyon", hook: "hook/nakarat" }[key];
      const why = (ov && ov.why) || label;
      return { key, bar: Math.round(bar), label, why };
    },

    /* şarkının sanatçının baktığı ölçüte göre puanı */
    demoScore(song, ear) {
      const q = song.quality || 50;
      if (ear.key === "lyric") return Math.round((song.lyricScore != null ? song.lyricScore : q) * 0.72 + q * 0.28);
      if (ear.key === "sound") {
        const b = song.beatQuality != null ? song.beatQuality : q;
        const m = song.mixQuality != null ? song.mixQuality : q;
        return Math.round(b * 0.45 + m * 0.45 + q * 0.10);
      }
      return Math.round((song.hookStrength != null ? song.hookStrength : q) * 0.8 + q * 0.2);
    },

    /* demoyu bu sanatçıya tekrar gönderebilir miyim? */
    demoCooldown(artistId) {
      const rel = K.relation(artistId);
      const until = rel.demoColdUntil || 0;
      return Math.max(0, until - K.state.day);
    },

    sendDemo(artistId, songId) {
      const s = K.state, p = s.player;
      const a = K.artistById(artistId);
      const song = (p.songs || []).find(x => x.id === songId);
      if (!a || !song) return { ok: false, why: "yok" };

      const rel = K.relation(artistId);
      const reach = K.relations.reach(artistId);
      const th = K.thread(artistId);

      /* --- RET SONRASI SOĞUMA ---
         Eskiden reddedilen demo hiçbir iz bırakmıyordu; aynı sanatçıya
         sınırsız demo gönderilebiliyordu. Artık ret sayısı birikir,
         sanatçı bir süre dinlemez ve tonu soğur. */
      const cold = K.relations.demoCooldown(artistId);
      const rejects = rel.demoRejects || 0;
      const ear = K.relations.demoEar(artistId);

      /* aynı şarkıyı aynı sanatçıya 10 gün içinde tekrar göndermek yok */
      const dup = (p.dmDemoLog || []).some(x => x.artistId === artistId && x.songId === songId && (s.day - x.day) < 10);
      if (dup) return { ok: false, why: "tekrar", ear };

      th.messages.push({
        id: U.uid("m"), from: "me", day: s.day, type: "demo", kind: "demo",
        text: `Demo: "${song.title}"`, songId: song.id, songTitle: song.title, art: song.art || null,
        seen: false, reaction: null
      });
      th.lastDay = s.day;

      /* dinleme süresi: samimiyet + soğuma */
      const baseDays = Math.max(1, Math.round(4 - reach * 3));
      const days = baseDays + (cold > 0 ? 4 : 0) + rejects;

      const score = K.relations.demoScore(song, ear);
      p.dmDemoLog = p.dmDemoLog || [];
      p.dmDemoLog.push({
        artistId, songId, title: song.title, day: s.day, dueDay: s.day + days,
        done: false, ear: ear.key, bar: ear.bar, score, cold: cold > 0
      });

      let chance = U.clamp(0.12 + reach * 0.7 + (song.quality || 50) / 220, 0.05, 0.92);
      if (cold > 0) chance *= 0.2;                                  // soğuk dönemde neredeyse bakmaz
      chance *= (1 - Math.min(0.5, rejects * 0.14));                 // her ret güveni düşürür

      K.save();
      return { ok: true, chance, days, cold, rejects, ear, score };
    },

    /* demo sonuçlarını işle (günlük) */
    _demoTick() {
      const s = K.state, p = s.player;
      const log = p.dmDemoLog || [];
      log.forEach(entry => {
        if (entry.done || s.day < entry.dueDay) return;
        entry.done = true;
        const a = K.artistById(entry.artistId);
        if (!a) return;
        const song = (p.songs || []).find(x => x.id === entry.songId);
        const rel = K.relation(entry.artistId);
        const reach = K.relations.reach(entry.artistId);
        const ear = K.relations.demoEar(entry.artistId);
        const score = song ? K.relations.demoScore(song, ear) : (entry.score || 50);
        entry.score = score; entry.bar = ear.bar; entry.ear = ear.key;

        let openChance = U.clamp(0.15 + reach * 0.75, 0.05, 0.95);
        openChance *= (1 - Math.min(0.5, (rel.demoRejects || 0) * 0.14));
        if (entry.cold) openChance *= 0.25;

        /* kapalı kaldıysa: soğuma döneminde tonu da soğuk olur */
        if (Math.random() > openChance) {
          entry.verdict = "ignored";
          const coldLines = [
            "Demo kutuda kalmış, bakamadım. Bir süre de bakamayacağım galiba.",
            "Bu ara hiçbir şey dinlemiyorum, kusura bakma."
          ];
          K.relations.pushArtistMessage(entry.artistId, U.pick(
            (rel.demoRejects || 0) > 0 ? coldLines : [
              "Mesajlara çok bakamıyorum, demo kutuda kalmış. Kusura bakma.",
              "Yoğunum, dinleyemedim daha. Sonra bakacağım.",
              "Demo geldi ama sıraya aldım, söz veremem."
            ]), "chat", { topic: "demo" });
          return;
        }

        /* --- dinledi: sanatçının BAKTIĞI ölçüte göre yargı --- */
        const gap = score - ear.bar;
        if (gap >= 12) {
          entry.verdict = "loved";
          K.relations.pushArtistMessage(entry.artistId, U.pick([
            `"${entry.title}" dinledim. ${ear.why.charAt(0).toUpperCase() + ear.why.slice(1)} beğendim, iş var burada.`,
            `"${entry.title}" sağlam olmuş. ${ear.why.charAt(0).toUpperCase() + ear.why.slice(1)} açık şekilde çalışmış.`,
            `"${entry.title}" beklediğimden iyi çıktı. Eline sağlık.`
          ]), "chat", { topic: "demo" });
          rel.affinity = U.clamp(rel.affinity + 7, 0, 100);
          rel.demoRejects = Math.max(0, (rel.demoRejects || 0) - 1);   // güveni geri kazandın
          K.game.addFame(0.5);
          if (score >= 84 && rel.affinity >= 55 && U.chance(0.32)) {
            K.relations.createIncomingFeatureOffer(entry.artistId);
          }
        } else if (gap >= -6) {
          entry.verdict = "mixed";
          const tip = ear.key === "lyric" ? "Sözler biraz daha oturabilirdi."
            : ear.key === "sound" ? "Mix ve altyapı daha açılabilirdi."
            : "Nakarat daha vurucu olabilirdi.";
          K.relations.pushArtistMessage(entry.artistId, U.pick([
            `"${entry.title}" fena değil. ${tip}`,
            `"${entry.title}" dinledim. ${ear.why.charAt(0).toUpperCase() + ear.why.slice(1)} tam gelmemiş.`,
            `"${entry.title}" üzerinde çalışılırsa olur. Şimdilik erken.`
          ]), "chat", { topic: "demo" });
          rel.affinity = U.clamp(rel.affinity + 1.5, 0, 100);
          if (song) song.feedback = ear.key;
        } else {
          entry.verdict = "rejected";
          const hard = gap <= -20;
          K.relations.pushArtistMessage(entry.artistId, U.pick([
            `"${entry.title}" için dürüst olayım: ${ear.why} hazır değil.`,
            `"${entry.title}" dinledim ama bu haliyle olmaz. ${ear.why.charAt(0).toUpperCase() + ear.why.slice(1)} zayıf.`,
            `"${entry.title}" erken olmuş. Biraz daha çalış.`
          ]), "chat", { topic: "demo" });
          rel.affinity = U.clamp(rel.affinity - (hard ? 3 : 1.5), 0, 100);
          /* RET SONRASI SOĞUMA: birikimli, sonra yavaşça toparlar */
          rel.demoRejects = Math.min(4, (rel.demoRejects || 0) + 1);
          rel.demoColdUntil = s.day + 14 + (rel.demoRejects - 1) * 12;
          if (rel.demoRejects >= 2) {
            K.relations.pushArtistMessage(entry.artistId,
              U.pick([
                "Bir süre demo gönderme, söz veremem.",
                "Bir daha demo göndermeden önce üzerinde çalış, ricam."
              ]), "chat", { topic: "demo" });
          }
        }
      });
      p.dmDemoLog = log.filter(x => !x.done || (s.day - x.dueDay) < 30).slice(-60);

      /* soğuma süresi dolunca ret sayacı bir kademe iner (ilişki zamanla açılır) */
      Object.keys(s.relations || {}).forEach(id => {
        const r = s.relations[id];
        if (!r || !r.demoColdUntil) return;
        if (s.day > r.demoColdUntil + 10 && (r.demoRejects || 0) > 0) {
          r.demoRejects = Math.max(0, r.demoRejects - 1);
          r.demoColdUntil = s.day + 20;
        }
      });
    },

    /* demo takip listesi (arayüz) */
    demoStatus() {
      const s = K.state, p = s.player;
      return (p.dmDemoLog || []).slice().reverse().map(x => {
        const a = K.artistById(x.artistId) || {};
        const ear = K.relations.demoEar(x.artistId);
        return {
          artistId: x.artistId, artistName: a.stageName || "?",
          title: x.title, day: x.day, dueDay: x.dueDay,
          left: Math.max(0, x.dueDay - s.day),
          done: !!x.done, verdict: x.verdict || null,
          score: x.score != null ? x.score : null,
          bar: x.bar != null ? x.bar : ear.bar,
          earLabel: ear.label, earWhy: ear.why
        };
      });
    },

    /* --- DM İSTEKLERİ ---
       Tanımadığın bir sanatçı yazarsa doğrudan gelen kutusuna değil
       “İstekler” klasörüne düşer. */
    _requestTick() {
      const s = K.state, p = s.player;
      /* sadece henüz iletişim kurulmamış sanatçılar; popülerlik arttıkça sıklaşır */
      if (!U.chance(0.02 + (p.popularity || 0) / 2200)) return;
      const cands = K.artistList().filter(a => {
        const rel = s.relations[a.id];
        if (rel && (rel.met || rel.discovered)) return false;
        if ((s.dmRequests || {})[a.id]) return false;
        return true;
      });
      if (!cands.length) return;
      const sorted = cands.slice().sort((x, y) =>
        Math.abs(x.popularity - (p.popularity || 0)) - Math.abs(y.popularity - (p.popularity || 0)));
      const a = U.pick(sorted.slice(0, 12));
      if (!a) return;
      const pool = [
        "Selam, profilini gördüm. İşlerine baktım, fena değil.",
        "Selam, bir süredir adını görüyorum. Tanışalım.",
        "Yeni bir iş üstünde çalışıyorum, bir ara konuşalım.",
        "Selam, birlikte bir şey yapabilir miyiz diye düşündüm.",
        "Sesin dikkatimi çekti. Nasıl gidiyor?"
      ];
      K.relations.pushRequest(a.id, U.pick(pool));
    },

    pushRequest(artistId, text) {
      const req = K.dmRequest(artistId);
      req.messages.push({
        id: U.uid("m"), from: "them", text, day: K.state.day,
        type: "chat", kind: "text", reaction: null
      });
      req.day = K.state.day;
      K.state.notifications = (K.state.notifications || []).concat([{
        title: "📥 DM isteği",
        msg: (K.artistById(artistId) || {}).stageName + " sana mesaj isteği gönderdi.",
        kind: "ok", day: K.state.day
      }]).slice(-60);
      K.save();
    },

    /* --- GRUP SOHBETLERİ ---
       Şirket kadrosu ve ortak projeler için gerçek grup DM'i. */
    ensureGroups() {
      const s = K.state;
      s.groups = s.groups || {};
      const has = (kind) => Object.values(s.groups).some(g => g.kind === kind);
      if (s.label && (s.label.roster || []).length && !has("label")) {
        K.groupCreate(s.label.name + " · Kadro", s.label.roster.slice(0, 8), "label");
      }
      return s.groups;
    },

    groupLine(artist) {
      const g = (artist && artist.genre) || "rap";
      const pools = {
        label: ["Bu ay için bir plan var mı?", "Stüdyo takvimi doldu, sıraya girelim.", "Yeni iş çıkınca haber verin.", "Şirket olarak destek olalım bu parçaya."],
        collab: ["Beat'i ben hazırlarım, siz yazın.", "Kayıt gününü sabitleyelim.", "Mix'i kim yapıyor?", "Parçanın adı ne olacak?"],
        genel: ["Selam millet.", "Ne var ne yok?", "Bir şey paylaşacaktım.", "Toplantı ne zaman?"]
      };
      const p = pools[g === "rap" ? "genel" : "genel"] || pools.genel;
      return U.pick(p);
    },

    groupTick() {
      const s = K.state;
      s.groups = s.groups || {};
      K.relations.ensureGroups();
      Object.values(s.groups).forEach(g => {
        if (s.day - (g.lastDay || 0) < 2) return;
        if (!U.chance(0.22)) return;
        const members = (g.members || []).filter(id => K.artistById(id));
        if (!members.length) return;
        const who = U.pick(members);
        const a = K.artistById(who);
        K.groupPost(g.id, who, K.relations.groupLine(a), { fromName: a.stageName });
      });
    },

    /* --- sabitleme / arşivleme yardımcıları --- */
    togglePin(artistId) {
      const p = K.state.player;
      p.dmPinned = p.dmPinned || [];
      const i = p.dmPinned.indexOf(artistId);
      if (i >= 0) p.dmPinned.splice(i, 1); else p.dmPinned.push(artistId);
      K.save();
      return i < 0;
    },

    toggleArchive(artistId) {
      const p = K.state.player;
      p.dmArchived = p.dmArchived || [];
      const i = p.dmArchived.indexOf(artistId);
      if (i >= 0) p.dmArchived.splice(i, 1); else p.dmArchived.push(artistId);
      K.save();
      return i < 0;
    },

    isPinned(artistId) { return (K.state.player.dmPinned || []).indexOf(artistId) >= 0; },
    isArchived(artistId) { return (K.state.player.dmArchived || []).indexOf(artistId) >= 0; },

    /* --- SESLİ MESAJ ve MEDYA ---
       Sesli mesaj metne dökülür (transkript) ve sanatçı ona göre cevap verir;
       medya olarak kendi şarkını/kapağını gönderirsin. */
    sendVoice(artistId, seconds, transcript) {
      const th = K.thread(artistId);
      th.messages.push({
        id: U.uid("m"), from: "me", day: K.state.day, type: "chat", kind: "voice",
        text: transcript, voiceSeconds: seconds, seen: false, reaction: null
      });
      th.lastDay = K.state.day;
      /* sesli mesaj daha samimi/etkili: samimiyet biraz daha hızlı artar */
      const rel = K.relation(artistId);
      rel.affinity = U.clamp(rel.affinity + 0.6, 0, 100);
      K.save();
      return true;
    },

    sendMedia(artistId, songId) {
      const s = K.state, p = s.player;
      const song = (p.songs || []).find(x => x.id === songId);
      if (!song) return false;
      const th = K.thread(artistId);
      th.messages.push({
        id: U.uid("m"), from: "me", day: s.day, type: "chat", kind: "media",
        text: song.title, songId: song.id, songTitle: song.title, art: song.art || null,
        seen: false, reaction: null
      });
      th.lastDay = s.day;
      K.save();
      return true;
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

      /* v10.12 — yeni DM katmanları */
      try { K.relations._demoTick(); } catch (e) {}      // demo dinleme sonuçları
      try { K.relations.groupTick(); } catch (e) {}      // grup sohbeti canlılığı
      try { K.relations._requestTick(); } catch (e) {}   // tanımadığından gelen istekler

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
