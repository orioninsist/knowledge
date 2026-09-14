import {
  readdirSync,
} from "node:fs";

import {
  basename,
} from "node:path";

import {
  getWorkspace,
  validateWorkspace,
  SECTIONS,
} from "./workspaces";

const workspaceId =
  process.argv[2] ?? "personal";

const workspace =
  validateWorkspace(
    getWorkspace(workspaceId),
  );

const allowedMocs =
  new Set(
    SECTIONS.map(
      item => item.section,
    ),
  );

const seen =
  new Map<
    string,
    {
      filename: string;
      section: string;
      path: string;
    }
  >();

const errors: string[] = [];

let markdownCount = 0;

for (
  const section
  of workspace.sections
) {
  /*
   * MOC is NEVER read from user metadata.
   * Folder location is the single source of truth.
   */
  const moc =
    section.section;

  if (
    !allowedMocs.has(moc)
  ) {
    errors.push(
      `Invalid MOC mapping: ${moc}`
    );

    continue;
  }

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
      !entry.isFile() ||
      !entry.name.endsWith(".md")
    ) {
      continue;
    }

    /*
     * index.md / _index.md are forbidden in
     * real note workspaces.
     */
    if (
      entry.name.toLowerCase() ===
        "index.md" ||
      entry.name.toLowerCase() ===
        "_index.md"
    ) {
      errors.push(
        `${section.path}/${entry.name}: reserved filename is not allowed`
      );

      continue;
    }

    markdownCount += 1;

    /*
     * Global filename uniqueness.
     *
     * Linux is case-sensitive, but Knowledge is
     * intentionally stricter:
     *
     * A.md and a.md are considered identical.
     */
    const canonicalName =
      entry.name
        .normalize("NFKC")
        .toLocaleLowerCase("en-US");

    const fullPath =
      `${section.path}/${entry.name}`;

    const previous =
      seen.get(
        canonicalName,
      );

    if (previous) {
      errors.push(
        [
          `Duplicate Markdown filename: ${entry.name}`,
          `  first:  ${previous.path} [MOC=${previous.section}]`,
          `  second: ${fullPath} [MOC=${moc}]`,
        ].join("\n"),
      );

      continue;
    }

    seen.set(
      canonicalName,
      {
        filename:
          basename(entry.name),
        section:
          moc,
        path:
          fullPath,
      },
    );
  }
}

console.log(
  `Workspace: ${workspace.id}`
);

console.log(
  `Markdown notes: ${markdownCount}`
);

console.log(
  `Unique filenames: ${seen.size}`
);

console.log(
  "\nFixed MOC contract:"
);

for (
  const section
  of SECTIONS
) {
  console.log(
    `  ${section.directory} -> ${section.section}`
  );
}

if (errors.length) {
  console.error(
    "\nINVARIANT ERRORS:\n"
  );

  for (
    const error
    of errors
  ) {
    console.error(error);
    console.error();
  }

  process.exit(1);
}

console.log(
  "\nPASS: Every note belongs to exactly one fixed MOC."
);

console.log(
  "PASS: Markdown filenames are globally unique across all five MOCs."
);

console.log(
  "PASS: No index.md or _index.md files exist."
);
