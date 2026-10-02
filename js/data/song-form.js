/* ============================================================
   KARMA — data/song-form.js   (v10.41)
   ŞARKI BİÇİMİ (SONG STRUCTURE) MOTORU

   Eskiden söz atölyesi SABİT 6 bölüm tutuyordu (intro/verse/hook/
   chorus/bridge/outro), her biri tek metin. Tekrar ve sıra yoktu.
   Artık her parçanın bir ŞARKI BİÇİMİ var: sıralı bölüm dizisi.

     slots   : ["intro","verse","chorus","verse","chorus","outro"]
     keys    : ["intro","verse","chorus","verse2","chorusLast","outro"]

   Anahtar çözümleme kuralları:
     · verse/prechorus (indexed) → her geçiş ayrı anahtar (verse2, verse3…)
     · chorus (shared)           → ilk geçiş "chorus", SON geçiş "chorusLast"
     · intro/bridge/outro/hook   → sade anahtar

   Süre artık rastgele değil YAPIDAN türer; biçim puanı nakarat
   omurgasını, köprü kırılmasını ve şişme cezasını ölçer.
   ============================================================ */
(function (K) {
  "use strict";

  /* ---------------- bölüm başına saniye (süre motoru) ---------------- */
  const SECONDS = {
    intro: 14, verse: 34, prechorus: 16, hook: 16,
    chorus: 30, bridge: 20, outro: 14
  };
  K.lyricSectionSeconds = function (id) {
    const sec = K.lyricSectionById(id);
    return SECONDS[sec.id] != null ? SECONDS[sec.id] : 20;
  };

  /* ============================================================
     HAZIR BİÇİMLER
     ============================================================ */
  K.LYRIC_TEMPLATES = [
    { id: "classic",   name: "Klasik",        icon: "🎵", desc: "Intro · iki verse · iki nakarat · outro.",
      slots: ["intro", "verse", "chorus", "verse", "chorus", "outro"] },
    { id: "three",     name: "Üç Verse",      icon: "📝", desc: "Üç verse ve üç nakarat; klasik kalıbın genişi.",
      slots: ["intro", "verse", "chorus", "verse", "chorus", "verse", "chorus", "outro"] },
    { id: "hookfirst", name: "Nakarat Önce",  icon: "🔁", desc: "Nakaratla açılır; kısa dikkat süresi için.",
      slots: ["chorus", "verse", "chorus", "verse", "chorus", "outro"] },
    { id: "bridge",    name: "Köprü'lü",      icon: "🌉", desc: "Ortada köprüyle kırılma yaratır.",
      slots: ["intro", "chorus", "verse", "chorus", "bridge", "chorus", "outro"] },
    { id: "bars",      name: "Nakaratsız",    icon: "🎤", desc: "Saf verse akışı; nakarat yok.",
      slots: ["intro", "verse", "verse", "verse", "outro"] },
    { id: "epic",      name: "Uzun / Epik",   icon: "🏔️", desc: "Pre-nakarat ve köprüyle uzun anlatı.",
      slots: ["intro", "verse", "prechorus", "chorus", "verse", "prechorus", "chorus", "bridge", "chorus", "outro"] },
    { id: "short",     name: "Kısa",          icon: "⚡", desc: "Dört bölümlük kısa ve vurucu biçim.",
      slots: ["intro", "verse", "chorus", "outro"] },
    { id: "custom",    name: "Özel",          icon: "✏️", desc: "Kendi sıralamanı kur.", slots: null }
  ];

  K.lyricTemplateById = function (id) {
    return K.LYRIC_TEMPLATES.find(t => t.id === id) || K.LYRIC_TEMPLATES[0];
  };

  /* verilen yapı hangi hazır biçime birebir uyuyor? yoksa "custom" */
  K.lyricTemplateOf = function (slots) {
    if (!Array.isArray(slots) || !slots.length) return "custom";
    const key = slots.join(",");
    const hit = K.LYRIC_TEMPLATES.find(t => Array.isArray(t.slots) && t.slots.join(",") === key);
    return hit ? hit.id : "custom";
  };

  /* ============================================================
     ANAHTAR ÇÖZÜMLEME
     ============================================================ */
  K.lyricStructureKeys = function (slots) {
    const arr = Array.isArray(slots) ? slots : [];
    const total = {};
    arr.forEach(id => { total[id] = (total[id] || 0) + 1; });
    const seen = {};
    return arr.map(id => {
      seen[id] = (seen[id] || 0) + 1;
      /* nakarat: son geçiş varyasyona ayrılır, öncekiler düz kalır */
      if (id === "chorus") {
        return (total.chorus >= 2 && seen.chorus === total.chorus) ? "chorusLast" : "chorus";
      }
      const sec = K.lyricSectionById(id);
      if (sec && sec.mode === "indexed" && seen[id] > 1) return id + seen[id];
      return id;
    });
  };

  /* anahtarın bölüm türü (verse2 → verse, chorusLast → chorus) */
  K.lyricKeyType = function (key) {
    if (key === "chorusLast") return K.lyricSectionById("chorus");
    const m = /^([a-z]+?)(\d+)$/.exec(String(key || ""));
    return K.lyricSectionById(m ? m[1] : key);
  };

  /* anahtarın sıra numarası (verse → 1, verse2 → 2) */
  K.lyricKeyIndex = function (key) {
    if (key === "chorusLast") return 2;
    const m = /(\d+)$/.exec(String(key || ""));
    return m ? +m[1] : 1;
  };

  /* okunur etiket: "Verse 2", "Nakarat (son)" … */
  K.lyricKeyLabel = function (key) {
    const type = K.lyricKeyType(key);
    if (key === "chorusLast") return "Nakarat (son)";
    if (type.id === "chorus") return "Nakarat";
    if (type.id === "prechorus") {
      const i = K.lyricKeyIndex(key);
      return i > 1 ? "Pre-Nakarat " + i : "Pre-Nakarat";
    }
    if (type.id === "verse") {
      const i = K.lyricKeyIndex(key);
      return i > 1 ? "Verse " + i : "Verse";
    }
    return type.name;
  };

  /* yapıdaki benzersiz anahtarlar (ilk geçiş sırası korunur) */
  K.lyricStructureUnique = function (slots) {
    const keys = K.lyricStructureKeys(slots);
    const out = [];
    keys.forEach(k => { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  };

  /* bir bölüm türünün yapıda kaç kez geçtiği (chorus → chorus+chorusLast) */
  K.lyricKeyRepeat = function (slots, typeId) {
    return K.lyricStructureKeys(slots).filter(k => K.lyricKeyType(k).id === typeId).length;
  };

  /* ============================================================
     SÜRE — yapıdan türer (rastgele değil)
     ============================================================ */
  K.lyricStructureSeconds = function (slots) {
    return (Array.isArray(slots) ? slots : []).reduce((n, id) => n + K.lyricSectionSeconds(id), 0);
  };

  /* ============================================================
     BİÇİM PUANI
     Nakarat omurgadır; köprü kırılma katar; aşırı uzunluk cezalanır.
     ============================================================ */
  K.lyricStructureScore = function (slots) {
    if (!Array.isArray(slots) || !slots.length) return 0;
    const keys = K.lyricStructureKeys(slots);
    const types = keys.map(k => K.lyricKeyType(k).id);
    const count = id => types.filter(t => t === id).length;
    const chorus = count("chorus");
    const verse = count("verse");
    const pre = count("prechorus");
    const bridge = count("bridge");
    const hook = count("hook");

    let s = keys.length * 2;          // uzunluk tabanı
    s += chorus * 8;                  // nakarat omurgası
    s += bridge * 6;                  // köprü kırılması
    s += pre * 4;                     // pre-nakarat tırmanışı
    s += hook * 3;

    if (chorus === 0) s -= 30;        // nakaratsız yapı zayıf
    if (keys.length < 4) s -= (4 - keys.length) * 8;   // çok kısa yapı
    if (verse > 4) s -= (verse - 4) * 12;              // verse yığını = şişme
    if (keys.length > 12) s -= (keys.length - 12) * 4; // aşırı uzunluk
    if (chorus > 0 && chorus < 2) s -= 4;              // tek nakarat yetersiz
    return s;
  };
})(window.K = window.K || {});
