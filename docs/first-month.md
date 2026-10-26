# İlk ay: kararlar, ilişkiler ve tutarlı ekonomi

## Oyuncu akışı

Kariyer ekranındaki **Kariyerindeki ilk ay** kartı üç kalıcı hedef gösterir:
ilk yayın, 50 aylık dinleyici ve müzikten ilk 1.000 ₺ gelir. Başarım/yan iş
ödülleri müzik geliri hedefini doldurmaz. Tamamlanan hedef geriye düşmez.

Fırsatlar mevcut oyun durumuna bağlıdır:

1. **İlk çevren:** semt prodüktörüyle buluş veya evde prova yap.
2. **Son dinleme:** hazırlık aşamasındaki gerçek projeyi birlikte düzenle
   veya tek başına prova et. Kalite artışı o projenin parçalarına uygulanır.
3. **Küçük sahne:** şarkın yayınlanınca yerel açık mikrofon setini kabul et
   veya evden tanıtım hazırla. Sahne 1.500 ₺ sabit ücret, 400 ₺ ulaşım;
   tanıtım etkisi mevcut günlük dinlenme motorunda zamanla söner.
4. **Geri dönüş:** ilk dinleyicinle sohbet et veya yeni kayıt için çalış.
   Sahneye çıktıysan aynı hayran mesajında bunu hatırlar.

Her fırsatta ücretsiz bir yol ve cezasız pas geçme seçeneği vardır. Karar
verilmeyen fırsat beş gün sonra (en geç 30. gün sonunda) kapanır. İki fırsat
arasında en az iki gün bulunur. Kabul edilen planın tarihi takvimde görünür;
30. gün verilmiş bir söz sonraki günlerde de tamamlanır. Randevuyu iptal etmek
ödenen masrafın yarısını geri verir; başka bir kişiye verilen söz tutulmazsa
ilişki etkilenir. Proje kaldırılması veya sonradan oluşan sahne çakışması gibi
sistem iptallerinde ücretin tamamı geri verilir.

Mesajlar mevcut semt prodüktörü, DJ ve hayran kayıtlarına gider. İlişki değişimi
mevcut zorluk çarpanlarına tabidir. Olaylar ve sonuçları kariyer günlüğünde
saklanır. Bir karar tekrar uygulanamaz; ödeme ve kalite artışı bir kez yapılır.

## Kayıt uyumluluğu

İlk 30 gündeki eski kayıtlar akışa katılır. Daha ileri eski kariyerlere başlangıç
hikâyesi eklenmez. Yeni kayıtların randevuları, kararları, geçmişi ve hedefleri
normal kayıt/slot sistemiyle saklanır. İlk ay sonunda normal kariyer devam eder.

## Ekonomi ve haklar

- Konserin ön ödemeden kalan maliyeti etkinlik günü tahsil edilir. Kasa yetmezse
  eksik kısım mevcut borç sistemine yazılır. Tamamlanan konser tekrar tahsil edilmez.
- Telif hesabı pazarlıkta kaydedilen şirket oranını kullanır; %0 geçerli bir orandır.
- Sözleşme süresi sonunda oyuncu yeni işler için bağımsızlaşır. Önceki yayın ve
  teslimlerin şirket hakları korunur. Avans geri ödemesi ilgili sözleşmenin
  yayın gelirlerinden yapılır; eski sözleşme geliri yeni sözleşmenin avansını kapatmaz.
- Eski kayıtların hak alanı olmayan yayınları sözleşme bitiminde mevcut şartlarla
  işaretlenir. Geçmişte imzadan önce yapılmış yayınların özgün şartlarını eski
  kayıt verisinden yeniden kurmak mümkün değildir; mevcut hesaplama korunur.
- Özel sync lisanslı şarkılar yeni teklif havuzuna girmez. Bekleyen bir teklif
  kabul edilirken şarkının hakları tekrar kontrol edilir.

## Doğrulama

`node tools/smoke-journey.js` davranış senaryolarını çalıştırır; `npm run verify`
aynı süiti diğer regresyonlar, build/cache bütünlüğü ve denge simülasyonuyla birlikte çalıştırır.
