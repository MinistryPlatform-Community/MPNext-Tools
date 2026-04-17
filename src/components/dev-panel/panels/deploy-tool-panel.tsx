"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Rocket,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type {
  DeployToolInput,
  DeployToolResult,
  PageLookup,
  RoleLookup,
} from "@/services/toolService";
import {
  deployToolAction,
  getDeployToolEnvStatusAction,
  listPagesAction,
  listRolesAction,
  type DeployToolEnvStatus,
} from "./deploy-tool-actions";

interface DeployToolPanelProps {
  onDeployed?: () => void;
}

const ADMINISTRATORS_ROLE_NAME = "Administrators";

export function DeployToolPanel({ onDeployed }: DeployToolPanelProps = {}) {
  const pathname = usePathname();

  const prodBase = useMemo(
    () => (process.env.NEXT_PUBLIC_PROD_URL ?? "").replace(/\/$/, ""),
    []
  );
  const defaultLaunchPage = prodBase ? `${prodBase}${pathname}` : "";

  const [toolName, setToolName] = useState("");
  const [description, setDescription] = useState("");
  const [launchPage, setLaunchPage] = useState(defaultLaunchPage);
  const [launchWithCredentials, setLaunchWithCredentials] = useState(false);
  const [launchWithParameters, setLaunchWithParameters] = useState(true);
  const [launchInNewTab, setLaunchInNewTab] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(false);
  const [additionalData, setAdditionalData] = useState("");

  const [selectedPages, setSelectedPages] = useState<PageLookup[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<RoleLookup[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeployToolResult | null>(null);
  const [envStatus, setEnvStatus] = useState<DeployToolEnvStatus | null>(null);

  // Reset the deploy UI when route changes.
  useEffect(() => {
    setLaunchPage(defaultLaunchPage);
  }, [defaultLaunchPage]);

  // Check server-side dev credentials on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getDeployToolEnvStatusAction();
        if (!cancelled) setEnvStatus(status);
      } catch {
        if (!cancelled) setEnvStatus({ hasDevCreds: false, missing: ["MINISTRY_PLATFORM_DEV_CLIENT_ID", "MINISTRY_PLATFORM_DEV_CLIENT_SECRET"] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const credsMissing = envStatus !== null && !envStatus.hasDevCreds;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setResult(null);
      setSubmitting(true);

      try {
        const input: DeployToolInput = {
          toolName,
          description: description || undefined,
          launchPage,
          launchWithCredentials,
          launchWithParameters,
          launchInNewTab,
          showOnMobile,
          pageIds: selectedPages.map((p) => p.Page_ID),
          additionalData: additionalData || undefined,
          // Administrators is enforced server-side too, but double up here.
          roleIds: dedupe([
            ...selectedRoles.map((r) => r.Role_ID),
          ]),
        };
        const res = await deployToolAction(input);
        setResult(res);
        onDeployed?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setSubmitting(false);
      }
    },
    [
      toolName,
      description,
      launchPage,
      launchWithCredentials,
      launchWithParameters,
      launchInNewTab,
      showOnMobile,
      selectedPages,
      additionalData,
      selectedRoles,
      onDeployed,
    ]
  );

  return (
    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg mb-6">
      <details className="group">
        <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors">
          <Rocket className="w-5 h-5 text-slate-700" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-sm">
              Development Mode - Deploy Tool to Ministry Platform
            </h3>
            <p className="text-xs text-slate-600">
              Uses <code className="bg-slate-200 px-1 rounded">api_dev_DeployTool</code> via dev credentials. Upserts dp_Tools, maps pages, grants roles.
            </p>
          </div>
          <svg
            className="w-5 h-5 text-slate-700 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>

        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4">
          {credsMissing && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900">
                <p className="font-semibold mb-1">Dev credentials not configured</p>
                <p>
                  The following environment variable{envStatus && envStatus.missing.length === 1 ? " is" : "s are"} missing and must be set in{" "}
                  <code className="bg-amber-100 px-1 rounded">.env.local</code> for Deploy Tool to work:
                </p>
                <ul className="mt-1 ml-4 list-disc">
                  {envStatus?.missing.map((name) => (
                    <li key={name}>
                      <code className="bg-amber-100 px-1 rounded">{name}</code>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-amber-800">
                  The Deploy button is disabled until these are set. This is a development-only feature; it will not work in production.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Tool Name *" hint="max 30 chars">
              <Input
                value={toolName}
                onChange={(e) => setToolName(e.target.value.slice(0, 30))}
                required
                maxLength={30}
                placeholder="AddressLabelPrinter"
                className="bg-white"
              />
            </FormField>

            <FormField label="Launch Page *" hint="max 1024 chars; prefilled from NEXT_PUBLIC_PROD_URL + pathname">
              <Input
                value={launchPage}
                onChange={(e) => setLaunchPage(e.target.value.slice(0, 1024))}
                required
                maxLength={1024}
                placeholder="https://tools.example.org/tools/address-labels"
                className="bg-white"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Description" hint="max 100 chars">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 100))}
                maxLength={100}
                rows={3}
                placeholder="Prints address labels with IMb barcodes"
                className="bg-white"
              />
            </FormField>

            <FormField label="Additional Data" hint="max 65 chars; applied to each new dp_Tool_Pages row">
              <Textarea
                value={additionalData}
                onChange={(e) => setAdditionalData(e.target.value.slice(0, 65))}
                maxLength={65}
                rows={3}
                placeholder="Optional query string, key, etc."
                className="bg-white"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded border border-input bg-white">
            <FlagCheckbox id="flag-creds" label="Launch w/ Credentials" checked={launchWithCredentials} onChange={setLaunchWithCredentials} />
            <FlagCheckbox id="flag-params" label="Launch w/ Parameters" checked={launchWithParameters} onChange={setLaunchWithParameters} />
            <FlagCheckbox id="flag-newtab" label="Launch in New Tab" checked={launchInNewTab} onChange={setLaunchInNewTab} />
            <FlagCheckbox id="flag-mobile" label="Show on Mobile" checked={showOnMobile} onChange={setShowOnMobile} />
          </div>

          <LookupMultiSelect<PageLookup>
            label="Pages"
            hint="dp_Pages.Page_ID — where this tool is available"
            selected={selectedPages}
            onSelectedChange={setSelectedPages}
            getId={(p) => p.Page_ID}
            getLabel={(p) => `${p.Display_Name} (#${p.Page_ID})`}
            getName={(p) => p.Display_Name}
            fetcher={listPagesAction}
          />

          <LookupMultiSelect<RoleLookup>
            label="Roles"
            hint="dp_Roles.Role_ID — Administrators is always granted by the stored procedure"
            selected={selectedRoles}
            onSelectedChange={setSelectedRoles}
            getId={(r) => r.Role_ID}
            getLabel={(r) => `${r.Role_Name} (#${r.Role_ID})`}
            getName={(r) => r.Role_Name}
            lockedName={ADMINISTRATORS_ROLE_NAME}
            autoSelectLocked
            fetcher={listRolesAction}
          />

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-900 break-all">{error}</div>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-900">
                  Deployed <strong>{result.tool.Tool_Name}</strong> (Tool_ID <code className="bg-green-100 px-1 rounded">{result.tool.Tool_ID}</code>)
                </div>
              </div>
              <div className="text-xs text-green-800 pl-6">
                {result.pages.length} page mapping{result.pages.length === 1 ? "" : "s"} · {result.roles.length} role grant{result.roles.length === 1 ? "" : "s"}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={submitting || credsMissing}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Deploying…
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-1" />
                  Deploy Tool
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500">
              Calls <code className="bg-slate-200 px-1 rounded">api_dev_DeployTool</code>. DomainID is injected by MP.
            </p>
          </div>
        </form>
      </details>
    </div>
  );
}

// ========== small internal bits ==========

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FlagCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span>{label}</span>
    </label>
  );
}

interface LookupMultiSelectProps<T> {
  label: string;
  hint?: string;
  selected: T[];
  onSelectedChange: (next: T[]) => void;
  getId: (item: T) => number;
  getLabel: (item: T) => string;
  getName: (item: T) => string;
  /** Name of an item that can never be removed (and is auto-added if `autoSelectLocked`). */
  lockedName?: string;
  autoSelectLocked?: boolean;
  fetcher: (search?: string) => Promise<T[]>;
}

function LookupMultiSelect<T>({
  label,
  hint,
  selected,
  onSelectedChange,
  getId,
  getLabel,
  getName,
  lockedName,
  autoSelectLocked,
  fetcher,
}: LookupMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const items = await fetcher(search);
        setOptions(items);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Load failed");
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetcher]);

  // Auto-add the locked item once it's available in the options.
  useEffect(() => {
    if (!autoSelectLocked || !lockedName || autoSelectedRef.current) return;
    const locked = options.find((o) => getName(o) === lockedName);
    if (!locked) return;
    const already = selected.some((s) => getId(s) === getId(locked));
    if (!already) {
      onSelectedChange([...selected, locked]);
    }
    autoSelectedRef.current = true;
  }, [options, autoSelectLocked, lockedName, selected, onSelectedChange, getId, getName]);

  const toggle = (item: T) => {
    const id = getId(item);
    const already = selected.some((s) => getId(s) === id);
    if (already) {
      onSelectedChange(selected.filter((s) => getId(s) !== id));
    } else {
      onSelectedChange([...selected, item]);
    }
  };

  const isLocked = (item: T) => !!lockedName && getName(item) === lockedName;

  const removeChip = (item: T) => {
    if (isLocked(item)) return;
    onSelectedChange(selected.filter((s) => getId(s) !== getId(item)));
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>

      <div className="flex flex-wrap gap-1 min-h-8 p-1.5 rounded border border-input bg-white">
        {selected.length === 0 && (
          <span className="text-xs text-slate-400 px-1">No items selected</span>
        )}
        {selected.map((item) => {
          const locked = isLocked(item);
          return (
            <Badge
              key={getId(item)}
              variant="secondary"
              className={`gap-1 text-xs ${locked ? "bg-amber-100 text-amber-900 border-amber-300" : ""}`}
            >
              {getLabel(item)}
              {!locked && (
                <button
                  type="button"
                  onClick={() => removeChip(item)}
                  className="hover:text-red-700"
                  aria-label={`Remove ${getLabel(item)}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          );
        })}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
            >
              <ChevronsUpDown className="w-3 h-3 mr-1" />
              Add…
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[320px]" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={`Search ${label.toLowerCase()}…`}
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {loading && (
                  <div className="p-2 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </div>
                )}
                {fetchError && (
                  <div className="p-2 text-xs text-red-700">{fetchError}</div>
                )}
                {!loading && !fetchError && options.length === 0 && (
                  <CommandEmpty>No results.</CommandEmpty>
                )}
                {!loading && !fetchError && options.length > 0 && (
                  <CommandGroup>
                    {options.map((item) => {
                      const checked = selected.some((s) => getId(s) === getId(item));
                      return (
                        <CommandItem
                          key={getId(item)}
                          value={String(getId(item))}
                          onSelect={() => toggle(item)}
                        >
                          <Checkbox checked={checked} className="mr-2" />
                          {getLabel(item)}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function dedupe(ids: number[]): number[] {
  return Array.from(new Set(ids));
}
