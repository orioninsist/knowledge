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

    api="$(_kn_api_base)" || return 0

    curl -fsS \
        --get \
        --data-urlencode "prefix=$prefix" \
        "$api/api/complete" \
        2>/dev/null
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
    # kn rn <filename> [new-filename]
    #
    if [[ "$command" == "rn" ]]; then
        if (( COMP_CWORD == 2 )); then
            mapfile -t candidates < <(
                _kn_note_candidates "$cur"
            )
            COMPREPLY=("${candidates[@]}")
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
            local selected_name
            local kn_path
            local kn_real
            local project
            local runtime_env
            local root
            local current_moc=""

            selected_name="${COMP_WORDS[2]:-}"
            kn_path="$(command -v kn 2>/dev/null || true)"
            kn_real="$(readlink -f "$kn_path" 2>/dev/null || printf '%s' "$kn_path")"
            project="$(cd "$(dirname "$kn_real")/.." && pwd)"
            runtime_env="$project/.runtime/personal/runtime.env"
            root="$(sed -n 's/^WORKSPACE_ROOT=//p' "$runtime_env" 2>/dev/null | head -1)"

            [ -f "$root/0-Inbox/$selected_name" ] && current_moc="inbox"
            [ -f "$root/1-Projects/$selected_name" ] && current_moc="projects"
            [ -f "$root/2-Areas/$selected_name" ] && current_moc="areas"
            [ -f "$root/3-Resources/$selected_name" ] && current_moc="resources"
            [ -f "$root/4-Archives/$selected_name" ] && current_moc="archives"

            COMPREPLY=(
                $(printf '%s\n' $mocs |
                    grep -vx "$current_moc" |
                    grep "^$cur")
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
        if [ -z "$cur" ]; then
            COMPREPLY=()
            return
        fi

        mapfile -t candidates < <(
            _kn_note_candidates "$cur"
        )

        COMPREPLY=(
            "${candidates[@]}"
        )

        return
    fi

    COMPREPLY=()
}

complete -o nospace -F _kn_completion kn
