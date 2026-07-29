export type DeliveryResponse = Readonly<{
  status: "sent" | "delivered" | "failed";
  providerReference: string | null;
  retryable: boolean;
}>;

export type AttemptRecord = Readonly<{
  attempt: number;
  at: Date;
  response: DeliveryResponse;
}>;

export type IdempotencyRecord = {
  requestDigest: string;
  createdAt: Date;
  updatedAt: Date;
  nextAttemptAt: Date | null;
  attempts: AttemptRecord[];
  response: DeliveryResponse;
};

export class MemoryDeliveryStore {
  readonly #records = new Map<string, IdempotencyRecord>();

  get(key: string) {
    return this.#records.get(key) ?? null;
  }

  set(key: string, record: IdempotencyRecord) {
    this.#records.set(key, record);
  }

  cleanup(before: Date) {
    let removed = 0;
    for (const [key, record] of this.#records) {
      if (record.updatedAt < before) {
        this.#records.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  size() {
    return this.#records.size;
  }
}
