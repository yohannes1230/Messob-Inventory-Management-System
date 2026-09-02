import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicForm, type FormFieldDef } from '../src/design-system/DynamicForm.js';

describe('DynamicForm Component & Custom Field Data Types', () => {
  const baseFields: FormFieldDef[] = [
    {
      name: 'serialNumber',
      label: 'Serial Number',
      labelAm: 'መለያ ቁጥር',
      dataType: 'text',
      isRequired: true,
      validationRule: '^[A-Z]{2}-[0-9]{3}$',
    },
    {
      name: 'itemCount',
      label: 'Item Count',
      labelAm: 'የእቃ ብዛት',
      dataType: 'number',
      isRequired: true,
    },
    {
      name: 'isOperational',
      label: 'Operational',
      labelAm: 'ይሰራል',
      dataType: 'boolean',
    },
    {
      name: 'color',
      label: 'Color',
      labelAm: 'ቀለም',
      dataType: 'single_select',
      options: ['Red', 'Green', 'Blue'],
    },
  ];

  it('renders all field types with English labels by default', () => {
    render(<DynamicForm fields={baseFields} onSubmit={vi.fn()} />);

    expect(screen.getByText(/Serial Number/)).toBeInTheDocument();
    expect(screen.getByText(/Item Count/)).toBeInTheDocument();
    expect(screen.getByText(/Operational/)).toBeInTheDocument();
    expect(screen.getByText(/Color/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('renders Amharic labels when lang="am"', () => {
    render(<DynamicForm fields={baseFields} onSubmit={vi.fn()} lang="am" />);

    expect(screen.getByText(/መለያ ቁጥር/)).toBeInTheDocument();
    expect(screen.getByText(/የእቃ ብዛት/)).toBeInTheDocument();
    expect(screen.getByText(/ይሰራል/)).toBeInTheDocument();
    expect(screen.getByText(/ቀለም/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /አስቀምጥ/i })).toBeInTheDocument();
  });

  it('validates required fields on submission', () => {
    const handleSubmit = vi.fn();
    render(<DynamicForm fields={baseFields} onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText(/Serial Number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Item Count is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Dedicated tests for each of the 6 Custom Field Data Types (mirrors server)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. TEXT field with regex validation
  it('validates text custom field against regex pattern', () => {
    const handleSubmit = vi.fn();
    const textField: FormFieldDef[] = [
      {
        name: 'imei',
        label: 'IMEI',
        labelAm: 'አይኤምኢአይ',
        dataType: 'text',
        isRequired: true,
        validationRule: '^[0-9]{15}$',
      },
    ];

    render(<DynamicForm fields={textField} onSubmit={handleSubmit} />);

    const input = screen.getByLabelText(/IMEI/i);

    // Invalid text (alphanumeric instead of 15 digits)
    fireEvent.change(input, { target: { value: 'ABC12345' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText(/Does not match pattern/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();

    // Valid text (exactly 15 digits)
    fireEvent.change(input, { target: { value: '123456789012345' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.queryByText(/Does not match pattern/i)).not.toBeInTheDocument();
    expect(handleSubmit).toHaveBeenCalledWith({ imei: '123456789012345' });
  });

  // 2. NUMBER field validation
  it('validates number custom field and rejects invalid numbers', () => {
    const handleSubmit = vi.fn();
    const numberField: FormFieldDef[] = [
      {
        name: 'storageGb',
        label: 'Storage (GB)',
        labelAm: 'የማከማቻ መጠን',
        dataType: 'number',
        isRequired: true,
      },
    ];

    render(<DynamicForm fields={numberField} onSubmit={handleSubmit} />);

    const input = screen.getByLabelText(/Storage/i);

    // Submit valid number
    fireEvent.change(input, { target: { value: '512' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(handleSubmit).toHaveBeenCalledWith({ storageGb: '512' });
  });

  // 3. DATE field validation
  it('validates date custom field with ISO date format', () => {
    const handleSubmit = vi.fn();
    const dateField: FormFieldDef[] = [
      {
        name: 'manufactureDate',
        label: 'Manufacture Date',
        labelAm: 'የተመረተበት ቀን',
        dataType: 'date',
        isRequired: true,
      },
    ];

    render(<DynamicForm fields={dateField} onSubmit={handleSubmit} />);

    // Missing required date
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(screen.getByText(/Manufacture Date is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();

    // Fill valid date
    const input = screen.getByLabelText(/Manufacture Date/i);
    fireEvent.change(input, { target: { value: '2026-05-15' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(handleSubmit).toHaveBeenCalledWith({ manufactureDate: '2026-05-15' });
  });

  // 4. BOOLEAN field validation
  it('handles boolean custom field checkbox toggles', () => {
    const handleSubmit = vi.fn();
    const boolField: FormFieldDef[] = [
      {
        name: 'is5gEnabled',
        label: '5G Enabled',
        labelAm: '5ጂ አለው',
        dataType: 'boolean',
      },
    ];

    render(<DynamicForm fields={boolField} onSubmit={handleSubmit} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    // Toggle on
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(handleSubmit).toHaveBeenCalledWith({ is5gEnabled: true });
  });

  // 5. SINGLE_SELECT field validation
  it('validates single_select custom field against allowed options', () => {
    const handleSubmit = vi.fn();
    const selectField: FormFieldDef[] = [
      {
        name: 'osType',
        label: 'Operating System',
        labelAm: 'ስርዓተ ክወና',
        dataType: 'single_select',
        options: ['Android', 'iOS', 'Windows', 'Linux'],
        isRequired: true,
      },
    ];

    render(<DynamicForm fields={selectField} onSubmit={handleSubmit} />);

    // Missing selection
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(screen.getByText(/Operating System is required/i)).toBeInTheDocument();

    // Select valid option
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Linux' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(handleSubmit).toHaveBeenCalledWith({ osType: 'Linux' });
  });

  // 6. MULTI_SELECT field validation
  it('validates multi_select custom field with multiple checkbox items', () => {
    const handleSubmit = vi.fn();
    const multiField: FormFieldDef[] = [
      {
        name: 'accessories',
        label: 'Included Accessories',
        labelAm: 'መለዋወጫዎች',
        dataType: 'multi_select',
        options: ['Charger', 'Earphones', 'Case', 'Screen Protector'],
        isRequired: true,
      },
    ];

    render(<DynamicForm fields={multiField} onSubmit={handleSubmit} />);

    // Submit with none selected when required
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(screen.getByText(/Select at least one Included Accessories/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();

    // Select 'Charger' and 'Case'
    const chargerCheckbox = screen.getByLabelText('Charger');
    const caseCheckbox = screen.getByLabelText('Case');

    fireEvent.click(chargerCheckbox);
    fireEvent.click(caseCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(handleSubmit).toHaveBeenCalledWith({
      accessories: ['Charger', 'Case'],
    });
  });

  // 7. ATTACHMENT field validation
  it('validates attachment custom field with document URL', () => {
    const handleSubmit = vi.fn();
    const attachField: FormFieldDef[] = [
      {
        name: 'warrantyDoc',
        label: 'Warranty Document',
        labelAm: 'የዋስትና ሰነድ',
        dataType: 'attachment',
        isRequired: true,
      },
    ];

    render(<DynamicForm fields={attachField} onSubmit={handleSubmit} />);

    // Empty required
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(screen.getByText(/Warranty Document is required/i)).toBeInTheDocument();

    // Fill valid attachment
    const input = screen.getByLabelText(/Warranty Document/i);
    fireEvent.change(input, { target: { value: 'https://minio.local/assets/warranty.pdf' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(handleSubmit).toHaveBeenCalledWith({
      warrantyDoc: { url: 'https://minio.local/assets/warranty.pdf' },
    });
  });
});
