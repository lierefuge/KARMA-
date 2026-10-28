/* ============================================================
   KARMA — systems/studioroom.js   (v10.70)

   STÜDYO ODASI: satın al → yerleştir → etkisini gör.
   3D hissi CSS perspektifiyle verilir (WebGL yok): zemin ve duvarlar
   döndürülür, eşyalar zemine "dikilir". Oda 15° adımlarla döndürülür.

   NEDEN AYRI MODÜL?
   -----------------
   1) `career-ui.js` 310 KB — entegrasyonun yazma yolu bu boyutu
      taşımıyor. Bu modül `renderStudio`'nun ÜSTÜNE eklenir.
   2) Oda sistemi kendi verisini, kendi kaydını ve kendi çizimini
      taşır; ileride bağımsız geliştirilebilir.

   ETKİ KURALI (tek kaynak: effects())
     kalite  = yerleştirilmiş eşyaların q toplamı   → kayıt kalitesine
     konfor  = yerleştirilmiş eşyaların c toplamı   → seans yorgunluğunu azaltır
   Eşya SATIN ALINIR, yerleştirilmedikçe etki etmez (envanterinde durur).
   ============================================================ */
(function (K) {
  "use strict";
  const U = K.util;

  /* ---------------- EŞYA KATALOĞU ----------------
     slot : aynı slota tek eşya yerleşir (değiştirmek ücretsizdir)
     x,y  : zemindeki konum (%);  w : zemindeki genişlik (%)
     h    : eşyanın "yüksekliği" (px) — izometrik dikilme boyu
     q/c  : kalite / konfor puanı
     minRep: itibar kapısı */
  const ITEMS = [
    /* MASA */
    { id: "masa-simple", slot: "masa", name: "Basit masa", icon: "🪑", cost: 0, q: 0, c: 1, minRep: 0, x: 50, y: 62, w: 34, h: 26,
      desc: "İdare eder. Dizüstü + tek monitör." },
    { id: "masa-kontrol", slot: "masa", name: "Kontrol masası", icon: "🎚️", cost: 14000, q: 3, c: 3, minRep: 0, x: 50, y: 62, w: 42, h: 30,
      desc: "Fader'lar, monitörler, kulaklık askısı. İş akışı hızlanır." },
    { id: "masa-master", slot: "masa", name: "Mastering masası", icon: "🖥️", cost: 48000, q: 7, c: 5, minRep: 25, x: 50, y: 62, w: 48, h: 34,
      desc: "Çift monitör, akustik panel arkası, kalibreli dinleme." },

    /* HOPARLÖR */
    { id: "hop-telefon", slot: "hoparlor", name: "Telefon hoparlörü", icon: "📱", cost: 0, q: 0, c: 0, minRep: 0, x: 30, y: 58, w: 10, h: 14,
      desc: "Referans yok — ne duyarsan o. Başlangıç noktası." },
    { id: "hop-kulaklik", slot: "hoparlor", name: "Stüdyo kulaklığı", icon: "🎧", cost: 2500, q: 1, c: 2, minRep: 0, x: 30, y: 58, w: 12, h: 18,
      desc: "Referansı zayıf ama başlangıç için yeterli." },
    { id: "hop-5inc", slot: "hoparlor", name: "5\" monitör çifti", icon: "🔈", cost: 16000, q: 4, c: 3, minRep: 0, x: 30, y: 58, w: 16, h: 22,
      desc: "Odanın gerçeğini duymaya başlarsın." },
    { id: "hop-8inc", slot: "hoparlor", name: "8\" monitör + sub", icon: "🔊", cost: 52000, q: 8, c: 4, minRep: 30, x: 30, y: 58, w: 20, h: 26,
      desc: "Alt frekans kontrolü. Mix kararları netleşir." },

    /* MİKROFON */
    { id: "mik-telefon", slot: "mikrofon", name: "Telefon mikrofonu", icon: "📞", cost: 0, q: 0, c: 0, minRep: 0, x: 70, y: 52, w: 9, h: 20,
      desc: "Kaydeder ama odayı da kaydeder. İdare eder." },
    { id: "mik-usb", slot: "mikrofon", name: "USB mikrofon", icon: "🎙️", cost: 1800, q: 1, c: 0, minRep: 0, x: 70, y: 52, w: 10, h: 22,
      desc: "Pratik ama oda gürültüsünü toplar." },
    { id: "mik-kondenser", slot: "mikrofon", name: "Condenser + preamp", icon: "🎤", cost: 21000, q: 5, c: 0, minRep: 0, x: 70, y: 52, w: 12, h: 26,
      desc: "Vokal detayı belirgin artar." },
    { id: "mik-tup", slot: "mikrofon", name: "Tüp mikrofon", icon: "🏆", cost: 64000, q: 9, c: 1, minRep: 40, x: 70, y: 52, w: 13, h: 28,
      desc: "Sıcak, pahalı, kıskanılan." },

    /* KAYIT KABİNİ */
    { id: "kabin-yok", slot: "kabin", name: "Kabinsiz", icon: "🚪", cost: 0, q: 0, c: 0, minRep: 0, x: 84, y: 44, w: 14, h: 40,
      desc: "Oda akustiği neyse o." },
    { id: "kabin-battaniye", slot: "kabin", name: "Battaniyeli köşe", icon: "🛏️", cost: 4200, q: 2, c: 3, minRep: 0, x: 84, y: 44, w: 16, h: 44,
      desc: "Ucuz ve şaşırtıcı derecede işe yarar." },
    { id: "kabin-akustik", slot: "kabin", name: "Akustik kabin", icon: "🔇", cost: 38000, q: 7, c: 6, minRep: 20, x: 84, y: 44, w: 20, h: 50,
      desc: "Yansıma yok, komşu yok, bahane yok." },

    /* HALI */
    { id: "hali-yok", slot: "hali", name: "Çıplak zemin", icon: "▫️", cost: 0, q: 0, c: -2, minRep: 0, x: 50, y: 78, w: 62, h: 6,
      desc: "Yansımalar her yerde." },
    { id: "hali-eski", slot: "hali", name: "Eski halı", icon: "🟫", cost: 1500, q: 1, c: 4, minRep: 0, x: 50, y: 78, w: 60, h: 6,
      desc: "Yansımayı keser, odayı yumuşatır." },
    { id: "hali-yun", slot: "hali", name: "Yün halı", icon: "🟥", cost: 9000, q: 3, c: 7, minRep: 0, x: 50, y: 78, w: 66, h: 7,
      desc: "Akustik + ayak sıcaklığı. Uzun seansların dostu." },

    /* KOLTUK */
    { id: "koltuk-yok", slot: "koltuk", name: "Sandalye", icon: "🪑", cost: 0, q: 0, c: 0, minRep: 0, x: 26, y: 74, w: 12, h: 20,
      desc: "Sırt ağrısı dahil değil." },
    { id: "koltuk-ofis", slot: "koltuk", name: "Ofis koltuğu", icon: "💺", cost: 7000, q: 1, c: 5, minRep: 0, x: 26, y: 74, w: 13, h: 24,
      desc: "Uzun oturumlarda fark eder." },
    { id: "koltuk-ergo", slot: "koltuk", name: "Ergonomik koltuk", icon: "🧘", cost: 24000, q: 2, c: 9, minRep: 15, x: 26, y: 74, w: 14, h: 26,
      desc: "Bel desteği, konfor, daha az yorgunluk." },

    /* DUVAR — TABLO / AKUSTİK */
    { id: "duvar-bos", slot: "tablo", name: "Boş duvar", icon: "🧱", cost: 0, q: 0, c: 0, minRep: 0, x: 47, y: 24, w: 22, h: 18,
      desc: "Yankı yapan çıplak duvar." },
    { id: "duvar-poster", slot: "tablo", name: "Poster + çerçeve", icon: "🖼️", cost: 2600, q: 1, c: 1, minRep: 0, x: 47, y: 24, w: 22, h: 18,
      desc: "Motivasyon. Ölçülen etkisi küçük, moral etkisi büyük." },
    { id: "duvar-akustik", slot: "tablo", name: "Akustik panel + çerçeve", icon: "🟦", cost: 17000, q: 5, c: 2, minRep: 10, x: 47, y: 24, w: 26, h: 20,
      desc: "İlk yansımaları keser; mix'in güvenilir olur." },

    /* IŞIK */
    { id: "isik-tek", slot: "isik", name: "Tek ampul", icon: "💡", cost: 0, q: 0, c: 0, minRep: 0, x: 66, y: 30, w: 8, h: 16,
      desc: "Baş ağrıtır." },
    { id: "isik-lamba", slot: "isik", name: "Ayarlanabilir lamba", icon: "🪔", cost: 3200, q: 0, c: 4, minRep: 0, x: 66, y: 30, w: 9, h: 18,
      desc: "Göz yormaz; gece seanslarını kurtarır." },
    { id: "isik-rgb", slot: "isik", name: "RGB + dimmer", icon: "🌈", cost: 12000, q: 1, c: 6, minRep: 0, x: 66, y: 30, w: 10, h: 20,
      desc: "Havayı değiştirir, konforu artırır." }
  ];

  const SLOTS = [
    { id: "masa", label: "Masa" },
    { id: "hoparlor", label: "Hoparlör" },
    { id: "mikrofon", label: "Mikrofon" },
    { id: "kabin", label: "Kayıt alanı" },
    { id: "hali", label: "Halı" },
    { id: "koltuk", label: "Oturma" },
    { id: "tablo", label: "Duvar" },
    { id: "isik", label: "Işık" }
  ];

  const byId = (id) => ITEMS.find(i => i.id === id) || null;

  /* MASA YÜZEYİ — yüzde koordinatlarla (zemin düzleminde).
     Hoparlör/mikrofon/ışık/masa eşyaları varsayılan olarak masada durur. */
  const DESK = { x: 50, y: 62, w: 42, h: 16 };
  const DESK_SLOTS = ["masa", "hoparlor", "mikrofon", "isik"];
  const onDeskByDefault = (slot) => DESK_SLOTS.indexOf(slot) >= 0;
  const deskHit = (x, y) => Math.abs(x - DESK.x) <= DESK.w / 2 + 2 &&
                             Math.abs(y - DESK.y) <= DESK.h / 2 + 3;

  /* ---------------- SİSTEM ---------------- */
  K.studioRoom = {
    ITEMS: ITEMS,
    SLOTS: SLOTS,
    byId: byId,

    /* kayıt: player.studioRoom = { owned:[], placed:{slot:itemId}, rot:0 } */
    st() {
      const p = K.state.player;
      p.studioRoom = p.studioRoom || { owned: [], placed: {}, rot: 0 };
      const r = p.studioRoom;
      r.owned = Array.isArray(r.owned) ? r.owned : [];
      r.placed = r.placed || {};
      r.pos = r.pos || {};                 /* sürüklenen eşyaların konumu */
      r.rot = Number(r.rot) || 0;
      /* başlangıç eşyaları: hepsi ücretsiz olan "sade" set */
      if (!r.owned.length) {
        ITEMS.filter(i => i.cost === 0).forEach(i => {
          if (r.owned.indexOf(i.id) < 0) r.owned.push(i.id);
          if (!r.placed[i.slot]) r.placed[i.slot] = i.id;
        });
      }
      return r;
    },

    owned(id) { return K.studioRoom.st().owned.indexOf(id) >= 0; },

    /* satın al (envantere girer, otomatik yerleşir) */
    buy(id) {
      const it = byId(id);
      if (!it) return { ok: false, why: "Eşya bulunamadı." };
      if (K.studioRoom.owned(id)) return { ok: false, why: "Zaten sende." };
      if (!K.economy.canAfford(it.cost)) return { ok: false, why: "Para yetmiyor." };
      if (!K.economy.spend(it.cost, "stüdyo: " + it.name)) return { ok: false, why: "Para yetmiyor." };
      const r = K.studioRoom.st();
      r.owned.push(id);
      r.placed[it.slot] = id;
      return { ok: true, item: it };
    },

    /* envanterdeki eşyayı slota yerleştir (ücretsiz) */
    place(id) {
      const it = byId(id);
      if (!it) return { ok: false, why: "Eşya bulunamadı." };
      if (!K.studioRoom.owned(id)) return { ok: false, why: "Önce satın al." };
      K.studioRoom.st().placed[it.slot] = id;
      return { ok: true, item: it };
    },

    /* eşyanın odadaki konumu: { x, y, layer } — layer: "floor" | "desk" */
    posOf(it) {
      const r = K.studioRoom.st();
      const p = r.pos[it.slot];
      if (p && typeof p.x === "number") return p;
      return { x: it.x, y: it.y, layer: onDeskByDefault(it.slot) ? "desk" : "floor" };
    },

    moveTo(slot, x, y, layer) {
      const r = K.studioRoom.st();
      const cx = Math.max(4, Math.min(96, Math.round(x)));
      const cy = Math.max(20, Math.min(94, Math.round(y)));
      const it = byId(r.placed[slot]);
      r.pos[slot] = { x: cx, y: cy, layer: layer || (it && deskHit(cx, cy) ? "desk" : "floor") };
      return r.pos[slot];
    },

    /* masaya koy / yerden al */
    setLayer(slot, layer) {
      const r = K.studioRoom.st();
      const cur = r.pos[slot] || (() => { const it = byId(r.placed[slot]); return { x: it ? it.x : 50, y: it ? it.y : 62 }; })();
      const it = byId(r.placed[slot]);
      const base = it || { x: 50, y: 58 };
      const toDesk = layer === "desk";
      r.pos[slot] = {
        x: cur.x, y: toDesk ? Math.min(base.y, DESK.y + DESK.h / 2) : Math.max(base.y, DESK.y + DESK.h + 6),
        layer: toDesk ? "desk" : "floor"
      };
      return r.pos[slot];
    },

    layerOf(slot) {
      const r = K.studioRoom.st();
      const p = r.pos[slot];
      if (p && p.layer) return p.layer;
      const it = byId(r.placed[slot]);
      return it && onDeskByDefault(it.slot) ? "desk" : "floor";
    },

    rotate(step) {
      const r = K.studioRoom.st();
      r.rot = ((r.rot + (step || 15)) % 360 + 360) % 360;
      return r.rot;
    },

    /* TEK KAYNAK: eşya etkileri */
    effects() {
      const r = K.studioRoom.st();
      let q = 0, c = 0, n = 0;
      Object.keys(r.placed).forEach(slot => {
        const it = byId(r.placed[slot]);
        if (!it) return;
        q += it.q || 0;
        c += it.c || 0;
        n++;
      });
      return { quality: q, comfort: c, count: n };
    },

    /* konfor → seans yorgunluğu azaltıcı çarpan (0.75–1.0) */
    fatigueScale() {
      return U.clamp(1 - (K.studioRoom.effects().comfort || 0) / 60, 0.75, 1);
    }
  };

  /* ---------------- ARAYÜZ ---------------- */
  let cssDone = false;
  function ensureCSS() {
    if (cssDone || typeof document === "undefined") return;
    cssDone = true;
    const css = `
    #sroom-root { display:flex; flex-direction:column; gap:10px; margin-bottom:12px }
    .sroom-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap }
    .sroom-head h3 { margin:0; font-size:13px; font-weight:800 }
    .sroom-sum { margin-left:auto; display:flex; gap:6px; font-size:11px }
    .sroom-sum b { font-weight:800 }
    .sroom-stage { position:relative; height:230px; border-radius:12px; overflow:hidden;
      background:radial-gradient(120% 90% at 50% 10%, #232a38, #0d1017 70%); perspective:900px; }
    .sroom-floor { position:absolute; left:50%; top:58%; width:300px; height:300px; margin:-150px 0 0 -150px;
      transform-style:preserve-3d; transform: rotateX(58deg) rotateZ(var(--rot,0deg)); transition:transform .25s ease; }
    .sroom-tile { position:absolute; inset:0; border-radius:10px;
      background:linear-gradient(135deg,#2a3242,#1b2130); box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); }
    .sroom-wall { position:absolute; background:linear-gradient(180deg,#242b39,#171b25);
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.05); }
    .sroom-wall.back { left:0; top:0; width:100%; height:38%; }
    .sroom-wall.left { left:0; top:0; width:8%; height:100%; }
    .sroom-wall.right { right:0; top:0; width:8%; height:100%;
      background:linear-gradient(180deg,#1b2130,#12161f); }
    .sroom-grid { position:absolute; inset:0; border-radius:10px; opacity:.5;
      background-image:linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px);
      background-size:24px 24px; }
    .sroom-item { position:absolute; transform-style:preserve-3d; pointer-events:auto; cursor:grab;
      touch-action:none; }
    .sroom-item:active { cursor:grabbing; }
    .sroom-item.on-desk .plate { box-shadow:0 6px 18px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.07); }
    .sroom-desk { position:absolute; transform:translate(-50%,-50%); border-radius:8px;
      background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.03));
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.10), 0 6px 18px rgba(0,0,0,.35); }
    .sroom-card button.lay { background:rgba(110,195,255,.22); color:#cfe9ff; margin-left:0; }
    .sroom-item .plate { display:flex; align-items:center; justify-content:center; font-size:15px;
      border-radius:6px; background:rgba(255,255,255,.07); box-shadow:0 2px 10px rgba(0,0,0,.45);
      transform-origin:50% 100%; }
    .sroom-item.sel .plate { outline:2px solid #6ec3ff; }
    .sroom-tools { position:absolute; right:8px; top:8px; display:flex; gap:4px }
    .sroom-rot { border:0; border-radius:8px; padding:4px 8px; font-size:11px; font-weight:800;
      background:rgba(255,255,255,.1); color:#fff; cursor:pointer }
    .sroom-shop { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px }
    .sroom-card { border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:7px 8px;
      background:rgba(255,255,255,.03); display:flex; flex-direction:column; gap:3px; min-width:0 }
    .sroom-card.on { border-color:rgba(110,195,255,.55); background:rgba(110,195,255,.09) }
    .sroom-card .nm { font-size:11.5px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
    .sroom-card .ds { font-size:10px; color:var(--text-2); line-height:1.35; overflow-wrap:anywhere }
    .sroom-card .ft { display:flex; align-items:center; gap:6px; margin-top:2px }
    .sroom-card .pr { font-size:10.5px; font-weight:800; color:#9fe3b5 }
    .sroom-card button { margin-left:auto; border:0; border-radius:7px; padding:3px 8px; font-size:10.5px;
      font-weight:800; cursor:pointer; background:#2c6cf6; color:#fff }
    .sroom-card button.ghost { background:rgba(255,255,255,.12) }
    .sroom-card button[disabled] { opacity:.45; cursor:not-allowed }
    @container phone (max-width:380px) { .sroom-stage { height:180px } .sroom-shop { grid-template-columns:1fr 1fr } }
    `;
    const el = document.createElement("style");
    el.id = "sroom-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function stageHTML() {
    const r = K.studioRoom.st();
    const rot = r.rot || 0;
    const placedItems = SLOTS.map(s => byId(r.placed[s.id])).filter(Boolean);
    const items = placedItems.map(it => {
      const lift = it.h || 18;
      const p = K.studioRoom.posOf(it);
      const desk = p.layer === "desk";
      return `<div class="sroom-item${desk ? " on-desk" : ""}" data-slot="${it.slot}" data-layer="${desk ? "desk" : "floor"}"
          style="left:${p.x}%; top:${p.y}%; z-index:${Math.round(p.y) + (desk ? 40 : 0)}; --lift:${desk ? 22 : 0}px">
        <div class="plate" style="width:${(it.w || 12) * 2.4}px; height:${lift}px;
          transform: translate(-50%, calc(-100% - var(--lift,0px))) rotateZ(${-rot}deg) rotateX(-58deg);
          font-size:${Math.max(11, Math.round(lift / 2))}px">${it.icon}</div>
      </div>`;
    }).join("");
    return `<div class="sroom-stage">
        <div class="sroom-wall back"></div>
        <div class="sroom-wall left"></div>
        <div class="sroom-wall right"></div>
        <div class="sroom-floor" style="--rot:${rot}deg">
          <div class="sroom-tile"></div>
          <div class="sroom-grid"></div>
          <div class="sroom-desk" style="left:${DESK.x}%; top:${DESK.y}%; width:${DESK.w}%; height:${DESK.h}%"></div>
          ${items}
        </div>
        <div class="sroom-tools">
          <button class="sroom-rot" data-sroom="rot-">⟲ 15°</button>
          <span class="sroom-rot" style="opacity:.7">${rot}°</span>
          <button class="sroom-rot" data-sroom="rot+">15° ⟳</button>
        </div>
      </div>`;
  }

  function shopHTML() {
    const r = K.studioRoom.st();
    return SLOTS.map(slot => {
      const list = ITEMS.filter(i => i.slot === slot.id);
      const cur = r.placed[slot.id];
      return `<div class="sroom-card" style="grid-column:1/-1;background:transparent;border:0;padding:2px 0">
          <div class="nm" style="font-size:11px;opacity:.65">${slot.label.toUpperCase()}</div>
        </div>` + list.map(it => {
        const owned = r.owned.indexOf(it.id) >= 0;
        const on = cur === it.id;
        const locked = false;   /* v10.70 — kilit yok: her eşya alınabilir */
        const afford = K.economy.canAfford(it.cost);
        let btn;
        if (on) {
          const lay = K.studioRoom.layerOf(it.slot);
          btn = `<button class="lay" data-sroom="layer:${it.id}">${lay === "desk" ? "⬇ Yerden al" : "⬆ Masaya koy"}</button>`;
        }
        else if (owned) btn = `<button class="ghost" data-sroom="place:${it.id}">Yerleştir</button>`;
        else btn = `<button data-sroom="buy:${it.id}" ${locked || !afford ? "disabled" : ""}>${locked ? "🔒 " + it.minRep : U.money(it.cost)}</button>`;
        return `<div class="sroom-card${on ? " on" : ""}">
            <div class="nm">${it.icon} ${U.escape(it.name)}</div>
            <div class="ds">${U.escape(it.desc)}</div>
            <div class="ft"><span class="pr">+${it.q} kalite · +${it.c} konfor</span>${btn}</div>
          </div>`;
      }).join("");
    }).join("");
  }

  K.studioRoomUI = {
    html() {
      ensureCSS();
      const e = K.studioRoom.effects();
      const fat = Math.round((1 - K.studioRoom.fatigueScale()) * 100);
      return `<div id="sroom-root">
        <div class="sroom-head">
          <h3>🛋️ Stüdyo odan</h3>
          <div class="sroom-sum">
            <span>Kalite <b>+${e.quality}</b></span>
            <span>Konfor <b>+${e.comfort}</b></span>
            <span>Yorgunluk <b>−${fat}%</b></span>
          </div>
        </div>
        ${stageHTML()}
        <div class="sroom-shop">${shopHTML()}</div>
      </div>`;
    },

    refresh() {
      const el = document.querySelector("#sroom-root");
      if (!el) return;
      const wrap = document.createElement("div");
      wrap.innerHTML = K.studioRoomUI.html();
      const fresh = wrap.firstElementChild;
      if (fresh) el.replaceWith(fresh);
    },

    act(cmd) {
      if (!cmd) return;
      if (cmd === "rot+") { K.studioRoom.rotate(15); K.studioRoomUI.refresh(); return; }
      if (cmd === "rot-") { K.studioRoom.rotate(-15); K.studioRoomUI.refresh(); return; }
      const [kind, id] = cmd.split(":");
      if (kind === "layer") {
        const it = K.studioRoom.byId(id);
        if (!it) return;
        const next = K.studioRoom.layerOf(it.slot) === "desk" ? "floor" : "desk";
        K.studioRoom.setLayer(it.slot, next);
        if (K.save) K.save();
        if (K.toast) K.toast(next === "desk" ? "⬆ Masaya kondu" : "⬇ Yere alındı", it.name, "ok");
        K.studioRoomUI.refresh();
        return;
      }
      const res = kind === "buy" ? K.studioRoom.buy(id) : K.studioRoom.place(id);
      if (!res.ok) { if (K.toast) K.toast("Olmadı", res.why, "warn"); return; }
      if (K.save) K.save();
      if (kind === "buy" && K.toast) K.toast("🛋️ Alındı", res.item.name + " stüdyona kuruldu.", "ok");
      K.studioRoomUI.refresh();
    }
  };

  /* ---------------- SÜRÜKLE-BIRAK (v10.70) ----------------
     Eşya zemin düzleminde taşınır; konum player.studioRoom.pos[slot]
     altında saklanır ve yeniden açılışta korunur. */
  let dragging = null;
  function stageEl() { return document.querySelector(".sroom-stage"); }
  function pct(e) {
    const st = stageEl();
    if (!st) return null;
    const b = st.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * 100;
    const y = ((e.clientY - b.top) / b.height) * 100;
    return { x, y };
  }
  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", (e) => {
      const it = e.target.closest && e.target.closest(".sroom-item");
      if (!it) return;
      dragging = it;
      it.style.zIndex = 999;
      try { it.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    }, true);
    document.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = pct(e);
      if (!p) return;
      dragging.style.left = Math.max(4, Math.min(96, p.x)) + "%";
      dragging.style.top = Math.max(20, Math.min(94, p.y)) + "%";
    }, true);
    document.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      const slot = dragging.getAttribute("data-slot");
      const p = pct(e);
      if (slot && p) K.studioRoom.moveTo(slot, p.x, p.y);   /* katmanı bırakılan yer belirler */
      dragging = null;
      if (K.save) K.save();
    }, true);
  }

  /* tıklama: kendi kapsayıcımıza delege */
  if (typeof document !== "undefined") {
    document.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("[data-sroom]");
      if (!b || !document.querySelector("#sroom-root")) return;
      e.preventDefault();
      e.stopPropagation();
      K.studioRoomUI.act(b.getAttribute("data-sroom"));
    }, true);
  }

  /* Studio sekmesinin HTML'inin BAŞINA oda bloğunu ekle */
  function wrapStudio() {
    if (!K.careerUI || !K.careerUI.renderStudio || K.careerUI._sroomWrapped) return;
    const orig = K.careerUI.renderStudio;
    K.careerUI.renderStudio = function () {
      let html = "";
      try { html = orig.apply(this, arguments) || ""; } catch (e) { html = ""; }
      try { return K.studioRoomUI.html() + html; } catch (e) { return html; }
    };
    K.careerUI._sroomWrapped = true;
  }
  if (K.careerUI) wrapStudio();
  else if (typeof setTimeout !== "undefined") setTimeout(wrapStudio, 0);
})(window.K = window.K || {});
