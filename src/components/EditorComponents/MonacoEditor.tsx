"use client";

import React, { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useSetupKonnectifyDSL } from "@/hooks/useSetupKonnectifyDSL";
import LogConsole from "../Logs/LogConsole";

interface MonacoEditorProps {
  fileId: string;
  code: string;
  onChange: (value: string | undefined) => void;
  filename: string;
  language?: string;
}

const editorModels = new Map<string, editor.ITextModel>();

export default function MonacoEditor({ fileId, code, onChange, filename, language = "typescript" }: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // useSetupKonnectifyDSL(monaco);

    let model = editorModels.get(fileId);

    if (!model) {
      const uri = monaco.Uri.parse(`file:///${fileId}`);
      model = monaco.editor.getModel(uri) || monaco.editor.createModel(code, language, uri);
      editorModels.set(fileId, model);
    }

    editor.setModel(model);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      editor.trigger("keyboard", "undo", {});
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      editor.trigger("keyboard", "redo", {});
    });

    editor.focus();
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      let model = editorModels.get(fileId);

      if (model) {
        editorRef.current.setModel(model);
      } else {
        const uri = monacoRef.current.Uri.parse(`file:///${fileId}`);
        model = monacoRef.current.editor.getModel(uri) || monacoRef.current.editor.createModel(code, language, uri);
        editorModels.set(fileId, model);
        editorRef.current.setModel(model);
      }

      editorRef.current.focus();
    }
  }, [fileId, code, language]);

  useEffect(() => {
    const model = editorModels.get(fileId);
    if (model && monacoRef.current) {
      const currentLanguage = model.getLanguageId();
      if (currentLanguage !== language) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
  }, [fileId, language]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        onChange={onChange}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: "on",
        }}
      />
      <LogConsole />
    </div>
  );
}
