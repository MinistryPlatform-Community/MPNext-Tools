import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ToolParams } from "@/lib/tool-params";
import type {
  FamilyLookups,
  FamilyDefaults,
  Household,
  FamilyMember,
  ContactSearchResult,
  SaveProgress,
} from "@/lib/dto/family";
import { emptyAddress } from "@/lib/dto/family";
import type { PlacePrediction, PlaceDetails } from "@/lib/providers/google-places";

/**
 * AddEditFamily component tests.
 *
 * Covers: initial load (success/error), search bar (debounce, empty, error,
 * new-family creation), household panel field editing (incl. address tabs,
 * Google Places autocomplete on/off), member card editing (always-visible +
 * expanded fields, donor toggle, envelope assignment), add member, save
 * (success/bumped-envelope/failure/exception), and the dirty-close confirm
 * dialog.
 */

const {
  mockSearchContacts,
  mockFetchFamilyLookups,
  mockFetchFamilyDefaults,
  mockFetchHousehold,
  mockFetchNextEnvelopeNumber,
  mockSaveFamily,
  mockPlacesEnabled,
  mockPlaceAutocomplete,
  mockPlaceDetails,
  mockRouterBack,
  mockToastSuccess,
  mockToastError,
  mockToastWarning,
} = vi.hoisted(() => ({
  mockSearchContacts: vi.fn(),
  mockFetchFamilyLookups: vi.fn(),
  mockFetchFamilyDefaults: vi.fn(),
  mockFetchHousehold: vi.fn(),
  mockFetchNextEnvelopeNumber: vi.fn(),
  mockSaveFamily: vi.fn(),
  mockPlacesEnabled: vi.fn(),
  mockPlaceAutocomplete: vi.fn(),
  mockPlaceDetails: vi.fn(),
  mockRouterBack: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
}));

vi.mock("./actions", () => ({
  searchContacts: mockSearchContacts,
  fetchFamilyLookups: mockFetchFamilyLookups,
  fetchFamilyDefaults: mockFetchFamilyDefaults,
  fetchHousehold: mockFetchHousehold,
  fetchNextEnvelopeNumber: mockFetchNextEnvelopeNumber,
  saveFamily: mockSaveFamily,
  placesEnabled: mockPlacesEnabled,
  placeAutocomplete: mockPlaceAutocomplete,
  placeDetails: mockPlaceDetails,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock("@/components/dev-panel", () => ({
  DevPanel: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
  },
}));

import { AddEditFamily } from "./add-edit-family";

// Radix Select / cmdk need these present in jsdom.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const LOOKUPS: FamilyLookups = {
  congregations: [{ id: 1, name: "Main Campus" }, { id: 2, name: "East Campus" }],
  sources: [{ id: 1, name: "Walk-in" }, { id: 2, name: "Referral" }],
  householdPositions: [{ id: 1, name: "Head" }, { id: 2, name: "Spouse" }],
  participantTypes: [{ id: 1, name: "Adult" }, { id: 2, name: "Child" }],
  maritalStatuses: [{ id: 1, name: "Single" }, { id: 2, name: "Married" }],
  prefixes: [{ id: 1, name: "Mr." }],
  suffixes: [{ id: 1, name: "Jr." }],
  genders: [{ id: 1, name: "Male" }, { id: 2, name: "Female" }],
  contactStatuses: [{ id: 1, name: "Active" }, { id: 2, name: "Inactive" }],
  primaryLanguages: [{ id: 1, name: "English" }],
  faithBackgrounds: [{ id: 1, name: "Christian" }],
  states: [{ code: "CA", name: "California" }, { code: "NY", name: "New York" }],
  countries: [{ code: "US", name: "United States" }, { code: "CA", name: "Canada" }],
};

const DEFAULTS: FamilyDefaults = {
  congregationId: 1,
  sourceId: 1,
  countryCode: "US",
  state: "CA",
  householdPositionId: 1,
  participantTypeId: 1,
  showEnvelopeNumbers: true,
};

function makeMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    contactId: 201,
    firstName: "John",
    middleName: "",
    maidenName: "",
    lastName: "Smith",
    nickname: "",
    prefixId: 0,
    suffixId: 0,
    birthDate: null,
    genderId: 0,
    maritalStatusId: 0,
    mobilePhone: "",
    emailAddress: "",
    bulkEmailOpt: false,
    envelopeNo: null,
    contactStatusId: 1,
    primaryLanguageId: null,
    faithBackgroundId: null,
    householdPositionId: 1,
    participant: { participantId: 1, participantTypeId: 1, notes: null },
    donorId: null,
    isDonor: false,
    ...overrides,
  };
}

