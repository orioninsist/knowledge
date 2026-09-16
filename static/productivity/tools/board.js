(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml } = shared;

const BOARD_STORAGE_KEY =
  "knowledge.productivity.board.v1";

const boardColumns = [
  {
    id: "todo",
    title: "Todo",
  },
  {
    id: "in-progress",
    title: "In Progress",
  },
  {
    id: "review",
    title: "Review",
  },
  {
    id: "done",
    title: "Done",
  },
];

const emptyBoardState = () =>
  Object.fromEntries(
    boardColumns.map(
      column => [
        column.id,
        [],
      ]
    )
  );

const isValidBoardCard =
  card =>
    card &&
    typeof card === "object" &&
    typeof card.id === "string" &&
    card.id.length > 0 &&
    typeof card.title === "string" &&
    card.title.trim().length > 0;

const loadBoard = () => {
  const fallback =
    emptyBoardState();

  try {
    const raw =
      localStorage.getItem(
        BOARD_STORAGE_KEY
      );

    if (raw === null) {
      return fallback;
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return fallback;
    }

    const result =
      emptyBoardState();

    const ids =
      new Set();

    for (
      const column
      of boardColumns
    ) {
      const cards =
        parsed[column.id];

      if (!Array.isArray(cards)) {
        return fallback;
      }

      for (const card of cards) {
        if (
          !isValidBoardCard(card) ||
          ids.has(card.id)
        ) {
          return fallback;
        }

        ids.add(card.id);

        result[column.id].push({
          id: card.id,
          title:
            card.title
              .trim()
              .slice(0, 240),
        });
      }
    }

    return result;
  } catch {
    return fallback;
  }
};

const saveBoard =
  board => {
    try {
      localStorage.setItem(
        BOARD_STORAGE_KEY,
        JSON.stringify(board)
      );

      return true;
    } catch {
      return false;
    }
  };

const createBoardCardId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    "card",
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
};

const findBoardCard =
  (board, cardId) => {
    for (
      const column
      of boardColumns
    ) {
      const index =
        board[column.id]
          .findIndex(
            card =>
              card.id === cardId
          );

      if (index !== -1) {
        return {
          columnId:
            column.id,
          index,
          card:
            board[column.id][index],
        };
      }
    }

    return null;
  };

