(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml, getTool } = shared;

/* Timer V1 */

const TIMER_STORAGE_KEY =
  "knowledge.productivity.timer.v1";

let timerInterval = null;
let timerRinging = false;

/*
 * Timer owns its playback lifecycle.
 *
 * Alarm's sound library remains the source of custom sound blobs,
 * but Timer does not depend on Alarm's delayed HTMLAudio playback.
 */
let timerAudioContext = null;
let timerAudioGain = null;
let timerAudioSource = null;
let timerPreparedSoundId = null;
let timerPreparedBuffer = null;

const ensureTimerAudio = async () => {
  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!timerAudioContext) {
    timerAudioContext =
      new AudioContextClass();

    timerAudioGain =
      timerAudioContext.createGain();

    timerAudioGain.gain.value =
      0.22;

    timerAudioGain.connect(
      timerAudioContext.destination
    );
  }

  if (
    timerAudioContext.state ===
    "suspended"
  ) {
    await timerAudioContext.resume();
  }

  /*
   * Produce an inaudible sample while still inside
   * the Start click gesture. This activates the
   * Timer's actual Web Audio output path.
   */
  const oscillator =
    timerAudioContext.createOscillator();

  const gain =
    timerAudioContext.createGain();

  gain.gain.value = 0.000001;

  oscillator.connect(gain);
  gain.connect(
    timerAudioContext.destination
  );

  oscillator.start();
  oscillator.stop(
    timerAudioContext.currentTime +
      0.01
  );

  return timerAudioContext;
};

const stopTimerAudio = () => {
  if (timerAudioSource) {
    try {
      timerAudioSource.stop();
    } catch {
      // Source may already be stopped.
    }

    try {
      timerAudioSource.disconnect();
    } catch {
      // Best-effort cleanup.
    }

    timerAudioSource = null;
  }
};

const prepareTimerSound =
  async soundId => {
    stopTimerAudio();

    timerPreparedSoundId = null;
    timerPreparedBuffer = null;

    const context =
      await ensureTimerAudio();

    if (!context) {
      return;
    }

    if (
      !soundId ||
      soundId === "default"
    ) {
      timerPreparedSoundId =
        "default";
      return;
    }

    const sound =
      await getAlarmSound(
        soundId
      );

    if (
      !sound ||
      !sound.blob
    ) {
      throw new Error(
        `Timer sound not found: ${soundId}`
      );
    }

    const bytes =
      await sound.blob.arrayBuffer();

    timerPreparedBuffer =
      await context.decodeAudioData(
        bytes.slice(0)
      );

    timerPreparedSoundId =
      soundId;
  };

const playTimerAudio =
  async soundId => {
    const context =
      await ensureTimerAudio();

    if (!context) {
      return;
    }

    stopTimerAudio();

    if (
      soundId &&
      soundId !== "default"
    ) {
      if (
        timerPreparedSoundId !==
          soundId ||
        !timerPreparedBuffer
      ) {
        throw new Error(
          `Timer sound was not prepared: ${soundId}`
        );
      }

      const source =
        context.createBufferSource();

      source.buffer =
        timerPreparedBuffer;

      source.loop = true;

      source.connect(
        timerAudioGain
      );

      timerAudioSource =
        source;

      source.start();

      return;
    }

    const ring = () => {
      if (!timerRinging) {
        return;
      }

      const now =
        context.currentTime;

      [
        [880, 0],
        [660, 0.18],
      ].forEach(
        ([frequency, delay]) => {
          const oscillator =
            context.createOscillator();

          const gain =
            context.createGain();

          oscillator.type =
            "sine";

          oscillator.frequency
            .setValueAtTime(
              frequency,
              now + delay
            );

          gain.gain
            .setValueAtTime(
              0.0001,
              now + delay
            );

          gain.gain
            .exponentialRampToValueAtTime(
              0.22,
              now + delay + 0.02
            );

          gain.gain
            .exponentialRampToValueAtTime(
              0.0001,
              now + delay + 0.16
            );

          oscillator.connect(
            gain
          );

          gain.connect(
            context.destination
          );

          oscillator.start(
            now + delay
          );

          oscillator.stop(
            now + delay + 0.18
          );
        }
      );
    };

    ring();

    /*
     * Reuse timerAudioSource as a stoppable sentinel
     * is inappropriate for oscillator repetition,
     * so retain a dedicated interval on the function.
     */
    if (
      playTimerAudio.defaultInterval
    ) {
      clearInterval(
        playTimerAudio.defaultInterval
      );
    }

    playTimerAudio.defaultInterval =
      window.setInterval(
        ring,
        1200
      );
  };

