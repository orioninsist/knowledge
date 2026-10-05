# Secret Break Node — Terminal Stack

## Purpose

Native terminal workflow for the Markdown-first knowledge system.

The goal is fast capture, search, reading, and editing without depending on a GUI application.

## Core Tools

| Tool | Purpose |
| --- | --- |
| `fd` | Fast file discovery |
| `rg` | Full-text search inside notes |
| `yazi` | Terminal file navigation |
| `nvim` | Markdown editing |
| `glow` | Markdown rendering in terminal |
| `bat` | Syntax-highlighted file viewing |
| `git` | Version history |
| `pandoc` | Document conversion |
| `tmux` | Persistent terminal sessions |

## Daily Flow

Find a note:

```bash
fd note-name
```

Search knowledge:

```bash
rg "keyword" ~/Knowledge
```

Read:

```bash
glow note.md
```

Edit:

```bash
nvim note.md
```

## Principle

Markdown files remain the source of truth. Terminal tools are replaceable infrastructure around the notes.
