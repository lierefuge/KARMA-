/* ============================================================
   KARMA — systems/labelsim.js   (v10.59 · YAŞAYAN LABEL SİMÜLASYONU)

   NEDEN AYRI DOSYA?
   -----------------
   v10.58'e kadar plak şirketleri STATİK VERİYDİ: data/labels.js
   içinde güç/erişim/kadro listesi duruyor, oyuncuya teklif dışında
   hiçbir şey yapmıyorlardı. Yani "Hypers Music" gerçekten Hypers
   gibi davranmıyordu; sadece bir satırdı.

   Bu dosya o satırları AKTÖRE çevirir. Her şirket:
     · kendi STRATEJİSİNE sahip (tür ağırlığı, seviye tercihi, agresiflik)
     · kendi İTİBARINI (prestige) kadrosunun gerçek performansından alır
     · yükselen sanatçıları KEŞFEDER (scouting)
     · rakip şirketlerin sanatçılarını KAPMAYA çalışır (poaching)
     · oyuncunun kadrosuna göz koyar (sanatçı kaybı riski)
     · bir sanatçıyı kaptığında/kaybettiğinde sektör tarihine geçer

   ÖNEMLİ — MEVCUT SİSTEMİ BOZMAZ
   ------------------------------
   · data/labels.js DEĞİŞTİRİLMEZ; strateji ondan TÜRETİLİR.
   · label.js (oyuncunun şirketi) aynen korunur; bu modül onun
     üzerine "rakip şirketler" baskısı ekler, mekaniklerini değiştirmez.
   · Sanatçının bağlı olduğu şirketin TEK KAYNAĞI `a.labelId`'dir.
     Transfer olurken hem `a.labelId` hem statik `roster` dizisi
     senkron tutulur (K.labelmates / K.labelOfArtist tutarlı kalsın).

   DETERMİNİZM
   -----------
   Günlük akışta Math.random() KULLANILMAZ (v10.58 ile aynı ilke).
   Tüm kararlar (şirket, gün, sanatçı) üçlüsünden türeyen hash'li
   RNG ile verilir; aynı kayıt + aynı gün → aynı sonuç.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- deterministik karma (industry.js / npcmind.js deseni) ---------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }
  const frac = (str) => (hash(str) % 100000) / 100000;
  const hChance = (seed, p) => frac(seed) < p;
  function hPick(seed, arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(frac(seed) * arr.length) % arr.length];
  }

  /* focus metni → sanatçı türleri. "*" = her tür (nötr/genel şirket). */
  function genresFromFocus(focus) {
    if (!focus) return ["*"];
    const f = String(focus).toLowerCase();
    if (/global|genel|dijital|tv/.test(f)) return ["*"];
    const out = [];
    if (/pop|arabesk/.test(f)) out.push("pop");
    if (/rap/.test(f)) out.push("rap");
    if (/trap/.test(f)) out.push("trap");
    if (/r&b|rnb/.test(f)) out.push("rnb");
    if (/drill/.test(f)) out.push("drill");
    if (/indie|alternatif/.test(f)) out.push("indie");
    return out.length ? out : ["*"];
  }

  K.labelSim = {

    /* ============================================================
       ENSURE — kalıcı şirket kayıtları (prestige / transfer sayacı)
       ============================================================ */
    ensure() {
      const s = K.state;
      if (!s) return {};
      const I = K.industry ? K.industry.ensure() : (s.industry = s.industry || {});
      I.label = I.label || {};
      return I.label;
    },

    init() {
      const s = K.state;
      if (!s) return;
      K.labelSim.ensure();
      /* ilk itibar tohumu (bir kez) */
      (K.LABELS || []).forEach(l => {
        const store = K.labelSim.ensure();
        const rec = store[l.id] = store[l.id] || { prestige: 0, transfers: 0, signed: 0 };
        if (!rec.prestige) rec.prestige = K.labelSim.prestige(l.id);
      });
    },

    /* ============================================================
       PROFİL — statik veriden TÜRETİLEN strateji (veri değişmez)
       ============================================================ */
    profile(labelId) {
      const l = K.labelById(labelId);
      if (!l) return null;
      const store = K.labelSim.ensure();
      const rec = store[labelId] = store[labelId] || { prestige: 0, transfers: 0, signed: 0 };
      const power = l.power || 50;
      const tier = power >= 88 ? "major" : power >= 72 ? "buyuk" : power >= 64 ? "orta" : "bagimsiz";
      return {
        id: labelId,
        name: l.name,
        power: power,
        reach: l.reach || 50,
        tier: tier,
        genres: genresFromFocus(l.focus),
        /* keşif gücü: erişim + bağımsız şirketlerin "sokaktan bulma" avantajı */
        scouting: U.clamp(0.35 + (l.reach || 50) / 220 + (tier === "bagimsiz" ? 0.2 : 0), 0, 1),
        /* kadro kapasitesi: güç büyüdükçe büyür */
        capacity: 6 + Math.round(power / 12),
        /* agresiflik: major'lar daha istekli */
        aggression: U.clamp(power / 100 * (tier === "major" ? 1.15 : 1), 0.2, 1.3),
        prestige: rec.prestige || 0,
        rec: rec
      };
    },

    /* bir şirketin kadrosu — GERÇEK kaynak `a.labelId` */
    rosterOf(labelId) {
      if (!labelId) return [];
      return K.artistList().filter(a => a.labelId === labelId);
    },

    /* ============================================================
       İTİBAR — kadronun gerçek performansından
       ============================================================ */
    prestige(labelId) {
      const roster = K.labelSim.rosterOf(labelId);
      const l = K.labelById(labelId);
      if (!roster.length) return l ? Math.round((l.power || 50) * 0.5) : 0;
      let popSum = 0, awards = 0, hits = 0, flops = 0;
      roster.forEach(a => {
        popSum += (a.popularity || 0);
        const c = (K.industry && K.industry.careerOf) ? K.industry.careerOf(a.id) : null;
        if (c) { awards += c.awards || 0; hits += c.hits || 0; flops += c.flops || 0; }
      });
      const avgPop = popSum / roster.length;
      let p = avgPop * 0.8 + Math.min(20, roster.length * 2) + Math.min(15, awards * 3)
        + Math.min(8, hits * 0.6) - Math.min(8, flops * 0.4);
      return U.clamp(Math.round(p), 5, 100);
    },

    /* ============================================================
       HEDEF SEÇİMİ — hangi sanatçı bu şirkete "uyar"?
       ============================================================ */
    fitScore(prof, a) {
      let s = 0;
      const c = (K.industry && K.industry.careerOf) ? K.industry.careerOf(a.id) : {};
      const arc = (K.industry && K.industry.arcOf) ? K.industry.arcOf(a.id) : "istikrarli";
      if (prof.genres.indexOf("*") >= 0 || prof.genres.indexOf(a.genre) >= 0) s += 3;
      if (arc === "yukselen" || arc === "viral") s += 3;
      else if (arc === "zirvede") s += 2;
      else if (arc === "dususte" || arc === "unutulan") s -= 1;
      s += (a.popularity || 0) / 40;
      if (prof.tier === "major" && (a.popularity || 0) < 55) s -= 2.5;
      if (prof.tier === "bagimsiz" && (a.popularity || 0) > 72) s -= 2.5;
      const cur = a.labelId ? K.labelSim.prestige(a.labelId) : 0;
      s += Math.max(0, (prof.power - cur)) / 40;
      s += frac("fit|" + prof.id + "|" + a.id) * 1.5;   // deterministik eşitlik bozucu
      return s;
    },

    scoutTargets(labelId, n) {
      const prof = K.labelSim.profile(labelId);
      if (!prof) return [];
      if (K.labelSim.rosterOf(labelId).length >= prof.capacity) return [];
      return K.artistList()
        .filter(a => a.labelId !== labelId && a.labelId !== "my_label")
        .map(a => ({ a: a, score: K.labelSim.fitScore(prof, a) }))
        .filter(x => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .slice(0, n || 8);
    },

    /* ============================================================
       KAPMA OLASILIĞI — sanatçı ne kadar "ikna edilebilir"?
       ============================================================ */
    poachChance(prof, a) {
      const c = (K.industry && K.industry.careerOf) ? K.industry.careerOf(a.id) : {};
      const cur = a.labelId ? K.labelSim.prestige(a.labelId) : 0;
      let p = 0.05;
      p += (a.popularity || 0) / 400;                        // yıldızlar daha çok istenir
      p += Math.max(0, (prof.power - cur)) / 300;
      p += prof.aggression * 0.05;
      const arc = (K.industry && K.industry.arcOf) ? K.industry.arcOf(a.id) : "";
      if (arc === "yukselen" || arc === "viral") p += 0.04;
      const idle = K.state.day - (c.lastRelease || 0);
      if (idle > 200) p += 0.05;                             // uzun süredir yayın yok → hoşnutsuz
      /* oyuncunun şirketindeyse: ilişki + şirket gücü sanatçıyı tutar */
      if (a.labelId === "my_label") {
        const rel = K.state.relations && K.state.relations[a.id];
        const loy = rel ? (rel.affinity || 0) / 100 : 0.2;
        const myPower = K.state.label ? K.label.power() : 0;
        p *= U.clamp(1.25 - loy, 0.15, 1);
        p -= myPower / 500;
      }
      return U.clamp(p, 0.01, 0.35);
    },

    /* ============================================================
       TRANSFER — sanatçı şirket değiştirir (tek doğruluk kaynağı)
       ============================================================ */
    transfer(artistId, toLabelId, reason) {
      const a = K.artistById(artistId);
      if (!a || !toLabelId || a.labelId === toLabelId) return null;
      const s = K.state;
      const from = a.labelId || null;

      /* statik roster senkronu (K.labelmates / K.labelOfArtist için) */
      if (from) {
        const fl = K.labelById(from);
        if (fl && fl.roster) fl.roster = fl.roster.filter(id => id !== artistId);
      }
      const tl = K.labelById(toLabelId);
      if (tl) {
        tl.roster = tl.roster || [];
        if (tl.roster.indexOf(artistId) < 0) tl.roster.push(artistId);
      }
      /* oyuncunun kadrosuyla senkron */
      if (from === "my_label" && s.label) s.label.roster = s.label.roster.filter(id => id !== artistId);
      if (toLabelId === "my_label" && s.label && s.label.roster.indexOf(artistId) < 0) {
        s.label.roster.push(artistId);
      }

      a.labelId = toLabelId;

      /* kariyer geçmişi */
      if (K.industry && K.industry.recordCareer) K.industry.recordCareer(artistId, "label", { from: from, to: toLabelId });
      /* sektör olayı + uzun vadeli tarih */
      if (K.industry && K.industry._event) {
        K.industry._event("label", `🏢 ${a.stageName}, ${tl ? tl.name : "yeni şirket"}'a geçti`,
          { artistId: artistId, important: (a.popularity || 0) >= 75 });
      }
      if (K.industry && K.industry._industryHistory) {
        K.industry._industryHistory("label",
          `${a.stageName} ${tl ? tl.name : "yeni bir şirket"} ile anlaştı`, [artistId]);
      }
      /* yeni label arkadaşlarıyla bağ kur */
      const mates = K.labelSim.rosterOf(toLabelId).filter(x => x.id !== artistId).slice(0, 3);
      mates.forEach(m => { if (K.industry && K.industry.setTie) K.industry.setTie(artistId, m.id, "friend", 0.8); });

      /* şirket kaydı */
      const store = K.labelSim.ensure();
      const rec = store[toLabelId] = store[toLabelId] || { prestige: 0, transfers: 0, signed: 0 };
      rec.transfers = (rec.transfers || 0) + 1;
      rec.signed = (rec.signed || 0) + 1;
      rec.prestige = K.labelSim.prestige(toLabelId);

      return { from: from, to: toLabelId, reason: reason || "scout" };
    },

    /* ============================================================
       GÜNLÜK TICK — şirketler oyuncuyu beklemeden rekabet eder
       ============================================================ */
    tick() {
      const s = K.state;
      if (!s || !K.LABELS || !K.LABELS.length) return;
      K.labelSim.ensure();
      const day = s.day;

      /* 1) NPC şirketler scout eder — günde birkaçı harekete geçer */
      K.LABELS.forEach(l => {
        if (l.id === "my_label") return;
        const prof = K.labelSim.profile(l.id);
        if (!prof) return;
        if (K.labelSim.rosterOf(l.id).length >= prof.capacity) return;
        const seed = "scout|" + l.id + "|" + day;
        if (!hChance(seed, 0.10 * prof.scouting)) return;
        const targets = K.labelSim.scoutTargets(l.id, 8);
        if (!targets.length) return;
        /* en iyi 3 adaydan biri seçilir */
        const pick = targets[Math.min(targets.length - 1, Math.floor(frac(seed + "p") * 3))];
        const a = pick.a;
        const pc = K.labelSim.poachChance(prof, a);
        if (hChance(seed + "ok", pc)) {
          K.labelSim.transfer(a.id, l.id, "scout");
          if ((a.popularity || 0) >= 75 && K.industry && K.industry._notifyImportant) {
            K.industry._notifyImportant("🏢 Sektör transferi", `${a.stageName}, ${prof.name} ile anlaştı.`, "", 1);
          }
        } else if (K.industry && K.industry.remember) {
          K.industry.remember(a.id, "label_reject", null, { weight: 0.5, note: prof.name + " teklifini reddetti" });
        }
      });

      /* 2) oyuncunun kadrosuna göz koyan rakip şirketler */
      if (s.label && (s.label.roster || []).length) {
        const seed = "poach|" + day;
        if (hChance(seed, 0.06)) {
          const rid = s.label.roster[Math.floor(frac(seed + "r") * s.label.roster.length) % s.label.roster.length];
          const a = K.artistById(rid);
          if (a) {
            const rivals = K.LABELS.filter(l => l.id !== "my_label" && (l.power || 0) > 58);
            const target = hPick(seed + "l", rivals);
            const prof = target ? K.labelSim.profile(target.id) : null;
            if (prof) {
              const pc = K.labelSim.poachChance(prof, a);
              if (hChance(seed + "ok", pc)) {
                K.labelSim.transfer(a.id, prof.id, "poach");
                if (K.industry && K.industry._notifyImportant) {
                  K.industry._notifyImportant("🏢 Sanatçı kaybı",
                    `${a.stageName}, ${prof.name}'ın teklifini kabul etti — kadrondan ayrıldı.`, "warn", 2);
                }
                if (K.industry && K.industry._industryHistory) {
                  K.industry._industryHistory("label", `${a.stageName}, ${prof.name}'a transfer oldu`, [a.id]);
                }
              } else if (K.industry && K.industry._notifyImportant) {
                K.industry._notifyImportant("🛡️ Teklif reddedildi",
                  `${prof.name}, ${a.stageName}'ı istedi ama sanatçı şirketinde kaldı.`, "", 1);
              }
            }
          }
        }
      }

      /* 3) itibarı tazele (haftada bir — ucuz ama güncel) */
      if (day % 7 === 0) {
        const store = K.labelSim.ensure();
        K.LABELS.forEach(l => {
          if (l.id === "my_label") return;
          const rec = store[l.id] = store[l.id] || { prestige: 0, transfers: 0, signed: 0 };
          rec.prestige = K.labelSim.prestige(l.id);
        });
      }
    },

    /* ============================================================
       ARAYÜZ YARDIMCISI — bir şirketin güncel tablosu (read-only)
       ============================================================ */
    summary(labelId) {
      const prof = K.labelSim.profile(labelId);
      if (!prof) return null;
      const roster = K.labelSim.rosterOf(labelId);
      return {
        name: prof.name, tier: prof.tier, genres: prof.genres,
        power: prof.power, prestige: K.labelSim.prestige(labelId),
        capacity: prof.capacity, rosterSize: roster.length,
        transfers: (prof.rec && prof.rec.transfers) || 0
      };
    }
  };
})(window.K = window.K || {});
