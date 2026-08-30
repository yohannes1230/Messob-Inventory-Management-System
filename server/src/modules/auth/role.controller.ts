/**
 * Role management controller.
 */

import type { Request } from 'express';
import type { ControllerResult } from '@am-pms/shared-types';
import { AUTH_EVENT } from '@am-pms/shared-constants';
import { roleService } from './role.service.js';

export class RoleController {
  async list(req: Request): Promise<ControllerResult> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await roleService.list(page, limit);
    return { status: 200, data: result };
  }

  async getById(req: Request): Promise<ControllerResult> {
    const role = await roleService.getById(req.params.id!);
    return { status: 200, data: role };
  }

  async create(req: Request): Promise<ControllerResult> {
    const role = await roleService.create(req.body);
    return {
      status: 201,
      data: role,
      audit: {
        action: AUTH_EVENT.ROLE_CREATED,
        entityType: 'Role',
        entityId: role._id.toString(),
      },
    };
  }

  async update(req: Request): Promise<ControllerResult> {
    const { before, after } = await roleService.update(req.params.id!, req.body);
    return {
      status: 200,
      data: after,
      audit: {
        action: AUTH_EVENT.ROLE_UPDATED,
        entityType: 'Role',
        entityId: after._id.toString(),
        beforeValue: before,
      },
    };
  }
}

export const roleController = new RoleController();
