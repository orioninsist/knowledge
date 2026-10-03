import { readFile } from "node:fs/promises";
import YAML from "yaml";

import { ConfigSchema, type Config } from "./schema";

export async function loadConfig(
  filePath = "./config/para.yaml",
): Promise<Config> {
  const file = await readFile(filePath, "utf-8");

  const raw = YAML.parse(file);

  return ConfigSchema.parse(raw);
}
