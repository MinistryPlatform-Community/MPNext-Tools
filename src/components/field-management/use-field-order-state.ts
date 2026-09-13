"use client";

import { useState, useRef, useCallback } from "react";
import { move } from "@dnd-kit/helpers";
import { isSortable } from "@dnd-kit/react/sortable";
import type { PageField, FieldOrderPayload } from "./types";

const FLAT_GROUP = "__flat__";
const OTHER_FIELDS_GROUP = "99 - Other Fields";
const GROUP_PREFIX_REGEX = /^\d+\s*-\s*/;

type GroupedFieldsMap = Record<string, number[]>;

interface FieldOrderState {
  groupedFields: GroupedFieldsMap;
  groupOrder: string[];
  fieldLookup: Map<number, PageField>;
  isFlat: boolean;
  isDirty: boolean;
  handleDragStart: () => void;
  handleDragOver: (event: Parameters<Exclude<React.ComponentProps<typeof import("@dnd-kit/react").DragDropProvider>["onDragOver"], undefined>>[0]) => void;
  handleDragEnd: (event: Parameters<Exclude<React.ComponentProps<typeof import("@dnd-kit/react").DragDropProvider>["onDragEnd"], undefined>>[0]) => void;
  addGroup: (name: string) => void;
  removeGroup: (name: string) => void;
  moveHiddenToOther: () => void;
  hideAllSeparators: () => void;
  updateField: (id: number, updates: Partial<PageField>) => void;
  buildSavePayload: () => FieldOrderPayload[];
}

