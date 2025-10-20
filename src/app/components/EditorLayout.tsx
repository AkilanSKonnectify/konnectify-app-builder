"use client";

import React from "react";
import { useEditor } from "@/app/context/EditorContext";
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
    <div className="h-screen flex flex-col">
      <TopMenu />

      <div className="flex-1 flex overflow-hidden">
        <FileSidebar />

        <div className="flex-1 flex flex-col">
          <TabBar />

          <div className="flex-1 bg-[#1e1e1e]">
            {activeFile ? (
              <MonacoEditor
                fileId={activeFile.id}
                code={activeFile.content}
                onChange={handleEditorChange}
                filename={activeFile.name}
                language={activeFile.language}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#858585]">
                <div className="text-center max-w-[400px]">
                  <h2 className="text-xl mb-3 text-[#cccccc] font-normal">No file open</h2>
                  <p className="text-[13px] mb-6 leading-[1.6]">
                    Create a new file or upload an existing one to get started
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button
                      onClick={createNewFile}
                      className="px-4 py-2.5 bg-[#0e639c] text-white border-none cursor-pointer text-[13px] flex items-center gap-2 rounded-[2px] hover:bg-[#1177bb] transition-colors"
                    >
                      <FilePlus size={16} />
                      New File
                    </button>
                    <button
                      onClick={createNewFile}
                      className="px-4 py-2.5 bg-[#0e639c] text-white border-none cursor-pointer text-[13px] flex items-center gap-2 rounded-[2px] hover:bg-[#1177bb] transition-colors"
                    >
                      <FilePlus size={16} />
                      New File
                    </button>
                  </div>
                  <div className="mt-5 text-xs text-[#6e6e6e]">
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
