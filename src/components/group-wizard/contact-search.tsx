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
import { ChevronsUpDown, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchContacts } from "./actions";
import type { ContactSearchResult } from "./types";

interface ContactSearchProps {
  value: number | undefined;
  displayName: string | undefined;
  onSelect: (contactId: number, displayName: string) => void;
  disabled?: boolean;
}

export function ContactSearch({ value, displayName, onSelect, disabled }: ContactSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchContacts(term);
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
              <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              {displayName}
            </span>
          ) : (
            <span className="text-muted-foreground">Search contacts...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a name..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isSearching && (
              <div className="py-4 text-center text-sm text-muted-foreground">Searching...</div>
            )}
            {!isSearching && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No contacts found.</CommandEmpty>
            )}
            {!isSearching && query.length < 2 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((contact) => (
                  <CommandItem
                    key={contact.Contact_ID}
                    value={String(contact.Contact_ID)}
                    onSelect={() => {
                      onSelect(contact.Contact_ID, contact.Display_Name);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.Contact_ID ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{contact.Display_Name}</span>
                      {contact.Email_Address && (
                        <span className="text-xs text-muted-foreground">{contact.Email_Address}</span>
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
