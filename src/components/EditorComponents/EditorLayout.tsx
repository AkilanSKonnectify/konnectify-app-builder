"use client";

import React, { useRef } from "react";
import { useEditor } from "@/context/EditorContext";
import TopMenu from "@/components/EditorComponents/TopMenu";
import FileSidebar from "./FileSidebar";
import TabBar from "@/components/EditorComponents/TabBar";
import MonacoEditor from "./MonacoEditor";
import RightPanel from "@/components/Testers/RightPanel";
import { FilePlus, Upload } from "lucide-react";
import LogConsole from "@/components/Logs/LogConsole";

export default function EditorLayout() {
  const { files, activeFileId, updateFileContent, createNewFile, uploadFile } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId);

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
                      onClick={handleUploadClick}
                      className="px-4 py-2.5 bg-[#0e639c] text-white border-none cursor-pointer text-[13px] flex items-center gap-2 rounded-[2px] hover:bg-[#1177bb] transition-colors"
                    >
                      <FilePlus size={16} />
                      Open File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ts,.tsx,.js,.jsx,.json,.html,.css,.md,.txt,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.sql,.xml,.yaml,.yml"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <div className="mt-5 text-xs text-[#6e6e6e]">
                    <div>{isMac ? "Command + Option" : "Ctrl + Alt"} + N - New file</div>
                    <div>{isMac ? "Command + Option" : "Ctrl + Alt"} + O - Open file</div>
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
