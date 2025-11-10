"use client";

import React, { useRef, useEffect, useState } from "react";
import { LogEntry, useLogs } from "@/context/LogContext";
import { ChevronUp, ChevronDown } from "lucide-react"; // icon library

export default function LogConsole() {
  const { logs, clear } = useLogs();
  const ref = useRef<HTMLDivElement | null>(null);

  // Is mac or not
  const isMac = navigator.platform.toUpperCase().includes("MAC");

  // State for height and visibility
  const [height, setHeight] = useState(250);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const lastExpandedHeight = useRef(250); // remember last expanded height

  // Handle mouse drag to resize
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCollapsed) return; // skip resizing if collapsed
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = "row-resize";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = startY.current - e.clientY;
      const newHeight = Math.max(100, Math.min(800, startHeight.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = "default";
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        setIsCollapsed(!isCollapsed);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing]);

  // Toggle collapse/expand
  const toggleCollapse = () => {
    if (isCollapsed) {
      setHeight(lastExpandedHeight.current);
    } else {
      lastExpandedHeight.current = height;
      setHeight(0);
    }
    setIsCollapsed(!isCollapsed);
  };

  // Keyboard shortcut Ctrl + `
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsed, height]);

  // Scroll to bottom when logs update
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs, isCollapsed]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t border-gray-700 bg-black text-white text-sm font-mono z-50 shadow-xl"
      style={{
        height: isCollapsed ? "40px" : `${height}px`, // show small bar when collapsed
        transition: "height 0.2s ease",
      }}
    >
      {/* Resize handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="h-2 border-gray-800 bg-gray-950 cursor-row-resize flex items-center justify-center"
        >
          <div className="w-8 h-[2px] bg-gray-500 rounded"></div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-3">
          <button onClick={toggleCollapse} className="text-gray-400 hover:text-white transition">
            {isCollapsed ? (
              <ChevronUp size={16} className="inline" /> // collapse icon
            ) : (
              <ChevronDown size={16} className="inline" /> // expand icon
            )}
          </button>
          <button onClick={clear} className="px-2 py-1 bg-gray-900 rounded hover:bg-gray-800">
            Clear
          </button>
        </div>
        <div className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</div>
      </div>

      {/* Logs only visible when expanded */}
      {!isCollapsed && (
        <div ref={ref} className="p-2 overflow-auto scrollbar-custom h-[calc(100%-60px)]">
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
    </div>
  );
}
