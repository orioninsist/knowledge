#!/usr/bin/env bun
import { readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { getWorkspace, validateWorkspace } from "./workspaces";

const workspace = validateWorkspace(getWorkspace(process.env.KNOWLEDGE_WORKSPACE ?? "personal"));
const mode = process.argv[2] ?? "";
const requested = process.argv[3]?.trim() ?? "";
type Note = { name:string; stem:string; path:string; relative:string; source:string };
type Link = { source:Note; target:string; raw:string; kind:"wiki"|"markdown" };
const notes: Note[] = [];

for (const section of workspace.sections) {
  for (const entry of readdirSync(section.path, { withFileTypes:true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md" || entry.name === "_index.md") continue;
    const path = join(section.path, entry.name);
    notes.push({ name:entry.name, stem:basename(entry.name, ".md"), path, relative:relative(workspace.root, path), source:readFileSync(path, "utf8") });
  }
}

const byName = new Map(notes.map((n) => [n.name.toLocaleLowerCase("en-US"), n]));
const byStem = new Map(notes.map((n) => [n.stem.toLocaleLowerCase("en-US"), n]));
const normalizeTarget = (raw:string) => {
  let value = raw.trim().split("|",1)[0].split("#",1)[0].split("?",1)[0].trim();
  try { value = decodeURIComponent(value); } catch {}
  return basename(value).toLocaleLowerCase("en-US");
};
const resolve = (target:string) => target.endsWith(".md") ? byName.get(target) : (byStem.get(target) ?? byName.get(target + ".md"));
const links: Link[] = [];

for (const note of notes) {
  const seen = new Set<string>();
  for (const match of note.source.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const raw = match[1] ?? ""; const target = normalizeTarget(raw); if (!target) continue;
    const key = "wiki:" + target; if (!seen.has(key)) { links.push({source:note,target,raw,kind:"wiki"}); seen.add(key); }
  }
  for (const match of note.source.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const raw = match[1] ?? "";
    if (/^(?:https?:|mailto:|tel:|ftp:|data:|javascript:|#)/i.test(raw)) continue;
    const target = normalizeTarget(raw); if (!target || !target.endsWith(".md")) continue;
    const key = "markdown:" + target; if (!seen.has(key)) { links.push({source:note,target,raw,kind:"markdown"}); seen.add(key); }
  }
}

const selected = requested ? resolve(normalizeTarget(requested)) : undefined;
if (mode === "links" || mode === "backlinks") {
  if (!requested || !selected) { console.error("ERROR: Note not found: " + (requested || "(missing)")); process.exit(1); }
  const rows = mode === "links"
    ? links.filter((l) => l.source.path === selected.path).map((l) => resolve(l.target)).filter(Boolean)
    : links.filter((l) => resolve(l.target)?.path === selected.path).map((l) => l.source);
  const unique = [...new Map(rows.map((n) => [n!.path, n!])).values()].sort((a,b) => a.relative.localeCompare(b.relative));
  if (!unique.length) { console.log("No " + mode + " for " + selected.name + "."); process.exit(0); }
  for (const note of unique) console.log(note.relative);
  process.exit(0);
}
if (mode === "broken") {
  const broken = links.filter((l) => !resolve(l.target));
  console.log("Notes scanned: " + notes.length);
  console.log("Relations checked: " + links.length);
  console.log("Broken relations: " + broken.length);
  for (const link of broken) console.log("- " + link.source.relative + " -> " + link.raw + " [" + link.kind + "]");
  process.exit(broken.length ? 1 : 0);
}
console.error("Usage: bun scripts/note-relations.ts <links|backlinks|broken> [filename.md]");
process.exit(2);
