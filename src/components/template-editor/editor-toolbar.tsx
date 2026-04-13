"use client";

import { useState, useEffect, useCallback } from 'react';
import { useEditor } from '@grapesjs/react';
import {
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  LayoutGrid,
  Layers,
  Paintbrush,
  Code,
  Upload,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditorCodeDialog } from '@/components/template-editor/editor-code-dialog';
import { EditorImportDialog } from '@/components/template-editor/editor-import-dialog';
import { EditorExportDialog } from '@/components/template-editor/editor-export-dialog';
import { MergeFieldPicker } from '@/components/template-editor/merge-field-picker';
import { STORAGE_KEY } from '@/components/template-editor/grapes-config';
import type { EditorToolbarProps } from '@/components/template-editor/types';

type PanelName = 'blocks' | 'layers' | 'styles';

export function EditorToolbar({ onClose }: EditorToolbarProps) {
  const editor = useEditor();
  const [activeDevice, setActiveDevice] = useState('Desktop');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelName | null>('blocks');
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const updateUndoRedo = useCallback(() => {
    const um = editor.UndoManager;
    setCanUndo(um.hasUndo());
    setCanRedo(um.hasRedo());
  }, [editor]);

  useEffect(() => {
    updateUndoRedo();

    const onUpdate = () => updateUndoRedo();
    editor.on('change:changesCount', onUpdate);

    return () => {
      editor.off('change:changesCount', onUpdate);
    };
  }, [editor, updateUndoRedo]);

  // Render the active panel content into the views container
  useEffect(() => {
    const commands = editor.Commands;
    const runIfExists = (cmd: string) => {
      if (commands.has(cmd)) editor.runCommand(cmd);
    };
    const stopIfExists = (cmd: string) => {
      if (commands.has(cmd)) editor.stopCommand(cmd);
    };

    const panelCommands: Record<PanelName, string> = {
      blocks: 'core:open-blocks',
      layers: 'core:open-layers',
      styles: 'core:open-styles-manager',
    };

    // Close all panels first
    for (const cmd of Object.values(panelCommands)) {
      stopIfExists(cmd);
    }

    // Open the active one
    if (activePanel) {
      runIfExists(panelCommands[activePanel]);
    }

    // Toggle sidebar visibility
    const viewsContainer = document.querySelector('.gjs-pn-views-container') as HTMLElement;
    const canvas = document.querySelector('.gjs-cv-canvas') as HTMLElement;
    if (viewsContainer && canvas) {
      if (activePanel) {
        viewsContainer.style.display = 'block';
        canvas.style.width = 'calc(100% - 240px)';
      } else {
        viewsContainer.style.display = 'none';
        canvas.style.width = '100%';
      }
    }
  }, [editor, activePanel]);

  const handleUndo = () => {
    editor.UndoManager.undo();
    updateUndoRedo();
  };

  const handleRedo = () => {
    editor.UndoManager.redo();
    updateUndoRedo();
  };

  const handleDeviceChange = (device: string) => {
    editor.setDevice(device);
    setActiveDevice(device);
  };

  const togglePanel = (panel: PanelName) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleClear = () => {
    editor.DomComponents.clear();
    editor.CssComposer.clear();
    editor.UndoManager.clear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
          {/* Undo/Redo */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Undo2 className="h-4 w-4" />}
              tooltip="Undo"
              onClick={handleUndo}
              disabled={!canUndo}
            />
            <ToolbarButton
              icon={<Redo2 className="h-4 w-4" />}
              tooltip="Redo"
              onClick={handleRedo}
              disabled={!canRedo}
            />
          </ToolbarGroup>

          <ToolbarSeparator />

          {/* Device Toggle */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Monitor className="h-4 w-4" />}
              tooltip="Desktop (600px)"
              onClick={() => handleDeviceChange('Desktop')}
              active={activeDevice === 'Desktop'}
            />
            <ToolbarButton
              icon={<Smartphone className="h-4 w-4" />}
              tooltip="Mobile (320px)"
              onClick={() => handleDeviceChange('Mobile')}
              active={activeDevice === 'Mobile'}
            />
          </ToolbarGroup>

          <ToolbarSeparator />

          {/* Panel Toggles */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<LayoutGrid className="h-4 w-4" />}
              tooltip="Blocks"
              onClick={() => togglePanel('blocks')}
              active={activePanel === 'blocks'}
            />
            <ToolbarButton
              icon={<Layers className="h-4 w-4" />}
              tooltip="Layers"
              onClick={() => togglePanel('layers')}
              active={activePanel === 'layers'}
            />
            <ToolbarButton
              icon={<Paintbrush className="h-4 w-4" />}
              tooltip="Styles"
              onClick={() => togglePanel('styles')}
              active={activePanel === 'styles'}
            />
          </ToolbarGroup>

          <ToolbarSeparator />

          {/* Actions */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Code className="h-4 w-4" />}
              tooltip="View/Edit Code"
              onClick={() => setCodeDialogOpen(true)}
            />
            <MergeFieldPicker />
            <ToolbarButton
              icon={<Upload className="h-4 w-4" />}
              tooltip="Import Template"
              onClick={() => setImportDialogOpen(true)}
            />
            <ToolbarButton
              icon={<Download className="h-4 w-4" />}
              tooltip="Export Template"
              onClick={() => setExportDialogOpen(true)}
            />
          </ToolbarGroup>

          <ToolbarSeparator />

          {/* Clear with confirmation */}
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-300 hover:text-white hover:bg-red-900/50 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Clear Canvas
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all content from the editor. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Close */}
          <ToolbarButton
            icon={<X className="h-4 w-4" />}
            tooltip="Close Editor"
            onClick={onClose}
          />
        </div>
      </TooltipProvider>

      {/* Dialogs */}
      <EditorCodeDialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
      />
      <EditorImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      <EditorExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-slate-600 mx-1.5" />;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled = false,
  active = false,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700',
            active && 'bg-slate-600 text-white',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
