import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicForm, type FormFieldDef } from '../src/design-system/DynamicForm.js';

describe('DynamicForm Component', () => {
  const fields: FormFieldDef[] = [
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
    render(<DynamicForm fields={fields} onSubmit={vi.fn()} />);

    expect(screen.getByText(/Serial Number/)).toBeInTheDocument();
    expect(screen.getByText(/Item Count/)).toBeInTheDocument();
    expect(screen.getByText(/Operational/)).toBeInTheDocument();
    expect(screen.getByText(/Color/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('renders Amharic labels when lang="am"', () => {
    render(<DynamicForm fields={fields} onSubmit={vi.fn()} lang="am" />);

    expect(screen.getByText(/መለያ ቁጥር/)).toBeInTheDocument();
    expect(screen.getByText(/የእቃ ብዛት/)).toBeInTheDocument();
    expect(screen.getByText(/ይሰራል/)).toBeInTheDocument();
    expect(screen.getByText(/ቀለም/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /አስቀምጥ/i })).toBeInTheDocument();
  });

  it('validates required fields on submission', () => {
    const handleSubmit = vi.fn();
    render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText(/Serial Number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Item Count is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates regex pattern for text field', () => {
    const handleSubmit = vi.fn();
    render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

    // Input invalid regex text
    const serialInput = screen.getAllByRole('textbox')[0]!;
    fireEvent.change(serialInput, { target: { value: 'INVALID' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText(/Does not match pattern/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('successfully submits valid values across field types', () => {
    const handleSubmit = vi.fn();
    render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

    const textInputs = screen.getAllByRole('textbox');
    const serialInput = textInputs[0]!;
    fireEvent.change(serialInput, { target: { value: 'AB-123' } });

    const numberInput = screen.getByRole('spinbutton');
    fireEvent.change(numberInput, { target: { value: '42' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Green' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        serialNumber: 'AB-123',
        itemCount: '42',
        isOperational: true,
        color: 'Green',
      }),
    );
  });
});
