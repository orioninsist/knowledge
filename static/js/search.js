(() => {
  const API_BASE =
    document
      .querySelector(
        'meta[name="knowledge-search-api"]'
      )
      ?.getAttribute("content")
      ?.replace(/\/$/, "");

  if (!API_BASE) {
    throw new Error(
      "Knowledge search API endpoint is missing."
    );
  }

  const SEARCH_ENDPOINT =
    `${API_BASE}/api/search`;

  const TAG_ENDPOINT =
    `${API_BASE}/api/tags`;

  const input =
    document.getElementById(
      "knowledge-search"
    );

  const results =
    document.getElementById(
      "search-results"
    );

  const summary =
    document.getElementById(
      "search-summary"
    );

  const resultsList =
    document.getElementById(
      "search-results-list"
    );

  if (
    !input ||
    !results ||
    !summary ||
    !resultsList
  ) {
    return;
  }

  let activeResultIndex = -1;
  let searchTimer = null;
  let requestController = null;

  const escapeHTML = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll(
        "'",
        "&#039;",
      );

  const getResultLinks = () =>
    [
      ...resultsList.querySelectorAll(
        ".search-result",
      ),
    ];

  const clearActiveResult = () => {
    for (
      const link
      of getResultLinks()
    ) {
      link.classList.remove(
        "is-active",
      );

      link.removeAttribute(
        "aria-current",
      );
    }

    activeResultIndex = -1;
  };

  const setActiveResult = (
    index,
  ) => {
    const links =
      getResultLinks();

    if (!links.length) {
      activeResultIndex = -1;
      return;
    }

    const normalizedIndex =
      (
        (
          index %
          links.length
        ) +
        links.length
      ) %
      links.length;

    for (
      const link
      of links
    ) {
      link.classList.remove(
        "is-active",
      );

      link.removeAttribute(
        "aria-current",
      );
    }

    const active =
      links[normalizedIndex];

    active.classList.add(
      "is-active",
    );

    active.setAttribute(
      "aria-current",
      "true",
    );

    active.scrollIntoView({
      block: "nearest",
    });

    activeResultIndex =
      normalizedIndex;
  };

  const resetResults = () => {
    clearActiveResult();

    summary.hidden = true;
    summary.textContent = "";

    results.hidden = true;
    resultsList.innerHTML = "";
  };

  const render = (
    payload,
  ) => {
    clearActiveResult();

    const count =
      Number(
        payload.count ?? 0,
      );

    const filters =
      payload.filters ?? {};

    const summaryParts = [
      `${count} result${
        count === 1
          ? ""
          : "s"
      }`,
    ];

    for (
      const section
      of filters.sections ?? []
    ) {
      summaryParts.push(
        `section:${section}`,
      );
    }

    for (
      const tag
      of filters.tags ?? []
    ) {
      summaryParts.push(
        `tag:${tag}`,
      );
    }

    for (
      const status
      of filters.statuses ?? []
    ) {
      summaryParts.push(
        `status:${status}`,
      );
    }

    summary.textContent =
      summaryParts.join(" · ");

    summary.hidden = false;

    const rows =
      Array.isArray(
        payload.results,
      )
        ? payload.results
        : [];

    if (!rows.length) {
      resultsList.innerHTML = `
        <div class="search-empty">
          <strong>No matching notes.</strong>
          <span>
            Try another query or remove a filter.
          </span>
        </div>
      `;

      results.hidden = false;
      return;
    }

    resultsList.innerHTML =
      rows
        .map((page) => {
          const aliases =
            Array.isArray(
              page.aliases,
            )
              ? page.aliases
              : [];

          const tags =
            Array.isArray(
              page.tags,
            )
              ? page.tags
              : [];

          const aliasLabel =
            aliases.length
              ? `
                <span class="search-result-alias">
                  ${aliases
                    .map(
                      (alias) =>
                        escapeHTML(
                          alias,
                        ),
                    )
                    .join(" · ")}
                </span>
              `
              : "";

          const tagLabel =
            tags.length
              ? `
                <span class="search-result-tags">
                  ${tags
                    .map(
                      (tag) =>
                        `#${escapeHTML(
                          tag,
                        )}`,
                    )
                    .join(" ")}
                </span>
              `
              : "";

          const statusLabel =
            page.status
              ? `
                <span class="search-result-status">
                  ${escapeHTML(
                    page.status,
                  )}
                </span>
              `
              : "";

          return `
            <a
              class="search-result"
              href="${escapeHTML(
                page.url,
              )}"
            >
              <span class="search-result-title">
                ${escapeHTML(
                  page.title,
                )}
              </span>

              <span class="search-result-section">
                ${escapeHTML(
                  page.section,
                )}
              </span>

              ${statusLabel}
              ${aliasLabel}
              ${tagLabel}

              <span class="search-result-snippet">
                ${escapeHTML(
                  page.summary,
                )}
              </span>
            </a>
          `;
        })
        .join("");

    results.hidden = false;
  };

  const runSearch =
    async () => {
      const query =
        input.value.trim();

      if (!query) {
        resetResults();
        return;
      }

      if (requestController) {
        requestController.abort();
      }

      requestController =
        new AbortController();

      try {
        const url =
          new URL(
            SEARCH_ENDPOINT,
          );

        url.searchParams.set(
          "q",
          query,
        );

        const response =
          await fetch(
            url,
            {
              signal:
                requestController.signal,

              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            `Search endpoint returned ${response.status}`,
          );
        }

        const payload =
          await response.json();

        render(payload);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(error);

        summary.hidden = true;

        resultsList.innerHTML = `
          <div class="search-empty">
            <strong>Search unavailable.</strong>
            <span>
              Local search service is not responding.
            </span>
          </div>
        `;

        results.hidden = false;
      }
    };

  const scheduleSearch = () => {
    if (searchTimer) {
      window.clearTimeout(
        searchTimer,
      );
    }

    searchTimer =
      window.setTimeout(
        runSearch,
        80,
      );
  };


  /*
   * Tag autocomplete lives inside the main SearchController.
   *
   * There is no static tag list.
   * `tag:` alone returns nothing.
   * Suggestions begin only after a prefix is typed.
   */
  let tagTimer = null;
  let tagController = null;

  const escapeTagHTML = (
    value,
  ) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const getTagPrefix = (
    value,
  ) => {
    const match =
      value.match(
        /(?:^|\s)tag:([^\s]*)$/i,
      );

    if (!match) {
      return null;
    }

    return match[1];
  };

  const clearTagSuggestions = () => {
    if (
      resultsList.dataset.mode ===
      "tag-suggestions"
    ) {
      resultsList.innerHTML = "";
      resultsList.removeAttribute(
        "data-mode",
      );

      results.hidden = true;
    }
  };

  const renderTagSuggestions = (
    payload,
  ) => {
    const rows =
      Array.isArray(
        payload.results,
      )
        ? payload.results
        : [];

    if (!rows.length) {
      clearTagSuggestions();
      return;
    }

    clearActiveResult();

    resultsList.dataset.mode =
      "tag-suggestions";

    resultsList.innerHTML =
      rows
        .map(
          (item) => `
            <button
              type="button"
              class="search-result tag-suggestion"
              data-tag="${escapeTagHTML(
                item.tag,
              )}"
            >
              <span class="search-result-title">
                ${escapeTagHTML(
                  item.tag,
                )}
              </span>

              <span class="search-result-section">
                ${Number(
                  item.count ?? 0,
                )} note${Number(
                  item.count ?? 0,
                ) === 1 ? "" : "s"}
              </span>
            </button>
          `,
        )
        .join("");

    results.hidden = false;
  };

  const loadTagSuggestions =
    async (
      prefix,
    ) => {
      if (!prefix) {
        clearTagSuggestions();
        return;
      }

      if (tagController) {
        tagController.abort();
      }

      tagController =
        new AbortController();

      const url =
        new URL(
          TAG_ENDPOINT,
        );

      url.searchParams.set(
        "q",
        prefix,
      );

      try {
        const response =
          await fetch(
            url,
            {
              signal:
                tagController.signal,

              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            `Tag endpoint returned ${response.status}`,
          );
        }

        const payload =
          await response.json();

        const currentPrefix =
          getTagPrefix(
            input.value,
          );

        if (
          currentPrefix !== prefix
        ) {
          return;
        }

        renderTagSuggestions(
          payload,
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(error);
        clearTagSuggestions();
      }
    };

  const scheduleTagSuggestions = (
    prefix,
  ) => {
    if (tagTimer) {
      window.clearTimeout(
        tagTimer,
      );
    }

    if (!prefix) {
      clearTagSuggestions();
      return;
    }

    tagTimer =
      window.setTimeout(
        () =>
          loadTagSuggestions(
            prefix,
          ),
        80,
      );
  };

  /*
   * One input owner.
   *
   * While the user is typing an unfinished tag token,
   * autocomplete owns the result area.
   *
   * Once the token is completed with a space,
   * normal /api/search resumes.
   */
  const handleSearchInput = () => {
    const tagPrefix =
      getTagPrefix(
        input.value,
      );

    if (tagPrefix !== null) {
      if (searchTimer) {
        window.clearTimeout(
          searchTimer,
        );
      }

      /*
       * Important:
       * `tag:` by itself renders absolutely nothing.
       */
      if (tagPrefix.length === 0) {
        clearActiveResult();

        resultsList.innerHTML = "";
        resultsList.removeAttribute(
          "data-mode",
        );

        summary.hidden = true;
        results.hidden = true;

        return;
      }

      scheduleTagSuggestions(
        tagPrefix,
      );

      return;
    }

    clearTagSuggestions();
    scheduleSearch();
  };

  input.addEventListener(
    "input",
    handleSearchInput,
  );

  /*
   * Selecting a tag completes the query token.
   * The synthetic input event then returns control
   * to the normal search path.
   */
  resultsList.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          ".tag-suggestion",
        );

      if (!button) {
        return;
      }

      const tag =
        button.dataset.tag;

      if (!tag) {
        return;
      }

      input.value =
        input.value.replace(
          /(?:^|\s)tag:[^\s]*$/i,
          (match) => {
            const leadingSpace =
              match.startsWith(" ")
                ? " "
                : "";

            return `${leadingSpace}tag:${tag} `;
          },
        );

      input.dispatchEvent(
        new Event(
          "input",
          {
            bubbles: true,
          },
        ),
      );

      input.focus();

      input.setSelectionRange(
        input.value.length,
        input.value.length,
      );
    },
  );

  input.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "ArrowDown"
      ) {
        const links =
          getResultLinks();

        if (!links.length) {
          return;
        }

        event.preventDefault();

        setActiveResult(
          activeResultIndex < 0
            ? 0
            : activeResultIndex + 1,
        );

        return;
      }

      if (
        event.key ===
        "ArrowUp"
      ) {
        const links =
          getResultLinks();

        if (!links.length) {
          return;
        }

        event.preventDefault();

        setActiveResult(
          activeResultIndex < 0
            ? links.length - 1
            : activeResultIndex - 1,
        );

        return;
      }

      if (
        event.key === "Enter"
      ) {
        const links =
          getResultLinks();

        if (
          activeResultIndex >= 0 &&
          links[
            activeResultIndex
          ]
        ) {
          event.preventDefault();

          links[
            activeResultIndex
          ].click();
        }

        return;
      }

      if (
        event.key === "Escape"
      ) {
        input.value = "";

        resetResults();
      }
    },
  );

  resultsList.addEventListener(
    "mousemove",
    (event) => {
      const link =
        event.target.closest(
          ".search-result",
        );

      if (!link) {
        return;
      }

      const links =
        getResultLinks();

      const index =
        links.indexOf(link);

      if (
        index >= 0 &&
        index !==
          activeResultIndex
      ) {
        setActiveResult(index);
      }
    },
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        !results.contains(
          event.target,
        ) &&
        event.target !== input
      ) {
        clearActiveResult();

        summary.hidden = true;
        results.hidden = true;
      }
    },
  );
})();
