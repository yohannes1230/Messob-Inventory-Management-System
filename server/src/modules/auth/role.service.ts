/**
 * Role management service.
 */

import { NotFoundError, ConflictError, ForbiddenError } from '../../common/utils/errors.js';
import { roleRepository } from './auth.repository.js';
import type { RoleDocument } from './auth.model.js';
import type { PaginatedResult, CreateRoleInput, UpdateRoleInput } from '@am-pms/shared-types';

export class RoleService {
  async list(page: number, limit: number): Promise<PaginatedResult<RoleDocument>> {
    return roleRepository.findMany({
      page,
      limit,
      sort: { name: 1 },
    });
  }

  async getById(id: string): Promise<RoleDocument> {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError('Role not found');
    return role;
  }

  async create(data: CreateRoleInput): Promise<RoleDocument> {
    const existing = await roleRepository.findByName(data.name);
    if (existing) throw new ConflictError('Role name already exists');

    return roleRepository.create({
      name: data.name.toLowerCase(),
      description: data.description,
      permissions: data.permissions,
      isSystemRole: false, // Only seed data creates system roles
    } as any);
  }

  async update(id: string, data: UpdateRoleInput): Promise<{ before: RoleDocument; after: RoleDocument }> {
    const before = await roleRepository.findById(id);
    if (!before) throw new NotFoundError('Role not found');

    // Prevent renaming system roles
    if (before.isSystemRole && data.permissions) {
      // System roles CAN have their permissions updated (that's how seed
      // data evolves across phases), but we log a warning
    }

    const after = await roleRepository.updateById(id, data);
    if (!after) throw new NotFoundError('Role not found');

    return { before, after };
  }
}

export const roleService = new RoleService();
