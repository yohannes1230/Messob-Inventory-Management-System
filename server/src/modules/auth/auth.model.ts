/**
 * Auth domain Mongoose schemas: User, Role, Employee, RefreshToken.
 * (Design Doc §6.2, FR-AUTH-*)
 */

import mongoose, { Schema, type Document } from 'mongoose';
import type { IUser, IRole, IEmployee, IRefreshToken, IUserRole, IDelegation } from '@am-pms/shared-types';
import { TOKEN_STATUS } from '@am-pms/shared-constants';

// ── User ──

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const userRoleSchema = new Schema(
  {
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    scopeType: { type: String, enum: ['global', 'branch', 'department'], required: true },
    scopeRef: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const delegationSchema = new Schema(
  {
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    employeeRef: { type: Schema.Types.ObjectId, ref: 'Employee' },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    passwordHash: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false }, // Never returned by default
    roles: { type: [userRoleSchema], required: true, default: [] },
    isActive: { type: Boolean, default: true, index: true },
    isLocked: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    passwordHistory: { type: [String], default: [], select: false },
    passwordChangedAt: { type: Date },
    passwordExpiresAt: { type: Date },
    delegations: { type: [delegationSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).passwordHash;
        delete (ret as any).mfaSecret;
        delete (ret as any).passwordHistory;
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);

// ── Role ──

export interface RoleDocument extends Omit<IRole, '_id'>, Document {}

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, maxlength: 500 },
    permissions: { type: [String], required: true, default: [] },
    isSystemRole: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const RoleModel = mongoose.model<RoleDocument>('Role', roleSchema);

// ── Employee ──

export interface EmployeeDocument extends Omit<IEmployee, '_id'>, Document {}

const employeeSchema = new Schema(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: { type: String, required: true, trim: true },
    fullNameAm: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    position: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const EmployeeModel = mongoose.model<EmployeeDocument>('Employee', employeeSchema);

// ── RefreshToken ──

export interface RefreshTokenDocument extends Omit<IRefreshToken, '_id'>, Document {}

const refreshTokenSchema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    familyId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TOKEN_STATUS),
      required: true,
      default: TOKEN_STATUS.ACTIVE,
    },
    replacedByTokenHash: { type: String },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: { type: Date },
    revokedReason: {
      type: String,
      enum: ['reuse_detected', 'logout', 'password_change', 'admin_action'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Compound index for family-wide operations (reuse detection, logout all)
refreshTokenSchema.index({ userId: 1, familyId: 1 });
// Index for cleanup job sweeping expired/revoked tokens
refreshTokenSchema.index({ status: 1, expiresAt: 1 });

// NOTE: No TTL index — expiry is managed by the status field + cleanup job.
// This is intentional (Revision 4): a TTL index would hard-delete expired tokens,
// making it impossible to distinguish "expired" from "reuse" during refresh attempts.

export const RefreshTokenModel = mongoose.model<RefreshTokenDocument>('RefreshToken', refreshTokenSchema);
