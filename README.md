# KARMA Music Game

Türk müzik endüstrisinde kendi sanatçı kariyerini kurduğun, tarayıcıda çalışan
bir simülasyon. İlk kaydını hazırla, yayınlarını dağıt, dinleyici kazan,
sanatçılarla ilişki kur ve kariyerin büyüdükçe kendi müzik şirketini yönet.

## v10.68.0 — Telefon uygulamaları ve ilk ay

Instagram ve YouTube arayüzleri, paylaşılan Android ekran görüntüleri temel alınarak
yenilendi. X’te akış/arama, Instagram’da hikâyeler ve Reels, YouTube’da Shorts ile
“Siz” kitaplığı, TikTok’ta dikey akış ve gönderi oluşturma bulunur. Beğeniler,
takipler, kaydetme, yorumlar ve gizlenen içerikler oyun kaydında korunur;
paylaşımlar oyundaki kişilere mesaj olarak gönderilebilir.

Bu uygulamalar kariyer simülasyonunun parçasıdır. Gerçek sosyal ağ hesaplarına
bağlanmaz; kamera kaydı, video yükleme veya platformların tüm özelliklerini sunmaz.
Akışlar oyundaki sanatçılar, yayınlar ve kapak görsellerinden oluşur.

## Hızlı başlangıç

### Oyunu oynamak

Depodaki **[KARMA-Oyun.html](KARMA-Oyun.html)** dosyasını indirip tarayıcıda aç.
Bu sürüm oyun kodunu, stilleri ve temel verileri tek dosyada içerir.
İnternetten alınan görseller, ses önizlemeleri ve canlı veri yenilemeleri
bağlantıya ve ilgili kaynakların erişilebilirliğine bağlıdır.

### Kaynak koddan çalıştırmak

**Gereksinimler:** Node.js 22.15 veya üzeri ve npm.

```bash
npm ci
npm run serve
```

Tarayıcıda **http://localhost:8080/** adresini aç. Sunucuyu `Ctrl+C` ile durdur.
Farklı bir port için `node tools/serve.js 3000` kullanabilirsin.

Modüler sürümü (`index.html`) HTTP sunucusu üzerinden çalıştır; tembel veri
yükleme katmanı nedeniyle dosyayı doğrudan `file://` ile açmak desteklenmez.

## Kariyerindeki ilk ay

Kariyer ekranındaki kart üç yakın hedef sunar:

- İlk şarkını yayınla.
- 50 aylık dinleyiciye ulaş.
- Müzikten ilk **₺1.000** gelirini elde et.

Fırsatlar yaptığın işlere bağlanır: semt prodüktörüyle buluşma, hazırladığın
kayıt için son dinleme, yayın sonrası küçük sahne ve ilk dinleyicinden geri
dönüş. Seçimler para, yorgunluk, kalite ve ilişkileri etkiler. Randevular
takvimde; sonuçlar mesajlarda ve kariyer günlüğünde görünür.

Her fırsatta ücretsiz bir yol ve pas geçme seçeneği vardır. Kabul ettiğin
randevuyu iptal etmenin bedeli karar kartında gösterilir. Temel kontrolleri
öğreten **İlk 10 dakika rehberi** açılır bölümden erişilebilir.

İlk 30 gündeki eski kayıtlar yeni akışa katılır; daha ileri kariyerler başa
dönmez. İlk ayın sonunda normal kariyer devam eder.

[Ayrıntılı ilk ay akışı, kayıt uyumluluğu ve ekonomi düzeltmeleri →](docs/first-month.md)

## Oyunda neler var?

| Alan | Yapabileceklerin |
| --- | --- |
| Stüdyo ve yayın | Parçalar, sözler, prodüksiyon, kapak, distribütör ve mağaza seçimi; taslaklar, yayın takvimi ve tanıtım |
| Kariyer ve ekonomi | Telif, yan işler, konserler, turneler, sponsorluklar ve para akışı analizi |
| İlişkiler | Serbest metinli DM, kalıcı semt çevresi, ortak şarkı teklifleri ve sanatçıların kararlarına yansıyan ilişki geçmişi |
| Müzik şirketi | Sözleşmeler, avans, haklar, kadro, ekip ve katalog yönetimi |
| Endüstri | Oyuncudan bağımsız sanatçı yayınları, listeler, rekabet, gündem ve ödüller |
| Telefon | Spotify, Apple Music, YouTube, Instagram, TikTok, X, mesajlar, aramalar ve hedefler |

