#!/usr/bin/env node
/* ============================================================
   KARMA — tek dosyalık oyun üretici (build)
   index.html + css/* + js/* dosyalarını TEK bir HTML dosyasına
   gömer. Çıktı: KARMA-Oyun.html (harici CSS/JS gerektirmez).

   Kullanım:
     node tools/build-single.js [cikti-dosyasi]
   Varsayılan çıktı: ./KARMA-Oyun.html
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "KARMA-Oyun.html"));

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

let html = read("index.html");

// 1) Yerel CSS <link> etiketlerini <style> olarak göm
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) => {
  if (/^https?:/i.test(href)) return m; // Google Fonts gibi harici linkler kalsın
  const css = read(href);
  return `<style>\n/* ==== ${href} ==== */\n${css}\n</style>`;
});

// 2) Yerel <script src> etiketlerini satır içi <script> olarak göm
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g, (m, src) => {
  if (/^https?:/i.test(src)) return m;
  const js = read(src);
  return `<script>\n/* ==== ${src} ==== */\n${js}\n</script>`;
});

// 3) Harici CSS/JS kalmadığını doğrula
const leftover = [];
(html.match(/<link[^>]*rel="stylesheet"[^>]*>/g) || []).forEach(t => {
  if (!/^https?:/i.test((t.match(/href="([^"]+)"/) || [])[1] || "")) leftover.push(t);
});
(html.match(/<script[^>]*src="[^"]+"[^>]*>/g) || []).forEach(t => {
  if (!/^https?:/i.test((t.match(/src="([^"]+)"/) || [])[1] || "")) leftover.push(t);
});
if (leftover.length) {
  console.error("HATA: Gömülemeyen yerel kaynaklar:\n" + leftover.join("\n"));
  process.exit(1);
}

fs.writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`✅ Tek dosyalık oyun üretildi: ${OUT}`);
console.log(`   Boyut: ${kb} KB · harici bağımlılık: sadece Google Fonts (opsiyonel)`);
