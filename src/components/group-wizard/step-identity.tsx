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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GroupWizardFormData } from "./schema";
import type { GroupWizardLookups } from "./types";

interface StepIdentityProps {
  lookups: GroupWizardLookups;
}

export function StepIdentity({ lookups }: StepIdentityProps) {
  const form = useFormContext<GroupWizardFormData>();
  const endDate = form.watch("End_Date");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Group Identity</h2>
        <p className="text-sm text-muted-foreground">
          Define the basic information for this group.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="Group_Name"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Group Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter group name" maxLength={75} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Group_Type_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Type *</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(Number(val))}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select group type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.groupTypes.map((item) => (
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

        <div /> {/* spacer for grid alignment */}

        <FormField
          control={form.control}
          name="Start_Date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="End_Date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormDescription>Leave blank if the group is ongoing</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {endDate && (
          <FormField
            control={form.control}
            name="Reason_Ended"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason Ended</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                  value={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lookups.groupEndedReasons.map((item) => (
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
        )}

        <FormField
          control={form.control}
          name="Description"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the purpose of this group..."
                  className="min-h-[100px] resize-y"
                  maxLength={2000}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
