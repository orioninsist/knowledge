(() => {
  const root =
    document.getElementById(
      "knowledge-stats"
    );

  if (!root) {
    return;
  }

  const apiBase =
    document
      .querySelector(
        'meta[name="knowledge-search-api"]'
      )
      ?.getAttribute("content")
      ?.replace(/\/$/, "");

  if (!apiBase) {
    return;
  }

  const setText = (
    id,
    value,
  ) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        String(value);
    }
  };

  const formatBytes = (
    bytes,
  ) => {
    const value =
      Number(bytes) || 0;

    if (value < 1024) {
      return `${value} B`;
    }

    if (value < 1024 ** 2) {
      return `${(
        value / 1024
      ).toFixed(1)} KB`;
    }

    if (value < 1024 ** 3) {
      return `${(
        value / 1024 ** 2
      ).toFixed(1)} MB`;
    }

    return `${(
      value / 1024 ** 3
    ).toFixed(2)} GB`;
  };

  const load = async () => {
    try {
      const response =
        await fetch(
          `${apiBase}/api/stats`,
          {
            cache: "no-store",
          },
        );

      if (!response.ok) {
        return;
      }

      const stats =
        await response.json();

      setText(
        "stat-total-notes",
        stats.totalNotes,
      );

      setText(
        "stat-inbox",
        stats.sections?.inbox ?? 0,
      );

      setText(
        "stat-projects",
        stats.sections?.projects ?? 0,
      );

      setText(
        "stat-areas",
        stats.sections?.areas ?? 0,
      );

      setText(
        "stat-resources",
        stats.sections?.resources ?? 0,
      );

      setText(
        "stat-archives",
        stats.sections?.archives ?? 0,
      );

      setText(
        "stat-unique-tags",
        stats.uniqueTags ?? 0,
      );

      setText(
        "stat-tag-uses",
        stats.tagUses ?? 0,
      );

      setText(
        "stat-status-todo",
        stats.statuses?.todo ?? 0,
      );

      setText(
        "stat-status-in-progress",
        stats.statuses?.inProgress ?? 0,
      );

      setText(
        "stat-status-review",
        stats.statuses?.review ?? 0,
      );

      setText(
        "stat-status-done",
        stats.statuses?.done ?? 0,
      );

      setText(
        "stat-total-size",
        formatBytes(
          stats.totalSize,
        ),
      );
    } catch {
      /*
       * Statistics are informational only.
       * They must never break the homepage.
       */
    }
  };

  load();
})();
