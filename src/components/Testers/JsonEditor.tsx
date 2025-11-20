"use client";

import React, { useRef, useEffect, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { cn } from "@/utils/utils";
import { Copy, Check, AlignLeft } from "lucide-react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  height?: string;
  language?: string;
}

const editorModels = new Map<string, editor.ITextModel>();

export default function JsonEditor({
  value,
  onChange,
  placeholder = "",
  className,
  height = "150px",
  language = "json",
}: JsonEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileIdRef = useRef(`json-editor-${Date.now()}-${Math.random()}`);
  const isUpdatingFromProps = useRef(false);
  const changeListenerRef = useRef<{ dispose: () => void } | null>(null);

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
      model = monaco.editor.getModel(uri) || monaco.editor.createModel(value || placeholder, language, uri);
      editorModels.set(fileId, model);
    }

    if (model.isDisposed()) {
      const uri = monaco.Uri.parse(`file:///${fileId}`);
      model = monaco.editor.createModel(value || placeholder, language, uri);
      editorModels.set(fileId, model);
    }

    editor.setModel(model);
    editor.updateOptions({ readOnly: false });

    // Dispose previous listener if it exists
    if (changeListenerRef.current) {
      changeListenerRef.current.dispose();
    }

    // Listen to content changes - use a disposable to avoid multiple listeners
    changeListenerRef.current = model.onDidChangeContent(() => {
      if (!isUpdatingFromProps.current) {
        const currentValue = model?.getValue() || "";
        onChange(currentValue);
      }
    });
  };

  const handleCopy = async () => {
    try {
      const jsonString = JSON.stringify(JSON.parse(value), null, 2);

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

  const handleFormat = () => {
    if (!editorRef.current || !monacoRef.current) return;

    try {
      const fileId = fileIdRef.current;
      const model = editorModels.get(fileId);

      if (model && !model.isDisposed()) {
        const currentValue = model.getValue();

        // Try to parse and format JSON
        try {
          const parsed = JSON.parse(currentValue);
          const formatted = JSON.stringify(parsed, null, 2);

          // Update the model with formatted JSON
          isUpdatingFromProps.current = true;
          model.setValue(formatted);

          // Trigger Monaco's format document action for additional formatting
          editorRef.current.getAction("editor.action.formatDocument")?.run();

          // Update parent state
          onChange(formatted);

          // Reset flag
          setTimeout(() => {
            isUpdatingFromProps.current = false;
          }, 0);
        } catch (parseError) {
          // If JSON is invalid, try Monaco's format anyway
          editorRef.current.getAction("editor.action.formatDocument")?.run();
        }
      }
    } catch (err) {
      console.error("Failed to format JSON:", err);
    }
  };

  // Update editor content when value prop changes (but not from user typing)
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const fileId = fileIdRef.current;
      let model = editorModels.get(fileId);

      if (model && !model.isDisposed()) {
        const currentValue = model.getValue();
        // Only update if the value actually changed from outside
        if (currentValue !== value) {
          isUpdatingFromProps.current = true;
          model.setValue(value || placeholder);
          // Reset flag after a short delay to allow the change event to process
          setTimeout(() => {
            isUpdatingFromProps.current = false;
          }, 0);
        }
      } else {
        const uri = monacoRef.current.Uri.parse(`file:///${fileId}`);
        model =
          monacoRef.current.editor.getModel(uri) ||
          monacoRef.current.editor.createModel(value || placeholder, language, uri);
        editorModels.set(fileId, model);
        editorRef.current.setModel(model);
      }
    }
  }, [value, placeholder, language]);

  // Update language when it changes
  useEffect(() => {
    if (monacoRef.current) {
      const fileId = fileIdRef.current;
      const model = editorModels.get(fileId);
      if (model && !model.isDisposed()) {
        const currentLanguage = model.getLanguageId();
        if (currentLanguage !== language) {
          monacoRef.current.editor.setModelLanguage(model, language);
        }
      }
    }
  }, [language]);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (changeListenerRef.current) {
        changeListenerRef.current.dispose();
      }
    };
  }, []);

  return (
    <div
      className={cn("relative bg-gray-800 rounded border border-gray-700", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "absolute top-2 right-2 z-10 flex gap-1 transition-opacity duration-200",
          isHovered ? "opacity-50 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          onClick={handleFormat}
          className={cn(
            "p-1.5 rounded bg-[#2d2d30] hover:bg-[#3e3e42] text-gray-300 hover:text-white transition-colors",
            "border border-[#1e1e1e] flex items-center justify-center",
            "focus:outline-none focus:ring-2 focus:ring-[#0e639c] focus:ring-offset-1"
          )}
          title="Format JSON"
        >
          <AlignLeft size={14} />
        </button>
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
          language={language}
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
            readOnly: false,
            contextmenu: true,
            // Enable search with Ctrl+F / Cmd+F
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: "never",
              seedSearchStringFromSelection: "always",
            },
            // JSON-specific options
            formatOnPaste: true,
            formatOnType: false,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabSize: 2,
            insertSpaces: true,
          }}
        />
      </div>
    </div>
  );
}
