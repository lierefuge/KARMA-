# KARMA — Özellik Genişletme Yol Haritası

**Durum:** Planlama belgesi; oyun kodu, kayıt biçimi ve arayüz henüz değiştirilmedi.  
**Hedef:** Mevcut kariyer, şirket, telefon, stüdyo ve endüstri akışlarını koruyarak simülasyon derinliğini artırmak.  
**Öncelik yöntemi:** Oyuncuya etkisi, mevcut sistemlerle uyumu ve ekleme riski. Zorluk süre taahhüdü değil; mevcut mimariye göre göreli tahmindir.

## Kapsam ve koruma ilkeleri

- Oyunun mevcut menüleri, görsel dili, kariyer/telefon düzeni ve tek oyunculu akışı korunur. Yeni ekranlar mevcut sekmelere veya mevcut telefon uygulamalarına eklenir; menüler baştan kurulmaz.
- Mevcut simülasyon motoru, kayıt/yükleme ve çalışan sistemler yeniden yazılmaz. Yeni mantık mümkün olduğunca ayrı bir sistem modülünde tutulur.
- Yeni kayıt alanları eski kayıtlarda güvenli varsayılanlarla açılır. Eski kayıtları sıfırlamak, toplu dönüştürmek veya var olan hak/gelir sonuçlarını sessizce değiştirmek kabul edilmez.
- Web oyunu tek oyunculu ve çevrimdışı çalışmayı sürdürür. Ağ gerektiren özellikler ayrı, isteğe bağlı bir servis katmanı gerektirir; anahtarlar tarayıcıya konmaz.
- Telefon içindeki platformlar oyun simülasyonudur; gerçek Spotify/Instagram hesaplarıyla bağlantı bu planın kapsamında değildir.
- Kaynaklar değişirse tek dosyalık KARMA-Oyun.html elle düzenlenmez; repo build/doğrulama zincirinden üretilir.

## Sıralama ve bağımlılıklar

### Kısa vade — 1–10

Mevcut sistemlere eklenen, backend gerektirmeyen iyileştirmeler. İlk dalga için önerilen sıra: fan ölçümü (3) → kampanya ölçümü (1) → sosyal içerik takvimi (16) ve editoryal sunum (15); sözleşme koşulları (6) → ortak proje payları (8); stüdyo oturumu (9) → katalog yaşam döngüsü (10). Diğer maddeler bu sıraya paralel yürüyebilir.

### Orta vade — 11–22

A&R, sanatçı gelişimi, şirket iş akışları, turne ve uluslararası pazar. Bu faz, kısa vadeli veri ve ölçüm katmanları doğrulandıktan sonra başlamalı. Transfer piyasası (19), sözleşme koşulları (6) ve A&R radarı (11) üzerinde yükselir. Yayıncılık hakları (21), sözleşme ve ortak proje paylarının (6, 8) veri modeli netleşmeden başlamamalı.

### Uzun vade — 23–30

Daha geniş ürün/mimari kararı gerektiren şirket simülasyonu, üretken yapay zekâ, çevrimiçi eşitleme, mobil istemci ve çok oyunculu mod. Bulut kayıt (26), çok oyunculu (25) ve yerel mobil istemci (27) için temel bağımlılıktır. Üretken yapay zekâ (24) ayrı güvenli sunucu katmanı gerektirir. Kariyer mirası (30), kariyer yolları (5) ve hak/katalog kuralları (6, 21) olgunlaştıktan sonra ele alınmalı.

## 30 geliştirme fikri

## Kısa vade

### 01. Çıkış kampanyası ölçümleme panosu
- **İşlev ve oyuncu değeri:** Ön kayıt, teaser, tanıtım kanalı ve bütçenin dinlenme, takipçi ve satışa dönüşümünü gösterir; oyuncu bütçeyi hangi kanala yatıracağına sonuç verisiyle karar verir.
- **Bağlantı:** rollout, ekonomi, katalog ve platform istatistikleri. **Zorluk:** Orta.
- **Güvenli ekleme:** Kampanya sonuçlarını yayın başına yeni bir kayıt alanında tut; eski yayınlar mevcut değerleriyle çalışmaya devam et.
- **Kabul ölçütü:** Her kampanya kanal bazında harcama ve sonuç gösterir; toplamları yayın raporuyla tutarlıdır; kampanya verisi olmayan eski yayın açılmaya devam eder.

