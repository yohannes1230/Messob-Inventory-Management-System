/**
 * AuditLog Mongoose schema (Design Doc §6.2, FR-AUD-01→05).
 *
 * This collection is APPEND-ONLY: no update/delete operations are exposed
 * anywhere in the application. At the database level, the MongoDB user
 * should have only insert + find grants on this collection.
 */

import mongoose, { Schema, type Document } from 'mongoose';
import type { IAuditLog } from '@am-pms/shared-types';

export interface AuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
    },
    beforeValue: {
      type: Schema.Types.Mixed,
    },
    afterValue: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    // Disable versioning — audit entries are immutable
    versionKey: false,
    // Don't add updatedAt — audit entries are never updated
    timestamps: false,
  },
);

// ── Indexes (Design Doc §6.3) ──
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);
