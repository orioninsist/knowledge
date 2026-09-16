const API_BASE =
  `${location.protocol}//${location.hostname}:8788`;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const showError = (
  element,
  error,
) => {
  element.innerHTML =
    `<pre class="visual-error">${escapeHtml(error)}</pre>`;
};

const renderCompiledVisual = async (
  element,
) => {
  const language =
    element.dataset.visualLanguage;

  const source =
    element.textContent ?? "";

  try {
    const response =
      await fetch(
        `${API_BASE}/api/render/${language}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            source,
          }),
        },
      );

    if (!response.ok) {
      throw new Error(
        await response.text()
      );
    }

    element.innerHTML =
      await response.text();

    element.classList.add(
      "visual-rendered"
    );
  } catch (error) {
    showError(
      element,
      error
    );
  }
};

const renderMermaid = async () => {
  const blocks =
    [
      ...document.querySelectorAll(
        '[data-visual-language="mermaid"]'
      ),
    ];

  if (!blocks.length) {
    return;
  }

  const module =
    await import(
      "/js/vendor/mermaid.bundle.mjs"
    );

  const mermaid =
    module.default;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "dark",
  });

  let index = 0;

  for (
    const element
    of blocks
  ) {
    const source =
      element.textContent ?? "";

    try {
      const result =
        await mermaid.render(
          `knowledge-mermaid-${index++}`,
          source,
        );

      element.innerHTML =
        result.svg;

      element.classList.add(
        "visual-rendered"
      );
    } catch (error) {
      showError(
        element,
        error
      );
    }
  }
};


const parseCalendarBlock = (
  source,
) => {
  const config = {};

  for (
    const rawLine
    of source.split("\n")
  ) {
    const line =
      rawLine.trim();

    if (!line) {
      continue;
    }

    const separator =
      line.indexOf(":");

    if (separator < 0) {
      continue;
    }

    const key =
      line
        .slice(0, separator)
        .trim()
        .toLowerCase();

    const value =
      line
        .slice(separator + 1)
        .trim();

    config[key] = value;
  }

  return {
    src:
      config.src ?? "",

    view:
      (
        config.view ??
        "week"
      ).toLowerCase(),
  };
};

const startOfWeek = (
  date,
) => {
  const result =
    new Date(date);

  result.setHours(
    0, 0, 0, 0
  );

  const day =
    result.getDay();

  const distance =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
    distance
  );

  return result;
};

const addDays = (
  date,
  days,
) => {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
    days
  );

  return result;
};

const sameLocalDay = (
  left,
  right,
) =>
  left.getFullYear() ===
    right.getFullYear() &&
  left.getMonth() ===
    right.getMonth() &&
  left.getDate() ===
    right.getDate();

const renderCalendarWeek = (
  element,
  events,
  weekStart,
) => {
  const today =
    new Date();

  const formatter =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        weekday: "short",
      },
    );

  const days =
    Array.from(
      {
        length: 7,
      },
      (_, index) =>
        addDays(
          weekStart,
          index,
        ),
    );

  const header =
    days.map(
      (day) => {
        const todayClass =
          sameLocalDay(
            day,
            today
          )
            ? " calendar-today"
            : "";

        return `
          <div class="calendar-day-header${todayClass}">
            <span class="calendar-weekday">
              ${escapeHtml(
                formatter.format(day)
              )}
            </span>
            <strong class="calendar-day-number">
              ${day.getDate()}
            </strong>
          </div>
        `;
      },
    ).join("");

  const columns =
    days.map(
      (day) => {
        const dayEvents =
          events.filter(
            (item) =>
              sameLocalDay(
                new Date(
                  item.start
                ),
                day,
              ),
          );

        const cards =
          dayEvents.map(
            (item) => {
              const start =
                new Date(
                  item.start
                );

              const end =
                new Date(
                  item.end
                );

              const time =
                item.allDay
                  ? "Tüm gün"
                  : `${start.toLocaleTimeString(
                      "tr-TR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}–${end.toLocaleTimeString(
                      "tr-TR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}`;

              return `
                <article class="calendar-event">
                  <div class="calendar-event-time">
                    ${escapeHtml(time)}
                  </div>
                  <div class="calendar-event-title">
                    ${escapeHtml(
                      item.title
                    )}
                  </div>
                  ${
                    item.location
                      ? `<div class="calendar-event-location">${escapeHtml(item.location)}</div>`
                      : ""
                  }
                </article>
              `;
            },
          ).join("");

        return `
          <div class="calendar-day-column">
            ${
              cards ||
              '<div class="calendar-empty"></div>'
            }
          </div>
        `;
      },
    ).join("");

  const end =
    addDays(
      weekStart,
      6,
    );

  const title =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        day: "numeric",
        month: "long",
      },
    ).format(weekStart) +
    " – " +
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(end);

  element.innerHTML = `
    <section class="calendar-render">
      <div class="calendar-render-title">
        ${escapeHtml(title)}
      </div>
      <div class="calendar-week-grid calendar-week-header">
        ${header}
      </div>
      <div class="calendar-week-grid calendar-week-body">
        ${columns}
      </div>
    </section>
  `;

  element.classList.add(
    "visual-rendered"
  );
};



