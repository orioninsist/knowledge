import {
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
    !rel.startsWith(`..${sep}`) &&
    !resolve(child).startsWith(`..${sep}`);
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
  const offset = Math.max(
    0,
    Number(url.searchParams.get("offset") ?? 0) || 0,
  );

  const terms = query
    .split(/\s+/)
    .filter(Boolean);

  const scored = docs
    .map((doc) => {
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
        terms.some(
          (term) => !haystack.includes(term),
        )
      ) {
        return null;
      }

      let score = 0;
      const title = normalize(doc.title);
      const path = normalize(doc.path);

      for (const term of terms) {
        if (title.includes(term)) {
          score += 10;
        }

        if (path.includes(term)) {
          score += 5;
        }

        if (haystack.includes(term)) {
          score += 1;
        }
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
      title: "",
      description: "",
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
      section: doc.folder || "root",
      status: "",
      aliases: [],
      tags: [],
      summary: doc.summary,
      updatedAt: doc.mtimeMs,
    })),
  };
};

const pageHTML = () => `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Documentation Browser</title>
  <style>
    :root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;--bg:#f7f7f5;--fg:#171717;--muted:#666;--line:#ddd;--panel:#fff;--accent:#0f766e;}
    @media (prefers-color-scheme: dark){:root{--bg:#101112;--fg:#f3f3f0;--muted:#a4a4a0;--line:#333;--panel:#181a1b;--accent:#5eead4;}}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg)}.shell{display:grid;grid-template-columns:minmax(320px,420px) 1fr;min-height:100vh}.side{border-right:1px solid var(--line);background:var(--panel);padding:18px;position:sticky;top:0;height:100vh;overflow:auto}.brand{font-weight:800;font-size:18px;margin-bottom:12px}.root{font-size:12px;color:var(--muted);word-break:break-all;margin-bottom:14px}.search{width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--fg);font-size:15px}.filters{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 14px}.filters input{width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--fg)}.summary{font-size:12px;color:var(--muted);margin-bottom:8px}.results{display:grid;gap:8px}.result{display:block;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:8px;padding:10px;background:color-mix(in srgb,var(--panel),var(--bg) 20%)}.result:hover,.result.is-active{border-color:var(--accent)}.result strong{display:block;font-size:14px}.result small{display:block;color:var(--muted);font-size:12px;margin:3px 0}.result span{font-size:13px;color:var(--muted)}.doc{max-width:980px;padding:34px 42px 80px}.doc-path{color:var(--muted);font-size:13px;word-break:break-all}.doc h1,.doc h2,.doc h3{line-height:1.2}.doc pre{overflow:auto;border:1px solid var(--line);border-radius:8px;padding:14px;background:var(--panel)}.doc code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.doc img{max-width:100%}.empty{color:var(--muted);padding:24px;border:1px dashed var(--line);border-radius:8px}@media(max-width:820px){.shell{display:block}.side{position:relative;height:auto;border-right:0;border-bottom:1px solid var(--line)}.doc{padding:24px 18px 60px}}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="side">
      <div class="brand">Documentation Browser</div>
      <div class="root">${escapeHTML(ROOT)}<br>Ignoring: ${escapeHTML(IGNORES.join(", "))}</div>
      <input id="q" class="search" type="search" placeholder="Search documentation..." autocomplete="off" autofocus>
      <div class="filters">
        <input id="folder" placeholder="Folder filter">
        <input id="filename" placeholder="Filename filter">
      </div>
      <div id="summary" class="summary"></div>
      <div id="results" class="results"></div>
    </aside>
    <main id="doc" class="doc"><div class="empty">Search, then open a Markdown document. This browser is read-only.</div></main>
  </div>
  <script>
    const q=document.getElementById('q'), folder=document.getElementById('folder'), filename=document.getElementById('filename'), results=document.getElementById('results'), summary=document.getElementById('summary'), doc=document.getElementById('doc');
    let timer=null, active=-1;
    const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
    async function search(){const u=new URL('/api/search',location.origin); if(q.value.trim())u.searchParams.set('q',q.value.trim()); if(folder.value.trim())u.searchParams.set('folder',folder.value.trim()); if(filename.value.trim())u.searchParams.set('filename',filename.value.trim()); const r=await fetch(u,{cache:'no-store'}); const p=await r.json(); summary.textContent=p.total+' result'+(p.total===1?'':'s'); results.innerHTML=(p.results||[]).map(x=>'<a class="result" href="'+esc(x.url)+'" data-path="'+esc(new URL(x.url, location.origin).searchParams.get('path'))+'"><strong>'+esc(x.title)+'</strong><small>'+esc(x.section)+'</small><span>'+esc(x.summary)+'</span></a>').join('') || '<div class="empty">No matching documents.</div>'; active=-1; }
    function schedule(){clearTimeout(timer); timer=setTimeout(search,80)}
    async function openPath(path){if(!path)return; const u=new URL('/api/doc',location.origin); u.searchParams.set('path',path); const r=await fetch(u,{cache:'no-store'}); const p=await r.json(); if(!r.ok){doc.innerHTML='<div class="empty">'+esc(p.error||'Document unavailable')+'</div>'; return;} doc.innerHTML='<div class="doc-path">'+esc(p.path)+'</div>'+p.html; history.replaceState(null,'','/?path='+encodeURIComponent(path)); document.title=p.title+' · Documentation Browser';}
    q.addEventListener('input',schedule); folder.addEventListener('input',schedule); filename.addEventListener('input',schedule);
    results.addEventListener('click',e=>{const a=e.target.closest('a[data-path]'); if(!a)return; e.preventDefault(); openPath(a.dataset.path);});
    q.addEventListener('keydown',e=>{const links=[...results.querySelectorAll('.result')]; if(!links.length)return; if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault(); active=e.key==='ArrowDown'?active+1:active-1; if(active<0)active=links.length-1; if(active>=links.length)active=0; links.forEach(x=>x.classList.remove('is-active')); links[active].classList.add('is-active'); links[active].scrollIntoView({block:'nearest'});} if(e.key==='Enter'&&active>=0){e.preventDefault(); links[active].click();}});
    search(); openPath(new URL(location.href).searchParams.get('path'));
  </script>
</body>
</html>`;

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
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "GET") {
      return json({
        error:
          "Documentation browser is read-only. Create, edit, move, and delete operations are disabled.",
      }, 405);
    }

    if (url.pathname === "/" || url.pathname === "/docs") {
      return text(pageHTML(), "text/html; charset=utf-8");
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

      const html = marked.parse(
        doc.content,
        {
          async: false,
        },
      ) as string;

      return json({
        title: doc.title,
        path: doc.path,
        folder: doc.folder,
        filename: doc.filename,
        updatedAt: doc.mtimeMs,
        html,
      });
    }

    return text(pageHTML(), "text/html; charset=utf-8");
  },
});

console.log(
  `Documentation browser: http://${HOST}:${server.port}`,
);
console.log(`root=${ROOT}`);
console.log(`ignored=${IGNORES.join(":")}`);
console.log(`indexed=${docs.length}`);
