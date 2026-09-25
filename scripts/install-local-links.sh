#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