const renderCalendar4Days = (
  element,
  events,
  rangeStart,
) => {
  const today =
    new Date();

  const weekdayFormatter =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        weekday: "short",
      },
    );

  const days =
    Array.from(
      { length: 4 },
      (_, index) =>
        addDays(
          rangeStart,
          index,
        ),
    );

  const header =
    days.map(
      (day) => {
        const todayClass =
          sameLocalDay(
            day,
            today,
          )
            ? " calendar-today"
            : "";

        return `
          <div class="calendar-day-header${todayClass}">
            <span class="calendar-weekday">
              ${escapeHtml(
                weekdayFormatter.format(day)
              )}
            </span>

            <strong class="calendar-day-number">
              ${day.getDate()}
            </strong>
          </div>
        `;
      },
    ).join("");

  const columns =
    days.map(
      (day) => {
        const dayEvents =
          events.filter(
            (item) =>
              sameLocalDay(
                new Date(item.start),
                day,
              ),
          );

        const cards =
          dayEvents.map(
            (item) => {
              const start =
                new Date(item.start);

              const end =
                new Date(item.end);

              const time =
                item.allDay
                  ? "Tüm gün"
                  : `${start.toLocaleTimeString(
                      "tr-TR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}–${end.toLocaleTimeString(
                      "tr-TR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}`;

              return `
                <article class="calendar-event">
                  <div class="calendar-event-time">
                    ${escapeHtml(time)}
                  </div>

                  <div class="calendar-event-title">
                    ${escapeHtml(item.title)}
                  </div>
                </article>
              `;
            },
          ).join("");

        return `
          <div class="calendar-day-column">
            ${
              cards ||
              '<div class="calendar-empty"></div>'
            }
          </div>
        `;
      },
    ).join("");

  const rangeEnd =
    addDays(
      rangeStart,
      3,
    );

  const title =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        day: "numeric",
        month: "long",
      },
    ).format(rangeStart) +
    " – " +
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(rangeEnd);

  element.innerHTML = `
    <section class="calendar-render">
      <div class="calendar-render-title">
        ${escapeHtml(title)}
      </div>

      <div class="calendar-four-grid calendar-week-header">
        ${header}
      </div>

      <div class="calendar-four-grid calendar-week-body">
        ${columns}
      </div>
    </section>
  `;

  element.classList.add(
    "visual-rendered"
  );
};

const renderCalendarDay = (
  element,
  events,
  day,
) => {
  const today =
    new Date();

  const title =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(day);

  const dayEvents =
    events.filter(
      (item) =>
        sameLocalDay(
          new Date(item.start),
          day,
        ),
    );

  const cards =
    dayEvents.map(
      (item) => {
        const start =
          new Date(item.start);

        const end =
          new Date(item.end);

        const time =
          item.allDay
            ? "Tüm gün"
            : `${start.toLocaleTimeString(
                "tr-TR",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}–${end.toLocaleTimeString(
                "tr-TR",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}`;

        return `
          <article class="calendar-event calendar-day-event">
            <div class="calendar-event-time">
              ${escapeHtml(time)}
            </div>
            <div class="calendar-event-title">
              ${escapeHtml(item.title)}
            </div>
          </article>
        `;
      },
    ).join("");

  const todayClass =
    sameLocalDay(
      day,
      today,
    )
      ? " calendar-day-view-today"
      : "";

  element.innerHTML = `
    <section class="calendar-render calendar-day-view${todayClass}">
      <div class="calendar-render-title">
        ${escapeHtml(title)}
      </div>

      <div class="calendar-day-events">
        ${
          cards ||
          '<div class="calendar-day-empty">Bu gün için etkinlik yok.</div>'
        }
      </div>
    </section>
  `;

  element.classList.add(
    "visual-rendered"
  );
};

