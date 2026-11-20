import { describe, expect, it } from "vitest";
import { remainingOpenings } from "./app";

describe("remaining openings", () => {
  it("subtracts workers holding a place, never below zero, and leaves untouched jobs at their headcount", async () => {
    let asked: unknown;
    const prisma = {
      assignment: {
        groupBy: async (args: unknown) => {
          asked = args;
          return [
            { jobRequestId: "full", _count: { _all: 3 } },
            { jobRequestId: "half", _count: { _all: 1 } }
          ];
        }
      }
    } as unknown as Parameters<typeof remainingOpenings>[0];
    const left = await remainingOpenings(prisma, [
      { id: "full", numberOfWorkers: 2 },
      { id: "half", numberOfWorkers: 2 },
      { id: "empty", numberOfWorkers: 4 }
    ]);
    expect(Object.fromEntries(left)).toEqual({ full: 0, half: 1, empty: 4 });
    expect(JSON.stringify(asked)).toContain("confirmed");
    expect(JSON.stringify(asked)).not.toContain("worker_withdrawn");
  });
});
