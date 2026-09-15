import { Database } from "bun:sqlite";

import {
  basename,
  extname,
} from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(
  process.env.KNOWLEDGE_API_PORT ??
  "8787",
);

const DB_PATH =
  process.env.KNOWLEDGE_DB_PATH ??
  ".search/knowledge.db";

const MAX_RESULTS = 5;

const SECTION_ALIASES: Record<string, string> = {
  inbox: "inbox",

  project: "projects",
  projects: "projects",

  area: "areas",
  areas: "areas",

  resource: "resources",
  resources: "resources",

  archive: "archives",
  archives: "archives",
};

const normalize = (
  value: unknown,
): string =>
  String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKC")
    .trim();

type ParsedQuery = {
  terms: string[];
  sections: string[];
  tags: string[];
  statuses: string[];
};

const parseQuery = (
  rawQuery: string,
): ParsedQuery => {
  const parsed: ParsedQuery = {
    terms: [],
    sections: [],
    tags: [],
    statuses: [],
  };

  const tokens =
    rawQuery.match(/"[^"]*"|\S+/g) ?? [];

  for (const rawToken of tokens) {
    const quoted =
      rawToken.startsWith('"') &&
      rawToken.endsWith('"');

    const token = quoted
      ? rawToken.slice(1, -1)
      : rawToken;

    const filterMatch = token.match(
      /^(section|tag|status):(.+)$/i,
    );

    if (!filterMatch) {
      if (token.trim()) {
        parsed.terms.push(
          token.trim(),
        );
      }

      continue;
    }

    const field =
      filterMatch[1].toLowerCase();

    const value =
      normalize(filterMatch[2]);

    if (!value) {
      continue;
    }

    if (field === "section") {
      parsed.sections.push(
        SECTION_ALIASES[value] ??
        value,
      );

      continue;
    }

    if (field === "tag") {
      parsed.tags.push(
        value.replace(/^#/, ""),
      );

      continue;
    }

    if (field === "status") {
      parsed.statuses.push(value);
    }
  }

  return parsed;
};

const escapeFTSTerm = (
  value: string,
): string =>
  `"${value.replaceAll('"', '""')}"`;

const buildFTSQuery = (
  terms: string[],
): string =>
  terms
    .flatMap(
      (term) =>
        normalize(term)
          .split(
            /[^\p{L}\p{N}_]+/u,
          )
          .filter(Boolean),
    )
    .map(
      (term) =>
        `${escapeFTSTerm(term)}*`,
    )
    .join(" AND ");

const getURL = (
  path: string,
  section: string,
): string => {
  const filename =
    basename(path);

  const extension =
    extname(filename);

  const stem =
    filename.slice(
      0,
      filename.length -
        extension.length,
    );

  return `/${section}/${encodeURIComponent(stem)}/`;
};

const splitStoredList = (
  value: unknown,
): string[] =>
  String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

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

const search = (
  db: Database,
  rawQuery: string,
) => {
  const parsed =
    parseQuery(rawQuery);

  const where: string[] = [];
  const params: Array<
    string | number
  > = [];

  const ftsQuery =
    buildFTSQuery(
      parsed.terms,
    );

  const hasText =
    Boolean(ftsQuery);

  if (hasText) {
    where.push(
      "notes_fts MATCH ?",
    );

    params.push(ftsQuery);
  }

  if (parsed.sections.length) {
    const placeholders =
      parsed.sections
        .map(() => "?")
        .join(", ");

    where.push(
      `n.section IN (${placeholders})`,
    );

    params.push(
      ...parsed.sections,
    );
  }

  if (parsed.statuses.length) {
    const placeholders =
      parsed.statuses
        .map(() => "?")
        .join(", ");

    where.push(
      `n.status IN (${placeholders})`,
    );

    params.push(
      ...parsed.statuses,
    );
  }

  for (const tag of parsed.tags) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM note_tags AS nt
        WHERE
          nt.note_id = n.id
          AND nt.tag = ?
      )
    `);

    params.push(tag);
  }

  const from = hasText
    ? `
      FROM notes_fts
      JOIN notes AS n
        ON n.id = notes_fts.rowid
    `
    : `
      FROM notes AS n
    `;

  const whereSQL =
    where.length
      ? `WHERE ${where.join(" AND ")}`
      : "";

  const ranking = hasText
    ? `
      bm25(
        notes_fts,
        10.0,
        5.0,
        7.0,
        4.0,
        1.0
      ) ASC,
    `
    : "";

  const sql = `
    SELECT
      n.path,
      n.section,
      n.title,
      n.description,
      n.status,
      n.aliases,
      n.tags,
      n.content,
      n.mtime_ms

    ${from}

    ${whereSQL}

    ORDER BY
      ${ranking}
      n.mtime_ms DESC,
      n.title COLLATE NOCASE ASC

    LIMIT ?
  `;

  params.push(
    MAX_RESULTS,
  );

  const rows =
    db.query(sql).all(
      ...params,
    ) as Array<{
      path: string;
      section: string;
      title: string;
      description: string;
      status: string;
      aliases: string;
      tags: string;
      content: string;
      mtime_ms: number;
    }>;

  return {
    query: rawQuery,

    filters: {
      sections:
        parsed.sections,

      tags:
        parsed.tags,

      statuses:
        parsed.statuses,
    },

    count: rows.length,

    results: rows.map(
      (row) => {
        const description =
          row.description.trim();

        const content =
          row.content
            .replace(/\s+/g, " ")
            .trim();

        return {
          title:
            row.title,

          url:
            getURL(
              row.path,
              row.section,
            ),

          section:
            row.section,

          status:
            row.status,

          aliases:
            splitStoredList(
              row.aliases,
            ),

          tags:
            splitStoredList(
              row.tags,
            ),

          summary:
            description ||
            content.slice(0, 220),

          updatedAt:
            row.mtime_ms,
        };
      },
    ),
  };
};


const VISUAL_CACHE_DIR =
  `${process.cwd()}/.runtime/visual-cache`;

const MAX_VISUAL_SOURCE_BYTES =
  256 * 1024;

const visualJson = async (
  request: Request,
) => {
  const contentType =
    request.headers.get(
      "content-type"
    ) ?? "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    throw new Error(
      "Expected application/json."
    );
  }

  const body =
    await request.json() as {
      source?: unknown;
    };

  if (
    typeof body.source !==
    "string"
  ) {
    throw new Error(
      "Missing visual source."
    );
  }

  const bytes =
    new TextEncoder()
      .encode(
        body.source
      )
      .byteLength;

  if (
    bytes >
    MAX_VISUAL_SOURCE_BYTES
  ) {
    throw new Error(
      "Visual source is too large."
    );
  }

  return body.source;
};

const visualHash = (
  language: string,
  source: string,
) => {
  const hasher =
    new Bun.CryptoHasher(
      "sha256"
    );

  hasher.update(
    `${language}\0${source}`
  );

  return hasher.digest(
    "hex"
  );
};

const renderVisual = async (
  language: "d2" | "typst",
  source: string,
) => {
  const fs =
    await import(
      "node:fs/promises"
    );

  const path =
    await import(
      "node:path"
    );

  await fs.mkdir(
    VISUAL_CACHE_DIR,
    {
      recursive: true,
    },
  );

  const hash =
    visualHash(
      language,
      source
    );

  const svgPath =
    path.join(
      VISUAL_CACHE_DIR,
      `${language}-${hash}.svg`,
    );

  try {
    return await fs.readFile(
      svgPath,
      "utf8",
    );
  } catch {
    // Cache miss.
  }

  const sourcePath =
    path.join(
      VISUAL_CACHE_DIR,
      language === "d2"
        ? `${language}-${hash}.d2`
        : `${language}-${hash}.typ`,
    );

  await Bun.write(
    sourcePath,
    source
  );

  const command =
    language === "d2"
      ? [
          process.env.KNOWLEDGE_D2_BIN ?? "d2",
          sourcePath,
          svgPath,
        ]
      : [
          process.env.KNOWLEDGE_TYPST_BIN ?? "typst",
          "compile",
          "--format",
          "svg",
          sourcePath,
          svgPath,
        ];

  const proc =
    Bun.spawn(
      command,
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );

  const timeout =
    setTimeout(
      () => {
        try {
          proc.kill();
        } catch {
          // Already exited.
        }
      },
      10_000,
    );

  const exitCode =
    await proc.exited;

  clearTimeout(
    timeout
  );

  if (
    exitCode !== 0
  ) {
    const stderr =
      await new Response(
        proc.stderr
      ).text();

    throw new Error(
      stderr.trim() ||
      `${language} renderer failed.`
    );
  }

  const svg =
    await fs.readFile(
      svgPath,
      "utf8",
    );

  /*
   * Source files are only temporary cache inputs.
   * SVG is the reusable derived artifact.
   */
  await fs.rm(
    sourcePath,
    {
      force: true,
    },
  );

  return svg;
};

const svgResponse = (
  svg: string,
) =>
  new Response(
    svg,
    {
      status: 200,

      headers: {
        "Content-Type":
          "image/svg+xml; charset=utf-8",

        "Cache-Control":
          "public, max-age=31536000, immutable",

        "Access-Control-Allow-Origin":
          "*",
      },
    },
  );

const server = Bun.serve({
  hostname: HOST,
  port: PORT,

  async fetch(request) {
    const url =
      new URL(request.url);


    if (
      request.method === "POST" &&
      (
        url.pathname ===
          "/api/render/d2" ||
        url.pathname ===
          "/api/render/typst"
      )
    ) {
      try {
        const language =
          url.pathname.endsWith(
            "/d2"
          )
            ? "d2"
            : "typst";

        const source =
          await visualJson(
            request
          );

        const svg =
          await renderVisual(
            language,
            source,
          );

        return svgResponse(
          svg
        );
      } catch (error) {
        return json(
          {
            error:
              "Visual render failed.",

            detail:
              String(error),
          },
          400,
        );
      }
    }

    if (
      request.method === "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,

          headers: {
            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "GET, POST, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type",
          },
        },
      );
    }

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      try {
        const db =
          new Database(
            DB_PATH,
            {
              readonly: true,
            },
          );

        const row =
          db.query(`
            SELECT count(*) AS count
            FROM notes
          `).get() as {
            count: number;
          };

        db.close();

        return json({
          ok: true,
          indexedNotes:
            row.count,
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error:
              String(error),
          },
          503,
        );
      }
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/note"
    ) {
      const section =
        normalize(
          url.searchParams.get("section"),
        );

      const slug =
        String(
          url.searchParams.get("slug") ?? "",
        ).trim();

      const SECTION_FOLDERS:
        Record<string, string> = {
          inbox: "1-Inbox",
          projects: "2-Projects",
          areas: "3-Areas",
          resources: "4-Resources",
          archives: "5-Archives",
        };

      const folder =
        SECTION_FOLDERS[section];

      if (
        !folder ||
        !slug ||
        slug.includes("/") ||
        slug.includes("\\") ||
        slug === "." ||
        slug === ".."
      ) {
        return json(
          {
            error:
              "Invalid note reference.",
          },
          400,
        );
      }

      try {
        const db =
          new Database(
            DB_PATH,
            {
              readonly: true,
            },
          );

        const relativePath =
          `${folder}/${slug}.md`;

        const row =
          db.query(`
            SELECT
              path,
              section,
              title,
              description,
              status,
              aliases,
              tags,
              content,
              mtime_ms

            FROM notes

            WHERE
              path = ?

            LIMIT 1
          `).get(
            relativePath,
          ) as
            | {
                path: string;
                section: string;
                title: string;
                description: string;
                status: string;
                aliases: string;
                tags: string;
                content: string;
                mtime_ms: number;
              }
            | null;

        db.close();

        if (!row) {
          return json(
            {
              error:
                "Note not found.",
            },
            404,
          );
        }

        const description =
          row.description.trim();

        const content =
          row.content
            .replace(/\s+/g, " ")
            .trim();

        return json({
          title:
            row.title,

          url:
            getURL(
              row.path,
              row.section,
            ),

          section:
            row.section,

          status:
            row.status,

          aliases:
            splitStoredList(
              row.aliases,
            ),

          tags:
            splitStoredList(
              row.tags,
            ),

          summary:
            description ||
            content.slice(0, 280),

          updatedAt:
            row.mtime_ms,
        });
      } catch (error) {
        return json(
          {
            error:
              "Note lookup failed.",

            detail:
              String(error),
          },
          500,
        );
      }
    }


    if (
      request.method === "POST" &&
      url.pathname === "/api/last-note"
    ) {
      const filename =
        (
          url.searchParams.get(
            "filename"
          ) ?? ""
        ).trim();

      if (
        !filename ||
        filename.includes("/") ||
        filename.includes("\\") ||
        !filename.endsWith(".md")
      ) {
        return new Response(
          "Invalid filename\n",
          {
            status: 400,
          },
        );
      }

      const db =
        new Database(
          DB_PATH,
        );

      db.query(`
        INSERT INTO search_meta(
          key,
          value
        )
        VALUES(
          'last_note_filename',
          ?
        )
        ON CONFLICT(key)
        DO UPDATE SET
          value = excluded.value
      `).run(
        filename
      );

      db.close();

      return new Response(
        "OK\n",
        {
          headers: {
            "content-type":
              "text/plain; charset=utf-8",
            "cache-control":
              "no-store",
          },
        },
      );
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/complete"
    ) {
      const prefix =
        (
          url.searchParams.get(
            "prefix"
          ) ?? ""
        )
          .normalize("NFKC")
          .toLocaleLowerCase(
            "tr-TR"
          );

      const db =
        new Database(
          DB_PATH,
          {
            readonly: true,
          },
        );

      /*
       * Empty prefix:
       * return only the last-used note,
       * and only if that note still exists.
       */
      if (!prefix) {
        const state =
          db.query(`
            SELECT value
            FROM search_meta
            WHERE key =
              'last_note_filename'
          `).get() as
            | { value: string }
            | null;

        if (!state) {
          db.close();

          return new Response(
            "",
            {
              headers: {
                "content-type":
                  "text/plain; charset=utf-8",
                "cache-control":
                  "no-store",
              },
            },
          );
        }

        const filename =
          state.value;

        const paths = [
          `0-Inbox/${filename}`,
          `1-Projects/${filename}`,
          `2-Areas/${filename}`,
          `3-Resources/${filename}`,
          `4-Archives/${filename}`,
        ];

        const found =
          db.query(`
            SELECT path
            FROM notes
            WHERE path IN (
              ?, ?, ?, ?, ?
            )
            LIMIT 1
          `).get(
            ...paths
          );

        db.close();

        return new Response(
          found
            ? `${filename}\n`
            : "",
          {
            headers: {
              "content-type":
                "text/plain; charset=utf-8",
              "cache-control":
                "no-store",
            },
          },
        );
      }

      /*
       * Typed prefix:
       *
       * Each MOC performs an indexed path range
       * lookup and returns at most five rows.
       *
       * Five MOCs × maximum five rows means
       * at most 25 candidates enter JavaScript,
       * regardless of total note count.
       */
      const directories = [
        "0-Inbox",
        "1-Projects",
        "2-Areas",
        "3-Resources",
        "4-Archives",
      ];

      const filenames: string[] =
        [];

      const prefixQuery =
        db.query(`
          SELECT path
          FROM notes
          WHERE
            path >= ?
            AND path < ?
          ORDER BY path
          LIMIT 5
        `);

      for (
        const directory
        of directories
      ) {
        const low =
          `${directory}/${prefix}`;

        const high =
          `${low}\u{10ffff}`;

        const rows =
          prefixQuery.all(
            low,
            high,
          ) as Array<{
            path: string;
          }>;

        for (const row of rows) {
          const slash =
            row.path.indexOf("/");

          if (slash >= 0) {
            filenames.push(
              row.path.slice(
                slash + 1
              )
            );
          }
        }
      }

      db.close();

      const results =
        [
          ...new Set(
            filenames
          ),
        ]
          .sort()
          .slice(0, 5);

      return new Response(
        results.length
          ? `${results.join("\n")}\n`
          : "",
        {
          headers: {
            "content-type":
              "text/plain; charset=utf-8",
            "cache-control":
              "no-store",
          },
        },
      );
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/stats"
    ) {
      try {
        const db =
          new Database(
            DB_PATH,
            {
              readonly: true,
            },
          );

        const totals =
          db.query(`
            SELECT
              count(*) AS total_notes,
              coalesce(sum(size), 0) AS total_size
            FROM notes
          `).get() as {
            total_notes: number;
            total_size: number;
          };

        const sections =
          db.query(`
            SELECT
              section,
              count(*) AS count
            FROM notes
            GROUP BY section
          `).all() as Array<{
            section: string;
            count: number;
          }>;

        const tagRow =
          db.query(`
            SELECT
              count(DISTINCT tag) AS unique_tags
            FROM note_tags
          `).get() as {
            unique_tags: number;
          };

        db.close();

        const sectionCounts = {
          inbox: 0,
          projects: 0,
          areas: 0,
          resources: 0,
          archives: 0,
        };

        for (const row of sections) {
          if (
            row.section in
            sectionCounts
          ) {
            sectionCounts[
              row.section as keyof typeof sectionCounts
            ] = row.count;
          }
        }

        return json({
          totalNotes:
            totals.total_notes,

          totalSize:
            totals.total_size,

          uniqueTags:
            tagRow.unique_tags,

          sections:
            sectionCounts,
        });
      } catch (error) {
        return json(
          {
            error:
              "Statistics query failed.",

            detail:
              String(error),
          },
          500,
        );
      }
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/tags"
    ) {
      const q =
        normalize(
          url.searchParams.get("q"),
        );

      /*
       * IMPORTANT:
       * No empty-query tag dump.
       * Tag suggestions are only returned
       * after the user types at least one character.
       */
      if (!q) {
        return json({
          query: "",
          count: 0,
          results: [],
        });
      }

      try {
        const db =
          new Database(
            DB_PATH,
            {
              readonly: true,
            },
          );

        const rows =
          db.query(`
            SELECT
              tag,
              count(*) AS usage_count

            FROM note_tags

            WHERE tag LIKE ?

            GROUP BY tag

            ORDER BY
              usage_count DESC,
              tag COLLATE NOCASE ASC

            LIMIT 20
          `).all(
            `${q}%`,
          ) as Array<{
            tag: string;
            usage_count: number;
          }>;

        db.close();

        return json({
          query: q,
          count: rows.length,
          results:
            rows.map(
              (row) => ({
                tag:
                  row.tag,

                count:
                  row.usage_count,
              }),
            ),
        });
      } catch (error) {
        return json(
          {
            error:
              "Tag suggestion failed.",

            detail:
              String(error),
          },
          500,
        );
      }
    }


    if (
      request.method === "GET" &&
      url.pathname === "/api/search"
    ) {
      const q =
        url.searchParams
          .get("q")
          ?.trim() ?? "";

      if (!q) {
        return json({
          query: "",
          filters: {
            sections: [],
            tags: [],
            statuses: [],
          },
          count: 0,
          results: [],
        });
      }

      try {
        const db =
          new Database(
            DB_PATH,
            {
              readonly: true,
            },
          );

        const response =
          search(
            db,
            q,
          );

        db.close();

        return json(response);
      } catch (error) {
        return json(
          {
            error:
              "Search failed.",

            detail:
              String(error),
          },
          500,
        );
      }
    }

    return json(
      {
        error:
          "Not found.",
      },
      404,
    );
  },
});

console.log(
  `Knowledge search endpoint: http://${server.hostname}:${server.port}`,
);
