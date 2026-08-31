import type { Request, Response } from 'express';
import { customFieldService } from './customfield.service.js';
import { masterDataService } from '../masterdata/masterdata.service.js';
import type { ControllerResult } from '@am-pms/shared-types';

export class CustomFieldController {
  async getByPropertyType(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const { propertyTypeId } = req.params;
    const fields = await customFieldService.getByPropertyType(propertyTypeId!);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: fields };
  }

  async create(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const result = await customFieldService.createField(
      req.body,
      req.user!.sub,
      req.ip,
      String(req.id),
    );
    (req as any).__transactionCommitted = true;
    return { status: 201, data: result };
  }

  async update(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const { id } = req.params;
    const result = await customFieldService.updateField(
      id!,
      req.body,
      req.user!.sub,
      req.ip,
      String(req.id),
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async deactivate(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const { id } = req.params;
    const result = await customFieldService.deactivateField(
      id!,
      req.user!.sub,
      req.ip,
      String(req.id),
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async validateValues(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const { propertyTypeId } = req.params;
    const result = await customFieldService.validateValues(propertyTypeId!, req.body);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async getHistory(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const { id } = req.params;
    const result = await masterDataService.getHistory('custom_field', id!);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }
}

export const customFieldController = new CustomFieldController();
