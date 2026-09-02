import type { Request, Response } from 'express';
import { assetService } from './asset.service.js';
import { bulkImportService } from './bulk-import.service.js';
import type { ControllerResult } from '@am-pms/shared-types';

export class AssetController {
  async list(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const result = await assetService.list(req.query);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async getById(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const asset = await assetService.getById(req.params.id as string);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: asset };
  }

  async create(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const asset = await assetService.create(req.body, userId, ipAddress);
    (req as any).__transactionCommitted = true;
    return { status: 201, data: asset };
  }

  async update(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const asset = await assetService.update(req.params.id as string, req.body, userId, ipAddress);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: asset };
  }

  async deactivate(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const asset = await assetService.deactivate(req.params.id as string, userId, ipAddress);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: asset };
  }

  async attachPhotos(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const asset = await assetService.attachPhotos(
      req.params.id as string,
      req.body.photos,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: asset };
  }

  async getQr(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const asset = await assetService.getById(req.params.id as string);
    (req as any).__transactionCommitted = true;
    return {
      status: 200,
      data: {
        assetId: asset._id,
        assetCode: asset.assetCode,
        name: asset.name,
        qrPayload: asset.qrCode,
        barcodeFormat: asset.barcodeFormat,
      },
    };
  }

  async getBarcode(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const asset = await assetService.getById(req.params.id as string);
    (req as any).__transactionCommitted = true;
    return {
      status: 200,
      data: {
        assetId: asset._id,
        assetCode: asset.assetCode,
        barcode: asset.assetCode,
        barcodeFormat: asset.barcodeFormat || 'CODE128',
      },
    };
  }

  async dryRunImport(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const report = await bulkImportService.validateRows(req.body.rows);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: report };
  }

  async commitImport(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const result = await bulkImportService.commitBatch(req.body.rows, userId, ipAddress);
    (req as any).__transactionCommitted = true;
    return { status: 201, data: result };
  }

  async attachBundleChild(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const result = await assetService.attachBundleChild(
      req.params.id as string,
      req.body.childAssetId,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async detachBundleChild(req: Request, _res: Response): Promise<ControllerResult<any>> {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    const ipAddress = req.ip;
    const result = await assetService.detachBundleChild(
      req.params.id as string,
      req.body.childAssetId,
      userId,
      ipAddress,
    );
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }
}

export const assetController = new AssetController();
