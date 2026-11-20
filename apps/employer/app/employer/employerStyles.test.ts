import { describe, expect, it } from "vitest";
import { styles } from "./employerStyles";

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(first: string, second: string) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

const hex = (value: unknown) => (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null);

describe("employer styles", () => {
  // The workspace is dark, so text with no background of its own sits on the dark canvas. The rebrand
  // turned the shared navy to black, and text using it vanished.
  it("keeps every text colour readable on its background", () => {
    const unreadable = Object.entries(styles).flatMap(([name, style]) => {
      const color = hex(style.color);
      if (!color) return [];
      const background = hex(style.background) ?? "#0c0c0c";
      return contrast(color, background) < 4.5 ? [`${name}: ${color} on ${background}`] : [];
    });
    expect(unreadable).toEqual([]);
  });
});
