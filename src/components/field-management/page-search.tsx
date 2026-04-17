"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPages } from "./actions";
import type { PageListItem } from "./types";

interface PageSearchProps {
  value: PageListItem | undefined;
  onSelect: (page: PageListItem) => void;
}

export function PageSearch({ value, onSelect }: PageSearchProps) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchPages()
      .then((data) => setPages(data))
      .catch(() => setPages([]))
      .finally(() => setIsLoading(false));
  }, []);

  // Reset scroll to top whenever the search term changes. cmdk runs its own
  // scrollIntoView({block: "nearest"}) in a useLayoutEffect after React commits,
  // so we must defer our reset past that commit to win the race.
  const handleSearchChange = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 0 });
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={isLoading}
        >
          {value ? (
            <span className="flex items-center gap-2 truncate">
              <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              {value.Display_Name}
            </span>
          ) : isLoading ? (
            <span className="text-muted-foreground">Loading pages...</span>
          ) : (
            <span className="text-muted-foreground">Select a page...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search pages..." onValueChange={handleSearchChange} />
          <CommandList ref={listRef}>
            <CommandEmpty>No pages found.</CommandEmpty>
            <CommandGroup>
              {pages.map((page) => (
                <CommandItem
                  key={page.Page_ID}
                  value={page.Display_Name}
                  onSelect={() => {
                    onSelect(page);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.Page_ID === page.Page_ID ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{page.Display_Name}</span>
                    <span className="text-xs text-muted-foreground">{page.Table_Name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
