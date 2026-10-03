# Knowledge

Knowledge is a local-first workstation knowledge system for personal Markdown notes, large read-only Markdown documentation sets, locally installed man pages, locally installed GNU Info manuals, and local command cheatsheets.

Markdown is the source of truth. Search databases, generated Hugo configuration, render caches, and systemd units are disposable runtime state.

## Surfaces

| URL | Purpose |
| --- | --- |
| `http://127.0.0.1:1314/` | Personal notes, statistics, and browser search |
| `http://127.0.0.1:1314/productivity/` | Local productivity tools |
| `http://127.0.0.1:1320/` | Read-only external documentation browser |
| `http://127.0.0.1:1321/` | Locally installed man-page browser |
| `http://127.0.0.1:1322/` | Locally installed GNU Info browser |
| `http://127.0.0.1:1323/` | TLDR, Navi, and Cheat command cheatsheets |

## Core model

Personal notes live outside this repository in exactly five MOC directories:

```text
Knowledge/
├── 0-Inbox/
├── 1-Projects/
├── 2-Areas/
├── 3-Resources/
└── 4-Archives/
```

The folder is the MOC. Front matter does not duplicate MOC state.

Personal note filenames must match:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*\.md$
```

Examples: `linux.md`, `note1.md`, `project-2026.md`.

Notes may be organized in nested subdirectories inside any MOC. Filenames are globally unique across all five MOCs and their nested directories. There is no delete command in `kn`; notes are archived instead.

## What is in this repository

This repository contains application code only:

- `bin/kn` — terminal entry point.
- `scripts/` — workspace validation, indexing, search APIs, watchers, note helpers, documentation browser, local man browser, local GNU Info browser, and command cheatsheets browser.
- `layouts/` and `static/` — Hugo/browser UI.
- `systemd/` — user-service templates.
- `tests/smoke.sh` — integration and source-invariant checks.
- `install.sh` — local installation/bootstrap.

Personal notes are a separate local-only Git repository with **no remote**. The project repository may push to GitHub; the personal notes repository must not.

## Install

Requirements used by the installer:

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

The command cheatsheets browser uses `tldr`, `navi`, and `cheat` when they are installed. Navi also needs at least one local `.cheat` repository to return content, which can be added with `navi repo add` or selected through `navi repo browse`.

Create the workspace configuration:

```text
~/.config/knowledge/workspaces.toml
```

Example:

```toml
[[workspace]]
root = "/absolute/path/to/your/notes"
```

Then run:

```bash
git clone https://github.com/orioninsist/knowledge.git
cd knowledge
./install.sh
```

The installer runs `npm ci`, generates `.runtime/personal/hugo.toml` and `runtime.env`, builds the personal and documentation indexes, installs the `kn` symlink and Bash completion, installs/restarts systemd user services, and runs the smoke test.

The generated Hugo config is the runtime source for personal-content mounts. It mounts both root-level and nested Markdown files, enables trusted raw HTML rendering for the local personal workspace, and maps the five physical MOC directories to Hugo sections. Do not hand-maintain workspace paths in the repository.

## Services

```text
knowledge-personal-search.service   Personal SQLite FTS5/search/render API
knowledge-personal-web.service      Hugo on 127.0.0.1:1314
knowledge-personal-watch.service    Incremental personal-note index sync
knowledge-docs-browser.service      Read-only docs browser on 127.0.0.1:1320
knowledge-man-browser.service       Local installed man browser on 127.0.0.1:1321
knowledge-info-browser.service      Local installed GNU Info browser on 127.0.0.1:1322
knowledge-command-browser.service   TLDR, Navi, and Cheat browser on 127.0.0.1:1323
knowledge-docs-watch.service        Incremental docs index sync
```

Useful checks:

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

## `kn`

Open or create a note:

```bash
kn nvim inbox note-name
kn code projects project-note.md
kn hx resources linux-notes.md
```

Interactive selection:

```bash
kn nvim
kn nvim inbox
```

Read with Glow:

```bash
kn glow note-name.md
```

Move or rename:

```bash
kn mv note-name.md archives
kn rn note-name.md new-name.md
```

Relations and diagnostics:

```bash
kn links linux-notes.md
kn backlinks linux-notes.md
kn broken-links
kn doctor
```

Relations are derived only from standard Markdown links such as `[Linux networking](../3-Resources/linux-networking.md)`. Wikilinks are intentionally not part of the Knowledge note-link contract.

In Neovim Markdown buffers, `Ctrl-X Ctrl-O` completes link destinations inside `[]()`. Completion is directory-by-directory, shows at most five items at a time, includes folders and Markdown files, and inserts a relative path when a file is selected.

Generate a link without choosing a MOC manually:

```bash
kn link docker.md
kn link docker.md linux-networking.md
```

With only the source filename, `kn link` opens the global note picker. After a target note is selected, Knowledge discovers its real MOC, computes the relative path from the source note, and prints a portable standard Markdown link.

Search personal notes:

```bash
kn search
kn search docker network
kn search 'section:projects tag:linux status:todo'
kn search 'title:"local first"'
kn search 'file:systemd description:service alias:daemon'
```

Inline query filters support `section:`/`folder:`, `tag:`, `status:`, `file:`/`filename:`, `title:`, `description:`/`desc:`, and `alias:`.

Search external documentation:

```bash
kn docs
kn docs systemd
```

Personal search opens the selected note in normal Neovim. Documentation search opens the selected file with `nvim -R`.

Move and rename operations require confirmation. Note edits/creates/moves/renames can create local Git commits in the personal workspace, but only when that workspace has no remote.

## Browser search

Press `Alt + K` to open search on the current searchable surface. Search is intentionally surface-scoped rather than global:

- Notes searches the personal SQLite FTS5 index.
- Documentation searches the read-only documentation index.
- Man searches installed manual pages through `apropos`.
- Info searches installed GNU Info entries through `info --apropos`.
- Productivity has no artificial search layer.

The shared navigation shell is `Knowledge · Notes · Productivity · Documentation · Man · Info · Commands`, and it remains available while browsing inside each surface.

The personal home page intentionally stays small: note statistics and links to the local surfaces.

## Documentation browser

By default the documentation browser scans:

```text
/home/murat/Media/5-Documentation
```

and ignores:

```text
/home/murat/Media/5-Documentation/Knowledge
```

Override them for installation with:

```bash
KNOWLEDGE_DOCS_ROOT=/path/to/docs \
KNOWLEDGE_DOCS_IGNORE=/path/to/docs/ignored \
./install.sh
```

The documentation surface is intentionally read-only. It supports indexing, search, preview, and reading; it does not create, edit, move, or delete documentation files.

Full reconciliation walks the current filesystem, removes database/FTS rows for paths that no longer exist, then compares modification time and size for each live path. Only new or changed Markdown files are read and re-indexed; unchanged files stay untouched. The watcher still performs per-path incremental updates during normal operation.

## Man pages

The Man surface is available at:

```text
http://127.0.0.1:1321/
```

It deliberately uses the operating system's installed manual pages as its source of truth:

- search: `apropos`
- render: `man -Thtml`
- page/cross-reference existence: `man -w`

Knowledge does not copy man pages into Markdown and does not maintain a second man-page database. Installed references such as `man(1)` and `fuzzel.ini(5)` become local browser links when the target page exists.

Open search with `Alt + K`, type a term such as `fuzzel`, and open a result such as `fuzzel(1)` or `fuzzel.ini(5)`.

## GNU Info

The Info surface is available at:

```text
http://127.0.0.1:1322/
```

It uses the machine's locally installed GNU Info manuals as its source of truth:

- search: `info --apropos`
- render: `info --file=<manual> --node=<node> --output=-`
- node existence: the returned Info header must match the requested node exactly

Knowledge does not copy Info manuals into Markdown and does not maintain a second Info database or index. Menu entries, `*Note` references, and header navigation are converted into local links when the target node exists. Requests for missing nodes return `404` rather than accepting GNU Info's fallback to `Top`.

Open search with `Alt + K`, search for an installed topic such as `make`, and follow nodes within the local browser.

## Command cheatsheets

The Commands surface is available at:

```text
http://127.0.0.1:1323/
```

It provides read-only access to three locally installed command-cheatsheet tools:

- TLDR: `/tldr/<command>`
- Navi: `/navi/<command>`
- Cheat: `/cheat/<command>`

The executables and their own local data remain the source of truth. Knowledge does not copy these cheatsheets into Markdown and does not maintain a separate cheatsheet database or index.

Navi requires a local `.cheat` repository to return cheatsheet content. Repositories can be installed with `navi repo add` or selected through `navi repo browse`.

The browser binds only to `127.0.0.1`. Command names are validated and cheatsheets are rendered read-only; the browser does not execute commands from cheatsheet content.

## Visual blocks

Personal notes support fenced blocks for Mermaid, D2, Typst, Canvas, and Calendar.

Mermaid is served from the vendored browser bundle. D2 and Typst rendering are provided through the local search/render API.

## Productivity

`/productivity/` contains World Clock, Weather, Prayer Times, and Focus tools. Its state lives in browser storage and it does not read or modify Markdown notes.

## Code statistics

Use `cloc` to measure the repository by language and source lines without counting generated/runtime dependencies.

On Fedora:

```bash
sudo dnf install cloc
```

From the repository root:

```bash
cloc . \
  --exclude-dir=.git,.runtime,node_modules,vendor \
  --exclude-list-file=/dev/null
