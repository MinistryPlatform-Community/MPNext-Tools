"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { CollisionPriority } from "@dnd-kit/abstract";
import { GripVertical, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableFieldItem } from "./sortable-field-item";
import type { PageField } from "./types";

interface SortableGroupProps {
  groupName: string;
  index: number;
  fieldIds: number[];
  fieldLookup: Map<number, PageField>;
  isPinned: boolean;
  onRemove: (name: string) => void;
  onUpdateField: (id: number, updates: Partial<PageField>) => void;
  schemaRequiredFields: Set<string>;
}

export function SortableGroup({
  groupName,
  index,
  fieldIds,
  fieldLookup,
  isPinned,
  onRemove,
  onUpdateField,
  schemaRequiredFields,
}: SortableGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  const { ref, isDragging } = useSortable({
    id: groupName,
    index,
    type: "group",
    accept: ["item", "group"],
    collisionPriority: CollisionPriority.Low,
    disabled: isPinned,
  });

  const ChevronIcon = collapsed ? ChevronRight : ChevronDown;

  return (
    <div
      ref={ref}
      className={`rounded-lg border shadow-sm transition-opacity ${
        isDragging
          ? "opacity-40 ring-2 ring-cyan-400"
          : isPinned
            ? "border-gray-300 bg-gray-50"
            : "border-gray-200 bg-white"
      }`}
    >
      {/* Group header */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 ${
          collapsed ? "rounded-lg" : "border-b rounded-t-lg"
        } ${isPinned ? "bg-gray-100" : "bg-slate-50"}`}
      >
        {!isPinned && (
          <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          <ChevronIcon className="w-4 h-4" />
        </button>
        <span
          className="text-sm font-semibold text-gray-700 flex-1 cursor-pointer select-none"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {groupName}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          {fieldIds.length} {fieldIds.length === 1 ? "field" : "fields"}
        </span>
        {fieldIds.length === 0 && !isPinned && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
            onClick={() => onRemove(groupName)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Fields — hidden when collapsed */}
      {!collapsed && (
        <div className="p-2 space-y-1 min-h-12">
          {fieldIds.length > 0 ? (
            fieldIds.map((fieldId, fieldIndex) => {
              const field = fieldLookup.get(fieldId);
              if (!field) return null;
              return (
                <SortableFieldItem
                  key={fieldId}
                  field={field}
                  index={fieldIndex}
                  groupName={groupName}
                  onUpdateField={onUpdateField}
                  schemaRequired={schemaRequiredFields.has(field.Field_Name)}
                />
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              Drag fields here
            </div>
          )}
        </div>
      )}
    </div>
  );
}
