'use client';

import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InfoHintProps {
  /** Detail shown on hover or click. Keep it to a sentence or two. */
  children: ReactNode;
  /** Accessible name for the icon button. */
  label?: string;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A small "i" icon that reveals extra detail on hover or click. Used to keep the
 * technical numbers (segments, encodings, rates) out of the main copy while still
 * making them one gesture away.
 */
export function InfoHint({ children, label = 'More information', className, side = 'top' }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring align-text-bottom',
            className
          )}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className="w-72 p-3 text-xs leading-relaxed text-popover-foreground"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
