/* ============================================================
   KARMA — systems/phonehome.js
   ANA EKRAN YERLEŞİMİ: kaydırmalı sayfalar · klasörler · simge sıralama
   Model:  player.phone.layout = { pages: [ [ entry, ... ], ... ] }
           entry = { t:"app", id }  |  { t:"folder", name, items:[appId,...] }
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;
  const PAGE_SIZE = 8;   // sayfa başına simge (4×2)

  function entryIds(en) { return en.t === "folder" ? (en.items || []).slice() : [en.id]; }

  K.phoneHome = {
    PAGE_SIZE,

    /* ---------------- model ---------------- */
    layout() {
      const p = K.state.player;
      p.phone = p.phone || {};
      if (!p.phone.layout || !Array.isArray(p.phone.layout.pages) || !p.phone.layout.pages.length) {
        p.phone.layout = { pages: [[]] };
      }
      return p.phone.layout;
    },

    save() { K.save(); },

    homeApps() { return K.phone.apps.filter(a => !a.dock && K.phoneOS.installed(a.id)); },

    entryIds,

    allIds() {
      const out = [];
      K.phoneHome.layout().pages.forEach(pg => pg.forEach(en => { out.push.apply(out, entryIds(en)); }));
      return out;
    },

    /* ---------------- senkron ---------------- */
    sync() {
      const lay = K.phoneHome.layout();
      const installed = K.phoneHome.homeApps().map(a => a.id);

      /* kurulu olmayanları çıkar, boş klasörleri dağıt */
      lay.pages.forEach(pg => {
        for (let i = pg.length - 1; i >= 0; i--) {
          const en = pg[i];
          if (en.t === "folder") {
            en.items = (en.items || []).filter(id => installed.indexOf(id) >= 0);
            if (!en.items.length) pg.splice(i, 1);
          } else if (installed.indexOf(en.id) < 0) {
            pg.splice(i, 1);
          }
        }
      });

      /* eksik kurulu uygulamaları ekle */
      const placed = K.phoneHome.allIds();
      installed.forEach(id => {
        if (placed.indexOf(id) >= 0) return;
        let pg = lay.pages[lay.pages.length - 1];
        if (pg.length >= PAGE_SIZE) { pg = []; lay.pages.push(pg); }
        pg.push({ t: "app", id });
      });

      /* boş sayfaları temizle (en az 1 kalır) */
      lay.pages = lay.pages.filter((pg, i) => pg.length > 0 || i === 0);
      if (!lay.pages.length) lay.pages = [[]];
      K.phoneHome.save();
      return lay;
    },

    /* ---------------- bulma / taşıma ---------------- */
    find(appId) {
      const lay = K.phoneHome.layout();
      for (let p = 0; p < lay.pages.length; p++) {
        const pg = lay.pages[p];
        for (let e = 0; e < pg.length; e++) {
          const en = pg[e];
          if (en.t === "app" && en.id === appId) return { page: p, entry: e };
          if (en.t === "folder" && (en.items || []).indexOf(appId) >= 0) return { page: p, entry: e, folder: true };
        }
      }
      return null;
    },

    _remove(appId) {
      const lay = K.phoneHome.layout(), f = K.phoneHome.find(appId);
      if (!f) return null;
      const en = lay.pages[f.page][f.entry];
      if (en.t === "folder") {
        en.items = en.items.filter(id => id !== appId);
        if (!en.items.length || (en.items.length === 1 && f.folderId !== undefined)) lay.pages[f.page].splice(f.entry, 1);
      } else {
        lay.pages[f.page].splice(f.entry, 1);
      }
      return f;
    },

    moveToPage(appId, pageIdx) {
      const lay = K.phoneHome.layout();
      K.phoneHome._remove(appId);
      if (!lay.pages[pageIdx]) lay.pages[pageIdx] = [];
      lay.pages[pageIdx].push({ t: "app", id: appId });
      K.phoneHome.sync();
      return true;
    },

    /* aynı sayfa/klasörde sıra değiştir (dir: -1 sol, +1 sağ) */
    nudge(appId, dir) {
      const lay = K.phoneHome.layout(), f = K.phoneHome.find(appId);
      if (!f) return false;
      const en = lay.pages[f.page][f.entry];
      if (en.t === "folder") {
        const i = en.items.indexOf(appId), j = i + dir;
        if (j < 0 || j >= en.items.length) return false;
        const t = en.items[i]; en.items[i] = en.items[j]; en.items[j] = t;
      } else {
        const pg = lay.pages[f.page], j = f.entry + dir;
        if (j < 0 || j >= pg.length) return false;
        const t = pg[f.entry]; pg[f.entry] = pg[j]; pg[j] = t;
      }
      K.phoneHome.save();
      return true;
    },

    /* ---------------- klasörler ---------------- */
    makeFolder(appId, name) {
      const lay = K.phoneHome.layout(), f = K.phoneHome.find(appId);
      if (!f || f.folder) return false;
      lay.pages[f.page][f.entry] = { t: "folder", name: name || "Klasör", items: [appId] };
      K.phoneHome.save();
      return true;
    },

    addToFolder(appId, pageIdx, entryIdx) {
      const lay = K.phoneHome.layout();
      const en = lay.pages[pageIdx] && lay.pages[pageIdx][entryIdx];
      if (!en || en.t !== "folder") return false;
      K.phoneHome._remove(appId);
      if (en.items.indexOf(appId) < 0) en.items.push(appId);
      K.phoneHome.sync();
      return true;
    },

    removeFromFolder(appId) {
      if (!K.phoneHome.find(appId) || !K.phoneHome.find(appId).folder) return false;
      K.phoneHome._remove(appId);
      const lay = K.phoneHome.layout();
      let pg = lay.pages[lay.pages.length - 1];
      if (pg.length >= PAGE_SIZE) { pg = []; lay.pages.push(pg); }
      pg.push({ t: "app", id: appId });
      K.phoneHome.sync();
      return true;
    },

    dissolveFolder(pageIdx, entryIdx) {
      const lay = K.phoneHome.layout();
      const en = lay.pages[pageIdx] && lay.pages[pageIdx][entryIdx];
      if (!en || en.t !== "folder") return false;
      const apps = en.items.map(id => ({ t: "app", id }));
      lay.pages[pageIdx].splice.apply(lay.pages[pageIdx], [entryIdx, 1].concat(apps));
      K.phoneHome.sync();
      return true;
    },

    renameFolder(pageIdx, entryIdx, name) {
      const lay = K.phoneHome.layout();
      const en = lay.pages[pageIdx] && lay.pages[pageIdx][entryIdx];
      if (!en || en.t !== "folder") return false;
      en.name = name || en.name;
      K.phoneHome.save();
      return true;
    },

    folders() {
      const lay = K.phoneHome.layout(), out = [];
      lay.pages.forEach((pg, p) => pg.forEach((en, e) => {
        if (en.t === "folder") out.push({ page: p, entry: e, name: en.name, count: (en.items || []).length });
      }));
      return out;
    },

    entries() {
      const out = [];
      K.phoneHome.layout().pages.forEach((pg, p) => pg.forEach((en, e) => out.push({ page: p, entry: e, en })));
      return out;
    },

    /* ---------------- sayfalar ---------------- */
    addPage() {
      const lay = K.phoneHome.layout();
      lay.pages.push([]);
      K.phoneHome.save();
      return lay.pages.length - 1;
    },

    removeLastPage() {
      const lay = K.phoneHome.layout();
      if (lay.pages.length <= 1 || lay.pages[lay.pages.length - 1].length) return false;
      lay.pages.pop();
      K.phoneHome.save();
      return true;
    },

    /* ---------------- düzenleme arayüzü ---------------- */
    _refresh() {
      K.phone.clearTimers();
      K.phone.render();
    },

    editApp(appId) {
      const a = K.phone.appById(appId);
      const lay = K.phoneHome.layout();
      const f = K.phoneHome.find(appId);
      if (!f) return;
      const items = [];
      items.push({ label: "◀︎ Sola al", onClick: () => { K.phoneHome.nudge(appId, -1); K.phoneHome._refresh(); } });
      items.push({ label: "Sağa al ▶︎", onClick: () => { K.phoneHome.nudge(appId, 1); K.phoneHome._refresh(); } });
      lay.pages.forEach((pg, i) => {
        if (i !== f.page) items.push({ label: "➡︎ Sayfa " + (i + 1) + "'e taşı", onClick: () => { K.phoneHome.moveToPage(appId, i); K.phoneHome._refresh(); } });
      });
      items.push({ label: "📁 Yeni klasör yap", onClick: () => K.phoneHome.promptFolder(appId) });
      K.phoneHome.folders().forEach(fo => {
        items.push({ label: "📂 \"" + fo.name + "\" klasörüne taşı", onClick: () => { K.phoneHome.addToFolder(appId, fo.page, fo.entry); K.phoneHome._refresh(); } });
      });
      if (f.folder) items.push({ label: "↩︎ Klasörden çıkar", onClick: () => { K.phoneHome.removeFromFolder(appId); K.phoneHome._refresh(); } });
      items.push({ label: "✕ Kapat", onClick: () => {} });
      K.ui.actionSheet((a ? a.name : appId) + " · taşı", items);
    },

    editFolder(pageIdx, entryIdx) {
      const lay = K.phoneHome.layout();
      const en = lay.pages[pageIdx] && lay.pages[pageIdx][entryIdx];
      if (!en || en.t !== "folder") return;
      K.ui.actionSheet(en.name + " klasörü", [
        { label: "✏️ Yeniden adlandır", onClick: () => K.phoneHome.promptRename(pageIdx, entryIdx) },
        { label: "📤 Klasörü dağıt", onClick: () => { K.phoneHome.dissolveFolder(pageIdx, entryIdx); K.phoneHome._refresh(); } },
        { label: "✕ Kapat", onClick: () => {} }
      ]);
    },

    _nameDialog(title, value, onOk) {
      K.ui.modal({
        title: title, desc: "Bir ad gir",
        body: `<input id="folder-name" value="${U.escape(value || "Klasör")}" style="width:100%;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;font-size:13px" />`,
        actions: [
          { label: "Kaydet", cls: "btn-primary", onClick: () => {
            const el = U.qs("#folder-name");
            onOk((el && el.value) || "Klasör");
            K.ui.closeModal(); K.phoneHome._refresh();
          } },
          { label: "İptal", cls: "btn-ghost" }
        ]
      });
    },

    promptFolder(appId) {
      const a = K.phone.appById(appId);
      K.phoneHome._nameDialog("Yeni klasör", (a && a.name) || "Klasör", (name) => K.phoneHome.makeFolder(appId, name));
    },

    promptRename(pageIdx, entryIdx) {
      const lay = K.phoneHome.layout();
      const en = lay.pages[pageIdx] && lay.pages[pageIdx][entryIdx];
      K.phoneHome._nameDialog("Klasörü yeniden adlandır", (en && en.name) || "Klasör", (name) => K.phoneHome.renameFolder(pageIdx, entryIdx, name));
    },

    /* klasörü aç (görünüm yığınına ekle) */
    openFolder(pageIdx, entryIdx) {
      const lay = K.phoneHome.layout();
      const en = lay.pages[pageIdx] && lay.pages[pageIdx][entryIdx];
      if (!en || en.t !== "folder") return;
      const ids = en.items.slice();
      K.phone.pushView({
        title: en.name, sub: ids.length + " uygulama", shellClass: "app-folder",
        render: () => `<div class="app-grid">${ids.map(id => {
          const a = K.phone.appById(id);
          return a ? K.phone.iconHTML(a, 0) : "";
        }).join("")}</div>`
      });
    }
  };
})(window.K = window.K || {});
