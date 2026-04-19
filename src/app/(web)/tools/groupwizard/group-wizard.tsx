"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToolContainer } from "@/components/tool";
import { AlertCircle } from "lucide-react";
import { ToolParams, isNewRecord } from "@/lib/tool-params";
import {
  groupWizardSchema,
  GROUP_WIZARD_DEFAULTS,
  STEP_FIELDS,
  WIZARD_STEPS,
  WizardStepper,
  WizardNavigation,
  StepIdentity,
  StepOrganization,
  StepMeeting,
  StepAttributes,
  StepSettings,
  StepReview,
} from "@/components/group-wizard";
import type { GroupWizardFormData, GroupWizardLookups } from "@/components/group-wizard";
import {
  fetchGroupWizardLookups,
  fetchGroupRecord,
  createGroup,
  updateGroup,
} from "@/components/group-wizard/actions";

interface GroupWizardProps {
  params: ToolParams;
}

export function GroupWizard({ params }: GroupWizardProps) {
  const router = useRouter();
  const isNew = isNewRecord(params);
  const isEditMode = !isNew && !!params.recordID && params.recordID > 0;

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [lookups, setLookups] = useState<GroupWizardLookups | null>(null);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{ groupId: number; groupName: string } | null>(null);
  const [contactDisplayMap, setContactDisplayMap] = useState<Map<number, string>>(new Map());
  const [groupDisplayMap, setGroupDisplayMap] = useState<Map<number, string>>(new Map());

  const form = useForm<GroupWizardFormData>({
    resolver: zodResolver(groupWizardSchema),
    defaultValues: GROUP_WIZARD_DEFAULTS,
    mode: "onTouched",
  });

  // Load lookup data on mount
  useEffect(() => {
    fetchGroupWizardLookups()
      .then(setLookups)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load lookup data"))
      .finally(() => setIsLoadingLookups(false));
  }, []);

  // Load existing group for edit mode
  useEffect(() => {
    if (!isEditMode || !params.recordID) return;

    fetchGroupRecord(params.recordID).then((result) => {
      if (result.success) {
        // Seed display maps BEFORE form.reset so the combobox triggers render
        // with a name immediately — otherwise Step 1 / Review show "ID: <n>"
        // until the user manually re-selects.
        const contactEntries = Object.entries(result.displayNames.contacts);
        if (contactEntries.length > 0) {
          setContactDisplayMap((prev) => {
            const next = new Map(prev);
            for (const [id, name] of contactEntries) next.set(Number(id), name);
            return next;
          });
        }
        const groupEntries = Object.entries(result.displayNames.groups);
        if (groupEntries.length > 0) {
          setGroupDisplayMap((prev) => {
            const next = new Map(prev);
            for (const [id, name] of groupEntries) next.set(Number(id), name);
            return next;
          });
        }
        form.reset(result.data);
      } else {
        setLoadError(result.error);
      }
      setIsLoadingRecord(false);
    }).catch((err) => {
      console.error("Failed to fetch group record:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load group record");
      setIsLoadingRecord(false);
    });
  }, [isEditMode, params.recordID, form]);

  const handleContactSelect = useCallback((id: number, name: string) => {
    setContactDisplayMap((prev) => new Map(prev).set(id, name));
  }, []);

  const handleGroupSelect = useCallback((_field: string, id: number | null, name: string) => {
    if (id) {
      setGroupDisplayMap((prev) => new Map(prev).set(id, name));
    }
  }, []);

  const handleNext = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep];
    if (!fields || fields.length === 0) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
      return;
    }

    const isValid = await form.trigger(fields as (keyof GroupWizardFormData)[]);
    if (isValid) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  }, [currentStep, form]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleStepClick = useCallback((step: number) => {
    if (step < currentStep || completedSteps.has(step)) {
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  const handleSubmit = useCallback(async () => {
    const data = form.getValues();

    let result;
    if (isEditMode && params.recordID) {
      result = await updateGroup(params.recordID, data);
    } else {
      result = await createGroup(data);
    }

    if (result.success) {
      setSubmitResult({ groupId: result.groupId, groupName: result.groupName });
    } else {
      setLoadError(result.error);
    }
  }, [form, isEditMode, params.recordID]);

  const handleCreateAnother = useCallback(() => {
    form.reset(GROUP_WIZARD_DEFAULTS);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setSubmitResult(null);
    setLoadError(null);
  }, [form]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const isLoading = isLoadingLookups || isLoadingRecord;

  return (
    <ToolContainer
      params={params}
      title={isEditMode ? "Edit Group" : "Group Wizard"}
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Group Wizard</p>
          <p className="text-sm">
            {isEditMode
              ? "Edit an existing group in Ministry Platform."
              : "Create a new group in Ministry Platform step by step."}
          </p>
        </div>
      }
      hideFooter
      onClose={handleClose}
    >
      {isLoading ? (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : loadError && !submitResult ? (
        <div className="p-6 max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        </div>
      ) : lookups ? (
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col h-full">
            {!submitResult && (
              <WizardStepper
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
              />
            )}

            <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
              {currentStep === 0 && <StepIdentity lookups={lookups} />}
              {currentStep === 1 && (
                <StepOrganization
                  lookups={lookups}
                  contactDisplayMap={contactDisplayMap}
                  groupDisplayMap={groupDisplayMap}
                  onContactSelect={handleContactSelect}
                  onGroupSelect={handleGroupSelect}
                />
              )}
              {currentStep === 2 && <StepMeeting lookups={lookups} />}
              {currentStep === 3 && <StepAttributes lookups={lookups} />}
              {currentStep === 4 && (
                <StepSettings
                  lookups={lookups}
                  groupDisplayMap={groupDisplayMap}
                  onGroupSelect={handleGroupSelect}
                />
              )}
              {currentStep === 5 && (
                <StepReview
                  lookups={lookups}
                  contactDisplayMap={contactDisplayMap}
                  groupDisplayMap={groupDisplayMap}
                  onEditStep={handleStepClick}
                  submitResult={submitResult}
                  isEditMode={isEditMode}
                  onCreateAnother={handleCreateAnother}
                  onClose={handleClose}
                />
              )}
            </div>

            {!submitResult && (
              <WizardNavigation
                currentStep={currentStep}
                totalSteps={WIZARD_STEPS.length}
                onBack={handleBack}
                onNext={handleNext}
                onCancel={handleClose}
                onSubmit={handleSubmit}
                isSubmitting={form.formState.isSubmitting}
                isEditMode={isEditMode}
              />
            )}
          </form>
        </Form>
      ) : null}
    </ToolContainer>
  );
}
