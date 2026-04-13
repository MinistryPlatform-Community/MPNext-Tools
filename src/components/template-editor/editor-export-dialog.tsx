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

interface EditorExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditorExportDialog({ open, onOpenChange }: EditorExportDialogProps) {
  const editor = useEditor();
  const [activeTab, setActiveTab] = useState<'mjml' | 'html' | 'json'>('mjml');
  const [mjmlSource, setMjmlSource] = useState('');
  const [htmlOutput, setHtmlOutput] = useState('');
  const [jsonState, setJsonState] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [copiedSource, setCopiedSource] = useState<'mjml' | 'html' | 'json' | null>(null);

  useEffect(() => {
    if (open) {
      const mjml = editor.getHtml();
      setMjmlSource(mjml);

      const projectData = editor.getProjectData();
      setJsonState(JSON.stringify(projectData, null, 2));

      setHtmlOutput('');
      setCompileErrors([]);
      setCopiedSource(null);
    }
  }, [open, editor]);

  const handleCompile = async () => {
    setIsCompiling(true);
    setCompileErrors([]);
    try {
      const result = await compileMjml(mjmlSource);
      setHtmlOutput(result.html);
      if (result.errors.length > 0) {
        setCompileErrors(result.errors.map((e) => e.formattedMessage));
      }
    } catch (err) {
      setCompileErrors([err instanceof Error ? err.message : 'Compilation failed']);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCopy = async (text: string, source: 'mjml' | 'html' | 'json') => {
    await navigator.clipboard.writeText(text);
    setCopiedSource(source);
    setTimeout(() => setCopiedSource(null), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonState], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-state.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Template</DialogTitle>
          <DialogDescription>
            Export the template as MJML source, compiled HTML, or editor JSON state.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'mjml' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('mjml')}
          >
            MJML
          </Button>
          <Button
            variant={activeTab === 'html' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('html');
              if (!htmlOutput) handleCompile();
            }}
          >
            HTML
          </Button>
          <Button
            variant={activeTab === 'json' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('json')}
          >
            JSON
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {activeTab === 'mjml' && (
            <div className="space-y-3">
              <Textarea
                value={mjmlSource}
                readOnly
                className="font-mono text-xs min-h-[400px] resize-none bg-gray-50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(mjmlSource, 'mjml')}
              >
                {copiedSource === 'mjml' ? 'Copied!' : 'Copy MJML'}
              </Button>
            </div>
          )}

          {activeTab === 'html' && (
            <div className="space-y-3">
              {isCompiling ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Compiling...
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
                    value={htmlOutput}
                    readOnly
                    className="font-mono text-xs min-h-[400px] resize-none bg-gray-50"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(htmlOutput, 'html')}
                      disabled={!htmlOutput}
                    >
                      {copiedSource === 'html' ? 'Copied!' : 'Copy HTML'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCompile}
                      disabled={isCompiling}
                    >
                      Recompile
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <Textarea
                value={jsonState}
                readOnly
                className="font-mono text-xs min-h-[400px] resize-none bg-gray-50"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(jsonState, 'json')}
                >
                  {copiedSource === 'json' ? 'Copied!' : 'Copy JSON'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadJson}
                >
                  Download JSON
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
