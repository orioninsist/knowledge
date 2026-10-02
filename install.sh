#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"

if command -v readlink >/dev/null 2>&1; then
  SCRIPT_PATH="$(
    readlink -f "$SCRIPT_PATH" 2>/dev/null ||
      printf '%s\n' "$SCRIPT_PATH"
  )"
fi

PROJECT_DIR="$(
  cd "$(dirname "$SCRIPT_PATH")"
  pwd
)"

cd "$PROJECT_DIR"

echo
echo '===== KNOWLEDGE INSTALL ====='
echo

need() {
  local cmd="$1"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Missing dependency: $cmd"
    exit 1
  fi
}

for cmd in \
  bun \
  hugo \
  d2 \
  typst \
  inotifywait \
  info \
  curl \
  npm \
  systemctl
do
  need "$cmd"
done

HUGO="$(command -v hugo)"
D2="$(command -v d2)"
TYPST="$(command -v typst)"

echo 'PASS: External dependencies.'

WORKSPACE_CONFIG="$HOME/.config/knowledge/workspaces.toml"

if [ ! -f "$WORKSPACE_CONFIG" ]; then
  mkdir -p "$(dirname "$WORKSPACE_CONFIG")"

  if [ -f workspace.example.toml ]; then
    cp workspace.example.toml "$WORKSPACE_CONFIG"

    echo
    echo "ERROR: $WORKSPACE_CONFIG was created from workspace.example.toml."
    echo 'Edit it and run ./install.sh again.'
    exit 1
  fi

  echo "ERROR: $WORKSPACE_CONFIG is missing."
  exit 1
fi

echo
echo '--- npm dependencies ---'

npm ci

echo
echo 'PASS: npm dependencies installed.'

echo
echo '--- Runtime ---'

"$HOME/.bun/bin/bun" \
  scripts/prepare-workspace-runtime.ts \
  personal

echo
echo 'PASS: Runtime generated.'

# Documentation is a separate surface from the personal notes workspace.
# Never derive its root from WORKSPACE_ROOT: 1314 and 1320 intentionally serve
# independent trees.
DOCS_ROOT="${KNOWLEDGE_DOCS_ROOT:-/home/murat/Media/5-Documentation}"
DOCS_IGNORE="${KNOWLEDGE_DOCS_IGNORE:-$DOCS_ROOT/Knowledge}"

echo
echo '--- Initial index ---'

"$HOME/.bun/bin/bun" \
  scripts/build-workspace-index.ts \
  personal

echo
echo 'PASS: Initial index generated.'

echo
echo '--- Documentation index ---'

KNOWLEDGE_DOCS_ROOT="$DOCS_ROOT" \
KNOWLEDGE_DOCS_IGNORE="$DOCS_IGNORE" \
KNOWLEDGE_DOCS_REBUILD_FAST=1 \
  "$HOME/.bun/bin/bun" \
  scripts/build-docs-index.ts

echo
echo 'PASS: Documentation index generated.'

echo
echo '--- KN command ---'

mkdir -p "$HOME/.local/bin"

ln -sfn \
  "$PROJECT_DIR/bin/kn" \
  "$HOME/.local/bin/kn"

echo 'PASS: kn installed.'

echo
echo '--- Bash completion ---'

mkdir -p \
  "$HOME/.local/share/bash-completion/completions"

ln -sfn \
  "$PROJECT_DIR/completions/kn.bash" \
  "$HOME/.local/share/bash-completion/completions/kn"

echo 'PASS: Bash completion installed.'

echo
echo '--- Neovim Markdown completion ---'

NVIM_AFTER="$HOME/.config/nvim/after/ftplugin"
mkdir -p "$NVIM_AFTER"

ln -sfn \
  "$PROJECT_DIR/nvim/after/ftplugin/markdown.lua" \
  "$NVIM_AFTER/markdown.lua"

echo 'PASS: Neovim Markdown completion installed.'

echo
echo '--- systemd user services ---'

SYSTEMD_DIR="$HOME/.config/systemd/user"

mkdir -p "$SYSTEMD_DIR"

install_unit() {
  local source="$1"
  local target="$2"

  sed \
    -e "s|@PROJECT_DIR@|$PROJECT_DIR|g" \
    -e "s|@HUGO@|$HUGO|g" \
    -e "s|@D2@|$D2|g" \
    -e "s|@TYPST@|$TYPST|g" \
    -e "s|@DOCS_ROOT@|$DOCS_ROOT|g" \
    -e "s|@DOCS_IGNORE@|$DOCS_IGNORE|g" \
    "$source" \
    > "$target"
}

install_unit \
  systemd/knowledge-personal-search.service.in \
  "$SYSTEMD_DIR/knowledge-personal-search.service"

install_unit \
  systemd/knowledge-personal-watch.service.in \
  "$SYSTEMD_DIR/knowledge-personal-watch.service"

install_unit \
  systemd/knowledge-personal-web.service.in \
  "$SYSTEMD_DIR/knowledge-personal-web.service"

install_unit \
  systemd/knowledge-docs-browser.service.in \
  "$SYSTEMD_DIR/knowledge-docs-browser.service"

install_unit \
  systemd/knowledge-man-browser.service.in \
  "$SYSTEMD_DIR/knowledge-man-browser.service"

install_unit \
  systemd/knowledge-info-browser.service.in \
  "$SYSTEMD_DIR/knowledge-info-browser.service"

install_unit \
  systemd/knowledge-docs-watch.service.in \
  "$SYSTEMD_DIR/knowledge-docs-watch.service"

systemctl --user daemon-reload

systemctl --user enable \
  knowledge-personal-search.service \
  knowledge-personal-watch.service \
  knowledge-personal-web.service \
  knowledge-docs-browser.service \
  knowledge-man-browser.service \
  knowledge-info-browser.service \
  knowledge-docs-watch.service \
  >/dev/null

systemctl --user restart \
  knowledge-personal-search.service

systemctl --user restart \
  knowledge-personal-web.service

systemctl --user restart \
  knowledge-personal-watch.service

systemctl --user restart \
  knowledge-docs-browser.service

systemctl --user restart \
  knowledge-man-browser.service

systemctl --user restart \
  knowledge-info-browser.service

systemctl --user restart \
  knowledge-docs-watch.service

sleep 2

echo 'PASS: systemd services installed and started.'

echo
echo '--- Smoke test ---'

"$PROJECT_DIR/tests/smoke.sh"

echo
echo '===== INSTALL PASS ====='
echo
echo "Project: $PROJECT_DIR"
echo 'Command: kn'
echo 'Web:     http://127.0.0.1:1314'
echo 'API:     http://127.0.0.1:8788'
echo 'Docs:    http://127.0.0.1:1320'
echo 'Man:     http://127.0.0.1:1321'
echo 'Info:    http://127.0.0.1:1322'
