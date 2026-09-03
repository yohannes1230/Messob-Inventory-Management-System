import request from 'supertest';
import { jest } from '@jest/globals';
import { app } from '../src/app.js';
import { getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES, REQUEST_CATEGORY, REQUEST_STATUS, REQUEST_EVENT } from '@am-pms/shared-constants';
import {
  BranchModel,
  CategoryModel,
  PropertyTypeModel,
  RequestTypeModel,
} from '../src/modules/masterdata/masterdata.model.js';
import { AssetModel } from '../src/modules/assets/asset.model.js';
import { AssignmentModel } from '../src/modules/assignments/assignment.model.js';
import { RequestModel } from '../src/modules/requests/request.model.js';
import { AuditLogModel } from '../src/modules/audit/audit.model.js';
import * as socketService from '../src/sockets/index.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../src/common/config/env.js';

describe('Employee Self-Service Portal & Request Hub (Phase 4 — FR-ESS-01→08)', () => {
  let employeeAuth: Record<string, string>;
  let employeeUser: any;
  let otherEmployeeAuth: Record<string, string>;
  let otherEmployeeUser: any;
  let propertyOfficerAuth: Record<string, string>;
  let unprivilegedAuth: Record<string, string>;

  let branch: any;
  let category: any;
  let propertyType: any;
  let allocationRequestType: any; // module: 'assignment'
  let maintenanceRequestType: any; // module: 'maintenance'
  let transferRequestType: any; // module: 'transfer'
  let testAsset: any;

  beforeEach(async () => {
    const emp = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
    employeeAuth = { Authorization: emp.Authorization };
    employeeUser = emp.user;

    const emp2 = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
    otherEmployeeAuth = { Authorization: emp2.Authorization };
    otherEmployeeUser = emp2.user;

    const po = await getAuthHeader(SYSTEM_ROLES.PROPERTY_OFFICER);
    propertyOfficerAuth = { Authorization: po.Authorization };

    // User with no request permissions
    const unpriv = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
    const unprivilegedToken = jwt.sign(
      {
        sub: unpriv.user._id.toString(),
        username: unpriv.user.username,
        roles: [],
        permissions: [],
      },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );
    unprivilegedAuth = {
      Authorization: `Bearer ${unprivilegedToken}`,
    };

    branch = await BranchModel.create({
      name: 'Addis Ababa Central Branch',
      nameAm: 'አዲስ አበባ ማዕከላዊ ቅርንጫፍ',
      code: 'AAC',
      isActive: true,
      version: 1,
    });

    category = await CategoryModel.create({
      name: 'IT Hardware',
      nameAm: 'የአይቲ ዕቃዎች',
      code: 'ITH',
      isActive: true,
      version: 1,
    });

    propertyType = await PropertyTypeModel.create({
      name: 'High-End Laptop',
      nameAm: 'ላፕቶፕ',
      category: category._id,
      unitOfMeasure: 'pcs',
      defaultUsefulLifeMonths: 36,
      customFieldDefs: [],
      isActive: true,
      version: 1,
    });

    // Request Types
    allocationRequestType = await RequestTypeModel.create({
      name: 'Hardware Allocation',
      module: 'assignment',
      isActive: true,
      version: 1,
    });

    maintenanceRequestType = await RequestTypeModel.create({
      name: 'Equipment Maintenance',
      module: 'maintenance',
      isActive: true,
      version: 1,
    });

    transferRequestType = await RequestTypeModel.create({
      name: 'Asset Custody Transfer',
      module: 'transfer',
      isActive: true,
      version: 1,
    });

    testAsset = await AssetModel.create({
      assetCode: 'AM-AAC-ITH-2026-00001',
      name: 'ThinkPad T14s Gen 3',
      propertyType: propertyType._id,
      category: category._id,
      status: 'assigned',
      currentCustodian: {
        type: 'employee',
        ref: employeeUser._id,
      },
      currentLocation: {
        branch: branch._id,
      },
      value: 65000,
      currency: 'ETB',
      customFieldValues: {},
      photos: [],
      documents: [],
      qrCode: 'data:image/png;base64,mockqr',
      barcodeFormat: 'CODE128',
      bundleChildren: [],
      isActive: true,
      version: 1,
    });
  });

  describe('1. Derivation & Validation Logic (User Verification Gate)', () => {
    it('REJECTS request with ValidationError (400) when type violates requestType.module mapping (e.g. transfer against maintenance)', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          type: 'transfer',
          requestTypeId: maintenanceRequestType._id.toString(),
          targetAsset: testAsset._id.toString(),
          payload: { reason: 'Mismatched type test' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('cannot be used for');
      expect(res.body.error.message).toContain('transfer');
      expect(res.body.error.message).toContain('maintenance');
    });

    it('REJECTS request with ValidationError (400) when damage_loss is submitted against assignment module', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          type: 'damage_loss',
          requestTypeId: allocationRequestType._id.toString(),
          payload: { issueType: 'damage' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('cannot be used for');
    });

    it('derives type automatically from requestType.module when caller omits type', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          requestTypeId: allocationRequestType._id.toString(),
          targetPropertyType: propertyType._id.toString(),
          payload: {
            justification: 'New workstation needed',
            urgency: 'high',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe(REQUEST_CATEGORY.ASSET_ALLOCATION);
      expect(res.body.data.requestNumber).toMatch(/^REQ-\d{4}-\d{5}$/);
    });

    it('rejects request with invalid or inactive requestTypeId', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          requestTypeId: new mongoose.Types.ObjectId().toString(),
          payload: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid or inactive');
    });
  });

  describe('2. RBAC Dual Assertion & Authorization', () => {
    it('allows authorized employee with request.create.own to create request', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          type: 'asset_allocation',
          requestTypeId: allocationRequestType._id.toString(),
          targetPropertyType: propertyType._id.toString(),
          payload: { justification: 'Standard allocation' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.requestNumber).toBeDefined();
    });

    it('returns 403 Forbidden for unauthorized user lacking request.create.own', async () => {
      // User with no permission token
      const res = await request(app)
        .post('/api/v1/requests')
        .set(unprivilegedAuth)
        .send({
          type: 'asset_allocation',
          requestTypeId: allocationRequestType._id.toString(),
          payload: {},
        });

      expect(res.status).toBe(403);
    });

    it('blocks employee from viewing another employee request (403 Forbidden)', async () => {
      // Create request owned by otherEmployee
      const createRes = await request(app)
        .post('/api/v1/requests')
        .set(otherEmployeeAuth)
        .send({
          requestTypeId: allocationRequestType._id.toString(),
          payload: { justification: 'Private request' },
        });

      const otherRequestId = createRes.body.data._id;

      // Current employee tries to view it
      const viewRes = await request(app)
        .get(`/api/v1/requests/${otherRequestId}`)
        .set(employeeAuth);

      expect(viewRes.status).toBe(403);
      expect(viewRes.body.error.message).toContain('permission');
    });

    it('allows property_officer with request.view.all to view any request', async () => {
      const createRes = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          requestTypeId: allocationRequestType._id.toString(),
          payload: { justification: 'Employee request' },
        });

      const requestId = createRes.body.data._id;

      const viewRes = await request(app)
        .get(`/api/v1/requests/${requestId}`)
        .set(propertyOfficerAuth);

      expect(viewRes.status).toBe(200);
      expect(viewRes.body.data._id).toBe(requestId);
    });
  });

  describe('3. Audit Atomicity & Completeness', () => {
    it('records exact AuditLog entry with before/after state on request creation', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          type: 'asset_allocation',
          requestTypeId: allocationRequestType._id.toString(),
          payload: { justification: 'Audit test allocation' },
        });

      expect(res.status).toBe(201);
      const requestId = res.body.data._id;

      const auditEntry = await AuditLogModel.findOne({
        entityType: 'Request',
        entityId: requestId,
        action: REQUEST_EVENT.CREATED,
      });

      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actor?.toString()).toBe(employeeUser._id.toString());
      expect((auditEntry?.afterValue as any)?.requestNumber).toBe(res.body.data.requestNumber);
    });

    it('records exact AuditLog entry on cancellation with reason', async () => {
      const createRes = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          requestTypeId: allocationRequestType._id.toString(),
          payload: { justification: 'To be cancelled' },
        });

      const requestId = createRes.body.data._id;

      const cancelRes = await request(app)
        .post(`/api/v1/requests/${requestId}/cancel`)
        .set(employeeAuth)
        .send({ reason: 'No longer required by project' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(REQUEST_STATUS.CANCELLED);

      const auditEntry = await AuditLogModel.findOne({
        entityType: 'Request',
        entityId: requestId,
        action: REQUEST_EVENT.CANCELLED,
      });

      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actor?.toString()).toBe(employeeUser._id.toString());
      expect((auditEntry?.afterValue as any)?.status).toBe(REQUEST_STATUS.CANCELLED);
    });

  });

  describe('4. FR-ESS Requirement Traceability Verification (FR-ESS-01→08)', () => {
    // FR-ESS-01: Submit a request for a new asset (property type + justification)
    it('[FR-ESS-01] submits request for a new asset with property type and justification', async () => {
      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          type: 'asset_allocation',
          requestTypeId: allocationRequestType._id.toString(),
          targetPropertyType: propertyType._id.toString(),
          payload: {
            justification: 'Required for new data analysis duties',
            urgency: 'high',
            requestedSpecifications: '16GB RAM, 512GB SSD',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe(REQUEST_CATEGORY.ASSET_ALLOCATION);
      expect(res.body.data.requestNumber).toMatch(/^REQ-\d{4}-\d{5}$/);
      expect(res.body.data.status).toBe(REQUEST_STATUS.SUBMITTED);
      expect(res.body.data.workflowInstance).toBeNull(); // Phase 5 ready
    });

    // FR-ESS-02: View all assets currently assigned, with photos/specs/date
    it('[FR-ESS-02] views all assets currently assigned with specs, code, and status', async () => {
      const res = await request(app)
        .get('/api/v1/assets')
        .set(employeeAuth);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      const myAsset = res.body.data.items.find(
        (a: any) => a._id.toString() === testAsset._id.toString(),
      );
      expect(myAsset).toBeDefined();
      expect(myAsset.assetCode).toBe(testAsset.assetCode);
    });

    // FR-ESS-03: Digitally accept (acknowledge receipt of) an assigned asset
    it('[FR-ESS-03] digitally accepts (acknowledges receipt of) an assigned asset', async () => {
      const asg = await AssignmentModel.create({
        asset: testAsset._id,
        custodian: {
          type: 'employee',
          ref: employeeUser._id,
        },
        assignedDate: new Date(),
        status: 'pending_acceptance',
        notes: 'Handover awaiting acceptance',
        createdBy: employeeUser._id,
        updatedBy: employeeUser._id,
        version: 1,
      });

      const acceptRes = await request(app)
        .post(`/api/v1/assignments/${asg._id}/accept`)
        .set(employeeAuth)
        .send({ notes: 'Verified and received in good condition' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.acceptedDate).toBeDefined();
      expect(acceptRes.body.data.status).toBe('active');
    });

    // FR-ESS-04: Submit a return request, with reason and condition notes
    it('[FR-ESS-04] submits a return request with reason and condition notes', async () => {
      const res = await request(app)
        .post(`/api/v1/assets/${testAsset._id}/request-return`)
        .set(employeeAuth)
        .send({
          reason: 'Upgrading to desktop workstation',
          conditionNotes: 'Excellent working order, no scratches',
          proposedReturnDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe(REQUEST_CATEGORY.RETURN);
      expect(res.body.data.targetAsset.toString()).toBe(testAsset._id.toString());
      expect(res.body.data.status).toBe(REQUEST_STATUS.SUBMITTED);
      expect(res.body.data.requestNumber).toMatch(/^REQ-\d{4}-\d{5}$/);

      // Verify audit trail
      const audit = await AuditLogModel.findOne({
        entityType: 'Request',
        entityId: res.body.data._id,
        action: REQUEST_EVENT.RETURN_REQUESTED,
      });
      expect(audit).toBeDefined();
    });

    // FR-ESS-05: Report damage or loss, optionally with photos
    it('[FR-ESS-05] reports damage or loss creating a canonical Request with severity and photo', async () => {
      const res = await request(app)
        .post(`/api/v1/assets/${testAsset._id}/report-issue`)
        .set(employeeAuth)
        .send({
          issueType: 'damage',
          severity: 'moderate',
          description: 'Screen display flickers and lines appear on boot',
          photos: ['http://localhost:9000/am-pms-dev/screen-damage.jpg'],
          incidentDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe(REQUEST_CATEGORY.DAMAGE_LOSS);
      expect(res.body.data.targetAsset.toString()).toBe(testAsset._id.toString());
      expect(res.body.data.payload.issueType).toBe('damage');
      expect(res.body.data.payload.photos).toHaveLength(1);
      expect(res.body.data.status).toBe(REQUEST_STATUS.SUBMITTED);

      // Verify audit trail
      const audit = await AuditLogModel.findOne({
        entityType: 'Request',
        entityId: res.body.data._id,
        action: REQUEST_EVENT.ISSUE_REPORTED,
      });
      expect(audit).toBeDefined();
    });

    // FR-ESS-06: View complete history of assets held, including past assignments
    it('[FR-ESS-06] views complete history and chronological custody timeline of assets held', async () => {
      const res = await request(app)
        .get(`/api/v1/assets/${testAsset._id}/history`)
        .set(employeeAuth);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.timeline)).toBe(true);
    });

    // FR-ESS-07: In-app (and optionally email/SMS) notification of status changes
    it('[FR-ESS-07] dispatches in-app notification and real-time event on status changes', async () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      socketService.setSocketServer({ to: mockTo } as any);

      const res = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          type: 'asset_allocation',
          requestTypeId: allocationRequestType._id.toString(),
          targetPropertyType: propertyType._id.toString(),
          payload: { justification: 'Notification test' },
        });

      expect(res.status).toBe(201);
      expect(mockTo).toHaveBeenCalledWith(`user:${employeeUser._id.toString()}`);
      expect(mockEmit).toHaveBeenCalledWith(
        'request:status_changed',
        expect.objectContaining({
          requestId: res.body.data._id,
          requestNumber: res.body.data.requestNumber,
          type: REQUEST_CATEGORY.ASSET_ALLOCATION,
          status: REQUEST_STATUS.SUBMITTED,
        }),
      );

      socketService.setSocketServer(null);
    });

    // FR-ESS-08: Personal dashboard summarizing active assets, pending requests, and open maintenance issues
    it('[FR-ESS-08] personal dashboard summarizes active assets, pending requests, and open maintenance issues', async () => {
      const res = await request(app)
        .get('/api/v1/requests/dashboard')
        .set(employeeAuth);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.activeAssetsCount).toBe('number');
      expect(typeof res.body.data.pendingAcceptanceCount).toBe('number');
      expect(typeof res.body.data.activeRequestsCount).toBe('number');
      expect(typeof res.body.data.openMaintenanceCount).toBe('number');
      expect(Array.isArray(res.body.data.recentRequests)).toBe(true);
    });

    // Supporting portal request lifecycle tests
    it('lists own submitted requests with pagination and status filters (portal request tracking)', async () => {
      await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          requestTypeId: allocationRequestType._id.toString(),
          payload: { justification: 'Req 1' },
        });

      await request(app)
        .post(`/api/v1/assets/${testAsset._id}/report-issue`)
        .set(employeeAuth)
        .send({
          issueType: 'malfunction',
          description: 'Req 2 malfunction report',
        });

      const res = await request(app)
        .get('/api/v1/requests/mine')
        .set(employeeAuth);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
      const types = res.body.data.items.map((i: any) => i.type);
      expect(types).toContain(REQUEST_CATEGORY.DAMAGE_LOSS);
      expect(types).toContain(REQUEST_CATEGORY.ASSET_ALLOCATION);
    });

    it('cancels own submitted request and rejects cancellation by another employee (request cancellation lifecycle)', async () => {
      const createRes = await request(app)
        .post('/api/v1/requests')
        .set(employeeAuth)
        .send({
          requestTypeId: allocationRequestType._id.toString(),
          payload: { justification: 'Cancel test' },
        });

      const reqId = createRes.body.data._id;

      // Another employee attempts to cancel -> 403 Forbidden
      const unauthorizedCancel = await request(app)
        .post(`/api/v1/requests/${reqId}/cancel`)
        .set(otherEmployeeAuth)
        .send({ reason: 'Malicious cancel' });

      expect(unauthorizedCancel.status).toBe(403);
      expect(unauthorizedCancel.body.error.message).toContain('only cancel your own');

      // Owner cancels -> 200 OK
      const ownerCancel = await request(app)
        .post(`/api/v1/requests/${reqId}/cancel`)
        .set(employeeAuth)
        .send({ reason: 'Duplicate submission' });

      expect(ownerCancel.status).toBe(200);
      expect(ownerCancel.body.data.status).toBe(REQUEST_STATUS.CANCELLED);

      // Attempting to cancel again -> 400 Bad Request
      const secondCancel = await request(app)
        .post(`/api/v1/requests/${reqId}/cancel`)
        .set(employeeAuth)
        .send({ reason: 'Already cancelled' });

      expect(secondCancel.status).toBe(400);
      expect(secondCancel.body.error.message).toContain('Cannot cancel request in');
    });

  });
});
