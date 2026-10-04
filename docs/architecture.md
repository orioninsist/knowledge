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


## Application Boundary

The application exposes capabilities through a stable API layer.

Flow:

Application
→ API
→ Knowledge DAO
→ Services


Knowledge DAO provides:

- search
- documents
- workspaces


Internal services remain hidden behind the DAO boundary.


## Config

Central configuration:

- font
- size
- background
- card layout
- workspace paths

One place controls the system.
