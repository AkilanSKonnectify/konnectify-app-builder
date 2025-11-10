"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import RightPanelTabs from "./RightPanelTabs";

const MIN_WIDTH = 200;
const MAX_WIDTH = 800;
const COLLAPSED_WIDTH = 40;
const DEFAULT_WIDTH = 300;

export default function RightPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const lastExpandedWidth = useRef(DEFAULT_WIDTH); // remember last expanded width

  // Handle mouse drag to resize
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCollapsed) return; // skip resizing if collapsed
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = startX.current - e.clientX; // reversed because we're resizing from the left
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = "default";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing]);

  // Toggle collapse/expand
  const toggleCollapse = () => {
    if (isCollapsed) {
      setWidth(lastExpandedWidth.current);
    } else {
      lastExpandedWidth.current = width;
      setWidth(COLLAPSED_WIDTH); // collapsed width
    }
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className="bg-[#252526] border-l border-[#1e1e1e] h-full flex flex-col relative"
      style={{
        width: isCollapsed ? "40px" : `${width}px`,
        transition: isResizing ? "none" : "width 0.2s ease-in-out",
      }}
    >
      {/* Resize handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize flex items-center justify-center z-10 transition-colors"
        >
          <div className="h-8 w-[2px] bg-gray-500 rounded"></div>
        </div>
      )}

      <div className="h-[35px] border-b border-[#1e1e1e] flex items-center justify-between px-3 bg-[#2d2d30]">
        {!isCollapsed && <span className="text-[#cccccc] text-[13px] font-bold">Panel</span>}
        <button
          onClick={toggleCollapse}
          className="bg-none border-none text-[#cccccc] cursor-pointer p-1 flex items-center"
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <div className="flex-1 min-h-0">
          <RightPanelTabs />
        </div>
      )}
    </div>
  );
}
