import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { homeText } from "./homeText";

const here = dirname(fileURLToPath(import.meta.url));
const source = ["page.tsx", "HomePanel.tsx", "homeText.ts"].map((file) => readFileSync(join(here, file), "utf8")).join("\n");

describe("staff home", () => {
  it("shows no sample people, numbers or internal role names", () => {
    for (const banned of ["Demo data", "Enterprise Dispatch Center", "Mohamed A.", "Sarah L.", "John D.", "Role shells", "adminRoles"]) {
      expect(source).not.toContain(banned);
    }
  });

  it("checks the staff sign-in before showing the work links", () => {
    expect(source).toContain('fetch("/api/session"');
    expect(source).toContain('href="/signin"');
  });

  it("has the same links in English, French and Arabic", () => {
    const links = (copy: typeof homeText.en) => [...copy.daily, ...copy.money, ...copy.people].map((tile) => tile.href);
    expect(links(homeText.fr)).toEqual(links(homeText.en));
    expect(links(homeText.ar)).toEqual(links(homeText.en));
    expect(links(homeText.en)).toContain("/orders");
  });
});
