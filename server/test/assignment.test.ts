import request from 'supertest';
import { app } from '../src/app.js';
import { getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES } from '@am-pms/shared-constants';
import {
  BranchModel,
  CategoryModel,
  PropertyTypeModel,
} from '../src/modules/masterdata/masterdata.model.js';
import { AssetModel } from '../src/modules/assets/asset.model.js';
import { AssignmentModel } from '../src/modules/assignments/assignment.model.js';
import { AuditLogModel } from '../src/modules/audit/audit.model.js';
import mongoose from 'mongoose';

describe('Assignment, Transfer & Return Subsystem (Phase 3)', () => {
  let propertyOfficerAuth: Record<string, string>;
  let storeKeeperAuth: Record<string, string>;
  let employeeAuth: Record<string, string>;
  let employeeUser: any;

  let branch: any;
  let category: any;
  let propertyType: any;

  beforeEach(async () => {
    const po = await getAuthHeader(SYSTEM_ROLES.PROPERTY_OFFICER);
    propertyOfficerAuth = { Authorization: po.Authorization };

    const sk = await getAuthHeader(SYSTEM_ROLES.STORE_KEEPER);
    storeKeeperAuth = { Authorization: sk.Authorization };

    const emp = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
    employeeAuth = { Authorization: emp.Authorization };
    employeeUser = emp.user;

    branch = await BranchModel.create({
      name: 'Addis Ababa Branch',
      nameAm: 'አዲስ አበባ ቅርንጫፍ',
      code: 'AA',
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
  });

  describe('Assignment Creation (FR-ASG-01 & Bundle Cascading FR-ASG-05)', () => {
    it('allows property_officer (assignment.create) to assign asset to employee, cascading to bundle children', async () => {
      // 1. Create parent laptop and child monitor
      const parentAsset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00100',
        name: 'Executive Laptop',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'available',
        isBundleParent: true,
        isActive: true,
        version: 1,
      });

      const childAsset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00101',
        name: 'Executive Monitor',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'available',
        bundleParent: parentAsset._id,
        isActive: true,
        version: 1,
      });

      parentAsset.bundleChildren = [childAsset._id];
      await parentAsset.save();

      const payload = {
        asset: parentAsset._id.toString(),
        custodian: {
          type: 'employee',
          ref: employeeUser._id.toString(),
        },
        conditionAtAssignment: 'Brand New',
        notes: 'Assigned for development work',
        includeBundleChildren: true,
      };

      const res = await request(app)
        .post('/api/v1/assignments')
        .set(propertyOfficerAuth)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending_acceptance');

      // Verify parent asset status updated to assigned
      const updatedParent = await AssetModel.findById(parentAsset._id);
      expect(updatedParent?.status).toBe('assigned');
      expect(updatedParent?.currentCustodian?.ref.toString()).toBe(employeeUser._id.toString());

      // Verify child asset cascaded to assigned
      const updatedChild = await AssetModel.findById(childAsset._id);
      expect(updatedChild?.status).toBe('assigned');
      expect(updatedChild?.currentCustodian?.ref.toString()).toBe(employeeUser._id.toString());

      // Verify child assignment record created
      const childAsg = await AssignmentModel.findOne({
        asset: childAsset._id,
        parentAssignmentRef: res.body.data._id,
      });
      expect(childAsg).not.toBeNull();
    });

    it('allows store_keeper (asset.dispatch) to dispatch an asset', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00102',
        name: 'Dispatched Tablet',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'available',
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .post('/api/v1/assignments')
        .set(storeKeeperAuth)
        .send({
          asset: asset._id.toString(),
          custodian: { type: 'employee', ref: employeeUser._id.toString() },
          conditionAtAssignment: 'Good',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('denies standard employee from creating assignments (RBAC dual-assertion: 403)', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00103',
        name: 'Unauthorized Assign Asset',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'available',
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .post('/api/v1/assignments')
        .set(employeeAuth)
        .send({
          asset: asset._id.toString(),
          custodian: { type: 'employee', ref: employeeUser._id.toString() },
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Assignment Acceptance (FR-ASG-02)', () => {
    it('allows employee (assignment.accept) to accept their pending assignment', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00104',
        name: 'Laptop to Accept',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'assigned',
        currentCustodian: { type: 'employee', ref: employeeUser._id },
        isActive: true,
        version: 1,
      });

      const assignment = await AssignmentModel.create({
        asset: asset._id,
        custodian: { type: 'employee', ref: employeeUser._id },
        status: 'pending_acceptance',
        assignedDate: new Date(),
        conditionAtAssignment: 'Good',
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .post(`/api/v1/assignments/${assignment._id}/accept`)
        .set(employeeAuth)
        .send({ notes: 'Accepted in good working condition' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.acceptedDate).toBeDefined();

      // Verify audit trail
      const audit = await AuditLogModel.findOne({
        entityType: 'Assignment',
        entityId: assignment._id,
        action: 'assignment.accepted',
      });
      expect(audit).not.toBeNull();
    });
  });

  describe('Return and Transfer Workflow (FR-ASG-03, FR-ASG-04)', () => {
    it('returns an assigned asset to stock, clearing custodian and resetting status to available', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00105',
        name: 'Returnable Laptop',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'assigned',
        currentCustodian: { type: 'employee', ref: employeeUser._id },
        isActive: true,
        version: 1,
      });

      const assignment = await AssignmentModel.create({
        asset: asset._id,
        custodian: { type: 'employee', ref: employeeUser._id },
        status: 'active',
        assignedDate: new Date(),
        acceptedDate: new Date(),
        conditionAtAssignment: 'Good',
        isActive: true,
        version: 1,
      });

      // Store keeper processes return
      const res = await request(app)
        .post(`/api/v1/assignments/${assignment._id}/return`)
        .set(storeKeeperAuth)
        .send({
          conditionAtReturn: 'Good condition, no damage',
          notes: 'Returned upon project completion',
          targetStatus: 'available',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('returned');

      // Verify asset status reverted
      const updatedAsset = await AssetModel.findById(asset._id);
      expect(updatedAsset?.status).toBe('available');
      expect(updatedAsset?.currentCustodian).toBeUndefined();
    });

    it('transfers an assignment to a new custodian and creates a new assignment', async () => {
      const newTargetEmployee = new mongoose.Types.ObjectId();

      const asset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00106',
        name: 'Transferable Laptop',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'assigned',
        currentCustodian: { type: 'employee', ref: employeeUser._id },
        isActive: true,
        version: 1,
      });

      const assignment = await AssignmentModel.create({
        asset: asset._id,
        custodian: { type: 'employee', ref: employeeUser._id },
        status: 'active',
        assignedDate: new Date(),
        conditionAtAssignment: 'Good',
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .post(`/api/v1/assignments/${assignment._id}/transfer`)
        .set(propertyOfficerAuth)
        .send({
          targetCustodian: { type: 'employee', ref: newTargetEmployee.toString() },
          transferReason: 'Department reorganization',
          conditionAtTransfer: 'Good',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.oldAssignment.status).toBe('transferred');
      expect(res.body.data.newAssignment.status).toBe('pending_acceptance');
      expect(res.body.data.newAssignment.custodian.ref.toString()).toBe(newTargetEmployee.toString());

      // Verify asset current custodian is updated
      const updatedAsset = await AssetModel.findById(asset._id);
      expect(updatedAsset?.currentCustodian?.ref.toString()).toBe(newTargetEmployee.toString());
    });
  });

  describe('Chronological Custody Timeline History (FR-ASG-06)', () => {
    it('returns full chronological timeline of registration, assignment, acceptance, and return on GET /assets/:id/history', async () => {
      const asset = await AssetModel.create({
        assetCode: 'AM-AA-ITE-2026-00107',
        name: 'Lifecycle History Laptop',
        propertyType: propertyType._id,
        category: category._id,
        currentLocation: { branch: branch._id },
        status: 'available',
        isActive: true,
        version: 1,
      });

      // Assignment 1: assigned then returned
      await AssignmentModel.create({
        asset: asset._id,
        custodian: { type: 'employee', ref: employeeUser._id },
        status: 'returned',
        assignedDate: new Date(Date.now() - 86400000 * 5),
        acceptedDate: new Date(Date.now() - 86400000 * 4),
        returnedDate: new Date(Date.now() - 86400000 * 1),
        conditionAtAssignment: 'Good',
        conditionAtReturn: 'Good',
        isActive: true,
        version: 2,
      });

      const res = await request(app)
        .get(`/api/v1/assets/${asset._id}/history`)
        .set(propertyOfficerAuth);

      expect(res.status).toBe(200);
      expect(res.body.data.assetCode).toBe('AM-AA-ITE-2026-00107');
      expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(3);

      const actions = res.body.data.timeline.map((t: any) => t.action);
      expect(actions).toContain('registered');
      expect(actions).toContain('assigned');
      expect(actions).toContain('accepted');
      expect(actions).toContain('returned');
    });
  });
});
