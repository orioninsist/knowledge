(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml, getTool } = shared;

  const CLOCK_STORAGE_KEY =
    "knowledge.productivity.clocks.v1";

  const clockCatalog = [
    ["Istanbul", "Türkiye", "Europe/Istanbul"],
    ["London", "United Kingdom", "Europe/London"],
    ["Stockholm", "Sweden", "Europe/Stockholm"],
    ["Copenhagen", "Denmark", "Europe/Copenhagen"],
    ["Oslo", "Norway", "Europe/Oslo"],
    ["Helsinki", "Finland", "Europe/Helsinki"],
    ["Vienna", "Austria", "Europe/Vienna"],
    ["Paris", "France", "Europe/Paris"],
    ["Berlin", "Germany", "Europe/Berlin"],
    ["Amsterdam", "Netherlands", "Europe/Amsterdam"],
    ["Rome", "Italy", "Europe/Rome"],
    ["Madrid", "Spain", "Europe/Madrid"],
    ["Zurich", "Switzerland", "Europe/Zurich"],
    ["Moscow", "Russia", "Europe/Moscow"],
    ["New York", "United States", "America/New_York"],
    ["Washington, D.C.", "United States", "America/New_York"],
    ["San Francisco", "United States", "America/Los_Angeles"],
    ["Chicago", "United States", "America/Chicago"],
    ["Denver", "United States", "America/Denver"],
    ["Los Angeles", "United States", "America/Los_Angeles"],
    ["Toronto", "Canada", "America/Toronto"],
    ["Vancouver", "Canada", "America/Vancouver"],
    ["Mexico City", "Mexico", "America/Mexico_City"],
    ["São Paulo", "Brazil", "America/Sao_Paulo"],
    ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires"],
    ["Dubai", "United Arab Emirates", "Asia/Dubai"],
    ["Riyadh", "Saudi Arabia", "Asia/Riyadh"],
    ["Doha", "Qatar", "Asia/Qatar"],
    ["Mumbai", "India", "Asia/Kolkata"],
    ["Delhi", "India", "Asia/Kolkata"],
    ["Bangkok", "Thailand", "Asia/Bangkok"],
    ["Singapore", "Singapore", "Asia/Singapore"],
    ["Hong Kong", "Hong Kong", "Asia/Hong_Kong"],
    ["Shanghai", "China", "Asia/Shanghai"],
    ["Beijing", "China", "Asia/Shanghai"],
    ["Seoul", "South Korea", "Asia/Seoul"],
    ["Tokyo", "Japan", "Asia/Tokyo"],
    ["Sydney", "Australia", "Australia/Sydney"],
    ["Melbourne", "Australia", "Australia/Melbourne"],
    ["Auckland", "New Zealand", "Pacific/Auckland"],
    ["Honolulu", "United States", "Pacific/Honolulu"],
  ].map(
    ([city, country, timeZone]) => ({
      id:
        city
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("en-US")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      city,
      country,
      timeZone,
    })
  );

  const defaultClocks = [
    "istanbul",
    "new-york",
    "london",
    "tokyo",
  ];

  const loadClocks = () => {
    try {
      const raw =
        localStorage.getItem(
          CLOCK_STORAGE_KEY
        );

      if (raw === null) {
        return [...defaultClocks];
      }

      const parsed =
        JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [...defaultClocks];
      }

      const migrated =
        parsed
          .map(value => {
            if (
              typeof value !== "string"
            ) {
              return null;
            }

            const byId =
              clockCatalog.find(
                item =>
                  item.id === value
              );

            if (byId) {
              return byId.id;
            }

            const byTimeZone =
              clockCatalog.find(
                item =>
                  item.timeZone === value
              );

            return byTimeZone
              ? byTimeZone.id
              : null;
          })
          .filter(Boolean);

      return [
        ...new Set(migrated),
      ];
    } catch {
      return [...defaultClocks];
    }
  };

  const saveClocks = clocks => {
    localStorage.setItem(
      CLOCK_STORAGE_KEY,
      JSON.stringify(clocks)
    );
  };

  const getUtcOffset = (
    date,
    timeZone
  ) => {
    try {
      const value =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone,
            timeZoneName:
              "longOffset",
          }
        )
          .formatToParts(date)
          .find(
            part =>
              part.type ===
              "timeZoneName"
          )
          ?.value;

      if (!value) {
        return timeZone;
      }

      return value
        .replace("GMT", "UTC")
        .replace("UTC+00:00", "UTC")
        .replace("UTC-00:00", "UTC");
    } catch {
      return timeZone;
    }
  };

  const getClockParts = (
    date,
    timeZone
  ) => {
    const parts =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        }
      ).formatToParts(date);

    const values =
      Object.fromEntries(
        parts
          .filter(
            part =>
              part.type !==
              "literal"
          )
          .map(
            part => [
              part.type,
              part.value,
            ]
          )
      );

    return {
      hour: values.hour ?? "00",
      minute: values.minute ?? "00",
      second: values.second ?? "00",
    };
  };

  const getClockDate = (
    date,
    timeZone
  ) =>
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        timeZone,
        weekday: "short",
        day: "numeric",
        month: "long",
      }
    ).format(date);

  const updateClockCards = () => {
    if (
      getTool() !== "clock"
    ) {
      return;
    }

    const date =
      new Date();

    document
      .querySelectorAll(
        "[data-clock-zone]"
      )
      .forEach(card => {
        const timeZone =
          card.dataset.clockZone;

        const parts =
          getClockParts(
            date,
            timeZone
          );

        const hours =
          card.querySelector(
            "[data-clock-hours]"
          );

        const seconds =
          card.querySelector(
            "[data-clock-seconds]"
          );

        const dateNode =
          card.querySelector(
            "[data-clock-date]"
          );

        const offset =
          card.querySelector(
            "[data-clock-offset]"
          );

        if (hours) {
          hours.textContent =
            `${parts.hour}:${parts.minute}`;
        }

        if (seconds) {
          seconds.textContent =
            parts.second;
        }

        if (dateNode) {
          dateNode.textContent =
            getClockDate(
              date,
              timeZone
            );
        }

        if (offset) {
          offset.textContent =
            getUtcOffset(
              date,
              timeZone
            );
        }
      });
  };

  const startClock = () => {
    stopClock();

    updateClockCards();

    clockInterval =
      window.setInterval(
        updateClockCards,
        1000
      );
  };

  const stopClock = () => {
    if (
      clockInterval !== null
    ) {
      window.clearInterval(
        clockInterval
      );

      clockInterval = null;
    }
  };

  const renderClockCards = () => {
    const grid =
      workspace.querySelector(
        "#clock-grid"
      );

    if (!grid) {
      return;
    }

    const clocks =
      loadClocks();

    if (clocks.length === 0) {
      grid.innerHTML = `
        <div class="clock-empty">
          <strong>No clocks yet</strong>
          <span>
            Add a city to start your world clock.
          </span>
        </div>
      `;

      return;
    }

    grid.innerHTML =
      clocks
        .map(clockId => {
          const item =
            clockCatalog.find(
              candidate =>
                candidate.id ===
                clockId
            );

          if (!item) {
            return "";
          }

          return `
            <article
              class="clock-card"
              data-clock-zone="${escapeHtml(
                item.timeZone
              )}"
            >
              <div class="clock-card-head">
                <div>
                  <h3>
                    ${escapeHtml(
                      item.city
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      item.country
                    )}
                  </p>
                </div>

                <button
                  class="clock-remove"
                  type="button"
                  data-clock-remove="${escapeHtml(
                    item.id
                  )}"
                  aria-label="Remove ${escapeHtml(
                    item.city
                  )}"
                  title="Remove"
                >
                  ×
                </button>
              </div>

              <div class="clock-time">
                <span
                  data-clock-hours
                >
                  --:--
                </span>

                <small
                  data-clock-seconds
                >
                  --
                </small>
              </div>

              <div class="clock-meta">
                <span
                  data-clock-date
                >
                  —
                </span>

                <span
                  data-clock-offset
                >
                  —
                </span>
              </div>

              <div class="clock-zone">
                ${escapeHtml(
                  item.timeZone
                )}
              </div>
            </article>
          `;
        })
        .join("");

    updateClockCards();
  };

  const renderClockSearch = (
    query = ""
  ) => {
    const results =
      workspace.querySelector(
        "#clock-search-results"
      );

    if (!results) {
      return;
    }

    const normalized =
      query
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

    const active =
      new Set(
        loadClocks()
      );

    const matches =
      clockCatalog
        .filter(item => {
          if (
            active.has(
              item.id
            )
          ) {
            return false;
          }

          if (!normalized) {
            return true;
          }

          const haystack =
            `${item.city} ${item.country} ${item.timeZone}`
              .toLocaleLowerCase(
                "tr-TR"
              );

          return haystack.includes(
            normalized
          );
        })
        .slice(0, 8);

    if (
      matches.length === 0
    ) {
      results.innerHTML = `
        <div class="clock-search-empty">
          No matching city.
        </div>
      `;

      return;
    }

    results.innerHTML =
      matches
        .map(item => `
          <button
            type="button"
            class="clock-search-result"
            data-clock-add="${escapeHtml(
              item.id
            )}"
          >
            <span>
              <strong>
                ${escapeHtml(
                  item.city
                )}
              </strong>

              <small>
                ${escapeHtml(
                  item.country
                )}
              </small>
            </span>

            <code>
              ${escapeHtml(
                item.timeZone
              )}
            </code>
          </button>
        `)
        .join("");
  };

  const closeClockPicker = () => {
    const picker =
      workspace.querySelector(
        "#clock-picker"
      );

    if (picker) {
      picker.hidden = true;
    }
  };

  const bindClockEvents = () => {
    const addButton =
      workspace.querySelector(
        "#clock-add"
      );

    const picker =
      workspace.querySelector(
        "#clock-picker"
      );

    const search =
      workspace.querySelector(
        "#clock-search"
      );

    const close =
      workspace.querySelector(
        "#clock-picker-close"
      );

    addButton?.addEventListener(
      "click",
      () => {
        if (!picker) {
          return;
        }

        picker.hidden = false;

        if (search) {
          search.value = "";
        }

        renderClockSearch();

        window.setTimeout(
          () => search?.focus(),
          0
        );
      }
    );

    close?.addEventListener(
      "click",
      closeClockPicker
    );

    search?.addEventListener(
      "input",
      event => {
        renderClockSearch(
          event.target.value
        );
      }
    );

    workspace.addEventListener(
      "click",
      event => {
        const add =
          event.target.closest(
            "[data-clock-add]"
          );

        if (add) {
          const clockId =
            add.dataset.clockAdd;

          const clocks =
            loadClocks();

          if (
            clockId &&
            !clocks.includes(
              clockId
            )
          ) {
            clocks.push(
              clockId
            );

            saveClocks(
              clocks
            );

            renderClockCards();
            closeClockPicker();
          }

          return;
        }

        const remove =
          event.target.closest(
            "[data-clock-remove]"
          );

        if (remove) {
          const clockId =
            remove.dataset.clockRemove;

          saveClocks(
            loadClocks().filter(
              item =>
                item !== clockId
            )
          );

          renderClockCards();
        }
      }
    );

    window.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape" &&
          getTool() === "clock"
        ) {
          closeClockPicker();
        }
      },
      {
        once: true,
      }
    );
  };

  const renderClock = () => {
    workspace.innerHTML = `
      <section class="clock-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Clock
            </span>

            <h2>World Clock</h2>

            <p>
              Your cities, always in sync.
            </p>
          </div>

          <button
            id="clock-add"
            class="primary-button"
            type="button"
          >
            + Add clock
          </button>
        </header>

        <div
          id="clock-grid"
          class="clock-grid"
        ></div>

        <div
          id="clock-picker"
          class="clock-picker"
          hidden
        >
          <button
            class="clock-picker-backdrop"
            type="button"
            id="clock-picker-close"
            aria-label="Close city picker"
          ></button>

          <section
            class="clock-picker-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Add world clock"
          >
            <div class="clock-picker-head">
              <div>
                <span class="tool-kicker">
                  Add clock
                </span>

                <h3>Choose a city</h3>
              </div>

              <button
                type="button"
                class="icon-button"
                data-clock-picker-close
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <input
              id="clock-search"
              class="clock-search"
              type="search"
              placeholder="Search city, country or timezone..."
              autocomplete="off"
              spellcheck="false"
            >

            <div
              id="clock-search-results"
              class="clock-search-results"
            ></div>
          </section>
        </div>
      </section>
    `;

    workspace
      .querySelector(
        "[data-clock-picker-close]"
      )
      ?.addEventListener(
        "click",
        closeClockPicker
      );

    renderClockCards();
    bindClockEvents();
    startClock();
  };

  /*
   * Weather V1
   *
   * Independent from World Clock.
   * No backend, no API key and no Knowledge-note coupling.
   */


    shared.clock = {
      render: renderClock,
      stop: stopClock,
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
