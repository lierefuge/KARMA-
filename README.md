# KARMA Music Game — Music Industry Simulator

Türk müzik endüstrisi simülasyonu. Sanatçı kariyerinden şirket (label) yönetimine
ve sosyal medya etkileşimlerine kadar ilerleyen kapsamlı bir oyun.

---

## GÜNCELLEME v10.38 — Kapak üreticisi: taşma bitti, düzenler geldi

Kapak üreticisi çalışıyordu ama ürettiği kapaklar "garip" duruyordu. Üç ayrı
kök neden bulundu ve üçü de kapatıldı. Yeni test paketi: `tools/smoke-cover.js`
(**72 kontrol**). Boru hattı: **25/25 → 26/26 adım**.

### Bulgu 1 — Yazı kapağa sığmıyordu

`coverSVG` başlığı boşluklardan bölüyordu ama **genişliği hiç ölçmüyordu**.
`Mono` fontunda (`letter-spacing: 1`) 74px punto ile "Sokak Işıkları" 600px
tuvali aşıp sağdan kesiliyordu; uzun tek kelimeler ("Anadolu") her fontta
taşıyordu.

**Çözüm:** punto artık **ölçülerek** seçiliyor.
`textW(str, size, font)` her fontun karakter başına genişlik katsayısıyla
tahmini genişliği hesaplar; `fitLines` önce satırları sarar, sığmazsa puntoyu
2'şer küçültür ve son çare olarak genişlikten geriye ölçekler — **taşma
matematiksel olarak imkânsız**. Test, 16 × 12 × 8 × 7 = **10.752 kombinasyonu**
ve uzun tek kelime senaryolarını tarayıp sıfır taşma doğruluyor.

### Bulgu 2 — Desenler ve şekiller görünmüyordu

12 desenin 11'i `0.07–0.13`, 11 şeklin tamamı `0.16` opaklıktaydı. Galeri
çıkarıldığında "Düz" ile "Izgara" arasında gözle fark yoktu — yani
seçeneklerin çoğu **ölü**ydü.

**Çözüm:** desenler `0.13–0.26`, şekiller `0.30–0.50` bandına çıkarıldı.
Test artık her desenin ve şeklin çıktıyı gerçekten değiştirdiğini ve görünür
opaklıkta olduğunu kilitliyor.

### Bulgu 3 — "Rastgele Kapak" oyuncunun ayarlarını siliyordu

`st.coverOpts = { style, pattern, text, hue, grain }` — tüm nesne
değiştirildiği için **font, hizalama, şekil ve "Sanatçı adı" sessizce
sıfırlanıyordu**. Aynı hata kenar çubuğunda da vardı: stil değiştirildiğinde
özet "Gece · Merkez" yazmaya devam ediyordu.

**Çözüm:** rastgele artık yalnız stil/desen/şekil/ton/grain değiştirir;
font, düzen ve ek katmanlar korunur. Kenar çubuğu özeti `renderStepList()`
ile her değişimde tazelenir. Mağaza önizlemesindeki 🟢🍎▶️ emojileri de
v10.34'te eklenen gerçek marka SVG'leriyle değiştirildi.

### Yeni seçenekler

| Grup | Önce | Sonra |
|---|---|---|
| Palet | 8 | **16** (Mor · Kan · Okyanus · Gül · Retro · Zehir · Gün Batımı · Kâğıt) |
| Düzen | — (hiza) | **8 kompozisyon** |
| Desen | 6 | **12** |
| Şekil | 5 | **12** |
| Yazı | 3 | **5** |
| Font | 4 | **7** |
| Ek katman | 2 | **5** |

**Düzenler (yeni):** Merkez · Üst · Alt · Şerit · Alt Blok · Dev Harf · Köşe ·
Dergi (büyük başlık + ince ayırıcı çizgi).

**Ek katmanlar (yeni):** çerçeve · **explicit (E) işareti** · yıl etiketi
(oyun takviminden otomatik) · grain · sanatçı adı.

Kapak üreticisi `js/ui/components.js` içinden çıkarılıp kendi modülüne taşındı:
`js/ui/cover.js`. Eski 7 ve 11 parçalı kapak kayıtları bozulmadan çözülür
(hiza alanı düzene çevrilir).

### Fontlar hakkında bir not

Kapak bir `data:` **SVG görüntüsü** olarak çizilir ve görüntü bağlamındaki SVG
sayfanın web fontlarına **erişemez** — adı geçen font bulunamazsa render motoru
serif'e düşer. Bu yüzden fontlar yalnız `sans-serif` / `serif` / `monospace`
ailelerinden kurulur; ayrışma ağırlık, harf aralığı ve `textLength`
sıkıştırmasıyla üretilir. Böylece her platformda **aynı** görünür. (Eski
"İnce" Inter 300 istiyordu ama 300 yüklü değildi, "Dar" ise sistemde
bulunmayan Arial Narrow'a güveniyordu — ikisi de Blok'tan ayırt edilemiyordu.)

---

## GÜNCELLEME v10.37 — Gerçek uygulama düzeni (2. dalga) · pil kaldırıldı

v10.35 (Spotify) ve v10.36 (Instagram) alt sekmeleri emoji'den gerçek SVG
simgelere geçirmişti ama diğer beş uygulama emoji sekme ikonlarıyla kalmıştı:
telefonun içinde iki uygulama gerçek, beşi oyuncak gibi duruyordu. Bu sürüm o
tutarsızlığı kapatır ve pil mekaniğini tamamen kaldırır.

### 📱 Beş uygulama gerçek düzene geçti

Her uygulama kendi SVG simge takımını ve alt sekme davranışını aldı
(pasif = ince çizgi, aktif = **dolu** simge — gerçek uygulamaların ortak kuralı):

| Uygulama | Alt sekme | Etiket | Aktif renk |
|---|---|---|---|
| **X** | 4 SVG sekme + SVG gönderi eylemleri (yanıt · repost · beğeni · kaydet · paylaş · görüntüleme) | yok (gerçek X gibi) | beyaz |
| **YouTube** | 5 SVG sekme + SVG oynatma denetimleri, Shorts yan eylemleri, zil | var | beyaz |
| **TikTok** | 4 SVG sekme + beyaz dolu sağ eylemler (kalp · yorum · paylaş · kaydet) | yok (gerçek TikTok gibi) | beyaz + cyan parıltı |
| **Apple Music** | 4 SF-Symbols tarzı SVG sekme | var | `#fa233b` |
| **Mesajlar** | 5 iOS SVG sekme (sohbet · gruplar · istekler · teklifler · yeni DM) | var | `#0a84ff` |

Yeni katman: **`css/apps-real.css`** — beş uygulamanın alt barını, simge
değişimini ve gönderi eylem satırını tek yerde tanımlar. Mevcut içerik/render
fonksiyonlarına dokunulmadı; yalnızca görsel katman değişti.

### 🔋 Pil mekaniği tamamen kaldırıldı

Pil, oyuncuya sürekli bakım yükü bindiriyordu ve **kod kendi yorumuyla
çelişiyordu**: `phoneos.js` yorumu *"telefon GECE şarj olur"* diyordu ama
`daily()` hiçbir zaman şarj etmiyordu — yalnızca günde %14–22 boşaltıyordu.
Yani ~5–7 günde telefon kapanıyor, oyuncu her gün elle şarj etmek zorunda
kalıyordu. Pil artık bir engel değil; telefon her zaman açık.

Kaldırılanlar: `battery()` · `charge()` · günlük boşalma · "telefon kapandı"
ekranı · durum çubuğu pil göstergesi · Kontrol Merkezi ve Ayarlar'daki pil
kartları/şarj düğmeleri/"pil tasarrufu" anahtarı. Eski kayıtlardaki `battery`,
`phoneDead` ve `phone.batterySaver` alanları yüklemede silinir.

### 🏷️ Sürüm etiketi gerçeğe çekildi

Kod v10.36'ya kadar gelmişti ama `package.json`, `js/version.js`,
`version.json` ve `sw.js` hâlâ **10.32.0** diyordu. Sebep: `tools/release.js`
sürümü **yalnızca argüman verilirse** artırıyor; sürümler argümansız
çalıştırıldığı için yalnızca önbellek damgası tazelenmişti. Bu sürümden
itibaren meta veri kodla aynı hizada.

---

## GÜNCELLEME v10.36 — Instagram gerçek uygulama düzeni

- Alt sekmede aktif simge **dolar** (gerçek IG davranışı)
- Gönderi eylemleri SVG: kalp · yorum · paylaş · kaydet
- Hikâye "+" rozeti, başlıkta "kullanıcı · süre" tek satır

## GÜNCELLEME v10.35 — Spotify gerçek uygulama düzeni

- SVG alt sekme simgeleri (emoji yerine), sekmesiz sanatçı sayfası
- **Beğenilen Şarkılar** (mor→beyaz kalp karosu) ve çalma listesi başlığı

## GÜNCELLEME v10.34 — Gerçek marka logoları

- Telefon ana ekranı uygulamaları emoji/karakter yerine **inline SVG marka
  işaretleri** kullanıyor (`js/ui/brand-icons.js`)

## GÜNCELLEME v10.33 — Olay/skandal gerçekçiliği

- Olay sıklığı azaltıldı, ün eşiği + tekrar engeli + çakışma temizliği
  (`systems/crisis.js` · `systems/incidents.js`)

---

## GÜNCELLEME v10.32 — Katalog sönümü: "yayın yapmazsan kitle erir"

Denge simülasyonunun bulduğu **son ORTA bulgu** kapatıldı ve neden olduğu
oyun açığı giderildi. Yeni test paketi: `tools/smoke-silence.js` (**23 kontrol**).
Boru hattı: `tools/smoke-updater.js` (v10.31.1) ile birlikte **24/24 adım**.

### 🔍 Bulgu — ölü katalog ölümsüzdü

`tools/sim-balance.js` üç profili 120 gün yayınsız bırakıp düşüşü ölçüyordu:

| Profil | 120 günde aylık dinleyici kaybı |
|---|---|
| Rahat | %58 |
| Standart | %38 |
| **Grinder** | **%18** ❌ (eşik %25) |

Kök neden popülerlik değildi: **şarkı başına dinlenme tabanı sabit `5`** idi
(`Math.max(5, song.dailyStreams * …)`). Grinder profilinin 34 şarkılık ölü
kataloğunda en iyi şarkı günde **5** dinleniyordu, ama 34 × 5 = **170/gün**
dinlenme üretiyordu — yani **günlük dinlenmenin %100'ü** ve aylık dinleyicinin
**%94'ü** yalnızca tabandan geliyordu.

Sonuç: katalog büyüklüğü kitleyi **doğrusal olarak ve süresiz** ayakta tutuyordu.
34 flop şarkı, kalıcı ~2.500 "aylık dinleyici" demekti. Oyuncuya **"yayın yap"
baskısı kalmıyordu** — simülasyonun çekirdek halkası (yüksel → zirve → düş) kopuktu.

### 🔧 Çözüm — taban artık sönümleniyor (unutulma)

- **Şarkı başına taban sabit değil, sönümlü**: `catFloor = catalogFloor × silenceDecay()`
- **`K.game.silenceDecay()`** — son yayından sonra:
  - ilk **30 gün ceza yok** (iki single arası normal aralık)
  - sonrasında günlük `0,9945` (yarı ömür ≈ 126 gün)
  - alt sınır `0,22` — sanatçı tamamen sıfırlanmaz, ama görünmez kalırsa kitlesini kaybeder
- **`K.game.daysSinceRelease()`** — katalogdaki en yeni yayın esas alınır;
  `publishedDay` yok/0 olan demo parçalar sayılmaz (kenar durum testle kilitli)
- Sabitler `K.ECON` içinde: `silenceGrace` · `silenceDecay` · `silenceFloor` · `catalogFloor`

**Aktif oynayış hiç etkilenmedi** — lütuf süresi (30 gün) içinde çarpan `1`'dir;
casual ve standard profillerinin eğrileri birebir aynı kaldı.

### 📉 Ceza artık GÖRÜNÜR — `K.game.silenceWarning()`

Oyuncuyu görünmez bir cezayla cezalandırmak haksız hissi verir. Eşikler
(30+15 · +45 · +90 · +180 gün) geçildiğinde **tek seferlik** uyarı düşer:

> 📉 **Katalog sönümleniyor** — 75 gündür yayın yok. Dinleyici tabanı %61'ine
> indi — yeni bir yayın dalgayı yeniden besler.

Yeni yayın yapıldığında sayaç kendiliğinden sıfırlanır.

### 📊 Kalibrasyon sonucu

| Profil | Önce | Sonra |
|---|---|---|
| Rahat | %58,6 | %58,7 |
| Standart | %37,7 | %37,8 |
| **Grinder** | **%18,2** ❌ | **%58,5** ✅ |

`tools/sim-balance.js` → **0 yüksek · 0 orta** bulgu.

### ✅ Issue #2 — açık bulguların hepsi tamamlandı

`#2` numaralı issue'nun "açık bulgular" listesi kodda ID'leriyle
karşılanmış durumda; issue yalnızca güncellenmemişti. Kanıtlar:

| Bulgu | Durum | Kanıt |
|---|---|---|
| **B-5** `chat.js` 88 KB tek modül | ✅ | `data/chat-profiles.js` (v10.18 · B-5) — veri/motor ayrıldı; `chat.js` 52 KB'a indi |
| **B-6** `persona.js` / `personality.js` karışıklığı | ✅ | İki dosyanın başlığında karşılıklı `(B-6)` ayrım notu + ayrı global önekler |
| **B-7** testlerde sabit `setTimeout(run, 2600)` | ✅ | `harness.js → whenReady()` (süre değil hazır olma durumu) |
| **P-1** build'in %21'i gömülü veri | ✅ | `data/lazy.js` (v10.16 · P-1) — 350,7 KB JSON'a taşındı, yürütme maliyeti 0 |
| **P-2** `real-previews.js` filtrelenmiyor | ✅ | `smoke-previews.js` veri değişmezini kilitliyor |

Issue'da **açık kalan tek başlıklar** iki özellik önerisi:
kişilik katmanını diğer amiral sanatçılara yaymak (Ceza, Sagopa Kajmer,
Ezhel) ve kişilik katsayılarını oyuncuya görünür kılmak.

### 🔧 Süreç düzeltmesi — sabit adım sayısı kaldırıldı

`tools/verify.js` başlığında bu ders zaten alınmıştı (sabit sayı yazılmaz);
aynı bayat sayılar `.github/workflows/tests.yml`, `index.html` ve `README.md`
içinde kalmıştı ("11/12 adım", gerçek sayı artık 24). Sayılar kaldırıldı —
doğru değer yalnızca `SONUÇ: n/m` satırında görünür.

