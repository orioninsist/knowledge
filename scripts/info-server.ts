import { renderTopbar } from "./shell";
import { spawnSync } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = Number(
  process.env.KNOWLEDGE_INFO_PORT ?? "1322",
);

const escapeHTML = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const runInfo = (
  args: string[],
): { stdout: string; ok: boolean } => {
  const result = spawnSync(
    "info",
    args,
    {
      encoding: "utf8",
      env: process.env,
    },
  );

  return {
    stdout: result.stdout ?? "",
    ok: result.status === 0,
  };
};

const validManual = (value: string): boolean =>
  /^[A-Za-z0-9_.+@-]+$/.test(value);

const validNode = (value: string): boolean =>
  value.length > 0 &&
  value.length <= 300 &&
  !/[\0\r\n]/.test(value);

type InfoResult = {
  manual: string;
  node: string;
  description: string;
};

const searchInfo = (
  query: string,
): InfoResult[] => {
  const term = query.trim();

  if (!term) return [];

  const result = runInfo([
    `--apropos=${term}`,
  ]);

  if (!result.ok && !result.stdout) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line): InfoResult[] => {
      const match = line.match(
        /^"\(([^)]+)\)([^"]+)"\s+--\s+(.*)$/,
      );

      if (!match) return [];

      const manual = match[1].trim();
      const node = match[2].trim();

      if (
        !validManual(manual) ||
        !validNode(node)
      ) {
        return [];
      }

      return [{
        manual,
        node,
        description: match[3].trim(),
      }];
    })
    .slice(0, 80);
};

const infoNodeExists = (
  manual: string,
  node: string,
): boolean => {
  if (
    !validManual(manual) ||
    !validNode(node)
  ) {
    return false;
  }

  const result = runInfo([
    `--file=${manual}`,
    `--node=${node}`,
    "--output=-",
  ]);

  if (!result.ok || !result.stdout) {
    return false;
  }

  const firstLine =
    result.stdout.split("\n", 1)[0] ?? "";

  const actualNode =
    firstLine.match(
      /(?:^|,\s*)Node:\s*([^,\t]+)/
    )?.[1]?.trim();

  return actualNode === node;
};
const infoHref = (
  manual: string,
  node: string,
): string =>
  `/info/${encodeURIComponent(manual)}/${encodeURIComponent(node)}`;

const linkInfoReferences = (
  text: string,
  currentManual: string,
): string => {
  const existsCache =
    new Map<string, boolean>();

  const exists = (
    manual: string,
    node: string,
  ): boolean => {
    const key = `${manual}\0${node}`;
    const cached = existsCache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value =
      infoNodeExists(manual, node);

    existsCache.set(key, value);
    return value;
  };

  let html = escapeHTML(text);

  // Menu shorthand:
  // * Overview::  -> node "Overview"
  html = html.replace(
    /^\* ([^:\n]+)::/gm,
    (
      match,
      label: string,
    ) => {
      const node = label.trim();

      if (!exists(currentManual, node)) {
        return match;
      }

      return (
        `* <a class="info-ref" href="${infoHref(currentManual, node)}">` +
        `${escapeHTML(node)}</a>::`
      );
    },
  );

  // Explicit menu target:
  // * Invoking make: Running.
  // * Label: (other-manual)Node.
  html = html.replace(
    /^\* ([^:\n]+):\s+([^\n]+?)(?=\s{2,}|$)/gm,
    (
      match,
      label: string,
      rawTarget: string,
    ) => {
      const target = rawTarget.trim();
      const external =
        target.match(/^\(([^)]+)\)(.*)$/);

      const manual =
        external?.[1]?.trim() ||
        currentManual;

      let node =
        external
          ? external[2].replace(/\.$/, "").trim()
          : target.replace(/\.$/, "").trim();

      if (external && !node) {
        node = "Top";
      }

      if (
        !validManual(manual) ||
        !validNode(node) ||
        !exists(manual, node)
      ) {
        return match;
      }

      return (
        `* <a class="info-ref" href="${infoHref(manual, node)}">` +
        `${escapeHTML(label.trim())}</a>: ` +
        `${escapeHTML(target)}`
      );
    },
  );

  // Cross-reference:
  // *Note label: node.
  // *Note label: (manual)node.
  html = html.replace(
    /\*Note\s+([^:\n]+):\s*(?:\(([^)]+)\))?([^.,\n]*)([.,])/g,
    (
      match,
      label: string,
      explicitManual: string | undefined,
      rawNode: string,
      punctuation: string,
    ) => {
      const manual =
        explicitManual?.trim() ||
        currentManual;

      let node = rawNode.trim();

      if (!node || node === ":") {
        node = label.trim();
      }

      node = node
        .replace(/::$/, "")
        .trim();

      if (
        !validManual(manual) ||
        !validNode(node) ||
        !exists(manual, node)
      ) {
        return match;
      }

      return (
        `*Note <a class="info-ref" href="${infoHref(manual, node)}">` +
        `${escapeHTML(label.trim())}</a>${punctuation}`
      );
    },
  );

  return html;
};
type NodeHeader = {
  file: string;
  node: string;
  next?: string;
  prev?: string;
  up?: string;
};

