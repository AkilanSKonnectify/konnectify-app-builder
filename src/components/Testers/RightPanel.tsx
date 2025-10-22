"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import RightPanelTabs from "./RightPanelTabs";

export default function RightPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`${
        isCollapsed ? "w-10" : "w-[300px]"
      } bg-[#252526] border-l border-[#1e1e1e] h-full flex flex-col transition-[width] duration-200 ease-in-out`}
    >
      <div className="h-[35px] border-b border-[#1e1e1e] flex items-center justify-between px-3 bg-[#2d2d30]">
        {!isCollapsed && <span className="text-[#cccccc] text-[13px] font-bold">Panel</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-none border-none text-[#cccccc] cursor-pointer p-1 flex items-center"
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-auto">
          <RightPanelTabs />
        </div>
      )}
    </div>
  );
}
