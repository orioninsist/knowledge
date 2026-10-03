# Knowledge Project Guide

This file is the operational reference for the current Knowledge project.

It is intentionally different from `README.md`: the README is the public overview, while this document is meant to help quickly understand, operate, reinstall, debug, and maintain the project after returning to it later.

## 1. What this project is

Knowledge is a local-first workstation layer around Markdown and locally installed Unix documentation. It exposes six user-facing surfaces:

1. **Personal notes** — editable Markdown notes stored outside this repository.
2. **Productivity** — local browser utilities that do not modify notes.
3. **External documentation** — a large read-only Markdown tree used for browsing and search.
4. **Man pages** — a read-only browser for the machine's locally installed manual pages.
5. **GNU Info** — a read-only browser for locally installed Info manuals and nodes.
6. **Command cheatsheets** — a read-only browser for TLDR, Navi, and Cheat.

The repository contains the application, scripts, web UI, service templates, and tests. It does **not** contain the personal knowledge base itself.

The central design rule is:

> Markdown is permanent data. Everything else is derived runtime state.

SQLite databases, Hugo runtime configuration, render output, caches, and installed systemd units can all be rebuilt from Markdown and repository source.

## 2. Main surfaces and ports

| Surface | Address | Role |
| --- | --- | --- |
| Personal web UI | `http://127.0.0.1:1314/` | Browse notes, statistics, browser search |
| Productivity UI | `http://127.0.0.1:1314/productivity/` | World clock, weather, prayer times, focus tools |
| Personal API | `http://127.0.0.1:8788/` | Search and local render API |
| Documentation browser | `http://127.0.0.1:1320/` | Read-only external docs search/browser |
| Man browser | `http://127.0.0.1:1321/` | Search and read locally installed man pages |
| Info browser | `http://127.0.0.1:1322/` | Search and read locally installed GNU Info manuals |
| Command cheatsheets | `http://127.0.0.1:1323/` | Read TLDR, Navi, and Cheat command references |

All services bind locally. This project is designed as a local workstation tool, not a public network service.

## 3. Personal note model

The configured notes root must contain exactly these five MOC directories:

```text
Knowledge/
├── 0-Inbox/
├── 1-Projects/
├── 2-Areas/
├── 3-Resources/
└── 4-Archives/
```

The directory is the source of truth for a note's MOC:

- `0-Inbox` → `inbox`
- `1-Projects` → `projects`
- `2-Areas` → `areas`
- `3-Resources` → `resources`
- `4-Archives` → `archives`

MOC state is not duplicated in front matter.

Subdirectories inside these five MOC directories are supported. Markdown discovery, indexing, link relations, Hugo content mounts, and Neovim link completion are recursive. Non-Markdown files are ignored.

## 4. Filename contract

