import type { Request, Response } from 'express';
import { masterDataService } from './masterdata.service.js';
import type { ControllerResult } from '@am-pms/shared-types';

export class MasterDataController {
  list(entityKey: string) {
    return async (req: Request, _res: Response): Promise<ControllerResult<any>> => {
      const result = await masterDataService.list(entityKey, req.query);
      (req as any).__transactionCommitted = true;
      return { status: 200, data: result };
    };
  }

  getById(entityKey: string) {
    return async (req: Request, _res: Response): Promise<ControllerResult<any>> => {
      const result = await masterDataService.getById(entityKey, req.params.id!);
      (req as any).__transactionCommitted = true;
      return { status: 200, data: result };
    };
  }

  create(entityKey: string) {
    return async (req: Request, _res: Response): Promise<ControllerResult<any>> => {
      const result = await masterDataService.create(
        entityKey,
        req.body,
        req.user!.sub,
        req.ip,
        String(req.id),
      );
      (req as any).__transactionCommitted = true;
      return { status: 201, data: result };
    };
  }

  update(entityKey: string) {
    return async (req: Request, _res: Response): Promise<ControllerResult<any>> => {
      const result = await masterDataService.update(
        entityKey,
        req.params.id!,
        req.body,
        req.user!.sub,
        req.ip,
        String(req.id),
      );
      (req as any).__transactionCommitted = true;
      return { status: 200, data: result };
    };
  }

  deactivate(entityKey: string) {
    return async (req: Request, _res: Response): Promise<ControllerResult<any>> => {
      const result = await masterDataService.deactivate(
        entityKey,
        req.params.id!,
        req.user!.sub,
        req.ip,
        String(req.id),
      );
      (req as any).__transactionCommitted = true;
      return { status: 200, data: result };
    };
  }

  async hardDelete(_req: Request, _res: Response): Promise<ControllerResult<any>> {
    await masterDataService.hardDelete();
    return { status: 405, data: {} };
  }

  getHistory(entityKey: string) {
    return async (req: Request, _res: Response): Promise<ControllerResult<any>> => {
      const result = await masterDataService.getHistory(entityKey, req.params.id!);
      (req as any).__transactionCommitted = true;
      return { status: 200, data: result };
    };
  }
}

export const masterDataController = new MasterDataController();
