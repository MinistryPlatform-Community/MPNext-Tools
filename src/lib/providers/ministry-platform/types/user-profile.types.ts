/**
 * The signed-in user's profile as sent to the CLIENT (via
 * `getCurrentUserProfile`). Deliberately minimal: only what the UI renders.
 *
 * It used to carry `User_ID`, `User_GUID`, `Contact_ID`, `Mobile_Phone`,
 * `Image_GUID`, and the user's security roles and user groups. None of that
 * was displayed, and roles/groups describe the domain's security setup.
 * Add a field back only together with the UI that needs it.
 */
export interface MPUserProfile {
  First_Name: string;
  Nickname: string;
  Last_Name: string;
  Email_Address: string | null;
}
