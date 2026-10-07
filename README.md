# Knowledge

> Markdown-first personal knowledge system. Terminal-native workflow for capturing, finding, reading, editing, rendering, and maintaining notes.

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

All notes, diagrams, documents, drawings, and publication files can be searched recursively from this single root.

## Repository Structure

```text
knowledge/
├── README.md
├── docs/
│   ├── terminal-stack.md
│   └── terminal-daily-usage.md
└── notes/
```

## Primary Markdown Workflow

Markdown is the main working format.

AstroNvim is used as the primary editor profile:

```bash
NVIM_APPNAME=astronvim nvim note.md
```

Inside Markdown, fenced Mermaid, D2, and Typst blocks are rendered inline in AstroNvim through Snacks Image and Kitty graphics.

The verified interactive workflow is:

```text
open note.md
   ↓
Mermaid / D2 / Typst blocks render automatically
   ↓
move to the fenced block opener
   ↓
Enter
   ↓
edit the source block
   ↓
Esc
   ↓
updated render returns automatically
```

The Markdown file always remains the source of truth. Rendered images are generated for preview only; source code stays copyable and editable.

### Embedded Mermaid

```text
Markdown fenced mermaid block
   ↓ Mermaid CLI / Snacks document rendering
inline image
   ↓
Kitty graphics inside AstroNvim
```

### Embedded D2

```text
Markdown fenced d2 block
   ↓ d2
temporary SVG
   ↓ Inkscape
temporary PNG
   ↓ Snacks Image
Kitty graphics inside AstroNvim
```

D2 uses the SVG path because it is stable and avoids the browser/Playwright path required by direct PNG rendering.

### Embedded Typst

```text
Markdown fenced typst block
   ↓ typst compile
temporary PNG
   ↓ Snacks Image
Kitty graphics inside AstroNvim
```

Typst blocks are compiled directly to PNG for inline preview.

## File Formats and Rendering Workflow

Each format has one primary role and one preferred toolchain.

| Format | Role | Edit | Render / Open | Preferred Output |
| --- | --- | --- | --- | --- |
| `.md` | Main notes and publishable source | AstroNvim / Neovim | inline render; glow / mdcat; Pandoc for publication | Terminal, inline graphics, HTML, PDF, EPUB |
| `.d2` | Standalone architecture and technical diagrams | Neovim | D2 | SVG |
| `.mmd` | Standalone Mermaid diagrams | Neovim | Mermaid CLI (`mmdc`) | SVG |
| `.typ` | Standalone typeset documents | Neovim | Typst | PDF |
| `.excalidraw` | Free-form visual drawings | Excalidraw Desktop | Excalidraw Desktop | Native drawing, SVG/PNG export |
| `.pdf` | Final document / reading format | — | Zathura | PDF |
| `.epub` | E-book / long-form reading | — | ebook-viewer | EPUB |
| `.html` | Browser-readable publication | Neovim | Google Chrome | HTML |
| `.svg` | Vector image / diagram output | Neovim if needed | imv | SVG |
| `.png` / `.jpg` / `.jpeg` / `.webp` | Raster image reading | — | imv | Native image |
| `.json` | Structured data | Neovim | jq | JSON |
| `.yaml` / `.yml` | Structured configuration | Neovim | yq | YAML |

### Standalone rendering conventions

Keep editable sources separate from final outputs.

```text
D2
diagram.d2
   ↓ d2
diagram.svg
   ↓
imv
```

```text
Mermaid
diagram.mmd
   ↓ mmdc
diagram.svg
   ↓
imv
```

```text
Typst
document.typ
   ↓ typst compile
document.pdf
   ↓
Zathura
```

```text
Markdown
document.md
   ↓ pandoc
document.html
document.pdf
document.epub
```

The default standalone diagram output is SVG because it remains sharp at any scale. Typst is the preferred source for typeset PDF documents. Markdown plus Pandoc is the preferred publishing path when one source needs HTML, PDF, or EPUB output.

For Markdown-to-PDF through Typst, the verified command uses an explicit main font:

```bash
pandoc document.md \
  --pdf-engine=typst \
  -V mainfont="Noto Serif" \
  -o document.pdf
```

## Terminal Tool Stack

The system uses small native tools. Each tool has one clear purpose.

| Tool | Purpose | Link |
| --- | --- | --- |
| Kitty | GPU-accelerated terminal emulator and inline graphics backend | https://github.com/kovidgoyal/kitty |
| fd | Fast file finding | https://github.com/sharkdp/fd |
| ripgrep (rg) | Fast text search inside notes | https://github.com/BurntSushi/ripgrep |
| fzf | Fuzzy interactive search | https://github.com/junegunn/fzf |
| zoxide | Smart directory jumping | https://github.com/ajeetdsouza/zoxide |
| eza | Modern ls replacement | https://github.com/eza-community/eza |
| yazi | Terminal file manager | https://github.com/sxyazi/yazi |
| Neovim (nvim) | Markdown and source-format editor | https://github.com/neovim/neovim |
| AstroNvim | Primary Neovim profile for the Knowledge editing workflow | https://github.com/AstroNvim/AstroNvim |
| Snacks.nvim | Inline image/document rendering inside AstroNvim | https://github.com/folke/snacks.nvim |
| glow | Markdown renderer for terminal | https://github.com/charmbracelet/glow |
| mdcat | Rich terminal Markdown renderer and live preview | https://github.com/BIRSAx2/mdcat |
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
| Inkscape | SVG-to-PNG conversion dependency used by the embedded D2 preview pipeline | https://inkscape.org/ |
| ImageMagick | Image conversion dependency available to the rendering stack | https://imagemagick.org/ |
| imv | Lightweight Wayland-friendly image viewer for SVG, PNG, JPEG, WebP, and other image formats | https://sr.ht/~exec64/imv/ |
| Zathura | PDF reader | https://pwmt.org/projects/zathura/ |
| ebook-viewer | EPUB reader from the Calibre package, used directly without the main library GUI | https://calibre-ebook.com/ |
| Excalidraw | Open-source free-form drawing format/application | https://github.com/excalidraw/excalidraw |
| Excalidraw Desktop | Linux desktop client used for local `.excalidraw` files | https://github.com/quabyt-tech/excalidraw-desktop |

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
fd keyword /home/murat/Media/8-Document/Knowledge
```

### Search inside notes

```bash
rg "keyword" /home/murat/Media/8-Document/Knowledge
```

### Interactive recursive Markdown search

```bash
f="$(fd -t f -e md . /home/murat/Media/8-Document/Knowledge | fzf)"
[ -n "$f" ] && NVIM_APPNAME=astronvim nvim "$f"
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

