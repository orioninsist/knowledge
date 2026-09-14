import {
  Database,
} from "bun:sqlite";

import {
  YAML,
} from "bun";

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";

import {
  basename,
  join,
} from "node:path";

import {
  getWorkspace,
  validateWorkspace,
} from "./workspaces";

const id =
  process.argv[2];

const mode =
  process.argv[3] ?? "full";

const eventPath =
  process.argv[4];

if (!id) {
  throw new Error(
    "Usage: bun scripts/build-workspace-index.ts <workspace-id> [--upsert|--delete] [absolute-path]"
  );
}

if (
  mode !== "full" &&
  mode !== "--upsert" &&
  mode !== "--delete"
) {
  throw new Error(
    `Unknown index mode: ${mode}`
  );
}

if (
  mode !== "full" &&
  !eventPath
) {
  throw new Error(
    `${mode} requires an absolute Markdown path`
  );
}

const workspace =
  validateWorkspace(
    getWorkspace(id),
  );

const runtimeDir =
  join(
    process.cwd(),
    ".runtime",
    workspace.id,
  );

mkdirSync(
  runtimeDir,
  {
    recursive: true,
  },
);

const DB_PATH =
  join(
    runtimeDir,
    "knowledge.db",
  );

const db =
  new Database(
    DB_PATH,
    {
      create: true,
    },
  );

db.run(
  "PRAGMA foreign_keys = ON"
);

db.run(
  "PRAGMA journal_mode = WAL"
);

db.run(`
CREATE TABLE IF NOT EXISTS search_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,

  path TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL,

  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',

  aliases TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',

  mtime_ms INTEGER NOT NULL,
  size INTEGER NOT NULL,
  scan_generation INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS notes_section_idx
ON notes(section);

CREATE INDEX IF NOT EXISTS notes_status_idx
ON notes(status);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL,
  tag TEXT NOT NULL,

  PRIMARY KEY(note_id, tag),

  FOREIGN KEY(note_id)
    REFERENCES notes(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS note_tags_tag_idx
ON note_tags(tag, note_id);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  description,
  aliases,
  tags,
  content,

  content='notes',
  content_rowid='id',

  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS notes_fts_insert
AFTER INSERT ON notes
BEGIN
  INSERT INTO notes_fts(
    rowid,
    title,
    description,
    aliases,
    tags,
    content
  )
  VALUES (
    new.id,
    new.title,
    new.description,
    new.aliases,
    new.tags,
    new.content
  );
END;

CREATE TRIGGER IF NOT EXISTS notes_fts_delete
AFTER DELETE ON notes
BEGIN
  INSERT INTO notes_fts(
    notes_fts,
    rowid,
    title,
    description,
    aliases,
    tags,
    content
  )
  VALUES (
    'delete',
    old.id,
    old.title,
    old.description,
    old.aliases,
    old.tags,
    old.content
  );
END;

CREATE TRIGGER IF NOT EXISTS notes_fts_update
AFTER UPDATE OF
  title,
  description,
  aliases,
  tags,
  content
ON notes
BEGIN
  INSERT INTO notes_fts(
    notes_fts,
    rowid,
    title,
    description,
    aliases,
    tags,
    content
  )
  VALUES (
    'delete',
    old.id,
    old.title,
    old.description,
    old.aliases,
    old.tags,
    old.content
  );

  INSERT INTO notes_fts(
    rowid,
    title,
    description,
    aliases,
    tags,
    content
  )
  VALUES (
    new.id,
    new.title,
    new.description,
    new.aliases,
    new.tags,
    new.content
  );
END;
`);

const asString = (
  value: unknown,
): string =>
  value === null ||
  value === undefined
    ? ""
    : String(value).trim();

const asArray = (
  value: unknown,
): string[] => {
  if (
    Array.isArray(value)
  ) {
    return value
      .map(asString)
      .filter(Boolean);
  }

  const single =
    asString(value);

  return single
    ? [single]
    : [];
};

const normalize = (
  value: string,
) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKC")
    .trim();

