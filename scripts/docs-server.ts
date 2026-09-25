import {
  existsSync,
  mkdirSync,
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
  Database,
} from "bun:sqlite";

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

const RUNTIME_DIR =
  join(PROJECT_ROOT, ".runtime", "docs");

const DB_PATH =
  join(RUNTIME_DIR, "docs.db");

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

const compactSummary = (
  body: string,
): string =>
  body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);

type DocRow = {
  path: string;
  absolute_path: string;
  folder: string;
  filename: string;
  title: string;
  summary: string;
  mtime_ms: number;
  size: number;
};

mkdirSync(
  RUNTIME_DIR,
  {
    recursive: true,
  },
);

const db = new Database(
  DB_PATH,
  {
    create: true,
  },
);

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");
db.run("PRAGMA temp_store = MEMORY");

db.run(`
CREATE TABLE IF NOT EXISTS docs_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  path TEXT PRIMARY KEY,
  absolute_path TEXT NOT NULL,
  folder TEXT NOT NULL,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  size INTEGER NOT NULL,
  scan_generation INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS documents_folder_idx
ON documents(folder);

CREATE INDEX IF NOT EXISTS documents_filename_idx
ON documents(filename);

CREATE INDEX IF NOT EXISTS documents_mtime_idx
ON documents(mtime_ms);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title,
  path,
  folder,
  filename,
  summary,
  content,
  content='documents',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS documents_fts_insert
AFTER INSERT ON documents
BEGIN
  INSERT INTO documents_fts(
    rowid,
    title,
    path,
    folder,
    filename,
    summary,
    content
  )
  VALUES (
    new.rowid,
    new.title,
    new.path,
    new.folder,
    new.filename,
    new.summary,
    new.content
  );
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_delete
AFTER DELETE ON documents
BEGIN
  INSERT INTO documents_fts(
    documents_fts,
    rowid,
    title,
    path,
    folder,
    filename,
    summary,
    content
  )
  VALUES (
    'delete',
    old.rowid,
    old.title,
    old.path,
    old.folder,
    old.filename,
    old.summary,
    old.content
  );
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_update
AFTER UPDATE OF
  title,
  path,
  folder,
  filename,
  summary,
  content
ON documents
BEGIN
  INSERT INTO documents_fts(
    documents_fts,
    rowid,
    title,
    path,
    folder,
    filename,
    summary,
    content
  )
  VALUES (
    'delete',
    old.rowid,
    old.title,
    old.path,
    old.folder,
    old.filename,
    old.summary,
    old.content
  );

  INSERT INTO documents_fts(
    rowid,
    title,
    path,
    folder,
    filename,
    summary,
    content
  )
  VALUES (
    new.rowid,
    new.title,
    new.path,
    new.folder,
    new.filename,
    new.summary,
    new.content
  );
END;
`);

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

const existingQuery =
  db.query(`
    SELECT
      mtime_ms,
      size
    FROM documents
    WHERE path = ?
  `);

const touchQuery =
  db.query(`
    UPDATE documents
    SET scan_generation = ?
    WHERE path = ?
  `);

const upsertQuery =
  db.query(`
    INSERT INTO documents (
      path,
      absolute_path,
      folder,
      filename,
      title,
      summary,
      content,
      mtime_ms,
      size,
      scan_generation
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path)
    DO UPDATE SET
      absolute_path = excluded.absolute_path,
      folder = excluded.folder,
      filename = excluded.filename,
      title = excluded.title,
      summary = excluded.summary,
      content = excluded.content,
      mtime_ms = excluded.mtime_ms,
      size = excluded.size,
      scan_generation = excluded.scan_generation
  `);

const indexDocument = (
  absolutePath: string,
  generation: number,
) => {
  const stat = statSync(absolutePath);
  const mtimeMs = Math.trunc(stat.mtimeMs);
  const size = stat.size;
  const path = toRelative(absolutePath);

  const current = existingQuery.get(
    path,
  ) as
    | {
        mtime_ms: number;
        size: number;
      }
    | null;

  if (
    current &&
    current.mtime_ms === mtimeMs &&
    current.size === size
  ) {
    touchQuery.run(
      generation,
      path,
    );
    return;
  }

  const source = readFileSync(
    absolutePath,
    "utf8",
  );
  const body = stripFrontmatter(source);
  const folder = dirname(path) === "."
    ? ""
    : dirname(path).split(sep).join("/");
  const filename = basename(path);
  const title = firstHeading(body) ||
    basename(path, extname(path));
  const summary = compactSummary(body);

  upsertQuery.run(
    path,
    absolutePath,
    folder,
    filename,
    title,
    summary,
    body,
    mtimeMs,
    size,
    generation,
  );
};

const buildIndex = () => {
  const generation = Date.now();
  const files: string[] = [];
  walk(ROOT, files);

  const tx = db.transaction(
    () => {
      for (const file of files) {
        indexDocument(file, generation);
      }

      db.query(`
        DELETE FROM documents
        WHERE scan_generation != ?
      `).run(generation);

      db.query(`
        INSERT INTO docs_meta(key, value)
        VALUES('indexed_at', ?)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value
      `).run(String(generation));
    },
  );

  tx();
};

const getIndexedAt = (): number => {
  const row = db.query(`
    SELECT value
    FROM docs_meta
    WHERE key = 'indexed_at'
  `).get() as
    | { value: string }
    | null;

  return Number(row?.value ?? 0);
};

