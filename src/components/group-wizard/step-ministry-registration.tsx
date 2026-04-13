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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactSearchCombobox } from "@/components/team-wizard/contact-search-combobox";
import { BookSearchCombobox } from "./book-search-combobox";
import { searchContacts } from "./actions";
import {
  GROUP_FOCUS_MEN,
  GROUP_FOCUS_WOMEN,
  GROUP_FOCUS_MEN_AND_WOMEN,
} from "./schemas";
import type { GroupWizardFormValues } from "./schemas";
import type { GroupWizardLookupData } from "@/lib/dto";

interface StepMinistryRegistrationProps {
  lookupData: GroupWizardLookupData;
  initialContactName?: string;
  initialBookTitle?: string;
}

const FOCUS_OPTIONS = [
  { id: GROUP_FOCUS_MEN, label: "Men" },
  { id: GROUP_FOCUS_WOMEN, label: "Women" },
  { id: GROUP_FOCUS_MEN_AND_WOMEN, label: "Men & Women" },
];

export function StepMinistryRegistration({
  lookupData,
  initialContactName,
  initialBookTitle,
}: StepMinistryRegistrationProps) {
  const form = useFormContext<GroupWizardFormValues>();
  const [contactDisplayName, setContactDisplayName] = useState(initialContactName ?? "");
  const [bookDisplayTitle, setBookDisplayTitle] = useState(initialBookTitle ?? "");
  const hasRequiredBook = form.watch("hasRequiredBook");

  return (
    <div className="space-y-6">
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
            <FormLabel>Group Focus <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? String(field.value) : undefined}
                onValueChange={(val) => field.onChange(Number(val))}
                className="flex flex-wrap gap-4"
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
            <FormLabel>Primary Contact / Group Leader <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <ContactSearchCombobox
                value={field.value}
                displayName={contactDisplayName}
                onChange={(id, name) => {
                  field.onChange(id);
                  setContactDisplayName(name);
                }}
                onSearch={searchContacts}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="hasRequiredBook"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Required Book</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? "yes" : "no"}
                onValueChange={(val) => {
                  const hasBook = val === "yes";
                  field.onChange(hasBook);
                  if (!hasBook) {
                    form.setValue("requiredBookId", undefined);
                  }
                }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="book-yes" />
                  <Label htmlFor="book-yes" className="cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="book-no" />
                  <Label htmlFor="book-no" className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {hasRequiredBook && (
        <FormField
          control={form.control}
          name="requiredBookId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Book</FormLabel>
              <FormControl>
                <BookSearchCombobox
                  value={field.value}
                  displayTitle={bookDisplayTitle}
                  onChange={(id, title) => {
                    field.onChange(id);
                    setBookDisplayTitle(title);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="registrationStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Start <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
              <FormLabel>Registration End</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="groupIsFull"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group Is Full</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value ? "yes" : "no"}
                onValueChange={(val) => field.onChange(val === "yes")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="full-yes" />
                  <Label htmlFor="full-yes" className="cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="full-no" />
                  <Label htmlFor="full-no" className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