```

The exclusions keep Git metadata, generated runtime state, installed dependencies, and vendored third-party code out of the project source count. In particular, the vendored Mermaid bundle should not be treated as project-authored source code.

## Local checks

Full installation + smoke test:

```bash
./install.sh
```

Smoke test only:

```bash
tests/smoke.sh
```

Endpoints:

```bash
curl -fsS http://127.0.0.1:1320/health
curl -fsS 'http://127.0.0.1:8788/api/search?q=linux'
curl -fsS 'http://127.0.0.1:1320/api/search?q=markdown'
curl -fsS 'http://127.0.0.1:1321/api/search?q=man'
curl -fsS 'http://127.0.0.1:1321/man/1/man' >/dev/null
curl -fsS 'http://127.0.0.1:1322/api/search?q=make'
curl -fsS 'http://127.0.0.1:1322/info/make/Overview' >/dev/null
curl -fsS http://127.0.0.1:1323/health
curl -fsS http://127.0.0.1:1323/tldr/git >/dev/null
```

## Architecture

```text
Personal Markdown workspace
        │
        ├── inotify watcher
        │       └── incremental SQLite FTS5 index
        │
        ├── generated Hugo runtime config
        │       └── Hugo web UI on 1314
        │
        └── kn
                ├── create/open/read/move/rename
                ├── bounded FTS5 → fzf → nvim
                └── local-only Git commits

