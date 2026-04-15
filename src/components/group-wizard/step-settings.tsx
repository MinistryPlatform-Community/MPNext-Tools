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
import { GroupSearch } from "./group-search";
import type { GroupWizardFormData } from "./schema";
import type { GroupWizardLookups } from "./types";

interface StepSettingsProps {
  lookups: GroupWizardLookups;
  groupDisplayMap: Map<number, string>;
  onGroupSelect: (field: string, id: number | null, name: string) => void;
}

function SwitchRow({
  name,
  label,
  description,
}: {
  name: keyof GroupWizardFormData;
  label: string;
  description: string;
}) {
  const form = useFormContext<GroupWizardFormData>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value as boolean}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function StepSettings({ groupDisplayMap, onGroupSelect }: StepSettingsProps) {
  const form = useFormContext<GroupWizardFormData>();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings & Promotion</h2>
        <p className="text-sm text-muted-foreground">
          Configure visibility, notifications, check-in, and promotion settings.
        </p>
      </div>

      {/* Visibility & Communication */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Visibility & Communication
        </h3>
        <div className="grid gap-3">
          <SwitchRow
            name="Available_Online"
            label="Available Online"
            description="Show this group in online directories"
          />
          <SwitchRow
            name={"Available_On_App" as keyof GroupWizardFormData}
            label="Available On App"
            description="Show this group in the mobile app"
          />
          <SwitchRow
            name="Enable_Discussion"
            label="Enable Discussion"
            description="Allow group discussion features"
          />
          <SwitchRow
            name="Send_Attendance_Notification"
            label="Send Attendance Notification"
            description="Send notifications when attendance is recorded"
          />
          <SwitchRow
            name="Send_Service_Notification"
            label="Send Service Notification"
            description="Send service-related notifications"
          />
          <SwitchRow
            name="Create_Next_Meeting"
            label="Create Next Meeting"
            description="Automatically create the next scheduled meeting"
          />
        </div>
      </div>

      {/* Check-in & Classroom */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Check-in & Classroom
        </h3>
        <div className="grid gap-3">
          <SwitchRow
            name={"Secure_Check-in" as keyof GroupWizardFormData}
            label="Secure Check-in"
            description="Enable secure check-in for this group"
          />
          <SwitchRow
            name="Suppress_Nametag"
            label="Suppress Nametag"
            description="Do not print name tags for this group"
          />
          <SwitchRow
            name="Suppress_Care_Note"
            label="Suppress Care Note"
            description="Do not show care notes during check-in"
          />
          <SwitchRow
            name="On_Classroom_Manager"
            label="On Classroom Manager"
            description="Include in Classroom Manager"
          />
        </div>
      </div>

      {/* Promotion */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Promotion
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="Promote_to_Group"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Promote to Group</FormLabel>
                <FormControl>
                  <GroupSearch
                    value={field.value}
                    displayName={field.value ? groupDisplayMap.get(field.value) : undefined}
                    onSelect={(id, name) => {
                      field.onChange(id);
                      onGroupSelect("Promote_to_Group", id, name);
                    }}
                    placeholder="Search promotion target group..."
                  />
                </FormControl>
                <FormDescription>Group members are promoted into</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="Age_in_Months_to_Promote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age to Promote (months)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 24"
                    min={0}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="Promotion_Date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promotion Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
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
            name="Descended_From"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Descended From</FormLabel>
                <FormControl>
                  <GroupSearch
                    value={field.value}
                    displayName={field.value ? groupDisplayMap.get(field.value) : undefined}
                    onSelect={(id, name) => {
                      field.onChange(id);
                      onGroupSelect("Descended_From", id, name);
                    }}
                    placeholder="Search original group..."
                  />
                </FormControl>
                <FormDescription>The original group this was derived from</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-3">
          <SwitchRow
            name="Promote_Weekly"
            label="Promote Weekly"
            description="Promote participants on a weekly basis"
          />
          <SwitchRow
            name="Promote_Participants_Only"
            label="Promote Participants Only"
            description="Only promote active participants"
          />
        </div>
      </div>
    </div>
  );
}
