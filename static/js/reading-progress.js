(() => {
  const STORAGE_PREFIX = "knowledge:reading:";
  const SAVE_INTERVAL = 180;

  const isNotePage = () =>
    document.querySelector("article.note") !== null;

  if (!isNotePage()) {
    return;
  }

  const key =
    STORAGE_PREFIX +
    window.location.pathname;

  const progressBar = document.createElement("div");
  progressBar.className = "reading-progress";

  const progressInner = document.createElement("div");
  progressInner.className = "reading-progress-inner";

  progressBar.appendChild(progressInner);
  document.body.appendChild(progressBar);

  const getScrollableHeight = () =>
    Math.max(
      0,
      document.documentElement.scrollHeight -
        window.innerHeight
    );

  const getProgress = () => {
    const maxScroll = getScrollableHeight();

    if (maxScroll <= 0) {
      return 1;
    }

    return Math.min(
      1,
      Math.max(
        0,
        window.scrollY / maxScroll
      )
    );
  };

  const setProgressBar = (progress) => {
    progressInner.style.transform =
      `scaleX(${progress})`;
  };

  const save = () => {
    const progress = getProgress();

    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          progress,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // localStorage unavailable: fail silently
    }
  };

  const restore = () => {
    if (window.location.hash) {
      return;
    }

    let saved = null;

    try {
      saved = localStorage.getItem(key);
    } catch {
      return;
    }

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (
        typeof parsed.progress !== "number" ||
        parsed.progress <= 0 ||
        parsed.progress >= 0.995
      ) {
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const maxScroll = getScrollableHeight();

          if (maxScroll <= 0) {
            return;
          }

          window.scrollTo({
            top: maxScroll * parsed.progress,
            behavior: "auto",
          });
        });
      });
    } catch {
      // malformed saved state: ignore
    }
  };

  let timer = null;

  const scheduleSave = () => {
    setProgressBar(getProgress());

    if (timer) {
      return;
    }

    timer = window.setTimeout(() => {
      timer = null;
      save();
    }, SAVE_INTERVAL);
  };

  window.addEventListener(
    "scroll",
    scheduleSave,
    { passive: true }
  );

  window.addEventListener(
    "resize",
    () => {
      setProgressBar(getProgress());
    }
  );

  window.addEventListener(
    "beforeunload",
    save
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        save();
      }
    }
  );

  window.addEventListener(
    "pageshow",
    () => {
      restore();
      setProgressBar(getProgress());
    },
    { once: true }
  );
})();
