"use client";

import React, { useState } from "react";
import ConnectionTester from "./Connections/ConnectionTester";

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
        return (
          <div className="p-4 text-[#cccccc]">
            <h3 className="text-sm mb-3 text-white">Connection Settings</h3>
            <p className="text-xs">Configure your connection and test it here.</p>
            <ConnectionTester />
          </div>
        );
      case "trigger":
        return (
          <div className="p-4 text-[#cccccc]">
            <h3 className="text-sm mb-3 text-white">Trigger Configuration</h3>
            <p className="text-xs">Set up triggers for your workflow.</p>
          </div>
        );
      case "actions":
        return (
          <div className="p-4 text-[#cccccc]">
            <h3 className="text-sm mb-3 text-white">Actions</h3>
            <p className="text-xs">Define actions to be executed.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-[#1e1e1e] bg-[#2d2d30]">
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
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}