function makeHousehold(overrides: Partial<Household> = {}): Household {
  return {
    householdId: 500,
    householdName: "Smith",
    householdPhone: "555-1111",
    congregationId: 1,
    sourceId: 1,
    address: {
      ...emptyAddress(),
      addressId: 10,
      addressLine1: "1 Main St",
      city: "Springfield",
      state: "CA",
      postalCode: "90001",
      countryCode: "US",
    },
    alternateMailingAddress: { ...emptyAddress(), countryCode: "US", state: "CA" },
    seasonStart: null,
    seasonEnd: null,
    repeatsAnnually: false,
    areHeadsMarried: false,
    members: [
      makeMember({ contactId: 201, firstName: "John" }),
      makeMember({ contactId: 202, firstName: "Jane", householdPositionId: 2 }),
    ],
    ...overrides,
  };
}

const params: ToolParams = { pageID: 292 };

function setup(overrides: { initialContactId?: number | null } = {}) {
  return render(<AddEditFamily params={params} initialContactId={overrides.initialContactId} />);
}

async function selectByLabel(labelText: string, optionText: string, occurrence = 0) {
  const labels = screen.getAllByText(labelText);
  const container = labels[occurrence].parentElement as HTMLElement;
  const trigger = within(container).getByRole("combobox");
  await userEvent.click(trigger);
  const option = await screen.findByText(optionText, { selector: '[role="option"] *, [role="option"]' });
  await userEvent.click(option);
}

