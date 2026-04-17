"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ToolContainer } from "@/components/tool";
import { PageSearch } from "@/components/field-management";
import { FieldOrderEditor } from "@/components/field-management/field-order-editor";
import type { PageListItem, PageFieldData, FieldOrderEditorHandle } from "@/components/field-management";
import { fetchPageFieldData, savePageFieldOrder } from "@/components/field-management/actions";
import { ToolParams } from "@/lib/tool-params";
import { ArrowLeft, Table, Loader2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FieldManagementProps {
  params: ToolParams;
}

export function FieldManagement({ params }: FieldManagementProps) {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState<PageListItem | undefined>();
  const [step, setStep] = useState<1 | 2>(1);
  const [fieldData, setFieldData] = useState<PageFieldData | null>(null);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<FieldOrderEditorHandle>(null);

  const handlePageSelect = useCallback(async (page: PageListItem) => {
    setSelectedPage(page);
    setStep(2);
    setIsLoadingFields(true);
    setIsDirty(false);
    try {
      const data = await fetchPageFieldData(page.Page_ID, page.Table_Name);
      setFieldData(data);
    } catch {
      setFieldData(null);
    } finally {
      setIsLoadingFields(false);
    }
  }, []);

  const handleSave = async () => {
    if (!editorRef.current || !selectedPage) return;
    const payload = editorRef.current.getSavePayload();
    setIsSaving(true);
    try {
      const result = await savePageFieldOrder(payload);
      if (result.success) {
        toast.success("Field order saved successfully");
        // Re-fetch to show persisted state
        const data = await fetchPageFieldData(selectedPage.Page_ID, selectedPage.Table_Name);
        setFieldData(data);
        setIsDirty(false);
      } else {
        toast.error(result.error ?? "Failed to save field order");
      }
    } catch {
      toast.error("An unexpected error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setFieldData(null);
    setIsDirty(false);
  };

  const handleMoveHiddenToOther = () => {
    editorRef.current?.moveHiddenToOther();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ToolContainer
      params={params}
      title="Field Management"
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Field Management</p>
          <p className="text-sm">
            Organize and manage fields on Ministry Platform pages.
            Drag fields to reorder them, move between groups, or reorder groups.
          </p>
        </div>
      }
      onClose={handleClose}
      onSave={handleSave}
      saveLabel={isSaving ? "Saving..." : "Save"}
      isSaving={isSaving}
      hideFooter={step === 1 || isLoadingFields || !fieldData}
      footerExtra={
        step === 2 && fieldData ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMoveHiddenToOther}
            disabled={isSaving}
          >
            <EyeOff className="w-4 h-4 mr-1" />
            Move Hidden to Other
          </Button>
        ) : undefined
      }
    >
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Select a Page
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Choose a Ministry Platform page to manage its fields.
            </p>
            <div className="max-w-md">
              <PageSearch value={selectedPage} onSelect={handlePageSelect} />
            </div>
          </div>
        )}

        {step === 2 && selectedPage && (
          <>
            {/* Page header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <h2 className="text-sm font-semibold text-gray-700">
                  Page Fields
                </h2>
                {isDirty && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-500">Display Name:</span>
                  <span className="text-gray-900">{selectedPage.Display_Name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-500">Table:</span>
                  <span className="font-mono text-gray-900">{selectedPage.Table_Name}</span>
                </div>
                {fieldData?.tableMetadata && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-500">Columns:</span>
                    <span className="text-gray-900">{fieldData.tableMetadata.Columns?.length ?? "—"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Field order editor */}
            {isLoadingFields ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading fields...
                </div>
              </div>
            ) : fieldData && fieldData.fields.length > 0 ? (
              <FieldOrderEditor
                ref={editorRef}
                fields={fieldData.fields}
                tableMetadata={fieldData.tableMetadata}
                onDirtyChange={setIsDirty}
              />
            ) : fieldData ? (
              <div className="bg-white rounded-lg shadow-sm border py-12 text-center text-sm text-gray-500">
                No fields found for this page.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border py-12 text-center text-sm text-red-500">
                Failed to load field data.
              </div>
            )}
          </>
        )}
      </div>
    </ToolContainer>
  );
}
