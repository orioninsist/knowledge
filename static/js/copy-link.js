(() => {
  const buttons = document.querySelectorAll("[data-copy-note-link]");

  if (!buttons.length) {
    return;
  }

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const success = document.execCommand("copy");

    textarea.remove();

    if (!success) {
      throw new Error("Copy command failed.");
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const originalLabel = button.textContent;

      try {
        await copyText(window.location.href);

        button.textContent = "Copied";
        button.classList.add("is-copied");

        window.setTimeout(() => {
          button.textContent = originalLabel;
          button.classList.remove("is-copied");
        }, 1400);
      } catch (error) {
        console.error(error);

        button.textContent = "Copy failed";

        window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1600);
      }
    });
  });
})();
