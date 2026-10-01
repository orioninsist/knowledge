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
    local kn_path
    local kn_real
    local project
    local runtime_env
    local root

    kn_path="$(command -v kn 2>/dev/null || true)"
    [ -n "$kn_path" ] || return 0

    kn_real="$(readlink -f "$kn_path" 2>/dev/null || printf '%s' "$kn_path")"
    project="$(cd "$(dirname "$kn_real")/.." && pwd)"
    runtime_env="$project/.runtime/personal/runtime.env"
    [ -r "$runtime_env" ] || return 0

    root="$(sed -n 's/^WORKSPACE_ROOT=//p' "$runtime_env" | head -1)"
    [ -n "$root" ] || return 0

    # Typed filename: search all five MOCs. Substring matches are enough here;
    # fzf remains the richer interactive selector after Enter.
    find \
        "$root/0-Inbox" \
        "$root/1-Projects" \
        "$root/2-Areas" \
        "$root/3-Resources" \
        "$root/4-Archives" \
        -maxdepth 1 \
        -type f \
        -name '*.md' \
        -printf '%f\n' \
        2>/dev/null |
    sort -u |
    awk -v p="$prefix" '
        BEGIN { p=tolower(p) }
        {
            n=tolower($0)
            pos=index(n,p)
            if (pos) print pos "\t" $0
        }
    ' |
    sort -k1,1n -k2,2 |
    cut -f2-
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
            _kn_note_candidates "$cur"
        )

        COMPREPLY=(
            "${candidates[@]}"
        )

        return
    fi

    COMPREPLY=()
}

_kn_pick_note_after_space() {
    local before="${READLINE_LINE:0:READLINE_POINT}"
    local after="${READLINE_LINE:READLINE_POINT}"
    local point="$READLINE_POINT"
    local selected

    if [[ "$before" =~ ^kn[[:space:]]+[^[:space:]]+[[:space:]]+(inbox|projects|areas|resources|archives)[[:space:]]$ ]]; then
        selected="$(_kn_note_candidates "" | fzf --height=40% --layout=reverse --border --prompt='filename> ')" || return
        READLINE_LINE="${before}${selected}${after}"
        READLINE_POINT=$((${#before} + ${#selected}))
        return
    fi

    READLINE_LINE="${before} ${after}"
    READLINE_POINT=$((point + 1))
}

bind -x '" ":_kn_pick_note_after_space'

complete -F _kn_completion kn
