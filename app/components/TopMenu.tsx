"use client";

import React, { useRef } from 'react';
import { useEditor } from '../context/EditorContext';
import { FilePlus, Upload } from 'lucide-react';

export default function TopMenu() {
  const { createNewFile, uploadFile } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{
      height: '40px',
      backgroundColor: '#2d2d30',
      borderBottom: '1px solid #1e1e1e',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '4px'
    }}>
      <button
        onClick={createNewFile}
        title="New File (Ctrl+N)"
        style={{
          padding: '6px 8px',
          backgroundColor: 'transparent',
          color: '#cccccc',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          transition: 'background-color 0.1s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3e3e42'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <FilePlus size={16} />
        <span>New File</span>
      </button>

      <button
        onClick={handleUploadClick}
        title="Open File (Ctrl+O)"
        style={{
          padding: '6px 8px',
          backgroundColor: 'transparent',
          color: '#cccccc',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          transition: 'background-color 0.1s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3e3e42'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Upload size={16} />
        <span>Open File</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ts,.tsx,.js,.jsx,.json,.html,.css,.md,.txt,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.sql,.xml,.yaml,.yml"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
