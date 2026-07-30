import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverFiles } from "./filesystem-discovery";
import { findPublicCredentialLeaks } from "./public-bundle-policy";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("deterministic public bundle filesystem discovery", () => {
  it("discovers nested files in deterministic order, including safe unusual names", () => {
    const root = fixture();
    write(root, "approved/z-last.js", "");
    write(root, "approved/nested/a first-file.json", "");
    write(root, "approved/nested/brackets_[safe]@2.js", "");

    expect(discover(root, ["approved"])).toEqual([
      "approved/nested/a first-file.json",
      "approved/nested/brackets_[safe]@2.js",
      "approved/z-last.js"
    ]);
    expect(discover(root, ["approved"])).toEqual(discover(root, ["approved"]));
  });

  it("reports an existing empty root explicitly", () => {
    const root = fixture();
    mkdirSync(join(root, "approved"));

    expect(() => discover(root, ["approved"])).toThrow(
      "PUBLIC_BUNDLE_FILE_DISCOVERY_FAILED [test-public-build] approved: existing root contains no files"
    );
  });

  it("reports a missing or invalid root without leaving the repository", () => {
    const root = fixture();
    expect(() => discover(root, ["missing"])).toThrow(/missing: filesystem entry cannot be read/u);
    expect(() => discover(root, ["../outside"])).toThrow(/root escapes the repository/u);

    write(root, "not-a-directory", "");
    expect(() => discover(root, ["not-a-directory"])).toThrow(/root is not a directory/u);
  });

  it("does not follow directory or file symbolic links", () => {
    const root = fixture();
    write(root, "approved/kept.js", "");
    write(root, "outside/secret.js", "process.env.INTERNAL_API_TOKEN");
    symlinkSync(join(root, "outside"), join(root, "approved", "linked-directory"));
    symlinkSync(join(root, "outside", "secret.js"), join(root, "approved", "linked-file.js"));

    expect(discover(root, ["approved"])).toEqual(["approved/kept.js"]);
  });

  it("reports unreadable directories where the filesystem enforces permissions", () => {
    const root = fixture();
    mkdirSync(join(root, "approved"));
    chmodSync(join(root, "approved"), 0o000);
    try {
      try {
        const files = discover(root, ["approved"]);
        expect(files).toEqual([]);
      } catch (error) {
        expect(String(error)).toMatch(/directory cannot be read: EACCES/u);
      }
    } finally {
      chmodSync(join(root, "approved"), 0o700);
    }
  });

  it("feeds every discovered artifact into prohibited-value detection", () => {
    const root = fixture();
    write(root, "approved/dist/nested/client.js", "process.env.INTERNAL_API_TOKEN");
    const artifacts = discover(root, ["approved"]).map((path) => ({
      path,
      content: readFileSync(join(root, path), "utf8")
    }));

    expect(findPublicCredentialLeaks(artifacts)).toEqual([
      "approved/dist/nested/client.js: INTERNAL_API_TOKEN is prohibited-from-bundles-and-logs"
    ]);
  });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rwos-public-discovery-"));
  temporaryRoots.push(root);
  return root;
}

function write(root: string, path: string, content: string) {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), content);
}

function discover(repositoryRoot: string, roots: readonly string[]) {
  return discoverFiles({
    repositoryRoot,
    roots,
    label: "test-public-build",
    requireFiles: true
  });
}
