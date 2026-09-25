import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";

import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import {
  marked,
} from "marked";

const HOST = "127.0.0.1";
const PORT = Number(
  process.env.KNOWLEDGE_DOCS_PORT ??
  "1320",
);

const ROOT = resolve(
  process.env.KNOWLEDGE_DOCS_ROOT ??
  "/home/murat/Media/5-Documentation",
);

const PROJECT_ROOT =
  process.cwd();

const STATIC_ROOT =
  join(PROJECT_ROOT, "static");

const RENDER_API =
  process.env.KNOWLEDGE_RENDER_API ??
  "http://127.0.0.1:8788";

const IGNORES = String(
  process.env.KNOWLEDGE_DOCS_IGNORE ??
  join(ROOT, "Knowledge"),
)
  .split(":")
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => resolve(item));

const PAGE_SIZE = 40;

const isInside = (
  parent: string,
  child: string,
): boolean => {
  const rel = relative(parent, child);

  return Boolean(rel) &&
    rel !== ".." &&
    !rel.startsWith(`..${sep}`);
};

const isIgnored = (
  absolutePath: string,
): boolean => {
  const resolved = resolve(absolutePath);

  return IGNORES.some(
    (ignore) =>
      resolved === ignore ||
      isInside(ignore, resolved),
  );
};

const toRelative = (
  absolutePath: string,
): string =>
  relative(ROOT, absolutePath)
    .split(sep)
    .join("/");

const normalize = (
  value: unknown,
): string =>
  String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .trim();

const escapeHTML = (
  value: unknown,
): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const stripFrontmatter = (
  source: string,
): string => {
  if (!source.startsWith("---")) {
    return source;
  }

  const lines = source.split(/\r?\n/);

  if (lines[0]?.trim() !== "---") {
    return source;
  }

  const end = lines.findIndex(
    (line, index) =>
      index > 0 &&
      line.trim() === "---",
  );

  return end >= 0
    ? lines.slice(end + 1).join("\n")
    : source;
};

const firstHeading = (
  body: string,
): string =>
  body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";

type Doc = {
  path: string;
  absolutePath: string;
  folder: string;
  filename: string;
  title: string;
  content: string;
  summary: string;
  mtimeMs: number;
  size: number;
};

let docs: Doc[] = [];
let indexedAt = 0;

const walk = (
  dir: string,
  output: string[],
) => {
  if (isIgnored(dir)) {
    return;
  }

  const entries = readdirSync(
    dir,
    {
      withFileTypes: true,
    },
  );

  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules"
    ) {
      continue;
    }

    const absolutePath = join(dir, entry.name);

    if (isIgnored(absolutePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(absolutePath, output);
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".md")
    ) {
      output.push(absolutePath);
    }
  }
};

const buildIndex = () => {
  const files: string[] = [];
  walk(ROOT, files);

  docs = files
    .map((absolutePath) => {
      const stat = statSync(absolutePath);
      const source = readFileSync(absolutePath, "utf8");
      const body = stripFrontmatter(source);
      const path = toRelative(absolutePath);
      const title = firstHeading(body) ||
        basename(path, extname(path));
      const compact = body
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[#>*_`\[\]()!-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        path,
        absolutePath,
        folder:
          dirname(path) === "."
            ? ""
            : dirname(path).split(sep).join("/"),
        filename:
          basename(path),
        title,
        content: body,
        summary:
          compact.slice(0, 260),
        mtimeMs:
          Math.trunc(stat.mtimeMs),
        size:
          stat.size,
      };
    })
    .sort((a, b) =>
      a.path.localeCompare(
        b.path,
        "tr",
      ),
    );

  indexedAt = Date.now();
};

const getDoc = (
  path: string,
): Doc | null => {
  const normalized = path
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");

  if (
    !normalized ||
    normalized.includes("../") ||
    normalized === ".."
  ) {
    return null;
  }

  return docs.find(
    (doc) => doc.path === normalized,
  ) ?? null;
};

const json = (
  data: unknown,
  status = 200,
): Response =>
  Response.json(
    data,
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  );

const text = (
  body: string,
  contentType: string,
  status = 200,
): Response =>
  new Response(
    body,
    {
      status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    },
  );

const contentType = (
  path: string,
): string => {
  const extension = extname(path).toLowerCase();

  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js" || extension === ".mjs") return "text/javascript; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".svg") return "image/svg+xml; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";

  return "application/octet-stream";
};

