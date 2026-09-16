(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml, getTool } = shared;

/* Alarm V1 */

const ALARM_STORAGE_KEY =
  "knowledge.productivity.alarms.v1";

const ALARM_DB_NAME =
  "knowledge-productivity";

const ALARM_DB_VERSION = 1;

const ALARM_SOUND_STORE =
  "alarm-sounds";

let alarmInterval = null;
let alarmAudioContext = null;
let alarmOscillatorTimer = null;
let alarmCustomAudio = null;
let alarmPreviewTimer = null;
let ringingAlarmId = null;
let alarmLastCheck = Date.now();

const alarmRepeatOptions = [
  ["once", "Once"],
  ["daily", "Every day"],
  ["weekdays", "Weekdays"],
  ["weekends", "Weekends"],
];

const createAlarmId = () =>
  `alarm-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

const loadAlarms = () => {
  try {
    const raw =
      localStorage.getItem(
        ALARM_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      alarm =>
        alarm &&
        typeof alarm.id === "string" &&
        typeof alarm.time === "string"
    );
  } catch {
    return [];
  }
};

const saveAlarms = alarms => {
  localStorage.setItem(
    ALARM_STORAGE_KEY,
    JSON.stringify(alarms)
  );
};

const normalizeAlarm = alarm => ({
  id:
    alarm?.id ||
    createAlarmId(),

  time:
    typeof alarm?.time === "string"
      ? alarm.time
      : "09:00",

  title:
    typeof alarm?.title === "string"
      ? alarm.title
      : "",

  note:
    typeof alarm?.note === "string"
      ? alarm.note
      : "",

  repeat:
    alarmRepeatOptions.some(
      ([value]) =>
        value === alarm?.repeat
    )
      ? alarm.repeat
      : "once",

  notification:
    alarm?.notification !== false,

  sound:
    alarm?.sound !== false,

  soundId:
    typeof alarm?.soundId === "string"
      ? alarm.soundId
      : "default",

  enabled:
    alarm?.enabled !== false,

  lastTriggered:
    typeof alarm?.lastTriggered === "string"
      ? alarm.lastTriggered
      : null,
});

const getNormalizedAlarms = () =>
  loadAlarms().map(
    normalizeAlarm
  );

const openAlarmDb = () =>
  new Promise(
    (resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(
          new Error(
            "IndexedDB is unavailable."
          )
        );
        return;
      }

      const request =
        indexedDB.open(
          ALARM_DB_NAME,
          ALARM_DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames
              .contains(
                ALARM_SOUND_STORE
              )
          ) {
            db.createObjectStore(
              ALARM_SOUND_STORE,
              {
                keyPath: "id",
              }
            );
          }
        };

      request.onsuccess =
        () =>
          resolve(
            request.result
          );

      request.onerror =
        () =>
          reject(
            request.error ||
            new Error(
              "Could not open sound library."
            )
          );
    }
  );

const alarmDbRequest = (
  mode,
  callback
) =>
  openAlarmDb().then(
    db =>
      new Promise(
        (resolve, reject) => {
          const transaction =
            db.transaction(
              ALARM_SOUND_STORE,
              mode
            );

          const store =
            transaction.objectStore(
              ALARM_SOUND_STORE
            );

          let result;

          try {
            result =
              callback(store);
          } catch (error) {
            db.close();
            reject(error);
            return;
          }

          transaction.oncomplete =
            () => {
              db.close();
              resolve(result);
            };

          transaction.onerror =
            () => {
              const error =
                transaction.error;

              db.close();

              reject(
                error ||
                new Error(
                  "Sound library operation failed."
                )
              );
            };
        }
      )
  );

const getAlarmSounds = async () => {
  const db =
    await openAlarmDb();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          ALARM_SOUND_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            ALARM_SOUND_STORE
          )
          .getAll();

      request.onsuccess =
        () => {
          db.close();

          resolve(
            Array.isArray(
              request.result
            )
              ? request.result
              : []
          );
        };

      request.onerror =
        () => {
          const error =
            request.error;

          db.close();

          reject(
            error ||
            new Error(
              "Could not read sounds."
            )
          );
        };
    }
  );
};

const getAlarmSound =
  async id => {
    if (
      !id ||
      id === "default"
    ) {
      return null;
    }

    const db =
      await openAlarmDb();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            ALARM_SOUND_STORE,
            "readonly"
          );

        const request =
          transaction
            .objectStore(
              ALARM_SOUND_STORE
            )
            .get(id);

        request.onsuccess =
          () => {
            db.close();
            resolve(
              request.result || null
            );
          };

        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(
              error ||
              new Error(
                "Could not read sound."
              )
            );
          };
      }
    );
  };

const addAlarmSound =
  async file => {
    const id =
      `sound-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;

    const record = {
      id,
      name:
        file.name ||
        "Custom sound",
      type:
        file.type ||
        "audio/mpeg",
      blob: file,
      createdAt:
        new Date()
          .toISOString(),
    };

    await alarmDbRequest(
      "readwrite",
      store => {
        store.put(record);
      }
    );

    return record;
  };

