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

## Terminal Tool Stack

The system uses small native terminal tools. Each tool has one clear purpose.

| Tool | Purpose | Link |
| --- | --- | --- |
| fd | Fast file finding | https://github.com/sharkdp/fd |
| ripgrep (rg) | Fast text search inside notes | https://github.com/BurntSushi/ripgrep |
| fzf | Fuzzy interactive search | https://github.com/junegunn/fzf |
| zoxide | Smart directory jumping | https://github.com/ajeetdsouza/zoxide |
| yazi | Terminal file manager | https://github.com/sxyazi/yazi |
| Neovim (nvim) | Markdown editor | https://github.com/neovim/neovim |
| glow | Markdown renderer for terminal | https://github.com/charmbracelet/glow |
| bat | Better cat with syntax highlighting | https://github.com/sharkdp/bat |
| starship | Cross-shell prompt | https://github.com/starship/starship |
| git | Version control | https://git-scm.com/ |
| pandoc | Document conversion | https://pandoc.org/ |
| tmux | Terminal session manager | https://github.com/tmux/tmux |

## Daily Terminal Workflow

### Change directory quickly

```bash
z project
```

### Find files

```bash
fd keyword
```

### Search inside notes

```bash
rg "keyword"
```

### Interactive search

```bash
fzf
```

### Browse files

```bash
yazi
```

### Read Markdown

```bash
glow note.md
```

### View file content

```bash
bat note.md
```

### Edit Markdown

```bash
nvim note.md
```

### Save changes

```bash
git status
git add .
git commit -m "update notes"
```

## Documentation

All system documentation lives as Markdown files inside this repository.

Links:

- [Terminal Stack](docs/terminal-stack.md)
- [Terminal Daily Usage](docs/terminal-daily-usage.md)
- Note organization
- Future knowledge modules

## Principles

- Markdown first
- Local first
- Terminal native
- Simple tools
- Fast retrieval
- Human readable files