const getDoc = (
  path: string,
): DocRow | null => {
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

  return db.query(`
    SELECT
      path,
      absolute_path,
      folder,
      filename,
      title,
      summary,
      mtime_ms,
      size
    FROM documents
    WHERE path = ?
    LIMIT 1
  `).get(normalized) as DocRow | null;
};

const readDocContent = (
  doc: DocRow,
): string => {
  if (
    !isInside(ROOT, doc.absolute_path) ||
    isIgnored(doc.absolute_path)
  ) {
    throw new Error(
      "Document path is outside the documentation root.",
    );
  }

  return stripFrontmatter(
    readFileSync(
      doc.absolute_path,
      "utf8",
    ),
  );
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

const escapeFTSTerm = (
  value: string,
): string =>
  `"${value.replaceAll('"', '""')}"`;

const buildFTSQuery = (
  terms: string[],
): string =>
  terms
    .map((term) => `${escapeFTSTerm(term)}*`)
    .join(" AND ");

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

  const rawTerms = query
    .split(/\s+/)
    .filter(Boolean);

  const where: string[] = [];
  const params: Array<string | number> = [];

  const ftsTerms = rawTerms.filter(
    (term) => term.length >= 2,
  );
  const prefixTerms = rawTerms.filter(
    (term) => term.length < 2,
  );
  const ftsQuery = buildFTSQuery(ftsTerms);
  const hasFts = Boolean(ftsQuery);

  if (hasFts) {
    where.push("documents_fts MATCH ?");
    params.push(ftsQuery);
  }

  for (const term of prefixTerms) {
    where.push(`(
      d.title LIKE ? OR
      d.path LIKE ? OR
      d.filename LIKE ? OR
      d.folder LIKE ?
    )`);
    params.push(
      `${term}%`,
      `%/${term}%`,
      `${term}%`,
      `${term}%`,
    );
  }

  if (folder) {
    where.push("d.folder LIKE ?");
    params.push(`%${folder}%`);
  }

  if (filename) {
    where.push("d.filename LIKE ?");
    params.push(`%${filename}%`);
  }

  if (titleFilter) {
    where.push("d.title LIKE ?");
    params.push(`%${titleFilter}%`);
  }

  if (description) {
    where.push("d.summary LIKE ?");
    params.push(`%${description}%`);
  }

  const from = hasFts
    ? `
      FROM documents_fts
      JOIN documents AS d
        ON d.rowid = documents_fts.rowid
    `
    : `
      FROM documents AS d
    `;

  const whereSQL = where.length
    ? `WHERE ${where.join(" AND ")}`
    : "";

  const ranking = hasFts
    ? `
      bm25(
        documents_fts,
        10.0,
        6.0,
        4.0,
        4.0,
        2.0,
        1.0
      ) ASC,
    `
    : "";

  const countRow = db.query(`
    SELECT COUNT(*) AS total
    ${from}
    ${whereSQL}
  `).get(...params) as { total: number };

  const rows = db.query(`
    SELECT
      d.path,
      d.absolute_path,
      d.folder,
      d.filename,
      d.title,
      d.summary,
      d.mtime_ms,
      d.size
    ${from}
    ${whereSQL}
    ORDER BY
      ${ranking}
      d.mtime_ms DESC,
      d.path COLLATE NOCASE ASC
    LIMIT ?
    OFFSET ?
  `).all(
    ...params,
    PAGE_SIZE,
    offset,
  ) as DocRow[];

  const total = Number(countRow?.total ?? 0);

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
    total,
    count: rows.length,
    offset,
    pageSize: PAGE_SIZE,
    hasMore:
      offset + rows.length < total,
    nextOffset:
      offset + rows.length < total
        ? offset + rows.length
        : null,
    results: rows.map((doc) => ({
      title: doc.title,
      url: `/?path=${encodeURIComponent(doc.path)}`,
      section: doc.folder || "Documentation",
      status: "",
      aliases: [],
      tags: [],
      summary: doc.summary,
      updatedAt: doc.mtime_ms,
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
  const language = String(lang ?? "")
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
  doc: DocRow,
): string =>
  marked.parse(
    readDocContent(doc),
    {
      async: false,
      renderer: markedRenderer,
    },
  ) as string;

const pageHTML = (
  selectedDoc: DocRow | null,
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
            <time class="note-stat note-updated" datetime="${new Date(selectedDoc.mtime_ms).toISOString()}">Updated ${escapeHTML(new Date(selectedDoc.mtime_ms).toLocaleString("tr-TR"))}</time>
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
        <p class="section-static-message">Use Alt + K to search documentation.</p>
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
  const upstream = await fetch(
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

    const staticFile = staticResponse(
      url.pathname,
    );

    if (staticFile) {
      return staticFile;
    }

    if (url.pathname === "/health") {
      const row = db.query(`
        SELECT COUNT(*) AS count
        FROM documents
      `).get() as { count: number };

      return json({
        ok: true,
        root: ROOT,
        ignores: IGNORES,
        indexedDocs: row.count,
        indexedAt: getIndexedAt(),
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
        updatedAt: doc.mtime_ms,
        html: docHTML(doc),
      });
    }

    const selectedDoc = getDoc(
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
console.log(`database=${DB_PATH}`);
