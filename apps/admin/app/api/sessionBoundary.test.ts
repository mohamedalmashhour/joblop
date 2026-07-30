import { describe, expect, it } from "vitest";
import { isSameOriginMutation } from "./sessionBoundary";

describe("admin session mutation origin boundary", () => {
  it("accepts a browser-facing host when the framework normalized the request URL", () => {
    const request = new Request("http://localhost:3001/api/session/sign-up", {
      headers: {
        host: "127.0.0.1:3001",
        origin: "http://127.0.0.1:3001",
        "sec-fetch-site": "same-origin"
      }
    });
    expect(isSameOriginMutation(request)).toBe(true);
  });

  it("fails closed for cross-site and mismatched origins", () => {
    expect(
      isSameOriginMutation(
        new Request("http://localhost:3001/api/session/sign-up", {
          headers: {
            host: "localhost:3001",
            origin: "https://attacker.example",
            "sec-fetch-site": "cross-site"
          }
        })
      )
    ).toBe(false);
    expect(
      isSameOriginMutation(
        new Request("http://localhost:3001/api/session/sign-up", {
          headers: {
            host: "localhost:3001",
            origin: "https://attacker.example",
            "sec-fetch-site": "same-origin"
          }
        })
      )
    ).toBe(false);
  });
});
