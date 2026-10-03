import { renderTopbar } from "./shell";
import { spawnSync } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = Number(process.env.KNOWLEDGE_COMMAND_PORT ?? "1323");

type Source = "tldr" | "navi" | "cheat";

const escapeHTML = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const run = (
  command: string,
  args: string[],
): { stdout: string; ok: boolean } => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 5000,
  });

  return {
    stdout: result.stdout ?? "",
    ok: result.status === 0,
  };
};

const commandExists = (command: string): boolean =>
  run("sh", ["-c", `command -v ${command}`]).ok;

const validName = (value: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9_.:+@-]*$/.test(value);

const sourceAvailable = (source: Source): boolean =>
  commandExists(source);

const readSource = (
  source: Source,
  name: string,
): { stdout: string; ok: boolean } => {
  if (source === "tldr") {
    return run("tldr", ["--markdown", name]);
  }

  if (source === "cheat") {
    return run("cheat", [name]);
  }

  return run("navi", [
    "--print",
    "--query",
    name,
    "--best-match",
  ]);
};

const shellStyle = `
  :root {
    --page: #1e1e2e;
    --border: #45475a;
    --text: #cdd6f4;
    --muted: #a6adc8;
    color-scheme: dark;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system,
      BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--page);
    color: var(--text);
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    min-height: 100%;
    background: var(--page);
    color: var(--text);
  }

  body {
    font: 16px/1.6 system-ui, sans-serif;
  }

  a {
    color: var(--text);
    text-decoration: none;
  }

  a:hover {
    color: #fff;
  }







  main {
    width: min(1100px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  h1, h2 {
    color: var(--text);
  }

  h1 {
    margin-top: 0;
  }

  .muted {
    color: var(--muted);
  }

  .source-status {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin: 1.25rem 0;
    color: var(--muted);
  }

  .missing {
    opacity: .55;
  }

  .home-search {
    display: flex;
    gap: .6rem;
    margin-top: 1.5rem;
  }

  .home-search input {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: .7rem .8rem;
    background: #242424;
    color: var(--text);
    font: inherit;
  }

  .home-search button {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: .7rem 1rem;
    background: #292929;
    color: var(--text);
    cursor: pointer;
  }

  .sources {
    display: grid;
    gap: 1.25rem;
  }

  .source {
    min-width: 0;
  }

  .source h2 {
    margin-bottom: .55rem;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  pre {
    margin: 0;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    background: #151515;
    color: var(--text);
  }

  code {
    font-family:
      "JetBrains Mono", "SFMono-Regular", Consolas,
      "Liberation Mono", monospace;
    font-size: .92rem;
  }

  .empty {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    color: var(--muted);
    background: #181818;
  }

  .command-search[hidden] {
    display: none;
  }

  .command-search {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: start center;
    padding-top: min(16vh, 9rem);
  }

  .command-search-backdrop {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 65%);
  }

  .command-search-panel {
    position: relative;
    width: min(640px, calc(100% - 2rem));
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--page);
    box-shadow: 0 20px 70px rgb(0 0 0 / 45%);
  }

  .command-search-input {
    width: 100%;
    border: 0;
    border-bottom: 1px solid var(--border);
    outline: 0;
    padding: 1rem;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 1.05rem;
  }

  .command-search-hint {
    padding: .8rem 1rem;
    color: var(--muted);
    font-size: .9rem;
  }

  .command-search-open {
    overflow: hidden;
  }

  @media (max-width: 760px) {



    main {
      width: min(100% - 1.4rem, 1100px);
      padding-top: 1.4rem;
    }
  }
`;

