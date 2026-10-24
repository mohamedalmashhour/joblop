import { describe, expect, it } from "vitest";
import {
  buildVariableClientQuote,
  demandClientUpliftMinor,
  distanceSurchargeMinor,
  emergencyClientSurchargeMinor,
  splitDistanceSurchargeMinor,
  DISTANCE_FREE_RADIUS_KM
} from "./variableClientPricing";

describe("emergencyClientSurchargeMinor", () => {
  it("is zero for a normal job", () => {
    expect(emergencyClientSurchargeMinor({ labourClientMinor: 30000, urgency: "scheduled" })).toBe(0);
    expect(emergencyClientSurchargeMinor({ labourClientMinor: 30000, urgency: null })).toBe(0);
  });
  it("adds 15% for urgent and 30% for immediate", () => {
    expect(emergencyClientSurchargeMinor({ labourClientMinor: 30000, urgency: "urgent" })).toBe(4500);
    expect(emergencyClientSurchargeMinor({ labourClientMinor: 30000, urgency: "immediate" })).toBe(9000);
  });
  it("handles a zero/negative labour base", () => {
    expect(emergencyClientSurchargeMinor({ labourClientMinor: 0, urgency: "urgent" })).toBe(0);
    expect(emergencyClientSurchargeMinor({ labourClientMinor: -5, urgency: "urgent" })).toBe(0);
  });
});

describe("distanceSurchargeMinor", () => {
  it("is zero inside the free radius", () => {
    const s = distanceSurchargeMinor({ distanceKm: DISTANCE_FREE_RADIUS_KM });
    expect(s.totalMinor).toBe(0);
    expect(s.billableKm).toBe(0);
  });
  it("bills gas + travel time round-trip beyond the free radius", () => {
    // 55km site → 30km over the 25km radius → 60 billable km round trip.
    const s = distanceSurchargeMinor({ distanceKm: 55 });
    expect(s.billableKm).toBe(60);
    expect(s.gasMinor).toBe(60 * 25); // C$0.25/km → 1500
    // 60 min travel @ C$25/hr → 2500
    expect(s.travelTimeMinor).toBe(2500);
    expect(s.totalMinor).toBe(1500 + 2500);
  });
  it("supports one-way billing", () => {
    const round = distanceSurchargeMinor({ distanceKm: 55, roundTrip: true });
    const oneWay = distanceSurchargeMinor({ distanceKm: 55, roundTrip: false });
    expect(oneWay.billableKm).toBe(round.billableKm / 2);
  });
});

describe("demandClientUpliftMinor", () => {
  it("is zero with no headroom or no demand", () => {
    expect(demandClientUpliftMinor({ baseClientMinor: 30000, ceilingMinor: 30000, demandSignal: 1 })).toBe(0);
    expect(demandClientUpliftMinor({ baseClientMinor: 30000, ceilingMinor: 40000, demandSignal: 0 })).toBe(0);
  });
  it("scales with demand and is capped by the rate ceiling", () => {
    // base 30000, 25% max uplift → at full demand, 7500, within the 10000 headroom.
    expect(demandClientUpliftMinor({ baseClientMinor: 30000, ceilingMinor: 40000, demandSignal: 1 })).toBe(7500);
    // half demand → half the rate-capped uplift.
    expect(demandClientUpliftMinor({ baseClientMinor: 30000, ceilingMinor: 40000, demandSignal: 0.5 })).toBe(3750);
  });
  it("never exceeds the willingness-to-pay headroom", () => {
    // headroom is only 1000 though the rate would allow 7500.
    expect(demandClientUpliftMinor({ baseClientMinor: 30000, ceilingMinor: 31000, demandSignal: 1 })).toBe(1000);
  });
});

describe("splitDistanceSurchargeMinor", () => {
  it("splits 50/50 with the odd cent to the worker", () => {
    expect(splitDistanceSurchargeMinor(4000)).toEqual({ workerMinor: 2000, platformMinor: 2000 });
    expect(splitDistanceSurchargeMinor(4001)).toEqual({ workerMinor: 2001, platformMinor: 2000 });
    expect(splitDistanceSurchargeMinor(0)).toEqual({ workerMinor: 0, platformMinor: 0 });
  });
});

describe("buildVariableClientQuote", () => {
  it("assembles labour + allowances + emergency + distance + demand, splits distance 50/50, reports kept extras", () => {
    const q = buildVariableClientQuote({
      labourClientMinor: 30000, // $300 labour
      allowancesClientMinor: 2500, // $25 funded transport
      urgency: "urgent", // +15% of labour = 4500, platform-kept
      distanceKm: 55, // 4000 distance surcharge, split 2000/2000
      willingnessCeilingMinor: 50000,
      demandSignal: 1
    });
    expect(q.emergencySurchargeMinor).toBe(4500);
    expect(q.distanceSurcharge.totalMinor).toBe(4000);
    expect(q.distanceWorkerMinor).toBe(2000);
    expect(q.distancePlatformMinor).toBe(2000);
    // base before demand = 30000 + 2500 + 4500 + 4000 = 41000; headroom to 50000 = 9000;
    // rate cap 25% of 41000 = 10250 → capped at 9000 headroom.
    expect(q.demandUpliftMinor).toBe(9000);
    expect(q.clientSubtotalMinor).toBe(41000 + 9000);
    // platform keeps emergency + demand + its distance half.
    expect(q.platformKeptExtrasMinor).toBe(4500 + 9000 + 2000);
    // worker gets its distance half on top of base pay.
    expect(q.workerExtrasMinor).toBe(2000);
  });
  it("omits demand uplift when no ceiling/signal is supplied", () => {
    const q = buildVariableClientQuote({ labourClientMinor: 30000, urgency: "scheduled", distanceKm: 10 });
    expect(q.demandUpliftMinor).toBe(0);
    expect(q.distanceSurcharge.totalMinor).toBe(0);
    expect(q.clientSubtotalMinor).toBe(30000);
  });
});
