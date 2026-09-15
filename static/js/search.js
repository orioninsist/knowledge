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

  const filterFolder =
    document.getElementById(
      "search-filter-folder"
    );

  const filterFilename =
    document.getElementById(
      "search-filter-filename"
    );

  const filterTitle =
    document.getElementById(
      "search-filter-title"
    );

  const filterDescription =
    document.getElementById(
      "search-filter-description"
    );

  const filterStatus =
    document.getElementById(
      "search-filter-status"
    );

  const filterAlias =
    document.getElementById(
      "search-filter-alias"
    );

  const filterTag =
    document.getElementById(
      "search-filter-tag"
    );

  const filterClear =
    document.getElementById(
      "search-filter-clear"
    );

  if (
    !input ||
    !results ||
    !summary ||
    !resultsList ||
    !filterFolder ||
    !filterFilename ||
    !filterTitle ||
    !filterDescription ||
    !filterStatus ||
    !filterAlias ||
    !filterTag ||
    !filterClear
  ) {
    return;
  }

  let activeResultIndex = -1;
  let searchTimer = null;
  let requestController = null;

  let loadedResults = [];
  let currentQuery = "";
  let currentFilters = {
    folders: [],
    filename: "",
    title: "",
    description: "",
    statuses: [],
    aliases: [],
    tags: [],
  };
  let nextOffset = null;
  let totalResults = 0;
  let isLoadingMore = false;

  const splitFilterValues = (
    value,
  ) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const getFilters = () => ({
    folders:
      splitFilterValues(
        filterFolder.value,
      ),

    filename:
      filterFilename.value.trim(),

    title:
      filterTitle.value.trim(),

    description:
      filterDescription.value.trim(),

    statuses:
      splitFilterValues(
        filterStatus.value,
      ),

    aliases:
      splitFilterValues(
        filterAlias.value,
      ),

    tags:
      splitFilterValues(
        filterTag.value,
      ),
  });

  const hasFilters = (filters) =>
    Boolean(
      filters.folders.length ||
      filters.filename ||
      filters.title ||
      filters.description ||
      filters.statuses.length ||
      filters.aliases.length ||
      filters.tags.length
    );

  const buildSearchURL = (
    query,
    filters,
    offset = 0,
  ) => {
    const url =
      new URL(
        SEARCH_ENDPOINT,
      );

    if (query) {
      url.searchParams.set(
        "q",
        query,
      );
    }

    for (const folder of filters.folders) {
      url.searchParams.append(
        "folder",
        folder,
      );
    }

    if (filters.filename) {
      url.searchParams.set(
        "filename",
        filters.filename,
      );
    }

    if (filters.title) {
      url.searchParams.set(
        "title",
        filters.title,
      );
    }

    if (filters.description) {
      url.searchParams.set(
        "description",
        filters.description,
      );
    }

    for (const status of filters.statuses) {
      url.searchParams.append(
        "status",
        status,
      );
    }

    for (const alias of filters.aliases) {
      url.searchParams.append(
        "alias",
        alias,
      );
    }

    for (const tag of filters.tags) {
      url.searchParams.append(
        "tag",
        tag,
      );
    }

    if (offset > 0) {
      url.searchParams.set(
        "offset",
        String(offset),
      );
    }

    return url;
  };

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

    loadedResults = [];
    currentQuery = "";
    currentFilters = {
      folders: [],
      filename: "",
      title: "",
      description: "",
      statuses: [],
      aliases: [],
      tags: [],
    };
    nextOffset = null;
    totalResults = 0;
    isLoadingMore = false;
  };

  const render = (
    payload,
  ) => {
    clearActiveResult();

    const count =
      Number(
        payload.total ??
        payload.count ??
        0,
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
      const folder
      of filters.folders ?? []
    ) {
      summaryParts.push(
        `folder: ${folder}`,
      );
    }

    if (filters.filename) {
      summaryParts.push(
        `filename: ${filters.filename}`,
      );
    }

    if (filters.title) {
      summaryParts.push(
        `title: ${filters.title}`,
      );
    }

    if (filters.description) {
      summaryParts.push(
        `description: ${filters.description}`,
      );
    }

    for (
      const status
      of filters.statuses ?? []
    ) {
      summaryParts.push(
        `status: ${status}`,
      );
    }

    for (
      const alias
      of filters.aliases ?? []
    ) {
      summaryParts.push(
        `alias: ${alias}`,
      );
    }

    for (
      const tag
      of filters.tags ?? []
    ) {
      summaryParts.push(
        `tag: ${tag}`,
      );
    }

    summary.textContent =
      summaryParts.join(" · ");

    summary.hidden = false;

    const rows =
      loadedResults;

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

    if (
      nextOffset !== null &&
      loadedResults.length < totalResults
    ) {
      resultsList.insertAdjacentHTML(
        "beforeend",
        `
          <button
            type="button"
            class="search-load-more"
            data-search-load-more
          >
            Load more — ${
              Math.max(
                0,
                totalResults -
                loadedResults.length,
              )
            } remaining
          </button>
        `,
      );
    }

    results.hidden = false;
  };

  const runSearch =
    async () => {
      const query =
        input.value.trim();

      const filters =
        getFilters();

      if (
        !query &&
        !hasFilters(filters)
      ) {
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
          buildSearchURL(
            query,
            filters,
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

        currentQuery = query;
        currentFilters = {
          folders: [
            ...filters.folders,
          ],
          filename:
            filters.filename,
          title:
            filters.title,
          description:
            filters.description,
          statuses: [
            ...filters.statuses,
          ],
          aliases: [
            ...filters.aliases,
          ],
          tags: [
            ...filters.tags,
          ],
        };

        loadedResults =
          Array.isArray(
            payload.results,
          )
            ? payload.results
            : [];

        totalResults =
          Number(
            payload.total ??
            loadedResults.length,
          );

        nextOffset =
          payload.hasMore
            ? Number(
                payload.nextOffset,
              )
            : null;

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


  const handleSearchInput = () => {
    scheduleSearch();
  };

  input.addEventListener(
    "input",
    handleSearchInput,
  );

  const filterInputs = [
    filterFolder,
    filterFilename,
    filterTitle,
    filterDescription,
    filterStatus,
    filterAlias,
    filterTag,
  ];

  for (const filterInput of filterInputs) {
    filterInput.addEventListener(
      "input",
      scheduleSearch,
    );
  }

  filterClear.addEventListener(
    "click",
    () => {
      for (
        const filterInput
        of filterInputs
      ) {
        filterInput.value = "";
      }

      scheduleSearch();
    },
  );

  /*
   * Selecting a tag completes the query token.
   * The synthetic input event then returns control
   * to the normal search path.
   */
  resultsList.addEventListener(
    "click",
    async (event) => {
      const loadMore =
        event.target.closest(
          "[data-search-load-more]",
        );

      if (loadMore) {
        if (
          isLoadingMore ||
          nextOffset === null ||
          (
            !currentQuery &&
            !hasFilters(
              currentFilters,
            )
          )
        ) {
          return;
        }

        isLoadingMore = true;
        loadMore.disabled = true;

        try {
          const url =
            buildSearchURL(
              currentQuery,
              currentFilters,
              nextOffset,
            );

          const response =
            await fetch(
              url,
              {
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

          const more =
            Array.isArray(
              payload.results,
            )
              ? payload.results
              : [];

          const known =
            new Set(
              loadedResults.map(
                (item) => item.url,
              ),
            );

          for (const item of more) {
            if (!known.has(item.url)) {
              loadedResults.push(item);
              known.add(item.url);
            }
          }

          totalResults =
            Number(
              payload.total ??
              totalResults,
            );

          nextOffset =
            payload.hasMore
              ? Number(
                  payload.nextOffset,
                )
              : null;

          render({
            ...payload,
            total: totalResults,
          });
        } catch (error) {
          console.error(error);
          loadMore.disabled = false;
        } finally {
          isLoadingMore = false;
        }

        return;
      }

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
