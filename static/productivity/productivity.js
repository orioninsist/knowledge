(() => {
  "use strict";

  const tools = {
    clock: {
      title: "World Clock",
      description:
        "Dünya saatlerini tek ekranda takip et.",
    },

    weather: {
      title: "Weather",
      description:
        "Şehirlerin güncel hava durumunu ve 7 günlük tahminini takip et.",
    },

    markets: {
      title: "Markets",
      description:
        "Döviz ve altın fiyatlarını takip et.",
    },

    board: {
      title: "Board",
      description:
        "Todo, In Progress, Review ve Done akışını yönet.",
    },

    alarm: {
      title: "Alarm",
      description:
        "Saat, tekrar, ses ve bildirim ile alarm oluştur.",
    },

    timer: {
      title: "Timer",
      description:
        "Belirlediğin süreden geriye say.",
    },

    stopwatch: {
      title: "Stopwatch",
      description:
        "Geçen zamanı ve lap sürelerini ölç.",
    },

    pomodoro: {
      title: "Pomodoro",
      description:
        "Focus, short break ve long break döngüsünü yönet.",
    },

    focus: {
      title: "Focus",
      description:
        "Tek bir çalışma hedefine odaklan.",
    },
  };

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

  const WEATHER_STORAGE_KEY =
    "knowledge.productivity.weather.v1";

  /*
   * Weather owns its own state.
   *
   * The city coverage intentionally matches World Clock,
   * but Clock and Weather selections never depend on each other.
   *
   * Coordinates are stored locally so Weather does not need a
   * geocoding request before every forecast request.
   */
  const weatherCoordinates = new Map([
    ["istanbul", [41.0082, 28.9784]],
    ["london", [51.5074, -0.1278]],
    ["stockholm", [59.3293, 18.0686]],
    ["copenhagen", [55.6761, 12.5683]],
    ["oslo", [59.9139, 10.7522]],
    ["helsinki", [60.1699, 24.9384]],
    ["vienna", [48.2082, 16.3738]],
    ["paris", [48.8566, 2.3522]],
    ["berlin", [52.5200, 13.4050]],
    ["amsterdam", [52.3676, 4.9041]],
    ["rome", [41.9028, 12.4964]],
    ["madrid", [40.4168, -3.7038]],
    ["zurich", [47.3769, 8.5417]],
    ["moscow", [55.7558, 37.6173]],
    ["new-york", [40.7128, -74.0060]],
    ["washington-d-c", [38.9072, -77.0369]],
    ["san-francisco", [37.7749, -122.4194]],
    ["chicago", [41.8781, -87.6298]],
    ["denver", [39.7392, -104.9903]],
    ["los-angeles", [34.0522, -118.2437]],
    ["toronto", [43.6532, -79.3832]],
    ["vancouver", [49.2827, -123.1207]],
    ["mexico-city", [19.4326, -99.1332]],
    ["sao-paulo", [-23.5505, -46.6333]],
    ["buenos-aires", [-34.6037, -58.3816]],
    ["dubai", [25.2048, 55.2708]],
    ["riyadh", [24.7136, 46.6753]],
    ["doha", [25.2854, 51.5310]],
    ["mumbai", [19.0760, 72.8777]],
    ["delhi", [28.6139, 77.2090]],
    ["bangkok", [13.7563, 100.5018]],
    ["singapore", [1.3521, 103.8198]],
    ["hong-kong", [22.3193, 114.1694]],
    ["shanghai", [31.2304, 121.4737]],
    ["beijing", [39.9042, 116.4074]],
    ["seoul", [37.5665, 126.9780]],
    ["tokyo", [35.6762, 139.6503]],
    ["sydney", [-33.8688, 151.2093]],
    ["melbourne", [-37.8136, 144.9631]],
    ["auckland", [-36.8509, 174.7645]],
    ["honolulu", [21.3099, -157.8581]],
  ]);

  const weatherCatalog =
    clockCatalog.map(item => {
      const coordinates =
        weatherCoordinates.get(
          item.id
        );

      if (!coordinates) {
        throw new Error(
          `Missing weather coordinates: ${item.id}`
        );
      }

      return {
        ...item,
        latitude: coordinates[0],
        longitude: coordinates[1],
      };
    });

  const defaultWeatherCities = [
    "istanbul",
    "new-york",
    "london",
    "tokyo",
  ];

  const loadWeatherCities = () => {
    try {
      const raw =
        localStorage.getItem(
          WEATHER_STORAGE_KEY
        );

      if (raw === null) {
        return [
          ...defaultWeatherCities,
        ];
      }

      const parsed =
        JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [
          ...defaultWeatherCities,
        ];
      }

      return parsed.filter(
        id =>
          typeof id === "string" &&
          weatherCatalog.some(
            item =>
              item.id === id
          )
      );
    } catch {
      return [
        ...defaultWeatherCities,
      ];
    }
  };

  const saveWeatherCities =
    cities => {
      localStorage.setItem(
        WEATHER_STORAGE_KEY,
        JSON.stringify(cities)
      );
    };

  const celsiusToFahrenheit =
    value =>
      (value * 9 / 5) + 32;

  const formatTemperature =
    value => {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        return {
          celsius: "—",
          fahrenheit: "—",
        };
      }

      return {
        celsius:
          `${Math.round(value)}°C`,

        fahrenheit:
          `${Math.round(
            celsiusToFahrenheit(value)
          )}°F`,
      };
    };

  const weatherCodeLabel =
    code => {
      const labels = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime fog",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Heavy drizzle",
        56: "Freezing drizzle",
        57: "Heavy freezing drizzle",
        61: "Light rain",
        63: "Rain",
        65: "Heavy rain",
        66: "Freezing rain",
        67: "Heavy freezing rain",
        71: "Light snow",
        73: "Snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Light showers",
        81: "Showers",
        82: "Heavy showers",
        85: "Snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Heavy thunderstorm with hail",
      };

      return labels[code] ??
        "Weather";
    };

  const fetchWeather =
    async city => {
      const params =
        new URLSearchParams({
          latitude:
            String(city.latitude),

          longitude:
            String(city.longitude),

          timezone:
            city.timeZone,

          forecast_days:
            "7",

          temperature_unit:
            "celsius",

          wind_speed_unit:
            "kmh",

          precipitation_unit:
            "mm",

          current: [
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
          ].join(","),

          daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
          ].join(","),
        });

      const response =
        await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`,
          {
            cache: "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          `Weather HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      if (
        !data ||
        !data.current ||
        !data.daily
      ) {
        throw new Error(
          "Invalid weather response"
        );
      }

      return data;
    };

  const workspace =
    document.querySelector(
      "#productivity-workspace"
    );

  const now =
    document.querySelector(
      "#productivity-now"
    );

  const tabs = [
    ...document.querySelectorAll(
      "[data-tool]"
    ),
  ];

  let clockInterval = null;

  const escapeHtml = value =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const getTool = () => {
    const value =
      window.location.hash
        .slice(1)
        .trim()
        .toLowerCase();

    return tools[value]
      ? value
      : "clock";
  };

  const productivityShared =
    window.KnowledgeProductivity =
      window.KnowledgeProductivity || {};

  Object.assign(
    productivityShared,
    {
      workspace,
      now,
      tabs,
      escapeHtml,
      getTool,
    }
  );

  (
    window.KnowledgeProductivityQueue || []
  ).forEach(register => {
    register(
      productivityShared
    );
  });

  window.KnowledgeProductivityQueue = [];

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

  const weatherIcon =
    code => {
      if (code === 0) return "☀";
      if ([1, 2].includes(code)) return "⛅";
      if (code === 3) return "☁";
      if ([45, 48].includes(code)) return "≋";

      if (
        [
          51, 53, 55,
          56, 57,
          61, 63, 65,
          66, 67,
          80, 81, 82,
        ].includes(code)
      ) {
        return "☂";
      }

      if (
        [
          71, 73, 75,
          77, 85, 86,
        ].includes(code)
      ) {
        return "❄";
      }

      if (
        [95, 96, 99].includes(code)
      ) {
        return "ϟ";
      }

      return "○";
    };

  const formatWeatherDay =
    value => {
      const date =
        new Date(
          `${value}T12:00:00`
        );

      return new Intl.DateTimeFormat(
        "tr-TR",
        {
          weekday: "short",
        }
      ).format(date);
    };

  const renderWeatherForecast =
    data => {
      const daily =
        data.daily;

      if (
        !daily ||
        !Array.isArray(daily.time)
      ) {
        return "";
      }

      return daily.time
        .slice(0, 7)
        .map((date, index) => {
          const code =
            daily.weather_code?.[
              index
            ];

          const high =
            formatTemperature(
              daily
                .temperature_2m_max?.[
                  index
                ]
            );

          const low =
            formatTemperature(
              daily
                .temperature_2m_min?.[
                  index
                ]
            );

          const rain =
            daily
              .precipitation_probability_max?.[
                index
              ];

          return `
            <div class="weather-day">
              <strong>
                ${
                  index === 0
                    ? "Bugün"
                    : escapeHtml(
                        formatWeatherDay(
                          date
                        )
                      )
                }
              </strong>

              <span
                class="weather-day-icon"
                aria-hidden="true"
              >
                ${weatherIcon(code)}
              </span>

              <span class="weather-day-temp">
                <b>
                  ${escapeHtml(
                    high.celsius
                  )}
                </b>

                <span>
                  ${escapeHtml(
                    low.celsius
                  )}
                </span>
              </span>

              <small>
                ${escapeHtml(
                  high.fahrenheit
                )}
                /
                ${escapeHtml(
                  low.fahrenheit
                )}
              </small>

              <small>
                ${
                  typeof rain ===
                    "number"
                    ? `${Math.round(
                        rain
                      )}% rain`
                    : "—"
                }
              </small>
            </div>
          `;
        })
        .join("");
    };

  const renderWeatherCard =
    async (
      city,
      card
    ) => {
      try {
        const data =
          await fetchWeather(
            city
          );

        if (
          !card.isConnected ||
          getTool() !==
            "weather"
        ) {
          return;
        }

        const current =
          data.current;

        const temperature =
          formatTemperature(
            current.temperature_2m
          );

        const feels =
          formatTemperature(
            current
              .apparent_temperature
          );

        card.classList.remove(
          "is-loading",
          "is-error"
        );

        card.innerHTML = `
          <div class="weather-card-head">
            <div>
              <h3>
                ${escapeHtml(
                  city.city
                )}
              </h3>

              <p>
                ${escapeHtml(
                  city.country
                )}
              </p>
            </div>

            <button
              type="button"
              class="weather-remove"
              data-weather-remove="${escapeHtml(
                city.id
              )}"
              aria-label="Remove ${escapeHtml(
                city.city
              )}"
              title="Remove"
            >
              ×
            </button>
          </div>

          <div class="weather-current">
            <div
              class="weather-current-icon"
              aria-hidden="true"
            >
              ${weatherIcon(
                current.weather_code
              )}
            </div>

            <div class="weather-temperature">
              <strong>
                ${escapeHtml(
                  temperature.celsius
                )}
              </strong>

              <span>
                ${escapeHtml(
                  temperature.fahrenheit
                )}
              </span>
            </div>

            <div class="weather-condition">
              <strong>
                ${escapeHtml(
                  weatherCodeLabel(
                    current.weather_code
                  )
                )}
              </strong>

              <span>
                Feels like
                ${escapeHtml(
                  feels.celsius
                )}
                ·
                ${escapeHtml(
                  feels.fahrenheit
                )}
              </span>
            </div>
          </div>

          <div class="weather-metrics">
            <div>
              <span>Humidity</span>
              <strong>
                ${
                  typeof current
                    .relative_humidity_2m ===
                    "number"
                    ? `${Math.round(
                        current
                          .relative_humidity_2m
                      )}%`
                    : "—"
                }
              </strong>
            </div>

            <div>
              <span>Wind</span>
              <strong>
                ${
                  typeof current
                    .wind_speed_10m ===
                    "number"
                    ? `${Math.round(
                        current
                          .wind_speed_10m
                      )} km/h`
                    : "—"
                }
              </strong>
            </div>

            <div>
              <span>Precipitation</span>
              <strong>
                ${
                  typeof current
                    .precipitation ===
                    "number"
                    ? `${current
                        .precipitation} mm`
                    : "—"
                }
              </strong>
            </div>
          </div>

          <div class="weather-forecast">
            ${renderWeatherForecast(
              data
            )}
          </div>
        `;
      } catch {
        if (!card.isConnected) {
          return;
        }

        card.classList.remove(
          "is-loading"
        );

        card.classList.add(
          "is-error"
        );

        card.innerHTML = `
          <div class="weather-card-head">
            <div>
              <h3>
                ${escapeHtml(
                  city.city
                )}
              </h3>

              <p>
                ${escapeHtml(
                  city.country
                )}
              </p>
            </div>

            <button
              type="button"
              class="weather-remove"
              data-weather-remove="${escapeHtml(
                city.id
              )}"
              aria-label="Remove ${escapeHtml(
                city.city
              )}"
              title="Remove"
            >
              ×
            </button>
          </div>

          <div class="weather-error">
            <strong>
              Weather unavailable
            </strong>

            <span>
              Check your connection and
              refresh the page.
            </span>
          </div>
        `;
      }
    };

  const renderWeatherCards =
    () => {
      const grid =
        workspace.querySelector(
          "#weather-grid"
        );

      if (!grid) {
        return;
      }

      const selected =
        loadWeatherCities();

      if (selected.length === 0) {
        grid.innerHTML = `
          <div class="weather-empty">
            <strong>
              No cities yet
            </strong>

            <span>
              Add a city to start
              your weather dashboard.
            </span>
          </div>
        `;

        return;
      }

      grid.innerHTML = "";

      for (
        const id
        of selected
      ) {
        const city =
          weatherCatalog.find(
            item =>
              item.id === id
          );

        if (!city) {
          continue;
        }

        const card =
          document.createElement(
            "article"
          );

        card.className =
          "weather-card is-loading";

        card.dataset.weatherCity =
          city.id;

        card.innerHTML = `
          <div class="weather-loading">
            <strong>
              ${escapeHtml(
                city.city
              )}
            </strong>

            <span>
              Loading weather…
            </span>
          </div>
        `;

        grid.appendChild(
          card
        );

        renderWeatherCard(
          city,
          card
        );
      }
    };

  const renderWeatherSearch =
    (
      query = ""
    ) => {
      const results =
        workspace.querySelector(
          "#weather-search-results"
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
          loadWeatherCities()
        );

      const matches =
        weatherCatalog
          .filter(city => {
            if (
              active.has(
                city.id
              )
            ) {
              return false;
            }

            if (!normalized) {
              return true;
            }

            const haystack =
              `${city.city} ${city.country} ${city.timeZone}`
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
          .map(city => `
            <button
              type="button"
              class="clock-search-result"
              data-weather-add="${escapeHtml(
                city.id
              )}"
            >
              <span>
                <strong>
                  ${escapeHtml(
                    city.city
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    city.country
                  )}
                </small>
              </span>

              <code>
                ${escapeHtml(
                  city.timeZone
                )}
              </code>
            </button>
          `)
          .join("");
    };

  const closeWeatherPicker =
    () => {
      const picker =
        workspace.querySelector(
          "#weather-picker"
        );

      if (picker) {
        picker.hidden = true;
      }
    };

  const bindWeatherEvents =
    () => {
      const addButton =
        workspace.querySelector(
          "#weather-add"
        );

      const picker =
        workspace.querySelector(
          "#weather-picker"
        );

      const search =
        workspace.querySelector(
          "#weather-search"
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

          renderWeatherSearch();

          window.setTimeout(
            () =>
              search?.focus(),
            0
          );
        }
      );

      workspace
        .querySelectorAll(
          "[data-weather-picker-close]"
        )
        .forEach(button => {
          button.addEventListener(
            "click",
            closeWeatherPicker
          );
        });

      search?.addEventListener(
        "input",
        event => {
          renderWeatherSearch(
            event.target.value
          );
        }
      );

      workspace.addEventListener(
        "click",
        event => {
          const add =
            event.target.closest(
              "[data-weather-add]"
            );

          if (add) {
            const id =
              add.dataset.weatherAdd;

            const cities =
              loadWeatherCities();

            if (
              id &&
              !cities.includes(id)
            ) {
              cities.push(id);

              saveWeatherCities(
                cities
              );

              renderWeatherCards();
              closeWeatherPicker();
            }

            return;
          }

          const remove =
            event.target.closest(
              "[data-weather-remove]"
            );

          if (remove) {
            const id =
              remove.dataset
                .weatherRemove;

            saveWeatherCities(
              loadWeatherCities()
                .filter(
                  item =>
                    item !== id
                )
            );

            renderWeatherCards();
          }
        }
      );
    };

  const renderWeather = () => {
    workspace.innerHTML = `
      <section class="weather-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Weather
            </span>

            <h2>
              Weather
            </h2>

            <p>
              Current conditions and
              seven-day forecast.
            </p>
          </div>

          <button
            id="weather-add"
            class="primary-button"
            type="button"
          >
            + Add city
          </button>
        </header>

        <div
          id="weather-grid"
          class="weather-grid"
        ></div>

        <div
          id="weather-picker"
          class="clock-picker"
          hidden
        >
          <button
            type="button"
            class="clock-picker-backdrop"
            data-weather-picker-close
            aria-label="Close city picker"
          ></button>

          <section
            class="clock-picker-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Add weather city"
          >
            <div class="clock-picker-head">
              <div>
                <span class="tool-kicker">
                  Add city
                </span>

                <h3>
                  Choose a city
                </h3>
              </div>

              <button
                type="button"
                class="icon-button"
                data-weather-picker-close
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <input
              id="weather-search"
              class="clock-search"
              type="search"
              placeholder="Search city, country or timezone..."
              autocomplete="off"
              spellcheck="false"
            >

            <div
              id="weather-search-results"
              class="clock-search-results"
            ></div>
          </section>
        </div>
      </section>
    `;

    renderWeatherCards();
    bindWeatherEvents();
  };


  /*
   * Markets V1
   *
   * Stateless and independent from every other productivity tool.
   *
   * Fiat:
   *   Frankfurter
   *
   * Gold + crypto:
   *   Gold API
   *
   * No polling.
   * No API keys.
   * No backend.
   * Network requests happen only when Markets is opened
   * or the user presses Refresh.
   */

  const MARKET_FIAT_SYMBOLS = [
    "USD",
    "EUR",
    "GBP",
    "CHF",
    "SEK",
    "NOK",
    "DKK",
    "CAD",
    "AUD",
    "JPY",
  ];

  const MARKET_FIAT_NAMES = {
    USD: "US Dollar",
    EUR: "Euro",
    GBP: "British Pound",
    CHF: "Swiss Franc",
    SEK: "Swedish Krona",
    NOK: "Norwegian Krone",
    DKK: "Danish Krone",
    CAD: "Canadian Dollar",
    AUD: "Australian Dollar",
    JPY: "Japanese Yen",
  };

  const MARKET_CRYPTO = [
    {
      symbol: "BTC",
      name: "Bitcoin",
    },
    {
      symbol: "ETH",
      name: "Ethereum",
    },
  ];

  const TROY_OUNCE_GRAMS =
    31.1034768;

  const marketNumber = (
    value,
    options = {}
  ) => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      return "—";
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        maximumFractionDigits: 2,
        ...options,
      }
    ).format(value);
  };

  const marketPrice = (
    value,
    currency,
    options = {}
  ) => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      return "—";
    }

    try {
      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
          ...options,
        }
      ).format(value);
    } catch {
      return `${marketNumber(
        value,
        options
      )} ${currency}`;
    }
  };

  const fetchJson = async url => {
    const response =
      await fetch(
        url,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return response.json();
  };

  const fetchFiatMarkets =
    async () => {
      const symbols =
        [
          "TRY",
          "USD",
          "EUR",
          ...MARKET_FIAT_SYMBOLS,
        ]
          .filter(
            (
              value,
              index,
              values
            ) =>
              values.indexOf(value) ===
              index
          )
          .join(",");

      const data =
        await fetchJson(
          "https://api.frankfurter.dev/v1/latest" +
          `?base=EUR&symbols=${encodeURIComponent(
            symbols
          )}`
        );

      const rates =
        {
          EUR: 1,
          ...(data.rates ?? {}),
        };

      const tryPerEuro =
        Number(rates.TRY);

      if (
        !Number.isFinite(
          tryPerEuro
        )
      ) {
        throw new Error(
          "TRY reference rate unavailable"
        );
      }

      const tryRates =
        Object.fromEntries(
          MARKET_FIAT_SYMBOLS.map(
            symbol => {
              const unitsPerEuro =
                Number(
                  rates[symbol]
                );

              const value =
                symbol === "EUR"
                  ? tryPerEuro
                  : tryPerEuro /
                    unitsPerEuro;

              return [
                symbol,
                value,
              ];
            }
          )
        );

      return {
        date:
          data.date ?? null,
        rates: tryRates,
        cross: rates,
      };
    };

  const fetchGoldMarket =
    async () => {
      const data =
        await fetchJson(
          "https://api.gold-api.com/price/XAU"
        );

      const usdPerOunce =
        Number(data.price);

      if (
        !Number.isFinite(
          usdPerOunce
        )
      ) {
        throw new Error(
          "Gold price unavailable"
        );
      }

      return {
        usdPerOunce,
        usdPerGram:
          usdPerOunce /
          TROY_OUNCE_GRAMS,
        updated:
          data.updatedAt ??
          data.updated_at ??
          data.timestamp ??
          null,
      };
    };

  const fetchCryptoMarket =
    async symbol => {
      const data =
        await fetchJson(
          `https://api.gold-api.com/price/${encodeURIComponent(
            symbol
          )}`
        );

      const usd =
        Number(data.price);

      if (
        !Number.isFinite(usd)
      ) {
        throw new Error(
          `${symbol} price unavailable`
        );
      }

      return {
        symbol,
        usd,
        updated:
          data.updatedAt ??
          data.updated_at ??
          data.timestamp ??
          null,
      };
    };

  const marketSectionLoading =
    label => `
      <div class="market-state">
        <strong>
          Loading ${escapeHtml(
            label
          )}…
        </strong>
        <span>
          Fetching current market data.
        </span>
      </div>
    `;

  const marketSectionError = (
    label,
    error
  ) => `
    <div class="market-state market-state-error">
      <strong>
        ${escapeHtml(label)} unavailable
      </strong>
      <span>
        ${escapeHtml(
          error?.message ??
          "Could not load market data."
        )}
      </span>
    </div>
  `;

  const renderFiatMarket =
    data => {
      const container =
        workspace.querySelector(
          "#market-currencies"
        );

      if (!container) {
        return;
      }

      container.innerHTML = `
        <div class="market-card-grid">
          ${MARKET_FIAT_SYMBOLS
            .map(symbol => {
              const value =
                data.rates[
                  symbol
                ];

              return `
                <article class="market-card">
                  <div class="market-card-head">
                    <div>
                      <strong>
                        ${escapeHtml(
                          symbol
                        )}
                      </strong>
                      <span>
                        ${escapeHtml(
                          MARKET_FIAT_NAMES[
                            symbol
                          ]
                        )}
                      </span>
                    </div>

                    <small>
                      TRY
                    </small>
                  </div>

                  <div class="market-value">
                    ${
                      Number.isFinite(
                        value
                      )
                        ? `${marketNumber(
                            value,
                            {
                              minimumFractionDigits:
                                value < 1
                                  ? 4
                                  : 2,
                              maximumFractionDigits:
                                value < 1
                                  ? 4
                                  : 2,
                            }
                          )} ₺`
                        : "—"
                    }
                  </div>

                  <div class="market-caption">
                    1 ${escapeHtml(
                      symbol
                    )} in TRY
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>

        <div class="market-source-note">
          Reference date:
          <strong>
            ${escapeHtml(
              data.date ?? "—"
            )}
          </strong>
          · daily reference rates
        </div>
      `;
    };

  const renderGoldMarket = (
    gold,
    fiat
  ) => {
    const container =
      workspace.querySelector(
        "#market-gold"
      );

    if (!container) {
      return;
    }

    const usdTry =
      Number(
        fiat?.rates?.USD
      );

    const tryPerOunce =
      Number.isFinite(usdTry)
        ? gold.usdPerOunce *
          usdTry
        : NaN;

    const tryPerGram =
      Number.isFinite(usdTry)
        ? gold.usdPerGram *
          usdTry
        : NaN;

    container.innerHTML = `
      <div class="market-feature-grid">
        <article class="market-feature-card">
          <div class="market-feature-label">
            <span>
              Gold
            </span>
            <strong>
              XAU / oz
            </strong>
          </div>

          <div class="market-feature-price">
            ${marketPrice(
              gold.usdPerOunce,
              "USD"
            )}
          </div>

          <div class="market-secondary-price">
            ${
              Number.isFinite(
                tryPerOunce
              )
                ? `${marketNumber(
                    tryPerOunce
                  )} ₺`
                : "TRY unavailable"
            }
          </div>
        </article>

        <article class="market-feature-card">
          <div class="market-feature-label">
            <span>
              Gold
            </span>
            <strong>
              1 gram
            </strong>
          </div>

          <div class="market-feature-price">
            ${marketPrice(
              gold.usdPerGram,
              "USD"
            )}
          </div>

          <div class="market-secondary-price">
            ${
              Number.isFinite(
                tryPerGram
              )
                ? `${marketNumber(
                    tryPerGram
                  )} ₺`
                : "TRY unavailable"
            }
          </div>
        </article>
      </div>

      <div class="market-source-note">
        Spot XAU/USD ·
        gram calculated from
        1 troy oz = 31.1034768 g
      </div>
    `;
  };

  const renderCryptoMarket = (
    crypto,
    fiat
  ) => {
    const container =
      workspace.querySelector(
        "#market-crypto"
      );

    if (!container) {
      return;
    }

    const usdTry =
      Number(
        fiat?.rates?.USD
      );

    const usdPerEuro =
      Number(
        fiat?.cross?.USD
      );

    container.innerHTML = `
      <div class="market-feature-grid">
        ${crypto
          .map(asset => {
            const definition =
              MARKET_CRYPTO.find(
                item =>
                  item.symbol ===
                  asset.symbol
              );

            const eur =
              Number.isFinite(
                usdPerEuro
              )
                ? asset.usd /
                  usdPerEuro
                : NaN;

            const tryValue =
              Number.isFinite(
                usdTry
              )
                ? asset.usd *
                  usdTry
                : NaN;

            return `
              <article class="market-feature-card">
                <div class="market-feature-label">
                  <span>
                    ${escapeHtml(
                      definition?.name ??
                      asset.symbol
                    )}
                  </span>
                  <strong>
                    ${escapeHtml(
                      asset.symbol
                    )}
                  </strong>
                </div>

                <div class="market-feature-price">
                  ${marketPrice(
                    asset.usd,
                    "USD"
                  )}
                </div>

                <div class="market-price-row">
                  <span>
                    ${
                      Number.isFinite(
                        eur
                      )
                        ? marketPrice(
                            eur,
                            "EUR"
                          )
                        : "EUR —"
                    }
                  </span>

                  <span>
                    ${
                      Number.isFinite(
                        tryValue
                      )
                        ? `${marketNumber(
                            tryValue
                          )} ₺`
                        : "TRY —"
                    }
                  </span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>

      <div class="market-source-note">
        BTC and ETH spot reference prices
      </div>
    `;
  };

  let marketsRequestId = 0;

  const loadMarkets =
    async () => {
      const requestId =
        ++marketsRequestId;

      const fiatContainer =
        workspace.querySelector(
          "#market-currencies"
        );

      const goldContainer =
        workspace.querySelector(
          "#market-gold"
        );

      const cryptoContainer =
        workspace.querySelector(
          "#market-crypto"
        );

      const refresh =
        workspace.querySelector(
          "#markets-refresh"
        );

      const updated =
        workspace.querySelector(
          "#markets-updated"
        );

      if (
        !fiatContainer ||
        !goldContainer ||
        !cryptoContainer
      ) {
        return;
      }

      fiatContainer.innerHTML =
        marketSectionLoading(
          "currencies"
        );

      goldContainer.innerHTML =
        marketSectionLoading(
          "gold"
        );

      cryptoContainer.innerHTML =
        marketSectionLoading(
          "crypto"
        );

      if (refresh) {
        refresh.disabled = true;
        refresh.textContent =
          "Refreshing…";
      }

      if (updated) {
        updated.textContent =
          "Updating market data…";
      }

      const fiatPromise =
        fetchFiatMarkets();

      const goldPromise =
        fetchGoldMarket();

      const cryptoPromise =
        Promise.all(
          MARKET_CRYPTO.map(
            item =>
              fetchCryptoMarket(
                item.symbol
              )
          )
        );

      const [
        fiatResult,
        goldResult,
        cryptoResult,
      ] =
        await Promise.allSettled([
          fiatPromise,
          goldPromise,
          cryptoPromise,
        ]);

      if (
        requestId !==
          marketsRequestId ||
        getTool() !== "markets"
      ) {
        return;
      }

      const fiat =
        fiatResult.status ===
        "fulfilled"
          ? fiatResult.value
          : null;

      if (fiat) {
        renderFiatMarket(
          fiat
        );
      } else {
        fiatContainer.innerHTML =
          marketSectionError(
            "Currencies",
            fiatResult.reason
          );
      }

      if (
        goldResult.status ===
        "fulfilled"
      ) {
        renderGoldMarket(
          goldResult.value,
          fiat
        );
      } else {
        goldContainer.innerHTML =
          marketSectionError(
            "Gold",
            goldResult.reason
          );
      }

      if (
        cryptoResult.status ===
        "fulfilled"
      ) {
        renderCryptoMarket(
          cryptoResult.value,
          fiat
        );
      } else {
        cryptoContainer.innerHTML =
          marketSectionError(
            "Crypto",
            cryptoResult.reason
          );
      }

      if (refresh) {
        refresh.disabled = false;
        refresh.textContent =
          "Refresh";
      }

      if (updated) {
        updated.textContent =
          `Updated ${new Intl.DateTimeFormat(
            "tr-TR",
            {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }
          ).format(new Date())}`;
      }
    };

  const renderMarkets = () => {
    workspace.innerHTML = `
      <section class="markets-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Markets
            </span>

            <h2>
              Markets
            </h2>

            <p>
              Currencies, gold and crypto
              in one quiet view.
            </p>
          </div>

          <button
            id="markets-refresh"
            class="primary-button"
            type="button"
          >
            Refresh
          </button>
        </header>

        <div class="markets-meta">
          <span id="markets-updated">
            Loading market data…
          </span>

          <span>
            No background refresh
          </span>
        </div>

        <section class="market-section">
          <div class="market-section-head">
            <div>
              <span class="tool-kicker">
                Fiat
              </span>

              <h3>
                Currencies
              </h3>
            </div>

            <span>
              TRY reference
            </span>
          </div>

          <div id="market-currencies">
            ${marketSectionLoading(
              "currencies"
            )}
          </div>
        </section>

        <section class="market-section">
          <div class="market-section-head">
            <div>
              <span class="tool-kicker">
                Metal
              </span>

              <h3>
                Gold
              </h3>
            </div>

            <span>
              USD + TRY
            </span>
          </div>

          <div id="market-gold">
            ${marketSectionLoading(
              "gold"
            )}
          </div>
        </section>

        <section class="market-section">
          <div class="market-section-head">
            <div>
              <span class="tool-kicker">
                Crypto
              </span>

              <h3>
                Crypto
              </h3>
            </div>

            <span>
              USD + EUR + TRY
            </span>
          </div>

          <div id="market-crypto">
            ${marketSectionLoading(
              "crypto"
            )}
          </div>
        </section>
      </section>
    `;

    workspace
      .querySelector(
        "#markets-refresh"
      )
      ?.addEventListener(
        "click",
        loadMarkets
      );

    loadMarkets();
  };

  /*
   * Board V1
   *
   * Fully local Kanban board.
   * No backend, API or Knowledge integration.
   */

  const BOARD_STORAGE_KEY =
    "knowledge.productivity.board.v1";

  const boardColumns = [
    {
      id: "todo",
      title: "Todo",
    },
    {
      id: "in-progress",
      title: "In Progress",
    },
    {
      id: "review",
      title: "Review",
    },
    {
      id: "done",
      title: "Done",
    },
  ];

  const emptyBoardState = () =>
    Object.fromEntries(
      boardColumns.map(
        column => [
          column.id,
          [],
        ]
      )
    );

  const isValidBoardCard =
    card =>
      card &&
      typeof card === "object" &&
      typeof card.id === "string" &&
      card.id.length > 0 &&
      typeof card.title === "string" &&
      card.title.trim().length > 0;

  const loadBoard = () => {
    const fallback =
      emptyBoardState();

    try {
      const raw =
        localStorage.getItem(
          BOARD_STORAGE_KEY
        );

      if (raw === null) {
        return fallback;
      }

      const parsed =
        JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return fallback;
      }

      const result =
        emptyBoardState();

      const ids =
        new Set();

      for (
        const column
        of boardColumns
      ) {
        const cards =
          parsed[column.id];

        if (!Array.isArray(cards)) {
          return fallback;
        }

        for (const card of cards) {
          if (
            !isValidBoardCard(card) ||
            ids.has(card.id)
          ) {
            return fallback;
          }

          ids.add(card.id);

          result[column.id].push({
            id: card.id,
            title:
              card.title
                .trim()
                .slice(0, 240),
          });
        }
      }

      return result;
    } catch {
      return fallback;
    }
  };

  const saveBoard =
    board => {
      try {
        localStorage.setItem(
          BOARD_STORAGE_KEY,
          JSON.stringify(board)
        );

        return true;
      } catch {
        return false;
      }
    };

  const createBoardCardId = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return crypto.randomUUID();
    }

    return [
      "card",
      Date.now().toString(36),
      Math.random()
        .toString(36)
        .slice(2),
    ].join("-");
  };

  const findBoardCard =
    (board, cardId) => {
      for (
        const column
        of boardColumns
      ) {
        const index =
          board[column.id]
            .findIndex(
              card =>
                card.id === cardId
            );

        if (index !== -1) {
          return {
            columnId:
              column.id,
            index,
            card:
              board[column.id][index],
          };
        }
      }

      return null;
    };

  const boardIcon = name => {
    if (name === "edit") {
      return `
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 20h9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      `;
    }

    return `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M4 7h16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
        <path
          d="M9 7V4h6v3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
        <path
          d="m6 7 1 13h10l1-13"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    `;
  };

  let boardDragCardId = null;

  const clearBoardDropState =
    () => {
      workspace
        .querySelectorAll(
          ".board-drop-target"
        )
        .forEach(
          node =>
            node.classList.remove(
              "board-drop-target"
            )
        );
    };

  const getBoardDropIndex =
    (list, clientY) => {
      const cards = [
        ...list.querySelectorAll(
          ".board-card:not(.is-dragging)"
        ),
      ];

      for (
        let index = 0;
        index < cards.length;
        index += 1
      ) {
        const rect =
          cards[index]
            .getBoundingClientRect();

        if (
          clientY <
          rect.top +
            rect.height / 2
        ) {
          return index;
        }
      }

      return cards.length;
    };

  const renderBoardColumns = () => {
    const boardRoot =
      workspace.querySelector(
        "#board-columns"
      );

    if (!boardRoot) {
      return;
    }

    const board =
      loadBoard();

    boardRoot.innerHTML =
      boardColumns
        .map(column => {
          const cards =
            board[column.id];

          return `
            <section
              class="board-column"
              data-board-column="${escapeHtml(
                column.id
              )}"
            >
              <header
                class="board-column-head"
              >
                <div>
                  <h3>
                    ${escapeHtml(
                      column.title
                    )}
                  </h3>

                  <span>
                    ${cards.length}
                  </span>
                </div>

                <button
                  class="board-add-button"
                  type="button"
                  data-board-add="${escapeHtml(
                    column.id
                  )}"
                  aria-label="Add card to ${escapeHtml(
                    column.title
                  )}"
                  title="Add card"
                >
                  +
                </button>
              </header>

              <div
                class="board-card-list"
                data-board-list="${escapeHtml(
                  column.id
                )}"
              >
                ${
                  cards.length
                    ? cards
                        .map(
                          card => `
                            <article
                              class="board-card"
                              draggable="true"
                              data-board-card="${escapeHtml(
                                card.id
                              )}"
                            >
                              <div
                                class="board-card-title"
                              >
                                ${escapeHtml(
                                  card.title
                                )}
                              </div>

                              <div
                                class="board-card-actions"
                              >
                                <button
                                  type="button"
                                  data-board-edit="${escapeHtml(
                                    card.id
                                  )}"
                                  aria-label="Edit card"
                                  title="Edit"
                                >
                                  ${boardIcon(
                                    "edit"
                                  )}
                                </button>

                                <button
                                  type="button"
                                  data-board-delete="${escapeHtml(
                                    card.id
                                  )}"
                                  aria-label="Delete card"
                                  title="Delete"
                                >
                                  ${boardIcon(
                                    "delete"
                                  )}
                                </button>
                              </div>
                            </article>
                          `
                        )
                        .join("")
                    : `
                      <div
                        class="board-column-empty"
                      >
                        Drop or add a card
                      </div>
                    `
                }
              </div>
            </section>
          `;
        })
        .join("");
  };

  const addBoardCard =
    columnId => {
      const column =
        boardColumns.find(
          item =>
            item.id === columnId
        );

      if (!column) {
        return;
      }

      const value =
        window.prompt(
          `Add to ${column.title}`
        );

      if (value === null) {
        return;
      }

      const title =
        value.trim().slice(0, 240);

      if (!title) {
        return;
      }

      const board =
        loadBoard();

      board[columnId].push({
        id: createBoardCardId(),
        title,
      });

      saveBoard(board);
      renderBoardColumns();
    };

  const editBoardCard =
    cardId => {
      const board =
        loadBoard();

      const found =
        findBoardCard(
          board,
          cardId
        );

      if (!found) {
        return;
      }

      const value =
        window.prompt(
          "Edit card",
          found.card.title
        );

      if (value === null) {
        return;
      }

      const title =
        value.trim().slice(0, 240);

      if (!title) {
        return;
      }

      found.card.title =
        title;

      saveBoard(board);
      renderBoardColumns();
    };

  const deleteBoardCard =
    cardId => {
      const board =
        loadBoard();

      const found =
        findBoardCard(
          board,
          cardId
        );

      if (!found) {
        return;
      }

      if (
        !window.confirm(
          `Delete "${found.card.title}"?`
        )
      ) {
        return;
      }

      board[found.columnId]
        .splice(
          found.index,
          1
        );

      saveBoard(board);
      renderBoardColumns();
    };

  const moveBoardCard =
    (
      cardId,
      targetColumnId,
      targetIndex
    ) => {
      const board =
        loadBoard();

      const found =
        findBoardCard(
          board,
          cardId
        );

      if (
        !found ||
        !Object.hasOwn(
          board,
          targetColumnId
        )
      ) {
        return;
      }

      const [card] =
        board[found.columnId]
          .splice(
            found.index,
            1
          );

      let index =
        Number.isInteger(
          targetIndex
        )
          ? targetIndex
          : board[targetColumnId]
              .length;

      if (
        found.columnId ===
          targetColumnId &&
        found.index < index
      ) {
        index -= 1;
      }

      index =
        Math.max(
          0,
          Math.min(
            index,
            board[targetColumnId]
              .length
          )
        );

      board[targetColumnId]
        .splice(
          index,
          0,
          card
        );

      saveBoard(board);
      renderBoardColumns();
    };

  const bindBoardEvents = () => {
    workspace.addEventListener(
      "click",
      event => {
        if (
          getTool() !== "board"
        ) {
          return;
        }

        const add =
          event.target.closest(
            "[data-board-add]"
          );

        if (add) {
          addBoardCard(
            add.dataset.boardAdd
          );
          return;
        }

        const edit =
          event.target.closest(
            "[data-board-edit]"
          );

        if (edit) {
          editBoardCard(
            edit.dataset.boardEdit
          );
          return;
        }

        const remove =
          event.target.closest(
            "[data-board-delete]"
          );

        if (remove) {
          deleteBoardCard(
            remove.dataset.boardDelete
          );
        }
      }
    );

    workspace.addEventListener(
      "dragstart",
      event => {
        if (
          getTool() !== "board"
        ) {
          return;
        }

        const card =
          event.target.closest(
            "[data-board-card]"
          );

        if (!card) {
          return;
        }

        boardDragCardId =
          card.dataset.boardCard;

        card.classList.add(
          "is-dragging"
        );

        if (
          event.dataTransfer
        ) {
          event.dataTransfer
            .setData(
              "text/plain",
              boardDragCardId
            );

          event.dataTransfer
            .effectAllowed =
              "move";
        }
      }
    );

    workspace.addEventListener(
      "dragover",
      event => {
        if (
          getTool() !== "board" ||
          !boardDragCardId
        ) {
          return;
        }

        const list =
          event.target.closest(
            "[data-board-list]"
          );

        if (!list) {
          return;
        }

        event.preventDefault();

        clearBoardDropState();

        list.classList.add(
          "board-drop-target"
        );

        if (
          event.dataTransfer
        ) {
          event.dataTransfer
            .dropEffect =
              "move";
        }
      }
    );

    workspace.addEventListener(
      "drop",
      event => {
        if (
          getTool() !== "board"
        ) {
          return;
        }

        const list =
          event.target.closest(
            "[data-board-list]"
          );

        if (!list) {
          return;
        }

        event.preventDefault();

        const cardId =
          boardDragCardId ||
          event.dataTransfer
            ?.getData(
              "text/plain"
            );

        const columnId =
          list.dataset.boardList;

        if (
          cardId &&
          columnId
        ) {
          moveBoardCard(
            cardId,
            columnId,
            getBoardDropIndex(
              list,
              event.clientY
            )
          );
        }

        boardDragCardId = null;
        clearBoardDropState();
      }
    );

    workspace.addEventListener(
      "dragend",
      event => {
        const card =
          event.target.closest(
            "[data-board-card]"
          );

        card?.classList.remove(
          "is-dragging"
        );

        boardDragCardId = null;
        clearBoardDropState();
      }
    );
  };


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

  const renderBoard = () => {
    workspace.innerHTML = `
      <section class="board-view">
        <header class="tool-header">
          <div>
            <span class="tool-kicker">
              Board
            </span>

            <h2>
              Board
            </h2>

            <p>
              A quiet four-stage workflow
              stored only in this browser.
            </p>
          </div>

          <span class="board-local-note">
            Local only
          </span>
        </header>

        <div
          id="board-columns"
          class="board-columns"
          aria-label="Kanban board"
        ></div>
      </section>
    `;

    renderBoardColumns();
  };

  const renderPlaceholder = (
    key
  ) => {
    const tool =
      tools[key];

    workspace.innerHTML = `
      <div class="tool-placeholder">
        <span class="tool-kicker">
          ${escapeHtml(key)}
        </span>

        <h2>
          ${escapeHtml(tool.title)}
        </h2>

        <p>
          ${escapeHtml(
            tool.description
          )}
        </p>

        <span class="tool-status">
          Ready for implementation
        </span>
      </div>
    `;
  };

  const renderTool = () => {
    stopClock();

    const key =
      getTool();

    for (const tab of tabs) {
      const active =
        tab.dataset.tool === key;

      tab.classList.toggle(
        "is-active",
        active
      );

      if (active) {
        tab.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        tab.removeAttribute(
          "aria-current"
        );
      }
    }

    if (key === "clock") {
      renderClock();
      return;
    }

    if (key === "weather") {
      renderWeather();
      return;
    }

    if (key === "markets") {
      renderMarkets();
      return;
    }

    if (key === "board") {
      renderBoard();
      return;
    }

    if (key === "alarm") {
      renderAlarm();
      return;
    }

    if (key === "timer") {
      renderTimer();
      return;
    }

    if (key === "stopwatch") {
      productivityShared.stopwatch
        ?.render();
      return;
    }

    if (key === "pomodoro") {
      productivityShared.pomodoro
        ?.render();
      return;
    }

    if (key === "focus") {
      productivityShared.focus
        ?.render();
      return;
    }

    renderPlaceholder(
      key
    );
  };

  const renderNow = () => {
    const date =
      new Date();

    now.dateTime =
      date.toISOString();

    now.textContent =
      new Intl.DateTimeFormat(
        "tr-TR",
        {
          weekday: "short",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(date);
  };

  window.addEventListener(
    "hashchange",
    renderTool
  );

  bindBoardEvents();
  bindAlarmEvents();
  bindTimerEvents();
  productivityShared.stopwatch
    ?.bindEvents();
  productivityShared.pomodoro
    ?.bindEvents();
  productivityShared.focus
    ?.bindEvents();
  startAlarmScheduler();

  renderTool();
  renderNow();

  window.setInterval(
    renderNow,
    30_000
  );
})();