const renameAlarmSound =
  async (id, name) => {
    const sound =
      await getAlarmSound(id);

    if (!sound) {
      return;
    }

    sound.name =
      name.trim() ||
      sound.name;

    await alarmDbRequest(
      "readwrite",
      store => {
        store.put(sound);
      }
    );
  };

const deleteAlarmSound =
  async id => {
    await alarmDbRequest(
      "readwrite",
      store => {
        store.delete(id);
      }
    );

    const alarms =
      getNormalizedAlarms()
        .map(alarm => {
          if (
            alarm.soundId === id
          ) {
            return {
              ...alarm,
              soundId:
                "default",
            };
          }

          return alarm;
        });

    saveAlarms(alarms);
  };

const getNotificationState =
  () => {
    if (
      !("Notification" in window)
    ) {
      return "unsupported";
    }

    return Notification.permission;
  };

const requestAlarmNotifications =
  async () => {
    if (
      !("Notification" in window)
    ) {
      return "unsupported";
    }

    try {
      return await Notification
        .requestPermission();
    } catch {
      return Notification.permission;
    }
  };

const parseAlarmTime = time => {
  const match =
    /^(\d{2}):(\d{2})$/
      .exec(time || "");

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    hour,
    minute,
  };
};

const alarmMatchesDate = (
  alarm,
  date
) => {
  const day =
    date.getDay();

  if (
    alarm.repeat ===
    "weekdays"
  ) {
    return (
      day >= 1 &&
      day <= 5
    );
  }

  if (
    alarm.repeat ===
    "weekends"
  ) {
    return (
      day === 0 ||
      day === 6
    );
  }

  return true;
};

const alarmOccurrenceForDate = (
  alarm,
  date
) => {
  const time =
    parseAlarmTime(
      alarm.time
    );

  if (
    !time ||
    !alarmMatchesDate(
      alarm,
      date
    )
  ) {
    return null;
  }

  const occurrence =
    new Date(date);

  occurrence.setHours(
    time.hour,
    time.minute,
    0,
    0
  );

  return occurrence;
};

const getNextAlarmOccurrence = (
  alarm,
  from = new Date()
) => {
  if (!alarm.enabled) {
    return null;
  }

  for (
    let offset = 0;
    offset < 8;
    offset += 1
  ) {
    const day =
      new Date(from);

    day.setDate(
      day.getDate() +
      offset
    );

    const occurrence =
      alarmOccurrenceForDate(
        alarm,
        day
      );

    if (!occurrence) {
      continue;
    }

    if (
      alarm.repeat === "once" &&
      occurrence < from
    ) {
      return null;
    }

    if (
      occurrence >= from
    ) {
      return occurrence;
    }
  }

  return null;
};

const getNextAlarm = () => {
  const now =
    new Date();

  return getNormalizedAlarms()
    .filter(
      alarm =>
        alarm.enabled
    )
    .map(alarm => ({
      alarm,
      occurrence:
        getNextAlarmOccurrence(
          alarm,
          now
        ),
    }))
    .filter(
      item =>
        item.occurrence
    )
    .sort(
      (a, b) =>
        a.occurrence -
        b.occurrence
    )[0] || null;
};

