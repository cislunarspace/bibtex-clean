import type { Change } from "./itemCleaning";

export type LastCleanOperation = {
  changes: Change[];
};

/**
 * Stores the most recent clean operation for undo support.
 *
 * Deep-clones changes on `record()` so callers cannot accidentally
 * mutate the stored copy.
 */
export class CleanSessionStore {
  private _operation: LastCleanOperation | undefined;

  /** Record a new clean operation (deep-clones the changes). */
  record(changes: Change[]): void {
    this._operation = { changes: changes.map((c) => ({ ...c })) };
  }

  /** Peek at the current operation without consuming it. */
  current(): LastCleanOperation | undefined {
    return this._operation;
  }

  /** Return the current operation and clear the store. */
  consume(): LastCleanOperation | undefined {
    const op = this._operation;
    this._operation = undefined;
    return op;
  }

  /** Whether there is an operation available for undo. */
  hasUndo(): boolean {
    return this._operation !== undefined;
  }
}

/** Singleton store instance used across the plugin. */
export const cleanSessionStore = new CleanSessionStore();