### 02. Sonuç doğuran müzik gündemi olayları
- **İşlev ve oyuncu değeri:** Viral akım, platform kuralı değişikliği, festival iptali veya tür dalgası gibi haberler sınırlı süre ve kapsamla piyasa etkisi yaratır; haberler dekor olmaktan çıkar.
- **Bağlantı:** endüstri, haber akışı, ekonomi, listeler. **Zorluk:** Orta.
- **Güvenli ekleme:** Olayları tarih aralığı, bölge/tür ve sınırlı etki katsayısı olan ayrı bir modülde tut; aynı kayıt için tekrar yüklemede olay geçmişini yeniden oynatma.
- **Kabul ölçütü:** Olayın etkisi başlangıç/bitiş günlerinde tutarlı işler; etkilenmeyen tür ve bölgeler değişmez; eski kayıtlar olay alanı olmadan açılır.

### 03. Fan kazanım ve kayıp döngüsü
- **Durum:** **v10.72.0'da uygulandı** (`js/systems/fans-cohort.js`, süit `tools/smoke-v1072.js`). Pay tabanlı kohort modeli: 6 kaynak, kaynak bazlı sadakat, son 30 günün giriş/çıkışı, Fanbase → 🧭 Kohortlar sekmesi.
- **İşlev ve oyuncu değeri:** Fan kitlesini keşif kaynağı, etkileşim, sadakat ve zamanla uzaklaşma kohortlarıyla izler; oyuncu tek seferlik takipçi artışından çok kitlesini elde tutmayı yönetir.
- **Bağlantı:** fans, sosyal uygulamalar, konserler ve ekonomi. **Zorluk:** Orta.
- **Güvenli ekleme:** Kohort verisini mevcut toplam fan katmanlarının yanına ekle; eski kayıtların toplamlarını varsayılan başlangıç kohortuna dönüştür.
- **Kabul ölçütü:** Kohortların toplamı toplam fan sayısıyla eşleşir; bir fan aynı anda iki kez sayılmaz; eski kayıtların fan/gelir değerleri geriye dönük düşmez.

### 04. Prodüktör, beatmaker ve aranjör ağı
- **İşlev ve oyuncu değeri:** Parçaya yaratıcı ekip seçimi ekler; ücret, müsaitlik, tür uyumu ve ekip kimyası kaliteyi, zamanı ve maliyeti farklı biçimde etkiler.
- **Bağlantı:** kariyer, üretim verileri, ekonomi, ilişkiler. **Zorluk:** Orta.
- **Güvenli ekleme:** Yaratıcı profilleri ve parça kredilerini ayrı veride sakla; mevcut kalite hesabını değiştirmek yerine küçük, sınırlandırılmış katkı noktaları ekle.
- **Kabul ölçütü:** Oyuncu ekip/ücret/uyum bilgisini kayıt öncesi görür; ekip seçilmemiş eski parça bugünkü kalite hesabıyla açılır.

### 05. İlk aydan sonraki kariyer basamakları
- **İşlev ve oyuncu değeri:** İlk yayınlardan sonra yerel çıkış, istikrarlı dinleyici kitlesi, ulusal tanınma, ana sahne veya şirket kuruculuğu gibi ölçülebilir hedefler açar.
- **Bağlantı:** journey, career, goals. **Zorluk:** Kolay–orta.
- **Güvenli ekleme:** Mevcut hedefleri silmeden yeni kilometre taşları ve koşullu açılımlar ekle; geçmiş başarıları başlangıçta doğrula.
- **Kabul ölçütü:** Yeni oyuncu hedeflere sırayla ilerler; ileri kariyerdeki eski kayıtlar başlangıç aşamasına zorla döndürülmez.

