(() => {
  "use strict";
  const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const center = card => ({ x:Number(card.x||0)+Number(card.w||220)/2, y:Number(card.y||0)+Number(card.h||120)/2 });
  const edgePoints = (from,to) => {
    const a=center(from), b=center(to);
    const dx=b.x-a.x, dy=b.y-a.y;
    const fromHalfW=Number(from.w||220)/2, fromHalfH=Number(from.h||120)/2;
    const toHalfW=Number(to.w||220)/2, toHalfH=Number(to.h||120)/2;
    const scaleA=Math.max(Math.abs(dx)/(fromHalfW||1),Math.abs(dy)/(fromHalfH||1),1);
    const scaleB=Math.max(Math.abs(dx)/(toHalfW||1),Math.abs(dy)/(toHalfH||1),1);
    return {
      x1:a.x+dx/scaleA,
      y1:a.y+dy/scaleA,
      x2:b.x-dx/scaleB,
      y2:b.y-dy/scaleB,
    };
  };
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
      const lines = edges.map(edge=>{const from=byId.get(edge.from),to=byId.get(edge.to);if(!from||!to)return "";const p=edgePoints(from,to);return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" marker-end="url(#${marker})" />`;}).join("");
      const nodes = cards.map(card=>`<article class="note-canvas-card" style="left:${Number(card.x||0)}px;top:${Number(card.y||0)}px;width:${Number(card.w||220)}px;min-height:${Number(card.h||120)}px"><strong>${escapeHtml(card.title||"Card")}</strong>${card.text?`<p>${escapeHtml(card.text).replaceAll("\n","<br>")}</p>`:""}</article>`).join("");
      host.className = "visual-note visual-canvas visual-rendered";
      host.innerHTML = `<div class="note-canvas-fit"><svg class="note-canvas-fit-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Canvas"><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" class="note-canvas-stage" style="width:${width}px;height:${height}px"><svg class="note-canvas-edges" width="${width}" height="${height}" aria-hidden="true"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>${lines}</svg>${nodes}</div></foreignObject></svg></div>`;
    } catch(error) {
      host.innerHTML = `<pre class="visual-error">Invalid canvas data: ${escapeHtml(error.message)}</pre>`;
    }
  };
  const blocks = [...document.querySelectorAll('[data-visual-language="canvas"], code.language-canvas')];
  blocks.forEach(render);
})();
