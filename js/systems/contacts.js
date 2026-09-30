/* ============================================================
   KARMA — systems/contacts.js
   MAHALLE / SEMT ÇEVRESİ  (tanınmayan ama gerçek kişiler)

   Neden var?
     Gerçeklik kuralı: sen daha 1-4 şarkı çıkarmış, kimsenin
     tanımadığı bir sanatçıyken HİÇBİR ünlü sana kendiliğinden
     DM atmaz. O boşluğu "boş mesaj" ile değil, gerçek bir sosyal
     çevre ile dolduruyoruz:
       • mahalle arkadaşı, kuzen, eski okul arkadaşı
       • semt rapçisi / alt kat komşu prodüktör
       • mahalli DJ, mahalli blog yazarı, hardcore fan
       • semtte rakip çıkmış çocuk (önce laf, sonra saygı)

   Her kişi:
     • KALICI bir karakter (isim, yüz, kişilik, kendi projesi)
     • DM'i bir OLAYA bağlı yazar (yeni şarkın, listeye girmen,
       viral olman, gündem, sessiz kalman, kendi işi)
     • sohbeti hatırlar ve sürdürür (chat.js hafızasını kullanır)

   Sanatçı-benzeri bir kayıt tutar; böylece ilişki (affinity),
   thread, chat motoru ve Mesajlar uygulaması onları da işler.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- küçük hash (deterministik) ---------- */
  function h(str) {
    let x = 2166136261;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return (x >>> 0);
  }
  const hpick = (arr, seed) => arr[h(seed) % arr.length];

  /* ============================================================
     ROL ŞABLONLARI
     Her rolün kendi kişiliği, meslek amacı, ses tonu ve temaları var.
     ============================================================ */
  const ROLES = {
    mahalle: {
      label: "Mahalle Arkadaşı", icon: "🏘️", badge: "mahalle",
      traits: { openness: 9, loyalty: 9, ego: 3, work: 5 },
      affStart: [58, 76],
      palette: ["#2f4f6f", "#7fb2d9", "#c98b5a", "#2b2b33"],
      bio: "Yıllardır tanıdığın çocukluk arkadaşı. Müzikten çok seni merak eder.",
      themes: ["hal hatır", "geçmiş", "aile", "para sıkıntısı", "mahalle"]
    },
    kuzen: {
      label: "Kuzen", icon: "🧑‍🤝‍🧑", badge: "aile",
      traits: { openness: 10, loyalty: 10, ego: 5, work: 4 },
      affStart: [62, 82],
      palette: ["#5a2f52", "#d97fb2", "#c98b5a", "#2b2b33"],
      bio: "Kuzenin. Seni herkesten çok pohpohlar, bazen fazla abartır.",
      themes: ["övünç", "aile", "tanıtım", "mahalle", "komik"]
    },
    semtrapci: {
      label: "Semt Rapçisi", icon: "🎙️", badge: "muzik",
      traits: { openness: 7, loyalty: 6, ego: 7, work: 8 },
      affStart: [44, 62],
      palette: ["#3b2f6b", "#8a6fe0", "#b07a55", "#20202a"],
      bio: "Aynı semtte büyüdüğünüz, senin gibi başlamaya çalışan rapçi. Hem dost hem rakip.",
      themes: ["feature", "diss", "beat", "sahne", "kıyas"]
    },
    producer: {
      label: "Semt Prodüktörü", icon: "🥁", badge: "beat",
      traits: { openness: 8, loyalty: 7, ego: 4, work: 9 },
      affStart: [48, 68],
      palette: ["#1f4b45", "#5fd0b4", "#b07a55", "#1c1c22"],
      bio: "Evinde beat yapan komşu çocuk. Sürekli çalışır, sürekli beat atar.",
      themes: ["beat", "altyapı", "kayıt", "mix", "fiyat"]
    },
    dj: {
      label: "Mahalli DJ", icon: "🎧", badge: "dj",
      traits: { openness: 8, loyalty: 6, ego: 6, work: 6 },
      affStart: [46, 64],
      palette: ["#4b2f1f", "#e0a06f", "#b07a55", "#1a1a20"],
      bio: "Semtteki kulüp ve düğünlerin DJ'i. Şarkını çalmak ister.",
      themes: ["çalmak", "remix", "kulüp", "ses trendi"]
    },
    blogger: {
      label: "Mahalli Blog Yazarı", icon: "📰", badge: "basın",
      traits: { openness: 7, loyalty: 4, ego: 8, work: 8 },
      affStart: [40, 58],
      palette: ["#2f3f2f", "#8fd07f", "#c98b5a", "#20201c"],
      bio: "Bağımsız müzik yazıyor. Bir yazıyla seni görünür yapabilir ya da eleştirebilir.",
      themes: ["röportaj", "inceleme", "yazı", "gündem"]
    },
    fan: {
      label: "Hardcore Fan", icon: "💜", badge: "fan",
      traits: { openness: 9, loyalty: 10, ego: 2, work: 3 },
      affStart: [70, 90],
      palette: ["#5a1f3a", "#e07fa0", "#c98b5a", "#1c1c24"],
      bio: "İlk şarkından beri seni dinliyor. Her yeni işte ilk yorumu o yazar.",
      themes: ["övgü", "istek", "duygusal", "konser"]
    },
    lyricist: {
      label: "Söz Yazarı", icon: "✍️", badge: "söz",
      traits: { openness: 6, loyalty: 5, ego: 7, work: 9 },
      affStart: [38, 56],
      palette: ["#3f3a1f", "#d0c060", "#c98b5a", "#1e1e1a"],
      bio: "Defterinde yüzlerce dize var. Sözlerini birinin söylemesini bekliyor.",
      themes: ["söz", "tema", "gündem", "eşleşme"]
    },
    manager: {
      label: "Menajer Adayı", icon: "📋", badge: "iş",
      traits: { openness: 5, loyalty: 5, ego: 8, work: 9 },
      affStart: [34, 50],
      palette: ["#2a2f3f", "#7f8fbf", "#c98b5a", "#18181e"],
      bio: "Kendini kanıtlamaya çalışan genç bir menajer. Seni büyütmek istiyor, karşılığında pay istiyor.",
      themes: ["kariyer", "iş", "plan", "sözleşme", "pay"]
    },
    rakip: {
      label: "Semt Rakibi", icon: "⚔️", badge: "rakip",
      traits: { openness: 3, loyalty: 2, ego: 10, work: 7 },
      affStart: [8, 22],
      palette: ["#4b1f1f", "#e06f6f", "#b07a55", "#1a1a18"],
      bio: "Aynı semtte büyüyen, seni kendine rakip gören çocuk. Önce laf atar; saygı kazanılırsa yumuşar.",
      themes: ["laf", "kıyas", "diss", "saygı"]
    },
    abi: {
      label: "Mahalle Abisi", icon: "🫱", badge: "ağabey",
      traits: { openness: 7, loyalty: 9, ego: 6, work: 7 },
      affStart: [52, 70],
      palette: ["#2f2a1f", "#b09a6f", "#a8764f", "#1e1e1a"],
      bio: "Mahallenin sayılan abisi. Sana kol kanat gerer, yanlışa yanlış der.",
      themes: ["öğüt", "yol", "sabır", "para", "mahalle"]
    }
  };

  /* ---------- isim havuzları ---------- */
  const NAMES = {
    mahalle: ["Emre", "Kadir", "Serkan", "Burak", "Onur", "Tolga", "Yusuf", "Ferhat", "Cengiz", "Eren"],
    kuzen: ["Berkay", "Umut", "Selin", "Buse", "Melis", "Efe", "Kaan", "Nisa", "Görkem", "Ayça"],
    semtrapci: ["Berat", "Mert", "Uğur", "Sefa", "Rıdvan", "Ali", "Halil", "Tuncay", "Volkan", "Doğan"],
    producer: ["Barış", "Sinan", "Koray", "Deniz", "Furkan", "Ozan", "Batuhan", "Kerem", "Taner", "Remzi"],
    dj: ["Cihan", "Barış", "Aykut", "Sercan", "Mutlu", "Tayfun", "Erdem", "Gökhan", "Bilal", "Sedat"],
    blogger: ["Hakan", "Defne", "Yasemin", "Pelin", "Deniz", "Arda", "Nazlı", "Cem", "Işıl", "Tuna"],
    fan: ["Zeynep", "Elif", "Merve", "Aslı", "Damla", "Büşra", "Gizem", "Ceren", "İdil", "Sude"],
    lyricist: ["Şair", "Mahir", "Nuri", "Sait", "Vedat", "Ayla", "Feride", "Kemal", "Sabri", "Mevlüt"],
    manager: ["Tolga", "Sinem", "Erhan", "Pınar", "Cihan", "Bora", "Sena", "Alper", "Derya", "Serdar"],
    rakip: ["Yiğit", "Cihan", "Sinan", "Umut", "Hakan", "Burak", "Tolga", "Kaan", "Doğan", "Berk"],
    abi: ["Recep", "Necmi", "Salih", "Hasan", "İsmail", "Şükrü", "Ramazan", "Metin", "Kadir", "Yılmaz"]
  };
  const SURNAMES = ["Yıldız", "Demir", "Kaya", "Şahin", "Çelik", "Aydın", "Arslan", "Doğan", "Kılıç", "Aslan",
    "Koç", "Kurt", "Özdemir", "Erdoğan", "Yavuz", "Türk", "Polat", "Bulut", "Güneş", "Ateş"];
  const SEMT = ["Çukur", "Gültepe", "Kartal", "Bağcılar", "Esenler", "Sultanbeyli", "Kağıthane", "Tarlabaşı",
    "Keçiören", "Mamak", "Buca", "Kadifekale", "Yüreğir", "Selçuklu", "Eryaman", "Şahinbey"];
  const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Adana", "Konya", "Gaziantep", "Diyarbakır", "Samsun", "Kayseri"];

  const RAP_HANDLES = ["MC {n}", "{n} 34", "Lil {n}", "{n}Flow", "{n} TR", "Young {n}", "Kral {n}"];
  const PRODUCER_TAGS = ["{n}Beats", "DJ {n}", "{n}OnTheBeat", "{n}Prod"];
  const HANDLE_STYLES = {
    semtrapci: RAP_HANDLES, producer: PRODUCER_TAGS,
    dj: ["DJ {n}", "{n}Mix", "{n}Selecta"], blogger: ["{n}Kültür", "{n}Blog", "Ses {n}"],
    fan: ["{n}Fan", "{n}Army", "{n}Hayran"], lyricist: ["{n}Dize", "Kalem {n}", "{n}Söz"],
    manager: ["{n}Management", "{n}MGMT", "{n}Entertainment"], rakip: RAP_HANDLES, abi: ["{n}Abi", "Koca {n}", "{n}Baba"],
    mahalle: ["{n}", "{n}Kanka"], kuzen: ["{n}", "{n}Kuzen"]
  };

  /* ============================================================
     AVATAR — deterministik, tam çizilmiş portre (SVG data URI)
     Gerçek fotoğraf yok; her kişinin kendine ait yüzü var.
     ============================================================ */
  const SKIN = ["#f2c9a4", "#e8b98d", "#d9a273", "#c98b5a", "#a8764f", "#8a5c3a"];
  const HAIR = ["#1b1b1f", "#2b2119", "#3d2a1a", "#111", "#4a3524", "#5c4632", "#7a5c3f", "#232323"];

  function avatarSVG(c) {
    const seed = ("av:" + c.id + ":" + c.stageName);
    const H = h(seed);
    const skin = SKIN[(H >>> 3) % SKIN.length];
    const hair = HAIR[(H >>> 7) % HAIR.length];
    const [bg1, bg2] = [hpick(c.palette, seed + "a"), hpick(c.palette, seed + "b")];
    const style = (H >>> 5) % 5;                 // saç modeli
    const acc = (H >>> 11) % 6;                   // aksesuar
    const eye = (H >>> 13) % 3;
    const female = (H >>> 17) % 2;

    const hairPath = [
      // 0: kısa buzz
      `<path d="M34 46 Q34 22 64 22 Q94 22 94 46 L94 40 Q64 30 34 40 Z" fill="${hair}"/>`,
      // 1: hacimli saç
      `<path d="M28 52 Q26 18 64 18 Q102 18 100 52 Q96 30 64 30 Q32 30 28 52 Z" fill="${hair}"/>`,
      // 2: kıvırcık
      `<g fill="${hair}"><circle cx="40" cy="32" r="11"/><circle cx="64" cy="24" r="13"/><circle cx="88" cy="32" r="11"/><circle cx="52" cy="24" r="9"/><circle cx="76" cy="24" r="9"/></g>`,
      // 3: düz uzun
      `<path d="M30 46 Q30 18 64 18 Q98 18 98 46 L98 78 Q92 60 88 46 Q64 34 40 46 Q36 60 30 78 Z" fill="${hair}"/>`,
      // 4: kel/sakal
      `<path d="M38 44 Q40 30 64 30 Q88 30 90 44 Q64 36 38 44 Z" fill="${hair}"/>`
    ][style];

    const beard = (!female && (H >>> 19) % 3 === 0)
      ? `<path d="M42 66 Q64 96 86 66 Q84 84 64 90 Q44 84 42 66 Z" fill="${hair}" opacity=".92"/>` : "";

    const accLayer = [
      // 0: bone
      `<path d="M30 40 Q30 16 64 16 Q98 16 98 40 L98 44 L86 44 Q64 30 42 44 L30 44 Z" fill="#1f1f27"/><rect x="30" y="40" width="68" height="7" rx="3" fill="#2c2c38"/>`,
      // 1: kulaklık
      `<path d="M26 56 Q26 20 64 20 Q102 20 102 56 L94 56 Q94 28 64 28 Q34 28 34 56 Z" fill="#17171d"/><rect x="22" y="50" width="14" height="22" rx="6" fill="#e8e8f0"/><rect x="92" y="50" width="14" height="22" rx="6" fill="#e8e8f0"/>`,
      // 2: gözlük
      `<g stroke="#18181e" stroke-width="3" fill="none"><rect x="38" y="50" width="22" height="16" rx="6"/><rect x="68" y="50" width="22" height="16" rx="6"/><path d="M60 58 h8"/></g>`,
      // 3: zincir
      `<path d="M48 92 Q64 106 80 92" stroke="#e8c15c" stroke-width="5" fill="none"/><circle cx="64" cy="102" r="5" fill="#f0cf70"/>`,
      // 4: şapka
      `<ellipse cx="64" cy="36" rx="42" ry="10" fill="#26262f"/><path d="M36 36 Q36 14 64 14 Q92 14 92 36 Z" fill="#33333f"/>`,
      // 5: yok
      ``
    ][acc];

    const earring = female ? `<circle cx="30" cy="66" r="3" fill="#f0cf70"/><circle cx="98" cy="66" r="3" fill="#f0cf70"/>` : "";
    const eyeShape = eye === 0
      ? `<circle cx="52" cy="59" r="3.4" fill="#20202a"/><circle cx="76" cy="59" r="3.4" fill="#20202a"/>`
      : eye === 1
        ? `<ellipse cx="52" cy="59" rx="4.4" ry="3" fill="#20202a"/><ellipse cx="76" cy="59" rx="4.4" ry="3" fill="#20202a"/>`
        : `<rect x="47" y="56.5" width="10" height="5" rx="2.5" fill="#20202a"/><rect x="71" y="56.5" width="10" height="5" rx="2.5" fill="#20202a"/>`;

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>` +
      `<rect width="128" height="128" fill="url(#g)"/>` +
      `<circle cx="64" cy="118" r="60" fill="#000" opacity=".16"/>` +
      `<path d="M22 128 Q24 92 64 88 Q104 92 106 128 Z" fill="${hpick(c.palette, seed + "shirt")}"/>` +
      `<rect x="56" y="78" width="16" height="16" fill="${skin}"/>` +
      `<ellipse cx="64" cy="60" rx="30" ry="34" fill="${skin}"/>` +
      earring + hairPath + beard +
      `<path d="M46 52 Q52 48 58 52" stroke="${hair}" stroke-width="2.6" fill="none"/>` +
      `<path d="M70 52 Q76 48 82 52" stroke="${hair}" stroke-width="2.6" fill="none"/>` +
      eyeShape +
      `<path d="M64 62 l-4 8 q4 3 8 0" fill="none" stroke="#00000022" stroke-width="2"/>` +
      `<path d="M56 78 Q64 84 72 78" stroke="#8a3a3a" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
      accLayer +
      `</svg>`;

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ============================================================
     ROSTER ÜRETİMİ — her oyunda kalıcı, deterministik çevre
     ============================================================ */
  const ROSTER_SPEC = [
    ["mahalle", 2], ["kuzen", 1], ["semtrapci", 2], ["producer", 1],
    ["dj", 1], ["blogger", 1], ["fan", 1], ["lyricist", 1],
    ["manager", 1], ["rakip", 1], ["abi", 1]
  ];

  function makeContact(roleId, idx, playerName) {
    const R = ROLES[roleId];
    const seed = roleId + ":" + idx + ":" + (playerName || "KARMA");
    const H = h(seed);
    const city = CITIES[(H >>> 5) % CITIES.length];
    const semt = SEMT[(H >>> 9) % SEMT.length];
    const first = hpick(NAMES[roleId], seed + "n");
    const lastN = SURNAMES[(H >>> 13) % SURNAMES.length];
    const style = HANDLE_STYLES[roleId];
    const handle = hpick(style, seed + "h").replace(/\{n\}/g, first);
    const isNamed = roleId === "mahalle" || roleId === "kuzen" || roleId === "abi";
    const stageName = isNamed ? (first + " " + hpick(["", "", lastN], seed + "s")).trim() : handle;

    const pop = Math.round(U.clamp(
      roleId === "fan" ? U.rand(1, 6)
      : roleId === "rakip" ? U.rand(4, 14)
      : roleId === "blogger" ? U.rand(6, 16)
      : U.rand(1, 9), 1, 18));

    const fm = U.clamp(0.5 + ((H >>> 15) % 25) / 10, 0.5, 3.0);

    return {
      id: "c_" + roleId + "_" + idx,
      isContact: true,
      stageName,
      realName: first + " " + lastN,
      firstName: first,
      age: 17 + ((H >>> 21) % 16),
      role: roleId,
      roleLabel: R.label,
      roleIcon: R.icon,
      badge: R.badge,
      city, semt,
      genre: hpick(["rap", "trap", "drill", "boombap", "rnb", "pop"], seed + "g"),
      labelId: null,
      popularity: pop,
      monthly: Math.round(pop * 900 * fm + U.randInt(200, 4000)),
      streams: Math.round(pop * 120000 * fm),
      ytSubs: Math.round(pop * 900 * fm),
      ig: Math.round(pop * 1600 * fm),
      x: Math.round(pop * 700 * fm),
      tiktok: Math.round(pop * 2200 * fm),
      chartPeak: 999,
      traits: R.traits,
      affinityStart: Math.round(U.rand(R.affStart[0], R.affStart[1])),
      bio: R.bio,
      themes: R.themes,
      palette: R.palette,
      photo: avatarSVG({ id: "c_" + roleId + "_" + idx, stageName, palette: R.palette }),
      /* kişilik ağzı: argo/sokak/samimi/efendi */
      speech: roleId === "rakip" ? "sert" : roleId === "abi" ? "ogut" : roleId === "blogger" ? "resmi" : "samimi",
      /* kişinin kendi projesi (boş mesaj olmaması için) */
      project: hpick([
        "yeni beat", "mini konser", "mixtape", "mahalle kaydı", "blog yazısı",
        "kulüp gecesi", "söz defteri", "fan kulübü", "demo kaydı", "sokak röportajı"
      ], seed + "p")
    };
  }

  K.contacts = {
    ROLES,
    _cache: null,

    /* ---------- roster ---------- */
    ensureRoster() {
      const s = K.state;
      if (!s) return [];
      if (!s.player) return [];
      s.contacts = s.contacts || [];
      if (s.contacts.length) return s.contacts;
      const out = [];
      ROSTER_SPEC.forEach(([role, n]) => {
        for (let i = 0; i < n; i++) out.push(makeContact(role, i, s.player && s.player.stageName));
      });
      s.contacts = out;
      out.forEach(c => { K.relation(c.id); K.thread(c.id); });
      return s.contacts;
    },

    list() { K.contacts.ensureRoster(); return (K.state && K.state.contacts) || []; },

    byId(id) {
      if (!id) return null;
      if (id.indexOf("c_") !== 0) {
        /* v10.30 — yabancı DM gönderenleri (hayran/dolandırıcı/gazeteci)
           de sanatçı-benzeri kayıt olarak çözülsün. */
        return (K.dms && K.dms.byId) ? K.dms.byId(id) : null;
      }
      return K.contacts.list().find(c => c.id === id) || null;
    },

    byName(name) {
      if (!name) return null;
      const q = String(name).toLowerCase().trim();
      return K.contacts.list().find(c =>
        c.stageName.toLowerCase() === q || (c.realName || "").toLowerCase() === q) || null;
    },

    avatar(id) {
      const c = K.contacts.byId(id);
      return c ? c.photo : null;
    },

    /* ============================================================
       SOHBET PROFİLİ — chat.js bu havuzları kullanır
       ============================================================ */
    profile(id) {
      const c = K.contacts.byId(id);
      if (!c) return null;
      const me = (K.state.player && K.state.player.stageName) || "KARMA";
      const first = c.stageName.split(" ")[0];
      const P = (o) => Object.assign({
        pool: {},
        extras: [
          `${first} olarak konuşuyorum, kusura bakma biraz uzun yazdım.`,
          "Bu aralar " + c.semt + "'teyim, görüşelim.",
          "Sen yazdıkça seviniyorum, iyi oluyor."
        ]
      }, o);

      const COMMON = {
        greet: [`Selam ${me}, naber lan?`, "Ya sen ya, uzun zaman oldu.", "Selam kanka, ne var ne yok?", "Oo hoş geldin, nasıl gidiyor?"],
        howareyou: ["İyiyim ben, sen nasılsın?", "İyidir, " + c.project + " ile uğraşıyorum. Sen?", "Fena değil, hayat mücadele. Sen nasılsın?"],
        thanks: ["Eyvallah kardeşim, ne demek.", "Sağ ol lan, canın sağ olsun.", "Rica ederim, her zaman."],
        shortyes: ["Tamam, anlaştık.", "He, olur.", "Tamamdır."],
        shortno: ["Yok kanka, olmaz.", "Şimdi değil, kusura bakma.", "Yok ya, öyle olmaz."],
        laugh: ["Hahaha koptum.", "Ulan güldürdün beni.", "Şaka maka iyiydi."],
        bye: ["Hadi görüşürüz, kendine iyi bak.", "Tamam kanka, sonra konuşuruz.", "Kaçtım ben, öptüm."],
        thanks2: []
      };

      const roleExtra = {
        mahalle: {
          family: ["Anne baban nasıl lan? Selam söyle.", "Aileyi ihmal etme, bu işler bitmez.", "Geçen mahalleye uğradın mı?"],
          money: ["Para sıkıştı mı? Bende çok yok ama söyle.", "Kira mı? Kolay gelsin kardeşim.", "İş bulsana yanına, boş durma."],
          hard: ["Sıkma canını lan, hepimiz aynı yoldan geçtik.", "Gel bir çay içelim, kafan dağılır.", "Moralini bozma, sen iyisindir."],
          generic: ["Ulan sen büyüyünce unuttun bizi.", "Mahalle sensiz sessiz.", "Kız sana bakıyordu, biliyorsun değil mi?"]
        },
        kuzen: {
          compliment: ["Kuzenim kralsın ya, herkese seni anlatıyorum!", "Vallahi gurur duyuyorum seninle.", "Bizim kuzen efsane olacak, bak gör."],
          support: ["Story attım hemen, herkes görsün.", "Grup sohbetinde paylaştım kardeşim.", "Benim çevrem hep seni dinliyor artık."],
          money: ["Para lazımsa söyle, babamdan isterim.", "Hesap bende, gel yemek yiyelim."],
          family: ["Hala seni soruyor, ara kadını.", "Bayramda gel, dedem seni bekliyor."]
        },
        semtrapci: {
          feature: ["Kanka bir verse oturur bana, uyar mı?", "Ortak iş yapsak seninle ses getirir, düşün.", "Beat'e senin üstüne bir şey yazsana lan."],
          music: ["Beat geldi yeni, sana gönderiyorum.", "Geçen kayıt aldım, fena olmuş, bak.", "Mix'i kim yaptı sende? Temiz olmuş."],
          diss: ["Şu " + c.semt + "'te bir çocuk sana laf atmış, duydun mu?", "Kanka kimseye bulaşma, işine bak.", "Sana subliminal yapmış birileri."],
          generic: ["Sahne açıldı, çıkacak mısın?", "Senin sound değişmiş kanka, iyi.", "Piyasa kalabalık, dikkat et."]
        },
        producer: {
          beat: ["Yeni beat var, tam senin sound. Atayım mı?", "808'i sert yaptım, dinle istersen.", "Beat'i ücretsiz veririm, sen sadece adımı yaz."],
          money: ["Beat'i satıyorum kanka, çok değil.", "Bu işten para çıkmıyor ama severek yapıyorum.", "Kayıt için studyo bende, ücret yok."],
          music: ["Mix'i ben yapayım, bir dene.", "Master'ı dinledim, biraz bass fazla.", "Kayıt at, temiz çıkartayım sana."],
          generic: ["Evde studyo kurdum artık, gel kayıt alalım.", "Ses kartı aldım, kalite arttı."]
        },
        dj: {
          support: ["Şarkını akşam çalıyorum, gelin bakalım.", "Set'e ekledim, millet soruyor kim diye.", "Remix yapıyorum şarkına, izin var mı?"],
          music: ["Vokal biraz önde kalıyor kulüpte, mix lazım.", "Bass'ı vurunca yer sallandı, tam kulüplük.", "Bu şarkı iyi ama intro uzun, radyoda keserim."],
          generic: ["Cumartesi gece var, gel.", "Kulüpte tanıdık var, tanıştırırım seni."]
        },
        blogger: {
          news: ["Şu an gündem sıcak, bir yazı yazsam sen de konu olur musun?", "Gündemdeki konu hakkında ne düşünüyorsun? Yazıyorum.", "Sektörde şu olay patladı, sen neredesin?"],
          music: ["Yeni işini yazmak istiyorum, birkaç soru sorabilir miyim?", "Albümü dinledim, uzun bir yazı düşünüyorum.", "Sana bir eleştiri yazısı yazdım, okumak ister misin?"],
          career: ["Röportaj yapalım mı? Yerel okur güzel olur.", "Kariyerini yazmak isterim, kabul eder misin?"],
          generic: ["Bana özel bir açıklama ver, yazayım.", "Seninle bir dosya hazırlıyorum."]
        },
        fan: {
          compliment: ["Yeni şarkın efsane olmuş! Kaç kere dinledim sayamadım.", "Senin işin yüzünden uyumadım, tekrar tekrar.", "Bunu herkese söylüyorum, sen bir efsanesin."],
          support: ["Edit yaptım, paylaştım, herkes görsün!", "Çalma listeme ekledim, arkadaşlarıma da aştım.", "Fan sayfası açtım senin için, biliyor musun?"],
          music: ["Yeni şarkı ne zaman? Beklemedeyim.", "Konser olsun artık, gel de söyleyelim.", "Bir tane daha çıkar, biliyorum senden çok şey var."],
          hard: ["Moralin bozuksa bize yaz, biz buradayız.", "Sen iyisin, bunu da atlatacaksın."]
        },
        lyricist: {
          music: ["Şu dizelere bak, beğenirsen oku. Defterimden.", "Bir tema yazdım, senin sound'una uyar.", "Sözün zayıf buldum bu sefer, kusura bakma ama daha iyisini yazabilirim."],
          news: ["Gündemdeki şu olayı dizeye döktüm, dinle bak.", "Bu konu rap'te işlememiş, ben yazdım."],
          generic: ["Şiir lazım olursa buradayım.", "Kalemim hazır, sadece fırsat lazım."]
        },
        manager: {
          career: ["Kanka seni büyütelim, plan var. Beş dakikanı isterim.", "Bir sözleşme değil ama ciddi bir yol haritası çıkardım.", "Konser ayarlayabilirim sana, bakar mısın?"],
          money: ["%15 pay alıyorum, gerisi senin. Adil mi?", "Sana iş getireyim, sonra konuşalım parayı.", "Sponsor buldum belki, ilgilenir misin?"],
          company: ["Menajerlik için bir sözleşme yapalım, ciddi düşünüyorum."],
          generic: ["Bu iş planla büyür, sen planı sevmiyorsun anlıyorum ama bak."]
        },
        rakip: {
          diss: ["Sen hâlâ aynı beat'in üstünde debeliyorsun, nasıl gidiyor?", "Senin sound benim eskimiş demo'm, bil işine.", "Mikrofonu bırak, bu iş senin değil."],
          insult: ["Sen kimsin lan? İki şarkıyla adam mı oldun?", "Anca internette kral olursun, sahneye gel.", "Boş yapıyorsun, iş yok."],
          compliment: ["Ha, fena değilmiş. Şaşırttın beni.", "Bu işin olmuş ama ben daha iyisini yaparım.", "Saygı duydum, inkâr etmem."],
          music: ["Semtte kim kral belli olacak, hazır ol.", "Bir diss yazacağım sana, bekliyorsun değil mi?"],
          generic: ["Sahne benim, sen ancak arkadan bakar.", "Bu semtin adını sen taşıyamazsın."]
        },
        abi: {
          career: ["Yavaş git evlat, sağlam git. Acele eden düşer.", "Bu işte sabır en büyük yetenek, unutma.", "Kendini yakma, adım adım büyü."],
          money: ["Para geldi mi kenara koy, herkes tutamıyor.", "Borca batma, başını yakarsın.", "Kazanınca dağıtırsan aç kalırsın."],
          hard: ["Otur anlat bakalım. Dinliyorum.", "Derdin neyse çözüm var, kafana takma.", "Sen güçlüsün, bunu da atlatırsın."],
          family: ["Aileni geride bırakma, onlar yanında.", "Anneni üzme, gün gelir yalnız kalırsın."],
          insult: ["Küfür etme evlat, büyüklük göster.", "Ağzını topla, bu iş lafla yürümez."],
          generic: ["Mahalleye uğra, seni özledik.", "Ne işler çeviriyorsun bakalım?"]
        }
      };

      const pools = Object.assign({}, COMMON, roleExtra[c.role] || {});
      const prof = P({});
      Object.keys(pools).forEach(k => { if (pools[k] && pools[k].length) prof.pool[k] = pools[k]; });
      return prof;
    },

    /* ============================================================
       TETİKLER — DM'i bir OLAYA bağla (boş mesaj yok)
       ============================================================ */
    dailyTick() {
      const s = K.state, p = s.player;
      if (!s.contacts || !s.contacts.length) return;
      // GERÇEKLİK: hiç yayın yapmamışsan çevre kendiliğinden yazmaz.
      if (!(p.songs || []).length && !(p.releases || []).length) return;
      const day = s.day;

      // günde en fazla 2 çevre mesajı
      let budget = 2;

      const lastSong = (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0];
      const songAge = lastSong ? day - (lastSong.publishedDay || 0) : 999;
      const topChart = (p.songs || []).filter(x => x.chartRank && x.chartRank <= 50)[0];
      const viralSong = (p.songs || []).filter(x => x.viral)[0];

      K.contacts.list().forEach(c => {
        if (budget <= 0) return;
        const rel = K.relation(c.id);
        const th = K.thread(c.id);
        const idle = day - (rel.lastInteract || 0);
        const rnd = h(c.id + ":" + day);

        let msg = null, topic = null;

        // 1) yeni şarkı tepkisi (yayından sonraki 1-4 gün)
        if (!msg && lastSong && songAge >= 1 && songAge <= 4) {
          const pool = contactReleaseLines(c, lastSong, songAge);
          if (pool && (rnd % 100) < 46) { msg = U.pick(pool); topic = "yeni_sarki"; }
        }
        // 2) listeye girdin / viral oldun
        if (!msg && viralSong && (rnd % 100) < 30) {
          msg = U.pick([
            `"${viralSong.title}" viral olmuş, herkes konuşuyor! Sen miydin o?`,
            `Kanka "${viralSong.title}" TikTok'ta dönüyor, gördün mü?`,
            `"${viralSong.title}" patlamış lan, tebrikler!`
          ]);
          topic = "viral";
        }
        if (!msg && topChart && (rnd % 100) < 26) {
          msg = U.pick([
            `"${topChart.title}" listeye girmiş (${topChart.chartRank}. sıra), gurur duydum!`,
            `Listede seni gördüm kanka, "${topChart.title}" kaçıncı sırada bak.`,
            `"${topChart.title}" chart'a girmiş, kutlarım!`
          ]);
          topic = "chart";
        }
        // 3) gündem
        if (!msg && (rnd % 100) < 16) {
          const hot = (K.news && K.news.hot) ? K.news.hot(1)[0] : null;
          if (hot) {
            const cat = K.newsCatById ? K.newsCatById(hot.cat) : { icon: "📰" };
            msg = U.pick([
              `${cat.icon} "${hot.title}" gündemde. Sen de bir şey yazsan tutar.`,
              `Şu "${hot.title}" olayını gördün mü? Söze dökmek lazım.`,
              `Gündem ${hot.title} ile kaynıyor, sen ne diyorsun?`
            ]);
            topic = "gundem";
          }
        }
        // 4) sessizlik (7+ gün yazışmadın)
        if (!msg && idle >= 7 && (rnd % 100) < 34) {
          msg = U.pick([
            "Neredesin lan, kayıplara mı karıştın?",
            "Uzun zaman oldu, iyi misin?",
            "Sesin çıkmıyor, bir sıkıntı mı var?"
          ]);
          topic = "sessizlik";
        }
        // 5) kişinin kendi işi (her zaman somut)
        if (!msg && (rnd % 100) < 12) {
          const own = U.pick(contactOwnLines(c));
          msg = own; topic = "kendi_isi";
        }

        if (msg && th.messages.length < 200) {
          K.relations.pushArtistMessage(c.id, msg, "chat", { topic });
          rel.lastInteract = day;
          budget--;
        }
      });
    },

    /* yeni şarkıya somut tepki — role göre */
    releasePrompt(song) {
      if (!song) return;
      const s = K.state;
      if (!s.contacts || !s.contacts.length) return;
      // yayın günü 1-2 kişi hemen yazar
      const picks = U.shuffle(K.contacts.list()).slice(0, 2);
      picks.forEach((c, i) => {
        setTimeout(() => {
          const line = U.pick(contactReleaseLines(c, song, 0));
          if (line) K.relations.pushArtistMessage(c.id, line, "chat", { topic: "yeni_sarki" });
        }, 900 + i * 1400);
      });
    }
  };

  /* ---------- role göre yeni şarkı tepkileri ---------- */
  function contactReleaseLines(c, song, age) {
    const t = song.title;
    const q = song.quality || 50;
    const honest = q >= 68 ? "iyi" : q >= 52 ? "orta" : "zayıf";
    switch (c.role) {
      case "mahalle": return age === 0 ? [
        `Lan duydum şarkı çıkarmışsın, "${t}", dinledim. Helal.`,
        `"${t}" mı çıkardın? Açtım dinledim, fena değil.`
      ] : [`"${t}" hâlâ dinliyorum, alışkanlık oldu.`, `Arkadaşlara "${t}" attım, beğendiler.`];
      case "kuzen": return [`KUZENİM "${t}" ÇIKARMIŞ, HERKES DİNLESİN!`, `"${t}" dinledim, ağladım lan. Gurur duyuyorum.`];
      case "semtrapci": return honest === "iyi" ? [
        `"${t}" fena olmuş kanka, verse'e ne zaman ben geliyorum?`,
        `"${t}" dinledim, mix temiz. Ortak iş yapalım artık.`
      ] : honest === "orta" ? [`"${t}" olmuş ama beat biraz zayıf kalmış, görüşelim.`] : [
        `"${t}" bu sefer tutmamış kanka, kusura bakma ama daha iyisini yaparsın.`
      ];
      case "producer": return [`"${t}" için beat bende var, tam senin sound.`, `"${t}" mix'ini ben yapsam patlardı, ciddiyim.`];
      case "dj": return [`"${t}" set'e ekledim, kulüpte çaldım, millet sordu.`, `"${t}" iyi ama intro uzun, radyo edit yap istersen.`];
      case "blogger": return [`"${t}" için kısa bir yazı yazdım, link atayım mı?`, `"${t}" hakkında röportaj yapalım mı?`];
      case "fan": return [`"${t}" ÇIKTI! İlk ben dinledim, inanamıyorum!`, `"${t}" kaç kere dinledim bilmiyorum, ağladım.`];
      case "lyricist": return [`"${t}" sözlerinde bir tema eksik kalmış, ben yazsam farklı olurdu.`, `"${t}" dinledim; ikinci mısrada nefes sorunu var, söze dikkat.`];
      case "manager": return [`"${t}" güzel açılış. Şimdi planı konuşalım, seni büyütelim.`, `"${t}" fena değil ama tanıtım yok. Bana izin ver, ayarlayayım.`];
      case "rakip": return honest === "iyi" ? [`"${t}" iyi olmuş, inkâr etmem. Ama hâlâ geride kalıyorsun.`] : [
        `"${t}" mı? Bu mu senin işin? Boş.`, `"${t}" nerede kral? Bu mu edebiyat?`
      ];
      case "abi": return [`"${t}" dinledim evlat, emek var. Böyle devam.`, `"${t}" olmuş ama acele etmişsin, daha üstüne çalış.`];
      default: return [`"${t}" çıkmış, dinledim.`];
    }
  }

  /* ---------- kişinin kendi işi (somut, kendi projesine bağlı) ---------- */
  function contactOwnLines(c) {
    switch (c.role) {
      case "producer": return ["Yeni beat bitti, sana özel. Bir dene.", "Kaydediyorum evde, ses berrak artık. Gel al.", "Beat'i sana bırakırım, sadece adımı yaz."];
      case "dj": return ["Cumartesi set var, senin şarkıları da koyayım mı?", "Kulüpte sahne açıldı, sen çıksana bir gün.", "Yeni remix yaptım, dinlemek ister misin?"];
      case "blogger": return ["Bu hafta yerel sahne dosyası hazırlıyorum, seni de ekleyeyim.", "Gündem konulu bir yazı yazıyorum, görüşünü alsam.", "Sana bir soru listesi hazırladım, röportaj yapalım."];
      case "fan": return ["Fan sayfası için kapak tasarladım, atsam bakar mısın?", "Doğum günü projesi hazırlıyorum, yardım eder misin?", "Yeni şarkı için edit yaptım, paylaşıyorum."];
      case "lyricist": return ["Bugün üç dize yazdım, sana okuyayım mı?", "Gündemden bir tema çıkardım, ortak yazalım.", "Söz defterim doldu, birini sen oku."];
      case "manager": return ["Bu ay iki konser ayarlamayı deniyorum, hazır mısın?", "Sponsorluk için bir firmayla konuşuyorum.", "Sana bir yol haritası çıkardım, bakalım mı?"];
      case "semtrapci": return ["Yeni parça kaydettim, sana atayım, fikrini söyle.", "Bir beat aldım, üstüne ortak bir şey yapsak?", "Sahne ayarladım, sen de çık."];
      case "rakip": return ["Yeni diss yazdım, sana da yer var.", "Sahne benim, bunu bilerek yürü.", "Bir iş çıkardım, seninkinden iyi, dinle."];
      case "abi": return ["Mahallede bir kayıt studyosu açılıyor, gel.", "Bir gencin işine destek oluyorum, sana da bak.", "Bu akşam çay var, gel konuşalım."];
      case "mahalle": return ["Mahallede halı saha var, gel.", "Eski günleri özledim lan.", "Bir arkadaş seni soruyor, numaranı istedi."];
      case "kuzen": return ["Aile yemeği var, geliyorsun değil mi?", "Annem sana börek yaptı, gel al.", "Sana eski bir fotoğraf buldum, atsam?"];
      default: return ["Naber, ne var ne yok?", "Bir ara görüşelim.", "Kendine iyi bak."];
    }
  }
})(window.K = window.K || {});
