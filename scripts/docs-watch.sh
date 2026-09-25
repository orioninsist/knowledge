#!/usr/bin/env bash
set -uo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"

if command -v readlink >/dev/null 2>&1; then
  SCRIPT_PATH="$(
    readlink -f "$SCRIPT_PATH" 2>/dev/null ||
      printf '%s\n' "$SCRIPT_PATH"
  )"
fi

PROJECT="$(
  cd "$(dirname "$SCRIPT_PATH")/.."
  pwd
)"

ROOT="${KNOWLEDGE_DOCS_ROOT:-/home/murat/Media/5-Documentation}"
IGNORE="${KNOWLEDGE_DOCS_IGNORE:-$ROOT/Knowledge}"
BUN="$HOME/.bun/bin/bun"

cd "$PROJECT" || exit 1

if [ ! -x "$BUN" ]; then
  echo "ERROR: Bun executable not found: $BUN" >&2
  exit 1
fi

reindex() {
  KNOWLEDGE_DOCS_ROOT="$ROOT" \
  KNOWLEDGE_DOCS_IGNORE="$IGNORE" \
    "$BUN" scripts/build-docs-index.ts
}

reindex || true

inotifywait \
  -m \
  -r \
  -q \
  --exclude "$(printf '%s' "$IGNORE" | sed 's/[].[^$*+?{}|()\\]/\\&/g')" \
  "$ROOT" \
  -e close_write \
  -e delete \
  -e moved_from \
  -e moved_to \
  --format '%e|%w%f' |
while IFS='|' read -r _events path
do
  case "${path,,}" in
    *.md)
      reindex || true
      ;;
  esac
done
