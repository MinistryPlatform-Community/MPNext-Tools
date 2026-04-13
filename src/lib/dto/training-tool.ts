/**
 * DTOs for the Training Tool feature.
 * These are hand-written application-level data transfer objects
 * used between server actions and UI components.
 */

export interface TrainingOption {
  Training_ID: number;
  Training_Name: string;
}

export interface TrainingToolData {
  trainings: TrainingOption[];
  volunteerAppIds: number[];
  volunteerCount: number;
}

export interface TrainingAssignResult {
  success: boolean;
  assigned: number;
  skipped: number;
  error?: string;
}
