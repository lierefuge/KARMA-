/* ============================================================
   KARMA — systems/goals.js
   HEDEFLER: başarımlar · haftalık görevler · takvim · başlangıç rehberi
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* ---------------- BAŞARIMLAR ---------------- */
  const ACH = [
    { id: "first_song",  icon: "🎵", name: "İlk Adım",     desc: "İlk şarkını yayınla",            reward: 5000,   check: p => p.songs.length >= 1 },
    { id: "five_songs",  icon: "📀", name: "Üretken",      desc: "5 şarkı yayınla",                reward: 20000,  check: p => p.songs.length >= 5 },
    { id: "ten_songs",   icon: "📚", name: "Katalog",      desc: "10 şarkı yayınla",               reward: 50000,  check: p => p.songs.length >= 10 },
    { id: "viral",       icon: "🔥", name: "Viral",        desc: "Bir şarkın viral olsun",         reward: 25000,  check: p => p.songs.some(s => s.viral) },
    { id: "million",     icon: "🎧", name: "Milyoner",     desc: "Toplam 1.000.000 dinlenme",      reward: 40000,  check: p => p.streams >= 1e6 },
    { id: "ten_million", icon: "🚀", name: "On Milyon",    desc: "Toplam 10.000.000 dinlenme",     reward: 150000, check: p => p.streams >= 1e7 },
    { id: "chart_top10", icon: "📈", name: "İlk 10",       desc: "Listede ilk 10'a gir",           reward: 30000,  check: p => p.songs.some(s => s.chartRank && s.chartRank <= 10) },
    { id: "number_one",  icon: "👑", name: "Zirve",        desc: "Listede 1 numara ol",            reward: 120000, check: (p, s) => !!(s.chart && s.chart[0] && s.chart[0].mine) },
    { id: "follow_100k", icon: "👥", name: "Kitle",        desc: "Toplam 100.000 takipçi",         reward: 30000,  check: p => (p.ig + p.tiktok + p.x + p.ytSubs) >= 100000 },
    { id: "follow_1m",   icon: "🌟", name: "Yıldız",       desc: "Toplam 1.000.000 takipçi",       reward: 150000, check: p => (p.ig + p.tiktok + p.x + p.ytSubs) >= 1e6 },
    { id: "first_feat",  icon: "🤝", name: "Ortak İş",     desc: "İlk feature'ını yap",            reward: 15000,  check: p => p.songs.some(s => s.featWith) },
    { id: "first_sync",  icon: "🎬", name: "Ekranda",      desc: "İlk sync anlaşman",              reward: 20000,  check: p => p.songs.some(s => s.sync && s.sync.length) },
    { id: "first_mv",    icon: "🎥", name: "Klip",         desc: "İlk klibini çek",                reward: 20000,  check: p => p.songs.some(s => s.mv) },
    { id: "first_show",  icon: "🎤", name: "Sahne",        desc: "İlk konserini ver",              reward: 10000,  check: (p, s) => (s.concerts || []).some(c => c.status === "tamamlandı") },
    { id: "first_list",  icon: "📻", name: "Listeye Girdin", desc: "Bir platform listesine gir",    reward: 18000,  check: (p, s) => (p.songs || []).some(x => (x.lists || []).some(e => !e.exitDay)) },
    { id: "first_radio", icon: "📡", name: "Radyoda",        desc: "Radyo prömiyeri yaşa",           reward: 15000,  check: (p, s) => (p.songs || []).some(x => x.boosts && x.boosts.radio_premiere) },
    { id: "first_store_all", icon: "🏪", name: "Tam Dağıtım", desc: "Bir yayını 8+ mağazaya gönder", reward: 22000, check: (p, s) => (p.releases || []).some(r => (r.stores || []).length >= 8) },
    { id: "ghost_free",   icon: "✍️", name: "Kendi Kalemin",  desc: "10 şarkıyı ghostwriter'sız çıkar", reward: 30000, check: p => (p.songs || []).filter(x => !x.ghost).length >= 10 },
    { id: "label_signed", icon: "🏢", name: "Sözleşme",      desc: "Bir şirketle anlaş",            reward: 25000,  check: p => !!p.labelId },
    { id: "respect_scene", icon: "🤝", name: "Saygı Kazan",   desc: "5 saygı göndermesi yap",        reward: 20000,  check: (p, s) => (p.songs || []).reduce((n, x) => n + ((x.mentions || []).filter(m => m.tone === "respect").length), 0) >= 5 },
    { id: "mentor",      icon: "🧙", name: "Mentor",         desc: "Bir duayenle 70+ samimiyet kur", reward: 40000,  check: (p, s) => (K.artistList ? K.artistList().some(a => K.beef && K.beef.isDuayen(a.id) && s.relations[a.id] && s.relations[a.id].affinity >= 70) : false) },
    { id: "arena",       icon: "🏟️", name: "Arena",        desc: "Arena'da konser ver",            reward: 60000,  check: (p, s) => (s.concerts || []).some(c => c.venueId === "arena" && c.status === "tamamlandı") },
    { id: "own_label",   icon: "🏢", name: "Patron",       desc: "Kendi şirketini kur",            reward: 50000,  check: (p, s) => !!s.label },
    { id: "superfan",    icon: "💜", name: "Süperfan",     desc: "Fan kulübü aç",                  reward: 15000,  check: p => !!p.fanClub },
    { id: "full_team",   icon: "🧑‍💼", name: "Ekip Tam",    desc: "Her ekip rolünden en az 1 al",   reward: 40000,  check: p => ["manager", "pr", "lawyer", "engineer", "stylist"].every(r => (p.team || {})[r] >= 1) }
  ];

  /* ---------------- HAFTALIK GÖREV HAVUZU ---------------- */
  const METRICS = {
    songs:    s => s.player.songs.length,
    streams:  s => s.player.streams,
    messages: s => Object.keys(s.relations || {}).reduce((n, k) => n + (s.relations[k].interactions || 0), 0),
    concerts: s => (s.concerts || []).filter(c => c.status === "tamamlandı").length,
    posts:    s => ["ig", "x", "tiktok", "youtube"].reduce((n, k) => n + (s.feed[k] || []).filter(p => p.mine).length, 0),
    earned:   s => s.player.totalEarned,
    followers: s => s.player.ig + s.player.tiktok + s.player.x + s.player.ytSubs
  };

  const QUEST_POOL = [
    { id: "release",  icon: "💿", name: "Haftanın Yayını", desc: "1 şarkı yayınla",              metric: "songs",     target: 1,      reward: 25000 },
    { id: "streams1", icon: "🎧", name: "Dinlenme I",      desc: "50.000 yeni dinlenme",         metric: "streams",   target: 50000,  reward: 20000 },
    { id: "streams2", icon: "🎧", name: "Dinlenme II",     desc: "250.000 yeni dinlenme",        metric: "streams",   target: 250000, reward: 60000 },
    { id: "network",  icon: "💬", name: "Ağ Kur",          desc: "12 sanatçı etkileşimi",        metric: "messages",  target: 12,     reward: 20000 },
    { id: "stage",    icon: "🎤", name: "Sahne Al",        desc: "1 konser tamamla",             metric: "concerts",  target: 1,      reward: 30000 },
    { id: "content",  icon: "📸", name: "Görünür Ol",      desc: "6 sosyal gönderi paylaş",      metric: "posts",     target: 6,      reward: 18000 },
    { id: "money",    icon: "💰", name: "Gelir Hedefi",    desc: "150.000 kazanç",               metric: "earned",    target: 150000, reward: 25000 },
    { id: "fans",     icon: "👥", name: "Kitle Büyüt",     desc: "25.000 yeni takipçi",          metric: "followers", target: 25000,  reward: 22000 }
  ];

  /* ---------------- BAŞLANGIÇ REHBERİ ---------------- */
  const TUTORIAL = [
    { id: "identity", icon: "🪪", text: "Sahne kimliğini oluştur",        hint: "Giriş ekranı",                 done: s => !!s.player.realName },
    { id: "song",     icon: "🎵", text: "Stüdyodan ilk şarkını üret",     hint: "Sol panel → Stüdyo",           done: s => s.player.releases.length > 0 || s.player.songs.length > 0 },
    { id: "release",  icon: "💿", text: "İlk yayınını çıkar",             hint: "Stüdyo → Yayın Sırasına Ekle", done: s => s.player.songs.length > 0 },
    { id: "pitch",    icon: "📻", text: "Yayın öncesi playlist pitch yap", hint: "Yayınlar → Playlist Pitch",    done: s => s.player.releases.some(r => r.playlistPitch) || (s.player.songs || []).some(x => x.playlists && x.playlists.length) },
    { id: "promo",    icon: "📣", text: "Şarkını sosyalde tanıt",         hint: "Yayınlar → sosyal tanıtım",    done: s => (s.player.songs || []).some(x => x.socialPromo) },
    { id: "dm",       icon: "💬", text: "Telefondan bir sanatçıya yaz",   hint: "Telefon → Mesajlar → Yeni DM", done: s => (s.player.messagesSentToday > 0) || Object.keys(s.relations || {}).some(k => (s.relations[k].interactions || 0) > 0) },
    { id: "snippet",  icon: "🎬", text: "Kısa video (ses trendi) başlat", hint: "Yayınlar → Kısa video",        done: s => (s.player.songs || []).some(x => x.sound && x.sound.startedDay) },
    { id: "show",     icon: "🎫", text: "Bir konser planla",              hint: "Kariyer → Konser & Turne",     done: s => (s.concerts || []).length > 0 }
  ];

  K.goals = {
    ACH, TUTORIAL, QUEST_POOL, METRICS,

    /* ---------------- başarımlar ---------------- */
    achievements() {
      const p = K.state.player, s = K.state;
      return ACH.map(a => ({ ...a, unlocked: !!p.achievements[a.id], day: p.achievements[a.id] || null }));
    },

    checkAchievements() {
      const p = K.state.player, s = K.state;
      ACH.forEach(a => {
        if (p.achievements[a.id]) return;
        let ok = false;
        try { ok = !!a.check(p, s); } catch (e) { ok = false; }
        if (ok) {
          p.achievements[a.id] = s.day;
          if (a.reward) K.economy.earn(a.reward, "achievement");
          K.toast("🏆 Başarım: " + a.name, a.desc + " · +" + U.money(a.reward || 0), "ok");
          s.notifications = (s.notifications || []).concat([{
            title: "🏆 " + a.icon + " " + a.name, msg: a.desc + (a.reward ? " · ödül " + U.money(a.reward) : ""), kind: "ok", day: s.day
          }]).slice(-60);
        }
      });
    },

    /* ---------------- haftalık görevler ---------------- */
    weekNo(s) { return Math.floor(((s || K.state).day - 1) / 7); },

    refreshQuests(force) {
      const s = K.state;
      const wk = K.goals.weekNo(s);
      if (!force && s.quests && s.quests.week === wk) return;
      const picked = U.shuffle(QUEST_POOL.slice()).slice(0, 3);
      s.quests = {
        week: wk,
        list: picked.map(q => ({
          id: q.id, icon: q.icon, name: q.name, desc: q.desc,
          metric: q.metric, base: METRICS[q.metric](s), target: q.target, reward: q.reward, done: false
        }))
      };
      if (!force) {
        K.toast("🎯 Yeni görevler", "Bu haftanın 3 görevi hazır.", "ok");
        s.notifications = (s.notifications || []).concat([{
          title: "🎯 Haftalık görevler", msg: s.quests.list.map(x => x.name).join(" · "), kind: "ok", day: s.day
        }]).slice(-60);
      }
    },

    checkQuests() {
      const s = K.state;
      if (!s.quests) return;
      s.quests.list.forEach(q => {
        if (q.done) return;
        const cur = METRICS[q.metric] ? METRICS[q.metric](s) : 0;
        if (cur - q.base >= q.target) {
          q.done = true;
          q.doneDay = s.day;
          if (q.reward) K.economy.earn(q.reward, "quest");
          K.toast("✅ Görev tamam", q.name + " · +" + U.money(q.reward), "ok");
          s.notifications = (s.notifications || []).concat([{
            title: "✅ Görev: " + q.name, msg: q.desc + " · ödül " + U.money(q.reward), kind: "ok", day: s.day
          }]).slice(-60);
        }
      });
    },

    questProgress() {
      const s = K.state;
      if (!s.quests) return { week: 0, list: [] };
      return {
        week: s.quests.week,
        list: s.quests.list.map(q => {
          const cur = METRICS[q.metric] ? METRICS[q.metric](s) : 0;
          const prog = U.clamp(cur - q.base, 0, q.target);
          return { ...q, progress: prog, pct: Math.round((prog / q.target) * 100) };
        })
      };
    },

    /* ---------------- başlangıç rehberi ---------------- */
    tutorial() {
      const s = K.state;
      return TUTORIAL.map(t => ({ ...t, done: !!s.player.tutorial[t.id] }));
    },

    checkTutorial() {
      const s = K.state;
      TUTORIAL.forEach(t => {
        if (s.player.tutorial[t.id]) return;
        let ok = false;
        try { ok = !!t.done(s); } catch (e) { ok = false; }
        if (ok) {
          s.player.tutorial[t.id] = true;
          K.toast("🧭 Rehber: " + t.text, "Tamamlandı ✓", "ok");
        }
      });
    },

    tutorialDonePct() {
      const list = K.goals.tutorial();
      const n = list.filter(x => x.done).length;
      return Math.round((n / list.length) * 100);
    },

    /* ---------------- TAKVİM ---------------- */
    calendar(limit) {
      const s = K.state;
      const ev = [];
      // yayın hattı
      (s.player.releases || []).forEach(r => {
        const d = r.startDay + r.waitDays;
        ev.push({ day: d, icon: "💿", title: r.title + " yayını", kind: "release" });
      });
      // konserler
      (s.concerts || []).filter(c => c.status === "planlandı").forEach(c => {
        ev.push({ day: c.day, icon: "🎤", title: c.city + " konseri", kind: "concert" });
      });
      // turne durakları
      if (s.tour && s.tour.queue) s.tour.queue.forEach(q => {
        ev.push({ day: q.day, icon: "🚌", title: q.city + " (turne)", kind: "tour" });
      });
      // ödül töreni
      const nextAward = (s.awards && s.awards.lastDay ? s.awards.lastDay + 360 : 361);
      ev.push({ day: nextAward, icon: "🏆", title: "Müzik Ödülleri", kind: "award" });
      // görev yenilenmesi
      ev.push({ day: (K.goals.weekNo(s) + 1) * 7 + 1, icon: "🎯", title: "Yeni haftalık görevler", kind: "quest" });
      // sponsor bitişleri
      (s.player.sponsors || []).forEach(sp => ev.push({ day: sp.untilDay, icon: sp.icon || "💼", title: sp.name + " anlaşması bitiyor", kind: "sponsor" }));
      // sözleşme bitişi
      if (s.player.labelDeal && s.player.labelDeal.startDay) {
        ev.push({ day: s.player.labelDeal.startDay + (s.player.labelDeal.lengthDays || 180), icon: "🏢", title: "Şirket sözleşmesi bitiyor", kind: "contract" });
      }
      ev.sort((a, b) => a.day - b.day);
      const out = ev.filter(e => e.day >= s.day);
      return (limit ? out.slice(0, limit) : out);
    },

    /* ---------------- günlük tick ---------------- */
    tick() {
      K.goals.refreshQuests();
      K.goals.checkAchievements();
      K.goals.checkQuests();
      K.goals.checkTutorial();
    }
  };
})(window.K = window.K || {});
