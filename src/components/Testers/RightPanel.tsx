"use client";

import React from "react";
import RightPanelTabs from "./RightPanelTabs";

export default function RightPanel() {
  return (
    <div className="bg-[#252526] border-l border-[#1e1e1e] h-full flex flex-col">
      <div className="h-[35px] border-b border-[#1e1e1e] flex items-center px-3 bg-[#2d2d30]">
        <span className="text-[#cccccc] text-[13px] font-bold">Panel</span>
      </div>
      <div className="flex-1 min-h-0">
        <RightPanelTabs />
      </div>
    </div>
  );
}
