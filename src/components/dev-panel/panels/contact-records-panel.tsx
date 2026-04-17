"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, Info } from "lucide-react";
import { resolveContactRecords } from "./contact-records-actions";
import type { ToolParams } from "@/lib/tool-params";
import type { ContactRecordResult } from "@/services/toolService";

interface ContactRecordsPanelProps {
  params: ToolParams;
  selectionRecordIds?: number[];
}

export function ContactRecordsPanel({ params, selectionRecordIds }: ContactRecordsPanelProps) {
  const [result, setResult] = useState<ContactRecordResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactIdField = params.pageData?.Contact_ID_Field;
  const tableName = params.pageData?.Table_Name;
  const primaryKey = params.pageData?.Primary_Key;

  const hasSingleRecord = params.recordID !== undefined && params.recordID > 0;
  const hasSelection = selectionRecordIds !== undefined && selectionRecordIds.length > 0;
  const canResolve = contactIdField && tableName && primaryKey && (hasSingleRecord || hasSelection);

  useEffect(() => {
    if (!canResolve) return;

    const recordIds = hasSingleRecord ? [params.recordID!] : selectionRecordIds!;

    setLoading(true);
    setError(null);

    async function fetchContacts() {
      try {
        const data = await resolveContactRecords(tableName!, primaryKey!, contactIdField!, recordIds);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resolve contact records");
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [canResolve, hasSingleRecord, params.recordID, selectionRecordIds, tableName, primaryKey, contactIdField]);

  if (!contactIdField) return null;
  if (!hasSingleRecord && !hasSelection) return null;

  if (loading) {
    return (
      <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-green-600 mt-0.5 animate-spin" />
          <div>
            <h3 className="font-semibold text-green-900 text-sm mb-1">
              Development Mode - Loading Contact Records...
            </h3>
            <p className="text-xs text-green-700">
              Resolving Contact IDs from {hasSingleRecord ? "record" : "selection"}...
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
              Development Mode - Contact Records Error
            </h3>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const displayIds = result.records.slice(0, 5);
  const remaining = result.records.length - displayIds.length;

  return (
    <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-lg mb-6">
      <details className="group" open>
        <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-green-100 rounded-lg transition-colors">
          <Users className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 text-sm">
              Development Mode - Contact Records
            </h3>
            <p className="text-xs text-green-700 mt-0.5">
              {result.records.length} contact{result.records.length !== 1 ? "s" : ""} resolved
            </p>
          </div>
          <svg className="w-5 h-5 text-green-600 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded border border-green-200 px-3 py-2">
              <div className="text-xs font-mono text-gray-500 mb-1">Record Count</div>
              <div className="text-sm font-medium text-green-900">{result.records.length}</div>
            </div>
            <div className="bg-white rounded border border-green-200 px-3 py-2">
              <div className="text-xs font-mono text-gray-500 mb-1">Table</div>
              <div className="text-sm font-medium text-green-900">{result.tableName}</div>
            </div>
            <div className="bg-white rounded border border-green-200 px-3 py-2">
              <div className="text-xs font-mono text-gray-500 mb-1">Primary Key</div>
              <div className="text-sm font-medium text-green-900">{result.primaryKey}</div>
            </div>
            <div className="bg-white rounded border border-green-200 px-3 py-2">
              <div className="text-xs font-mono text-gray-500 mb-1">Contact_ID_Field</div>
              <div className="text-sm font-medium text-green-900">{result.contactIdField}</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="text-xs font-mono text-gray-500 mb-1">Contact IDs</div>
            <div className="flex flex-wrap gap-1.5">
              {displayIds.map((rec) => (
                <span
                  key={rec.recordId}
                  className="inline-flex items-center bg-white border border-green-200 rounded px-2 py-0.5 text-xs font-mono text-green-900"
                >
                  {rec.contactId}
                </span>
              ))}
              {remaining > 0 && (
                <span className="inline-flex items-center text-xs text-green-700">
                  +{remaining} more
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-green-200">
            <details className="text-xs">
              <summary className="cursor-pointer text-green-700 font-medium hover:text-green-900">
                View Raw JSON
              </summary>
              <pre className="mt-2 bg-white p-3 rounded border border-green-200 overflow-x-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </details>
    </div>
  );
}