const formatAlarmNext =
  occurrence => {
    if (!occurrence) {
      return "No upcoming alarm";
    }

    return new Intl
      .DateTimeFormat(
        "tr-TR",
        {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }
      )
      .format(
        occurrence
      );
  };

const getRepeatLabel =
  value =>
    alarmRepeatOptions
      .find(
        ([key]) =>
          key === value
      )?.[1] ||
    "Once";

const ensureAlarmAudioContext =
  async () => {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!alarmAudioContext) {
      alarmAudioContext =
        new AudioContextClass();
    }

    if (
      alarmAudioContext.state ===
      "suspended"
    ) {
      try {
        await alarmAudioContext
          .resume();
      } catch {
        return alarmAudioContext;
      }
    }

    return alarmAudioContext;
  };

const stopAlarmSound = () => {
  if (
    alarmPreviewTimer !==
    null
  ) {
    window.clearTimeout(
      alarmPreviewTimer
    );

    alarmPreviewTimer = null;
  }

  if (
    alarmOscillatorTimer !==
    null
  ) {
    window.clearInterval(
      alarmOscillatorTimer
    );

    alarmOscillatorTimer =
      null;
  }

  if (alarmCustomAudio) {
    const audio =
      alarmCustomAudio;

    alarmCustomAudio = null;

    audio.pause();

    const src =
      audio.src;

    audio.removeAttribute(
      "src"
    );

    audio.load();

    audio.remove();

    if (
      src?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        src
      );
    }
  }
};

const playDefaultAlarm =
  async () => {
    stopAlarmSound();

    const context =
      await ensureAlarmAudioContext();

    if (!context) {
      return;
    }

    const ring = () => {
      const now =
        context.currentTime;

      [
        [880, 0],
        [660, 0.18],
      ].forEach(
        ([frequency, delay]) => {
          const oscillator =
            context
              .createOscillator();

          const gain =
            context
              .createGain();

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
              now +
              delay +
              0.02
            );

          gain.gain
            .exponentialRampToValueAtTime(
              0.0001,
              now +
              delay +
              0.16
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
            now +
            delay +
            0.18
          );
        }
      );
    };

    ring();

    alarmOscillatorTimer =
      window.setInterval(
        ring,
        1200
      );
  };

const playCustomAlarm =
  async soundId => {
    const sound =
      await getAlarmSound(
        soundId
      );

    if (
      !sound ||
      !sound.blob
    ) {
      throw new Error(
        `Custom alarm sound not found: ${soundId}`
      );
    }

    stopAlarmSound();

    const url =
      URL.createObjectURL(
        sound.blob
      );

    const audio =
      document.createElement(
        "audio"
      );

    audio.src = url;
    audio.loop = true;
    audio.preload = "auto";
    audio.hidden = true;

    document.body.append(
      audio
    );

    alarmCustomAudio =
      audio;

    try {
      await audio.play();
    } catch (error) {
      if (
        alarmCustomAudio === audio
      ) {
        alarmCustomAudio = null;
      }

      audio.remove();

      URL.revokeObjectURL(
        url
      );

      throw error;
    }
  };

const playAlarmSound =
  async soundId => {
    if (
      !soundId ||
      soundId === "default"
    ) {
      await playDefaultAlarm();
      return;
    }

    await playCustomAlarm(
      soundId
    );
  };

const showAlarmNotification =
  alarm => {
    if (
      !alarm.notification ||
      getNotificationState() !==
        "granted"
    ) {
      return;
    }

    try {
      new Notification(
        alarm.title ||
        "Alarm",
        {
          body:
            alarm.note ||
            `Alarm · ${alarm.time}`,
          tag:
            `productivity-${alarm.id}`,
        }
      );
    } catch {
      // UI alarm remains authoritative.
    }
  };

