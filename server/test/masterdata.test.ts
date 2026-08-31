import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { createTestUser, getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES } from '@am-pms/shared-constants';
import {
  BranchModel,
  BuildingModel,
  FloorModel,
  RoomModel,
  DepartmentModel,
  CategoryModel,
  PropertyTypeModel,
  StatusFlowModel,
  RequestTypeModel,
  MasterDataHistoryModel,
} from '../src/modules/masterdata/masterdata.model.js';
import { AuditLogModel } from '../src/modules/audit/audit.model.js';

describe('Master Data Module Tests (FR-MD-01 → FR-MD-06)', () => {
  let superAdminAuth: { Authorization: string; user: any };
  let ictAdminAuth: { Authorization: string; user: any };
  let employeeAuth: { Authorization: string; user: any };
  let auditorAuth: { Authorization: string; user: any };

  let branchA: any;
  let branchB: any;

  let officerBranchAAuth: { Authorization: string; user: any };
  let officerBranchBAuth: { Authorization: string; user: any };

  beforeEach(async () => {
    superAdminAuth = await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN);
    ictAdminAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
    employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
    auditorAuth = await getAuthHeader(SYSTEM_ROLES.AUDITOR);

    // Create two separate branches for branch-scope isolation tests
    branchA = await BranchModel.create({
      name: 'Addis Ababa Main Branch',
      nameAm: 'አዲስ አበባ ዋና ቅርንጫፍ',
      code: 'AA-MAIN',
      address: 'Bole Road',
      isActive: true,
      version: 1,
    });

    branchB = await BranchModel.create({
      name: 'Hawassa Regional Branch',
      nameAm: 'ሀዋሳ ቅርንጫፍ',
      code: 'HW-REG',
      address: 'Piazza',
      isActive: true,
      version: 1,
    });

    // Create Property Officers explicitly scoped to their respective branches
    officerBranchAAuth = await getAuthHeader(SYSTEM_ROLES.PROPERTY_OFFICER, {
      username: 'po_addis',
      roles: [
        {
          role: (await mongoose.model('Role').findOne({ name: SYSTEM_ROLES.PROPERTY_OFFICER }))!._id,
          scopeType: 'branch',
          scopeRef: branchA._id,
        },
      ],
    });

    officerBranchBAuth = await getAuthHeader(SYSTEM_ROLES.PROPERTY_OFFICER, {
      username: 'po_hawassa',
      roles: [
        {
          role: (await mongoose.model('Role').findOne({ name: SYSTEM_ROLES.PROPERTY_OFFICER }))!._id,
          scopeType: 'branch',
          scopeRef: branchB._id,
        },
      ],
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Branch Management (Global, ict_admin/super_admin only)
  // ══════════════════════════════════════════════════════════════════════════
  describe('Branch CRUD & RBAC', () => {
    it('should allow authorized ict_admin to create branch and deny employee (403)', async () => {
      const payload = {
        name: 'Dire Dawa Branch',
        nameAm: 'ድሬ ዳዋ ቅርንጫፍ',
        code: 'DD-BRN',
        address: 'Station Road',
      };

      // Unauthorized (employee -> 403)
      const unauth = await request(app)
        .post('/api/v1/branches')
        .set('Authorization', employeeAuth.Authorization)
        .send(payload);
      expect(unauth.status).toBe(403);

      // Authorized (ict_admin -> 201)
      const auth = await request(app)
        .post('/api/v1/branches')
        .set('Authorization', ictAdminAuth.Authorization)
        .send(payload);
      expect(auth.status).toBe(201);
      expect(auth.body.data.name).toBe('Dire Dawa Branch');
      expect(auth.body.data.version).toBe(1);
    });

    it('should list branches for auditor and employee', async () => {
      const res = await request(app)
        .get('/api/v1/branches')
        .set('Authorization', auditorAuth.Authorization);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Firm Requirement: Branch-Scope Dual-Assertion Tests for All 4 Entities
  //    (Building, Floor, Room, Department)
  // ══════════════════════════════════════════════════════════════════════════
  describe('Branch Scope Dual-Assertion Tests (Building, Floor, Room, Department)', () => {
    // ── Entity 1: Building (direct branch resolution) ──
    describe('Building Branch Scope', () => {
      it('property_officer succeeds in own branch, gets 403 SCOPE_MISMATCH in other branch', async () => {
        // Own branch create -> 201
        const ownRes = await request(app)
          .post('/api/v1/buildings')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: 'Headquarters Building A',
            nameAm: 'ዋና ሕንፃ ኤ',
            branch: branchA._id.toString(),
            floorsCount: 5,
          });
        expect(ownRes.status).toBe(201);
        const buildingA = ownRes.body.data;

        // Cross-branch create attempt -> 403 SCOPE_MISMATCH
        const crossRes = await request(app)
          .post('/api/v1/buildings')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: 'Cross Branch Building',
            branch: branchB._id.toString(),
            floorsCount: 3,
          });
        expect(crossRes.status).toBe(403);
        expect(crossRes.body.error.code).toBe('SCOPE_MISMATCH');

        // Own branch update -> 200
        const updateOwn = await request(app)
          .patch(`/api/v1/buildings/${buildingA._id}`)
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({ name: 'Headquarters Building A - Renovated' });
        expect(updateOwn.status).toBe(200);

        // Officer B (Hawassa) attempts to update Building in Branch A -> 403 SCOPE_MISMATCH
        const updateCross = await request(app)
          .patch(`/api/v1/buildings/${buildingA._id}`)
          .set('Authorization', officerBranchBAuth.Authorization)
          .send({ name: 'Malicious Rename' });
        expect(updateCross.status).toBe(403);
        expect(updateCross.body.error.code).toBe('SCOPE_MISMATCH');
      });
    });

    // ── Entity 2: Floor (1-level indirect resolution: Floor -> Building -> Branch) ──
    describe('Floor Branch Scope', () => {
      let buildingA: any;
      let buildingB: any;

      beforeEach(async () => {
        buildingA = await BuildingModel.create({
          name: 'HQ Block 1',
          branch: branchA._id,
          floorsCount: 4,
          isActive: true,
          version: 1,
        });

        buildingB = await BuildingModel.create({
          name: 'Hawassa Block 1',
          branch: branchB._id,
          floorsCount: 3,
          isActive: true,
          version: 1,
        });
      });

      it('property_officer succeeds in own branch, gets 403 SCOPE_MISMATCH in other branch', async () => {
        // Own branch floor create -> 201 (resolves via buildingA.branch)
        const ownRes = await request(app)
          .post('/api/v1/floors')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: '1st Floor',
            building: buildingA._id.toString(),
            order: 1,
          });
        expect(ownRes.status).toBe(201);
        const floorA = ownRes.body.data;

        // Cross branch floor create attempt -> 403 SCOPE_MISMATCH (buildingB is in Branch B)
        const crossRes = await request(app)
          .post('/api/v1/floors')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: 'Illegal Floor',
            building: buildingB._id.toString(),
            order: 2,
          });
        expect(crossRes.status).toBe(403);
        expect(crossRes.body.error.code).toBe('SCOPE_MISMATCH');

        // Own branch floor update -> 200
        const updateOwn = await request(app)
          .patch(`/api/v1/floors/${floorA._id}`)
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({ name: '1st Floor Executive' });
        expect(updateOwn.status).toBe(200);

        // Cross branch floor update attempt by Officer B -> 403 SCOPE_MISMATCH
        const updateCross = await request(app)
          .patch(`/api/v1/floors/${floorA._id}`)
          .set('Authorization', officerBranchBAuth.Authorization)
          .send({ name: 'Unauthorized Floor Edit' });
        expect(updateCross.status).toBe(403);
        expect(updateCross.body.error.code).toBe('SCOPE_MISMATCH');
      });
    });

    // ── Entity 3: Room (2-level indirect resolution: Room -> Floor -> Building -> Branch) ──
    describe('Room Branch Scope', () => {
      let buildingA: any;
      let buildingB: any;
      let floorA: any;
      let floorB: any;

      beforeEach(async () => {
        buildingA = await BuildingModel.create({
          name: 'Main HQ',
          branch: branchA._id,
          floorsCount: 3,
          isActive: true,
          version: 1,
        });

        buildingB = await BuildingModel.create({
          name: 'Hawassa HQ',
          branch: branchB._id,
          floorsCount: 3,
          isActive: true,
          version: 1,
        });

        floorA = await FloorModel.create({
          name: 'Ground Floor A',
          building: buildingA._id,
          order: 0,
          isActive: true,
          version: 1,
        });

        floorB = await FloorModel.create({
          name: 'Ground Floor B',
          building: buildingB._id,
          order: 0,
          isActive: true,
          version: 1,
        });
      });

      it('property_officer succeeds in own branch, gets 403 SCOPE_MISMATCH in other branch', async () => {
        // Own branch room create -> 201 (resolves floorA -> buildingA -> branchA)
        const ownRes = await request(app)
          .post('/api/v1/rooms')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: 'Conference Room 101',
            nameAm: 'ስብሰባ አዳራሽ 101',
            floor: floorA._id.toString(),
            building: buildingA._id.toString(),
            branch: branchA._id.toString(),
            capacity: 20,
          });
        expect(ownRes.status).toBe(201);
        const roomA = ownRes.body.data;

        // Cross branch room create attempt -> 403 SCOPE_MISMATCH (floorB is in Branch B)
        const crossRes = await request(app)
          .post('/api/v1/rooms')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: 'Illegal Room',
            floor: floorB._id.toString(),
            building: buildingB._id.toString(),
            branch: branchB._id.toString(),
          });
        expect(crossRes.status).toBe(403);
        expect(crossRes.body.error.code).toBe('SCOPE_MISMATCH');

        // Own branch room update -> 200
        const updateOwn = await request(app)
          .patch(`/api/v1/rooms/${roomA._id}`)
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({ capacity: 35 });
        expect(updateOwn.status).toBe(200);
        expect(updateOwn.body.data.capacity).toBe(35);

        // Cross branch room update attempt by Officer B -> 403 SCOPE_MISMATCH
        const updateCross = await request(app)
          .patch(`/api/v1/rooms/${roomA._id}`)
          .set('Authorization', officerBranchBAuth.Authorization)
          .send({ capacity: 5 });
        expect(updateCross.status).toBe(403);
        expect(updateCross.body.error.code).toBe('SCOPE_MISMATCH');
      });
    });

    // ── Entity 4: Department (direct branch resolution) ──
    describe('Department Branch Scope', () => {
      it('property_officer succeeds in own branch, gets 403 SCOPE_MISMATCH in other branch', async () => {
        // Own branch department create -> 201
        const ownRes = await request(app)
          .post('/api/v1/departments')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: 'ICT Department Addis',
            nameAm: 'የአይሲቲ መምሪያ አዲስ',
            code: 'ICT-AA',
            branch: branchA._id.toString(),
          });
        expect(ownRes.status).toBe(201);
        const deptA = ownRes.body.data;

        // Cross branch department create attempt -> 403 SCOPE_MISMATCH
        const crossRes = await request(app)
          .post('/api/v1/departments')
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({
            name: 'ICT Department Hawassa',
            nameAm: 'የአይሲቲ መምሪያ ሀዋሳ',
            code: 'ICT-HW',
            branch: branchB._id.toString(),
          });
        expect(crossRes.status).toBe(403);
        expect(crossRes.body.error.code).toBe('SCOPE_MISMATCH');

        // Own branch department update -> 200
        const updateOwn = await request(app)
          .patch(`/api/v1/departments/${deptA._id}`)
          .set('Authorization', officerBranchAAuth.Authorization)
          .send({ name: 'ICT & Innovation Department Addis' });
        expect(updateOwn.status).toBe(200);

        // Cross branch department update attempt by Officer B -> 403 SCOPE_MISMATCH
        const updateCross = await request(app)
          .patch(`/api/v1/departments/${deptA._id}`)
          .set('Authorization', officerBranchBAuth.Authorization)
          .send({ name: 'Hostile Dept Takeover' });
        expect(updateCross.status).toBe(403);
        expect(updateCross.body.error.code).toBe('SCOPE_MISMATCH');
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Category & PropertyType (Hierarchical Parent-Child Support & Global RBAC)
  // ══════════════════════════════════════════════════════════════════════════
  describe('Category & PropertyType (FR-MD-02)', () => {
    it('should create hierarchical Category (parent-child) and PropertyType', async () => {
      // Create root parent category
      const parentCatRes = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          name: 'Electronic Equipment',
          nameAm: 'የኤሌክትሮኒክስ እቃዎች',
          description: 'Parent category for all electronics',
        });
      expect(parentCatRes.status).toBe(201);
      const parentCat = parentCatRes.body.data;

      // Create child category referencing parent
      const childCatRes = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          name: 'Computing Devices',
          nameAm: 'የኮምፒውተር እቃዎች',
          parentCategory: parentCat._id,
        });
      expect(childCatRes.status).toBe(201);
      const childCat = childCatRes.body.data;
      expect(childCat.parentCategory).toBe(parentCat._id);

      // Create PropertyType linked to child category
      const propTypeRes = await request(app)
        .post('/api/v1/property-types')
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          name: 'Laptop Computer',
          nameAm: 'ላፕቶፕ ኮምፒውተር',
          category: childCat._id,
          unitOfMeasure: 'piece',
          defaultUsefulLifeMonths: 36,
        });
      expect(propTypeRes.status).toBe(201);
      expect(propTypeRes.body.data.defaultUsefulLifeMonths).toBe(36);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. StatusFlow & RequestType (FR-MD-03, FR-MD-04)
  // ══════════════════════════════════════════════════════════════════════════
  describe('StatusFlow & RequestType (FR-MD-03, FR-MD-04)', () => {
    it('should configure StatusFlow and RequestType with nullable workflowDefinition', async () => {
      // Create StatusFlow
      const flowRes = await request(app)
        .post('/api/v1/status-flows')
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          name: 'Asset Standard Lifecycle',
          states: [
            { key: 'available', label: 'Available', colorToken: 'status-available' },
            { key: 'assigned', label: 'Assigned', colorToken: 'status-active' },
            { key: 'maintenance', label: 'Maintenance', colorToken: 'status-warning' },
          ],
          transitions: [
            { from: 'available', to: 'assigned', allowedRoles: ['property_officer'] },
            { from: 'assigned', to: 'maintenance', allowedRoles: ['property_officer', 'employee'] },
          ],
        });
      expect(flowRes.status).toBe(201);
      expect(flowRes.body.data.states.length).toBe(3);

      // Create RequestType without workflowDefinition (nullable ref for Phase 5)
      const reqTypeRes = await request(app)
        .post('/api/v1/request-types')
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          name: 'New Asset Allocation',
          module: 'assignment',
          workflowDefinition: null,
        });
      expect(reqTypeRes.status).toBe(201);
      expect(reqTypeRes.body.data.module).toBe('assignment');
      expect(reqTypeRes.body.data.workflowDefinition).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. FR-MD-05: Soft-Delete Only Enforcement
  // ══════════════════════════════════════════════════════════════════════════
  describe('FR-MD-05: Soft-Delete Only Enforcement', () => {
    it('blocks hard delete (405) and sets isActive: false on deactivate', async () => {
      const cat = await CategoryModel.create({
        name: 'Temporary Furniture',
        nameAm: 'ጊዜያዊ ፈርኒቸር',
        isActive: true,
        version: 1,
      });

      // Attempt hard DELETE -> 405 Method Not Allowed
      const delRes = await request(app)
        .delete(`/api/v1/categories/${cat._id}`)
        .set('Authorization', superAdminAuth.Authorization);
      expect(delRes.status).toBe(405);

      // Record must still exist and remain active
      const stillThere = await CategoryModel.findById(cat._id);
      expect(stillThere).not.toBeNull();
      expect(stillThere?.isActive).toBe(true);

      // Call deactivate endpoint -> 200 OK
      const deactRes = await request(app)
        .post(`/api/v1/categories/${cat._id}/deactivate`)
        .set('Authorization', ictAdminAuth.Authorization);
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);

      // Verify in database
      const deactivated = await CategoryModel.findById(cat._id);
      expect(deactivated?.isActive).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. FR-MD-06: Unified Version & Change History
  // ══════════════════════════════════════════════════════════════════════════
  describe('FR-MD-06: Unified Version & Change History', () => {
    it('tracks version increments and records field-level diffs retrievable via history endpoint', async () => {
      // Step 1: Create
      const createRes = await request(app)
        .post('/api/v1/branches')
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          name: 'Bahir Dar Branch',
          nameAm: 'ባህር ዳር ቅርንጫፍ',
          code: 'BD-BRN',
          address: 'Lake Tana Blvd',
        });
      expect(createRes.status).toBe(201);
      const branchId = createRes.body.data._id;
      expect(createRes.body.data.version).toBe(1);

      // Step 2: Edit
      const updateRes = await request(app)
        .patch(`/api/v1/branches/${branchId}`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({
          address: 'Lake Tana Blvd, Building 4',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.version).toBe(2);

      // Step 3: Deactivate
      const deactRes = await request(app)
        .post(`/api/v1/branches/${branchId}/deactivate`)
        .set('Authorization', ictAdminAuth.Authorization);
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.version).toBe(3);

      // Step 4: Query history endpoint (auditor & property_officer can view history)
      const histRes = await request(app)
        .get(`/api/v1/branches/${branchId}/history`)
        .set('Authorization', auditorAuth.Authorization);

      expect(histRes.status).toBe(200);
      const history = histRes.body.data;
      expect(history.length).toBe(3);

      // Verify versions descending: 3 (deactivate) -> 2 (update) -> 1 (create)
      expect(history[0].version).toBe(3);
      expect(history[0].action).toBe('deactivate');

      expect(history[1].version).toBe(2);
      expect(history[1].action).toBe('update');
      expect(history[1].diff.address).toEqual({
        before: 'Lake Tana Blvd',
        after: 'Lake Tana Blvd, Building 4',
      });

      expect(history[2].version).toBe(1);
      expect(history[2].action).toBe('create');

      // Verify corresponding AuditLog entries exist
      const auditCount = await AuditLogModel.countDocuments({
        entityType: 'Branch',
        entityId: branchId,
      });
      expect(auditCount).toBe(3);
    });
  });
});
