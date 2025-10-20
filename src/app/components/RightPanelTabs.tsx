"use client";

import React, { useState } from 'react';

type TabType = 'connection' | 'trigger' | 'actions';

export default function RightPanelTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('connection');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'connection', label: 'Connection' },
    { id: 'trigger', label: 'Trigger' },
    { id: 'actions', label: 'Actions' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'connection':
        return (
          <div style={{ padding: '16px', color: '#cccccc' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ffffff' }}>Connection Settings</h3>
            <p style={{ fontSize: '12px' }}>Configure your connection settings here.</p>
          </div>
        );
      case 'trigger':
        return (
          <div style={{ padding: '16px', color: '#cccccc' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ffffff' }}>Trigger Configuration</h3>
            <p style={{ fontSize: '12px' }}>Set up triggers for your workflow.</p>
          </div>
        );
      case 'actions':
        return (
          <div style={{ padding: '16px', color: '#cccccc' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ffffff' }}>Actions</h3>
            <p style={{ fontSize: '12px' }}>Define actions to be executed.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1e1e1e',
        backgroundColor: '#2d2d30'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 8px',
              backgroundColor: activeTab === tab.id ? '#1e1e1e' : '#2d2d30',
              color: activeTab === tab.id ? '#ffffff' : '#969696',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              borderBottom: activeTab === tab.id ? '2px solid #0e639c' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
}
