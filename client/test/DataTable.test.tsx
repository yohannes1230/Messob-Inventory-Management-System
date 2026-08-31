import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from '../src/design-system/DataTable.js';

describe('DataTable Component', () => {
  const columns: Column[] = [
    { key: 'code', header: 'Code', headerAm: 'ኮድ' },
    { key: 'name', header: 'Name', headerAm: 'ስም' },
  ];

  const data = [
    { _id: '1', code: 'AA-01', name: 'Addis Branch' },
    { _id: '2', code: 'HW-02', name: 'Hawassa Branch' },
    { _id: '3', code: 'DR-03', name: 'Dire Dawa Branch' },
  ];

  it('renders columns and data rows in English by default', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Addis Branch')).toBeInTheDocument();
    expect(screen.getByText('Hawassa Branch')).toBeInTheDocument();
  });

  it('renders Amharic headers when lang="am"', () => {
    render(<DataTable columns={columns} data={data} lang="am" />);

    expect(screen.getByText('ኮድ')).toBeInTheDocument();
    expect(screen.getByText('ስም')).toBeInTheDocument();
  });

  it('filters rows when searching', () => {
    render(<DataTable columns={columns} data={data} />);

    const searchInput = screen.getByPlaceholderText(/Search records.../i);
    fireEvent.change(searchInput, { target: { value: 'Hawassa' } });

    expect(screen.getByText('Hawassa Branch')).toBeInTheDocument();
    expect(screen.queryByText('Addis Branch')).not.toBeInTheDocument();
    expect(screen.queryByText('Dire Dawa Branch')).not.toBeInTheDocument();
  });

  it('triggers action callbacks (edit, deactivate, history)', () => {
    const handleEdit = vi.fn();
    const handleDeactivate = vi.fn();
    const handleHistory = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        onViewHistory={handleHistory}
      />,
    );

    const editButtons = screen.getAllByTitle(/Edit/i);
    fireEvent.click(editButtons[0]!);
    expect(handleEdit).toHaveBeenCalledWith(data[0]);

    const deactivateButtons = screen.getAllByTitle(/Deactivate/i);
    fireEvent.click(deactivateButtons[0]!);
    expect(handleDeactivate).toHaveBeenCalledWith(data[0]);

    const historyButtons = screen.getAllByTitle(/Change History/i);
    fireEvent.click(historyButtons[0]!);
    expect(handleHistory).toHaveBeenCalledWith(data[0]);
  });
});