const boardIcon = name => {
  if (name === "edit") {
    return `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 20h9"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
        <path
          d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  return `
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M4 7h16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <path
        d="M9 7V4h6v3"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        d="m6 7 1 13h10l1-13"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
    </svg>
  `;
};

let boardDragCardId = null;

const clearBoardDropState =
  () => {
    workspace
      .querySelectorAll(
        ".board-drop-target"
      )
      .forEach(
        node =>
          node.classList.remove(
            "board-drop-target"
          )
      );
  };

const getBoardDropIndex =
  (list, clientY) => {
    const cards = [
      ...list.querySelectorAll(
        ".board-card:not(.is-dragging)"
      ),
    ];

    for (
      let index = 0;
      index < cards.length;
      index += 1
    ) {
      const rect =
        cards[index]
          .getBoundingClientRect();

      if (
        clientY <
        rect.top +
          rect.height / 2
      ) {
        return index;
      }
    }

    return cards.length;
  };

const renderBoardColumns = () => {
  const boardRoot =
    workspace.querySelector(
      "#board-columns"
    );

  if (!boardRoot) {
    return;
  }

  const board =
    loadBoard();

  boardRoot.innerHTML =
    boardColumns
      .map(column => {
        const cards =
          board[column.id];

        return `
          <section
            class="board-column"
            data-board-column="${escapeHtml(
              column.id
            )}"
          >
            <header
              class="board-column-head"
            >
              <div>
                <h3>
                  ${escapeHtml(
                    column.title
                  )}
                </h3>

                <span>
                  ${cards.length}
                </span>
              </div>

              <button
                class="board-add-button"
                type="button"
                data-board-add="${escapeHtml(
                  column.id
                )}"
                aria-label="Add card to ${escapeHtml(
                  column.title
                )}"
                title="Add card"
              >
                +
              </button>
            </header>

            <div
              class="board-card-list"
              data-board-list="${escapeHtml(
                column.id
              )}"
            >
              ${
                cards.length
                  ? cards
                      .map(
                        card => `
                          <article
                            class="board-card"
                            draggable="true"
                            data-board-card="${escapeHtml(
                              card.id
                            )}"
                          >
                            <div
                              class="board-card-title"
                            >
                              ${escapeHtml(
                                card.title
                              )}
                            </div>

                            <div
                              class="board-card-actions"
                            >
                              <button
                                type="button"
                                data-board-edit="${escapeHtml(
                                  card.id
                                )}"
                                aria-label="Edit card"
                                title="Edit"
                              >
                                ${boardIcon(
                                  "edit"
                                )}
                              </button>

                              <button
                                type="button"
                                data-board-delete="${escapeHtml(
                                  card.id
                                )}"
                                aria-label="Delete card"
                                title="Delete"
                              >
                                ${boardIcon(
                                  "delete"
                                )}
                              </button>
                            </div>
                          </article>
                        `
                      )
                      .join("")
                  : `
                    <div
                      class="board-column-empty"
                    >
                      Drop or add a card
                    </div>
                  `
              }
            </div>
          </section>
        `;
      })
      .join("");
};

const addBoardCard =
  columnId => {
    const column =
      boardColumns.find(
        item =>
          item.id === columnId
      );

    if (!column) {
      return;
    }

    const value =
      window.prompt(
        `Add to ${column.title}`
      );

    if (value === null) {
      return;
    }

    const title =
      value.trim().slice(0, 240);

    if (!title) {
      return;
    }

    const board =
      loadBoard();

    board[columnId].push({
      id: createBoardCardId(),
      title,
    });

    saveBoard(board);
    renderBoardColumns();
  };

const editBoardCard =
  cardId => {
    const board =
      loadBoard();

    const found =
      findBoardCard(
        board,
        cardId
      );

    if (!found) {
      return;
    }

    const value =
      window.prompt(
        "Edit card",
        found.card.title
      );

    if (value === null) {
      return;
    }

    const title =
      value.trim().slice(0, 240);

    if (!title) {
      return;
    }

    found.card.title =
      title;

    saveBoard(board);
    renderBoardColumns();
  };

const deleteBoardCard =
  cardId => {
    const board =
      loadBoard();

    const found =
      findBoardCard(
        board,
        cardId
      );

    if (!found) {
      return;
    }

    if (
      !window.confirm(
        `Delete "${found.card.title}"?`
      )
    ) {
      return;
    }

    board[found.columnId]
      .splice(
        found.index,
        1
      );

    saveBoard(board);
    renderBoardColumns();
  };

const moveBoardCard =
  (
    cardId,
    targetColumnId,
    targetIndex
  ) => {
    const board =
      loadBoard();

    const found =
      findBoardCard(
        board,
        cardId
      );

    if (
      !found ||
      !Object.hasOwn(
        board,
        targetColumnId
      )
    ) {
      return;
    }

    const [card] =
      board[found.columnId]
        .splice(
          found.index,
          1
        );

    let index =
      Number.isInteger(
        targetIndex
      )
        ? targetIndex
        : board[targetColumnId]
            .length;

    if (
      found.columnId ===
        targetColumnId &&
      found.index < index
    ) {
      index -= 1;
    }

    index =
      Math.max(
        0,
        Math.min(
          index,
          board[targetColumnId]
            .length
        )
      );

    board[targetColumnId]
      .splice(
        index,
        0,
        card
      );

    saveBoard(board);
    renderBoardColumns();
  };

const bindBoardEvents = () => {
  workspace.addEventListener(
    "click",
    event => {
      if (
        getTool() !== "board"
      ) {
        return;
      }

      const add =
        event.target.closest(
          "[data-board-add]"
        );

      if (add) {
        addBoardCard(
          add.dataset.boardAdd
        );
        return;
      }

      const edit =
        event.target.closest(
          "[data-board-edit]"
        );

      if (edit) {
        editBoardCard(
          edit.dataset.boardEdit
        );
        return;
      }

      const remove =
        event.target.closest(
          "[data-board-delete]"
        );

      if (remove) {
        deleteBoardCard(
          remove.dataset.boardDelete
        );
      }
    }
  );

  workspace.addEventListener(
    "dragstart",
    event => {
      if (
        getTool() !== "board"
      ) {
        return;
      }

      const card =
        event.target.closest(
          "[data-board-card]"
        );

      if (!card) {
        return;
      }

      boardDragCardId =
        card.dataset.boardCard;

      card.classList.add(
        "is-dragging"
      );

      if (
        event.dataTransfer
      ) {
        event.dataTransfer
          .setData(
            "text/plain",
            boardDragCardId
          );

        event.dataTransfer
          .effectAllowed =
            "move";
      }
    }
  );

  workspace.addEventListener(
    "dragover",
    event => {
      if (
        getTool() !== "board" ||
        !boardDragCardId
      ) {
        return;
      }

      const list =
        event.target.closest(
          "[data-board-list]"
        );

      if (!list) {
        return;
      }

      event.preventDefault();

      clearBoardDropState();

      list.classList.add(
        "board-drop-target"
      );

      if (
        event.dataTransfer
      ) {
        event.dataTransfer
          .dropEffect =
            "move";
      }
    }
  );

  workspace.addEventListener(
    "drop",
    event => {
      if (
        getTool() !== "board"
      ) {
        return;
      }

      const list =
        event.target.closest(
          "[data-board-list]"
        );

      if (!list) {
        return;
      }

      event.preventDefault();

      const cardId =
        boardDragCardId ||
        event.dataTransfer
          ?.getData(
            "text/plain"
          );

      const columnId =
        list.dataset.boardList;

      if (
        cardId &&
        columnId
      ) {
        moveBoardCard(
          cardId,
          columnId,
          getBoardDropIndex(
            list,
            event.clientY
          )
        );
      }

      boardDragCardId = null;
      clearBoardDropState();
    }
  );

  workspace.addEventListener(
    "dragend",
    event => {
      const card =
        event.target.closest(
          "[data-board-card]"
        );

      card?.classList.remove(
        "is-dragging"
      );

      boardDragCardId = null;
      clearBoardDropState();
    }
  );
};


const renderBoard = () => {
  workspace.innerHTML = `
    <section class="board-view">
      <header class="tool-header">
        <div>
          <span class="tool-kicker">
            Board
          </span>

          <h2>
            Board
          </h2>

          <p>
            A quiet four-stage workflow
            stored only in this browser.
          </p>
        </div>

        <span class="board-local-note">
          Local only
        </span>
      </header>

      <div
        id="board-columns"
        class="board-columns"
        aria-label="Kanban board"
      ></div>
    </section>
  `;

  renderBoardColumns();
};


    shared.board = {
      render: renderBoard,
      bindEvents: bindBoardEvents,
    };
  };

  if (window.KnowledgeProductivity) {
    register(window.KnowledgeProductivity);
  } else {
    (window.KnowledgeProductivityQueue =
      window.KnowledgeProductivityQueue || []
    ).push(register);
  }
})();
