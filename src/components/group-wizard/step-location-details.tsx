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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TagManager } from "@/components/shared/tag-manager";
import { RoomSelect } from "./room-select";
import {
  CONGREGATIONS,
  MEETING_TYPE_OPTIONS,
  MEETING_TYPE_ONSITE,
  MEETING_TYPE_OFFSITE,
  MEETING_TYPE_ONLINE,
  CHILDREN_OPTIONS,
} from "./schemas";
import type { GroupWizardFormValues } from "./schemas";
import type { GroupWizardLookupData } from "@/lib/dto";

interface StepLocationDetailsProps {
  lookupData: GroupWizardLookupData;
}

export function StepLocationDetails({ lookupData }: StepLocationDetailsProps) {
  const form = useFormContext<GroupWizardFormValues>();
  const meetingTypeId = form.watch("meetingTypeId");
  const congregationId = form.watch("congregationId");
  const isOnsite = meetingTypeId === MEETING_TYPE_ONSITE;
  const isOffsite = meetingTypeId === MEETING_TYPE_OFFSITE;
  const isOnline = meetingTypeId === MEETING_TYPE_ONLINE;
  const hybridEnabled = isOnsite || isOffsite;

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
                className="flex flex-wrap gap-4"
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
        name="meetingTypeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Meeting Type <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => {
                  const newType = Number(val);
                  field.onChange(newType);
                  // Reset hybrid when switching to Online
                  if (newType === MEETING_TYPE_ONLINE) {
                    form.setValue("hybrid", false);
                  }
                  // Clear room when switching away from Onsite
                  if (newType !== MEETING_TYPE_ONSITE) {
                    form.setValue("defaultRoom", undefined);
                  }
                  // Clear offsite address when switching away from Offsite
                  if (newType !== MEETING_TYPE_OFFSITE) {
                    form.setValue("offsiteAddress", undefined);
                  }
                }}
                className="flex flex-wrap gap-4"
              >
                {MEETING_TYPE_OPTIONS.map((mt) => (
                  <div key={mt.id} className="flex items-center gap-2">
                    <RadioGroupItem value={String(mt.id)} id={`mt-${mt.id}`} />
                    <Label htmlFor={`mt-${mt.id}`} className="cursor-pointer">
                      {mt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-wrap gap-6">
        <FormField
          control={form.control}
          name="hybrid"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!hybridEnabled}
                />
              </FormControl>
              <FormLabel className="cursor-pointer">Hybrid (also meets online)</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confidential"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="cursor-pointer">Confidential</FormLabel>
            </FormItem>
          )}
        />
      </div>

      {isOnsite && (
        <FormField
          control={form.control}
          name="defaultRoom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room</FormLabel>
              <FormControl>
                <RoomSelect
                  congregationId={congregationId}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isOffsite && (
        <div className="space-y-4 rounded-md border p-4">
          <h3 className="text-sm font-medium text-gray-700">Offsite Address</h3>

          <FormField
            control={form.control}
            name="offsiteAddress.addressLine1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1 <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Street address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="offsiteAddress.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offsiteAddress.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offsiteAddress.postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {!isOnline && !isOnsite && !isOffsite ? null : null}

      <FormField
        control={form.control}
        name="children"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Children / Childcare <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-wrap gap-4"
              >
                {CHILDREN_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`child-${opt.value}`} />
                    <Label htmlFor={`child-${opt.value}`} className="cursor-pointer">
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
