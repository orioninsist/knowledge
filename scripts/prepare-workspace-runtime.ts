import {
  mkdirSync,
  writeFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  getWorkspace,
  validateWorkspace,
} from "./workspaces";

const id =
  process.argv[2];

if (!id) {
  throw new Error(
    "Usage: bun scripts/prepare-workspace-runtime.ts <workspace-id>"
  );
}

const workspace =
  validateWorkspace(
    getWorkspace(id),
  );

const apiPort =
  workspace.port + 7474;

if (
  apiPort > 65535
) {
  throw new Error(
    `Derived API port is invalid: ${apiPort}`
  );
}

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

const escapeToml = (
  value: string,
) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');

const lines: string[] = [
  `baseURL = "http://127.0.0.1:${workspace.port}/"`,
  "",
  "[params]",
  `searchEndpoint = "http://127.0.0.1:${apiPort}"`,
  "",
  "[module]",
];

for (
  const section
  of workspace.sections
) {
  lines.push(
    "",
    "[[module.mounts]]",
    `source = "${escapeToml(section.path)}"`,
    `target = "content/${section.section}"`,
    'files = ["*.md"]',
  );
}

lines.push("");

writeFileSync(
  join(
    runtimeDir,
    "hugo.toml",
  ),
  lines.join("\n"),
);

writeFileSync(
  join(
    runtimeDir,
    "runtime.env",
  ),
  [
    `WORKSPACE_ID=${workspace.id}`,
    `WORKSPACE_ROOT=${workspace.root}`,
    `WEB_PORT=${workspace.port}`,
    `API_PORT=${apiPort}`,
    `DB_PATH=${join(runtimeDir, "knowledge.db")}`,
    "",
  ].join("\n"),
);

console.log(
  `workspace=${workspace.id}`
);

console.log(
  `root=${workspace.root}`
);

console.log(
  `web=http://127.0.0.1:${workspace.port}`
);

console.log(
  `api=http://127.0.0.1:${apiPort}`
);

console.log(
  `runtime=${runtimeDir}`
);
