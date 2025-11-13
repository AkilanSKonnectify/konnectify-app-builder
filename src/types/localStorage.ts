export type Connection = {
  id: string;
  name: string;
  fields: { [connectionField: string]: string };
  type?: "credentials" | "oauth2";
};

export interface FileData {
  id: string;
  name: string;
  content: string;
  language: string;
  connections: Array<Connection>;
}

export interface EditorState {
  files: FileData[];
  openTabs: string[];
  activeFileId: string | null;
}

export interface EditorContextType {
  files: FileData[];
  openTabs: string[];
  activeFileId: string | null;
  addFile: (file: FileData) => void;
  removeFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  renameFile: (id: string, newName: string) => void;
  openFile: (id: string) => void;
  closeTab: (id: string) => void;
  setActiveFile: (id: string) => void;
  createNewFile: () => void;
  uploadFile: (file: File) => Promise<void>;
  addConnectionsToFile: (id: string, connection: Connection) => void;
  removeConnectionsToFile: (id: string, connectionId: string) => void;
}
