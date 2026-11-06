import { randomInt } from "node:crypto";

const letters = (length: number) => Array.from({ length }, () => "abcdef"[randomInt(6)]).join("");

// A valid v4 UUID with no digit runs. The AI egress scan fails closed on anything that looks like a
// bank, tax or phone number, and it can match digits inside a random id, which makes tests fail at
// random. Tests that exercise the external review path use these ids so only their own content
// decides the result.
export function digitFreeUuid(): string {
  return `${letters(8)}-${letters(4)}-4${letters(3)}-a${letters(3)}-${letters(12)}`;
}
