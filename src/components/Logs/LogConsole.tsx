"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { LogEntry, useLogs } from "@/context/LogContext";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ResizablePanel } from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";

export default function LogConsole() {
  const { logs, clear } = useLogs();
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!isCollapsed) {
      scrollToBottom();
    }
  }, [logs, isCollapsed, scrollToBottom]);

  const toggleCollapse = useCallback(() => {
    if (!panelRef.current) return;
    if (isCollapsed) {
      panelRef.current.expand();
      setIsCollapsed(false);
    } else {
      panelRef.current.collapse();
      setIsCollapsed(true);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        toggleCollapse();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMac, toggleCollapse]);

  return (
    <ResizablePanel
      ref={panelRef}
      collapsible
      defaultSize={20}
      minSize={12}
      collapsedSize={6}
      className="border-t border-gray-700 bg-black text-white text-sm font-mono flex flex-col"
      onCollapse={() => setIsCollapsed(true)}
      onExpand={() => setIsCollapsed(false)}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-3">
          <button onClick={toggleCollapse} className="text-gray-400 hover:text-white transition">
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={clear} className="px-2 py-1 bg-gray-900 rounded hover:bg-gray-800">
            Clear
          </button>
        </div>
        <div className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</div>
      </div>
      {!isCollapsed && (
        <div ref={listRef} className="flex-1 overflow-auto p-2 scrollbar-custom">
          {logs.length === 0 && <div className="text-gray-600 text-xs italic">No logs yet</div>}
          {logs.map((l: LogEntry) => (
            <div key={l.id} className="mb-1">
              <span className="ml-2 text-gray-500 text-xs">{new Date(l.time).toLocaleTimeString()} </span>
              <span
                className={
                  l.level === "error"
                    ? "text-red-400"
                    : l.level === "warn"
                    ? "text-yellow-400"
                    : l.level === "debug"
                    ? "text-green-400"
                    : "text-blue-300"
                }
              >
                [{l.level.toUpperCase()}]
              </span>
              {" > "}
              <span className="ml-2 text-gray-200">{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </ResizablePanel>
  );
}
