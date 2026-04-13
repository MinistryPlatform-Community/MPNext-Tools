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
import { searchBooks } from "./actions";
import type { BookOption } from "@/lib/dto";

interface BookSearchComboboxProps {
  value: number | undefined;
  displayTitle: string;
  onChange: (bookId: number, title: string) => void;
}

export function BookSearchCombobox({
  value,
  displayTitle,
  onChange,
}: BookSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
        const books = await searchBooks(query);
        setResults(books);
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
          {value ? displayTitle : "Search for a book..."}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a book title..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isSearching ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 && query.length >= 2 ? (
              <CommandEmpty>No books found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((book) => (
                  <CommandItem
                    key={book.Book_ID}
                    value={String(book.Book_ID)}
                    onSelect={() => {
                      onChange(book.Book_ID, book.Title);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {book.Title}
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