const renderRingingAlarm =
  alarm => {
    const existing =
      document.querySelector(
        "#alarm-ringing"
      );

    existing?.remove();

    const node =
      document.createElement(
        "section"
      );

    node.id =
      "alarm-ringing";

    node.className =
      "alarm-ringing";

    node.innerHTML = `
      <div class="alarm-ringing-card">
        <span class="tool-kicker">
          Alarm
        </span>

        <div class="alarm-ringing-time">
          ${escapeHtml(
            alarm.time
          )}
        </div>

        <h2>
          ${escapeHtml(
            alarm.title ||
            "Alarm"
          )}
        </h2>

        ${
          alarm.note
            ? `
              <p>
                ${escapeHtml(
                  alarm.note
                )}
              </p>
            `
            : ""
        }

        <button
          type="button"
          class="alarm-primary-button"
          data-alarm-stop
        >
          Stop
        </button>
      </div>
    `;

    document.body.append(
      node
    );
  };

const stopRingingAlarm = () => {
  stopAlarmSound();

  ringingAlarmId = null;

  document
    .querySelector(
      "#alarm-ringing"
    )
    ?.remove();
};

const triggerAlarm =
  async alarm => {
    if (
      ringingAlarmId ===
      alarm.id
    ) {
      return;
    }

    ringingAlarmId =
      alarm.id;

    renderRingingAlarm(
      alarm
    );

    showAlarmNotification(
      alarm
    );

    if (alarm.sound) {
      await playAlarmSound(
        alarm.soundId
      );
    }
  };

const markAlarmTriggered = (
  alarm,
  occurrence
) => {
  const occurrenceKey =
    occurrence.toISOString();

  const alarms =
    getNormalizedAlarms()
      .map(item => {
        if (
          item.id !== alarm.id
        ) {
          return item;
        }

        return {
          ...item,
          enabled:
            item.repeat ===
            "once"
              ? false
              : item.enabled,
          lastTriggered:
            occurrenceKey,
        };
      });

  saveAlarms(alarms);
};

const checkAlarms = async () => {
  const now =
    new Date();

  /*
   * A short grace window protects alarms
   * from background timer throttling.
   * It intentionally does not promise
   * execution while the browser is closed.
   */
  const graceStart =
    new Date(
      Math.min(
        alarmLastCheck,
        now.getTime()
      )
    );

  const maxGrace =
    new Date(
      now.getTime() -
      (10 * 60 * 1000)
    );

  const from =
    graceStart < maxGrace
      ? maxGrace
      : graceStart;

  alarmLastCheck =
    now.getTime();

  const alarms =
    getNormalizedAlarms();

  for (const alarm of alarms) {
    if (!alarm.enabled) {
      continue;
    }

    const candidates = [];

    const today =
      alarmOccurrenceForDate(
        alarm,
        now
      );

    if (today) {
      candidates.push(
        today
      );
    }

    const fromDate =
      new Date(from);

    if (
      fromDate.toDateString() !==
      now.toDateString()
    ) {
      const previous =
        alarmOccurrenceForDate(
          alarm,
          fromDate
        );

      if (previous) {
        candidates.push(
          previous
        );
      }
    }

    const occurrence =
      candidates.find(
        candidate =>
          candidate >= from &&
          candidate <= now &&
          alarm.lastTriggered !==
            candidate.toISOString()
      );

    if (!occurrence) {
      continue;
    }

    markAlarmTriggered(
      alarm,
      occurrence
    );

    await triggerAlarm(
      alarm
    );

    if (
      getTool() === "alarm"
    ) {
      await renderAlarmList();
    }

    break;
  }
};

const stopAlarmScheduler = () => {
  if (
    alarmInterval !== null
  ) {
    window.clearInterval(
      alarmInterval
    );

    alarmInterval = null;
  }
};

const startAlarmScheduler = () => {
  stopAlarmScheduler();

  alarmLastCheck =
    Date.now() -
    1000;

  checkAlarms();

  alarmInterval =
    window.setInterval(
      checkAlarms,
      1000
    );
};

