"use client";

import React, { useState } from "react";
import { useEditor } from "@/context/EditorContext";
import { File, Trash2 } from "lucide-react";

export default function FileSidebar() {
  const { files, openFile, activeFileId, renameFile, removeFile } = useEditor();
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleDoubleClick = (fileId: string, currentName: string) => {
    setRenamingFileId(fileId);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = (fileId: string) => {
    if (renameValue.trim() && renameValue !== files.find((f) => f.id === fileId)?.name) {
      renameFile(fileId, renameValue.trim());
    }
    setRenamingFileId(null);
    setRenameValue("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === "Enter") {
      handleRenameSubmit(fileId);
    } else if (e.key === "Escape") {
      setRenamingFileId(null);
      setRenameValue("");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this file?")) {
      removeFile(fileId);
    }
  };

  return (
    <div className="w-[250px] bg-[#252526] border-r border-[#1e1e1e] h-full overflow-auto flex-shrink-0">
      <div className="px-4 py-2 text-[#cccccc] text-[11px] font-bold uppercase tracking-[0.5px]">Explorer</div>
      <div>
        {files.length === 0 ? (
          <div className="p-4 text-[#858585] text-xs text-center">No files open</div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              onClick={() => !renamingFileId && openFile(file.id)}
              onDoubleClick={() => handleDoubleClick(file.id, file.name)}
              className={`px-4 py-1.5 cursor-pointer flex items-center gap-2 text-[13px] relative ${
                activeFileId === file.id
                  ? "text-white bg-[#37373d]"
                  : "text-[#cccccc] bg-transparent hover:bg-[#2a2d2e]"
              }`}
            >
              <File size={16} />
              {renamingFileId === file.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(file.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, file.id)}
                  autoFocus
                  className="flex-1 bg-[#3c3c3c] border border-[#007acc] text-white px-1 py-0.5 text-[13px] outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="flex-1">{file.name}</span>
                  <button
                    onClick={(e) => handleDeleteClick(e, file.id)}
                    className="bg-none border-none text-[#858585] cursor-pointer p-0.5 flex items-center opacity-60 hover:opacity-100 hover:text-[#ff6b6b] transition-all"
                    title="Delete file"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
