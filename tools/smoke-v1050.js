/* Kullanım: node tools/smoke-v1050.js
   KARMA — v10.50 NPC ZİHİN KATMANI (RPG) + Lia Shine.

   A) RUH HALİ        — günlük deterministik, olaylarla geçersiz kılınır
   B) HAFIZA          — konu takibi, söz, bekleyen soru, takip cümlesi
   C) DEDİKODU + YAY  — NPC'ler birbirini duyar, sanatçı hikâye yayı oynar
   D) ÖNERİLEN CEVAP  — bağlamsal hızlı seçenekler
   E) LIA SHINE       — sanatçı + ağız + kişilik + gerçek şarkı/diskoğrafi + foto
   F) ENTEGRASYON     — chat.reply ruh hali döndürür; DM arayüzü rozet/öneri basar

   Not: tek dosyalık KARMA-Oyun.html üzerinden test edilir;
   önce `node tools/build-single.js` çalıştırılmalı.
*/
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const ROOT = path.resolve(__dirname, "..");

const FILE = path.join(ROOT, "KARMA-Oyun.html");
if (!fs.existsSync(FILE)) { console.error("KARMA-Oyun.html yok — önce: node tools/build-single.js"); process.exit(1); }
const html = fs.readFileSync(FILE, "utf8");

const pass = [], fail = [];
const ok = (n, c, e) => (c ? pass : fail).push(n + (e ? " — " + e : ""));

const { dom, errors } = H.bootDom(html, { seed: 20261050 });

H.whenReady(dom, {
  label: "v10.50 zihin katmanı hazır",
  ready: (K) => !!(K && K.npcMind && K.npcMind.moodOf && K.chat && K.chat.suggestions)
}).then(run).catch((err) => {
  console.error("test çöktü: " + (err && err.message ? err.message : err));
  process.exitCode = 1;
});

