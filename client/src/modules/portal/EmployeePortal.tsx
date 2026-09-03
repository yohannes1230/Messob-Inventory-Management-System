import React, { useState, useMemo } from 'react';
import {
  Package,
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  X,
  History,
  QrCode,
  Globe,
  Upload,
  User,
  Building,
  ShieldCheck,
} from 'lucide-react';
import { AssetCard } from '../../design-system/AssetCard.js';
import { AssetDto, IRequest, RequestCategoryType } from '@am-pms/shared-types';

export interface EmployeePortalProps {
  initialLocale?: 'en' | 'am';
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({ initialLocale = 'en' }) => {
  const [locale, setLocale] = useState<'en' | 'am'>(initialLocale);
  const [activeTab, setActiveTab] = useState<'assets' | 'requests'>('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');

  // Modal states
  const [selectedAsset, setSelectedAsset] = useState<AssetDto | null>(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IRequest | null>(null);

  // Form states
  const [acceptConditionNotes, setAcceptConditionNotes] = useState('Good condition verified');
  const [returnReason, setReturnReason] = useState('Project completed');
  const [returnNotes, setReturnNotes] = useState('');
  const [issueType, setIssueType] = useState<'damage' | 'loss' | 'malfunction'>('damage');
  const [issueSeverity, setIssueSeverity] = useState<'minor' | 'moderate' | 'severe' | 'critical'>('moderate');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhotos, setIssuePhotos] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState('Duplicate request');

  // New Request Form (Step-based: 3 steps max)
  const [requestStep, setRequestStep] = useState<1 | 2 | 3>(1);
  const [requestedPropertyType, setRequestedPropertyType] = useState('Laptop - High Performance');
  const [requestJustification, setRequestJustification] = useState('');
  const [requestUrgency, setRequestUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [requestSpecs, setRequestSpecs] = useState('16GB RAM, 512GB SSD');

  // Notification feedback
  const [alertBanner, setAlertBanner] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Mock initial employee assigned assets (FR-ESS-02)
  const [assets, setAssets] = useState<AssetDto[]>([
    {
      _id: 'ast-101',
      assetCode: 'AM-HQ-ITE-2026-00042',
      name: 'ThinkPad T14s Gen 3',
      propertyType: 'Laptop - High Performance',
      category: 'IT Equipment',
      status: 'assigned',
      currentCustodian: { type: 'employee', ref: 'emp-01' },
      currentLocation: { branch: 'Addis Ababa Central', room: 'Room 304' },
      value: 68000,
      currency: 'ETB',
      purchaseDate: '2026-02-15',
      warrantyExpiry: '2029-02-15',
      customFieldValues: {},
      photos: [],
      documents: [],
      qrCode: 'mock-qr-code-payload-101',
      barcodeFormat: 'CODE128',
      bundleChildren: [],
      isActive: true,
      version: 2,
      createdAt: '2026-02-16T08:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      _id: 'ast-102',
      assetCode: 'AM-HQ-ITE-2026-00088',
      name: 'Dell UltraSharp 27" 4K Monitor',
      propertyType: 'External Display',
      category: 'IT Equipment',
      status: 'pending_acceptance',
      currentCustodian: { type: 'employee', ref: 'emp-01' },
      currentLocation: { branch: 'Addis Ababa Central', room: 'Room 304' },
      value: 34000,
      currency: 'ETB',
      purchaseDate: '2026-04-10',
      customFieldValues: {},
      photos: [],
      documents: [],
      qrCode: 'mock-qr-code-payload-102',
      barcodeFormat: 'CODE128',
      bundleChildren: [],
      isActive: true,
      version: 1,
      createdAt: '2026-04-12T09:30:00.000Z',
      updatedAt: '2026-04-12T09:30:00.000Z',
    },
    {
      _id: 'ast-103',
      assetCode: 'AM-HQ-OFF-2026-00115',
      name: 'Ergonomic Executive Mesh Chair',
      propertyType: 'Office Furniture',
      category: 'Furniture & Fixtures',
      status: 'assigned',
      currentCustodian: { type: 'employee', ref: 'emp-01' },
      currentLocation: { branch: 'Addis Ababa Central', room: 'Room 304' },
      value: 18500,
      currency: 'ETB',
      purchaseDate: '2026-01-20',
      customFieldValues: {},
      photos: [],
      documents: [],
      qrCode: 'mock-qr-code-payload-103',
      barcodeFormat: 'CODE128',
      bundleChildren: [],
      isActive: true,
      version: 1,
      createdAt: '2026-01-22T11:00:00.000Z',
      updatedAt: '2026-01-22T11:00:00.000Z',
    },
  ]);

  // Mock initial requests (Portal request tracking)
  const [requests, setRequests] = useState<IRequest[]>([
    {
      _id: 'req-001',
      requestNumber: 'REQ-2026-00012',
      type: 'asset_allocation',
      requestType: { _id: 'rt-1', name: 'Hardware Allocation', module: 'assignment' } as any,
      requestor: { _id: 'emp-01', username: 'yohannes.a', email: 'yohannes.a@am-pms.gov.et' } as any,
      targetPropertyType: { _id: 'pt-2', name: 'USB-C Universal Docking Station' } as any,
      payload: {
        justification: 'Connecting dual 4K monitors for workflow efficiency',
        urgency: 'medium',
      },
      status: 'submitted',
      workflowInstance: null,
      createdAt: '2026-05-02T14:30:00.000Z',
      updatedAt: '2026-05-02T14:30:00.000Z',
    },
    {
      _id: 'req-002',
      requestNumber: 'REQ-2026-00008',
      type: 'damage_loss',
      requestType: { _id: 'rt-2', name: 'Equipment Maintenance', module: 'maintenance' } as any,
      requestor: { _id: 'emp-01', username: 'yohannes.a', email: 'yohannes.a@am-pms.gov.et' } as any,
      targetAsset: { _id: 'ast-101', name: 'ThinkPad T14s Gen 3', assetCode: 'AM-HQ-ITE-2026-00042' } as any,
      payload: {
        issueType: 'malfunction',
        severity: 'minor',
        description: 'Trackpad gesture scroll intermittently unresponsive',
      },
      status: 'in_review',
      workflowInstance: null,
      createdAt: '2026-04-20T09:15:00.000Z',
      updatedAt: '2026-04-21T11:00:00.000Z',
    },
    {
      _id: 'req-003',
      requestNumber: 'REQ-2026-00003',
      type: 'return',
      requestType: { _id: 'rt-1', name: 'Asset Return', module: 'assignment' } as any,
      requestor: { _id: 'emp-01', username: 'yohannes.a', email: 'yohannes.a@am-pms.gov.et' } as any,
      targetAsset: { _id: 'ast-99', name: 'iPad Pro 11" M2', assetCode: 'AM-HQ-ITE-2025-00301' } as any,
      payload: {
        reason: 'Temporary field audit project completed',
      },
      status: 'completed',
      workflowInstance: null,
      createdAt: '2026-03-10T16:00:00.000Z',
      updatedAt: '2026-03-12T10:00:00.000Z',
    },
  ]);

  // Labels dictionary
  const t = {
    en: {
      portalTitle: 'Employee Self-Service Portal',
      subtitle: 'Addis Mesob One Stop Center • ICT & Property Directorate',
      myAssets: 'My Assigned Assets',
      myRequests: 'My Requests & Tickets',
      totalAssets: 'Total in Custody',
      pendingAcceptance: 'Pending Handover Acceptance',
      activeRequests: 'Active Requests',
      openMaintenanceIssues: 'Open Maintenance Issues',
      searchPlaceholder: 'Search by asset code or name...',
      filterAll: 'All Assets',
      filterAssigned: 'In Custody',
      filterPending: 'Pending Acceptance',
      filterMaintenance: 'In Maintenance',
      newRequestBtn: '+ New Property Request',
      acceptDialogTitle: 'Accept Asset Handover & Custody',
      acceptDialogDesc: 'Acknowledge physical receipt of this asset and confirm condition acceptance.',
      confirmAcceptBtn: 'Confirm Acceptance',
      returnDialogTitle: 'Initiate Asset Return',
      returnDialogDesc: 'Submit a return request to store administration before physical handover.',
      returnReasonLabel: 'Reason for Return',
      conditionNotesLabel: 'Condition Notes',
      submitReturnBtn: 'Submit Return Request',
      issueDialogTitle: 'Report Damage, Loss, or Malfunction',
      issueDialogDesc: 'Report physical damage or hardware failure to initiate maintenance dispatch.',
      issueTypeLabel: 'Issue Type',
      severityLabel: 'Severity',
      descriptionLabel: 'Detailed Description',
      addPhotoBtn: '+ Add Photo Evidence',
      submitIssueBtn: 'Submit Issue Report',
      historyTitle: 'Custody History & Timeline',
      cancelRequestTitle: 'Cancel Request',
      cancelRequestDesc: 'Are you sure you want to cancel this pending request?',
      cancelReasonLabel: 'Cancellation Reason',
      confirmCancelBtn: 'Confirm Cancellation',
      keepRequestBtn: 'Keep Request',
      reqStep1: '1. Select Item',
      reqStep2: '2. Specifications & Urgency',
      reqStep3: '3. Justification & Submit',
      nextBtn: 'Next Step →',
      prevBtn: '← Previous',
      submitReqBtn: 'Submit Request',
      closeBtn: 'Close',
    },
    am: {
      portalTitle: 'የሰራተኛ የራስ-አገልግሎት ፖርታል',
      subtitle: 'አዲስ መሶብ አንድ ማዕከል • የኢንፎርሜሽን ቴክኖሎጂ እና ንብረት አስተዳደር',
      myAssets: 'የእኔ ንብረቶች',
      myRequests: 'የእኔ ጥያቄዎች',
      totalAssets: 'በእጅ ያሉ ንብረቶች',
      pendingAcceptance: 'ርክክብ የሚጠብቁ',
      activeRequests: 'ንቁ ጥያቄዎች',
      openMaintenanceIssues: 'የጥገና / ብልሽት ጥያቄዎች',
      searchPlaceholder: 'በኮድ ወይም በስም ይፈልጉ...',
      filterAll: 'ሁሉም ንብረቶች',
      filterAssigned: 'በይዞታ ያለ',
      filterPending: 'ርክክብ የሚጠብቅ',
      filterMaintenance: 'በጥገና ላይ',
      newRequestBtn: '+ አዲስ የንብረት ጥያቄ',
      acceptDialogTitle: 'የንብረት ርክክብ ማረጋገጫ',
      acceptDialogDesc: 'ንብረቱን በአካል መረከብዎን እና ያለበትን ሁኔታ ያረጋግጡ።',
      confirmAcceptBtn: 'ርክክብ አረጋግጥ',
      returnDialogTitle: 'የንብረት መመለሻ ጥያቄ',
      returnDialogDesc: 'ንብረቱን ለመጋዘን ከማስረከብዎ በፊት የመመለሻ ጥያቄ ያቅርቡ።',
      returnReasonLabel: 'የመመለሻ ምክንያት',
      conditionNotesLabel: 'የንብረቱ ሁኔታ ማስታወሻ',
      submitReturnBtn: 'የመመለሻ ጥያቄ ላክ',
      issueDialogTitle: 'የብልሽት ወይም የመጥፋት ሪፖርት',
      issueDialogDesc: 'ለጥገና ወይም ምርመራ እንዲላክ የደረሰውን ብልሽት ወይም ችግር ያሳውቁ።',
      issueTypeLabel: 'የችግሩ አይነት',
      severityLabel: 'የጉዳቱ መጠን',
      descriptionLabel: 'ዝርዝር ማብራሪያ',
      addPhotoBtn: '+ የፎቶ ማስረጃ አያይዝ',
      submitIssueBtn: 'ሪፖርት ላክ',
      historyTitle: 'የንብረቱ የይዞታ ታሪክ መስመር',
      cancelRequestTitle: 'ጥያቄ ሰርዝ',
      cancelRequestDesc: 'ይህን በመጠባበቅ ላይ ያለ ጥያቄ መሰረዝ ይፈልጋሉ?',
      cancelReasonLabel: 'የመሰረዣ ምክንያት',
      confirmCancelBtn: 'ጥያቄውን ሰርዝ',
      keepRequestBtn: 'ይቆይ',
      reqStep1: '፩. ንብረት ምረጥ',
      reqStep2: '፪. ዝርዝር መግለጫ እና አጣዳፊነት',
      reqStep3: '፫. ምክንያት እና ማረጋገጫ',
      nextBtn: 'ቀጣይ ደረጃ →',
      prevBtn: '← ወደ ኋላ',
      submitReqBtn: 'ጥያቄውን ላክ',
      closeBtn: 'ዝጋ',
    },
  }[locale];

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.assetCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        assetStatusFilter === 'all' || asset.status === assetStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assets, searchQuery, assetStatusFilter]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus =
        requestStatusFilter === 'all' || req.status === requestStatusFilter;
      return matchesStatus;
    });
  }, [requests, requestStatusFilter]);

  // FR-ESS-08: Personal Dashboard KPI Calculations
  const pendingCount = assets.filter((a) => a.status === 'pending_acceptance').length;
  const assignedCount = assets.filter((a) => a.status === 'assigned').length;
  const activeReqCount = requests.filter((r) => r.status === 'submitted' || r.status === 'in_review').length;
  const openMaintenanceCount = requests.filter(
    (r) => r.type === 'damage_loss' && (r.status === 'submitted' || r.status === 'in_review'),
  ).length;

  // ── Action Handlers ──

  // FR-ESS-03: Accept Asset Handover
  const handleConfirmAccept = () => {
    if (!selectedAsset) return;
    setAssets((prev) =>
      prev.map((a) =>
        a._id === selectedAsset._id ? { ...a, status: 'assigned' as const } : a,
      ),
    );
    setIsAcceptModalOpen(false);
    setAlertBanner({
      message: `${selectedAsset.assetCode} custody successfully acknowledged!`,
      type: 'success',
    });
  };

  // FR-ESS-04: Initiate Return Request
  const handleSubmitReturn = () => {
    if (!selectedAsset) return;
    const newReq: IRequest = {
      _id: `req-${Date.now()}`,
      requestNumber: `REQ-2026-000${requests.length + 10}`,
      type: 'return',
      requestType: { _id: 'rt-return', name: 'Asset Return', module: 'assignment' } as any,
      requestor: { _id: 'emp-01', username: 'yohannes.a' } as any,
      targetAsset: selectedAsset as any,
      payload: { reason: returnReason, conditionNotes: returnNotes },
      status: 'submitted',
      workflowInstance: null,
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newReq, ...prev]);
    setIsReturnModalOpen(false);
    setAlertBanner({
      message: `Return request ${newReq.requestNumber} for ${selectedAsset.assetCode} submitted!`,
      type: 'success',
    });
  };

  // FR-ESS-05: Report Damage / Issue
  const handleSubmitIssue = () => {
    if (!selectedAsset) return;
    const newReq: IRequest = {
      _id: `req-${Date.now()}`,
      requestNumber: `REQ-2026-000${requests.length + 10}`,
      type: 'damage_loss',
      requestType: { _id: 'rt-maint', name: 'Equipment Maintenance', module: 'maintenance' } as any,
      requestor: { _id: 'emp-01', username: 'yohannes.a' } as any,
      targetAsset: selectedAsset as any,
      payload: {
        issueType,
        severity: issueSeverity,
        description: issueDescription,
        photos: issuePhotos,
      },
      status: 'submitted',
      workflowInstance: null,
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newReq, ...prev]);
    setIsIssueModalOpen(false);
    setAlertBanner({
      message: `Issue ticket ${newReq.requestNumber} logged for maintenance inspection!`,
      type: 'success',
    });
  };

  // FR-ESS-01: Create Allocation Request (3 Steps max)
  const handleSubmitNewRequest = () => {
    const newReq: IRequest = {
      _id: `req-${Date.now()}`,
      requestNumber: `REQ-2026-000${requests.length + 10}`,
      type: 'asset_allocation',
      requestType: { _id: 'rt-alloc', name: 'Hardware Allocation', module: 'assignment' } as any,
      requestor: { _id: 'emp-01', username: 'yohannes.a' } as any,
      payload: {
        item: requestedPropertyType,
        justification: requestJustification,
        urgency: requestUrgency,
        specifications: requestSpecs,
      },
      status: 'submitted',
      workflowInstance: null,
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newReq, ...prev]);
    setIsNewRequestModalOpen(false);
    setRequestStep(1);
    setRequestJustification('');
    setAlertBanner({
      message: `Allocation request ${newReq.requestNumber} submitted successfully!`,
      type: 'success',
    });
  };

  // Cancel Request Lifecycle
  const handleConfirmCancel = () => {
    if (!selectedRequest) return;
    setRequests((prev) =>
      prev.map((r) =>
        r._id === selectedRequest._id ? { ...r, status: 'cancelled' as const } : r,
      ),
    );
    setIsCancelModalOpen(false);
    setAlertBanner({
      message: `Request ${selectedRequest.requestNumber} was cancelled.`,
      type: 'info',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 font-sans">
      {/* Top Application Banner */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-am-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              AM
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                {t.portalTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px] sm:max-w-none">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Language Switcher */}
            <button
              onClick={() => setLocale(locale === 'en' ? 'am' : 'en')}
              aria-label="Toggle Language"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-am-primary-500" />
              <span>{locale === 'en' ? 'አማርኛ' : 'English'}</span>
            </button>

            {/* Profile Pill */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <div className="w-5 h-5 rounded-full bg-am-accent-500 text-white flex items-center justify-center text-[10px] font-bold">
                YA
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {locale === 'am' ? 'ዮሐንስ አበጋዝ' : 'Yohannes Abegaz'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (min 44x44px mobile friendly) */}
        <div role="tablist" aria-label="Portal Navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 border-t border-slate-100 dark:border-slate-800/80">
          <button
            role="tab"
            onClick={() => setActiveTab('assets')}
            aria-selected={activeTab === 'assets'}
            className={`min-h-[44px] flex items-center space-x-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'assets'
                ? 'border-am-primary-500 text-am-primary-600 dark:text-am-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{t.myAssets}</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {assets.length}
            </span>
          </button>

          <button
            role="tab"
            onClick={() => setActiveTab('requests')}
            aria-selected={activeTab === 'requests'}
            className={`min-h-[44px] flex items-center space-x-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'requests'
                ? 'border-am-primary-500 text-am-primary-600 dark:text-am-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.myRequests}</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {requests.length}
            </span>
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {alertBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className={`p-3.5 rounded-lg flex items-center justify-between border ${
              alertBanner.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
            }`}
          >
            <div className="flex items-center space-x-2 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{alertBanner.message}</span>
            </div>
            <button
              onClick={() => setAlertBanner(null)}
              className="text-slate-500 hover:text-slate-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* FR-ESS-08: Personal Dashboard KPI Row (Active Assets, Pending Requests, Open Issues) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.totalAssets}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{assignedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-am-primary-500 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div
            className={`bg-white dark:bg-slate-900 border rounded-xl p-4 flex items-center justify-between shadow-xs ${
              pendingCount > 0
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.pendingAcceptance}</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.activeRequests}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{activeReqCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.openMaintenanceIssues}</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{openMaintenanceCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TAB 1: MY ASSETS (FR-ESS-02) */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-am-primary-500"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { key: 'all', label: t.filterAll },
                  { key: 'assigned', label: t.filterAssigned },
                  { key: 'pending_acceptance', label: t.filterPending },
                  { key: 'maintenance', label: t.filterMaintenance },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAssetStatusFilter(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                      assetStatusFilter === item.key
                        ? 'bg-am-primary-500 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Cards Grid (FR-ESS-01) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset._id}
                  asset={asset}
                  locale={locale}
                  onAccept={(a) => {
                    setSelectedAsset(a);
                    setIsAcceptModalOpen(true);
                  }}
                  onReturn={(a) => {
                    setSelectedAsset(a);
                    setIsReturnModalOpen(true);
                  }}
                  onReportIssue={(a) => {
                    setSelectedAsset(a);
                    setIsIssueModalOpen(true);
                  }}
                  onViewHistory={(a) => {
                    setSelectedAsset(a);
                    setIsHistoryModalOpen(true);
                  }}
                  onViewQr={(a) => {
                    setSelectedAsset(a);
                    setIsQrModalOpen(true);
                  }}
                />
              ))}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {locale === 'am' ? 'ምንም ንብረት አልተገኘም' : 'No assets match your search'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY REQUESTS (FR-ESS-07) */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Header & Create Request CTA */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {locale === 'am' ? 'የቀረቡ ጥያቄዎች ዝርዝር' : 'Track Submitted Requests'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'am'
                    ? 'የቀረቡ የንብረት ድልድል፣ መመለሻ እና የብልሽት ሪፖርቶች ሁኔታ'
                    : 'Real-time lifecycle tracking for allocations, returns, and maintenance reports'}
                </p>
              </div>

              <button
                onClick={() => {
                  setRequestStep(1);
                  setIsNewRequestModalOpen(true);
                }}
                aria-label={t.newRequestBtn}
                className="w-full sm:w-auto min-h-[44px] bg-am-primary-500 hover:bg-am-primary-600 text-white font-medium text-sm rounded-lg px-4 py-2 flex items-center justify-center space-x-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t.newRequestBtn}</span>
              </button>
            </div>

            {/* Request Filter Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {[
                { key: 'all', label: 'All Requests' },
                { key: 'submitted', label: 'Submitted' },
                { key: 'in_review', label: 'In Review' },
                { key: 'approved', label: 'Approved' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRequestStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                    requestStatusFilter === tab.key
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Requests List */}
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const isCancellable = req.status === 'submitted' || req.status === 'in_review';
                const typeLabel = {
                  asset_allocation: 'Allocation',
                  return: 'Return',
                  transfer: 'Transfer',
                  damage_loss: 'Issue Report',
                }[req.type] || req.type;

                const statusStyle = {
                  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
                  in_review: 'bg-amber-50 text-amber-700 border-amber-200',
                  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
                  completed: 'bg-slate-100 text-slate-700 border-slate-200',
                  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
                  returned_for_clarification: 'bg-purple-50 text-purple-700 border-purple-200',
                }[req.status] || 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <div
                    key={req._id}
                    data-testid={`request-item-${req._id}`}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold text-am-primary-600 dark:text-am-primary-400">
                          {req.requestNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {typeLabel}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                          {req.status}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {req.payload?.justification || req.payload?.description || req.payload?.reason || 'Property Request'}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>Submitted: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}</span>
                        {req.targetAsset && (
                          <span>Target: {(req.targetAsset as any).assetCode || (req.targetAsset as any).name}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {isCancellable && (
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsCancelModalOpen(true);
                          }}
                          aria-label={`Cancel request ${req.requestNumber}`}
                          className="min-h-[44px] px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredRequests.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {locale === 'am' ? 'ምንም ጥያቄ አልተገኘም' : 'No requests in this view'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL 1: ACCEPT HANDOVER (FR-ESS-03) ── */}
      {isAcceptModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.acceptDialogTitle}
              </h3>
              <button
                onClick={() => setIsAcceptModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t.acceptDialogDesc}
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.name}</p>
              <p className="font-mono text-slate-500">{selectedAsset.assetCode}</p>
              <p className="text-slate-600 dark:text-slate-400">Value: {selectedAsset.value} {selectedAsset.currency}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {locale === 'am' ? 'የንብረቱ ሁኔታ ማረጋገጫ' : 'Physical Condition Acknowledgement'}
              </label>
              <input
                type="text"
                value={acceptConditionNotes}
                onChange={(e) => setAcceptConditionNotes(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-am-primary-500"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setIsAcceptModalOpen(false)}
                className="flex-1 min-h-[44px] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.closeBtn}
              </button>
              <button
                onClick={handleConfirmAccept}
                className="flex-1 min-h-[44px] bg-am-accent-500 hover:bg-am-accent-700 text-white font-semibold text-sm rounded-lg shadow-xs"
              >
                {t.confirmAcceptBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: INITIATE RETURN (FR-ESS-04) ── */}
      {isReturnModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.returnDialogTitle}
              </h3>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t.returnDialogDesc}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.returnReasonLabel}
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.conditionNotesLabel}
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Returned with original charger and case"
                  className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="flex-1 min-h-[44px] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100"
              >
                {t.closeBtn}
              </button>
              <button
                onClick={handleSubmitReturn}
                className="flex-1 min-h-[44px] bg-am-primary-500 hover:bg-am-primary-600 text-white font-semibold text-sm rounded-lg shadow-xs"
              >
                {t.submitReturnBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: REPORT DAMAGE / LOSS (FR-ESS-05) ── */}
      {isIssueModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.issueDialogTitle}
              </h3>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t.issueDialogDesc}
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {t.issueTypeLabel}
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as any)}
                    className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="damage">Physical Damage (ብልሽት)</option>
                    <option value="malfunction">Technical Malfunction (አለማከናወን)</option>
                    <option value="loss">Lost / Theft (መጥፋት)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {t.severityLabel}
                  </label>
                  <select
                    value={issueSeverity}
                    onChange={(e) => setIssueSeverity(e.target.value as any)}
                    className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="minor">Minor (ቀላል)</option>
                    <option value="moderate">Moderate (መካከለኛ)</option>
                    <option value="severe">Severe (ከባድ)</option>
                    <option value="critical">Critical / Total Failure (ሙሉ ብልሽት)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.descriptionLabel}
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe when and how the damage or malfunction occurred..."
                  className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Photo Evidence
                </label>
                <div className="mt-1 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 text-center">
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Attach photo evidence of the damage</p>
                  <button
                    type="button"
                    onClick={() => setIssuePhotos(['http://localhost:9000/am-pms-dev/damage-sample.png'])}
                    className="mt-1.5 text-xs text-am-primary-600 dark:text-am-primary-400 font-semibold hover:underline"
                  >
                    {issuePhotos.length > 0 ? 'Photo Attached (1)' : t.addPhotoBtn}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="flex-1 min-h-[44px] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium"
              >
                {t.closeBtn}
              </button>
              <button
                onClick={handleSubmitIssue}
                disabled={!issueDescription.trim()}
                className="flex-1 min-h-[44px] bg-am-primary-500 hover:bg-am-primary-600 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-xs"
              >
                {t.submitIssueBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: NEW ALLOCATION REQUEST (FR-ESS-06) — 3 STEPS MAX ── */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.newRequestBtn}
              </h3>
              <button
                onClick={() => setIsNewRequestModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Indicator (Rule: 3 Steps Max) */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 text-xs font-semibold">
              <span className={requestStep === 1 ? 'text-am-primary-600 dark:text-am-primary-400 font-bold' : 'text-slate-400'}>
                {t.reqStep1}
              </span>
              <span>→</span>
              <span className={requestStep === 2 ? 'text-am-primary-600 dark:text-am-primary-400 font-bold' : 'text-slate-400'}>
                {t.reqStep2}
              </span>
              <span>→</span>
              <span className={requestStep === 3 ? 'text-am-primary-600 dark:text-am-primary-400 font-bold' : 'text-slate-400'}>
                {t.reqStep3}
              </span>
            </div>

            {/* Step 1: Select Property Type */}
            {requestStep === 1 && (
              <div className="space-y-3 text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Required Item Category / Property Type
                </label>
                <select
                  value={requestedPropertyType}
                  onChange={(e) => setRequestedPropertyType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="Laptop - High Performance">Laptop - High Performance (ላፕቶፕ)</option>
                  <option value="External Display">External 4K Display (ሞኒተር)</option>
                  <option value="USB-C Universal Docking Station">USB-C Docking Station (ዶኪንግ ስቴሽን)</option>
                  <option value="Office Executive Chair">Office Executive Chair (ወንበር)</option>
                </select>
              </div>
            )}

            {/* Step 2: Specs & Urgency */}
            {requestStep === 2 && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Requested Specifications
                  </label>
                  <input
                    type="text"
                    value={requestSpecs}
                    onChange={(e) => setRequestSpecs(e.target.value)}
                    className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Urgency Level
                  </label>
                  <select
                    value={requestUrgency}
                    onChange={(e) => setRequestUrgency(e.target.value as any)}
                    className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="low">Low (መደበኛ)</option>
                    <option value="medium">Medium (መካከለኛ)</option>
                    <option value="high">High (አስቸኳይ)</option>
                    <option value="critical">Critical (እጅግ በጣም አስቸኳይ)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Justification & Review */}
            {requestStep === 3 && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{requestedPropertyType}</p>
                  <p className="text-slate-500">Specs: {requestSpecs} • Urgency: {requestUrgency}</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Business Justification
                  </label>
                  <textarea
                    value={requestJustification}
                    onChange={(e) => setRequestJustification(e.target.value)}
                    rows={3}
                    placeholder="Provide operational justification for department review..."
                    className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {requestStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setRequestStep((s) => (s - 1) as any)}
                  className="min-h-[44px] px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium"
                >
                  {t.prevBtn}
                </button>
              ) : (
                <div />
              )}

              {requestStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setRequestStep((s) => (s + 1) as any)}
                  className="min-h-[44px] px-5 py-2 bg-am-primary-500 hover:bg-am-primary-600 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  {t.nextBtn}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitNewRequest}
                  disabled={!requestJustification.trim()}
                  className="min-h-[44px] px-5 py-2 bg-am-accent-500 hover:bg-am-accent-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  {t.submitReqBtn}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: CANCEL REQUEST (FR-ESS-08) ── */}
      {isCancelModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.cancelRequestTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t.cancelRequestDesc} ({selectedRequest.requestNumber})
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.cancelReasonLabel}
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 min-h-[44px] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium"
              >
                {t.keepRequestBtn}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-lg shadow-xs"
              >
                {t.confirmCancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: CUSTODY TIMELINE (FR-ESS-02) ── */}
      {isHistoryModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.historyTitle}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedAsset.assetCode}</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Milestones timeline */}
            <div className="space-y-3 text-xs pl-2 border-l-2 border-am-primary-500/30">
              <div className="relative pl-4">
                <div className="w-2.5 h-2.5 rounded-full bg-am-primary-500 absolute -left-[19px] top-1" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">Asset Registered into Inventory</p>
                <p className="text-slate-500">HQ Central Store • {new Date(selectedAsset.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="relative pl-4">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[19px] top-1" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">Handover Assigned to Yohannes Abegaz</p>
                <p className="text-slate-500">Condition: Good • Verified by Property Officer</p>
              </div>

              {selectedAsset.status === 'assigned' && (
                <div className="relative pl-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-am-accent-500 absolute -left-[19px] top-1" />
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">Current Custody Active</p>
                  <p className="text-slate-500">Active In Use</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="w-full min-h-[44px] bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 7: QR CODE QUICK VIEW (FR-REG-03) ── */}
      {isQrModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-xl text-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {selectedAsset.assetCode}
            </h3>
            <div className="w-48 h-48 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl p-3 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <QrCode className="w-36 h-36 text-slate-900 dark:text-white" />
            </div>
            <p className="text-xs text-slate-500">{selectedAsset.name}</p>
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full min-h-[44px] bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