playTimerAudio.defaultInterval =
  null;

const stopAllTimerAudio = () => {
  stopTimerAudio();

  if (
    playTimerAudio.defaultInterval !==
    null
  ) {
    window.clearInterval(
      playTimerAudio.defaultInterval
    );

    playTimerAudio.defaultInterval =
      null;
  }
};
const defaultTimerState = () => ({
  durationMs: 5 * 60 * 1000,
  remainingMs: 5 * 60 * 1000,
  endAt: null,
  status: "idle",
  notification: true,
  sound: true,
  soundId: "default",
});

const normalizeTimerState =
  state => {
    const fallback =
      defaultTimerState();

    const durationMs =
      Number.isFinite(
        Number(state?.durationMs)
      ) &&
      Number(state?.durationMs) > 0
        ? Number(state.durationMs)
        : fallback.durationMs;

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

    let status =
      [
        "idle",
        "running",
        "paused",
        "completed",
      ].includes(state?.status)
        ? state.status
        : "idle";

    let endAt =
      Number.isFinite(
        Number(state?.endAt)
      )
        ? Number(state.endAt)
        : null;

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
      durationMs,
      remainingMs,
      endAt,
      status,
      notification:
        state?.notification !==
        false,
      sound:
        state?.sound !== false,
      soundId:
        typeof state?.soundId ===
        "string"
          ? state.soundId
          : "default",
    };
  };

const loadTimerState = () => {
  try {
    const raw =
      localStorage.getItem(
        TIMER_STORAGE_KEY
      );

    if (!raw) {
      return defaultTimerState();
    }

    return normalizeTimerState(
      JSON.parse(raw)
    );
  } catch {
    return defaultTimerState();
  }
};

const saveTimerState =
  state => {
    const normalized =
      normalizeTimerState(
        state
      );

    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    );

    return normalized;
  };

