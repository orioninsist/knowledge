# Knowledge

Knowledge is a local-first Markdown knowledge system. It keeps permanent notes as plain files, serves them in the browser with Hugo, indexes them with SQLite FTS5, and provides a small terminal command named `kn` for daily note work.

The project has three local surfaces:

```text
http://127.0.0.1:1314/              Personal notes home and search
http://127.0.0.1:1314/productivity/ Productivity tools
http://127.0.0.1:1320/              Read-only documentation browser
```

Everything is designed around one rule: Markdown files are the source of truth. Runtime databases, generated Hugo configuration, visual render caches, and systemd units are disposable and can be rebuilt.

## Project Goal

Knowledge exists to be a stable, zero-cost personal knowledge environment built from native local tools. The goal is not to become a large custom platform. The goal is to connect the right simple tools in the right order so daily notes, large Markdown documentation sets, search, reading, visual rendering, and small productivity workflows all work locally without proprietary lock-in.

The project should stay boring, portable, and maintainable:

- Markdown files remain the permanent data.
- The application code stays in this repository.
- Personal notes stay outside this repository.
- Runtime state stays disposable.
- Browser pages are for reading and searching.
- Terminal commands are for deliberate note operations.
- Documentation browsing is read-only by design.
- New code is added only when it removes real manual work or replaces fragile manual steps.

## Current Features

- Local-first personal Markdown notes.
- Five fixed MOC folders: Inbox, Projects, Areas, Resources, and Archives.
- Browser home page with personal note statistics.
- Browser command search with `Alt + K`.
- SQLite FTS5 search for personal notes.
- SQLite FTS5 search for external documentation Markdown.
- Separate read-only documentation browser on port `1320`.
- Documentation indexer separated from the browser server.
- Documentation watcher service for refreshing the docs index.
- `kn` terminal command for opening, creating, reading, searching, moving, and renaming personal notes, plus read-only documentation search.
- Global filename completion across all five personal note MOCs.
- Confirmation before move and rename operations.
- Personal note changes use local Git commits only; personal notes never push to GitHub.
- Hugo-based personal note rendering.
- Mermaid, D2, Typst, Canvas, and calendar visual blocks.
- Local productivity page with World Clock, Weather, Prayer, and Focus tools.
- systemd user services for the web server, search API, note watcher, docs browser, and docs watcher.
- Reproducible installer with smoke tests.
- Catppuccin Mocha based visual theme.

## What It Does

- Keeps personal notes in five fixed Markdown folders.
- Opens, creates, reads, searches, moves, and renames notes from the terminal with `kn`.
- Searches notes from the browser with SQLite FTS5.
- Serves personal notes with Hugo at `http://127.0.0.1:1314/`.
- Serves external documentation Markdown as a separate read-only browser at `http://127.0.0.1:1320/`.
- Renders Mermaid, D2, Typst, Canvas, and calendar blocks inside notes.
- Provides a local productivity page for clock, weather, prayer times, and focus timers.
- Uses systemd user services so everything starts and restarts locally.

## Repository Role

This GitHub repository stores the Knowledge application code only.

Personal Markdown notes live outside the project directory. The personal notes workspace is a separate local-only Git repository with no remote. `kn` may create local commits for note changes, but it never pushes personal notes. This project repository is the only workspace allowed to push to GitHub.

The installed `kn` command at `~/.local/bin/kn` is only a symlink to this repository's `bin/kn`. The real source stays in the project directory.

## Personal Notes Workspace

A personal workspace must contain exactly five folders:

```text
Knowledge/
├── 0-Inbox/
├── 1-Projects/
├── 2-Areas/
├── 3-Resources/
└── 4-Archives/
```

Section meaning:

- `0-Inbox` captures new notes.
- `1-Projects` stores active project notes.
- `2-Areas` stores ongoing responsibilities and interests.
- `3-Resources` stores reference material.
- `4-Archives` stores inactive or completed notes.

Only Markdown files belong in these folders. The folder decides the MOC; front matter does not duplicate MOC state.

## Filename Rules

