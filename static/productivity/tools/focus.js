(() => {
  "use strict";

  const register = shared => {
    const { workspace, getTool, escapeHtml } = shared;

/* Focus V1 */

const FOCUS_STORAGE_KEY =
  "knowledge.productivity.focus.v1";

let focusInterval = null;

const defaultFocusState = () => ({
  goal: "",
  durationMinutes: 25,
  elapsedMs: 0,
  startedAt: null,
  status: "idle",
});

const normalizeFocusState =
  state => {
    const fallback =
      defaultFocusState();

    const status =
      [
        "idle",
        "running",
        "paused",
        "completed",
      ].includes(
        state?.status
      )
        ? state.status
        : fallback.status;

    const durationMinutes =
      Math.min(
        720,
        Math.max(
          0,
          Math.round(
            Number(
              state?.durationMinutes
            ) || 0
          )
        )
      );

    const elapsedMs =
      Math.max(
        0,
        Number(
          state?.elapsedMs
        ) || 0
      );

    const startedAt =
      Number.isFinite(
        Number(
          state?.startedAt
        )
      )
        ? Number(
            state.startedAt
          )
        : null;

    return {
      goal:
        typeof state?.goal ===
        "string"
          ? state.goal
          : "",
      durationMinutes,
      elapsedMs,
      startedAt:
        status === "running"
          ? startedAt
          : null,
      status,
    };
  };

const loadFocusState = () => {
  try {
    const raw =
      localStorage.getItem(
        FOCUS_STORAGE_KEY
      );

    if (!raw) {
      return defaultFocusState();
    }

    return normalizeFocusState(
      JSON.parse(raw)
    );
  } catch {
    return defaultFocusState();
  }
};

const saveFocusState =
  state => {
    const normalized =
      normalizeFocusState(
        state
      );

    localStorage.setItem(
      FOCUS_STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    );

    return normalized;
  };

const getFocusElapsed =
  state => {
    const normalized =
      normalizeFocusState(
        state
      );

    if (
      normalized.status !==
        "running" ||
      !normalized.startedAt
    ) {
      return normalized.elapsedMs;
    }

    return (
      normalized.elapsedMs +
      Math.max(
        0,
        Date.now() -
          normalized.startedAt
      )
    );
  };

const getFocusLimitMs =
  state =>
    Math.max(
      0,
      Number(
        state.durationMinutes
      ) *
        60 *
        1000
    );

const formatFocusTime =
  milliseconds => {
    const totalSeconds =
      Math.max(
        0,
        Math.floor(
          milliseconds /
            1000
        )
      );

    const hours =
      Math.floor(
        totalSeconds /
          3600
      );

    const minutes =
      Math.floor(
        (
          totalSeconds %
          3600
        ) /
          60
      );

    const seconds =
      totalSeconds % 60;

    return [
      hours,
      minutes,
      seconds,
    ]
      .map(
        value =>
          String(value)
            .padStart(
              2,
              "0"
            )
      )
      .join(":");
  };

const stopFocusInterval =
  () => {
    if (
      focusInterval !==
      null
    ) {
      window.clearInterval(
        focusInterval
      );

      focusInterval = null;
    }
  };

const updateFocusUi =
  stateInput => {
    const state =
      normalizeFocusState(
        stateInput
      );

    const elapsed =
      getFocusElapsed(
        state
      );

    const limit =
      getFocusLimitMs(
        state
      );

    const display =
      workspace.querySelector(
        "#focus-time"
      );

    const status =
      workspace.querySelector(
        "#focus-status"
      );

    const start =
      workspace.querySelector(
        "#focus-start"
      );

    const pause =
      workspace.querySelector(
        "#focus-pause"
      );

    const complete =
      workspace.querySelector(
        "#focus-complete"
      );

    const goal =
      workspace.querySelector(
        "#focus-goal"
      );

    const duration =
      workspace.querySelector(
        "#focus-duration"
      );

    if (display) {
      display.textContent =
        formatFocusTime(
          elapsed
        );
    }

    if (status) {
      status.textContent =
        state.status ===
        "running"
          ? "Focusing"
          : state.status ===
            "paused"
          ? "Paused"
          : state.status ===
            "completed"
          ? "Completed"
          : "Ready";
    }

    if (start) {
      start.textContent =
        state.status ===
        "paused"
          ? "Resume"
          : "Start";

      start.disabled =
        state.status ===
        "running";
    }

    if (pause) {
      pause.disabled =
        state.status !==
        "running";
    }

    if (complete) {
      complete.disabled =
        state.status ===
          "completed" ||
        (
          state.status ===
            "idle" &&
          elapsed <= 0
        );
    }

    if (goal) {
      goal.disabled =
        state.status ===
        "running";
    }

    if (duration) {
      duration.disabled =
        state.status ===
        "running";
    }

    const progress =
      workspace.querySelector(
        "#focus-progress"
      );

    if (progress) {
      if (limit > 0) {
        const percentage =
          Math.min(
            100,
            (
              elapsed /
              limit
            ) *
              100
          );

        progress.textContent =
          `${Math.round(
            percentage
          )}%`;
      } else {
        progress.textContent =
          "Open ended";
      }
    }
  };

const completeFocus = () => {
  const state =
    loadFocusState();

  const elapsed =
    getFocusElapsed(
      state
    );

  const completed =
    saveFocusState({
      ...state,
      elapsedMs:
        elapsed,
      startedAt: null,
      status: "completed",
    });

  stopFocusInterval();

  updateFocusUi(
    completed
  );
};

const focusTick = () => {
  const state =
    loadFocusState();

  if (
    state.status !==
    "running"
  ) {
    stopFocusInterval();

    updateFocusUi(
      state
    );

    return;
  }

  const elapsed =
    getFocusElapsed(
      state
    );

  const limit =
    getFocusLimitMs(
      state
    );

  if (
    limit > 0 &&
    elapsed >= limit
  ) {
    completeFocus();
    return;
  }

  updateFocusUi(
    state
  );
};

const startFocusInterval =
  () => {
    stopFocusInterval();

    focusTick();

    focusInterval =
      window.setInterval(
        focusTick,
        250
      );
  };

const startFocus = () => {
  let state =
    loadFocusState();

  if (
    state.status ===
    "running"
  ) {
    return;
  }

  if (
    state.status ===
    "completed"
  ) {
    state = {
      ...state,
      elapsedMs: 0,
    };
  }

  const goalInput =
    workspace.querySelector(
      "#focus-goal"
    );

  const durationInput =
    workspace.querySelector(
      "#focus-duration"
    );

  const goal =
    goalInput?.value
      ?.trim() ||
    state.goal;

  const durationMinutes =
    Math.min(
      720,
      Math.max(
        0,
        Math.round(
          Number(
            durationInput?.value
          ) || 0
        )
      )
    );

  const running =
    saveFocusState({
      ...state,
      goal,
      durationMinutes,
      startedAt:
        Date.now(),
      status: "running",
    });

  updateFocusUi(
    running
  );

  startFocusInterval();
};

const pauseFocus = () => {
  const state =
    loadFocusState();

  if (
    state.status !==
    "running"
  ) {
    return;
  }

  const paused =
    saveFocusState({
      ...state,
      elapsedMs:
        getFocusElapsed(
          state
        ),
      startedAt: null,
      status: "paused",
    });

  stopFocusInterval();

  updateFocusUi(
    paused
  );
};

const resetFocus = () => {
  stopFocusInterval();

  const current =
    loadFocusState();

  const reset =
    saveFocusState({
      ...defaultFocusState(),
      goal:
        current.goal,
      durationMinutes:
        current.durationMinutes,
    });

  const goal =
    workspace.querySelector(
      "#focus-goal"
    );

  const duration =
    workspace.querySelector(
      "#focus-duration"
    );

  if (goal) {
    goal.value =
      reset.goal;
  }

  if (duration) {
    duration.value =
      String(
        reset.durationMinutes
      );
  }

  updateFocusUi(
    reset
  );
};

const bindFocusEvents =
  () => {
    document.addEventListener(
      "click",
      event => {
        if (
          getTool() !==
          "focus"
        ) {
          return;
        }

        if (
          event.target.closest(
            "#focus-start"
          )
        ) {
          startFocus();
          return;
        }

        if (
          event.target.closest(
            "#focus-pause"
          )
        ) {
          pauseFocus();
          return;
        }

        if (
          event.target.closest(
            "#focus-complete"
          )
        ) {
          completeFocus();
          return;
        }

        if (
          event.target.closest(
            "#focus-reset"
          )
        ) {
          resetFocus();
        }
      }
    );

    document.addEventListener(
      "change",
      event => {
        if (
          getTool() !==
          "focus"
        ) {
          return;
        }

        if (
          event.target.id !==
            "focus-goal" &&
          event.target.id !==
            "focus-duration"
        ) {
          return;
        }

        const state =
          loadFocusState();

        if (
          state.status ===
          "running"
        ) {
          return;
        }

        const goal =
          workspace.querySelector(
            "#focus-goal"
          );

        const duration =
          workspace.querySelector(
            "#focus-duration"
          );

        saveFocusState({
          ...state,
          goal:
            goal?.value
              ?.trim() ||
            "",
          durationMinutes:
            Math.min(
              720,
              Math.max(
                0,
                Math.round(
                  Number(
                    duration
                      ?.value
                  ) || 0
                )
              )
            ),
        });
      }
    );
  };

const renderFocus = () => {
  let state =
    loadFocusState();

  if (
    state.status ===
    "running"
  ) {
    const elapsed =
      getFocusElapsed(
        state
      );

    const limit =
      getFocusLimitMs(
        state
      );

    if (
      limit > 0 &&
      elapsed >= limit
    ) {
      completeFocus();

      state =
        loadFocusState();
    }
  }

  workspace.innerHTML = `
    <section class="focus-view">
      <header class="tool-header">
        <div>
          <span class="tool-kicker">
            Focus
          </span>

          <h2>
            Focus
          </h2>

          <p>
            Work on one clear target
            without adding another
            workflow.
          </p>
        </div>

        <span class="tool-status">
          Local only
        </span>
      </header>

      <div class="focus-shell">
        <section class="focus-card">
          <label class="focus-goal-field">
            <span>
              Focus target
            </span>

            <input
              id="focus-goal"
              type="text"
              maxlength="240"
              placeholder="What are you working on?"
              value="${escapeHtml(
                state.goal
              )}"
            >
          </label>

          <div
            id="focus-time"
            class="focus-time"
          >
            00:00:00
          </div>

          <div class="focus-meta">
            <span
              id="focus-status"
            >
              Ready
            </span>

            <span
              id="focus-progress"
            >
              0%
            </span>
          </div>

          <div class="focus-actions">
            <button
              type="button"
              id="focus-start"
              class="alarm-primary-button"
            >
              Start
            </button>

            <button
              type="button"
              id="focus-pause"
            >
              Pause
            </button>

            <button
              type="button"
              id="focus-complete"
            >
              Complete
            </button>

            <button
              type="button"
              id="focus-reset"
            >
              Reset
            </button>
          </div>
        </section>

        <aside class="focus-settings">
          <div>
            <span class="tool-kicker">
              Session
            </span>

            <h3>
              Duration
            </h3>
          </div>

          <label class="focus-duration-field">
            <span>
              Minutes
              <small>
                0 = open ended
              </small>
            </span>

            <input
              id="focus-duration"
              type="number"
              min="0"
              max="720"
              step="1"
              value="${state.durationMinutes}"
            >
          </label>
        </aside>
      </div>

      <p class="tool-note">
        Running time is calculated from
        timestamps, so refreshes and
        background-tab throttling do not
        change elapsed time.
      </p>
    </section>
  `;

  updateFocusUi(
    state
  );

  if (
    state.status ===
    "running"
  ) {
    startFocusInterval();
  } else {
    stopFocusInterval();
  }
};


    shared.focus = {
      render: renderFocus,
      bindEvents: bindFocusEvents,
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
