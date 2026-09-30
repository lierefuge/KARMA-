/* ============================================================
   KARMA — systems/calls.js   (v10.30 · GELEN ARAMALAR)
   Telefona GELEN ARAMALAR: aç / reddet / mesajla yanıtla.

   Neden ayrı bir sistem?
   ----------------------
   Oyunda iletişim yalnızca DM (asenkron metin) üzerinden yürüyordu.
   Gerçek hayatta bazı kapılar TELEFONLA açılır: menajer, A&R, radyo,
   gazeteci, sponsor, festival organizatörü. Ve bazıları da tuzaktır
   (ödül/dolandırıcılık). Bu sistem her aramayı bir KARARA bağlar:
     • AÇ    → konuşma seçenekleri (her seçeneğin somut sonucu var)
     • REDDET→ kaçırdığın fırsat / bozulan ilişki
     • MESAJ → yazılı yanıt (bazı arayanlar metni tercih eder)
   Her arama SÜRELİDİR: süre dolarsa "cevapsız" olur ve sonucu yine vardır.
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------------- arayan kişi çözümleme ---------------- */
  function contactByRole(role) {
    if (!K.contacts) return null;
    return (K.contacts.list() || []).find(c => c.role === role) || null;
  }

  function anyArtist() {
    const list = K.artistList() || [];
    return list.length ? U.pick(list) : null;
  }

  function aPlayerSong() {
    const songs = (K.state.player.songs || []);
    return songs.length ? U.pick(songs) : null;
  }

  /* ---------------- ARAMA TÜRLERİ ----------------
     Her tür: bir arayan + bir giriş cümlesi + seçenekler üretir.
     `build()` çağrıldığında tam arama nesnesi döner. */
  const KINDS = {

    /* ---- MENAJER: kariyerini yönetmek isteyen aday ---- */
    manager: {
      icon: "📋", label: "Menajer Adayı", weight: p => (p.team && p.team.manager) ? 0 : 1.6,
      build() {
        const c = contactByRole("manager") || anyArtist();
        const name = c ? c.stageName : "Menajer Adayı";
        const fee = 8000;
        return {
          kind: "manager", callerId: c ? c.id : null, callerName: name, icon: "📋",
          intro: `${name}: "Selam, işlerini takip ediyorum. Seni büyütebileceğimi düşünüyorum. ` +
            `Aylık ${U.money(fee)} karşılığında menajerin olmak istiyorum. Ne dersin?"`,
          options: [
            {
              id: "hire", label: "Anlaştık, menajerim ol",
              reply: "Tamam, doğru karar. İlk iş: bu ay bir plan çıkarıyorum.",
              eff: { money: -fee, team: { manager: 1 }, fame: 0.4, reputation: 0.5,
                notify: ["📋 Menajer", "Artık bir menajerin var. Görünürlük ve iş fırsatları artacak."] }
            },
            {
              id: "no", label: "Şimdilik kendim idare ederim",
              reply: "Anlıyorum. Kapım açık, kafan değişirse ara.",
              eff: { reputation: -0.2, notify: ["📋 Menajer", "Teklifi nazikçe geri çevirdin."] }
            }
          ],
          reject: { reply: "Meşgulsün galiba. Neyse, sonra ararım.", eff: { reputation: -0.4 } },
          message: {
            prompt: "Menajere yazılı yanıt:",
            choices: [
              { id: "m1", label: "Şartları konuşalım, DM at", reply: "Tamam, yazıyorum hemen.",
                eff: { affinity: c ? { id: c.id, delta: 3 } : null } },
              { id: "m2", label: "İlgilenmiyorum", reply: "Anlaşıldı, kolay gelsin.", eff: { reputation: -0.2 } }
            ]
          },
          expiresIn: 3,
          miss: { reply: "Menajer adayı başka birine gitti.", eff: { reputation: -0.3 } }
        };
      }
    },

    /* ---- ŞİRKET A&R: seni imzalamak isteyen label ---- */
    label: {
      icon: "🏢", label: "Şirket A&R", weight: p => (p.labelId || (K.state.label)) ? 0 : (p.popularity >= 22 ? 1.3 : 0),
      build() {
        const l = U.pick(K.LABELS || []) || { id: "x", name: "Şirket" };
        return {
          kind: "label", callerId: null, callerName: l.name + " · A&R", icon: "🏢",
          intro: `${l.name} A&R: "Selam, işlerini dinledik. Seninle çalışmak istiyoruz. ` +
            `Stüdyoya gel, sözleşme şartlarını konuşalım."`,
          options: [
            {
              id: "meet", label: "Görüşmeye evet de",
              reply: "Harika. Sana resmi teklifimizi gönderiyoruz, mesajlarını kontrol et.",
              eff: { fame: 0.6, labelOffer: l.id, notify: ["🏢 Şirket görüşmesi", l.name + " sana sözleşme teklifi gönderecek."] }
            },
            {
              id: "later", label: "Şimdi bağımsız kalmak istiyorum",
              reply: "Saygı duyarım. Ama kapı bir kere açılır, unutma.",
              eff: { reputation: 0.3, notify: ["🏢 A&R", "Bağımsız kalmayı seçtin."] }
            }
          ],
          reject: { reply: "Anlaşılan hazır değilsin. Bir daha aramayabiliriz.", eff: { reputation: -0.6, fame: -0.2 } },
          message: {
            prompt: "A&R'a yazılı yanıt:",
            choices: [
              { id: "m1", label: "Teklifi mail olarak at", reply: "Tamam, gönderiyorum.", eff: { labelOffer: l.id } },
              { id: "m2", label: "Şu an müsait değilim", reply: "Peki, iyi çalışmalar.", eff: {} }
            ]
          },
          expiresIn: 4,
          miss: { reply: l.name + " başka bir sanatçıyla anlaştı.", eff: { reputation: -0.4 } }
        };
      }
    },

    /* ---- GAZETECİ: röportaj / alıntı ---- */
    press: {
      icon: "📰", label: "Gazeteci", weight: p => p.popularity >= 12 ? 1.1 : 0.2,
      build() {
        const c = contactByRole("blogger") || anyArtist();
        const name = c ? c.stageName : "Müzik Muhabiri";
        const outlet = U.pick(["Karma Kültür", "Ses Dergisi", "Ritim Gazetesi", "Bağımsız Müzik", "Sahne Notları"]);
        return {
          kind: "press", callerId: c ? c.id : null, callerName: name + " · " + outlet, icon: "📰",
          intro: `${name} (${outlet}): "Merhaba, seninle kısa bir röportaj yapmak istiyoruz. ` +
            `Müziğin ve sahne arkası hakkında birkaç soru soracağım. Uygun musun?"`,
          options: [
            {
              id: "yes", label: "Röportajı kabul et",
              reply: "Harika. Yarın yayında olur, güzel bir yazı çıkacak.",
              eff: { reputation: 1.4, fame: 0.7, stress: 6,
                notify: ["📰 Röportaj", outlet + " röportajın yayınlanacak."] }
            },
            {
              id: "quote", label: "Sadece kısa bir alıntı vereyim",
              reply: "Tamam, kısa da olur. Teşekkürler.",
              eff: { reputation: 0.6, fame: 0.3 }
            },
            {
              id: "no", label: "Şu an konuşmak istemiyorum",
              reply: "Anlıyorum ama 'yorum yapmadı' diye yazmak zorunda kalırım.",
              eff: { reputation: -0.7, notify: ["📰 Basın", "Röportajı reddettin; haber olumsuz çıkabilir."] }
            }
          ],
          reject: { reply: "Telefonu kapattı... İlginç.", eff: { reputation: -1.1, fame: 0.2 } },
          message: {
            prompt: "Gazeteciye yazılı yanıt:",
            choices: [
              { id: "m1", label: "Soruları yazılı gönderin, cevaplarım", reply: "Tamam, iletiyorum.",
                eff: { reputation: 0.9, fame: 0.3 } },
              { id: "m2", label: "İlgilenmiyorum", reply: "Peki. İyi günler.", eff: { reputation: -0.5 } }
            ]
          },
          expiresIn: 2,
          miss: { reply: "Gazeteci başka bir isimle konuştu.", eff: { reputation: -0.3 } }
        };
      }
    },

    /* ---- RADYO / PLAYLIST: dinlenme fırsatı ---- */
    radio: {
      icon: "📻", label: "Radyo / Playlist", weight: p => (p.songs || []).length ? 1.2 : 0,
      build() {
        const song = aPlayerSong();
        const station = U.pick(["Radyo Karma", "Frekans 34", "TR Müzik FM", "Gece Sesi", "Şehir Radyosu"]);
        return {
          kind: "radio", callerId: null, callerName: station + " · Müzik Direktörü", icon: "📻",
          intro: `Müzik Direktörü: "${song ? '"' + song.title + '"' : "İşlerin"} çok dikkatimizi çekti. ` +
            `Listeye almak istiyoruz ama tanıtım için küçük bir katkı bekliyoruz."`,
          options: [
            {
              id: "free", label: "Organik listeye alın, para yok",
              reply: "Zor. Ama şansını deneyeceğim, belki olur.",
              eff: { radioBoost: song ? song.id : null, fame: 0.3 }
            },
            {
              id: "pay", label: "Katkı payını öde (₺6.000)",
              reply: "Kesin girer, söz veriyorum. (Payola riski var.)",
              eff: { money: -6000, radioBoost: song ? song.id : null, payola: 6,
                notify: ["📻 Playlist", "Şarkın listeye alındı — ama bu bir 'katkı' işiydi."] }
            },
            {
              id: "no", label: "İlgilenmiyorum",
              reply: "Peki, iyi günler.",
              eff: {}
            }
          ],
          reject: { reply: "Kapattı.", eff: {} },
          message: {
            prompt: "Radyoya yazılı yanıt:",
            choices: [
              { id: "m1", label: "Şarkımı dinleyin, organik değerlendirin", reply: "Tamam, dinleyeceğim.",
                eff: { fame: 0.2 } },
              { id: "m2", label: "Teşekkürler, şimdilik yok", reply: "Anlaşıldı.", eff: {} }
            ]
          },
          expiresIn: 2,
          miss: { reply: "Radyo şarkıyı listeye almadı.", eff: {} }
        };
      }
    },

    /* ---- SPONSOR: marka anlaşması ---- */
    sponsor: {
      icon: "🤝", label: "Sponsor", weight: p => p.popularity >= 20 ? 1.0 : 0,
      build() {
        const brand = U.pick(["Volt Enerji", "Kula Kulaklık", "Şehir Spor Giyim", "Drift Araç", "Nova İçecek"]);
        const money = 12000 + Math.round((K.state.player.popularity || 0) * 700);
        return {
          kind: "sponsor", callerId: null, callerName: brand + " · Pazarlama", icon: "🤝",
          intro: `${brand}: "Kampanyamız için seninle çalışmak istiyoruz. ` +
            `Karşılığında ${U.money(money)} ödeyeceğiz, sadece markamızı bir gönderinde anman yeter."`,
          options: [
            {
              id: "yes", label: "Anlaşmayı kabul et",
              reply: "Mükemmel, sözleşmeyi gönderiyoruz.",
              eff: { money: money, reputation: -0.3, image: -1, sponsor: brand,
                notify: ["🤝 Sponsorluk", brand + " anlaşması imzalandı: " + U.money(money)] }
            },
            {
              id: "no", label: "Marka kimliğime uymuyor",
              reply: "Anlayışla karşılarız. Belki başka bir projede.",
              eff: { reputation: 0.4 }
            }
          ],
          reject: { reply: "Kapattı. Notumuza aldık.", eff: { reputation: -0.2 } },
          message: {
            prompt: "Markaya yazılı yanıt:",
            choices: [
              { id: "m1", label: "Detayları DM'den atın", reply: "Tamam, gönderiyoruz.", eff: {} },
              { id: "m2", label: "İlgilenmiyorum", reply: "Peki.", eff: {} }
            ]
          },
          expiresIn: 3,
          miss: { reply: "Marka başka bir sanatçıyla anlaştı.", eff: {} }
        };
      }
    },

    /* ---- FESTİVAL: line-up daveti ---- */
    festival: {
      icon: "🎪", label: "Festival Organizatörü", weight: p => (p.popularity >= 18 && K.festivals) ? 0.9 : 0,
      build() {
        const fest = (K.FESTIVALS && K.FESTIVALS.length) ? U.pick(K.FESTIVALS) : { name: "Yaz Festivali" };
        const slot = (K.state.player.popularity >= 55) ? "headliner" : (K.state.player.popularity >= 35 ? "akşam sahnesi" : "gündüz sahnesi");
        return {
          kind: "festival", callerId: null, callerName: fest.name + " · Organizasyon", icon: "🎪",
          intro: `Organizatör: "${fest.name} için seni line-up'a eklemek istiyoruz. ` +
            `Sana '${slot}' veriyoruz. Katılır mısın?"`,
          options: [
            {
              id: "yes", label: "Sahneye çıkarım",
              reply: "Harika! Takvimi netleştirip döneceğiz.",
              eff: { fame: slot === "headliner" ? 1.6 : 0.9, reputation: 0.6, festival: { name: fest.name, slot },
                notify: ["🎪 Festival", fest.name + " line-up'ına eklendin (" + slot + ")."] }
            },
            {
              id: "maybe", label: "Şartları konuşalım",
              reply: "Tamam, ücret ve sahne saatini yazılı gönderelim.",
              eff: { reputation: 0.2 }
            },
            {
              id: "no", label: "Bu sezon müsait değilim",
              reply: "Anlayışla karşılarız. Seneye görüşürüz.",
              eff: {}
            }
          ],
          reject: { reply: "Peki, seneye artık.", eff: { reputation: -0.3 } },
          message: {
            prompt: "Organizatöre yazılı yanıt:",
            choices: [
              { id: "m1", label: "Takvimi gönderin, bakayım", reply: "Gönderiyoruz.", eff: { reputation: 0.2 } },
              { id: "m2", label: "Bu yıl olmaz", reply: "Anlaşıldı.", eff: {} }
            ]
          },
          expiresIn: 5,
          miss: { reply: "Festival slotu başkasına verildi.", eff: { reputation: -0.2 } }
        };
      }
    },

    /* ---- HAYRAN: duygusal arama ---- */
    fan: {
      icon: "💜", label: "Hayran", weight: p => ((p.ig + p.tiktok) > 20000 ? 1.0 : 0.3),
      build() {
        const c = contactByRole("fan");
        const name = c ? c.stageName : "Hayran";
        return {
          kind: "fan", callerId: c ? c.id : null, callerName: name + " (Hayran)", icon: "💜",
          intro: `${name}: "Merhaba! Şarkılarını çok seviyorum. Sadece sesini duymak istedim, ` +
            `doğum günüm bugün..."`,
          options: [
            {
              id: "nice", label: "Sıcak konuş, teşekkür et",
              reply: "Ağlıyorum şu an, inanamıyorum! Seni seviyorum!",
              eff: { fans: 400, reputation: 0.5, fans_loyalty: 3,
                notify: ["💜 Hayran", "Bir hayranla birebir konuştun; bağlılık arttı."] }
            },
            {
              id: "short", label: "Kısa cevap ver, kapat",
              reply: "Anladım... yine de teşekkürler.",
              eff: { fans: 60 }
            }
          ],
          reject: { reply: "Kapattı... Yıkıldım.", eff: { fans: -120, reputation: -0.4,
            notify: ["💜 Hayran", "Bir hayranın aramasını reddettin; sosyal medyada üzüldü."] } },
          message: {
            prompt: "Hayrana yazılı yanıt:",
            choices: [
              { id: "m1", label: "Doğum günün kutlu olsun 🎂", reply: "Çok teşekkür ederim, en iyi günüm!",
                eff: { fans: 300, reputation: 0.4 } },
              { id: "m2", label: "Yoğunum, sonra konuşuruz", reply: "Tamam, anlıyorum.", eff: {} }
            ]
          },
          expiresIn: 1,
          miss: { reply: "Hayran üzgün bir gönderi paylaştı.", eff: { fans: -50 } }
        };
      }
    },

    /* ---- SANATÇI: iş birliği araması ---- */
    artist: {
      icon: "🎤", label: "Sanatçı", weight: p => {
        const met = Object.keys(K.state.relations || {}).filter(id => K.state.relations[id].met).length;
        return met >= 2 ? 1.0 : 0;
      },
      build() {
        const metIds = Object.keys(K.state.relations || {}).filter(id => {
          const r = K.state.relations[id];
          return r.met && K.artistById(id);
        });
        const a = metIds.length ? K.artistById(U.pick(metIds)) : anyArtist();
        if (!a) return null;
        return {
          kind: "artist", callerId: a.id, callerName: a.stageName, icon: "🎤",
          intro: `${a.stageName}: "Selam kardeşim, telefonunu buldum sonunda. ` +
            `Beraber bir iş yapalım diyorum. Stüdyo müsait, ne dersin?"`,
          options: [
            {
              id: "yes", label: "Ortak iş yapalım",
              reply: "İşte bu! Ben bir şeyler hazırlarım, sana gönderirim.",
              eff: { affinity: { id: a.id, delta: 8 }, featureOffer: a.id,
                notify: ["🎤 Ortak iş", a.stageName + " ile feature teklifi DM'e düştü."] }
            },
            {
              id: "later", label: "Şimdi yoğunum, sonra konuşalım",
              reply: "Tamam, ne zaman istersen.",
              eff: { affinity: { id: a.id, delta: 1 } }
            }
          ],
          reject: { reply: "Boş ver, ben başkasını bulurum.", eff: { affinity: { id: a.id, delta: -4 } } },
          message: {
            prompt: a.stageName + " için yazılı yanıt:",
            choices: [
              { id: "m1", label: "Beat at, bakayım", reply: "Tamam, atıyorum.", eff: { affinity: { id: a.id, delta: 4 } } },
              { id: "m2", label: "Müsait değilim", reply: "Anladım.", eff: { affinity: { id: a.id, delta: -1 } } }
            ]
          },
          expiresIn: 3,
          miss: { reply: a.stageName + " işi başkasıyla yaptı.", eff: { affinity: { id: a.id, delta: -2 } } }
        };
      }
    },

    /* ---- AİLE / MAHALLE: kişisel arama ---- */
    family: {
      icon: "🏘️", label: "Mahalle / Aile", weight: p => (K.contacts && (K.contacts.list() || []).length) ? 0.8 : 0,
      build() {
        const c = contactByRole("kuzen") || contactByRole("mahalle") || contactByRole("abi");
        if (!c) return null;
        return {
          kind: "family", callerId: c.id, callerName: c.stageName, icon: c.roleIcon || "🏘️",
          intro: `${c.stageName}: "Lan naber, telefonu açsana! Mahallede herkes seni soruyor. ` +
            `Bu akşam bir yere gidiyoruz, geliyor musun?"`,
          options: [
            {
              id: "go", label: "Geliyorum, buluşalım",
              reply: "İşte bu! Seni bekliyoruz.",
              eff: { affinity: { id: c.id, delta: 7 }, stress: -6, money: -500,
                notify: ["🏘️ Mahalle", c.stageName + " ile buluştun; kafan dağıldı."] }
            },
            {
              id: "busy", label: "Bugün stüdyodayım, kusura bakma",
              reply: "Tamam lan, işin önemli. Sonra.",
              eff: { affinity: { id: c.id, delta: -1 }, stress: 2 }
            }
          ],
          reject: { reply: "Ne oldu lan, şımardın mı?", eff: { affinity: { id: c.id, delta: -3 }, reputation: -0.2 } },
          message: {
            prompt: c.stageName + " için yazılı yanıt:",
            choices: [
              { id: "m1", label: "Yarın görüşelim, söz", reply: "Tamam, sözünü tut.", eff: { affinity: { id: c.id, delta: 2 } } },
              { id: "m2", label: "Bu aralar çok yoğunum", reply: "Anladım, kendine dikkat et.", eff: { affinity: { id: c.id, delta: -1 } } }
            ]
          },
          expiresIn: 1,
          miss: { reply: c.stageName + " alındı: aramadın.", eff: { affinity: { id: c.id, delta: -1 } } }
        };
      }
    },

    /* ---- DOLANDIRICI: ödül / sahte fırsat tuzağı ---- */
    scam: {
      icon: "⚠️", label: "Şüpheli Arama", weight: p => 0.9,
      build() {
        const scam = U.pick([
          { who: "Uluslararası Ödül Komitesi", hook: "Müzik ödülü kazandınız", fee: 3500 },
          { who: "Dijital Dağıtım Ajansı", hook: "Liste garantisi veriyoruz", fee: 5000 },
          { who: "Yatırım Danışmanı", hook: "müzik kataloğunuzu büyüteceğiz", fee: 7500 },
          { who: "Sahte Menajer", hook: "sizi yıldız yapacağım", fee: 4000 }
        ]);
        return {
          kind: "scam", callerId: null, callerName: scam.who, icon: "⚠️",
          intro: `${scam.who}: "Tebrikler! ${scam.hook}. İşlem için sadece ${U.money(scam.fee)} ` +
            `ön ödeme gerekiyor. Hemen başlayalım mı?"`,
          options: [
            {
              id: "pay", label: "Ön ödemeyi yap (riskli!)",
              reply: "Mükemmel, transferi alınca dönerim... *hat kesilir*",
              eff: { money: -scam.fee, reputation: -0.3, scamLoss: true,
                notify: ["⚠️ Dolandırıldın", scam.who + " parayı aldı ve kayboldu (" + U.money(scam.fee) + ")."] }
            },
            {
              id: "info", label: "Önce detay ve şirket bilgisi iste",
              reply: "Eee... şey... sistemde bir sorun var galiba. *hat kesilir*",
              eff: { reputation: 0.3, notify: ["⚠️ Dolandırıcılık", "Detay isteyince 'kurum' panikleyip kapattı."] }
            },
            {
              id: "no", label: "Asla ön ödeme yapmam, kapat",
              reply: "*hat kesilir*",
              eff: { reputation: 0.2 }
            }
          ],
          reject: { reply: "*hat kesilir*", eff: {} },
          message: {
            prompt: "Şüpheli numaraya yazılı yanıt:",
            choices: [
              { id: "m1", label: "Bilgilerimi nereden aldınız?", reply: "*yanıt yok*", eff: { reputation: 0.2 } },
              { id: "m2", label: "İlgilenmiyorum", reply: "*yanıt yok*", eff: {} }
            ]
          },
          expiresIn: 2,
          miss: { reply: "Dolandırıcı başka hedefe geçti.", eff: {} }
        };
      }
    }
  };

  /* ---------------- sonuç uygulayıcı ---------------- */
  function applyEffects(eff) {
    if (!eff) return [];
    const s = K.state, p = s.player;
    const notes = [];

    if (eff.money) {
      s.balance = Math.max(0, (s.balance || 0) + eff.money);
      notes.push((eff.money > 0 ? "+" : "") + U.money(eff.money));
    }
    if (eff.fame) { K.game.addFame(eff.fame); notes.push("şöhret " + (eff.fame > 0 ? "+" : "") + eff.fame.toFixed(1)); }
    if (eff.reputation) { p.reputation = U.clamp((p.reputation || 0) + eff.reputation, 0, 100); }
    if (eff.image) { p.image = U.clamp((p.image == null ? 50 : p.image) + eff.image, 0, 100); }
    if (eff.stress) { p.stress = U.clamp((p.stress || 0) + eff.stress, 0, 100); }
    if (eff.fans) {
      const n = Math.round(eff.fans);
      p.ig = Math.max(0, Math.round((p.ig || 0) + n));
      p.tiktok = Math.max(0, Math.round((p.tiktok || 0) + n * 0.8));
      p.x = Math.max(0, Math.round((p.x || 0) + n * 0.4));
      notes.push((n > 0 ? "+" : "") + U.compact(n) + " takipçi");
    }
    if (eff.team) {
      p.team = p.team || {};
      Object.keys(eff.team).forEach(k => { p.team[k] = eff.team[k]; });
    }
    if (eff.affinity && eff.affinity.id) {
      K.relations.addAffinity(eff.affinity.id, eff.affinity.delta, "telefon");
    }
    if (eff.labelOffer) {
      try { K.relations.createLabelSignsPlayerOffer(eff.labelOffer); } catch (e) {}
    }
    if (eff.featureOffer) {
      try { K.relations.createIncomingFeatureOffer(eff.featureOffer); } catch (e) {}
    }
    if (eff.radioBoost) {
      const song = (p.songs || []).find(x => x.id === eff.radioBoost);
      if (song) {
        song.boosts = song.boosts || {};
        song.boosts.radio = (song.boosts.radio || 0) + 0.18;
        song.dailyStreams *= 1.08;
        notes.push('"' + song.title + '" radyoda');
      }
    }
    if (eff.payola && K.shady) {
      try {
        if (K.shady.addSuspicion) K.shady.addSuspicion(eff.payola);
        else if (K.state.player.shady) K.state.player.shady.suspicion = (K.state.player.shady.suspicion || 0) + eff.payola;
      } catch (e) {}
    }
    if (eff.festival) {
      s.festivals = s.festivals || [];
      s.festivals.unshift({ name: eff.festival.name, slot: eff.festival.slot, day: s.day, source: "call" });
      s.festivals = s.festivals.slice(0, 20);
    }
    if (eff.notify) {
      s.notifications = (s.notifications || []).concat([{
        title: eff.notify[0], msg: eff.notify[1], kind: eff.notify[2] || "ok", day: s.day
      }]).slice(-60);
    }
    return notes;
  }

  /* ---------------- günlük arama üretimi ---------------- */
  function eligibleKinds() {
    const p = K.state.player;
    const out = [];
    Object.keys(KINDS).forEach(k => {
      const w = KINDS[k].weight ? KINDS[k].weight(p) : 0;
      if (w > 0) out.push({ id: k, w });
    });
    return out;
  }

  function pickKind() {
    const list = eligibleKinds();
    if (!list.length) return null;
    const total = U.sum(list, x => x.w);
    let r = Math.random() * total;
    for (const x of list) { r -= x.w; if (r <= 0) return x.id; }
    return list[list.length - 1].id;
  }

  K.calls = {
    KINDS,

    ringing() { return (K.state.player.calls || []).filter(c => c.status === "ringing"); },
    ringingCount() { return K.calls.ringing().length; },
    history() { return (K.state.player.callLog || []).slice().reverse(); },

    /* bir arama üret ve kuyruğa koy */
    spawn(kindId) {
      const s = K.state;
      s.player.calls = s.player.calls || [];
      if (K.calls.ringingCount() >= 3) return null;
      const id = kindId || pickKind();
      if (!id || !KINDS[id]) return null;
      let call = null;
      try { call = KINDS[id].build(); } catch (e) { call = null; }
      if (!call) return null;
      call.id = U.uid("call");
      call.day = s.day;
      call.expiresDay = s.day + (call.expiresIn || 3);
      call.status = "ringing";
      s.player.calls.push(call);
      K.toast("📞 Gelen arama", call.callerName, "ok");
      K.bus.emit("call:incoming", call);
      return call;
    },

    /* günlük tick: arama gelir + süresi dolanlar cevapsız olur */
    tick() {
      const s = K.state, p = s.player;
      p.calls = p.calls || [];

      /* süresi dolan aramalar */
      p.calls.forEach(c => {
        if (c.status === "ringing" && s.day >= (c.expiresDay || 0)) {
          c.status = "missed";
          c.handledDay = s.day;
          applyEffects(c.miss && c.miss.eff);
          (p.callLog = p.callLog || []).push({
            id: c.id, kind: c.kind, callerName: c.callerName, icon: c.icon,
            day: s.day, status: "missed", reply: (c.miss && c.miss.reply) || "Cevapsız"
          });
          if (c.miss && c.miss.reply) {
            s.notifications = (s.notifications || []).concat([{
              title: "📵 Cevapsız arama", msg: c.callerName + ": " + c.miss.reply, kind: "warn", day: s.day
            }]).slice(-60);
          }
        }
      });

      /* günlük arama olasılığı — popülerlik ve gün geçtikçe artar */
      const base = 0.16 + Math.min(0.30, (p.popularity || 0) / 260) + Math.min(0.12, (s.day || 1) / 4000);
      if (U.chance(base)) K.calls.spawn();
    },

    /* ---------------- kararlar ---------------- */
    _finish(call, status, reply) {
      const s = K.state;
      call.status = status;
      call.handledDay = s.day;
      (s.player.callLog = s.player.callLog || []).push({
        id: call.id, kind: call.kind, callerName: call.callerName, icon: call.icon,
        day: s.day, status: status, reply: reply || ""
      });
      s.player.callLog = s.player.callLog.slice(-60);
      K.save();
    },

    answer(id) {
      const call = (K.state.player.calls || []).find(c => c.id === id);
      if (!call || call.status !== "ringing") return null;
      call.status = "talking";
      K.bus.emit("call:changed", call);
      return call;
    },

    choose(id, optionId) {
      const call = (K.state.player.calls || []).find(c => c.id === id);
      if (!call) return null;
      const opt = (call.options || []).find(o => o.id === optionId);
      if (!opt) return null;
      const notes = applyEffects(opt.eff);
      K.calls._finish(call, "answered", opt.reply);
      K.refresh();
      return { reply: opt.reply, notes: notes };
    },

    reject(id) {
      const call = (K.state.player.calls || []).find(c => c.id === id);
      if (!call) return null;
      const notes = applyEffects(call.reject && call.reject.eff);
      K.calls._finish(call, "rejected", call.reject && call.reject.reply);
      K.refresh();
      return { reply: (call.reject && call.reject.reply) || "", notes: notes };
    },

    message(id, choiceId) {
      const call = (K.state.player.calls || []).find(c => c.id === id);
      if (!call || !call.message) return null;
      const ch = (call.message.choices || []).find(c => c.id === choiceId);
      if (!ch) return null;
      const notes = applyEffects(ch.eff);
      K.calls._finish(call, "messaged", ch.reply);
      K.refresh();
      return { reply: ch.reply, notes: notes };
    },

    /* modal UI — gelen arama ekranı ve konuşma ağacı */
    open(id) {
      const call = (K.state.player.calls || []).find(c => c.id === id);
      if (!call) return;
      if (call.status === "ringing") K.calls.answer(id);
      K.calls._render(call);
    },

    _render(call) {
      const info = `<div class="call-head">
          <div class="call-avatar">${call.icon || "📞"}</div>
          <div class="call-name">${U.escape(call.callerName)}</div>
          <div class="call-role">${U.escape((KINDS[call.kind] || {}).label || "Arayan")} · Gün ${call.day}</div>
        </div>`;

      if (call.status === "talking") {
        const opts = (call.options || []).map(o =>
          `<button class="btn btn-primary call-opt" data-call-opt="${o.id}">${U.escape(o.label)}</button>`).join("");
        K.ui.modal({
          title: "📞 Görüşme", className: "call-modal",
          body: info + `<div class="call-bubble">${U.escape(call.intro)}</div>` +
            `<div class="call-actions">${opts}</div>`,
          actions: []
        });
        const root = U.qs("#modal-root");
        root.querySelectorAll("[data-call-opt]").forEach(b => {
          b.addEventListener("click", () => {
            const res = K.calls.choose(call.id, b.dataset.callOpt);
            K.calls._outcome(call, res);
          });
        });
        return;
      }
      if (call.status === "ringing") {
        K.ui.modal({
          title: "📞 Gelen Arama", className: "call-modal",
          body: info + `<div class="call-ringing">Çalıyor…</div>`,
          actions: [
            { label: "📵 Reddet", onClick: () => { const r = K.calls.reject(call.id); K.calls._outcome(call, r); return false; } },
            { label: "✉️ Mesaj", onClick: () => { K.calls._renderMessage(call); return false; } },
            { label: "📞 Aç", cls: "btn-primary", onClick: () => { K.calls.answer(call.id); K.calls._render(call); return false; } }
          ]
        });
      }
    },

    _renderMessage(call) {
      const msg = call.message;
      if (!msg) { K.toast("Mesaj yok", "Bu arayan mesaja kapalı.", "warn"); return; }
      const choices = (msg.choices || []).map(c =>
        `<button class="btn call-opt" data-call-msg="${c.id}">${U.escape(c.label)}</button>`).join("");
      K.ui.modal({
        title: "✉️ Yazılı Yanıt", className: "call-modal",
        body: `<div class="call-head">
            <div class="call-avatar">${call.icon || "📞"}</div>
            <div class="call-name">${U.escape(call.callerName)}</div>
          </div><div class="call-bubble">${U.escape(msg.prompt || "Yanıt seç:")}</div>
          <div class="call-actions">${choices}</div>`,
        actions: [{ label: "Geri", onClick: () => { K.calls._render(call); return false; } }]
      });
      const root = U.qs("#modal-root");
      root.querySelectorAll("[data-call-msg]").forEach(b => {
        b.addEventListener("click", () => {
          const res = K.calls.message(call.id, b.dataset.callMsg);
          K.calls._outcome(call, res);
        });
      });
    },

    _outcome(call, res) {
      const notes = (res && res.notes && res.notes.length) ? `<div class="call-notes">${res.notes.map(n => U.escape(n)).join(" · ")}</div>` : "";
      K.ui.modal({
        title: "📞 Görüşme Bitti", className: "call-modal",
        body: `<div class="call-head">
            <div class="call-avatar">${call.icon || "📞"}</div>
            <div class="call-name">${U.escape(call.callerName)}</div>
          </div>
          <div class="call-bubble">${U.escape((res && res.reply) || "")}</div>${notes}`,
        actions: [{ label: "Tamam", cls: "btn-primary", onClick: () => {
          if (K.phone && !K.phone.homeActive) K.phone.reRender();
          /* sırada başka çalan arama varsa onu aç */
          const next = K.calls.ringing()[0];
          if (next) setTimeout(() => K.calls.open(next.id), 350);
        } }]
      });
    },

    /* gün geçişinden sonra sıradaki çalan aramayı aç */
    openNext() {
      const next = K.calls.ringing()[0];
      if (next) { K.calls.open(next.id); return true; }
      return false;
    }
  };
})(window.K);
