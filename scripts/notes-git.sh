#!/usr/bin/env bash

NOTES_ROOT="/home/murat/Media/5-Documentation/Knowledge"

notes_git_assert() {
    if [ ! -d "$NOTES_ROOT/.git" ]; then
        echo
        echo "ERROR: Local Notes Git repository is missing."
        echo "$NOTES_ROOT"
        return 1
    fi

    if [ -n "$(git -C "$NOTES_ROOT" remote)" ]; then
        echo
        echo "ERROR: Notes Git must remain LOCAL-ONLY."
        echo "A Git remote is configured."
        return 1
    fi
}

notes_git_relative_path() {
    local path="$1"

    case "$path" in
        "$NOTES_ROOT"/*)
            printf '%s\n' "${path#"$NOTES_ROOT"/}"
            ;;
        *)
            echo "ERROR: Path is outside Notes root: $path" >&2
            return 1
            ;;
    esac
}

notes_git_commit() {
    local operation="$1"
    shift

    notes_git_assert || return 1

    if git -C "$NOTES_ROOT" diff --quiet -- "${@}" &&
       git -C "$NOTES_ROOT" diff --cached --quiet -- "${@}" &&
       [ -z "$(git -C "$NOTES_ROOT" ls-files --others --exclude-standard -- "${@}")" ]; then
        return 0
    fi

    echo
    echo "===== KNOWLEDGE LOCAL GIT ====="
    echo
    echo "Operation: $operation"
    echo
    echo "Files:"
    printf '  %s\n' "$@"

    echo
    echo "Changes:"
    git -C "$NOTES_ROOT" diff --stat -- "${@}" || true

    echo
    echo "Preview:"
    git -C "$NOTES_ROOT" diff -- "${@}" | sed -n '1,80p'

    echo
    printf "Commit message: "
    IFS= read -r message

    if [ -z "$message" ]; then
        echo
        echo "UNCOMMITTED: Notes were changed but no commit message was entered."
        return 0
    fi

    #
    # Stage ONLY the paths belonging to this operation.
    # Never use: git add .
    #
    git -C "$NOTES_ROOT" add -A -- "${@}"

    if git -C "$NOTES_ROOT" diff --cached --quiet -- "${@}"; then
        echo
        echo "INFO: No staged note changes."
        return 0
    fi

    git -C "$NOTES_ROOT" commit -m "$message" -- "${@}"

    echo
    echo "PASS: Local Notes Git commit created."
    echo "No remote. No push."
}
