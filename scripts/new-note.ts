import {
  existsSync,
  readdirSync,
  writeFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  getWorkspace,
  validateWorkspace,
} from "./workspaces";

const workspaceId =
  process.env.KNOWLEDGE_WORKSPACE ??
  "personal";

const requestedMoc =
  process.argv[2]?.trim().toLowerCase();

const requestedName =
  process.argv[3]?.trim();

if (
  !requestedMoc ||
  !requestedName
) {
  console.error(
    "Usage: knowledge-new <inbox|projects|areas|resources|archives> <filename>"
  );

  process.exit(1);
}

const workspace =
  validateWorkspace(
    getWorkspace(
      workspaceId
    )
  );

const sectionMap =
  new Map(
    workspace.sections.map(
      section => [
        section.section,
        section,
      ]
    )
  );

const targetSection =
  sectionMap.get(
    requestedMoc
  );

if (!targetSection) {
  console.error(
    `ERROR: Invalid MOC: ${requestedMoc}`
  );

  console.error(
    "Allowed: inbox, projects, areas, resources, archives"
  );

  process.exit(1);
}

let filename =
  requestedName;

if (
  !filename
    .toLowerCase()
    .endsWith(".md")
) {
  filename += ".md";
}

if (
  filename.includes("/") ||
  filename.includes("\\") ||
  filename === "." ||
  filename === ".."
) {
  console.error(
    "ERROR: Filename must be a single Markdown filename."
  );

  process.exit(1);
}

/*
 * Markdown filename policy:
 *
 * - lowercase English letters a-z only
 * - hyphen is the only allowed separator
 * - no digits
 * - no spaces, underscores, uppercase, or non-ASCII letters
 */
const validFilename =
  /^[a-z]+(?:-[a-z]+)*\.md$/;

if (
  !validFilename.test(filename)
) {
  console.error(
    `ERROR: Invalid Markdown filename: ${filename}`
  );

  console.error(
    "Allowed: lowercase English letters (a-z) and single hyphens between words only."
  );

  console.error(
    "Example: openai-api.md"
  );

  process.exit(1);
}

if (
  filename.toLowerCase() ===
    "index.md" ||
  filename.toLowerCase() ===
    "_index.md"
) {
  console.error(
    "ERROR: index.md and _index.md are reserved filenames."
  );

  process.exit(1);
}

const canonical =
  filename
    .normalize("NFKC")
    .toLocaleLowerCase("en-US");

let existing:
  | {
      path: string;
      section: string;
    }
  | null = null;

for (
  const section
  of workspace.sections
) {
  const entries =
    readdirSync(
      section.path,
      {
        withFileTypes: true,
      }
    );

  for (
    const entry
    of entries
  ) {
    if (
      !entry.isFile() ||
      !entry.name
        .toLowerCase()
        .endsWith(".md")
    ) {
      continue;
    }

    const candidate =
      entry.name
        .normalize("NFKC")
        .toLocaleLowerCase(
          "en-US"
        );

    if (
      candidate ===
      canonical
    ) {
      existing = {
        path:
          join(
            section.path,
            entry.name
          ),

        section:
          section.section,
      };

      break;
    }
  }

  if (existing) {
    break;
  }
}

const targetPath =
  join(
    targetSection.path,
    filename
  );

if (existing) {
  console.error(
    "\nERROR: Markdown filename already exists.\n"
  );

  console.error(
    `Requested:\n${targetPath}\n`
  );

  console.error(
    `Existing:\n${existing.path}\n`
  );

  console.error(
    "Choose a different filename."
  );

  process.exit(1);
}

if (
  existsSync(
    targetPath
  )
) {
  console.error(
    `ERROR: Target already exists: ${targetPath}`
  );

  process.exit(1);
}

writeFileSync(
  targetPath,
  `---
title:
description:
status:
aliases: []
tags: []
---

`,
  {
    flag: "wx",
  }
);

console.log(
  `PASS: Created ${targetPath}`
);
