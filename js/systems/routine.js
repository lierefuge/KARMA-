/* ============================================================
   KARMA — systems/routine.js   (v10.52)
   SANATÇI GÜNDELİK RUTİNİ + MÜSAİTLİK.

   Günümüz RPG'lerinde NPC'ler "her an hazır" değildir; kendi
   hayatları vardır. Bu dosya o hayatı kurar:

     · KRONOTİP  → sanatçı günün hangi saatlerinde ayakta?
                   (trap/drill → gece kuşu, pop → gündüzcü)
     · MEŞGULİYET → turne / albüm dönemi / stüdyo haftaları
     · DURUM      → "🟢 müsait" · "😴 uyuyor" · "🎤 turnede" …
     · ETKİ       → cevap şansı, cevap GECİKMESİ ve gerektiğinde
                    "şu an müsait değilim" otomatik yanıtı

   Tümü deterministiktir: aynı gün aynı durum. Böylece oyuncu
   "bugün Şehinşah uyuyor, yarın yazar" diye plan yapabilir.

   Bu dosya karar VERMEZ; yalnızca durumu bildirir. Karar
   relations._deliver ve chat motorunda verilir.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* deterministik karma (aynı girdi → aynı sayı) */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }
  const frac = (str) => (hash(str) % 10000) / 10000;   // 0-1

  /* ---------------- KRONOTİP ----------------
     Aktif saat penceresi. `active` dizisi hangi saatlerde
     ulaşılabilir olduğunu söyler. */
  const CHRONO = {
    gece:    { key: "gece",    label: "Gece kuşu",  icon: "🌙", active: [19, 20, 21, 22, 23, 0, 1, 2, 3] },
    aksam:   { key: "aksam",   label: "Akşamcı",    icon: "🌆", active: [14, 15, 16, 17, 18, 19, 20, 21, 22] },
    gunduz:  { key: "gunduz",  label: "Gündüzcü",   icon: "☀️", active: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
    sabahci: { key: "sabahci", label: "Erkenci",    icon: "🌅", active: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] }
  };

  /* Amiral isimlere elle atama — kişilikleriyle tutarlı olsun.
     (Gerçek hayattaki çalışma ritimlerine yakın bir temsil.) */
  const OVERRIDE = {
    sehinsah: "gece", weghrumi: "gece", lierefuge: "gece", liashine: "gece",
    uzi: "gece", ezhel: "gece", murda: "gece", khontkar: "gece", lilzey: "gece",
    sagopa: "gece", normender: "gece", contra: "gece", joker: "aksam",
    ceza: "aksam", saniser: "aksam", melekmosso: "aksam", hidra: "aksam",
    hadise: "gunduz", edis: "gunduz", sila: "gunduz", aleynatilki: "gunduz"
  };

  function chronotype(artistId) {
    const o = OVERRIDE[artistId];
    if (o) return CHRONO[o];
    const a = K.artistById(artistId) || {};
    const g = a.genre || "rap";
    if (g === "trap" || g === "drill" || g === "rnb") return CHRONO.gece;
    if (g === "pop") return CHRONO.gunduz;
    if (g === "indie") return CHRONO.aksam;
    /* rap: ego/dinçlik yüksekse gece, değilse akşam */
    const t = a.traits || {};
    return ((t.ego || 5) >= 7) ? CHRONO.gece : CHRONO.aksam;
  }

  /* ---------------- MEŞGULİYET ----------------
     Haftalık deterministik pencere + yaz/turne mevsimi etkisi.
     Popüler sanatçı yazın daha çok turnede olur. */
  const BUSY = {
    turnede:  { key: "turnede",  label: "Turnede",         icon: "🎤", available: 0.15 },
    album:    { key: "album",    label: "Albüm döneminde", icon: "🎧", available: 0.40 },
    studyoda: { key: "studyoda", label: "Stüdyoda",        icon: "🎚️", available: 0.45 }
  };

  function weekOf() { return Math.floor(((K.state && K.state.day) || 0) / 7); }

  function isSummer() {
    if (!K.util.dateForDay) return false;
    const mi = (K.util.dateForDay((K.state && K.state.day) || 0).monthIndex) || 0;
    return mi >= 5 && mi <= 7;   // Haziran–Ağustos
  }

  function busyOf(artistId) {
    const a = K.artistById(artistId) || {};
    const h = frac(a.id + "|w" + weekOf());
    const pop = a.popularity || 0;
    const tourP = (pop / 200) * (isSummer() ? 0.55 : 0.18);   // turne olasılığı
    if (h < tourP) return BUSY.turnede;
    if (h < tourP + 0.14) return BUSY.album;
    if (h < tourP + 0.26) return BUSY.studyoda;
    return null;
  }

  /* ---------------- DURUM ----------------
     Öncelik sırası: turne > uyku > meşguliyet > yorgunluk > müsait */
  function status(artistId) {
    const ch = chronotype(artistId);
    const busy = busyOf(artistId);
    const hour = K.time ? K.time.hour() : 12;

    /* turne: bütün gün ulaşılamaz (sahne/hareket) */
    if (busy && busy.key === "turnede") return Object.assign({ chrono: ch }, busy);

    const awake = ch.active.indexOf(hour) >= 0;
    if (!awake) return { key: "uyuyor", label: "Uyuyor", icon: "😴", available: 0.20, chrono: ch };

    if (busy) return Object.assign({ chrono: ch }, busy);

    const mo = K.npcMind ? K.npcMind.moodOf(artistId) : null;
    if (mo && mo.key === "yorgun") {
      return { key: "dinleniyor", label: "Dinleniyor", icon: "🛋️", available: 0.50, chrono: ch };
    }
    return { key: "musait", label: "Müsait", icon: "🟢", available: 1, chrono: ch };
  }

  /* insan okunur rozet: "🎤 Turnede" */
  function statusLabel(artistId) {
    const st = status(artistId);
    return st.icon + " " + st.label;
  }

  /* ulaşılabilirlik çarpanı (0-1) */
  function availability(artistId) { return status(artistId).available; }

  /* ---------------- CEVAP GECİKMESİ ----------------
     Ruh halinin gecikmesini rutinle genişletir. Uyuyan/turnedeki
     sanatçı çok daha geç döner. */
  function replyWait(artistId) {
    const st = status(artistId);
    const mo = K.npcMind ? K.npcMind.moodOf(artistId) : { wait: [1, 3] };
    let lo = mo.wait[0], hi = mo.wait[1];

    if (st.key === "uyuyor")       { lo = 12; hi = 32; }
    else if (st.key === "turnede") { lo = 16; hi = 42; }
    else if (st.available < 0.6)   { lo = Math.max(lo, 6); hi = Math.max(hi, 18); }

    return U.randInt(lo * 1000, hi * 1000);
  }

  /* ---------------- OTOMATİK "MÜSAİT DEĞİL" YANITI ----------------
     Sanatçı gerçekten müsait değilse kısa bir bilgi verir; gerçek
     cevap yine gecikmeli olarak gelir. */
  const AUTO = {
    uyuyor:    ["Şu an uyuyorum, sabah dönerim.", "Gece geç oldu, yarın yazarım.", "Uyku vakti, sabah konuşuruz."],
    turnede:   ["Turnedeyim, sahnedeyim şu an. Dönünce yazarım.", "Şehir dışındayım, konser var. Sonra bakarım.", "Sahnede olacağım bugün, müsait değilim."],
    album:     ["Albüm dönemindeyim, kafam dolu. Sonra dönerim.", "Stüdyoya kapandım, müsait değilim şu an.", "Albüm üstünde çalışıyorum, biraz sabret."],
    studyoda:  ["Stüdyodayım, kayıttayım. Çıkınca yazarım.", "Kayıt var şu an, sonra dönerim.", "Mikrofon başındayım, müsait değilim."],
    dinleniyor:["Biraz dinleniyorum, sonra dönerim.", "Bugün kafamı dinliyorum, yarın yazarım.", "Yorgunum, biraz ara verdim."]
  };

  function autoReply(artistId) {
    const st = status(artistId);
    if (st.available >= 0.6) return null;
    const pool = AUTO[st.key] || AUTO.dinleniyor;
    return U.pick(pool);
  }

  /* gecikmeli cevabın başına "yeni gördüm" tonu (uykudan dönüş) */
  function wakePrefix(artistId) {
    const st = status(artistId);
    if (st.key === "uyuyor") return U.pick(["Yeni gördüm, uyuyordum.", "Sabah baktım mesajına.", "Gece yazmışsın, yeni okuyabildim."]);
    if (st.key === "turnede") return U.pick(["Turneden yeni döndüm.", "Konserden sonra ancak bakabildim.", "Şehir dışındaydım, kusura bakma."]);
    if (st.key === "album" || st.key === "studyoda") return U.pick(["Stüdyodan yeni çıktım.", "Kayıt arasında bakabildim.", "Kafam stüdyodaydı, kusura bakma."]);
    return null;
  }

  K.routine = {
    CHRONO, BUSY,
    chronotype, busyOf, status, statusLabel, availability, replyWait, autoReply, wakePrefix,
    /* test/arayüz için: bir sanatçının tüm rutin özeti */
    summary(artistId) {
      const ch = chronotype(artistId);
      const st = status(artistId);
      return { chrono: ch.key, chronoLabel: ch.label, chronoIcon: ch.icon,
               status: st.key, statusLabel: st.label, statusIcon: st.icon, available: st.available };
    }
  };
})(window.K = window.K || {});
