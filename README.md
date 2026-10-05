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
| Kitty | GPU-accelerated terminal emulator with image and graphics protocol support | https://github.com/kovidgoyal/kitty |
| fd | Fast file finding | https://github.com/sharkdp/fd |
| ripgrep (rg) | Fast text search inside notes | https://github.com/BurntSushi/ripgrep |
| fzf | Fuzzy interactive search | https://github.com/junegunn/fzf |
| zoxide | Smart directory jumping | https://github.com/ajeetdsouza/zoxide |
| eza | Modern ls replacement | https://github.com/eza-community/eza |
| yazi | Terminal file manager | https://github.com/sxyazi/yazi |
| Neovim (nvim) | Markdown editor | https://github.com/neovim/neovim |
| AstroNvim | Feature-rich and extensible Neovim configuration | https://github.com/AstroNvim/AstroNvim |
| glow | Markdown renderer for terminal | https://github.com/charmbracelet/glow |
| mdcat | Rich terminal Markdown renderer with GFM alerts, images, math, Mermaid, themes, and live preview | https://github.com/BIRSAx2/mdcat |
| bat | Better cat with syntax highlighting | https://github.com/sharkdp/bat |
| starship | Cross-shell prompt | https://github.com/starship/starship |
| flyline | Modern Bash line editor with suggestions, completion, fuzzy history, and rich prompt features | https://github.com/HalFrgrd/flyline |
| atuin | Shell history search and management | https://github.com/atuinsh/atuin |
| git | Version control | https://git-scm.com/ |
| lazygit | Terminal Git interface | https://github.com/jesseduffield/lazygit |
| pandoc | Document conversion | https://pandoc.org/ |
| tmux | Terminal session manager | https://github.com/tmux/tmux |
| duf | Disk usage viewer | https://github.com/muesli/duf |
| btop | System monitor | https://github.com/aristocratos/btop |
| tldr | Simplified command examples | https://github.com/tldr-pages/tldr |
| jq | JSON processor | https://github.com/jqlang/jq |
| yq | YAML processor | https://github.com/mikefarah/yq |
| direnv | Automatic environment loader | https://github.com/direnv/direnv |
| shellcheck | Shell script analyzer | https://github.com/koalaman/shellcheck |
| D2 | Text-to-diagram language for architecture and technical diagrams | https://github.com/d2lang/d2 |
| Mermaid | Markdown-inspired text-to-diagram and chart language | https://github.com/mermaid-js/mermaid |
| Typst | Modern markup-based typesetting system for documents and PDFs | https://github.com/typst/typst |
| Excalidraw | Open-source infinite canvas and hand-drawn style whiteboard for diagrams and visual notes | https://github.com/excalidraw/excalidraw |
| JSON Canvas | Open file format used by Obsidian Canvas for infinite-canvas data | https://github.com/obsidianmd/jsoncanvas |

## Daily Terminal Workflow

### Change directory quickly

```bash
z project
```

### List files

```bash
eza
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

### Command help

```bash
tldr command
```

### Browse files

```bash
yazi
```

### Read Markdown

```bash
glow note.md
```

### Rich Markdown preview

```bash
mdcat note.md
mdcat --watch note.md
```

### Diagram and document tools

```bash
# D2: render a diagram
d2 diagram.d2 diagram.svg

# Mermaid: render with Mermaid CLI (mmdc)
mmdc -i diagram.mmd -o diagram.svg

# Typst: compile or watch a document
typst compile document.typ
typst watch document.typ
```

Excalidraw complements the terminal-native diagram tools when a free-form visual canvas is useful. Drawings use the open `.excalidraw` JSON format and can be exported to PNG or SVG.

Obsidian Canvas uses the open JSON Canvas file format. The format is maintained by Obsidian under the `obsidianmd/jsoncanvas` repository and is useful for storing infinite-canvas nodes and connections as portable `.canvas` files.

### AstroNvim profile

AstroNvim can be kept separate from the main Neovim configuration:

```bash
NVIM_APPNAME=astronvim nvim
```

### View file content

```bash
bat note.md
```

### Shell history

```bash
atuin search
```

### Git workflow

```bash
lazygit
```

### System check

```bash
btop
duf
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
