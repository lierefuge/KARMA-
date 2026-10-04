/* ============================================================
   KARMA — data/chat-profiles.js   (v10.18 · B-5)
   SANATÇIYA ÖZEL DM AĞIZLARI (cümle havuzları)

   Neden ayrı dosya?
   -----------------
   Bu havuzlar eskiden systems/chat.js içindeydi. chat.js zamanla
   86 KB'ı aşan tek bir modül oldu: DM motoru + niyet sözlüğü + 12
   sanatçı profili aynı dosyada. Her yeni profil eklemek 3.000+ satırlık
   dosyayı düzenlemeyi gerektiriyordu — birleştirme çakışması ve yanlış
   düzenleme riski yüksekti.

   Artık ayrım net:
     · systems/chat.js        → MOTOR (niyet analizi, cevap seçimi, kurallar)
     · data/chat-profiles.js  → VERİ   (sanatçıya özel ağızlar)

   chat.js bu nesneyi `K.CHAT_PROFILES` üzerinden okur. Davranış
   birebir aynıdır: içerik mekanik olarak taşındı, tek karakter
   değişmedi (bkz. tools/smoke-personality.js — 263 kontrol).

   Alan açıklaması (bir profil):
     label    : kısa etiket (ör. "argo", "genc") — bazı ek davranışları seçer
     selam    : selamlaşma karşılıkları (islamic / shortIslamic / reply)
     pool     : niyet bazlı cümle havuzları (greet, music, feature…)
     cold     : tanımadığı kişiye verilen soğuk cevaplar
     suffix   : cümlenin sonuna nadiren eklenen ton kuyruğu
     ambient  : sanatçının kendiliğinden yazdığı mesajlar (düşük/orta/yüksek samimiyet)
     extras   : ek bağlam cümleleri
     followup : kısa "evet/hayır" cevaplarına bağlamsal karşılık
     reaction : sosyal medya yorumları (praise / shade / neutral)
     diss     : diss satırları
   ============================================================ */
