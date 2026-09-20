# Knowledge

A local-first, Markdown-first Second Brain system built around plain files, Hugo, SQLite FTS5, Bun, and a small set of text-based visual renderers.

The core idea is simple:

> Your notes are Markdown files. Everything else is replaceable infrastructure.

Knowledge does not store notes in a proprietary database. The filesystem is the source of truth, while search indexes, rendered diagrams, runtime files, and caches are derived data that can be rebuilt.

## Design Goals

- Plain Markdown as the permanent knowledge format
- Local-first and application-independent
- No plugin ecosystem required
- No proprietary note database
- Incremental indexing instead of filesystem-wide rescans
- Fast browser-based reading and search
- Portable command-line workflow
- Reproducible installation
- Minimal maintenance
- Disposable runtime state
- Git-friendly source code
- Long-term data ownership

## Knowledge Structure

A workspace contains exactly five MOC directories:

```text
Knowledge/
├── 0-Inbox/
├── 1-Projects/
├── 2-Areas/
├── 3-Resources/
└── 4-Archives/
````

Only Markdown files belong inside these directories.

The five sections follow an Inbox + PARA-style organization model:

* `Inbox` — captured notes waiting to be organized
* `Projects` — active outcomes and projects
* `Areas` — ongoing responsibilities and interests
* `Resources` — reference material
* `Archives` — inactive or completed material

Notes can move between these sections without changing their identity.

## Source of Truth

The permanent data model is intentionally small:

```text
Markdown files
+
filesystem location
+
front matter
+
links
```

SQLite is not the source of truth.

Rendered SVG files are not the source of truth.

Hugo output is not the source of truth.

Runtime configuration is not the source of truth.

All of those can be rebuilt from the Markdown workspace.

## Canonical Front Matter

New notes use the following template:

```yaml
---
title:
description:
status:
aliases: []
tags: []
---
```

MOC information is not duplicated in front matter.

The physical directory determines whether a note belongs to Inbox, Projects, Areas, Resources, or Archives.

## Filename Contract

Markdown filenames follow one strict rule:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*\.md$
```

Examples:

```text
linux.md
arch-linux.md
building-second-brain.md
note1.md
project-2026.md
```

Rejected examples:

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

Rules:

* lowercase English letters only
* numbers `0-9` are allowed
* hyphen is the only separator
* no spaces
* no underscores
* exactly one `.md` suffix
* filenames are globally unique across all five MOCs

## Architecture

```text
Markdown workspace
        │
        ▼
Filesystem events
        │
        ▼
Incremental indexer
        │
        ▼
SQLite FTS5
        │
        ▼
Bun / TypeScript API
        │
        ├── Search
        ├── Completion
        ├── Last note
        ├── D2 rendering
        └── Typst rendering
        │
        ▼
Hugo
        │
        ▼
Browser
```

The live filesystem watcher processes individual file events.

Create, edit, delete, and move operations do not require a complete workspace rescan.

## Technology Stack

### Core

* Markdown — permanent note format
* Hugo — web rendering
* Goldmark — Markdown rendering through Hugo
* Bun — TypeScript runtime
* TypeScript — indexing, runtime API, workspace logic, note creation
* SQLite FTS5 — search index
* Bash — watcher and command-line integration
* systemd user services — process management
* inotify — filesystem event monitoring

### Browser

* JavaScript
* HTML
* CSS

### Visual Languages

* Mermaid
* D2
* Typst

These visual languages live inside Markdown fenced code blocks.

The Markdown file remains the source of truth.

## Productivity Desktop

Knowledge includes a separate local productivity workspace. It does not read, write, search, or mutate the Markdown knowledge system.

The Productivity surface is intentionally limited to four tools:

* `World Clock` — persistent saved cities with live local times and quick city presets
* `Weather` — persistent city selection, current conditions, and seven-day forecast
* `Prayer` — persistent city/adhan selection, five daily prayer times, background prayer alerts, and adhan preview/playback
* `Focus` — configurable Pomodoro cycles plus a separate uninterrupted Focus Mode with desktop notification sound support

Productivity state is stored locally in browser storage. Weather uses Open-Meteo, prayer times use AlAdhan with the Diyanet calculation method, and city lookup uses Open-Meteo geocoding. The Tauri shell remains thin and is responsible only for native window lifecycle, tray, autostart, single-instance behavior, notifications, and custom notification-sound file access.

The old Today, Plan, generic countdown, and stopwatch surfaces are intentionally not part of Productivity.

Development:

```bash
bun run productivity:desktop
```

The browser version remains available at:

```text
http://127.0.0.1:1314/productivity/
```

## Visual Notes

A single Markdown note can contain normal prose and rendered visual blocks.

### Mermaid

````markdown
```mermaid
flowchart LR
    Capture --> Organize
    Organize --> Distill
    Distill --> Express
```
````

Mermaid renders in the browser.

### D2

````markdown
```d2
client -> api
api -> database
api -> cache
```
````
