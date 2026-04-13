import type { Editor } from 'grapesjs';

export interface MergeField {
  label: string;
  value: string;
  category: string;
}

export const MERGE_FIELDS: MergeField[] = [
  // Contact
  { label: 'First Name', value: '{{First_Name}}', category: 'Contact' },
  { label: 'Last Name', value: '{{Last_Name}}', category: 'Contact' },
  { label: 'Nickname', value: '{{Nickname}}', category: 'Contact' },
  { label: 'Email Address', value: '{{Email_Address}}', category: 'Contact' },
  { label: 'Mobile Phone', value: '{{Mobile_Phone}}', category: 'Contact' },

  // Household
  { label: 'Household Name', value: '{{Household_Name}}', category: 'Household' },
  { label: 'Home Address', value: '{{Home_Address}}', category: 'Household' },

  // Church
  { label: 'Congregation', value: '{{Congregation_Name}}', category: 'Church' },

  // System
  { label: 'Unsubscribe Link', value: '{{Unsubscribe_URL}}', category: 'System' },
  { label: 'View in Browser', value: '{{View_In_Browser_URL}}', category: 'System' },
  { label: 'Current Date', value: '{{Current_Date}}', category: 'System' },
];

export const MERGE_FIELD_CATEGORIES = [
  ...new Set(MERGE_FIELDS.map((f) => f.category)),
];

export function getFieldsByCategory(category: string): MergeField[] {
  return MERGE_FIELDS.filter((f) => f.category === category);
}

export function registerMergeFieldBlocks(editor: Editor) {
  const bm = editor.Blocks;

  bm.add('merge-field-contact', {
    label: 'Contact Fields',
    category: 'Merge Fields',
    content: {
      type: 'mj-text',
      content: '<p>{{First_Name}} {{Last_Name}}</p>',
    },
  });

  bm.add('merge-field-unsubscribe', {
    label: 'Unsubscribe Link',
    category: 'Merge Fields',
    content: {
      type: 'mj-text',
      content:
        '<p style="font-size:12px;color:#999;text-align:center;"><a href="{{Unsubscribe_URL}}">Unsubscribe</a> | <a href="{{View_In_Browser_URL}}">View in Browser</a></p>',
    },
  });
}
