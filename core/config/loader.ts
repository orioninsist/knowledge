import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import YAML from "yaml";

import { ConfigSchema, type Config } from "./schema";

async function fileExists(
  path: string,
): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(
  filePath = "./config/para.yaml",
): Promise<Config> {
  const baseFile = await readFile(
    filePath,
    "utf-8",
  );

  const baseConfig = YAML.parse(baseFile);

  const localPath = filePath.replace(
    ".yaml",
    ".local.yaml",
  );

  let mergedConfig = baseConfig;

  if (await fileExists(localPath)) {
    const localFile = await readFile(
      localPath,
      "utf-8",
    );

    const localConfig = YAML.parse(localFile);

    mergedConfig = {
      ...baseConfig,
      ...localConfig,
      workspaces:
        localConfig.workspaces ??
        baseConfig.workspaces,
    };
  }

  return ConfigSchema.parse(
    mergedConfig,
  );
}
