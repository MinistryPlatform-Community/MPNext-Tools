import type { TableMetadata } from "@/lib/providers/ministry-platform/types/provider.types";

export interface PageListItem {
  Page_ID: number;
  Display_Name: string;
  Table_Name: string;
}

export interface PageField {
  Page_Field_ID: number;
  Page_ID: number;
  Field_Name: string;
  Group_Name: string | null;
  View_Order: number;
  Required: boolean;
  Hidden: boolean;
  Default_Value: string | null;
  Filter_Clause: string | null;
  Depends_On_Field: string | null;
  Field_Label: string | null;
  Writing_Assistant_Enabled: boolean;
  isSeparator: boolean;
}

export interface PageFieldData {
  fields: PageField[];
  tableMetadata: TableMetadata | null;
}

export interface FieldOrderPayload {
  Page_ID: number;
  Field_Name: string;
  Group_Name: string | null;
  View_Order: number;
  Required: boolean;
  Hidden: boolean;
  Default_Value: string | null;
  Filter_Clause: string | null;
  Depends_On_Field: string | null;
  Field_Label: string | null;
  Writing_Assistant_Enabled: boolean;
}

export interface FieldOrderEditorHandle {
  getSavePayload: () => FieldOrderPayload[];
  moveHiddenToOther: () => void;
}
