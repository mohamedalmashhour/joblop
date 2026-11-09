import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Store builds use Expo's precompiled native modules. A module newer than the version Expo pairs with this
// SDK can be precompiled against a newer ExpoModulesCore and crash the app at launch (TestFlight build 8:
// "DYLD Symbol missing … ExpoVideo … ExpoModulesCore", expo-video ~57.0.5 with core 57.0.7). So every
// native dependency must not be newer than Expo's bundled version for the installed SDK.

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, "..", "..");
const require = createRequire(join(mobileRoot, "package.json"));

// Already newer than Expo's pairing and shipped in store builds that launch fine (builds 1-7), so their
// precompiled binaries don't need anything missing from this SDK's core. Anything else newer is refused;
// adding to this list needs a store build that launches on a real phone.
const LAUNCH_VERIFIED = new Map<string, string>([
  ["expo-document-picker", "~57.0.3"],
  ["expo-notifications", "~57.0.25"],
  ["react-native-web", "^0.21.2"] // web only, not in the iOS or Android binary
]);

type Version = [number, number, number];

function base(spec: string): Version | null {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(spec);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function newer(a: Version, b: Version) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i]! !== b[i]!) return a[i]! > b[i]!;
  }
  return false;
}

describe("Expo native module versions", () => {
  it("never declares a native module newer than Expo's bundled version for this SDK", () => {
    const pkg = JSON.parse(readFileSync(join(mobileRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    const bundled = require("expo/bundledNativeModules.json") as Record<string, string>;
    const tooNew: string[] = [];
    for (const [name, spec] of Object.entries(pkg.dependencies ?? {})) {
      if (name === "expo" || !(name in bundled)) continue;
      if (LAUNCH_VERIFIED.get(name) === spec) continue;
      const declared = base(spec);
      const expected = base(bundled[name]!);
      if (declared && expected && newer(declared, expected)) tooNew.push(`${name} ${spec} (Expo pairs ${bundled[name]})`);
    }
    expect(tooNew).toEqual([]);
  });

  it("pins expo-video to the exact version Expo pairs with this SDK", () => {
    const pkg = JSON.parse(readFileSync(join(mobileRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const bundled = require("expo/bundledNativeModules.json") as Record<string, string>;
    expect(pkg.dependencies["expo-video"]).toBe(bundled["expo-video"]!.replace(/^[~^]/, ""));
  });
});
