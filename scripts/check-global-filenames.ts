import {
  readdirSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  getWorkspace,
  validateWorkspace,
} from "./workspaces";

const workspaceId =
  process.argv[2] ??
  "personal";

const workspace =
  validateWorkspace(
    getWorkspace(
      workspaceId
    )
  );

const seen =
  new Map<
    string,
    {
      path: string;
      section: string;
    }
  >();

const duplicates: Array<{
  name: string;
  first: string;
  second: string;
}> = [];

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

    if (
      entry.name.toLowerCase() ===
        "index.md" ||
      entry.name.toLowerCase() ===
        "_index.md"
    ) {
      continue;
    }

    const validFilename =
      /^[a-z]+(?:-[a-z]+)*\.md$/;

    if (
      !validFilename.test(entry.name)
    ) {
      console.error(
        `ERROR: Invalid Markdown filename: ${join(section.path, entry.name)}`
      );

      process.exit(1);
    }

    const canonical =
      entry.name
        .normalize("NFKC")
        .toLocaleLowerCase(
          "en-US"
        );

    const fullPath =
      join(
        section.path,
        entry.name
      );

    const previous =
      seen.get(
        canonical
      );

    if (previous) {
      duplicates.push({
        name:
          entry.name,

        first:
          previous.path,

        second:
          fullPath,
      });

      continue;
    }

    seen.set(
      canonical,
      {
        path:
          fullPath,

        section:
          section.section,
      }
    );
  }
}

if (
  duplicates.length
) {
  console.error(
    "\nERROR: Duplicate Markdown filenames detected.\n"
  );

  for (
    const duplicate
    of duplicates
  ) {
    console.error(
      duplicate.name
    );

    console.error(
      `  first:  ${duplicate.first}`
    );

    console.error(
      `  second: ${duplicate.second}`
    );

    console.error();
  }

  process.exit(1);
}

console.log(
  `PASS: ${seen.size} Markdown filenames are globally unique.`
);
