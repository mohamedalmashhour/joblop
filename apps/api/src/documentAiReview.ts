import { type DocumentAiVerdict, offlineAdvisoryVerdict } from "@rwos/shared";

// Advisory document pre-check (worker + HR). Launch step 6 (AI safety): NO document, photo or scan is
// ever sent to an outside AI, as an image, as base64 or in any other form. A photo of a CV, an ID, a
// SIN card, a certificate or a profile picture shows a name, an address, a birth date or a face, and an
// image cannot be masked. So the pre-check is text-only and offline: it uses our own record of the
// document (its type and whether it has expired) and never opens the file. Every document that is not
// expired goes to a person on the HR team, who decides (see presentableVerdict in @rwos/shared).
//
// callOutsideAi (outsideAi.ts) also refuses any image or base64 content, for every feature, so no
// future change here can send a file by mistake.

/** The advisory verdict for a document, from our own record only. Never reads the file. */
export function reviewDocumentAdvisory(input: { documentType: string; expired: boolean }): DocumentAiVerdict {
  return offlineAdvisoryVerdict(input.documentType, { expired: input.expired });
}
