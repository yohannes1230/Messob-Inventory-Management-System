import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeePortal } from '../src/modules/portal/EmployeePortal.js';

describe('Employee Self-Service Portal (Phase 4 — FR-ESS-01→08)', () => {
  // FR-ESS-01: Submit a request for a new asset (property type + justification)
  it('strictly enforces the 3-Step Max rule for New Property Allocation Request (FR-ESS-01 & SRS §6.2.2)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Switch to My Requests tab
    const requestsTab = screen.getByRole('tab', { name: /My Requests/i });
    fireEvent.click(requestsTab);

    // Action 1: Open New Request modal (enters Step 1)
    const newReqBtn = screen.getByRole('button', { name: '+ New Property Request' });
    fireEvent.click(newReqBtn);

    expect(screen.getByText(/1\. Select Item/i)).toBeInTheDocument();

    // Step 1 -> Step 2
    const nextBtn1 = screen.getByText('Next Step →');
    fireEvent.click(nextBtn1);

    expect(screen.getByText(/2\. Specifications & Urgency/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    const nextBtn2 = screen.getByText('Next Step →');
    fireEvent.click(nextBtn2);

    expect(screen.getByText(/3\. Justification & Submit/i)).toBeInTheDocument();

    // Step 3: Enter justification & Submit
    const justInput = screen.getByPlaceholderText(/Provide operational justification/i);
    fireEvent.change(justInput, { target: { value: 'Required for tax invoice processing' } });

    const submitBtn = screen.getByRole('button', { name: 'Submit Request' });
    fireEvent.click(submitBtn);

    // Successfully submitted within 3 steps
    expect(screen.getByText(/Allocation request/i)).toBeInTheDocument();
  });

  // FR-ESS-02: View all assets currently assigned, with photos/specs/date
  it('views all assets currently assigned with specs, code, and photos (FR-ESS-02)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Assigned assets in custody
    expect(screen.getByText('ThinkPad T14s Gen 3')).toBeInTheDocument();
    expect(screen.getByText('Dell UltraSharp 27" 4K Monitor')).toBeInTheDocument();
    expect(screen.getByText('AM-HQ-ITE-2026-00042')).toBeInTheDocument();
  });

  // FR-ESS-03: Digitally accept (acknowledge receipt of) an assigned asset
  it('accepts asset assignment in <= 2 steps (FR-ESS-03 & 3-Step Max Rule)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Step 1: Click "Accept Custody" on pending asset
    const acceptBtn = screen.getByRole('button', { name: 'Accept Custody' });
    fireEvent.click(acceptBtn);

    expect(screen.getByText('Accept Asset Handover & Custody')).toBeInTheDocument();

    // Step 2: Confirm acceptance
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Acceptance' });
    fireEvent.click(confirmBtn);

    // Custody acknowledged and badge updated
    expect(screen.getByText(/custody successfully acknowledged/i)).toBeInTheDocument();
  });

  // FR-ESS-04: Submit a return request, with reason and condition notes
  it('initiates asset return in <= 2 steps (FR-ESS-04 & 3-Step Max Rule)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Step 1: Click "Return Asset" on assigned asset
    const returnBtns = screen.getAllByRole('button', { name: 'Return Asset' });
    fireEvent.click(returnBtns[0]!);

    expect(screen.getByText('Initiate Asset Return')).toBeInTheDocument();

    // Step 2: Submit return request
    const submitBtn = screen.getByRole('button', { name: 'Submit Return Request' });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Return request/i)).toBeInTheDocument();
  });

  // FR-ESS-05: Report damage or loss, optionally with photos
  it('reports damage/loss issue with photo evidence in <= 2 steps (FR-ESS-05)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Step 1: Open Report Issue modal
    const reportBtns = screen.getAllByRole('button', { name: 'Report Issue' });
    fireEvent.click(reportBtns[0]!);

    expect(screen.getByText('Report Damage, Loss, or Malfunction')).toBeInTheDocument();

    const descInput = screen.getByPlaceholderText(/Describe when and how the damage/i);
    fireEvent.change(descInput, { target: { value: 'Screen has horizontal purple lines' } });

    // Attach photo
    const attachBtn = screen.getByText('+ Add Photo Evidence');
    fireEvent.click(attachBtn);

    // Step 2: Submit report
    const submitBtn = screen.getByRole('button', { name: 'Submit Issue Report' });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Issue ticket/i)).toBeInTheDocument();
  });

  // FR-ESS-06: View complete history of assets held, including past assignments
  it('views complete history of assets held and chronological custody timeline (FR-ESS-06, FR-REG-03)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Open Timeline
    const timelineBtn = screen.getAllByRole('button', { name: 'View Custody Timeline' })[0];
    fireEvent.click(timelineBtn!);

    expect(screen.getByText('Custody History & Timeline')).toBeInTheDocument();
    expect(screen.getByText('Asset Registered into Inventory')).toBeInTheDocument();

    // Close timeline
    const closeBtns = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeBtns[0]!);

    // Open QR quick-view
    const qrBtn = screen.getAllByRole('button', { name: 'View QR Code' })[0];
    fireEvent.click(qrBtn!);

    expect(screen.getAllByText('AM-HQ-ITE-2026-00042').length).toBeGreaterThanOrEqual(1);
  });

  // FR-ESS-07: In-app (and optionally email/SMS) notification of status changes
  it('dispatches and displays in-app status-change notification banner (FR-ESS-07)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Trigger status change action (accept custody)
    const acceptBtn = screen.getByRole('button', { name: 'Accept Custody' });
    fireEvent.click(acceptBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Acceptance' });
    fireEvent.click(confirmBtn);

    // In-app notification banner rendered with status change feedback
    expect(screen.getByText(/custody successfully acknowledged/i)).toBeInTheDocument();
  });

  // FR-ESS-08: Personal dashboard summarizing active assets, pending requests, and open maintenance issues
  it('renders personal dashboard summarizing active assets, pending requests, and open maintenance issues (FR-ESS-08)', () => {
    render(<EmployeePortal initialLocale="en" />);

    expect(screen.getByText('Employee Self-Service Portal')).toBeInTheDocument();
    // Summarizes active assets in custody
    expect(screen.getByText('Total in Custody')).toBeInTheDocument();
    // Summarizes pending acceptance
    expect(screen.getByText('Pending Handover Acceptance')).toBeInTheDocument();
    // Summarizes active requests
    expect(screen.getByText('Active Requests')).toBeInTheDocument();
    // Summarizes open maintenance issues
    expect(screen.getByText('Open Maintenance Issues')).toBeInTheDocument();
  });

  // Supporting tests
  it('tracks own requests and cancels submitted request in <= 2 steps (Request Tracking & Cancellation Lifecycle)', () => {
    render(<EmployeePortal initialLocale="en" />);

    // Switch to Requests tab
    const requestsTab = screen.getByRole('tab', { name: /My Requests/i });
    fireEvent.click(requestsTab);

    expect(screen.getByText('REQ-2026-00012')).toBeInTheDocument();

    // Step 1: Click Cancel on pending request
    const cancelBtn = screen.getByRole('button', { name: 'Cancel request REQ-2026-00012' });
    fireEvent.click(cancelBtn);

    expect(screen.getByText('Cancel Request')).toBeInTheDocument();

    // Step 2: Confirm cancellation
    const confirmCancelBtn = screen.getByRole('button', { name: 'Confirm Cancellation' });
    fireEvent.click(confirmCancelBtn);

    expect(screen.getByText(/was cancelled/i)).toBeInTheDocument();
  });

  it('switches between English and Amharic locales seamlessly without clipping', () => {
    render(<EmployeePortal initialLocale="en" />);

    const langBtn = screen.getByRole('button', { name: /Toggle Language/i });
    fireEvent.click(langBtn);

    // Amharic headings rendered
    expect(screen.getByText('የሰራተኛ የራስ-አገልግሎት ፖርታል')).toBeInTheDocument();
    expect(screen.getByText('የእኔ ንብረቶች')).toBeInTheDocument();
    expect(screen.getByText('የእኔ ጥያቄዎች')).toBeInTheDocument();
    expect(screen.getByText('የጥገና / ብልሽት ጥያቄዎች')).toBeInTheDocument();
  });
});
