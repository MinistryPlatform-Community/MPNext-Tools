'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectOption } from '@/lib/dto';

interface CampusMultiSelectProps {
  campuses: SelectOption[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Tag-style multi-select for campuses. Selected campuses render as removable chips
 * inside an input-like field; the popover holds a searchable, toggleable list.
 *
 * The field is a `div` (not a `button`) so the per-chip remove controls can be real
 * buttons without nesting interactive elements.
 */
export function CampusMultiSelect({
  campuses,
  selectedIds,
  onToggle,
  placeholder = 'Any campus',
  disabled,
}: CampusMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = campuses.filter((c) => selectedIds.includes(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen((v) => !v);
            }
          }}
          className={cn(
            'flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span className="flex flex-1 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((c) => (
                <Badge key={c.id} variant="secondary" className="gap-1 pr-1 font-normal">
                  {c.label}
                  <button
                    type="button"
                    aria-label={`Remove ${c.label}`}
                    className="rounded-sm opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(c.id);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search campuses…" />
          <CommandList>
            <CommandEmpty>No campuses found.</CommandEmpty>
            <CommandGroup>
              {campuses.map((c) => (
                <CommandItem key={c.id} value={c.label} onSelect={() => onToggle(c.id)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedIds.includes(c.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {c.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
