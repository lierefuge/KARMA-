# Tek dosya build — güvenli üretim yolu

## Sorun

Depoda `KARMA-Oyun.html` (tek dosya build, ~2,6 MB) tutuluyor ve
`tools/verify.js` bu dosyanın `js/` + `css/` kaynaklarıyla **bayt bayt aynı**
olmasını şart koşuyor. Bu kontrol kasıtlı: "kodu değiştirdim, build'i
unutttum" hatasını yapısal olarak imkânsız kılıyor. **Kontrol asla atlanmaz.**

Sıkıntı şu: build 2,6 MB olduğu için onu API / entegrasyon gibi yazma
yollarıyla göndermek mümkün olmuyor (1 MiB sınırı). Kontrolü gevşetmek
yanlış çözüm olurdu; doğru çözüm build'i **GitHub'ın kendisinde** üretmek.

## Çözüm

`.github/workflows/build-artifact.yml` iş akışı:

1. `node tools/bump-cache.js` → önbellek damgası
2. `node tools/build-single.js` → tek dosya build
3. `node tools/gen-version-json.js` → güncelleme noktası
4. **`npm run verify`** → commit'ten ÖNCE tam doğrulama (50 adım)
5. Yalnızca doğrulama geçtiyse ve gerçekten fark varsa `git commit` + `git push`

Doğrulama düşerse hiçbir şey commit edilmez: depo bozulmaz, iş akışı
kırmızı olur ve nedeni logda görünür.

## Kurulum (tek seferlik)

GitHub uygulamasının `.github/workflows/` altına yazma izni yok, o yüzden
iş akışı depoya `.github/build-artifact.staged.yml` olarak kondu.
Etkinleştirmek için GitHub arayüzünde **adını değiştir**:

1. `.github/build-artifact.staged.yml` dosyasını aç
2. Kalem (Edit) → dosya adı alanına `.github/workflows/build-artifact.yml` yaz
3. **Commit changes** → `main`

Alternatif: GitHub uygulamasına *Workflows: Read and write* izni verilirse
dosya doğrudan `.github/workflows/` altına konabilir.

## Kullanım

Actions → **"Tek dosya build uret"** → Run workflow (main).

Ya da API ile:

```
createWorkflowDispatch({ repoFullname: "lierefuge/KARMA-",
                         workflowId: "build-artifact.yml", ref: "main" })
```

Build zaten güncelse iş akışı "commit gerekmedi" diyip başarıyla biter.

## Doğrulama (yerelde test edildi)

Eski build geri konup aynı sıra çalıştırıldı:

```
eski build           2.704.118 bayt
→ bump + build + version.json
yeni build           2.730.872 bayt
→ npm run verify     50/50 adım geçti · HER ŞEY TEMİZ
```

Yani yöntem, bayat bir build'i doğrulanmış biçimde yerine koyuyor;
kontrolün kendisi hiç değişmiyor.

## Canlı doğrulama (2026-10-23)

| Adım | Sonuç |
|---|---|
| Manüel `workflow_dispatch` (main, `21869628`) | ✅ success · 00:16 → 00:24 |
| Otomatik `Doğrulama` (aynı saniyeler, `event: workflow_dispatch`) | ✅ tetiklendi · sonuç success |
| Workflow permissions | ✅ Read and write (dispatch 403 almadan çalıştı) |

## Tekrarlı çalıştırmada boş commit (düzeltildi)

İlk çalıştırmalar `version.json` içindeki `built` damgası yüzünden boş commit
atıyordu (`d31aa3c2`, +1/−1). `tools/gen-version-json.js` artık `built`
değerini yalnızca **sürüm / önbellek / tarih değiştiğinde** yeniliyor:

```
aynı sürüm  → 2. ve 3. çalıştırma: dosya DEĞİŞMEDİ
sürüm 10.63.1 → built yenilendi
```

Sonuç: build güncelse iş akışı **"commit gerekmedi"** deyip biter, yalnızca
Doğrulama'yı tetikler.
