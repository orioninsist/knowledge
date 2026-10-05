# Knowledge

> Markdown-first personal knowledge system. Terminal-native workflow for capturing, finding, reading, and maintaining notes.

## Navigation

- [Terminal Stack](docs/terminal-stack.md) — native terminal tools used by the system
- [Terminal Daily Usage](docs/terminal-daily-usage.md) — daily workflows and command patterns

## Core Idea

Knowledge is organized as Markdown documents.

The workflow is:

```text
Capture
  ↓
Organize
  ↓
Find
  ↓
Read
  ↓
Edit
  ↓
Review
```

## Repository Structure

```text
knowledge/
├── README.md
├── docs/
│   ├── terminal-stack.md
│   └── terminal-daily-usage.md
└── notes/
```

## Terminal Workflow

### Find files

```bash
fd keyword
```

### Search inside notes

```bash
rg "keyword"
```

### Read Markdown

```bash
glow note.md
```

### Edit Markdown

```bash
nvim note.md
```

## Documentation

All system documentation lives as Markdown files inside this repository.

Links:

- Terminal tools
- Daily workflows
- Note organization
- Future knowledge modules

## Principles

- Markdown first
- Local first
- Terminal native
- Simple tools
- Fast retrieval
- Human readable files
