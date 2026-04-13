export interface LabelData {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  barCode?: string;
}

export type SkipReason = 'no_address' | 'no_postal_code' | 'opted_out' | 'no_barcode';

export interface SkipRecord {
  name: string;
  contactId: number;
  reason: SkipReason;
}

export type AddressMode = 'household' | 'individual';

export interface LabelConfig {
  stockId: string;
  addressMode: AddressMode;
  startPosition: number;
  includeMissingBarcodes: boolean;
}

export interface FetchAddressLabelsResult {
  printable: LabelData[];
  skipped: SkipRecord[];
}