const renderAlarmList =
  async () => {
    const list =
      workspace.querySelector(
        "#alarm-list"
      );

    const next =
      workspace.querySelector(
        "#alarm-next"
      );

    if (!list) {
      return;
    }

    const alarms =
      getNormalizedAlarms()
        .sort(
          (a, b) =>
            a.time.localeCompare(
              b.time
            )
        );

    const nextAlarm =
      getNextAlarm();

    if (next) {
      next.textContent =
        nextAlarm
          ? formatAlarmNext(
              nextAlarm.occurrence
            )
          : "No upcoming alarm";
    }

    if (
      alarms.length === 0
    ) {
      list.innerHTML = `
        <div class="alarm-empty">
          <strong>No alarms yet</strong>
          <span>
            Create an alarm when you need one.
          </span>
        </div>
      `;

      return;
    }

    let sounds = [];

    try {
      sounds =
        await getAlarmSounds();
    } catch {
      sounds = [];
    }

    const soundNames =
      new Map(
        sounds.map(
          sound => [
            sound.id,
            sound.name,
          ]
        )
      );

    list.innerHTML =
      alarms.map(alarm => `
        <article class="alarm-card">
          <div class="alarm-card-main">
            <div class="alarm-card-time">
              ${escapeHtml(
                alarm.time
              )}
            </div>

            <div class="alarm-card-copy">
              <strong>
                ${escapeHtml(
                  alarm.title ||
                  "Alarm"
                )}
              </strong>

              <span>
                ${escapeHtml(
                  getRepeatLabel(
                    alarm.repeat
                  )
                )}
                ${
                  alarm.sound
                    ? ` · ${
                        escapeHtml(
                          alarm.soundId ===
                          "default"
                            ? "Default Alarm"
                            : (
                              soundNames.get(
                                alarm.soundId
                              ) ||
                              "Default Alarm"
                            )
                        )
                      }`
                    : ""
                }
                ${
                  alarm.notification
                    ? " · Notification"
                    : ""
                }
              </span>

              ${
                alarm.note
                  ? `
                    <small>
                      ${escapeHtml(
                        alarm.note
                      )}
                    </small>
                  `
                  : ""
              }
            </div>
          </div>

          <div class="alarm-card-actions">
            <label
              class="alarm-switch"
              title="${
                alarm.enabled
                  ? "Disable"
                  : "Enable"
              }"
            >
              <input
                type="checkbox"
                data-alarm-toggle="${escapeHtml(
                  alarm.id
                )}"
                ${
                  alarm.enabled
                    ? "checked"
                    : ""
                }
              >

              <span></span>
            </label>

            <button
              type="button"
              data-alarm-edit="${escapeHtml(
                alarm.id
              )}"
            >
              Edit
            </button>

            <button
              type="button"
              data-alarm-delete="${escapeHtml(
                alarm.id
              )}"
            >
              Delete
            </button>
          </div>
        </article>
      `).join("");
  };

const renderAlarmSoundLibrary =
  async () => {
    const list =
      workspace.querySelector(
        "#alarm-sound-list"
      );

    if (!list) {
      return;
    }

    let sounds;

    try {
      sounds =
        await getAlarmSounds();
    } catch {
      list.innerHTML = `
        <div class="alarm-library-empty">
          Sound library unavailable.
        </div>
      `;
      return;
    }

    if (
      sounds.length === 0
    ) {
      list.innerHTML = `
        <div class="alarm-library-empty">
          No custom sounds. Default Alarm is always available.
        </div>
      `;
      return;
    }

    list.innerHTML =
      sounds.map(sound => `
        <div class="alarm-sound-row">
          <span>
            <strong>
              ${escapeHtml(
                sound.name
              )}
            </strong>

            <small>
              ${escapeHtml(
                sound.type ||
                "audio"
              )}
            </small>
          </span>

          <div>
            <button
              type="button"
              data-alarm-preview="${escapeHtml(
                sound.id
              )}"
            >
              Preview
            </button>

            <button
              type="button"
              data-alarm-sound-rename="${escapeHtml(
                sound.id
              )}"
            >
              Rename
            </button>

            <button
              type="button"
              data-alarm-sound-delete="${escapeHtml(
                sound.id
              )}"
            >
              Delete
            </button>
          </div>
        </div>
      `).join("");
  };

