import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AssetConsole } from '../src/modules/assets/AssetConsole.js';

describe('AssetConsole UI & Workflows (Phase 3)', () => {
  it('renders AssetConsole with header, action buttons, and asset list', () => {
    render(<AssetConsole initialLang="en" />);

    expect(screen.getByText('Asset Management & Bulk Import')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bulk Import Assets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register New Asset/i })).toBeInTheDocument();

    // Verify seeded assets are rendered
    expect(screen.getByText('Dell Latitude 5420 Laptop')).toBeInTheDocument();
    expect(screen.getByText('AM-HQ-ITE-2026-00001')).toBeInTheDocument();
    expect(screen.getByText('HP LaserJet Pro M404dn')).toBeInTheDocument();
  });

  it('switches between English and Amharic locales seamlessly without clipping', () => {
    render(<AssetConsole initialLang="en" />);

    // Toggle to Amharic
    const langBtn = screen.getByRole('button', { name: /Switch to Amharic/i });
    fireEvent.click(langBtn);

    expect(screen.getByText('የንብረት አስተዳደር እና የጅምላ ማስመጣት')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /በጅምላ አስመጣ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /አዲስ ንብረት/i })).toBeInTheDocument();

    // Toggle back to English
    const enBtn = screen.getByRole('button', { name: /ወደ እንግሊዝኛ ቀይር/i });
    fireEvent.click(enBtn);

    expect(screen.getByText('Asset Management & Bulk Import')).toBeInTheDocument();
  });

  it('filters assets according to status tabs', () => {
    render(<AssetConsole initialLang="en" />);

    // Click "Available" tab
    const availTab = screen.getByRole('button', { name: 'Available' });
    fireEvent.click(availTab);

    // HP LaserJet is available
    expect(screen.getByText('HP LaserJet Pro M404dn')).toBeInTheDocument();
    // Dell Latitude is assigned, so it should not appear
    expect(screen.queryByText('Dell Latitude 5420 Laptop')).not.toBeInTheDocument();

    // Click "All Assets" tab
    const allTab = screen.getByRole('button', { name: 'All Assets' });
    fireEvent.click(allTab);

    expect(screen.getByText('Dell Latitude 5420 Laptop')).toBeInTheDocument();
  });

  it('opens Asset Registration modal and renders DynamicForm custom fields', () => {
    render(<AssetConsole initialLang="en" />);

    const registerBtn = screen.getByRole('button', { name: /Register New Asset/i });
    fireEvent.click(registerBtn);

    expect(screen.getByRole('dialog', { name: /Register New Asset/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Asset Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Serial Number/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('runs bulk import pre-validation (dry run) report showing valid and invalid rows', () => {
    render(<AssetConsole initialLang="en" />);

    const bulkBtn = screen.getByRole('button', { name: /Bulk Import Assets/i });
    fireEvent.click(bulkBtn);

    const dialog = screen.getByRole('dialog', { name: /Bulk Asset Import/i });
    expect(dialog).toBeInTheDocument();

    // Trigger Pre-validate (Dry Run)
    const dryRunBtn = within(dialog).getByRole('button', { name: /Run Pre-Import Validation/i });
    fireEvent.click(dryRunBtn);

    // Validation report appears
    expect(within(dialog).getByText('Pre-Import Validation Report')).toBeInTheDocument();
    expect(within(dialog).getByText(/2 Valid/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/1 Invalid/i)).toBeInTheDocument();

    // Commit button is disabled because 1 row is invalid
    const commitBtn = within(dialog).getByRole('button', { name: /Commit Valid Rows/i });
    expect(commitBtn).toBeDisabled();
  });

  it('opens and closes QR Code and barcode preview modal (FR-REG-03)', () => {
    render(<AssetConsole initialLang="en" />);

    const qrBtns = screen.getAllByRole('button', { name: /View QR & Barcode/i });
    fireEvent.click(qrBtns[0]!);

    const modal = screen.getByRole('dialog', { name: /QR & Barcode Tag/i });
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('AM-HQ-ITE-2026-00001')).toBeInTheDocument();
    expect(within(modal).getByText(/Barcode: CODE128/i)).toBeInTheDocument();

    // Close
    const closeBtn = within(modal).getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and inspects chronological custody timeline history (FR-ASG-06)', () => {
    render(<AssetConsole initialLang="en" />);

    const histBtns = screen.getAllByRole('button', { name: /Custody Timeline History/i });
    fireEvent.click(histBtns[0]!);

    const modal = screen.getByRole('dialog', { name: /Custody Timeline History/i });
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('registered')).toBeInTheDocument();
    expect(within(modal).getByText('assigned')).toBeInTheDocument();
    expect(within(modal).getByText('accepted')).toBeInTheDocument();
    expect(within(modal).getAllByText(/Almaz Ayana/i).length).toBeGreaterThan(0);

    // Close
    const closeBtn = within(modal).getAllByRole('button', { name: /Close/i })[0]!;
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
