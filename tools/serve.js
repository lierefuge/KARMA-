/* ============================================================
   KARMA — YEREL ÖNİZLEME SUNUCUSU   (v10.18)

   Neden gerekli?
   --------------
   Modüler sürümü `file://` üzerinden açmak ÇALIŞMAZ: js/data/lazy.js
   gerçek şarkı/önizleme verisini ihtiyaç anında bir script etiketiyle
   çeker ve tarayıcılar `file://` altında bu tür alt kaynakları engeller.
   Ayrıca önbellek (?v=) davranışını gerçek koşullarda görmek istersin.

   Kullanım:
     node tools/serve.js            # http://localhost:8080
     node tools/serve.js 3000       # başka bağlantı noktası
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = parseInt(process.argv[2], 10) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
  if (rel === "/" || rel === "") rel = "/index.html";
  /* dizin kaçışını engelle */
  const abs = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ""));
  if (!abs.startsWith(ROOT)) {
    res.writeHead(403); res.end("403"); return;
  }
  fs.readFile(abs, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 — bulunamadı: " + rel);
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(abs).toLowerCase()] || "application/octet-stream",
      /* önbellek davranışını gerçekçi tut: kısa TTL */
      "Cache-Control": "public, max-age=600"
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log("KARMA yerel önizleme:");
  console.log("   modüler sürüm : http://localhost:" + PORT + "/");
  console.log("   tek dosya     : http://localhost:" + PORT + "/KARMA-Oyun.html");
  console.log("   (durdurmak için Ctrl+C)");
});
