const API_BASE =
  `${location.protocol}//${location.hostname}:8788`;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const showError = (
  element,
  error,
) => {
  element.innerHTML =
    `<pre class="visual-error">${escapeHtml(error)}</pre>`;
};

const renderCompiledVisual = async (
  element,
) => {
  const language =
    element.dataset.visualLanguage;

  const source =
    element.textContent ?? "";

  try {
    const response =
      await fetch(
        `${API_BASE}/api/render/${language}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            source,
          }),
        },
      );

    if (!response.ok) {
      throw new Error(
        await response.text()
      );
    }

    element.innerHTML =
      await response.text();

    element.classList.add(
      "visual-rendered"
    );
  } catch (error) {
    showError(
      element,
      error
    );
  }
};

const renderMermaid = async () => {
  const blocks =
    [
      ...document.querySelectorAll(
        '[data-visual-language="mermaid"]'
      ),
    ];

  if (!blocks.length) {
    return;
  }

  const module =
    await import(
      "/js/vendor/mermaid.bundle.mjs"
    );

  const mermaid =
    module.default;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "dark",
  });

  let index = 0;

  for (
    const element
    of blocks
  ) {
    const source =
      element.textContent ?? "";

    try {
      const result =
        await mermaid.render(
          `knowledge-mermaid-${index++}`,
          source,
        );

      element.innerHTML =
        result.svg;

      element.classList.add(
        "visual-rendered"
      );
    } catch (error) {
      showError(
        element,
        error
      );
    }
  }
};

const main = async () => {
  try {
    await renderMermaid();
  } catch (error) {
    const blocks =
      document.querySelectorAll(
        '[data-visual-language="mermaid"]'
      );

    for (
      const element
      of blocks
    ) {
      showError(
        element,
        error
      );
    }
  }

  const compiled =
    [
      ...document.querySelectorAll(
        '[data-visual-language="d2"], [data-visual-language="typst"]'
      ),
    ];

  await Promise.all(
    compiled.map(
      renderCompiledVisual
    )
  );
};

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    main,
    {
      once: true,
    },
  );
} else {
  main();
}
