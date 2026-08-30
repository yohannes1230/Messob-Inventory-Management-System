/**
 * User management service — CRUD operations for admin user management.
 *
 * These use the standard mutationHandler transaction (unlike AuthService
 * which manages its own). The controller returns ControllerResult with
 * audit metadata, and mutationHandler handles the transaction + audit.
 */

import bcrypt from 'bcrypt';
import { config } from '../../common/config/env.js';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../../common/utils/errors.js';
import { userRepository, roleRepository } from './auth.repository.js';
import type { UserDocument } from './auth.model.js';
import type { IUserPublic, PaginatedResult, CreateUserInput, UpdateUserInput, DelegateInput } from '@am-pms/shared-types';

export class UserService {
  async list(page: number, limit: number): Promise<PaginatedResult<UserDocument>> {
    return userRepository.findMany({
      page,
      limit,
      sort: { createdAt: -1 },
    });
  }

  async getById(id: string): Promise<UserDocument> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async create(data: CreateUserInput, createdBy: string): Promise<UserDocument> {
    // Check uniqueness
    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) throw new ConflictError('Username already exists');

    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) throw new ConflictError('Email already exists');

    // Validate roles exist
    for (const r of data.roles) {
      const role = await roleRepository.findById(r.role);
      if (!role) throw new ValidationError(`Role ${r.role} not found`);
    }

    const passwordHash = await bcrypt.hash(data.password, config.BCRYPT_SALT_ROUNDS);
    const passwordExpiresAt = config.PASSWORD_EXPIRY_DAYS > 0
      ? new Date(Date.now() + config.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      : undefined;

    const user = await userRepository.create({
      username: data.username.toLowerCase(),
      email: data.email.toLowerCase(),
      passwordHash,
      employeeRef: data.employeeRef,
      roles: data.roles,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      createdBy,
    } as any);

    return user;
  }

  async update(id: string, data: UpdateUserInput, updatedBy: string): Promise<{ before: UserDocument; after: UserDocument }> {
    const before = await userRepository.findById(id);
    if (!before) throw new NotFoundError('User not found');

    if (data.roles) {
      for (const r of data.roles) {
        const role = await roleRepository.findById(r.role);
        if (!role) throw new ValidationError(`Role ${r.role} not found`);
      }
    }

    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing && existing._id.toString() !== id) {
        throw new ConflictError('Email already in use');
      }
    }

    const after = await userRepository.updateById(id, {
      ...data,
      updatedBy,
    });
    if (!after) throw new NotFoundError('User not found');

    return { before, after };
  }

  async deactivate(id: string, updatedBy: string): Promise<{ before: UserDocument; after: UserDocument }> {
    const before = await userRepository.findById(id);
    if (!before) throw new NotFoundError('User not found');
    if (!before.isActive) throw new ConflictError('User is already deactivated');

    const after = await userRepository.updateById(id, {
      isActive: false,
      updatedBy,
    });
    if (!after) throw new NotFoundError('User not found');

    return { before, after };
  }

  async delegate(
    userId: string,
    data: DelegateInput,
    delegatedBy: string,
  ): Promise<{ before: UserDocument; after: UserDocument }> {
    const before = await userRepository.findById(userId);
    if (!before) throw new NotFoundError('User not found');

    // Validate delegate target exists
    const toUser = await userRepository.findById(data.toUser);
    if (!toUser) throw new NotFoundError('Delegate target user not found');

    const role = await roleRepository.findById(data.role);
    if (!role) throw new ValidationError('Role not found');

    const delegation = {
      role: data.role,
      fromUser: userId,
      toUser: data.toUser,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    };

    const after = await userRepository.updateById(userId, {
      $push: { delegations: delegation },
      updatedBy: delegatedBy,
    } as any);
    if (!after) throw new NotFoundError('User not found');

    return { before, after };
  }

  async unlock(id: string, unlockedBy: string): Promise<{ before: UserDocument; after: UserDocument }> {
    const before = await userRepository.findById(id);
    if (!before) throw new NotFoundError('User not found');
    if (!before.isLocked) throw new ConflictError('User is not locked');

    const after = await userRepository.updateById(id, {
      isLocked: false,
      failedLoginAttempts: 0,
      updatedBy: unlockedBy,
    });
    if (!after) throw new NotFoundError('User not found');

    return { before, after };
  }
}

export const userService = new UserService();
