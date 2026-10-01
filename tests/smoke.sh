#!/usr/bin/env bash

FAIL=0

pass() {
    echo "PASS: $1"
}

fail() {
    echo "FAIL: $1"
    FAIL=1
}

echo
echo '===== KNOWLEDGE SMOKE TEST ====='
echo

#
# Services
#

echo '--- Services ---'

for service in \
    knowledge-personal-search.service \
    knowledge-personal-watch.service \
    knowledge-personal-web.service \
    knowledge-docs-browser.service \
    knowledge-docs-watch.service
do
    if systemctl --user is-active \
        --quiet "$service"
    then
        pass "$service"
    else
        fail "$service"
    fi
done

#
# Core HTTP
#

echo
echo '--- HTTP ---'

if curl -fsS \
    http://127.0.0.1:1314/ \
    >/dev/null
then
    pass 'Hugo homepage'
else
    fail 'Hugo homepage'
fi

if curl -fsS \
    'http://127.0.0.1:8788/api/search?q=linux' \
    >/dev/null
then
    pass 'Search API'
else
    fail 'Search API'
fi

if curl -fsS \
    'http://127.0.0.1:1320/health' \
    >/dev/null
then
    pass 'Docs browser health'
else
    fail 'Docs browser health'
fi

if curl -fsS \
    'http://127.0.0.1:1320/api/search?q=markdown' \
    >/dev/null
then
    pass 'Docs browser search'
else
    fail 'Docs browser search'
fi

#
# Static assets
#

echo
echo '--- Static assets ---'

for path in \
    /js/search.js \
    /js/visual-renderers.js \
    /js/vendor/mermaid.bundle.mjs \
    /css/style.css
do
    code="$(
        curl -s \
            -o /dev/null \
            -w '%{http_code}' \
            "http://127.0.0.1:1314$path"
    )"

    if [ "$code" = "200" ]; then
        pass "$path"
    else
        fail "$path ($code)"
    fi
done

#
# D2 render
#

echo
echo '--- D2 ---'

D2="$(
    curl -fsS \
        -X POST \
        -H 'Content-Type: application/json' \
        --data '{"source":"a -> b"}' \
        http://127.0.0.1:8788/api/render/d2 \
        2>/dev/null \
        || true
)"

if printf '%s' "$D2" \
    | grep -Fq '<svg'
then
    pass 'D2 → SVG'
else
    fail 'D2 → SVG'
fi

#
# Typst render
#

echo
echo '--- Typst ---'

TYPST="$(
    curl -fsS \
        -X POST \
        -H 'Content-Type: application/json' \
        --data '{"source":"#set page(width: auto, height: auto)\nHello"}' \
        http://127.0.0.1:8788/api/render/typst \
        2>/dev/null \
        || true
)"

if printf '%s' "$TYPST" \
    | grep -Fq '<svg'
then
    pass 'Typst → SVG'
else
    fail 'Typst → SVG'
fi

#
# Source invariants
#

echo
echo '--- Source invariants ---'

if grep -Fq 'DOCS_ROOT="$(dirname "$WORKSPACE_ROOT")"' install.sh; then
    fail 'Docs root is independent from personal workspace'
else
    pass 'Docs root is independent from personal workspace'
fi

if grep -Fq 'DOCS_ROOT="${KNOWLEDGE_DOCS_ROOT:-/home/murat/Media/5-Documentation}"' install.sh; then
    pass 'Docs root default'
else
    fail 'Docs root default'
fi

if grep -Fq -- '--config .runtime/personal/hugo.toml ' systemd/knowledge-personal-web.service.in; then
    pass 'Hugo uses generated runtime config only'
else
    fail 'Hugo uses generated runtime config only'
fi

if grep -Fq '^[a-z0-9]+(-[a-z0-9]+)*\.md' scripts/live-workspace-sync.sh; then
    pass 'Watcher filename rule matches note policy'