export function useFieldOrderState(fields: PageField[]): FieldOrderState {
  const [groupedFields, setGroupedFields] = useState<GroupedFieldsMap>(() =>
    initializeGroupedFields(fields)
  );
  const [groupOrder, setGroupOrder] = useState<string[]>(() =>
    initializeGroupOrder(fields)
  );
  const [isDirty, setIsDirty] = useState(false);

  const [fieldLookup, setFieldLookup] = useState<Map<number, PageField>>(() => {
    const map = new Map<number, PageField>();
    for (const field of fields) {
      map.set(field.Page_Field_ID, field);
    }
    return map;
  });

  const snapshot = useRef<{ groups: GroupedFieldsMap; order: string[] }>({
    groups: {},
    order: [],
  });

  const isFlat = groupOrder.length === 1 && groupOrder[0] === FLAT_GROUP;

  const handleDragStart = useCallback(() => {
    snapshot.current = {
      groups: structuredClone(groupedFields),
      order: [...groupOrder],
    };
  }, [groupedFields, groupOrder]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragOver = useCallback((event: any) => {
    const { source } = event.operation;
    if (source?.type === "group") return;
    setGroupedFields((prev) => move(prev, event));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback((event: any) => {
    if (event.canceled) {
      setGroupedFields(snapshot.current.groups);
      setGroupOrder(snapshot.current.order);
      return;
    }

    const { source } = event.operation;

    if (isSortable(source) && source.type === "group") {
      setGroupOrder((prev) => {
        const updated = move(prev, event);
        // Keep "99 - Other Fields" pinned last
        const otherIdx = updated.indexOf(OTHER_FIELDS_GROUP);
        if (otherIdx !== -1 && otherIdx !== updated.length - 1) {
          updated.splice(otherIdx, 1);
          updated.push(OTHER_FIELDS_GROUP);
        }
        return updated;
      });
    }

    setIsDirty(true);
  }, []);

  const addGroup = useCallback(
    (name: string) => {
      if (isFlat) {
        // Transition: flat → grouped
        setGroupedFields((prev) => {
          const flatIds = prev[FLAT_GROUP] || [];
          return {
            [name]: [],
            [OTHER_FIELDS_GROUP]: flatIds,
          };
        });
        setGroupOrder([name, OTHER_FIELDS_GROUP]);
      } else {
        setGroupedFields((prev) => ({ ...prev, [name]: [] }));
        setGroupOrder((prev) => {
          // Insert before "99 - Other Fields"
          const otherIdx = prev.indexOf(OTHER_FIELDS_GROUP);
          if (otherIdx === -1) return [...prev, name];
          const updated = [...prev];
          updated.splice(otherIdx, 0, name);
          return updated;
        });
      }
      setIsDirty(true);
    },
    [isFlat]
  );

  /**
   * Remove an empty group.
   *
   * Both pieces of state must agree. `buildSavePayload()` iterates
   * `groupOrder`, not `Object.keys(groupedFields)`, so dropping a name from
   * the order while its fields remain in `groupedFields` silently omits those
   * fields from the payload — they vanish from the Ministry Platform page's
   * field list on the next save, with no error shown to the admin.
   *
   * The guard therefore lives on the shared decision, not inside one setter.
   * A non-empty group is a no-op: the UI only renders the delete control for
   * empty groups, but this is a plain callback with no such enforcement.
   */
  const removeGroup = useCallback(
    (name: string) => {
      // Decide once, up front, from the rendered state — NOT inside one of the
      // setters. A flag set inside a `setGroupedFields` updater cannot drive
      // the `setGroupOrder` call: React runs updaters during render, so the
      // flag is still false when the second setter is reached.
      if ((groupedFields[name] || []).length > 0) return;

      setGroupedFields((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
      setGroupOrder((prev) => prev.filter((g) => g !== name));
      setIsDirty(true);
    },
    [groupedFields],
  );

  const moveHiddenToOther = useCallback(() => {
    setGroupedFields((prev) => {
      const hiddenIds = new Set<number>();
      for (const ids of Object.values(prev)) {
        for (const id of ids) {
          const field = fieldLookup.get(id);
          if (field?.Hidden) hiddenIds.add(id);
        }
      }
      if (hiddenIds.size === 0) return prev;

      const next: GroupedFieldsMap = {};
      for (const [groupName, ids] of Object.entries(prev)) {
        if (groupName === OTHER_FIELDS_GROUP) continue;
        next[groupName] = ids.filter((id) => !hiddenIds.has(id));
      }

      // Append hidden fields to Other, keeping any existing Other fields first
      const existingOther = prev[OTHER_FIELDS_GROUP] ?? [];
      next[OTHER_FIELDS_GROUP] = [
        ...existingOther.filter((id) => !hiddenIds.has(id)),
        ...hiddenIds,
      ];

      return next;
    });
    setGroupOrder((prev) => {
      if (prev.includes(OTHER_FIELDS_GROUP)) return prev;
      return [...prev, OTHER_FIELDS_GROUP];
    });
    setIsDirty(true);
  }, [fieldLookup]);

  const hideAllSeparators = useCallback(() => {
    const separatorIds = new Set<number>();
    for (const field of fieldLookup.values()) {
      if (field.isSeparator) separatorIds.add(field.Page_Field_ID);
    }
    if (separatorIds.size === 0) return;

    setFieldLookup((prev) => {
      const next = new Map(prev);
      for (const id of separatorIds) {
        const existing = next.get(id);
        if (existing && !existing.Hidden) {
          next.set(id, { ...existing, Hidden: true });
        }
      }
      return next;
    });

    setGroupedFields((prev) => {
      const next: GroupedFieldsMap = {};
      for (const [groupName, ids] of Object.entries(prev)) {
        if (groupName === OTHER_FIELDS_GROUP) continue;
        next[groupName] = ids.filter((id) => !separatorIds.has(id));
      }
      const existingOther = prev[OTHER_FIELDS_GROUP] ?? [];
      next[OTHER_FIELDS_GROUP] = [
        ...existingOther.filter((id) => !separatorIds.has(id)),
        ...separatorIds,
      ];
      return next;
    });

    setGroupOrder((prev) => {
      if (prev.includes(OTHER_FIELDS_GROUP)) return prev;
      return [...prev, OTHER_FIELDS_GROUP];
    });

    setIsDirty(true);
  }, [fieldLookup]);

  const updateField = useCallback((id: number, updates: Partial<PageField>) => {
    setFieldLookup((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, ...updates });
      return next;
    });
    setIsDirty(true);
  }, []);

  const buildSavePayload = useCallback((): FieldOrderPayload[] => {
    const payload: FieldOrderPayload[] = [];
    let viewOrder = 1;
    let groupNumber = 1;

    for (const groupName of groupOrder) {
      const fieldIds = groupedFields[groupName] || [];

      let resolvedGroupName: string | null;
      if (groupName === FLAT_GROUP) {
        resolvedGroupName = null;
      } else if (groupName === OTHER_FIELDS_GROUP) {
        resolvedGroupName = OTHER_FIELDS_GROUP;
      } else {
        const strippedName = groupName.replace(GROUP_PREFIX_REGEX, "");
        resolvedGroupName = `${groupNumber} - ${strippedName}`;
        groupNumber++;
      }

      for (const fieldId of fieldIds) {
        const field = fieldLookup.get(fieldId);
        if (!field) continue;
        payload.push({
          Page_ID: field.Page_ID,
          Field_Name: field.Field_Name,
          Group_Name: resolvedGroupName,
          View_Order: viewOrder++,
          Required: field.Required,
          Hidden: field.Hidden,
          Default_Value: field.Default_Value,
          Filter_Clause: field.Filter_Clause,
          Depends_On_Field: field.Depends_On_Field,
          Field_Label: field.Field_Label,
          Writing_Assistant_Enabled: field.Writing_Assistant_Enabled,
        });
      }
    }

    return payload;
  }, [groupedFields, groupOrder, fieldLookup]);

  return {
    groupedFields,
    groupOrder,
    fieldLookup,
    isFlat,
    isDirty,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    addGroup,
    removeGroup,
    moveHiddenToOther,
    hideAllSeparators,
    updateField,
    buildSavePayload,
  };
}

function initializeGroupedFields(fields: PageField[]): GroupedFieldsMap {
  const hasGroups = fields.some((f) => f.Group_Name !== null);

  if (!hasGroups) {
    const sorted = [...fields].sort((a, b) => a.View_Order - b.View_Order);
    return { [FLAT_GROUP]: sorted.map((f) => f.Page_Field_ID) };
  }

  const groups: GroupedFieldsMap = {};
  for (const field of fields) {
    const groupName = field.Group_Name ?? OTHER_FIELDS_GROUP;
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(field.Page_Field_ID);
  }

  // Sort fields within each group by View_Order
  for (const groupName of Object.keys(groups)) {
    groups[groupName].sort((a, b) => {
      const fa = fields.find((f) => f.Page_Field_ID === a)!;
      const fb = fields.find((f) => f.Page_Field_ID === b)!;
      return fa.View_Order - fb.View_Order;
    });
  }

  return groups;
}

function initializeGroupOrder(fields: PageField[]): string[] {
  const hasGroups = fields.some((f) => f.Group_Name !== null);

  if (!hasGroups) return [FLAT_GROUP];

  const groupNames = new Set<string>();
  for (const field of fields) {
    groupNames.add(field.Group_Name ?? OTHER_FIELDS_GROUP);
  }

  const order = [...groupNames].sort((a, b) => {
    if (a === OTHER_FIELDS_GROUP) return 1;
    if (b === OTHER_FIELDS_GROUP) return -1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });

  return order;
}
