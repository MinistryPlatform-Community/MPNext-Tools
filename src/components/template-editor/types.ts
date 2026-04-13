import type { Editor } from 'grapesjs';

export interface MjmlCompileResult {
  html: string;
  errors: MjmlCompileError[];
}

export interface MjmlCompileError {
  line: number;
  message: string;
  tagName: string;
  formattedMessage: string;
}

export interface EditorCanvasProps {
  onEditorReady?: (editor: Editor) => void;
  onClose: () => void;
}

export interface EditorToolbarProps {
  onClose: () => void;
}