Personal note filenames must match this pattern:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*\.md$
```

Valid examples:

```text
linux.md
arch-linux.md
building-second-brain.md
note1.md
project-2026.md
```

Invalid examples:

```text
Linux.md
note_name.md
note name.md
note.md.md
note
-note.md
note-.md
note--name.md
```

Filenames are globally unique across all five MOCs.

## Front Matter

New notes use this shape:

```yaml
---
title:
description:
status:
aliases: []
tags: []
---
```

Supported `status` values are free text, but the UI is prepared for:

```text
todo
in-progress
review
done
```

## Install

Configure the notes workspace in:

```text
~/.config/knowledge/workspaces.toml
```

Example:

```toml
[[workspace]]
root = "/home/murat/Media/8-Document/Knowledge"
```

Then run:

```bash
cd /home/murat/Media/6-Project/knowledge
./install.sh
```

The installer:

- installs npm dependencies with `npm ci`;
- generates runtime Hugo config under `.runtime/personal/`;
- builds the personal note index;
- builds the documentation browser index;
- links `~/.local/bin/kn` to `bin/kn`;
- links Bash completion;
- installs and restarts systemd user services;
- runs the smoke test.

## Services

The installer manages these user services:

```text
knowledge-personal-search.service   Bun API for personal notes
knowledge-personal-web.service      Hugo web server on port 1314
knowledge-personal-watch.service    inotify-based personal note index sync
knowledge-docs-browser.service      read-only docs browser on port 1320
knowledge-docs-watch.service        documentation index refresh watcher
```

Useful checks:

```bash
systemctl --user status knowledge-personal-search.service
systemctl --user status knowledge-personal-web.service
systemctl --user status knowledge-docs-browser.service
systemctl --user status knowledge-docs-watch.service
```

## KN Command

Use `kn` as the terminal entry point.

Open or create a personal note:

```bash
kn nvim inbox note-name.md
kn code projects project-note.md
kn hx resources linux-notes.md
```

The `.md` suffix is optional for open/create:

```bash
kn nvim inbox note-name
```

Interactive usage:

```bash
kn nvim
kn nvim inbox
```

Read a personal note with Glow:

```bash
kn glow note-name.md
```

Move a personal note between MOCs:

```bash
kn mv note-name.md archives
```

Rename a personal note:

```bash
kn rn note-name.md new-name.md
```

Search personal notes:

```bash
kn search
kn search google
```

`kn search` uses SQLite FTS5 while you type, shows at most 10 results in `fzf`, previews the selected Markdown file as plain text, and opens the selected personal note in normal Neovim.

Search external documentation:

```bash
kn docs
kn docs systemd
```

`kn docs` uses the separate documentation FTS5 index while you type, shows at most 10 results in `fzf`, previews the selected Markdown file as plain text, and opens the selected document with `nvim -R`.

There is no delete command. Personal notes are moved to Archives instead of being deleted.

## Global Filename Selection

All five personal MOC folders are treated as one globally unique filename pool.

- `kn glow`, `kn mv`, `kn rn`, and editor open/create operate only on the personal notes workspace.
- Typed filename completion searches all five MOCs and returns up to 5 suggestions.
- Existing notes always open from their real location.
- The MOC argument only decides where a new note is created.
- A filename may exist in only one MOC at a time.

## Browser Search

Personal notes are searched at:

```text
http://127.0.0.1:1314/
```

Use `Alt + K` to open search. Search returns clickable note results. Filters are available for folder, filename, title, description, status, alias, and tag.

The home page intentionally shows only note statistics and links to the three local surfaces.

## Documentation Browser

External Markdown documentation is served at:

```text
http://127.0.0.1:1320/
```

By default it scans:

```text
/home/murat/Media/5-Documentation
```

and ignores its own optional `Knowledge` subdirectory by default:

```text
/home/murat/Media/5-Documentation/Knowledge
```

The documentation root is independent from the personal notes workspace. The installer must not derive the port 1320 documentation root from the port 1314 workspace path. You can override the documentation paths for a one-off install with `KNOWLEDGE_DOCS_ROOT` and `KNOWLEDGE_DOCS_IGNORE`.

The documentation browser is read-only. It supports search and reading only. Create, edit, move, and delete operations are rejected by the server.

The documentation index is built by:

```bash
bun scripts/build-docs-index.ts
```

and refreshed by:

```text
knowledge-docs-watch.service
```

## Productivity

The productivity page is separate from the Markdown knowledge system:

```text
http://127.0.0.1:1314/productivity/
```

It includes:

- World Clock
- Weather
- Prayer Times
- Focus

State is stored in browser storage. Weather and city lookup use Open-Meteo. Prayer times use AlAdhan with the Diyanet calculation method. The productivity page does not read, write, move, delete, or index Markdown notes.

## Visual Blocks

Markdown notes can contain visual fenced code blocks.

Mermaid:

````markdown
```mermaid
flowchart LR
  Capture --> Organize
  Organize --> Distill
  Distill --> Express
```
````

D2:

````markdown
```d2
client -> api
api -> database
```
````

Typst:

````markdown
```typst
#set page(width: auto, height: auto)
Hello from Typst
```
````

Calendar:

````markdown
```calendar
src: /absolute/path/to/calendar.ics
view: week
```
````

## Local Checks

Run the full installer and smoke test:

```bash
./install.sh
```

Run smoke directly:

```bash
tests/smoke.sh
```

Check docs health:

```bash
curl -fsS http://127.0.0.1:1320/health
```

Check personal search:

```bash
curl -fsS 'http://127.0.0.1:8788/api/search?q=linux'
```

Check docs search:

```bash
curl -fsS 'http://127.0.0.1:1320/api/search?q=markdown'
```

## Architecture

```text
Personal Markdown workspace
        │
        ├── inotify watcher
        │       └── incremental SQLite FTS5 index
        │
        ├── Hugo web server
        │       └── browser UI on 1314
        │
        └── kn terminal command
                ├── bounded FTS5 search → fzf preview → normal nvim
                └── local-only Git commits for note changes

External documentation Markdown
        │
        ├── docs indexer / docs watcher
        │       └── SQLite FTS5 docs index
        │
        ├── read-only docs browser on 1320
        └── kn docs → bounded FTS5 search → fzf preview → nvim -R
```

Permanent data stays in Markdown files. Runtime data stays under `.runtime/` and can be rebuilt.

## Maintenance Rule

Prefer native local tools over custom infrastructure:

- Hugo for note pages
- SQLite FTS5 for search
- Bun for small local APIs and indexers
- systemd user services for process management
- inotify for filesystem change detection
- Git for project source control and local-only personal note history

Do not add a database or service unless it replaces real complexity.
