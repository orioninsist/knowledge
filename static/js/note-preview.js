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

  const NOTE_ENDPOINT =
    `${API_BASE}/api/note`;

  const NOTE_PREFIXES = [
    "/inbox/",
    "/projects/",
    "/areas/",
    "/resources/",
    "/archives/",
  ];

  let preview = null;
  let activeLink = null;
  let showTimer = null;
  let hideTimer = null;
  let requestController = null;

  const cache = new Map();

  const normalizePath = (href) => {
    try {
      const url = new URL(
        href,
        window.location.href
      );

      if (
        url.origin !==
        window.location.origin
      ) {
        return null;
      }

      return url.pathname.endsWith("/")
        ? url.pathname
        : `${url.pathname}/`;
    } catch {
      return null;
    }
  };

  const parseNotePath = (href) => {
    const path =
      normalizePath(href);

    if (!path) {
      return null;
    }

    const match = path.match(
      /^\/(inbox|projects|areas|resources|archives)\/([^/]+)\/$/
    );

    if (!match) {
      return null;
    }

    return {
      path,
      section:
        match[1],
      slug:
        decodeURIComponent(
          match[2]
        ),
    };
  };

  const isPotentialNoteLink = (
    anchor
  ) => {
    if (
      !(
        anchor instanceof
        HTMLAnchorElement
      )
    ) {
      return false;
    }

    const path =
      normalizePath(
        anchor.href
      );

    if (!path) {
      return false;
    }

    return NOTE_PREFIXES.some(
      (prefix) =>
        path.startsWith(prefix)
    );
  };

  const getPreview = () => {
    if (preview) {
      return preview;
    }

    preview =
      document.createElement(
        "aside"
      );

    preview.id =
      "note-preview";

    preview.className =
      "note-preview";

    preview.setAttribute(
      "role",
      "tooltip"
    );

    preview.hidden = true;

    document.body.appendChild(
      preview
    );

    preview.addEventListener(
      "mouseenter",
      () => {
        window.clearTimeout(
          hideTimer
        );
      }
    );

    preview.addEventListener(
      "mouseleave",
      () => {
        scheduleHide();
      }
    );

    return preview;
  };

  const escapeHTML = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll(
        "'",
        "&#039;"
      );

  const fetchNote = async (
    reference
  ) => {
    if (
      cache.has(
        reference.path
      )
    ) {
      return cache.get(
        reference.path
      );
    }

    if (requestController) {
      requestController.abort();
    }

    requestController =
      new AbortController();

    const url =
      new URL(
        NOTE_ENDPOINT
      );

    url.searchParams.set(
      "section",
      reference.section
    );

    url.searchParams.set(
      "slug",
      reference.slug
    );

    const response =
      await fetch(
        url,
        {
          signal:
            requestController.signal,

          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      if (
        response.status === 404
      ) {
        return null;
      }

      throw new Error(
        `Preview endpoint returned ${response.status}`
      );
    }

    const note =
      await response.json();

    cache.set(
      reference.path,
      note
    );

    return note;
  };

  const positionPreview = (
    link
  ) => {
    const card =
      getPreview();

    const rect =
      link.getBoundingClientRect();

    const margin = 12;
    const viewportPadding = 12;

    const cardWidth =
      Math.min(
        420,
        window.innerWidth -
          viewportPadding * 2
      );

    card.style.width =
      `${cardWidth}px`;

    let left =
      rect.left;

    let top =
      rect.bottom + margin;

    if (
      left + cardWidth >
      window.innerWidth -
        viewportPadding
    ) {
      left =
        window.innerWidth -
        cardWidth -
        viewportPadding;
    }

    if (
      left <
      viewportPadding
    ) {
      left =
        viewportPadding;
    }

    card.style.left =
      `${left}px`;

    card.style.top =
      `${top}px`;

    const cardRect =
      card.getBoundingClientRect();

    if (
      cardRect.bottom >
      window.innerHeight -
        viewportPadding
    ) {
      top =
        rect.top -
        cardRect.height -
        margin;

      if (
        top <
        viewportPadding
      ) {
        top =
          viewportPadding;
      }

      card.style.top =
        `${top}px`;
    }
  };

  const showPreview = async (
    link
  ) => {
    const reference =
      parseNotePath(
        link.href
      );

    if (!reference) {
      return;
    }

    activeLink = link;

    try {
      const note =
        await fetchNote(
          reference
        );

      if (
        activeLink !== link ||
        !note
      ) {
        return;
      }

      const card =
        getPreview();

      card.innerHTML = `
        <div class="note-preview-section">
          ${escapeHTML(
            note.section
          )}
        </div>

        <div class="note-preview-title">
          ${escapeHTML(
            note.title
          )}
        </div>

        <div class="note-preview-content">
          ${escapeHTML(
            note.summary
          )}
        </div>
      `;

      card.hidden = false;

      positionPreview(
        link
      );

      link.setAttribute(
        "aria-describedby",
        "note-preview"
      );
    } catch (error) {
      if (
        error instanceof
          DOMException &&
        error.name ===
          "AbortError"
      ) {
        return;
      }

      console.error(error);
    }
  };

  const hidePreview = () => {
    window.clearTimeout(
      showTimer
    );

    if (activeLink) {
      activeLink.removeAttribute(
        "aria-describedby"
      );
    }

    activeLink = null;

    if (preview) {
      preview.hidden = true;
    }
  };

  const scheduleHide = () => {
    window.clearTimeout(
      hideTimer
    );

    hideTimer =
      window.setTimeout(
        hidePreview,
        120
      );
  };

  document.addEventListener(
    "mouseover",
    (event) => {
      const link =
        event.target.closest(
          "a"
        );

      if (
        !isPotentialNoteLink(
          link
        )
      ) {
        return;
      }

      if (
        event.relatedTarget &&
        link.contains(
          event.relatedTarget
        )
      ) {
        return;
      }

      window.clearTimeout(
        hideTimer
      );

      window.clearTimeout(
        showTimer
      );

      showTimer =
        window.setTimeout(
          () => {
            showPreview(
              link
            );
          },
          220
        );
    }
  );

  document.addEventListener(
    "mouseout",
    (event) => {
      const link =
        event.target.closest(
          "a"
        );

      if (
        !link ||
        link !== activeLink
      ) {
        window.clearTimeout(
          showTimer
        );

        return;
      }

      if (
        event.relatedTarget &&
        (
          link.contains(
            event.relatedTarget
          ) ||
          getPreview().contains(
            event.relatedTarget
          )
        )
      ) {
        return;
      }

      scheduleHide();
    }
  );

  document.addEventListener(
    "focusin",
    (event) => {
      const link =
        event.target.closest(
          "a"
        );

      if (
        !isPotentialNoteLink(
          link
        )
      ) {
        return;
      }

      window.clearTimeout(
        hideTimer
      );

      showPreview(
        link
      );
    }
  );

  document.addEventListener(
    "focusout",
    (event) => {
      const link =
        event.target.closest(
          "a"
        );

      if (
        link &&
        link === activeLink
      ) {
        scheduleHide();
      }
    }
  );

  window.addEventListener(
    "scroll",
    hidePreview,
    {
      passive: true,
    }
  );

  window.addEventListener(
    "resize",
    hidePreview
  );
})();
