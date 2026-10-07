# Knowledge

A flat, terminal-first personal knowledge system centered around AstroNvim.

The Knowledge directory is:

```text
/home/murat/Media/8-Document/Knowledge
```

All knowledge files live directly in this directory. There are no PARA subfolders in the current setup.

## Core workflow

The main editor is AstroNvim/Neovim.

### knfile

Open any existing Knowledge file in AstroNvim, or type a new filename to create a new file.

- Works with all file extensions.
- Uses `fd` + `fzf`.
- Ignores `.git` and `.gitignore`.
- New files are created when saved from AstroNvim.

### knsearch

Search inside text-readable Knowledge files and open the selected match at the matching line in AstroNvim.

- Not limited to Markdown.
- Uses `ripgrep` + `fzf`.
- Searches the flat Knowledge root.
- Hidden/ignored text files are searchable except `.git` and `.gitignore`.
- Binary files are not treated as normal text search targets.

### knrename

Select any Knowledge file, open it in AstroNvim for inspection/editing, then rename it after Neovim exits.

- Works with all file extensions.
- The new filename includes the extension.
- Existing destination files are never overwritten.

### docsearch

Search the local documentation collection and open the selected result for reading.

## Espanso shortcuts

The Espanso configuration acts as the launcher layer.

### General Knowledge

- `:kn` — change directory to the Knowledge root.
- `:knfile` — run `knfile`.
- `:knsearch` — run `knsearch`.
- `:knrename` — run `knrename`.
- `:knglow` — select a Markdown file with `fd + fzf` and read it with Glow.

### Documentation

- `:docsearch` — run `docsearch`.

### Visual formats

- `:knexcalidraw` — select an `.excalidraw` file and open it with Excalidraw Desktop.
- `:knd2` — select a `.d2` file, render it to SVG with D2, and view it with `imv`.
- `:knmermaid` — select an `.mmd` file, render it to SVG with Mermaid CLI, and view it with `imv`.

### Documents

- `:kntypst` — select a `.typ` file, compile it to PDF with Typst, and open it with Zathura.
- `:knpdf` — select a PDF and open it with Zathura.
- `:knepub` — select an EPUB and open it with `ebook-viewer`.

### Project

- `:knrepo` — change directory to the Knowledge Git repository.

## Repository scripts

Executable scripts are kept under `bin/`:

```text
bin/
├── docsearch
├── knfile
├── knrename
└── knsearch
```

The Espanso one-line launchers for Glow, Excalidraw, D2, Mermaid, Typst, PDF, and EPUB are intentionally not separate scripts because they are simple direct commands.

## AstroNvim

AstroNvim is the primary editor for the Knowledge system.

The current Markdown file can also be opened directly in Glow from AstroNvim with:

```text
Space g g
```

The related AstroNvim configuration lives at:

```text
~/.config/astronvim/lua/plugins/glow.lua
```
