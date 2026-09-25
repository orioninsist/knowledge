import {
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

import { Database } from "bun:sqlite";

export type DocsIndexConfig = {
  root: string;
  ignores: string[];
  dbPath: string;
};

export type DocsIndexResult = {
  scanned: number;
  updated: number;
  unchanged: number;
  deleted: number;
  indexed: number;
  indexedAt: number;
};

const isInside = (parent: string, child: string): boolean => {
  const rel = relative(parent, child);
  return Boolean(rel) && rel !== ".." && !rel.startsWith(`..${sep}`);
};

export const normalizeDocsConfig = (config: DocsIndexConfig): DocsIndexConfig => ({
  root: resolve(config.root),
  ignores: config.ignores.map((item) => resolve(item)),
  dbPath: config.dbPath,
});

const isIgnored = (config: DocsIndexConfig, absolutePath: string): boolean => {
  const resolved = resolve(absolutePath);
  return config.ignores.some((ignore) => resolved === ignore || isInside(ignore, resolved));
};

const toRelative = (config: DocsIndexConfig, absolutePath: string): string =>
  relative(config.root, absolutePath).split(sep).join("/");

const stripFrontmatter = (source: string): string => {
  if (!source.startsWith("---")) return source;
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return source;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  return end >= 0 ? lines.slice(end + 1).join("\n") : source;
};

const firstHeading = (body: string): string =>
  body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";

const compactSummary = (body: string): string =>
  body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);

export const openDocsDatabase = (dbPath: string, readonly = false): Database => {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath, { create: !readonly, readonly });

  if (!readonly) {
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");
    db.run("PRAGMA temp_store = MEMORY");
  }

  if (readonly) {
    return db;
  }

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
  mtime_ms INTEGER NOT NULL,
  size INTEGER NOT NULL,
  scan_generation INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS documents_folder_idx ON documents(folder);
CREATE INDEX IF NOT EXISTS documents_filename_idx ON documents(filename);
CREATE INDEX IF NOT EXISTS documents_mtime_idx ON documents(mtime_ms);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  path,
  folder,
  filename,
  title,
  summary,
  content,
  tokenize='unicode61 remove_diacritics 2'
);
`);

  return db;
};

const walk = (config: DocsIndexConfig, dir: string, output: string[]) => {
  if (isIgnored(config, dir)) return;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const absolutePath = join(dir, entry.name);
    if (isIgnored(config, absolutePath)) continue;
    if (entry.isDirectory()) {
      walk(config, absolutePath, output);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      output.push(absolutePath);
    }
  }
};

export const buildDocsIndex = async (rawConfig: DocsIndexConfig): Promise<DocsIndexResult> => {
  const config = normalizeDocsConfig(rawConfig);
  const db = openDocsDatabase(config.dbPath);
  const generation = Date.now();
  const files: string[] = [];
  let scanned = 0;
  let updated = 0;
  let unchanged = 0;

  walk(config, config.root, files);

  const existingQuery = db.query(`SELECT mtime_ms, size FROM documents WHERE path = ?`);
  const touchQuery = db.query(`UPDATE documents SET scan_generation = ? WHERE path = ?`);
  const upsertQuery = db.query(`
    INSERT INTO documents(path, absolute_path, folder, filename, title, summary, mtime_ms, size, scan_generation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      absolute_path = excluded.absolute_path,
      folder = excluded.folder,
      filename = excluded.filename,
      title = excluded.title,
      summary = excluded.summary,
      mtime_ms = excluded.mtime_ms,
      size = excluded.size,
      scan_generation = excluded.scan_generation
  `);
  const deleteFts = db.query(`DELETE FROM documents_fts WHERE path = ?`);
  const insertFts = db.query(`INSERT INTO documents_fts(path, folder, filename, title, summary, content) VALUES (?, ?, ?, ?, ?, ?)`);

  for (const file of files) {
    scanned += 1;
    const stat = statSync(file);
    const mtimeMs = Math.trunc(stat.mtimeMs);
    const size = stat.size;
    const path = toRelative(config, file);
    const current = existingQuery.get(path) as { mtime_ms: number; size: number } | null;

    if (current && current.mtime_ms === mtimeMs && current.size === size) {
      touchQuery.run(generation, path);
      unchanged += 1;
    } else {
      const source = readFileSync(file, "utf8");
      const body = stripFrontmatter(source);
      const folder = dirname(path) === "." ? "" : dirname(path).split(sep).join("/");
      const filename = basename(path);
      const title = firstHeading(body) || basename(path, extname(path));
      const summary = compactSummary(body);

      db.transaction(() => {
        upsertQuery.run(path, file, folder, filename, title, summary, mtimeMs, size, generation);
        deleteFts.run(path);
        insertFts.run(path, folder, filename, title, summary, body);
      })();
      updated += 1;
    }

    if (scanned % 250 === 0) await Bun.sleep(0);
  }

  const stale = db.query(`SELECT path FROM documents WHERE scan_generation != ?`).all(generation) as Array<{ path: string }>;
  db.transaction(() => {
    const deleteDoc = db.query(`DELETE FROM documents WHERE path = ?`);
    const deleteDocFts = db.query(`DELETE FROM documents_fts WHERE path = ?`);
    for (const row of stale) {
      deleteDoc.run(row.path);
      deleteDocFts.run(row.path);
    }
    db.query(`
      INSERT INTO docs_meta(key, value) VALUES('indexed_at', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(generation));
  })();

  db.run("PRAGMA optimize");
  const row = db.query(`SELECT COUNT(*) AS count FROM documents`).get() as { count: number };
  db.close();

  return { scanned, updated, unchanged, deleted: stale.length, indexed: row.count, indexedAt: generation };
};
