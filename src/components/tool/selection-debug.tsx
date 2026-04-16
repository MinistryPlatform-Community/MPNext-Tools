"use client";

import { useState, useEffect } from "react";
import { ListChecks, Loader2, Info } from "lucide-react";
import { resolveSelection } from "./selection-debug-actions";
import type { ToolParams } from "@/lib/tool-params";
import type { SelectionResult } from "./selection-debug-actions";

interface SelectionDebugProps {
  params: ToolParams;
  onRecordIdsResolved?: (recordIds: number[]) => void;
}

export function SelectionDebug({ params, onRecordIdsResolved }: SelectionDebugProps) {
  const [result, setResult] = useState<SelectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasSelection = params.s !== undefined && params.s > 0 && params.pageID !== undefined;

  useEffect(() => {
    if (!hasSelection) return;

    async function fetchSelection() {
      try {
        const data = await resolveSelection(params.s!, params.pageID!);
        setResult(data);
        onRecordIdsResolved?.(data.recordIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resolve selection");
      } finally {
        setLoading(false);
      }
    }

    fetchSelection();
  }, [hasSelection, params.s, params.pageID]);

  if (!hasSelection) return null;

  const pageName = params.pageData?.Display_Name ?? (params.pageID ? `Page ${params.pageID}` : "N/A");
  const tableName = params.pageData?.Table_Name ?? "N/A";

  if (loading) {
    return (
      <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm mb-1">
              Development Mode - Loading Selection...
            </h3>
            <p className="text-xs text-blue-700">
              Resolving record IDs for Selection {params.s}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-dashed border-red-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 text-sm mb-1">
              Development Mode - Selection Error
            </h3>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const displayIds = result.recordIds.slice(0, 5);
  const remaining = result.count - displayIds.length;

  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <ListChecks className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 text-sm mb-1">
            Development Mode - Selection Details
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Selection ID</div>
          <div className="text-sm font-medium text-blue-900">{params.s}</div>
        </div>
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Page</div>
          <div className="text-sm font-medium text-blue-900">{pageName}</div>
        </div>
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Table</div>
          <div className="text-sm font-medium text-blue-900">{tableName}</div>
        </div>
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Record Count</div>
          <div className="text-sm font-medium text-blue-900">{result.count}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-mono text-gray-500 mb-1">Record IDs</div>
        <div className="flex flex-wrap gap-1.5">
          {displayIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center bg-white border border-blue-200 rounded px-2 py-0.5 text-xs font-mono text-blue-900"
            >
              {id}
            </span>
          ))}
          {remaining > 0 && (
            <span className="inline-flex items-center text-xs text-blue-700">
              +{remaining} more
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-blue-200">
        <details className="text-xs">
          <summary className="cursor-pointer text-blue-700 font-medium hover:text-blue-900">
            View Raw JSON
          </summary>
          <pre className="mt-2 bg-white p-3 rounded border border-blue-200 overflow-x-auto text-xs">
            {JSON.stringify(result.recordIds, null, 2)}
          </pre>
        </details>
      </div>

      <p className="text-xs text-blue-600 mt-3 italic">
        💡 Remove this component before deploying to production
      </p>
    </div>
  );
}
