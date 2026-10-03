import { mkdir } from "node:fs/promises";

export async function ensureStorage(
  path: string,
): Promise<string> {
  await mkdir(path, {
    recursive: true,
  });

  return path;
}
