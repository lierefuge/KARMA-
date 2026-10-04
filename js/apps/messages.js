/* ============================================================
   KARMA — apps/messages.js
   Mesajlar / DM — ilişki sisteminin merkezi.
   - NPC mesajları ve gerçek sanatçılardan gelen mesajlar
   - Feature teklifleri
   - Şirket (sözleşme) teklifleri
   - Hangout teklifleri
   - Samimiyet göstergesi ve aşama kilitleri
   ============================================================ */
(function (K) {
  "use strict";

  const U = K.util;

  /* ---------- iOS Mesajlar simgeleri (SVG) ----------
     v10.37 — emoji yerine iOS Mesajlar işaretleri.
     .m-on = aktif (dolu) · .m-off = pasif (ince çizgi). */
  const MI = {
    all: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <path class="m-off" d="M20.6 11.6c0 4.4-3.9 8-8.6 8a9.4 9.4 0 0 1-3.4-.6L3.6 20.7l1.6-4.7a7.7 7.7 0 0 1-1.2-4.4c0-4.4 3.9-8 8.6-8s8 3.6 8 8z" fill="none"/>
      <path class="m-on" d="M12 3.2c-5.4 0-9.8 3.6-9.8 8.1 0 2.4 1.2 4.5 3.1 6-.2 1.2-.7 2.3-1.5 3.3-.2.3 0 .7.4.7 2.1-.2 4-.9 5.4-1.9 1 .2 2 .3 3.1.3 5.4 0 9.8-3.6 9.8-8.1S17.4 3.2 12 3.2z" fill="currentColor" stroke="none"/>
    </svg>`,
    groups: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <circle class="m-off" cx="9.4" cy="8.4" r="3.7" fill="none"/>
      <path class="m-off" d="M2.8 19.8c.5-3.1 3.3-5.2 6.6-5.2s6.1 2.1 6.6 5.2" fill="none"/>
      <path class="m-off" d="M16.4 5.2a3.3 3.3 0 0 1 0 6.4M18 14.9c2 .6 3.4 2.2 3.7 4.4" fill="none"/>
      <circle class="m-on" cx="9.4" cy="8.2" r="4.1" fill="currentColor" stroke="none"/>
      <path class="m-on" d="M9.4 13.4c-3.9 0-7 2.5-7 5.6 0 .5.4.9.9.9h12.2c.5 0 .9-.4.9-.9 0-3.1-3.1-5.6-7-5.6z" fill="currentColor" stroke="none"/>
      <path class="m-on" d="M16.7 5.5a3 3 0 0 1 0 5.6v-1.7a1.4 1.4 0 0 0 0-2.2zM17.9 15.3c1.8.6 3 2 3.3 4a1 1 0 0 1-2 .3c-.2-1.4-1-2.4-2.2-2.9z" fill="currentColor" stroke="none"/>
    </svg>`,
    requests: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <path class="m-off" d="M3.4 5.2A2.2 2.2 0 0 1 5.6 3h12.8a2.2 2.2 0 0 1 2.2 2.2v13.6a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2z" fill="none"/>
      <path class="m-off" d="M3.4 14.2h5l1.2 2h4.8l1.2-2h5" fill="none"/>
      <path class="m-on" d="M5.6 3h12.8a2.2 2.2 0 0 1 2.2 2.2v13.6a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2V5.2A2.2 2.2 0 0 1 5.6 3z" fill="currentColor" stroke="none"/>
      <path class="m-on" d="M3.4 13.6h4.4l1.3 2.2h5.8l1.3-2.2h4.4" fill="none" stroke="#000" stroke-width="1.8"/>
    </svg>`,
    offers: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <path class="m-off" d="M2.6 6.4a2 2 0 0 1 2-2h14.8a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2z" fill="none"/>
      <path class="m-off" d="m3.2 6.2 8.8 6.4 8.8-6.4" fill="none"/>
      <path class="m-on" d="M2.6 6.4a2 2 0 0 1 2-2h14.8a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/>
      <path class="m-on" d="m3.4 6.6 8.6 6.2 8.6-6.2" fill="none" stroke="#000" stroke-width="1.7"/>
    </svg>`,
    new: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.4 12.6v6.6a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.2V5.4A1.8 1.8 0 0 1 4.8 3.6h6.6"/>
      <path d="M18.1 2.9a2 2 0 0 1 2.8 2.8L12.6 14l-3.7 1 1-3.7z"/>
    </svg>`
  };

  function offerCard(offer, thread) {
    const a = offer.artistId ? K.artistById(offer.artistId) : null;
    let tag = "Teklif", title = "", desc = "", terms = "";
    if (offer.type === "feature") {
      tag = "🎵 Feature Teklifi";
      title = (a ? a.stageName : "Sanatçı") + " ortak şarkı öneriyor";
      desc = `"${offer.terms.title}" için beraber çalışmayı teklif ediyor.`;
      terms = `Gelir paylaşımı: %${offer.terms.split}/${100 - offer.terms} · Stüdyo masrafı sende`;
    } else if (offer.type === "hangout") {
      tag = "🎉 Hangout Daveti";
      const acts = { studio: "Stüdyo", coffee: "Kahve", dinner: "Yemek", game: "Maç", party: "Etkinlik" };
      title = (a ? a.stageName : "Sanatçı") + " buluşmak istiyor";
      desc = `${acts[offer.terms.activity] || "Buluşma"} için davet ediyor.`;
      terms = "Birlikte vakit geçirmek samimiyeti artırır.";
    } else if (offer.type === "label") {
      if (offer.artistId) {
        tag = "🏢 Şirket Teklifi";
        title = (a ? a.stageName : "") + " şirketine katılmak istiyor";
        desc = `${K.state.label ? K.state.label.name : "Şirketin"} kadrosuna girmeyi teklif ediyor.`;
        terms = `Avans: ${U.money(offer.terms.advance)} · Sanatçı payı: %${offer.terms.artistRoyalty} · Süre: ${Math.round(offer.terms.lengthDays / 30)} ay`;
      } else {
        tag = "🏢 Şirket Teklifi";
        title = (offer.terms.labelName || "Şirket") + " seni imzalamak istiyor";
        desc = "Sana sözleşme teklif ediyor.";
        terms = `Avans: ${U.money(offer.terms.advance)} (recoup edilir) · Sanatçı payı: %${offer.terms.artistShare || (100 - offer.terms.royalty)} · Süre: ${Math.round(offer.terms.lengthDays / 30)} ay` +
          (offer.terms.dealType === "360"
            ? ` · ⚠️ 360: turne %${offer.terms.splits.touring} · merch %${offer.terms.splits.merch} · sync %${offer.terms.splits.sync}`
            : "");
      }
    }
    const pending = offer.status === "pending";
    const dl = (K.relations && K.relations.offerDaysLeft) ? K.relations.offerDaysLeft(offer) : null;
    const canNeg = pending && offer.type !== "hangout" && !offer.negotiated;
    const statusPill = offer.status === "accepted" ? ["money", "✓ Kabul edildi"]
      : offer.status === "expired" ? ["hot", "⏳ Süresi doldu"]
      : ["hot", "✕ Reddedildi"];
    return `<div class="dm-offer ${offer.type}">
      <div class="of-tag">${tag}${offer.negotiated ? ` <span class="of-neg-badge">🤝 pazarlık yapıldı</span>` : ""}</div>
      <div class="of-title">${U.escape(title)}</div>
      <div class="of-desc">${U.escape(desc)}</div>
      <div class="of-terms">${U.escape(terms)}</div>
      ${pending ? `<div class="of-actions">
        <button class="btn btn-sm btn-primary" data-pact="offer-accept" data-arg="${offer.id}">Kabul Et</button>
        <button class="btn btn-sm btn-ghost" data-pact="offer-decline" data-arg="${offer.id}">Reddet</button>
        ${canNeg ? `<button class="btn btn-sm btn-ghost of-neg" data-pact="offer-negotiate" data-arg="${offer.id}">🤝 Pazarlık</button>` : ""}
      </div>` : `<div style="margin-top:8px"><span class="pill ${statusPill[0]}">${statusPill[1]}</span></div>`}
      ${pending && dl != null ? `<div class="of-deadline ${dl <= 2 ? "urgent" : ""}">⏳ ${dl} gün içinde yanıtla</div>` : ""}
    </div>`;
  }

  K.phone.register({
    id: "messages", name: "Mesajlar", icon: "💬", iconClass: "ic-messages", dock: true,

    render(params) {
      if (params.artistId) return K.phone.appById("messages").conversation(params.artistId);

      const view = {
        title: "Mesajlar", sub: K.relations.unreadTotal() + " okunmamış",
        shellClass: "app-messages",
        tabPos: "bottom",
        tabs: [
          { id: "all", label: "Tümü", icon: MI.all },
          { id: "groups", label: "Gruplar", icon: MI.groups },
          { id: "requests", label: (() => { const n = Object.keys(K.state.dmRequests || {}).length; return n ? ("İstekler (" + n + ")") : "İstekler"; })(), icon: MI.requests },
          { id: "offers", label: (() => { const n = K.state.offers.filter(o => o.status === "pending").length; return n ? ("Teklifler (" + n + ")") : "Teklifler"; })(), icon: MI.offers },
          { id: "new", label: "Yeni DM", icon: MI.new }
        ],
        activeTab: params.tab || "all",
        render: (tab) => {
          const M = K.phone.appById("messages");
          if (tab === "all") return M.listHTML();
          if (tab === "groups") return M.groupsHTML();
          if (tab === "requests") return M.requestsHTML();
          if (tab === "offers") return M.offersHTML();
          return M.newDMHTML();
        },
        onMount: (root) => {
          const inp = U.qs("[data-dm-search]", root);
          if (inp) {
            const box = U.qs("[data-dm-list]", root);
            const app2 = K.phone.appById("messages");
            const draw = () => { if (box) box.innerHTML = app2.listRows(inp.value); };
            inp.addEventListener("input", draw);
            draw();
          }
        },
        onAction: (act, el) => {
          const M = K.phone.appById("messages");
          if (act === "open-thread") K.phone.pushView(M.conversation(el.dataset.arg));
          else if (act === "open-group") K.phone.pushView(M.groupView(el.dataset.arg));
          else if (act === "req-accept") {
            K.dmAcceptRequest(el.dataset.arg);
            K.toast("✅ Kabul edildi", (K.artistById(el.dataset.arg) || {}).stageName + " artık sohbetlerinde.", "ok");
            K.phone.reRender();
          }
          else if (act === "req-decline") {
            K.dmDeclineRequest(el.dataset.arg);
            K.toast("🗑️ İstek silindi", "", "warn");
            K.phone.reRender();
          }
          else if (act === "dms-reply") {
            const parts = String(el.dataset.arg).split("|");
            const res = K.dms.reply(parts[0], parts[1]);
            K.phone.reRender();
            /* v10.31 — röportaj kabul edildiyse TEK karar ekranını aç */
            if (res && res.interview && K.press && K.press.interview) {
              setTimeout(() => K.press.interview(), 350);
            }
          }
          else if (act === "dms-blocked") {
            const list = K.dms.blockedList();
            if (!list.length) { K.toast("Engelli hesap yok", "", ""); return; }
            K.ui.actionSheet("Engellenen hesaplar", list.map(x => ({
              label: "🔓 " + x.sender.stageName + " · " + (x.sender.roleLabel || ""),
              onClick: () => { K.dms.unblock(x.id); K.phone.reRender(); }
            })));
          }
          else if (act === "thread-more") M.threadSheet(el.dataset.arg);
          else if (act === "show-archived") {
            M._showArchived = !M._showArchived;
            K.toast(M._showArchived ? "📦 Arşiv gösteriliyor" : "📂 Arşiv gizlendi", "", "");
            K.phone.reRender();
          }
          else if (act === "grp-create-roster") {
            const roster = (K.state.label && K.state.label.roster) || [];
            const met = K.artistList().filter(a => {
              const rel = K.state.relations[a.id];
              return rel && rel.met && (rel.affinity || 0) >= 55;
            }).map(a => a.id);
            const members = (roster.length ? roster : met).slice(0, 8);
            if (!members.length) {
              K.toast("Kadro yok", "Şirket kur ya da samimiyet 55+ sanatçı edin.", "warn");
            } else {
              const g = K.groupCreate("Kadro Grubu", members, "label");
              K.toast("👥 Grup kuruldu", members.length + " üye", "ok");
              K.phone.pushView(M.groupView(g.id));
            }
          }
          else if (act === "offer-accept") { K.relations.respondOffer(el.dataset.arg, true); K.phone.reRender(); }
          else if (act === "offer-decline") { K.relations.respondOffer(el.dataset.arg, false); K.phone.reRender(); }
          else if (act === "offer-negotiate") { M.offerNegotiatePrompt(el.dataset.arg); }
        }
      };
      return view;
    },

    /* ---------------- PAZARLIK (v10.30) ---------------- */
    offerNegotiatePrompt(offerId) {
      const offer = (K.state.offers || []).find(o => o.id === offerId);
      if (!offer || offer.status !== "pending") return;
      const p = K.state.player;
      const lever = K.relations.offerLeverage(offer);
      const leverLabel = lever >= 0.7 ? "güçlü" : lever >= 0.45 ? "dengeli" : "zayıf";
      const leverTone = lever >= 0.7 ? "money" : lever >= 0.45 ? "gold" : "hot";
      let fields = "", readPatch = null;

      if (offer.type === "feature") {
        const cur = offer.terms.split || 60;
        fields = K.ui.field("İstediğin gelir payı (%)",
          `<input type="range" id="neg-split" min="30" max="90" step="5" value="${Math.min(90, cur + 10)}" />
           <div class="readout" id="neg-split-v">%${Math.min(90, cur + 10)}</div>`);
        readPatch = () => {
          const want = +U.qs("#neg-split").value;
          return { split: want, greed: U.clamp((want - cur) / 30, 0, 1) };
        };
      } else if (offer.type === "label" && offer.artistId) {
        const t = offer.terms;
        fields = K.ui.field("Avans (sen ödeyeceksin)", `<input type="number" id="neg-adv" value="${t.advance || 0}" min="0" step="5000" />`)
          + K.ui.field("Sanatçının payı (%)", `<input type="number" id="neg-roy" value="${t.artistRoyalty || 70}" min="40" max="95" />`);
        readPatch = () => {
          const adv = Math.max(0, +U.qs("#neg-adv").value || 0);
          const roy = +U.qs("#neg-roy").value || 70;
          const g = U.clamp(((t.advance || 0) - adv) / Math.max(1, (t.advance || 1)) * 0.6 + Math.abs((t.artistRoyalty || 70) - roy) / 60, 0, 1);
          return { advance: adv, artistRoyalty: roy, greed: g };
        };
      } else {
        const t = offer.terms;
        const share = t.artistShare != null ? t.artistShare : (100 - (t.royalty || 30));
        fields = K.ui.field("İstediğin avans", `<input type="number" id="neg-adv" value="${Math.round((t.advance || 0) * 1.3)}" min="0" step="5000" />`)
          + K.ui.field("İstediğin sanatçı payı (%)", `<input type="number" id="neg-share" value="${Math.min(90, share + 10)}" min="20" max="90" />`)
          + K.ui.field("Sözleşme süresi (gün)", `<input type="number" id="neg-len" value="${Math.max(180, Math.round((t.lengthDays || 365) * 0.7))}" min="90" step="30" />`);
        readPatch = () => {
          const adv = Math.max(0, +U.qs("#neg-adv").value || 0);
          const sh = +U.qs("#neg-share").value || 60;
          const len = Math.max(90, +U.qs("#neg-len").value || 365);
          const g = U.clamp((adv / Math.max(1, (t.advance || 1)) - 1) * 0.4 + Math.abs(sh - share) / 50 * 0.5 + Math.abs((t.lengthDays || 365) - len) / 300 * 0.4, 0, 1);
          return { advance: adv, artistShare: sh, lengthDays: len, greed: g };
        };
      }

      const body = `<div class="neg-lever">Kaldıraç: <b class="pill ${leverTone}">${leverLabel}</b>
          <span class="muted">Samimiyet, popülerlik ve itibarın pazarlık gücünü belirler.</span></div>${fields}`;
      K.ui.modal({
        title: "🤝 Pazarlık", desc: "Karşı tarafın kabulü kaldıraca ve isteğinin büyüklüğüne bağlıdır.",
        body,
        actions: [
          { label: "Vazgeç" },
          { label: "Teklif Et", cls: "btn-primary", onClick: () => {
            const patch = readPatch();
            const res = K.relations.counterOffer(offerId, patch);
            if (!res || res.ok === false) {
              const why = res && res.why === "tekrar" ? "Bu teklif için pazarlık hakkın doldu." : "Pazarlık yapılamadı.";
              K.toast("Pazarlık", why, "warn");
              return false;
            }
            const titles = { accepted: "✅ Kabul edildi", partial: "↔️ Kısmi taviz", withdrawn: "❌ Geri çekildi" };
            K.toast(titles[res.result] || "Pazarlık", res.reply || "", res.result === "accepted" ? "ok" : res.result === "withdrawn" ? "warn" : "");
            K.phone.reRender();
          } }
        ]
      });
      /* canlı değer göstergesi */
      const sr = U.qs("#neg-split");
      if (sr) sr.addEventListener("input", () => { const v = U.qs("#neg-split-v"); if (v) v.textContent = "%" + sr.value; });
    },

    /* ---------------- sohbet listesi ---------------- */
    listHTML() {
      return `<div class="p-search"><span>🔎</span><input data-dm-search type="text" placeholder="Sohbette ara" /></div>
        <div data-dm-list>${K.phone.appById("messages").listRows("")}</div>`;
    },

    /* arama + sabitlenmiş + arşiv kurallarıyla satır üretimi */
    listRows(q) {
      const s = K.state;
      const ql = String(q || "").toLocaleLowerCase("tr").trim();
      const ids = Object.keys(s.threads).filter(id => (s.threads[id].messages || []).length > 0);
      if (!ids.length) return `<div class="empty-note"><b>Mesaj yok</b>Mahalle çevren ve sanatçılar sana yazdığında burada görünür. "Yeni DM" ile sen de başlatabilirsin.</div>`;

      const showArch = !!K.phone.appById("messages")._showArchived;
      let sorted = ids.filter(id => {
        /* arşivlenenler listede görünmez (arama veya arşiv modu hariç) */
        if (!ql && !showArch && K.relations.isArchived(id)) return false;
        if (!ql) return true;
        const a = K.artistById(id);
        const name = a ? a.stageName.toLocaleLowerCase("tr") : "";
        if (name.includes(ql)) return true;
        return (s.threads[id].messages || []).some(m => String(m.text || "").toLocaleLowerCase("tr").includes(ql));
      });

      sorted.sort((a, b) => {
        const pa = K.relations.isPinned(a) ? 1 : 0, pb = K.relations.isPinned(b) ? 1 : 0;
        if (pa !== pb) return pb - pa;                       // sabitlenenler üstte
        const ta = s.threads[a], tb = s.threads[b];
        return ((tb.messages[tb.messages.length - 1] || {}).day || 0) - ((ta.messages[ta.messages.length - 1] || {}).day || 0);
      });

      const archivedCount = (s.player.dmArchived || []).length;
      const archRow = archCountRow(archivedCount);
      function archCountRow(n) {
        if (!n || ql) return "";
        return `<div class="dm-arch-row" data-pact="show-archived">📦 ${n} arşivlenmiş sohbet</div>`;
      }

      if (!sorted.length) {
        return archRow + `<div class="empty-note"><b>Sonuç yok</b>“${U.escape(q)}” için arama sonucu çıkmadı.</div>`;
      }

      return archRow + sorted.map(id => {
        const a = K.artistById(id);
        if (!a) return "";
        const th = s.threads[id];
        const last = th.messages[th.messages.length - 1];
        const rel = K.relation(id);
        const stage = K.stageFor(rel.affinity);
        const preview = last ? (last.from === "me" ? "Sen: " : "") + last.text : "";
        const pinned = K.relations.isPinned(id);
        const icon = last && last.kind === "voice" ? "🎤 " : last && last.kind === "demo" ? "🎧 " : last && last.kind === "media" ? "🖼️ " : "";
        return `<div class="dm-list-row" data-pact="open-thread" data-arg="${id}">
          ${pinned ? `<span class="dm-pin" title="Sabitlenmiş">📌</span>` : ""}
          ${K.ui.avatar(a.stageName, 50, true)}
          <div class="grow">
            <div class="nm">${U.escape(a.stageName)}</div>
            <div class="last">${icon}${U.escape(preview).slice(0, 46)}</div>
            <div style="font-size:10px;color:var(--karma-2);margin-top:2px">${U.escape(stage.label)} · ${Math.round(rel.affinity)}</div>
          </div>
          <div style="text-align:right">
            <div class="dm-time">${last ? U.ago(last.day, s.day) : ""}</div>
            ${th.unread ? `<div class="dm-unread" style="margin-top:4px">${th.unread}</div>` : ""}
          </div>
          <button class="dm-row-more" data-pact="thread-more" data-arg="${id}" title="Seçenekler">⋯</button>
        </div>`;
      }).join("");
    },

    /* satır seçenekleri: sabitle / arşivle */
    threadSheet(artistId) {
      const a = K.artistById(artistId);
      if (!a) return;
      const pinned = K.relations.isPinned(artistId);
      const arch = K.relations.isArchived(artistId);
      K.ui.actionSheet(a.stageName, [
        { label: pinned ? "📌 Sabitlemeyi kaldır" : "📌 Sabitle", onClick: () => {
          const on = K.relations.togglePin(artistId);
          K.toast(on ? "📌 Sabitlendi" : "Sabitleme kaldırıldı", a.stageName, "ok");
          K.phone.reRender();
        } },
        { label: arch ? "📂 Arşivden çıkar" : "📦 Arşivle", onClick: () => {
          const on = K.relations.toggleArchive(artistId);
          K.toast(on ? "📦 Arşivlendi" : "📂 Arşivden çıkarıldı", a.stageName, "ok");
          K.phone.reRender();
        } },
        { label: "🗑️ Sohbeti temizle", cls: "destructive", onClick: () => {
          const th = K.thread(artistId);
          th.messages = []; th.unread = 0;
          K.save(); K.toast("🗑️ Temizlendi", a.stageName, "warn"); K.phone.reRender();
        } }
      ]);
    },

    /* ---------------- DM İSTEKLERİ ---------------- */
    requestsHTML() {
      const reqs = K.state.dmRequests || {};
      const ids = Object.keys(reqs).filter(id => K.artistById(id));
      const ext = ids.filter(id => reqs[id].external);
      const art = ids.filter(id => !reqs[id].external);
      const blocked = (K.dms && K.dms.blockedCount) ? K.dms.blockedCount() : 0;
      const blockedRow = blocked ? `<div class="dm-arch-row" data-pact="dms-blocked">🚫 ${blocked} engellenen hesap</div>` : "";
      if (!ids.length) {
        return blockedRow + `<div class="empty-note"><b>İstek yok</b>Tanımadığın biri yazdığında mesaj burada görünür. Yabancı hesaplar (hayran / dolandırıcı / gazeteci) doğrudan gelen kutuna düşmez.</div>`;
      }
      const extHTML = ext.length
        ? `<div class="sp-section-title">Yabancı hesaplar</div>` + ext.sort((a, b) => (reqs[b].day || 0) - (reqs[a].day || 0)).map(id => K.phone.appById("messages").externalReqCard(id, reqs[id])).join("")
        : "";
      const artHTML = art.length
        ? `<div class="sp-section-title" style="margin-top:8px">Sanatçılar</div>`
          + `<div class="dm-req-note">Tanımadığın sanatçılar doğrudan sohbetlerine düşmez. Kabul edersen sohbet açılır.</div>`
          + art.sort((a, b) => (reqs[b].day || 0) - (reqs[a].day || 0)).map(id => {
            const a = K.artistById(id);
            const last = reqs[id].messages[reqs[id].messages.length - 1] || {};
            return `<div class="dm-req">
              <div class="dm-req-head">${K.ui.avatar(a.stageName, 44, true)}
                <div class="grow"><div class="nm">${U.escape(a.stageName)}</div>
                <div class="last">${U.escape(String(last.text || "").slice(0, 70))}</div></div>
              </div>
              <div class="dm-req-actions">
                <button class="btn btn-sm btn-primary" data-pact="req-accept" data-arg="${id}">Kabul et</button>
                <button class="btn btn-sm btn-ghost" data-pact="req-decline" data-arg="${id}">Sil</button>
              </div>
            </div>`;
          }).join("")
        : "";
      return blockedRow + extHTML + artHTML;
    },

    /* yabancı DM kartı: hayran / dolandırıcı / gazeteci — engelle veya yanıtla */
    externalReqCard(id, req) {
      const s = K.dms.byId(id) || K.artistById(id) || {};
      const last = (req.messages || [])[req.messages.length - 1] || {};
      const kind = req.kind || (s && s.role) || "hayran";
      const icon = (s.roleIcon) || ({ hayran: "💜", dolandirici: "⚠️", gazeteci: "📰" }[kind] || "👤");
      const label = (s.roleLabel) || ({ hayran: "Hayran", dolandirici: "Şüpheli Hesap", gazeteci: "Gazeteci" }[kind] || "Yabancı");
      const dl = req.expiresDay ? Math.max(0, req.expiresDay - K.state.day) : null;
      const opts = (req.options || []).map(o =>
        `<button class="btn btn-sm ${o.block ? "btn-ghost dm-block-btn" : "btn-primary"}" data-pact="dms-reply" data-arg="${id}|${o.id}">${U.escape(o.label)}</button>`).join("");
      const outcome = req.handled
        ? `<div class="dm-req-outcome"><span class="pill money">✓ Yanıtlandı</span>`
          + ((req.messages || []).filter(m => m.from === "me").slice(-1)[0] ? `<span class="muted">Sen: ${U.escape(String((req.messages.filter(m => m.from === "me").slice(-1)[0] || {}).text || "").slice(0, 40))}</span>` : "")
          + `</div>`
        : "";
      return `<div class="dm-req external k-${kind}">
        <div class="dm-req-head">${K.ui.artistAvatar ? K.ui.artistAvatar(id, 44, true) : K.ui.avatar(s.stageName || "?", 44, true)}
          <div class="grow"><div class="nm">${U.escape(s.stageName || "?")} <span class="dm-role-badge">${icon} ${U.escape(label)}</span></div>
          <div class="last">${U.escape(String(last.text || "").slice(0, 80))}</div></div>
        </div>
        ${req.handled ? outcome : `<div class="dm-req-actions">${opts}</div>`}
        ${!req.handled && dl != null ? `<div class="of-deadline ${dl <= 1 ? "urgent" : ""}">⏳ ${dl} gün içinde yanıtla</div>` : ""}
      </div>`;
    },

    /* ---------------- GRUP SOHBETLERİ ---------------- */
    groupsHTML() {
      const s = K.state;
      K.relations.ensureGroups();
      const list = Object.values(s.groups || {}).sort((a, b) => (b.lastDay || 0) - (a.lastDay || 0));
      const body = list.length
        ? list.map(g => {
            const last = g.messages[g.messages.length - 1];
            const names = (g.members || []).map(id => (K.artistById(id) || {}).stageName).filter(Boolean);
            return `<div class="dm-list-row" data-pact="open-group" data-arg="${g.id}">
              <div class="dm-grp-ic">👥</div>
              <div class="grow">
                <div class="nm">${U.escape(g.name)}</div>
                <div class="last">${last ? U.escape((last.from === "me" ? "Sen: " : (last.fromName ? last.fromName + ": " : "")) + String(last.text || "").slice(0, 40)) : (names.length + " üye")}</div>
              </div>
              ${g.unread ? `<div class="dm-unread">${g.unread}</div>` : ""}
            </div>`;
          }).join("")
        : `<div class="empty-note"><b>Grup yok</b>Şirket kurduğunda kadro grubu otomatik açılır; ortak projede de grup oluşur.</div>`;

      return body + `<div class="dm-grp-new">
        <button class="btn btn-sm btn-ghost" data-pact="grp-create-roster">👥 Kadro grubu oluştur</button>
      </div>`;
    },

    groupView(groupId) {
      const M = K.phone.appById("messages");
      const g = K.group(groupId);
      if (!g) return { title: "Grup", render: () => "<div class='empty-note'>Grup bulunamadı.</div>" };
      g.unread = 0;
      return {
        title: g.name, sub: (g.members || []).length + " üye", shellClass: "app-messages",
        params: { groupId },
        composer: `<div class="dm-composer"><input type="text" data-grp-input placeholder="Gruba yaz..." /><button class="dm-send" data-pact="grp-send">↑</button></div>`,
        render: () => {
          const names = (g.members || []).map(id => (K.artistById(id) || {}).stageName).filter(Boolean).join(" · ");
          return `<div class="dm-grp-members">👥 ${U.escape(names || "üye yok")}</div>`
            + `<div class="dm-thread">${(g.messages || []).map(m => {
              const mine = m.from === "me";
              const who = K.artistById(m.from);
              return `<div class="dm-bubble ${mine ? "me" : "them"}">
                ${!mine ? `<span class="dm-grp-who">${U.escape((who || {}).stageName || m.fromName || "?")}</span>` : ""}
                ${U.escape(m.text)}
                <span class="dm-day">Gün ${m.day}</span>
              </div>`;
            }).join("") || `<div class="dm-system">Grup boş. Bir şey yaz.</div>`}</div>`;
        },
        onMount: (vp) => {
          const inp = U.qs("[data-grp-input]", vp);
          if (inp) {
            inp.addEventListener("keydown", (e) => {
              if (e.key === "Enter") { M._grpSend(groupId, inp.value); inp.value = ""; }
            });
          }
          const body = U.qs(".app-body", vp);
          if (body) setTimeout(() => { body.scrollTop = body.scrollHeight; }, 50);
        },
        onAction: (act) => {
          if (act === "grp-send") {
            const inp = U.qs("[data-grp-input]");
            if (inp) { M._grpSend(groupId, inp.value); inp.value = ""; }
          }
        }
      };
    },

    _grpSend(groupId, text) {
      text = String(text || "").trim();
      if (!text) return;
      K.groupPost(groupId, "me", text);
      K.phone.reRender();
      /* bir üye kısa süre sonra cevap verebilir */
      const g = K.group(groupId);
      const members = (g.members || []).filter(id => K.artistById(id));
      if (members.length && Math.random() < 0.45) {
        const who = members[Math.floor(Math.random() * members.length)];
        const a = K.artistById(who);
        setTimeout(() => {
          K.groupPost(groupId, who, K.relations.groupLine(a, g.kind), { fromName: a.stageName });
          if (K.phone.appById("messages")) K.phone.reRender();
        }, 900 + Math.random() * 1200);
      }
    },

    /* ---------------- teklifler ---------------- */
    offersHTML() {
      const pending = K.state.offers.filter(o => o.status === "pending");
      const past = K.state.offers.filter(o => o.status !== "pending").slice(-6);
      if (!pending.length && !past.length) return `<div class="empty-note"><b>Teklif yok</b>Samimiyet arttıkça feature, hangout ve şirket teklifleri gelir.</div>`;
      return `
        ${pending.length ? `<div class="sp-section-title">Bekleyen Teklifler</div>${pending.map(o => offerCard(o)).join("")}` : ""}
        ${past.length ? `<div class="sp-section-title" style="margin-top:6px">Geçmiş</div>${past.map(o => offerCard(o)).join("")}` : ""}`;
    },

    /* ---------------- yeni DM ---------------- */
    newDMHTML() {
      const contacts = (K.contacts && K.contacts.list) ? K.contacts.list() : [];
      const list = K.artistList().slice().sort((a, b) => b.popularity - a.popularity);
      const contactRow = c => {
        const rel = K.relation(c.id);
        return `<div class="dm-select-row" data-pact="open-thread" data-arg="${c.id}">
          ${K.ui.avatar(c.stageName, 44, true)}
          <div class="grow">
            <div class="p-title">${U.escape(c.stageName)} <span class="dm-role-badge">${c.roleIcon || ""} ${U.escape(c.roleLabel || "")}</span></div>
            <div class="p-sub">${U.escape(c.semt || c.city || "")} · ${(rel.met || rel.discovered) ? U.escape(K.stageFor(rel.affinity).label) : "tanıdık"}</div>
          </div>
          <span style="color:var(--text-3)">›</span>
        </div>`;
      };
      return `
        ${contacts.length ? `<div class="sp-section-title">Mahalle / Semt Çevren</div>${contacts.map(contactRow).join("")}` : ""}
        <div class="sp-section-title" style="margin-top:8px">Sanatçılar (ulaşmak zor)</div>
        ${list.map(a => {
          const rel = K.relation(a.id);
          return `<div class="dm-select-row" data-pact="open-thread" data-arg="${a.id}">
            ${K.ui.avatar(a.stageName, 44, true)}
            <div class="grow">
              <div class="p-title">${U.escape(a.stageName)}</div>
              <div class="p-sub">${U.compact(a.monthly)} dinleyici · ${(rel.met || rel.discovered) ? U.escape(K.stageFor(rel.affinity).label) : "tanımıyorsun"}</div>
            </div>
            <span style="color:var(--text-3)">›</span>
          </div>`;
        }).join("")}`;
    },

    collabPrompt(artistId) {
      const a = K.artistById(artistId);
      const body = K.ui.field("Proje adı", `<input id="cp-title" value="Ortak Proje: ${U.escape(a.stageName)}" />`) +
        `<div style="font-size:11.5px;color:var(--text-2);line-height:1.6">Bütçe ${U.money(60000)}. Kabul ederse ${U.escape(a.stageName)} ile ortak EP (4 track) yayın sırasına eklenir.</div>`;
      K.ui.modal({
        title: "Ortak Proje", desc: a.stageName + " ile EP düzeyinde iş birliği",
        body,
        actions: [
          { label: "Vazgeç" },
          { label: "Teklif Et", cls: "btn-primary", onClick: () => {
            K.relations.proposeCollabProject(artistId, U.qs("#cp-title").value.trim());
            K.phone.reRender();
          }}
        ]
      });
    },

    /* ---------------- sohbet ---------------- */
    conversation(artistId) {
      const a = K.artistById(artistId);
      if (!a) return { title: "Hata", render: () => "Sanatçı bulunamadı" };
      K.relations.markRead(artistId);
      const rel = K.relation(artistId);
      rel.met = true; rel.discovered = true;

      const canHangout = K.relations.canHangout(artistId);
      const canFeature = K.relations.canProposeFeature(artistId);
      const hasLabel = K.label.hasLabel();
      const stage = K.stageIndexFor(rel.affinity);

      return {
        title: a.stageName,
        sub: K.stageFor(rel.affinity).label,
        shellClass: "app-messages",
        noAutoRefresh: true,   // sohbet kendi izleyicisiyle güncellenir (zıplama/titreme yok)
        params: { artistId },
        composer: `<div class="dm-composer">
          <button class="dm-attach" data-pact="attach" title="Ekler">＋</button>
          <input type="text" data-dm-input placeholder="Mesaj yaz..." />
          <button class="dm-send" data-pact="send">↑</button>
        </div>`,
        render: () => {
          const appR = K.phone.appById("messages");
          const th = K.thread(artistId);
          const offers = K.state.offers.filter(o => o.artistId === artistId && (o.status === "pending" || (K.state.day - o.day < 4)));
          /* v10.12 — mesaj türleri (sesli / medya / demo) + emoji tepkisi */
          const msgs = th.messages.map(m => {
            if (m.type === "system") return `<div class="dm-system">${U.escape(m.text)}</div>`;
            const status = m.from === "me"
              ? `<span class="dm-status ${m.seen ? "seen" : ""}">${m.seen ? "✓✓ Görüldü" : "✓ İletildi"}</span>`
              : "";
            const quote = m.replyTo ? `<div class="dm-reply-quote">↩ ${U.escape(m.replyTo)}</div>` : "";
            const tap = ` data-pact="msg-actions" data-arg="${m.id}"`;

            let inner = U.escape(m.text);
            if (m.kind === "voice") {
              const sec = m.voiceSeconds || 0;
              inner = `<span class="dm-voice"><i class="dvv">▶</i>`
                + `<span class="dvv-bars">${Array.from({ length: 14 }, () => `<b style="height:${4 + Math.round(Math.random() * 12)}px"></b>`).join("")}</span>`
                + `<span class="dvv-t">${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}</span></span>`
                + `<span class="dvv-tx">${U.escape(m.text)}</span>`;
            } else if (m.kind === "media" || m.kind === "demo") {
              inner = `<span class="dm-media">`
                + (m.art ? `<span class="dmm-art" style="background-image:url('${m.art}')"></span>` : `<span class="dmm-art dmm-ph">🎵</span>`)
                + `<span class="dmm-info"><b>${U.escape(m.songTitle || m.text || "")}</b>`
                + `<i>${m.kind === "demo" ? "Demo gönderildi" : "Şarkı paylaşıldı"}</i></span></span>`;
            }

            const react = m.reaction ? `<span class="dm-react">${m.reaction}</span>` : "";
            return `<div class="dm-bubble ${m.from === "me" ? "me" : "them"} ${m.kind || ""}"${tap}>
              ${quote}${inner}<span class="dm-day">${status} Gün ${m.day}</span>${react}
            </div>`;
          }).join("");
          const typing = rel._typing ? `<div class="dm-bubble them typing"><i></i><i></i><i></i></div>` : "";

          // sadece MEKANİK aksiyonlar — sohbet kutucukları yok, kendin yazıyorsun
          const acts = [];
          acts.push(`<button class="dm-chip" data-pact="gift">🎁 Hediye (${U.money(K.ECON.giftCost)})</button>`);
          if (canHangout) acts.push(`<button class="dm-chip gold" data-pact="hangout">🎉 Hangout Teklif Et</button>`);
          if (canFeature) acts.push(`<button class="dm-chip gold" data-pact="feature">🎵 Feature Teklif Et</button>`);
          if (K.relations.canCollabProject(artistId)) acts.push(`<button class="dm-chip gold" data-pact="collab">🎤 Ortak Proje (EP)</button>`);
          if (hasLabel && stage >= 5) acts.push(`<button class="dm-chip gold" data-pact="contract">🏢 Şirket Teklifi</button>`);

          const reach = K.relations.reach(artistId);
          const reachCls = reach >= 0.45 ? "money" : reach >= 0.2 ? "gold" : "hot";

          return `
            ${K.ui.affinityBar(artistId)}
            <div class="dm-reach">
              <span>Cevap alma şansın: <b class="pill ${reachCls}">${U.escape(K.relations.reachLabel(artistId))}</b></span>
              <span class="muted">${rel.met ? "seni tanıyor" : "seni henüz tanımıyor"} · ${U.compact(a.monthly)} dinleyici</span>
            </div>
            <div class="dm-thread">
              ${msgs || `<div class="dm-system">${U.escape(a.stageName)} ile henüz konuşmadınız. İlk mesajı sen at — cevap gelmeyebilir.</div>`}
              ${typing}
              ${offers.map(o => offerCard(o)).join("")}
            </div>
            ${appR._reply && appR._reply.artistId === artistId ? `<div class="dm-reply-bar">↩ <b>${U.escape(a.stageName)}</b>: ${U.escape(appR._reply.text.slice(0, 44))} <button data-pact="reply-cancel">✕</button></div>` : ""}
            <div style="margin-top:auto;padding-top:12px">
              <div style="font-size:10.5px;color:var(--text-3);margin-bottom:6px">Aksiyonlar (mekanik) · serbest yazışma için alttaki kutuyu kullan</div>
              <div class="dm-quick">${acts.join("")}</div>
            </div>`;
        },
        onMountFull: (vp) => {
          const app2 = K.phone.appById("messages");
          const input = U.qs("[data-dm-input]", vp);
          if (input) {
            const drafts = app2._drafts = app2._drafts || {};
            if (drafts[artistId]) input.value = drafts[artistId];
            input.addEventListener("input", () => { drafts[artistId] = input.value; });
            input.addEventListener("focus", () => { app2._focusDm = artistId; });
            input.addEventListener("keydown", e => {
              if (e.key === "Enter") { app2.send(artistId, input.value); input.value = ""; }
            });
            if (app2._focusDm === artistId) { try { input.focus(); } catch (e) {} }
          }
          // SOHBET ZIPLAMA FIX: yeniden render sonrası en alta kaydır (en üste değil)
          const body = U.qs(".app-body", vp) || U.qs("#phone-viewport .app-body");
          if (body) {
            const toBottom = () => { body.scrollTop = body.scrollHeight; };
            toBottom();
            if (window.requestAnimationFrame) window.requestAnimationFrame(toBottom);
            setTimeout(toBottom, 60);
          }
          // gelen mesajları izle (yalnızca DEĞİŞİNCE yeniden çiz)
          app2._watch(artistId);
        },
        onAction: (act, el) => {
          const app = K.phone.appById("messages");
          if (act === "send") {
            const input = U.qs("[data-dm-input]");
            if (input) { app.send(artistId, input.value); input.value = ""; }
          }
          else if (act === "quick") app.quick(artistId, el.dataset.arg);
          else if (act === "gift") { K.relations.sendGift(artistId); K.phone.reRender(); }
          else if (act === "hangout") { K.relations.hangout(artistId); K.phone.reRender(); }
          else if (act === "feature") app.featurePrompt(artistId);
          else if (act === "collab") app.collabPrompt(artistId);
          else if (act === "contract") K.careerUI.openContractModal(artistId);
          else if (act === "msg-actions") {
            const m = K.thread(artistId).messages.find(x => x.id === el.dataset.arg);
            if (!m) return;
            const REACTS = ["❤️", "🔥", "😂", "👍", "😮"];
            K.ui.actionSheet("Mesaj", []
              .concat(REACTS.map(em => ({
                label: em + " Tepki ver",
                onClick: () => { K.relations.reactToMessage(artistId, m.id, em); K.phone.reRender(); }
              })))
              .concat([
                { label: "↩ Yanıtla", onClick: () => { app._reply = { artistId, msgId: m.id, text: m.text }; K.phone.reRender(); } },
                { label: "📋 Kopyala", onClick: () => K.toast("📋 Kopyalandı", "", "ok") }
              ]));
          }
          else if (act === "attach") app.attachSheet(artistId);
          else if (act === "send-demo") app.demoPicker(artistId);
          else if (act === "send-media") app.mediaPicker(artistId);
          else if (act === "send-voice") app.voicePicker(artistId);
          else if (act === "reply-cancel") { app._reply = null; K.phone.reRender(); }
          else if (act === "offer-accept") { K.relations.respondOffer(el.dataset.arg, true); K.phone.reRender(); }
          else if (act === "offer-decline") { K.relations.respondOffer(el.dataset.arg, false); K.phone.reRender(); }
        }
      };
    },

    /* ---------------- ekler: demo / medya / sesli mesaj ---------------- */
    attachSheet(artistId) {
      const pending = K.relations.demoStatus().filter(x => !x.done).length;
      K.ui.actionSheet("Ne göndermek istersin?", [
        { label: "🎧 Demo gönder", onClick: () => K.phone.appById("messages").demoPicker(artistId) },
        { label: "📊 Demo takibi" + (pending ? " (" + pending + " bekliyor)" : ""), onClick: () => K.phone.appById("messages").demoTrack() },
        { label: "🖼️ Şarkı/kapak paylaş", onClick: () => K.phone.appById("messages").mediaPicker(artistId) },
        { label: "🎤 Sesli mesaj", onClick: () => K.phone.appById("messages").voicePicker(artistId) }
      ]);
    },

    demoPicker(artistId) {
      const songs = K.state.player.songs || [];
      if (!songs.length) { K.toast("Şarkın yok", "Önce bir şarkı yayınla.", "warn"); return; }
      const a = K.artistById(artistId) || {};
      const ear = K.relations.demoEar(artistId);
      const cold = K.relations.demoCooldown(artistId);
      const rejects = K.relation(artistId).demoRejects || 0;

      const warn = cold > 0
        ? `<div class="dm-hint warn">🧊 <b>${U.escape(a.stageName)}</b> şu an demoya kapalı — son redden sonra <b>${cold} gün</b> beklemek istiyor. Yine de gönderebilirsin ama bakma ihtimali çok düşük.</div>`
        : (rejects > 0 ? `<div class="dm-hint warn">⚠️ Bu sanatçıya <b>${rejects}</b> kez red yedin. Bar yükseldi, bir süre daha temkinli.</div>` : "");

      K.phone.pushView({
        title: "Demo gönder", sub: "Kime: " + (a.stageName || ""), shellClass: "app-messages",
        render: () => `
          <div class="dm-hint">🎧 <b>${U.escape(a.stageName)}</b> demoda <b>${U.escape(ear.why)}</b> arıyor. Beğenme barı <b>${ear.bar}/100</b>.</div>
          ${warn}
          <div class="dm-sec">Şarkıların — ${U.escape(ear.label)} puanına göre</div>
          ${songs.slice().reverse().map(sg => {
            const sc = K.relations.demoScore(sg, ear);
            const ok = sc >= ear.bar;
            const tone = sc >= ear.bar + 12 ? "money" : ok ? "gold" : "hot";
            return `<div class="p-row" data-pact="demo-send" data-arg="${sg.id}|${artistId}">
              ${K.ui.cover(sg.coverSeed || sg.id, "🎧", 46, sg.art)}
              <div class="grow"><div class="p-title">${U.escape(sg.title)}</div>
              <div class="p-sub">${U.escape(ear.label)} <b class="pill ${tone}" style="font-size:9px">${sc}</b> / bar ${ear.bar} · genel ${Math.round(sg.quality || 0)}</div></div>
              <span style="color:var(--text-3)">›</span>
            </div>`;
          }).join("")}`,
        onAction: (act, el) => {
          if (act !== "demo-send") return;
          const parts = String(el.dataset.arg).split("|");
          const res = K.relations.sendDemo(parts[1], parts[0]);
          if (!res.ok) {
            if (res.why === "tekrar") K.toast("Zaten gönderildi", "Aynı şarkıyı 10 gün içinde tekrar gönderemezsin.", "warn");
            else K.toast("Gönderilemedi", "", "warn");
            return;
          }
          K.toast("🎧 Demo gönderildi",
            `${res.ear.why} aranacak · dinlenmesi ~${res.days} gün${res.cold ? " · sanatçı soğuk" : ""}`, "ok");
          K.phone.back();
          K.phone.reRender();
        }
      });
    },

    /* ---------------- DEMO TAKİBİ ---------------- */
    demoTrack() {
      const list = K.relations.demoStatus();
      const vLabel = {
        loved: ["✅", "Beğendi", "money"],
        mixed: ["🤔", "Kararsız", "gold"],
        rejected: ["❌", "Reddetti", "hot"],
        ignored: ["📭", "Açmadı", ""]
      };
      K.phone.pushView({
        title: "Demo takibi", sub: list.filter(x => !x.done).length + " bekleyen", shellClass: "app-messages",
        render: () => {
          if (!list.length) return `<div class="empty-note"><b>Demo yok</b>Bir sanatçının sohbetinde ＋ → 🎧 Demo gönder ile başla.</div>`;
          return `<div class="dm-hint">Her sanatçı demoda farklı şeye bakar. Gönderdiğin şarkının o ölçütteki puanı sonucu belirler.</div>`
            + list.map(x => {
              const v = x.verdict ? vLabel[x.verdict] : null;
              return `<div class="dm-demo-card">
                <div class="ddc-top">
                  <div class="grow"><div class="ddc-title">${U.escape(x.title)}</div>
                  <div class="ddc-sub">${U.escape(x.artistName)} · ${U.escape(x.earWhy)} arıyor (bar ${x.bar})</div></div>
                  ${x.done && v ? `<span class="pill ${v[2]}">${v[0]} ${v[1]}</span>` : `<span class="pill">⏳ ${x.left} gün</span>`}
                </div>
                ${x.score != null ? `<div class="ddc-bar"><i style="width:${U.clamp(x.score, 0, 100)}%"></i><b style="left:${U.clamp(x.bar, 0, 100)}%"></b></div>
                  <div class="ddc-meta">${U.escape(x.earLabel)} <b>${x.score}</b> / bar ${x.bar}</div>` : `<div class="ddc-meta">Gün ${x.day} gönderildi · dinleniyor</div>`}
              </div>`;
            }).join("");
        }
      });
    },

    mediaPicker(artistId) {
      const songs = (K.state.player.songs || []).filter(s => s.art);
      if (!songs.length) { K.toast("Kapak yok", "Kapağı olan bir şarkın yok.", "warn"); return; }
      K.phone.pushView({
        title: "Şarkı paylaş", sub: "Kapağıyla birlikte gider", shellClass: "app-messages",
        render: () => songs.slice().reverse().slice(0, 12).map(sg => `<div class="p-row" data-pact="media-send" data-arg="${sg.id}|${artistId}">
            ${K.ui.cover(sg.coverSeed || sg.id, "🖼️", 46, sg.art)}
            <div class="grow"><div class="p-title">${U.escape(sg.title)}</div>
            <div class="p-sub">Albüm kapağıyla gönder</div></div>
            <span style="color:var(--text-3)">›</span>
          </div>`).join(""),
        onAction: (act, el) => {
          if (act !== "media-send") return;
          const parts = String(el.dataset.arg).split("|");
          if (K.relations.sendMedia(parts[1], parts[0])) {
            K.toast("🖼️ Paylaşıldı", "", "ok");
            K.phone.back(); K.phone.reRender();
          }
        }
      });
    },

    voicePicker(artistId) {
      /* sesli mesaj metne dökülür; sanatçı ona göre cevap verir */
      K.ui.modal({
        title: "🎤 Sesli mesaj", desc: "Kayıt metne dökülür ve gönderilir.",
        body: K.ui.field("Söyleyeceklerin", `<textarea id="dm-voice-tx" rows="3" placeholder="Kısaca ne söylüyorsun?">Selam, sesli not bırakıyorum. Yeni iş üstünde çalışıyorum, bir ara konuşalım.</textarea>`),
        actions: [
          { label: "Vazgeç" },
          { label: "Gönder", cls: "btn-primary", onClick: () => {
            const tx = (U.qs("#dm-voice-tx") || {}).value || "";
            if (!tx.trim()) { K.toast("Boş mesaj", "", "warn"); return; }
            const sec = Math.max(4, Math.min(60, Math.round(tx.length / 12) + 3));
            K.relations.sendVoice(artistId, sec, tx.trim());
            K.toast("🎤 Sesli mesaj", sec + " sn gönderildi.", "ok");
            K.phone.reRender();
          } }
        ]
      });
    },

    send(artistId, text) {
      text = (text || "").trim();
      if (!text) return;
      const app = K.phone.appById("messages");
      if (app._drafts) delete app._drafts[artistId];
      app._focusDm = artistId;
      const replyTo = (app._reply && app._reply.artistId === artistId) ? app._reply.text.slice(0, 60) : null;
      app._reply = null;
      K.relations.sendMessage(artistId, text, replyTo ? { replyTo } : null);
      K.phone.reRender();
      app._watch(artistId);
    },

    /* thread imzası: mesaj sayısı + son mesaj id */
    _sig(artistId) {
      const th = K.thread(artistId);
      const msgs = th.messages || [];
      const m = msgs[msgs.length - 1];
      return msgs.length + "|" + (m ? m.id : "") + "|" + (th.unread || 0) + "|" + (K.relation(artistId)._typing ? 1 : 0);
    },

    /* sohbeti izle — SADECE değişince yeniden çiz (titreme/zıplama fix) */
    _watch(artistId) {
      const app = K.phone.appById("messages");
      if (app._watchTimer) { clearInterval(app._watchTimer); app._watchTimer = null; }
      app._lastSig = app._sig(artistId);
      const started = Date.now();
      let stableTicks = 0;
      app._watchTimer = setInterval(() => {
        const v = K.phone.views[K.phone.views.length - 1];
        const here = v && v.params && v.params.artistId === artistId;
        if (!here) { clearInterval(app._watchTimer); app._watchTimer = null; return; }
        const sig = app._sig(artistId);
        if (sig !== app._lastSig) {
          app._lastSig = sig;
          stableTicks = 0;
          K.relations.markRead(artistId);
          K.phone.reRender();
        } else {
          stableTicks++;
        }
        if (Date.now() - started > 15000 || stableTicks >= 8) {
          clearInterval(app._watchTimer); app._watchTimer = null;
        }
      }, 500);
    },

    quick(artistId, kind) {
      const map = {
        selam: "Selam, nasılsın? Uzun zamandır görmüyorum, işler nasıl?",
        is: "Yeni işler ne durumda? Bir şeyler çıkarıyor musun?",
        calis: "Beraber bir şey yapmak isterim, uygun olduğunda konuşalım."
      };
      K.phone.appById("messages").send(artistId, map[kind] || kind);
    },

    featurePrompt(artistId) {
      const a = K.artistById(artistId);
      const body = K.ui.field("Ortak şarkı adı önerisi", `<input id="ft-title" value="${U.escape(K.career.suggestTitle() + " (feat. " + a.stageName + ")")}" />`) +
        `<div style="font-size:11.5px;color:var(--text-2);line-height:1.6">Stüdyo masrafı ${U.money(15000)}. ${U.escape(a.stageName)} kabul ederse şarkı yayın sırasına eklenir.</div>`;
      K.ui.modal({
        title: "Feature Teklifi", desc: a.stageName + " ile ortak şarkı",
        body,
        actions: [
          { label: "Vazgeç" },
          { label: "Teklif Et", cls: "btn-primary", onClick: () => {
            K.relations.proposeFeature(artistId, U.qs("#ft-title").value.trim());
            K.phone.reRender();
          }}
        ]
      });
    }
  });
})(window.K);
