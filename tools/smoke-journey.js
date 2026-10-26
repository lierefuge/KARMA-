// Behavioral regressions: payments/rights + branching first-month career.
const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const r = H.makeReport("İLK AY · EKONOMİ VE SÖZLEŞMELER");
const { dom, errors } = H.bootDom(fs.readFileSync(path.join(__dirname, "../KARMA-Oyun.html"), "utf8"), { seed: 20261026 });
H.whenReady(dom).then(K => {
  const ok = r.ok.bind(r);
  const fresh = () => { K.state = K.newGame(); K.contacts.ensureRoster(); return K.state; };
  const song = (id, terms) => ({ id, title: "Deneme <şarkı>", genre: "rap", publishedDay: 1, streams: 1000, quality: 60,
    dailyStreams: 20, lastDaily: 20, boosts: {}, month: {}, masterOwner: "label", labelTerms: terms, distCommission: 0 });
  const royalty = id => ({ songId: id, streams: { spotify: 10000 }, due: { spotify: 0, apple: 0, youtube: 0, other: 0 }, paid: {} });
  let s = fresh(), p = s.player;
  s.balance = 100000; p.monthly = 1000;
  const cash = s.balance;
  K.concerts.schedule("İstanbul", "club", 850, 1, "basic", null, "door", false);
  const cn = s.concerts[0]; s.day = cn.day;
  K.concerts.tick();
  ok("Konserin tüm gideri tahsil edilir", s.balance === cash + cn.result.revenue - cn.cost);
  const settled = s.balance; K.concerts.tick();
  ok("Konser tekrar tahsil edilmez", s.balance === settled);
  s = fresh(); p = s.player; s.balance = 10000;
  K.concerts.schedule("İstanbul", "club", 100, 1, "basic", null, "door", false);
  const poor = s.concerts[0]; s.balance = 0; s.day = poor.day; p.monthly = 0;
  K.concerts.tick();
  ok("Eksik konser ödemesi borca yazılır", p.debt === poor.cost - poor.advance - poor.result.revenue && s.balance === 0 && p.debt > 0);

  s = fresh(); p = s.player;
  p.labelId = "dokuzsekiz";
  p.labelDeal = { labelId: p.labelId, labelRoyalty: 10, advance: 10000, recouped: 0, startDay: 1, lengthDays: 180, splits: { touring: 20 } };
  p.songs = [song("old")]; p.royalties = [royalty("old")]; s.day = 30;
  K.economy.settleMonth();
  ok("Pazarlık payı ödenir", p.payouts[0].labelCut === Math.round(p.payouts[0].gross * .1));
  ok("Avans geri ödemesi korunur", p.payouts[0].recoup > 0 && p.payouts[0].net === 0);
  const offer = { type: "label", terms: { royalty: 42, artistRoyalty: 58 } };
  K.relations._applyCounter(offer, { artistShare: 90 }, 1);
  ok("Pazarlıkta gösterilen sanatçı payı tutarlı", offer.terms.artistRoyalty === 90 && offer.terms.royalty === 10);
  const oldDeal = p.labelDeal;
  p.royalties = [royalty("old")]; s.day = 181;
  K.label.playerContractTick();
  ok("Süre dolunca bağımsız olunur", !p.labelId && !p.labelDeal && K.career.labelCut("touring", 10000) === 0);
  ok("Eski yayın ve bekleyen ödemede haklar korunur", p.songs[0].labelTerms.dealId === oldDeal.id && p.royalties[0].labelTerms.dealId === oldDeal.id);
  K.label.playerContractTick();
  ok("Sözleşme bir kez arşivlenir", p.labelHistory.length === 1);
  ok("Arşivlenen haklar kaydedilebilir", K.save() && K.load());
  s = K.state; p = s.player;
  const archivedDeal = p.labelHistory[0];
  ok("Yüklenen yayın doğru sözleşmeyi bulur", p.songs[0].labelTerms.dealId === archivedDeal.id);
  const oldRecoup = archivedDeal.recouped;
  p.labelId = "dokuzsekiz";
  p.labelDeal = { labelId: p.labelId, labelRoyalty: 0, advance: 20000, recouped: 0, startDay: 181, lengthDays: 180 };
  K.label.releaseTerms();
  K.economy.settleMonth();
  ok("Eski telif yeni şirketin avansını ödemez", archivedDeal.recouped > oldRecoup && p.labelDeal.recouped === 0);
  ok("Eski şirketin payı yeni sözleşmeyle silinmez", p.payouts[0].labelCut === Math.round(p.payouts[0].gross * .1));
  p.songs.push(song("new", K.label.releaseTerms())); p.royalties = [royalty("new")];
  K.economy.settleMonth();
  ok("Sıfır şirket payı korunur", p.payouts[0].labelCut === 0 && p.labelDeal.recouped > 0);
  p.songs.push(song("independent", { royalty: 0, labelId: null, dealId: null })); p.royalties = [royalty("independent")];
  K.economy.settleMonth();
  ok("Bağımsız kayda yeni avans borcu yüklenmez", p.payouts[0].recoup === 0 && p.payouts[0].net > 0);

  s = fresh(); p = s.player;
  p.songs = [Object.assign(song("exclusive"), { exclusiveSync: true })];
  const chance = K.util.chance; K.util.chance = () => true;
  K.catalog.maybeSyncOffer();
  ok("Özel lisanslı şarkıya yeni sync teklifi yok", !s.pendingSync);
  s.pendingSync = { songId: "exclusive", fee: 10000 };
  const pre = s.balance; K.catalog.resolveSync(true);
  ok("Bekleyen geçersiz teklif para kazandırmaz", !s.pendingSync && s.balance === pre);
  p.songs[0].exclusiveSync = false;
  K.catalog.maybeSyncOffer(); ok("Uygun şarkı teklif alabilir", !!s.pendingSync);
  K.util.chance = chance;

  s = fresh(); p = s.player; K.journey.tick();
  ok("İlk çevre fırsatı ve DM aynı kişiye bağlı", s.journey.pending.id === "circle" && s.threads.c_producer_0.messages.length > 0);
  K.careerUI.setTab("career");
  dom.window.document.querySelector('[data-act="journey-choice"][data-choice="meet"]').click();
  ok("Kariyer düğmesi randevu oluşturur", s.journey.booking.choiceId === "meet");
  ok("Aynı karar tekrar uygulanamaz", !K.journey.choose("circle", "meet"));
  const aff = s.relations.c_producer_0.affinity;
  ok("Randevu kaydedilir", K.save()); ok("Randevu geri yüklenir", K.load());
  s = K.state; p = s.player;
  s.day = 3; K.journey.tick();
  ok("Söz tutulunca ilişki ilerler", !s.journey.booking && s.relations.c_producer_0.affinity > aff);
  const rel = { id: "project", title: "İlk kayıt", stage: "prep", startDay: 5, waitDays: 18, tracks: [{ quality: 60 }] };
  p.releases = [rel]; s.day = 5; K.journey.tick();
  ok("Seans gerçek projeyi hedefler", s.journey.pending.targetId === rel.id);
  s.balance = 100; ok("Yetersiz bütçe kararı tüketmez", !K.journey.choose("session", "together") && !!s.journey.pending);
  s.balance = 10000; K.journey.choose("session", "together"); s.day = 7; K.journey.tick();
  ok("Ücretli seans kayıt kalitesini etkiler", rel.tracks[0].quality === 63 && s.balance === 8800);
  K.journey.tick(); ok("Kalite tekrar tekrar artırılamaz", rel.tracks[0].quality === 63);
  p.songs = [song("first")]; p.releases = []; s.day = 10; K.journey.tick();
  ok("Yayın sahne fırsatını açar", s.journey.pending.id === "stage");
  s.concerts = [{ day: 13, status: "planlandı" }];
  ok("Aynı gün iki sahneye söz verilemez", !K.journey.choose("stage", "show"));
  s.concerts = []; K.journey.choose("stage", "show"); const paid = s.balance;
  s.day = 13; K.journey.tick();
  ok("Sahne ücreti gününde ödenir ve şarkı etkilenir", s.balance === paid + 1500 && p.songs[0].boosts.journey > 0);
  K.journey.tick(); ok("Sahne ücreti bir kez ödenir", s.balance === paid + 1500);
  ok("Müzik geliri hedefi gerçek ücretten tamamlanır", !!s.journey.milestones.income);
  s.day = 20; K.journey.tick(); K.journey.choose("followup", "reply"); s.day = 21; K.journey.tick();
  ok("Hayran önceki sahneyi hatırlar", s.threads.c_fan_0.messages.some(m => m.text.includes("küçük sahneden")));
  const balance = s.balance; K.journey.tick();
  ok("Bitmiş akış yeni ödül üretmez", !s.journey.pending && s.balance === balance);
  ok("Günlük HTML metinleri kaçışlanır", !K.journey.html().includes("<şarkı>"));

  s = fresh(); K.journey.tick(); K.journey.choose("circle", "practice");
  const skill = s.player.skills.music; s.day = 3; K.journey.tick();
  ok("Alternatif yol beceriyi geliştirir", s.player.skills.music === skill + 1);
  s.day = 5; s.player.releases = [{ ...rel, id: "cancel", tracks: [{ quality: 50 }] }]; K.journey.tick();
  K.journey.choose("session", "together"); const afterFee = s.balance;
  s.player.releases = []; s.day = 7; K.journey.tick();
  ok("İptal edilen proje için seans bedeli iade edilir", s.balance === afterFee + 1200 && !s.journey.booking);
  s = fresh(); K.journey.tick(); K.journey.choose("circle", "meet");
  const beforeCancel = s.relations.c_producer_0.affinity;
  K.journey.cancel(); ok("Tutulmayan söz ilişkide iz bırakır", s.relations.c_producer_0.affinity < beforeCancel);
  s = fresh(); K.journey.tick(); s.day = 8; K.journey.tick();
  ok("Kaçırılan fırsat cezasız kapanır", s.journey.closed.circle === "missed" && !s.journey.pending);
  s = fresh(); delete s.journey; s.day = 200; K.journey.tick();
  ok("Eski ileri kariyer yeniden başlatılmaz", !s.journey);
  s.day = 10; K.journey.tick(); ok("Eski erken kayıt akışa katılabilir", !!s.journey.pending);
  s = fresh(); s.journey.closed = { circle: "pass", session: "pass" }; s.player.songs = [song("late")]; s.day = 30;
  K.journey.tick(); K.journey.choose("stage", "show"); s.day = 33; K.journey.tick();
  ok("30. gün verilen söz ay sonrasında tamamlanır", s.journey.showIncome === 1500 && !s.journey.booking);
  ok("Ay sonrası yeni fırsat üretilmez", !s.journey.pending);
  // Real 30-day career: normal starting funds, actual production and day loop.
  s = fresh(); p = s.player; s.started = true; p.age = 20;
  K.journey.tick();
  const realRelease = K.career.createRelease({ title: "İlk Adım", genre: "rap", kind: "normal", trackCount: 1,
    budget: 2000, marketing: 0, waitDays: 18, trackBudgets: [2000], tracks: [{ name: "İlk Adım", budget: 2000, source: "study" }],
    lyricsTheme: "street", conceptId: "open", strategy: "standard", stores: K.defaultStores() });
  ok("İlk kayıt başlangıç bütçesiyle yapılabilir", !!realRelease);
  for (let day = 1; day < 33; day++) {
    if (s.journey.pending) {
      const id = s.journey.pending.id;
      ok("Gün " + s.day + " kararı oynanabilir: " + id, K.journey.choose(id, { circle: "meet", session: "together", stage: "show", followup: "reply" }[id]));
    }
    K.game._advanceDay();
  }
  ok("Gün döngüsünde dört bölüm tamamlanır", Object.keys(s.journey.closed).length === 4 && !s.journey.booking && s.journey.showIncome === 1500);
  ok("İlk ay gerçek yayın ve gelire ulaşır", p.songs.length > 0 && !!s.journey.milestones.release && !!s.journey.milestones.income);
  r.setRuntime(errors); r.report(); dom.window.close();
}).catch(e => { console.error("test çöktü", e); dom.window.close(); process.exitCode = 1; });
