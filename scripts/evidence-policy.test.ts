import { describe, expect, it } from "vitest";

import {
  isFullReleaseSha,
  isImmutableExternalIdentity,
  readApprovedPostgresTlsMode
} from "./evidence-policy";

describe("external launch evidence policy", () => {
  it("accepts only full lowercase release commits", () => {
    expect(isFullReleaseSha("0123456789abcdef0123456789abcdef01234567")).toBe(true);
    expect(isFullReleaseSha("6727705")).toBe(false);
    expect(isFullReleaseSha("0123456789ABCDEF0123456789ABCDEF01234567")).toBe(false);
  });

  it("requires provider-qualified immutable identities", () => {
    expect(isImmutableExternalIdentity("provider/account/cluster-01")).toBe(true);
    expect(isImmutableExternalIdentity("staging")).toBe(false);
    expect(isImmutableExternalIdentity("provider/account/latest")).toBe(false);
    expect(isImmutableExternalIdentity("provider/unknown/cluster")).toBe(false);
  });

  it("accepts only approved PostgreSQL TLS modes", () => {
    expect(
      readApprovedPostgresTlsMode(
        new URL("postgresql://rwos@db.example.test/rwos_staging?sslmode=verify-full")
      )
    ).toBe("verify-full");
    expect(
      readApprovedPostgresTlsMode(
        new URL("postgresql://rwos@db.example.test/rwos_staging?sslmode=disable")
      )
    ).toBeNull();
    expect(
      readApprovedPostgresTlsMode(new URL("postgresql://rwos@db.example.test/rwos_staging"))
    ).toBeNull();
  });
});
