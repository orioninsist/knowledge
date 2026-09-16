(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml } = shared;
    const STORAGE_KEY = "knowledge.productivity.canvas.v1";
    let state = { cards: [], edges: [] };
    let drag = null;
    let connectFrom = null;
    let connectDrag = null;

    const uid = () =>
      `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    const load = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved && Array.isArray(saved.cards) && Array.isArray(saved.edges)) state = saved;
      } catch (_) {}
    };

    const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const addCard = (x, y) => {
      state.cards.push({ id: uid(), x: Math.max(16, x), y: Math.max(16, y), w: 220, h: 120, title: "New card", text: "" });
      save();
      renderBoard();
    };

    const removeCard = id => {
      state.cards = state.cards.filter(card => card.id !== id);
      state.edges = state.edges.filter(edge => edge.from !== id && edge.to !== id);
      save();
      renderBoard();
    };

    const cardCenter = card => ({ x: card.x + card.w / 2, y: card.y + card.h / 2 });

    const renderBoard = () => {
      const board = workspace.querySelector("[data-canvas-board]");
      if (!board) return;
      const width = Math.max(900, ...state.cards.map(card => card.x + card.w + 80));
      const height = Math.max(560, ...state.cards.map(card => card.y + card.h + 80));
      const byId = new Map(state.cards.map(card => [card.id, card]));
      const edges = state.edges.map(edge => {
        const from = byId.get(edge.from), to = byId.get(edge.to);
        if (!from || !to) return "";
        const a = cardCenter(from), b = cardCenter(to);
        return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="url(#canvas-arrow)" />`;
      }).join("");
      const preview = connectDrag ? `<line class="canvas-edge-preview" x1="${connectDrag.x1}" y1="${connectDrag.y1}" x2="${connectDrag.x2}" y2="${connectDrag.y2}" marker-end="url(#canvas-arrow)" />` : "";
      const cards = state.cards.map(card => `
        <article class="canvas-card" data-card-id="${card.id}" style="left:${card.x}px;top:${card.y}px;width:${card.w}px;min-height:${card.h}px">
          <button class="canvas-card-port${connectFrom === card.id ? " is-active" : ""}" data-canvas-connect="${card.id}" title="Connect card" aria-label="Connect card"></button>
          <button class="canvas-card-remove" data-canvas-remove="${card.id}" title="Delete card" aria-label="Delete card">×</button>
          <input class="canvas-card-title" data-canvas-title="${card.id}" value="${escapeHtml(card.title)}" aria-label="Card title">
          <textarea class="canvas-card-text" data-canvas-text="${card.id}" placeholder="Write a note...">${escapeHtml(card.text)}</textarea>
        </article>`).join("");
      board.innerHTML = `
        <div class="canvas-stage" style="width:${width}px;height:${height}px">
          <svg class="canvas-edges" width="${width}" height="${height}" aria-hidden="true">
            <defs><marker id="canvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>
            ${edges}
            ${preview}
          </svg>
          ${cards}
        </div>`;
    };

    const copyCanvas = async () => {
      const payload = JSON.stringify({ version: 1, cards: state.cards, edges: state.edges }, null, 2);
      const block = `\`\`\`canvas\n${payload}\n\`\`\``;
      await navigator.clipboard.writeText(block);
      const button = workspace.querySelector("[data-canvas-copy]");
      if (button) {
        const old = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = old; }, 1200);
      }
    };

    const render = () => {
      load();
      workspace.innerHTML = `
        <section class="canvas-view">
          <header class="canvas-toolbar">
            <div>
              <span class="tool-kicker">Canvas</span>
              <h2>Visual Canvas</h2>
              <p>Right-click the board to add cards. Drag cards and connect them with the dot.</p>
            </div>
            <div class="canvas-toolbar-actions">
              <button type="button" class="canvas-secondary-button" data-canvas-clear>Clear</button>
              <button type="button" class="canvas-primary-button" data-canvas-copy>Copy Markdown</button>
            </div>
          </header>
          <div class="canvas-board-wrap">
            <div class="canvas-board" data-canvas-board aria-label="Canvas board"></div>
          </div>
        </section>`;
      renderBoard();
    };

    const bindEvents = () => {
      workspace.addEventListener("contextmenu", event => {
        const board = event.target.closest("[data-canvas-board]");
        if (!board || event.target.closest(".canvas-card")) return;
        event.preventDefault();
        const rect = board.getBoundingClientRect();
        addCard(event.clientX - rect.left + board.parentElement.scrollLeft, event.clientY - rect.top + board.parentElement.scrollTop);
      });

      workspace.addEventListener("click", event => {
        const remove = event.target.closest("[data-canvas-remove]");
        if (remove) return removeCard(remove.dataset.canvasRemove);
        const port = event.target.closest("[data-canvas-connect]");
        if (port) {
          const id = port.dataset.canvasConnect;
          if (!connectFrom) connectFrom = id;
          else if (connectFrom !== id) {
            if (!state.edges.some(edge => edge.from === connectFrom && edge.to === id)) state.edges.push({ from: connectFrom, to: id });
            connectFrom = null;
            save();
          } else connectFrom = null;
          renderBoard();
          return;
        }
        if (event.target.closest("[data-canvas-copy]")) copyCanvas();
        if (event.target.closest("[data-canvas-clear]")) {
          state = { cards: [], edges: [] };
          connectFrom = null;
          save();
          renderBoard();
        }
      });

      workspace.addEventListener("input", event => {
        const title = event.target.closest("[data-canvas-title]");
        const text = event.target.closest("[data-canvas-text]");
        const id = title?.dataset.canvasTitle || text?.dataset.canvasText;
        if (!id) return;
        const card = state.cards.find(item => item.id === id);
        if (!card) return;
        if (title) card.title = title.value;
        if (text) card.text = text.value;
        save();
      });

      workspace.addEventListener("pointerdown", event => {
        const port = event.target.closest("[data-canvas-connect]");
        if (port) {
          event.preventDefault();
          event.stopPropagation();
          const id = port.dataset.canvasConnect;
          const card = state.cards.find(item => item.id === id);
          if (!card) return;
          const a = cardCenter(card);
          connectDrag = { from: id, x1: a.x, y1: a.y, x2: a.x, y2: a.y };
          port.setPointerCapture?.(event.pointerId);
          renderBoard();
          return;
        }
        if (event.target.closest("input, textarea, button")) return;
        const element = event.target.closest(".canvas-card");
        if (!element) return;
        const card = state.cards.find(item => item.id === element.dataset.cardId);
        if (!card) return;
        drag = { id: card.id, startX: event.clientX, startY: event.clientY, x: card.x, y: card.y };
        element.setPointerCapture(event.pointerId);
      });

      workspace.addEventListener("pointermove", event => {
        if (connectDrag) {
          const board = workspace.querySelector("[data-canvas-board]");
          if (!board) return;
          const rect = board.getBoundingClientRect();
          const wrap = board.parentElement;
          connectDrag.x2 = event.clientX - rect.left + (wrap?.scrollLeft || 0);
          connectDrag.y2 = event.clientY - rect.top + (wrap?.scrollTop || 0);
          renderBoard();
          return;
        }
        if (!drag) return;
        const card = state.cards.find(item => item.id === drag.id);
        if (!card) return;
        card.x = Math.max(8, drag.x + event.clientX - drag.startX);
        card.y = Math.max(8, drag.y + event.clientY - drag.startY);
        renderBoard();
      });

      workspace.addEventListener("pointerup", event => {
        if (connectDrag) {
          const from = connectDrag.from;
          const target = document.elementFromPoint(event.clientX, event.clientY);
          const targetCard = target?.closest?.(".canvas-card");
          const to = target?.closest?.("[data-canvas-connect]")?.dataset.canvasConnect ||
            targetCard?.dataset.cardId;
          connectDrag = null;
          if (to && to !== from &&
              !state.edges.some(edge => edge.from === from && edge.to === to)) {
            state.edges.push({ from, to });
            save();
          }
          renderBoard();
          return;
        }
        if (!drag) return;
        drag = null;
        save();
      });
    };

    shared.canvas = { render, bindEvents };
    if (window.location.hash.slice(1).trim().toLowerCase() === "canvas") render();
  };

  if (window.KnowledgeProductivity) register(window.KnowledgeProductivity);
  else (window.KnowledgeProductivityQueue = window.KnowledgeProductivityQueue || []).push(register);
})();
