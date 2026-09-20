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
echo '===== KNOWLEDGE V1 SMOKE TEST ====='
echo

#
# Services
#

echo '--- Services ---'

for service in \
    knowledge-personal-search.service \
    knowledge-personal-watch.service \
    knowledge-personal-web.service
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
    scripts/live-workspace-sync.sh
then
    pass 'Watcher shell syntax'
else
    fail 'Watcher shell syntax'
fi

if node --check \
    static/js/visual-renderers.js
then
    pass 'Visual renderer JS syntax'
else
    fail 'Visual renderer JS syntax'
fi


for file in \
    scripts/build-workspace-index.ts \
    scripts/new-note.ts \
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
