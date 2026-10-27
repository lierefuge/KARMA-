/* ============================================================
   KARMA — ui/career-charts.js   (v10.69.1)

   NEDEN VAR?
   ----------
   Kariyer > "Listeler" ekranı bozuktu:
     · Şablon dizesinde `<div` kaybolmuş, ekranda ham metin
       `div class="chart-row ">` görünüyordu.
     · `${K.careerUI.liveDataHTML()}` HER satırın içine sızmıştı; canlı
       şerit 50 kez basılıyor, liste ~7.984 px yüksekliğe şişiyordu.
       (Tarayıcı raporu: career-listeler.png)

   NEDEN AYRI DOSYA?
   -----------------
   `career-ui.js` 310 KB. Entegrasyonun yazma yolu ~150 KB üzerini
   taşıyamıyor (README 148 KB'de de aynı sınır yaşandı), bu yüzden dev
   dosya düzenlenemedi. Düzeltilmiş `renderCharts` burada tanımlanıp
   yüklendikten SONRA devreye girer.

   KALDIRMA KOŞULU
   ---------------
   `career-ui.js` düzenlenebilir olduğunda: aşağıdaki gövdeyi oradaki
   `renderCharts` ile değiştir, bu dosyayı ve index.html'deki etiketini
   sil. İki kopya uzun süre birlikte durmamalı.
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  function renderCharts() {
    const s = K.state;
    const chart = s.chart || [];
    const hideV = K.settings && K.settings.valuesHidden && K.settings.valuesHidden();

    /* ---------- 1) oyuncunun platform listeleri (Spotify/Apple/YT/airplay) ---------- */
    let listsHTML = "";
    if (K.lists) {
      const rows = K.lists.summary();
      const active = rows.filter(r => !r.exitDay);
      if (active.length) {
        listsHTML = `
          <div class="c-block">
            <div class="c-head"><div><h2>Platform Listelerin</h2><div class="sub">Editoryal, algoritmik ve viral listeler — girişler kendiliğinden olmaz</div></div></div>
            <div class="list-board">
              ${active.sort((a, b) => a.platform.localeCompare(b.platform)).map(r => `
                <div class="list-board-row">
                  <div class="lb-icon">${r.icon || "🎵"}</div>
                  <div class="grow">
                    <div class="lb-name">${U.escape(r.name)}</div>
                    <div class="lb-sub">${U.escape(r.platform)} · ${U.escape(r.song.title)} · sıra ~${r.rank}${hideV ? "" : " · çekiş " + (r.pull || 0)}</div>
                  </div>
                  <span class="pill money">${r.days}. gün</span>
                </div>`).join("")}
            </div>
          </div>`;
      }
    }

    /* ---------- 1.5) YÜKSELEN 20 (erken kariyer basamağı, v10.55) ----------
       Ulusal KARMA Top 30'a girmek günlük ~58.000 dinlenme ister; oyuncu
       normal oynayışta oraya aylarca ulaşamaz. Bu liste, henüz ulusal çapa
       ulaşmamış işleri sıralar ve oyuncunun ilk günden tırmandığı bir tablo
       sunar (ulusal liste hedef olarak kalır). */
    let risingBlock = "";
    const rising = s.chartRising || [];
    if (rising.length) {
      const rr = rising.map(e => {
        const d = e.delta > 0 ? `<span class="chart-delta up">▲${e.delta}</span>`
          : e.delta < 0 ? `<span class="chart-delta down">▼${Math.abs(e.delta)}</span>`
          : `<span class="chart-delta same">—</span>`;
        const artistLabel = e.mine ? s.player.stageName : e.artistName;
        return `
          <div class="chart-row ${e.mine ? "me" : ""}">
          <span class="chart-rank ${e.rank <= 3 ? "top" : ""}">${e.rank}</span>
          ${K.ui.cover(e.cover, (e.title[0] || "?").toUpperCase(), 38, e.art)}
          <div class="grow">
            <div class="title" style="font-size:12.5px;font-weight:700">${U.escape(e.title)}</div>
            <div class="sub" style="font-size:10.5px;color:var(--text-2)">${U.escape(artistLabel)}</div>
          </div>
          ${d}
          <span style="font-size:10.5px;color:var(--text-3);font-weight:700;width:70px;text-align:right">${hideV ? "🔒" : U.compact(e.daily) + "/g"}</span>
        </div>`;
      }).join("");
      risingBlock = `
        <div class="c-block">
          <div class="c-head">
            <div>
              <h2>Yükselen 20</h2>
              <div class="sub">Ulusal çapa henüz ulaşmamış işler — kariyerinin ilk basamağı</div>
            </div>
          </div>
          <div class="chart-list">${rr}</div>
        </div>`;
    }

    if (!chart.length) {
      return listsHTML + risingBlock +
        `<div class="empty-note"><b>Liste oluşuyor</b>Bir gün ilerlet ve listeleri gör.</div>`;
    }

    const rows = chart.slice(0, 30).map(e => {
      const d = e.delta > 0 ? `<span class="chart-delta up">▲${e.delta}</span>`
        : e.delta < 0 ? `<span class="chart-delta down">▼${Math.abs(e.delta)}</span>`
        : `<span class="chart-delta same">—</span>`;
      const artistLabel = e.mine ? s.player.stageName : e.artistName;
      return `<div class="chart-row ${e.mine ? "me" : ""}">
        <span class="chart-rank ${e.rank <= 3 ? "top" : ""}">${e.rank}</span>
        ${K.ui.cover(e.cover, (e.title[0] || "?").toUpperCase(), 38, e.art)}
        <div class="grow">
          <div class="title" style="font-size:12.5px;font-weight:700">${U.escape(e.title)}</div>
          <div class="sub" style="font-size:10.5px;color:var(--text-2)">${U.escape(artistLabel)}</div>
        </div>
        ${d}
        <span style="font-size:10.5px;color:var(--text-3);font-weight:700;width:70px;text-align:right">${hideV ? "🔒" : U.compact(e.daily) + "/g"}</span>
      </div>`;
    }).join("");

    const st = K.live ? K.live.status() : null;
    return K.careerUI.liveDataHTML() + listsHTML + risingBlock + `
      <div class="c-block">
        <div class="c-head">
          <div>
            <h2>KARMA Top 30</h2>
            <div class="sub">Günlük dinlenmeye göre ulusal liste${st && st.chartIsLive ? ` · canlı veri (${U.escape(st.asof || "")})` : " · gerçek liste anlık görüntüsü"}</div>
          </div>
          <div class="action-row">
            <button class="btn btn-primary btn-sm" data-act="refresh-chart">🔄 Canlı Yenile</button>
          </div>
        </div>
        ${hideV ? `<div class="opt-info" style="margin-bottom:8px">🔒 Zor mod: sayısal değerler gizli. Yalnızca sıralamaya bak.</div>` : ""}
        <div class="chart-list">${rows}</div>
      </div>`;
    }
  /* career-ui.js yüklendikten sonra çalıştığımız için üzerine yazıyoruz */
  K.careerUI = K.careerUI || {};
  K.careerUI.renderCharts = renderCharts;
})(window.K = window.K || {});
