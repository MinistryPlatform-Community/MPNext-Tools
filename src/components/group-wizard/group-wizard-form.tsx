"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { WizardStepper } from "@/components/team-wizard/wizard-stepper";
import { StepBasicInfo } from "./step-basic-info";
import { StepLocationDetails } from "./step-location-details";
import { StepMinistryRegistration } from "./step-ministry-registration";
import { loadGroupWizardLookupData, loadGroupData, saveGroupWizard } from "./actions";
import {
  groupWizardSchema,
  STEP_BASIC_INFO_FIELDS,
  STEP_LOCATION_DETAILS_FIELDS,
  STEP_MINISTRY_REGISTRATION_FIELDS,
  MEETING_TYPE_ONLINE,
} from "./schemas";
import type { GroupWizardFormValues } from "./schemas";
import type { GroupWizardLookupData } from "@/lib/dto";

interface GroupWizardFormProps {
  existingGroupId?: number;
  onSaveStateChange: (isSaving: boolean) => void;
  onClose: () => void;
  onNewGroup: () => void;
  onReopenGroup: (groupId: number) => void;
}

const STEPS = [
  { label: "Basic Info" },
  { label: "Location & Details" },
  { label: "Ministry & Registration" },
];

export function GroupWizardForm({
  existingGroupId,
  onSaveStateChange,
  onClose,
  onNewGroup,
  onReopenGroup,
}: GroupWizardFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [lookupData, setLookupData] = useState<GroupWizardLookupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedGroup, setSavedGroup] = useState<{ id: number; name: string } | null>(null);
  const [initialContactName, setInitialContactName] = useState("");
  const [initialBookTitle, setInitialBookTitle] = useState("");

  const isEditing = existingGroupId !== undefined && existingGroupId > 0;
  const totalSteps = STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;

  const form = useForm<GroupWizardFormValues>({
    resolver: zodResolver(groupWizardSchema),
    defaultValues: {
      groupName: "",
      facebookGroup: "",
      targetSize: undefined,
      description: "",
      startDate: "",
      endDate: "",
      meetingDayId: undefined as unknown as number,
      meetingFrequencyId: undefined as unknown as number,
      meetingTime: "",
      meetingDurationId: undefined as unknown as number,
      congregationId: undefined as unknown as number,
      meetingTypeId: undefined as unknown as number,
      hybrid: false,
      confidential: false,
      defaultRoom: undefined,
      offsiteAddress: undefined,
      children: undefined as unknown as "no" | "care" | "welcome",
      tagIds: [],
      ministryId: undefined as unknown as number,
      groupFocusId: undefined as unknown as number,
      primaryContactId: undefined as unknown as number,
      hasRequiredBook: false,
      requiredBookId: undefined,
      registrationStart: "",
      registrationEnd: "",
      groupIsFull: false,
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await loadGroupWizardLookupData();
        if (cancelled) return;
        setLookupData(data);

        if (isEditing) {
          const groupData = await loadGroupData(existingGroupId);
          if (cancelled || !groupData) return;
          setInitialContactName(groupData.Primary_Contact_Display_Name ?? "");

          // Determine children value from booleans
          let childrenValue: "no" | "care" | "welcome" = "no";
          if (groupData.Is_Child_Care_Available) childrenValue = "care";
          else if (groupData.Kids_Welcome) childrenValue = "welcome";

          // Determine hybrid from Meets_Online + meeting type
          const meetingType = groupData.Group_Meeting_Type_ID;
          const hybrid = groupData.Meets_Online && meetingType !== MEETING_TYPE_ONLINE;

          form.reset({
            groupName: groupData.Group_Name,
            facebookGroup: groupData.Facebook_Group ?? "",
            targetSize: groupData.Target_Size ?? undefined,
            description: groupData.Description ?? "",
            startDate: groupData.Start_Date ? groupData.Start_Date.slice(0, 16) : "",
            endDate: groupData.End_Date ? groupData.End_Date.slice(0, 16) : "",
            meetingDayId: groupData.Meeting_Day_ID ?? (undefined as unknown as number),
            meetingFrequencyId: groupData.Meeting_Frequency_ID ?? (undefined as unknown as number),
            meetingTime: groupData.Meeting_Time ? groupData.Meeting_Time.slice(0, 5) : "",
            meetingDurationId: groupData.Meeting_Duration_ID ?? (undefined as unknown as number),
            congregationId: groupData.Congregation_ID,
            meetingTypeId: groupData.Group_Meeting_Type_ID ?? (undefined as unknown as number),
            hybrid,
            confidential: groupData.Confidential,
            defaultRoom: groupData.Default_Room ?? undefined,
            offsiteAddress: groupData.offsiteAddress ?? undefined,
            children: childrenValue,
            tagIds: groupData.tagIds,
            ministryId: groupData.Ministry_ID,
            groupFocusId: groupData.Group_Focus_ID ?? (undefined as unknown as number),
            primaryContactId: groupData.Primary_Contact,
            hasRequiredBook: !!groupData.Required_Book,
            requiredBookId: groupData.Required_Book ?? undefined,
            registrationStart: groupData.Registration_Start
              ? groupData.Registration_Start.slice(0, 10)
              : "",
            registrationEnd: groupData.Registration_End
              ? groupData.Registration_End.slice(0, 10)
              : "",
            groupIsFull: groupData.Group_Is_Full,
          });

          // TODO: load book title for display if Required_Book is set
          if (groupData.Required_Book) {
            setInitialBookTitle("(Assigned Book)");
          }
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
    (step: number): (keyof GroupWizardFormValues)[] => {
      switch (step) {
        case 0:
          return STEP_BASIC_INFO_FIELDS;
        case 1:
          return STEP_LOCATION_DETAILS_FIELDS;
        case 2:
          return STEP_MINISTRY_REGISTRATION_FIELDS;
        default:
          return [];
      }
    },
    []
  );

  const handleNext = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fields);
    if (isValid) {
      setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSave = async (values: GroupWizardFormValues) => {
    setError(null);
    onSaveStateChange(true);
    try {
      const result = await saveGroupWizard(values, existingGroupId);
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
          <Button variant="outline" onClick={() => onReopenGroup(savedGroup.id)}>
            Reopen Group
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
        <WizardStepper steps={STEPS} currentStep={currentStep} />

        <div className="bg-white rounded-lg shadow-sm border px-8 py-6 space-y-6">
          <div className="min-h-[300px]">
            {currentStep === 0 && <StepBasicInfo lookupData={lookupData} />}
            {currentStep === 1 && <StepLocationDetails lookupData={lookupData} />}
            {currentStep === 2 && (
              <StepMinistryRegistration
                lookupData={lookupData}
                initialContactName={initialContactName}
                initialBookTitle={initialBookTitle}
              />
            )}
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
