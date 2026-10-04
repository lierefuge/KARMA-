/* ============================================================
   KARMA — systems/dmai.js   (v10.52)
   ANLAYAN DM KATMANI.

   Amaç: DM motorunu "kelime eşleştiren" olmaktan çıkarıp
   BAĞLAMI ANLAYAN bir katmana yükseltmek.

   Ne yapar?
     1) ÇOKLU NİYET  — bir mesajda birden çok niyet olabilir
                       ("feature yapalım ama bütçem kısıtlı").
                       Birincil niyet seçilir, ikinciller not edilir.
     2) VARLIK ÇIKARIMI — mesajdan somut bilgi çeker: şarkı adı,
                       geçen sanatçı, para miktarı, zaman ifadesi.
                       Cevap bu bilgiye bağlanabilir.
     3) DUYGU TONU   — heyecanlı / öfkeli / üzgün / aceleci / nötr.
     4) ÖĞRENME      — oyuncunun KULLANDIĞI kelimeleri niyete bağlar.
                       "Yeni iş" deyip duran oyuncu için motor zamanla
                       "yeni iş"i müzik niyeti olarak tanır. Bu sözlük
                       kayıtla birlikte saklanır; oyun ilerledikçe
                       motor o oyuncuya özel "anlamaya" başlar.

   DÜRÜST NOT: Bu bir dil modeli DEĞİL. Gerçek üretken bir yapay
   zeka bir model/sunucu gerektirir; tarayıcıda çevrimdışı çalışan
   bir oyun bunu koşturamaz. Buradaki "öğrenme", oyuncunun kendi
   yazım alışkanlığından kelime-niyet istatistiği tutan hafif bir
   çevrimiçi öğrenmedir — zamanla belirgin şekilde akıllanır ama
   sınırları vardır.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  const norm = s => (s || "").toLocaleLowerCase("tr")
    .replace(/[.,!?;:()\[\]{}]/g, " ").replace(/\s+/g, " ").trim();

  /* öğrenmeye değmeyen çok sık kelimeler */
  const STOP = {};
  ("bir bu şu o ve ile de da ki mi mı mu mü ne nasıl çok daha en gibi ama ancak için ise ya sen ben beni bana sana seni sizin bizim "
   + "var yok olan olarak diye dedim dedi ki ya da nasılsın naber merhaba selam tamam evet hayır peki").split(" ").forEach(w => STOP[w] = 1);

  /* öğrenmeye kapalı, anlamı zaten sabit niyetler */
  const NO_LEARN = { empty: 1, generic: 1, greet: 1, howareyou: 1, shortyes: 1, shortno: 1, question: 1, bye: 1, thanks: 1 };

  function lex() {
    const s = K.state;
    if (!s) return {};
    if (!s.dmLex) s.dmLex = {};
    return s.dmLex;
  }

  function tokens(text) {
    return norm(text).split(" ").filter(w => w.length >= 3 && !STOP[w]);
  }

  /* küçük yardımcı: yakın geçmişte kullanılanları atlayan seçim */
  function pickAvoid(arr, recent) {
    if (!arr || !arr.length) return "";
    const fresh = arr.filter(x => (recent || []).indexOf(x) < 0);
    return U.pick(fresh.length ? fresh : arr);
  }

  K.dmAI = {
    norm: norm,
    tokens: tokens,

    /* ---------- ÖĞRENME ---------- */
    learn(text, intent) {
      if (!intent || NO_LEARN[intent]) return;
      const L = lex();
      const toks = tokens(text);
      toks.forEach(w => {
        const e = L[w] = L[w] || {};
        e[intent] = (e[intent] || 0) + 1;
      });
      /* sözlüğü sınırlı tut (kayıt şişmesin) */
      const keys = Object.keys(L);
      if (keys.length > 500) keys.slice(0, 120).forEach(k => delete L[k]);
    },

    /* öğrenilmiş kelimelerden niyet tahmini (oy toplamı) */
    learnedIntent(text) {
      const L = lex();
      const toks = tokens(text);
      const score = {};
      toks.forEach(w => {
        const e = L[w];
        if (!e) return;
        for (const it in e) score[it] = (score[it] || 0) + Math.min(3, e[it]);
      });
      let best = null, bs = 0;
      for (const it in score) if (score[it] > bs) { bs = score[it]; best = it; }
      return bs >= 3 ? best : null;
    },

    /* öğrenilen sözlüğün özeti (test/arayüz) */
    stats() {
      const L = lex();
      const keys = Object.keys(L);
      let pairs = 0;
      keys.forEach(k => { pairs += Object.keys(L[k]).length; });
      return { words: keys.length, pairs: pairs };
    },

    /* ---------- VARLIK ÇIKARIMI ---------- */
    entities(text, artistId) {
      const raw = String(text || "");
      const low = norm(raw);
      const out = { songs: [], artists: [], money: null, when: null, proposing: false };

      /* tırnak içi → şarkı adı */
      const quoted = raw.match(/["“”'']([^"“”'']{2,40})["“”'']/g);
      if (quoted) quoted.forEach(q => out.songs.push(q.replace(/["“”'']/g, "").trim()));

      /* oyuncunun kendi şarkı adı geçiyor mu */
      const mySongs = ((K.state && K.state.player && K.state.player.songs) || []);
      mySongs.forEach(s => { if (s.title && low.indexOf(norm(s.title)) >= 0) out.songs.push(s.title); });

      /* bilinen sanatçı adları */
      const list = K.artistList ? K.artistList() : (K.ARTISTS || []);
      list.forEach(a => {
        if (!a || a.id === artistId || !a.stageName) return;
        if (low.indexOf(norm(a.stageName)) >= 0) out.artists.push(a.stageName);
      });

      /* para: "5000 tl", "5 bin lira", "2 milyon" */
      const m = low.match(/(\d+(?:[.,]\d+)?)\s*(bin|milyon|k|m)?\s*(tl|lira|₺|para|bütçe)/);
      if (m) {
        let n = parseFloat(m[1].replace(",", "."));
        if (m[2] === "bin" || m[2] === "k") n *= 1000;
        if (m[2] === "milyon" || m[2] === "m") n *= 1000000;
        out.money = Math.round(n);
      }

      /* zaman */
      if (/yarın/.test(low)) out.when = "yarın";
      else if (/bugün/.test(low)) out.when = "bugün";
      else if (/bu akşam|akşam/.test(low)) out.when = "akşam";
      else if (/bu hafta|haftaya/.test(low)) out.when = "hafta";
      else if (/sonra|müsait olunca/.test(low)) out.when = "sonra";

      /* teklif mi, laf arası mı? */
      out.proposing = /(yapalım|yapalım mı|olur mu|var mısın|ister misin|düşünür müsün|ne dersin|başlayalım|girelim mi)/.test(low);

      return out;
    },

    /* ---------- DUYGU TONU ---------- */
    tone(text) {
      const t = norm(text);
      if (/!{2,}|heyecan|muhteşem|efsane|inanılmaz|harika/.test(t)) return "heyecanli";
      if (/nefret|berbat|saçma|rezalet|salak|aptal|beceriksiz/.test(t)) return "ofkeli";
      if (/üzgün|yalnız|mutsuz|dibe|çöktüm|kötüyüm|ağla|bıktım/.test(t)) return "uzgun";
      if (/acil|hemen|şimdi|bugün|yarın|hızlı|çabuk/.test(t)) return "aceleci";
      return "notr";
    },

    /* ---------- BİRLEŞİK ANALİZ ---------- */
    analyze(text, artistId) {
      const base = (K.chat && K.chat.classify) ? K.chat.classify(text) : "generic";
      const learned = K.dmAI.learnedIntent(text);
      /* taban niyet zayıfsa (generic/question) öğrenilmiş tahmin devralır */
      const primary = ((base === "generic" || base === "question") && learned) ? learned : base;
      return {
        base: base,
        learned: learned,
        primary: primary,
        entities: K.dmAI.entities(text, artistId),
        tone: K.dmAI.tone(text),
        question: /\?/.test(text || "")
      };
    },

    /* ---------- DURUM FARKINDALIKLI "NASILSIN" ----------
       Sabit havuz yerine sanatçının GERÇEK durumuna göre cevap:
       rutin (turne/albüm/uyku), ruh hali, son işler ve oyuncunun
       son şarkısı. */
    howAreYou(artistId) {
      const rel = K.relation(artistId);
      const p = K.state.player;
      const pool = [];

      /* NOT: bu cümleler bir DURUM bildirir; kapanış sorusu sanatçının
         kendi ağız havuzundan gelir. Böylece bağlam eklenir ama
         kişisel ses korunur (iki sanatçı asla aynı cümleyi kurmaz). */
      const st = K.routine ? K.routine.status(artistId) : null;
      if (st) {
        if (st.key === "turnede")        pool.push("Turnedeyim, bir şehirden bir şehre; yorucu ama sahne güzel.");
        else if (st.key === "album")     pool.push("Albüm üstünde çalışıyorum, kafam orada.");
        else if (st.key === "studyoda")  pool.push("Stüdyodayım, kayıt var.");
        else if (st.key === "uyuyor")    pool.push("Yeni uyandım sayılır, gece kuşuyum malum.");
        else if (st.key === "dinleniyor")pool.push("Biraz yorgunum ama iyiyim, dinleniyorum.");
      }
      const mo = K.npcMind ? K.npcMind.moodOf(artistId) : null;
      if (mo) {
        if (mo.key === "hype")        pool.push("Enerjim yüksek, işler iyi gidiyor.");
        else if (mo.key === "uzgun")  pool.push("Açıkçası biraz durgunum.");
        else if (mo.key === "gergin") pool.push("Bugün pek iyi değilim, kusura bakma.");
        else if (mo.key === "ofkeli") pool.push("Bugün sinirlerim bozuk.");
      }
      const last = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];
      if (last && (K.state.day - (last.publishedDay || 0)) <= 7) {
        pool.push(`Bu arada "${last.title}" işini gördüm, güzel.`);
      }
      if (!pool.length) pool.push("İş güç devam, bildiğin gibi.");

      const chat = rel._chat = rel._chat || { recent: [] };
      const msg = pickAvoid(pool, chat.recent);
      chat.recent.push(msg); if (chat.recent.length > 8) chat.recent.shift();
      return msg;
    },

    /* ---------- VARLIK FARKINDALIKLI EK CÜMLE ----------
       Oyuncunun mesajında geçen somut bilgiye bağlanır. */
    acknowledge(artistId, an) {
      const e = (an && an.entities) || {};
      const rel = K.relation(artistId);
      const chat = rel._chat = rel._chat || { recent: [] };
      const lines = [];
      if (e.songs && e.songs.length) {
        lines.push(`"${e.songs[0]}" işini not aldım, dinleyeceğim.`);
        lines.push(`"${e.songs[0]}" demişken, o iş güzel olmuş.`);
      }
      if (e.artists && e.artists.length) {
        lines.push(`${e.artists[0]} ile bir iş mi düşünüyorsun? İlginç.`);
      }
      if (e.when === "yarın") lines.push("Yarın için tamam, not aldım.");
      else if (e.when === "bu hafta" || e.when === "hafta") lines.push("Bu hafta içi ayarlayabiliriz.");
      if (!lines.length) return null;
      const msg = pickAvoid(lines, chat.recent);
      chat.recent.push(msg); if (chat.recent.length > 8) chat.recent.shift();
      return msg;
    }
  };
})(window.K = window.K || {});