### 06. Sözleşme koşullarını karşılaştırma ekranı
- **İşlev ve oyuncu değeri:** Avans, geri ödeme, master hakları, gelir payı, süre, opsiyon ve çıkış bedelini teklif öncesi gösterir; oyuncu kısa vadeli nakitle uzun vadeli kontrolü kıyaslar.
- **Bağlantı:** label, katalog, ekonomi, kariyer. **Zorluk:** Orta.
- **Güvenli ekleme:** Koşulları yeni anlaşmalarda ayrı alanlarda tut; eski anlaşmalara bugünkü kayıtla uyumlu varsayılanlar ata.
- **Kabul ölçütü:** Teklif ekranındaki örnek hesap gerçek ödeme hesabıyla aynı sonucu verir; kayıt/yeniden yüklemede koşullar değişmez; eski sözleşmeler geçerli kalır.

### 07. Fırsat ve görüşme gelen kutusu
- **İşlev ve oyuncu değeri:** Mesaj, arama, iş teklifi ve görüşmeleri son tarihleriyle tek merkezde toplar; oyuncu yanıtı geciktirebilir, hazırlık yapabilir veya kibarca reddedebilir.
- **Bağlantı:** relations, dms, calls, npcMind. **Zorluk:** Orta.
- **Güvenli ekleme:** Yeni bir gelen kutusu görünümü kur ve mevcut karar işleyicilerine bağla; mesajlaşma/arama mantığını kopyalayıp ikinci bir sürüm oluşturma.
- **Kabul ölçütü:** Her teklif tek bir etkin karara gider; son tarih davranışı nettir; gelen kutusu mevcut telefon gezinmesini kesintiye uğratmaz.

### 08. Ortak şarkı anlaşması ve split sheet
- **İşlev ve oyuncu değeri:** Feature ve ortak projelerde yazar, prodüktör ve icracı kredilerini; gelir payı ve tanıtım sorumluluğunu anlaşma öncesinde belirler.
- **Bağlantı:** relations, career, katalog, ekonomi. **Zorluk:** Orta.
- **Güvenli ekleme:** Payları yalnızca yeni ortak kayıtlarda sakla; eski iş birliklerine mevcut gelir sahipliğini koruyan varsayılan uygula.
- **Kabul ölçütü:** Payların toplamı %100'dür veya açıkça tanımlı hak türlerine ayrılır; gelir raporu aynı split'i kullanır; anlaşmasız eski eser etkilenmez.

### 09. Stüdyo kayıt oturumu akışı
- **İşlev ve oyuncu değeri:** Hazırlık, kayıt take'i seçimi, miks ve mastering kararları ekler; ekipman, konfor, zaman ve yorgunluk arasında anlamlı seçim sunar.
- **Bağlantı:** studioroom, roomGL, career, team. **Zorluk:** Orta.
- **Güvenli ekleme:** Oturum sonucunu mevcut parça üretim akışına ekle; mevcut oda/ekipman bonusları tek kaynaktan hesaplanmaya devam etsin.
- **Kabul ölçütü:** Her aşama sonucu açıklanır; kalite/konfor etkisi iki kez uygulanmaz; oturum başlatmayan eski kayıt bugünkü üretim akışını kullanır.

### 10. Katalog için uzun vadeli yayın takvimi
- **İşlev ve oyuncu değeri:** Parçanın ilgi eğrisi, yıl dönümü, remaster ve yeniden tanıtım fırsatlarını planlar; eski katalog sessiz gelir kaleminden yönetilebilir bir varlığa dönüşür.
- **Bağlantı:** catalog, reissue, ekonomi, haber akışı. **Zorluk:** Orta.
- **Güvenli ekleme:** Mevcut yeniden yayın mekaniğini koruyup yanına katalog yaşı ve kampanya takvimi ekle.
- **Kabul ölçütü:** Yeniden yayın özgün eseri çoğaltıp çift gelir üretmez; takvim ve hak uygunluğu oyuncuya işlem öncesi gösterilir.

## Orta vade

