export class IdempotencyStore {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs = 1000 * 60 * 60 * 24) {}

  has(key: string): boolean {
    this.prune();
    return this.seen.has(key);
  }

  add(key: string): void {
    this.seen.set(key, Date.now());
    this.prune();
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.seen.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.seen.delete(key);
      }
    }
  }
}
