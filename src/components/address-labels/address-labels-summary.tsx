'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SkipRecord } from '@/lib/dto';

interface AddressLabelsSummaryProps {
  printableCount: number;
  skipped: SkipRecord[];
}

const REASON_LABELS: Record<string, string> = {
  no_address: 'Missing address',
  no_postal_code: 'Missing postal code',
  opted_out: 'Opted out of bulk mail',
  no_barcode: 'Missing barcode data',
  no_household: 'Missing household (required in household mode)',
};

export function AddressLabelsSummary({ printableCount, skipped }: AddressLabelsSummaryProps) {
  const [showSkipped, setShowSkipped] = useState(false);

  const groupedSkipped = skipped.reduce<Record<string, SkipRecord[]>>((acc, record) => {
    if (!acc[record.reason]) acc[record.reason] = [];
    acc[record.reason].push(record);
    return acc;
  }, {});

  return (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-600 font-medium">
          {printableCount} label{printableCount !== 1 ? 's' : ''} ready to print
        </span>
      </div>

      {skipped.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span>{skipped.length} skipped</span>
            {Object.entries(groupedSkipped).map(([reason, records]) => (
              <span key={reason} className="text-muted-foreground">
                ({records.length} {REASON_LABELS[reason] ?? reason})
              </span>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkipped(!showSkipped)}
            className="text-xs"
          >
            {showSkipped ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            {showSkipped ? 'Hide' : 'View'} skipped records
          </Button>

          {showSkipped && (
            <div className="text-xs text-muted-foreground space-y-1 ml-4">
              {skipped.map((record, i) => (
                <div key={i}>
                  {record.name} — {REASON_LABELS[record.reason] ?? record.reason}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
