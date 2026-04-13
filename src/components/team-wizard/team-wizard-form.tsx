"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { WizardStepper } from "./wizard-stepper";
import { StepBasicInfo } from "./step-basic-info";
import { StepMinistryCampus } from "./step-ministry-campus";
import { StepRegistration } from "./step-registration";
import { loadWizardLookupData, loadGroupData, saveTeamWizard } from "./actions";
import {
  teamWizardSchema,
  GROUP_TYPE_QUICK_SERVE,
  TEAM_WIZARD_GROUP_TYPE_IDS,
  STEP_BASIC_INFO_FIELDS,
  STEP_MINISTRY_CAMPUS_FIELDS,
  STEP_REGISTRATION_FIELDS,
} from "./schemas";
import type { TeamWizardFormValues } from "./schemas";
import type { TeamWizardLookupData } from "@/lib/dto";

interface TeamWizardFormProps {
  existingGroupId?: number;
  onSaveStateChange: (isSaving: boolean) => void;
  onClose: () => void;
  onNewGroup: () => void;
  onReopenGroup: (groupId: number) => void;
}

export function TeamWizardForm({
  existingGroupId,
  onSaveStateChange,
  onClose,
  onNewGroup,
  onReopenGroup,
}: TeamWizardFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [lookupData, setLookupData] = useState<TeamWizardLookupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedGroup, setSavedGroup] = useState<{ id: number; name: string } | null>(null);
  const [invalidGroupType, setInvalidGroupType] = useState(false);

  const form = useForm<TeamWizardFormValues>({
    resolver: zodResolver(teamWizardSchema),
    defaultValues: {
      groupName: "",
      groupTypeId: undefined as unknown as number,
      description: "",
      startDate: "",
      endDate: "",
      maxSize: undefined,
      congregationId: undefined as unknown as number,
      ministryId: undefined as unknown as number,
      groupFocusId: undefined,
      primaryContactId: undefined as unknown as number,
      tagIds: [],
      registrationStart: "",
      registrationEnd: "",
      meetingLocationOnCampus: true,
      offsiteAddress: undefined,
    },
  });

  const groupTypeId = form.watch("groupTypeId");
  const isQuickServe = groupTypeId === GROUP_TYPE_QUICK_SERVE;
  const isEditing = existingGroupId !== undefined && existingGroupId > 0;

  const steps = isQuickServe
    ? [
        { label: "Basic Info" },
        { label: "Ministry & Campus" },
        { label: "Registration" },
      ]
    : [{ label: "Basic Info" }, { label: "Ministry & Campus" }];

  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  // Initial contact display name for edit mode
  const [initialContactName, setInitialContactName] = useState("");

  // Load lookup data and existing group data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await loadWizardLookupData();
        if (cancelled) return;
        setLookupData(data);

        if (isEditing) {
          const groupData = await loadGroupData(existingGroupId);
          if (cancelled || !groupData) return;

          if (!(TEAM_WIZARD_GROUP_TYPE_IDS as Set<number>).has(groupData.Group_Type_ID)) {
            setInvalidGroupType(true);
            return;
          }

          setInitialContactName(groupData.Primary_Contact_Display_Name ?? "");
          form.reset({
            groupName: groupData.Group_Name,
            groupTypeId: groupData.Group_Type_ID,
            description: groupData.Description ?? "",
            startDate: groupData.Start_Date ? groupData.Start_Date.slice(0, 16) : "",
            endDate: groupData.End_Date ? groupData.End_Date.slice(0, 16) : "",
            maxSize: groupData.Target_Size ?? undefined,
            congregationId: groupData.Congregation_ID,
            ministryId: groupData.Ministry_ID,
            groupFocusId: groupData.Group_Focus_ID ?? undefined,
            primaryContactId: groupData.Primary_Contact,
            tagIds: groupData.tagIds,
            registrationStart: groupData.Registration_Start
              ? groupData.Registration_Start.slice(0, 16)
              : "",
            registrationEnd: groupData.Registration_End
              ? groupData.Registration_End.slice(0, 16)
              : "",
            meetingLocationOnCampus: !groupData.Offsite_Meeting_Address,
            offsiteAddress: groupData.offsiteAddress ?? undefined,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [existingGroupId, isEditing, form]);

  const getFieldsForStep = useCallback(
    (step: number): (keyof TeamWizardFormValues)[] => {
      switch (step) {
        case 0:
          return STEP_BASIC_INFO_FIELDS;
        case 1:
          return STEP_MINISTRY_CAMPUS_FIELDS;
        case 2:
          return STEP_REGISTRATION_FIELDS;
        default:
          return [];
      }
    },
    []
  );

  const handleNext = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fields as (keyof TeamWizardFormValues)[]);
    if (isValid) {
      setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSave = async (values: TeamWizardFormValues) => {
    setError(null);
    onSaveStateChange(true);
    try {
      const result = await saveTeamWizard(values, existingGroupId);
      if (result.success && result.groupId) {
        setSavedGroup({ id: result.groupId, name: values.groupName });
      } else {
        setError(result.error ?? "Save failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      onSaveStateChange(false);
    }
  };

  if (savedGroup) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <CheckCircle2 className="size-16 text-green-500" />
        <h2 className="text-xl font-semibold">
          {isEditing ? "Group Updated" : "Group Created"}
        </h2>
        <p className="text-muted-foreground text-center">
          <span className="font-medium text-foreground">{savedGroup.name}</span> has been
          successfully {isEditing ? "updated" : "created"}.
        </p>
        <div className="flex gap-3 mt-4">
          <Button onClick={onNewGroup} className="bg-cyan-600 hover:bg-cyan-700">
            New Group
          </Button>
          <Button
            variant="outline"
            onClick={() => onReopenGroup(savedGroup.id)}
          >
            Reopen Group
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (invalidGroupType) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <AlertCircle className="size-16 text-destructive" />
        <h2 className="text-xl font-semibold">Unsupported Group Type</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This tool can only be used to create and manage Ministry Teams. The
          selected record has a group type that is not supported by Team Wizard.
        </p>
        <div className="flex gap-3 mt-4">
          <Button onClick={onNewGroup} className="bg-cyan-600 hover:bg-cyan-700">
            New Team
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!lookupData) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="size-4" />
        <AlertDescription>Failed to load wizard data. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <WizardStepper steps={steps} currentStep={currentStep} />

        <div className="bg-white rounded-lg shadow-sm border px-8 py-6 space-y-6">
          <div className="min-h-[300px]">
            {currentStep === 0 && <StepBasicInfo />}
            {currentStep === 1 && (
              <StepMinistryCampus
                lookupData={lookupData}
                initialContactName={initialContactName}
              />
            )}
            {currentStep === 2 && isQuickServe && <StepRegistration />}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          {isLastStep ? (
            <Button
              type="button"
              onClick={form.handleSubmit(handleSave)}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isEditing ? "Update Group" : "Create Group"}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext} className="bg-cyan-600 hover:bg-cyan-700">
              Next
            </Button>
          )}
          </div>
        </div>
      </form>
    </Form>
  );
}
