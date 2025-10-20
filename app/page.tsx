"use client";

import { EditorProvider } from './context/EditorContext';
import EditorLayout from './components/EditorLayout';

export default function Home() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}
