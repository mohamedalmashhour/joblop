// Adds spoken words to what is already in a box, without breaking the box's length limit.
export function appendDictation(current: string, spoken: string, maxLength?: number): string {
  const words = spoken.trim();
  if (!words) return current;
  const needsSpace = current.length > 0 && !/\s$/.test(current);
  const joined = `${current}${needsSpace ? " " : ""}${words}`;
  return maxLength === undefined ? joined : joined.slice(0, maxLength);
}

// A user refusing the microphone needs different advice from speech simply not working.
export function dictationErrorKey(error: string): "create.dictateBlocked" | "create.dictateFailed" | null {
  if (error === "aborted" || error === "no-speech") return null;
  return error === "not-allowed" || error === "service-not-allowed"
    ? "create.dictateBlocked"
    : "create.dictateFailed";
}
