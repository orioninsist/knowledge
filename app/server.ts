import type { ApplicationContext } from "./context";
import { renderMarkdown } from "./markdown";
import { cards } from "../cards";
import { setActiveCard, getActiveCard } from "../cards/state";

export function startServer(
  app: ApplicationContext,
) {
  const server = Bun.serve({
    port: 3000,

    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/") {
        return new Response(
          `
          <!doctype html>
          <html>
          <head>
            <title>Knowledge</title>
            <style>
              body {
                max-width: 1000px;
                margin: 40px auto;
                font-family: sans-serif;
              }

              .grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-top: 40px;
              }

              .card {
                padding: 35px;
                border-radius: 16px;
                background: #f2f2f2;
                text-align: center;
                font-size: 22px;
                transition: .2s;
              }

              .card:hover {
                background: #222;
                color: white;
              }

              a {
                text-decoration: none;
                color: inherit;
              }
            </style>
          </head>
          <body>

          <script>
            document.addEventListener("keydown", (e) => {
              if (e.altKey && e.key.toLowerCase() === "k") {
                location.href = "/search";
              }

              if (e.altKey && e.key.toLowerCase() === "t") {
                location.href = "/";
              }
            });
          </script>
            <h1>Knowledge</h1>

            <div class="grid">
            ${cards.map(card => `
              <a href="/card?id=${card.id}">
                <div class="card">
                  ${card.title}
                </div>
              </a>
            `).join("")}
            </div>

          </body>
          </html>
          `,
          {
            headers: {
              "content-type": "text/html",
            },
          },
        );
      }

      if (url.pathname === "/card") {
        const id =
          url.searchParams.get("id");

        const card =
          cards.find(
            c => c.id === id,
          );

        if (card) {
          setActiveCard(card.id);
        }

        if (!card) {
          return new Response(
            "card not found",
            { status: 404 },
          );
        }

        return new Response(`
          <html>
          <body>

          <script>
            document.addEventListener("keydown", (e) => {
              if (e.altKey && e.key.toLowerCase() === "k") {
                location.href = "/search";
              }

              if (e.altKey && e.key.toLowerCase() === "t") {
                location.href = "/";
              }
            });
          </script>

            <h1>${card.title}</h1>

            <p>
              Path:
              ${card.path}
            </p>

            <p>
              Alt + K → bu kart içinde ara
            </p>

            <script>
            document.addEventListener(
              "keydown",
              (e) => {
                if (e.altKey && e.key.toLowerCase() === "k") {
                  location.href="/search";
                }

                if (e.altKey && e.key.toLowerCase() === "t") {
                  location.href="/";
                }
              }
            );
            </script>

          </body>
          </html>
        `, {
          headers:{
            "content-type":"text/html",
          },
        });
      }


      if (url.pathname === "/search") {
        return new Response(
          `
          <!doctype html>
          <html>
          <head>
            <title>Knowledge Search</title>
          </head>
          <body>

          <script>
            document.addEventListener("keydown", (e) => {
              if (e.altKey && e.key.toLowerCase() === "k") {
                location.href = "/search";
              }

              if (e.altKey && e.key.toLowerCase() === "t") {
                location.href = "/";
              }
            });
          </script>
            <h1>Search</h1>

            <input id="q" autofocus />

            <div id="results"></div>

            <script>
            document.addEventListener("keydown", (e) => {
              if (e.altKey && e.key.toLowerCase() === "k") {
                location.href = "/search";
              }

              if (e.altKey && e.key.toLowerCase() === "t") {
                location.href = "/";
              }
            });

            const input = document.getElementById("q");
            const results = document.getElementById("results");

            input.oninput = async () => {
              const res = await fetch(
                "/api/search?q=" +
                encodeURIComponent(input.value)
              );

              const data = await res.json();

              results.innerHTML = data.map(item =>
                "<p><a href='/read?path=" +
                encodeURIComponent(item.path) +
                "'>" +
                item.filename +
                "</a></p>"
              ).join("");
            };
            </script>

          </body>
          </html>
          `,
          {
            headers: {
              "content-type": "text/html",
            },
          },
        );
      }

      if (url.pathname === "/api/search") {
        const query =
          url.searchParams.get("q") ?? "";

        const cardId =
          getActiveCard();

        const card =
          cards.find(
            c => c.id === cardId,
          );

        if (!card) {
          return Response.json([]);
        }

        const results =
          await app.knowledge.search(query);

        const filtered =
          results.filter(
            r => r.path.startsWith(card.path),
          );

        return Response.json(filtered);
      }

      if (url.pathname === "/documents") {
        const documents =
          await app.web.documents();

        const html = documents
          .map((doc) => `
            <li>
              <a href="/read?path=${encodeURIComponent(doc.path)}">
                ${doc.workspace}/${doc.filename}
              </a>
            </li>
          `)
          .join("");

        return new Response(`
          <html>
            <body>
              <h1>Documents</h1>
              <ul>
                ${html}
              </ul>
            </body>
          </html>
        `, {
          headers: {
            "content-type": "text/html",
          },
        });
      }


      if (url.pathname === "/read") {
        const path =
          url.searchParams.get("path");

        if (!path) {
          return new Response(
            "missing path",
            { status: 400 },
          );
        }

        const content =
          await app.knowledge.readDocument(path);

        if (!content) {
          return new Response(
            "document not found",
            { status: 404 },
          );
        }

        return new Response(
          `
          <!doctype html>
          <html>
          <head>
            <title>Knowledge Reader</title>
            <style>
              body {
                max-width: 900px;
                margin: 40px auto;
                font-family: sans-serif;
                line-height: 1.6;
              }

              pre {
                background: #222;
                color: white;
                padding: 16px;
                overflow-x: auto;
              }
            </style>
          </head>
          <body>

          <script>
            document.addEventListener("keydown", (e) => {
              if (e.altKey && e.key.toLowerCase() === "k") {
                location.href = "/search";
              }

              if (e.altKey && e.key.toLowerCase() === "t") {
                location.href = "/";
              }
            });
          </script>

          <a href="/">Home</a>

          <article>
            ${renderMarkdown(content)}
          </article>

          </body>
          </html>
          `,
          {
            headers: {
              "content-type": "text/html",
            },
          },
        );
      }

      return new Response(
        "not found",
        { status: 404 },
      );
    },
  });
}
