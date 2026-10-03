(() => {

  const getSearch = () =>
    document.querySelector("#command-search");

  const getInput = () =>
    document.querySelector("#knowledge-search");


  const openSearch = () => {

    const box = getSearch();
    const input = getInput();

    if (!box || !input) {
      return;
    }

    box.hidden = false;

    requestAnimationFrame(() => {
      input.focus();
    });

  };


  const closeSearch = () => {

    const box = getSearch();

    if (!box) {
      return;
    }

    box.hidden = true;

  };


  document.addEventListener("keydown", (event) => {

    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key.toLowerCase() === "k"
    ) {

      event.preventDefault();

      openSearch();

      return;
    }


    if (event.key === "Escape") {

      closeSearch();

    }

  });


})();
