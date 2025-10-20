"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import RightPanelTabs from './RightPanelTabs';

export default function RightPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div style={{
      width: isCollapsed ? '40px' : '300px',
      backgroundColor: '#252526',
      borderLeft: '1px solid #1e1e1e',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease'
    }}>
      <div style={{
        height: '35px',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        backgroundColor: '#2d2d30'
      }}>
        {!isCollapsed && (
          <span style={{ color: '#cccccc', fontSize: '13px', fontWeight: 'bold' }}>
            Panel
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: '#cccccc',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <RightPanelTabs />
        </div>
      )}
    </div>
  );
}
