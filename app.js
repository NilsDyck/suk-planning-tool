/* ═══════════════════════════════════════════
   SUK-Planungstool – App Logic (Server-based)
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  const ADMIN_PASSWORD = "Passwort";
  const GROUP_PASSWORD = "img";

  const LEARNING_OBJECTIVES = [
    { name: "Akteure analysieren", index: 1, color: "border-1" },
    { name: "Relevante Ziele, Werte und Konflikte identifizieren", index: 2, color: "border-2" },
    { name: "Nutzungs- und Gestaltungsoptionen generieren", index: 3, color: "border-3" },
    { name: "Optionen bewerten", index: 4, color: "border-4" },
    { name: "Unsicherheiten reflektieren", index: 5, color: "border-5" },
  ];

  let currentGroup = null;
  let cardCounter = 0;
  let draggedCardEl = null;
  let isAdmin = false;
  let isGroupUnlocked = false;
  let saveTimeout = null;
  let pollingInterval = null;
  let hasLocalChanges = false;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const pageStart = $("#page-start");
  const pagePlanning = $("#page-planning");
  const cardsContainer = $("#cards-container");
  const problemDesc = $("#problem-desc");
  const groupBadgeNum = $("#group-badge-num");
  const statusIndicator = $("#status-indicator");

  /* ═══════════════════════════════════════════
     API Helper
     ═══════════════════════════════════════════ */

  async function apiFetch(url, options) {
    try {
      const resp = await fetch(url, options);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return resp.json();
    } catch (err) {
      console.error("API Error:", err);
      return null;
    }
  }

  async function apiLoadGroup(group) {
    return apiFetch("/api/groups/" + group, { method: "GET" });
  }

  async function apiSaveGroup(group, data) {
    return apiFetch("/api/groups/" + group, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function apiLoadAllGroups() {
    return apiFetch("/api/groups/all", { method: "GET" });
  }

  async function apiDeleteGroup(group) {
    return apiFetch("/api/groups/" + group, { method: "DELETE" });
  }

  async function apiDeleteAllGroups() {
    return apiFetch("/api/groups/all", { method: "DELETE" });
  }

  /* ═══════════════════════════════════════════
     Status Indicator
     ═══════════════════════════════════════════ */

  function setStatus(state) {
    if (!statusIndicator) return;
    switch (state) {
      case "syncing":
        statusIndicator.textContent = "⏳ Synchronisiere\u2026";
        statusIndicator.style.color = "#eab308";
        break;
      case "synced":
        statusIndicator.textContent = "\u2713 Gespeichert";
        statusIndicator.style.color = "#22c55e";
        break;
      case "error":
        statusIndicator.textContent = "\u2717 Fehler";
        statusIndicator.style.color = "#ef4444";
        break;
      case "offline":
        statusIndicator.textContent = " offline";
        statusIndicator.style.color = "#6b7280";
        break;
    }
  }

  /* ═══════════════════════════════════════════
     PAGE NAVIGATION
     ═══════════════════════════════════════════ */

  function showPage(page) {
    pageStart.classList.toggle("hidden", page !== "start");
    pagePlanning.classList.toggle("hidden", page !== "planning");
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  function startPolling(group) {
    stopPolling();
    pollingInterval = setInterval(async () => {
      if (!currentGroup || hasLocalChanges) return;
      try {
        const data = await apiLoadGroup(group);
        if (data && data.cards) {
          restoreState(data);
          setStatus("synced");
        }
      } catch (_) { /* ignore */ }
    }, 3000);
  }

  function goToStart() {
    forceSave();
    stopPolling();
    currentGroup = null;
    hasLocalChanges = false;
    setStatus("offline");
    showPage("start");
  }

  function tryGroupUnlock() {
    const pw = $("#group-password").value;
    const errorSpan = $("#group-password-error");
    const grid = $("#group-grid");

    if (pw === GROUP_PASSWORD) {
      isGroupUnlocked = true;
      grid.classList.remove("hidden");
      errorSpan.textContent = "";
    } else {
      errorSpan.textContent = "Falsches Passwort";
    }
  }

  function goToPlanning(group) {
    if (!isGroupUnlocked) return;
    currentGroup = group;
    groupBadgeNum.textContent = group;
    showPage("planning");
    hasLocalChanges = false;

    apiLoadGroup(group).then((data) => {
      if (data && data.cards) {
        restoreState(data);
      } else {
        cardsContainer.innerHTML = "";
        cardCounter = 0;
        createCard();
      }
      startPolling(group);
      setStatus("synced");
    }).catch(() => {
      cardsContainer.innerHTML = "";
      cardCounter = 0;
      createCard();
      setStatus("error");
    });
  }

  /* ═══════════════════════════════════════════
     START PAGE – Group grid
     ═══════════════════════════════════════════ */

  function buildGroupGrid() {
    const grid = $("#group-grid");
    for (let i = 1; i <= 8; i++) {
      const btn = document.createElement("button");
      btn.className = "group-btn";
      btn.textContent = "Gruppe " + i;
      btn.addEventListener("click", () => goToPlanning(i));
      grid.appendChild(btn);
    }
  }

  /* ═══════════════════════════════════════════
     ADMIN MODE
     ═══════════════════════════════════════════ */

  function setupAdmin() {
    const toggle = $("#btn-admin-toggle");
    const panel = $("#admin-panel");
    const loginBtn = $("#btn-admin-login");
    const passwordInput = $("#admin-password");
    const errorSpan = $("#admin-error");
    const authDiv = $(".admin-auth");
    const actionsDiv = $("#admin-actions");

    toggle.addEventListener("click", () => {
      panel.classList.toggle("hidden");
    });

    loginBtn.addEventListener("click", () => {
      if (passwordInput.value === ADMIN_PASSWORD) {
        isAdmin = true;
        authDiv.classList.add("hidden");
        actionsDiv.classList.remove("hidden");
        errorSpan.textContent = "";
        toggle.textContent = "Admin (aktiv)";
        toggle.style.color = "#10b981";
        toggle.style.borderColor = "#10b981";
      } else {
        errorSpan.textContent = "Falsches Passwort";
      }
    });

    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loginBtn.click();
    });

    $("#btn-admin-save-all").addEventListener("click", adminSaveAll);
    $("#btn-admin-pdf-all").addEventListener("click", adminPdfAll);
    $("#btn-admin-clear-all").addEventListener("click", adminClearAll);
  }

  async function adminSaveAll() {
    const all = await apiLoadAllGroups();
    const date = new Date().toISOString().slice(0, 10);

    /* Build combined object – ALL groups 1-8, even empty ones */
    const combined = {
      version: 1,
      exportedAt: new Date().toISOString(),
      groups: {},
    };

    for (let g = 1; g <= 8; g++) {
      combined.groups[g] = all && all[g] ? { ...all[g], group: g } : {
        group: g,
        problem: "",
        grades: [],
        cards: [],
      };
    }

    const blob = new Blob([JSON.stringify(combined, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suk-planung-alle-gruppen-" + date + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function adminPdfAll() {
    apiLoadAllGroups().then((all) => {
      /* Build array of ALL 8 groups, even empty ones */
      const fullAll = {};
      for (let g = 1; g <= 8; g++) {
        fullAll[g] = all && all[g] ? { ...all[g], group: g } : {
          group: g,
          problem: "",
          grades: [],
          cards: [],
        };
      }
      buildAdminPrintContent(fullAll);
      $("#print-content").removeAttribute("hidden");
      setTimeout(() => window.print(), 300);
    });
  }

  async function adminClearAll() {
    if (!confirm("Wirklich alle Gruppendaten löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    await apiDeleteAllGroups();
    alert("Alle Gruppen-Daten wurden gelöscht.");
  }

  /* ═══════════════════════════════════════════
     CARD CREATION
     ═══════════════════════════════════════════ */

  function createCard(data) {
    cardCounter++;
    const id = data ? (data.id || cardCounter) : cardCounter;

    const card = document.createElement("div");
    card.className = "planning-card";
    card.setAttribute("draggable", "true");
    card.dataset.cardId = id;

    const objectives = data ? (data.objectives || []) : [];
    const otherText = data ? (data.otherText || "") : "";
    const evidence = data ? (data.evidence || "") : "";
    const activity = data ? (data.activity || "") : "";
    const showOther = objectives.includes("Andere");

    let objectivesHtml = "";
    LEARNING_OBJECTIVES.forEach((obj) => {
      const checked = objectives.includes(obj.name) ? "checked" : "";
      objectivesHtml += `
        <label>
          <input type="checkbox" name="objective" value="${obj.name}" data-idx="${obj.index}" ${checked}>
          ${obj.name}
        </label>`;
    });
    objectivesHtml += `
      <label>
        <input type="checkbox" name="objective" value="Andere" data-idx="6" ${showOther ? "checked" : ""}>
        Andere
      </label>
      <div class="obj-sonstige-wrapper ${showOther ? "visible" : ""}">
        <input type="text" class="obj-sonstige-input" placeholder="Bitte angeben\u2026" value="${escapeHtml(otherText)}">
      </div>`;

    card.innerHTML = `
      <div class="card-header">
        <h3>
          <span class="drag-handle">\u2630</span>
          Planungskarte ${id}
        </h3>
        <div class="card-header-actions">
          <button class="btn-delete" title="Karte entfernen">&times;</button>
        </div>
      </div>

      <div class="card-section">
        <h4>Lernziel</h4>
        ${objectivesHtml}
      </div>

      <div class="card-section">
        <h4>Evidenz/Produkt</h4>
        <textarea placeholder="Evidenz oder Produkt beschreiben\u2026">${escapeHtml(evidence)}</textarea>
      </div>

      <div class="card-section">
        <h4>T\u00e4tigkeit</h4>
        <textarea placeholder="T\u00e4tigkeit beschreiben\u2026">${escapeHtml(activity)}</textarea>
      </div>
    `;

    const andereCb = card.querySelector('input[value="Andere"]');
    const andereWrapper = card.querySelector(".obj-sonstige-wrapper");
    andereCb.addEventListener("change", () => {
      andereWrapper.classList.toggle("visible", andereCb.checked);
      updateCardBorderColor(card);
      markLocalChange();
    });

    card.querySelectorAll('input[name="objective"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        updateCardBorderColor(card);
        markLocalChange();
      });
    });

    card.querySelectorAll("textarea, .obj-sonstige-input").forEach((el) => {
      el.addEventListener("input", () => markLocalChange());
    });

    card.addEventListener("dragstart", onDragStart);
    card.addEventListener("dragend", onDragEnd);
    card.addEventListener("dragover", onDragOver);
    card.addEventListener("dragenter", onDragEnter);
    card.addEventListener("dragleave", onDragLeave);
    card.addEventListener("drop", onDrop);

    card.querySelector(".btn-delete").addEventListener("click", () => {
      card.remove();
      renumberCards();
      markLocalChange();
    });

    cardsContainer.appendChild(card);

    if (data && data.objectives) {
      updateCardBorderColor(card);
    }
  }

  /* ═══════════════════════════════════════════
     CARD BORDER COLOR
     ═══════════════════════════════════════════ */

  function updateCardBorderColor(card) {
    card.classList.remove("border-1", "border-2", "border-3", "border-4", "border-5", "border-6");

    const checkedObjs = card.querySelectorAll('input[name="objective"]:checked');
    if (checkedObjs.length === 0) return;

    for (const cb of checkedObjs) {
      const idx = parseInt(cb.dataset.idx, 10);
      if (!isNaN(idx)) {
        card.classList.add("border-" + idx);
        break;
      }
    }
  }

  /* ═══════════════════════════════════════════
     DRAG & DROP
     ═══════════════════════════════════════════ */

  function onDragStart(e) {
    draggedCardEl = this;
    this.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", this.dataset.cardId);
  }

  function onDragEnd() {
    this.classList.remove("dragging");
    $$(".planning-card").forEach((c) => c.classList.remove("drag-over"));
    draggedCardEl = null;
    renumberCards();
    markLocalChange();
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDragEnter(e) {
    e.preventDefault();
    if (this !== draggedCardEl && this.classList.contains("planning-card")) {
      this.classList.add("drag-over");
    }
  }

  function onDragLeave() {
    this.classList.remove("drag-over");
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove("drag-over");

    if (!draggedCardEl || this === draggedCardEl || !this.classList.contains("planning-card")) return;

    const cards = [...cardsContainer.children];
    const fromIdx = cards.indexOf(draggedCardEl);
    const toIdx = cards.indexOf(this);

    if (fromIdx < toIdx) {
      cardsContainer.insertBefore(draggedCardEl, this.nextSibling);
    } else {
      cardsContainer.insertBefore(draggedCardEl, this);
    }

    renumberCards();
    markLocalChange();
  }

  /* ═══════════════════════════════════════════
     RENUMBERING
     ═══════════════════════════════════════════ */

  function renumberCards() {
    const cards = cardsContainer.querySelectorAll(".planning-card");
    cards.forEach((card, i) => {
      const h3 = card.querySelector("h3");
      h3.innerHTML = '<span class="drag-handle">\u2630</span> Planungskarte ' + (i + 1);
    });
  }

  /* ═══════════════════════════════════════════
     SERIALIZATION
     ═══════════════════════════════════════════ */

  function gatherCardData() {
    const cards = cardsContainer.querySelectorAll(".planning-card");
    return Array.from(cards).map((card, i) => {
      const objectives = Array.from(
        card.querySelectorAll('input[name="objective"]:checked')
      ).map((cb) => cb.value);

      const otherWrapper = card.querySelector(".obj-sonstige-wrapper");
      const otherInput = otherWrapper ? otherWrapper.querySelector(".obj-sonstige-input") : null;
      const otherText = otherInput ? otherInput.value : "";

      const textareas = card.querySelectorAll("textarea");
      return {
        id: i + 1,
        objectives,
        otherText,
        evidence: textareas[0] ? textareas[0].value : "",
        activity: textareas[1] ? textareas[1].value : "",
      };
    });
  }

  function collectAllState() {
    const grades = Array.from(
      $$('#page-planning input[name="grade"]:checked')
    ).map((cb) => cb.value);

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      group: currentGroup,
      problem: problemDesc.value,
      grades: grades,
      cards: gatherCardData(),
    };
  }

  function restoreState(state) {
    if (!state) return;

    problemDesc.value = state.problem || "";

    $$('#page-planning input[name="grade"]').forEach((cb) => {
      cb.checked = (state.grades || []).includes(cb.value);
    });

    cardsContainer.innerHTML = "";
    cardCounter = 0;
    (state.cards || []).forEach((c) => createCard(c));
    renumberCards();
  }

  /* ═══════════════════════════════════════════
     SYNC (Server)
     ═══════════════════════════════════════════ */

  function markLocalChange() {
    hasLocalChanges = true;
    setStatus("syncing");

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const data = collectAllState();
      const result = await apiSaveGroup(currentGroup, data);
      if (result && result.ok) {
        hasLocalChanges = false;
        setStatus("synced");
      } else {
        setStatus("error");
      }
    }, 800);
  }

  function forceSave() {
    clearTimeout(saveTimeout);
    hasLocalChanges = true;
    setStatus("syncing");
    const data = collectAllState();
    apiSaveGroup(currentGroup, data).then((result) => {
      if (result && result.ok) {
        hasLocalChanges = false;
        setStatus("synced");
      } else {
        setStatus("error");
      }
    });
  }

  /* ═══════════════════════════════════════════
     SAVE / IMPORT (JSON)
     ═══════════════════════════════════════════ */

  function saveAsJSON() {
    const data = collectAllState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = "suk-planung-gruppe" + currentGroup + "-" + date + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const state = JSON.parse(e.target.result);
        restoreState(state);
        apiSaveGroup(currentGroup, collectAllState());
        setStatus("synced");
      } catch (err) {
        alert("Ung\u00fcltige JSON-Datei: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ═══════════════════════════════════════════
     PRINT / PDF
     ═══════════════════════════════════════════ */

  function exportPDF() {
    const state = collectAllState();
    buildPrintContent(state, currentGroup);
    $("#print-content").removeAttribute("hidden");
    setTimeout(() => window.print(), 300);
  }

  function cleanupPrintContent() {
    var pc = $("#print-content");
    pc.innerHTML = "";
    pc.setAttribute("hidden", "");
  }

  function buildPrintContent(state, group) {
    var printContent = $("#print-content");
    var gradesText = state.grades && state.grades.length > 0 ? state.grades.join(", ") : "nicht angegeben";

    var html = '';
    html += '<h1>SUK-Planungstool \u2013 Unterrichtsplanung</h1>';
    html += '<div class="print-meta">Gruppe ' + group + ' &middot; Jahrgangsstufe: ' + gradesText + '<br>Exportiert am: ' + new Date().toLocaleString("de-DE") + '</div>';

    if (state.problem) {
      html += '<div class="print-problem"><strong>Soziotechnisches Problem:</strong><br>' + escapeHtml(state.problem) + '</div>';
    }

    html += '<div class="print-grid">';
    (state.cards || []).forEach(function (card, i) {
      var objText = card.objectives && card.objectives.length > 0
        ? card.objectives.join("; ") + (card.otherText ? " (Andere: " + card.otherText + ")" : "")
        : "keine Auswahl";

      var borderColor = "#d1d5db";
      if (card.objectives && card.objectives.length > 0) {
        var first = card.objectives[0];
        if (first === "Akteure analysieren") borderColor = "#3b82f6";
        else if (first === "Relevante Ziele, Werte und Konflikte identifizieren") borderColor = "#22c55e";
        else if (first === "Nutzungs- und Gestaltungsoptionen generieren") borderColor = "#eab308";
        else if (first === "Optionen bewerten") borderColor = "#ef4444";
        else if (first === "Unsicherheiten reflektieren") borderColor = "#a855f7";
        else if (first === "Andere") borderColor = "#6b7280";
      }

      html += '<div class="print-card" style="border-color:' + borderColor + ';">';
      html += '<h3>Planungskarte ' + (i + 1) + '</h3>';
      html += '<div class="section-label">Lernziel</div>';
      html += '<div class="section-value">' + escapeHtml(objText) + '</div>';
      html += '<div class="section-label">Evidenz/Produkt</div>';
      html += '<div class="section-value">' + (escapeHtml(card.evidence) || "\u2014") + '</div>';
      html += '<div class="section-label">T\u00e4tigkeit</div>';
      html += '<div class="section-value">' + (escapeHtml(card.activity) || "\u2014") + '</div>';
      html += '</div>';
    });
    html += '</div>';

    printContent.innerHTML = html;
  }

  function buildAdminPrintContent(allGroups) {
    var printContent = $("#print-content");
    var html = '';

    var groupKeys = Object.keys(allGroups).map(Number).sort((a, b) => a - b);

    groupKeys.forEach(function (g) {
      var state = allGroups[g];
      var gradesText = state.grades && state.grades.length > 0 ? state.grades.join(", ") : "nicht angegeben";
      var hasCards = state.cards && state.cards.length > 0;

      html += '<h1>SUK-Planungstool \u2013 Gruppe ' + g + '</h1>';
      html += '<div class="print-meta">Jahrgangsstufe: ' + gradesText + '</div>';

      if (state.problem) {
        html += '<div class="print-problem"><strong>Soziotechnisches Problem:</strong><br>' + escapeHtml(state.problem) + '</div>';
      }

      html += '<div class="print-grid">';
      var cards = Array.isArray(state.cards) ? state.cards : [];
      if (cards.length === 0 && !state.problem) {
        html += '<div style="font-size:13px;color:#6b7280;padding:20px 0;grid-column:1/-1;">Keine Daten f\u00fcr diese Gruppe vorhanden.</div>';
      }
      cards.forEach(function (card, i) {
        var objText = card.objectives && card.objectives.length > 0
          ? card.objectives.join("; ") + (card.otherText ? " (Andere: " + card.otherText + ")" : "")
          : "keine Auswahl";

        var borderColor = "#d1d5db";
        if (card.objectives && card.objectives.length > 0) {
          var first = card.objectives[0];
          if (first === "Akteure analysieren") borderColor = "#3b82f6";
          else if (first === "Relevante Ziele, Werte und Konflikte identifizieren") borderColor = "#22c55e";
          else if (first === "Nutzungs- und Gestaltungsoptionen generieren") borderColor = "#eab308";
          else if (first === "Optionen bewerten") borderColor = "#ef4444";
          else if (first === "Unsicherheiten reflektieren") borderColor = "#a855f7";
          else if (first === "Andere") borderColor = "#6b7280";
        }

        html += '<div class="print-card" style="border-color:' + borderColor + ';">';
        html += '<h3>Planungskarte ' + (i + 1) + '</h3>';
        html += '<div class="section-label">Lernziel</div>';
        html += '<div class="section-value">' + escapeHtml(objText) + '</div>';
        html += '<div class="section-label">Evidenz/Produkt</div>';
        html += '<div class="section-value">' + (escapeHtml(card.evidence) || "\u2014") + '</div>';
        html += '<div class="section-label">T\u00e4tigkeit</div>';
        html += '<div class="section-value">' + (escapeHtml(card.activity) || "\u2014") + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '<div style="page-break-before:always;"></div>';
    });

    printContent.innerHTML = html;
  }

  /* ═══════════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════════ */

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ═══════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════ */

  document.addEventListener("DOMContentLoaded", () => {
    buildGroupGrid();
    setupAdmin();

    $("#btn-back").addEventListener("click", goToStart);
    $("#btn-add-card").addEventListener("click", () => {
      createCard();
      markLocalChange();
    });

    $("#btn-save").addEventListener("click", saveAsJSON);

    $("#btn-import").addEventListener("click", () => $("#file-import").click());
    $("#file-import").addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        importJSON(e.target.files[0]);
        e.target.value = "";
      }
    });

    $("#btn-pdf").addEventListener("click", exportPDF);

    document.addEventListener("input", () => { if (currentGroup) markLocalChange(); });
    document.addEventListener("change", () => { if (currentGroup) markLocalChange(); });

    /* ── After print: clean up print content ── */
    window.addEventListener("afterprint", cleanupPrintContent);

    /* ── Group password unlock ── */
    $("#btn-group-unlock").addEventListener("click", tryGroupUnlock);
    $("#group-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryGroupUnlock();
    });

    showPage("start");
  });
})();
