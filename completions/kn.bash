_kn_mocs() {
    printf '%s\n' \
        inbox \
        projects \
        areas \
        resources \
        archives
}

_kn_api_base() {
    local kn_path
    local kn_real
    local project
    local runtime_env

    kn_path="$(command -v kn 2>/dev/null || true)"

    [ -n "$kn_path" ] || return 0

    kn_real="$(readlink -f "$kn_path" 2>/dev/null || printf '%s' "$kn_path")"

    project="$(
        cd "$(dirname "$kn_real")/.."
        pwd
    )"

    runtime_env="$project/.runtime/personal/runtime.env"
    local api_port

    [ -r "$runtime_env" ] ||
        return 1

    api_port="$(
        sed -n \
          's/^API_PORT=//p' \
          "$runtime_env" |
        head -1
    )"

    [ -n "$api_port" ] ||
        return 1

    printf \
      'http://127.0.0.1:%s' \
      "$api_port"
}

_kn_note_candidates() {
    local prefix="$1"
    local api

    api="$(_kn_api_base)" ||
        return 0

    curl \
      -fsS \
      --get \
      --data-urlencode \
      "prefix=$prefix" \
      "$api/api/complete" \
      2>/dev/null \
      || true
}

_kn_project_root() {
    local kn_path
    local kn_real

    kn_path="$(command -v kn 2>/dev/null || true)"
    [ -n "$kn_path" ] || return 1

    kn_real="$(readlink -f "$kn_path" 2>/dev/null || printf '%s' "$kn_path")"

    cd "$(dirname "$kn_real")/.." 2>/dev/null && pwd
}

_kn_workspace_root() {
    local project
    local runtime_env

    project="$(_kn_project_root)" || return 1
    runtime_env="$project/.runtime/personal/runtime.env"

    [ -r "$runtime_env" ] || return 1

    sed -n 's/^WORKSPACE_ROOT=//p' "$runtime_env" | head -1
}

_kn_moc_dir() {
    local root="$1"
    local moc="$2"

    case "$moc" in
        inbox) printf '%s\n' "$root/0-Inbox" ;;
        projects) printf '%s\n' "$root/1-Projects" ;;
        areas) printf '%s\n' "$root/2-Areas" ;;
        resources) printf '%s\n' "$root/3-Resources" ;;
        archives) printf '%s\n' "$root/4-Archives" ;;
        *) return 1 ;;
    esac
}

_kn_note_candidates_for_moc() {
    local moc="$1"
    local prefix="$2"
    local root
    local dir

    root="$(_kn_workspace_root)" || return 0
    dir="$(_kn_moc_dir "$root" "$moc")" || return 0
    [ -d "$dir" ] || return 0

    find "$dir"         -maxdepth 1         -type f         -name "${prefix}*.md"         -printf '%f\n'         2>/dev/null         | sort
}

_kn_completion() {
    local cur
    local command
    local mocs
    local candidates=()

    cur="${COMP_WORDS[COMP_CWORD]}"
    command="${COMP_WORDS[1]:-}"

    mocs="$(_kn_mocs)"

    #
    # kn glow <filename>
    #
    if [[ "$command" == "glow" ]]; then
        if (( COMP_CWORD == 2 )); then
            mapfile -t candidates < <(
                _kn_note_candidates "$cur"
            )

            COMPREPLY=(
                "${candidates[@]}"
            )
        else
            COMPREPLY=()
        fi

        return
    fi

    #
    # kn rm <filename>
    #
    if [[ "$command" == "rm" ]]; then
        if (( COMP_CWORD == 2 )); then
            mapfile -t candidates < <(
                _kn_note_candidates "$cur"
            )

            COMPREPLY=(
                "${candidates[@]}"
            )
        else
            COMPREPLY=()
        fi

        return
    fi

    #
    # kn mv <filename> <moc>
    #
    if [[ "$command" == "mv" ]]; then
        if (( COMP_CWORD == 2 )); then
            mapfile -t candidates < <(
                _kn_note_candidates "$cur"
            )

            COMPREPLY=(
                "${candidates[@]}"
            )

            return
        fi

        if (( COMP_CWORD == 3 )); then
            COMPREPLY=(
                $(compgen \
                    -W "$mocs" \
                    -- "$cur")
            )

            return
        fi

        COMPREPLY=()
        return
    fi

    #
    # Editor workflow:
    #
    # kn code <moc> <filename>
    # kn hx <moc> <filename>
    # kn nvim <moc> <filename>
    #
    if (( COMP_CWORD == 2 )); then
        COMPREPLY=(
            $(compgen \
                -W "$mocs" \
                -- "$cur")
        )

        return
    fi

    if (( COMP_CWORD == 3 )); then
        mapfile -t candidates < <(
            {
                _kn_note_candidates_for_moc "${COMP_WORDS[2]}" "$cur"
                _kn_note_candidates "$cur"
            } | awk 'NF && !seen[$0]++'
        )

        COMPREPLY=(
            "${candidates[@]}"
        )

        return
    fi

    COMPREPLY=()
}

complete -F _kn_completion kn
