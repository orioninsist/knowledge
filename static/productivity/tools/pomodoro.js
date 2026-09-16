(() => {
  "use strict";

  const register = shared => {
    const { workspace, getTool, escapeHtml } = shared;

/* Pomodoro V1 */

const POMODORO_STORAGE_KEY =
  "knowledge.productivity.pomodoro.v1";

let pomodoroInterval = null;

const defaultPomodoroState =
  () => ({
    mode: "focus",
    status: "idle",
    remainingMs: 25 * 60 * 1000,
    endAt: null,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    completedFocusSessions: 0,
  });

const getPomodoroModeDuration =
  (state, mode = state.mode) => {
    const minutes =
      mode === "short"
        ? state.shortBreakMinutes
        : mode === "long"
          ? state.longBreakMinutes
          : state.focusMinutes;

    return Math.max(
      1,
      Number(minutes) || 1
    ) * 60 * 1000;
  };

const normalizePomodoroState =
  state => {
    const fallback =
      defaultPomodoroState();

    const mode =
      [
        "focus",
        "short",
        "long",
      ].includes(state?.mode)
        ? state.mode
        : fallback.mode;

    let status =
      [
        "idle",
        "running",
        "paused",
      ].includes(state?.status)
        ? state.status
        : fallback.status;

    const normalizeMinutes =
      (value, fallbackValue) => {
        const number =
          Number(value);

        return Number.isFinite(
          number
        ) &&
          number >= 1 &&
          number <= 180
          ? Math.round(number)
          : fallbackValue;
      };

    const focusMinutes =
      normalizeMinutes(
        state?.focusMinutes,
        fallback.focusMinutes
      );

    const shortBreakMinutes =
      normalizeMinutes(
        state?.shortBreakMinutes,
        fallback.shortBreakMinutes
      );

    const longBreakMinutes =
      normalizeMinutes(
        state?.longBreakMinutes,
        fallback.longBreakMinutes
      );

    const rawLongBreakEvery =
      Number(
        state?.longBreakEvery
      );

    const longBreakEvery =
      Number.isFinite(
        rawLongBreakEvery
      ) &&
      rawLongBreakEvery >= 1 &&
      rawLongBreakEvery <= 12
        ? Math.round(
            rawLongBreakEvery
          )
        : fallback.longBreakEvery;

    const completedFocusSessions =
      Number.isFinite(
        Number(
          state?.completedFocusSessions
        )
      )
        ? Math.max(
            0,
            Math.floor(
              Number(
                state.completedFocusSessions
              )
            )
          )
        : 0;

    const durationMs =
      (
        mode === "short"
          ? shortBreakMinutes
          : mode === "long"
            ? longBreakMinutes
            : focusMinutes
      ) *
      60 *
      1000;

    let remainingMs =
      Number.isFinite(
        Number(state?.remainingMs)
      )
        ? Math.max(
            0,
            Number(
              state.remainingMs
            )
          )
        : durationMs;

    let endAt =
      Number.isFinite(
        Number(state?.endAt)
      )
        ? Number(state.endAt)
        : null;

    if (
      status === "running" &&
      !endAt
    ) {
      status = "paused";
    }

    if (
      status === "running" &&
      endAt
    ) {
      remainingMs =
        Math.max(
          0,
          endAt - Date.now()
        );
    }

    return {
      mode,
      status,
      remainingMs,
      endAt,
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakEvery,
      completedFocusSessions,
    };
  };

const loadPomodoroState =
  () => {
    try {
      const raw =
        localStorage.getItem(
          POMODORO_STORAGE_KEY
        );

      if (!raw) {
        return defaultPomodoroState();
      }

      return normalizePomodoroState(
        JSON.parse(raw)
      );
    } catch {
      return defaultPomodoroState();
    }
  };

const savePomodoroState =
  state => {
    const normalized =
      normalizePomodoroState(
        state
      );

    localStorage.setItem(
      POMODORO_STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    );

    return normalized;
  };

const getPomodoroRemaining =
  stateInput => {
    const state =
      normalizePomodoroState(
        stateInput
      );

    if (
      state.status === "running" &&
      state.endAt
    ) {
      return Math.max(
        0,
        state.endAt -
          Date.now()
      );
    }

    return Math.max(
      0,
      state.remainingMs
    );
  };

const formatPomodoroDuration =
  milliseconds => {
    const totalSeconds =
      Math.max(
        0,
        Math.ceil(
          milliseconds / 1000
        )
      );

    const minutes =
      Math.floor(
        totalSeconds / 60
      );

    const seconds =
      totalSeconds % 60;

    return (
      String(minutes).padStart(
        2,
        "0"
      ) +
      ":" +
      String(seconds).padStart(
        2,
        "0"
      )
    );
  };

const getPomodoroModeLabel =
  mode => {
    if (mode === "short") {
      return "Short Break";
    }

    if (mode === "long") {
      return "Long Break";
    }

    return "Focus";
  };

const stopPomodoroInterval =
  () => {
    if (
      pomodoroInterval !== null
    ) {
      window.clearInterval(
        pomodoroInterval
      );

      pomodoroInterval = null;
    }
  };

const updatePomodoroUi =
  stateInput => {
    const state =
      normalizePomodoroState(
        stateInput
      );

    const display =
      workspace.querySelector(
        "#pomodoro-display"
      );

    const mode =
      workspace.querySelector(
        "#pomodoro-mode"
      );

    const status =
      workspace.querySelector(
        "#pomodoro-status"
      );

    const start =
      workspace.querySelector(
        "#pomodoro-start"
      );

    const pause =
      workspace.querySelector(
        "#pomodoro-pause"
      );

    const progress =
      workspace.querySelector(
        "#pomodoro-progress"
      );

    if (display) {
      display.textContent =
        formatPomodoroDuration(
          getPomodoroRemaining(
            state
          )
        );
    }

    if (mode) {
      mode.textContent =
        getPomodoroModeLabel(
          state.mode
        );
    }

    if (status) {
      status.textContent =
        state.status === "running"
          ? "Running"
          : state.status ===
              "paused"
            ? "Paused"
            : "Ready";
    }

    if (start) {
      start.textContent =
        state.status === "paused"
          ? "Resume"
          : "Start";

      start.disabled =
        state.status === "running";
    }

    if (pause) {
      pause.disabled =
        state.status !== "running";
    }

    if (progress) {
      const current =
        state.completedFocusSessions %
        state.longBreakEvery;

      progress.textContent =
        `${current} / ${state.longBreakEvery}`;
    }

    workspace
      .querySelectorAll(
        ".pomodoro-setting input"
      )
      .forEach(
        input => {
          input.disabled =
            state.status ===
            "running";
        }
      );
  };

const advancePomodoro =
  stateInput => {
    let state =
      normalizePomodoroState(
        stateInput
      );

    let completedFocusSessions =
      state.completedFocusSessions;

    let nextMode;

    if (state.mode === "focus") {
      completedFocusSessions += 1;

      nextMode =
        completedFocusSessions %
          state.longBreakEvery ===
        0
          ? "long"
          : "short";
    } else {
      nextMode = "focus";
    }

    const nextState = {
      ...state,
      mode: nextMode,
      status: "idle",
      endAt: null,
      completedFocusSessions,
    };

    nextState.remainingMs =
      getPomodoroModeDuration(
        nextState,
        nextMode
      );

    return savePomodoroState(
      nextState
    );
  };

const finishPomodoroPhase =
  state => {
    stopPomodoroInterval();

    const next =
      advancePomodoro(
        state
      );

    updatePomodoroUi(
      next
    );
  };

const pomodoroTick =
  () => {
    const state =
      loadPomodoroState();

    if (
      state.status !== "running"
    ) {
      stopPomodoroInterval();
      updatePomodoroUi(
        state
      );
      return;
    }

    const remaining =
      getPomodoroRemaining(
        state
      );

    if (remaining <= 0) {
      finishPomodoroPhase(
        state
      );
      return;
    }

    updatePomodoroUi({
      ...state,
      remainingMs:
        remaining,
    });
  };

const startPomodoroInterval =
  () => {
    stopPomodoroInterval();

    pomodoroTick();

    pomodoroInterval =
      window.setInterval(
        pomodoroTick,
        250
      );
  };

const startPomodoro =
  () => {
    const state =
      loadPomodoroState();

    if (
      state.status === "running"
    ) {
      return;
    }

    let remaining =
      state.status === "paused"
        ? state.remainingMs
        : state.remainingMs;

    if (remaining <= 0) {
      remaining =
        getPomodoroModeDuration(
          state
        );
    }

    const running =
      savePomodoroState({
        ...state,
        remainingMs:
          remaining,
        endAt:
          Date.now() +
          remaining,
        status: "running",
      });

    updatePomodoroUi(
      running
    );

    startPomodoroInterval();
  };

const pausePomodoro =
  () => {
    const state =
      loadPomodoroState();

    if (
      state.status !== "running"
    ) {
      return;
    }

    const paused =
      savePomodoroState({
        ...state,
        remainingMs:
          getPomodoroRemaining(
            state
          ),
        endAt: null,
        status: "paused",
      });

    stopPomodoroInterval();

    updatePomodoroUi(
      paused
    );
  };

const skipPomodoro =
  () => {
    const state =
      loadPomodoroState();

    stopPomodoroInterval();

    const next =
      advancePomodoro(
        state
      );

    updatePomodoroUi(
      next
    );
  };

const resetPomodoro =
  () => {
    stopPomodoroInterval();

    const current =
      loadPomodoroState();

    const reset =
      savePomodoroState({
        ...current,
        mode: "focus",
        status: "idle",
        remainingMs:
          current.focusMinutes *
          60 *
          1000,
        endAt: null,
        completedFocusSessions: 0,
      });

    updatePomodoroUi(
      reset
    );
  };

const savePomodoroSettings =
  () => {
    const state =
      loadPomodoroState();

    if (
      state.status === "running"
    ) {
      return;
    }

    const read =
      (selector, fallback) => {
        const value =
          Number(
            workspace
              .querySelector(
                selector
              )
              ?.value
          );

        return Number.isFinite(
          value
        )
          ? value
          : fallback;
      };

    const settings = {
      ...state,
      focusMinutes:
        read(
          "#pomodoro-focus-minutes",
          state.focusMinutes
        ),
      shortBreakMinutes:
        read(
          "#pomodoro-short-minutes",
          state.shortBreakMinutes
        ),
      longBreakMinutes:
        read(
          "#pomodoro-long-minutes",
          state.longBreakMinutes
        ),
      longBreakEvery:
        read(
          "#pomodoro-long-every",
          state.longBreakEvery
        ),
    };

    const normalized =
      normalizePomodoroState(
        settings
      );

    normalized.remainingMs =
      getPomodoroModeDuration(
        normalized
      );

    normalized.endAt = null;
    normalized.status = "idle";

    const saved =
      savePomodoroState(
        normalized
      );

    updatePomodoroUi(
      saved
    );
  };

const bindPomodoroEvents =
  () => {
    document.addEventListener(
      "click",
      event => {
        if (
          getTool() !==
          "pomodoro"
        ) {
          return;
        }

        if (
          event.target.closest(
            "#pomodoro-start"
          )
        ) {
          startPomodoro();
          return;
        }

        if (
          event.target.closest(
            "#pomodoro-pause"
          )
        ) {
          pausePomodoro();
          return;
        }

        if (
          event.target.closest(
            "#pomodoro-skip"
          )
        ) {
          skipPomodoro();
          return;
        }

        if (
          event.target.closest(
            "#pomodoro-reset"
          )
        ) {
          resetPomodoro();
        }
      }
    );

    document.addEventListener(
      "change",
      event => {
        if (
          getTool() !==
            "pomodoro" ||
          !event.target.closest(
            ".pomodoro-setting"
          )
        ) {
          return;
        }

        savePomodoroSettings();
      }
    );
  };

const renderPomodoro =
  () => {
    let state =
      loadPomodoroState();

    if (
      state.status ===
        "running" &&
      getPomodoroRemaining(
        state
      ) <= 0
    ) {
      state =
        advancePomodoro(
          state
        );
    }

    workspace.innerHTML = `
      <section class="pomodoro-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Pomodoro
            </span>

            <h2>
              Pomodoro
            </h2>

            <p>
              Focus, short break ve
              long break döngüsünü yönet.
            </p>
          </div>

          <span class="board-local-note">
            Local only
          </span>
        </header>

        <div class="pomodoro-shell">
          <section class="pomodoro-main">
            <div
              id="pomodoro-mode"
              class="pomodoro-mode"
            >
              ${getPomodoroModeLabel(
                state.mode
              )}
            </div>

            <div
              id="pomodoro-display"
              class="pomodoro-display"
            >
              ${formatPomodoroDuration(
                getPomodoroRemaining(
                  state
                )
              )}
            </div>

            <div class="pomodoro-meta">
              <span
                id="pomodoro-status"
              >
                Ready
              </span>

              <span>
                Focus cycle
                <strong
                  id="pomodoro-progress"
                >
                  0 / ${state.longBreakEvery}
                </strong>
              </span>
            </div>

            <div class="pomodoro-actions">
              <button
                type="button"
                id="pomodoro-start"
                class="alarm-primary-button"
              >
                Start
              </button>

              <button
                type="button"
                id="pomodoro-pause"
              >
                Pause
              </button>

              <button
                type="button"
                id="pomodoro-skip"
              >
                Skip
              </button>

              <button
                type="button"
                id="pomodoro-reset"
              >
                Reset
              </button>
            </div>
          </section>

          <aside class="pomodoro-settings">
            <div>
              <span class="tool-kicker">
                Cycle
              </span>

              <h3>
                Durations
              </h3>
            </div>

            <label class="pomodoro-setting">
              <span>
                Focus
                <small>
                  Minutes
                </small>
              </span>

              <input
                id="pomodoro-focus-minutes"
                type="number"
                min="1"
                max="180"
                step="1"
                value="${state.focusMinutes}"
              >
            </label>

            <label class="pomodoro-setting">
              <span>
                Short Break
                <small>
                  Minutes
                </small>
              </span>

              <input
                id="pomodoro-short-minutes"
                type="number"
                min="1"
                max="180"
                step="1"
                value="${state.shortBreakMinutes}"
              >
            </label>

            <label class="pomodoro-setting">
              <span>
                Long Break
                <small>
                  Minutes
                </small>
              </span>

              <input
                id="pomodoro-long-minutes"
                type="number"
                min="1"
                max="180"
                step="1"
                value="${state.longBreakMinutes}"
              >
            </label>

            <label class="pomodoro-setting">
              <span>
                Long Break Every
                <small>
                  Focus sessions
                </small>
              </span>

              <input
                id="pomodoro-long-every"
                type="number"
                min="1"
                max="12"
                step="1"
                value="${state.longBreakEvery}"
              >
            </label>
          </aside>
        </div>

        <p class="tool-note">
          Countdown is calculated from
          its target timestamp. Refreshing
          or background-tab throttling does
          not change the remaining time.
        </p>
      </section>
    `;

    updatePomodoroUi(
      state
    );

    if (
      state.status === "running"
    ) {
      startPomodoroInterval();
    } else {
      stopPomodoroInterval();
    }
  };

    shared.pomodoro = {
      render: renderPomodoro,
      bindEvents: bindPomodoroEvents,
    };
  };

  if (window.KnowledgeProductivity) {
    register(window.KnowledgeProductivity);
  } else {
    (window.KnowledgeProductivityQueue =
      window.KnowledgeProductivityQueue || []
    ).push(register);
  }
})();
