import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from '../src/design-system/DataTable.js';

describe('DataTable Component', () => {
  const columns: Column[] = [
    { key: 'code', header: 'Code', headerAm: 'ኮድ' },
    { key: 'name', header: 'Name', headerAm: 'ስም' },
    { key: 'roomsCount', header: 'Rooms', headerAm: 'ክፍሎች' },
  ];

  const data = [
    { _id: '1', code: 'AA-01', name: 'Addis Branch', roomsCount: 15 },
    { _id: '2', code: 'HW-02', name: 'Hawassa Branch', roomsCount: 8 },
    { _id: '3', code: 'DR-03', name: 'Dire Dawa Branch', roomsCount: 22 },
    { _id: '4', code: 'BD-04', name: 'Bahir Dar Branch', roomsCount: 12 },
    { _id: '5', code: 'MK-05', name: 'Mekelle Branch', roomsCount: 5 },
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
    expect(screen.getByText('ክፍሎች')).toBeInTheDocument();
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

  it('sorts rows when clicking column headers (ascending then descending)', () => {
    render(<DataTable columns={columns} data={data} limit={10} />);

    // Click "Name" header to sort ascending
    const nameSortBtn = screen.getByRole('button', { name: /Name/i });
    fireEvent.click(nameSortBtn);

    let rows = screen.getAllByRole('row');
    // Header row is index 0. Row 1 should be Addis Branch, Row 2 Bahir Dar, Row 3 Dire Dawa, Row 4 Hawassa, Row 5 Mekelle
    expect(rows[1]).toHaveTextContent('Addis Branch');
    expect(rows[2]).toHaveTextContent('Bahir Dar Branch');
    expect(rows[3]).toHaveTextContent('Dire Dawa Branch');
    expect(rows[4]).toHaveTextContent('Hawassa Branch');
    expect(rows[5]).toHaveTextContent('Mekelle Branch');

    // Click "Name" header again to sort descending
    fireEvent.click(nameSortBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Mekelle Branch');
    expect(rows[2]).toHaveTextContent('Hawassa Branch');
    expect(rows[3]).toHaveTextContent('Dire Dawa Branch');
    expect(rows[4]).toHaveTextContent('Bahir Dar Branch');
    expect(rows[5]).toHaveTextContent('Addis Branch');

    // Click numeric column "Rooms" to sort numerically
    const roomsSortBtn = screen.getByRole('button', { name: /Rooms/i });
    fireEvent.click(roomsSortBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Mekelle Branch'); // 5 rooms
    expect(rows[5]).toHaveTextContent('Dire Dawa Branch'); // 22 rooms
  });

  it('paginates rows when clicking next and previous buttons', () => {
    // 5 items, limit = 2 -> 3 pages
    render(<DataTable columns={columns} data={data} limit={2} />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Addis Branch')).toBeInTheDocument();
    expect(screen.getByText('Hawassa Branch')).toBeInTheDocument();
    expect(screen.queryByText('Dire Dawa Branch')).not.toBeInTheDocument();

    const prevBtn = screen.getByLabelText(/Previous page/i);
    const nextBtn = screen.getByLabelText(/Next page/i);

    // Prev should be disabled on first page
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Click Next -> Page 2
    fireEvent.click(nextBtn);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Dire Dawa Branch')).toBeInTheDocument();
    expect(screen.getByText('Bahir Dar Branch')).toBeInTheDocument();
    expect(screen.queryByText('Addis Branch')).not.toBeInTheDocument();

    // Click Next -> Page 3
    fireEvent.click(nextBtn);
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Mekelle Branch')).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();

    // Click Prev -> Back to Page 2
    fireEvent.click(prevBtn);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Dire Dawa Branch')).toBeInTheDocument();
  });

  it('invokes external onSort and onPageChange when controlled', () => {
    const handleSort = vi.fn();
    const handlePageChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        total={20}
        page={2}
        limit={5}
        onSort={handleSort}
        onPageChange={handlePageChange}
      />,
    );

    const sortBtn = screen.getByRole('button', { name: /Code/i });
    fireEvent.click(sortBtn);
    expect(handleSort).toHaveBeenCalledWith('code', 'asc');

    const nextBtn = screen.getByLabelText(/Next page/i);
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });
});
