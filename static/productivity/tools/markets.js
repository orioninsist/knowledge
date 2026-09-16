(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml } = shared;

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
    shared.markets = {
      render: renderMarkets,
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