const closeAlarmDialog = () => {
  workspace
    .querySelector(
      "#alarm-dialog"
    )
    ?.remove();
};

const openAlarmDialog =
  async alarmId => {
    closeAlarmDialog();

    const existing =
      alarmId
        ? getNormalizedAlarms()
            .find(
              alarm =>
                alarm.id ===
                alarmId
            )
        : null;

    const alarm =
      normalizeAlarm(
        existing || {
          time: new Intl
            .DateTimeFormat(
              "en-GB",
              {
                hour:
                  "2-digit",
                minute:
                  "2-digit",
                hourCycle:
                  "h23",
              }
            )
            .format(
              new Date()
            ),
          title: "",
          note: "",
          repeat: "once",
          notification: true,
          sound: true,
          soundId: "default",
          enabled: true,
        }
      );

    let sounds = [];

    try {
      sounds =
        await getAlarmSounds();
    } catch {
      sounds = [];
    }

    const dialog =
      document.createElement(
        "div"
      );

    dialog.id =
      "alarm-dialog";

    dialog.className =
      "alarm-dialog";

    dialog.innerHTML = `
      <div
        class="alarm-dialog-backdrop"
        data-alarm-dialog-close
      ></div>

      <form
        class="alarm-dialog-card"
        id="alarm-form"
      >
        <header>
          <div>
            <span class="tool-kicker">
              Alarm
            </span>

            <h3>
              ${
                existing
                  ? "Edit alarm"
                  : "New alarm"
              }
            </h3>
          </div>

          <button
            type="button"
            data-alarm-dialog-close
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <input
          type="hidden"
          name="id"
          value="${escapeHtml(
            alarm.id
          )}"
        >

        <label>
          Time
          <input
            type="time"
            name="time"
            value="${escapeHtml(
              alarm.time
            )}"
            required
          >
        </label>

        <label>
          Title
          <input
            type="text"
            name="title"
            maxlength="120"
            value="${escapeHtml(
              alarm.title
            )}"
            placeholder="Deep Work"
          >
        </label>

        <label>
          Note
          <textarea
            name="note"
            maxlength="300"
            rows="3"
            placeholder="Optional note"
          >${escapeHtml(
            alarm.note
          )}</textarea>
        </label>

        <label>
          Repeat
          <select name="repeat">
            ${
              alarmRepeatOptions
                .map(
                  ([value, label]) => `
                    <option
                      value="${value}"
                      ${
                        alarm.repeat ===
                        value
                          ? "selected"
                          : ""
                      }
                    >
                      ${label}
                    </option>
                  `
                )
                .join("")
            }
          </select>
        </label>

        <div class="alarm-alert-options">
          <label>
            <input
              type="checkbox"
              name="notification"
              ${
                alarm.notification
                  ? "checked"
                  : ""
              }
            >
            Notification
          </label>

          <label>
            <input
              type="checkbox"
              name="sound"
              ${
                alarm.sound
                  ? "checked"
                  : ""
              }
            >
            Sound
          </label>
        </div>

        <label>
          Sound
          <select name="soundId">
            <option
              value="default"
              ${
                alarm.soundId ===
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
                      alarm.soundId ===
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

        <footer>
          <button
            type="button"
            data-alarm-dialog-close
          >
            Cancel
          </button>

          <button
            type="submit"
            class="alarm-primary-button"
          >
            Save alarm
          </button>
        </footer>
      </form>
    `;

    workspace.append(
      dialog
    );

    const form =
      dialog.querySelector(
        "#alarm-form"
      );

    form?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        try {
          await saveAlarmFromForm(
            form
          );
        } catch (error) {
          console.error(
            "[Alarm] save failed",
            error
          );

          return;
        }

        ensureAlarmAudioContext()
          .catch(() => {});
      }
    );
  };

