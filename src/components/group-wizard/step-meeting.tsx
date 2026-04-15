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

interface StepMeetingProps {
  lookups: GroupWizardLookups;
}

export function StepMeeting({ lookups }: StepMeetingProps) {
  const form = useFormContext<GroupWizardFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Meeting Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Configure when and where this group meets.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="Meeting_Day_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Day</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.meetingDays.map((item) => (
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
          name="Meeting_Time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Time</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Meeting_Frequency_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Frequency</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.meetingFrequencies.map((item) => (
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
          name="Meeting_Duration_ID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Duration</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.meetingDurations.map((item) => (
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
          name="Default_Meeting_Room"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Meeting Room</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                value={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lookups.rooms.map((item) => (
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
          name="Offsite_Meeting_Address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Offsite Meeting Address</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Address ID"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              </FormControl>
              <FormDescription>MP Address record ID (if offsite)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Meets_Online"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4 sm:col-span-2">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Meets Online</FormLabel>
                <FormDescription>This group meets online or has a virtual option</FormDescription>
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
