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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GroupWizardFormValues } from "./schemas";
import type { GroupWizardLookupData } from "@/lib/dto";

interface StepBasicInfoProps {
  lookupData: GroupWizardLookupData;
}

export function StepBasicInfo({ lookupData }: StepBasicInfoProps) {
  const form = useFormContext<GroupWizardFormValues>();

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
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
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

      <div className="grid gap-4 sm:grid-cols-3">
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
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meetingTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Time <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="meetingDayId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Day <span className="text-red-500">*</span></FormLabel>
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => field.onChange(Number(val))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookupData.meetingDays.map((d) => (
                    <SelectItem key={d.Meeting_Day_ID} value={String(d.Meeting_Day_ID)}>
                      {d.Meeting_Day}
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
          name="meetingFrequencyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency <span className="text-red-500">*</span></FormLabel>
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => field.onChange(Number(val))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookupData.meetingFrequencies.map((f) => (
                    <SelectItem key={f.Meeting_Frequency_ID} value={String(f.Meeting_Frequency_ID)}>
                      {f.Meeting_Frequency}
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
          name="meetingDurationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration <span className="text-red-500">*</span></FormLabel>
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => field.onChange(Number(val))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookupData.meetingDurations.map((d) => (
                    <SelectItem key={d.Meeting_Duration_ID} value={String(d.Meeting_Duration_ID)}>
                      {d.Meeting_Duration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="facebookGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facebook Group URL</FormLabel>
              <FormControl>
                <Input placeholder="Facebook group URL (optional, max 64 characters)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Size</FormLabel>
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
    </div>
  );
}
