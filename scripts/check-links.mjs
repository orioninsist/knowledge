import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();

const runtimeEnvPath = path.join(
  PROJECT_ROOT,
  ".runtime",
  "personal",
  "runtime.env",
);

if (!fs.existsSync(runtimeEnvPath)) {
  console.error(
    `FAIL: Missing runtime environment: ${runtimeEnvPath}`
  );
  process.exit(1);
}

const runtimeEnv = Object.fromEntries(
  fs
    .readFileSync(runtimeEnvPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");

      if (index === -1) {
        return [line, ""];
      }

      return [
        line.slice(0, index),
        line.slice(index + 1),
      ];
    })
);

const ROOT = runtimeEnv.WORKSPACE_ROOT;

if (!ROOT) {
  console.error(
    "FAIL: WORKSPACE_ROOT is missing from runtime.env"
  );
  process.exit(1);
}

const KNOWLEDGE_DIRS = [
  "0-Inbox",
  "1-Projects",
  "2-Areas",
  "3-Resources",
  "4-Archives",
];

const markdownLinkPattern =
  /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;

const markdownFiles = [];

for (const dir of KNOWLEDGE_DIRS) {
  const absoluteDir = path.join(ROOT, dir);

  if (!fs.existsSync(absoluteDir)) {
    console.error(`FAIL: Missing knowledge directory: ${dir}`);
    process.exit(1);
  }

  for (const entry of fs.readdirSync(absoluteDir, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory()) {
      console.error(
        `FAIL: Subdirectory found inside ${dir}: ${entry.name}`
      );
      process.exit(1);
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".md")
    ) {
      markdownFiles.push(
        path.join(absoluteDir, entry.name)
      );
    }
  }
}

const isExternal = (target) =>
  /^(?:https?:|mailto:|tel:|ftp:|data:|javascript:)/i.test(target);

const isAnchorOnly = (target) =>
  target.startsWith("#");

const stripQueryAndFragment = (target) =>
  target.split("#", 1)[0].split("?", 1)[0];

const decodeTarget = (target) => {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
};

const broken = [];
let checkedLinks = 0;

for (const file of markdownFiles) {
  const source = fs.readFileSync(file, "utf8");

  let match;

  while ((match = markdownLinkPattern.exec(source)) !== null) {
    const rawTarget = match[1];

    if (
      !rawTarget ||
      isExternal(rawTarget) ||
      isAnchorOnly(rawTarget)
    ) {
      continue;
    }

    const cleaned = decodeTarget(
      stripQueryAndFragment(rawTarget)
    );

    if (!cleaned.endsWith(".md")) {
      continue;
    }

    checkedLinks += 1;

    const resolved = path.resolve(
      path.dirname(file),
      cleaned
    );

    const relativeResolved = path.relative(
      ROOT,
      resolved
    );

    const insideKnowledge = KNOWLEDGE_DIRS.some((dir) =>
      relativeResolved === dir ||
      relativeResolved.startsWith(`${dir}${path.sep}`)
    );

    if (!insideKnowledge) {
      broken.push({
        file: path.relative(ROOT, file),
        target: rawTarget,
        reason: "target escapes knowledge directories",
      });

      continue;
    }

    if (!fs.existsSync(resolved)) {
      broken.push({
        file: path.relative(ROOT, file),
        target: rawTarget,
        reason: "target file does not exist",
      });

      continue;
    }

    const stat = fs.statSync(resolved);

    if (!stat.isFile()) {
      broken.push({
        file: path.relative(ROOT, file),
        target: rawTarget,
        reason: "target is not a file",
      });

      continue;
    }

    if (!resolved.endsWith(".md")) {
      broken.push({
        file: path.relative(ROOT, file),
        target: rawTarget,
        reason: "target is not Markdown",
      });
    }
  }
}

console.log(`Markdown files scanned: ${markdownFiles.length}`);
console.log(`Internal Markdown links checked: ${checkedLinks}`);

if (broken.length > 0) {
  console.error("");
  console.error("BROKEN INTERNAL LINKS:");

  for (const item of broken) {
    console.error(
      `- ${item.file} -> ${item.target} (${item.reason})`
    );
  }

  process.exit(1);
}

console.log("PASS: No broken internal Markdown links.");
