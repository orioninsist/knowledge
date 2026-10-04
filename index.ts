import { bootstrap } from "./app/bootstrap";

const app = await bootstrap();

console.log("knowledge system ready");

const args = process.argv.slice(2);

if (args[0] === "workspaces") {
  console.log(
    app.knowledge.listWorkspaces(),
  );
}

if (args[0] === "search" && args[1]) {
  const results =
    await app.knowledge.search(args.slice(1).join(" "));

  for (const result of results) {
    console.log(
      `${result.workspace}/${result.filename}`,
    );
  }
}

if (args[0] === "read" && args[1]) {
  const content =
    await app.knowledge.readDocument(args[1]);

  console.log(
    content ?? "document not found",
  );
}

process.on("SIGINT", () => {
  app.lifecycle.shutdown();
  process.exit();
});