const parseMarkdown = (
  source: string,
) => {
  if (
    !source.startsWith("---")
  ) {
    return {
      metadata: {} as Record<string, unknown>,
      body: source,
    };
  }

  const lines =
    source.split(/\r?\n/);

  if (
    lines[0].trim() !== "---"
  ) {
    return {
      metadata: {} as Record<string, unknown>,
      body: source,
    };
  }

  const end =
    lines.findIndex(
      (line, index) =>
        index > 0 &&
        line.trim() === "---"
    );

  if (
    end === -1
  ) {
    return {
      metadata: {} as Record<string, unknown>,
      body: source,
    };
  }

  const frontmatter =
    lines
      .slice(1, end)
      .join("\n");

  const metadata =
    frontmatter.trim()
      ? YAML.parse(frontmatter)
      : {};

  return {
    metadata:
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata)
        ? metadata as Record<string, unknown>
        : {},

    body:
      lines
        .slice(end + 1)
        .join("\n"),
  };
};

const firstHeading = (
  body: string,
) =>
  body.match(
    /^#\s+(.+)$/m
  )?.[1]?.trim() ?? "";

const existingQuery =
  db.query(`
    SELECT
      id,
      mtime_ms,
      size
    FROM notes
    WHERE path = ?
  `);

const touchQuery =
  db.query(`
    UPDATE notes
    SET scan_generation = ?
    WHERE path = ?
  `);

const upsertQuery =
  db.query(`
    INSERT INTO notes (
      path,
      section,
      title,
      description,
      status,
      aliases,
      tags,
      content,
      mtime_ms,
      size,
      scan_generation
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(path)
    DO UPDATE SET
      section = excluded.section,
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      aliases = excluded.aliases,
      tags = excluded.tags,
      content = excluded.content,
      mtime_ms = excluded.mtime_ms,
      size = excluded.size,
      scan_generation = excluded.scan_generation
  `);

const idQuery =
  db.query(`
    SELECT id
    FROM notes
    WHERE path = ?
  `);

const deleteTags =
  db.query(`
    DELETE FROM note_tags
    WHERE note_id = ?
  `);

const insertTag =
  db.query(`
    INSERT OR IGNORE INTO note_tags(
      note_id,
      tag
    )
    VALUES (?, ?)
  `);

const deleteNoteQuery =
  db.query(`
    DELETE FROM notes
    WHERE path = ?
  `);

const resolveNotePath = (
  absolutePath: string,
) => {
  for (
    const section
    of workspace.sections
  ) {
    const prefix =
      `${section.path}/`;

    if (
      absolutePath.startsWith(
        prefix
      )
    ) {
      const name =
        absolutePath.slice(
          prefix.length
        );

      if (
        !name ||
        name.includes("/")
      ) {
        return null;
      }

      return {
        section,
        name,
        relativePath:
          `${section.directory}/${name}`,
      };
    }
  }

  return null;
};

const upsertSingleNote = (
  absolutePath: string,
  generation: number,
) => {
  const resolved =
    resolveNotePath(
      absolutePath
    );

  if (!resolved) {
    throw new Error(
      `Markdown path is outside fixed workspace sections: ${absolutePath}`
    );
  }

  const {
    section,
    name,
    relativePath,
  } = resolved;

  if (
    !name.endsWith(".md") ||
    name === "_index.md" ||
    name === "index.md"
  ) {
    return "ignored";
  }

  const stat =
    statSync(
      absolutePath
    );

  const mtime =
    Math.trunc(
      stat.mtimeMs
    );

  const current =
    existingQuery.get(
      relativePath
    ) as
      | {
          id: number;
          mtime_ms: number;
          size: number;
        }
      | null;

  if (
    current &&
    current.mtime_ms === mtime &&
    current.size === stat.size
  ) {
    touchQuery.run(
      generation,
      relativePath,
    );

    return "unchanged";
  }

  const source =
    readFileSync(
      absolutePath,
      "utf8"
    );

  const {
    metadata,
    body,
  } =
    parseMarkdown(
      source
    );

  const title =
    asString(
      metadata.title
    ) ||
    firstHeading(body) ||
    basename(
      name,
      ".md"
    );

  const description =
    asString(
      metadata.description
    );

  const status =
    normalize(
      asString(
        metadata.status
      )
    );

  const aliases =
    asArray(
      metadata.aliases
    );

  const tags =
    [
      ...new Set(
        asArray(
          metadata.tags
        )
          .map(normalize)
          .filter(Boolean)
      ),
    ];

  upsertQuery.run(
    relativePath,
    section.section,
    title,
    description,
    status,
    aliases.join("\\n"),
    tags.join("\\n"),
    body,
    mtime,
    stat.size,
    generation,
  );

  const row =
    idQuery.get(
      relativePath
    ) as
      | { id: number }
      | null;

  if (!row) {
    throw new Error(
      `Could not resolve note ID: ${relativePath}`
    );
  }

  deleteTags.run(
    row.id
  );

  for (
    const tag
    of tags
  ) {
    insertTag.run(
      row.id,
      tag
    );
  }

  return "updated";
};

