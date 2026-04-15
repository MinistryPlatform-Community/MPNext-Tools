"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactSearch } from "./contact-search";
import { GroupSearch } from "./group-search";
import type { GroupWizardFormData } from "./schema";
import type { GroupWizardLookups } from "./types";

interface StepOrganizationProps {
  lookups: GroupWizardLookups;
  contactDisplayMap: Map<number, string>;
  groupDisplayMap: Map<number, string>;
  onContactSelect: (id: number, name: string) => void;
  onGroupSelect: (field: string, id: number | null, name: string) => void;
}

export function StepOrganization({
  lookups,
  contactDisplayMap,
  groupDisplayMap,
  onContactSelect,
  onGroupSelect,
}: StepOrganizationProps) {
  const form = useFormContext<GroupWizardFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Organization & People</h2>
        <p className="text-sm text-muted-foreground">
          Assign this group to a congregation, ministry, and primary contact.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="Congregation_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Congregation *</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(Number(val))}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select congregation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.congregations.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
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
          name="Ministry_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ministry *</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(Number(val))}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select ministry" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.ministries.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
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
          name="Primary_Contact"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Primary Contact *</FormLabel>
              <FormControl>
                <ContactSearch
                  value={field.value}
                  displayName={contactDisplayMap.get(field.value)}
                  onSelect={(id, name) => {
                    field.onChange(id);
                    onContactSelect(id, name);
                  }}
                />
              </FormControl>
              <FormDescription>
                Search by name to find the primary contact for this group
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Parent_Group"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Group</FormLabel>
              <FormControl>
                <GroupSearch
                  value={field.value}
                  displayName={field.value ? groupDisplayMap.get(field.value) : undefined}
                  onSelect={(id, name) => {
                    field.onChange(id);
                    onGroupSelect("Parent_Group", id, name);
                  }}
                  placeholder="Search parent group..."
                />
              </FormControl>
              <FormDescription>Optional hierarchy parent</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Priority_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.priorities.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
