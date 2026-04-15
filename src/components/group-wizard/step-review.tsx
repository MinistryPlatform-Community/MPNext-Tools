"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Pencil, PartyPopper } from "lucide-react";
import type { GroupWizardFormData } from "./schema";
import type { GroupWizardLookups, LookupItem } from "./types";

interface StepReviewProps {
  lookups: GroupWizardLookups;
  contactDisplayMap: Map<number, string>;
  groupDisplayMap: Map<number, string>;
  onEditStep: (step: number) => void;
  submitResult: { groupId: number; groupName: string } | null;
  isEditMode: boolean;
  onCreateAnother: () => void;
  onClose: () => void;
}

function resolveLookup(items: LookupItem[], id: number | null | undefined): string {
  if (!id) return "—";
  return items.find((item) => item.id === id)?.name ?? `ID: ${id}`;
}

function ReviewRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-words">{value || "—"}</span>
    </div>
  );
}

function BoolBadge({ value, label }: { value: boolean | null | undefined; label: string }) {
  if (!value) return null;
  return <Badge variant="secondary" className="text-xs">{label}</Badge>;
}

function SectionCard({
  title,
  stepIndex,
  onEdit,
  children,
}: {
  title: string;
  stepIndex: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(stepIndex)}>
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  );
}

export function StepReview({
  lookups,
  contactDisplayMap,
  groupDisplayMap,
  onEditStep,
  submitResult,
  isEditMode,
  onCreateAnother,
  onClose,
}: StepReviewProps) {
  const form = useFormContext<GroupWizardFormData>();
  const data = form.getValues();

  if (submitResult) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
          <PartyPopper className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {isEditMode ? "Group Updated!" : "Group Created!"}
          </h2>
          <p className="text-muted-foreground">
            <span className="font-semibold">{submitResult.groupName}</span>
            {" "}(ID: {submitResult.groupId}) has been {isEditMode ? "updated" : "created"} successfully.
          </p>
        </div>
        <div className="flex gap-3">
          {!isEditMode && (
            <Button type="button" variant="outline" onClick={onCreateAnother}>
              Create Another
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Review & Submit</h2>
          <p className="text-sm text-muted-foreground">
            Review all the details before {isEditMode ? "saving changes" : "creating the group"}.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Identity */}
        <SectionCard title="Group Identity" stepIndex={0} onEdit={onEditStep}>
          <ReviewRow label="Group Name" value={data.Group_Name} />
          <ReviewRow label="Group Type" value={resolveLookup(lookups.groupTypes, data.Group_Type_ID)} />
          <ReviewRow label="Start Date" value={data.Start_Date} />
          {data.End_Date && <ReviewRow label="End Date" value={data.End_Date} />}
          {data.Reason_Ended && (
            <ReviewRow label="Reason Ended" value={resolveLookup(lookups.groupEndedReasons, data.Reason_Ended)} />
          )}
          {data.Description && <ReviewRow label="Description" value={data.Description} />}
        </SectionCard>

        {/* Organization */}
        <SectionCard title="Organization & People" stepIndex={1} onEdit={onEditStep}>
          <ReviewRow label="Congregation" value={resolveLookup(lookups.congregations, data.Congregation_ID)} />
          <ReviewRow label="Ministry" value={resolveLookup(lookups.ministries, data.Ministry_ID)} />
          <ReviewRow
            label="Primary Contact"
            value={contactDisplayMap.get(data.Primary_Contact) ?? `ID: ${data.Primary_Contact}`}
          />
          {data.Parent_Group && (
            <ReviewRow
              label="Parent Group"
              value={groupDisplayMap.get(data.Parent_Group) ?? `ID: ${data.Parent_Group}`}
            />
          )}
          {data.Priority_ID && (
            <ReviewRow label="Priority" value={resolveLookup(lookups.priorities, data.Priority_ID)} />
          )}
        </SectionCard>

        {/* Meeting */}
        <SectionCard title="Meeting Schedule" stepIndex={2} onEdit={onEditStep}>
          <ReviewRow label="Day" value={resolveLookup(lookups.meetingDays, data.Meeting_Day_ID)} />
          <ReviewRow label="Time" value={data.Meeting_Time ?? "—"} />
          <ReviewRow label="Frequency" value={resolveLookup(lookups.meetingFrequencies, data.Meeting_Frequency_ID)} />
          <ReviewRow label="Duration" value={resolveLookup(lookups.meetingDurations, data.Meeting_Duration_ID)} />
          {data.Default_Meeting_Room && (
            <ReviewRow label="Room" value={resolveLookup(lookups.rooms, data.Default_Meeting_Room)} />
          )}
          {data.Offsite_Meeting_Address && (
            <ReviewRow label="Offsite Address" value={`Address ID: ${data.Offsite_Meeting_Address}`} />
          )}
          <ReviewRow label="Meets Online" value={data.Meets_Online ? "Yes" : "No"} />
        </SectionCard>

        {/* Attributes */}
        <SectionCard title="Group Attributes" stepIndex={3} onEdit={onEditStep}>
          {data.Target_Size && <ReviewRow label="Target Size" value={String(data.Target_Size)} />}
          {data.Life_Stage_ID && (
            <ReviewRow label="Life Stage" value={resolveLookup(lookups.lifeStages, data.Life_Stage_ID)} />
          )}
          {data.Group_Focus_ID && (
            <ReviewRow label="Focus" value={resolveLookup(lookups.groupFocuses, data.Group_Focus_ID)} />
          )}
          {data.Required_Book && (
            <ReviewRow label="Required Book" value={resolveLookup(lookups.books, data.Required_Book)} />
          )}
          {data.SMS_Number && (
            <ReviewRow label="SMS Number" value={resolveLookup(lookups.smsNumbers, data.SMS_Number)} />
          )}
          <ReviewRow label="Group Is Full" value={data.Group_Is_Full ? "Yes" : "No"} />
        </SectionCard>

        {/* Settings */}
        <SectionCard title="Settings & Promotion" stepIndex={4} onEdit={onEditStep}>
          <div className="py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Active Settings
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <BoolBadge value={data.Available_Online} label="Available Online" />
              <BoolBadge value={data.Available_On_App} label="Available On App" />
              <BoolBadge value={data.Enable_Discussion} label="Discussion" />
              <BoolBadge value={data.Send_Attendance_Notification} label="Attendance Notifications" />
              <BoolBadge value={data.Send_Service_Notification} label="Service Notifications" />
              <BoolBadge value={data.Create_Next_Meeting} label="Auto-Create Meeting" />
              <BoolBadge value={data["Secure_Check-in"]} label="Secure Check-in" />
              <BoolBadge value={data.Suppress_Nametag} label="Suppress Nametag" />
              <BoolBadge value={data.Suppress_Care_Note} label="Suppress Care Note" />
              <BoolBadge value={data.On_Classroom_Manager} label="Classroom Manager" />
              <BoolBadge value={data.Promote_Weekly} label="Promote Weekly" />
              <BoolBadge value={data.Promote_Participants_Only} label="Promote Participants Only" />
              {!data.Available_Online && !data.Enable_Discussion && !data["Secure_Check-in"] &&
                !data.Promote_Weekly && !data.Available_On_App &&
                !data.Send_Attendance_Notification && !data.Send_Service_Notification &&
                !data.Create_Next_Meeting && !data.Suppress_Nametag && !data.Suppress_Care_Note &&
                !data.On_Classroom_Manager && !data.Promote_Participants_Only && (
                <span className="text-sm text-muted-foreground">All defaults (off)</span>
              )}
            </div>
          </div>
          {data.Promote_to_Group && (
            <ReviewRow
              label="Promote to Group"
              value={groupDisplayMap.get(data.Promote_to_Group) ?? `ID: ${data.Promote_to_Group}`}
            />
          )}
          {data.Age_in_Months_to_Promote && (
            <ReviewRow label="Age to Promote" value={`${data.Age_in_Months_to_Promote} months`} />
          )}
          {data.Promotion_Date && <ReviewRow label="Promotion Date" value={data.Promotion_Date} />}
          {data.Descended_From && (
            <ReviewRow
              label="Descended From"
              value={groupDisplayMap.get(data.Descended_From) ?? `ID: ${data.Descended_From}`}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
