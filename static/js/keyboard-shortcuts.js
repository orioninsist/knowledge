(() => {
  const getSearchInput = () =>
    document.querySelector(
      "#knowledge-search"
    );

  const getPalette = () =>
    document.querySelector(
      "#command-search"
    );

  const openSearch = () => {
    const palette =
      getPalette();

    const input =
      getSearchInput();

    if (
      !palette ||
      !input
    ) {
      return;
    }

    palette.hidden = false;

    document.documentElement
      .classList.add(
        "command-search-open"
      );

    requestAnimationFrame(
      () => {
        input.focus();

        input.setSelectionRange(
          input.value.length,
          input.value.length
        );
      }
    );
  };

  const closeSearch = () => {
    const palette =
      getPalette();

    if (!palette) {
      return;
    }

    palette.hidden = true;

    document.documentElement
      .classList.remove(
        "command-search-open"
      );
  };

  document.addEventListener(
    "keydown",
    (event) => {
      const key =
        event.key.toLowerCase();

      if (key === "escape") {
        closeSearch();
        return;
      }

      if (
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (key === "k") {
        event.preventDefault();
        openSearch();
        return;
      }

      if (key === "h") {
        event.preventDefault();

        window.location.assign(
          "/"
        );
      }
    }
  );
})();
