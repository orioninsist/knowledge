import { renderTopbar } from "./shell";
import { spawnSync } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = Number(
  process.env.KNOWLEDGE_MAN_PORT ?? "1321",
);

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
  const result = spawnSync(
    command,
    args,
    {
      encoding: "utf8",
      env: {
        ...process.env,
        MAN_KEEP_FORMATTING: "1",
      },
    },
  );

  return {
    stdout: result.stdout ?? "",
    ok: result.status === 0,
  };
};

type ManResult = {
  name: string;
  section: string;
  description: string;
};

const searchMan = (
  query: string,
): ManResult[] => {
  if (!query.trim()) return [];

  const result = run(
    "apropos",
    ["--", query.trim()],
  );

  if (!result.ok && !result.stdout) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line): ManResult[] => {
      const match = line.match(
        /^(.+?)\s+\(([^)]+)\)\s+-\s+(.*)$/,
      );

      if (!match) return [];

      return match[1]
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          section: match[2].trim(),
          description: match[3].trim(),
        }));
    })
    .slice(0, 80);
};

const manPageExists = (
  name: string,
  section: string,
): boolean => {
  const result = run(
    "man",
    ["-w", section, name],
  );

  return result.ok &&
    Boolean(result.stdout.trim());
};

const linkManReferences = (
  html: string,
): string => {
  const existsCache =
    new Map<string, boolean>();

  const exists = (
    name: string,
    section: string,
  ): boolean => {
    const key = `${section}:${name}`;
    const cached = existsCache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value =
      manPageExists(name, section);

    existsCache.set(key, value);
    return value;
  };

  return html.replace(
    /(?:<b>)?([A-Za-z0-9_.:+@-]+)(?:<\/b>)?\(([A-Za-z0-9][A-Za-z0-9.+-]*)\)/g,
    (
      match,
      name: string,
      section: string,
      offset: number,
      source: string,
    ) => {
      const before =
        source.slice(
          Math.max(0, offset - 200),
          offset,
        );

      if (
        before.lastIndexOf("<a ") >
        before.lastIndexOf("</a>")
      ) {
        return match;
      }

      if (!exists(name, section)) {
        return match;
      }

      const href =
        `/man/${encodeURIComponent(section)}/${encodeURIComponent(name)}`;

      return `<a class="man-ref" href="${href}">${escapeHTML(name)}(${escapeHTML(section)})</a>`;
    },
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
    border-radius: 0;
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

  .command-search-results a:last-child {
    border-bottom: 0;
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
${renderTopbar("man")}

<div
  id="command-search"
  class="command-search"
  hidden
>
  <div
    class="command-search-backdrop"
    data-command-search-close
  ></div>

  <section
    class="command-search-panel"
    role="dialog"
    aria-modal="true"
    aria-label="Search man pages"
  >
    <label
      for="knowledge-search"
      hidden
    >Search man pages</label>

    <input
      id="knowledge-search"
      class="command-search-input"
      type="search"
      placeholder="Search man pages..."
      autocomplete="off"
      spellcheck="false"
      aria-label="Search man pages"
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
        {
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const items = await response.json();

      results.hidden = false;

      if (!items.length) {
        results.innerHTML =
          '<div class="search-empty">' +
          'No manual pages found.' +
          '</div>';
        return;
      }

      results.innerHTML = items
        .map((item) => {
          const href =
            "/man/" +
            encodeURIComponent(item.section) +
            "/" +
            encodeURIComponent(item.name);

          return (
            '<a href="' + href + '">' +
              "<strong>" +
                escapeHTML(item.name) +
                "(" +
                escapeHTML(item.section) +
                ")" +
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

  input.addEventListener(
    "input",
    () => {
      clearTimeout(timer);
      timer = setTimeout(search, 120);
    },
  );

  document
    .querySelector("[data-command-search-close]")
    .addEventListener(
      "click",
      closeSearch,
    );

  document.addEventListener(
    "keydown",
    (event) => {
      const key =
        event.key.toLowerCase();

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
    },
  );
})();
</script>
`;

const renderMan = (
  name: string,
  section: string,
): string | null => {
  if (
    !/^[A-Za-z0-9_.:+@-]+$/.test(name) ||
    !/^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(section)
  ) {
    return null;
  }

  const result = run(
    "man",
    ["-Thtml", section, name],
  );

  if (!result.ok || !result.stdout) {
    return null;
  }

  const readerStyle = `
<style>
  body {
    box-sizing: border-box;
  }

  body > h1:first-of-type {
    margin-top: 0;
  }

  a {
    color: var(--reader-link);
  }

  .man-ref {
    color: var(--reader-link);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  .man-ref:hover {
    color: var(--reader-link-hover);
  }

  pre,
  code,
  table {
    color: inherit;
  }
</style>
`;

  let html = linkManReferences(
    result.stdout,
  );

  html = html.replace(
    "</head>",
    `${readerStyle}<link rel="stylesheet" href="/css/shell.css">
${shellStyle}</head>`,
  );

  html = html.replace(
    /<body([^>]*)>/i,
    `<body$1>${shellHTML}`,
  );

  return html;
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
  <meta
    name="color-scheme"
    content="dark"
  >
  <title>Man · Knowledge</title>

  <style>
    :root {
    }

    html,
    body {
      margin: 0;
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
  Response.json(
    value,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

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
      return new Response(
        homePage(),
        {
          headers: {
            "Content-Type":
              "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (url.pathname === "/api/search") {
      return json(
        searchMan(
          url.searchParams.get("q") ?? "",
        ),
      );
    }

    const match = url.pathname.match(
      /^\/man\/([^/]+)\/([^/]+)$/,
    );

    if (match) {
      const section =
        decodeURIComponent(match[1]);

      const name =
        decodeURIComponent(match[2]);

      const html =
        renderMan(name, section);

      if (!html) {
        return new Response(
          "Manual page not found.",
          { status: 404 },
        );
      }

      return new Response(
        html,
        {
          headers: {
            "Content-Type":
              "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return new Response(
      "Not Found",
      { status: 404 },
    );
  },
});

console.log(
  `Knowledge Man Pages: http://${server.hostname}:${server.port}`,
);
