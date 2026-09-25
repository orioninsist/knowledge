#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"

if command -v readlink >/dev/null 2>&1; then
  SCRIPT_PATH="$(
    readlink -f "$SCRIPT_PATH" 2>/dev/null ||
      printf '%s\n' "$SCRIPT_PATH"
  )"
fi

PROJECT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
BIN_DIR="$HOME/.local/bin"

mkdir -p "$BIN_DIR"

install_link() {
  local name="$1"
  local target="$PROJECT_DIR/bin/$name"

  [ -f "$target" ] || return 0

  ln -sfn "$target" "$BIN_DIR/$name"
}

install_link kn

echo "PASS: local command links repaired."
