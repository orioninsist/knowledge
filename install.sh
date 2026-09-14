#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
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
  curl \
  npm \
  systemctl
do
  need "$cmd"
done

BUN="$(command -v bun)"
HUGO="$(command -v hugo)"
D2="$(command -v d2)"
TYPST="$(command -v typst)"

echo 'PASS: External dependencies.'

if [ ! -f workspace.toml ]; then
  if [ -f workspace.example.toml ]; then
    cp workspace.example.toml workspace.toml

    echo
    echo 'ERROR: workspace.toml was created from workspace.example.toml.'
    echo 'Edit workspace.toml and run ./install.sh again.'
    exit 1
  fi

  echo 'ERROR: workspace.toml is missing.'
  exit 1
fi

echo
echo '--- npm dependencies ---'

npm ci

echo
echo 'PASS: npm dependencies installed.'

echo
echo '--- Runtime ---'

"$BUN" \
  scripts/prepare-workspace-runtime.ts \
  personal

echo
echo 'PASS: Runtime generated.'

echo
echo '--- Initial index ---'

"$BUN" \
  scripts/build-workspace-index.ts \
  personal

echo
echo 'PASS: Initial index generated.'

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
echo '--- systemd user services ---'

SYSTEMD_DIR="$HOME/.config/systemd/user"

mkdir -p "$SYSTEMD_DIR"

install_unit() {
  local source="$1"
  local target="$2"

  sed \
    -e "s|@PROJECT_DIR@|$PROJECT_DIR|g" \
    -e "s|@BUN@|$BUN|g" \
    -e "s|@HUGO@|$HUGO|g" \
    -e "s|@D2@|$D2|g" \
    -e "s|@TYPST@|$TYPST|g" \
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

systemctl --user daemon-reload

systemctl --user enable \
  knowledge-personal-search.service \
  knowledge-personal-watch.service \
  knowledge-personal-web.service \
  >/dev/null

systemctl --user restart \
  knowledge-personal-search.service

systemctl --user restart \
  knowledge-personal-web.service

systemctl --user restart \
  knowledge-personal-watch.service

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
