"use client";

import { useState } from 'react';
import { useEditor } from '@grapesjs/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface EditorImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditorImportDialog({ open, onOpenChange }: EditorImportDialogProps) {
  const editor = useEditor();
  const [source, setSource] = useState('');
  const [importType, setImportType] = useState<'mjml' | 'json'>('mjml');
  const [error, setError] = useState('');

  const handleImport = () => {
    if (!source.trim()) return;
    setError('');

    if (importType === 'mjml') {
      editor.setComponents(source);
    } else {
      try {
        const data = JSON.parse(source);
        editor.loadData(data);
      } catch {
        setError('Invalid JSON data. Please check the format and try again.');
        return;
      }
    }

    setSource('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Template</DialogTitle>
          <DialogDescription>
            Paste MJML source code or a JSON editor state to load into the editor.
            This will replace the current content.
          </DialogDescription>
        </DialogHeader>

        {/* Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={importType === 'mjml' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setImportType('mjml')}
          >
            MJML Source
          </Button>
          <Button
            variant={importType === 'json' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setImportType('json')}
          >
            JSON State
          </Button>
        </div>

        <Textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="font-mono text-xs min-h-[350px] resize-none flex-1"
          placeholder={
            importType === 'mjml'
              ? '<mjml>\n  <mj-body>\n    <mj-section>\n      <mj-column>\n        <mj-text>Hello World</mj-text>\n      </mj-column>\n    </mj-section>\n  </mj-body>\n</mjml>'
              : '{ "assets": [], "styles": [], "pages": [...] }'
          }
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!source.trim()}>
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
