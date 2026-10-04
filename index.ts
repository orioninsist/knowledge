import { bootstrap } from "./app/bootstrap";

const app = await bootstrap();

console.log("application ready");

process.on("SIGINT", () => {
  app.lifecycle.shutdown();

  process.exit();
});
