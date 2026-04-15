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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GroupWizardFormData } from "./schema";
import type { GroupWizardLookups } from "./types";

interface StepAttributesProps {
  lookups: GroupWizardLookups;
}

export function StepAttributes({ lookups }: StepAttributesProps) {
  const form = useFormContext<GroupWizardFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Group Attributes</h2>
        <p className="text-sm text-muted-foreground">
          Set the size, focus, and additional details for this group.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="Target_Size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Size</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 12"
                  min={1}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              </FormControl>
              <FormDescription>Target number of members</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Life_Stage_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Life Stage</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select life stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.lifeStages.map((item) => (
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
          name="Group_Focus_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Focus</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select focus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.groupFocuses.map((item) => (
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
          name="Required_Book"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Book</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select book" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.books.map((item) => (
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
          name="SMS_Number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SMS Number</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select SMS number" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.smsNumbers.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>SMS number for group communications</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Group_Is_Full"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4 sm:col-span-2">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Group Is Full</FormLabel>
                <FormDescription>Mark this group as full to prevent new members</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
