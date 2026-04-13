"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactSearchCombobox } from "./contact-search-combobox";
import { TagManager } from "./tag-manager";
import {
  CONGREGATIONS,
  GROUP_FOCUS_MEN,
  GROUP_FOCUS_WOMEN,
  GROUP_FOCUS_MEN_AND_WOMEN,
} from "./schemas";
import type { TeamWizardFormValues } from "./schemas";
import type { TeamWizardLookupData } from "@/lib/dto";

interface StepMinistryCampusProps {
  lookupData: TeamWizardLookupData;
  initialContactName?: string;
}

const FOCUS_OPTIONS = [
  { id: GROUP_FOCUS_MEN, label: "Men" },
  { id: GROUP_FOCUS_WOMEN, label: "Women" },
  { id: GROUP_FOCUS_MEN_AND_WOMEN, label: "Men & Women" },
];

export function StepMinistryCampus({ lookupData, initialContactName }: StepMinistryCampusProps) {
  const form = useFormContext<TeamWizardFormValues>();
  const [contactDisplayName, setContactDisplayName] = useState(initialContactName ?? "");

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="congregationId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Campus <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => field.onChange(Number(val))}
                className="flex gap-4"
              >
                {CONGREGATIONS.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <RadioGroupItem value={String(c.id)} id={`campus-${c.id}`} />
                    <Label htmlFor={`campus-${c.id}`} className="cursor-pointer">
                      {c.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ministryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ministry <span className="text-red-500">*</span></FormLabel>
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={(val) => field.onChange(Number(val))}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a ministry" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {lookupData.ministries.map((m) => (
                  <SelectItem key={m.Ministry_ID} value={String(m.Ministry_ID)}>
                    {m.Ministry_Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="groupFocusId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group Focus</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => field.onChange(Number(val))}
                className="flex gap-4"
              >
                {FOCUS_OPTIONS.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <RadioGroupItem value={String(f.id)} id={`focus-${f.id}`} />
                    <Label htmlFor={`focus-${f.id}`} className="cursor-pointer">
                      {f.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="primaryContactId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Primary Contact / Leader <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <ContactSearchCombobox
                value={field.value}
                displayName={contactDisplayName}
                onChange={(id, name) => {
                  field.onChange(id);
                  setContactDisplayName(name);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tagIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tags</FormLabel>
            <FormControl>
              <TagManager
                allTags={lookupData.tags}
                selectedTagIds={field.value ?? []}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
