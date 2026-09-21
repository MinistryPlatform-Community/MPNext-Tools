/**
 * Texting consent rules shared by the recipient preview and the send. Pure functions,
 * no MP access.
 *
 * MP replaced the `Contacts.Do_Not_Text` flag with `Texting_Opt_In_Type_ID`, and each
 * `dp_SMS_Numbers` row carries a `Texting_Compliance_Level`. A contact may be texted
 * from a number only when their opt-in level satisfies that number's compliance level.
 */

import { TEXTING_COMPLIANCE_LEVEL, TEXTING_OPT_IN_TYPE } from '@/lib/constants';

/**
 * True when the sending number is configured for Double Opt-in. Unknown or missing
 * levels fall back to the single opt-in rule, which every level requires at minimum.
 */
export function requiresDoubleOptIn(complianceLevelId: number | null | undefined): boolean {
  return complianceLevelId === TEXTING_COMPLIANCE_LEVEL.DOUBLE_OPT_IN;
}

/**
 * Whether a contact with `optInTypeId` may receive a text from a number at
 * `complianceLevelId`:
 *  - None or Single Opt-in number: contact must be Single or Double Opt-In (>= 3).
 *  - Double Opt-in number: contact must be Double Opt-In (= 4).
 * A null opt-in type (no value on the contact) is never textable.
 */
export function meetsTextingCompliance(
  optInTypeId: number | null | undefined,
  complianceLevelId: number | null | undefined
): boolean {
  if (optInTypeId === null || optInTypeId === undefined) return false;
  if (requiresDoubleOptIn(complianceLevelId)) {
    return optInTypeId === TEXTING_OPT_IN_TYPE.DOUBLE_OPT_IN;
  }
  return optInTypeId >= TEXTING_OPT_IN_TYPE.SINGLE_OPT_IN;
}