const getTimerRemaining =
  state => {
    if (
      state.status ===
        "running" &&
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

const formatTimerDuration =
  milliseconds => {
    const totalSeconds =
      Math.max(
        0,
        Math.ceil(
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
        ) / 60
      );

    const seconds =
      totalSeconds % 60;

    if (hours > 0) {
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
    }

    return [
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

const getTimerInputMs =
  () => {
    const hours =
      Number(
        workspace
          .querySelector(
            "#timer-hours"
          )
          ?.value || 0
      );

    const minutes =
      Number(
        workspace
          .querySelector(
            "#timer-minutes"
          )
          ?.value || 0
      );

    const seconds =
      Number(
        workspace
          .querySelector(
            "#timer-seconds"
          )
          ?.value || 0
      );

    return Math.max(
      0,
      (
        hours * 3600 +
        minutes * 60 +
        seconds
      ) * 1000
    );
  };

const setTimerInputs =
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
        ) / 60
      );

    const seconds =
      totalSeconds % 60;

    const hourInput =
      workspace.querySelector(
        "#timer-hours"
      );

    const minuteInput =
      workspace.querySelector(
        "#timer-minutes"
      );

    const secondInput =
      workspace.querySelector(
        "#timer-seconds"
      );

    if (hourInput) {
      hourInput.value =
        String(hours);
    }

    if (minuteInput) {
      minuteInput.value =
        String(minutes);
    }

    if (secondInput) {
      secondInput.value =
        String(seconds);
    }
  };

const stopTimerInterval =
  () => {
    if (
      timerInterval !== null
    ) {
      window.clearInterval(
        timerInterval
      );

      timerInterval = null;
    }
  };

const stopTimerRinging =
  () => {
    timerRinging = false;

    stopAllTimerAudio();

    document
      .querySelector(
        "#timer-ringing"
      )
      ?.remove();
  };

const showTimerNotification =
  state => {
    if (
      !state.notification ||
      !(
        "Notification" in
        window
      ) ||
      Notification.permission !==
        "granted"
    ) {
      return;
    }

    try {
      new Notification(
        "Timer finished",
        {
          body:
            "Your countdown is complete.",
        }
      );
    } catch {
      // Browser notification is
      // best-effort only.
    }
  };

const showTimerRinging =
  () => {
    document
      .querySelector(
        "#timer-ringing"
      )
      ?.remove();

    const node =
      document.createElement(
        "div"
      );

    node.id =
      "timer-ringing";

    node.className =
      "timer-ringing";

    node.innerHTML = `
      <div class="timer-ringing-card">
        <span class="tool-kicker">
          Timer
        </span>

        <div class="timer-ringing-time">
          00:00
        </div>

        <h2>
          Timer finished
        </h2>

        <p>
          Your countdown is complete.
        </p>

        <button
          type="button"
          id="timer-stop-ringing"
          class="alarm-primary-button"
        >
          Stop
        </button>
      </div>
    `;

    document.body.append(
      node
    );
  };

const finishTimer =
  async state => {
    if (timerRinging) {
      return;
    }

    timerRinging = true;

    stopTimerInterval();

    const completed =
      saveTimerState({
        ...state,
        remainingMs: 0,
        endAt: null,
        status: "completed",
      });

    updateTimerUi(
      completed
    );

    showTimerRinging();

    try {
      showTimerNotification(
        completed
      );
    } catch {
      // Browser notification is
      // best-effort only.
    }

    if (completed.sound) {
      try {
        await playTimerAudio(
          completed.soundId
        );
      } catch (error) {
        console.error(
          "[Timer] sound failed",
          error
        );
      }
    }
  };

const updateTimerUi =
  stateInput => {
    const state =
      normalizeTimerState(
        stateInput
      );

    const remaining =
      getTimerRemaining(
        state
      );

    const display =
      workspace.querySelector(
        "#timer-display"
      );

    if (display) {
      display.textContent =
        formatTimerDuration(
          remaining
        );
    }

    const status =
      workspace.querySelector(
        "#timer-status"
      );

    if (status) {
      status.textContent =
        state.status ===
        "running"
          ? "Running"
          : state.status ===
              "paused"
            ? "Paused"
            : state.status ===
                "completed"
              ? "Finished"
              : "Ready";
    }

    const start =
      workspace.querySelector(
        "#timer-start"
      );

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

    const pause =
      workspace.querySelector(
        "#timer-pause"
      );

    if (pause) {
      pause.disabled =
        state.status !==
        "running";
    }

    const inputs =
      workspace.querySelector(
        "#timer-inputs"
      );

    if (inputs) {
      inputs.classList.toggle(
        "is-disabled",
        state.status ===
          "running"
      );
    }

    workspace
      .querySelectorAll(
        "#timer-inputs input"
      )
      .forEach(
        input => {
          input.disabled =
            state.status ===
            "running";
        }
      );
  };

const timerTick =
  async () => {
    const state =
      loadTimerState();

    if (
      state.status !==
      "running"
    ) {
      stopTimerInterval();
      updateTimerUi(
        state
      );
      return;
    }

    const remaining =
      getTimerRemaining(
        state
      );

    if (
      remaining <= 0
    ) {
      await finishTimer(
        state
      );
      return;
    }

    updateTimerUi({
      ...state,
      remainingMs:
        remaining,
    });
  };

const startTimerInterval =
  () => {
    stopTimerInterval();

    timerTick();

    timerInterval =
      window.setInterval(
        timerTick,
        250
      );
  };

const startTimer = () => {
  let state =
    loadTimerState();

  let remaining =
    state.status ===
      "paused"
      ? state.remainingMs
      : getTimerInputMs();

  if (
    remaining <= 0
  ) {
    return;
  }

  state =
    saveTimerState({
      ...state,
      durationMs:
        state.status ===
        "paused"
          ? state.durationMs
          : remaining,
      remainingMs:
        remaining,
      endAt:
        Date.now() +
        remaining,
      status: "running",
    });

  updateTimerUi(
    state
  );

  startTimerInterval();
};

const pauseTimer = () => {
  const state =
    loadTimerState();

  if (
    state.status !==
    "running"
  ) {
    return;
  }

  const remaining =
    getTimerRemaining(
      state
    );

  const paused =
    saveTimerState({
      ...state,
      remainingMs:
        remaining,
      endAt: null,
      status: "paused",
    });

  stopTimerInterval();

  updateTimerUi(
    paused
  );
};

const resetTimer = () => {
  stopTimerInterval();
  stopTimerRinging();

  const state =
    loadTimerState();

  const reset =
    saveTimerState({
      ...state,
      remainingMs:
        state.durationMs,
      endAt: null,
      status: "idle",
    });

  setTimerInputs(
    reset.durationMs
  );

  updateTimerUi(
    reset
  );
};

const bindTimerEvents = () => {
  document.addEventListener(
    "click",
    async event => {
      const key =
        getTool();

      if (
        event.target.closest(
          "#timer-stop-ringing"
        )
      ) {
        stopTimerRinging();
        return;
      }

      if (key !== "timer") {
        return;
      }

      if (
        event.target.closest(
          "#timer-start"
        )
      ) {
        stopTimerRinging();

        try {
          const context =
            await ensureTimerAudio();

          const state =
            loadTimerState();

          if (state.sound) {
            await prepareTimerSound(
              state.soundId
            );
          } else {
            stopAllTimerAudio();
            await ensureTimerAudio();
          }
        } catch (error) {
          console.error(
            "[Timer] sound preparation failed",
            error
          );

          stopAllTimerAudio();
        }

        startTimer();
        return;
      }

      if (
        event.target.closest(
          "#timer-pause"
        )
      ) {
        pauseTimer();
        return;
      }

      if (
        event.target.closest(
          "#timer-reset"
        )
      ) {
        resetTimer();
        return;
      }

      if (
        event.target.closest(
          "#timer-notification"
        )
      ) {
        const checkbox =
          workspace.querySelector(
            "#timer-notification"
          );

        if (
          checkbox?.checked &&
          "Notification" in
            window &&
          Notification.permission ===
            "default"
        ) {
          await requestAlarmNotifications();
        }

        const state =
          loadTimerState();

        saveTimerState({
          ...state,
          notification:
            Boolean(
              checkbox?.checked
            ),
        });

        return;
      }

      if (
        event.target.closest(
          "#timer-sound"
        )
      ) {
        const checkbox =
          workspace.querySelector(
            "#timer-sound"
          );

        const state =
          loadTimerState();

        saveTimerState({
          ...state,
          sound:
            Boolean(
              checkbox?.checked
            ),
        });
      }
    }
  );

  document.addEventListener(
    "change",
    event => {
      if (
        getTool() !== "timer"
      ) {
        return;
      }

      if (
        event.target.id ===
        "timer-sound-select"
      ) {
        const state =
          loadTimerState();

        saveTimerState({
          ...state,
          soundId:
            event.target.value ||
            "default",
        });
      }
    }
  );

  document.addEventListener(
    "input",
    event => {
      if (
        getTool() !== "timer" ||
        !event.target.closest(
          "#timer-inputs"
        )
      ) {
        return;
      }

      const state =
        loadTimerState();

      if (
        state.status ===
        "running" ||
        state.status ===
        "paused"
      ) {
        return;
      }

      const duration =
        getTimerInputMs();

      if (
        duration <= 0
      ) {
        updateTimerUi({
          ...state,
          durationMs: 0,
          remainingMs: 0,
          status: "idle",
        });

        return;
      }

      const next =
        saveTimerState({
          ...state,
          durationMs:
            duration,
          remainingMs:
            duration,
          endAt: null,
          status: "idle",
        });

      updateTimerUi(
        next
      );
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        !document.hidden
      ) {
        timerTick();
      }
    }
  );

  window.addEventListener(
    "focus",
    timerTick
  );
};