// The `Field` wrapper does not associate its <Label> with the input via
// htmlFor/id, so getByLabelText does not work here — scope by the label
// text's sibling container instead (mirrors selectByLabel above).
function inputByLabel(labelText: string, occurrence = 0): HTMLInputElement {
  const labels = screen.getAllByText(labelText);
  const container = labels[occurrence].parentElement as HTMLElement;
  const input = container.querySelector("input");
  if (!input) throw new Error(`No <input> found under label "${labelText}"`);
  return input;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchFamilyLookups.mockResolvedValue(LOOKUPS);
  mockFetchFamilyDefaults.mockResolvedValue(DEFAULTS);
  mockPlacesEnabled.mockResolvedValue(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * These tests deliberately drive failure paths, and the code under test logs
 * them on purpose. Silence the channel so a real, unexpected error still
 * stands out in the runner output instead of drowning in expected noise.
 * `mockImplementation` keeps the spy recording, so assertions on what was
 * logged still work.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe("AddEditFamily — initial load", () => {
  it("shows the search-only placeholder card once lookups/defaults resolve", async () => {
    setup();
    await waitFor(() => expect(mockFetchFamilyLookups).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(/Search to find an existing household/i),
    ).toBeInTheDocument();
  });

  it("shows a load error when the initial lookups/defaults fetch rejects", async () => {
    mockFetchFamilyLookups.mockRejectedValueOnce(new Error("network down"));
    setup();
    expect(await screen.findByText(/network down/)).toBeInTheDocument();
  });

  it("loads an existing household via initialContactId once defaults resolve", async () => {
    const household = makeHousehold();
    mockFetchHousehold.mockResolvedValueOnce({ success: true, household });
    setup({ initialContactId: 201 });

    await waitFor(() => expect(mockFetchHousehold).toHaveBeenCalledWith(201));
    expect(await screen.findByDisplayValue("Smith")).toBeInTheDocument();
  });

  it("does not load a household when initialContactId is 0", async () => {
    setup({ initialContactId: 0 });
    await waitFor(() => expect(mockFetchFamilyDefaults).toHaveBeenCalled());
    expect(mockFetchHousehold).not.toHaveBeenCalled();
  });

  it("shows a load error when fetchHousehold fails for initialContactId", async () => {
    mockFetchHousehold.mockResolvedValueOnce({ success: false, error: "Household not found" });
    setup({ initialContactId: 999 });
    expect(await screen.findByText("Household not found")).toBeInTheDocument();
    // Falls back to the placeholder card since household stays null.
    expect(screen.getByText(/Search to find an existing household/i)).toBeInTheDocument();
  });
});

describe("AddEditFamily — search bar", () => {
  it("prompts for at least 2 characters", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("combobox", { name: "" }));
    const input = screen.getByPlaceholderText("Type a name…");
    await user.type(input, "a");
    expect(await screen.findByText("Type at least 2 characters")).toBeInTheDocument();
    expect(mockSearchContacts).not.toHaveBeenCalled();
  });

  it("debounces, searches, and lets the user select an existing household", async () => {
    const user = userEvent.setup();
    const results: ContactSearchResult[] = [
      { contactId: 301, displayName: "Bob Jones", detail: "bob@example.com" },
    ];
    mockSearchContacts.mockResolvedValue(results);
    const household = makeHousehold({ householdName: "Jones" });
    mockFetchHousehold.mockResolvedValueOnce({ success: true, household });

    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("combobox", { name: "" }));
    const input = screen.getByPlaceholderText("Type a name…");
    await user.type(input, "Bob");

    await waitFor(() => expect(mockSearchContacts).toHaveBeenCalledWith("Bob"));
    const item = await screen.findByText("Bob Jones");
    await user.click(item);

    await waitFor(() => expect(mockFetchHousehold).toHaveBeenCalledWith(301));
    expect(await screen.findByDisplayValue("Jones")).toBeInTheDocument();
  });

  it("finds no CommandEmpty text when the search returns nothing (see TODO: cmdk always counts the '+ New Family' item)", async () => {
    // NOTE: the source renders <CommandEmpty>No contacts found.</CommandEmpty>
    // whenever query.length >= 2 && results.length === 0, but cmdk's
    // CommandEmpty only paints when its *global* registered-item count is 0.
    // The "+ New Family" CommandItem is always registered once the query is
    // >= 2 chars, so that count is never 0 and this message never renders.
    // See .claude/TODO/2026-09-13-search-empty-state-never-renders.md
    const user = userEvent.setup();
    mockSearchContacts.mockResolvedValue([]);
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("combobox", { name: "" }));
    await user.type(screen.getByPlaceholderText("Type a name…"), "zz");
    await waitFor(() => expect(mockSearchContacts).toHaveBeenCalledWith("zz"));
    expect(screen.queryByText("No contacts found.")).not.toBeInTheDocument();
    expect(await screen.findByText(/\+ New Family with last name/)).toBeInTheDocument();
  });

  it("clears results silently when the search action throws", async () => {
    const user = userEvent.setup();
    mockSearchContacts.mockRejectedValue(new Error("boom"));
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("combobox", { name: "" }));
    await user.type(screen.getByPlaceholderText("Type a name…"), "zz");
    await waitFor(() => expect(mockSearchContacts).toHaveBeenCalledWith("zz"));
    // No crash, and no stale results rendered.
    expect(screen.queryByText("Existing households")).not.toBeInTheDocument();
  });

  it("creates a new family from the search box", async () => {
    const user = userEvent.setup();
    mockSearchContacts.mockResolvedValue([]);
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("combobox", { name: "" }));
    await user.type(screen.getByPlaceholderText("Type a name…"), "Newman");

    const createItem = await screen.findByText(/\+ New Family with last name/);
    await user.click(createItem);

    expect(await screen.findAllByDisplayValue("Newman")).not.toHaveLength(0);
    // Two empty members seeded (Head of House 1 / 2).
    expect(screen.getByText("Head of House 1")).toBeInTheDocument();
    expect(screen.getByText("Head of House 2")).toBeInTheDocument();
  });
});

