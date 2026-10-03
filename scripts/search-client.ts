export const searchClientScript = `
<script>
(() => {
  const modal =
    document.getElementById("command-search");

  const input =
    document.getElementById("knowledge-search");

  if (!modal || !input) {
    return;
  }

  // Always start closed. Only Alt+K can open it.
  modal.hidden = true;
  modal.style.display = "none";

  const open = () => {
    modal.hidden = false;
    modal.style.display = "grid";

    document.documentElement
      .classList.add("command-search-open");

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  };

  const close = () => {
    modal.hidden = true;
    modal.style.display = "none";

    document.documentElement
      .classList.remove("command-search-open");
  };

  const closeButton =
    modal.querySelector("[data-command-search-close]");

  closeButton?.addEventListener(
    "click",
    close,
  );

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.isTrusted &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        modal.hidden
          ? open()
          : close();

        return;
      }

      if (
        event.key === "Escape" &&
        !modal.hidden
      ) {
        close();
      }

    },
  );
})();
</script>
`;
