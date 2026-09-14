import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";

import {
  join,
  resolve,
} from "node:path";

import {
  TOML,
} from "bun";

const HOME =
  process.env.HOME;

if (!HOME) {
  throw new Error(
    "HOME environment variable is missing."
  );
}

export const WORKSPACE_CONFIG =
  join(
    HOME,
    ".config",
    "knowledge",
    "workspaces.toml",
  );

/*
 * Permanent Knowledge structure.
 *
 * These five directories are the only valid MOCs.
 */
export const SECTIONS = [
  {
    directory: "0-Inbox",
    section: "inbox",
  },
  {
    directory: "1-Projects",
    section: "projects",
  },
  {
    directory: "2-Areas",
    section: "areas",
  },
  {
    directory: "3-Resources",
    section: "resources",
  },
  {
    directory: "4-Archives",
    section: "archives",
  },
] as const;

export type SectionName =
  typeof SECTIONS[number]["section"];

export type Workspace = {
  /*
   * Internal runtime values.
   * Users DO NOT configure these.
   */
  id: string;
  root: string;
  port: number;
};

type RawConfig = {
  workspace?: Array<{
    root?: unknown;
  }>;
};

const WEB_PORT_BASE = 1314;

const asRoot = (
  value: unknown,
  index: number,
): string => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `workspace[${index}].root must be a non-empty absolute path.`
    );
  }

  return resolve(
    value.trim(),
  );
};

const internalId = (
  index: number,
): string =>
  index === 0
    ? "personal"
    : `workspace-${index + 1}`;

const internalPort = (
  index: number,
): number => {
  const port =
    WEB_PORT_BASE + index;

  if (port > 65535) {
    throw new Error(
      "Too many workspaces configured."
    );
  }

  return port;
};

export const loadWorkspaces =
  (): Workspace[] => {
    if (
      !existsSync(
        WORKSPACE_CONFIG,
      )
    ) {
      throw new Error(
        `Workspace config not found: ${WORKSPACE_CONFIG}`
      );
    }

    const source =
      readFileSync(
        WORKSPACE_CONFIG,
        "utf8",
      );

    const parsed =
      TOML.parse(
        source,
      ) as RawConfig;

    const entries =
      parsed.workspace ?? [];

    if (
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      throw new Error(
        "At least one [[workspace]] root is required."
      );
    }

    const roots =
      new Set<string>();

    return entries.map(
      (entry, index) => {
        const root =
          asRoot(
            entry.root,
            index,
          );

        /*
         * The same physical workspace must not
         * be configured twice.
         */
        if (
          roots.has(root)
        ) {
          throw new Error(
            `Duplicate workspace root: ${root}`
          );
        }

        roots.add(root);

        return {
          id:
            internalId(index),

          root,

          port:
            internalPort(index),
        };
      },
    );
  };

export const getWorkspace =
  (
    id: string,
  ): Workspace => {
    const workspace =
      loadWorkspaces().find(
        item =>
          item.id === id,
      );

    if (!workspace) {
      throw new Error(
        `Unknown workspace: ${id}`
      );
    }

    return workspace;
  };

export const validateWorkspace =
  (
    workspace: Workspace,
  ) => {
    if (
      !existsSync(
        workspace.root,
      )
    ) {
      throw new Error(
        `Workspace root does not exist: ${workspace.root}`
      );
    }

    const sections =
      SECTIONS.map(
        section => ({
          ...section,

          path:
            join(
              workspace.root,
              section.directory,
            ),
        }),
      );

    for (
      const section
      of sections
    ) {
      if (
        !existsSync(
          section.path,
        )
      ) {
        throw new Error(
          `Required MOC directory missing: ${section.path}`
        );
      }
    }

    const expected =
      new Set(
        SECTIONS.map(
          section =>
            section.directory,
        ),
      );

    const unknownSections =
      readdirSync(
        workspace.root,
        {
          withFileTypes: true,
        },
      )
        .filter(
          entry =>
            entry.isDirectory(),
        )
        .map(
          entry =>
            entry.name,
        )
        .filter(
          name =>
            !expected.has(
              name as
                typeof SECTIONS[number]["directory"],
            ),
        );

    return {
      ...workspace,
      sections,
      unknownSections,
    };
  };
