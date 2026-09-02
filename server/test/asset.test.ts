import request from 'supertest';
import { app } from '../src/app.js';
import { getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES } from '@am-pms/shared-constants';
import {
  BranchModel,
  CategoryModel,
  PropertyTypeModel,
  SupplierModel,
} from '../src/modules/masterdata/masterdata.model.js';
import { CustomFieldModel } from '../src/modules/customfields/customfield.model.js';
import { AssetModel } from '../src/modules/assets/asset.model.js';
import { AuditLogModel } from '../src/modules/audit/audit.model.js';

describe('Asset Management & Bulk Import API (Phase 3)', () => {
  let superAdminAuth: Record<string, string>;
  let propertyOfficerAuth: Record<string, string>;
  let storeKeeperAuth: Record<string, string>;
  let employeeAuth: Record<string, string>;
  let financeAuth: Record<string, string>;

  let branch: any;
  let category: any;
  let propertyType: any;
  let supplier: any;

  beforeEach(async () => {
    superAdminAuth = (await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN)).Authorization ? { Authorization: (await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN)).Authorization } : {};
    propertyOfficerAuth = { Authorization: (await getAuthHeader(SYSTEM_ROLES.PROPERTY_OFFICER)).Authorization };
    storeKeeperAuth = { Authorization: (await getAuthHeader(SYSTEM_ROLES.STORE_KEEPER)).Authorization };
    employeeAuth = { Authorization: (await getAuthHeader(SYSTEM_ROLES.EMPLOYEE)).Authorization };
    financeAuth = { Authorization: (await getAuthHeader(SYSTEM_ROLES.FINANCE)).Authorization };

    // Seed master data prerequisites
    branch = await BranchModel.create({
      name: 'Headquarters',
      nameAm: 'ዋና መሥሪያ ቤት',
      code: 'HQ',
      isActive: true,
      version: 1,
    });

    category = await CategoryModel.create({
      name: 'IT Equipment',
      nameAm: 'የአይቲ ዕቃዎች',
      code: 'ITE',
      isActive: true,
      version: 1,
    });

    propertyType = await PropertyTypeModel.create({
      name: 'Laptop',
      nameAm: 'ላፕቶፕ',
      category: category._id,
      unitOfMeasure: 'pcs',
      defaultUsefulLifeMonths: 36,
      isActive: true,
      version: 1,
    });

    supplier = await SupplierModel.create({
      name: 'Dell Ethiopia Ltd',
      contact: { person: 'Abebe Kebede', phone: '+251911000000', email: 'sales@dell.et' },
      taxId: 'TIN-12345678',
      category: 'Electronics',
      isActive: true,
      version: 1,
    });

    // Seed a custom field for Laptop: 'serial_number' (text, required)
    await CustomFieldModel.create({
      propertyType: propertyType._id,
      name: 'serial_number',
      label: 'Serial Number',
      labelAm: 'የመለያ ቁጥር',
      dataType: 'text',
      isRequired: true,
      isUnique: true,
      isActive: true,
      version: 1,
    });
  });

  describe('Asset Registration (FR-REG-01, FR-REG-02, FR-REG-03, FR-REG-05)', () => {
    it('allows property_officer (asset.create) to register an asset with auto-code, custom fields, and audit log', async () => {
      const payload = {
        name: 'Dell Latitude 5420',
        propertyType: propertyType._id.toString(),
        category: category._id.toString(),
        currentLocation: { branch: branch._id.toString() },
        value: 45000,
        currency: 'ETB',
        supplier: supplier._id.toString(),
        customFieldValues: { serial_number: 'DELL-SN-9988' },
      };

      const res = await request(app)
        .post('/api/v1/assets')
        .set(propertyOfficerAuth)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Dell Latitude 5420');
      // Verify atomic asset-code format: {PREFIX}-{BRANCH}-{CAT}-{YYYY}-{SEQ:5}
      expect(res.body.data.assetCode).toMatch(/^AM-HQ-IT E-\d{4}-\d{5}$/);
      expect(res.body.data.status).toBe('available');
      expect(res.body.data.qrCode).toContain(res.body.data._id);

      // Verify audit trail atomicity
      const audit = await AuditLogModel.findOne({
        entityType: 'Asset',
        entityId: res.body.data._id,
        action: 'asset.created',
      });
      expect(audit).not.toBeNull();
    });

    it('allows store_keeper (asset.receive) to register an asset received at store scope', async () => {
      const payload = {
        name: 'HP ProBook 450 G8',
        propertyType: propertyType._id.toString(),
        currentLocation: { branch: branch._id.toString() },
        value: 38000,
        customFieldValues: { serial_number: 'HP-SN-12345' },
      };

      const res = await request(app)
        .post('/api/v1/assets')
        .set(storeKeeperAuth)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('HP ProBook 450 G8');
    });

    it('denies standard employee from registering an asset (RBAC dual-assertion: 403)', async () => {
      const payload = {
        name: 'Unauthorized Laptop',
        propertyType: propertyType._id.toString(),
        currentLocation: { branch: branch._id.toString() },
        customFieldValues: { serial_number: 'UNAUTH-001' },
      };

      const res = await request(app)
        .post('/api/v1/assets')
        .set(employeeAuth)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('rejects asset registration when required custom fields are missing (Phase 2 validation engine)', async () => {
      const payload = {
        name: 'Dell Latitude Missing Serial',
        propertyType: propertyType._id.toString(),
        currentLocation: { branch: branch._id.toString() },
        customFieldValues: {}, // serial_number is required!
      };

      const res = await request(app)
        .post('/api/v1/assets')
        .set(propertyOfficerAuth)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Custom field validation failed');
      expect(JSON.stringify(res.body.error.details)).toContain('Serial Number');
    });

    it('generates QR code and barcode metadata on GET /assets/:id/qr', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-HQ-ITE-2026-00001',
        name: 'Scan Test Laptop',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        qrCode: JSON.stringify({ code: 'AM-HQ-ITE-2026-00001' }),
        barcodeFormat: 'CODE128',
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .get(`/api/v1/assets/${asset._id}/qr`)
        .set(storeKeeperAuth);

      expect(res.status).toBe(200);
      expect(res.body.data.assetCode).toBe('AM-HQ-ITE-2026-00001');
      expect(res.body.data.barcodeFormat).toBe('CODE128');
    });

    it('generates barcode payload on GET /assets/:id/barcode', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-HQ-ITE-2026-00009',
        name: 'Barcode Test Laptop',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        barcodeFormat: 'CODE128',
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .get(`/api/v1/assets/${asset._id}/barcode`)
        .set(storeKeeperAuth);

      expect(res.status).toBe(200);
      expect(res.body.data.assetCode).toBe('AM-HQ-ITE-2026-00009');
      expect(res.body.data.barcode).toBe('AM-HQ-ITE-2026-00009');
      expect(res.body.data.barcodeFormat).toBe('CODE128');
    });

    it('attaches photos to an asset with audit log (FR-REG-05)', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-HQ-ITE-2026-00002',
        name: 'Photo Test Laptop',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .post(`/api/v1/assets/${asset._id}/photos`)
        .set(propertyOfficerAuth)
        .send({
          photos: [
            { url: 'https://storage.example.com/assets/front.jpg', caption: 'Front view' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.photos).toHaveLength(1);
      expect(res.body.data.photos[0].caption).toBe('Front view');

      // Verify audit log
      const audit = await AuditLogModel.findOne({
        entityType: 'Asset',
        entityId: asset._id,
        action: 'asset.photo_attached',
      });
      expect(audit).not.toBeNull();
    });
  });

  describe('Bundle Management (FR-ASG-05)', () => {
    it('attaches and detaches bundle child assets with audit tracking', async () => {
      const parent = await AssetModel.create({
        assetCode: 'AM-HQ-ITE-2026-00010',
        name: 'Desktop Workstation Bundle',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        isActive: true,
        version: 1,
      });

      const child = await AssetModel.create({
        assetCode: 'AM-HQ-ITE-2026-00011',
        name: 'Dell 27-inch Monitor',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        isActive: true,
        version: 1,
      });

      // Attach child
      const attachRes = await request(app)
        .post(`/api/v1/assets/${parent._id}/bundle/attach`)
        .set(propertyOfficerAuth)
        .send({ childAssetId: child._id.toString() });

      expect(attachRes.status).toBe(200);
      expect(attachRes.body.data.parent.isBundleParent).toBe(true);
      expect(attachRes.body.data.parent.bundleChildren).toContain(child._id.toString());
      expect(attachRes.body.data.child.bundleParent).toBe(parent._id.toString());

      // Detach child
      const detachRes = await request(app)
        .post(`/api/v1/assets/${parent._id}/bundle/detach`)
        .set(propertyOfficerAuth)
        .send({ childAssetId: child._id.toString() });

      expect(detachRes.status).toBe(200);
      expect(detachRes.body.data.parent.isBundleParent).toBe(false);
      expect(detachRes.body.data.parent.bundleChildren).toHaveLength(0);
    });
  });

  describe('Bulk Import Pre-Validation & Commit (FR-REG-04)', () => {
    it('dry-run returns pre-import validation report showing valid and invalid rows without writing records', async () => {
      const rows = [
        {
          name: 'Valid Batch Laptop',
          propertyTypeName: 'Laptop',
          branchCode: 'HQ',
          value: 30000,
          customFields: { serial_number: 'BATCH-VALID-01' },
        },
        {
          name: 'Invalid Row Missing Branch',
          propertyTypeName: 'Laptop',
          branchCode: 'NON_EXISTENT_BRANCH',
          customFields: { serial_number: 'BATCH-ERR-01' },
        },
        {
          name: 'Invalid Row Missing Serial',
          propertyTypeName: 'Laptop',
          branchCode: 'HQ',
          customFields: {}, // required custom field missing
        },
      ];

      const res = await request(app)
        .post('/api/v1/assets/bulk-import/dry-run')
        .set(propertyOfficerAuth)
        .send({ rows });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRows).toBe(3);
      expect(res.body.data.validRowsCount).toBe(1);
      expect(res.body.data.invalidRowsCount).toBe(2);

      // Verify no assets were written in dry run
      const count = await AssetModel.countDocuments({ name: 'Valid Batch Laptop' });
      expect(count).toBe(0);
    });

    it('commits bulk import batch when all rows are valid and logs import audit entry', async () => {
      const rows = [
        {
          name: 'Imported Laptop 1',
          propertyTypeName: 'Laptop',
          branchCode: 'HQ',
          value: 35000,
          customFields: { serial_number: 'IMP-001' },
        },
        {
          name: 'Imported Laptop 2',
          propertyTypeName: 'Laptop',
          branchCode: 'HQ',
          value: 36000,
          customFields: { serial_number: 'IMP-002' },
        },
      ];

      const res = await request(app)
        .post('/api/v1/assets/bulk-import')
        .set(propertyOfficerAuth)
        .send({ rows });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(2);

      // Verify records exist in database
      const assets = await AssetModel.find({ name: { $regex: /^Imported Laptop/ } });
      expect(assets).toHaveLength(2);

      // Verify audit entry
      const audit = await AuditLogModel.findOne({ action: 'asset.imported' });
      expect(audit).not.toBeNull();
    });
  });

  describe('Supplier Master Data & Dual-Assertion RBAC', () => {
    it('allows finance role (supplier.create) to create a supplier', async () => {
      const payload = {
        name: 'HP Commercial Ethiopia',
        contact: { person: 'Tigist Haile', phone: '+251922334455', email: 'sales@hp.et' },
        taxId: 'TIN-99887766',
        category: 'Hardware',
      };

      const res = await request(app)
        .post('/api/v1/suppliers')
        .set(financeAuth)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('HP Commercial Ethiopia');
    });

    it('denies standard employee from creating a supplier (RBAC dual-assertion: 403)', async () => {
      const payload = {
        name: 'Unauthorized Supplier',
        contact: { phone: '+251900000000' },
      };

      const res = await request(app)
        .post('/api/v1/suppliers')
        .set(employeeAuth)
        .send(payload);

      expect(res.status).toBe(403);
    });
  });
});