const renderTimer =
  async () => {
    stopTimerInterval();

    let state =
      loadTimerState();

    let sounds = [];

    try {
      sounds =
        await getAlarmSounds();
    } catch {
      sounds = [];
    }

    if (
      state.status ===
      "running"
    ) {
      const remaining =
        getTimerRemaining(
          state
        );

      if (
        remaining <= 0
      ) {
        await finishTimer(
          state
        );

        state =
          loadTimerState();
      }
    }

    workspace.innerHTML = `
      <section class="timer-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Timer
            </span>

            <h2>
              Timer
            </h2>

            <p>
              A local countdown with
              notification and reusable
              alarm sounds.
            </p>
          </div>

          <span class="timer-local-note">
            Local only
          </span>
        </header>

        <div class="timer-shell">
          <div class="timer-main">
            <span
              id="timer-status"
              class="timer-status"
            >
              Ready
            </span>

            <div
              id="timer-display"
              class="timer-display"
              aria-live="polite"
            >
              ${formatTimerDuration(
                getTimerRemaining(
                  state
                )
              )}
            </div>

            <div
              id="timer-inputs"
              class="timer-inputs"
            >
              <label>
                <span>Hours</span>
                <input
                  id="timer-hours"
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                >
              </label>

              <span>:</span>

              <label>
                <span>Minutes</span>
                <input
                  id="timer-minutes"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                >
              </label>

              <span>:</span>

              <label>
                <span>Seconds</span>
                <input
                  id="timer-seconds"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                >
              </label>
            </div>

            <div class="timer-actions">
              <button
                type="button"
                id="timer-start"
                class="alarm-primary-button"
              >
                Start
              </button>

              <button
                type="button"
                id="timer-pause"
              >
                Pause
              </button>

              <button
                type="button"
                id="timer-reset"
              >
                Reset
              </button>
            </div>
          </div>

          <aside class="timer-options">
            <h3>
              Alert
            </h3>

            <label class="timer-option">
              <span>
                <strong>
                  Notification
                </strong>

                <small>
                  Browser notification
                  when finished.
                </small>
              </span>

              <input
                id="timer-notification"
                type="checkbox"
                ${
                  state.notification
                    ? "checked"
                    : ""
                }
              >
            </label>

            <label class="timer-option">
              <span>
                <strong>
                  Sound
                </strong>

                <small>
                  Play an alarm sound
                  when finished.
                </small>
              </span>

              <input
                id="timer-sound"
                type="checkbox"
                ${
                  state.sound
                    ? "checked"
                    : ""
                }
              >
            </label>

            <label class="timer-sound-select">
              <span>
                Sound
              </span>

              <select
                id="timer-sound-select"
              >
                <option
                  value="default"
                  ${
                    state.soundId ===
                    "default"
                      ? "selected"
                      : ""
                  }
                >
                  Default Alarm
                </option>

                ${
                  sounds.map(
                    sound => `
                      <option
                        value="${escapeHtml(
                          sound.id
                        )}"
                        ${
                          state.soundId ===
                          sound.id
                            ? "selected"
                            : ""
                        }
                      >
                        ${escapeHtml(
                          sound.name
                        )}
                      </option>
                    `
                  ).join("")
                }
              </select>
            </label>

            <p class="timer-sound-note">
              Custom sounds come from
              Alarm → Sounds. Add them
              once and reuse them here.
            </p>
          </aside>
        </div>

        <p class="timer-browser-note">
          The countdown is calculated
          from its target timestamp, so
          background-tab throttling does
          not change the remaining time.
          Closing the browser stops web
          alerts.
        </p>
      </section>
    `;

    setTimerInputs(
      state.status ===
        "paused"
        ? state.remainingMs
        : state.durationMs
    );

    updateTimerUi(
      state
    );

    if (
      state.status ===
      "running"
    ) {
      startTimerInterval();
    }
  };


    shared.timer = {
      render: renderTimer,
      bindEvents: bindTimerEvents,
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
