(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml, getTool } = shared;

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





    shared.weather = {
      render: renderWeather,
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
