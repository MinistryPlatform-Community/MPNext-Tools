"use client";

import { useState, useEffect } from 'react';
import { useEditor } from '@grapesjs/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { compileMjml } from '@/components/template-editor/actions';

interface EditorCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditorCodeDialog({ open, onOpenChange }: EditorCodeDialogProps) {
  const editor = useEditor();
  const [activeTab, setActiveTab] = useState<'mjml' | 'html'>('mjml');
  const [mjmlSource, setMjmlSource] = useState('');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [copiedSource, setCopiedSource] = useState<'mjml' | 'html' | null>(null);

  useEffect(() => {
    if (open) {
      const mjml = editor.getHtml();
      setMjmlSource(mjml);
      setHtmlPreview('');
      setCompileErrors([]);
      setCopiedSource(null);
    }
  }, [open, editor]);

  const handleCompileHtml = async () => {
    setIsCompiling(true);
    setCompileErrors([]);
    try {
      const result = await compileMjml(mjmlSource);
      setHtmlPreview(result.html);
      if (result.errors.length > 0) {
        setCompileErrors(result.errors.map((e) => e.formattedMessage));
      }
    } catch (err) {
      setCompileErrors([err instanceof Error ? err.message : 'Compilation failed']);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleApplyMjml = () => {
    editor.setComponents(mjmlSource);
    onOpenChange(false);
  };

  const handleCopy = async (text: string, source: 'mjml' | 'html') => {
    await navigator.clipboard.writeText(text);
    setCopiedSource(source);
    setTimeout(() => setCopiedSource(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Code Editor</DialogTitle>
          <DialogDescription>
            View and edit the MJML source or preview the compiled HTML output.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'mjml' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('mjml')}
          >
            MJML Source
          </Button>
          <Button
            variant={activeTab === 'html' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('html');
              if (!htmlPreview) handleCompileHtml();
            }}
          >
            HTML Preview
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {activeTab === 'mjml' && (
            <div className="space-y-3">
              <Textarea
                value={mjmlSource}
                onChange={(e) => setMjmlSource(e.target.value)}
                className="font-mono text-xs min-h-[400px] resize-none"
                placeholder="MJML source code..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleApplyMjml}>
                  Apply to Editor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(mjmlSource, 'mjml')}
                >
                  {copiedSource === 'mjml' ? 'Copied!' : 'Copy MJML'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'html' && (
            <div className="space-y-3">
              {isCompiling ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Compiling MJML...
                </div>
              ) : (
                <>
                  {compileErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm font-medium text-red-800 mb-1">
                        Compilation warnings:
                      </p>
                      {compileErrors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 font-mono">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                  <Textarea
                    value={htmlPreview}
                    readOnly
                    className="font-mono text-xs min-h-[400px] resize-none bg-gray-50"
                    placeholder="Compiled HTML will appear here..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCompileHtml}
                      disabled={isCompiling}
                    >
                      Recompile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(htmlPreview, 'html')}
                      disabled={!htmlPreview}
                    >
                      {copiedSource === 'html' ? 'Copied!' : 'Copy HTML'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
