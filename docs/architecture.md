# PARA Architecture

## Goal

Local-first document reader.

Flow:

Workspace
→ Alt+K Search
→ File
→ Renderer
→ Reader


## UI

- Single interface
- Card based workspace selection
- Alt+H: Home
- Alt+K: Search
- ESC: Close search


## Workspace

Workspace = folder path.

Config controls:

- name
- path

Adding a folder automatically creates a card.


## Search

Search is core.

Architecture:

Filesystem
→ Watcher
→ Queue
→ Indexer
→ Tantivy
→ Search


SQLite:
- metadata

Tantivy:
- full text search


## Renderer

Plugin based.

Renderer folders are discovered automatically.

Example:

renderers/
- markdown
- mermaid
- typst
- d2
- canvas
- pdf


Adding/removing renderer does not require core code changes.


## Config

Central configuration:

- font
- size
- background
- card layout
- workspace paths
- renderer settings

One place controls the system.
