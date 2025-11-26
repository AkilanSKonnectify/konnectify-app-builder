"use client";

import { Connection, EditorContextType, EditorState, FileData } from "@/types/localStorage";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const STORAGE_KEY = "vscode-editor-state";

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    sql: "sql",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
  };
  return languageMap[ext || ""] || "plaintext";
};

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isMac = navigator.platform.toUpperCase().includes("MAC");

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed: EditorState = JSON.parse(savedState);
        setFiles(parsed.files || []);
        setOpenTabs(parsed.openTabs || []);
        setActiveFileId(parsed.activeFileId || null);
      } catch (error) {
        console.error("Failed to load editor state:", error);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const state: EditorState = {
      files,
      openTabs,
      activeFileId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [files, openTabs, activeFileId, isInitialized]);

  const addFile = useCallback((file: FileData) => {
    setFiles((prev) => {
      if (prev.some((f) => f.id === file.id)) {
        return prev;
      }
      return [...prev, file];
    });
    openFile(file.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    closeTab(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFileContent = useCallback((id: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, content } : f)));
  }, []);

  const renameFile = useCallback((id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const language = getLanguageFromFilename(newName);
          return { ...f, name: newName, language };
        }
        return f;
      })
    );
  }, []);

  const addConnectionsToFile = useCallback((id: string, connection: Connection) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          connection.id = `connection-${Date.now()}-${Math.random()}`;
          const connections = [...f.connections, connection];
          return { ...f, connections: connections };
        }
        return f;
      })
    );
  }, []);

  const removeConnectionsToFile = useCallback((id: string, connectionId: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const connections = f.connections.filter((connection) => connection.id !== connectionId);
          return { ...f, connections: connections };
        }
        return f;
      })
    );
  }, []);

  const openFile = useCallback((id: string) => {
    setOpenTabs((prev) => {
      if (prev.includes(id)) {
        setActiveFileId(id);
        return prev;
      }
      const newTabs = [...prev, id];
      setActiveFileId(id);
      return newTabs;
    });
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setOpenTabs((prev) => {
        const newTabs = prev.filter((tabId) => tabId !== id);
        if (activeFileId === id) {
          setActiveFileId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
        }
        return newTabs;
      });
    },
    [activeFileId]
  );

  const setActiveFileHandler = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  const createNewFile = useCallback(() => {
    const existingUntitled = files.filter((f) => f.name.startsWith("untitled"));
    const nextNumber = existingUntitled.length + 1;
    const newFileName = `untitled${nextNumber}.ts`;

    const newFile: FileData = {
      id: `file-${Date.now()}-${Math.random()}`,
      name: newFileName,
      content: "",
      language: "typescript",
      connections: [],
    };

    addFile(newFile);
  }, [files, addFile]);

  const uploadFile = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        const language = getLanguageFromFilename(file.name);

        const newFile: FileData = {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          content,
          language,
          connections: [],
        };

        addFile(newFile);
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    },
    [addFile]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd && e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNewFile();
      }

      if (ctrlOrCmd && e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".ts,.tsx,.js,.jsx,.json,.html,.css,.md,.txt";
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            await uploadFile(file);
          }
        };
        input.click();
      }

      if (ctrlOrCmd && e.altKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        closeTab(activeFileId!);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewFile, uploadFile]);

  return (
    <EditorContext.Provider
      value={{
        files,
        openTabs,
        activeFileId,
        addFile,
        removeFile,
        updateFileContent,
        renameFile,
        openFile,
        closeTab,
        setActiveFile: setActiveFileHandler,
        createNewFile,
        uploadFile,
        addConnectionsToFile,
        removeConnectionsToFile,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within EditorProvider");
  }
  return context;
};
