import { describe, expect, it } from "vitest";
import { buildControlInventory } from "./generate-control-inventory";

describe("machine-readable control inventory", () => {
  it("classifies every visible source control without dead or ambiguous actions", async () => {
    const inventory = await buildControlInventory();
    expect(inventory.controls.length).toBeGreaterThan(150);
    expect(inventory.defects).toEqual([]);
    expect(inventory.counts.deferred).toBe(0);
    expect(
      inventory.controls.every((control) =>
        ["working", "intentionally_disabled", "governed", "deferred"].includes(
          control.classification
        )
      )
    ).toBe(true);
    expect(
      Object.values(inventory.counts).reduce((total, count) => total + count, 0)
    ).toBe(inventory.controls.length);
  });

  it("is deterministic, stably ordered, and includes native interactive controls", async () => {
    const first = await buildControlInventory();
    const second = await buildControlInventory();

    expect(second).toEqual(first);
    expect(first.controls).toEqual(
      [...first.controls].sort(
        (left, right) =>
          left.file.localeCompare(right.file) ||
          left.line - right.line ||
          left.tag.localeCompare(right.tag)
      )
    );
    expect(
      first.controls.some(
        (control) => control.app === "worker" && control.tag === "Pressable"
      )
    ).toBe(true);
    expect(
      first.controls.some(
        (control) => control.app === "worker" && control.tag === "TextInput"
      )
    ).toBe(true);
    expect(
      first.controls.some(
        (control) =>
          control.classification === "intentionally_disabled" &&
          control.evidence === "explicit_disabled_state"
      )
    ).toBe(true);
  });
});
