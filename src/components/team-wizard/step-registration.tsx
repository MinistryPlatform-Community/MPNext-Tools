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
import type { TeamWizardFormValues } from "./schemas";

export function StepRegistration() {
  const form = useFormContext<TeamWizardFormValues>();
  const meetingLocationOnCampus = form.watch("meetingLocationOnCampus");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="registrationStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Start <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="registrationEnd"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration End (optional)</FormLabel>
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
        name="meetingLocationOnCampus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Meeting Location</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? "on-campus" : "offsite"}
                onValueChange={(val) => field.onChange(val === "on-campus")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="on-campus" id="loc-on-campus" />
                  <Label htmlFor="loc-on-campus" className="cursor-pointer">
                    On Campus
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="offsite" id="loc-offsite" />
                  <Label htmlFor="loc-offsite" className="cursor-pointer">
                    Offsite
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {meetingLocationOnCampus === false && (
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

          <FormField
            control={form.control}
            name="offsiteAddress.addressLine2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2 (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Apt, suite, etc." {...field} />
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
    </div>
  );
}
