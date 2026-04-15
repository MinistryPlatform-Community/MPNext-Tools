export interface LookupItem {
  id: number;
  name: string;
}

export interface GroupWizardLookups {
  groupTypes: LookupItem[];
  ministries: LookupItem[];
  congregations: LookupItem[];
  meetingDays: LookupItem[];
  meetingFrequencies: LookupItem[];
  meetingDurations: LookupItem[];
  lifeStages: LookupItem[];
  groupFocuses: LookupItem[];
  priorities: LookupItem[];
  rooms: LookupItem[];
  books: LookupItem[];
  smsNumbers: LookupItem[];
  groupEndedReasons: LookupItem[];
}

export interface ContactSearchResult {
  Contact_ID: number;
  Display_Name: string;
  Email_Address: string | null;
}

export interface GroupSearchResult {
  Group_ID: number;
  Group_Name: string;
  Group_Type: string | null;
}

export interface CreateGroupResult {
  success: true;
  groupId: number;
  groupName: string;
}

export interface UpdateGroupResult {
  success: true;
  groupId: number;
  groupName: string;
}

export interface ActionError {
  success: false;
  error: string;
}

export const WIZARD_STEPS = [
  { label: 'Identity', description: 'Name, type & dates' },
  { label: 'Organization', description: 'Ministry, people & structure' },
  { label: 'Meeting', description: 'Schedule & location' },
  { label: 'Attributes', description: 'Size, focus & details' },
  { label: 'Settings', description: 'Visibility & promotion' },
  { label: 'Review', description: 'Review & submit' },
] as const;

export type WizardStepIndex = 0 | 1 | 2 | 3 | 4 | 5;
