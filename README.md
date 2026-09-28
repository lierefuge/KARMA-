# KARMA Music Game — Music Industry Simulator

Türk müzik endüstrisi simülasyonu. Sanatçı kariyerinden şirket (label) yönetimine
ve sosyal medya etkileşimlerine kadar ilerleyen kapsamlı bir oyun.

---

## GÜNCELLEME v10.6 — Sosyal medya + her sanatçının PP'si + tam diskografi (bu sürüm)

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
