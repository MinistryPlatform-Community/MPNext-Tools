'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import { loadTrainingToolData, assignTraining } from './actions';
import type { TrainingOption } from '@/lib/dto';

interface TrainingToolFormProps {
  pageId: number;
  recordId?: number;
  selectionId?: number;
  onClose: () => void;
}

export function TrainingToolForm({
  pageId,
  recordId,
  selectionId,
  onClose,
}: TrainingToolFormProps) {
  const [trainings, setTrainings] = useState<TrainingOption[]>([]);
  const [volunteerAppIds, setVolunteerAppIds] = useState<number[]>([]);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    assigned: number;
    skipped: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await loadTrainingToolData(pageId, recordId, selectionId);
        setTrainings(data.trainings);
        setVolunteerAppIds(data.volunteerAppIds);
        setVolunteerCount(data.volunteerCount);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load training data'
        );
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [pageId, recordId, selectionId]);

  const handleAssign = async () => {
    if (!selectedTrainingId || volunteerAppIds.length === 0) return;

    setIsAssigning(true);
    try {
      const res = await assignTraining(
        volunteerAppIds,
        Number(selectedTrainingId)
      );
      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        assigned: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading training data...</span>
      </div>
    );
  }

  // Load error
  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  // No volunteers found
  if (volunteerCount === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Volunteers Found</AlertTitle>
        <AlertDescription>
          No volunteer application records were found for the selected records.
          Please go back and select records from the Volunteer App Programs page.
        </AlertDescription>
      </Alert>
    );
  }

  // Assignment complete
  if (result) {
    return (
      <div className="space-y-4">
        {result.success ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Training Assigned</AlertTitle>
            <AlertDescription>
              {result.assigned > 0 && (
                <span>
                  Successfully assigned training to {result.assigned} volunteer
                  {result.assigned !== 1 ? 's' : ''}.
                </span>
              )}
              {result.skipped > 0 && (
                <span>
                  {result.assigned > 0 ? ' ' : ''}
                  {result.skipped} volunteer{result.skipped !== 1 ? 's' : ''} already
                  had this training assigned.
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Assignment Failed</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="space-y-6">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertTitle>
          {volunteerCount} Volunteer{volunteerCount !== 1 ? 's' : ''} Selected
        </AlertTitle>
        <AlertDescription>
          Select a training below to assign to the selected volunteer
          {volunteerCount !== 1 ? 's' : ''}.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="training-select">
          Training
        </label>
        <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
          <SelectTrigger id="training-select" className="w-full">
            <SelectValue placeholder="Select a training..." />
          </SelectTrigger>
          <SelectContent>
            {trainings.map((t) => (
              <SelectItem key={t.Training_ID} value={String(t.Training_ID)}>
                {t.Training_Name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTrainingId && (
        <div className="flex justify-end">
          <Button onClick={handleAssign} disabled={isAssigning}>
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Training
          </Button>
        </div>
      )}
    </div>
  );
}
