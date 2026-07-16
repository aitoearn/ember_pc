/** 对齐 aya licia/Readiness：socket 就绪后再 resolve getVideo/getControl。 */
export class ScrcpyReadinessGate {
  readonly #ready = new Set<string>();
  readonly #pending = new Map<string, Array<() => void>>();

  signal(name: string): void {
    if (this.#ready.has(name)) {
      return;
    }
    this.#ready.add(name);
    for (const resolve of this.#pending.get(name) ?? []) {
      resolve();
    }
    this.#pending.delete(name);
  }

  wait(name: string): Promise<void> {
    if (this.#ready.has(name)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const queue = this.#pending.get(name) ?? [];
      queue.push(resolve);
      this.#pending.set(name, queue);
    });
  }

  reset(): void {
    this.#ready.clear();
    this.#pending.clear();
  }
}
