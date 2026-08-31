import request from 'supertest';
import { app } from '../src/app.js';
import { getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES } from '@am-pms/shared-constants';
import {
  CategoryModel,
  PropertyTypeModel,
  MasterDataHistoryModel,
} from '../src/modules/masterdata/masterdata.model.js';
import { CustomFieldModel } from '../src/modules/customfields/customfield.model.js';
import { AuditLogModel } from '../src/modules/audit/audit.model.js';

describe('Custom Fields Engine Tests (FR-CF-01 → FR-CF-06)', () => {
  let ictAdminAuth: { Authorization: string; user: any };
  let employeeAuth: { Authorization: string; user: any };
  let auditorAuth: { Authorization: string; user: any };
  let propertyType: any;

  beforeEach(async () => {
    ictAdminAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
    employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
    auditorAuth = await getAuthHeader(SYSTEM_ROLES.AUDITOR);

    const category = await CategoryModel.create({
      name: 'Mobile Devices',
      nameAm: 'ተንቀሳቃሽ ስልኮች',
      isActive: true,
      version: 1,
    });

    propertyType = await PropertyTypeModel.create({
      name: 'Smartphone',
      nameAm: 'ስማርትፎን',
      category: category._id,
      unitOfMeasure: 'unit',
      defaultUsefulLifeMonths: 24,
      isActive: true,
      version: 1,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Custom Field CRUD & RBAC
  // ══════════════════════════════════════════════════════════════════════════
  describe('Custom Field Definition Lifecycle', () => {
    it('creates custom field, links to PropertyType, and updates version history', async () => {
      const payload = {
        propertyType: propertyType._id.toString(),
        name: 'imei_number',
        label: 'IMEI Number',
        labelAm: 'የአይኤምኢአይ ቁጥር',
        dataType: 'text',
        isRequired: true,
        isUnique: true,
        isSearchable: true,
        validationRule: '^[0-9]{15}$',
      };

      // Unauthorized (employee -> 403)
      const unauth = await request(app)
        .post('/api/v1/custom-fields')
        .set('Authorization', employeeAuth.Authorization)
        .send(payload);
      expect(unauth.status).toBe(403);

      // Authorized (ict_admin -> 201)
      const res = await request(app)
        .post('/api/v1/custom-fields')
        .set('Authorization', ictAdminAuth.Authorization)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('imei_number');
      expect(res.body.data.version).toBe(1);

      // Check linked on PropertyType
      const ptAfter = await PropertyTypeModel.findById(propertyType._id);
      expect(ptAfter?.customFieldDefs.map((id) => id.toString())).toContain(res.body.data._id);

      // History & Audit log
      const hist = await MasterDataHistoryModel.findOne({
        entityType: 'CustomField',
        entityId: res.body.data._id,
      });
      expect(hist).not.toBeNull();
      expect(hist?.action).toBe('create');
    });

    it('updates custom field definition and deactivates (soft delete)', async () => {
      const field = await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'ram_size',
        label: 'RAM Size',
        labelAm: 'የራም መጠን',
        dataType: 'single_select',
        options: ['4GB', '8GB', '16GB'],
        isActive: true,
        version: 1,
      });

      // Update definition (add option)
      const updateRes = await request(app)
        .patch(`/api/v1/custom-fields/${field._id}`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ options: ['4GB', '8GB', '16GB', '32GB'] });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.version).toBe(2);
      expect(updateRes.body.data.options).toContain('32GB');

      // Deactivate field
      const deactRes = await request(app)
        .post(`/api/v1/custom-fields/${field._id}/deactivate`)
        .set('Authorization', ictAdminAuth.Authorization);

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);
      expect(deactRes.body.data.version).toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Server-Side Validation: A Test per Data Type Proving Invalid Input is Rejected
  //    (FR-CF-05: text, number, date, boolean, single_select, multi_select, attachment)
  // ══════════════════════════════════════════════════════════════════════════
  describe('Server-Side Custom Field Validation (FR-CF-05)', () => {
    beforeEach(async () => {
      // 1. Text field with regex constraint (15 digits)
      await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'serial_code',
        label: 'Serial Code',
        labelAm: 'መለያ ኮድ',
        dataType: 'text',
        validationRule: '^[A-Z]{3}-[0-9]{4}$',
        isActive: true,
        version: 1,
      });

      // 2. Number field
      await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'storage_gb',
        label: 'Storage (GB)',
        labelAm: 'የማከማቻ መጠን',
        dataType: 'number',
        isActive: true,
        version: 1,
      });

      // 3. Date field
      await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'manufacture_date',
        label: 'Manufacture Date',
        labelAm: 'የተመረተበት ቀን',
        dataType: 'date',
        isActive: true,
        version: 1,
      });

      // 4. Boolean field
      await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'is_5g_enabled',
        label: '5G Enabled',
        labelAm: '5ጂ አለው',
        dataType: 'boolean',
        isActive: true,
        version: 1,
      });

      // 5. Single Select field
      await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'os_type',
        label: 'Operating System',
        labelAm: 'ስርዓተ ክወና',
        dataType: 'single_select',
        options: ['Android', 'iOS'],
        isActive: true,
        version: 1,
      });

      // 6. Multi Select field
      await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'accessories',
        label: 'Included Accessories',
        labelAm: 'መለዋወጫዎች',
        dataType: 'multi_select',
        options: ['Charger', 'Earphones', 'Case', 'Screen Protector'],
        isActive: true,
        version: 1,
      });

      // 7. Attachment field
      await CustomFieldModel.create({
        propertyType: propertyType._id,
        name: 'warranty_card',
        label: 'Warranty Card',
        labelAm: 'የዋስትና ካርድ',
        dataType: 'attachment',
        isActive: true,
        version: 1,
      });
    });

    it('rejects invalid text that does not match regex pattern', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ serial_code: 'INVALID-CODE-123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.serial_code).toBeDefined();
    });

    it('rejects non-numeric input for number field', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ storage_gb: 'one-hundred-twenty-eight' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.storage_gb).toBeDefined();
    });

    it('rejects invalid non-ISO date string for date field', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ manufacture_date: 'not-a-real-date-format' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.manufacture_date).toBeDefined();
    });

    it('rejects non-boolean value for boolean field', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ is_5g_enabled: 'maybe' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.is_5g_enabled).toBeDefined();
    });

    it('rejects single_select value not in allowed options', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ os_type: 'Windows Phone' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.os_type).toBeDefined();
    });

    it('rejects multi_select value containing disallowed option', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ accessories: ['Charger', 'Laser Pointer'] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.accessories).toBeDefined();
    });

    it('rejects invalid attachment without url property', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ warranty_card: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.warranty_card).toBeDefined();
    });

    it('accepts completely valid payload for all 6 data types', async () => {
      const res = await request(app)
        .post(`/api/v1/property-types/${propertyType._id}/custom-fields/validate`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          serial_code: 'ABC-1234',
          storage_gb: 256,
          manufacture_date: '2025-01-15T00:00:00.000Z',
          is_5g_enabled: true,
          os_type: 'Android',
          accessories: ['Charger', 'Case'],
          warranty_card: { url: 'https://minio.am-pms.local/docs/warranty.pdf' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(true);
    });
  });
});
