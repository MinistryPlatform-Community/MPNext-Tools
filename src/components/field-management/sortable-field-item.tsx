"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, ChevronRight, ChevronDown, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PageField } from "./types";

interface SortableFieldItemProps {
  field: PageField;
  index: number;
  groupName: string;
  onUpdateField: (id: number, updates: Partial<PageField>) => void;
  schemaRequired: boolean;
}

export function SortableFieldItem({ field, index, groupName, onUpdateField, schemaRequired }: SortableFieldItemProps) {
  const [expanded, setExpanded] = useState(false);

  const { ref, isDragging } = useSortable({
    id: field.Page_Field_ID,
    index,
    type: "item",
    accept: "item",
    group: groupName,
  });

  const rowClass = field.isSeparator
    ? `bg-slate-50 border border-slate-200 border-dashed rounded-md text-sm transition-opacity ${
        isDragging ? "opacity-40 shadow-lg ring-2 ring-cyan-400" : "hover:bg-slate-100"
      }`
    : `bg-white border border-gray-200 rounded-md text-sm transition-opacity ${
        isDragging ? "opacity-40 shadow-lg ring-2 ring-cyan-400" : "hover:bg-gray-50"
      }`;

  return (
    <div ref={ref} className={rowClass}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-3 py-2">
        <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" />
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        {field.isSeparator && (
          <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <span
          className={`font-mono min-w-36 truncate cursor-pointer ${
            field.isSeparator ? "text-slate-600 italic" : "text-gray-900"
          }`}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {field.Field_Name}
        </span>
        <span className="text-gray-600 flex-1 truncate">{field.Field_Label ?? "—"}</span>
        {field.isSeparator && (
          <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-medium shrink-0">
            Separator
          </span>
        )}
        {!field.isSeparator && (schemaRequired || field.Required) && (
          <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium shrink-0">
            Required
          </span>
        )}
        {field.Hidden && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium shrink-0">
            Hidden
          </span>
        )}
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        field.isSeparator ? (
          <div className="px-10 pb-3 pt-1 border-t border-slate-200 grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-1">
              <Label htmlFor={`label-${field.Page_Field_ID}`} className="text-xs text-gray-500">
                Field Label
              </Label>
              <Input
                id={`label-${field.Page_Field_ID}`}
                value={field.Field_Label ?? ""}
                onChange={(e) => onUpdateField(field.Page_Field_ID, { Field_Label: e.target.value || null })}
                placeholder={field.Field_Name}
                className="h-8 text-sm"
              />
            </div>

            <div className="col-span-2 flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id={`hidden-${field.Page_Field_ID}`}
                  checked={field.Hidden}
                  onCheckedChange={(checked) => onUpdateField(field.Page_Field_ID, { Hidden: checked })}
                />
                <Label htmlFor={`hidden-${field.Page_Field_ID}`} className="text-xs text-gray-600">
                  Hidden
                </Label>
              </div>
              <span className="text-xs text-slate-500 italic">
                Separators are visual dividers — data-field options (default, filter, required, writing assistant) don&apos;t apply.
              </span>
            </div>
          </div>
        ) : (
          <div className="px-10 pb-3 pt-1 border-t border-gray-100 grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-1">
              <Label htmlFor={`label-${field.Page_Field_ID}`} className="text-xs text-gray-500">
                Field Label
              </Label>
              <Input
                id={`label-${field.Page_Field_ID}`}
                value={field.Field_Label ?? ""}
                onChange={(e) => onUpdateField(field.Page_Field_ID, { Field_Label: e.target.value || null })}
                placeholder={field.Field_Name}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`default-${field.Page_Field_ID}`} className="text-xs text-gray-500">
                Default Value
              </Label>
              <Input
                id={`default-${field.Page_Field_ID}`}
                value={field.Default_Value ?? ""}
                onChange={(e) => onUpdateField(field.Page_Field_ID, { Default_Value: e.target.value || null })}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`filter-${field.Page_Field_ID}`} className="text-xs text-gray-500">
                Filter Clause
              </Label>
              <Input
                id={`filter-${field.Page_Field_ID}`}
                value={field.Filter_Clause ?? ""}
                onChange={(e) => onUpdateField(field.Page_Field_ID, { Filter_Clause: e.target.value || null })}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`depends-${field.Page_Field_ID}`} className="text-xs text-gray-500">
                Depends On Field
              </Label>
              <Input
                id={`depends-${field.Page_Field_ID}`}
                value={field.Depends_On_Field ?? ""}
                onChange={(e) => onUpdateField(field.Page_Field_ID, { Depends_On_Field: e.target.value || null })}
                className="h-8 text-sm"
              />
            </div>

            <div className="col-span-2 flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id={`required-${field.Page_Field_ID}`}
                  checked={schemaRequired || field.Required}
                  disabled={schemaRequired}
                  onCheckedChange={(checked) => onUpdateField(field.Page_Field_ID, { Required: checked })}
                />
                <Label htmlFor={`required-${field.Page_Field_ID}`} className="text-xs text-gray-600">
                  Required
                  {schemaRequired && <span className="text-gray-400 ml-1">(schema)</span>}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id={`hidden-${field.Page_Field_ID}`}
                  checked={field.Hidden}
                  onCheckedChange={(checked) => onUpdateField(field.Page_Field_ID, { Hidden: checked })}
                />
                <Label htmlFor={`hidden-${field.Page_Field_ID}`} className="text-xs text-gray-600">
                  Hidden
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id={`wa-${field.Page_Field_ID}`}
                  checked={field.Writing_Assistant_Enabled}
                  onCheckedChange={(checked) => onUpdateField(field.Page_Field_ID, { Writing_Assistant_Enabled: checked })}
                />
                <Label htmlFor={`wa-${field.Page_Field_ID}`} className="text-xs text-gray-600">
                  Writing Assistant
                </Label>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