const renderCalendar = async (
  element,
) => {
  const config =
    parseCalendarBlock(
      element.textContent ??
      ""
    );

  if (!config.src) {
    showError(
      element,
      "Calendar src is required."
    );

    return;
  }

  if (
    config.view !== "week" &&
    config.view !== "day" &&
    config.view !== "4days"
  ) {
    showError(
      element,
      `Calendar view "${config.view}" is not implemented yet.`
    );

    return;
  }

  let currentDate =
    new Date();

  const normalizeCurrent = () => {
    if (
      config.view === "week"
    ) {
      return startOfWeek(
        currentDate
      );
    }

    const result =
      new Date(currentDate);

    result.setHours(
      0, 0, 0, 0
    );

    return result;
  };

  const loadCalendar = async () => {
    const rangeStart =
      normalizeCurrent();

    const rangeDays =
      config.view === "week"
        ? 7
        : config.view === "4days"
          ? 4
          : 1;

    const rangeEnd =
      addDays(
        rangeStart,
        rangeDays,
      );

    try {
      const response =
        await fetch(
          `${API_BASE}/api/render/calendar`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                src:
                  config.src,

                view:
                  config.view,

                rangeStart:
                  rangeStart
                    .toISOString(),

                rangeEnd:
                  rangeEnd
                    .toISOString(),
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await response.text()
        );
      }

      const result =
        await response.json();

      if (
        config.view === "week"
      ) {
        renderCalendarWeek(
          element,
          result.events ?? [],
          rangeStart,
        );
      } else if (
        config.view === "4days"
      ) {
        renderCalendar4Days(
          element,
          result.events ?? [],
          rangeStart,
        );
      } else {
        renderCalendarDay(
          element,
          result.events ?? [],
          rangeStart,
        );
      }

      const calendar =
        element.querySelector(
          ".calendar-render"
        );

      if (!calendar) {
        return;
      }

      const navigation =
        document.createElement(
          "div"
        );

      navigation.className =
        "calendar-navigation";

      navigation.innerHTML = `
        <button
          type="button"
          class="calendar-nav-button"
          data-calendar-action="previous"
        >← Önceki</button>

        <button
          type="button"
          class="calendar-nav-button"
          data-calendar-action="today"
        >Bugün</button>

        <button
          type="button"
          class="calendar-nav-button"
          data-calendar-action="next"
        >Sonraki →</button>
      `;

      calendar.prepend(
        navigation
      );

      navigation.addEventListener(
        "click",
        async (event) => {
          const button =
            event.target.closest(
              "[data-calendar-action]"
            );

          if (!button) {
            return;
          }

          const action =
            button.dataset
              .calendarAction;

          const step =
            config.view === "week"
              ? 7
              : config.view === "4days"
                ? 4
                : 1;

          if (
            action === "previous"
          ) {
            currentDate =
              addDays(
                rangeStart,
                -step,
              );
          } else if (
            action === "next"
          ) {
            currentDate =
              addDays(
                rangeStart,
                step,
              );
          } else if (
            action === "today"
          ) {
            currentDate =
              new Date();
          }

          await loadCalendar();
        },
      );
    } catch (error) {
      showError(
        element,
        error
      );
    }
  };

  await loadCalendar();
};

const renderCalendars = async () => {
  const blocks =
    [
      ...document.querySelectorAll(
        '[data-visual-language="calendar"]'
      ),
    ];

  await Promise.all(
    blocks.map(
      renderCalendar
    )
  );
};

const main = async () => {
  try {
    await renderMermaid();
  } catch (error) {
    const blocks =
      document.querySelectorAll(
        '[data-visual-language="mermaid"]'
      );

    for (
      const element
      of blocks
    ) {
      showError(
        element,
        error
      );
    }
  }

  await renderCalendars();

  const compiled =
    [
      ...document.querySelectorAll(
        '[data-visual-language="d2"], [data-visual-language="typst"]'
      ),
    ];

  await Promise.all(
    compiled.map(
      renderCompiledVisual
    )
  );
};

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    main,
    {
      once: true,
    },
  );
} else {
  main();
}