Every personal Markdown note must match:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*\.md$
```

Allowed examples:

```text
linux.md
note1.md
openai-api.md
project-2026.md
```

Rejected examples:

```text
AA.md
My-Note.md
my_note.md
my note.md
türkçe.md
```

Additional rules:

- `index.md` and `_index.md` are reserved.
- Filenames are globally unique across all five MOCs.
- A note may move between MOCs, but another note with the same filename may not exist elsewhere.
- `kn` intentionally has no delete command. Use Archives instead of deletion.

## 5. Personal note front matter

New notes are created with:

```yaml
---
title:
description:
status:
aliases: []
tags: []
---
```

The indexer reads these fields when present:

- `title`
- `description`
- `status`
- `aliases`
- `tags`

If `title` is empty, the first Markdown H1 is used. If there is no H1, the filename stem becomes the title.

The folder still determines the MOC; front matter does not.

## 6. Repository vs personal notes Git

There are two different Git responsibilities.

### Application repository

This repository is the application source:

```text
https://github.com/orioninsist/knowledge
```

It can have a GitHub remote normally.

### Personal notes repository

The configured notes root is expected to be its own local Git repository.

It must have **no remote**.

`scripts/notes-git.sh` explicitly refuses note Git operations if any remote exists. This is a safety boundary intended to prevent accidental publication of private notes.

After create/edit/move/rename operations, `kn` can offer to create a local Git commit for the affected note paths.

If the commit message is left empty, the changes remain uncommitted.

## 7. Workspace configuration

User configuration lives at:

```text
~/.config/knowledge/workspaces.toml
```

Minimal configuration:

```toml
[[workspace]]
root = "/absolute/path/to/your/notes"
```

The project assigns internal workspace IDs and ports automatically.

For the primary workspace, the runtime ID is `personal`.

The current personal web port is `1314`.

The personal API port is derived as:

```text
web port + 7474
1314 + 7474 = 8788
```

## 8. Runtime files

Generated runtime state for the personal workspace lives under:

```text
.runtime/personal/
```

Important generated files:

```text
.runtime/personal/hugo.toml
.runtime/personal/runtime.env
.runtime/personal/knowledge.db
```

`runtime.env` contains values such as:

```text
WORKSPACE_ID=personal
WORKSPACE_ROOT=/absolute/path/to/notes
WEB_PORT=1314
API_PORT=8788
DB_PATH=.../.runtime/personal/knowledge.db
```

The generated Hugo configuration mounts the five real note directories into Hugo content paths. Each mount includes both root-level and nested Markdown files:

```toml
files = ["*.md", "**/*.md"]
```

The runtime config also enables Goldmark trusted raw HTML rendering for the local personal workspace:

```toml
[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true
```

Do not maintain a second static root `hugo.toml` containing user workspace paths. The generated runtime configuration is the source of truth.

Documentation runtime data lives under:

```text
.runtime/docs/
```

with the documentation SQLite database normally at:

```text
.runtime/docs/docs.db
```

Runtime state is disposable and should not be treated as source data.

## 9. Installation

Required commands checked by `install.sh`:

```text
bun
npm
hugo
d2
typst
inotifywait
info
curl
systemctl
```

Other tools used interactively by `kn` include:

```text
fzf
glow
nvim
```

Editors supported by the command flow include:

```text
code
zed
nvim
hx
```

Basic install:

```bash
git clone https://github.com/orioninsist/knowledge.git
cd knowledge
./install.sh
```

On the first run, if `~/.config/knowledge/workspaces.toml` does not exist, the installer copies `workspace.example.toml` there and stops. Edit the file with the correct absolute notes path, then run `./install.sh` again.

## 10. What install.sh does

The installer currently performs these steps:

1. Verifies external dependencies.
2. Reads `~/.config/knowledge/workspaces.toml`.
3. Runs `npm ci`.
4. Generates personal runtime configuration.
5. Builds the initial personal SQLite index.
6. Builds the documentation SQLite index.
7. Symlinks `bin/kn` to `~/.local/bin/kn`.
8. Installs Bash completion.
9. Generates systemd user units from templates.
10. Enables and restarts all Knowledge services.
11. Runs `tests/smoke.sh`.

The repository uses npm as its package-manager lockfile source:

```text
package-lock.json
```

Do not add a second package-manager lockfile unless the project deliberately changes package managers.

## 11. Systemd services

Eight user services form the running system.

### knowledge-personal-search.service

Runs:

```text
bun scripts/search-server.ts
```

Purpose:

- Personal SQLite FTS5 search API
- D2 rendering
- Typst rendering
- Local API used by browser search and terminal search

Environment includes:

```text
KNOWLEDGE_API_PORT=8788
KNOWLEDGE_DB_PATH=.runtime/personal/knowledge.db
```

### knowledge-personal-web.service

Runs Hugo using only:

```text
.runtime/personal/hugo.toml
```

It binds:

```text
127.0.0.1:1314
```

and renders to memory.

### knowledge-personal-watch.service

Runs:

```text
scripts/live-workspace-sync.sh
```

It watches the five personal MOC directories with `inotifywait`.

On valid Markdown changes it incrementally updates or deletes rows in the personal search index.

It rejects invalid filenames from indexing but does not rename or delete the user's source file.

### knowledge-docs-browser.service

Runs:

```text
bun scripts/docs-server.ts
```

It serves the read-only documentation browser on:

```text
127.0.0.1:1320
```

### knowledge-docs-watch.service

Runs:

```text
scripts/docs-watch.sh
```

It recursively watches the documentation tree and incrementally updates the documentation index when Markdown files change.

### knowledge-man-browser.service

Runs:

```text
bun scripts/man-server.ts
```

It serves the local manual-page browser on:

```text
127.0.0.1:1321
```

Search is delegated directly to the system `apropos` database, rendering is delegated to `man -Thtml`, and installed-page existence checks use `man -w`. The project does not copy man pages into Markdown and does not maintain a second man-page database or index.

Rendered cross-references such as `man(1)` or `fuzzel.ini(5)` are linked to the local browser when the referenced page exists.

### knowledge-info-browser.service

Runs:

```text
bun scripts/info-server.ts
```

It serves the local GNU Info browser on:

```text
127.0.0.1:1322
```

Search is delegated directly to `info --apropos`; rendering uses `info --file=<manual> --node=<node> --output=-`. The server validates manual/node input, uses argument arrays rather than shell interpolation, links local Info menu and cross-reference targets when they exist, and rejects GNU Info's silent fallback to `Top` when the requested node does not exist. The project does not copy Info manuals into Markdown and does not maintain a second Info database or index.

### knowledge-command-browser.service

Runs:

```text
bun scripts/command-server.ts
```

It serves the read-only command-cheatsheet browser on:

```text
127.0.0.1:1323
```

TLDR, Navi, and Cheat remain independent local sources of truth. Knowledge validates command names, renders their output read-only, and does not maintain a second cheatsheet corpus or index. Navi content depends on locally installed `.cheat` repositories.

## 12. Service commands

Check all services:

```bash
systemctl --user status knowledge-personal-search.service
systemctl --user status knowledge-personal-web.service
systemctl --user status knowledge-personal-watch.service
systemctl --user status knowledge-docs-browser.service
systemctl --user status knowledge-man-browser.service
systemctl --user status knowledge-info-browser.service
systemctl --user status knowledge-command-browser.service
systemctl --user status knowledge-docs-watch.service
```

Restart one service:

```bash
systemctl --user restart knowledge-personal-search.service
```

Reload unit files after changing installed templates:

```bash
systemctl --user daemon-reload
```

Normally `./install.sh` should be preferred because it regenerates the installed units from repository templates.

## 13. kn command

`bin/kn` is the main terminal entry point.

Help:

```bash
kn --help
```

### Open or create a note

```bash
kn nvim inbox linux-notes
kn nvim projects project-note.md
kn code resources reference.md
kn hx areas german-notes.md
```

Missing `.md` is added automatically.

If the filename already exists in another MOC, `kn` opens the existing note from its real location. Selecting a MOC does not silently move an existing note.

A new filename is created only in the selected MOC.

### Interactive use

Choose MOC and filename interactively:

```bash
kn nvim
```

Choose/provide a filename after fixing the MOC:

```bash
kn nvim inbox
```

The interactive UI uses `fzf`.

### Read with Glow

```bash
kn glow linux-notes.md
```

### Move between MOCs

```bash
kn mv linux-notes.md archives
```

Move requires confirmation.

### Rename

```bash
kn rn linux-notes.md linux-networking.md
```

Rename requires confirmation and still obeys global filename uniqueness.

### Relations and link health

```bash
kn links linux-notes.md
kn backlinks linux-notes.md
kn broken-links
```

Relations are derived directly from standard Markdown links only. Wikilinks are intentionally unsupported.

In Neovim Markdown buffers, link destinations can be completed inside `[]()` with:

```text
Ctrl-X Ctrl-O
```

The omnifunc starts from the current note's directory, walks one folder level at a time as directories are selected, shows at most five matching entries per completion menu, and offers directories plus `.md` files. Selecting a Markdown file inserts its relative path.

Use:

```bash
kn link source-note.md
kn link source-note.md target-note.md
```

When the target is omitted, `kn link` shows the global Markdown note picker. The user selects only the note; Knowledge discovers the target note's actual MOC and computes the relative path from the source note. The generated output is portable Markdown such as `[Linux networking](../3-Resources/linux-networking.md)`. The relation analyzer introduces no second persistent relation database.

### Diagnostics

```bash
kn doctor
```

The doctor checks runtime/workspace availability, the five MOCs, filename validity and global uniqueness, the local-only notes Git boundary, required/interactively used commands, the eight systemd user services, and broken note relations.

### Personal search

```bash
kn search
kn search docker network
kn search 'section:projects tag:linux status:todo'
kn search 'title:"local first"'
kn search 'file:systemd description:service alias:daemon'
```

Inline query filters support `section:`/`folder:`, `tag:`, `status:`, `file:`/`filename:`, `title:`, `description:`/`desc:`, and `alias:`.

This uses the personal FTS5 search endpoint, sends results into `fzf`, previews files, and opens the selected result in normal Neovim.

### Documentation search

```bash
kn docs
kn docs systemd
```

This uses the documentation FTS5 endpoint and opens the selected file with:

```text
nvim -R
```

so the documentation workflow is intentionally read-only.

## 14. Personal search index

The personal index is SQLite with FTS5.

Database:

```text
.runtime/personal/knowledge.db
```

Indexed note fields include:

- relative path
- section/MOC
- title
- description
- status
- aliases
- tags
- Markdown body
- modification time
- file size

The FTS index covers:

- title
- description
- aliases
- tags
- content

The database is derived data. A full rebuild can recreate it from Markdown.

The indexer supports:

```text
full rebuild
--upsert <absolute Markdown path>
--delete <absolute Markdown path>
```

The watcher uses the incremental modes.

## 15. Browser search

The personal browser UI talks to the API on port `8788`.

The search server supports text search plus filters for data such as:

- folder/section
- filename
- title
- description
- status
- aliases
- tags

The browser shortcut documented by the project is:

```text
Alt + K
```

The shared top navigation is:

```text
Knowledge · Notes · Productivity · Documentation · Man · Info · Commands
```

`Alt + K` is surface-scoped rather than global: Notes searches personal notes, Documentation searches external documentation, Man searches installed manual pages, and Info searches installed Info entries. Productivity does not invent a search surface where none is useful.

## 16. Documentation browser

The documentation system is independent from the personal workspace.

Default root:

```text
/home/murat/Media/5-Documentation
```

Default ignored subtree:

```text
/home/murat/Media/5-Documentation/Knowledge
```

Override at install time:

```bash
KNOWLEDGE_DOCS_ROOT=/path/to/docs \
KNOWLEDGE_DOCS_IGNORE=/path/to/docs/ignored \
./install.sh
```

The documentation index recursively scans Markdown files.

It skips:

- configured ignored paths
- `.git`
- `node_modules`
- non-Markdown files

The docs database indexes path, folder, filename, title, summary, and content through SQLite FTS5.

A full reconciliation first walks the live Markdown tree and builds the current path set. It removes stale database and FTS rows before doing content indexing, then compares modification time and file size for live paths. Only new or changed files are read and re-indexed; unchanged files are left untouched. The inotify watcher remains responsible for normal per-path create/change/delete updates between reconciliations. This avoids accumulating historical FTS rows when large documentation corpora are replaced or removed in bulk.

This surface should stay read-only. It is for discovery, preview, search, and reading, not for modifying the documentation tree.

## 17. Man browser

The Man surface is intentionally separate from the Markdown documentation browser.

Address:

```text
http://127.0.0.1:1321/
```

Its source of truth is the set of manual pages installed on the local system. It has no copied Markdown corpus and no project-owned search database.

Search flow:

```text
Alt + K → /api/search?q=... → apropos
```

Render flow:

```text
/man/<section>/<name> → man -Thtml <section> <name>
```

Examples:

```text
http://127.0.0.1:1321/man/1/man
http://127.0.0.1:1321/man/1/fuzzel
http://127.0.0.1:1321/man/5/fuzzel.ini
```

The server validates page names and sections before invoking `man`, uses argument arrays rather than shell interpolation, escapes generated HTML strings, and binds only to localhost.

## 18. GNU Info browser

The Info surface is intentionally separate from both the Markdown documentation browser and the Man browser.

Address:

```text
http://127.0.0.1:1322/
```

Its source of truth is the set of GNU Info manuals installed on the local system. It has no copied Markdown corpus and no project-owned search database.

Search flow:

```text
Alt + K → /api/search?q=... → info --apropos
```

Render flow:

```text
/info/<manual>/<node> → info --file=<manual> --node=<node> --output=-
```

Menu entries, `*Note` references, and header Prev/Up/Next targets become local browser links only when the target node exists. Because GNU Info can silently fall back to `Top` for an invalid node, the server verifies the returned header node exactly matches the requested node; otherwise it returns `404`.

The server validates manual/node input, invokes `info` with argument arrays rather than shell interpolation, escapes generated HTML strings, and binds only to localhost.

## 19. Command cheatsheets

The Commands surface is available at:

```text
http://127.0.0.1:1323/
```

Routes map directly to the local tools:

```text
/tldr/<command>
/navi/<command>
/cheat/<command>
```

The browser is read-only and localhost-only. It does not execute commands from cheatsheets and does not build a Knowledge-owned cheatsheet database. TLDR, Navi, and Cheat retain ownership of their own data. Navi requires a local `.cheat` repository, which can be installed through `navi repo add` or `navi repo browse`.

## 19. Visual Markdown blocks

The personal note web surface supports special fenced content including:

- Mermaid
- D2
- Typst
- Canvas
- Calendar

Mermaid is rendered from the vendored browser bundle.

D2 and Typst rendering are handled by the local personal API.

## 20. Productivity page

The productivity area is available at:

```text
http://127.0.0.1:1314/productivity/
```

Current tools include:

- World Clock
- Weather
- Prayer Times
- Focus

This surface is deliberately separate from note storage. Its state lives in browser storage and it does not read or modify Markdown notes.

## 21. Important repository paths

```text
README.md
    Public overview.

KNOWLEDGE-PROJECT-GUIDE.md
    Operational project reference — this file.

bin/kn
    Main CLI.

install.sh
    Bootstrap/reinstall entry point.

workspace.example.toml
    Example user workspace configuration.

scripts/workspaces.ts
    Workspace loading, fixed MOC mapping, validation, port assignment.

scripts/prepare-workspace-runtime.ts
    Generates .runtime/personal/hugo.toml and runtime.env.

scripts/new-note.ts
    Creates notes while enforcing naming and uniqueness rules.

scripts/validate-note-name.ts
scripts/note-name.ts
    Filename validation.

scripts/build-workspace-index.ts
    Personal SQLite/FTS5 full and incremental indexer.

scripts/search-server.ts
    Personal search/render API.

scripts/live-workspace-sync.sh
    Personal inotify watcher.

scripts/notes-git.sh
    Safe local-only Git workflow for personal notes.

scripts/kn-terminal-search.ts
    Converts API search results into paths for fzf/kn.

scripts/build-docs-index.ts
scripts/docs-indexer.ts
    Documentation SQLite/FTS5 indexing.

scripts/docs-server.ts
    Read-only docs HTTP server.

scripts/man-server.ts
    Local installed-man-page search and HTML browser.

scripts/info-server.ts
    Local installed-GNU-Info search and node browser.

scripts/docs-watch.sh
scripts/update-docs-path.ts
    Incremental documentation index updates.

systemd/*.service.in
    User-service templates populated by install.sh, including the Man and Info browsers.

layouts/
static/
    Hugo/browser presentation layer and static assets.

tests/smoke.sh
    Runtime, HTTP, invariant, link, syntax, and compile checks.
```

## 22. Smoke tests

Run the full install plus smoke test:

```bash
./install.sh
```

Run smoke test only:

```bash
tests/smoke.sh
```

The smoke test checks:

- all eight systemd services
- Hugo homepage
- personal search API
- docs browser health/search
- Man browser search/render
- Info browser search/render/missing-node rejection
- Command cheatsheets browser health
- key static assets
- D2 → SVG rendering
- Typst → SVG rendering
- personal/docs architectural invariants
- filename invariants
- workspace validation
- internal Markdown links
- shell syntax
- JavaScript syntax
- Bun compilation of core TypeScript scripts

Useful manual endpoint checks:

```bash
curl -fsS http://127.0.0.1:1320/health
curl -fsS 'http://127.0.0.1:8788/api/search?q=linux'
curl -fsS 'http://127.0.0.1:1320/api/search?q=markdown'
curl -fsS 'http://127.0.0.1:1321/api/search?q=man'
curl -fsS 'http://127.0.0.1:1321/man/1/man' >/dev/null
curl -fsS 'http://127.0.0.1:1322/api/search?q=make'
curl -fsS 'http://127.0.0.1:1322/info/make/Overview' >/dev/null
curl -fsS http://127.0.0.1:1323/health
curl -fsS 'http://127.0.0.1:1322/api/search?q=make'
curl -fsS 'http://127.0.0.1:1322/info/make/Overview' >/dev/null
```

## 23. Mental model of the data flow

### Personal notes

```text
personal Markdown files
        │
        ├── Hugo mounts generated from workspace config
        │       └── personal website :1314
        │
        ├── full/incremental indexer
        │       └── SQLite FTS5 .runtime/personal/knowledge.db
        │               └── search/render API :8788
        │                       ├── browser search
        │                       └── kn search → fzf → nvim
        │
        ├── inotify watcher
        │       └── keeps index synchronized
        │
        └── kn
                ├── create/open/read
                ├── move/rename
                └── optional local-only Git commit
```

### External documentation

```text
external Markdown tree
        │
        ├── full reconciliation
        │       ├── live filesystem path set
        │       ├── stale DB/FTS rows removed first
        │       └── only new/changed files re-indexed
        │
        ├── docs watcher
        │       └── per-path incremental index maintenance
        │
        └── SQLite FTS5 .runtime/docs/docs.db
        │
        ├── read-only browser :1320
        │
        └── kn docs → API → fzf → nvim -R
```

### Installed man pages

```text
system man pages
        │
        ├── apropos / man database maintained by the OS
        │       └── Man search :1321
        │
        ├── man -Thtml
        │       └── rendered local manual page
        │
        └── man -w
                └── local cross-reference existence checks
```

There is intentionally no Knowledge-owned man-page index.

### Installed GNU Info manuals

```text
system Info manuals
        │
        ├── info --apropos
        │       └── Info search :1322
        │
        ├── info --file/--node --output=-
        │       └── rendered local Info node
        │
        └── exact returned Node header check
                └── prevents invalid-node fallback to Top
```

There is intentionally no Knowledge-owned Info index.

### Command cheatsheets

```text
local command reference tools
        │
        ├── tldr
        ├── navi + local .cheat repositories
        ├── cheat
        │
        └── read-only Commands browser :1323
```

There is intentionally no Knowledge-owned command-cheatsheet corpus or index.

## 24. Design boundaries that should not be broken casually

Keep these invariants unless intentionally redesigning the project:

1. Markdown remains the source of truth.
2. Personal notes remain outside this application repository.
3. Personal notes Git remains local-only and has no remote.
4. The five MOCs remain fixed unless all validators, CLI behavior, mounts, UI, and tests are deliberately migrated together.
5. Filename uniqueness is global across all five MOCs.
6. Filenames remain lowercase ASCII/digit/hyphen Markdown names.
7. MOC is derived from folder location, not front matter.
8. Runtime state belongs under `.runtime/`.
9. Workspace paths come from `~/.config/knowledge/workspaces.toml`.
10. Hugo personal mounts come from generated runtime config and include root-level plus nested Markdown files.
11. Trusted raw HTML in personal Markdown is rendered intentionally because the personal workspace is local and user-controlled.
12. Documentation remains independent from the personal workspace.
13. Documentation remains read-only from the Knowledge UI/CLI.
14. Avoid extra infrastructure when local native tools already solve the problem.
15. Use one package-manager lockfile.
16. Prefer archiving notes over introducing destructive delete behavior.
17. Keep the Man browser backed by the system's installed man pages; do not duplicate them into a second corpus or database without a concrete need.
18. Keep the Info browser backed by the system's installed GNU Info manuals; do not duplicate them into a second corpus or database without a concrete need.
19. Keep the Commands browser backed by TLDR, Navi, and Cheat rather than duplicating their data into a Knowledge-owned corpus or index.
20. Keep the six surfaces visually coherent through the shared navigation shell while allowing each surface to keep its own backend and search scope.

## 25. Fast recovery checklist

If returning to this project after a long time:

1. Read this file.
2. Check `~/.config/knowledge/workspaces.toml`.
3. Confirm the notes root contains the five MOC directories.
4. Confirm the notes root is a Git repository with **no remote**.
5. Run:

```bash
./install.sh
```

6. If installation fails, check:

```bash
tests/smoke.sh
systemctl --user status knowledge-personal-search.service
systemctl --user status knowledge-personal-web.service
systemctl --user status knowledge-personal-watch.service
systemctl --user status knowledge-docs-browser.service
systemctl --user status knowledge-man-browser.service
systemctl --user status knowledge-info-browser.service
systemctl --user status knowledge-docs-watch.service
```

7. Verify endpoints:

```bash
curl -fsS http://127.0.0.1:1314/ >/dev/null
curl -fsS http://127.0.0.1:1320/health
curl -fsS 'http://127.0.0.1:8788/api/search?q=test'
curl -fsS 'http://127.0.0.1:1321/api/search?q=man'
curl -fsS 'http://127.0.0.1:1321/man/1/man' >/dev/null
```

8. Test the CLI:

```bash
kn --help
kn search test
kn docs test
```

## 26. Current project summary

In its current form, Knowledge is best understood as a small local operating layer around Markdown.

It does not try to replace Markdown with an application database. Instead:

- Markdown remains human-readable and portable.
- Hugo provides the personal browsing surface.
- SQLite FTS5 provides fast derived search.
- Bun runs indexing and HTTP services.
- inotify keeps indexes synchronized.
- systemd keeps local services running.
- `kn` provides the daily terminal workflow.
- local Git gives personal notes history without publishing them.
- the docs browser gives a separate read-only search surface for large external Markdown collections.
- the Man browser exposes the machine's installed manual pages directly, without copying or re-indexing them.
- the Info browser exposes the machine's installed GNU Info manuals directly, without copying or re-indexing them.
- the Commands browser exposes TLDR, Navi, and Cheat directly, without copying or re-indexing their cheatsheets.
- a shared responsive navigation shell keeps Notes, Productivity, Documentation, Man, Info, and Commands visually consistent while their data models remain separate.

When changing the project, preserve that separation and rebuildability unless there is a strong reason to change the architecture.
