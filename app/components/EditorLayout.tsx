"use client";

import React from "react";
import { useEditor } from "../context/EditorContext";
import TopMenu from "./TopMenu";
import FileSidebar from "./FileSidebar";
import TabBar from "./TabBar";
import MonacoEditor from "./MonacoEditor";
import RightPanel from "./RightPanel";
import { FilePlus, Upload } from "lucide-react";

export default function EditorLayout() {
  const { files, activeFileId, updateFileContent, createNewFile } = useEditor();

  const activeFile = files.find((f) => f.id === activeFileId);

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopMenu />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <FileSidebar />

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <TabBar />

          <div style={{ flex: 1, backgroundColor: "#1e1e1e" }}>
            {activeFile ? (
              <MonacoEditor
                fileId={activeFile.id}
                code={activeFile.content}
                onChange={handleEditorChange}
                filename={activeFile.name}
                language={activeFile.language}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#858585",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    maxWidth: "400px",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "20px",
                      marginBottom: "12px",
                      color: "#cccccc",
                      fontWeight: "normal",
                    }}
                  >
                    No file open
                  </h2>
                  <p
                    style={{
                      fontSize: "13px",
                      marginBottom: "24px",
                      lineHeight: "1.6",
                    }}
                  >
                    Create a new file or upload an existing one to get started
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={createNewFile}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#0e639c",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        borderRadius: "2px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1177bb")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0e639c")}
                    >
                      <FilePlus size={16} />
                      New File
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: "20px",
                      fontSize: "12px",
                      color: "#6e6e6e",
                    }}
                  >
                    <div>{isMac ? "Command" : "Ctrl"} + Alt + N - New file</div>
                    <div>{isMac ? "Command" : "Ctrl"} + Alt + O - Open file</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <RightPanel />
      </div>
    </div>
  );
}
