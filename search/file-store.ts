import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { SearchDocument } from "./types";

export class FileSearchStore {
  private documents = new Map<string, SearchDocument>();

  constructor(
    private filePath: string,
  ) {}

  async load(): Promise<void> {
    try {
      const file = await readFile(
        this.filePath,
        "utf-8",
      );

      const documents =
        JSON.parse(file) as SearchDocument[];

      this.documents = new Map(
        documents.map((doc) => [
          doc.path,
          doc,
        ]),
      );
    } catch {
      this.documents = new Map();
    }
  }

  async add(
    document: SearchDocument,
  ): Promise<void> {
    this.documents.set(
      document.path,
      document,
    );

    await this.save();
  }

  async remove(
    path: string,
  ): Promise<void> {
    this.documents.delete(path);

    await this.save();
  }

  all(): SearchDocument[] {
    return Array.from(
      this.documents.values(),
    );
  }

  private async save(): Promise<void> {
    await mkdir(
      dirname(this.filePath),
      {
        recursive: true,
      },
    );

    await writeFile(
      this.filePath,
      JSON.stringify(
        this.all(),
        null,
        2,
      ),
      "utf-8",
    );
  }
}
