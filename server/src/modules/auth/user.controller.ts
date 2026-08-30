/**
 * User management controller — CRUD operations wrapped in mutationHandler.
 * Each method returns ControllerResult with audit metadata.
 */

import type { Request } from 'express';
import type { ControllerResult } from '@am-pms/shared-types';
import { AUTH_EVENT } from '@am-pms/shared-constants';
import { userService } from './user.service.js';

export class UserController {
  async list(req: Request): Promise<ControllerResult> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.list(page, limit);
    return { status: 200, data: result };
  }

  async getById(req: Request): Promise<ControllerResult> {
    const user = await userService.getById(req.params.id!);
    return { status: 200, data: user };
  }

  async create(req: Request): Promise<ControllerResult> {
    const user = await userService.create(req.body, req.user!.sub);
    return {
      status: 201,
      data: user,
      audit: {
        action: AUTH_EVENT.USER_CREATED,
        entityType: 'User',
        entityId: user._id.toString(),
      },
    };
  }

  async update(req: Request): Promise<ControllerResult> {
    const { before, after } = await userService.update(req.params.id!, req.body, req.user!.sub);
    return {
      status: 200,
      data: after,
      audit: {
        action: AUTH_EVENT.USER_UPDATED,
        entityType: 'User',
        entityId: after._id.toString(),
        beforeValue: before,
      },
    };
  }

  async deactivate(req: Request): Promise<ControllerResult> {
    const { before, after } = await userService.deactivate(req.params.id!, req.user!.sub);
    return {
      status: 200,
      data: after,
      audit: {
        action: AUTH_EVENT.USER_DEACTIVATED,
        entityType: 'User',
        entityId: after._id.toString(),
        beforeValue: before,
      },
    };
  }

  async delegate(req: Request): Promise<ControllerResult> {
    const { before, after } = await userService.delegate(req.params.id!, req.body, req.user!.sub);
    return {
      status: 200,
      data: after,
      audit: {
        action: AUTH_EVENT.USER_DELEGATED,
        entityType: 'User',
        entityId: after._id.toString(),
        beforeValue: before,
      },
    };
  }

  async unlock(req: Request): Promise<ControllerResult> {
    const { before, after } = await userService.unlock(req.params.id!, req.user!.sub);
    return {
      status: 200,
      data: after,
      audit: {
        action: AUTH_EVENT.ACCOUNT_UNLOCKED,
        entityType: 'User',
        entityId: after._id.toString(),
        beforeValue: before,
      },
    };
  }
}

export const userController = new UserController();
