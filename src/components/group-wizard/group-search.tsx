"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { ChevronsUpDown, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchGroups } from "./actions";
import type { GroupSearchResult } from "./types";

interface GroupSearchProps {
  value: number | null | undefined;
  displayName: string | undefined;
  onSelect: (groupId: number | null, displayName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function GroupSearch({
  value,
  displayName,
  onSelect,
  placeholder = "Search groups...",
  disabled,
}: GroupSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchGroups(term);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {value && displayName ? (
            <span className="flex items-center gap-2 truncate">
              <Users className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              {displayName}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a group name..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isSearching && (
              <div className="py-4 text-center text-sm text-muted-foreground">Searching...</div>
            )}
            {!isSearching && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No groups found.</CommandEmpty>
            )}
            {!isSearching && query.length < 2 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
            {value && (
              <CommandGroup>
                <CommandItem
                  value="clear"
                  onSelect={() => {
                    onSelect(null, "");
                    setOpen(false);
                    setQuery("");
                  }}
                  className="text-muted-foreground"
                >
                  Clear selection
                </CommandItem>
              </CommandGroup>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((group) => (
                  <CommandItem
                    key={group.Group_ID}
                    value={String(group.Group_ID)}
                    onSelect={() => {
                      onSelect(group.Group_ID, group.Group_Name);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === group.Group_ID ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{group.Group_Name}</span>
                      {group.Group_Type && (
                        <span className="text-xs text-muted-foreground">{group.Group_Type}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