---

## GÜNCELLEME v10.31 — Çoklu erişim temizliği: tek ana yuva kuralı

Bazı işlevler birden çok yüzeyden erişilebiliyordu ve bakımı zorlaşıyordu.
Bu sürüm **"her işlevin tek ana yuvası olur; diğer yüzeyler yalnızca oraya
yönlendirir"** kuralını uygulamaya başlıyor. Yeni test: `tools/smoke-v1031.js`
(**28 kontrol**).

**Ayrım:** Sol panel = yönetim & üretim · Telefon = tüketim & iletişim.

### 🗑️ Ölü kod kaldırıldı
- `career-ui.js → renderStats()` — tanımlıydı ama **hiç çağrılmıyordu** (Analiz/Kariyer'in kopyası).
- `career-ui.js → act === "open-settings"` — handler vardı, düğme üretilmiyordu.
- **"Kariyer Detayı" modalı** — Kariyer sekmesindeki düğme kaldırıldı; içeriği Analiz'e taşındı.

### 📰 Röportaj: tek motor
Röportajın **üç ayrı sonuç motoru** vardı (basın teklifi · gazeteci araması · gazeteci DM).
Artık tek karar ekranı var: **`K.press.interview()`**.
- Sol panel → Olaylar → "🎤 Röportaj ver" (manuel giriş)
- Telefon → Aramalar (gazeteci) → kabul → **aynı karar ekranı**
- Telefon → Mesajlar (gazeteci DM) → kabul → **aynı karar ekranı**

### 📊 Analiz: net ayrışma
- **Sol panel → Analiz** = tüm-platform **yönetim özeti** (toplam dinlenme, platform kırılımı,
  14 günlük grafik, aktif listeler, son yayınlar) + yeni **Kariyer durumu** paneli.
- **Telefon → Spotify/Apple Artist** = yalnız **kendi platformunun** verisi. Global "aylık
dinleyici", "takipçi", "global albüm listesi" ve global trend bu uygulamalardan çıkarıldı;
yerine platforma özel toplamlar/kaydetme/Shazam/liste geldi.
- **Karma Artists** (telif/ödeme paneli) olduğu gibi kalır — o bir ödeme paneli, analiz değil.

---

## GÜNCELLEME v10.30 — İletişim katmanı: aramalar · gönderi türü · teklif kuyruğu · yabancı DM'ler

Dört yeni/derinleştirilmiş sistem; hepsi birbirine bağlı. Yeni test paketi:
`tools/smoke-v1030.js` (**80 kontrol**).

### 1) 📞 Gelen aramalar — `systems/calls.js` + `apps/calls.js`
Telefon artık **çalıyor**. 10 arama türü (menajer, şirket A&R, gazeteci, radyo,
sponsor, festival, hayran, sanatçı, mahalle/aile, **dolandırıcı**) gelir ve her biri
bir KARARA bağlanır:

| Karar | Sonuç |
|---|---|
| **📞 Aç** | Konuşma seçenekleri; her seçeneğin somut sonucu (para, şöhret, itibar, imaj, stres, ilişki, teklif) |
| **📵 Reddet** | Kaçan fırsat / bozulan ilişki / itibar kaybı |
| **✉️ Mesaj** | Yazılı yanıt; bazı arayanlar metni tercih eder |

Her arama **sürelidir** (`expiresDay`); süre dolarsa "cevapsız" olur ve sonucu yine
de vardır. Aramalar gün geçişinden sonra otomatik açılır; kaçarsan **Telefon**
uygulamasının *Gelen* sekmesinde bekler. Yanlış numara yok: dolandırıcı ön ödeme
istersen paranı alır, gazeteciyi reddedersen olumsuz haber çıkar.

### 2) 📈 Gönderi stratejisi — içerik TÜRÜ (`systems/social.js`)
Gönderi atarken artık **ne tür** bir içerik olduğunu seçiyorsun:

| Tür | Erişim | İmaj / İtibar | Risk |
|---|---|---|---|
| 📈 **Erişim** | Yüksek (×1,45 etkileşim + takipçi) | Hafif nötr | — |
| ✨ **İmaj** | Düşük (×0,72) | +itibar, +imaj | — |
| 🎲 **Risk** | %52 patlama (×2,4 + viral) | %48 tepki (−itibar/imaj, kriz riski) | Yüksek |

Tür seçici Instagram ve X gönderi modallarında. `K.social.playerPost()` sonuç
motorunu yönetir.

### 3) 🤝 Teklif kuyruğu + pazarlık — `systems/relations.js`
Teklifler artık **süreli ve birikimli**:
- Her teklife `expiresDay` atanır; süre dolarsa **geri çekilir** ve ilişki/itibar maliyeti doğar.
- **Pazarlık**: daha iyi şart istersin; karşı taraf kaldıraca (samimiyet + popülerlik + itibar)
  ve isteğin büyüklüğüne göre **kabul / kısmi taviz / geri çekilme** ile karşılık verir.
- Teklif kartında geri sayım (⏳) ve 🤝 Pazarlık düğmesi; teklif türüne göre farklı alanlar
  (feature gelir payı; şirket avansı/payı/süresi).

### 4) 💜⚠️📰 Yabancı DM'ler — `systems/dms.js`
Gelen kutusuna artık üç yabancı düşer; ikisi **engelle / yanıtla**:
- 💜 **Hayran** — sıcak yanıt sadakat ve takipçi kazandırır; engellersen kaybedersin.
- ⚠️ **Dolandırıcı** — sahte ödül/playlist; ödeme yaparsan para gider, detay sorarsan kaçar, engelle güvenli.
- 📰 **Gazeteci** — röportaj kabulü itibar kazandırır; engellersen basın ilişkilerin zedelenir.

Her mesaj süreli; **engellenen hesap** kalıcı olarak listeye girer ve bir daha yazamaz
(İstekler sekmesinde "🚫 engellenen hesap" satırından yönetilir).

### 🔗 Entegrasyon
- `game.js` günlük tick zinciri: `calls.tick()` + `dms.tick()`; gün geçişinde çalan arama otomatik açılır.
- Aramalar/DM'ler mevcut sistemleri besler: `economy` (para), `game.addFame` (şöhret tavanı),
  `press` (imaj/itibar), `relations` (samimiyet, teklif), `mental` (stres), `festivals`, `shady` (payola).
- `contacts.byId` artık yabancı gönderenleri de çözer; böylece Mesajlar/avatar altyapısı ortak çalışır.

---

## GÜNCELLEME v10.29 — Akıl sağlığı ekseni üç sisteme daha bağlandı

v10.28'de eklenen stres ekseni yalnızca **kayıt kalitesini** ve **yayın kilidini**
etkiliyordu. Artık sanatçının kafası **üç yerde daha** hissediliyor.

### 🔗 Yeni bağlantılar

| Sistem | Ne oluyor | Çarpan (stres 100'de) |
|---|---|---|
| ⚔️ **Diss kaydetme** (`beef.js`) | Dağınık kafayla yazılan gönderme **zayıf** kalır | `dissMult` → **0,55** |
| 🎤 **Konser performansı** (`concerts.js`) | Sahneden daha az şöhret/hayran kazanılır | `performanceMult` → **0,60** |
| 💬 **DM yanıt tonu** (`chat.js`) | Mesajların **ters teper**; sanatçı mesafe koyar | `dmMult` → **0,55** |

Hepsi **40 stresin altında etkisizdir** (çarpan 1,00) — yani sistem “stres 40'ı geçtiyse
bozulmaya başlar” diye öngörülebilir davranır.

### ⚔️ Diss: öfkeli ama dağınık

`noteDissTrack()` artık hem **etkiyi** hem **yayılımı** ölçekler. Ayrıca kayda
`(dağınık)` notu düşer ve bildirim *“Stresin yüksek — sözler dağınık”* der.

| Stres | Husumet | `boosts.diss` | Şöhret kazancı |
|---|---|---|---|
| 20 | 18,0 | 0,450 | +1,20 |
| 70 | 14,0 | 0,349 | +0,93 |
| 95 | **10,6** | **0,264** | **+0,70** |

### 🎤 Konser: salon dolar ama izlenim düşer

Sahne kazancı ayrıldı: **bilet/katılım etkilenmez** (salon doludur — bilet satışı ayrı
bir aşamada olur), ama **şöhret, itibar ve hayran kazancı** düşer. Turne durakları da aynı
şekilde ölçeklenir, her durakta `performance` değeri kaydedilir.

| Stres | Şöhret | Hayran |
|---|---|---|
| 20 | 2,70 | 127 |
| 70 | 2,16 | 101 |
| 95 | **1,71** | **80** |

### 💬 DM: sanatçı stresini hisseder

- Samimiyet kazancı ölçeklenir (stres 95'te **1,16 → 0,68**)
- Sanatçı **mesafe koyan bir cümle** ekler: *“Bugün biraz gergin gibisin.”* ·
  *“Bir şey mi oldu? Bana ters konuşuyorsun.”* · *“Sen iyi değilsin. Dinlen, sonra yazarım.”*
- Dönüş değeri `stressed` ve `dmMult` alanlarıyla bunu bildirir
- **Tutarlılık:** selamlaşma ve “seni tanımıyorum” (cold) yolları da ölçeklenir ve aynı
alanları döndürür — aksi halde “Selam” yazan oyuncu cezadan muaf kalırdı (bu, test
 yazılırken yakalandı)

### 🧪 Testler: `smoke-expansion.js` 135 → **162 kontrol**

Yeni **J) DERİN BAĞLANTILAR** bölümü:

- **J1** çarpan API'si — 40 altında 1,00 · ton eşikleri (gergin→yuksek→tukenmis) · taban değerler
- **J2** diss — iki koşuda karşılaştırma (husumet, `boosts.diss`, dinlenme, viral, şöhret,
  “dağınık” kaydı)
- **J3** konser — aynı konser iki streste; şöhret/hayran düşer, **katılım aynı kalır**,
  `performance` kaydedilir
- **J4** DM — çarpan, `stressed` işareti, **mesafe cümlesinin gerçekten üretildiği** (40 deneme),
  selamlaşma yolunun da ölçeklendiği
- **J5** statik entegrasyon — üç dosya `K.mental.*` okuyor mu, çarpanlar tanımlı mı

---

## GÜNCELLEME v10.28 — GENİŞLEME PAKETİ: altı yeni sistem

Bu sürüm oyuna **altı yeni sistem** ekler ve hepsi tek bir sekmede toplanır:
**💼 Girişim**. Ortak tema: *oyunun eksik kalan gerçekçilik katmanları*.

| # | Sistem | Dosya | Ne katar |
|---|---|---|---|
| 1 | ✍️ Başkası için yazmak | `systems/writing.js` | Gelir + network; gölge/kredili ikilemi |
| 2 | 👕 Ürün markası | `systems/merch.js` | Drop ekonomisi, stok riski, marka değeri |
| 3 | 🏎️ Varlık & gösteriş | `systems/assets.js` | Statü + **aylık bakım** (para harcama yeri) |
| 4 | 🧠 Akıl sağlığı | `systems/mental.js` | Stres/tükenme ekseni, zorunlu ara |
| 5 | 🎰 Karanlık taraf | `systems/shady.js` | Bot dinlenme & payola + tespit/yasak |
| 6 | 🌍 Uluslararası | `systems/intl.js` | Diaspora pazarı, nüfuz, yurt dışı telif |

### 1) ✍️ Başkası için şarkı yazmak — `systems/writing.js`

Oyuncu zaten bir **gölge yazar tutabiliyordu** ama kendisi yazamıyordu. Artık yazabiliyor.
Asıl gerilim **iki mod** arasında:

| Mod | Ücret | Bedel |
|---|---|---|
| 🎭 **Gölge** | **×1,35** | Adın geçmez; iş sayısı arttıkça **açığa çıkma riski** birikir |
| ✍️ **Kredili** | ×0,85 | İtibar +3, samimiyet +5, “yazarlık” kimliği |

Açığa çıkarsan imaj ve itibar yanar, “kendi işini yapmıyor” eleştirisi yayılır.
Kapsamlar: hook (2 gün) · verse (3) · tam şarkı (5). Ustalık = müzik + stüdyo becerisi.

### 2) 👕 Ürün / streetwear markası — `systems/merch.js`

Merch şimdiye kadar **yalnızca konsere bağlıydı** (katılımın %18'i). Artık kendi markanı
kurup **drop** çıkarıyorsun: tasarım kademesi, adet, fiyat.

- **Fiyat duyarlılığı:** pahalı fiyat → az satış, iyi marj
- **Stok riski:** elde kalan ürün **zarardır** (üretim maliyeti geri gelmez)
- **Tükenme (sell-out):** marka değeri + şöhret + yeniden stok baskısı
- Marka değeri büyüdükçe **premium koleksiyon** açılır
- Sinerji: moda sponsorluğu talebi +%18, viral trend +%15
- Drop sonrası **14 gün üretim molası** (spam yok)

### 3) 🏎️ Varlık & gösteriş — `systems/assets.js`

Oyunda parayı harcayacak **statü kalemi yoktu** (ölçüm: ÇALIŞKAN profil 420 günde net
~413 bin ₺ kâr ediyor). Yedi varlık eklendi — her biri **imaj + itibar** verir, karşılığında
**aylık bakım** ister:

| Varlık | Maliyet | Aylık bakım | İşlev |
|---|---|---|---|
| ⌚ Kol Saati | 180.000 | 900 | imaj |
| 💎 Elmas Zincir | 260.000 | 1.200 | imaj · **soyulma riski** |
| 🎛️ Kendi Stüdyosu | 350.000 | 6.000 | kayıt maliyeti ×0,85 · kalite +2 |
| ☕ Kafe / Kulüp | 700.000 | 8.000 | **pasif gelir** |
| 🏎️ Lüks Araba | 900.000 | 9.000 | imaj |
| 🏢 Şirket Binası | 1.200.000 | 18.000 | şirket gücü · itibar |
| 🏠 Şehir Evi | 1.400.000 | 14.000 | **stres azaltır** |

**Bakım ödenemezse imaj zedelenir** (“gösteriş borçla dönmez” haberleri). Satışta %40
değer kaybı var. Toplam bakım **pasif gelirden büyük** — yani varlık net giderdir; satın
aldığın şey statü ve işlevsel bonus.

### 4) 🧠 Akıl sağlığı & tükenmişlik — `systems/mental.js`

`fatigue` yalnızca “dikkat dalgası”nın doygunluğuydu — sanatçının kafası değil. Artık bir
**stres** ekseni var (0-100).

**Stres kaynakları:** borç · kriz · beef gerilimi · **çıkış hattı (0,35/gün)** · aktif kariyer
temposu (0,12) · yazarlık işi (0,20) · ürün drop'u (0,15) · turne (0,40) · yurt dışı turne (0,30)
· kötü imaj · şöhret baskısı.

**Çıkışlar:** 🌿 dinlen (−13, ücretli) · 🛋️ terapi (−0,9/gün) · 🏖️ tatil (−42 ama popülerlik düşer)
· 🗣️ **açık konuşma** (bir kez: imaj riski ↔ süperfan + itibar).

**Sonuçlar:** kayıt kalitesi çarpanı (100 streste ×0,83) · %85+ kamusal taşma · **%100 → 14 gün
ZORUNLU ARA** (yayın yapamazsın, hayran kaybı).

**Kalibrasyon (ölçüldü, 720 gün):** stresi 70'te dinlenen aktif oyuncu **0 tükenme** yaşıyor
(16 dinlenme ile idare ediyor); **hiç dinlenmeyen aktif oyuncu 8 kez tükeniyor ve 112 gün
kaybediyor**; yayın yapmayan pasif oyuncunun stresi 10'da kalıyor.

### 5) 🎰 Karanlık taraf: bot dinlenme & payola — `systems/shady.js`

Endüstrinin gerçeği olan **kısa yol** artık oyunda — ama bedeliyle.

| Paket | Maliyet | Dinlenme | Şüphe |
|---|---|---|---|
| 🐜 Küçük | 45.000 | +250 bin | +8 |
| 🐝 Orta | 140.000 | +900 bin | +18 |
| 🦗 Büyük | 400.000 | +3 Mn | +34 |
| 📻 Payola | 60.000 | listeye giriş | +10 |

**Tespit:** günlük şans = şüphe/100 × %7,5. Tespitte **bot dinlenmenin %70'i silinir**, imaj −8,
itibar −10, 1 strike. **3 strike → 60 gün platform yasağı** (telif geliri **×0,45**).
Şüphe zamanla çok yavaş azalır.
**Dürüst kalana ödül:** 360. güne kadar hiç kullanmayan oyuncuya itibar +8.

### 6) 🌍 Uluslararası / diaspora çıkışı — `systems/intl.js`

Türk rapinin son yıllardaki gerçek hikâyesi (Avrupa diasporası) oyunda yoktu. Beş pazar:

| Pazar | Pazar gücü | Giriş | Min. pop |
|---|---|---|---|
| 🇩🇪 Almanya | ×3,0 | 260.000 | 25 |
| 🇳🇱 Hollanda | ×1,1 | 180.000 | 28 |
| 🇫🇷 Fransa | ×1,2 | 240.000 | 32 |
| 🇬🇧 İngiltere | ×0,9 | 320.000 | 38 |
| 🇺🇸 ABD | ×1,6 | 900.000 | 48 |

Her pazarın **nüfuzu** (0-100) var; hedef popülerlik + yabancı feature + turne + global
dinlenmeyle büyür, ilgisiz kalırsan **söner**. Eylemler: 🌍 pazara gir · ✈️ diaspora turnesi
(**%15 vize reddi**, %18 lojistik aşımı) · 🤝 yabancı feature. Aşamalar: kapalı → diaspora →
Avrupa turu → küresel. Nüfuz **aylık yurt dışı telif** üretir.

### 🔌 Entegrasyon (yeni sistemler izole değil)

- `core/game.js` — altısı günlük tick'te, ikisi aylık döngüde
- `systems/career.js` — kayıt kalitesi **stres çarpanı** + **kendi stüdyosu** bonusu; tükenmişlikte **yayın kilidi**
- `systems/economy.js` — **varlık bakımı** aylık gidere girer; **platform yasağı** telif çarpanı
- `css/expansion.css` — yeni arayüz stilleri (karanlık taraf görsel olarak ayrışır)
- `core/state.js` — taze oyun şablonu **ve** eski kayıt göçü (iki yolda da varsayılan)

### 🧪 Yeni test paketi: `tools/smoke-expansion.js` (135 kontrol)

Bölümler: **A** kurulum · **B** yazarlık (gölge/kredili/açığa çıkma) · **C** ürün (maliyet,
satış, tükenme, bekleme) · **D** varlık (kilitler, bakım gidere girdi mi, ödenemezse imaj) ·
**E** akıl sağlığı (kaynaklar, eylemler, kalite cezası, **tükenme → yayın kilidi**) ·
**F** karanlık taraf (şüphe, tespit, geri alma, 3 strike → yasak, temiz ödül) ·
**G** uluslararası (giriş, nüfuz, turne, feature, aylık telif, aşamalar) ·
**H** entegrasyon (statik: tick zinciri, kalite, ekonomi, index.html, UI, CSS) ·
**I** **denge** (drop kâr oranı < 3×, varlık net gider, ücret bantları, ceza eşikleri).

Test yazılırken **üç gerçek hata** yakalandı ve düzeltildi:
1. **Marka kurulmadan drop başlatılabiliyordu** (kontrol eksikti)
2. **Tükenme hiç tetiklenmiyordu** — eşik, günlük düşüşten *sonra* kontrol ediliyordu;
   terapi/ev/süperfan rahatlaması stresi 100'ün altına indiriyordu
3. **Stres pratikte hiç birikmiyordu** — yalnızca kriz/borç/beef bekleniyordu; normal
   çalışma temposu baskısı eklenerek sistem canlandırıldı (yukarıdaki kalibrasyon ölçümü)

---

## GÜNCELLEME v10.27 — B-6 kapatıldı: oyuncu kimliği ↔ NPC kişiliği ayrıştırıldı

### 🏷️ Sorun: tek harfle ayrılan iki global

```
data/persona.js       (OYUNCU)  →  K.PERSONAS      · K.personaById · K.identityScore
data/personality.js   (NPC)     →  K.PERSONALITY   · K.personality
```

Global'ler **yalnızca tek bir harfle** ayrılıyordu (`K.PERSONAS` ↔ `K.PERSONALITY`).
Asıl tehlike `K.PERSONAS` (oyuncu *listesi*) ile `K.personality` (NPC *motoru*)
karışıklığıydı: yanlış olanı yazmak `undefined` döndürür ve hata **sessizce**
yanlış davranışa dönüşür — hata vermez, sadece çalışmaz.

### 🔀 Çözüm: global'ler açık önekli

| Taraf | Dosya (değişmedi) | Veri | Motor / yardımcılar |
|---|---|---|---|
| **Oyuncu** | `data/persona.js` | `K.PLAYER_PERSONAS` | `K.playerPersonaById` · `K.playerPersonaFit` · `K.playerIdentityScore` |
| **NPC** | `data/personality.js` | `K.NPC_PERSONALITY` | `K.npcPersonality` |

- Tüm çağrı yerleri güncellendi — oyuncu: `career-ui.js`, `career.js` ·
  NPC: `chat.js`, `instagram.js`, `tools/smoke-personality.js`
- Her iki dosyanın **başlığı** artık “bu hangi taraf, komşusu hangisi, global'i ne”
  diye açıkça yazıyor; `index.html`’e de aynı uyarı eklendi
- `state.js`’teki `player.persona` yorumu NPC katmanıyla ilgisiz olduğunu belirtiyor

**Kayıt uyumluluğu:** oyuncunun seçtiği kimlik `player.persona` alanında saklanıyor;
bu alan **kasıtlı olarak değiştirilmedi** (eski kayıtlar bozulmasın). Alan zaten
`player` altında olduğu için belirsizlik taşımıyor.

> **Dürüst not — dosya adları neden değişmedi?**
> Asıl temiz çözüm dosyaları `player-persona.js` / `npc-personality.js` olarak
> yeniden adlandırmaktı ve bu **yapıldı, doğrulamadan geçti**. Ancak GitHub'a
> yazmak için kullanılan entegrasyonda **dosya silme yeteneği yok**
> (`createOrUpdateFileContents` yalnızca oluşturur/güncelller). Eski adlar
> uzakta silinemeyeceği için **kalıcı yetim dosyalar** kalacaktı — bu, düzeltmeye
> çalıştığımız “bayat referans” sorununun ta kendisi. Yarım yeniden adlandırma,
> açık bir “adlandırmama”dan kötü olduğu için adlar geri alındı ve belirsizlik
> **kodun dokunduğu yerde** (global adlarında) çözüldü.
>
> Dosya adlarını da değiştirmek isterseniz yerel bir terminalde:
> `git mv js/data/persona.js js/data/player-persona.js` ve
> `git mv js/data/personality.js js/data/npc-personality.js`, ardından `index.html`
> ile iki başlığı güncelleyip `node tools/release.js minor --verify`.

### 🧪 Yapısal invariant: `tools/smoke-tooling.js` (51 → 66 kontrol)

Yeni **I) B-6 İNVARYANTI** bloğu ayrımı kalıcı olarak kilitler:

- Eski belirsiz adların **hiçbir kaynakta** geçmediğini tarar (`js/` + `index.html` +
  `tools/`; yorumlar ayıklanır, negatif bakış ile `K.personality` ↔ `K.npcPersonality`
  ayrılır, tarayıcı kendi dosyasını atlar)
- Her tarafın **kendi** global'ini kurduğunu denetler
- **Çapraz sızma yok:** oyuncu dosyası NPC global'ini (ve tersi) tanımlamamalı
- Her iki **başlığın komşu dosyayı adıyla gösterdiğini** denetler (belge disiplini)
- `index.html`’in ikisini de doğru sırayla yüklediğini denetler

**Kilidin kanıtı (mutasyon testi):** iki ayrı mutasyon denendi ve ikisi de yakalandı:

```
· I · eski belirsiz global adları hiçbir kaynakta yok — js/systems/chat.js → K.personality
· I · iki taraf BİRBİRİNİN global'ini tanımlamıyor (çapraz sızma yok)
```

---

## GÜNCELLEME v10.26 — Önizleme kapsamı %100 · YouTube kapsamı %77,8 · Türkçe harf hatası

### ✅ Önizlemeler tamamlandı: %99,0 → **%100** (504/504)

Eksik olan **5 şarkının 5'i de** iTunes'da bulundu ve her biri **HEAD isteğiyle
HTTP 200** doğrulandı:

| Şarkı | Canlı kayıt |
|---|---|
| `muti` — İlle De Sen | Muti & Azer Bülbül |
| `lierefuge` — RADİKAL | Lie Refuge |
| `lierefuge` — CEVHER | Lie Refuge |
| `lierefuge` — TEK | Lie Refuge |
| `lierefuge` — İnan Bana (feat. Lie Refuge) | Lil deez |

**Neden `fetch-artist-discography.js` kullanılmadı?** O araç bir sanatçının TÜM
bloğunu canlı veriyle **yeniden yazar** ve küratörlü veriyi bozar:

- “Muti” bloğunu **Heijan'ın** artistId'siyle çekmek 8 küratörlü ortak çalışmayı
  **68 Heijan şarkısıyla** değiştirirdi (iTunes'da “Muti” adında 3 farklı sanatçı var)
- Lierefuge bloğundaki konuk parçalar (*Yol (feat. Lie Refuge)*, *İnan Bana (feat. Lie Refuge)*)
  canlı listede yok → **silinirdi**

Bu yüzden yeni ve **hedefli** bir araç yazıldı: `tools/fetch-missing-previews.js`.
Yalnızca eksik önizlemeyi ekler; mevcut kayıtların hiçbirine dokunmaz.
İki strateji kullanır: (1) başlık+sanatçı araması, (2) **sanatçı katalog taraması**
(başlık araması niş sanatçıda boş dönerken katalog şarkıyı bulur — Lierefuge'ün üç
şarkısı tam olarak böyle bulundu).

### 🎬 YouTube kapsamı %52,6 → **%77,8** (+127 kayıt)

Ölçüm açığın tamamının **amiral sanatçılarda** olduğunu gösterdi (Şehinşah 8/187,
wegh Rumi 1/48). `real-youtube.js` elle üretilmişti ve **yeniden üretilemiyordu**.
Yeni araç `tools/fetch-youtube.js` bunu üretilebilir kılıyor:

- Yetkili kanalların **tüm yüklemeleri sayfalanır** (innertube continuation):
  Şehinşah resmî 233 + Topic 84, wegh Rumi 33 video
- Her video **oembed** ile doğrulanır (gömülemeyen videolar elenir)
- Eşleşme **katı**: şarkı adı başlıkta **kelime öbeği** olmalı
- **Yanlış bağlamayı önleyen üç kural** — hepsi gerçek bir hatadan doğdu:
  1. **Şarkı olmayan videolar elenir.** `Kunteper` yanlışlıkla *“Kunteper (Teaser)”*
     videosuna bağlanıyordu: `norm()` parantez içeriğini sildiği için “Teaser”
     işareti kayboluyordu. Artık işaret **ham başlıkta** aranır.
  2. **Çakışma çözümü.** `Prenses` ve `Prenses [Remix]` normalleşince aynı oluyor ve
     özgün şarkının videosu **remix'e** bağlanıyordu. Artık *kesinlik*
     (ortak kelime ÷ şarkı kelime sayısı) karşılaştırılır: 1/1 > 1/2.
  3. **Kısa/genel adlar** fazladan kelime kabul etmez → “Yalan” şarkısı
     “Yalan Dünya” videosuna bağlanmaz.

Sonuç: **Şehinşah 107** (+99) ve **wegh Rumi 29** (+28) kayıt. Kalan eksikler
(Şehinşah 80, wegh 19, Lierefuge 11) **gerçekten YouTube'da yok**: sanatçının tüm
kanal envanteri ve başlık bazlı 11 ayrı arama ile doğrulandı. “Wegh - Topic”
kanalı mevcut değil; yalnızca fan kanalları var ve onlar **bilinçli olarak
kullanılmadı** (yanlış bağlama riski).

### 🇹🇷 Türkçe büyük/küçük harf hatası (gerçek hata)

`"KARARDI".toLowerCase()` → `"karardi"`, ama şarkının yazımı `"Karardı"` → `"karardı"`.
Türkçe'de `I` harfinin küçüğü `ı` olduğu için JS bunu `i` yapar ve eşleşme **sessizce
düşer**. Bu hata hem YouTube eşleştirmesinde (wegh Rumi'nin *Karardı Bulutlar* şarkısı
bulunamıyordu) hem de `systems/preview.js`'teki normalleştirilmiş başlık aramasında
vardı. Artık `ı/İ/I/i` tek harfe katlanır (`trFold`) ve `"İ".toLowerCase()`'in ürettiği
birleşik nokta (U+0307) temizlenir.

### 🧪 Test paketi genişletildi: `tools/smoke-previews.js` (50 kontrol)

Yeni bloklar: **F · YouTube** (her kayıt gerçek şarkıya bağlı mı, geçerli videoId,
başlık doğrulanmış, kapsam ≥ %70, Şehinşah ≥ 100 / wegh ≥ 25 gerileme kilidi) ve
**G · Türkçe katlama** (büyük harfli ve karışık ı/i yazımla önizleme bulunuyor mu).
Ayrıca önizleme kapsamı artık **%100** olarak kilitli.

---

## GÜNCELLEME v10.25 — P-2 kapatıldı: önizleme süzgeci + kalıcı veri kilidi

### 🎧 P-2 hakkında dürüst durum

Issue #2'deki **P-2** maddesi (*“real-previews.js filtrelenmiyor”*) yeniden ölçüldü.
Sonuç v10.17'deki notla **aynı**: filtrelenecek kayıt yok.

| Ölçüm | Sonuç |
|---|---|
| Önizleme kaydı | **497** |
| Ses URL'i (`p`) eksik/bozuk olan | **0** |
| Apple linki (`a`) eksik/bozuk olan | **0** |
| `real-songs` içinde karşılığı olmayan (boşa düşen) kayıt | **0** |

Yani “kullanılmayan önizlemeleri at” planı **boşa çıkar**; veri zaten sıkı. Uydurma
bir kazanç yazmak yerine iki gerçek iş yapıldı.

### 🧹 Gerçek hata: oynatılabilirlik süzgeci yoktu — `systems/preview.js`

`find()` kaydı **olduğu gibi** döndürüyordu ve **çağıran taraf oynatılabilirliği
denetlemiyordu**. Bu yüzden `p` (30 sn ses) eksik/bozuk bir kayıtta:

- `has()` yanlışlıkla **`true`** dönüyordu → arayüzde **ölü bir ▶ düğmesi**,
- `play()` ise `audio.src = undefined` yazıp **“ses yüklenemedi”** hatası veriyordu.

Bugün veri sağlam olduğu için bu hata görünmüyordu — ama veri bir gün yeniden
üretildiğinde (`tools/fetch-artist-discography.js`) sessizce kullanıcıya yansırdı.
Artık oynatılabilirlik **tek bir süzgeçten** geçiyor:

- `validUrl()` — `p` için yalnızca `http(s)` / `data:audio` kabul edilir;
  `"undefined"`, `null`, boş string ve `javascript:` reddedilir.
- `playable(entry)` → **30 sn ses şart**; `has()` ve `play()` bunu kullanır.
- `usable(entry)` → ses **veya** sayfa bağlantısı; normalleştirilmiş başlık indeksi
  boş/bozuk kayıtları artık **indekslemez**.
- `links()` geçersiz `a` değerini bağlantıya çevirmez; Apple aramasına düşer.

Bu arada **ölü kod** da düzeltildi: `play()` içindeki “önizleme yoksa tam sürüm
çal” dalı `K.preview.has(cur)` ile koşuluyordu — `has()` de `find()`'a bağlı olduğu
 için o dal **hiç çalışamıyordu**. Artık `hasFull()` ile çalışıyor.

### 📉 Ölçülen gerçek durum: 5 şarkının önizlemesi yok

Dürüst kayıt — önizleme **kapsamı** tam değil (hiç olmadı):

```
real-songs    : 504 şarkı
real-previews : 497 kayıt   → 5 şarkının önizlemesi YOK
  · muti       — İlle De Sen           (YouTube tam sürüm var)
  · lierefuge  — RADİKAL               (YouTube tam sürüm var)
  · lierefuge  — İnan Bana (feat. …)   (YouTube tam sürüm var)
  · lierefuge  — CEVHER                (YouTube tam sürüm YOK)
  · lierefuge  — TEK                   (YouTube tam sürüm YOK)
```

Bu bir çöküş değil: `audio.js` önizleme bulamazsa **sentezlenmiş döngüye** düşer,
yani oyun çalınabilir kalır. Kapsam **%98,6**. Test artık bu tabanın altına
düşmeyi hata sayıyor, ama “kapsam tam” gibi **olmayan bir şeyi iddia etmiyor**.

### 🧪 Yeni test paketi: `tools/smoke-previews.js` (42 kontrol)

- **A · VERİ** — 497 kaydın tamamında geçerli `p` ve `a`; boş kayıt yok; şişme yok
- **B · TUTARLILIK** — boşa düşen kayıt yok; kapsam ≥ %98; önizlemesiz şarkı **zarif** düşüyor
  (`has()` false + `play()` çökmüyor → sentez yedeği)
- **C · SÜZGEÇ** — 6 bozuk kayıt biçimi (`p` yok/boş/`"undefined"`/`null`/kötü şema/boş nesne)
  için `has()` false; geçerli `p` varken true (**aşırı süzme yok**)
- **D · BAĞLANTI** — geçersiz `a` bozuk bağlantı üretmiyor; geçerli Apple linki korunuyor
- **E · GÜVENLİK** — `null`/boş/başlıksız girdiyle çökmüyor, `NaN`/`undefined` sızmıyor

**Kilidin kanıtı (mutasyon testi):** süzgeç geçici olarak kaldırıldığında süit
**6 kontrolde kırmızı** oluyor ve tam da bozuk kayıt biçimlerini işaret ediyor.
Yani test süs değil, gerçek bir kilit.

---

## GÜNCELLEME v10.24 — Şirket ekonomisi gerçekçileştirildi · ölü yapılandırma temizliği

### 💼 Şirket (label) geliri iki katmanlı hatadan kurtarıldı — `systems/economy.js`
Oyuncunun kendi şirketi, oyunun **tek gelir yoluydu ki kur/enflasyon uygulanmıyordu**.
`labelDailyNet()` iki ayrı hata taşıyordu:

1. **Eski sabit kur.** `gross = rosterStreams × K.ECON.royaltyPerStream` (0,0011 ₺)
   kullanılıyordu. Bu sabit `state.js` içinde zaten *“(eski)”* diye işaretliydi ve
   **kur dönüşümü, enflasyon, platform karması ve 30 sn eşiği yoktu**. v10.7'de
   `rate()` için düzeltilen hatanın (*“telif tam baseFx katı eksik ödeniyordu”*)
   aynısı bu dalda kalmıştı — şirket geliri gerçekçi değerin kabaca **1/220'si** kadardı.
2. **Sözleşme payı tersti.** `share = 1 − royalty/100` şirkete **sanatçının** payını
   veriyordu. `label.royalty` sözleşmede *şirketin* payıdır (bkz. `settleMonth`:
   sanatçı `1 − royalty/100` alır). Yani şirket %30 yerine %70 alıyordu.

Yeni model gerçek bir kâr/zarar tablosudur:

| Kalem | Hesap |
|---|---|
| Brüt gelir | kadro dinlenmesi × `econ.avgRate()` (ağırlıklı **kur + enflasyon**) |
| Şirket cirosu | brüt × sözleşme payı × menajer etkisi |
| İşletme gideri | brüt × `labelOpexShare` (tanıtım + kayıt + A&R + dağıtım) |
| **Net** | ciro − gider |

- Yeni sabitler: `storeMix` · `labelBillableShare: 0.88` · `labelOpexShare: 0.18`
- Yeni yardımcı: `K.econ.avgRate()` — platform ayrımı olmayan gelirler için ağırlıklı ₺/dinlenme
- Ölçüm (1. yıl, 1M dinleyici/ay): **~25.900 ₺/ay** — eskiden ~770 ₺/ay idi
- Düşük paylı (sanatçıya cömert) sözleşme artık oyuncuya **zarar yazdırabiliyor** — gerçekte olduğu gibi
- `label.royalty` artışı geliri **artırıyor** (eskiden azaltıyordu)

### 📈 Kadro büyümesine gerçekçi tavan — `systems/label.js`
Kadro sanatçısının dinleyicisi `monthly *= 1..1,008` ile büyüyordu: günde ortalama
**%0,4 bileşik** artış ve **hiçbir üst sınır yok**. 520 günlük simülasyonda kadro
10M → **70M** aylık dinleyiciye çıkıyor, yeni gelir formülüyle birlikte şirket aylık
**~3,5M ₺** üretiyordu — yani düzeltilen formülün altında üstel bir taban vardı.

Oyuncunun kendi eğrisi bu sorundan **v10.17'de** kurtarılmıştı (dikkat dalgası:
yüksel→zirve→düş), ama kadro NPC'lerine uygulanmamıştı. Artık tavan oyunun
**kendi kalibrasyonundan** gelir (`core/game.js` `listenerTarget`):

> aylık dinleyici ≈ **popülerlik² × 700**

Popülerlik 99'da durduğu için tavan da ~6,9M'da durur; sanatçı tavana kadar büyür,
sonra **platoda dalgalanır** — gerçek bir kariyer gibi. Aynı senaryonun sonucu:
kadro 20M'da platoya oturur, aylık gelir ~1,2M ₺'de dengelenir (üstel değil,
**kur + enflasyon** kaynaklı ılımlı artış).

### 🔗 Katalog bütünlüğü hatası — `systems/label.js`
`releaseForArtist()` katalog kaydını ekledikten sonra `label.catalog`'a **yeni bir rastgele
id** push ediyordu (`U.uid("cat")`), yani şirket kataloğundaki referansların hiçbiri gerçek
bir kayda karşılık gelmiyordu. Şirket gücü `catalog.length` üzerinden hesaplandığı için bu,
**boşa düşen id'lerle** şişiyordu. Artık `catalogAdd()`'in döndürdüğü **gerçek kaydın id'si** yazılır.

### 🧹 Ölü yapılandırma kaldırıldı — `core/state.js`
Hiçbir yerde kullanılmayan ve "eski" diye işaretli sabitler silindi:
`royaltyPerStream` · `taxRate` · `taxFreeMonthly` · `streamRevenueShare` · `messageCooldown`.
Bunlar "ayar varmış" gibi görünüp yanlış yere bağlanabildiği için (v10.7'deki
`royaltyPerStream` hatası tam olarak böyle doğdu) kaldırıldı.

### 🧪 Yeni test paketi: `tools/smoke-label.js` (37 kontrol)
Şirket ekonomisini ve hataların sessizce geri dönmesini engeller:
veri · kur · sıfır durumu · gelir · **pay yönü** · gerçekçilik bandı · kur/enflasyon ölçekleme ·
menajer etkisi · katalog bütünlüğü · güvenlik · **kadro tavanı**. `verify.js` zincirine eklendi.

### 📝 Bayat yorum düzeltmeleri
`core/game.js` içindeki kalibrasyon notu hâlâ *“şirket kurma eşiği 45”* diyordu;
`labelFoundMinPop` v10.8'den beri **28** (≈ 550 bin aylık dinleyici). Not güncellendi.

### ♻️ Önbellek damgası bayat kalmıştı
`index.html` içindeki tüm `?v=` referansları `aa2d881b` iken içerik hash'i `5ec13ef1` idi —
yani oyuncular eski JS/CSS'i önbellekten okuyordu. Bu, `verify.js` zincirinde **iki adımı**
(önbellek + mobil katman) birden düşürüyordu; damga yenilendi.

---

## GÜNCELLEME v10.19 — Festival devresi · güncelleme altyapısı · iki gerçek hata

### 🎪 Festival devresi — `systems/festivals.js` + `data/festivals.js`
Konserde mekânı sen kiralarsın; festivalde bir **line-up'a girmeye çalışırsın**.
Bu yüzden ayrı ve kendi ekonomisi olan bir sistem:

| Slot | Ücret × | Kitle × | Prestij × |
|---|---|---|---|
| ☀️ Gündüz Sahnesi | 0.30 | 0.55 | 0.25 |
| 🌇 Gün Batımı | 0.55 | 0.78 | 0.60 |
| 🌆 Prime-Time | 1.00 | 1.00 | 1.00 |
| 🎧 Ana Sahne Öncesi | 1.50 | 1.18 | 1.50 |
| 👑 Headliner | 2.60 | 1.42 | 2.60 |

- **10 festival · 4 tier** (yerel → şehir → ulusal → amiral), yaz sezonu (Haziran–Eylül)
- Slot, popülerliğine göre **otomatik tahsis** edilir; tier başına eşikler sabit
- **Başvuru penceresi** edisyondan 45 gün önce açılır, 3 gün kala kapanır
- **Strateji seçimi:** ücret odaklı · dengeli · kitle odaklı (ücret ↔ hayran dengesi)
- **Çakışma koruması:** aynı gün (±1) konser/turne/festival olamaz
- Performans sonucu: kitle, ücret, hayran, şöhret, itibar + **🔥 sahne anı**
  (viral) ve **⚠️ aksilik** olasılıkları; yüksek slotlarda **backstage** samimiyeti
- Amiral festival headliner'ı `player.flagshipHeadliner` olarak işaretlenir

### 🔄 Güncelleme altyapısı — oyuncu artık yeni sürümü görebiliyor
Önbellek hash'i (`?v=`) yalnızca sayfa **yenilendiğinde** işe yarıyordu; oyunu açık
bırakan oyuncu eskisini çalıştırmaya devam ediyordu.

| Dosya | Görev |
|---|---|
| `sw.js` | Service Worker — HTML **network-first**, `?v=` damgalı varlıklar **cache-first** |
| `js/systems/updater.js` | `version.json`'u karşılaştırır, **"Yeni sürüm hazır → Güncelle"** şeridi gösterir |
| `tools/gen-version-json.js` | `version.json` üretir + `sw.js` sürümünü damgalar |
| `.github/workflows/deploy-pages.yml` | Modüler sürümü **GitHub Pages**'e dağıtır |
| `.github/workflows/release.yml` | `git tag v*` → **GitHub Release** + tek dosya build |
| `tools/itch-deploy.js` | itch.io paketi + `butler push` (secret varsa) |

Tek dosya build'inde (`KARMA-Oyun.html`) bu katman **kendini kapatır** — orada
sunucu yoktur, hata vermez.

**Pages'i açmak için (tek seferlik):** Settings → Pages → Source = GitHub Actions,
sonra Actions → Variables → `PAGES_ENABLED = true`. Bu tanımlanana kadar deploy
iş akışı atlanır ve **yeşil kalır**.

### 🐞 İki gerçek hata kapatıldı

**1. CI'da Node sürümü çelişkisi** — `.github/workflows/tests.yml` `node-version: "20"`
kullanıyordu; `package.json` `engines.node: ">=22.15"` ve jsdom 30 Node 22+ istiyor.
Her push kırmızı gelmeliydi. → **node 24**.

**2. `tools/sim-balance.js` içinde sabit yerel yol** —
`require("/home/user/node_modules/jsdom")`. Bu yol yalnızca geliştiricinin
makinesinde vardı; depo kökünde `npm install` yapan **her** ortamda (CI dâhil)
denge simülasyonu adımı çöküyordu. → `KARMA_JSDOM` → yerel `node_modules` → ev
dizini sırasıyla denenir (`harness.js` ile aynı çözümleme).

### 🧪 Yeni test paketi: `tools/smoke-festivals.js` (61 kontrol)
Veri bütünlüğü · slot monotonluğu · takvim/pencere tutarlılığı ·
başvuru→kayıt→çözüm uçtan uca · çakışma koruması · şema/kalıcılık.

### 📱 Telefon gerçekçiliği
- **Alt kenardan yukarı çek → ana ekran**, **üstten aşağı çek → Kontrol Merkezi**
  (hareket yalnızca kenar bölgesinde başlarsa sayılır; liste kaydırması bozulmaz)
- **Dokunsal geri bildirim** (`navigator.vibrate`) — uygulama açma, eve dönme

### 🔧 Süreç düzeltmesi
`tools/verify.js` başlığındaki sabit adım sayısı kaldırıldı: "11 adım" yazıyordu,
gerçek sayı 13'tü, sonra 15 oldu. Sayı artık yalnızca `SONUÇ: n/m` satırında ve
**doğru** görünür.

---

## GÜNCELLEME v10.18 — Doğrulama, CI ve motor/veri ayrımı (bu sürüm)

Bu sürümde **yeni oyun özelliği yok.** Tamamen *güvenilirlik* ve *bakım*
üzerine: son dört güncellemede canlıya çıkan hataların sınıfını kapatıyor.

### 🧪 B-7 — Testler artık süre değil KOŞUL bekliyor

Altı test aracı boot için `setTimeout(run, 2600)` kullanıyordu: "herhâlde
2,6 saniyede hazır olur". Yavaş makinede/CI'da yanlış kırmızı, hızlı
makinede gereksiz bekleme üretiyordu.

**Yeni: `tools/harness.js`** — ortak test altyapısı. `whenReady()` oyunun
`K.phone`, `K.career`, `K.game`, `K.state` ile gerçekten boot olduğunu yoklar.
Testler ayrıca **ihtiyaç duydukları veriyi** bildirir:

```js
H.whenReady(dom, {
  label: "tembel veri hazır",
  ready: K => K.lazy.loaded("real-songs") && K.lazy.loaded("discography")
}).then(run)
```

Bu düzeltme hemen kendini kanıtladı: `smoke-social` koşul bildirmediği hâlde
4 kontrol kırmızı verdi (diskografi "0 yayın") — çünkü boot anında tembel veri
henüz gelmemişti. Eski sabit bekleme bu sorunu **gizliyordu**.

Sonuç: `apps` 2,6 sn → **2,2 sn** · `social` 2,6 sn → **1,6 sn** · süitler artık
gerçek bir hazır olma sinyaline bağlı.

### 🔀 B-5 — Motor ve veri ayrıldı

`systems/chat.js` **88,5 KB**'lık tek bir modüldü: DM motoru + niyet sözlüğü +
12 sanatçı profili iç içe. Her yeni profil 3.000 satırlık dosyayı düzenlemeyi
gerektiriyordu.

| Dosya | İçerik | Boyut |
|---|---|---|
| `js/systems/chat.js` | **Motor** — niyet analizi, cevap seçimi, kurallar | 88,5 → **50,1 KB** |
| `js/data/chat-profiles.js` | **Veri** — sanatçıya özel ağızlar | **41,1 KB** (yeni) |

Taşıma **kayıpsız** kanıtlandı: çıkarılan nesne literal'inin sha256'sı eski
`chat.js` içeriğiyle birebir aynı (`6b6173189aef`). Ayrıca geri düşüş var:
profil dosyası yüklenmezse motor boş nesneyle çalışır ve genel/tür havuzlarına
düşer — **çökmez**.

### ⚠️ v10.18.1 — CI kırmızısının nedeni: jsdom sürümü

v10.18.0 yayınında CI'nın "Tam doğrulama" adımı **kırmızı** geldi.
Teşhis (yerelde yeniden üretildi):

| jsdom | Kariyer eğrisi süiti (~1.100 oyun günü) |
|---|---|
| **24.1.3** (o gün kullanılan) | ❌ `FATAL ERROR: Reached heap limit — JavaScript heap out of memory` |
| **30.1.1** | ✅ 24/24 |

Yani hata oyun kodunda değil, **test bağımlılığının sürümündeydi**: eski jsdom
uzun simülasyonlarda DOM düğümlerini ve zamanlayıcıları yeterince bırakmıyor,
heap tükeniyor. Yerelde jsdom 30 kurulu olduğu için sorun görünmüyordu —
bu yüzden CI'ya kadar fark edilmedi.

**Düzeltme:**
- `package.json` → `jsdom: "^30.1.1"`, `engines.node: ">=22.15"`
  (jsdom 30 Node `^22.22.2 || ^24.15.0 || >=26` ister)
- CI iş akışı → `node-version: "24"`
- **Sürüm kapısı:** `tools/harness.js` → `jsdomVersion()` + `MIN_JSDOM = 30`;
  `tools/verify.js` artık **0. adımda** jsdom sürümünü denetler ve eski sürümde
  net bir mesajla durur:
  ```
  ❌ jsdom sürümü >= 30 — kurulu: 24.1.3
     YÜKSELTİN: `npm install jsdom@^30` (eski sürümler uzun testlerde OOM veriyor)
  ```
  Böylece aynı hata sessizce tekrarlanamaz.

### 🤖 CI — her push'ta tam doğrulama

**Yeni: `.github/workflows/tests.yml`** + **`tools/verify.js`**

```bash
npm run verify     # tam zincir · ~2 dakika
```

| # | Adım | Ne korur |
|---|---|---|
| 1 | Önbellek sürümü | `?v=` içerik hash'iyle uyumlu mu |
| 2 | Tek dosya build | üretilebiliyor mu (geçici dosyaya, ağaç bozulmaz) |
| 3 | **Build güncel mi** | depodaki `KARMA-Oyun.html` kaynaklarla **bayt bayt** aynı mı |
| 4 | Altı test paketi | mobil · tembel veri · kariyer eğrisi · kişilik · uygulamalar · sosyal |
| 5 | Denge simülasyonu | YÜKSEK önem bulgusu var mı |
| 6 | Runtime sağlığı | süitlerde yakalanmamış hata var mı |

**3. adım bu sürümün en önemli koruması:** build'i güncellemeyi unutmak artık
yapısal olarak imkânsız — CI yakalar.

### 🚀 `npm run release` — tek komutluk yayın ritüeli

Eskiden üç elle adımdı (damgala → build → commit'le) ve biri unutulabiliyordu.

```bash
npm run release -- patch --verify    # 10.18.0 → 10.18.1, damgala, build, doğrula
npm run release -- minor --verify    # 10.18.0 → 10.19.0
```

Sürüm `package.json` **ve** `js/version.js` içine birlikte yazılır.

### 🏷️ Sürüm artık görünür

`js/version.js` → `K.VERSION` (**10.18.0**). Önbellek hash'i makine içindir
ve okunaksızdır; sürüm insan içindir. **Ayarlar penceresinin altında**
görünür — "canlıda hangi sürüm var?" sorusunun tek bakışta cevabı.

### 🖥️ `npm run serve` — yerel önizleme

Modüler sürümü `file://` ile açmak **çalışmaz**: tembel veri katmanı
ihtiyaç anında alt kaynak çeker, tarayıcılar bunu `file://` altında engeller.

```bash
npm run serve     # http://localhost:8080
```

### 📋 Güncelleme disiplini (bu sürümden sonra)

1. Değişikliği yap
2. `npm run verify` — **tüm adımlar yeşil olmadan devam etme**
3. `npm run release -- patch --verify`
4. Commit + tag (`git tag v10.18.0`)

> **Not:** Sürüm etiketi (`git tag`) GitHub connector'ında yazma aracı yok;
> etiketi GitHub arayüzünden veya bir token'la `git push --follow-tags` ile
> oluşturman gerekir. Sürüm numarası zaten `package.json` + `K.VERSION`
> içinde tutuluyor, etiket yalnızca kolaylık.

---

## GÜNCELLEME v10.17 — Tembel veri katmanı + kariyer eğrisi

### 📦 P-1 — Ağır veri kritik yoldan çıkarıldı

Gerçek şarkı/önizleme/diskoğrafi verisi (~408 KB) sayfa açılışında hem
**indiriliyor** hem **çalıştırılıyordu**. Mobilde ilk açılışın en büyük maliyeti buydu.

**Yeni: `js/data/lazy.js` — iki mod, tek arayüz**

| Mod | Davranış |
|---|---|
| **Modüler** (GitHub Pages) | Dört veri dosyası açılışta yüklenmez; ihtiyaç anında bir `script` etiketi eklenip ağdan indirilir |
| **Tek dosya** (`KARMA-Oyun.html`) | Veri `type="application/json"` taşıyan bir blok olarak gömülür. Tarayıcı JSON bloğunu **yorumlamaz**; içerik ihtiyaç anında `JSON.parse` edilir |

`tools/build-single.js` hangi dosyaların tembel olduğunu `lazy.js` kayıt defterinden
okur ve veriyi `node:vm` içinde gerçekten çalıştırıp `JSON.stringify` ile gömer — böylece
dönüşüm regex'e bağlı değil, **her zaman geçerli JSON**.

**Ölçülen kazanç** (tek dosya build):

```
Toplam          1844,6 KB → 1801,0 KB
Gömülü veri      398,0 KB JS → 337,4 KB JSON  (%15,2 küçülme)
JS yürütme       ~398 KB için TAMAMEN SIFIR
```

**Hangi veri gerçekten tembel?** Boot sonrası ölçüm (`smoke-lazy.js` raporluyor):

```
real-songs=ready   ← çekirdek içerik: ilk ekran şarkı listesi çizer, meşru
real-previews=idle ← çalma anına kadar yüklenmez
 discography=idle  ← sanatçı profiline kadar yüklenmez
real-youtube=idle  ← video oynatılana kadar yüklenmez
```

> **Dürüst not — P-2 ölçüldü ve BOŞA ÇIKTI:** “kullanılmayan önizleme kayıtlarını
> at” planı denendiğinde 497 kaydın **tamamı** kullanımda ve boş URL yok. Veri zaten sıkı;
> bu madde iptal edildi, uydurma bir kazanç yazılmadı.
>
> Ayrıca `real-songs` boot'ta yükleniyor — bu bir eksiklik değil: ilk ekran gerçek
> şarkı listesi çiziyor. Kazanç onun **artık JS olarak çalıştırılmaması** ve JSON
> biçiminin %15 daha küçük olmasıdır.

**Önizleme alanları gömülmekten çıkarıldı:** `npcSongs()` her şarkı nesnesine
`preview`/`appleUrl` yazıyordu; bu yüzden şarkı listesi çizen **her** ekran 143 KB'lık
önizleme verisini çekiyordu. Artık `K.preview.find()` önizlemeyi çalma anında
`artistId`+`title` ile kendisi arıyor — davranış aynı, veri tembel.

### 📈 Denge — “yüksel → zirve → düş” eğrisi

**Ölçülen sorun:** 30 günde bir yayın yapan sanatçıda aylık dinleyici 420 gün boyunca
**tek yönlü** artıyordu (172 → 76.490); hiç zirve yapmıyor, hiç düşmüyordu.

**Model — dikkat dalgası + doygunluk (`K.ECON` attention*/fatigue*):**
her yayın bir **dalga** (attention) ekler, dalga her gün söner (`0.978`); ama her yayın
**doygunluk** biriktirir ve doygunluk sonraki yayının kazancını kısar. Bu iki zıt kuvvet
doğal olarak yükseliş → zirve/plato → düşüş üretir ve üstel sınırsız büyümeyi engeller.

**Sonuç (ybkz. `smoke-balance.js`):**

| Senaryo | Başlangıç | Zirve | Son | Düşüş |
|---|---|---|---|---|
| 1 yayın + 300 gün sessizlik | 165 | **1323** (gün 47) | 142 | **%89** |
| 240 gün yayın + 180 gün sessizlik | 165 | **70.376** (gün 257) | 18.567 | **%74** |
| 420 gün kesintisiz yayın | 165 | 110.856 | 110.856 | büyüme **içbükey** |

`sim-balance.js` artık **0 orta/yüksek bulgu** veriyor (öncesi: 4). Araç da düzeltildi:
ana koşudan sonra **sessizlik aşaması** eklenir ve düşüş orada ölçülür; ayrıca
“üstel büyüme” sabit bir eşik yerine **eğrinin içbükeyliği** ile sınanır.

### ✅ İki yeni test

```bash
node tools/smoke-lazy.js       # 51 kontrol
node tools/smoke-balance.js    # 24 kontrol
```

- **`smoke-lazy.js`** — soğuk açılış (JSON blokları çıkarılmış kopyada veri hiç
gelmezken tüm sekmeler/profiller çökmemeli), JS→JSON **kayıpsız dönüşüm** (kaynakla
birebir karşılaştırma), modüler `index.html`'in ağır dosyaları eager yüklememesi,
tek dosya build'inde JS yerine JSON bulunması, `</script>` kaçışı ve **geçiş penceresi
koruması** (`K.lazy` yokken tüketiciler eski global'e düşmeli).
- **`smoke-balance.js`** — dalga mekaniği birim testleri (doygunluk kazancı gerçekten
kısıyor mu, tavanlar aşılıyor mu), üç kontrollü senaryo, NaN/sonsuz sızması ve
**determinizm** (bağımsız ikinci boot + aynı tohum = aynı eğri).

### 🛡️ Geçiş penceresi koruması

19 dosya ayrı ayrı yayınlandığı için “`K.lazy` henüz yüklenmemiş ama çağrılıyor”
durumu gerçekten oluşabilir. Tüketicilerin tamamı artık eski global'e düşen bir
guard taşır (`K.lazy ? K.lazy.songs(id) : ((K.REAL_SONGS && K.REAL_SONGS[id]) || [])`),
yani yarım uygulanmış bir depo durumu bile oyunu kırmaz.

---

## GÜNCELLEME v10.15 — Mobil/dokunmatik katman + otomatik önbellek sürümü

### 📱 Mobil kırılmalar — yedi kök neden bulundu ve kapatıldı

Mobilde "yerler kırılıyor, yarıda kalıyor, bazı tuşlar çalışmıyor" şikâyetinin
arkasında tek bir hata değil, birbirini besleyen yedi ayrı hata vardı. Hepsi
kodda doğrulandı:

| # | Sorun | Neden oluyordu | Çözüm |
|---|---|---|---|
| **M-1** | Ekranın altı **kesiliyor** | `#app { height: 100vh }` — mobil tarayıcıda `100vh` adres çubuğunun arkasındaki alanı da sayar; `body { overflow: hidden }` yüzünden ulaşılamayan bir şerit kalır | `100dvh` (+ `100vh` yedeği, `@supports` ile) ve `svh` güvencesi |
| **M-2** | **Bazı tuşlar çalışmıyor** | iPhone çentiği ve home göstergesi alt barın/dock'un üstüne biniyordu; göstergenin şeridi dokunuşu yiyordu | `viewport-fit=cover` + `env(safe-area-inset-*)` tüm kenarlarda |
| **M-3** | Odaklanınca **düzen bozuluyor** | Tüm girdiler 13px'ti. iOS, 16px altı girdiye odaklanınca sayfayı kendiliğinden büyütür | Dokunmatik cihazlarda girdiler 16px (`pointer: coarse`) |
| **M-4** | Aşağı çekince **sayfa yenileniyor** | Pull-to-refresh; kaydedilmemiş ilerleme kayboluyordu | `overscroll-behavior: none` |
| **M-5** | Dokunuşlar **geç/şımarık** tepki veriyor | 300 ms dokunuş gecikmesi + çift dokunuş zoom'u; `:hover` dokunmatikte güvenilmez | `touch-action: manipulation`, tap-highlight temizliği, `:active` geri bildirimi, 44px dokunma hedefi |
| **M-6** | Paneller **dikeyde kırpılıyor** | Mobilde `.layout { overflow: hidden }` taşıyordu | Panel içi kaydırma korunur, alt çubuk payı eklenir |
| **M-7** | Telefon **aşırı daralıyor**, dikey alan boşa gidiyor | Sabit 390:800 oranı küçük ekranda dikey alanı heba ediyordu | ≤620px'te oran bırakılır, sahne doldurulur; çerçeve inceltilir |

### 🧭 Bölüm değiştirici artık **alt gezinme çubuğu**

Dar ekranda "Sanatçı / Kariyer ↔ Telefon" düğmeleri üst bardan alınıp **sabit alt çubuğa**
(güvenli alanın üstüne, başparmak erişimine) taşındı. Düğüm ve JS aynı kaldı —
sadece konum değişti. Etiketler iki biçimli: dar ekranda uzun metin yerine kısa metin.

### 🗂️ `css/mobile.css` — mobil kurallar tek dosyada

Önceden mobil kurallar **21 ayrı `@media` bloğuna** dağılmıştı ve hangi kuralın
kazandığı yükleme sırasına bağlıydı. Artık mobil/dokunmatik katman tek dosyada ve
**en son** yükleniyor, böylece alttaki 25 CSS dosyasını öngörülebilir biçimde ezer.

### ♻️ B-8 — Önbellek sürümü artık OTOMATİK

`index.html` içindeki **101 yerel referans** `?v=10.14` gibi elle artırılan bir numara
taşıyordu. Bir güncellemede unutulursa tarayıcı eski JS'i çalıştırır: **kod değişir,
oyuncuda hiçbir şey değişmez.** Teşhisi zor, etkisi büyük bir hata sınıfı.

Artık sürüm, `css/` ve `js/` dosyalarının içeriğinden üretilen bir hash:

```bash
node tools/bump-cache.js          # ?v= değerlerini yeni hash ile damgalar
node tools/bump-cache.js --check  # yalnızca denetle (bayatsa exit 1)
node tools/build-single.js        # build + entegre önbellek denetimi
```

İçerik değişmedikçe hash sabit kalır (gereksiz önbellek kaybı yok); tek bir dosya
değişince hash değişir ve istemci yeni sürümü kesin olarak indirir.

### ✅ Yeni test: `node tools/smoke-mobile.js`

35 kontrol — yedi kırılma sınıfının her biri için kural varlığı, yükleme sırası,
tek dosya build'e gömülme sırası, `viewport-fit` aktarımı ve önbellek sürümü
tutarlılığı. Ayrıca **gerçek invaryant**: hiçbir CSS dosyası `100vh`'ı
`!important` ile sabitleyemez (sabitlemek dvh düzeltmesini ezer). Negatif testle
doğrulandı — invariant bilerek kırıldığında test hata veriyor.

```bash
node tools/bump-cache.js && node tools/build-single.js
node tools/smoke-mobile.js
node tools/smoke-personality.js
node tools/smoke-apps.js
node tools/smoke-social.js
node tools/sim-balance.js
```

---

## GÜNCELLEME v10.14 — Sanatçı kişilik katmanı + günümüz sahnesi

### 🎭 Şehinşah ve wegh Rumi artık KENDİ karakteriyle konuşuyor

Şehinşah'ın DM'de bir kısmı kendi sesiyle, bir kısmı herkesle aynı cümleyle
konuşuyordu; wegh Rumi'nin ise hiç DM profili yoktu — UZI ile aynı trap
havuzundan cevap veriyordu. Bu sürüm ikisini de kendi karakterine oturttu.

**Yeni dosya: `js/data/personality.js` — derin kişilik katmanı (NPC)**
*(v10.27'de B-6 gereği global'ler `K.NPC_PERSONALITY` / `K.npcPersonality` oldu)*

`chat.js` içindeki `PROFILES` yalnızca *cümle havuzu* tutuyordu. Eksik olan
davranış modeliydi: bir sanatçı neyi sever, neye soğur, nerede susar.
Artık her iki sanatçı için şunlar tanımlı:

| Alan | İşlev |
|---|---|
| `archetype` / `essence` | Karakter özü (ör. Şehinşah → "Mistik Kral") |
| `loves` / `redLines` | Samimiyeti ne hızlandırır, ne kırar |
| `speech` | Cümle ritmi, kelime seçimi, kaçındığı ağız |
| `bias` | Niyet bazlı samimiyet katsayısı (24 niyet) |
| `openings` / `quote` | Kendine özgü açılış kalıbı |
| `test` | Oyun içi “kişilik testi” kartı |

**Sonuç:** aynı mesaj artık aynı puanı getirmiyor. Şehinşah'a boş övgü ile
somut bir söz eleştirisi, wegh'e taklit tavsiyesi ile üretim sorusu ayrı
karşılanıyor (bkz. `bias`).

### 🗣️ Şehinşah profili yenilendi (ölçülü ton)

- Eksik niyetler eklendi: `feature`, `hangout`, `company`, `diss`, `news`,
  `question`, `support`, `bye`, `beef`
- Kendi `extras`, `followup`, `reaction` ve `diss` havuzu geldi
- Argo ve gürültülü kibir profilden çıkarıldı; ağız tutarlılığı testle
  korunuyor (`kanka/lan/olm` yasağı)
- Sataşma kültürüne girmez — mesafeden cevap verir

### 🆕 wegh Rumi profili (ilk kez)

Hızlı, kısa, üretim takıntılı, bağımsızlık vurgulu bir ağız: `kayıt / mix /
beat / sound` sözlüğü, özel hayatta ketumluk, sahne ile samimi ama kulis
laflarına kapalı. 24 niyetin tamamı kendi havuzundan karşılanıyor.

### 💬 Sosyal medya yorumları sanatçıya özel

Eskiden yalnızca `label: "argo"` profili özel yorum alıyordu; diğer 35
sanatçı aynı yorumu paylaşıyordu. Artık `PROFILES[id].reaction` varsa
(övgü / eleştiri / nötr) kendi ağzıyla yorum yapıyor. Aynı şey `diss`
için de geçerli.

### 🏷️ Profilde “kişilik testi” kartı

Instagram sanatçı profilinde yalnızca kişilik profili tanımlı sanatçılarda
görünen bir kart: kod (ŞAH-1 / WGH-2), arketip, katsayı çubukları,
“işe yarayan” ve “kırmızı çizgi” listesi. CSS: `css/instagram.css`.

### 📰 Günümüz sahnesi gündeme eklendi

Müzik haber havuzuna 12 yeni başlık girdi; oyun artık eski gündemi değil
bugünün ekonomisini konuşuyor: tekli döngüsü, algoritmanın ilk 10 saniyesi,
yapay zekâ ve telif tartışması, aracısız yayın, melodik trap, drill'in
Türkiye'de yerleşmesi, phonk/hyperpop, sample savaşı, kısa video
challenge'ları, plak–kaset dönüşü.

### ✅ Yeni test: `node tools/smoke-personality.js`

263 kontrol: profil bütünlüğü, “kendi sesiyle konuşuyor mu” (genel havuza
düşme oranı), iki sanatçının ses ayrımı, ağız tutarlılığı, kişilik
ağırlığı (övgü > hakaret, müzik > flört), yorum/diss özelliği ve
şablon artığı (`undefined`, `{song}` vb.) kontrolü.

```bash
node tools/build-single.js
node tools/smoke-personality.js
node tools/smoke-apps.js
node tools/smoke-social.js
node tools/sim-balance.js
```

---

## GÜNCELLEME v10.6 — Sosyal medya + her sanatçının PP'si + tam diskografi

### 📸 Sosyal medya görünüm onarımı — kök neden bulundu
Hikâyelerin yarısı kesik, TikTok/Reels kartları ezik görünüyordu. Sebep tek bir
CSS kuralıydı: `.app-body` bir flex kolonudur ve çocukları varsayılan
`flex-shrink:1` ile **dikeyde eziliyordu** (kaydırma kapsayıcılarının içerik
minimum yüksekliği 0'a düşer). `css/phone.css`'e `.app-body > * { flex: 0 0 auto }`
eklendi — hikâye şeridi, gönderi kartları ve akış blokları artık sabit.
Ölçüm: hikâye şeridi 111px, halka 66×66, gönderi medyası 1:1.

### 🟣 Instagram gerçek Instagram gibi yeniden yazıldı (`css/instagram.css` + `apps/instagram.js`)
- **Üst bar:** serif *Instagram* logosu + kalp (etkinlik, rozetli) + uçak (DM) düğmeleri.
- **Hikâye şeridi:** gerçek PP'li halkalar, gradyan çerçeve, görülmüş/görülmemiş ayrımı,
  “Hikâyen” için mavi **+** rozeti. Yatay kaydırma; hiçbir hikâye kesilmez.
- **Gönderi kartı:** avatarlı başlık, **gerçek albüm kapağı** (şarkıya bağlı gönderilerde),
  kalp/yorum/gönder/kaydet satırı, beğeni sayısı, açıklama, yorum bağlantısı.
- **Çift dokunarak beğenme:** medyaya iki kez dokun → kalp patlaması animasyonu.
- **Alt sekme çubuğu:** gerçek IG'nin SVG ikonları (ev · arama · reels) ve
  profil sekmesinde **senin profil resmin**.
- **Profil:** büyük PP'li gradyan halka, istatistikler, bio (aka + tür + şehir),
  eylem düğmeleri, öne çıkanlar (Müzik/Sahne/Kulis/Fan) ve **sekmeli ızgara**
  (Gönderiler / Reels / Etiketli).
- **Keşfet:** arama kutusu + gerçek kapaklı ızgara + sanatçı ızgarası.
- **Reels:** 9:16 tam ekran, gerçek kapak, yan eylemler, ses bilgisi.
- **DM gelen kutusu:** çevrimiçi noktası, son mesaj, okunmamış göstergesi;
  satıra dokununca gerçek DM sohbeti açılır.

### ↔️ Kaydırma hareketleri (istediğin gibi)
Instagram içinde **sağa kaydır → DM gelen kutusu**, **sola kaydır → canlı yayın**.
Gerçek görünüm yığını içinde çalışır (uygulamadan çıkmaz). Test ile doğrulanır.

### 🖼️ Her sanatçının GERÇEK profil resmi (`js/data/artist-photos.js`)
36/36 sanatçı için Deezer açık API'sinden gerçek fotoğraf çekilip oyuna gömüldü
(`picture_xl`, 500×500). **Neden gömülü?** Deezer CORS başlığı göndermediği için
tarayıcıdan doğrudan çağrılamaz; gömülü veri hem çevrimdışı çalışır hem anında yüklenir.
`K.imagery.portrait()` artık sırayla **gömülü PP → Wikipedia → albüm kapağı → gradyan**
kullanır; PP eksik olsa bile `blanketHydrate()` arka planda tamamlar.
Renkli avatarlar oyunda her yerde (Spotify, Apple, YouTube, TikTok, X, Mesajlar,
yorum balonları) aynı gerçek yüzü gösterir.
Yenilemek için: `node tools/fetch-artist-photos.js`

### 🎵 Şehinşah ve wegh Rumi — TAM diskografi
| Sanatçı | Şarkı | Kendi | Feature | Önizleme | Kendi yayını |
|---|---|---|---|---|---|
| **Şehinşah** | **187** | 105 | 82 | 187/187 | 55 albüm/single |
| **wegh Rumi** | **48** | 40 | 8 | 48/48 | 28 albüm/single |

Oyun genelinde gerçek şarkı sayısı 278 → **504**'e çıktı. Hepsi 30 saniyelik
**gerçek ses önizlemesi** ve Apple Music bağlantısı taşır.
Yenilemek için: `node tools/fetch-artist-discography.js weghrumi "wegh"`

### 🆕 “Tüm şarkılar” görünümü (Spotify + Apple Music)
Sanatçı profili artık **Popüler (10 / 187)** gösterir ve altında
**“Tüm şarkıları gör”** satırı bulunur. Açılan görünüm tüm katalogu **yıla göre**
gruplar (2026 → 2001), arama kutusu içerir ve her satırı çalınabilir.
Apple Music sayfası 20 satırla sınırlanıp aynı görünüme bağlandı.

### 🐛 Düzeltilen altyapı hataları
- **`tools/build-single.js` çalışmıyordu:** `?v=10.5` önbellek sorgusunu dosya yolu
  sanıp `ENOENT` veriyordu. Tek dosya derlemesi artık çalışıyor (`stripQuery`).
- **Önbellek sürümü 10.5 → 10.6:** tarayıcı eski kopyayı kullanmaz.
- **Veri üreticileri repoya eklendi** (önceden yoktu, veri “otomatik üretildi”
  diyordu ama script yoktu): `tools/fetch-artist-discography.js`,
  `tools/fetch-artist-photos.js`.

### 🧪 Yeni test paketi: `node tools/smoke-social.js`
48 kontrol: PP kapsamı (36/36), Instagram yapısı ve kaydırma hareketleri,
çift dokunarak beğenme, DM gelen kutusu, tam diskografi ve önizleme oranları,
TikTok/X/Mesajlar render + PP kullanımı. Mevcut `smoke-apps.js` de 0 hatayla geçiyor.

---

## GÜNCELLEME v10 — Gerçeklik katmanı + görünüm stabilizasyonu

### Ekonomi ve endüstri gerçekçiliği
- **30 saniye eşiği (`K.econ.billable`):** dinlenmenin bir kısmı gelir sayılmaz.
  Kalite, giriş uzunluğu ve hook gücü belirler (%8–34 arası atlama). Arayüzde
  "30 sn üstü dinlenme" olarak görünür.
- **Telif ödeme gecikmesi (`K.ECON.payoutLag`):** mağazalar dinlenmeyi geç raporlar —
  Spotify 60 · Apple 45 · YouTube 75 · diğer 55 gün. Dinlenme önce **rapor kuyruğuna**
  girer; kasa panelinde "yolda olan para" ve "rapor bekleyen dinlenme" olarak görünür.
- **Kur (USD/₺) dalgalanması:** telif gelirleri kurla ölçeklenir. Aylık ortalama
  değer kaybı + ara sıra ani şok; kasa panelinde kur ve günlük değişim yüzdesi.
- **Enflasyon endeksi:** maliyetler VE telif nominal olarak birlikte artar.
- **Kademeli gelir vergisi (`K.ECON.taxBrackets`):** %0 / %15 / %22 / %30 dilimleri;
  efektif oran panelde gösterilir. Ödenmeyen borca **aylık %3,5 gecikme faizi** işler.
- **Kâr marjı:** her ayın gelir/gider dengesi hesaplanır; negatifse uyarı gelir.
- **4. gelir kalemi:** Spotify/Apple/YouTube yanında Deezer, Amazon, TIDAL,
  SoundCloud, Instagram toplamı "diğer mağazalar" olarak ayrı ücretlenir.

### Denge ve gerçekçilik düzeltmeleri (test sırasında bulundu)
- **Viral artık SÜRELİ.** `song.viral` bir kez açıldığında asla kapanmıyordu;
  şarkı her gün %1 büyüyüp sonsuza dek şişiyordu. Artık 16–34 günlük trend
  penceresi var, dolunca söner ve kullanıcıya bildirim gider.
- **Liste etkisi doyuma uğrar (`K.lists.LIFT_CAP`).** Her liste girişi
  `dailyStreams`'i kalıcı çarpıyordu → çok listeye giren şarkı üstel büyüyordu
  (400 günde ~30 kat). Artık kümülatif etki ~3×'te durur.
- **Olay etkileri geçici.** Olay/trend bonusları kalıcı taban değişikliği değil,
  sönümlenen `boosts` kalemi olarak uygulanır.
- **Ses trendi biter.** TikTok sesi momentum eşiğin altına düşünce kapanır ve
  etkisi 20 gün içinde sıfıra iner (eskiden video sayısı sonsuza dek büyüyordu).

  Sonuç (400 günlük simülasyon): dinlenme 86 **milyar**dan 27,9 **milyon**a indi;
  şarkı artık yükseliyor → zirve yapıyor → **düşüyor**.

### Görünüm stabilizasyonu ("cıvık durmasın")
- **Tek köşe yuvarlaklığı ölçeği:** `--radius-xs/s/m/l/pill`. Dağınık 20 farklı
  değer (3px, 7px, 9px, 11px, 13px, 18px…) kaldırıldı; **176 sabit değer + 44 hap**
  token'a bağlandı. `--radius-m` 16→14, `--radius-l` 24→20.
- **Bulanıklık tamamen kaldırıldı:** 11 adet `backdrop-filter: blur()` silindi —
  panel kenarları netleşti, metin keskinleşti, telefonda kaydırma hızlanır.
- **Gölgeler sadeleşti:** dev `0 18px 60px` → `0 10px 30px`, `0 4px 20px` → `0 2px 10px`.
  20 CSS dosyası düzeltildi.

---

## GÜNCELLEME v8 — Faz 2: iş, sponsorluk, duayen, A&R, ödül, muhasebe 

- **Sponsorluk + sell-out:** kötü imajlı marka anlaşması itibar ve takipçi kaybettirir,
  “satıldı” tepkisi gelir (`selloutUntil`).
- **Yeni yan işler:** stüdyo kiralama, müzik dersi verme, **DJ seti / kulüp gecesi**.
- **Röportaj riski:** 🎤 röportajda cevap seçersin — Alçakgönüllü / İddialı / Provokatif.
  Provokatifte **kötü alıntı** riski (itibar −3). Olaylar sekmesinden.
- **Duayen ilişkileri:** camianın saygı duyduğu isimler (`K.beef.isDuayen`). Saygı = büyük
  itibar, diss = camia tepkisi (tüm duayenler soğur). 70+ samimiyet → **mentorluk kalite bonusu**.
- **A&R toplantısı:** şirket üzerinden yayında A&R **revizyon isteyebilir**; uygula (+4 kalite,
  ₺8.000, +3 gün) ya da yoksay (itibar −2). Yayınlar sekmesinde.
- **Ödül töreni:** adaylık/kazanma sonrası **konuşma seçimi** (Alçakgönüllü / Gururlu /
  Rakibe gönderme) imaj-itibar-popülerlik dengesini değiştirir.
- **Muhasebe:** aylık **gelir / gider / vergi / net** raporu Kariyer sekmesinde.
- **Hedefler kitabı:** 8 yeni başarım (liste, radyo, tam dağıtım, ghostwriter'sız 10 şarkı,
  sözleşme, saygı, mentor).
- **Telefon rozeti:** Gündem uygulaması son 3 günün bildirimlerini rozetler.
- **▶ Dinle:** söz atölyesinde stüdyo önizlemesini gerçekten dinle (`K.audio`).

## GÜNCELLEME v7 — Kişilik, söz editörü 2.0, beat pazarı

Faz 1 (gerçekçilik listesi):

- **Sanatçı kimliği (player persona) — `js/data/persona.js`:** Sokak / Melankolik / Deneysel /
  (v10.27'de B-6 gereği global'ler `K.PLAYER_PERSONAS` / `K.playerPersonaById` oldu)
  
  Eğlence / Hikâye Anlatıcı. Şarkılar personanla tutarlıysa itibar, sadakat ve ivme artar;
  tutarsızsa **“kimlik uyuşmazlığı”** uyarısı ve itibar kaybı gelir. Kariyer sekmesinde
  kimlik kartı + **tutarlılık yüzdesi**. Yeniden markalama itibarı yorar.
- **Söz editörü 2.0:** hece/ölçü motoru (`K.meter`), **ölçü dengesi**, **iç kafiye**
  (`K.rhyme.internal`), **vurucu mısra (punchline)** tespiti. Analiz panelinde ve yapıcı
  geri bildirimde yer alır.
- **Ghostwriter:** söz yazarı tut (₺15.000) — sözler güçlenir ama **sızma riski**
  (itibar −6, imaj −5). Ghostwriter kullanımı yayında işaretlenir.
- **Beat pazarı:** her gün 3 prodüktör beat'i; satın al → **beat envanteri**; envanterden
  kullanırsan kalite artar (`+` puanlar).
- **Yayın stratejisi:** Standart / **🎬 Snippet paylaş** (ilk gün ivmesi +, ₺8.000) /
  **🌫️ Sürpriz çıkış** (sessiz başlar).
- **📻 Radyo prömiyeri:** şanslıysa şarkın prime-time bir programda ilk kez çalar;
  bildirim + dinlenme ivmesi.

## GÜNCELLEME v6 — Söz atölyesi, DM düzeltmesi, diss/saygı, şirket akışı

- **Söz Atölyesi (yeni adım):** 6 adımlı stüdyoda artık ayrı bir söz editörü var.
  Bölümler: **Intro · Verse · Hook · Chorus · Bridge · Outro**. Her bölüme öneri
  üretilebilir; **kafiye şeması** (AABB/ABAB...), **kafiye yoğunluğu**, **lirikal açı**
  (melankolik/agresif/samimi/epik/hikâye/meydan okuma) hesaplanır.
- **Yapıcı geri bildirim:** sayı yerine anlamlı dil — “Sözler oturmuş…”,
  “Durumun iyi değil; anlatı dağınık, akış zayıf.” Asla “kötü” denmez.
- **Gündem ayrı takip:** sözlerde gündem konusu yazmak GEREKMEZ. Tema, güncel
  gündem kategorisine denk geliyorsa ivme kazanır (`K.news.themeAffinity`).
- **DM düzeltmesi:** cevaplar **tek mesaj** (spam yok), bağlama göre anlamlı
  (`K.chat.contextReply`), rastgele kelime yansıtma kaldırıldı, takip soruları azaldı.
- **Çevre (mahalle/semt) artık şarkı çıkarmadan yazmıyor.**
- **Diss / saygı algılama:** sözlerde anılan sanatçı tespit edilir ve tonuna göre
  **saygı** (ilişki + itibar) ya da **diss** (husumet) uygulanır. Aynı şirketteki
  arkadaşlar da etkilenir (`K.labelmates`).
- **Şirket akışı + distribütör:** sözleşmeliysen yayını **şirket çıkarır**
  (“Şirkete Gönder”), masrafın bir kısmını üstlenir ve distribütör (The Orchard,
  Believe, Ditto Music, Sony Music Distribution...) devreye girer.
  Gerçek kadrolar: **PMC Music** (Patron, Ati242, Heijan, Muti), No.1 (UZI, Motive,
  Cakal), Hypers (Şehinşah, wegh Rumi, Lil Zey) gibi.
- Rakip sistemindeki saçma “bana diss yapar mısın” mesajı kaldırıldı.

## GÜNCELLEME v5 — Yükleme, mağaza seçimi, analiz

- **Parça yükleme alanları:** her parça bir dosya gibi yüklenir (ilerleme çubuğu, dosya
  tipi/bit/size, süre). Yükleme tamamlanmadan yayına geçilemez.
- **Kayıt kaynağı (`js/data/distro.js`):** Stüdyo / Ev / Canlı / Sample / Telefon demosu.
  Kaynak kaliteyi (±qAdd) ve maliyeti (×costMult) belirler. Kaynak değişince yükleme sıfırlanır.
- **Mağaza dağıtım seçimi:** 9 mağaza (Spotify, Apple, YouTube, TikTok, Deezer, Amazon,
  TIDAL, SoundCloud, Instagram/Facebook) seçilebilir. Seçim **dağıtım ücretini** ve
  **erişim çarpanını** (`K.distroReach`, 0.55–1.25) belirler; erişim ilk gün dinlenmesini
  ve liste giriş çekişini etkiler.
- **Kapak tasarımcısı derinleşti:** yazı tipi (4), yerleşim (3), şekil (5),
  sanatçı adı aç/kapa, renk tonu, grain, 8 stil, 6 desen, 3 yazı modu + mağaza önizlemesi.
- **Yayın analitiği sekmesi:** toplam dinlenme, aylık dinleyici, aktif liste, en iyi sıra;
  son 14 gün grafiği; Spotify/Apple/YouTube kırılımı; son yayınlar tablosu.
- **Mağaza içi listeler:** Spotify/Apple/YouTube sayfalarında oyuncunun girdiği listeler
  ve **Yeni Çıkanlar** bölümü (`K.ui.storeLists`).
- **Şirket paneli** dağıtım konsolu diliyle (nötr yüzey + tek aksan) yeniden giydirildi.
- **Denge:** kolay/normal/zor için liste girişi (`lists`) ve DM (`dm`) çarpanları.
- **DM:** listede/chart'ta başarı → erişilebilir bir sanatçıdan tebrik DM'i;
  popülerlik arttıkça ünlü yazma eşiği kademeli açılır.

## GÜNCELLEME v4 — Dağıtım konsolu + kapak tasarımcısı

- **Stüdyo artık bir yayın dağıtım konsolu gibi:** sol kenarda marka (KARMA DISTRO),
  dikey adım listesi ve canlı özet; sağda numaralı form blokları.
  DistroKid/TuneCore akışı örnek alındı: Yayın Bilgileri → Yayın Türü → Parça Listesi →
  Prodüksiyon & Sözler → Kapak → Tanıtım → **Dağıtım** (mağaza seçimi + özet + maliyet).
- **Tema bütünleştirildi:** tek aksan (`--karma`), nötr yüzeyler; renkli kutular yerine
  sade yardım satırları ve numaralı blok başlıkları. Sarı/yeşil/kırmızı yalnızca durum için.
- **Geçiş animasyonları:** adımlar arasında yön duyarlı kayma (ileri/geri), adım
  göstergesinde durum geçişi, kapak değişiminde pop animasyonu.
- **Kapak tasarımcısı yenilendi:** 8 stil · 6 desen (Düz/Halka/Çizgi/Izgara/Nokta/Dalga) ·
  3 yazı modu (Monogram/Başlık/Yazısız) · renk tonu kaydırıcısı · grain (doku) · rastgele.
  Kapak artık gerçek bir **600×600 SVG** olarak üretilir (`K.coverSVG`, seed biçimi
  `cv~stil~desen~yazı~ton~grain~başlık`) ve **Spotify / Apple / YouTube mağaza
  önizlemesinde** canlı gösterilir. Şarkılar albüm kapağını paylaşır.
- Yayın türü kartları (Single/EP/Albüm) parça sayısını hızlı ayarlar.

## GÜNCELLEME v3 — Stüdyo sihirbazı

- **Stüdyo baştan yazıldı:** tek uzun form yerine **5 adımlı sihirbaz**:
  1. **Parçalar** — parça sayısı ve adları. Çok parçalı yayınlarda zorunlu başlık
     alanı KALDIRILDI; proje adı isteğe bağlı, boşsa otomatik üretilir.
  2. **İçerik** — altyapı, vokal, parça türü, mix, sözler ve gündem, parça başına bütçe, feature.
  3. **Kapak** — 8 hazır kapak stili + rastgele kapak, canlı önizleme.
  4. **Pazarlama** — pazarlama bütçesi ve lansman süresi.
  5. **Yayın** — özet (format, kalite, gündem, maliyet, kasa) ve yayına ekleme.
- **Gereksiz bilgi temizliği:** "Adım adım rehber" listesi ve 7 kartlı yan panel
  kaldırıldı; yerine üstte kompakt 4 maddelik özet şeridi geldi.
- **Yazım düzeltmesi:** format kuralı artık doğru yazılıyor (5–11 albüm · 12+ deluxe).
- Adım göstergesi tıklanabilir; "İleri/Geri" alt barda sabit durur.
- Kapak stilleri `K.COVER_STYLES` · seed biçimi `cs:<stil>_<rastgele>`.

## GÜNCELLEME v2 — Gerçekçilik katmanı

Bu sürümde eklenenler:

- **Stüdyo:** format artık parça sayısından otomatik türetilir
  (1 Single · 2 Çift · 3-4 EP · **5+ Albüm** · 12+ Deluxe).
- **Parça başına bütçe:** her parçanın kendi üretim bütçesi ve buna bağlı
  kendi kalitesi vardır; toplam üretim maliyeti parça bütçelerinin toplamıdır.
  (`js/systems/career.js` → `_trackBudgets`, `releaseCost`; `js/ui/career-ui.js`)
- **Platform listeleri (`js/systems/lists.js`):** Spotify/Apple/YouTube/airplay
  girişleri olasılıksaldır, yayın günü girilmez, her şarkı her listeye girmez.
  Giriş kalite + pazarlama + PR + gündem + takipçi + pitch ile hesaplanır.
- **Mahalle/semt çevresi (`js/systems/contacts.js`):** 13 kalıcı, isimli ve
  yüzlü (SVG portre) tanıdık; her mesaj somut bir olaya bağlı (yeni şarkı, liste,
  virallik, gündem, sessizlik, kendi projesi). Yeni oyunda ünlü sanatçı DM atmaz.
- **Zor mod:** sayısal kalite/tahmin değerleri arayüzde gizlenir (`body.hide-values`).

## Çalıştırma

`index.html` dosyasını tarayıcıda aç. Harici bağımlılık yok; tüm script'ler
klasik `<script>` olarak yüklenir (modül/CORS sorunu çıkarmaz).

## Mimari (modüler çok dosya)

```
index.html                 — iskelet + script yükleme sırası
css/
  main.css                 — design token'lar, topbar, layout, toast/modal
  career.css               — şirket/kariyer paneli (sol taraf)
  phone.css                — iPhone çerçevesi, status bar, home screen, dock
  apps.css                 — uygulama içleri (Spotify/Apple/YT/IG/TT/X/DM)
js/
  data/
    genres.js              — türler, yayın tipleri, bekleme preset'leri, promo kanalları
    labels.js              — gerçek Türk müzik şirketleri
    artists.js             — gerçekçi sanatçı veritabanı (Şehinşah ve wegh Rumi ayrı sanatçılar)
  core/
    util.js                — namespace, format, RNG, zaman, DOM yardımcıları
    events.js              — pub/sub bus, toast
    state.js               — oyun durumu, kaydet/yükle, samimiyet aşamaları, ekonomi
    game.js                — gün döngüsü, yayın hattı, dinlenme akışı, listeler
  systems/
    economy.js             — para (günlük otomatik gelir YOK)
    career.js              — şarkı oluşturma, yayınlama, promosyon, sözleşme
    label.js               — şirket kurma, güç, A&R, sözleşme karar motoru, kadro
    relations.js           — SAMİMİYET, DM, hangout, FEATURE, ŞİRKET teklifleri
    platforms.js           — Spotify/Apple/YouTube verisi, editoryal listeler
    social.js              — Instagram/TikTok/X feed, promo, viral
  ui/
    components.js          — toast, modal, avatar, samimiyet barı, action sheet
    career-ui.js           — Kariyer / Stüdyo / Yayınlar / Listeler / Şirket / Kadro
  apps/
    phone.js               — telefon OS: home screen, uygulama kaydı, görünüm yığını
    spotify.js  applemusic.js  youtube.js  instagram.js  tiktok.js  x.js  messages.js
  main.js                  — boot, topbar, yenileme, giriş akışı
```

## İki ayrı bölüm

### 1. ŞİRKET / KARİYER MENÜSÜ (sol panel)
- **Kariyer**: kimlik, istatistikler, platform görünürlüğü, top şarkılar
- **Stüdyo**: şarkı oluşturma (tür, tip, bütçe, pazarlama, feature seçimi)
- **Yayınlar**: yayın hattı (Prodüksiyon → Dağıtım Kuyruğu → Editoryal → Yayın) + sosyal tanıtım
- **Listeler**: KARMA Top 30
- **Şirket**: kendi label'ını kur, güç, A&R adayları, sözleşme teklifi
- **Kadro**: şirket kadrosu, sanatçı başına yayın/DM

Şarkı oluşturma ve yayınlama **yalnızca burada**. Telefon bu sistemin yerini almaz.

### 2. TELEFON / UYGULAMA SİSTEMİ (sağdaki iPhone)
Spotify · Apple Music · YouTube · Instagram · TikTok · X · Mesajlar

## SANATÇI İLİŞKİLERİ & SAMİMİYET

Her sanatçı için **gizli/açık samimiyet** değeri (0-100). İletişim kurulunca görünür olur.

Aşamalar ve kilitler:

| Aşama | Min | Kilit açılan |
|---|---|---|
| Tanışma | 0 | — |
| Mesajlaşma | 15 | düzenli DM |
| Daha Fazla İletişim | 35 | uzun sohbetler |
| Birlikte Takılma (Hangout) | 55 | hangout etkinlikleri |
| Feature Teklifi | 70 | feature teklifi |
| Ortak Proje | 85 | ortak EP |
| Şirkete Katılma | 95 | sözleşme teklifi (kendi label'ın varsa) |

### FEATURE ≠ ŞİRKET (kesinlikle ayrı sistemler)
- **Feature**: oyuncu veya sanatçı ortak şarkı teklif eder → single ortak yayın.
  Kabul; samimiyet + sanatçının `work` trait'i + popülerlik farkına bağlıdır.
- **Şirket**: oyuncunun kendi label'ı varsa sözleşme teklif edilir.
  Kabul; **samimiyet + sanatçının popülerliği + şirket gücü + teklif şartları
  (avans/royalty/süre) + sanatçının mevcut şirketi (bağlılık + eski label gücü)** değişkenlerine bağlıdır.
  Sanatçı başka şirketteyse **buyout** maliyeti eklenir.

### DM merkezi
- Sanatçılar oyuncuya **kendiliğinden** mesaj atar (günlük tick).
- Oyuncu da DM başlatabilir; yanıtlar samimiyeti artırır.
- Hangout / feature / şirket davetleri DM üzerinden gelir ve kabul/ret edilir.

## GENİŞLETİLMİŞ SİSTEMLER

### 🎤 Konser & Turne (`systems/concerts.js`)
Mekân (kulüp → stadyum), şehir çarpanı, bilet fiyatı ve katılım tahmini; ön ödeme,
net gelir, şöhret etkisi. **Turne**: çok şehirli, duraklar arası gün seçimi, turne ilerleme çubuğu.

### ⚙️ Ayarlar & Kayıt Slotları (`systems/settings.js`)
3 kayıt slotu + otomatik kayıt, zorluk modu (kolay/normal/zor → gelir-maliyet-kriz çarpanı),
hareket azaltma ve tam sıfırlama. Üst bardaki **⚙️** butonundan açılır.

### 📈 İstatistik (`systems/stats.js`)
Günlük geçmiş kaydı (dinlenme, kasa, dinleyici, popülerlik, takipçi, şarkı) ve
**SVG sparkline grafikleri** + 30 günlük büyüme yüzdeleri.

### 🏢 Şirket Derinliği (`systems/label.js`)
**Ekip**: Menajer (gelir +%12/sv), Prodüktör (kalite +3/sv), PR (promo +%10/sv), A&R (imzalama şansı).
**Katalog**: şirket yayınları ve katalog değeri. A&R seviyesi, düşük samimiyette imzalamayı kolaylaştırır.

### 🏆 Ödüller (`systems/awards.js`)
Her 360 günde tören; 5 kategori, adaylık ve kazanma olasılığı liste performansı + popülerliğe bağlı;
ödül geçmişi arşivi.

### ⚔️ Rakiplik (`systems/rivalry.js`)
Oyuncuya yakın 3 rakip, **heat** (gerilim) barı; rakip diss gönderisi atar veya meydan okur.
Oyuncu: **Diss kaydet / Barış / Yok say**.

### ⚠️ Kriz Yönetimi (`systems/crisis.js`)
Skandal, sansür, intihal iddiası, sızıntı, gerilim; her krizde 2-3 seçenek, itibar/popülerlik/
hayran/para sonuçları.

### 🔴 Canlı Yayın & Fan Etkileşimi (`systems/livestream.js`)
Instagram/TikTok Live: **gerçek zamanlı** izleyici sayacı, enerji, bağış, takipçi kazancı;
şarkı söyle / freestyle / soru-cevap / konuk al / selam ver etkileşimleri.
Gönderi yorumlarına **yanıt vererek** hayran etkileşimi kazanılır.

### 💿 Gerçek Diskografi (`data/discography.js`)
36 sanatçının **196 gerçek albüm/single** kaydı ve kapakları; Spotify/Apple sanatçı
profilinde “Diskografi” bölümü.

## EKONOMİ
- Başlangıç bakiyesi: **₺25.000**
- **Günlük otomatik gelir YOK.** Gelir yalnızca dinlenme telifi, şirket geliri ve avanslardan gelir.

## RELEASE SİSTEMİ
Şarkılar: **Hazırlanır → Yayın sırasına girer → Editoryal/platform süreci → belirli gün sonra yayınlanır.**
Bekleme preset'leri: **13 gün** (hızlı), 18 gün (standart), **24 gün** (büyük lansman).

## PROMOSYON
Yayınlanan şarkılar Instagram / X / TikTok / YouTube üzerinden tanıtılır; görünürlük ve
dinlenmeyi etkiler. TikTok'ta viral olma, trend listesine girme şansı vardır.

## GERÇEK VERİ & GÖRSELLER

### Gerçek şarkılar
`js/data/real-songs.js` — 36 sanatçı için **272+ gerçek şarkı** (iTunes Search API,
`country=TR`). Şarkı adları, albüm adları, çıkış yılı ve **gerçek albüm kapağı** URL'leri
içerir. Oyun çevrimiçiyken bu liste canlı yenilenebilir.

### Gerçek liste
`js/data/charts.js` — **Apple Music Türkiye Top 50 gerçek liste anlık görüntüsü**
(Apple Marketing RSS, `tr / most-played`). Liste oyunda temel alınır; oyuncunun
şarkıları günlük dinlenmesi yeterliyse bu gerçek listeye **girer/çıkar**.

### 🔄 Canlı yenileme
`js/systems/live.js` — **Listeler** sekmesindeki "🔄 Canlı Yenile" butonu gerçek listeyi
internetten çeker. Çok kaynaklı dener (Apple Music most-played → CORS proxy'ler →
iTunes RSS). Sonuç `localStorage`'a yazılır ve oyuna uygulanır. Sanatçı şarkıları da
"Canlı yenile" ile iTunes'dan güncellenebilir. Çevrimdışıysa baked veri korunur.

### Gerçek görseller
`js/systems/imagery.js`:
1. **Sanatçı portresi** → Wikipedia REST API (tr) — canlı çekilir, önbelleğe alınır.
2. **Albüm kapağı** → iTunes Search API (canlı) veya baked veri.
3. Hiçbiri yoksa → gradyan avatar.

### Serbest metinli DM sohbeti
`js/systems/chat.js` — hazır seçeneklerle sınırlı değil. Oyuncunun yazdığı **herhangi bir
metin** niyetine göre analiz edilir (selamlama, övgü, eleştiri, feature, hangout, şirket,
para, müzik, kariyer, piyasa, destek, veda…) ve sanatçı **kişiliğine** (ego / sıcak /
temkinli / çalışkan) ve **ilişki seviyesine** göre bağlamsal cevap verir. Sanatçı kendi
**gerçek şarkılarından** alıntı yapar, bazen 2-3 kısa mesajla yanıtlar.

## GENİŞLETİLMİŞ TELEFON UYGULAMALARI

Her uygulama gerçek uygulamaya yakın çok katmanlı çalışır:

- **Spotify** — Ana Sayfa / Ara (Tümü·Sanatçı·Şarkı·Albüm filtreleri) / Kütüphane.
  Sanatçı profili (Popüler·Albümler·Benzer Sanatçılar), playlist ve albüm sayfaları,
  beğeni, takip, **şimdi çalıyor çubuğu**.
- **Apple Music** — Dinle (ruh hali + tür kartları) / Listeler (canlı Top 20) /
  Radyo (8 istasyon) / Kütüphane.
- **YouTube** — Ana Sayfa / Shorts / Abonelikler / Kanalım. İzleme sayfası
  (beğeni, abone, açıklama, **yorumlar**, sıradaki videolar), kanal sayfası.
- **Instagram** — Akış (hikaye şeridi + gönderiler) / Reels / Keşfet / Profil.
  **Gönderi detayı** (beğeni + yorumlar), **hikaye görüntüleyici**, takip, gönderi paylaşımı.
- **TikTok** — Senin İçin / Takip / Trend Sesler / Profil. Dikey video akışı
  (beğeni·yorum·paylaş·kaydet), **ses sayfası** (sesi kullanan videolar), şarkı tanıtımı.
- **X** — Akış / Keşfet (gündem + müzik haberleri) / Bildirimler / Profil.
  **Gönderi detayı ve yanıtlar**, gönderi yazma, trend detayı.
- **Mesajlar** — serbest metinli DM (bkz. aşağıda), teklifler, samimiyet.

Beğeniler, takipler, abonelikler ve kaydetmeler `interactions.js` üzerinden kalıcıdır.

## Veri notu
Sanatçıların aylık dinleyici / toplam dinlenme / takipçi değerleri **simülasyon için
yaklaşık/temsilî değerlerdir**. Şarkı adları, albüm kapakları ve Top 50 liste ise
yukarıdaki gerçek kaynaklardan gelir.

**Not:** **Şehinşah** (Ufuk Yıkılmaz) ve **wegh Rumi** (Arif Efe Çilli) oyunda
**iki ayrı sanatçı** olarak yer alır; her birinin kendi profili, şirketi ve samimiyet
ilişkisi vardır. **Lie Refuge** de gerçek şarkılarıyla (D'ÜNYAM albümü, Yalan, SON GAZ…)
bağımsız sanatçı olarak eklenmiştir.
