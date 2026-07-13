import { describe, expect, it } from "vitest";
import { mockShiftDiscoveryRecords } from "../../data/mock/shifts";
import { getShiftDiscoveryState, getUnavailableApplicationsMessage } from "./stateModel";

describe("shift discovery mobile state model", () => {
  it("represents the Available loading state", () => {
    expect({ status: "loading" }).toEqual({ status: "loading" });
  });

  it("represents the Available populated state", () => {
    const state = getShiftDiscoveryState([mockShiftDiscoveryRecords[0]!], {});

    expect(state.status).toBe("populated");
  });

  it("represents the Available empty state", () => {
    const state = getShiftDiscoveryState([], { city: "Quebec City" });

    expect(state).toMatchObject({ status: "empty" });
  });

  it("represents the Available error state and retry message path", () => {
    const state = getShiftDiscoveryState([], {}, "Unable to load available shifts.");

    expect(state).toEqual({ status: "error", message: "Unable to load available shifts." });
  });

  it("keeps applications unavailable in G01", () => {
    expect(getUnavailableApplicationsMessage()).toContain("Applications are not enabled in G01");
  });
});
