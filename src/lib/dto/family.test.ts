import { describe, it, expect } from "vitest";
import {
  FamilyAddressSchema,
  FamilyMemberParticipantSchema,
  FamilyMemberSchema,
  HouseholdSchema,
  emptyAddress,
  emptyMember,
  emptyHousehold,
  type FamilyDefaults,
} from "./family";

const defaults: FamilyDefaults = {
  congregationId: 1,
  sourceId: 18,
  countryCode: "US",
  state: "CA",
  householdPositionId: 2,
  participantTypeId: 4,
  showEnvelopeNumbers: true,
};

describe("emptyAddress", () => {
  it("returns a blank address shape", () => {
    expect(emptyAddress()).toEqual({
      addressId: 0,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      region: null,
      postalCode: "",
      countryCode: null,
    });
  });

  it("validates against FamilyAddressSchema", () => {
    expect(() => FamilyAddressSchema.parse(emptyAddress())).not.toThrow();
  });
});

describe("emptyMember", () => {
  it("builds a member with the given contactId and lastName", () => {
    const member = emptyMember(-1, "Smith", defaults);
    expect(member.contactId).toBe(-1);
    expect(member.lastName).toBe("Smith");
    expect(member.firstName).toBe("");
    expect(member.householdPositionId).toBe(defaults.householdPositionId);
    expect(member.participant).toEqual({
      participantId: 0,
      participantTypeId: defaults.participantTypeId,
      notes: null,
    });
    expect(member.isDonor).toBe(false);
    expect(member.donorId).toBeNull();
    expect(member.contactStatusId).toBe(1);
  });

  it("validates against FamilyMemberSchema", () => {
    const member = emptyMember(-2, "Jones", defaults);
    expect(() => FamilyMemberSchema.parse(member)).not.toThrow();
  });
});

describe("emptyHousehold", () => {
  it("builds a household with two blank members by default lastName", () => {
    const household = emptyHousehold(defaults);
    expect(household.householdId).toBe(0);
    expect(household.householdName).toBe("");
    expect(household.members).toHaveLength(2);
    expect(household.members[0].contactId).toBe(-1);
    expect(household.members[1].contactId).toBe(-2);
    expect(household.address.countryCode).toBe(defaults.countryCode);
    expect(household.address.state).toBe(defaults.state);
    expect(household.alternateMailingAddress.countryCode).toBe(defaults.countryCode);
  });

  it("uses the provided lastName for householdName and members", () => {
    const household = emptyHousehold(defaults, "Rivera");
    expect(household.householdName).toBe("Rivera");
    expect(household.members[0].lastName).toBe("Rivera");
    expect(household.members[1].lastName).toBe("Rivera");
  });

  it("validates against HouseholdSchema", () => {
    const household = emptyHousehold(defaults, "Rivera");
    expect(() => HouseholdSchema.parse(household)).not.toThrow();
  });
});

describe("FamilyMemberParticipantSchema", () => {
  it("accepts a participant with optional notes omitted", () => {
    const result = FamilyMemberParticipantSchema.safeParse({
      participantId: 1,
      participantTypeId: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-integer participantId", () => {
    const result = FamilyMemberParticipantSchema.safeParse({
      participantId: 1.5,
      participantTypeId: 2,
    });
    expect(result.success).toBe(false);
  });
});
