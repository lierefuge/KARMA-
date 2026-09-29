# KARMA Music Game — Music Industry Simulator

Türk müzik endüstrisi simülasyonu. Sanatçı kariyerinden şirket (label) yönetimine
ve sosyal medya etkileşimlerine kadar ilerleyen kapsamlı bir oyun.

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

### 🤖 CI — her push'ta 11 adımlı doğrulama

**Yeni: `.github/workflows/tests.yml`** + **`tools/verify.js`**

```bash
npm run verify     # 11 adım · ~100 saniye
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
2. `npm run verify` — **11 adım yeşil olmadan devam etme**
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

**Yeni dosya: `js/data/personality.js` — derin kişilik katmanı**

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

- **Sanatçı kişiliği (persona) — `js/data/persona.js`:** Sokak / Melankolik / Deneysel /
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