### Edit Markdown with inline renders

```bash
NVIM_APPNAME=astronvim nvim note.md
```

Within a Mermaid, D2, or Typst fenced block:

```text
Enter → edit source
Esc   → return to automatic rendered preview
```

### Glow current Markdown

Open the current Markdown file directly in Glow from AstroNvim:

```text
Space g g
```

Configuration:

```text
~/.config/astronvim/lua/plugins/glow.lua
```

### Diagram and document tools

```bash
# D2: standalone diagram to SVG
d2 diagram.d2 diagram.svg

# Mermaid: standalone diagram to SVG
mmdc -i diagram.mmd -o diagram.svg

# Typst: standalone document to PDF
typst compile document.typ document.pdf

# Markdown: publish to HTML
pandoc document.md -o document.html

# Markdown: publish to EPUB
pandoc document.md -o document.epub

# Markdown: publish to PDF through Typst
pandoc document.md \
  --pdf-engine=typst \
  -V mainfont="Noto Serif" \
  -o document.pdf
```

### Visual files

```bash
# Excalidraw
excalidraw-desktop drawing.excalidraw

# PDF
zathura document.pdf

# EPUB
ebook-viewer book.epub

# SVG
imv diagram.svg

# PNG / JPEG / WebP
imv image.png

# HTML
google-chrome document.html
```

Excalidraw Desktop is used for local `.excalidraw` files. The older Chrome/PWA launcher is not part of the primary workflow.

For normal image viewing, imv is the preferred viewer. Inkscape remains installed only because the embedded D2 renderer currently uses it as the SVG-to-PNG conversion step; it is not the default SVG viewer.

The Calibre library GUI is not part of the workflow. EPUB files are opened directly with `ebook-viewer`.

## Espanso Shortcuts

Espanso provides short terminal triggers for the most common Knowledge actions. The configuration lives at:

```text
~/.config/espanso/match/knowledge.yml
```

The active shortcuts are:

| Trigger | Action |
| --- | --- |
| `:kn` | Go to the Knowledge root |
| `:knfind` | Recursively find a Markdown file with fd + fzf and open it in AstroNvim |
| `:knfile` | Recursively choose a Markdown filename with fd + fzf |
| `:knsearch` | Run the dedicated `knsearch` helper for Markdown content search |
| `:knglow` | Recursively choose a Markdown file and read it with glow |
| `:knexcalidraw` | Open a recursive `.excalidraw` selection in Excalidraw Desktop |
| `:knd2` | Render a recursive `.d2` selection to SVG and open it with imv |
| `:knmermaid` | Render a recursive `.mmd` selection to SVG and open it with imv |
| `:kntypst` | Compile a recursive `.typ` selection to PDF and open it with Zathura |
| `:knpdf` | Recursively choose a PDF and open it with Zathura |
| `:knepub` | Recursively choose an EPUB and open it with ebook-viewer |
| `:knimage` | Recursively choose SVG/PNG/JPEG/WebP and open it with imv |
| `:knreadme` | Read the repository README with glow |
| `:knrepo` | Go to the Knowledge repository |

### Interactive content search

`:knsearch` intentionally expands only to the short command `knsearch`. The shell logic lives in a dedicated helper instead of being embedded inside Espanso:

```text
~/.local/bin/knsearch
```

The search flow is:

```text
Markdown files under the Knowledge root
   ↓ ripgrep (rg)
matching lines
   ↓ fzf
interactive selection + bat preview
   ↓ Enter
AstroNvim opens the selected file at the selected line
```

This keeps Espanso configuration simple and avoids shell quoting/parsing problems in long replacement strings.


## AstroNvim Rendering Configuration

The final verified setup keeps three active Knowledge-specific plugin specs:

```text
~/.config/astronvim/lua/plugins/
├── snacks_image.lua
├── knowledge_inline_render.lua
└── knowledge_render_edit.lua
```

Their responsibilities are:

- `snacks_image.lua` — enables Snacks Image document/inline rendering.
- `knowledge_inline_render.lua` — renders embedded D2 and Typst blocks and places the generated images inline.
- `knowledge_render_edit.lua` — provides the Enter-to-edit and Esc-to-re-render workflow.

Mermaid rendering is handled through the Snacks document rendering path already active in AstroNvim.

## Git Workflow

```bash
git status
git add .
git commit -m "update notes"
```

```bash
lazygit
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
- Lightweight dedicated viewers for reading
- Source remains the source of truth
- Generated previews are disposable
- Embedded visual source stays copyable and editable
- Render automatically; edit explicitly
- Fast retrieval

## Consolidated Notes

The previous `docs/terminal-stack.md` and `docs/terminal-daily-usage.md` content has been consolidated into this README so the repository keeps a single source of truth for the terminal stack, daily workflow, rendering conventions, and shortcuts.