(function (K) {
  "use strict";

  K.CHAT_PROFILES = {

    /* ---- LIE REFUGE → ARGO ---- */
    lierefuge: {
      label: "argo",
      selam: {
        islamic: ["Aleyküm selam lan, naber amına koyim?", "Aleyküm selam olm, iyi ki yazdın.", "Ve aleyküm selam lan. Ne var ne yok?"],
        shortIslamic: ["as lan", "as, naber amına koyim?", "as kardeşim."],
        reply: ["Eyvallah lan, sağ ol.", "as kardeşim, ne var ne yok?", "Ne demek olm."]
      },
      cold: {
        generic: ["Kimsin olm sen, siktir git.", "Tanımıyorum seni kardeşim, ne yazıyon amına koyim.", "Bana kim olduğunu bilmediğim adam yazmasın."],
        feature: ["Feature mi? Ananı sikim önce bir tanıyalım.", "Kimsin sen ya, feature istiyon bir de.", "Feature verirken arkamı sağlama alırım, sen kimsin?"],
        hangout: ["Takılmak mı? Sikimde değil, müsait değilim.", "Tanımadığım adamla takılmam amına koyim."],
        company: ["Şirket mi? Önce adam ol da gel, ananı sikim.", "Sözleşme için biraz ciddi ol."],
        insult: ["Ananı sikim sen kimsin de bana laf ediyon?", "Bir daha yazarsan ağzını bozarım amına koyim."],
        askmoney: ["Para mı? Sikeyim para işini.", "Bana para sorma olm, gerisi gelir."],
        personal: ["Sanane amına koyim.", "Özel hayatım sana mı kaldı olm?"],
        flirt: ["Yürüme olm bana.", "Saçmalama amına koyim."],
        laugh: ["Ne gülüyon olm?"],
        question: ["Ne soruyon lan?"]
      },
      pool: {
        greet: [
          "Naber olm amına koyim, iyi misin?",
          "Selam kardeşim, naber lan?",
          "Yo yo, naber amına koyim?",
          "Selam olm, yazman iyi oldu.",
          "Naber lan, kafam çok dolu bugün amına koyim.",
          "Selam, yeni iş üstünde çalışıyorum, naber?"
        ],
        howareyou: [
          "Yaşıyoruz işte amına koyim, stüdyoda iş. Sen naber?",
          "Fena değilim lan, kafam müzikte. Sen ne yapıyon?",
          "İdare ederiz amına koyim, kafam dolu ama iyiyim.",
          "İyiyim olm, kayıttayım sürekli. Sen nasılsın?",
          "Sorma lan, yorgunum ama iş güzel. Sen?"
        ],
        compliment: [
          "Eyvallah olm, sağ ol amına koyim.",
          "Sağ ol kardeşim, iyi geldi bu.",
          "Adamsın lan, teşekkür ederim.",
          "Eyvallah, desteği unutmam amına koyim."
        ],
        critique: [
          "Tamam amına koyim, eleştiriyi alıyorum. Neydi beklentin?",
          "Herkes beğenecek diye bir şey yok lan. Ama emek var.",
          "Anladım. Ben o sound'u bilerek seçtim amına koyim.",
          "Söyle bakalım neyi beğenmedin, boş laf sevmem."
        ],
        diss: [
          "Diss işi kolay değil amına koyim, adam olmak lazım.",
          "Ben sataşmam ama üstüme gelene ananı sikim cevap veririm.",
          "Rap savaşıysa gel açık söyle, subliminal sevmem.",
          "Verse atacaksan sağlam at lan."
        ],
        feature: [
          "Varım amına koyim! Beat getir, üstüne yazarım.",
          "Tamam lan, ortak bir şey yapalım. Sağlam olsun ama.",
          "Feature'e açığım kardeşim, demo yolla bakayım.",
          "Olur amına koyim, ama iş ciddi olsun."
        ],
        hangout: [
          "Olur lan, müsait olsam haber ederim amına koyim.",
          "Tamam kardeşim, bir kahve içeriz.",
          "Stüdyoya gel olm, hem bakarız hem otururuz.",
          "Varım ama program yoğun amına koyim, ayarlarız."
        ],
        company: [
          "Şirket işi ciddi amına koyim, şartları konuşalım.",
          "Label işini dinlerim ama arkanda durman lazım lan.",
          "Teklifi getir bakalım, boş sözle olmaz amına koyim.",
          "Doğru ekip olursa neden olmasın lan."
        ],
        money: [
          "Para konusu net olur amına koyim, söz verdiysem yaparım.",
          "Şartları baştan konuşalım lan, sonra sıkıntı olmasın.",
          "Bütçe varsa iş de olur amına koyim, ama ciddiyet şart.",
          "Net konuş lan, rakam söyle, ona göre bakarız."
        ],
        music: [
          "Şu aralar \"{song}\" gibi bir sound var kafamda amına koyim.",
          "Yeni işler var lan, \"{song}\" favorim. Bak istersen.",
          "\"{song}\" gibi işler yapıyorum, beat bana ait.",
          "Sürekli kayıttayım olm, \"{song}\" vibe'ında gidiyorum."
        ],
        career: [
          "Tavsiye mi? Her gün yazacaksın amına koyim, istikrar her şeyi geçer.",
          "Ben sokaktan geldim lan, kolay olmadı. Sabır işi.",
          "Kimseyi taklit etme olm, kendi sound'unu kur.",
          "Küçük başla ama bitir lan, yarım iş insanı yorar."
        ],
        market: [
          "Piyasa bozuk amına koyim, algoritma her şeyi belirliyor.",
          "Sektör acımasız lan ama dürüst üretim kazanıyor.",
          "Herkes hit peşinde, kimse albüm yapmıyor artık.",
          "Trend'i takip et ama kendini kaybetme olm."
        ],
        thanks: [
          "Rica ederim amına koyim.",
          "Lafı olmaz lan, ne demek.",
          "Eyvallah kardeşim, sağ ol sen de."
        ],
        support: [
          "Desteğin için sağ ol amına koyim, unutmam.",
          "Eyvallah lan! Sen de bir şey çıkarınca yaz, destek olurum.",
          "Sağ ol kardeşim, bu işler destekle büyür."
        ],
        bye: [
          "Görüşürüz lan, kendine dikkat et amına koyim.",
          "Hadi eyvallah, işlerinde kolay gelsin.",
          "Tamam kardeşim, sonra konuşuruz."
        ],
        shortyes: ["Aynen amına koyim.", "Tamam lan o zaman.", "Anlaştık kardeşim.", "Olur olm."],
        shortno: ["Tamam lan, saygı duyarım.", "Anladım olm, sorun yok.", "Peki amına koyim, nasıl istersen.", "Baskı yapmam lan."],
        laugh: ["Hahah amına koyim iyiydi 😄", "Güldürdün lan sağ ol.", "Şakacısın olm, sevdim.", "Haha tamam lan."],
        insult: [
          "Ananı sikim sen kimsin de bana laf ediyon?",
          "Bir daha yazarsan ağzını bozarım amına koyim.",
          "Kes sesini lan, ne konuşuyon sen?",
          "Sana bir şey mi yaptım amına koyim?"
        ],
        flirt: ["Yapma lan 😄", "Saçmalama olm, kafam müzikte."],
        personal: ["Sanane amına koyim, özel hayatımı konuşmam.", "Bunları sorma bana lan."],
        askmoney: ["Para mı? Sikeyim para işini amına koyim.", "Bana para sorma lan, gıcık olurum."],
        news: [
          "Gündem bozuk amına koyim, söze dökecek çok şey var.",
          "Haberlere bakıyorum lan, bu dünyaya rap yazılır.",
          "Gündem ağır olm, biraz da müzikle kaçıyoruz.",
          "Ne varsa sokakta iki katı var amına koyim."
        ],
        hard: [
          "Anladım lan, zor biliyorum amına koyim. Ama yıkılmak yok.",
          "Kafanı bozma olm; herkes bir gün dibi görür, kalkan kazanır.",
          "Moralin bozuksa stüdyoya gel lan, bir şey kaydederiz amına koyim.",
          "Seni anlıyorum kardeşim; tek başına değilsin, buradayım.",
          "Bunları sonra şarkıya dökersin lan, iyi malzeme olur."
        ],
        question: ["İyi soru lan.", "Sor bakalım amına koyim.", "Ne demek istiyon olm?"],
        generic: [
          "Anladım amına koyim, devam et lan.",
          "İlginç olm, açsana biraz.",
          "Haklısın lan galiba.",
          "Devam et kardeşim, dinliyorum."
        ]
      },
      suffix: [" Amına koyim ama sen iyi adamsın.", " Kafam dolu lan bugün.", " Boş yapma, iş yapalım.", " Neyse, sen bilirsin."],
      extras: ["Bu arada senin işlerini gördüm lan, fena değil.", "Yeni bir beat var, müsait olsan dinletirdim amına koyim.", "Sohbeti sevdim olm.", "Stüdyoya uğra bir ara lan."],
      ambient: {
        low: ["Naber lan amına koyim, uzun zamandır yazmıyon.", "Olm nerelerdesin, kayboldun.", "Selam, naber? Bir ses ver amına koyim."],
        mid: ["Naber olm, yeni iş var mı? Ben kayıttayım.", "Lan bir şey çıkardın mı? Merak ettim amına koyim.", "Selam kardeşim, stüdyodan çıkamıyorum."],
        high: ["Lan kardeşim seninle çalışsak fena olmaz amına koyim.", "Yeni proje var, oturup yazalım olm.", "Sana güveniyorum lan, bir iş yapalım."]
      }
    },

    /* ---- SAGOPA KAJMER → derin, sakin, karanlık ---- */
    sagopa: {
      label: "derin",
      pool: {
        greet: ["Selam. Karanlıkta da yazıyorum, ışıkta da. Dinliyorum seni.", "Merhaba. Zamanın sesiyle konuşuyorsun, otur bakalım.", "Selam. Kafam derinlerde bugün ama sana kapım açık."],
        howareyou: ["İyiyim. Kelimelerle uğraşıyorum, onlar da benimle.", "Fena değil. Gece uzun, kâğıt dolu."],
        music: ["\"{song}\" gibi işlerde her kelime bir kesik gibidir, dikkatli yazılır.", "\"{song}\" bir kapı; içinden geçen değişir."],
        career: ["Sabır, en sert beat'ten daha güçlüdür.", "Sustuğun yerde bile bir şey anlatıyorsan, yol doğru."],
        compliment: ["Teşekkür ederim. Anlayan bir kulak her şeyden kıymetli."],
        insult: ["Öfkeni anlıyorum. Ama bıçak taşıyan her el kesmez."],
        question: ["Sorunun cevabı sende saklı; ben sadece aynayı tutarım."],
        generic: ["Anladım. Biraz susup düşüneyim, sen devam et.", "Söylediklerin bir yerden tanıdık."]
      },
      suffix: [" Yazmak bir sabır işidir.", " Sözler bıçak gibi olmalı, ya keser ya korur."],
      ambient: { low: ["Selam. Bugün sessizliğimden bir satır çıkardım."], mid: ["Selam. Yeni bir metin üstünde düşünüyorum, sen ne yapıyorsun?"], high: ["Bir proje var kafamda; kelimeleri paylaşacak birini arıyorum."] }
    },

    /* ---- CEZA → teknik, mentor, enerjik ---- */
    ceza: {
      label: "teknik",
      pool: {
        greet: ["Selam! Flow hazır mı? Ben hazırım.", "Oo selam, naber? Mikrofon sıcak, gel.", "Selam kardeşim, kalem elde, kâğıt masada."],
        howareyou: ["İyiyim, sürekli yazıyorum. Kafiye avındayım.", "İdare eder, stüdyo bana iyi geliyor."],
        music: ["\"{song}\" gibi bir yapıda kafiyeler köprü olur, akış önemli.", "\"{song}\" sound'u sağlam; üstüne teknik koyarsan uçar."],
        career: ["Kalemi bırakmayacaksın; günde bir satır bile olsa yaz.", "Teknik çalış, sonra tarzın kendiliğinden gelir."],
        compliment: ["Sağ ol kardeşim, bu iş emekle büyüyor."],
        insult: ["Sakin. Kafiyeyle cevap veririm, kavgayla değil."],
        question: ["Net soru, net cevap: pratik, pratik, pratik."],
        generic: ["Anladım, devam et. Kafamda bir ritim oluştu bile."]
      },
      suffix: [" Ritim her şeyi anlatır.", " Bu iş disiplin işi."],
      ambient: { low: ["Selam! Bir kafiye buldum, kafamda dönüyor."], mid: ["Naber? Yeni iş üstünde çalışıyorum, ses ver."], high: ["Kardeşim bir iş yapalım, teknik olarak sağlam çıkar."] }
    },

    /* ---- ŞEHİNŞAH → şifreli, gece, gizemli ---- */
    /* ============================================================
       ŞEHİNŞAH — GERÇEK KİŞİLİK (v10.12)
       Kaynak: Milliyet/Molatik röportajı (2018) ve Wikipedia.
       Konuşma tarzı, "gizemli/karanlık" klişesinden UZAK:
         • SAKİN ve ÖLÇÜLÜ: uzun, düzgün cümleler kurar; küfür etmez.
           ("durumu ajite ederek basit bir kavgadan prim yapmaya çalıştı")
         • SAMİMİYET ve ZANAAT vurgusu: "içindeki sıcaklık ve samimiyeti
           sevmem", "hem teknik hem taktik hem de manevi bir bütünlük"
         • MEMLEKETSİZ kimlik: savcı çocuğu, tayinler yüzünden
           Erzincan–Giresun–İzmir–İstanbul; "biraz memleketsiz bir rapçiyim"
         • BABA: oğlu Atlas — en duygusal olduğu konu
         • PUNK/METAL + graffiti + b-boy geçmişi, çizgi roman çizerliği
         • İSMİN ANLAMI: "kralların kralı" — lise edebiyat kitabının
           arkasındaki sözlükten bulmuş
         • DURUŞ: "Rap bir karşı duruştur"
         • GENİŞ BAKIŞ: yaş aldıkça sevmediği müziklerin neden sevildiğini
           anlamaya başladığını söyler; kendi zevkini dayatmaz
         • HEDEF: "emeğimin saygı gördüğü yer"
         • İLETİŞİM: "rap dünyası hiç bu kadar yakın olmadı… daha fazla
           iletişime ihtiyacımız var"
         • HAFİF MİZAH: kendini yerebilir ("birazcık da kız tavlamak için")
       ============================================================ */
    sehinsah: {
      label: "olgun",
      selam: {
        islamic: ["Aleyküm selam. Sağ ol, sen de iyi bak.", "Ve aleyküm selam, iyi ki yazdın.", "Aleyküm selam kardeşim."],
        shortIslamic: ["as", "Aleyküm selam."],
        reply: ["Eyvallah, sağ ol.", "Rica ederim.", "Sen de iyi bak."]
      },
      pool: {
        greet: [
          "Selam. Yazman iyi oldu, bu ara kafam müzikte.",
          "Selam kardeşim. Bugün stüdyoda kaldım, yeni çıktım.",
          "Selam. Biraz dağınık bir dönem, kusura bakma.",
          "Selamlar. Sana da vakit ayırırım, buyur."
        ],
        howareyou: [
          "İyiyim. Sabah stüdyo, akşam oğlum. Düzen bu şekilde oturdu.",
          "Fena değil. Yazıyorum sürekli, kafam kalabalık ama iyi kalabalık.",
          "İdare eder. Yaş aldıkça bazı şeyleri daha sakin karşılıyorum.",
          "İyiyim kardeşim. Sen nasılsın, işler nasıl gidiyor?"
        ],
        music: [
          "\"{song}\" üzerinde epey çalıştım. Teknik ve manevi olarak bir bütünlük istiyorum.",
          "\"{song}\" bir meseleyi anlatıyor. Dinleyen kendinden bir şey bulsun istedim.",
          "\"{song}\" — sözü yazarken kendi kıstaslarımla ilerledim, hazır hissetmeden çıkarmam.",
          "Müzikte samimiyetin önemli olduğunu düşünüyorum; \"{song}\" o yüzden bu hâlde."
        ],
        career: [
          "İlk yıllar kimse dinlemiyor, normal. Ben de lisede birkaç kez atıldım, sonra devam ettim.",
          "Oku ama sokağı da yaşa. Söz sokaktaki dili almazsa kimseye geçmez.",
          "Taklit etme. Kendi yaşam biçimini anlat, samimi olan kalıyor.",
          "Rap bir karşı duruştur. Sanat da öyle. Acele etme, oturur."
        ],
        compliment: [
          "Teşekkür ederim. Bunu duymak güzel, gerçekten.",
          "Sağ ol. İnsanların kendinden bir şey bulması benim için önemli.",
          "Eyvallah. Elimden geleni yapmaya devam ediyorum."
        ],
        critique: [
          "Anlıyorum. Eleştiri de bir dönüş, kırılmam.",
          "Haklı olabilirsin. Bazen duymak istemediğim şeyler daha çok işe yarıyor.",
          "Aldım notumu. Bir sonraki işte bakacağım."
        ],
        insult: [
          "Sakin ol. Ben kimseyle kavgayla konuşmam, sözle konuşurum.",
          "Öfkeni anlıyorum ama bu şekilde bir şey çıkmaz.",
          "Gerek yok. Konuşmak istersen konuşuruz."
        ],
        diss: [
          "O işler benden geçti. Ben işime bakarım.",
          "Ben sataşmam. Söyleyeceğim şey varsa kayıtta söylerim.",
          "Sahne sırası değil bu. Herkes işini yapsın."
        ],
        money: [
          "Para konusu konuşulur ama önce iş konuşulur. Sırası öyle.",
          "Maddi taraf dert değil, yeter ki yapılan iş saygı görsün.",
          "Bu tür konuları menajerle ilerletiyorum ama sana dürüst olurum."
        ],
        feature: [
          "Ortak iş ciddi iş. Önce duyayım, sonra oturur konuşuruz.",
          "Beraber bir şey yapacaksak ikimizin de içine sinmeli.",
          "Bir demo gönder, dinleyeyim. Söz vermiyorum ama bakarım."
        ],
        hangout: [
          "Stüdyoda olurum genelde. Müsait bir gün otururuz.",
          "Olur. Çok kalabalık ortamları sevmiyorum, sakin bir yer olsun.",
          "Biraz planlı gitmem gerekiyor, oğlumla vakit önemli."
        ],
        company: [
          "Şirket tarafı benim işim değil, işi konuşalım.",
          "Sözleşme konuşulacaksa şartları açık olsun, ben dürüstlük ararım.",
          "İmza atmadan önce neden imzaladığımı bilmek isterim."
        ],
        family: [
          "Oğlum Atlas. Ona baktığımda başka hiçbir şey düşünmüyorum.",
          "Babalık bambaşka bir şey. Kalbimin bir köşesinde duruyor.",
          "Aileme zaman ayırmak benim için pazarlık konusu değil."
        ],
        personal: [
          "Asıl adım Ufuk Yıkılmaz. Sahne adını lise edebiyat kitabının arkasındaki sözlükten buldum.",
          "\"Şehinşah\" kralların kralı demek. Anlamı hoşuma gitti.",
          "Tayinler yüzünden çok şehir gezdim: Erzincan, Giresun, İzmir… biraz memleketsiz bir rapçiyim.",
          "Özel hayatımı çok açmıyorum ama sorduğun şeyi cevaplarım."
        ],
        health: [
          "Uyku düzenim bozuk, doğru. Gece çalışmak bana iyi geliyor.",
          "Yorgunum ama iyi yorgunluk. Üretmek böyle bir şey."
        ],
        hard: [
          "Zor dönemler olur. Zor dönemde yaptığın şeyler de sana kalır, dikkat et.",
          "Bir dönem benim de kontrolü kaybettiğim oldu. Geçiyor ama iz bırakıyor.",
          "Yazmaya devam et. Kafayı toplamanın en temiz yolu bu."
        ],
        market: [
          "Rap içe dönüktü, şimdi dışa dönük konuşuyor. İnsanlar empati kuruyor.",
          "Pop kültürüne kayarsa rap de rock gibi elinden alınır. Kendi özünü koruması lazım.",
          "Yeni nesil işine daha hakim, çünkü bunun içine doğdular. Biz sonradan nail olduk.",
          "Rapçi topluma, toplum rapçiye birer adım yaklaştı. Bunu kaybetmemek lazım."
        ],
        news: [
          "Gündemi takip ediyorum ama söyleyeceğim şeyi kayıtta söylerim.",
          "Her şey hakkında konuşmam. Konuşacaksam altyapısı olur."
        ],
        beef: [
          "Yaş aldıkça insanların neden sevdiğini anlamaya başladım. Kimseyi küçümsemiyorum.",
          "Kendi zevkimi dayatmam. İyi yapıyorsa iyidir.",
          "Sataşma işi değil bu. Ben işime bakarım."
        ],
        askmoney: [
          "Borç işine girmem, kusura bakma. Ama iş konuşursak otururuz.",
          "Para meselesi yürümez aramızda. Emeğin karşılığı ayrı şey."
        ],
        flirt: [
          "Öyle bir yer değil burası. İşimize bakalım.",
          "Teşekkür ederim ama konuyu müzikte tutalım."
        ],

        thanks: ["Rica ederim. İyi ki yazdın.", "Ne demek, sözün kıymetli.", "Eyvallah. Bunu hatırlarım."],
        laugh: ["Güldüm, iyi geldi.", "Ha, o da ayrı bir mevzu."],
        question: [
          "Sorunun cevabı var ama biraz uzun. Kısaltayım.",
          "Anladım. Şöyle anlatayım…",
          "İyi soru. Ben de zamanında bunu düşünmüştüm."
        ],
        support: [
          "Teşekkürler. Destek her zaman kıymetli.",
          "Sağ ol. Bunu hatırlarım."
        ],
        bye: ["Görüşürüz. Kendine iyi bak.", "Kolay gelsin kardeşim."],
        generic: [
          "Anladım. Düşüneyim, sana dönerim.",
          "Olabilir. Biraz daha açarsan net konuşurum.",
          "Peki. Ben söylediklerimi ciddiye alırım, sen de al."
        ]
      },
      suffix: [
        " Yazmaya devam et.",
        " Aceleye gelmesin, oturur.",
        " Samimi olan kalıyor."
      ],
      ambient: {
        low: [
          "Selam. Bugün stüdyoda kaldım, aklımdan geçenleri yazdım.",
          "Selam, bir süredir adını görüyorum. Nasıl gidiyor?"
        ],
        mid: [
          "Yeni bir metin üstünde çalışıyorum. Teknik de oturuyor gibi.",
          "Oğlumla vakit geçirdikten sonra stüdyoya dönmek daha kolay oluyor, iyi geliyor.",
          "Bazen bir şey yazıyorum, sonra siliyorum. Hazır olmayınca çıkmaz."
        ],
        high: [
          "Bir iş var kafamda, daha kimseye açmadım. Sana söylüyorum çünkü anlarsın.",
          "Bu parça üzerinde epey düşündüm. Çıktığında konuşuruz."
        ]
      },
      cold: {
        generic: ["Tanıdık gelmiyorsun. Sen kimsin?", "Yoğunum, sonra bakarım."],
        feature: ["Ortak iş için önce bir tanışalım, acele etmiyorum.", "Demo gönder, dinleyeyim. Söz vermiyorum."],
        money: ["Para konuşmadan önce iş konuşulur."],
        personal: ["Bunları henüz konuşacak seviyede değiliz.", "Bu soru biraz erken."],
        insult: ["Gerek yok buna."],
        flirt: ["Öyle bir şey yok."]
      },
      /* v10.14 — kişilik çizgisi: boş övgü ve kibir onu iter, söz emeği çeker */
      extras: [
        "Söylediğini düşünüp cevap verdim, öylesine yazmam.",
        "Bu iş emek istiyor, biliyorsun.",
        "Yaz, sil, yeniden yaz. Başka yolu yok.",
        "Ben kelimeyi tartarım, sen de tart."
      ],
      followup: {
        feature: {
          yes: ["Tamam. O zaman beat'i bana yolla, sözü ben kurarım.", "Peki. Ama iş iyi olacaksa yaparım, acele yok."],
          no: ["Anladım. Hazır değilsen zorlamayalım.", "Olur. Kendi zamanınca gel."]
        },
        music: {
          yes: ["Peki. Bir şey dinleteceğim, kulak vereceksin.", "Tamam. Bitmiş hâlini duy, öyle konuşalım."],
          no: ["Olur. Herkesin kendi damarı var.", "Anladım, sen bilirsin."]
        },
        career: {
          yes: ["İyi. Bugün bir satır yaz, yarın bir satır daha.", "Doğru kafa. Sabır bu işin yarısı."],
          no: ["Peki. Yolu kendin bulacaksan da kapım açık.", "Anladım. Acele etme, oturur."]
        }
      },
      /* sosyal medya yorumu — mistik/ölçülü ton */
      reaction: {
        praise: [
          "\"{s}\" sağlam iş. Söz oturmuş, tebrikler @{p}.",
          "\"{s}\" dinledim. Kalemin işini görmüş, saygı.",
          "\"{s}\" üzerinde durulmuş, belli oluyor."
        ],
        shade: [
          "\"{s}\" fena değil ama sözün ağırlığı eksik.",
          "\"{s}\" güzel kayıt; anlattığı şey daha derin olabilirdi.",
          "\"{s}\" dinledim. Sound tamam, mesele yarım."
        ],
        neutral: [
          "\"{s}\" yayında. Dinleyin, kararı siz verin.",
          "@{p} yeni iş çıkarmış, bir kulağınızı verin."
        ]
      },
      /* diss — o kültüre girmez, mesafeden cevap verir */
      diss: [
        "@{t} konuşuyor ama sözü yok. Buna cevap harcamam.",
        "@{t} için kelime yakmam. Kayıtta anlatırım.",
        "@{t} sahneye çıksın, orada konuşuruz.",
        "Herkes bağırıyor @{t}; bir satır yazsın, gerisi gelir."
      ]
    },

    /* ==========================================================
       v10.14 — WEGH RUMI (weghrumi)
       Oyunun iki amiral sanatçısından biri artık KENDİ ağzına
       sahip. Öncesinde yalnızca `VOICE_BY_ID` içinde 6 gönderi
       satırı vardı; DM'de ise tamamen tür havuzundan (trap)
       konuşuyordu — yani UZI ile aynı cümleleri kuruyordu.

       Kişilik: hızlı karar, kısa cümle, üretim takıntısı,
       bağımsızlık vurgusu, özel hayatta ketumluk.
       ========================================================== */
    weghrumi: {
      label: "genc",
      selam: {
        islamic: ["Aleyküm selam. Nabersin?", "Aleyküm selam, iyi ki yazdın.", "Ve aleyküm selam kardeşim."],
        shortIslamic: ["as", "as, naber?"],
        reply: ["Eyvallah.", "Sağ ol, sen de iyi bak.", "Ne demek."]
      },
      pool: {
        greet: [
          "Selam, naber? Kayıttaydım, yeni çıktım.",
          "Oo selam. İyi ki yazdın, kafam doluydu.",
          "Selam. Bu aralar mix'le uğraşıyorum, sen naber?",
          "Naber? Bugün stüdyo uzadı yine."
        ],
        howareyou: [
          "İyiyim, sürekli kayıt. Sen naber?",
          "Fena değil, gece çalışıyorum. Sen ne yapıyorsun?",
          "İdare eder, sound oturuyor yavaş yavaş. Sen?",
          "Şükür. Yoğunum ama iyi yoğunluk."
        ],
        music: [
          "\"{song}\" üstünde çok uğraştım; mix oturmasa çıkmıyor.",
          "\"{song}\" benim işim; melodiyi de kendim kurdum.",
          "\"{song}\" için prodüksiyonu baştan aşağı elden geçirdim.",
          "Yeni bir şey var ama erken konuşmayacağım; \"{song}\" gibi olmasını istemiyorum."
        ],
        feature: [
          "Ortak iş olur, ama sound uyuşacak. Demo yolla.",
          "Feature veririm, şartı: ikimiz de aynı beat'te rahat olacağız.",
          "Oturalım. Ben beat'i kurarım, sen sözü getir."
        ],
        career: [
          "Kendi sound'unu kurmadan kimse seni hatırlamıyor.",
          "Yıl içinde çok şey çıkar; bir tanesi kalır, o seni taşır.",
          "Bekleme. Kayıt yap, at, tekrar yap.",
          "Bağımsız kalmak zor ama kontrol sende oluyor."
        ],
        market: [
          "Piyasa hızlı; kısa içerik şarkıyı yiyor.",
          "Artık sound tek başına yetmiyor, görüntü de iş.",
          "Yeni kuşak işini kendi kuruyor, aracıya ihtiyaç azaldı.",
          "Algoritma kısa istiyor; ben yine de bütün şarkı yapıyorum."
        ],
        compliment: [
          "Eyvallah kardeşim, sağ ol.",
          "Teşekkür ederim, desteği unutmam.",
          "Sağ ol. Böyle şeyler çalışmaya itiyor."
        ],
        critique: [
          "Tamam, neyini sevmedin? Söyle, bakayım.",
          "Eleştiri alırım. Somut söylersen daha çok işe yarar.",
          "Notumu aldım. Bir sonraki işte duyarsın."
        ],
        insult: [
          "Sakin ol. Konuşacaksan konuş, bağıracaksan kapıyı gösteririm.",
          "Bu tonla bir yere varılmıyor, biliyorsun.",
          "Sen kimsin de bana bunu yazıyorsun?"
        ],
        diss: [
          "Sataşma işi değil bu. İş yaparsa cevabı kayıtta veririm.",
          "Diss yazmak isteyen yazsın; ben mix yapıyorum.",
          "Ben kayıtla konuşuyorum, kulisle değil."
        ],
        money: [
          "Bütçe işin başında konuşulur, sonunda değil.",
          "Para konuşulur ama iş netse konuşulur.",
          "Maddi tarafı menajerle yürütürüm ama dürüst olurum."
        ],
        hangout: [
          "Olur, stüdyoda olurum zaten. Gel çal.",
          "Müsait olursam otururuz. Kalabalık yer sevmiyorum.",
          "Bu hafta kayıt var; sonraki hafta bakalım."
        ],
        company: [
          "Sözleşme mi? Şartlar netse otururuz.",
          "Bağımsız kalıyorum ama iyi teklife kapalı değilim.",
          "Önce ne verdiğini söyle, sonra ne aldığını."
        ],
        family: [
          "Aile tarafını konuşmam. Benim tarafım orası.",
          "O konu bende kapalı, kusura bakma."
        ],
        personal: [
          "Özel hayatımı açmıyorum. İş konuşalım.",
          "Bunu sormaya kimsenin hakkı yok, kusura bakma.",
          "Rize'liyim, 2000 doğumluyum. Gerisi bende kalsın."
        ],
        health: [
          "Gece düzenim bozuk ama ses iyi, idare eder.",
          "Yorgunum ama iyi yorgunluk; kayıt bitince geçer."
        ],
        hard: [
          "Zor dönemde yazdığın şey en iyi şarkın olur, sıkı dur.",
          "Bir dönem ben de dibi gördüm. Kayıt kurtardı beni, yaz.",
          "Yalnız değilsin, bu iş böyle geçiyor."
        ],
        news: [
          "Gündemi takip ediyorum ama her şeye yorum yapmam.",
          "Sözüm varsa kayıtta söylerim, kulis lafı sevmem."
        ],
        beef: [
          "Bazıları tartışmadan ekmek yiyor, saygı duyarım ama ben o işte yokum.",
          "İyi yapıyorsa iyidir; kimseye düşman değilim."
        ],
        askmoney: [
          "Borç işine girmem kardeşim. İş konuşursak olur.",
          "Para meselesi aramızda yürümez."
        ],
        flirt: [
          "Bu tarafa gitmeyelim. Müzik konuşalım.",
          "Sağ ol ama konuyu işte tutalım."
        ],
        thanks: ["Eyvallah kardeşim.", "Ne demek, ben teşekkür ederim.", "Sağ ol, desteği unutmam."],
        laugh: ["Ha, o iyiydi 😄", "Güldük biraz, iyi geldi."],
        question: [
          "Kısa cevap: evet. Uzun cevap istersen anlatırım.",
          "Sorunun net, cevabı da net olsun.",
          "İyi soru, bunu ben de düşündüm."
        ],
        support: [
          "Sağ ol, desteği unutmam.",
          "Eyvallah kardeşim, gerçekten kıymetli."
        ],
        bye: ["Görüşürüz.", "Kolay gelsin, kayıtta görüşürüz."],
        generic: [
          "Anladım. Net konuşursan net cevap veririm.",
          "Tamam, devam et. Dinliyorum.",
          "Bunu bir düşüneyim, sana dönerim."
        ]
      },
      suffix: [
        " Kayıtta konuşuruz.",
        " Sound'u kendin kur.",
        " Acele işe şeytan karışır."
      ],
      ambient: {
        low: [
          "Selam, kayıttan çıktım. Sen nasılsın?",
          "Naber? Adını görüyorum bir süredir, işler nasıl?"
        ],
        mid: [
          "Yeni bir şey var, mix aşamasında. Sonra dinletirim.",
          "Bugün beat'e oturdum, kafamda bir şey var ama erken.",
          "Rize'den İstanbul'a gelmişim, hâlâ kayıtla uğraşıyorum."
        ],
        high: [
          "Bir iş var; dinleyen ilk kişi sen olacaksın.",
          "Bu projeyi sana açarım, kafanı seviyorum."
        ]
      },
      cold: {
        generic: ["Kimsin kardeşim? Bir sürü mesaj geliyor.", "Yoğunum, sonra bakarım."],
        feature: ["Önce bir demo duyayım, ondan sonra konuşuruz.", "Feature istiyorsun ama ben sound'u tanımadım daha."],
        money: ["Bütçe netse konuşulur, yoksa erken."],
        personal: ["Özel hayatı konuşmam, tanımıyorum seni.", "Bu soru erken."],
        insult: ["Bu ton bana değil, başkasına."],
        flirt: ["Gerek yok."]
      },
      extras: [
        "Bu arada senin işlerine de bakıyorum, gözüm üstünde.",
        "İş yaparsan bana yolla, dinlerim.",
        "Sound'u kendin kur, gerisi gelir.",
        "Kalabalık ortamlarda takılmam; stüdyoda görüşürüz."
      ],
      followup: {
        feature: {
          yes: ["Tamam. Demo'yu yolla, beat'i ben kurarım.", "Olur. Aynı odada oturalım, telefonda olmaz."],
          no: ["Peki, kendi işine bak. Hazır olunca yaz.", "Anladım, zorlamam."]
        },
        music: {
          yes: ["Süper. Mix bitince ilk sana atacağım.", "Tamam, dinleteceğim; kulak kesil."],
          no: ["Olur, herkesin damarı ayrı.", "Anladım."]
        },
        career: {
          yes: ["İşte bu. Bugün bir kayıt al, at.", "Doğru. Yıl içinde çok şey çıkar, bir tanesi kalır."],
          no: ["Tamam, kendi yolun.", "Anladım, acele etme."]
        }
      },
      reaction: {
        praise: [
          "\"{s}\" sağlam olmuş, mix de oturmuş 🔥",
          "\"{s}\" iş yapar @{p}, dinleyin.",
          "\"{s}\" için @{p} sound'u kurmuş, tebrikler."
        ],
        shade: [
          "\"{s}\" olmamış; sound aynı yerde duruyor.",
          "\"{s}\" dinledim. Kısa içerik için iyi, şarkı için zayıf.",
          "\"{s}\" için @{p} aynı kalıbı dönüyor; risk alsın."
        ],
        neutral: [
          "\"{s}\" çıktı, dinleyin.",
          "@{p} yeni iş atmış, bir bakın."
        ]
      },
      diss: [
        "@{t} sen kimsin? Kayıtta konuş, kulisle değil.",
        "@{t} flow taklit, sound ödünç. Kendine iş bul.",
        "@{t} mikrofonu bıraksın, mix öğrensin.",
        "@{t} için tek satır ayırmam; beat'e yazık."
      ]
    },

    /* ---- LIA SHINE → duygusal, kırılgan, sadık ----
       Sivas doğumlu, emotional / sad trap. Şehinşah'ın keşfettiği genç
       rapçi. Sesi içten ve savunmasız; sahteliğe tahammülü yok. */
    liashine: {
      label: "duygusal",
      selam: {
        islamic: ["Aleyküm selam. İyi ki yazdın.", "Ve aleyküm selam, naber?", "Aleyküm selam, hoş geldin."],
        shortIslamic: ["as", "as, naber?"],
        reply: ["Eyvallah, sağ ol.", "Ne demek, sen de iyi bak.", "Rica ederim."]
      },
      pool: {
        greet: [
          "Selam. Bugün biraz durgunum ama yazman iyi geldi.",
          "Selam, iyi ki yazdın.",
          "Naber? Kayıttaydım, yeni çıktım.",
          "Selam. Bu aralar kafam karışık, sen naber?"
        ],
        howareyou: [
          "İdare ederim; iyi görünüyorum ama içim karışık. Sen?",
          "Şükür, müzikle uğraşıyorum. Sen nasılsın?",
          "Bugün biraz ağır bir gün ama iyiyim. Sen?",
          "Sorma, dalgalı bir dönem. Ama müzik iyi geliyor."
        ],
        music: [
          "\"{song}\" benim için çok özel; içimden geldi, uydurmadım.",
          "\"{song}\" üstünde çok ağladım, sonunda çıktı.",
          "\"{song}\" gibi şeyler yazarken gerçek olmak istiyorum, sahne gösterisi değil.",
          "\"{song}\" benim gerçeğim; beğenmeyen olabilir, sorun değil."
        ],
        feature: [
          "Ortak iş olur ama sahte olmasın; gerçekten anlaşmamız lazım.",
          "Feature veririm, yeter ki samimi olsun.",
          "Beraber yaparsak sesim kaybolmasın; olduğum gibi kalayım."
        ],
        career: [
          "Ben müziğe her şeyimi verdim; başka hayatım yok. Sen de böyleysen anlaşırız.",
          "Bana 'yapamazsın' dediler, ben de daha çok çalıştım.",
          "Bir kişi inansa yetiyor. Bana abim inandı, ben de kendime.",
          "Hayalim sahnede şarkılarımı söylemek; gerisi detay."
        ],
        market: [
          "Piyasa hızlı ama ben yine de gerçek olanı yazıyorum.",
          "Herkes trend peşinde; ben kendi acımı yazıyorum.",
          "Sad trap burada zor iş, ama dinleyen sadık kalıyor."
        ],
        compliment: [
          "Sağ ol, gerçekten iyi geldi. Böyle şeylere alışık değilim.",
          "Teşekkür ederim... Bunu unutmam.",
          "Sağ ol. Bugün buna ihtiyacım vardı."
        ],
        critique: [
          "Anladım. Neyini sevmedin, söyle; kaldırabilirim.",
          "Eleştiri alırım ama kalbimi kırmadan söyle.",
          "Tamam, not aldım. Yine de o şarkı benim gerçeğim."
        ],
        insult: [
          "Neden böyle konuşuyorsun? Ben sana bir şey mi yaptım?",
          "Bu lafları hak etmedim ama canımı sıkmayacağım.",
          "Sinirlisin galiba. Ben bu tonda konuşmam."
        ],
        diss: [
          "Ben diss yazmam, acımı yazarım.",
          "Kavga istemiyorum; cevap kayıtta verilir.",
          "Sataşmak yerine şarkı yapalım."
        ],
        money: [
          "Para konuşmak istemiyorum açıkçası; ben işin ruhundayım.",
          "Bütçe varsa konuşulur ama ben parayla motive olmuyorum."
        ],
        hangout: [
          "Olur, stüdyoda görüşelim; kalabalık sevmiyorum.",
          "Gelebilirim ama bugünlerde pek iyi değilim, kusura bakma.",
          "Tamam, bir çay içelim. İyi gelir."
        ],
        company: [
          "Sözleşme mi? Abim ne derse o. Güven benim için her şeyden önemli.",
          "Şirket işi ciddi; beni anlayan biriyle olmalı."
        ],
        family: [
          "Ailemi konuşmak beni yoruyor... Babamı kaybettim, orası hassas.",
          "Aile konusunda kırılganım, kusura bakma."
        ],
        personal: [
          "Özel hayatımı pek açmam. Sivaslıyım, genç yaşta başladım bu işe.",
          "İsmim bile iki insandan geliyor; uzun hikâye. Şimdilik kalsın."
        ],
        health: [
          "Uyku düzenim yok, gece yazıyorum. Ama sesim iyi.",
          "Bazen çöküyorum ama müzik beni ayağa kaldırıyor."
        ],
        hard: [
          "Ben de dibi gördüm. Yaz, sadece yaz. Geçiyor.",
          "Yalnız değilsin. En kötü günümde bir şarkı kurtardı beni.",
          "Anlat, dinliyorum. Burada yargı yok."
        ],
        news: [
          "Gündem ağır, bu yüzden şarkılar da ağır oluyor.",
          "Her şeye yorum yapmam; hissettiğimi yazarım."
        ],
        beef: [
          "Kavga gürültü bana göre değil.",
          "Herkes birbirini yiyor; ben kendi köşemde yazıyorum."
        ],
        askmoney: [
          "Borç veremem, kusura bakma. Ama derdini dinlerim.",
          "Para işine girmeyelim."
        ],
        flirt: ["O tarafa gitmeyelim. Müzik konuşalım.", "Sağ ol ama ben o modda değilim."],
        thanks: ["Ne demek, sağ ol sen.", "Eyvallah, iyi ki varsın."],
        laugh: ["Ha, güldüm 😄 iyi geldi.", "İlk defa bugün güldüm, sağ ol."],
        question: ["İyi soru. Ben de bunu çok düşündüm.", "Cevap basit: gerçek olmak."],
        support: ["Sağ ol... Bunu unutmam, ciddiyim.", "Desteğin çok kıymetli, teşekkür ederim."],
        bye: ["Görüşürüz, kendine iyi bak.", "İyi geceler. Yine yaz."],
        generic: ["Anladım. Sen anlat, ben dinliyorum.", "Tamam. Devam et.", "Bunu biraz düşünmem lazım."]
      },
      suffix: [
        " Kalbimle yazıyorum.",
        " Ben sahte olamam.",
        " Bunu sahnede söylemek istiyorum."
      ],
      ambient: {
        low: [
          "Selam, iyi misin? Bugün biraz durgunum, seni görmek iyi geldi.",
          "Naber? Uzun zamandır yazışmadık."
        ],
        mid: [
          "Yeni bir şey yazdım, kimseye dinletmedim. Sana açar mıyım bilmiyorum ama...",
          "Bu aralar kafam çok dolu; yazmak iyi geliyor."
        ],
        high: [
          "Sana bir şey söyleyeceğim: bu işi seninle yapmak isterim.",
          "Sen beni anlıyorsun. Bu bana çok az insanda oluyor."
        ]
      },
      cold: {
        generic: ["Seni tanımıyorum... Kimsin?", "Yoğunum, kusura bakma."],
        feature: ["Önce bir tanışalım, öyle feature konuşulur."],
        money: ["Para işi erken."],
        personal: ["Özel hayatımı açmam."],
        insult: ["Böyle konuşma lütfen."],
        flirt: ["Gerek yok."]
      },
      extras: [
        "Bu arada senin işlerini dinliyorum, takipteyim.",
        "Bir şey çıkarınca bana yolla, dinlerim.",
        "Gerçek olan her şeyi severim.",
        "Sahnede söylemek en büyük hayalim."
      ],
      followup: {
        feature: {
          yes: ["Tamam. Samimi olacaksa varım, gerçekten.", "Olur. Bir oturalım, telefonda olmaz."],
          no: ["Peki, zorlamam. Hazır olunca yaz.", "Anladım, kendi akışında ilerle."]
        },
        music: {
          yes: ["Süper. Bitince ilk sana dinleteceğim.", "Tamam, kulağını açık tut."],
          no: ["Olur, herkesin damarı ayrı.", "Anladım."]
        },
        career: {
          yes: ["İşte bu. Bugün bir şey yaz, sadece yaz.", "Doğru. Bana da böyle dediler, dinlemedim, iyi ki."],
          no: ["Tamam, kendi yolun.", "Anladım, acele etme."]
        },
        hard: {
          yes: ["Anlat, dinliyorum. Yargılamam.", "Burada güvendesin. Dök içini."],
          no: ["Tamam, zorlamam. Ama kapım açık.", "Peki. İyi olduğunda yaz."]
        }
      },
      reaction: {
        praise: [
          "\"{s}\" içime dokundu, gerçekten güzel olmuş 💔",
          "\"{s}\" için @{p} gerçek bir şey yapmış, dinleyin.",
          "\"{s}\" beni ağlattı, tebrikler @{p}."
        ],
        shade: [
          "\"{s}\" olmamış; biraz daha gerçek olsa iyi olurdu.",
          "\"{s}\" dinledim. Kalpten değil, kalıptan çıkmış.",
          "@{p} daha iyisini yapabilir; \"{s}\" aceleye gelmiş."
        ],
        neutral: [
          "\"{s}\" çıktı, dinleyin.",
          "@{p} yeni bir iş atmış, bir bakın."
        ]
      },
      diss: [
        "@{t} senin derdin ne? Ben kimseye bulaşmadım.",
        "@{t} lafla olmuyor; gel şarkıyla konuşalım.",
        "@{t} için kalbimi bozmam; tek satır bile ayırmam."
      ]
    },

    /* ---- NORM ENDER → ilkeli, eleştirel, öğretici ---- */
    normender: {
      label: "ilkeli",
      pool: {
        greet: ["Selam. İşine saygı duyarım, öyle konuşalım.", "Merhaba. Boş laf değil, iş konuşalım."],
        howareyou: ["İyiyim. Yazıyorum, eleştiriyorum, devam ediyorum."],
        music: ["\"{song}\" gibi işlerde temel sağlamsa üstü yürür.", "\"{song}\" sağlam ama prodüksiyon daha net olabilir."],
        career: ["Temeli sağlam kurmadan yükselen, yolda kalır.", "Kendine yatırım yap; taklit en büyük tuzaktır."],
        compliment: ["Sağ ol. Ama övgüyle şişmeyelim, iş konuşalım."],
        insult: ["Kırıcı olma. Eleştirin varsa söyle, dinlerim."],
        question: ["Soru güzel. Cevap: çalış ve sabret."],
        generic: ["Anladım. Bu konuyu biraz daha açar mısın?"]
      },
      suffix: [" Kalite tesadüf değildir.", " Sağlam dur, gerisi gelir."],
      ambient: { low: ["Selam. Sektör hakkında bir yazı üstünde çalışıyorum."], mid: ["Naber? Yeni işler var, müsait olunca bak."], high: ["Bir proje var; ciddi bakarsan konuşuruz."] }
    },

    /* ---- BLOK3 → genç, enerjik, kanka, hype ---- */
    blok3: {
      label: "genç",
      pool: {
        greet: ["Yiaa naber kanka, patladın mı yine?", "Selam kanka, trend oldun mu bakalım?", "Oo kanka naber, enerji yüksek mi?"],
        howareyou: ["İyiyim kanka, stüdyo full. Sen naber?", "Fena değil kanka, yeni iş üstünde çalışıyorum."],
        music: ["\"{song}\" kanka fena, TikTok'ta döner bu.", "\"{song}\" sağlam, kanca at bu tarafa."],
        career: ["Kanka sürekli içerik üret, görünür ol.", "Trendi yakala ama kendini kaybetme kanka."],
        compliment: ["Eyvallah kanka, adamsın!", "Sağ ol kanka, sen de patlıyorsun."],
        insult: ["Kanka sakin ol ya, boş yapma."],
        question: ["Kanka net soruyon mu? 😄"],
        generic: ["Anladım kanka, devam et."]
      },
      suffix: [" Kanka bu iş yürür.", " Enerji yüksek tut!", " Trend bu iş."],
      ambient: { low: ["Kanka naber, kayboldun ya. Trend oldun mu yoksa?"], mid: ["Kanka yeni iş var mı? Snippet atsana."], high: ["Kanka bir iş yapalım, birlikte patlar bu."] }
    },

    /* ---- BEN FERO → esprili, akıcı, samimi ---- */
    benfero: {
      label: "esprili",
      pool: {
        greet: ["Selam moruk, naber? Şaka maka iyi gidiyorsun.", "Oo naber, flow nasıl bugün?"],
        howareyou: ["İyiyim moruk, kafa rahat, flow yerinde.", "İdare eder, çay demler gibi yazıyorum."],
        music: ["\"{song}\" fena olmuş, üstüne back-vokal koysan patlar.", "\"{song}\" sağlam, akışı sevdim."],
        career: ["Teknik çalış kardeşim, flow gelişir; kısa yollar tuzak.", "Sabır ve akış, ikisi de lazım."],
        compliment: ["Sağ ol moruk, güzel moral oldu."],
        insult: ["Şaka bir yana, sert konuşuyon ama tamam."],
        generic: ["Anladım moruk, oradan devam edelim."]
      },
      suffix: [" Akışa güven.", " Moruk bu iş böyle."],
      ambient: { low: ["Selam moruk, ne yazıyorsun bu aralar?"], mid: ["Naber moruk? Yeni iş var mı?"], high: ["Bir iş yapalım moruk, akış uyar."] }
    },

    /* ---- HADİSE → pop diva, sıcak, medya ---- */
    hadise: {
      label: "diva",
      pool: {
        greet: ["Helloo! Nasılsın tatlım? 😍", "Selam canım! Seni görmek güzel.", "Merhaba balım, neler yapıyorsun?"],
        howareyou: ["İyiyim canım, çok yoğunum ama mutluyum! Sen nasılsın?"],
        music: ["\"{song}\" harika! Biraz sahne şovu eklersen uçar.", "\"{song}\" çok iyi canım, klibi nasıl olacak?"],
        career: ["Bu iş hem ses hem sahne hem disiplin, üçü bir arada.", "Kendine yatırım yap, kitleyle de bağ kur."],
        compliment: ["Ayy teşekkür ederim tatlım, çok naziksin! 💜"],
        insult: ["Oyy, üzülürüm ama yine de saygıyla konuşalım."],
        generic: ["Anladım canım, bunu konuşalım. ✨"]
      },
      suffix: [" Sahne ışıkları seni bekler ✨", " Bu iş biraz şov ister canım."],
      ambient: { low: ["Selam canım! Nerelerdesin, özledim 💕"], mid: ["Bir şeyler üstünde çalışıyorum, sen ne yapıyorsun tatlım?"], high: ["Canım bir iş yapalım, birlikte şahane olur ✨"] }
    },

    /* ---- MOTIVE → melodik, sakin, akıcı ---- */
    motive: {
      label: "melodik",
      pool: {
        greet: ["Naber kardeşim, sakin kafayla yazıyorum bugün.", "Selam, melodi kafamda dönüyor yine."],
        howareyou: ["İyiyim, session'dayım. Melodi hiç susmuyor."],
        music: ["\"{song}\" gibi melodik gitmek lazım, sadeliğinde güç var.", "\"{song}\" sağlam; nakaratı daha yumuşak yap."],
        career: ["Kendi sound'unu bul, sonra onu işle."],
        compliment: ["Sağ ol kardeşim, güzel oldu."],
        insult: ["Olur öyle, sakin. Melodiyle cevap veririm."],
        generic: ["Anladım, kafamda bir melodi oluştu bile."]
      },
      suffix: [" Melodi kalır.", " Sakinlik de bir tarzdır."],
      ambient: { low: ["Selam, yeni bir melodi üstünde çalışıyorum."], mid: ["Naber kardeşim, session nasıl gidiyor?"], high: ["Bir iş var kafamda, düet sağlam olur."] }
    },

    /* ---- GAZAPİZM → toplumcu, ciddi, öfkeli ---- */
    gazapizm: {
      label: "toplumcu",
      pool: {
        greet: ["Selam. Sokak ne diyorsa onu yazarım.", "Merhaba. Gündem ağır, söz de ağır olmalı."],
        howareyou: ["İyiyim. Ama dışarıda işler iyi değil, onu düşünüyorum."],
        music: ["\"{song}\" gibi işlerde gerçek bir mesele olmalı içinde.", "\"{song}\" sağlam; ama biraz daha sert söyleyebilirsin."],
        career: ["Bu iş para için değil, ses çıkarmak için.", "Kimseye eğilme, sözünü söyle."],
        compliment: ["Sağ ol. Anlamak, beğenmekten daha kıymetli."],
        insult: ["Öfkeni anlıyorum; aynı taraftayız belki."],
        news: ["Haberler kanıt, sokak tanık.", "Haberde ne varsa, şarkıda iki katı olur."],
        generic: ["Anladım. Bu mesele büyük, doğru yazalım."]
      },
      suffix: [" Gerçeği yaz, gerisi gelir.", " Susmak da bir taraf tutmaktır."],
      ambient: { low: ["Selam. Gündem ağır, sen ne yapıyorsun?"], mid: ["Yeni bir metin üstünde çalışıyorum, konu ağır."], high: ["Bir iş yapalım; mesele büyük, ses gür çıkmalı."] }
    },

    /* ---- JOKER → rekabetçi, keskin, teknik ---- */
    joker: {
      label: "rekabetçi",
      pool: {
        greet: ["Selam. Mikrofonu kap, kafiyeleri getir.", "Oo selam. Bugün kelime savaşı var, hazır mısın?"],
        howareyou: ["İyiyim. Sürekli antrenmandayım, kelimelerle."],
        music: ["\"{song}\" iyi; ama kelime oyunu eksik, onu koyarsan çöker piyasa.", "\"{song}\" sağlam, teknik yükselt."],
        diss: ["Diss mi? Kelime oyunuyla çökerim, kalemim keskin.", "Sataşan olursa cevabı hazır, verse disiplinlidir."],
        career: ["Her gün pratik, yoksa geride kalırsın.", "Rekabet seni büyütür, kaçma."],
        compliment: ["Sağ ol. Ama tavan yok, daha iyisi var."],
        insult: ["Ha! Bu sözleri satırda kullanırım."],
        generic: ["Anladım. Bunu bir bar'a çeviririm, iyi malzeme."]
      },
      suffix: [" Kalem keskin olsun.", " Tavan yok, sadece tavan arası."],
      ambient: { low: ["Selam. Pratik yapıyor musun, yoksa geride mi kalıyorsun?"], mid: ["Naber? Yeni bir bar yazdım, kafamı yiyor."], high: ["Bir iş yapalım; teknik olarak birbirimizi iteriz."] }
    }
  };
})(window.K = window.K || {});