const deleteSingleNote = (
  absolutePath: string,
) => {
  const resolved =
    resolveNotePath(
      absolutePath
    );

  if (!resolved) {
    throw new Error(
      `Markdown path is outside fixed workspace sections: ${absolutePath}`
    );
  }

  if (
    !resolved.name.endsWith(
      ".md"
    )
  ) {
    return;
  }

  /*
   * note_tags is removed through ON DELETE CASCADE.
   * notes_fts is removed through notes_fts_delete.
   */
  deleteNoteQuery.run(
    resolved.relativePath
  );
};

const generationRow =
  db.query(`
    SELECT value
    FROM search_meta
    WHERE key = 'scan_generation'
  `).get() as
    | { value: string }
    | null;

const generation =
  Number(
    generationRow?.value ?? "0"
  ) + 1;

db.query(`
  INSERT INTO search_meta(
    key,
    value
  )
  VALUES(
    'scan_generation',
    ?
  )
  ON CONFLICT(key)
  DO UPDATE SET
    value = excluded.value
`).run(
  String(generation)
);

let scanned = 0;
let updated = 0;
let unchanged = 0;
let ignored = 0;

if (
  mode === "--upsert"
) {
  db.run("BEGIN IMMEDIATE");

  try {
    const result =
      upsertSingleNote(
        eventPath!,
        generation,
      );

    if (
      result === "updated"
    ) {
      updated = 1;
    } else if (
      result === "unchanged"
    ) {
      unchanged = 1;
    } else {
      ignored = 1;
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
} else if (
  mode === "--delete"
) {
  db.run("BEGIN IMMEDIATE");

  try {
    deleteSingleNote(
      eventPath!
    );

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
} else {
  db.run("BEGIN IMMEDIATE");

  try {
    for (
      const section
      of workspace.sections
    ) {
      const entries =
        readdirSync(
          section.path,
          {
            withFileTypes: true,
          },
        );

      for (
        const entry
        of entries
      ) {
        if (
          !entry.isFile()
        ) {
          continue;
        }

        if (
          !entry.name.endsWith(
            ".md"
          )
        ) {
          ignored += 1;
          continue;
        }

        if (
          entry.name ===
          "_index.md" ||
          entry.name ===
          "index.md"
        ) {
          continue;
        }

        scanned += 1;

        const absolutePath =
          join(
            section.path,
            entry.name,
          );

        const result =
          upsertSingleNote(
            absolutePath,
            generation,
          );

        if (
          result === "updated"
        ) {
          updated += 1;
        } else if (
          result === "unchanged"
        ) {
          unchanged += 1;
        } else {
          ignored += 1;
        }
      }
    }

    db.query(`
      DELETE FROM notes
      WHERE scan_generation != ?
    `).run(
      generation
    );

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

db.run(
  "PRAGMA optimize"
);

const indexed =
  db.query(`
    SELECT count(*) AS count
    FROM notes
  `).get() as {
    count: number;
  };

db.close();

console.log(
  `workspace=${workspace.id}`
);

console.log(
  `database=${DB_PATH}`
);

console.log(
  `scanned=${scanned}`
);

console.log(
  `updated=${updated}`
);

console.log(
  `unchanged=${unchanged}`
);

console.log(
  `ignored=${ignored}`
);

console.log(
  `indexed=${indexed.count}`
);
