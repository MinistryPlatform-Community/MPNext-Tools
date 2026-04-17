"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";
import type { ToolParams } from "@/lib/tool-params";
import { ParamsPanel } from "./panels/params-panel";
import { SelectionPanel } from "./panels/selection-panel";
import { ContactRecordsPanel } from "./panels/contact-records-panel";
import { UserToolsPanel } from "./panels/user-tools-panel";
import { DeployToolPanel } from "./panels/deploy-tool-panel";

const STORAGE_KEY = "mp-dev-panel:open";

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function isDevBuild(): boolean {
  return process.env.NODE_ENV === "development";
}

function readOpenState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOpenState(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // ignore — storage unavailable (private mode, quota, etc.)
  }
}

interface DevPanelProps {
  params: ToolParams;
}

export function DevPanel({ params }: DevPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectionRecordIds, setSelectionRecordIds] = useState<number[]>();
  const [userToolsRefreshKey, setUserToolsRefreshKey] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOpen(readOpenState());
  }, []);

  if (!mounted) return null;
  if (!isDevBuild()) return null;
  if (!isLocalhost()) return null;

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      writeOpenState(next);
      return next;
    });
  };

  const summaryBits: string[] = [];
  if (params.pageID !== undefined) summaryBits.push(`page ${params.pageID}`);
  if (params.s !== undefined) summaryBits.push(`selection ${params.s}`);
  if (params.recordID !== undefined) summaryBits.push(`record ${params.recordID}`);
  const summary = summaryBits.length > 0 ? summaryBits.join(" · ") : "no params";

  return (
    <div
      data-testid="dev-panel"
      className="bg-slate-900 text-slate-100 border-b border-slate-800"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse dev panel" : "Expand dev panel"}
        className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-mono hover:bg-slate-800 transition-colors"
      >
        <Terminal className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold text-amber-400">DEV</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-300 truncate">{summary}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          data-testid="dev-panel-body"
          className="p-4 space-y-4 bg-slate-50 text-slate-900"
        >
          <ParamsPanel params={params} />
          <SelectionPanel params={params} onRecordIdsResolved={setSelectionRecordIds} />
          <ContactRecordsPanel params={params} selectionRecordIds={selectionRecordIds} />
          <UserToolsPanel
            refreshKey={userToolsRefreshKey}
            onAuthorizationChange={setIsAuthorized}
          />
          {!isAuthorized && (
            <DeployToolPanel onDeployed={() => setUserToolsRefreshKey((k) => k + 1)} />
          )}
        </div>
      )}
    </div>
  );
}
