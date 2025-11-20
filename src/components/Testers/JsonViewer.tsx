"use client";

import React, { useRef, useState, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Copy, Check } from "lucide-react";
import { cn } from "@/utils/utils";

interface JsonViewerProps {
  data: any;
  className?: string;
  height?: string;
}

const editorModels = new Map<string, editor.ITextModel>();

export default function JsonViewer({ data, className, height = "100%" }: JsonViewerProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileIdRef = useRef(`json-viewer-${Date.now()}-${Math.random()}`);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const fileId = fileIdRef.current;
    let model = editorModels.get(fileId);

    if (model && (model.isDisposed() ?? false)) {
      editorModels.delete(fileId);
      model = undefined;
    }

    if (!model) {
      const uri = monaco.Uri.parse(`file:///${fileId}`);
      const jsonString = JSON.stringify(data, null, 2);
      model = monaco.editor.getModel(uri) || monaco.editor.createModel(jsonString, "json", uri);
      editorModels.set(fileId, model);
    }

    if (model.isDisposed()) {
      const uri = monaco.Uri.parse(`file:///${fileId}`);
      const jsonString = JSON.stringify(data, null, 2);
      model = monaco.editor.createModel(jsonString, "json", uri);
      editorModels.set(fileId, model);
    }

    editor.setModel(model);
    editor.updateOptions({ readOnly: true });
  };

  const handleCopy = async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);

      // Use modern Clipboard API with fallback
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(jsonString);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = jsonString;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Fallback copy failed:", err);
        }

        document.body.removeChild(textArea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Update model when data changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const fileId = fileIdRef.current;
      let model = editorModels.get(fileId);

      if (model && !model.isDisposed()) {
        const jsonString = JSON.stringify(data, null, 2);
        model.setValue(jsonString);
      } else {
        const uri = monacoRef.current.Uri.parse(`file:///${fileId}`);
        const jsonString = JSON.stringify(data, null, 2);
        model = monacoRef.current.editor.getModel(uri) || monacoRef.current.editor.createModel(jsonString, "json", uri);
        editorModels.set(fileId, model);
        editorRef.current.setModel(model);
      }
    }
  }, [data]);

  return (
    <div
      className={cn("relative bg-gray-800 rounded", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "absolute top-2 right-2 z-10 transition-opacity duration-200",
          isHovered ? "opacity-50 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          onClick={handleCopy}
          className={cn(
            "p-1.5 rounded bg-[#2d2d30] hover:bg-[#3e3e42] text-gray-300 hover:text-white transition-colors",
            "border border-[#1e1e1e] flex items-center justify-center",
            "focus:outline-none focus:ring-2 focus:ring-[#0e639c] focus:ring-offset-1"
          )}
          title="Copy to clipboard"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <div style={{ height }}>
        <Editor
          height="100%"
          language="json"
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "off",
            lineNumbersMinChars: 2,
            automaticLayout: true,
            scrollBeyondLastLine: true,
            wordWrap: "on",
            readOnly: true,
            domReadOnly: true,
            contextmenu: true,
            // Enable search with Ctrl+F / Cmd+F
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: "never",
              seedSearchStringFromSelection: "always",
            },
          }}
        />
      </div>
    </div>
  );
}
