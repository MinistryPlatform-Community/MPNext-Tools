"use client";

import { useState } from 'react';
import { useEditor } from '@grapesjs/react';
import { Braces } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MERGE_FIELD_CATEGORIES,
  getFieldsByCategory,
  type MergeField,
} from '@/components/template-editor/merge-fields';

export function MergeFieldPicker() {
  const editor = useEditor();
  const [open, setOpen] = useState(false);

  const handleInsertField = (field: MergeField) => {
    const selected = editor.getSelected();

    if (selected && selected.get('type') === 'mj-text') {
      // Append to existing text component
      const currentContent = selected.get('content') || '';
      selected.set('content', currentContent + field.value);
    } else {
      // Add new mj-text block with the merge field
      const wrapper = editor.getWrapper();
      if (wrapper) {
        // Try to find an mj-body or add to the first available container
        const body = wrapper.find('mj-body')[0] || wrapper;
        body.append({
          type: 'mj-section',
          components: [
            {
              type: 'mj-column',
              components: [
                {
                  type: 'mj-text',
                  content: `<p>${field.value}</p>`,
                },
              ],
            },
          ],
        });
      }
    }

    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Braces className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insert Merge Field
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <p className="text-sm font-medium">Merge Fields</p>
          <p className="text-xs text-muted-foreground">
            Click to insert at cursor or as new block
          </p>
        </div>
        <div className="max-h-64 overflow-auto p-1">
          {MERGE_FIELD_CATEGORIES.map((category) => (
            <div key={category} className="mb-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                {category}
              </p>
              {getFieldsByCategory(category).map((field) => (
                <button
                  key={field.value}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between gap-2"
                  onClick={() => handleInsertField(field)}
                >
                  <span>{field.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {field.value}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
