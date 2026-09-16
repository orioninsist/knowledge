(() => {
  "use strict";

  const register = shared => {
    const {
      workspace,
      getTool,
      escapeHtml,
    } = shared;

/* Stopwatch V1 */

const STOPWATCH_STORAGE_KEY =
  "knowledge.productivity.stopwatch.v1";

let stopwatchInterval = null;

const defaultStopwatchState =
  () => ({
    status: "idle",
    elapsedMs: 0,
    startedAt: null,
    laps: [],
  });

const normalizeStopwatchState =
  state => {
    const fallback =
      defaultStopwatchState();

    const status =
      [
        "idle",
        "running",
        "paused",
      ].includes(state?.status)
        ? state.status
        : fallback.status;

    const elapsedMs =
      Number.isFinite(
        Number(state?.elapsedMs)
      )
        ? Math.max(
            0,
            Number(state.elapsedMs)
          )
        : 0;

    const startedAt =
      status === "running" &&
      Number.isFinite(
        Number(state?.startedAt)
      )
        ? Number(state.startedAt)
        : null;

    const laps =
      Array.isArray(state?.laps)
        ? state.laps
            .map(
              lap => ({
                elapsedMs:
                  Math.max(
                    0,
                    Number(
                      lap?.elapsedMs
                    ) || 0
                  ),
                lapMs:
                  Math.max(
                    0,
                    Number(
                      lap?.lapMs
                    ) || 0
                  ),
              })
            )
        : [];

    return {
      status:
        status === "running" &&
        !startedAt
          ? "paused"
          : status,
      elapsedMs,
      startedAt,
      laps,
    };
  };

const loadStopwatchState =
  () => {
    try {
      const raw =
        localStorage.getItem(
          STOPWATCH_STORAGE_KEY
        );

      if (!raw) {
        return defaultStopwatchState();
      }

      return normalizeStopwatchState(
        JSON.parse(raw)
      );
    } catch {
      return defaultStopwatchState();
    }
  };

const saveStopwatchState =
  state => {
    const normalized =
      normalizeStopwatchState(
        state
      );

    localStorage.setItem(
      STOPWATCH_STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    );

    return normalized;
  };

const getStopwatchElapsed =
  stateInput => {
    const state =
      normalizeStopwatchState(
        stateInput
      );

    if (
      state.status === "running" &&
      state.startedAt
    ) {
      return (
        state.elapsedMs +
        Math.max(
          0,
          Date.now() -
            state.startedAt
        )
      );
    }

    return state.elapsedMs;
  };

const formatStopwatchDuration =
  milliseconds => {
    const total =
      Math.max(
        0,
        Math.floor(
          Number(milliseconds) || 0
        )
      );

    const hours =
      Math.floor(
        total / 3_600_000
      );

    const minutes =
      Math.floor(
        (total % 3_600_000) /
          60_000
      );

    const seconds =
      Math.floor(
        (total % 60_000) /
          1000
      );

    const centiseconds =
      Math.floor(
        (total % 1000) / 10
      );

    return [
      String(hours).padStart(
        2,
        "0"
      ),
      String(minutes).padStart(
        2,
        "0"
      ),
      String(seconds).padStart(
        2,
        "0"
      ),
    ].join(":") +
      "." +
      String(
        centiseconds
      ).padStart(
        2,
        "0"
      );
  };

const stopStopwatchInterval =
  () => {
    if (
      stopwatchInterval !== null
    ) {
      window.clearInterval(
        stopwatchInterval
      );

      stopwatchInterval = null;
    }
  };

const renderStopwatchLaps =
  stateInput => {
    const list =
      workspace.querySelector(
        "#stopwatch-laps"
      );

    if (!list) {
      return;
    }

    const state =
      normalizeStopwatchState(
        stateInput
      );

    if (!state.laps.length) {
      list.innerHTML = `
        <div class="stopwatch-empty">
          No laps yet.
        </div>
      `;
      return;
    }

    list.innerHTML =
      state.laps
        .map(
          (lap, index) => `
            <div
              class="stopwatch-lap"
            >
              <span>
                Lap ${index + 1}
              </span>

              <strong>
                ${formatStopwatchDuration(
                  lap.lapMs
                )}
              </strong>

              <small>
                ${formatStopwatchDuration(
                  lap.elapsedMs
                )}
              </small>
            </div>
          `
        )
        .reverse()
        .join("");
  };

const updateStopwatchUi =
  stateInput => {
    const state =
      normalizeStopwatchState(
        stateInput
      );

    const elapsed =
      getStopwatchElapsed(
        state
      );

    const display =
      workspace.querySelector(
        "#stopwatch-display"
      );

    if (display) {
      display.textContent =
        formatStopwatchDuration(
          elapsed
        );
    }

    const status =
      workspace.querySelector(
        "#stopwatch-status"
      );

    if (status) {
      status.textContent =
        state.status === "running"
          ? "Running"
          : state.status === "paused"
            ? "Paused"
            : "Ready";
    }

    const start =
      workspace.querySelector(
        "#stopwatch-start"
      );

    if (start) {
      start.textContent =
        state.status === "paused"
          ? "Resume"
          : "Start";

      start.disabled =
        state.status === "running";
    }

    const pause =
      workspace.querySelector(
        "#stopwatch-pause"
      );

    if (pause) {
      pause.disabled =
        state.status !== "running";
    }

    const lap =
      workspace.querySelector(
        "#stopwatch-lap"
      );

    if (lap) {
      lap.disabled =
        state.status !== "running";
    }

    renderStopwatchLaps(
      state
    );
  };

const stopwatchTick =
  () => {
    const state =
      loadStopwatchState();

    if (
      state.status !== "running"
    ) {
      stopStopwatchInterval();

      updateStopwatchUi(
        state
      );

      return;
    }

    updateStopwatchUi(
      state
    );
  };

const startStopwatchInterval =
  () => {
    stopStopwatchInterval();

    stopwatchTick();

    stopwatchInterval =
      window.setInterval(
        stopwatchTick,
        31
      );
  };

const startStopwatch =
  () => {
    let state =
      loadStopwatchState();

    if (
      state.status === "running"
    ) {
      return;
    }

    state =
      saveStopwatchState({
        ...state,
        startedAt:
          Date.now(),
        status: "running",
      });

    updateStopwatchUi(
      state
    );

    startStopwatchInterval();
  };

const pauseStopwatch =
  () => {
    const state =
      loadStopwatchState();

    if (
      state.status !== "running"
    ) {
      return;
    }

    const elapsed =
      getStopwatchElapsed(
        state
      );

    const paused =
      saveStopwatchState({
        ...state,
        elapsedMs:
          elapsed,
        startedAt: null,
        status: "paused",
      });

    stopStopwatchInterval();

    updateStopwatchUi(
      paused
    );
  };

const addStopwatchLap =
  () => {
    const state =
      loadStopwatchState();

    if (
      state.status !== "running"
    ) {
      return;
    }

    const elapsed =
      getStopwatchElapsed(
        state
      );

    const previousElapsed =
      state.laps.length
        ? state.laps[
            state.laps.length - 1
          ].elapsedMs
        : 0;

    const lap = {
      elapsedMs:
        elapsed,
      lapMs:
        Math.max(
          0,
          elapsed -
            previousElapsed
        ),
    };

    const updated =
      saveStopwatchState({
        ...state,
        laps: [
          ...state.laps,
          lap,
        ],
      });

    updateStopwatchUi(
      updated
    );
  };

const resetStopwatch =
  () => {
    stopStopwatchInterval();

    const reset =
      saveStopwatchState(
        defaultStopwatchState()
      );

    updateStopwatchUi(
      reset
    );
  };

const bindStopwatchEvents =
  () => {
    document.addEventListener(
      "click",
      event => {
        if (
          getTool() !==
          "stopwatch"
        ) {
          return;
        }

        if (
          event.target.closest(
            "#stopwatch-start"
          )
        ) {
          startStopwatch();
          return;
        }

        if (
          event.target.closest(
            "#stopwatch-pause"
          )
        ) {
          pauseStopwatch();
          return;
        }

        if (
          event.target.closest(
            "#stopwatch-lap"
          )
        ) {
          addStopwatchLap();
          return;
        }

        if (
          event.target.closest(
            "#stopwatch-reset"
          )
        ) {
          resetStopwatch();
        }
      }
    );
  };

const renderStopwatch =
  () => {
    const state =
      loadStopwatchState();

    workspace.innerHTML = `
      <section class="stopwatch-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Stopwatch
            </span>

            <h2>
              Stopwatch
            </h2>

            <p>
              Measure elapsed time
              and record lap times.
            </p>
          </div>

          <span
            id="stopwatch-status"
            class="tool-status"
          >
            Ready
          </span>
        </header>

        <div class="stopwatch-card">
          <div
            id="stopwatch-display"
            class="stopwatch-display"
          >
            00:00:00.00
          </div>

          <div
            class="stopwatch-actions"
          >
            <button
              type="button"
              id="stopwatch-start"
              class="alarm-primary-button"
            >
              Start
            </button>

            <button
              type="button"
              id="stopwatch-pause"
            >
              Pause
            </button>

            <button
              type="button"
              id="stopwatch-lap"
            >
              Lap
            </button>

            <button
              type="button"
              id="stopwatch-reset"
            >
              Reset
            </button>
          </div>
        </div>

        <section class="stopwatch-laps-card">
          <div class="stopwatch-laps-heading">
            <h3>
              Laps
            </h3>

            <span>
              ${state.laps.length}
            </span>
          </div>

          <div
            id="stopwatch-laps"
            class="stopwatch-laps"
          ></div>
        </section>

        <p class="tool-note">
          Elapsed time is calculated
          from timestamps, so background
          tab throttling does not change
          the measured time.
        </p>
      </section>
    `;

    updateStopwatchUi(
      state
    );

    if (
      state.status === "running"
    ) {
      startStopwatchInterval();
    } else {
      stopStopwatchInterval();
    }
  };

    shared.stopwatch = {
      render:
        renderStopwatch,
      bindEvents:
        bindStopwatchEvents,
    };
  };

  if (window.KnowledgeProductivity) {
    register(
      window.KnowledgeProductivity
    );
  } else {
    (
      window.KnowledgeProductivityQueue =
        window.KnowledgeProductivityQueue || []
    ).push(register);
  }
})();
