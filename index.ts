import { bootstrap } from "./app/bootstrap";

const app = await bootstrap();

console.log("application ready");

process.on("SIGINT", () => {
  for (const watcher of app.watchers) {
    watcher.close();
  }

  process.exit();
});