### 11. Yeni müzik radarı ve A&R gözlem süreci
- **İşlev ve oyuncu değeri:** Yeni müzik verilerinden tür/bölge uyumlu yükselen eserleri ve sanatçıları önerir; gözlem raporunun belirsizliği, oyuncunun kimi keşfedeceğini stratejik hâle getirir.
- **Bağlantı:** güncellenen müzik verileri, label adayları, industry. **Zorluk:** Orta.
- **Güvenli ekleme:** Mevcut veri yenileme çıktısını salt okunur kaynak olarak kullan; keşif önerilerini ayrı modülde üret, tarayıcıdan dış servislere bağlanma.
- **Kabul ölçütü:** Her önerinin kaynağı ve güncelliği görünür; veri yenilemesi başarısızsa son geçerli snapshot kullanılır; aynı sanatçı aynı raporda yinelenmez.

### 12. Sanatçı gelişim planı
- **İşlev ve oyuncu değeri:** Canlı performans, medya, stüdyo ve dinlenme planlarını seçtirir; gelişim hızı yorgunluk ve fırsat maliyetiyle dengelenir.
- **Bağlantı:** career, skills, mental, team. **Zorluk:** Orta.
- **Güvenli ekleme:** Planı oyuncu alt durumunda sakla ve mevcut beceri/mental sistemlerine sınırlı etki ver; mevcut eğitim sonuçlarını değiştirme.
- **Kabul ölçütü:** Planların zaman ve maliyeti önceden görünür; dinlenme seçeneği cezalandırıcı değildir; eski kayıtlar plansız olarak normal çalışır.

### 13. Rakip yayın takvimi ve çıkış çakışmaları
- **İşlev ve oyuncu değeri:** Rakip sanatçıların tahmini yayın haftalarını ve piyasa yoğunluğunu gösterir; tarihi değiştirmek, doğrudan yarışmak veya alternatif tanıtım yapmak taktik kararı olur.
- **Bağlantı:** industry, rollout, listeler, haberler. **Zorluk:** Orta.
- **Güvenli ekleme:** Rakip takvimini oyuncu yayınından ayrı simüle et; rekabet etkisini sınırlı ve açıklanabilir liste girdisi olarak bağla.
- **Kabul ölçütü:** Çakışma yalnızca ilgili dönem/türde etki eder; takvim değiştirildiğinde oyuncunun önceki yayın geçmişi değişmez.

### 14. Turne lojistiği ve şehir rotaları
- **İşlev ve oyuncu değeri:** Şehir sırası, yol/konaklama gideri, ekip yorgunluğu ve yerel talebi planlatır; yüksek brüt gelirli ama kötü rotalı turne zarar edebilir.
- **Bağlantı:** concerts, festivals, ekonomi, mental, şehir bazlı fanlar. **Zorluk:** Zor.
- **Güvenli ekleme:** Tek konser akışını koru; çok duraklı turneyi ayrı bir rota nesnesi ve hesaplayıcıyla ekle.
- **Kabul ölçütü:** Her durak tahmini gelir/gider/yorgunluk gösterir; iptal ve yeniden planlama maliyeti bellidir; mevcut tek konser kayıtları aynı çalışır.

### 15. Radyo ve editoryal liste sunumları
- **İşlev ve oyuncu değeri:** Oyuncu uygun parçayı uygun editöre/radyo programına zamanında sunar; yanıt eser uyumu, kampanya ve ilişkilerle şekillenir.
- **Bağlantı:** editorial, playlists, press, rollout. **Zorluk:** Orta.
- **Güvenli ekleme:** Sunumları ayrı bir pitch kuyruğunda tut; mevcut playlist ve liste sonuçlarını yeni kaynakla destekle, değiştirme.
- **Kabul ölçütü:** Sunum penceresi ve kriterleri görünür; sonuçlar kayıtlıdır; aynı esere aynı pencere içinde tekrar sunum engellenir.

### 16. Sosyal medya içerik takvimi
- **İşlev ve oyuncu değeri:** Kısa video, hikâye, canlı yayın ve müzik klibi formatlarını tarihe ve platforma göre planlar; tekrar ve aşırı paylaşım doygunluk yaratabilir.
- **Bağlantı:** Instagram, TikTok, YouTube, X uygulamaları; sosyal ve rollout. **Zorluk:** Orta.
- **Güvenli ekleme:** Ortak bir takvim modülü ekle; mevcut uygulama ekranları kendi görünümünü koruyup planlanan içeriği gösterir.
- **Kabul ölçütü:** İçerik tek kez planlanır; platform etkisi raporda görünür; planlanmış içerik çevrimdışı kayıtla korunur.

