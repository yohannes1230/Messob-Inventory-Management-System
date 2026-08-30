/**
 * Auth-related TypeScript interfaces shared between API and web.
 * These are plain interfaces — NO Mongoose dependency.
 * Mongoose schema definitions are in server/src/modules/auth/auth.model.ts.
 */

import type { TokenStatus, RevokeReason } from '@am-pms/shared-constants';

// ── User ──

export interface IUserRole {
  role: string; // ObjectId as string
  scopeType: 'global' | 'branch' | 'department';
  scopeRef?: string; // ObjectId as string
}

export interface IDelegation {
  role: string; // ObjectId as string
  fromUser: string;
  toUser: string;
  startDate: Date;
  endDate: Date;
}

export interface IUser {
  _id: string;
  employeeRef?: string;
  username: string;
  passwordHash: string;
  email: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  roles: IUserRole[];
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lastLoginAt?: Date;
  passwordHistory: string[];
  passwordChangedAt?: Date;
  passwordExpiresAt?: Date;
  delegations: IDelegation[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * User data safe for API responses (no passwordHash, mfaSecret, etc.).
 */
export interface IUserPublic {
  _id: string;
  employeeRef?: string;
  username: string;
  email: string;
  mfaEnabled: boolean;
  roles: IUserRole[];
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt?: Date;
  delegations: IDelegation[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Role ──

export interface IRole {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Employee ──

export interface IEmployee {
  _id: string;
  employeeCode: string;
  fullName: string;
  fullNameAm: string;
  email: string;
  phone?: string;
  department: string; // ObjectId as string
  branch: string; // ObjectId as string
  position: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Refresh Token ──

export interface IRefreshToken {
  _id: string;
  tokenHash: string;
  userId: string;
  familyId: string;
  status: TokenStatus;
  replacedByTokenHash?: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
  revokedReason?: RevokeReason;
}

// ── JWT Payloads ──

export interface IAccessTokenPayload {
  sub: string; // userId
  username: string;
  roles: IUserRole[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface IRefreshTokenPayload {
  sub: string; // userId
  familyId: string;
  tokenHash: string;
  iat?: number;
  exp?: number;
}

// ── API Response types ──

export interface ILoginResponse {
  accessToken: string;
  user: IUserPublic;
  mfaRequired?: boolean;
  refreshToken?: string;
}

export interface IMfaSetupResponse {
  secret: string;
  qrUri: string;
}
