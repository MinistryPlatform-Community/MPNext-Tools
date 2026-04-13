"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const EditorCanvas = dynamic(
  () =>
    import('@/components/template-editor/editor-canvas').then((mod) => ({
      default: mod.EditorCanvas,
    })),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);

interface TemplateEditorFormProps {
  onClose: () => void;
}

export function TemplateEditorForm({ onClose }: TemplateEditorFormProps) {
  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <EditorCanvas onClose={onClose} />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="h-full w-full flex flex-col gap-2 p-4">
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-1 gap-2">
        <Skeleton className="h-full w-48" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full w-64" />
      </div>
    </div>
  );
}
