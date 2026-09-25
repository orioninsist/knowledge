#!/usr/bin/env bash
set -uo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"

if command -v readlink >/dev/null 2>&1; then
  SCRIPT_PATH="$(
    readlink -f "$SCRIPT_PATH" 2>/dev/null ||
      printf '%s\n' "$SCRIPT_PATH"
  )"
fi

SCRIPT_DIR="$(
  cd "$(dirname "$SCRIPT_PATH")"
  pwd
)"

PROJECT="$(
  cd "$SCRIPT_DIR/.."
  pwd
)"

RUNTIME_ENV="$PROJECT/.runtime/personal/runtime.env"

if [ ! -r "$RUNTIME_ENV" ]; then
  echo "ERROR: Runtime environment not found: $RUNTIME_ENV" >&2
  exit 1
fi

ROOT="$(
  sed -n \
    's/^WORKSPACE_ROOT=//p' \
    "$RUNTIME_ENV" |
  head -1
)"

if [ -z "$ROOT" ]; then
  echo "ERROR: WORKSPACE_ROOT missing from runtime.env" >&2
  exit 1
fi
BUN="$HOME/.bun/bin/bun"

DIRS=(
  "$ROOT/0-Inbox"
  "$ROOT/1-Projects"
  "$ROOT/2-Areas"
  "$ROOT/3-Resources"
  "$ROOT/4-Archives"
)

cd "$PROJECT" || exit 1

if [ ! -x "$BUN" ]; then
  echo "ERROR: Bun executable not found: $BUN" >&2
  exit 1
fi

upsert_note() {
  local path="$1"

  #
  # Very small retry window:
  # protects MOVED_TO / atomic-save timing without
  # scanning any other file.
  #
  local attempt

  for attempt in 1 2 3
  do
    if [ -f "$path" ]; then
      if "$BUN" \
        scripts/build-workspace-index.ts \
        personal \
        --upsert \
        "$path"
      then
        return 0
      fi
    fi

    sleep 0.05
  done

  return 1
}

delete_note() {
  "$BUN" \
    scripts/build-workspace-index.ts \
    personal \
    --delete \
    "$1"
}

refresh_hugo_after_removal() {
  # Hugo server already watches the Knowledge content directories.
  # Never restart Hugo for individual file deletions.
  # Repeated restarts can trigger systemd start-limit-hit.
  :
}

inotifywait \
  -m \
  -q \
  "${DIRS[@]}" \
  -e close_write \
  -e delete \
  -e moved_from \
  -e moved_to \
  --format '%e|%w%f' |
while IFS='|' read -r events path
do
  case "${path,,}" in
    *.md)
      ;;
    *)
      continue
      ;;
  esac

  #
  # Global Markdown filename invariant
  #
  # Allowed:
  #   note.md
  #   openai-api.md
  #
  # Rejected:
  #   AA.md
  #   note-123.md
  #   My-Note.md
  #   my_note.md
  #   my note.md
  #   türkçe.md
  #
  # Never rename or delete an invalid file automatically.
  #
  filename="${path##*/}"

  if [[ ! "$filename" =~ ^[a-z]+(-[a-z]+)*\.md$ ]]; then
    echo "REJECT INVALID FILENAME: $path" >&2

    # If this path was previously indexed under a valid/old state,
    # make sure an invalid Markdown filename cannot remain searchable.
    delete_note "$path" >/dev/null 2>&1 || true

    continue
  fi

  case "$events" in

    *DELETE*|*MOVED_FROM*)
      if delete_note "$path"; then
        echo "SYNC DELETE: $path"
      else
        echo "ERROR: Incremental delete failed: $path" >&2
      fi

      refresh_hugo_after_removal
      ;;

    *CLOSE_WRITE*|*MOVED_TO*)
      if upsert_note "$path"; then
        echo "SYNC UPSERT: $path"
      else
        echo "ERROR: Incremental upsert failed: $path" >&2
      fi
      ;;

  esac
done
