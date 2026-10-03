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
<style>
body {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
  font: 16px/1.55 system-ui, sans-serif;
}
nav { margin-bottom: 2rem; }
nav a { margin-right: 1rem; }
form { display: flex; gap: .5rem; margin: 1.5rem 0; }
input { flex: 1; padding: .65rem; }
button { padding: .65rem 1rem; }
.sources { display: flex; gap: 1rem; flex-wrap: wrap; }
pre {
  overflow-x: auto;
  padding: 1rem;
  background: #f3f3f3;
  border-radius: .4rem;
}
.missing { opacity: .65; }
</style>
</head>
<body>
<nav>
<a href="http://127.0.0.1:1314/">Knowledge</a>
<a href="http://127.0.0.1:1320/">Documentation</a>
<a href="http://127.0.0.1:1321/">Man</a>
<a href="http://127.0.0.1:1322/">Info</a>
<a href="/">Commands</a>
</nav>
${body}
</body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );

const server = Bun.serve({
  hostname: HOST,
  port: PORT,

  fetch(request) {
    const url = new URL(request.url);

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
      const sources = (["tldr", "navi", "cheat"] as Source[])
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
<p>Read-only command examples from TLDR, Navi and Cheat.</p>
<div class="sources">${sources}</div>
<form action="/open" method="get">
<input name="q" placeholder="git, curl, tar..." autofocus required>
<button type="submit">Open</button>
</form>`,
      );
    }

    if (url.pathname === "/open") {
      const query = (url.searchParams.get("q") ?? "").trim();

      if (!validName(query)) {
        return new Response("Invalid command", { status: 400 });
      }

      return Response.redirect(
        `/tldr/${encodeURIComponent(query)}`,
        302,
      );
    }

    const match = url.pathname.match(
      /^\/(tldr|navi|cheat)\/([^/]+)$/,
    );

    if (match) {
      const source = match[1] as Source;
      const name = decodeURIComponent(match[2]);

      if (!validName(name)) {
        return new Response("Invalid command", { status: 400 });
      }

      let result: { stdout: string; ok: boolean };

      if (source === "tldr") {
        result = run("tldr", ["--markdown", name]);
      } else if (source === "cheat") {
        result = run("cheat", [name]);
      } else {
        result = run("navi", [
          "--print",
          "--query",
          name,
          "--best-match",
        ]);
      }

      if (!result.ok || !result.stdout.trim()) {
        return renderPage(
          `${source}: ${name}`,
          `<h1>${escapeHTML(source.toUpperCase())}: ${escapeHTML(name)}</h1>
<p>No local cheatsheet was found for this source.</p>
<p>
<a href="/tldr/${encodeURIComponent(name)}">TLDR</a> ·
<a href="/navi/${encodeURIComponent(name)}">Navi</a> ·
<a href="/cheat/${encodeURIComponent(name)}">Cheat</a>
</p>`,
        );
      }

      return renderPage(
        `${source}: ${name}`,
        `<h1>${escapeHTML(source.toUpperCase())}: ${escapeHTML(name)}</h1>
<p>
<a href="/tldr/${encodeURIComponent(name)}">TLDR</a> ·
<a href="/navi/${encodeURIComponent(name)}">Navi</a> ·
<a href="/cheat/${encodeURIComponent(name)}">Cheat</a>
</p>
<pre><code>${escapeHTML(result.stdout)}</code></pre>`,
      );
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(
  `Knowledge Command Cheatsheets listening on http://${HOST}:${server.port}`,
);