const shellHTML = `
${renderTopbar("commands")}

<div id="command-search" class="command-search" hidden>
  <div
    class="command-search-backdrop"
    data-command-search-close
  ></div>
  <form class="command-search-panel" action="/open" method="get">
    <input
      id="knowledge-search"
      class="command-search-input"
      name="q"
      type="search"
      autocomplete="off"
      placeholder="Search command… git, tar, curl"
      required
    >
    <div class="command-search-hint">
      Enter opens TLDR + Navi + Cheat together · Esc closes
    </div>
  </form>
</div>

<script>
(() => {
  const modal = document.getElementById("command-search");
  const input = document.getElementById("knowledge-search");

  const openSearch = () => {
    modal.hidden = false;
    document.documentElement.classList.add("command-search-open");
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  };

  const closeSearch = () => {
    modal.hidden = true;
    document.documentElement.classList.remove("command-search-open");
  };


  modal
    .querySelector("[data-command-search-close]")
    .addEventListener("click", closeSearch);

  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      modal.hidden ? openSearch() : closeSearch();
      return;
    }

    if (event.key === "Escape" && !modal.hidden) {
      closeSearch();
    }
  });
})();
</script>
`;

const renderPage = (
  title: string,
  body: string,
): Response =>
  new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(title)} · Knowledge</title>
<link rel="stylesheet" href="/css/shell.css">
<style>${shellStyle}</style>
</head>
<body>
${shellHTML}
<main class="main content-shell">
${body}
</main>
</body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );

const renderCommand = (name: string): Response => {
  const sources = (["tldr", "navi", "cheat"] as Source[])
    .map((source) => {
      if (!sourceAvailable(source)) {
        return `<section class="source">
<h2>${escapeHTML(source)}</h2>
<div class="empty">Source unavailable.</div>
</section>`;
      }

      const result = readSource(source, name);

      if (!result.ok || !result.stdout.trim()) {
        return `<section class="source">
<h2>${escapeHTML(source)}</h2>
<div class="empty">No local cheatsheet found.</div>
</section>`;
      }

      return `<section class="source">
<h2>${escapeHTML(source)}</h2>
<pre><code>${escapeHTML(result.stdout.trim())}</code></pre>
</section>`;
    })
    .join("");

  return renderPage(
    name,
    `<h1>${escapeHTML(name)}</h1>
<p class="muted">TLDR, Navi and Cheat results for this command.</p>
<div class="sources">${sources}</div>`,
  );
};

const server = Bun.serve({
  hostname: HOST,
  port: PORT,

  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/css/shell.css") return new Response(Bun.file("static/css/shell.css"));

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        sources: {
          tldr: sourceAvailable("tldr"),
          navi: sourceAvailable("navi"),
          cheat: sourceAvailable("cheat"),
        },
      });
    }

    if (url.pathname === "/") {
      const statuses = (["tldr", "navi", "cheat"] as Source[])
        .map((source) => {
          const available = sourceAvailable(source);

          return `<span class="${available ? "" : "missing"}">
${escapeHTML(source.toUpperCase())}: ${available ? "available" : "unavailable"}
</span>`;
        })
        .join("");

      return renderPage(
        "Command Cheatsheets",
        `<h1>Command Cheatsheets</h1>
<p class="muted">
Search once and read TLDR, Navi and Cheat together.
</p>
<div class="source-status">${statuses}</div>
<form class="home-search" action="/open" method="get">
<input
  name="q"
  placeholder="git, curl, tar..."
  autocomplete="off"
  autofocus
  required
>
<button type="submit">Search</button>
</form>`,
      );
    }

    if (url.pathname === "/open") {
      const query = (url.searchParams.get("q") ?? "").trim();

      if (!validName(query)) {
        return new Response("Invalid command", { status: 400 });
      }

      return Response.redirect(
        `/command/${encodeURIComponent(query)}`,
        302,
      );
    }

    const unifiedMatch = url.pathname.match(
      /^\/command\/([^/]+)$/,
    );

    if (unifiedMatch) {
      const name = decodeURIComponent(unifiedMatch[1]);

      if (!validName(name)) {
        return new Response("Invalid command", { status: 400 });
      }

      return renderCommand(name);
    }

    const legacyMatch = url.pathname.match(
      /^\/(tldr|navi|cheat)\/([^/]+)$/,
    );

    if (legacyMatch) {
      const name = decodeURIComponent(legacyMatch[2]);

      if (!validName(name)) {
        return new Response("Invalid command", { status: 400 });
      }

      return Response.redirect(
        `/command/${encodeURIComponent(name)}`,
        302,
      );
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(
  `Knowledge Command Cheatsheets listening on http://${HOST}:${server.port}`,
);
