# Günlük müzik güncellemesi

## Çalışma ve veri sözleşmesi

- `.github/workflows/daily-refresh.yml`: `0 21 * * *` UTC, Türkiye'de ertesi gün 00.00. GitHub Actions kuyruğu gecikebilir; kesin dakika garantisi yoktur. Zamanlanmış çalışma varsayılan dalın birleştirilmiş sürümünü kullanır.
- Manuel `workflow_dispatch`: güvenli varsayılan `dry_run=true`. Bu mod iTunes'a bağlanır, Gemini API'sini çağırmaz ve hiçbir dosya/commit/build tetiklemesi üretmez. Gerçek güncelleme için `dry_run=false` seçilir; seçilen dal kullanılır.
- Yeni çıkışlar mevcut kadro ve iTunes `country=TR` albüm→parça sorgusundan gelir. Türkiye kataloğunun tamamını keşfetmez; kadro, 30 günlük pencere ve sanatçı başına 6 kayıt sınırı korunur. Kayıt anahtarı hâlâ `<artistId>::<normalize title>` olduğundan aynı adlı farklı versiyonlar tek kayıtta birleşebilir.
- `js/data/release-intel.js` ve mevcut `intel` şeması korunur. Oyun, editoryal listeler, haber ve ses önizleme tüketicileri değişmez. `intel` ve `preview` null olabilir; oyun mevcut çevrimdışı/kural tabanlı davranışını sürdürür.
- Sanatçı kimliği için tam sahne adı veya tanımlı takma ad aranır. İlk arama sonucuna veya kısmi ad benzerliğine güvenilmez. Konuk kredileri ilk sanatçı adı üzerinden elenir; kaynak ad biçimi farklıysa kayıt atlanabilir.
- Bozuk yerel veri üzerine yazılmaz. Boş/bozuk/kesilmiş katalog yanıtında ilgili sanatçının önceki kayıtları korunur. Süresi dolan kayıtlar yalnızca başarılı taranan sanatçılarda temizlenir; tüm sonucu boşaltacak yazım reddedilir. Oyun eski kayıtları mevcut yaş filtresiyle eler.
- Tekrarlanan kayıtlar limitten önce elenir; zenginleştirmeler korunur. İki yeni veri aracı doğrulama sonrası aynı dizindeki geçici dosyayı atomik yeniden adlandırır.

## Gemini

GitHub repository **Settings → Secrets and variables → Actions** altında `GEMINI_API_KEY` gerekir. Yalnızca AI adımının ortamına aktarılır; tarayıcıya, kaynaklara, URL'ye veya hata gövdesi loglarına konmaz. API isteği `x-goog-api-key` başlığını kullanır.

