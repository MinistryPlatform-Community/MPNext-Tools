"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToolContainer } from "@/components/tool";
import { GroupWizardForm } from "@/components/group-wizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ToolParams, isNewRecord } from "@/lib/tool-params";
import { GROUP_TYPE_SMALL_GROUP } from "@/components/group-wizard/schemas";

interface GroupWizardProps {
  params: ToolParams;
}

export function GroupWizard({ params }: GroupWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const isNew = isNewRecord(params);
  const existingGroupId = isNew ? undefined : params.recordID;

  // Validate that this is a Small Group page (Group_Type_ID = 1)
  const pageGroupTypeId = params.pageData?.Table_Name === "Groups"
    ? GROUP_TYPE_SMALL_GROUP
    : undefined;
  const isValidGroupType = !params.pageID || pageGroupTypeId === GROUP_TYPE_SMALL_GROUP;

  const handleClose = () => {
    router.back();
  };

  const buildToolUrl = (recordID: number, recordDescription?: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("recordID", String(recordID));
    if (recordDescription) {
      sp.set("recordDescription", recordDescription);
    } else {
      sp.delete("recordDescription");
    }
    return `/tools/groupwizard?${sp.toString()}`;
  };

  const handleNewGroup = () => {
    router.push(buildToolUrl(-1, ""));
  };

  const handleReopenGroup = (groupId: number) => {
    router.push(buildToolUrl(groupId));
  };

  if (!isValidGroupType) {
    return (
      <ToolContainer
        title="Group Wizard"
        onClose={handleClose}
        isSaving={false}
        hideFooter
      >
        <div className="px-6 py-4">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Group Wizard only supports Small Groups (Group Type ID = 1).
            </AlertDescription>
          </Alert>
        </div>
      </ToolContainer>
    );
  }

  return (
    <ToolContainer
      title="Group Wizard"
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Group Wizard</p>
          <p className="text-sm">
            {isNew ? "Create a new small group" : "Edit an existing small group"} in Ministry Platform.
          </p>
          {params.pageID && (
            <p className="text-xs text-gray-400 mt-2">
              Launched from Page ID: {params.pageID}
              {params.s !== undefined && ` | Selection: ${params.s}`}
            </p>
          )}
        </div>
      }
      onClose={handleClose}
      isSaving={isSaving}
      hideFooter
    >
      <div className="px-6 py-4">
        <GroupWizardForm
          key={existingGroupId ?? "new"}
          existingGroupId={existingGroupId}
          onSaveStateChange={setIsSaving}
          onClose={handleClose}
          onNewGroup={handleNewGroup}
          onReopenGroup={handleReopenGroup}
        />
      </div>
    </ToolContainer>
  );
}
