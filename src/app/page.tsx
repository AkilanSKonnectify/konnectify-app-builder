"use client";

import { EditorProvider } from "@/context/EditorContext";
import EditorLayout from "@/components/EditorComponents/EditorLayout";
import { LogProvider } from "@/context/LogContext";

export default function Home() {
  return (
    <EditorProvider>
      <LogProvider>
        <EditorLayout />
      </LogProvider>
    </EditorProvider>
  );
}