else
    fail 'Watcher filename rule matches note policy'
fi

if grep -Fq 'section|folder|tag|status|file|filename|title|desc|description|alias' scripts/search-server.ts; then
    pass 'Inline search query filters'
else
    fail 'Inline search query filters'
fi

if grep -Fq 'kn link <source.md> [target.md]' bin/kn && grep -Fq 'kn broken-links' bin/kn && grep -Fq 'kn doctor' bin/kn; then
    pass 'KN standard Markdown link, relations, and doctor commands'
else
    fail 'KN standard Markdown link, relations, and doctor commands'
fi

if grep -Fq 'matchAll(/\\[\\[' scripts/note-relations.ts; then
    fail 'Wikilinks are excluded from relation analysis'
else
    pass 'Wikilinks are excluded from relation analysis'
fi

if grep -Fq '^\.\./0-Inbox/' layouts/_markup/render-link.html &&
   grep -Fq '^\.\./1-Projects/' layouts/_markup/render-link.html &&
   grep -Fq '^\.\./2-Areas/' layouts/_markup/render-link.html &&
   grep -Fq '^\.\./3-Resources/' layouts/_markup/render-link.html &&
   grep -Fq '^\.\./4-Archives/' layouts/_markup/render-link.html &&
   grep -Fq '^0-Inbox/' layouts/_markup/render-link.html &&
   grep -Fq '^4-Archives/' layouts/_markup/render-link.html; then
    pass 'Hugo Markdown link MOC mapping'
else
    fail 'Hugo Markdown link MOC mapping'
fi

if "$HOME/.bun/bin/bun" \
    scripts/check-global-filenames.ts \
    personal
then
    pass 'Global filenames'
else
    fail 'Global filenames'
fi

if "$HOME/.bun/bin/bun" \
    scripts/check-note-invariants.ts \
    personal
then
    pass 'Note invariants'
else
    fail 'Note invariants'
fi

if "$HOME/.bun/bin/bun" \
    scripts/check-workspaces.ts
then
    pass 'Workspace configuration'
else
    fail 'Workspace configuration'
fi

#
# Internal links
#

echo
echo '--- Internal links ---'

if node scripts/check-links.mjs; then
    pass 'Internal Markdown links'
else
    fail 'Internal Markdown links'
fi

#
# Syntax / compile
#

echo
echo '--- Syntax ---'

if bash -n \
    bin/kn
then
    pass 'KN command shell syntax'
else
    fail 'KN command shell syntax'
fi

for shell_file in \
    install.sh \
    scripts/live-workspace-sync.sh \
    scripts/docs-watch.sh \
    scripts/notes-git.sh
do
    if bash -n "$shell_file"
    then
        pass "$shell_file syntax"
    else
        fail "$shell_file syntax"
    fi
done

if node --check \
    static/js/visual-renderers.js
then
    pass 'Visual renderer JS syntax'
else
    fail 'Visual renderer JS syntax'
fi


for file in \
    scripts/build-workspace-index.ts \
    scripts/build-docs-index.ts \
    scripts/docs-indexer.ts \
    scripts/update-docs-path.ts \
    scripts/docs-server.ts \
    scripts/new-note.ts \
    scripts/note-relations.ts \
    scripts/doctor.ts \
    scripts/search-server.ts \
    scripts/validate-note-name.ts
do
    if "$HOME/.bun/bin/bun" build \
        "$file" \
        --target=bun \
        --outfile=/tmp/knowledge-smoke.js \
        >/dev/null 2>&1
    then
        pass "$file"
    else
        fail "$file"
    fi
done

rm -f /tmp/knowledge-smoke.js

#
# Result
#

echo

if [ "$FAIL" -eq 0 ]; then
    echo '===== SMOKE TEST PASS ====='
    exit 0
else
    echo '===== SMOKE TEST FAIL ====='
    exit 1
fi
