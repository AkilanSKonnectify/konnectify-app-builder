"use client";

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { File, Trash2 } from 'lucide-react';

export default function FileSidebar() {
  const { files, openFile, activeFileId, renameFile, removeFile } = useEditor();
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleDoubleClick = (fileId: string, currentName: string) => {
    setRenamingFileId(fileId);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = (fileId: string) => {
    if (renameValue.trim() && renameValue !== files.find(f => f.id === fileId)?.name) {
      renameFile(fileId, renameValue.trim());
    }
    setRenamingFileId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(fileId);
    } else if (e.key === 'Escape') {
      setRenamingFileId(null);
      setRenameValue('');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file?')) {
      removeFile(fileId);
    }
  };

  return (
    <div style={{
      width: '250px',
      backgroundColor: '#252526',
      borderRight: '1px solid #1e1e1e',
      height: '100%',
      overflow: 'auto'
    }}>
      <div style={{
        padding: '8px 16px',
        color: '#cccccc',
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Explorer
      </div>
      <div>
        {files.length === 0 ? (
          <div style={{
            padding: '16px',
            color: '#858585',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            No files open
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              onClick={() => !renamingFileId && openFile(file.id)}
              onDoubleClick={() => handleDoubleClick(file.id, file.name)}
              style={{
                padding: '6px 16px',
                color: activeFileId === file.id ? '#ffffff' : '#cccccc',
                backgroundColor: activeFileId === file.id ? '#37373d' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeFileId !== file.id && !renamingFileId) {
                  e.currentTarget.style.backgroundColor = '#2a2d2e';
                }
              }}
              onMouseLeave={(e) => {
                if (activeFileId !== file.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <File size={16} />
              {renamingFileId === file.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(file.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, file.id)}
                  autoFocus
                  style={{
                    flex: 1,
                    backgroundColor: '#3c3c3c',
                    border: '1px solid #007acc',
                    color: '#ffffff',
                    padding: '2px 4px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span style={{ flex: 1 }}>{file.name}</span>
                  <button
                    onClick={(e) => handleDeleteClick(e, file.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#858585',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.6
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.color = '#ff6b6b';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.6';
                      e.currentTarget.style.color = '#858585';
                    }}
                    title="Delete file"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
