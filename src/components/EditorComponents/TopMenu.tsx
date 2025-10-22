"use client";

import React, { useRef } from "react";
import { useEditor } from "@/context/EditorContext";
import { FilePlus, Upload } from "lucide-react";

export default function TopMenu() {
  const { createNewFile, uploadFile } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="h-10 bg-[#2d2d30] border-b border-[#1e1e1e] flex items-center px-4 gap-1">
      <button
        onClick={createNewFile}
        title="New File (Ctrl+N)"
        className="px-2 py-1.5 bg-transparent text-[#cccccc] border-none cursor-pointer flex items-center gap-1.5 text-[13px] transition-colors hover:bg-[#3e3e42]"
      >
        <FilePlus size={16} />
        <span>New File</span>
      </button>

      <button
        onClick={handleUploadClick}
        title="Open File (Ctrl+O)"
        className="px-2 py-1.5 bg-transparent text-[#cccccc] border-none cursor-pointer flex items-center gap-1.5 text-[13px] transition-colors hover:bg-[#3e3e42]"
      >
        <Upload size={16} />
        <span>Open File</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ts,.tsx,.js,.jsx,.json,.html,.css,.md,.txt,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.sql,.xml,.yaml,.yml"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
