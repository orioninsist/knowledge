(() => {
  "use strict";

  const tools = {
    clock: { title: "World Clock", description: "Dünya saatlerini tek ekranda takip et." },
    weather: { title: "Weather", description: "Şehirlerin güncel hava durumunu ve 7 günlük tahminini takip et." },
    markets: { title: "Markets", description: "Döviz ve altın fiyatlarını takip et." },
    board: { title: "Board", description: "Todo, In Progress, Review ve Done akışını yönet." },
    alarm: { title: "Alarm", description: "Saat, tekrar, ses ve bildirim ile alarm oluştur." },
    timer: { title: "Timer", description: "Belirlediğin süreden geriye say." },
    stopwatch: { title: "Stopwatch", description: "Geçen zamanı ve lap sürelerini ölç." },
    pomodoro: { title: "Pomodoro", description: "Focus, short break ve long break döngüsünü yönet." },
    focus: { title: "Focus", description: "Tek bir çalışma hedefine odaklan." },
    canvas: { title: "Canvas", description: "Kartları görsel olarak oluştur, bağla ve Markdown'a kopyala." },
  };

  const workspace = document.querySelector("#productivity-workspace");
  const now = document.querySelector("#productivity-now");
  const tabs = [...document.querySelectorAll("[data-tool]")];

  const escapeHtml = value => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const getTool = () => {
    const value = window.location.hash.slice(1).trim().toLowerCase();
    return tools[value] ? value : "clock";
  };

  const productivityShared = window.KnowledgeProductivity = window.KnowledgeProductivity || {};
  Object.assign(productivityShared, { workspace, now, tabs, escapeHtml, getTool });
  (window.KnowledgeProductivityQueue || []).forEach(register => register(productivityShared));
  window.KnowledgeProductivityQueue = [];

  const renderPlaceholder = key => {
    const tool = tools[key];
    workspace.innerHTML = `<div class="tool-placeholder"><span class="tool-kicker">${escapeHtml(key)}</span><h2>${escapeHtml(tool.title)}</h2><p>${escapeHtml(tool.description)}</p><span class="tool-status">Ready for implementation</span></div>`;
  };

  const renderTool = () => {
    productivityShared.clock?.stop();
    const key = getTool();
    for (const tab of tabs) {
      const active = tab.dataset.tool === key;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    }
    const module = productivityShared[key];
    if (module?.render) module.render();
    else renderPlaceholder(key);
  };

  const renderNow = () => {
    const date = new Date();
    now.dateTime = date.toISOString();
    now.textContent = new Intl.DateTimeFormat("tr-TR", {
      weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    }).format(date);
  };

  window.addEventListener("hashchange", renderTool);
  productivityShared.board?.bindEvents();
  productivityShared.alarm?.bindEvents();
  productivityShared.timer?.bindEvents();
  productivityShared.stopwatch?.bindEvents();
  productivityShared.pomodoro?.bindEvents();
  productivityShared.focus?.bindEvents();
  productivityShared.canvas?.bindEvents();
  productivityShared.alarm?.startScheduler();
  renderTool();
  renderNow();
  window.setInterval(renderNow, 30_000);
})();
