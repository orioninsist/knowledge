import { bootstrap } from "./app/bootstrap";
import { createLifecycle } from "./app/lifecycle";

const app = await bootstrap();

const lifecycle = createLifecycle(app);

console.log("application ready");

process.on("SIGINT", () => {
  lifecycle.shutdown();

  process.exit();
});