async function run() {
  const K = dom.window.K;

  /* tembel veri katmanı: gerçek şarkı/diskoğrafiyi bekle (tek dosya modu) */
  if (K.lazy && K.lazy.ensure) { try { await K.lazy.ensure(["real-songs", "discography"]); } catch (e) {} }
  const realSongs = (id) => (K.lazy && K.lazy.songs) ? K.lazy.songs(id) : ((K.REAL_SONGS || {})[id] || []);
  const disco = (id) => (K.lazy && K.lazy.discography) ? K.lazy.discography(id) : ((K.DISCOGRAPHY || {})[id] || []);

  const fresh = (day) => {
    K.state = K.newGame();
    K.state.player.stageName = "Test";
    K.state.balance = 50000000;
    K.day = day || 10;
    K.state.day = day || 10;
    return K.state;
  };

  /* ============ A) RUH HALİ ============ */
  {
    fresh(10);
    const m1 = K.npcMind.moodOf("sehinsah");
    const m2 = K.npcMind.moodOf("sehinsah");
    ok("A-0 · npcmind modülü yüklendi", !!(K.npcMind && K.npcMind.MOODS));
    ok("A-0 · 6 ruh hali tanımlı", Object.keys(K.npcMind.MOODS).length === 6, Object.keys(K.npcMind.MOODS).length);
    ok("A-1 · ruh hali gün içinde deterministik", m1 && m2 && m1.key === m2.key, m1 && m1.key);
    ok("A-1 · ruh hali geçerli", !!K.npcMind.MOODS[m1.key]);
    ok("A-2 · etiket ikon içerir", /[😌🔥🥱😤🥀😠]/.test(K.npcMind.moodLabel("sehinsah")), K.npcMind.moodLabel("sehinsah"));
    ok("A-3 · delta 0.5–1.2 aralığında", K.npcMind.moodDelta("sehinsah") >= 0.5 && K.npcMind.moodDelta("sehinsah") <= 1.2, K.npcMind.moodDelta("sehinsah"));
    ok("A-4 · cevap gecikmesi ms döner", K.npcMind.replyWait("sehinsah") >= 0);

    /* olay geçersiz kılma: beef ısısı yüksekse öfkeli */
    if (K.beef && K.beef.list) {
      K.state.beef = K.state.beef || {};
      K.beef.list = () => ([{ artist: K.artistById("sehinsah"), heat: 80 }]);
      K.npcMind.mind("sehinsah").moodDay = -1;   // önbelleği kır
      ok("A-5 · yüksek beef → öfkeli", K.npcMind.moodOf("sehinsah").key === "ofkeli", K.npcMind.moodOf("sehinsah").key);
    }
  }

  /* ============ B) HAFIZA ============ */
  {
    fresh(10);
    const m = K.npcMind.mind("weghrumi");
    ok("B-0 · hafıza nesnesi var", !!m && typeof m.topics === "object");
    K.npcMind.note("weghrumi", "music", "yeni şarkı");
    K.npcMind.note("weghrumi", "music", "albüm ne zaman");
    ok("B-1 · konu sayılır", m.topics.music.count === 2, m.topics.music.count);
    ok("B-1 · son konu kaydedilir", m.lastTopic === "music");

    K.npcMind.promise("weghrumi", "me", "demo göndereceğim");
    ok("B-2 · söz kaydedilir", m.promises.length === 1 && m.promises[0].by === "me");

    K.npcMind.setPending("weghrumi", "music", "dinlemek ister misin?");
    ok("B-3 · bekleyen soru kaydedilir", !!K.npcMind.pending("weghrumi"));
    const r = K.npcMind.resolvePending("weghrumi", true);
    ok("B-3 · bekleyen soru çözülür", r && r.yes === true && !K.npcMind.pending("weghrumi"));

    /* takip cümlesi: farklı konu + 1-5 gün ara */
    K.state.day = 13;
    let sawFollow = false;
    for (let i = 0; i < 40 && !sawFollow; i++) {
      if (K.npcMind.followUp("weghrumi", "career")) sawFollow = true;
    }
    ok("B-4 · geçmiş konuya takip cümlesi üretir", sawFollow);
    ok("B-4 · aynı konuda takip üretmez", K.npcMind.followUp("weghrumi", "music") === null);
  }

  /* ============ C) DEDİKODU + YAY ============ */
  {
    fresh(10);
    /* aynı şirket/tür sanatçılarına yayılsın */
    const rel0 = K.artistById("sehinsah");
    K.npcMind.spread("sehinsah", "stage_up", "Birlikte Takılma");
    const targets = K.ARTISTS.filter(x => x.id !== "sehinsah" && (x.labelId === rel0.labelId || x.genre === rel0.genre));
    const heard = targets.filter(x => (K.relation(x.id)._mind && K.relation(x.id)._mind.gossip || []).length > 0);
    ok("C-1 · dedikodu en az bir sanatçıya yayıldı", heard.length >= 1, heard.length + "/" + targets.length);

    if (heard.length) {
      const gl = K.npcMind.gossipLine(heard[0].id);
      ok("C-1 · dedikodu cümlesi üretilir", !!gl && /duydum|konuşuyor|bahsetti/.test(gl), gl);
    }

    /* hikâye yayı: aşamaya gelince BİR KEZ oynar */
    const b1 = K.npcMind.arcBeat("sehinsah", 3);
    ok("C-2 · yay beat'i oynar", !!b1, b1 && b1.slice(0, 30));
    ok("C-2 · aynı beat tekrar etmez", K.npcMind.arcBeat("sehinsah", 3) === null);
    ok("C-2 · yaysız sanatçıda null", K.npcMind.arcBeat("ceza", 5) === null);
  }

  /* ============ D) ÖNERİLEN CEVAPLAR ============ */
  {
    fresh(10);
    const s = K.npcMind.suggestions("sehinsah");
    ok("D-1 · öneri listesi döner", Array.isArray(s) && s.length >= 2, s.length);
    ok("D-1 · her öneride metin+ton var", s.every(x => x.text && x.tone));
    ok("D-1 · chat üzerinden erişilir", K.chat.suggestions("sehinsah").length >= 2);
    K.npcMind.setPending("sehinsah", "music", "olur mu?");
    const s2 = K.npcMind.suggestions("sehinsah");
    ok("D-2 · bekleyen soruda evet/hayır önerisi", s2.some(x => /evet/i.test(x.text)) && s2.some(x => /olmaz|kusura/i.test(x.text)));
  }

  /* ============ E) LIA SHINE ============ */
  {
    fresh(10);
    const a = K.artistById("liashine");
    ok("E-1 · sanatçı kaydı var", !!a);
    ok("E-1 · Sivas + trap", a && a.city === "Sivas" && a.genre === "trap");
    ok("E-1 · Hypers kadrosunda", K.LABELS.find(l => l.id === "hypers").roster.indexOf("liashine") >= 0);
    ok("E-2 · DM ağzı (profil) var", !!(K.CHAT_PROFILES && K.CHAT_PROFILES.liashine));
    ok("E-2 · profil havuzu dolu", K.CHAT_PROFILES.liashine.pool.greet.length >= 3 && K.CHAT_PROFILES.liashine.pool.hard.length >= 2);
    ok("E-3 · kişilik profili var", !!(K.NPC_PERSONALITY && K.NPC_PERSONALITY.liashine));
    ok("E-3 · archetype Yaralı Yıldız", K.NPC_PERSONALITY.liashine.archetype === "Yaralı Yıldız");
    ok("E-4 · gerçek şarkılar (>=20)", realSongs("liashine").length >= 20, realSongs("liashine").length);
    ok("E-4 · gerçek diskoğrafi (>=15)", disco("liashine").length >= 15, disco("liashine").length);
    ok("E-4 · kapak URL'leri gerçek", realSongs("liashine").every(s => /^https:\/\//.test(s.art)));
    ok("E-5 · fotoğraf tanımlı", !!(K.ARTIST_PHOTOS && K.ARTIST_PHOTOS.liashine));

    /* DM motoru onun ağzından konuşuyor mu + absürt içerik yok mu */
    K.state.relations.liashine = K.relation("liashine");
    K.relation("liashine").affinity = 55;   // tanışmış say
    const pol = { reach: 1, seenChance: 1, replyChance: 1 };
    const out = K.chat.reply("liashine", "moralim bozuk, ne yapacağımı bilmiyorum", pol);
    const txt = (out.msgs || []).join(" ");
    ok("E-6 · cevap üretilir", !!txt && txt.length > 0);
    ok("E-6 · undefined/NaN yok", !/undefined|NaN|\[object/.test(txt), txt.slice(0, 60));
    ok("E-6 · duygusal ağız (hard niyetinde kendi sesi)", /yaz|yalnız|dibi|dinliyorum|kurtardı|anlat/i.test(txt), txt.slice(0, 80));
    ok("E-6 · ruh hali döndürür", out.mood && out.mood.key, JSON.stringify(out.mood));

    /* aynı mesaja Şehinşah farklı cevap vermeli (ses ayrımı) */
    const o1 = K.chat.reply("liashine", "yeni şarkı ne zaman çıkıyor", pol);
    const o2 = K.chat.reply("sehinsah", "yeni şarkı ne zaman çıkıyor", pol);
    ok("E-7 · iki sanatçı farklı cevap verir", (o1.msgs[0] !== o2.msgs[0]));
  }

  /* ============ F) ENTEGRASYON / ARAYÜZ ============ */
  {
    fresh(10);
    K.relation("liashine").affinity = 60;
    K.relation("liashine").met = true;
    const app = K.phone.appById("messages");
    let h = "";
    try { h = app.conversation("liashine").render(); } catch (e) { h = ""; }
    ok("F-1 · DM başlığı ruh hali rozeti basar", /dm-mood/.test(h), h ? "" : "render hatası");
    ok("F-2 · önerilen cevap çipleri basar", /dm-suggest/.test(h) && /dm-sug/.test(h));
    ok("F-2 · öneriler tona göre etiketli", /dms-t/.test(h));
  }

  /* ---- rapor ---- */
  const runtime = (errors || []).filter(m => !/fonts|Not implemented/i.test(m));
  console.log("=".repeat(58));
  console.log("KARMA · v10.50 NPC ZİHİN KATMANI + LIA SHINE");
  console.log("=".repeat(58));
  console.log("Değerlendirilen kontrol: " + (pass.length + fail.length));
  console.log("Geçen: " + pass.length + " · Kalan: " + fail.length + (runtime.length ? " · Runtime hata: " + runtime.length : ""));
  if (fail.length) { console.log("\n❌ BAŞARISIZ"); fail.forEach(f => console.log("   · " + f)); }
  if (runtime.length) { console.log("\n⚠️ RUNTIME"); Array.from(new Set(runtime)).slice(0, 6).forEach(e => console.log("   · " + e)); }
  if (!fail.length && !runtime.length) console.log("\n✅ ZİHİN KATMANI + LIA SHINE TEMİZ");
  else process.exitCode = 1;
}
