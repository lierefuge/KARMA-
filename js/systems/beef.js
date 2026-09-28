/* ============================================================
   KARMA — systems/beef.js
   HUSUMET / DISS SİSTEMİ
   • Bir sanatçı sana diss atar → kim olduğunu ÖĞRENİRSİN.
   • Belirli bir süre husumet (heat) artar, kapışma büyür.
   • Stüdyoda o sanatçıya gönderme yapan söz yazarsan "diss" sayılır.
   • Barışırsan (barış/hediye/DM) husumet düşer → arkadaşlık.
   • Uzun süre ilgilenmezsen husumet soğur ("ilgi düştü").
   • Dost sanatçılar (yüksek samimiyet) sana destek postu atar (çeteleşme).
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  const DISS_REASONS = [
    "senin yükselişini kıskanıyor", "listede seni rakip görüyor",
    "eski bir lafınız yüzünden", "klibinde ona gönderme olduğunu düşünüyor",
    "aynı sound'u kullanmakla suçluyor", "gündem olmak istiyor"
  ];

  const STAGES = [
    { min: 0,  name: "nötr",           level: 0 },
    { min: 6,  name: "soğuk",          level: 1 },
    { min: 18, name: "gerginlik",      level: 2 },
    { min: 40, name: "husumet",        level: 3 },
    { min: 70, name: "açık savaş",     level: 4 },
    { min: 90, name: "topyekûn savaş", level: 5 }
  ];
  function stageInfo(heat) {
    let out = STAGES[0];
    STAGES.forEach(x => { if (heat >= x.min) out = x; });
    return out;
  }
  function statusFor(heat) { return stageInfo(heat).name; }

  K.beef = {
    statusFor,

    ensure(artistId) {
      const s = K.state;
      s.beefs = s.beefs || {};
      if (!s.beefs[artistId]) {
        s.beefs[artistId] = {
          artistId, since: s.day, heat: 0, dissCount: 0, iDissedCount: 0,
          lastMoveDay: 0, status: "nötr", noted: false, reason: null,
          log: [], _stageLevel: 0
        };
      }
      return s.beefs[artistId];
    },

    get(artistId) { return (K.state.beefs || {})[artistId] || null; },

    list() {
      const s = K.state;
      return Object.values(s.beefs || {})
        .map(b => ({ ...b, artist: K.artistById(b.artistId) }))
        .filter(b => b.artist)
        .sort((a, b) => b.heat - a.heat);
    },

    isBeefing(artistId) {
      const b = K.beef.get(artistId);
      return !!b && b.heat >= 40;
    },

    /* sözlerde bir sanatçının adını/mahlasını bul → diss hedefi */
    detectTarget(text) {
      const t = (text || "").toLocaleLowerCase("tr");
      if (!t.trim()) return null;
      const players = K.artistList().filter(a => a.id !== "player");
      // önce mevcut husumet kayıtlarını tercih et
      const ordered = players.slice().sort((a, b) => {
        const ha = K.beef.get(a.id) ? K.beef.get(a.id).heat : 0;
        const hb = K.beef.get(b.id) ? K.beef.get(b.id).heat : 0;
        return hb - ha;
      });
      for (const a of ordered) {
        const names = [a.stageName].concat(a.aliases || []);
        for (const n of names) {
          const low = String(n).toLocaleLowerCase("tr").trim();
          if (low.length >= 3 && t.includes(low)) return a.id;
        }
      }
      return null;
    },

    /* DUAYEN: camianın saygı duyduğu, az konuşan büyük isimler */
    isDuayen(artistId) {
      const a = K.artistById(artistId);
      return !!a && a.popularity >= 80 && a.traits && a.traits.openness <= 6;
    },

    /* mentorluk: saygı kurduğun duayenler kalite bonusu verir */
    mentorBonus() {
      const s = K.state;
      if (!s) return 0;
      let n = 0;
      K.artistList().forEach(a => {
        if (!K.beef.isDuayen(a.id)) return;
        const rel = s.relations[a.id];
        if (rel && rel.affinity >= 70) n++;
      });
      return Math.min(6, n * 2);
    },

    /* duayen saygı/husumet çarpanı (camia tepkisi) */
    duayenEffect(artistId, tone) {
      if (!K.beef.isDuayen(artistId)) return null;
      if (tone === "respect") return { rep: 3.5, label: "camia saygı duydu" };
      if (tone === "diss") return { rep: -5, label: "camia tepki gösterdi" };
      return null;
    },

    /* sözlerde anılan sanatçılar + ton (saygı / diss / anılma) */
    detectMentions(text) {
      const t = (text || "").toLocaleLowerCase("tr");
      if (!t.trim()) return [];
      const out = [];
      const BAD = ["diss", "gönderme", "subliminal", "sahte", "kopya", "taklit", "boş", "yalan", "sustur", "yık", "kötü", "vasat", "beceriksiz", "palavra", "çöp", "seviyem", "küçük", "sönük"];
      const GOOD = ["saygı", "efsane", "kral", "helal", "tebrik", "usta", "hocam", "büyük", "hayran", "ilham", "respect", "seviyorum", "en iyi", "öncü", "duayen"];
      K.artistList().filter(a => a.id !== "player").forEach(a => {
        const names = [a.stageName].concat(a.aliases || []);
        let hit = null;
        for (const n of names) {
          const low = String(n).toLocaleLowerCase("tr").trim();
          if (low.length >= 3 && t.indexOf(low) >= 0) { hit = low; break; }
        }
        if (!hit) return;
        const idx = t.indexOf(hit);
        const near = t.slice(Math.max(0, idx - 70), idx + hit.length + 70);
        let bad = 0, good = 0;
        BAD.forEach(w => { if (near.indexOf(w) >= 0) bad++; });
        GOOD.forEach(w => { if (near.indexOf(w) >= 0) good++; });
        const tone = bad > good ? "diss" : (good > bad ? "respect" : "mention");
        out.push({ artistId: a.id, name: a.stageName, tone });
      });
      return out;
    },

    /* göndermeleri uygula: saygı ilişkiyi büyütür, diss husumet doğurur */
    applyMentions(mentions, song) {
      if (!mentions || !mentions.length) return;
      const p = K.state.player;
      mentions.forEach(m => {
        const a = K.artistById(m.artistId);
        if (!a) return;
        const du = K.beef.duayenEffect(m.artistId, m.tone);
        if (m.tone === "respect") {
          K.relations.addAffinity(m.artistId, 5, "saygi_gondermesi", { uncapped: true });
          p.reputation = Math.min(100, (p.reputation || 0) + 1.2 + (du ? du.rep : 0));
          K.toast("🤝 Saygı göndermesi", `${a.stageName} sözlerde anıldı; ilişki ısındı.` + (du ? " " + du.label + "." : ""), "ok");
        } else if (m.tone === "diss") {
          if (du) {
            p.reputation = Math.max(0, (p.reputation || 0) + du.rep);
            K.artistList().filter(x => K.beef.isDuayen(x.id)).forEach(x => {
              if (x.id !== m.artistId) K.relations.addAffinity(x.id, -2, "duayene_diss", { uncapped: true });
            });
            K.toast("⚠️ Camia tepkisi", `${a.stageName} bir duayen; camia bunu hoş karşılamadı.`, "bad");
          }
          K.beef.noteDissTrack(m.artistId, song);
          (K.labelmates ? K.labelmates(m.artistId) : []).forEach(id => {
            K.relations.addAffinity(id, -4, "sirket_arkadasi_diss", { uncapped: true });
          });
          if (du) return;
          const myLabel = K.state.player.labelId ? K.labelById(K.state.player.labelId) : null;
          const theirLabel = K.labelOfArtist ? K.labelOfArtist(m.artistId) : null;
          if (myLabel && theirLabel && myLabel.id === theirLabel.id) {
            p.reputation = Math.max(0, (p.reputation || 0) - 3);
            K.toast("⚠️ Şirket içi gerilim", "Aynı şirketteki bir ismi hedef aldın.", "bad");
          } else {
            K.toast("⚔️ Gönderme algılandı", `${a.stageName} hedef alınmış görünüyor.`, "warn");
          }
        } else {
          K.relations.addAffinity(m.artistId, 0.8, "anilma");
        }
      });
    },

    /* oyuncunun diss satırı (stüdyo için) */
    dissLine(artistId) {
      const a = K.artistById(artistId);
      const name = a ? a.stageName : "rakip";
      const lines = [
        `${name} konuşuyor ama sahnede yok`,
        `Mikrofonu al da gel ${name}, laf değil iş göster`,
        `${name} boyundan büyük laflar ediyor`,
        `Sen ${name}, beat'i bırak da önce flow öğren`
      ];
      return U.shuffle(lines).slice(0, 3).join("\n");
    },

    /* ---------------- sanatçı oyuncuya diss atar ---------------- */
    attack(artistId, opts) {
      opts = opts || {};
      const s = K.state, p = s.player;
      const a = K.artistById(artistId);
      if (!a) return null;
      const b = K.beef.ensure(artistId);
      b.heat = U.clamp(b.heat + U.randInt(14, 24), 0, 100);
      b.dissCount++;
      b.lastMoveDay = s.day;
      b.status = statusFor(b.heat);
      b.reason = opts.reason || U.pick(DISS_REASONS);
      b.noted = false;

      const line = (K.chat && K.chat.diss) ? K.chat.diss(artistId, p.stageName)
        : `@${p.stageName} konuşuyor ama iş yok.`;
      (b.log = b.log || []).push({ day: s.day, who: "them", text: line });
      if (b.log.length > 24) b.log.shift();

      // X gönderisi (sanatçı adına)
      s.feed = s.feed || {};
      const post = {
        id: U.uid("post"), platform: "x", authorId: artistId, authorName: a.stageName,
        text: line, day: s.day,
        likes: Math.round(a.popularity * U.rand(200, 900)),
        comments: Math.round(a.popularity * U.rand(5, 40)),
        shares: Math.round(a.popularity * U.rand(2, 25)),
        mine: false, diss: true
      };
      (s.feed.x = s.feed.x || []).unshift(post);
      s.feed.x = s.feed.x.slice(0, 60);

      // oyuncunun son şarkısına da yorum olarak düşsün (herkes görsün)
      const latest = (p.songs || []).slice().sort((x, y) => (y.publishedDay || 0) - (x.publishedDay || 0))[0];
      if (latest && K.interactions && K.interactions.addArtistComment) {
        K.interactions.addArtistComment("yt_" + latest.id, artistId, line, { kind: "diss", songId: latest.id });
      }

      // görünürlük: tartışma ün getirir
      p.popularity = U.clamp(p.popularity + 0.6, 0, 99);
      p.reputation = U.clamp(p.reputation - 0.3, 0, 100);

      K.toast("⚔️ " + a.stageName + " sana diss attı!", line.slice(0, 70), "bad");
      s.notifications = (s.notifications || []).concat([{
        title: "⚔️ " + a.stageName, msg: `Sana diss attı: "${line}"`, kind: "bad", day: s.day
      }]).slice(-60);

      // karar bekleyen olay (oyuncu stüdyodan cevap verebilir)
      if (!s.pendingIncident) {
        s.pendingIncident = {
          id: "beef_attack", tag: "HUSUMET", kind: "bad", artistId,
          title: a.stageName + " sana diss attı",
          desc: `"${line}"  —  Sebep: ${b.reason}. Stüdyoda söz yazıp cevap verebilir, barışabilir ya da yok sayabilirsin.`,
          choices: [
            { label: "Stüdyoda cevap ver (diss)", note: "ün +, husumet artar", run: () => K.beef.openDissStudio(artistId) },
            { label: "Barış teklif et", note: "husumet düşer", run: () => K.beef.respond(artistId, "peace") },
            { label: "Yok say", note: "görünürlük az", effects: { pop: 0.2 }, run: () => K.beef.respond(artistId, "ignore") }
          ]
        };
      }
      K.beef.escalate(artistId);
      K.save();
      return post;
    },

    attackRandom(reason) {
      const s = K.state, p = s.player;
      const cands = K.beef.list().filter(b => b.heat >= 30).map(b => b.artistId);
      (s.rivals || []).forEach(r => { if (!cands.includes(r.artistId)) cands.push(r.artistId); });
      const pool = K.artistList().filter(a => a.popularity <= p.popularity + 30 && !cands.includes(a.id));
      if (U.chance(0.5) && cands.length) return K.beef.attack(U.pick(cands), { reason });
      if (pool.length) return K.beef.attack(U.pick(pool).id, { reason });
      if (cands.length) return K.beef.attack(U.pick(cands), { reason });
      return null;
    },

    openDissStudio(artistId) {
      if (K.careerUI && K.careerUI.openStudioModal) K.careerUI.openStudioModal({ dissArtistId: artistId });
      return "modal";
    },

    /* ---------------- oyuncunun kararı ---------------- */
    respond(artistId, action) {
      const s = K.state, p = s.player;
      const a = K.artistById(artistId);
      if (!a) return;
      const b = K.beef.ensure(artistId);

      if (action === "diss") {
        K.beef.openDissStudio(artistId);
        return;
      }
      if (action === "peace") {
        const cost = 8000;
        if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `Barış için ${U.money(cost)} gerekiyor.`, "bad"); return; }
        K.economy.spend(cost, "peace");
        b.heat = U.clamp(b.heat - 28, 0, 100);
        b.status = statusFor(b.heat);
        b.noted = true;
        if (K.relation(artistId).met) K.relations.addAffinity(artistId, 4, "baris", { uncapped: true });
        K.relations.pushArtistMessage(artistId, "Saygı duydum, aramızda sorun yok. İşimize bakalım.", "system");
        K.toast("🤝 Barış teklif edildi", `${a.stageName} ile husumet azaldı.`, "ok");
      } else if (action === "ignore") {
        b.heat = U.clamp(b.heat - 5, 0, 100);
        b.status = statusFor(b.heat);
        K.toast("🙈 Görmezden geldin", "Husumet biraz azaldı.", "");
      }
      K.save(); K.refresh();
    },

    /* ---------------- oyuncu diss şarkısı yayınladı ---------------- */
    noteDissTrack(artistId, song) {
      const s = K.state, p = s.player;
      const a = K.artistById(artistId);
      const b = K.beef.ensure(artistId);
      b.iDissedCount++;
      b.heat = U.clamp(b.heat + 18, 0, 100);
      b.status = statusFor(b.heat);
      b.lastMoveDay = s.day;
      b.noted = false;

      if (song) {
        song.dissTarget = artistId;
        song.boosts = song.boosts || {};
        song.boosts.diss = (song.boosts.diss || 0) + 0.45;
        song.dailyStreams = (song.dailyStreams || 0) * 1.25;
        song.viralBonus = (song.viralBonus || 1) * 1.3;
      }
      p.popularity = U.clamp(p.popularity + 1.2, 0, 99);
      p.reputation = U.clamp(p.reputation - 0.8, 0, 100);

      (b.log = b.log || []).push({ day: s.day, who: "me", text: `Diss: "${song ? song.title : "Cevap"}"` });
      if (b.log.length > 24) b.log.shift();

      K.toast("🔥 Diss yayında!", `"${song ? song.title : "Cevap"}" ile ${a ? a.stageName : "rakibe"} cevap verdin.`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "🔥 Diss yayınlandı", msg: `${a ? a.stageName : "Rakip"} hedefli şarkın çıktı; husumet arttı.`,
        kind: "warn", day: s.day
      }]).slice(-60);

      K.beef.allySupport(artistId);
      K.beef.escalate(artistId);
    },

    /* ---------------- çete / müttefikler ---------------- */
    allies() {
      const s = K.state;
      return K.artistList()
        .map(a => ({ a, rel: s.relations[a.id] }))
        .filter(x => x.rel && x.rel.met && x.rel.affinity >= 65)
        .sort((p, q) => q.rel.affinity - p.rel.affinity)
        .map(x => x.a);
    },

    crewInfo() {
      const s = K.state;
      const members = (s.crew && s.crew.members)
        ? s.crew.members.map(id => K.artistById(id)).filter(Boolean) : [];
      const power = members.reduce((n, a) => n + a.popularity, 0);
      return { name: s.crew ? s.crew.name : null, founded: s.crew ? s.crew.founded : null, members, power };
    },

    promptFoundCrew() {
      const allies = K.beef.allies();
      const body = K.ui.field("Çete adı", `<input id="crew-name" value="${U.escape(K.state.player.stageName + " Krew")}" />`) +
        `<div style="font-size:11.5px;color:var(--text-2);line-height:1.6">
           Müttefikler: ${allies.slice(0, 6).map(a => U.escape(a.stageName)).join(", ") || "yok"}
           <br>Maliyet: ${U.money(50000)} · En az 3 müttefik gerekir. Çete; diss savaşlarında sana destek verir, görünürlük ve güç katar.
         </div>`;
      K.ui.modal({
        title: "🔥 Çete Kur", desc: "Müttefiklerini birleştir",
        body,
        actions: [
          { label: "Vazgeç" },
          { label: "Kur", cls: "btn-primary", onClick: () => {
            K.beef.foundCrew(U.qs("#crew-name").value.trim() || (K.state.player.stageName + " Krew"));
          } }
        ]
      });
    },

    foundCrew(name) {
      const s = K.state;
      const allies = K.beef.allies();
      if (allies.length < 3) { K.toast("Yeterli müttefik yok", "En az 3 sanatçıyla samimiyet 65+ olmalı.", "warn"); return false; }
      const cost = 50000;
      if (!K.economy.canAfford(cost)) { K.toast("Yetersiz bakiye", `Çete kurmak için ${U.money(cost)} gerekiyor.`, "bad"); return false; }
      K.economy.spend(cost, "crew");
      s.crew = { name: (name || (s.player.stageName + " Krew")), members: allies.slice(0, 5).map(a => a.id), founded: s.day, power: 0 };
      K.toast("🔥 Çete kuruldu", `${s.crew.name} · ${s.crew.members.length} üye`, "ok");
      s.notifications = (s.notifications || []).concat([{
        title: "🔥 Çete kuruldu", msg: `${s.crew.name} artık aktif; diss savaşlarında yanındalar.`, kind: "ok", day: s.day
      }]).slice(-60);
      K.save(); K.refresh();
      return true;
    },

    /* ---------------- dost sanatçılar destek verir (çeteleşme) ---------------- */
    allySupport(againstId) {
      K.beef.allySupportAgainst(againstId);
    },

    allySupportAgainst(againstId) {
      const s = K.state, p = s.player;
      const crewIds = (s.crew && s.crew.members) || [];
      const crewArtists = crewIds.map(id => K.artistById(id)).filter(Boolean);
      const others = K.beef.allies().filter(a => !crewArtists.some(x => x.id === a.id));
      const backers = crewArtists.concat(others).filter(a => a.id !== againstId).slice(0, s.crew ? 3 : 2);
      backers.forEach(a => {
        const text = U.pick([
          `@${p.stageName} haklı, gerçek iş ortada.`,
          `${p.stageName} sound'u sağlam, boş konuşanlar utansın.`,
          `Bu kapışmada @${p.stageName} yanındayım.`,
          `${p.stageName} tarafındayım, kalite kendini gösterir.`,
          `${s.crew ? s.crew.name + " tarafı net: " + p.stageName : p.stageName + " yalnız değilsin."}`
        ]);
        (s.feed.x = s.feed.x || []).unshift({
          id: U.uid("post"), platform: "x", authorId: a.id, authorName: a.stageName,
          text, day: s.day,
          likes: Math.round(a.popularity * U.rand(100, 600)),
          comments: Math.round(a.popularity * U.rand(3, 25)),
          shares: Math.round(a.popularity * U.rand(1, 15)),
          mine: false, support: true
        });
        s.feed.x = s.feed.x.slice(0, 60);
        K.toast("🤝 " + a.stageName, "Sana destek verdi (çeteleşme).", "ok");
      });
      if (backers.length) {
        p.reputation = U.clamp(p.reputation + backers.length * 0.4, 0, 100);
        if (againstId) {
          const b = K.beef.ensure(againstId);
          b.heat = U.clamp(b.heat + 2, 0, 100);
        }
      }
    },

    /* husumet seviyesi yükselince büyük olay (her seviyede bir kez) */
    escalate(artistId) {
      const s = K.state, p = s.player;
      const b = K.beef.ensure(artistId);
      const info = stageInfo(b.heat);
      if (b._stageLevel == null) b._stageLevel = 0;
      if (info.level <= b._stageLevel) return;
      b._stageLevel = info.level;
      const a = K.artistById(artistId);
      if (!a) return;
      if (info.level >= 4) {
        p.popularity = U.clamp(p.popularity + 1.6, 0, 99);
        p.reputation = U.clamp(p.reputation - 1, 0, 100);
        (s.feed.x = s.feed.x || []).unshift({
          id: U.uid("post"), platform: "x", authorId: artistId, authorName: a.stageName,
          text: U.pick(["Bu iş artık kişisel. Cevap gelecek.", "Savaş ilan edildi, mikrofon konuşacak.", "Artık geri dönüş yok, herkes görecek."]),
          day: s.day, likes: Math.round(a.popularity * U.rand(300, 900)),
          comments: U.randInt(50, 400), shares: U.randInt(20, 200), mine: false, diss: true
        });
        K.toast("⚔️ Açık savaş!", `${a.stageName} ile husumet açık savaşa döndü.`, "bad");
      } else if (info.level >= 3) {
        K.toast("🔥 Husumet büyüyor", `${a.stageName} ile gerilim arttı.`, "warn");
      }
    },

    /* ---------------- günlük tick ---------------- */
    dailyTick() {
      const s = K.state, p = s.player;
      s.beefs = s.beefs || {};

      Object.values(s.beefs).forEach(b => {
        const a = K.artistById(b.artistId);
        if (!a) return;
        const rel = K.relation(b.artistId);

        // doğal soğuma
        b.heat = U.clamp(b.heat - U.rand(0.4, 1.1), 0, 100);

        // dostluk husumeti eritir
        if (rel.affinity >= 75) b.heat = U.clamp(b.heat - 2.5, 0, 100);

        const gap = s.day - (b.lastMoveDay || 0);

        // tırmanma: yüksek husumet + zaman geçti → tekrar diss
        if (b.heat >= 45 && gap >= 6 && U.chance(0.16 + b.heat / 700)) {
          K.beef.attack(b.artistId);
          return;
        }

        // arkadaşlık: hem samimi hem husumet düştü
        if (rel.affinity >= 75 && b.heat < 15 && b.status !== "arkadaşlık") {
          b.status = "arkadaşlık";
          if (U.chance(0.5)) K.relations.pushArtistMessage(b.artistId, "Aramızdaki her şeyi geride bıraktık, artık dostuz.", "chat");
          return;
        }

        // ilgi düştü / unutuldu
        if (b.heat < 12 && gap > 18 && !b.noted) {
          b.noted = true;
          b.status = "soğudu";
          if (U.chance(0.4)) K.relations.pushArtistMessage(b.artistId, "Eski konuları kapattım, boş verelim. İşimize bakalım.", "chat");
          return;
        }

        b.status = statusFor(b.heat);
        K.beef.escalate(b.artistId);
      });

      // çete etkisi: güç, görünürlük ve itibar katar
      if (s.crew) {
        const ci = K.beef.crewInfo();
        s.crew.power = ci.power;
        // çete üyeleri kopabilir (samimiyet düşerse)
        s.crew.members = s.crew.members.filter(id => {
          const rel = s.relations[id];
          return rel && rel.affinity >= 55;
        });
        p.popularity = U.clamp(p.popularity + 0.08 + ci.members.length * 0.012, 0, 99);
        p.reputation = U.clamp(p.reputation + 0.05, 0, 100);
        if (s.crew.members.length === 0) {
          s.crew = null;
          K.toast("💤 Çete dağıldı", "Üyelerle samimiyet düştü, çete sona erdi.", "warn");
        }
      }

      // çete üyeleri bazen medyada sana destek verir
      if (s.crew && U.chance(0.03)) K.beef.allySupportAgainst(null);

      // yeni rastgele husumet (ün arttıkça daha olası)
      if (!s.pendingIncident && p.popularity >= 12 && U.chance(0.02 + p.popularity / 2500)) {
        K.beef.attackRandom("gündem olmak istiyor");
      }
      K.save();
    }
  };
})(window.K = window.K || {});