### 17. Şirket departmanlarına gerçek iş akışları
- **İşlev ve oyuncu değeri:** A&R, PR, finans ve yayın departmanlarına görev atama/delegasyon ekler; şirket büyüdükçe oyuncu her işi elle yapmak zorunda kalmaz.
- **Bağlantı:** label departmanları, team, ekonomi, kariyer. **Zorluk:** Orta.
- **Güvenli ekleme:** Mevcut departman yükseltmesi ve kişisel ekip işe alımının üstüne görev katmanı ekle; ikinci bir işe alım/maaş sistemi yaratma.
- **Kabul ölçütü:** Delegasyonun kapsamı, maliyeti ve başarısızlık riski görünür; oyuncu kritik kararları devretmemeyi seçebilir.

### 18. Liste ve ödül sonuçlarının açıklanabilirliği
- **İşlev ve oyuncu değeri:** Sıralama ve adaylığın dinlenme, satış, eleştiri, canlı performans ve kültürel etki paylarını açıklar; oyuncu sonucu teşhis edebilir.
- **Bağlantı:** charts, awards, press, industry. **Zorluk:** Orta.
- **Güvenli ekleme:** Mevcut puanlamayı değiştirmeden katkı kalemlerini raporla; yeni kriterleri ayrı, test edilebilir hesaplayıcılarda dene.
- **Kabul ölçütü:** Açıklanan etkenler gerçek hesapla aynı sıralamayı üretir; eski listeler yeniden hesaplanıp geçmişi değiştirmez.

### 19. Sanatçı transfer ve sözleşme yenileme piyasası
- **İşlev ve oyuncu değeri:** Sözleşme bitişi, rakip teklifler, karşı teklifler ve ayrılma kararlarıyla sanatçı kadrosu rekabetçi hâle gelir.
- **Bağlantı:** label, industry, relations, sözleşme koşulları (6) ve A&R radarı (11). **Zorluk:** Zor.
- **Güvenli ekleme:** Transferi yalnızca sözleşme/yenileme olayı olarak çalıştır; oyuncu veya NPC kadrosunu sessizce değiştirme.
- **Kabul ölçütü:** Teklif, karşı teklif, süre ve haklar kayda geçer; reddetme/ayrılma sonuçları tutarlıdır; mevcut kadro yükleme sırasında değişmez.

### 20. Bölge bazlı uluslararası açılım
- **İşlev ve oyuncu değeri:** Yeni pazara girişte dil, yerel dağıtım, tanıtım bütçesi, bölgesel dinleyici ve konser talebi arasında seçim yaptırır.
- **Bağlantı:** intl, ekonomi, dağıtım, konserler, platform verileri. **Zorluk:** Zor.
- **Güvenli ekleme:** Bölge kayıtlarını aşamalı ekle; mevcut küresel değerleri varsayılan say ve bölgesel veri eksikliğinde eski davranışa dön.
- **Kabul ölçütü:** Bölge maliyeti ve potansiyel getirisi işlem öncesi gösterilir; aynı dinleyici geliri hem global hem bölgesel toplamda iki kez sayılmaz.

### 21. Yayıncılık ve müzik hakları yönetimi
- **İşlev ve oyuncu değeri:** Master, beste, söz, komşu hak ve senkronizasyon gelirlerini ayırır; lisans veya katalog teklifi kontrol ve gelecekteki gelir karşılaştırmasına dönüşür.
- **Bağlantı:** catalog, reissue, economy, lyrics ve ortak proje payları. **Zorluk:** Zor.
- **Güvenli ekleme:** Hakları parça bazında yeni kayıt alanlarında tut; eski parçaları mevcut sahiplik varsayılanlarıyla aç.
- **Kabul ölçütü:** Her gelir kalemi tek hak sahibine/kurala göre dağıtılır; aynı lisans tekrar satılmaz; eski eserlerin gelir toplamı geriye dönük değişmez.

