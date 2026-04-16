export interface TableQueryParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $groupby?: string;
  $having?: string;
  $top?: number;
  $skip?: number;
  $distinct?: boolean;
  $userId?: number;
  $globalFilterId?: number;
  $allowCreate?: boolean;
}

export interface TableRecord {
  [key: string]: unknown;
}

export interface FileDescription {
  FileId: number;
  FileName: string;
  readonly FileExtension?: string;
  Description?: string;
  FileSize: number;
  ImageHeight?: number;
  ImageWidth?: number;
  readonly IsImage: boolean;
  IsDefaultImage: boolean;
  TableName: string;
  RecordId: number;
  UniqueFileId: string;
  LastUpdated: string;
  InclusionType: 'Attachment' | 'Link';
}

export interface CommunicationInfo {
  AuthorUserId: number;
  Body: string;
  FromContactId: number;
  ReplyToContactId: number;
  CommunicationType: 'Email' | 'Text' | 'Letter';
  Contacts: number[];
  IsBulkEmail: boolean;
  SendToContactParents: boolean;
  Subject: string;
  StartDate: string;
  TextPhoneNumberId?: number;
}

export interface MessageAddress {
  DisplayName: string;
  Address: string;
}

export interface MessageInfo {
  FromAddress: MessageAddress;
  ToAddresses: MessageAddress[];
  ReplyToAddress?: MessageAddress;
  Subject: string;
  Body: string;
  StartDate?: string;
}

export interface Communication {
  Communication_ID: number;
  Author_User_ID: number;
  Subject: string;
  Body: string;
  Domain_ID: number;
  Start_Date: string;
  Communication_Status_ID: number;
  From_Contact: number;
  Reply_to_Contact: number;
  Template_ID?: number;
  Active: boolean;
}

export interface DomainInfo {
  DisplayName: string;
  ImageFileId?: number;
  TimeZoneName: string;
  CultureName: string;
  PasswordComplexityExpression?: string;
  PasswordComplexityMessage?: string;
  IsSimpleSignOnEnabled: boolean;
  IsUserTimeZoneEnabled: boolean;
  IsSmsMfaEnabled: boolean;
  CompanyName?: string;
  CompanyEmail?: string;
  CompanyPhone?: string;
  GlobalFilterTableName?: string;
  SiteNumber?: string;
}

export interface GlobalFilterItem {
  Key: number;
  Value: string;
}

export interface GlobalFilterParams {
  $ignorePermissions?: boolean;
  $userId?: number;
}

export type ParameterDirection = 
  | "Input"
  | "Output"
  | "InputOutput"
  | "ReturnValue";

export type ParameterDataType = 
  | "Unknown"
  | "String"
  | "Text"
  | "Xml"
  | "Byte"
  | "Integer16"
  | "Integer32"
  | "Integer64"
  | "Decimal"
  | "Real"
  | "Boolean"
  | "Date"
  | "Time"
  | "DateTime"
  | "Timestamp"
  | "Binary"
  | "Password"
  | "Money"
  | "Guid"
  | "Phone"
  | "Email"
  | "Variant"
  | "Separator"
  | "Image"
  | "Counter"
  | "TableName"
  | "GlobalFilter"
  | "TimeZone"
  | "Locale"
  | "LargeString"
  | "Url"
  | "Strings"
  | "Integers"
  | "Color"
  | "SecretKey";

export interface ParameterInfo {
  Name: string;
  Direction: ParameterDirection;
  DataType: ParameterDataType;
  Size: number;
}

export interface ProcedureInfo {
  Name: string;
  Parameters: ParameterInfo[];
}

export interface TableInfo {
  Name: string;
  DisplayName: string;
  Description?: string;
  Active: boolean;
  Table_ID: number;
}

export interface FileUploadParams {
  description?: string;
  isDefaultImage?: boolean;
  longestDimension?: number;
  userId?: number;
}

export interface FileUpdateParams {
  fileName?: string;
  description?: string;
  isDefaultImage?: boolean;
  longestDimension?: number;
  userId?: number;
}

// Copy / Recurrence Types (used by /tables/{table}/{recordId}/copy and /tasks/generate-sequence)

export type RecurrenceType = 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export type Weekday =
  | 'None'
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Day'
  | 'Weekday'
  | 'WeekendDay';

export type DayPosition = 'Unspecified' | 'First' | 'Second' | 'Third' | 'Fourth' | 'Last';

export type Month =
  | 'Unspecified'
  | 'January'
  | 'February'
  | 'March'
  | 'April'
  | 'May'
  | 'June'
  | 'July'
  | 'August'
  | 'September'
  | 'October'
  | 'November'
  | 'December';

/**
 * Represents a set of rules defining a date sequence for recurrence.
 * Used by the Copy API and generate-sequence endpoints.
 */
export interface RecurrencePattern {
  /** Recurrence interval type: daily, weekly, monthly, yearly. */
  Type: RecurrenceType;
  /** Frequency between subsequent events. The measure is specific to each recurrence type (day, week, or month). */
  Interval: number;
  /** Day(s) of week on which an occurrence may happen. */
  Weekdays?: Weekday;
  /** Day of week position in a month (e.g., First Monday). */
  DayPosition?: DayPosition;
  /** Specific day of the month (1-31). */
  Day?: number;
  /** Specific month for yearly patterns. */
  Month?: Month;
  /** Start date/time of the sequence. */
  StartDate: string;
  /** End date/time of the sequence (optional — use either EndDate or TotalOccurrences). */
  EndDate?: string;
  /** Maximum number of occurrences to generate (optional — use either EndDate or TotalOccurrences). */
  TotalOccurrences?: number;
}

/**
 * Parameters for the copy-record endpoint which supports sub-page copying and file attachment copying.
 * Used by POST /tables/{table}/{recordId}/copy-record.
 */
export interface CopyParameters {
  /** Rules for generating the date sequence. */
  Pattern: RecurrencePattern;
  /** Sub-page IDs whose records should be copied. If empty, sub-page records are not copied. */
  SubpageIds?: number[];
  /** If true, the original record is included in the sequence and updated to match the first calculated date. */
  UpdateOriginalRecord?: boolean;
  /** If true, files attached to the source record are copied to each new record. */
  CopyFiles?: boolean;
}

export interface QueryParams {
  [key: string]: string | number | boolean | string[] | number[] | boolean[] | undefined | null;
}

export interface RequestBody {
  [key: string]: unknown;
}

export interface TableMetadata {
  Table_ID: number;
  Table_Name: string;
  Display_Name: string;
  Description?: string;
  Columns?: ColumnMetadata[];
  [key: string]: unknown;
}

export interface ColumnMetadata {
  Name: string;
  DataType: ParameterDataType;
  IsRequired: boolean;
  Size: number;
  IsPrimaryKey?: boolean;
  IsForeignKey?: boolean;
  ReferencedTable?: string;
  ReferencedColumn?: string;
  IsReadOnly?: boolean;
  IsComputed?: boolean;
  HasDefault?: boolean;
}
