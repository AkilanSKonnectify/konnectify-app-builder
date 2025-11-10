"use client";

import React, { useState } from "react";
import ConnectionTester from "./Connections/ConnectionTester";
import TriggerTester from "./Triggers/TriggerTester";
import ActionTester from "./Actions/ActionTester";

type TabType = "connection" | "trigger" | "actions";

export default function RightPanelTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("connection");

  const tabs: { id: TabType; label: string }[] = [
    { id: "connection", label: "Connection" },
    { id: "trigger", label: "Trigger" },
    { id: "actions", label: "Actions" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "connection":
        return <ConnectionTester />;
      case "trigger":
        return <TriggerTester />;
      case "actions":
        return <ActionTester />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex border-b border-[#1e1e1e] bg-[#2d2d30] flex-shrink-0 sticky top-0 z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2.5 border-none cursor-pointer text-xs ${
              activeTab === tab.id
                ? "bg-[#1e1e1e] text-white border-b-2 border-b-[#0e639c]"
                : "bg-[#2d2d30] text-[#969696]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto scrollbar-custom">{renderContent()}</div>
    </div>
  );
}
