import { parsePayOffered, type PayOffered } from "@rwos/shared";

// Reads the long-term part of an employer's job request (POST /organizations/:id/job-requests).
// Flag OFF, or any job length other than "long_term": "short_term", nothing is written (today's path,
// every job keeps the column default). Flag ON + "long_term": the job needs NO contract rate (it is a
// paid listing, priced at zero at approval) but must carry a valid pay offer, stored on the request.

export type LongTermJobRequestInput =
  | Readonly<{ status: "short_term" }>
  | Readonly<{ status: "invalid_pay_offered" }>
  | Readonly<{
      status: "long_term";
      payOffered: PayOffered;
      data: Readonly<{
        jobLength: "long_term";
        payOfferedMinMinor: number;
        payOfferedMaxMinor: number | null;
        payOfferedUnit: PayOffered["unit"];
      }>;
    }>;

export function longTermJobRequestInput(body: Readonly<Record<string, unknown>>, plansEnabled: boolean): LongTermJobRequestInput {
  if (!plansEnabled || body.jobLength !== "long_term") return { status: "short_term" };
  const payOffered = parsePayOffered(body.payOffered);
  if (!payOffered) return { status: "invalid_pay_offered" };
  return {
    status: "long_term",
    payOffered,
    data: {
      jobLength: "long_term",
      payOfferedMinMinor: payOffered.minMinor,
      payOfferedMaxMinor: payOffered.maxMinor,
      payOfferedUnit: payOffered.unit
    }
  };
}
