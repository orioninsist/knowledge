import { searchClientScript } from "./search-client";

export const searchStyle = `
<style>

.command-search[hidden] {
  display: none;
}

.command-search {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: grid;
  place-items: start center;
  padding-top: 10vh;
}

.command-search-backdrop {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 65%);
}

.command-search-panel {
  position: relative;
  width: min(720px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--page);
  box-shadow: 0 20px 70px rgb(0 0 0 / 45%);
}

.command-search-input {
  box-sizing: border-box;
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid var(--border);
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 15px;
}

.command-search-hint {
  padding: 12px 16px;
  color: var(--muted);
  font-size: 13px;
}

.command-search-results {
  max-height: 62vh;
  overflow-y: auto;
}

.command-search-results a {
  display: block;
  padding: 13px 15px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
}

.command-search-results a:hover {
  background: var(--surface);
}

.command-search-open {
  overflow: hidden;
}

</style>
`;

export function renderSearchBox(
  placeholder: string,
  description: string,
): string {
  return `
<div id="command-search" class="command-search" hidden>
  <div
    class="command-search-backdrop"
    data-command-search-close
  ></div>

  <section
    class="command-search-panel"
    role="dialog"
    aria-modal="true"
  >
    <input
      id="knowledge-search"
      class="command-search-input"
      type="search"
      placeholder="${placeholder}"
      autocomplete="off"
      spellcheck="false"
    >

    <div class="command-search-hint">
      ${description}
    </div>

    ${searchClientScript}
  </section>
</div>
`;
}
