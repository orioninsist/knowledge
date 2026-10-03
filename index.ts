import { loadConfig } from "./core/config/loader";

const config = await loadConfig();

console.log(config);
