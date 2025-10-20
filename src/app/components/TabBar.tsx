"use client";

import React from "react";
import { useEditor } from "@/app/context/EditorContext";
import { X } from "lucide-react";

export default function TabBar() {
  const { files, openTabs, activeFileId, setActiveFile, closeTab } = useEditor();

  const getFileById = (id: string) => files.find((f) => f.id === id);

  return (
    <div
      style={{
        height: "35px",
        backgroundColor: "#2d2d30",
        borderBottom: "1px solid #1e1e1e",
        display: "flex",
        alignItems: "stretch",
        overflow: "auto",
      }}
    >
      {openTabs.map((tabId) => {
        const file = getFileById(tabId);
        if (!file) return null;

        const isActive = activeFileId === tabId;

        return (
          <div
            key={tabId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 12px",
              backgroundColor: isActive ? "#1e1e1e" : "#2d2d30",
              borderRight: "1px solid #1e1e1e",
              color: isActive ? "#ffffff" : "#969696",
              cursor: "pointer",
              fontSize: "13px",
              minWidth: "120px",
            }}
          >
            <div onClick={() => setActiveFile(tabId)} style={{ flex: 1 }}>
              {file.name}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tabId);
              }}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
