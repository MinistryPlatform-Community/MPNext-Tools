"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToolContainer } from "@/components/tool";
import { TeamWizardForm } from "@/components/team-wizard";
import { ToolParams, isNewRecord } from "@/lib/tool-params";

interface TeamWizardProps {
  params: ToolParams;
}

export function TeamWizard({ params }: TeamWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const isNew = isNewRecord(params);
  const existingGroupId = isNew ? undefined : params.recordID;

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
    return `/tools/teamwizard?${sp.toString()}`;
  };

  const handleNewGroup = () => {
    router.push(buildToolUrl(-1, ""));
  };

  const handleReopenGroup = (groupId: number) => {
    router.push(buildToolUrl(groupId));
  };

  return (
    <ToolContainer
      title="Team Wizard"
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Team Wizard</p>
          <p className="text-sm">
            {isNew ? "Create a new team" : "Edit an existing team"} in Ministry Platform.
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
        <TeamWizardForm
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
