// @rwos/brain — a platform-neutral operations brain: deterministic rules find issues, actions fix
// them behind per-action switches, a master mode (off / watch / live), daily caps, once-only claims
// and a full audit log. No platform imports live here; see README.md for how a platform plugs in.
export * from "./types";
export * from "./engine";
export * from "./summary";
export * from "./memoryStore";
