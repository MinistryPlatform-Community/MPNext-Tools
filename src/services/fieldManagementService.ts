import { MPHelper } from "@/lib/providers/ministry-platform";
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
}

export class FieldManagementService {
  private static instance: FieldManagementService;
  private mp: MPHelper | null = null;

  private constructor() {}

  public static async getInstance(): Promise<FieldManagementService> {
    if (!FieldManagementService.instance) {
      FieldManagementService.instance = new FieldManagementService();
      await FieldManagementService.instance.initialize();
    }
    return FieldManagementService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  public async getPages(): Promise<PageListItem[]> {
    const result = await this.mp!.executeProcedureWithBody('api_MPNextTools_GetPages', {});

    if (result && result.length > 0 && result[0].length > 0) {
      return result[0] as PageListItem[];
    }

    return [];
  }

  public async getPageFields(pageId: number): Promise<PageField[]> {
    const result = await this.mp!.executeProcedureWithBody('api_MPNextTools_GetPageFields', {
      "@PageID": pageId,
    });

    if (result && result.length > 0 && result[0].length > 0) {
      return result[0] as PageField[];
    }

    return [];
  }

  public async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
    const tables = await this.mp!.getTables(tableName);

    if (tables.length === 0) return null;

    // getTables with search may return multiple matches — find the exact one
    return tables.find((t) => t.Table_Name === tableName) ?? tables[0];
  }

  private static readonly CONCURRENCY = 5;

  public async updatePageFieldOrder(
    fields: {
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
    }[],
    userId?: number
  ): Promise<void> {
    const queryParams = userId !== undefined ? { $userId: userId } : undefined;

    for (let i = 0; i < fields.length; i += FieldManagementService.CONCURRENCY) {
      const batch = fields.slice(i, i + FieldManagementService.CONCURRENCY);
      await Promise.all(batch.map((f) =>
        this.mp!.executeProcedureWithBody('api_MPNextTools_UpdatePageFieldOrder', {
          "@PageID": f.Page_ID,
          "@FieldName": f.Field_Name,
          "@GroupName": f.Group_Name,
          "@ViewOrder": f.View_Order,
          "@Required": f.Required,
          "@Hidden": f.Hidden,
          "@DefaultValue": f.Default_Value,
          "@FilterClause": f.Filter_Clause,
          "@DependsOnField": f.Depends_On_Field,
          "@FieldLabel": f.Field_Label,
          "@WritingAssistantEnabled": f.Writing_Assistant_Enabled,
        }, queryParams)
      ));
    }
  }
}
