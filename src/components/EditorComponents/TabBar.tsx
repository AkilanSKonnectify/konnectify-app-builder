"use client";

import React from "react";
import { useEditor } from "@/context/EditorContext";
import { X } from "lucide-react";

export default function TabBar() {
  const { files, openTabs, activeFileId, setActiveFile, closeTab } = useEditor();

  const getFileById = (id: string) => files.find((f) => f.id === id);

  return (
    <div className="h-[35px] bg-[#2d2d30] border-b border-[#1e1e1e] flex items-stretch overflow-auto">
      {openTabs.map((tabId) => {
        const file = getFileById(tabId);
        if (!file) return null;

        const isActive = activeFileId === tabId;

        return (
          <div
            key={tabId}
            className={`flex items-center gap-2 px-3 border-r border-[#1e1e1e] cursor-pointer text-[13px] min-w-[120px] ${
              isActive ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d30] text-[#969696]"
            }`}
          >
            <div onClick={() => setActiveFile(tabId)} className="flex-1">
              {file.name}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tabId);
              }}
              className="bg-none border-none text-inherit cursor-pointer p-0.5 flex items-center"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
