import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MasterDataConsole } from '../src/modules/masterdata/MasterDataConsole.js';

describe('MasterDataConsole Component', () => {
  it('renders console header, navigation sidebar, and initial branches tab', () => {
    render(<MasterDataConsole />);

    expect(screen.getByText(/Messob PMS — Configuration Console/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add New/i })).toBeInTheDocument();
    expect(screen.getByText('Addis Ababa Main')).toBeInTheDocument();
  });

  it('switches tabs to Buildings and Departments', () => {
    render(<MasterDataConsole />);

    const buildingsTab = screen.getByRole('button', { name: /Buildings/i });
    fireEvent.click(buildingsTab);

    expect(screen.getByText('HQ Block A')).toBeInTheDocument();

    const departmentsTab = screen.getByRole('button', { name: /Departments/i });
    fireEvent.click(departmentsTab);

    expect(screen.getByText('ICT Department')).toBeInTheDocument();
  });

  it('toggles language between English and Amharic', () => {
    render(<MasterDataConsole />);

    const langButton = screen.getByRole('button', { name: /አማርኛ/i });
    fireEvent.click(langButton);

    // Amharic header and navigation
    expect(screen.getByText(/መሶብ የንብረት አስተዳደር/i)).toBeInTheDocument();
    expect(screen.getAllByText('ቅርንጫፎች').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ሕንፃዎች')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /አዲስ መዝግብ/i })).toBeInTheDocument();

    // Toggle back to English
    const enButton = screen.getByRole('button', { name: /English/i });
    fireEvent.click(enButton);
    expect(screen.getByText(/Messob PMS — Configuration Console/i)).toBeInTheDocument();
  });

  it('opens history modal when clicking history button', () => {
    render(<MasterDataConsole />);

    const historyButtons = screen.getAllByTitle(/Change History/i);
    fireEvent.click(historyButtons[0]!);

    expect(screen.getByText(/Audit & Change History/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(screen.queryByText(/Audit & Change History/i)).not.toBeInTheDocument();
  });
});
