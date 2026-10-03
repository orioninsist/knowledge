import { scanWorkspace } from "./workspace/scanner";

const files = await scanWorkspace("./");

console.log(files.slice(0, 5));