describe("AddEditFamily — household panel editing", () => {
  async function loadNewFamily(user: ReturnType<typeof userEvent.setup>) {
    mockSearchContacts.mockResolvedValue([]);
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("combobox", { name: "" }));
    await user.type(screen.getByPlaceholderText("Type a name…"), "Newman");
    const createItem = await screen.findByText(/\+ New Family with last name/);
    await user.click(createItem);
    await waitFor(() => expect(screen.getAllByDisplayValue("Newman").length).toBeGreaterThan(0));
  }

  it("edits last name, phone, congregation, and source", async () => {
    const user = userEvent.setup();
    await loadNewFamily(user);

    // First "Newman" display value in DOM order is the household name input
    // (the member-1 card is expanded by default and also shows "Newman" as
    // its seeded last name).
    const lastName = screen.getAllByDisplayValue("Newman")[0];
    await user.clear(lastName);
    await user.type(lastName, "Updated");
    expect(await screen.findByDisplayValue("Updated")).toBeInTheDocument();

    await selectByLabel("Congregation", "East Campus");
    await selectByLabel("Source", "Referral");
  });

  it("edits main address fields with places disabled (plain input)", async () => {
    const user = userEvent.setup();
    await loadNewFamily(user);

    const addrInput = screen.getByPlaceholderText("Enter a location");
    await user.type(addrInput, "123 Elm St");
    expect(addrInput).toHaveValue("123 Elm St");

    await selectByLabel("Country", "Canada");
    await selectByLabel("State", "NY — New York");

    const line2 = inputByLabel("Address Line 2");
    await user.type(line2, "Apt 4");
    expect(line2).toHaveValue("Apt 4");

    const city = inputByLabel("City");
    await user.type(city, "Metropolis");
    expect(city).toHaveValue("Metropolis");

    const zip = inputByLabel("Zip Code");
    await user.clear(zip);
    await user.type(zip, "10001");
    expect(zip).toHaveValue("10001");
  });

  it("edits the household phone number", async () => {
    const user = userEvent.setup();
    await loadNewFamily(user);
    const phone = inputByLabel("Home Phone");
    await user.type(phone, "555-9999");
    expect(phone).toHaveValue("555-9999");
  });

  it("switches to the Alt tab and edits season fields", async () => {
    const user = userEvent.setup();
    await loadNewFamily(user);

    await user.click(screen.getByText("Alt Address"));
    expect(screen.getByText("Season Start")).toBeInTheDocument();
    expect(screen.getByText("Repeats Annually")).toBeInTheDocument();

    const seasonStart = inputByLabel("Season Start");
    await user.type(seasonStart, "2026-01-01");
    expect(seasonStart).toHaveValue("2026-01-01");

    const seasonEnd = inputByLabel("Season End");
    await user.type(seasonEnd, "2026-05-01");
    expect(seasonEnd).toHaveValue("2026-05-01");

    const checkbox = screen.getByRole("checkbox", { name: "Repeats Annually" });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(screen.getByText("Main Address"));
    expect(screen.queryByText("Season Start")).not.toBeInTheDocument();
  });

  it("uses Google Places autocomplete when enabled, and falls back on details failure", async () => {
    mockPlacesEnabled.mockResolvedValue(true);
    const predictions: PlacePrediction[] = [
      { placeId: "p1", primary: "123 Elm St", secondary: "Springfield", full: "123 Elm St, Springfield" },
    ];
    mockPlaceAutocomplete.mockResolvedValue(predictions);
    mockPlaceDetails.mockResolvedValueOnce({ success: false, error: "no details" });

    const user = userEvent.setup();
    await loadNewFamily(user);

    const addrInput = screen.getByPlaceholderText("Start typing an address…");
    await user.type(addrInput, "123 Elm");

    await waitFor(() => expect(mockPlaceAutocomplete).toHaveBeenCalled());
    const prediction = await screen.findByText("123 Elm St");
    await userEvent.pointer({ keys: "[MouseLeft]", target: prediction });

    await waitFor(() => expect(mockPlaceDetails).toHaveBeenCalledWith("p1", expect.any(String)));
    // Fallback path: text set to full prediction string since details failed.
    await waitFor(() => expect(screen.getByPlaceholderText("Start typing an address…")).toHaveValue("123 Elm St, Springfield"));
  });

  it("applies place details on successful selection", async () => {
    mockPlacesEnabled.mockResolvedValue(true);
    const predictions: PlacePrediction[] = [
      { placeId: "p2", primary: "456 Oak Ave", secondary: "Metropolis", full: "456 Oak Ave, Metropolis" },
    ];
    mockPlaceAutocomplete.mockResolvedValue(predictions);
    const details: PlaceDetails = {
      placeId: "p2",
      formattedAddress: "456 Oak Ave, Metropolis",
      addressLine1: "456 Oak Ave",
      city: "Metropolis",
      state: "NY",
      postalCode: "10001",
      countryCode: "US",
    };
    mockPlaceDetails.mockResolvedValueOnce({ success: true, details });

    const user = userEvent.setup();
    await loadNewFamily(user);

    const addrInput = screen.getByPlaceholderText("Start typing an address…");
    await user.type(addrInput, "456 Oak");
    await waitFor(() => expect(mockPlaceAutocomplete).toHaveBeenCalled());
    const prediction = await screen.findByText("456 Oak Ave");
    await userEvent.pointer({ keys: "[MouseLeft]", target: prediction });

    await waitFor(() => expect(screen.getByDisplayValue("Metropolis")).toBeInTheDocument());
  });

  it("clears predictions when the address text is shortened", async () => {
    mockPlacesEnabled.mockResolvedValue(true);
    mockPlaceAutocomplete.mockResolvedValue([
      { placeId: "p3", primary: "1 Long Rd", secondary: "", full: "1 Long Rd" },
    ]);
    const user = userEvent.setup();
    await loadNewFamily(user);

    const addrInput = screen.getByPlaceholderText("Start typing an address…");
    await user.type(addrInput, "1 Long Rd");
    await waitFor(() => expect(mockPlaceAutocomplete).toHaveBeenCalled());
    await user.clear(addrInput);
    await user.type(addrInput, "1");
    await waitFor(() => expect(screen.queryByText("1 Long Rd")).not.toBeInTheDocument());
  });

  it("clears predictions silently when placeAutocomplete throws", async () => {
    mockPlacesEnabled.mockResolvedValue(true);
    mockPlaceAutocomplete.mockRejectedValue(new Error("places down"));
    const user = userEvent.setup();
    await loadNewFamily(user);

    const addrInput = screen.getByPlaceholderText("Start typing an address…");
    await user.type(addrInput, "1 Long Rd");
    await waitFor(() => expect(mockPlaceAutocomplete).toHaveBeenCalled());
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("closes the predictions dropdown on blur", async () => {
    mockPlacesEnabled.mockResolvedValue(true);
    mockPlaceAutocomplete.mockResolvedValue([
      { placeId: "p4", primary: "9 Blur Ave", secondary: "", full: "9 Blur Ave" },
    ]);
    const user = userEvent.setup();
    await loadNewFamily(user);

    const addrInput = screen.getByPlaceholderText("Start typing an address…");
    await user.type(addrInput, "9 Blur Ave");
    await waitFor(() => expect(screen.getByText("9 Blur Ave")).toBeInTheDocument());

    await user.tab();
    await waitFor(() => expect(screen.queryByText("9 Blur Ave")).not.toBeInTheDocument(), {
      timeout: 2000,
    });
  });
});

describe("AddEditFamily — member card editing", () => {
  async function loadExisting(overrides: Partial<Household> = {}) {
    const household = makeHousehold(overrides);
    mockFetchHousehold.mockResolvedValueOnce({ success: true, household });
    setup({ initialContactId: 201 });
    await screen.findByDisplayValue("John");
    return household;
  }

  it("shows head labels, member number, and a generic label for a third member", async () => {
    await loadExisting({
      members: [
        makeMember({ contactId: 201, firstName: "John" }),
        makeMember({ contactId: 202, firstName: "Jane", householdPositionId: 2 }),
        makeMember({ contactId: 203, firstName: "Kid" }),
      ],
    });
    expect(screen.getByText("Head of House 1")).toBeInTheDocument();
    expect(screen.getByText("Head of House 2")).toBeInTheDocument();
    expect(screen.getByText("Family Member 3")).toBeInTheDocument();
    expect(screen.getByText("#201")).toBeInTheDocument();
  });

  it("toggles the Heads Are Married checkbox", async () => {
    const user = userEvent.setup();
    await loadExisting();
    const married = screen.getByRole("checkbox", { name: "Heads are Married" });
    expect(married).not.toBeChecked();
    await user.click(married);
    expect(married).toBeChecked();
  });

  it("edits always-visible member fields: gender, first name, household position, participant type, email, mobile", async () => {
    const user = userEvent.setup();
    await loadExisting();

    const firstName = screen.getByDisplayValue("John");
    await user.clear(firstName);
    await user.type(firstName, "Jonathan");
    expect(await screen.findByDisplayValue("Jonathan")).toBeInTheDocument();

    await selectByLabel("Gender", "Male");
    await selectByLabel("Household Position", "Spouse");
    await selectByLabel("Participant Type", "Child");

    const email = inputByLabel("Email Address");
    await user.type(email, "jonathan@example.com");
    expect(email).toHaveValue("jonathan@example.com");

    const mobile = inputByLabel("Mobile Phone");
    await user.type(mobile, "555-2222");
    expect(mobile).toHaveValue("555-2222");
  });

  it("handles a member with a null participant (fallback ids)", async () => {
    await loadExisting({
      members: [
        makeMember({ contactId: 201, firstName: "John", participant: null }),
        makeMember({ contactId: 202, firstName: "Jane", householdPositionId: 2 }),
      ],
    });
    // Participant Type falls back to 0 -> renders the placeholder, no crash.
    expect(screen.getByText("Head of House 1")).toBeInTheDocument();
  });

  it("expands and collapses a member card, editing expanded fields", async () => {
    const user = userEvent.setup();
    await loadExisting();

    const moreButtons = screen.getAllByRole("button", { name: /More/ });
    await user.click(moreButtons[0]);
    expect(screen.getAllByRole("button", { name: /Less/ })[0]).toBeInTheDocument();

    await selectByLabel("Prefix", "Mr.");
    await selectByLabel("Suffix", "Jr.");
    await selectByLabel("Marital Status", "Single");
    await selectByLabel("Contact Status", "Inactive");
    await selectByLabel("Primary Language", "English");
    await selectByLabel("Faith Background", "Christian");

    const nickname = inputByLabel("Nickname");
    await user.type(nickname, "Johnny");
    expect(nickname).toHaveValue("Johnny");

    const middleName = inputByLabel("Middle Name");
    await user.type(middleName, "Q");
    expect(middleName).toHaveValue("Q");

    const maidenName = inputByLabel("Maiden Name");
    await user.type(maidenName, "Doe");
    expect(maidenName).toHaveValue("Doe");

    const memberLastName = inputByLabel("Last Name", 1); // occurrence 0 is the household field
    await user.clear(memberLastName);
    await user.type(memberLastName, "Smithson");
    expect(memberLastName).toHaveValue("Smithson");

    const birthDate = inputByLabel("Date of Birth");
    await user.type(birthDate, "1990-05-01");
    expect(birthDate).toHaveValue("1990-05-01");

    await user.click(screen.getAllByRole("button", { name: /Less/ })[0]);
    expect(screen.queryByText("Prefix")).not.toBeInTheDocument();
  });

  it("clears an allow-clear select back to none", async () => {
    const user = userEvent.setup();
    await loadExisting();
    await user.click(screen.getAllByRole("button", { name: /More/ })[0]);
    await selectByLabel("Marital Status", "Single");
    // Re-open and clear it.
    const label = screen.getAllByText("Marital Status")[0];
    const container = label.parentElement as HTMLElement;
    const trigger = within(container).getByRole("combobox");
    await user.click(trigger);
    const noneOption = await screen.findByText("— None —");
    await user.click(noneOption);
  });

  it("toggles bulk email opt-out", async () => {
    const user = userEvent.setup();
    await loadExisting();
    await user.click(screen.getAllByRole("button", { name: /More/ })[0]);
    const bulk = screen.getAllByRole("checkbox", { name: "Bulk Email Opt Out" })[0];
    await user.click(bulk);
    expect(bulk).toBeChecked();
  });

  it("turns on Donor, assigns the next envelope number, then turns Donor off (clears envelope)", async () => {
    const user = userEvent.setup();
    await loadExisting();
    await user.click(screen.getAllByRole("button", { name: /More/ })[0]);

    const donor = screen.getAllByRole("checkbox", { name: "Donor" })[0];
    expect(donor).not.toBeDisabled();
    await user.click(donor);
    expect(donor).toBeChecked();

    mockFetchNextEnvelopeNumber.mockResolvedValueOnce(42);
    const assignBtn = await screen.findByRole("button", { name: "Assign Next Envelope #" });
    await user.click(assignBtn);
    await waitFor(() => expect(screen.getByDisplayValue("42")).toBeInTheDocument());

    await user.click(donor);
    expect(donor).not.toBeChecked();
    expect(screen.queryByDisplayValue("42")).not.toBeInTheDocument();
  });

  it("shows a toast error when assigning the next envelope number fails", async () => {
    const user = userEvent.setup();
    await loadExisting();
    await user.click(screen.getAllByRole("button", { name: /More/ })[0]);
    const donor = screen.getAllByRole("checkbox", { name: "Donor" })[0];
    await user.click(donor);

    mockFetchNextEnvelopeNumber.mockRejectedValueOnce(new Error("no envelopes left"));
    const assignBtn = await screen.findByRole("button", { name: "Assign Next Envelope #" });
    await user.click(assignBtn);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("no envelopes left"),
      ),
    );
  });

  it("disables the Donor checkbox with a tooltip when a donor record already exists", async () => {
    const user = userEvent.setup();
    await loadExisting({
      members: [
        makeMember({ contactId: 201, firstName: "John", isDonor: true, donorId: 55, envelopeNo: 7 }),
        makeMember({ contactId: 202, firstName: "Jane", householdPositionId: 2 }),
      ],
    });
    await user.click(screen.getAllByRole("button", { name: /More/ })[0]);
    const donor = screen.getAllByRole("checkbox", { name: "Donor" })[0];
    expect(donor).toBeDisabled();
    await user.click(donor); // no-op, but should not throw
    expect(donor).toBeDisabled();
  });

  it("edits the envelope number input directly, including clearing it to null", async () => {
    const user = userEvent.setup();
    await loadExisting({
      members: [
        makeMember({ contactId: 201, firstName: "John", isDonor: true, donorId: 55, envelopeNo: 7 }),
        makeMember({ contactId: 202, firstName: "Jane", householdPositionId: 2 }),
      ],
    });
    await user.click(screen.getAllByRole("button", { name: /More/ })[0]);
    const envelopeInput = await screen.findByDisplayValue("7");
    await user.clear(envelopeInput);
    expect((envelopeInput as HTMLInputElement).value).toBe("");
    await user.type(envelopeInput, "9");
    expect(await screen.findByDisplayValue("9")).toBeInTheDocument();
  });

  it("adds a new family member", async () => {
    const user = userEvent.setup();
    await loadExisting();
    await user.click(screen.getByRole("button", { name: /Add New Family Member/ }));
    expect(await screen.findByText("Family Member 3")).toBeInTheDocument();
  });
});

