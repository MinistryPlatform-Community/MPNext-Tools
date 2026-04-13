"use client";

import { useRef } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import GjsEditor, { Canvas, WithEditor } from '@grapesjs/react';
import grapesjsMjml from 'grapesjs-mjml';
import 'grapesjs/dist/css/grapes.min.css';
import '@/styles/grapesjs-overrides.css';
import { createEditorConfig, DEFAULT_MJML_TEMPLATE, STORAGE_KEY } from '@/components/template-editor/grapes-config';
import { EditorToolbar } from '@/components/template-editor/editor-toolbar';
import { registerMergeFieldBlocks } from '@/components/template-editor/merge-fields';
import type { EditorCanvasProps } from '@/components/template-editor/types';

export function EditorCanvas({ onEditorReady, onClose }: EditorCanvasProps) {
  const editorRef = useRef<Editor | null>(null);

  const handleEditorReady = (editor: Editor) => {
    editorRef.current = editor;
    registerMergeFieldBlocks(editor);

    // Remove navbar blocks (not useful for email templates)
    const bm = editor.Blocks;
    bm.remove('mj-navbar');
    bm.remove('mj-navbar-link');

    // Load default MJML template if no saved state exists
    let hasSavedState = false;
    try {
      hasSavedState = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
    if (!hasSavedState) {
      editor.setComponents(DEFAULT_MJML_TEMPLATE);
    }

    // Set initial canvas width to account for sidebar
    const canvas = document.querySelector('.gjs-cv-canvas') as HTMLElement;
    if (canvas) {
      canvas.style.width = 'calc(100% - 240px)';
    }

    onEditorReady?.(editor);
  };

  const editorConfig = createEditorConfig();

  return (
    <GjsEditor
      className="flex flex-col h-full w-full"
      grapesjs={grapesjs}
      grapesjsCss=""
      plugins={[grapesjsMjml]}
      options={editorConfig}
      onReady={handleEditorReady}
    >
      <WithEditor>
        <EditorToolbar onClose={onClose} />
      </WithEditor>
      <div className="flex-1 overflow-hidden">
        <Canvas className="h-full w-full" />
      </div>
    </GjsEditor>
  );
}
