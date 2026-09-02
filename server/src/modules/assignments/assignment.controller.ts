import type { Request, Response } from 'express';
import { assignmentService } from './assignment.service.js';
import type { ControllerResult } from '@am-pms/shared-types';

export class AssignmentController {
  async create(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const assignment = await assignmentService.createAssignment(req.body, userId, ipAddress);
    (req as any).__transactionCommitted = true;
    return { status: 201, data: assignment };
  }

  async accept(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const assignment = await assignmentService.acceptAssignment(
      req.params.id as string,
      req.body.notes,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: assignment };
  }

  async return(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const assignment = await assignmentService.returnAssignment(
      req.params.id as string,
      req.body,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: assignment };
  }

  async transfer(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const result = await assignmentService.transferAssignment(
      req.params.id as string,
      req.body,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async getAssetHistory(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const history = await assignmentService.getAssetHistory(req.params.id as string);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: history };
  }
}

export const assignmentController = new AssignmentController();