describe("AddEditFamily — save", () => {
  const progress: SaveProgress = {
    mainAddressId: 10,
    altAddressId: null,
    householdId: 500,
    members: [
      {
        tempContactId: 201,
        contactId: 201,
        participantId: 1,
        donorId: null,
        envelopeNo: null,
        envelopeBumped: false,
      },
      {
        tempContactId: 202,
        contactId: 202,
        participantId: 2,
        donorId: null,
        envelopeNo: null,
        envelopeBumped: false,
      },
    ],
  };

  async function loadExisting() {
    const household = makeHousehold();
    mockFetchHousehold.mockResolvedValueOnce({ success: true, household });
    setup({ initialContactId: 201 });
    await screen.findByDisplayValue("John");
  }

  it("saves successfully, reloads the household, and shows a success toast", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockResolvedValueOnce({ success: true, progress });
    const reloaded = makeHousehold({ householdName: "Smith Reloaded" });
    mockFetchHousehold.mockResolvedValueOnce({ success: true, household: reloaded });

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Family saved"));
    expect(mockFetchHousehold).toHaveBeenLastCalledWith(201);
    expect(await screen.findByDisplayValue("Smith Reloaded")).toBeInTheDocument();
  });

  it("keeps the current household when the post-save reload fails", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockResolvedValueOnce({ success: true, progress });
    mockFetchHousehold.mockResolvedValueOnce({ success: false, error: "reload failed" });

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Family saved"));
    // Original name is still shown since the reload branch was skipped.
    expect(screen.getByDisplayValue("Smith")).toBeInTheDocument();
  });

  it("skips reload when no member has a positive saved contactId", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockResolvedValueOnce({
      success: true,
      progress: { ...progress, members: [{ ...progress.members[0], contactId: -1 }] },
    });

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Family saved"));
    expect(mockFetchHousehold).toHaveBeenCalledTimes(1); // only the initial load
  });

  it("shows an envelope-bumped warning instead of the success toast", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockResolvedValueOnce({
      success: true,
      progress: {
        ...progress,
        members: [
          { ...progress.members[0], envelopeBumped: true, envelopeNo: 15 },
          progress.members[1],
        ],
      },
    });
    mockFetchHousehold.mockResolvedValueOnce({ success: true, household: makeHousehold() });

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockToastWarning).toHaveBeenCalledWith(expect.stringContaining("#15")),
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("shows an error toast and applies partial progress on save failure", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockResolvedValueOnce({
      success: false,
      error: "duplicate household",
      progress,
    });

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Save failed: duplicate household"),
    );
  });

  it("shows an error toast on save failure without progress", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockResolvedValueOnce({ success: false, error: "validation error" });

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Save failed: validation error"),
    );
  });

  it("shows an error toast when saveFamily throws an Error", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockRejectedValueOnce(new Error("network blip"));

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Save failed: network blip"),
    );
  });

  it("shows a generic error toast when saveFamily throws a non-Error", async () => {
    const user = userEvent.setup();
    await loadExisting();
    mockSaveFamily.mockRejectedValueOnce("weird failure");

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Save failed: Unknown error"),
    );
  });

  it("does nothing when Save is clicked with no household loaded", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(mockSaveFamily).not.toHaveBeenCalled();
  });
});

describe("AddEditFamily — close / dirty confirmation", () => {
  it("closes immediately when the household is unmodified", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it("confirms discard before closing when the household is dirty", async () => {
    const user = userEvent.setup();
    mockSearchContacts.mockResolvedValue([]);
    setup();
    await screen.findByText(/Search to find an existing household/i);
    await user.click(screen.getByRole("combobox", { name: "" }));
    await user.type(screen.getByPlaceholderText("Type a name…"), "Newman");
    await user.click(await screen.findByText(/\+ New Family with last name/));
    await waitFor(() => expect(screen.getAllByDisplayValue("Newman").length).toBeGreaterThan(0));

    // Household is now dirty once we change a field from its seeded snapshot.
    const lastName = screen.getAllByDisplayValue("Newman")[0];
    await user.type(lastName, " Jr");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
    expect(mockRouterBack).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument();
    expect(mockRouterBack).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await screen.findByText("Discard unsaved changes?");
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