const saveAlarmFromForm =
  async form => {
    const data =
      new FormData(form);

    const id =
      String(
        data.get("id") ||
        createAlarmId()
      );

    const alarm =
      normalizeAlarm({
        id,
        time:
          String(
            data.get("time") ||
            ""
          ),
        title:
          String(
            data.get("title") ||
            ""
          ).trim(),
        note:
          String(
            data.get("note") ||
            ""
          ).trim(),
        repeat:
          String(
            data.get("repeat") ||
            "once"
          ),
        notification:
          data.has(
            "notification"
          ),
        sound:
          data.has("sound"),
        soundId:
          String(
            data.get("soundId") ||
            "default"
          ),
        enabled: true,
        lastTriggered: null,
      });

    if (
      !parseAlarmTime(
        alarm.time
      )
    ) {
      return;
    }

    const alarms =
      getNormalizedAlarms();

    const index =
      alarms.findIndex(
        item =>
          item.id === id
      );

    if (index >= 0) {
      alarm.enabled =
        alarms[index].enabled;

      alarms[index] =
        alarm;
    } else {
      alarms.push(alarm);
    }

    saveAlarms(alarms);

    closeAlarmDialog();

    await renderAlarmList();
  };

const renderAlarmNotificationState =
  () => {
    const state =
      workspace.querySelector(
        "#alarm-notification-state"
      );

    const button =
      workspace.querySelector(
        "#alarm-notification-button"
      );

    if (!state) {
      return;
    }

    const permission =
      getNotificationState();

    const labels = {
      granted:
        "Notifications enabled",
      denied:
        "Notifications blocked",
      default:
        "Notifications not enabled",
      unsupported:
        "Notifications unavailable",
    };

    state.textContent =
      labels[permission] ||
      permission;

    if (button) {
      button.hidden =
        permission ===
          "granted" ||
        permission ===
          "unsupported";
    }
  };

const bindAlarmEvents = () => {
  if (
    document.documentElement
      .dataset.alarmEventsBound ===
      "true"
  ) {
    return;
  }

  document.documentElement
    .dataset.alarmEventsBound =
    "true";

  document.addEventListener(
    "click",
    async event => {
      const stop =
        event.target.closest(
          "[data-alarm-stop]"
        );

      if (stop) {
        stopRingingAlarm();

        if (
          getTool() ===
          "alarm"
        ) {
          await renderAlarmList();
        }

        return;
      }

      if (
        getTool() !== "alarm"
      ) {
        return;
      }

      if (
        event.target.closest(
          "[data-alarm-dialog-close]"
        )
      ) {
        closeAlarmDialog();
        return;
      }

      if (
        event.target.closest(
          "#alarm-add"
        )
      ) {
        await openAlarmDialog();

        ensureAlarmAudioContext()
          .catch(() => {});

        return;
      }

      if (
        event.target.closest(
          "#alarm-notification-button"
        )
      ) {
        await requestAlarmNotifications();
        renderAlarmNotificationState();
        return;
      }

      const edit =
        event.target.closest(
          "[data-alarm-edit]"
        );

      if (edit) {
        await openAlarmDialog(
          edit.dataset.alarmEdit
        );
        return;
      }

      const remove =
        event.target.closest(
          "[data-alarm-delete]"
        );

      if (remove) {
        const id =
          remove.dataset.alarmDelete;

        if (
          window.confirm(
            "Delete this alarm?"
          )
        ) {
          saveAlarms(
            getNormalizedAlarms()
              .filter(
                alarm =>
                  alarm.id !== id
              )
          );

          await renderAlarmList();
        }

        return;
      }

      const preview =
        event.target.closest(
          "[data-alarm-preview]"
        );

      if (preview) {
        stopAlarmSound();

        await ensureAlarmAudioContext();

        await playAlarmSound(
          preview.dataset.alarmPreview
        );

        alarmPreviewTimer =
          window.setTimeout(
            () => {
              alarmPreviewTimer =
                null;

              stopAlarmSound();
            },
            5000
          );

        return;
      }

      const rename =
        event.target.closest(
          "[data-alarm-sound-rename]"
        );

      if (rename) {
        const sound =
          await getAlarmSound(
            rename.dataset
              .alarmSoundRename
          );

        if (!sound) {
          return;
        }

        const name =
          window.prompt(
            "Sound name",
            sound.name
          );

        if (
          name !== null &&
          name.trim()
        ) {
          await renameAlarmSound(
            sound.id,
            name
          );

          await renderAlarmSoundLibrary();
          await renderAlarmList();
        }

        return;
      }

      const deleteSound =
        event.target.closest(
          "[data-alarm-sound-delete]"
        );

      if (deleteSound) {
        if (
          window.confirm(
            "Delete this sound? Alarms using it will switch to Default Alarm."
          )
        ) {
          await deleteAlarmSound(
            deleteSound.dataset
              .alarmSoundDelete
          );

          await renderAlarmSoundLibrary();
          await renderAlarmList();
        }
      }
    }
  );

  document.addEventListener(
    "change",
    async event => {
      if (
        getTool() !== "alarm"
      ) {
        return;
      }

      const toggle =
        event.target.closest(
          "[data-alarm-toggle]"
        );

      if (toggle) {
        const id =
          toggle.dataset
            .alarmToggle;

        saveAlarms(
          getNormalizedAlarms()
            .map(alarm =>
              alarm.id === id
                ? {
                    ...alarm,
                    enabled:
                      toggle.checked,
                    lastTriggered:
                      null,
                  }
                : alarm
            )
        );

        await renderAlarmList();
        return;
      }

      if (
        event.target.matches(
          "#alarm-sound-file"
        )
      ) {
        const file =
          event.target
            .files?.[0];

        if (!file) {
          return;
        }

        if (
          !file.type
            .startsWith(
              "audio/"
            )
        ) {
          window.alert(
            "Please choose an audio file."
          );

          event.target.value =
            "";

          return;
        }

        try {
          await addAlarmSound(
            file
          );

          await renderAlarmSoundLibrary();
        } catch {
          window.alert(
            "Could not save this sound in the browser."
          );
        }

        event.target.value =
          "";
      }
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        !document.hidden
      ) {
        checkAlarms();
      }
    }
  );

  window.addEventListener(
    "focus",
    checkAlarms
  );

  window.addEventListener(
    "beforeunload",
    stopAlarmSound
  );
};