### 22. Sponsor ve marka kampanyası performansı
- **İşlev ve oyuncu değeri:** Teslim edilecek içerik, erişim hedefi, münhasırlık ve itibar riskini sponsorluk teklifine ekler; oyuncu yalnızca peşin parayı değil kariyer uyumunu değerlendirir.
- **Bağlantı:** sponsor, sosyal uygulamalar, ekonomi, itibar. **Zorluk:** Orta.
- **Güvenli ekleme:** Yeni kampanyalara teslimat koşulları ekle; mevcut sponsorluk ödemelerini ve sonuçlarını değiştirme.
- **Kabul ölçütü:** Kampanya yükümlülükleri takip edilir; ihlal ve başarı sonucu açıklanır; aynı teslimat iki kez sayılmaz.

## Uzun vade

### 23. Şirket merkezi ve tam işletme yönetimi
- **İşlev ve oyuncu değeri:** Ofis kapasitesi, departman bütçesi, maaş yükü, ekip verimliliği ve delegasyonla şirketi tam bir işletmeye dönüştürür.
- **Bağlantı:** label, team, ekonomi, katalog, sözleşmeler. **Zorluk:** Zor.
- **Güvenli ekleme:** Şirket merkezini ayrı bir yönetim katmanı olarak kur; mevcut şirket kurma ve departman yükseltme akışını koru.
- **Kabul ölçütü:** Aylık bütçe, maaş ve bakım maliyetleri önizlenir; iflas/borç sonuçları test edilir; şirketi olmayan kariyerler bu ekranı gerektirmez.

### 24. İsteğe bağlı üretken yapay zekâ karakterleri
- **İşlev ve oyuncu değeri:** Önemli diyaloglarda karakterin geçmişi ve mizacına bağlı çeşitli yanıtlar üretir; mevcut karakter hafızasını daha doğal konuşmaya taşır.
- **Bağlantı:** npcMind, relations, chat. **Zorluk:** Zor.
- **Güvenli ekleme:** Ayrı sunucu uç noktası, açık opt-in, içerik sınırları ve mevcut metin havuzlarına çevrimdışı geri dönüş şarttır; anahtarlar istemciye gönderilmez.
- **Kabul ölçütü:** Ağ kapalıyken oyun çalışır; gizli anahtar istemci kodunda/logda bulunmaz; oluşturulan metin kayıtlı karakter sınırlarını ve kullanıcı güvenliğini aşmaz.

### 25. Asenkron çok oyunculu müzik ekosistemi
- **İşlev ve oyuncu değeri:** Ortak haftalık listeler, iş birlikleri ve festival etkinlikleriyle gerçek oyuncular arasında sosyal rekabet kurar; aynı anda çevrimiçi olmayı gerektirmez.
- **Bağlantı:** industry, charts, festivals, collaborations. **Zorluk:** Zor.
- **Güvenli ekleme:** Tek oyunculu kayıtları izole eden ayrı bir sezon/çevrimiçi katmanı kur; doğrulanmamış istemci verisini rekabet sonuçlarına doğrudan kabul etme.
- **Kabul ölçütü:** Tek oyunculu mod hesap veya ağ olmadan çalışır; çevrimiçi sonuçlar tekrar üretilebilir ve kötüye kullanıma karşı doğrulanır.

### 26. Bulut kayıt ve cihazlar arası eşitleme
- **İşlev ve oyuncu değeri:** İsteğe bağlı yedekleme, cihazlar arası devam etme ve kayıt kurtarma sağlar.
- **Bağlantı:** state, ayarlar/kayıt ekranı, çevrimdışı çalışma; mobil ve çok oyunculu altyapı. **Zorluk:** Zor.
- **Güvenli ekleme:** Yerel kayıt ve dışa aktarma kalıcı çalışmaya devam etsin; eşitleme ayrı servis olsun ve çakışmada kullanıcıya seçim sunsun.
- **Kabul ölçütü:** Çevrimdışı değişiklik kaybolmaz; çakışma açıkça çözülür; kullanıcı bulut eşitlemeyi kapatabilir ve yerel yedeğini indirebilir.

