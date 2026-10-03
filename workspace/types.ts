export interface Workspace {
  name: string;
  path: string;
  exists: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  extension: string;
}