Varsayılan `gemini-3.5-flash` korunmuştur. 2026-10-26 tarihinde [Google model yaşam döngüsü belgesi](https://ai.google.dev/gemini-api/docs/deprecations), bu uç noktanın kapanmadığını ve istekleri `gemini-3.6-flash` modeline yönlendirdiğini bildiriyor. [Model listesi](https://ai.google.dev/gemini-api/docs/models) ile kontrol edildi. `--model` ile değiştirilebilir. Bu belge kontrolü, hesabın gerçek API erişiminin/kotasının doğrulanması değildir.

AI yalnızca katalog kaydının etiketlerini tahmin eder; şarkı/sanatçı/tarih alanlarını yazamaz. Ses dosyası gönderilmediğinden tempo/enerji akustik ölçüm değildir. Prompt v1 cache'i, 6'lı batch (en fazla 8), istek arası 12 saniye, 429/5xx için sınırlı tekrar korunur. Günlük koşuda en fazla 48 eksik kayıt işlenir. Kota/model hataları eski intel'i korur; kalan kayıtlar sonraki çalışmaya kalır. Başarılı kayıtlar kısmi hatada saklanır ve araç hata çıkışı döndürür. Eksik/yinelenen model indekslerinde sıraya göre tahmin yapılmaz.

## Diğer kaynaklar ve yayın zinciri

Önceki günlük diskografi komutu zorunlu sanatçı parametreleri olmadan çağrıldığı için çalışmıyordu. `tools/refresh-discographies.js` mevcut tek-sanatçı aracını kadro ve kayıtlı iTunes kimlikleriyle çağırır. Sanatçı bazında hata/zaman aşımı/bozuk çıktı durumunda üç dosyayı geri yükler. Günlük yenileme mevcut şarkı, albüm ve kullanılabilir önizlemeleri birleştirerek korur; kaynakta bugün görünmeyen kayıtları silmez. Ana katalogda yeni bir şarkı ancak geçerli ses önizlemesi, sayfa bağlantısı ve mevcut doğrulanmış YouTube eşleşmesi birlikte varsa eklenir. Hazır olmayan yeni kayıtlar ertelenir ve sayıları loglanır; `RELEASE_INTEL` yeni çıkış akışı bu şarttan bağımsız sürer. Bu sınır mevcut %100 önizleme, karşılıksız video olmaması ve %70 YouTube kapsamı kapılarını korur. `Wegh` gibi kadroda tanımlı takma adlar sahiplik kontrolünde kabul edilir. Yalnızca yorumdaki tarih değişmişse dosya korunur. Mevcut YouTube komutu da sürer.

Günlük ve build iş akışları `content-update-${github.ref}` kilidini paylaşır; çalışan koşu iptal edilmez. Fark yoksa commit yoktur. Fark varsa build/cache/version üretilir ve **tam `npm run verify` geçmeden push yapılmaz**. Veri ve ona bağlı build tek commit'tedir; böylece doğrulanan byte-eşitliği ve çevrimdışı paket tutarlılığı korunur.

İzin verilen yazımlar: `release-intel.js`, `real-youtube.js`, `real-songs.js`, `discography.js`, `real-previews.js` (hepsi `js/data/` altında); gerekli üretilmiş çıktılar `index.html`, `sw.js`, `KARMA-Oyun.html`, `version.json`. Geniş `git add -A`/`git add js/data` yoktur. Uzak dal ilerlemişse doğrulanmamış rebase veya force-push yapılmaz; koşu başarısız olur ve yeniden çalıştırılmalıdır.

Günlük koşu → build-artifact → tests zinciri korunur. Botun açık `workflow_dispatch` çağrısı kabul edilir; build ve test aynı seçilen dalı kullanır. Token push'u kendiliğinden yeni koşu üretmez; tests geri çağrı yapmaz. API adımları birbirini durdurmaz.

### Başarısızlık siyaseti (v10.71.0)

İki tür başarısızlık ayrılır:

- **Zorunlu adımlar** — veri farkı kontrolü, build + tam doğrulama, commit + push. Bunlardan biri düşerse iş akışı **kırmızıdır** ve `::error` ile adı yazılır; doğrulanmamış veri commit edilmez.
- **Dış kaynaklar** — iTunes yeni çıkışlar, Gemini, YouTube, diskografi. Bunlar `continue-on-error` ile koşar; düşen kaynak **`::warning` ile adıyla** raporlanır ve iş akışı **yeşil kalır**, çünkü korunmuş veri ve başarılı güncellemeler kullanılmaya devam eder.

Eskiden herhangi bir dış kaynak hatası iş akışını kırmızıya çeviriyordu, iş yine de commit atıyordu. Sonuç her gün kırmızı bir rozet ve gerçek regresyonun görünmez olmasıydı. Artık kırmızı yalnızca gerçekten müdahale gerektiren durumda yanar.

`GEMINI_API_KEY` tanımlı değilse AI adımı hiç koşmaz; anahtar kontrol adımı bir kez `::warning` verir ve diğer kaynaklar etkilenmez. Özet tablosu her adımın durumunu ve zorunlu olup olmadığını `$GITHUB_STEP_SUMMARY` içinde gösterir. Gerekli Actions izinleri `contents: write` ve `actions: write`; dal korumaları aşılmaz.

## Testler

```sh
npm ci
node tools/smoke-music-refresh.js
node tools/smoke-v1067.js
node tools/fetch-new-releases.js --dry --only sehinsah
node tools/ai-enrich.js --dry --force --limit 2
npm run verify
npm test
```

Yeni testler izole geçici dizinde sentetik sağlayıcı yanıtları kullanır; gerçek dosya ve sırları değiştirmez. Katalog/AI bozuk JSON, boş yanıt, 429, 404, indeks karışması, duplicate/konuk sahipliği, cache, limit ve kısmi hata kapsanır. Günlük katalog birleştirmesi eksik kaynak şarkısı/önizlemesini koruma, doğrulanmamış genişlemeyi erteleme, geçerli medya ile ekleme, tekrar koşuda yazmama ve kadro takma adı senaryolarıyla sınanır. YAML gerçek parser ile doğrulanır. v10.67'deki gerçek katalog şeması/sahiplik denetimleri korunur; tarihe ve bütün kayıtların AI/önizleme taşımasına bağlı davranış testleri sentetik katalogla çalışır. Böylece desteklenen `intel:null` veya `preview:null` geçerli bir güncellemeyi engellemez.
