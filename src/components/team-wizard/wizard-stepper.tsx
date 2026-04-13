"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStep {
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <nav aria-label="Wizard progress" className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-8 sm:w-12",
                  isCompleted ? "bg-green-500" : "bg-gray-300"
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-cyan-600 text-white",
                  !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? <Check className="size-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  isCurrent ? "font-medium text-gray-900" : "text-gray-500"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
