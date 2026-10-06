# Knowledge

> Markdown-first personal knowledge system. Terminal-native workflow for capturing, finding, reading, editing, rendering, and maintaining notes.

## Navigation

- [Terminal Stack](docs/terminal-stack.md) — native terminal tools used by the system
- [Terminal Daily Usage](docs/terminal-daily-usage.md) — daily workflows and command patterns

## Core Idea

Knowledge is organized under one root and searched recursively. Files may live in any subdirectory.

The workflow is:

```text
Capture
  ↓
Organize
  ↓
Find
  ↓
Edit
  ↓
Render / Read
  ↓
Review
```

## Knowledge Root

```text
/home/murat/Media/8-Document/Knowledge
```

All note, diagram, canvas, document, and publication files can be searched from this single root.

## Repository Structure

```text
knowledge/
├── README.md
├── docs/
│   ├── terminal-stack.md
│   └── terminal-daily-usage.md
└── notes/
```

## File Formats and Rendering Workflow

Each format has one primary role and one preferred toolchain.

| Format | Role | Edit | Render / Open | Preferred Output |
| --- | --- | --- | --- | --- |
| `.md` | Notes and publishable source | Neovim | glow / mdcat; Pandoc for conversion | Terminal, HTML, PDF, EPUB |
| `.d2` | Architecture and technical diagrams | Neovim | D2 | SVG |
| `.mmd` | Flowcharts and Mermaid diagrams | Neovim | Mermaid CLI (`mmdc`) | SVG |
| `.typ` | Typeset documents | Neovim | Typst | PDF |
| `.excalidraw` | Free-form visual drawings | Excalidraw Desktop | Excalidraw Desktop | Native drawing, SVG/PNG export |
| `.canvas` | Infinite-canvas knowledge maps | Obsidian Canvas | Obsidian Canvas | Native JSON Canvas |
| `.pdf` | Final document / reading format | — | System PDF viewer | PDF |
| `.epub` | E-book / long-form reading | — | EPUB reader | EPUB |
| `.html` | Browser-readable publication | Neovim | Web browser | HTML |
| `.svg` | Vector diagram output | Neovim if needed | System image/browser viewer | SVG |
| `.json` | Structured data | Neovim | jq | JSON |
| `.yaml` / `.yml` | Structured configuration | Neovim | yq | YAML |

### Rendering conventions

Keep source formats editable and generate presentation formats from them.

```text
D2
diagram.d2
   ↓ d2
diagram.svg
```

```text
Mermaid
diagram.mmd
   ↓ mmdc
diagram.svg
```

```text
Typst
document.typ
   ↓ typst compile
document.pdf
```

```text
Markdown
document.md
   ↓ pandoc
document.html
document.pdf
document.epub
```

The default diagram output is SVG because it stays sharp at any scale. Typst is the preferred source for typeset PDF documents. Markdown plus Pandoc is the preferred publishing path when one source needs HTML, PDF, or EPUB output.

## Terminal Tool Stack

The system uses small native tools. Each tool has one clear purpose.

| Tool | Purpose | Link |
| --- | --- | --- |
| Kitty | GPU-accelerated terminal emulator with image and graphics protocol support | https://github.com/kovidgoyal/kitty |
| fd | Fast file finding | https://github.com/sharkdp/fd |
| ripgrep (rg) | Fast text search inside notes | https://github.com/BurntSushi/ripgrep |
| fzf | Fuzzy interactive search | https://github.com/junegunn/fzf |
| zoxide | Smart directory jumping | https://github.com/ajeetdsouza/zoxide |
| eza | Modern ls replacement | https://github.com/eza-community/eza |
| yazi | Terminal file manager | https://github.com/sxyazi/yazi |
| Neovim (nvim) | Markdown and source-format editor | https://github.com/neovim/neovim |
| AstroNvim | Feature-rich and extensible Neovim configuration | https://github.com/AstroNvim/AstroNvim |
| glow | Markdown renderer for terminal | https://github.com/charmbracelet/glow |
| mdcat | Rich terminal Markdown renderer with GFM alerts, images, math, Mermaid, themes, and live preview | https://github.com/BIRSAx2/mdcat |
| bat | Better cat with syntax highlighting | https://github.com/sharkdp/bat |
| starship | Cross-shell prompt | https://github.com/starship/starship |
| flyline | Modern Bash line editor with suggestions, completion, fuzzy history, and rich prompt features | https://github.com/HalFrgrd/flyline |
| atuin | Shell history search and management | https://github.com/atuinsh/atuin |
| git | Version control | https://git-scm.com/ |
| lazygit | Terminal Git interface | https://github.com/jesseduffield/lazygit |
| Pandoc | Convert Markdown to HTML, PDF, EPUB, and other formats | https://pandoc.org/ |
| tmux | Terminal session manager | https://github.com/tmux/tmux |
| duf | Disk usage viewer | https://github.com/muesli/duf |
| btop | System monitor | https://github.com/aristocratos/btop |
| tldr | Simplified command examples | https://github.com/tldr-pages/tldr |
| jq | JSON processor | https://github.com/jqlang/jq |
| yq | YAML processor | https://github.com/mikefarah/yq |
| direnv | Automatic environment loader | https://github.com/direnv/direnv |
| shellcheck | Shell script analyzer | https://github.com/koalaman/shellcheck |
| D2 | Text-to-diagram language for architecture and technical diagrams | https://github.com/d2lang/d2 |
| Mermaid CLI (mmdc) | Render Mermaid source files from the command line | https://github.com/mermaid-js/mermaid-cli |
| Mermaid | Markdown-inspired text-to-diagram and chart language | https://github.com/mermaid-js/mermaid |
| Typst | Modern markup-based typesetting system for documents and PDFs | https://github.com/typst/typst |
| Excalidraw | Open-source infinite canvas and hand-drawn style whiteboard | https://github.com/excalidraw/excalidraw |
| Excalidraw Desktop | Linux desktop client used for local `.excalidraw` files | https://github.com/quabyt-tech/excalidraw-desktop |
| JSON Canvas | Open `.canvas` file format for infinite-canvas data | https://github.com/obsidianmd/jsoncanvas |
| Obsidian | Visual editor currently used for JSON Canvas files | https://obsidian.md/ |

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
# D2: render a diagram to SVG
d2 diagram.d2 diagram.svg

# Mermaid: render to SVG with Mermaid CLI
mmdc -i diagram.mmd -o diagram.svg

# Typst: compile or watch a PDF document
typst compile document.typ
typst watch document.typ

# Pandoc: publish Markdown
pandoc document.md -o document.html
pandoc document.md -o document.epub
pandoc document.md -o document.pdf
```

### Visual files

```bash
# Local Excalidraw file
excalidraw-desktop drawing.excalidraw

# JSON Canvas is edited visually with Obsidian Canvas
obsidian
```

Excalidraw Desktop is used for local `.excalidraw` files. The older Chrome/PWA launcher is not part of the primary workflow.

JSON Canvas remains an open, portable file format. Obsidian is currently used only as the visual Canvas editor; the files remain ordinary `.canvas` JSON files.

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

## Principles

- Markdown first
- One Knowledge root
- Recursive search
- Local first
- Terminal native
- Human-readable source files
- Open and portable formats where practical
- One preferred tool per file type
- Source and rendered output stay separate
- Fast retrieval