const staticResponse = (
  pathname: string,
): Response | null => {
  const clean = pathname
    .replace(/^\/+/, "")
    .replaceAll("\\", "/");

  if (
    !clean ||
    clean.includes("../") ||
    clean === ".."
  ) {
    return null;
  }

  const absolutePath = resolve(
    STATIC_ROOT,
    clean,
  );

  if (
    absolutePath !== STATIC_ROOT &&
    !isInside(STATIC_ROOT, absolutePath)
  ) {
    return null;
  }

  if (!existsSync(absolutePath)) {
    return null;
  }

  const stat = statSync(absolutePath);

  if (!stat.isFile()) {
    return null;
  }

  return new Response(
    readFileSync(absolutePath),
    {
      headers: {
        "Content-Type": contentType(absolutePath),
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
};

const searchDocs = (
  url: URL,
) => {
  const query = normalize(
    url.searchParams.get("q"),
  );
  const folder = normalize(
    url.searchParams.get("folder"),
  );
  const filename = normalize(
    url.searchParams.get("filename"),
  );
  const titleFilter = normalize(
    url.searchParams.get("title"),
  );
  const description = normalize(
    url.searchParams.get("description"),
  );
  const offset = Math.max(
    0,
    Number(url.searchParams.get("offset") ?? 0) || 0,
  );

  const terms = query
    .split(/\s+/)
    .filter(Boolean);

  const scored = docs
    .map((doc) => {
      const title = normalize(doc.title);
      const path = normalize(doc.path);
      const haystack = normalize(
        [
          doc.path,
          doc.folder,
          doc.filename,
          doc.title,
          doc.content,
        ].join("\n"),
      );

      if (
        folder &&
        !normalize(doc.folder).includes(folder)
      ) {
        return null;
      }

      if (
        filename &&
        !normalize(doc.filename).includes(filename)
      ) {
        return null;
      }

      if (
        titleFilter &&
        !title.includes(titleFilter)
      ) {
        return null;
      }

      if (
        description &&
        !normalize(doc.summary).includes(description)
      ) {
        return null;
      }

      if (
        terms.some(
          (term) => !haystack.includes(term),
        )
      ) {
        return null;
      }

      let score = 0;

      for (const term of terms) {
        if (title.includes(term)) score += 10;
        if (path.includes(term)) score += 5;
        if (haystack.includes(term)) score += 1;
      }

      return {
        doc,
        score,
      };
    })
    .filter(Boolean) as Array<{
      doc: Doc;
      score: number;
    }>;

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.doc.mtimeMs - a.doc.mtimeMs ||
      a.doc.path.localeCompare(
        b.doc.path,
        "tr",
      ),
  );

  const page = scored.slice(
    offset,
    offset + PAGE_SIZE,
  );

  return {
    query,
    filters: {
      folders: folder ? [folder] : [],
      filename,
      title: titleFilter,
      description,
      statuses: [],
      aliases: [],
      tags: [],
    },
    total: scored.length,
    count: page.length,
    offset,
    pageSize: PAGE_SIZE,
    hasMore:
      offset + page.length < scored.length,
    nextOffset:
      offset + page.length < scored.length
        ? offset + page.length
        : null,
    results: page.map(({ doc }) => ({
      title: doc.title,
      url: `/?path=${encodeURIComponent(doc.path)}`,
      section: doc.folder || "Documentation",
      status: "",
      aliases: [],
      tags: [],
      summary: doc.summary,
      updatedAt: doc.mtimeMs,
    })),
  };
};

const markedRenderer =
  new marked.Renderer();

markedRenderer.code = ({
  text,
  lang,
}: {
  text: string;
  lang?: string;
}) => {
  const language =
    String(lang ?? "")
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

  if (
    [
      "mermaid",
      "d2",
      "typst",
      "calendar",
      "canvas",
    ].includes(language)
  ) {
    return `<div class="visual-note visual-${language}" data-visual-language="${language}">${escapeHTML(text)}</div>`;
  }

  return `<pre><code>${escapeHTML(text)}</code></pre>`;
};

const docHTML = (
  doc: Doc,
): string =>
  marked.parse(
    doc.content,
    {
      async: false,
      renderer: markedRenderer,
    },
  ) as string;

const pageHTML = (
  selectedDoc: Doc | null,
) => {
  const title = selectedDoc
    ? `${selectedDoc.title} · Documentation`
    : "Documentation";

  const body = selectedDoc
    ? `
      <article class="note">
        <header class="note-header">
          <div class="note-header-row">
            <nav class="breadcrumbs" aria-label="Breadcrumb">
              <a class="breadcrumb-home" href="/">Documentation</a>
              <span class="breadcrumb-separator" aria-hidden="true">/</span>
              <span class="breadcrumb-section">${escapeHTML(selectedDoc.folder || "root")}</span>
            </nav>
            <button class="copy-note-link" type="button" data-copy-note-link title="Copy document link" aria-label="Copy document link">Copy link</button>
          </div>
          <h1>${escapeHTML(selectedDoc.title)}</h1>
          <div class="note-info">
            <span class="note-stat">${escapeHTML(selectedDoc.filename)}</span>
            <span class="note-stat-separator" aria-hidden="true">·</span>
            <span class="note-stat">${Math.max(1, Math.round(selectedDoc.size / 1024))} KB</span>
            <span class="note-stat-separator" aria-hidden="true">·</span>
            <time class="note-stat note-updated" datetime="${new Date(selectedDoc.mtimeMs).toISOString()}">Updated ${escapeHTML(new Date(selectedDoc.mtimeMs).toLocaleString("tr-TR"))}</time>
          </div>
          <p class="note-description">${escapeHTML(selectedDoc.path)}</p>
        </header>
        <div class="prose">${docHTML(selectedDoc)}</div>
      </article>
    `
    : `
      <section class="section-page">
        <header class="section-header">
          <h1>Documentation</h1>
        </header>
        <p class="section-static-message">Use Alt + K to search read-only Markdown documentation.</p>
        <div class="home-card home-note-card">
          <strong>Read-only</strong>
          <p>This browser indexes Markdown files under <code>${escapeHTML(ROOT)}</code> and ignores <code>${escapeHTML(IGNORES.join(", "))}</code>.</p>
          <p>Create, edit, move, and delete operations are disabled.</p>
        </div>
      </section>
    `;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="knowledge-search-api" content="http://${HOST}:${PORT}">
  <title>${escapeHTML(title)}</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/tags.css">
  <link rel="icon" type="image/png" href="/favicon.png">
</head>
<body>
  <main class="main">${body}</main>

  <div id="command-search" class="command-search" hidden>
    <div class="command-search-backdrop" data-command-search-close></div>
    <section class="command-search-panel" role="dialog" aria-modal="true" aria-label="Search documentation">
      <label class="visually-hidden" for="knowledge-search">Search documentation</label>
      <input id="knowledge-search" class="search-input command-search-input" type="search" placeholder="Search documentation..." autocomplete="off" spellcheck="false" aria-label="Search documentation">
      <details id="search-filters" class="search-filters">
        <summary>Filters</summary>
        <div class="search-filter-fields">
          <label>Folder<input id="search-filter-folder" type="text" autocomplete="off"></label>
          <label>Filename<input id="search-filter-filename" type="text" autocomplete="off"></label>
          <label>Title<input id="search-filter-title" type="text" autocomplete="off"></label>
          <label>Description<input id="search-filter-description" type="text" autocomplete="off"></label>
          <label>Status<input id="search-filter-status" type="text" autocomplete="off" disabled></label>
          <label>Alias<input id="search-filter-alias" type="text" autocomplete="off" disabled></label>
          <label>Tag<input id="search-filter-tag" type="text" autocomplete="off" disabled></label>
          <button id="search-filter-clear" type="button">Clear filters</button>
        </div>
      </details>
      <div id="search-results" class="search-results command-search-results" hidden>
        <div id="search-summary" class="search-summary" hidden></div>
        <div id="search-results-list" class="search-results-list"></div>
      </div>
    </section>
  </div>

  <script src="/js/search.js" defer></script>
  <script src="/js/note-preview.js" defer></script>
  <script src="/js/copy-link.js" defer></script>
  <script src="/js/keyboard-shortcuts.js" defer></script>
  <script src="/js/reading-progress.js" defer></script>
  <script src="/js/visual-renderers.js" defer></script>
  <script src="/js/canvas-renderer.js" defer></script>
</body>
</html>`;
};

const proxyRender = async (
  request: Request,
  pathname: string,
): Promise<Response> => {
  const upstream =
    await fetch(
      `${RENDER_API}${pathname}`,
      {
        method: request.method,
        headers: request.headers,
        body: request.body,
      },
    );

  return new Response(
    upstream.body,
    {
      status: upstream.status,
      headers: upstream.headers,
    },
  );
};

buildIndex();

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (
      request.method === "POST" &&
      (
        url.pathname === "/api/render/d2" ||
        url.pathname === "/api/render/typst" ||
        url.pathname === "/api/render/calendar"
      )
    ) {
      return proxyRender(request, url.pathname);
    }

    if (request.method !== "GET") {
      return json({
        error:
          "Documentation browser is read-only. Create, edit, move, and delete operations are disabled.",
      }, 405);
    }

    const staticFile =
      staticResponse(url.pathname);

    if (staticFile) {
      return staticFile;
    }

    if (url.pathname === "/health") {
      return json({
        ok: true,
        root: ROOT,
        ignores: IGNORES,
        indexedDocs: docs.length,
        indexedAt,
        readOnly: true,
      });
    }

    if (url.pathname === "/api/search") {
      return json(searchDocs(url));
    }

    if (url.pathname === "/api/doc") {
      const doc = getDoc(
        String(url.searchParams.get("path") ?? ""),
      );

      if (!doc) {
        return json({ error: "Document not found." }, 404);
      }

      return json({
        title: doc.title,
        path: doc.path,
        folder: doc.folder,
        filename: doc.filename,
        updatedAt: doc.mtimeMs,
        html: docHTML(doc),
      });
    }

    const selectedDoc =
      getDoc(
        String(url.searchParams.get("path") ?? ""),
      );

    return text(
      pageHTML(selectedDoc),
      "text/html; charset=utf-8",
    );
  },
});

console.log(
  `Documentation browser: http://${HOST}:${server.port}`,
);
console.log(`root=${ROOT}`);
console.log(`ignored=${IGNORES.join(":")}`);
console.log(`indexed=${docs.length}`);
