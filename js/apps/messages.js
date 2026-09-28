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
    return `<div class="dm-offer ${offer.type}">
      <div class="of-tag">${tag}</div>
      <div class="of-title">${U.escape(title)}</div>
      <div class="of-desc">${U.escape(desc)}</div>
      <div class="of-terms">${U.escape(terms)}</div>
      ${pending ? `<div class="of-actions">
        <button class="btn btn-sm btn-primary" data-pact="offer-accept" data-arg="${offer.id}">Kabul Et</button>
        <button class="btn btn-sm btn-ghost" data-pact="offer-decline" data-arg="${offer.id}">Reddet</button>
      </div>` : `<div style="margin-top:8px"><span class="pill ${offer.status === "accepted" ? "money" : "hot"}">${offer.status === "accepted" ? "✓ Kabul edildi" : "✕ Reddedildi"}</span></div>`}
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
          { id: "all", label: "Tümü", icon: "💬" },
          { id: "offers", label: (() => { const n = K.state.offers.filter(o => o.status === "pending").length; return n ? ("Teklifler (" + n + ")") : "Teklifler"; })(), icon: "📨" },
          { id: "new", label: "Yeni DM", icon: "✏️" }
        ],
        activeTab: params.tab || "all",
        render: (tab) => {
          if (tab === "all") return K.phone.appById("messages").listHTML();
          if (tab === "offers") return K.phone.appById("messages").offersHTML();
          return K.phone.appById("messages").newDMHTML();
        },
        onAction: (act, el) => {
          if (act === "open-thread") K.phone.pushView(K.phone.appById("messages").conversation(el.dataset.arg));
          else if (act === "offer-accept") { K.relations.respondOffer(el.dataset.arg, true); K.phone.reRender(); }
          else if (act === "offer-decline") { K.relations.respondOffer(el.dataset.arg, false); K.phone.reRender(); }
        }
      };
      return view;
    },

    /* ---------------- sohbet listesi ---------------- */
    listHTML() {
      const s = K.state;
      const ids = Object.keys(s.threads).filter(id => (s.threads[id].messages || []).length > 0);
      if (!ids.length) return `<div class="empty-note"><b>Mesaj yok</b>Mahalle çevren ve sanatçılar sana yazdığında burada görünür. "Yeni DM" ile sen de başlatabilirsin.</div>`;

      const sorted = ids.sort((a, b) => {
        const ta = s.threads[a], tb = s.threads[b];
        return (tb.messages[tb.messages.length - 1]?.day || 0) - (ta.messages[ta.messages.length - 1]?.day || 0);
      });

      return sorted.map(id => {
        const a = K.artistById(id);
        if (!a) return "";
        const th = s.threads[id];
        const last = th.messages[th.messages.length - 1];
        const rel = K.relation(id);
        const stage = K.stageFor(rel.affinity);
        const preview = last ? (last.from === "me" ? "Sen: " : "") + last.text : "";
        return `<div class="dm-list-row" data-pact="open-thread" data-arg="${id}">
          ${K.ui.avatar(a.stageName, 50, true)}
          <div class="grow">
            <div class="nm">${U.escape(a.stageName)}</div>
            <div class="last">${U.escape(preview).slice(0, 46)}</div>
            <div style="font-size:10px;color:var(--karma-2);margin-top:2px">${U.escape(stage.label)} · ${Math.round(rel.affinity)}</div>
          </div>
          <div style="text-align:right">
            <div class="dm-time">${last ? U.ago(last.day, s.day) : ""}</div>
            ${th.unread ? `<div class="dm-unread" style="margin-top:4px">${th.unread}</div>` : ""}
          </div>
        </div>`;
      }).join("");
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
          <input type="text" data-dm-input placeholder="Mesaj yaz..." />
          <button class="dm-send" data-pact="send">↑</button>
        </div>`,
        render: () => {
          const appR = K.phone.appById("messages");
          const th = K.thread(artistId);
          const offers = K.state.offers.filter(o => o.artistId === artistId && (o.status === "pending" || (K.state.day - o.day < 4)));
          const msgs = th.messages.map(m => {
            if (m.type === "system") return `<div class="dm-system">${U.escape(m.text)}</div>`;
            const status = m.from === "me"
              ? `<span class="dm-status ${m.seen ? "seen" : ""}">${m.seen ? "✓✓ Görüldü" : "✓ İletildi"}</span>`
              : "";
            const quote = m.replyTo ? `<div class="dm-reply-quote">↩ ${U.escape(m.replyTo)}</div>` : "";
            const tap = m.from === "them" ? ` data-pact="msg-actions" data-arg="${m.id}"` : "";
            return `<div class="dm-bubble ${m.from === "me" ? "me" : "them"}"${tap}>
              ${quote}
              ${U.escape(m.text)}
              <span class="dm-day">${status} Gün ${m.day}</span>
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
            K.ui.actionSheet("Mesaj", [
              { label: "↩ Yanıtla", onClick: () => { app._reply = { artistId, msgId: m.id, text: m.text }; K.phone.reRender(); } },
              { label: "📋 Kopyala", onClick: () => K.toast("📋 Kopyalandı", "", "ok") },
              { label: "✕ Kapat", onClick: () => {} }
            ]);
          }
          else if (act === "reply-cancel") { app._reply = null; K.phone.reRender(); }
          else if (act === "offer-accept") { K.relations.respondOffer(el.dataset.arg, true); K.phone.reRender(); }
          else if (act === "offer-decline") { K.relations.respondOffer(el.dataset.arg, false); K.phone.reRender(); }
        }
      };
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
