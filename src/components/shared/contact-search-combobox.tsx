"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { searchContacts as defaultSearchContacts } from "@/components/group-wizard/actions";
import type { ContactSearchResult } from "@/lib/dto";

interface ContactSearchComboboxProps {
  value: number | undefined;
  displayName: string;
  onChange: (contactId: number, displayName: string) => void;
  onSearch?: (term: string) => Promise<ContactSearchResult[]>;
}

export function ContactSearchCombobox({
  value,
  displayName,
  onChange,
  onSearch,
}: ContactSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchFnRef = useRef(onSearch);
  searchFnRef.current = onSearch;

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchFn = searchFnRef.current ?? defaultSearchContacts;
        const contacts = await searchFn(query);
        setResults(contacts);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? displayName : "Search for a contact..."}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
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
            {isSearching ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 && query.length >= 2 ? (
              <CommandEmpty>No contacts found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((contact) => (
                  <CommandItem
                    key={contact.Contact_ID}
                    value={String(contact.Contact_ID)}
                    onSelect={() => {
                      onChange(contact.Contact_ID, contact.Display_Name);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {contact.Display_Name}
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
