"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onCancel,
  onSubmit,
  isSubmitting,
  isEditMode,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isReviewStep = currentStep === totalSteps - 1;

  return (
    <div className="border-t bg-background px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}

          {isReviewStep ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Create Group'
              )}
            </Button>
          ) : (
            <Button type="button" onClick={onNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