Kariyer paneli üretim ve yönetim merkezidir; telefon sosyal etkileşimleri,
mesajları ve platformlardaki görünürlüğünü takip etmeni sağlar. **Günü Bitir**
ile yayın hattı, dinlenmeler ve günlük olaylar ilerler.

### Ekonomi ve haklar

Normal zorlukta başlangıç bakiyesi **₺25.000**. Yayın üretimi, tanıtım ve
yaşam giderlerini gelirlerinle dengele; dinlenme telifleri raporlama ve ödeme
gecikmeleriyle tahsil edilir. Analiz sekmesi gelir ve gider kaynaklarını gösterir.

Konserin kalan gideri etkinlik günü hesaplanır. Şirket telifinde pazarlıkta
kaydedilen oran kullanılır. Sözleşme bitince yeni işler için bağımsızlaşırsın;
önceki yayınların hakları ve kalan avans hesabı korunur. Özel sync lisansı
verdiğin şarkılar tekrar lisans teklifine girmez.

## Kayıt ve ayarlar

İlerleme tarayıcının `localStorage` alanında saklanır. Üst bardan kaydedebilir,
**Ayarlar ve kayıt** menüsünden üç kayıt slotunu, zorluk seçeneklerini ve
görünüm ayarlarını yönetebilirsin. Tarayıcı verilerini temizlemek yerel
kayıtları siler; farklı tarayıcı veya site adresleri aynı kayıt alanını paylaşmaz.

## Geliştirme ve doğrulama

```bash
# Kaynaklardan tek dosyalık oyunu üret; önbellek sürümünü güncelle
npm run build

# Sürüm metadatasını ve service worker önbellek bilgisini güncelle
npm run version:json

# Tüm doğrulama adımları
npm run verify

# İlk ay, ekonomi ve sözleşme senaryoları
node tools/smoke-journey.js
```

`npm test`, `npm run verify` ile aynı komutu çalıştırır. Tam doğrulama;
önbellek ve build bütünlüğünü, davranış testlerini, denge simülasyonunu ve
sürüm metadatasını kontrol eder. Test bağımlılığı **jsdom 30+**, `npm ci`
ile kilit dosyasından kurulur.

Kaynak JS/CSS değişikliklerinden sonra build ve sürüm metadatasını yenile;
üretilen `KARMA-Oyun.html` dosyası kaynaklarla eşleşmelidir.

### Dosya yapısı

```text
index.html              Modüler giriş ve script yükleme sırası
KARMA-Oyun.html          Üretilen tek dosyalık oyun
css/                    Kariyer, telefon ve uygulama stilleri
js/core/                Durum, kayıt, olaylar ve gün döngüsü
js/data/                Sanatçı, şarkı, şirket ve diğer oyun verileri
js/systems/             Kariyer, ekonomi, ilişkiler ve endüstri sistemleri
  journey.js            İlk ay fırsatları, hedefleri ve karar sonuçları
js/ui/                  Kariyer arayüzü ve ortak bileşenler
js/apps/                Telefon uygulamaları
js/main.js              Başlatma ve ana arayüz bağlantıları
tools/                  Yerel sunucu, build ve doğrulama araçları
docs/                   Özellik rehberleri ve sürüm notları
```

## Belgeler

- [İlk ay: kararlar, ilişkiler ve ekonomi](docs/first-month.md)
- [v10.67: yeni çıkış akışı ve rotasyon](docs/v10.67.md)
- [Build üretimi ve CI akışı](docs/build-artifact.md)
- [Stüdyo bileşenleri](docs/studio-components.md)
- [Geçmiş sürüm notları](docs/update-history.md)

## Veri hakkında

Sanatçıların dinleyici, dinlenme ve takipçi değerleri oyun için temsilîdir.
Gerçek şarkı adları, kapaklar ve liste verileri depodaki veri kümelerinden ve
Apple/iTunes gibi kaynaklardan gelir; anlık güncellik garantisi yoktur.
Canlı veri alınamazsa oyun gömülü verilerle devam eder.
