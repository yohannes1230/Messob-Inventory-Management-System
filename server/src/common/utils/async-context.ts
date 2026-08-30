/**
 * AsyncLocalStorage-based transaction context.
 *
 * The Mongoose session is stored here by the transaction middleware
 * (mutationHandler) and read automatically by BaseRepository write methods.
 * This eliminates the need for explicit session parameter threading — the
 * session propagates across the entire async call chain transparently.
 *
 * See: Node.js docs → async_hooks → AsyncLocalStorage (stable since Node 16).
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { ClientSession } from 'mongoose';

export interface TransactionContext {
  /** Active Mongoose session for the current transaction. */
  session: ClientSession;
  /** Correlation ID for audit logging. */
  requestId: string;
}

const transactionStore = new AsyncLocalStorage<TransactionContext>();

/**
 * Returns the Mongoose session from the current async context, or undefined
 * if no transaction is active (e.g., during a read-only GET request).
 */
export function getTransactionSession(): ClientSession | undefined {
  return transactionStore.getStore()?.session;
}

/**
 * Returns the request ID from the current async context.
 */
export function getTransactionRequestId(): string | undefined {
  return transactionStore.getStore()?.requestId;
}

/**
 * Executes `fn` within a transaction context. All async operations called
 * from within `fn` — including nested service and repository calls —
 * will see the provided session via `getTransactionSession()`.
 */
export function runInTransactionContext<T>(
  ctx: TransactionContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return transactionStore.run(ctx, fn);
}
