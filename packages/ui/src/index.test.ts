import { describe, expect, it } from "vitest";
import {
  badgeRecipes,
  buttonRecipes,
  componentContracts,
  hasPrimitive,
  primitiveNames,
  rjdsTraceability,
  stateRecipes,
  uiFoundation
} from "./index";

describe("RJDS UI foundation", () => {
  it("declares the Wave 1 primitive contract", () => {
    expect(uiFoundation.status).toBe("rjds-wave-1-foundation");
    expect(primitiveNames).toContain("PrimaryButton");
    expect(primitiveNames).toContain("FormField");
    expect(primitiveNames).toContain("StatusBadge");
    expect(primitiveNames).toContain("ConfirmationDialog");
    expect(hasPrimitive("Modal")).toBe(true);
  });

  it("keeps component contracts within approved RJDS boundaries", () => {
    expect(componentContracts.StatusBadge).toContain("Color is never the only signal");
    expect(componentContracts.AppShell).toContain("Must not execute governed decisions");
    expect(rjdsTraceability.acrRequired).toBe(false);
    expect(rjdsTraceability.dcrRequired).toBe(false);
    expect(rjdsTraceability.gcrRequired).toBe(false);
  });

  it("defines accessible interaction styles and nonblank data states", () => {
    expect(buttonRecipes.primary.minHeight).toBe("56px");
    expect(buttonRecipes.focusVisible.outline).toContain("2px");
    expect(badgeRecipes.warning.accessibleLabel).toContain("human review");
    expect(stateRecipes["access-denied"].body).toContain("permission");
    expect(stateRecipes.loading.title).toBe("Loading");
  });
});
