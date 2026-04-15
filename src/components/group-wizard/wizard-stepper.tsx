"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "./types";

interface WizardStepperProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export function WizardStepper({ currentStep, completedSteps, onStepClick }: WizardStepperProps) {
  return (
    <>
      {/* Desktop stepper */}
      <nav aria-label="Wizard progress" className="hidden md:block px-6 pt-6 pb-2">
        <ol className="flex items-center w-full">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;
            const isClickable = isCompleted || index < currentStep;

            return (
              <li
                key={step.label}
                className={cn(
                  "flex items-center",
                  index < WIZARD_STEPS.length - 1 && "flex-1",
                )}
              >
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable && !isCurrent}
                  className={cn(
                    "flex items-center gap-2 group",
                    isClickable && "cursor-pointer",
                    !isClickable && !isCurrent && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 transition-colors",
                      isCompleted && "bg-primary text-primary-foreground",
                      isCurrent && !isCompleted && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2",
                      !isCurrent && !isCompleted && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                  </span>
                  <span className="hidden lg:block">
                    <span
                      className={cn(
                        "block text-sm font-medium leading-tight",
                        isCurrent ? "text-foreground" : "text-muted-foreground",
                        isClickable && "group-hover:text-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                </button>

                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-3",
                      isCompleted ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile stepper */}
      <div className="md:hidden px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            {WIZARD_STEPS[currentStep].label}
          </span>
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {WIZARD_STEPS[currentStep].description}
        </p>
      </div>
    </>
  );
}