### 27. Yerel mobil istemci / mobil eşlikçi
- **İşlev ve oyuncu değeri:** Telefon ekranını uygulama bildirimleri ve cihaz özellikleriyle doğal kullanıma taşır; ana kariyerle aynı ilerlemeyi paylaşabilir.
- **Bağlantı:** telefon uygulamaları, kayıt sistemi, bulut eşitleme (26). **Zorluk:** Zor.
- **Güvenli ekleme:** Mevcut web oyununun yerine geçmek yerine ayrı istemci olarak tasarla; önce kayıt/API sözleşmesini sabitle.
- **Kabul ölçütü:** Web istemcisi değişmeden çalışır; mobil ilerleme eşitlenir; desteklenmeyen cihaz özelliği için web/çevrimdışı geri dönüş bulunur.

### 28. Kalıcı piyasa ekonomisi ve sektör döngüleri
- **İşlev ve oyuncu değeri:** Tür talebi, platform ödeme politikası, reklam piyasası ve bölgesel büyüme yıllar içinde değişir; oyuncu şirketini uzun dönemli piyasa koşullarına göre konumlandırır.
- **Bağlantı:** economy, industry, intl, charts, label. **Zorluk:** Zor.
- **Güvenli ekleme:** Makro değerleri aylık güncellenen ayrı modelde tut; tekil haber olaylarından (2) ayrı ve daha yavaş çalıştır.
- **Kabul ölçütü:** Aynı seed/kayıt aynı koşullarda aynı sonucu verir; etkiler oyuncuya açıklanır; uzun dönem simülasyonunda para/stream değerleri sınır dışına kaçmaz.

### 29. Özel senaryo ve kariyer başlangıcı oluşturucu
- **İşlev ve oyuncu değeri:** Başlangıç bütçesi, şehir, tür, zorluk ve kariyer koşullarıyla yeni oyun senaryoları oluşturup tekrar oynanabilirliği artırır.
- **Bağlantı:** başlangıç state'i, sanatçı/şirket verileri, goals, kayıt sistemi. **Zorluk:** Orta–zor.
- **Güvenli ekleme:** Yalnızca şema doğrulamalı veri dosyalarını içe aktar; kullanıcı girdisini çalıştırılabilir JavaScript olarak yükleme.
- **Kabul ölçütü:** Hatalı senaryo güvenli biçimde reddedilir; geçerli senaryo dışa/içe aktarılır; varsayılan başlangıç ve mevcut kayıtlar etkilenmez.

### 30. Kariyer mirası ve devam oyunu
- **İşlev ve oyuncu değeri:** Emeklilik, mentorluk, katalog devri veya şirket yönetimine geçiş sunar; önceki kariyer kararları yeni kuşağın başlangıcını etkiler.
- **Bağlantı:** career, katalog/haklar, label, relations, uzun dönem state'i. **Zorluk:** Zor.
- **Güvenli ekleme:** Mevcut kariyeri sıfırlamadan ayrı bir miras aşaması kur; yeni nesil kaydını eski kariyerden ayrıştır.
- **Kabul ölçütü:** Oyuncu devam etmeyi veya emekli olmayı seçer; devredilen haklar/varlıklar raporlanır; eski kariyer arşivi değiştirilemez ve yeniden açılabilir.

## Genel kabul ve yayın kapısı

Her özellik PR'ı şu maddeleri karşılamalıdır:

1. Eski kayıt açılır; yeni alanlar güvenli varsayılan alır.
2. İlgili işlev için dar kapsamlı bir smoke/regresyon senaryosu eklenir.
3. İlgili mevcut menü ve telefon akışı korunur; yeni UI görsel dil ve mobil kırılımlarla uyumludur.
4. Oyun içi toplamlar (para, dinleyici, pay, hak, takvim) tek kez ve açıklanabilir biçimde hesaplanır.
5. Kaynak değişikliği build/doğrulama zincirinden geçer; üretilmiş tek dosya kaynaklarla eşleşir.
6. Çevrimiçi özellik başarısız olduğunda tek oyunculu/çevrimdışı temel oyun çalışır.

**Bu PR'ın kapsamı yalnızca bu planlama belgesidir.** Oyun kodu, menüler, tasarım, kayıt şeması ve build çıktısı değişmez; özellikler ayrı, küçük PR'lar hâlinde uygulanmalıdır.
