#!/usr/bin/env bun

const mode = process.argv[2];
const query = process.argv.slice(3).join(" ").trim();

if (!query) process.exit(0);

const endpoint =
  mode === "personal"
    ? "http://127.0.0.1:8788/api/search"
    : mode === "docs"
      ? "http://127.0.0.1:1320/api/search"
      : "";

if (!endpoint) process.exit(2);

try {
  const url = new URL(endpoint);
  url.searchParams.set("q", query);

  const response = await fetch(url);
  if (!response.ok) process.exit(0);

  const data = await response.json();

  for (const result of (data.results ?? []).slice(0, 50)) {
    if (mode === "personal") {
      const folder = {
        inbox: "0-Inbox",
        projects: "1-Projects",
        areas: "2-Areas",
        resources: "3-Resources",
        archives: "4-Archives",
      }[String(result.section ?? "")];

      if (!folder || !result.url) continue;

      const stem = decodeURIComponent(
        String(result.url).split("/").filter(Boolean).at(-1) ?? "",
      );

      if (stem) console.log(`${folder}/${stem}.md`);
      continue;
    }

    const match = String(result.url ?? "").match(/[?&]path=([^&]+)/);
    if (!match) continue;

    const relative = decodeURIComponent(match[1]);
    const parts = relative.split("/");

    if (
      !relative ||
      relative.startsWith("/") ||
      parts.includes("..") ||
      !relative.endsWith(".md")
    ) {
      continue;
    }

    console.log(relative);
  }
} catch {
  process.exit(0);
}
