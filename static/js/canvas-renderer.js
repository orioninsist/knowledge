(() => {
  "use strict";
  const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const center = card => ({ x:Number(card.x||0)+Number(card.w||220)/2, y:Number(card.y||0)+Number(card.h||120)/2 });
  const render = sourceElement => {
    const host = sourceElement.matches("code") ? sourceElement.closest(".highlight") || sourceElement.parentElement : sourceElement;
    try {
      const data = JSON.parse(sourceElement.textContent || "{}");
      const cards = Array.isArray(data.cards) ? data.cards : [];
      const edges = Array.isArray(data.edges) ? data.edges : [];
      const byId = new Map(cards.map(card => [card.id,card]));
      const width = Math.max(720,...cards.map(card=>Number(card.x||0)+Number(card.w||220)+60));
      const height = Math.max(420,...cards.map(card=>Number(card.y||0)+Number(card.h||120)+60));
      const marker = `note-canvas-arrow-${Math.random().toString(36).slice(2)}`;
      const lines = edges.map(edge=>{const from=byId.get(edge.from),to=byId.get(edge.to);if(!from||!to)return "";const a=center(from),b=center(to);return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="url(#${marker})" />`;}).join("");
      const nodes = cards.map(card=>`<article class="note-canvas-card" style="left:${Number(card.x||0)}px;top:${Number(card.y||0)}px;width:${Number(card.w||220)}px;min-height:${Number(card.h||120)}px"><strong>${escapeHtml(card.title||"Card")}</strong>${card.text?`<p>${escapeHtml(card.text).replaceAll("\n","<br>")}</p>`:""}</article>`).join("");
      host.className = "visual-note visual-canvas visual-rendered";
      host.innerHTML = `<div class="note-canvas-scroll"><div class="note-canvas-stage" style="width:${width}px;height:${height}px"><svg class="note-canvas-edges" width="${width}" height="${height}" aria-hidden="true"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>${lines}</svg>${nodes}</div></div>`;
    } catch(error) {
      host.innerHTML = `<pre class="visual-error">Invalid canvas data: ${escapeHtml(error.message)}</pre>`;
    }
  };
  const blocks = [...document.querySelectorAll('[data-visual-language="canvas"], code.language-canvas')];
  blocks.forEach(render);
})();
