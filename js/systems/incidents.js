/* ============================================================
   KARMA — systems/incidents.js
   GÜNLÜK OLAYLAR (rastgele olaylar)
   Her gün geçişinde %10-15 ihtimalle bir olay çıkar.
   Bazıları anında etki eder, bazıları oyuncunun KARARINI bekler.
   Etkiler: para · ün/popülerlik · itibar · hayran · dinlenme · viral
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* v10.33 — Günlük olay olasılık bandı belirgin şekilde düşürüldü.
     Eskiden günde %10-15 idi (neredeyse her hafta bir olay → spam hissi).
     Artık günde %4,5-7 ve kariyer büyüklüğüne göre ölçekleniyor; ayrıca
     iki olay arasında asgari 6 gün var. Ün eşiği (GATE) ile birlikte
     oyuncu artık olayları "nadir ve özel" yaşar. */
  const EVENT_BAND = [0.045, 0.07];

  /* ---------------- etki uygulayıcı ---------------- */
  function latestSong() {
    const p = K.state.player;
    return (p.songs || []).slice().sort((a, b) => (b.publishedDay || 0) - (a.publishedDay || 0))[0] || null;
  }

  function applyEffects(e) {
    if (!e) return;
    const s = K.state, p = s.player;
    if (e.rep) p.reputation = U.clamp(p.reputation + e.rep, 0, 100);
    if (e.pop) p.popularity = U.clamp(p.popularity + e.pop, 0, 99);
    /* TUTARLILIK: itibar/popülerlik değişimi imajı da etkiler */
    if (e.rep || e.pop) p.image = U.clamp((p.image || 50) + (e.rep || 0) * 0.5 + (e.pop || 0) * 0.35, 0, 100);
    if (e.fans) {
      p.ig = Math.max(0, p.ig + Math.round(e.fans * 0.6));
      p.tiktok = Math.max(0, p.tiktok + Math.round(e.fans * 0.4));
      p.x = Math.max(0, p.x + Math.round(e.fans * 0.15));
      p.ytSubs = Math.max(0, p.ytSubs + Math.round(e.fans * 0.1));
    }
    if (e.fatigue) p.fatigue = U.clamp((p.fatigue || 0) + e.fatigue, 0, 100);
    if (e.money) {
      if (e.money < 0) K.economy.spend(Math.min(-e.money, s.balance), "incident");
      else K.economy.earn(Math.round(e.money * 0.45), "incident");   // olay gelirleri ölçeklendi
    }
    if (e.streams) {
      const song = latestSong();
      if (song) {
        song.boosts = song.boosts || {};
        /* v10 GERÇEKLİK DÜZELTMESİ — OLAY ETKİSİ GEÇİCİ.
           Eski hâlde her olay dailyStreams'i KALICI olarak çarpıyordu
           (ör. +%50). Yüzlerce günde biriken olaylar şarkıyı üstel biçimde
           şişiriyordu. Gerçekte bir haber/trend dalgası 2-3 haftada söner.
           Artık etki sönümlenen "boosts" kalemiyle veriliyor (günlük ×0,86). */
        song.boosts.event = (song.boosts.event || 0) + e.streams * 1.4;
      }
    }
    if (e.viral) {
      const song = latestSong();
      if (song && U.chance(e.viral)) K.game.markViral(song, null, null);
    }
    if (e.streamsAll) {
      p.songs.forEach(song => {
        song.boosts = song.boosts || {};
        song.boosts.event = (song.boosts.event || 0) + e.streamsAll;
      });
    }
    if (e.boost) {
      const song = latestSong();
      if (song) { song.boosts = song.boosts || {}; song.boosts.event = (song.boosts.event || 0) + e.boost; }
    }
    if (e.affinity) {
      const a = U.pick(K.artistList());
      if (a && K.relations) K.relations.addAffinity(a.id, e.affinity, "olay");
    }
  }

  /* ---------------- olay havuzu ---------------- */
  const POOL = [
    /* ---------- İYİ ---------- */
    { id: "tiktok_trend", tag: "TREND", kind: "good", weight: 3, title: "Şarkın TikTok'ta trend oldu",
      desc: "Bir parçan kısa video akımına girdi; dinlenmeler hızla artıyor.",
      choices: [{ label: "Harika!", effects: { streams: 0.5, fans: 9000, pop: 1 }, note: "Dinlenme +50%, 9.000 takipçi." }] },

    { id: "playlist", tag: "PLAYLIST", kind: "good", weight: 3, title: "Editoryal playlist'e eklendin",
      desc: "Büyük bir Spotify playlist'ine alındın; görünürlük artıyor.",
      choices: [{ label: "Devam!", effects: { streams: 0.35, pop: 0.8, money: 8000 }, note: "Dinlenme +35%, popülerlik +0.8." }] },

    { id: "radio", tag: "RADYO", kind: "good", weight: 2, title: "Radyolar şarkını çalmaya başladı",
      desc: "Ulusal bir radyo şarkını rotasyona aldı.",
      choices: [{ label: "Güzel!", effects: { streams: 0.25, money: 18000 }, note: "Dinlenme +25%, ₺18.000 telif." }] },

    { id: "award_nom", tag: "ÖDÜL", kind: "good", weight: 2, minPop: 20, title: "Ödül adaylığı açıklandı",
      desc: "Bir müzik ödülünde aday gösterildin; itibar ve görünürlük yükseliyor.",
      choices: [{ label: "Harika haber!", effects: { rep: 4, pop: 2, fans: 6000 }, note: "İtibar +4, popülerlik +2." }] },

    { id: "feature_req", tag: "TEKLİF", kind: "good", weight: 2, title: "Bir sanatçı senden feature istedi",
      desc: "Sektörden bir isim ortak şarkı için sana ulaştı.",
      choices: [{ label: "Değerlendireceğim", effects: { affinity: 5, pop: 1 }, note: "Bir sanatçıyla samimiyet arttı." }] },

    { id: "fan_base", tag: "KİTLE", kind: "good", weight: 2, title: "Fan kitlen büyüdü",
      desc: "Hayranların senin için bir topluluk hesabı açtı; kitle örgütleniyor.",
      choices: [{ label: "Sağ olun!", effects: { fans: 15000, pop: 0.5 }, note: "15.000 takipçi." }] },

    { id: "viral_clip", tag: "VİRAL", kind: "good", weight: 2, title: "Klibinden bir kesit viral oldu",
      desc: "Bir klip kesiti döngüye girdi, herkes paylaşıyor.",
      choices: [{ label: "Devam!", effects: { viral: 0.6, streams: 0.3, fans: 7000 }, note: "Viral şansı + dinlenme." }] },

    { id: "critic_praise", tag: "ELEŞTİRİ", kind: "good", weight: 2, title: "Eleştirmenler işini övdü",
      desc: "Bağımsız bir müzik yazarı son işini 'yılın sürprizi' olarak gösterdi.",
      choices: [{ label: "Teşekkürler", effects: { rep: 3, pop: 0.6 }, note: "İtibar +3." }] },

    { id: "merch", tag: "MERCH", kind: "good", weight: 2, title: "Ürün (merch) satışı patladı",
      desc: "Tişört ve poster satışların beklenenin üstüne çıktı.",
      choices: [{ label: "Kazandık!", effects: { money: 42000, fans: 3000 }, note: "₺42.000 gelir." }] },

    /* ---------- KARAR GEREKTİREN ---------- */
    /* v10.33 — SIZINTI · beat iddiası · eski paylaşım · gönderme senaryoları
       Kriz sisteminde (crisis.js) zaten yaşıyordu; buradan kaldırıldı ki
       aynı olay iki ayrı kılıfla tekrar tekrar çıkmasın. */
    { id: "sponsor", tag: "SPONSOR", kind: "neutral", weight: 2, minPop: 15, title: "Marka sponsorluğu teklifi geldi",
      desc: "Bir marka kampanyasında yer alman için teklif var; ama kitle tepkisi riskli.",
      choices: [
        { label: "Kabul et (yüksek para)", effects: { money: 120000, rep: -2, pop: 0.5 }, note: "₺120.000 ama itibar -2." },
        { label: "Şartlı kabul et", effects: { money: 60000, rep: 0.5 }, note: "Orta yol." },
        { label: "Reddet", effects: { rep: 2, fans: 3000 }, note: "Duruş sergilersin." }
      ] },

    { id: "concert_offer", tag: "KONSER", kind: "neutral", weight: 2, minPop: 10, title: "Büyük konser teklifi",
      desc: "Bir organizatör seni büyük bir sahnede istiyor; hazırlık yorucu olacak.",
      choices: [
        { label: "Kabul et (para + şöhret)", effects: { money: 70000, pop: 1.5, fatigue: 20, fans: 9000 }, note: "Para + şöhret, ama yorgunluk +20." },
        { label: "Ertele", effects: { fatigue: -10, rep: 0.3 }, note: "Dinlen, formda kal." }
      ] },

    { id: "tax", tag: "VERGİ", kind: "bad", weight: 2, title: "Vergi incelemesi başlatıldı",
      desc: "Gelirlerin inceleniyor; belgeler eksik görünüyor.",
      choices: [
        { label: "Danışmanla çöz", effects: { money: -45000, rep: 1 }, note: "₺45.000, sorun kapanır." },
        { label: "İtiraz et", effects: { money: -8000, rep: -1.5 }, note: "Ucuz ama riskli." }
      ] },

    { id: "voice_loss", tag: "SAĞLIK", kind: "bad", weight: 2, title: "Sesin yoruldu, dinlenmen gerekiyor",
      desc: "Sürekli kayıttan sesin zorlandı; doktor birkaç gün dinlenme önerdi.",
      choices: [
        { label: "Dinlen (gün kaybı)", effects: { fatigue: -25, streams: -0.1 }, note: "Yorgunluk -25, kısa durgunluk." },
        { label: "Devam et (riskli)", effects: { fatigue: 15, streams: 0.15, rep: -0.5 }, note: "Üretim sürer, sağlık riski." }
      ] },

    { id: "label_interest", tag: "ŞİRKET", kind: "neutral", weight: 2, minPop: 18, title: "Bir şirket seninle ilgilendi",
      desc: "Köklü bir müzik şirketi sana sözleşme teklifi hazırlıyor.",
      choices: [
        { label: "Görüşmeye git", effects: { rep: 1.5, pop: 0.8, money: 30000 }, note: "Avans + görünürlük." },
        { label: "Bağımsız kal", effects: { rep: 1, fans: 4000 }, note: "Kitapla bağ kurarsın." }
      ] },

    { id: "gossip", tag: "MAGAZİN", kind: "neutral", weight: 2, title: "Özel hayatınla ilgili dedikodu çıktı",
      desc: "Hakkında aşk/ilişki haberi yayıldı; magazin peşinde.",
      choices: [
        { label: "Yalanla", effects: { rep: 1, fans: -2000 }, note: "Gizlilik korunur." },
        { label: "Üstüne git", effects: { pop: 1, fans: 7000, rep: -1 }, note: "Görünürlük artar, itibar düşer." }
      ] },

    { id: "equipment", tag: "EKİPMAN", kind: "bad", weight: 2, title: "Stüdyo ekipmanın bozuldu",
      desc: "Kayıt sırasında ses kartı ve mikrofon arızalandı.",
      choices: [
        { label: "Ucuz tamir", effects: { money: -12000, streams: -0.05 }, note: "₺12.000, kalite bir tık düşer." },
        { label: "Profesyonel yenile", effects: { money: -55000, streams: 0.2, rep: 0.5 }, note: "₺55.000, kalite yükselir." }
      ] },

    { id: "payment_delay", tag: "ÖDEME", kind: "bad", weight: 2, title: "Platform telif ödemesi gecikti",
      desc: "Bu ayın telif ödemesi teknik sorun nedeniyle gecikti.",
      choices: [{ label: "Bekle", effects: { money: -15000 }, note: "Kan kaybı ₺15.000." }] },

    { id: "hater", tag: "NEFRET", kind: "bad", weight: 2, title: "Organize bir nefret kampanyası başladı",
      desc: "Bir grup sosyal medyada sana karşı toplu eleştiri başlattı.",
      choices: [
        { label: "Sakin cevap ver", effects: { rep: 2, fans: 3000, pop: 0.4 }, note: "Olgunluk." },
        { label: "Blokla, sessiz kal", effects: { pop: 0.6, rep: -1, fans: -3000 }, note: "Gündem düşer ama itibar zedelenir." }
      ] },

    { id: "street_support", tag: "SOKAK", kind: "good", weight: 2, title: "Mahalleden destek geldi",
      desc: "Şarkın sokakta yankılandı; yerel işletmeler çalmaya başladı.",
      choices: [{ label: "Saygı!", effects: { fans: 11000, pop: 0.9, rep: 1 }, note: "Kitle + görünürlük." }] },

    { id: "film_sync", tag: "SENKRON", kind: "good", weight: 2, minPop: 25, title: "Şarkın bir dizide kullanıldı",
      desc: "Bir dizide arka plan müziği olarak şarkın seçildi.",
      choices: [{ label: "Muhteşem", effects: { money: 65000, pop: 1.2, fans: 12000 }, note: "₺65.000 + görünürlük." }] },

    /* ---------- v8: 20 YENİ OLAY ---------- */
    { id: "talk_show", tag: "TV", kind: "good", weight: 2, minPop: 15, title: "Bir talk show'a davet edildin",
      desc: "Ulusal bir programda müziğini konuşmak için davet aldın.",
      choices: [
        { label: "Katıl", effects: { rep: 2, pop: 1.2, money: 20000, fatigue: 8 }, note: "İtibar + görünürlük, yorgunluk." },
        { label: "Ertele", effects: {}, note: "Formunu koru." }
      ] },

    { id: "beat_offer", tag: "BEAT", kind: "neutral", weight: 2, title: "Ünlü bir beatmaker beat gönderdi",
      desc: "Sana özel bir beat yaptı; satın almak isterse lisans ücreti var.",
      choices: [
        { label: "Lisansı al", effects: { money: -25000, streams: 0.3, pop: 0.5 }, note: "₺25.000, kalite/dinlenme artar." },
        { label: "Reddet", effects: {}, note: "Kendi beat'inle devam." }
      ] },

    { id: "sample_clear", tag: "ÖRNEK", kind: "bad", weight: 2, title: "Kullandığın sample için izin gerekiyor",
      desc: "Bir yapımcı sample'ının izinsiz kullanıldığını söylüyor.",
      choices: [
        { label: "Lisans öde", effects: { money: -35000, rep: 1 }, note: "₺35.000, temiz çözüm." },
        { label: "Sample'ı kaldır", effects: { streams: -0.15, money: -5000 }, note: "Dinlenme düşer." }
      ] },

    { id: "cypher", tag: "CYPHER", kind: "good", weight: 2, minPop: 10, title: "Büyük bir cypher'a davet edildin",
      desc: "Sektörün önemli isimleriyle aynı cypher'da yer alacaksın.",
      choices: [{ label: "Katıl", effects: { pop: 1.6, rep: 2, fans: 13000 }, note: "Görünürlük + itibar." }] },

    { id: "verse_sale", tag: "VERSE", kind: "good", weight: 2, title: "Bir sanatçı senden verse satın aldı",
      desc: "Başka bir isim senin yazdığın verse'ü kullanmak istiyor.",
      choices: [{ label: "Sat", effects: { money: 55000, rep: 0.5, fans: 4000 }, note: "₺55.000 + tanınırlık." }] },

    { id: "tour", tag: "TURNE", kind: "neutral", weight: 2, minPop: 20, title: "Şehir turu teklifi geldi",
      desc: "Beş şehirlik bir turne organize edilmek isteniyor.",
      choices: [
        { label: "Turu kabul et", effects: { money: 130000, pop: 2.2, fatigue: 28, fans: 22000 }, note: "Büyük gelir + şöhret, yüksek yorgunluk." },
        { label: "Tek şehir yap", effects: { money: 35000, pop: 0.8, fatigue: 10 }, note: "Dengeli." },
        { label: "Reddet", effects: { fatigue: -8 }, note: "Dinlen." }
      ] },

    { id: "clip_viral2", tag: "VİRAL", kind: "good", weight: 2, title: "Dance challenge başlattın",
      desc: "Şarkın üzerine bir dans akımı başladı, herkes katılıyor.",
      choices: [{ label: "Katıl", effects: { viral: 0.55, streams: 0.4, fans: 14000 }, note: "Viral + dinlenme." }] },

    { id: "interview", tag: "BASIN", kind: "good", weight: 2, title: "Gazete röportajı yayınlandı",
      desc: "Bir gazete kariyerini ve müziğini sayfalarına taşıdı.",
      choices: [{ label: "Teşekkürler", effects: { rep: 2.5, pop: 0.6, fans: 5000 }, note: "İtibar +2.5." }] },

    { id: "paparazzi", tag: "MAGAZİN", kind: "neutral", weight: 2, title: "Paparazziler peşinde",
      desc: "Özel hayatından kareler magazin sayfalarına düştü.",
      choices: [
        { label: "Görmezden gel", effects: { pop: 1, rep: 0.3 }, note: "Görünürlük artar." },
        { label: "Avukatla sustur", effects: { money: -30000, rep: 1, pop: -0.3 }, note: "₺30.000, gizlilik." }
      ] },

    { id: "algo_boost", tag: "ALGORİTMA", kind: "good", weight: 2, title: "Algoritma şarkını öne çıkardı",
      desc: "Bir platformun öneri sistemi şarkını ana sayfaya taşıdı.",
      choices: [{ label: "Devam!", effects: { streams: 0.45, pop: 1, fans: 8000 }, note: "Dinlenme +45%." }] },

    { id: "ad_sync", tag: "REKLAM", kind: "good", weight: 2, minPop: 18, title: "Şarkın bir reklamda kullanıldı",
      desc: "Büyük bir markanın reklamında müziğin yer aldı.",
      choices: [{ label: "Muhteşem", effects: { money: 95000, pop: 0.8 }, note: "₺95.000 + görünürlük." }] },

    { id: "ghostwriter", tag: "İDDİA", kind: "bad", weight: 2, title: "Ghostwriter iddiası ortaya atıldı",
      desc: "Sözlerini başkasının yazdığı iddia edildi.",
      choices: [
        { label: "Kanıtları yayınla", effects: { rep: 3, pop: 1, fans: 6000 }, note: "Haklıysan itibar +3." },
        { label: "Sessiz kal", effects: { rep: -4, pop: -0.8, fans: -7000 }, note: "Şüphe büyür." }
      ] },

    { id: "festival_cancel", tag: "FESTİVAL", kind: "bad", weight: 2, title: "Festival kadrosundan çıkarıldın",
      desc: "Organizasyon bütçe nedeniyle seni programdan çıkardı.",
      choices: [
        { label: "Alternatif sahne bul", effects: { money: -15000, pop: 0.4, fans: 3000 }, note: "₺15.000 ile telafi." },
        { label: "Kabullen", effects: { pop: -0.8, fans: -4000 }, note: "Kısa vadede kayıp." }
      ] },

    { id: "court", tag: "HUKUK", kind: "bad", weight: 2, title: "Eski bir iş için dava açıldı",
      desc: "Eski bir sözleşme anlaşmazlığı mahkemeye taşındı.",
      choices: [
        { label: "Avukatla çöz", effects: { money: -70000, rep: 1 }, note: "₺70.000, dosya kapanır." },
        { label: "Anlaşma yolunu dene", effects: { money: -30000, rep: -0.5 }, note: "Ucuz ama riskli." }
      ] },

    { id: "charity", tag: "YARDIM", kind: "good", weight: 2, title: "Yardım konseri daveti",
      desc: "Bir yardım konserinde sahne alman isteniyor; ücret yok ama itibar yüksek.",
      choices: [
        { label: "Katıl", effects: { rep: 4, pop: 0.8, money: -10000, fans: 11000 }, note: "İtibar +4, küçük masraf." },
        { label: "Bağış yap", effects: { rep: 2, money: -40000 }, note: "₺40.000 bağış." }
      ] },

    { id: "fan_meetup", tag: "BULUŞMA", kind: "good", weight: 2, title: "Hayran buluşması düzenlendi",
      desc: "Hayranların bir imza günü organize etti.",
      choices: [{ label: "Katıl", effects: { fans: 16000, pop: 0.9, fatigue: 12 }, note: "16.000 takipçi, biraz yorgunluk." }] },

    { id: "radio_no", tag: "RADYO", kind: "bad", weight: 2, title: "Radyo şarkını listeye almadı",
      desc: "Program direktörü şarkını rotasyona uygun bulmadı.",
      choices: [
        { label: "Bağımsız yayına yük ver", effects: { money: -8000, streams: 0.15, fans: 3000 }, note: "Kendi kanalından yürüt." },
        { label: "Kabullen", effects: { streams: -0.08, rep: -0.3 }, note: "Küçük durgunluk." }
      ] },

    { id: "docu", tag: "BELGESEL", kind: "good", weight: 2, minPop: 30, title: "Hakkında belgesel çekiliyor",
      desc: "Bir yapım şirketi kariyerini belgeselleştirmek istiyor.",
      choices: [
        { label: "Kabul et", effects: { money: 60000, rep: 4, pop: 1.5 }, note: "İtibar +4, gelir." },
        { label: "Reddet", effects: { rep: 0.5 }, note: "Mahremiyet." }
      ] },

    { id: "collab_ghost", tag: "GECİKME", kind: "bad", weight: 2, title: "Feature yaptığın sanatçı şarkıyı geciktirdi",
      desc: "Ortak çalıştığınız şarkı sürekli erteleniyor.",
      choices: [
        { label: "Bekle", effects: { fatigue: 6 }, note: "Sabır." },
        { label: "İşi iptal et", effects: { money: -12000, rep: 0.5 }, note: "Ayrıl, yoluna bak." }
      ] },

    { id: "signing_bonus", tag: "AVANS", kind: "good", weight: 2, minPop: 22, title: "Bir sponsor ek avans verdi",
      desc: "Mevcut iş birliğinden ek ödeme geldi.",
      choices: [{ label: "Al", effects: { money: 80000, rep: 0.3 }, note: "₺80.000." }] }
  ];

  /* ---------------- ÜN EŞİĞİ (fame gate) ----------------
     v10.33 — "Kimse seni tanımıyorken kim seninle magazin yapsın?"
     Her olay, oyuncunun ulaşmış olması gereken bir tanınırlık düzeyine
     bağlanır. Ünsüz oyuncu yalnızca mütevazı/yerel olaylar yaşar;
     magazin, vergi, dava gibi olaylar ancak belli bir ünden sonra anlam
     kazanır.
       minPop    : gereken asgari popülerlik
       needSongs : gereken en az yayınlanmış şarkı sayısı            */
  const GATE = {
    /* ünsüz → yalnızca mütevazı, yerel olaylar */
    equipment:       { minPop: 0,  needSongs: 1 },
    street_support:  { minPop: 3,  needSongs: 1 },
    tiktok_trend:    { minPop: 4,  needSongs: 1 },
    voice_loss:      { minPop: 5,  needSongs: 1 },
    radio:           { minPop: 6,  needSongs: 1 },
    fan_base:        { minPop: 6,  needSongs: 1 },
    beat_offer:      { minPop: 6,  needSongs: 1 },
    sample_clear:    { minPop: 6,  needSongs: 1 },
    radio_no:        { minPop: 6,  needSongs: 1 },
    critic_praise:   { minPop: 8,  needSongs: 1 },
    playlist:        { minPop: 8,  needSongs: 1 },
    viral_clip:      { minPop: 8,  needSongs: 1 },
    clip_viral2:     { minPop: 8,  needSongs: 1 },
    /* yükselen */
    feature_req:     { minPop: 10 },
    merch:           { minPop: 10, needSongs: 1 },
    algo_boost:      { minPop: 10, needSongs: 1 },
    payment_delay:   { minPop: 10, needSongs: 1 },
    interview:       { minPop: 10, needSongs: 1 },
    cypher:          { minPop: 10, needSongs: 1 },
    verse_sale:      { minPop: 12, needSongs: 1 },
    collab_ghost:    { minPop: 12, needSongs: 1 },
    fan_meetup:      { minPop: 12, needSongs: 1 },
    /* sansasyon / risk → tanınırlık şart */
    tax:             { minPop: 15, needSongs: 1 },
    court:           { minPop: 15, needSongs: 1 },
    ghostwriter:     { minPop: 15, needSongs: 1 },
    festival_cancel: { minPop: 15, needSongs: 1 },
    talk_show:       { minPop: 15 },
    hater:           { minPop: 18, needSongs: 1 },
    charity:         { minPop: 18 },
    gossip:          { minPop: 22, needSongs: 1 },
    paparazzi:       { minPop: 24, needSongs: 1 }
  };

  K.incidents = {
    POOL,
    applyEffects,

    /* ---------------- günlük tetikleyici ---------------- */
    maybeFire() {
      const s = K.state, p = s.player;
      if (s.pendingIncident) return;                       // önce bekleyen kararı çöz

      /* v10.33 — OLAY GERÇEKÇİLİĞİ
         1) Sıklık belirgin düşürüldü; iki olay arasında asgari 6 gün var.
         2) Şans kariyer büyüklüğüne göre ölçeklenir (ünsüz → neredeyse hiç).
         3) Her olay bir ün eşiğine bağlı (GATE) — tanınmadan magazin yok.
         4) Aynı olay kısa sürede tekrar etmez (cooldown + son olay hafızası). */
      if (s.day - (s.lastIncidentDay || -999) < 6) return;
      const pop = p.popularity || 0;
      const fame = U.clamp(0.55 + pop / 100, 0.55, 1.6);
      const mult = K.settings ? K.settings.diffMult().crisis : 1;
      const base = U.rand(EVENT_BAND[0], EVENT_BAND[1]);
      if (!U.chance(base * fame * mult)) return;

      /* Şarkısı olmayan oyuncuya "şarkın trend oldu" tipi etkisiz olay
         çıkmasın: dinlenme/viral etkisi olan olayları filtrele. Böylece
         çıkan her olayın oyunda gerçek bir karşılığı olur. */
      const songCount = (p.songs || []).length;
      const hasSong = songCount > 0;
      const needsSong = evt => (evt.choices || []).some(c => {
        const e = c.effects || {};
        return e.streams || e.viral || e.streamsAll;
      });

      /* ün eşiği + şarkı koşulu */
      const eligible = evt => {
        const g = GATE[evt.id] || {};
        const needPop = evt.minPop != null ? evt.minPop : (g.minPop || 0);
        if (pop < needPop) return false;
        if (g.needSongs && songCount < g.needSongs) return false;
        if (needsSong(evt) && !hasSong) return false;
        return true;
      };

      const seen = s.incidentSeen = s.incidentSeen || {};
      const COOLDOWN = 90;                                 // aynı olay 90 gün içinde tekrar etmez
      const pool = POOL.filter(eligible);
      if (!pool.length) return;
      const fresh = pool.filter(x => !seen[x.id] || (s.day - seen[x.id]) > COOLDOWN);
      const candidates = (fresh.length ? fresh : pool).filter(x => x.id !== s.lastIncidentId);
      if (!candidates.length) return;
      const evt = U.pickWeighted(candidates, x => x.weight || 1);

      /* hafızayı güncelle (tekrar önleme) ve eski kayıtları temizle */
      s.lastIncidentDay = s.day;
      s.lastIncidentId = evt.id;
      seen[evt.id] = s.day;
      Object.keys(seen).forEach(k => { if (s.day - seen[k] > 400) delete seen[k]; });

      if (evt.choices && evt.choices.length > 1) {
        s.pendingIncident = {
          id: evt.id, tag: evt.tag, title: evt.title, desc: evt.desc,
          kind: evt.kind, choices: evt.choices.map(c => ({ label: c.label, effects: c.effects, note: c.note })),
          day: s.day
        };
        s.notifications = (s.notifications || []).concat([{
          title: "🎲 " + evt.tag, msg: evt.title + " — karar bekliyor.",
          kind: evt.kind === "good" ? "ok" : "warn", day: s.day
        }]).slice(-60);
        K.toast("🎲 Günlük olay: " + evt.tag, evt.title, evt.kind === "good" ? "ok" : "warn");
      } else {
        const ch = evt.choices[0];
        if (ch.run) { const r = ch.run(); if (r === "modal") { K.save(); return; } }
        applyEffects(ch.effects);
        s.notifications = (s.notifications || []).concat([{
          title: "🎲 " + evt.tag, msg: evt.title + " · " + (ch.note || ""),
          kind: evt.kind === "good" ? "ok" : evt.kind === "bad" ? "bad" : "", day: s.day
        }]).slice(-60);
        K.toast("🎲 " + evt.tag, evt.title, evt.kind === "good" ? "ok" : evt.kind === "bad" ? "bad" : "");
      }
      K.save();
    },

    /* ---------------- bekleyen olayı göster ---------------- */
    pending() { return K.state.pendingIncident || null; },

    openPending() {
      const s = K.state;
      const inc = s.pendingIncident;
      if (!inc) return;
      K.ui.modal({
        title: "🎲 " + inc.tag + " — " + inc.title,
        desc: inc.desc,
        body: `<div style="font-size:12.5px;color:var(--text-1);line-height:1.65">
            ${U.escape(inc.desc)}
            <div style="margin-top:10px;font-size:11px;color:var(--text-3)">Seçimin; para, ün ve itibarını etkiler.</div>
          </div>`,
        actions: inc.choices.map((ch, i) => ({
          label: ch.label + (ch.note ? `  ·  ${ch.note}` : ""),
          cls: i === 0 ? "btn-primary" : "btn-ghost",
          onClick: () => K.incidents.resolve(i) === "modal" ? false : true
        }))
      });
    },

    resolve(index) {
      const s = K.state;
      const inc = s.pendingIncident;
      if (!inc) return true;
      const ch = inc.choices[index];
      if (!ch) return true;
      s.pendingIncident = null;
      if (ch.run) {
        const r = ch.run();
        if (r === "modal") { K.save(); return "modal"; }
      }
      applyEffects(ch.effects);
      K.toast("✅ Karar verildi", inc.title + (ch.note ? " · " + ch.note : ""), "ok");
      K.bus.emit("incident:resolved", { id: inc.id, index });
      K.save(); K.refresh();
      return true;
    }
  };
})(window.K = window.K || {});