const parseNodeHeader = (
  line: string,
): NodeHeader | null => {
  const file =
    line.match(/(?:^|,\s*)File:\s*([^,]+)/)?.[1]?.trim();

  const node =
    line.match(/(?:^|,\s*)Node:\s*([^,]+)/)?.[1]?.trim();

  if (!file || !node) {
    return null;
  }

  return {
    file,
    node,
    next:
      line.match(/(?:^|,\s*)Next:\s*([^,]+)/)?.[1]?.trim(),
    prev:
      line.match(/(?:^|,\s*)Prev:\s*([^,]+)/)?.[1]?.trim(),
    up:
      line.match(/(?:^|,\s*)Up:\s*([^,]+)/)?.[1]?.trim(),
  };
};

const navLink = (
  label: string,
  target: string | undefined,
  manual: string,
): string => {
  if (!target) return "";

  const external =
    target.match(/^\(([^)]+)\)(.*)$/);

  let targetManual =
    external?.[1]?.trim() || manual;

  let targetNode =
    external?.[2]?.trim() || target.trim();

  if (
    targetManual === "dir" &&
    (!targetNode || targetNode === "(dir)")
  ) {
    targetNode = "Top";
  }

  if (target === "(dir)") {
    targetManual = "dir";
    targetNode = "Top";
  }

  if (
    !validManual(targetManual) ||
    !validNode(targetNode) ||
    !infoNodeExists(targetManual, targetNode)
  ) {
    return "";
  }

  return (
    `<a href="${infoHref(targetManual, targetNode)}">` +
    `${escapeHTML(label)}: ${escapeHTML(target)}</a>`
  );
};

const shellStyle = `
<style>
  :root {
  }

  .command-search[hidden] {
    display: none;
  }

  .command-search {
    position: fixed;
    inset: 0;
    z-index: 5000;
    font-family: var(--font-sans);
  }

  .command-search-backdrop {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 65%);
  }

  .command-search-panel {
    position: relative;
    width: min(720px, calc(100vw - 32px));
    margin: 10vh auto 0;
    border: 1px solid var(--reader-border);
    border-radius: 12px;
    background: var(--reader-bg);
    box-shadow: 0 20px 70px rgb(0 0 0 / 45%);
    overflow: hidden;
  }

  .command-search-input {
    box-sizing: border-box;
    width: 100%;
    height: 48px;
    padding: 0 16px;
    border: 0;
    border-bottom: 1px solid var(--reader-border);
    outline: none;
    background: transparent;
    color: var(--reader-text);
    font: inherit;
    font-size: 15px;
  }

  .command-search-results {
    max-height: 62vh;
    overflow-y: auto;
  }

  .command-search-results a {
    display: block;
    padding: 13px 15px;
    border-bottom: 1px solid var(--reader-border-subtle);
    color: var(--reader-text);
    text-decoration: none;
  }

  .command-search-results a:hover {
    background: #292929;
  }

  .command-search-results strong,
  .command-search-results span {
    display: block;
  }

  .command-search-results span {
    margin-top: 3px;
    color: #999;
    font-size: 12px;
  }

  .search-empty {
    padding: 20px 18px;
    color: #999;
    font-size: 12px;
  }

  .command-search-open {
    overflow: hidden;
  }
</style>
`;

const shellHTML = `
${renderTopbar("info")}

<div id="command-search" class="command-search" hidden>
  <div
    class="command-search-backdrop"
    data-command-search-close
  ></div>

  <section
    class="command-search-panel"
    role="dialog"
    aria-modal="true"
    aria-label="Search Info manuals"
  >
    <label for="knowledge-search" hidden>
      Search Info manuals
    </label>

    <input
      id="knowledge-search"
      class="command-search-input"
      type="search"
      placeholder="Search Info manuals..."
      autocomplete="off"
      spellcheck="false"
      aria-label="Search Info manuals"
    >

    <div
      id="search-results"
      class="command-search-results"
      hidden
    ></div>
  </section>
</div>

<script>
(() => {
  const palette =
    document.getElementById("command-search");
  const input =
    document.getElementById("knowledge-search");
  const results =
    document.getElementById("search-results");

  let controller = null;
  let timer = null;

  const escapeHTML = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const openSearch = () => {
    palette.hidden = false;
    document.documentElement
      .classList.add("command-search-open");

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  };

  const closeSearch = () => {
    palette.hidden = true;
    document.documentElement
      .classList.remove("command-search-open");
  };

  const search = async () => {
    const query = input.value.trim();

    if (!query) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }

    controller?.abort();
    controller = new AbortController();

    try {
      const response = await fetch(
        "/api/search?q=" +
          encodeURIComponent(query),
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const items = await response.json();
      results.hidden = false;

      if (!items.length) {
        results.innerHTML =
          '<div class="search-empty">' +
          'No Info entries found.' +
          '</div>';
        return;
      }

      results.innerHTML = items
        .map((item) => {
          const href =
            "/info/" +
            encodeURIComponent(item.manual) +
            "/" +
            encodeURIComponent(item.node);

          return (
            '<a href="' + href + '">' +
              "<strong>" +
                escapeHTML(item.manual) +
                " · " +
                escapeHTML(item.node) +
              "</strong>" +
              "<span>" +
                escapeHTML(item.description) +
              "</span>" +
            "</a>"
          );
        })
        .join("");
    } catch (error) {
      if (error.name !== "AbortError") {
        results.hidden = false;
        results.innerHTML =
          '<div class="search-empty">' +
          'Search failed.' +
          '</div>';
      }
    }
  };

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(search, 120);
  });

  document
    .querySelector("[data-command-search-close]")
    .addEventListener("click", closeSearch);

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "escape") {
      closeSearch();
      return;
    }

    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      key === "k"
    ) {
      event.preventDefault();
      openSearch();
    }
  });
})();
</script>
`;

