"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ToolContainer } from "@/components/tool";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Users, UserPlus, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToolParams } from "@/lib/tool-params";
import {
  emptyHousehold,
  emptyMember,
  type Household,
  type FamilyLookups,
  type FamilyDefaults,
  type FamilyMember,
  type FamilyAddress,
  type ContactSearchResult,
  type SaveProgress,
} from "@/lib/dto/family";
import {
  searchContacts,
  fetchFamilyLookups,
  fetchFamilyDefaults,
  fetchHousehold,
  fetchNextEnvelopeNumber,
  saveFamily,
  placesEnabled,
  placeAutocomplete,
  placeDetails,
} from "./actions";
import type { PlacePrediction } from "@/lib/providers/google-places";

interface AddEditFamilyProps {
  params: ToolParams;
  initialContactId?: number | null;
}

export function AddEditFamily({ params, initialContactId }: AddEditFamilyProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [lookups, setLookups] = useState<FamilyLookups | null>(null);
  const [defaults, setDefaults] = useState<FamilyDefaults | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<string | null>(null);
  const [placesOn, setPlacesOn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [addressTab, setAddressTab] = useState<"main" | "alt">("main");
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());

  const isDirty = useMemo(
    () => household !== null && JSON.stringify(household) !== originalSnapshot,
    [household, originalSnapshot],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFamilyLookups(), fetchFamilyDefaults(), placesEnabled()])
      .then(([l, d, p]) => {
        if (cancelled) return;
        setLookups(l);
        setDefaults(d);
        setPlacesOn(p);
      })
      .catch((err) => !cancelled && setLoadError(String(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHousehold = useCallback(async (contactId: number) => {
    const result = await fetchHousehold(contactId);
    if (result.success) {
      setHousehold(result.household);
      setOriginalSnapshot(JSON.stringify(result.household));
      setExpandedMembers(new Set());
    } else {
      setLoadError(result.error);
    }
  }, []);

  useEffect(() => {
    if (!defaults) return;
    if (initialContactId && initialContactId > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadHousehold(initialContactId);
    }
  }, [initialContactId, defaults, loadHousehold]);

  const startNewFamily = useCallback(
    (lastName: string) => {
      if (!defaults) return;
      const seed = emptyHousehold(defaults, lastName);
      setHousehold(seed);
      setOriginalSnapshot(JSON.stringify(seed));
      setExpandedMembers(new Set([-1]));
    },
    [defaults],
  );

  const applySaveProgress = useCallback((progress: SaveProgress) => {
    setHousehold((h) => {
      if (!h) return h;
      const idMap = new Map(progress.members.map((m) => [m.tempContactId, m]));
      return {
        ...h,
        householdId: progress.householdId ?? h.householdId,
        address: {
          ...h.address,
          addressId: progress.mainAddressId ?? h.address.addressId,
        },
        alternateMailingAddress: {
          ...h.alternateMailingAddress,
          addressId: progress.altAddressId ?? h.alternateMailingAddress.addressId,
        },
        members: h.members.map((m) => {
          const saved = idMap.get(m.contactId);
          if (!saved) return m;
          return {
            ...m,
            contactId: saved.contactId,
            participant: m.participant
              ? { ...m.participant, participantId: saved.participantId ?? m.participant.participantId }
              : m.participant,
            donorId: saved.donorId ?? m.donorId,
            envelopeNo: saved.envelopeNo ?? m.envelopeNo,
          };
        }),
      };
    });
  }, []);

  const updateHousehold = (patch: Partial<Household>) =>
    setHousehold((h) => (h ? { ...h, ...patch } : h));

  const updateAddress = (which: "main" | "alt", patch: Partial<FamilyAddress>) =>
    setHousehold((h) => {
      if (!h) return h;
      return which === "main"
        ? { ...h, address: { ...h.address, ...patch } }
        : { ...h, alternateMailingAddress: { ...h.alternateMailingAddress, ...patch } };
    });

  const updateMember = (contactId: number, patch: Partial<FamilyMember>) =>
    setHousehold((h) => {
      if (!h) return h;
      return {
        ...h,
        members: h.members.map((m) => (m.contactId === contactId ? { ...m, ...patch } : m)),
      };
    });

  const addMember = () => {
    if (!household || !defaults) return;
    const nextId = Math.min(0, ...household.members.map((m) => m.contactId)) - 1;
    const newMember = emptyMember(nextId, household.householdName, defaults);
    setHousehold({ ...household, members: [...household.members, newMember] });
    setExpandedMembers((set) => new Set([...set, nextId]));
  };

  const toggleExpanded = (contactId: number) =>
    setExpandedMembers((set) => {
      const next = new Set(set);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });

  const handleAssignEnvelope = async (contactId: number) => {
    try {
      const next = await fetchNextEnvelopeNumber();
      updateMember(contactId, { envelopeNo: next, isDonor: true });
    } catch (err) {
      toast.error(
        `Failed to fetch next envelope #: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleSave = async () => {
    if (!household) return;
    setIsSaving(true);
    try {
      const result = await saveFamily(household);
      if (result.success) {
        applySaveProgress(result.progress);
        const reloadContactId =
          result.progress.members.find((m) => m.contactId > 0)?.contactId ?? null;
        if (reloadContactId) {
          const reload = await fetchHousehold(reloadContactId);
          if (reload.success) {
            setHousehold(reload.household);
            setOriginalSnapshot(JSON.stringify(reload.household));
          }
        }
        const bumped = result.progress.members.filter(
          (m) => m.envelopeBumped && m.envelopeNo !== null,
        );
        if (bumped.length > 0) {
          toast.warning(
            `Envelope number was already taken — reassigned to ${bumped
              .map((m) => `#${m.envelopeNo}`)
              .join(", ")}`,
          );
        } else {
          toast.success("Family saved");
        }
      } else {
        if (result.progress) applySaveProgress(result.progress);
        toast.error(`Save failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(
        `Save failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setConfirmCloseOpen(true);
    } else {
      router.back();
    }
  };

  return (
    <>
    <ToolContainer
      params={params}
      title="Add/Edit Family"
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Add/Edit Family</p>
          <p className="text-sm">
            Search to find an existing household to edit, or click + New Family to create one.
          </p>
        </div>
      }
      onSave={handleSave}
      onClose={handleClose}
      isSaving={isSaving}
    >
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        {loadError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <FamilySearchBar
          onLoadExisting={loadHousehold}
          onCreateNew={startNewFamily}
          disabled={!defaults || !lookups || isSaving}
        />

        {!household ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Search to find an existing household, or click <strong>+ New Family</strong> in the
              search results to start a new one.
            </CardContent>
          </Card>
        ) : lookups && defaults ? (
          <>
            <HouseholdPanel
              household={household}
              lookups={lookups}
              onChange={updateHousehold}
              onAddressChange={updateAddress}
              addressTab={addressTab}
              onAddressTabChange={setAddressTab}
              placesOn={placesOn}
            />

            <div className="space-y-3">
              {household.members.map((member, idx) => (
                <MemberCard
                  key={member.contactId}
                  member={member}
                  index={idx}
                  isHead1={idx === 0}
                  isHead2={idx === 1}
                  areHeadsMarried={household.areHeadsMarried}
                  onMarriedChange={(v) => updateHousehold({ areHeadsMarried: v })}
                  expanded={expandedMembers.has(member.contactId)}
                  onToggleExpanded={() => toggleExpanded(member.contactId)}
                  lookups={lookups}
                  onChange={(patch) => updateMember(member.contactId, patch)}
                  onAssignEnvelope={() => handleAssignEnvelope(member.contactId)}
                />
              ))}

              <Button variant="outline" onClick={addMember} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Family Member
              </Button>
            </div>

          </>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading…
            </CardContent>
          </Card>
        )}
      </div>
    </ToolContainer>
    <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to this household. Closing will discard them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setConfirmCloseOpen(false);
              router.back();
            }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

// ============================================================================
// Search bar
// ============================================================================

interface FamilySearchBarProps {
  onLoadExisting: (contactId: number) => void;
  onCreateNew: (lastName: string) => void;
  disabled?: boolean;
}

function FamilySearchBar({ onLoadExisting, onCreateNew, disabled }: FamilySearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      setResults(await searchContacts(term));
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  return (
    <Card>
      <CardContent className="py-4">
        <Label className="text-xs mb-1.5 block">
          Find or Add Family <span className="text-destructive">*</span>
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
              disabled={disabled}
            >
              <span className="text-muted-foreground">
                Search a name, email, or address…
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Type a name…"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {isSearching && (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Searching…
                  </div>
                )}
                {!isSearching && query.trim().length >= 2 && results.length === 0 && (
                  <CommandEmpty>No contacts found.</CommandEmpty>
                )}
                {!isSearching && query.trim().length < 2 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Type at least 2 characters
                  </div>
                )}
                {results.length > 0 && (
                  <CommandGroup heading="Existing households">
                    {results.map((r) => (
                      <CommandItem
                        key={r.contactId}
                        value={String(r.contactId)}
                        onSelect={() => {
                          onLoadExisting(r.contactId);
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{r.displayName}</span>
                          {r.detail && (
                            <span className="text-xs text-muted-foreground">{r.detail}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {query.trim().length >= 2 && (
                  <CommandGroup heading="Or">
                    <CommandItem
                      value="__new__"
                      onSelect={() => {
                        onCreateNew(query.trim());
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      <span>
                        + New Family with last name &ldquo;{query.trim()}&rdquo;
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Household panel (household fields + address tabs)
// ============================================================================

interface HouseholdPanelProps {
  household: Household;
  lookups: FamilyLookups;
  onChange: (patch: Partial<Household>) => void;
  onAddressChange: (which: "main" | "alt", patch: Partial<FamilyAddress>) => void;
  addressTab: "main" | "alt";
  onAddressTabChange: (tab: "main" | "alt") => void;
  placesOn: boolean;
}

function HouseholdPanel({
  household,
  lookups,
  onChange,
  onAddressChange,
  addressTab,
  onAddressTabChange,
  placesOn,
}: HouseholdPanelProps) {
  const currentAddress =
    addressTab === "main" ? household.address : household.alternateMailingAddress;

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Last Name" required>
            <Input
              value={household.householdName}
              onChange={(e) => onChange({ householdName: e.target.value })}
            />
          </Field>
          <Field label="Congregation" required>
            <LookupSelect
              value={household.congregationId}
              options={lookups.congregations}
              onChange={(v) => onChange({ congregationId: v })}
            />
          </Field>
          <Field label="Home Phone">
            <Input
              placeholder="XXX-XXX-XXXX"
              value={household.householdPhone}
              onChange={(e) => onChange({ householdPhone: e.target.value })}
            />
          </Field>
          <Field label="Source" required>
            <LookupSelect
              value={household.sourceId}
              options={lookups.sources}
              onChange={(v) => onChange({ sourceId: v })}
            />
          </Field>
        </div>

        <div>
          <div className="flex border-b">
            <TabButton
              active={addressTab === "main"}
              onClick={() => onAddressTabChange("main")}
            >
              Main Address
            </TabButton>
            <TabButton
              active={addressTab === "alt"}
              onClick={() => onAddressTabChange("alt")}
            >
              Alt Address
            </TabButton>
          </div>

          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Country">
              <CountrySelect
                value={currentAddress.countryCode}
                options={lookups.countries}
                onChange={(v) => onAddressChange(addressTab, { countryCode: v })}
              />
            </Field>
            <Field label="Address Line 1">
              {placesOn ? (
                <AddressLine1Autocomplete
                  value={currentAddress.addressLine1 ?? ""}
                  onTextChange={(v) => onAddressChange(addressTab, { addressLine1: v })}
                  onSelect={(d) =>
                    onAddressChange(addressTab, {
                      addressLine1: d.addressLine1 || currentAddress.addressLine1,
                      city: d.city || currentAddress.city,
                      state: d.state || currentAddress.state,
                      postalCode: d.postalCode || currentAddress.postalCode,
                      countryCode: d.countryCode || currentAddress.countryCode,
                    })
                  }
                />
              ) : (
                <Input
                  placeholder="Enter a location"
                  value={currentAddress.addressLine1 ?? ""}
                  onChange={(e) =>
                    onAddressChange(addressTab, { addressLine1: e.target.value })
                  }
                />
              )}
            </Field>
            <Field label="Address Line 2">
              <Input
                value={currentAddress.addressLine2 ?? ""}
                onChange={(e) =>
                  onAddressChange(addressTab, { addressLine2: e.target.value })
                }
              />
            </Field>
            <Field label="City">
              <Input
                value={currentAddress.city ?? ""}
                onChange={(e) => onAddressChange(addressTab, { city: e.target.value })}
              />
            </Field>
            <Field label="State">
              <StateSelect
                value={currentAddress.state}
                options={lookups.states}
                onChange={(v) => onAddressChange(addressTab, { state: v })}
              />
            </Field>
            <Field label="Zip Code">
              <Input
                value={currentAddress.postalCode}
                onChange={(e) =>
                  onAddressChange(addressTab, { postalCode: e.target.value })
                }
              />
            </Field>

            {addressTab === "alt" && (
              <>
                <Field label="Season Start">
                  <Input
                    type="date"
                    value={dateInputValue(household.seasonStart)}
                    onChange={(e) =>
                      onChange({ seasonStart: e.target.value || null })
                    }
                  />
                </Field>
                <Field label="Season End">
                  <Input
                    type="date"
                    value={dateInputValue(household.seasonEnd)}
                    onChange={(e) => onChange({ seasonEnd: e.target.value || null })}
                  />
                </Field>
                <div className="flex items-center gap-2 self-end pb-1">
                  <Checkbox
                    id="repeatsAnnually"
                    checked={household.repeatsAnnually}
                    onCheckedChange={(v) => onChange({ repeatsAnnually: Boolean(v) })}
                  />
                  <Label htmlFor="repeatsAnnually" className="text-sm font-normal">
                    Repeats Annually
                  </Label>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Member card
// ============================================================================

interface MemberCardProps {
  member: FamilyMember;
  index: number;
  isHead1: boolean;
  isHead2: boolean;
  areHeadsMarried: boolean;
  onMarriedChange: (value: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  lookups: FamilyLookups;
  onChange: (patch: Partial<FamilyMember>) => void;
  onAssignEnvelope: () => void;
}

function MemberCard({
  member,
  index,
  isHead1,
  isHead2,
  areHeadsMarried,
  onMarriedChange,
  expanded,
  onToggleExpanded,
  lookups,
  onChange,
  onAssignEnvelope,
}: MemberCardProps) {
  const title = isHead1
    ? "Head of House 1"
    : isHead2
      ? "Head of House 2"
      : `Family Member ${index + 1}`;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{title}</span>
            {member.contactId > 0 && (
              <span className="text-xs text-muted-foreground">#{member.contactId}</span>
            )}
          </div>
          {isHead2 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`married-${member.contactId}`}
                checked={areHeadsMarried}
                onCheckedChange={(v) => onMarriedChange(Boolean(v))}
              />
              <Label htmlFor={`married-${member.contactId}`} className="text-sm font-normal">
                Heads are Married
              </Label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Gender">
            <LookupSelect
              value={member.genderId}
              options={lookups.genders}
              onChange={(v) => onChange({ genderId: v })}
              allowClear
            />
          </Field>
          <Field label="First Name" required>
            <Input
              value={member.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
            />
          </Field>
          <Field label="Household Position" required>
            <LookupSelect
              value={member.householdPositionId}
              options={lookups.householdPositions}
              onChange={(v) => onChange({ householdPositionId: v })}
            />
          </Field>
          <Field label="Participant Type" required>
            <LookupSelect
              value={member.participant?.participantTypeId ?? 0}
              options={lookups.participantTypes}
              onChange={(v) =>
                onChange({
                  participant: {
                    participantId: member.participant?.participantId ?? 0,
                    participantTypeId: v,
                    notes: member.participant?.notes ?? null,
                  },
                })
              }
            />
          </Field>
          <Field label="Email Address">
            <Input
              type="email"
              value={member.emailAddress}
              onChange={(e) => onChange({ emailAddress: e.target.value })}
            />
          </Field>
          <Field label="Mobile Phone">
            <Input
              placeholder="XXX-XXX-XXXX"
              value={member.mobilePhone}
              onChange={(e) => onChange({ mobilePhone: e.target.value })}
            />
          </Field>
        </div>

        <Button variant="ghost" size="sm" onClick={onToggleExpanded} className="-ml-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 mr-1" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1" />
          )}
          {expanded ? "Less" : "More"}
        </Button>

        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
            <Field label="Prefix">
              <LookupSelect
                value={member.prefixId}
                options={lookups.prefixes}
                onChange={(v) => onChange({ prefixId: v })}
                allowClear
              />
            </Field>
            <Field label="Nickname">
              <Input
                value={member.nickname}
                onChange={(e) => onChange({ nickname: e.target.value })}
              />
            </Field>
            <Field label="Middle Name">
              <Input
                value={member.middleName}
                onChange={(e) => onChange({ middleName: e.target.value })}
              />
            </Field>
            <Field label="Maiden Name">
              <Input
                value={member.maidenName}
                onChange={(e) => onChange({ maidenName: e.target.value })}
              />
            </Field>
            <Field label="Last Name" required>
              <Input
                value={member.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
              />
            </Field>
            <Field label="Suffix">
              <LookupSelect
                value={member.suffixId}
                options={lookups.suffixes}
                onChange={(v) => onChange({ suffixId: v })}
                allowClear
              />
            </Field>
            <Field label="Date of Birth">
              <Input
                type="date"
                value={dateInputValue(member.birthDate)}
                onChange={(e) => onChange({ birthDate: e.target.value || null })}
              />
            </Field>
            <Field label="Marital Status">
              <LookupSelect
                value={member.maritalStatusId}
                options={lookups.maritalStatuses}
                onChange={(v) => onChange({ maritalStatusId: v })}
                allowClear
              />
            </Field>
            <Field label="Contact Status" required>
              <LookupSelect
                value={member.contactStatusId}
                options={lookups.contactStatuses}
                onChange={(v) => onChange({ contactStatusId: v })}
              />
            </Field>
            <Field label="Primary Language">
              <LookupSelect
                value={member.primaryLanguageId ?? 0}
                options={lookups.primaryLanguages}
                onChange={(v) => onChange({ primaryLanguageId: v || null })}
                allowClear
              />
            </Field>
            <Field label="Faith Background">
              <LookupSelect
                value={member.faithBackgroundId ?? 0}
                options={lookups.faithBackgrounds}
                onChange={(v) => onChange({ faithBackgroundId: v || null })}
                allowClear
              />
            </Field>
            <div className="flex items-center gap-4 self-end pb-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`bulk-${member.contactId}`}
                  checked={member.bulkEmailOpt}
                  onCheckedChange={(v) => onChange({ bulkEmailOpt: Boolean(v) })}
                />
                <Label htmlFor={`bulk-${member.contactId}`} className="text-sm font-normal">
                  Bulk Email Opt Out
                </Label>
              </div>
              <DonorToggle
                contactId={member.contactId}
                isDonor={member.isDonor}
                hasExistingDonor={Boolean(member.donorId && member.donorId > 0)}
                onChange={(v) =>
                  onChange({ isDonor: v, ...(v ? {} : { envelopeNo: null }) })
                }
              />
            </div>
            {member.isDonor && (
              <div className="md:col-span-3 flex items-end gap-3 pt-2">
                <Field label="Envelope #">
                  <Input
                    type="number"
                    value={member.envelopeNo ?? ""}
                    onChange={(e) =>
                      onChange({
                        envelopeNo: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAssignEnvelope}
                >
                  Assign Next Envelope #
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Donor toggle (locked when a Donor record exists)
// ============================================================================

interface DonorToggleProps {
  contactId: number;
  isDonor: boolean;
  hasExistingDonor: boolean;
  onChange: (value: boolean) => void;
}

function DonorToggle({ contactId, isDonor, hasExistingDonor, onChange }: DonorToggleProps) {
  const checkbox = (
    <Checkbox
      id={`donor-${contactId}`}
      checked={isDonor}
      disabled={hasExistingDonor}
      onCheckedChange={(v) => {
        if (hasExistingDonor) return;
        onChange(Boolean(v));
      }}
    />
  );

  const row = (
    <div className="flex items-center gap-2">
      {checkbox}
      <Label
        htmlFor={`donor-${contactId}`}
        className={`text-sm font-normal ${hasExistingDonor ? "text-muted-foreground" : ""}`}
      >
        Donor
      </Label>
    </div>
  );

  if (!hasExistingDonor) return row;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent>
          Donor record exists — removing donors is not supported from this tool.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Address Line 1 autocomplete (Google Places — server-routed)
// ============================================================================

interface AddressLine1AutocompleteProps {
  value: string;
  onTextChange: (value: string) => void;
  onSelect: (details: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  }) => void;
}

function AddressLine1Autocomplete({
  value,
  onTextChange,
  onSelect,
}: AddressLine1AutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>(() => crypto.randomUUID());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelected = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      // Clear predictions on short input (debounced autocomplete).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await placeAutocomplete(value, sessionToken);
        setPredictions(results);
      } catch {
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, sessionToken]);

  const handleSelect = async (p: PlacePrediction) => {
    justSelected.current = true;
    setIsOpen(false);
    const result = await placeDetails(p.placeId, sessionToken);
    setSessionToken(crypto.randomUUID());
    if (result.success) {
      onSelect({
        addressLine1: result.details.addressLine1 || p.primary,
        city: result.details.city,
        state: result.details.state,
        postalCode: result.details.postalCode,
        countryCode: result.details.countryCode,
      });
    } else {
      onTextChange(p.full);
    }
    setPredictions([]);
  };

  return (
    <div className="relative">
      <Input
        placeholder="Start typing an address…"
        value={value}
        onChange={(e) => {
          onTextChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setIsOpen(false), 150);
        }}
      />
      {isOpen && (predictions.length > 0 || isLoading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
          )}
          {predictions.map((p) => (
            <button
              key={p.placeId}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                handleSelect(p);
              }}
            >
              <div className="font-medium">{p.primary}</div>
              {p.secondary && (
                <div className="text-xs text-muted-foreground">{p.secondary}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Small helpers
// ============================================================================

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
        active
          ? "border-primary text-primary font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

interface LookupSelectProps {
  value: number;
  options: { id: number; name: string }[];
  onChange: (value: number) => void;
  allowClear?: boolean;
}

function LookupSelect({ value, options, onChange, allowClear }: LookupSelectProps) {
  return (
    <Select
      value={value > 0 ? String(value) : ""}
      onValueChange={(v) => onChange(v === "__none__" ? 0 : Number(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {allowClear && <SelectItem value="__none__">— None —</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StateSelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { code: string; name: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.code} value={o.code}>
            {o.code} — {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CountrySelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { code: string; name: string }[];
  onChange: (value: string) => void;
}) {
  const trimmed = useMemo(() => options.slice(0, 250), [options]);
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {trimmed.map((o) => (
          <SelectItem key={o.code} value={o.code}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.split("T")[0];
}