const renderAlarm =
  async () => {
    workspace.innerHTML = `
      <section class="alarm-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Alarm
            </span>

            <h2>
              Alarm
            </h2>

            <p>
              Local alarms with notification
              and reusable sounds.
            </p>
          </div>

          <button
            id="alarm-add"
            class="alarm-primary-button"
            type="button"
          >
            + New alarm
          </button>
        </header>

        <section class="alarm-overview">
          <div>
            <span>Next alarm</span>

            <strong id="alarm-next">
              No upcoming alarm
            </strong>
          </div>

          <div>
            <span>
              Notification
            </span>

            <strong
              id="alarm-notification-state"
            >
              —
            </strong>
          </div>

          <button
            id="alarm-notification-button"
            type="button"
          >
            Enable notifications
          </button>
        </section>

        <div
          id="alarm-list"
          class="alarm-list"
        ></div>

        <section class="alarm-library">
          <header>
            <div>
              <h3>
                Sounds
              </h3>

              <p>
                Add once, reuse in any alarm.
                Files stay in this browser.
              </p>
            </div>

            <label class="alarm-file-button">
              Add sound

              <input
                id="alarm-sound-file"
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a"
              >
            </label>
          </header>

          <div class="alarm-default-sound">
            <span>
              <strong>
                Default Alarm
              </strong>

              <small>
                Built in · no file required
              </small>
            </span>

            <button
              type="button"
              data-alarm-preview="default"
            >
              Preview
            </button>
          </div>

          <div
            id="alarm-sound-list"
            class="alarm-sound-list"
          ></div>
        </section>

        <p class="alarm-browser-note">
          Alarms run while this browser page
          remains open. Closing the browser
          stops web alarms.
        </p>
      </section>
    `;

    renderAlarmNotificationState();

    await Promise.all([
      renderAlarmList(),
      renderAlarmSoundLibrary(),
    ]);
  };



    shared.alarm = {
      render: renderAlarm,
      bindEvents: bindAlarmEvents,
      startScheduler: startAlarmScheduler,
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
