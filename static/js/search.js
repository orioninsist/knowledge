(() => {

const input = document.getElementById("knowledge-search");
const results = document.getElementById("search-results");

if (!input || !results) {
  return;
}

const api =
  document
    .querySelector('meta[name="knowledge-search-api"]')
    ?.content
    ?.replace(/\/$/, "");

if (!api) {
  return;
}

let timer;

input.addEventListener("input", () => {

  clearTimeout(timer);

  timer = setTimeout(async () => {

    const q = input.value.trim();

    if (!q) {
      results.innerHTML = "";
      return;
    }

    const res = await fetch(
      `${api}/api/search?q=${encodeURIComponent(q)}`
    );

    const data = await res.json();

    results.innerHTML = "";

    data.results
      .slice(0,10)
      .forEach(item => {

        const a = document.createElement("a");

        a.href = item.url;
        a.textContent = item.title;

        const div = document.createElement("div");

        div.appendChild(a);

        results.appendChild(div);

      });

  },200);

});

})();
