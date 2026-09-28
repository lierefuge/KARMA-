# KARMA — Studio Bileşen Kılavuzu

Telefon uygulamalarındaki analitik panelleri için ortak kart / bar / yorum
bileşenleri. **Tek renk kaynağı** ve **tek yapı kaynağı** vardır; yeni bir
panel eklerken sadece sınıfları ve `K.studio` yardımcılarını kullan.

| Dosya | Rolü |
|---|---|
| `css/studio-theme.css` | **Sadece renk token'ları** (koyu + açık tema) |
| `css/studio.css` | **Yapı/layout** (kart, bar, satır, responsive) |
| `js/ui/studio.js` | **Ortak JS bileşenleri** (`K.studio`) |

Kullanan paneller: `apps/youtube.js` (YouTube Studio) · `apps/artistapps.js`
(Spotify for Artists) · `apps/tiktok.js` (Creator Studio).

---

## 1) Renk token'ları (`studio-theme.css`)

Renkleri asla doğrudan yazma — token kullan.

| Token | Anlam |
|---|---|
| `--studio-card-bg` | Kart yüzeyi |
| `--studio-card-line` | Kart kenarı |
| `--studio-track` | Bar zeminleri |
| `--studio-note-dim-bg` | "dim" yorum zemini |
| `--studio-axis` | Grafik ekseni yazısı |
| `--studio-accent` | Varsayılan aksan çubuğu rengi |
| `--studio-accent-hot / -ok / -warn / -bad / -info / -violet / -money / -gold` | Aksan presetleri |
| `--studio-note-<ton>-rgb` / `--studio-note-<ton>-a` | Yorum tonu R,G,B + alfa |

**Tema kancaları**

```css
:root                              { /* koyu (varsayılan) */ }
html[data-theme="light"], body.theme-light { /* açık, elle */ }
@media (prefers-color-scheme: light) { html[data-theme="auto"] { /* açık, otomatik */ } }
```

Yeni bir renk eklemek istersen önce `studio-theme.css`'e token yaz, gerekiyorsa
açık tema bloğuna da ekle.

---

## 2) Bileşenler

### Kart — `.studio-card`
Sol aksan çubuğu `::before` ile gelir; rengi `--studio-accent` belirler.

```js
K.studio.card(innerHTML, K.studio.ACCENT.info)
```

### Yorum / öneri satırı — `.studio-note`
Tonlar: `ok · warn · bad · info · violet · hot · dim`.

```js
K.studio.note("🟢", "Giriş çok iyi tutuyor.", "ok")
K.studio.note("🔴", "İzleyici erken kaçıyor.", "bad")
K.studio.note("💡", "Sekmelerden detaya geç.", "dim")
```
> Eski `rgba(...)` arka planları geriye dönük uyumludur; `K.studio.note`
> otomatik olarak tona çevirir.

### Metrik kutusu — `.sp-stat`
```js
K.studio.stat("Aylık İzlenme", "1,2 Mn")
K.studio.stat("Abone", "45 B", "rgba(255,80,80,.1)")   // opsiyonel bg
```

### Başlık — `.studio-title` (+ `.sm .mb .mb6`)
```js
K.studio.title("Trafik Kaynakları")
K.studio.title("Öne Çıkanlar", "sm")
```

### Yatay bar — `.studio-bar` (`.lg .block`) + `.studio-bar-fill`
```js
K.studio.bar(42)                        // varsayılan gradyan
K.studio.bar(78, { cls: "lg", color: "linear-gradient(90deg,#1ed760,#6ec3ff)" })
```

### Bar satırı — `.studio-row`
Etiket + bar + değer; etiket genişliği varyantları: `wide · sm · xs`.

```js
K.studio.row("Kendi kütüphanesi", 22)                       // değer = "22%"
K.studio.row("TikTok", 18, "18%", { labelCls: "wide", color: "#25f4ee" })
K.studio.row("Casual", 35, "525 B · %35", { labelCls: "xs", valCls: "wide" })
```

### Sağlık skoru — `.studio-health*`
```js
K.studio.health({
  label: "Kanal Sağlığı", score: 78, text: "İyi",
  color: "#4ade80", toColor: "#ff8a5c", emoji: "🏆"
})
```

### Grafik ekseni — `.studio-axis`
```html
<div class="studio-axis"><span>0:00</span><span>Yarı</span><span>Son</span></div>
```

---

## 3) Responsive

`studio.css` iki kırılım noktası içerir ve kart/bar taşmasını engeller:

- **≤ 480px**: kart padding'i, etiket/değer genişlikleri ve fontlar küçülür.
- **≤ 360px**: daha da daraltma (`.xs → 50px`), sağlık emojisi gizlenir.
- Etiketler `ellipsis` (taşmaz), barlar `flex:1 1 0; min-width:24px`,
  kart/satır/bar `min-width:0`, kart `max-width:100%`.

Dar ekran testinde kart ve barlar bozulmaz; yeni bir bileşen eklerken sabit
genişlik yerine bu esnek sınıfları tercih et.

---

## 4) Yeni bir uygulamaya ekleme (kontrol listesi)

1. `<link rel="stylesheet" href="css/studio-theme.css" />` ve
   `<link rel="stylesheet" href="css/studio.css" />` yüklü mü? (index.html)
2. `js/ui/studio.js` yüklü mü? (`K.studio` hazır)
3. Yardımcıları bağla:
   ```js
   const card = K.studio.card, note = K.studio.note, stat = K.studio.stat;
   ```
4. Sekmeli panel iskeleti:
   ```js
   K.phone.pushView({
     title: "… Studio", sub: "Analitik", shellClass: "app-…",
     tabs: [{ id: "gen", label: "Özet" }, /* … */],
     activeTab: "gen",
     render: (tab) => `… ${card(note("💡", "…", "dim"), K.studio.ACCENT.info)} …`
   });
   ```
5. Her karta **bir yorum/öneri satırı** ekle (ton: duruma göre
   `ok/warn/bad/info/violet/hot/dim`).

> Kural: yeni bir renk veya gölge uydurma; token + ton kullan. Böylece koyu ve
> açık tema ile dar ekran otomatik uyumlu kalır.
