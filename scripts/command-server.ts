import { renderTopbar } from "./shell";
import { renderSearchBox, searchStyle } from "./search-component";
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

const shellStyle = `${searchStyle}`;

const shellHTML = `
${renderTopbar("commands")}

${renderSearchBox(
  "Search commands...",
  "Examples: git, curl, tar, imagemagick, ffmpeg"
)}


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
<p class="muted"></p>
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
          return "";
        })
        .join("");

      return renderPage(
        "Command Cheatsheets",
        `
<p class="muted">

</p>
<div class="source-status">${statuses}</div>
`,
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
