"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { GROUP_TYPE_OPTIONS } from "./schemas";
import type { TeamWizardFormValues } from "./schemas";

export function StepBasicInfo() {
  const form = useFormContext<TeamWizardFormValues>();

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="groupName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="Enter group name (5-75 characters)" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="groupTypeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group Type <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => field.onChange(Number(val))}
                className="flex flex-wrap gap-x-6 gap-y-2"
              >
                {GROUP_TYPE_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <RadioGroupItem value={String(opt.id)} id={`type-${opt.id}`} />
                    <Label htmlFor={`type-${opt.id}`} className="cursor-pointer">
                      {opt.label}
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
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe this group (50-1024 characters)"
                rows={4}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date (optional)</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="maxSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Max Size (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                placeholder="Leave blank for unlimited"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