External documentation
        │
        ├── full reconciliation
        │       ├── remove stale DB/FTS paths first
        │       └── re-index only new/changed files
        │
        ├── per-path watcher updates
        │       └── SQLite FTS5 docs index
        │
        ├── read-only browser on 1320
        └── kn docs → FTS5 → fzf → nvim -R

Installed man pages
        │
        ├── apropos → search
        ├── man -Thtml → render
        └── local browser on 1321

Installed GNU Info manuals
        │
        ├── info --apropos → search
        ├── info --file/--node → render
        └── local browser on 1322

Local command cheatsheets
        │
        ├── tldr → TLDR pages
        ├── navi → local .cheat repositories
        ├── cheat → installed Cheat sheets
        └── read-only browser on 1323
```

## Maintenance rules

Keep the project small and explicit:

- Markdown is permanent data.
- Runtime state belongs under `.runtime/`.
- Workspace paths come from `~/.config/knowledge/workspaces.toml`.
- Use one package-manager lockfile: npm/`package-lock.json`.
- Prefer native local tools over extra infrastructure.
- Do not add a service or database unless it removes real complexity.
- Keep personal notes separate from project source control.
- Keep the Man browser backed by locally installed manual pages instead of duplicating them into a Knowledge-owned corpus or index.
- Keep the Info browser backed by locally installed GNU Info manuals instead of duplicating them into a Knowledge-owned corpus or index.
- Keep the Commands browser backed by TLDR, Navi, and Cheat instead of duplicating their data into a Knowledge-owned corpus or index.
- Keep the shared navigation/search UX coherent, but keep each surface's backend and search scope independent.
