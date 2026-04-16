"use client";

import { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFieldOrderState } from "./use-field-order-state";
import { SortableFieldItem } from "./sortable-field-item";
import { SortableGroup } from "./sortable-group";
import { NewGroupDialog } from "./new-group-dialog";
import type { PageField, FieldOrderEditorHandle } from "./types";
import type { TableMetadata } from "@/lib/providers/ministry-platform/types/provider.types";

const OTHER_FIELDS_GROUP = "99 - Other Fields";

interface FieldOrderEditorProps {
  fields: PageField[];
  tableMetadata: TableMetadata | null;
  onDirtyChange: (dirty: boolean) => void;
}

export const FieldOrderEditor = forwardRef<FieldOrderEditorHandle, FieldOrderEditorProps>(
  function FieldOrderEditor({ fields, tableMetadata, onDirtyChange }, ref) {
    const [newGroupOpen, setNewGroupOpen] = useState(false);

    const state = useFieldOrderState(fields);

    const schemaRequiredFields = useMemo(() => {
      const set = new Set<string>();
      if (tableMetadata?.Columns) {
        for (const col of tableMetadata.Columns) {
          if (col.IsRequired) set.add(col.Name);
        }
      }
      return set;
    }, [tableMetadata]);

    useEffect(() => {
      onDirtyChange(state.isDirty);
    }, [state.isDirty, onDirtyChange]);

    useImperativeHandle(ref, () => ({
      getSavePayload: state.buildSavePayload,
      moveHiddenToOther: state.moveHiddenToOther,
    }), [state.buildSavePayload, state.moveHiddenToOther]);

    const totalFields = Object.values(state.groupedFields).reduce(
      (sum, ids) => sum + ids.length,
      0
    );

    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {totalFields} {totalFields === 1 ? "field" : "fields"}
            {!state.isFlat && ` in ${state.groupOrder.length} groups`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewGroupOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Group
          </Button>
        </div>

        {/* DnD Area */}
        <DragDropProvider
          onDragStart={state.handleDragStart}
          onDragOver={state.handleDragOver}
          onDragEnd={state.handleDragEnd}
        >
          <div className="space-y-3">
            {state.isFlat ? (
              /* Flat mode — simple sortable list */
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-slate-50 rounded-t-lg">
                  <span className="text-sm font-semibold text-gray-700 flex-1">
                    Fields
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {totalFields} {totalFields === 1 ? "field" : "fields"}
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {(state.groupedFields["__flat__"] || []).map((fieldId, index) => {
                    const field = state.fieldLookup.get(fieldId);
                    if (!field) return null;
                    return (
                      <SortableFieldItem
                        key={fieldId}
                        field={field}
                        index={index}
                        groupName="__flat__"
                        onUpdateField={state.updateField}
                        schemaRequired={schemaRequiredFields.has(field.Field_Name)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Grouped mode — sortable groups with sortable fields */
              state.groupOrder.map((groupName, groupIndex) => (
                <SortableGroup
                  key={groupName}
                  groupName={groupName}
                  index={groupIndex}
                  fieldIds={state.groupedFields[groupName] || []}
                  fieldLookup={state.fieldLookup}
                  isPinned={groupName === OTHER_FIELDS_GROUP}
                  onRemove={state.removeGroup}
                  onUpdateField={state.updateField}
                  schemaRequiredFields={schemaRequiredFields}
                />
              ))
            )}
          </div>
        </DragDropProvider>

        {/* New Group Dialog */}
        <NewGroupDialog
          open={newGroupOpen}
          onOpenChange={setNewGroupOpen}
          onCreateGroup={state.addGroup}
          existingGroupNames={state.groupOrder}
        />
      </div>
    );
  }
);