const readerStyle = `
<style>
  :root {
    color-scheme: dark;
    background: var(--reader-bg);
    color: var(--reader-text);
  }

  html,
  body {
    margin: 0;
    background: var(--reader-bg);
    color: var(--reader-text);
  }

  .info-reader {
    box-sizing: border-box;
    max-width: 86ch;
    margin: 0 auto;
    padding: 2rem 1rem 6rem;
    font-family: var(--font-mono);
    font-size: 16px;
    line-height: 1.65;
  }

  .info-node-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--reader-border-subtle);
    font-family: var(--font-sans);
    font-size: 13px;
  }

  .info-node-nav a,
  .info-ref {
    color: var(--reader-link);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  .info-node-nav a:hover,
  .info-ref:hover {
    color: var(--reader-link-hover);
  }

  .info-reader pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
  }
</style>
`;

const renderInfo = (
  manual: string,
  node: string,
): string | null => {
  if (
    !validManual(manual) ||
    !validNode(node)
  ) {
    return null;
  }

  const result = runInfo([
    `--file=${manual}`,
    `--node=${node}`,
    "--output=-",
  ]);

  if (!result.ok || !result.stdout.trim()) {
    return null;
  }

  const lines =
    result.stdout.replace(/\r\n/g, "\n").split("\n");

  const header =
    parseNodeHeader(lines[0] ?? "");

  // GNU Info may silently fall back to Top when a requested
  // node does not exist. Never render that fallback as though
  // it were the requested node.
  if (!header || header.node !== node) {
    return null;
  }

  const content =
    header
      ? lines.slice(1).join("\n").replace(/^\n+/, "")
      : lines.join("\n");

  const nav = header
    ? [
        navLink("Prev", header.prev, manual),
        navLink("Up", header.up, manual),
        navLink("Next", header.next, manual),
      ].filter(Boolean).join("")
    : "";

  const linkedContent =
    linkInfoReferences(content, manual);

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <meta name="color-scheme" content="dark">
  <title>${escapeHTML(node)} · ${escapeHTML(manual)} · Info · Knowledge</title>

  <link rel="stylesheet" href="/css/shell.css">
  ${shellStyle}
  ${readerStyle}
</head>
<body>
  ${shellHTML}

  <main class="main content-shell info-reader">
    ${
      nav
        ? `<nav class="info-node-nav" aria-label="Info node">${nav}</nav>`
        : ""
    }
    <pre>${linkedContent}</pre>
  </main>
</body>
</html>
`;
};

const homePage = (): string => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <meta name="color-scheme" content="dark">
  <title>Info · Knowledge</title>

  <style>
    :root {
      color-scheme: dark;
      background: var(--reader-bg);
      color: var(--reader-text);
    }

    html,
    body {
      margin: 0;
      background: var(--reader-bg);
      color: var(--reader-text);
    }
  </style>

  <link rel="stylesheet" href="/css/shell.css">
  ${shellStyle}
</head>
<body>
  ${shellHTML}
</body>
</html>
`;

const json = (
  value: unknown,
  status = 200,
): Response =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });

const server = Bun.serve({
  hostname: HOST,
  port: PORT,

  fetch(request) {
    if (request.method !== "GET") {
      return new Response(
        "Method Not Allowed",
        { status: 405 },
      );
    }

    const url = new URL(request.url);

    if (url.pathname === "/css/shell.css") {
      return new Response(
        Bun.file("static/css/shell.css"),
        {
          headers: {
            "Content-Type":
              "text/css; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (url.pathname === "/") {
      return new Response(homePage(), {
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    if (url.pathname === "/api/search") {
      return json(
        searchInfo(
          url.searchParams.get("q") ?? "",
        ),
      );
    }

    const match = url.pathname.match(
      /^\/info\/([^/]+)\/([^/]+)$/,
    );

    if (match) {
      const manual =
        decodeURIComponent(match[1]);
      const node =
        decodeURIComponent(match[2]);

      const html =
        renderInfo(manual, node);

      if (!html) {
        return new Response(
          "Info node not found.",
          { status: 404 },
        );
      }

      return new Response(html, {
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response(
      "Not Found",
      { status: 404 },
    );
  },
});

console.log(
  `Knowledge Info: http://${server.hostname}:${server.port}`,
);
