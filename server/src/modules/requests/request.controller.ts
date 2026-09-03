import type { Request, Response } from 'express';
import { requestService } from './request.service.js';
import type { ControllerResult } from '@am-pms/shared-types';

export class RequestController {
  async create(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const request = await requestService.createRequest(req.body, userId, ipAddress);
    (req as any).__transactionCommitted = true;
    return { status: 201, data: request };
  }

  async getMine(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const result = await requestService.getMyRequests(userId, req.query as any);
    return { status: 200, data: result };
  }

  async getById(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const permissions = (req as any).user?.permissions || [];
    const request = await requestService.getRequestById(req.params.id as string, {
      userId,
      permissions,
    });
    return { status: 200, data: request };
  }

  async cancel(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const request = await requestService.cancelRequest(
      req.params.id as string,
      req.body,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: request };
  }

  async list(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const result = await requestService.listAllRequests(req.query as any);
    return { status: 200, data: result };
  }

  async reportIssue(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const request = await requestService.reportIssue(
      req.params.id as string,
      req.body,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 201, data: request };
  }

  async requestReturn(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const request = await requestService.requestReturn(
      req.params.id as string,
      req.body,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 201, data: request };
  }

  async getDashboard(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const summary = await requestService.getPersonalDashboard(userId);
    return { status: 200, data: summary };
  }
}

export const requestController = new RequestController();
