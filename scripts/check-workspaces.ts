import {
  readdirSync,
} from "node:fs";

import {
  loadWorkspaces,
  validateWorkspace,
} from "./workspaces";

const workspaces =
  loadWorkspaces();

console.log(
  `Configured workspaces: ${workspaces.length}`
);

for (
  const workspace
  of workspaces
) {
  console.log(
    `\n[${workspace.id}]`
  );

  const validated =
    validateWorkspace(
      workspace,
    );

  console.log(
    `root: ${validated.root}`
  );

  console.log(
    `port: ${validated.port}`
  );

  for (
    const section
    of validated.sections
  ) {
    console.log(
      `${section.section}: ${section.path}`
    );

    const entries =
      readdirSync(
        section.path,
        {
          withFileTypes: true,
        },
      );

    const subdirectories =
      entries.filter(
        (entry) =>
          entry.isDirectory(),
      );

    /*
     * Knowledge is intentionally Markdown-only.
     *
     * Other files in the user's source directory
     * belong to the user and are simply ignored.
     *
     * NEVER move, delete, rename, copy, or modify
     * source files here.
     */
    const markdownFiles =
      entries.filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(
            ".md",
          ),
      );

    const ignoredFiles =
      entries.filter(
        (entry) =>
          entry.isFile() &&
          !entry.name.endsWith(
            ".md",
          ),
      );

    if (
      subdirectories.length
    ) {
      throw new Error(
        `${section.path}: subdirectories are not allowed: ` +
        subdirectories
          .map(
            (entry) =>
              entry.name,
          )
          .join(", ")
      );
    }

    console.log(
      `  Markdown files: ${markdownFiles.length}`
    );

    console.log(
      `  Ignored non-Markdown files: ${ignoredFiles.length}`
    );
  }

  if (
    validated.unknownSections.length
  ) {
    console.log(
      "INFO: Additional root directories ignored:"
    );

    for (
      const directory
      of validated.unknownSections
    ) {
      console.log(
        `  ${directory}`
      );
    }
  }
}

console.log(
  "\nPASS: Workspace configuration is valid."
);

console.log(
  "PASS: Source workspace is treated as read-only."
);

console.log(
  "PASS: Only .md files are eligible for Knowledge."
);

console.log(
  "PASS: Non-Markdown files are ignored."
);
