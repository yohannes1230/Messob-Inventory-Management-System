import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { MasterDataConsole } from '../src/modules/masterdata/MasterDataConsole.js';
import { DynamicForm, type FormFieldDef } from '../src/design-system/DynamicForm.js';
import { DataTable, type Column } from '../src/design-system/DataTable.js';
import { MasterDataHistoryModal } from '../src/modules/masterdata/MasterDataHistoryModal.js';

describe('Axe-Core Automated Accessibility Scans (Design Doc §13)', () => {
  // Helper to run axe scan and filter critical/serious violations
  const runAxeScan = async (container: HTMLElement) => {
    const results = await axe.run(container, {
      rules: {
        // Color-contrast check in JSDOM often has limitations due to lack of real layout rendering
        'color-contrast': { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
    const seriousViolations = results.violations.filter((v) => v.impact === 'serious');
    return {
      allViolations: results.violations,
      criticalViolations,
      seriousViolations,
      criticalCount: criticalViolations.length,
      seriousCount: seriousViolations.length,
    };
  };

  it('scans DataTable for accessibility violations', async () => {
    const columns: Column[] = [
      { key: 'code', header: 'Code', headerAm: 'ኮድ' },
      { key: 'name', header: 'Name', headerAm: 'ስም' },
    ];
    const data = [
      { _id: '1', code: 'AA-01', name: 'Addis Branch' },
      { _id: '2', code: 'HW-02', name: 'Hawassa Branch' },
    ];

    const { container } = render(
      <DataTable
        columns={columns}
        data={data}
        onEdit={() => {}}
        onDeactivate={() => {}}
        onViewHistory={() => {}}
      />,
    );

    const scan = await runAxeScan(container);
    console.log('DataTable Violations:', scan.allViolations.map((v) => ({ id: v.id, impact: v.impact, description: v.description })));
    expect(scan.criticalCount).toBe(0);
  });

  it('scans DynamicForm with full suite of custom field data types', async () => {
    const fields: FormFieldDef[] = [
      { name: 'serial', label: 'Serial Number', labelAm: 'መለያ ቁጥር', dataType: 'text', isRequired: true },
      { name: 'storage', label: 'Storage (GB)', labelAm: 'የማከማቻ መጠን', dataType: 'number', isRequired: true },
      { name: 'purchaseDate', label: 'Purchase Date', labelAm: 'የተገዛበት ቀን', dataType: 'date' },
      { name: 'isOperational', label: 'Is Operational', labelAm: 'ይሰራል', dataType: 'boolean' },
      { name: 'condition', label: 'Condition', labelAm: 'ሁኔታ', dataType: 'single_select', options: ['New', 'Good', 'Fair'] },
      { name: 'peripherals', label: 'Peripherals', labelAm: 'ተጓዳኝ እቃዎች', dataType: 'multi_select', options: ['Mouse', 'Keyboard', 'Monitor'] },
      { name: 'manual', label: 'User Manual', labelAm: 'የተጠቃሚ መመሪያ', dataType: 'attachment' },
    ];

    const { container } = render(
      <DynamicForm fields={fields} onSubmit={async () => {}} />,
    );

    const scan = await runAxeScan(container);
    console.log('DynamicForm Violations:', scan.allViolations.map((v) => ({ id: v.id, impact: v.impact, description: v.description })));
    expect(scan.criticalCount).toBe(0);
  });

  it('scans MasterDataHistoryModal', async () => {
    const history = [
      {
        _id: 'h1',
        version: 2,
        action: 'update' as const,
        diff: { name: { before: 'Old Branch', after: 'New Branch' } },
        performedBy: 'ict_admin',
        timestamp: new Date().toISOString(),
      },
    ];

    const { container } = render(
      <MasterDataHistoryModal
        isOpen={true}
        onClose={() => {}}
        entityName="Branch"
        entityTitle="Addis Ababa Main"
        history={history}
      />,
    );

    const scan = await runAxeScan(container);
    console.log('MasterDataHistoryModal Violations:', scan.allViolations.map((v) => ({ id: v.id, impact: v.impact, description: v.description })));
    expect(scan.criticalCount).toBe(0);
  });

  it('scans MasterDataConsole across representative entities (Branches and Rooms)', async () => {
    // 1. Branch list
    const { container, rerender } = render(<MasterDataConsole initialTab="branches" />);
    const branchScan = await runAxeScan(container);
    console.log('MasterDataConsole (Branches) Violations:', branchScan.allViolations.map((v) => ({ id: v.id, impact: v.impact, description: v.description })));
    expect(branchScan.criticalCount).toBe(0);

    // 2. Room list
    rerender(<MasterDataConsole initialTab="rooms" />);
    const roomScan = await runAxeScan(container);
    expect(roomScan.criticalCount).toBe(0);
  });

  it('scans AssetConsole and its modals for Phase 3 accessibility bar (zero critical violations)', async () => {
    const { AssetConsole } = await import('../src/modules/assets/AssetConsole.js');
    const { container } = render(<AssetConsole initialLang="en" />);
    const scan = await runAxeScan(container);
    console.log('AssetConsole Violations:', scan.allViolations.map((v) => ({ id: v.id, impact: v.impact, description: v.description })));
    expect(scan.criticalCount).toBe(0);
  });
});
