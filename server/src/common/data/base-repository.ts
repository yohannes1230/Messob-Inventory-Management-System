/**
 * BaseRepository<T> — generic data access layer for all Mongoose models.
 *
 * STRUCTURAL ENFORCEMENT: All write methods read the Mongoose session from
 * AsyncLocalStorage (set by mutationHandler). If no session is found, the
 * write THROWS — making it impossible to accidentally write outside a
 * transaction. This is the primary mechanism that ensures audit atomicity.
 *
 * Module-specific repositories extend this class to add domain queries.
 */

import type { Model, FilterQuery, UpdateQuery, ClientSession, SortOrder } from 'mongoose';
import { getTransactionSession } from '../utils/async-context.js';
import type { PaginatedResult } from '@am-pms/shared-types';

export interface FindManyOptions<T> {
  filter?: FilterQuery<T>;
  page?: number;
  limit?: number;
  sort?: Record<string, SortOrder>;
  select?: string | Record<string, number>;
  populate?: string | string[] | Array<{ path: string; select?: string }>;
}

export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  // ── Write methods — require ambient transaction session ──

  /**
   * Create a new document. REQUIRES an active transaction session in
   * AsyncLocalStorage (set by mutationHandler).
   *
   * @throws Error if no session is found — this means the write is being
   *         attempted outside a transaction context.
   */
  async create(data: Partial<T>): Promise<T> {
    const session = this.requireSession();
    // model.create() with array + session — the documented way for transactions
    const [doc] = await this.model.create([data], { session });
    return doc as T;
  }

  /**
   * Update a document by ID. REQUIRES an active transaction session.
   */
  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    const session = this.requireSession();
    return this.model.findByIdAndUpdate(id, data, { new: true, session }).exec() as Promise<T | null>;
  }

  /**
   * Soft-delete a document (set isActive = false). REQUIRES a session.
   */
  async softDelete(id: string): Promise<T | null> {
    const session = this.requireSession();
    return this.model
      .findByIdAndUpdate(id, { isActive: false } as UpdateQuery<T>, { new: true, session })
      .exec() as Promise<T | null>;
  }

  // ── Read methods — no session required ──

  async findById(id: string, populate?: string | string[]): Promise<T | null> {
    const query = this.model.findById(id);
    if (populate) {
      if (Array.isArray(populate)) {
        for (const p of populate) query.populate(p);
      } else {
        query.populate(populate);
      }
    }
    return query.exec() as Promise<T | null>;
  }

  async findOne(filter: FilterQuery<T>, populate?: string | string[]): Promise<T | null> {
    const query = this.model.findOne(filter);
    if (populate) {
      if (Array.isArray(populate)) {
        for (const p of populate) query.populate(p);
      } else {
        query.populate(populate);
      }
    }
    return query.exec() as Promise<T | null>;
  }

  async findMany(options: FindManyOptions<T> = {}): Promise<PaginatedResult<T>> {
    const {
      filter = {},
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      select,
      populate,
    } = options;

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.model
        .find(filter as FilterQuery<T>)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(select as Record<string, number> ?? {})
        .populate((populate as any) ?? [])
        .exec(),
      this.model.countDocuments(filter as FilterQuery<T>).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: data as T[],
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async countDocuments(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const doc = await this.model.exists(filter);
    return doc !== null;
  }

  // ── Internal helpers ──

  /**
   * Get the ambient session, or throw if none exists.
   * This is the core enforcement mechanism — no session = no write.
   */
  private requireSession(): ClientSession {
    const session = getTransactionSession();
    if (!session) {
      throw new Error(
        'TRANSACTION_REQUIRED: write operations must run within a transaction context. ' +
        'Use mutationHandler() to wrap your route, or start a manual session via ' +
        'runInTransactionContext(). This error means a write was attempted outside ' +
        'the transaction middleware, which would bypass audit atomicity.',
      );
    }
    return session;
  }

  /**
   * Get the ambient session if available (for operations that work both
   * inside and outside transactions, like the auth service's self-managed
   * transaction writes).
   */
  protected getOptionalSession(): ClientSession | undefined {
    return getTransactionSession();
  }
}
