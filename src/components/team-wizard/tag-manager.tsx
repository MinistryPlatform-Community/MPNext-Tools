"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { TagOption } from "@/lib/dto";

interface TagManagerProps {
  allTags: TagOption[];
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export function TagManager({ allTags, selectedTagIds, onChange }: TagManagerProps) {
  const [search, setSearch] = useState("");

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.Tag_ID));
  const availableTags = allTags.filter(
    (t) =>
      !selectedTagIds.includes(t.Tag_ID) &&
      t.Tag.toLowerCase().includes(search.toLowerCase())
  );

  const addTag = (tagId: number) => {
    onChange([...selectedTagIds, tagId]);
    setSearch("");
  };

  const removeTag = (tagId: number) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-2">
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge key={tag.Tag_ID} variant="secondary" className="gap-1">
              {tag.Tag}
              <button
                type="button"
                onClick={() => removeTag(tag.Tag_ID)}
                className="ml-0.5 rounded-sm hover:bg-black/10"
              >
                <X className="size-3" />
                <span className="sr-only">Remove {tag.Tag}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.length > 0 && availableTags.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
            <ul className="max-h-40 overflow-y-auto p-1">
              {availableTags.map((tag) => (
                <li key={tag.Tag_ID}>
                  <button
                    type="button"
                    onClick={() => addTag(tag.Tag_ID)}
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {tag.Tag}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
