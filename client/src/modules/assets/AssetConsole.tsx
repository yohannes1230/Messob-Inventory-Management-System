import React, { useState } from 'react';
import { DataTable, type Column } from '../../design-system/DataTable.js';
import { DynamicForm, type FormFieldDef } from '../../design-system/DynamicForm.js';
import {
  Plus,
  Globe,
  QrCode,
  Camera,
  Upload,
  UserCheck,
  RotateCcw,
  ArrowRightLeft,
  History,
  CheckCircle,
  AlertCircle,
  X,
  Layers,
  Search,
} from 'lucide-react';
import mesobIcon from '../../assets/branding/mesob-icon.png';

export interface AssetRecord {
  _id: string;
  assetCode: string;
  name: string;
  propertyTypeName: string;
  categoryName: string;
  branchName: string;
  status: 'available' | 'pending_acceptance' | 'assigned' | 'in_transfer' | 'maintenance' | 'lost' | 'disposed';
  custodianName?: string;
  custodianType?: string;
  value: number;
  currency: string;
  qrPayload: string;
  barcodeFormat: string;
  photos: { url: string; caption?: string }[];
  customFieldValues: Record<string, any>;
  version: number;
  createdAt: string;
}

export interface CustodyTimelineItem {
  timestamp: string;
  action: 'registered' | 'assigned' | 'accepted' | 'transferred' | 'returned' | 'maintenance';
  actor?: string;
  custodian?: string;
  condition?: string;
  notes?: string;
}

export interface AssetConsoleProps {
  initialLang?: 'en' | 'am';
}

export const AssetConsole: React.FC<AssetConsoleProps> = ({ initialLang = 'en' }) => {
  const [lang, setLang] = useState<'en' | 'am'>(initialLang);
  const isAm = lang === 'am';

  // Active filter tab
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<AssetRecord | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState<AssetRecord | null>(null);
  const [showCustodyModal, setShowCustodyModal] = useState<{ asset: AssetRecord; mode: 'assign' | 'return' | 'transfer' } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<AssetRecord | null>(null);

  // Bulk Import state
  const [bulkImportData, setBulkImportData] = useState<string>('');
  const [dryRunReport, setDryRunReport] = useState<{
    totalRows: number;
    validRowsCount: number;
    invalidRowsCount: number;
    rowReports: { rowIndex: number; name: string; isValid: boolean; errors: string[]; warnings: string[] }[];
  } | null>(null);

  // Custody Form State
  const [custodyTarget, setCustodyTarget] = useState({
    type: 'employee',
    refName: 'Abebe Bikila',
    notes: '',
    condition: 'Good',
    targetStatus: 'available',
  });

  // Sample seed data for interactive console
  const [assets, setAssets] = useState<AssetRecord[]>([
    {
      _id: 'ast-001',
      assetCode: 'AM-HQ-ITE-2026-00001',
      name: 'Dell Latitude 5420 Laptop',
      propertyTypeName: 'Laptop',
      categoryName: 'IT Equipment',
      branchName: 'Headquarters',
      status: 'assigned',
      custodianName: 'Almaz Ayana (EMP-102)',
      custodianType: 'employee',
      value: 48000,
      currency: 'ETB',
      qrPayload: 'AM-PMS://assets/ast-001?code=AM-HQ-ITE-2026-00001',
      barcodeFormat: 'CODE128',
      photos: [{ url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300', caption: 'Front view' }],
      customFieldValues: { serial_number: 'DELL-5420-SN10', ram_gb: 16 },
      version: 2,
      createdAt: '2026-08-15T09:00:00Z',
    },
    {
      _id: 'ast-002',
      assetCode: 'AM-HQ-ITE-2026-00002',
      name: 'HP LaserJet Pro M404dn',
      propertyTypeName: 'Printer',
      categoryName: 'Office Equipment',
      branchName: 'Headquarters',
      status: 'available',
      value: 26500,
      currency: 'ETB',
      qrPayload: 'AM-PMS://assets/ast-002?code=AM-HQ-ITE-2026-00002',
      barcodeFormat: 'CODE128',
      photos: [],
      customFieldValues: { serial_number: 'HP-M404-9844' },
      version: 1,
      createdAt: '2026-08-20T11:30:00Z',
    },
    {
      _id: 'ast-003',
      assetCode: 'AM-AA-ITE-2026-00003',
      name: 'Apple MacBook Pro 14"',
      propertyTypeName: 'Laptop',
      categoryName: 'IT Equipment',
      branchName: 'Addis Ababa Branch',
      status: 'maintenance',
      custodianName: 'ICT Repair Lab',
      custodianType: 'room',
      value: 120000,
      currency: 'ETB',
      qrPayload: 'AM-PMS://assets/ast-003?code=AM-AA-ITE-2026-00003',
      barcodeFormat: 'CODE128',
      photos: [],
      customFieldValues: { serial_number: 'MBP-M2-0099' },
      version: 3,
      createdAt: '2026-08-22T14:15:00Z',
    },
  ]);

  // Timelines state per asset
  const [timelines, setTimelines] = useState<Record<string, CustodyTimelineItem[]>>({
    'ast-001': [
      { timestamp: '2026-08-15 09:00', action: 'registered', actor: 'Store Keeper (Kenenisa)', notes: 'Initial receipt registration' },
      { timestamp: '2026-08-16 10:30', action: 'assigned', actor: 'Property Officer (Haile)', custodian: 'Almaz Ayana', condition: 'Brand New' },
      { timestamp: '2026-08-16 14:00', action: 'accepted', actor: 'Almaz Ayana', custodian: 'Almaz Ayana', notes: 'Accepted via self-service' },
    ],
    'ast-002': [
      { timestamp: '2026-08-20 11:30', action: 'registered', actor: 'Store Keeper (Kenenisa)', notes: 'Bulk import receipt intake' },
    ],
    'ast-003': [
      { timestamp: '2026-08-22 14:15', action: 'registered', actor: 'Store Keeper' },
      { timestamp: '2026-08-23 09:00', action: 'assigned', custodian: 'Derartu Tulu' },
      { timestamp: '2026-08-28 16:00', action: 'returned', custodian: 'Derartu Tulu', condition: 'Screen flickering', notes: 'Sent to maintenance' },
      { timestamp: '2026-08-29 08:30', action: 'maintenance', actor: 'ICT Lab' },
    ],
  });

  // Filtered records
  const filteredAssets = statusFilter === 'all'
    ? assets
    : assets.filter((a) => a.status === statusFilter);

  // Status Badge Styling
  const getStatusBadge = (status: AssetRecord['status']) => {
    switch (status) {
      case 'available':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{isAm ? 'ዝግጁ' : 'Available'}</span>;
      case 'assigned':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{isAm ? 'የተመደበ' : 'Assigned'}</span>;
      case 'pending_acceptance':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{isAm ? 'ማረጋገጫ በመጠባበቅ' : 'Pending Acceptance'}</span>;
      case 'maintenance':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">{isAm ? 'ጥገና ላይ' : 'Maintenance'}</span>;
      case 'lost':
      case 'disposed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">{isAm ? 'የተወገደ / የጠፋ' : status}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  // DataTable Columns
  const columns: Column<AssetRecord>[] = [
    {
      key: 'assetCode',
      header: isAm ? 'የንብረት ኮድ' : 'Asset Code',
      sortable: true,
      render: (val, row) => (
        <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {val}
        </div>
      ),
    },
    {
      key: 'name',
      header: isAm ? 'ስም' : 'Name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{val}</div>
          <div className="text-xs text-slate-500">{row.propertyTypeName} • {row.categoryName}</div>
        </div>
      ),
    },
    {
      key: 'branchName',
      header: isAm ? 'ቅርንጫፍ' : 'Branch',
      sortable: true,
    },
    {
      key: 'status',
      header: isAm ? 'ሁኔታ' : 'Status',
      render: (val) => getStatusBadge(val as any),
    },
    {
      key: 'custodianName',
      header: isAm ? 'የያዘው አካል' : 'Custodian',
      render: (val) => val ? (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{val}</span>
      ) : (
        <span className="text-xs text-slate-400 italic">{isAm ? 'አልተመደበም' : 'Unassigned'}</span>
      ),
    },
    {
      key: 'value',
      header: isAm ? 'ዋጋ' : 'Value',
      sortable: true,
      render: (val, row) => `${Number(val).toLocaleString()} ${row.currency}`,
    },
    {
      key: '_actions',
      header: isAm ? 'ተግባራት' : 'Actions',
      render: (_val, row) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowQrModal(row)}
            aria-label={isAm ? 'የQR ኮድ ይመልከቱ' : 'View QR & Barcode'}
            title={isAm ? 'QR ኮድ' : 'QR & Barcode'}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPhotoModal(row)}
            aria-label={isAm ? 'ፎቶዎችን ይመልከቱ' : 'Photos'}
            title={isAm ? 'ፎቶዎች' : 'Photos'}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          {row.status === 'available' && (
            <button
              onClick={() => setShowCustodyModal({ asset: row, mode: 'assign' })}
              aria-label={isAm ? 'ንብረት መድብ' : 'Assign Asset'}
              title={isAm ? 'መድብ' : 'Assign'}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          )}
          {row.status === 'assigned' && (
            <>
              <button
                onClick={() => setShowCustodyModal({ asset: row, mode: 'return' })}
                aria-label={isAm ? 'ንብረት መልስ' : 'Return Asset'}
                title={isAm ? 'መልስ' : 'Return'}
                className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCustodyModal({ asset: row, mode: 'transfer' })}
                aria-label={isAm ? 'ንብረት አስተላልፍ' : 'Transfer Asset'}
                title={isAm ? 'አስተላልፍ' : 'Transfer'}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowHistoryModal(row)}
            aria-label={isAm ? 'የክንውን ታሪክ' : 'Custody Timeline History'}
            title={isAm ? 'የክንውን ታሪክ' : 'Custody Timeline'}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Dynamic Form field definitions for Asset Registration
  const assetFormFields: FormFieldDef[] = [
    {
      name: 'name',
      label: 'Asset Name',
      labelAm: 'የንብረት ስም',
      dataType: 'text',
      isRequired: true,
    },
    {
      name: 'propertyType',
      label: 'Property Type',
      labelAm: 'የንብረት ዓይነት',
      dataType: 'single_select',
      isRequired: true,
      options: ['Laptop', 'Desktop', 'Printer', 'Office Desk', 'Vehicle'],
    },
    {
      name: 'branch',
      label: 'Branch Location',
      labelAm: 'ቅርንጫፍ',
      dataType: 'single_select',
      isRequired: true,
      options: ['Headquarters', 'Addis Ababa Branch', 'Hawassa Branch'],
    },
    {
      name: 'value',
      label: 'Value (ETB)',
      labelAm: 'ዋጋ (ብር)',
      dataType: 'number',
      isRequired: true,
    },
    // Dynamic Custom Fields defined for Laptop PropertyType
    {
      name: 'serial_number',
      label: 'Serial Number',
      labelAm: 'የመለያ ቁጥር',
      dataType: 'text',
      isRequired: true,
    },
    {
      name: 'warranty_expiry',
      label: 'Warranty Expiry Date',
      labelAm: 'የዋስትና ማብቂያ ቀን',
      dataType: 'date',
    },
  ];

  // Handle Asset Creation
  const handleRegisterAsset = (values: Record<string, any>) => {
    const nextSeq = String(assets.length + 1).padStart(5, '0');
    const branchCode = values.branch === 'Headquarters' ? 'HQ' : 'AA';
    const autoCode = `AM-${branchCode}-ITE-2026-${nextSeq}`;
    const newId = `ast-${Date.now()}`;

    const newAsset: AssetRecord = {
      _id: newId,
      assetCode: autoCode,
      name: values.name,
      propertyTypeName: values.propertyType || 'Laptop',
      categoryName: 'IT Equipment',
      branchName: values.branch,
      status: 'available',
      value: Number(values.value) || 0,
      currency: 'ETB',
      qrPayload: `AM-PMS://assets/${newId}?code=${autoCode}`,
      barcodeFormat: 'CODE128',
      photos: [],
      customFieldValues: {
        serial_number: values.serial_number,
        warranty_expiry: values.warranty_expiry,
      },
      version: 1,
      createdAt: new Date().toISOString(),
    };

    setAssets([newAsset, ...assets]);
    setTimelines({
      ...timelines,
      [newId]: [
        {
          timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
          action: 'registered',
          actor: 'Store Keeper',
          notes: `Asset registered with auto-code ${autoCode}`,
        },
      ],
    });

    setShowRegisterModal(false);
  };

  // Handle Bulk Import Dry-Run Pre-Validation
  const handleDryRunValidation = () => {
    const rawRows = bulkImportData.trim().split('\n').filter((l) => l.trim().length > 0);
    const rowReports = rawRows.map((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      const name = parts[0] || `Row #${idx + 1}`;
      const branchCode = parts[1] || '';
      const serialNumber = parts[2] || '';

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!parts[0]) errors.push('Asset name is required');
      if (!branchCode || (branchCode !== 'HQ' && branchCode !== 'AA')) {
        errors.push(`Invalid branch code '${branchCode}' (must be HQ or AA)`);
      }
      if (!serialNumber) {
        errors.push("Required custom field 'Serial Number' is missing");
      }

      const isValid = errors.length === 0;
      return { rowIndex: idx + 1, name, isValid, errors, warnings };
    });

    const validRowsCount = rowReports.filter((r) => r.isValid).length;
    const invalidRowsCount = rowReports.length - validRowsCount;

    setDryRunReport({
      totalRows: rowReports.length,
      validRowsCount,
      invalidRowsCount,
      rowReports,
    });
  };

  // Handle Bulk Import Commit
  const handleCommitBulkImport = () => {
    if (!dryRunReport || dryRunReport.invalidRowsCount > 0) return;

    const newAssets: AssetRecord[] = dryRunReport.rowReports.map((r, i) => {
      const code = `AM-HQ-ITE-2026-${String(assets.length + i + 1).padStart(5, '0')}`;
      const id = `ast-bulk-${Date.now()}-${i}`;
      return {
        _id: id,
        assetCode: code,
        name: r.name,
        propertyTypeName: 'Laptop',
        categoryName: 'IT Equipment',
        branchName: 'Headquarters',
        status: 'available',
        value: 35000,
        currency: 'ETB',
        qrPayload: `AM-PMS://assets/${id}?code=${code}`,
        barcodeFormat: 'CODE128',
        photos: [],
        customFieldValues: { serial_number: `BULK-SN-${i + 1}` },
        version: 1,
        createdAt: new Date().toISOString(),
      };
    });

    setAssets([...newAssets, ...assets]);
    setShowBulkImportModal(false);
    setDryRunReport(null);
    setBulkImportData('');
  };

  // Handle Custody Action (Assign, Return, Transfer)
  const handleCustodyActionSubmit = () => {
    if (!showCustodyModal) return;
    const { asset, mode } = showCustodyModal;
    const now = new Date().toISOString().substring(0, 16).replace('T', ' ');

    if (mode === 'assign') {
      const updated = assets.map((a) =>
        a._id === asset._id
          ? { ...a, status: 'assigned' as const, custodianName: custodyTarget.refName, custodianType: custodyTarget.type }
          : a,
      );
      setAssets(updated);
      const prevEvents = timelines[asset._id] || [];
      setTimelines({
        ...timelines,
        [asset._id]: [
          ...prevEvents,
          { timestamp: now, action: 'assigned', custodian: custodyTarget.refName, condition: custodyTarget.condition, notes: custodyTarget.notes },
        ],
      });
    } else if (mode === 'return') {
      const targetSt = (custodyTarget.targetStatus || 'available') as AssetRecord['status'];
      const updated = assets.map((a) =>
        a._id === asset._id
          ? { ...a, status: targetSt, custodianName: undefined, custodianType: undefined }
          : a,
      );
      setAssets(updated);
      const prevEvents = timelines[asset._id] || [];
      setTimelines({
        ...timelines,
        [asset._id]: [
          ...prevEvents,
          { timestamp: now, action: 'returned', custodian: asset.custodianName, condition: custodyTarget.condition, notes: custodyTarget.notes },
        ],
      });
    } else if (mode === 'transfer') {
      const updated = assets.map((a) =>
        a._id === asset._id
          ? { ...a, custodianName: custodyTarget.refName, custodianType: custodyTarget.type }
          : a,
      );
      setAssets(updated);
      const prevEvents = timelines[asset._id] || [];
      setTimelines({
        ...timelines,
        [asset._id]: [
          ...prevEvents,
          { timestamp: now, action: 'transferred', custodian: custodyTarget.refName, notes: custodyTarget.notes },
        ],
      });
    }

    setShowCustodyModal(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src={mesobIcon} alt="Addis Mesob" className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-am-accent-500/50" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isAm ? 'የንብረት አስተዳደር እና የጅምላ ማስመጣት' : 'Asset Management & Bulk Import'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAm
                  ? 'ራስ-ሰር ኮድ አመንጪ፣ የQR ኮድ፣ የባለቤትነት ሽግግር እና ሙሉ የታሪክ መዝገብ'
                  : 'Auto-sequence generator, QR/barcode, custody transfers, and chronological audit history'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Language Switch */}
            <button
              onClick={() => setLang(isAm ? 'en' : 'am')}
              aria-label={isAm ? 'ወደ እንግሊዝኛ ቀይር' : 'Switch to Amharic'}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-am-primary-500" />
              <span>{isAm ? 'English' : 'አማርኛ'}</span>
            </button>

            {/* Bulk Import Button */}
            <button
              onClick={() => {
                setShowBulkImportModal(true);
                setDryRunReport(null);
                setBulkImportData('Dell Vostro 3510, HQ, SN-VOSTRO-001\nLenovo ThinkPad E14, AA, SN-LENOVO-002\nInvalid Row Test, BAD_BRANCH, \n');
              }}
              aria-label={isAm ? 'በጅምላ አስመጣ' : 'Bulk Import Assets'}
              className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-md border border-am-primary-500 text-am-primary-500 hover:bg-am-primary-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isAm ? 'በጅምላ አስመጣ' : 'Bulk Import'}</span>
            </button>

            {/* Register Asset Button */}
            <button
              onClick={() => setShowRegisterModal(true)}
              aria-label={isAm ? 'አዲስ ንብረት መዝግብ' : 'Register New Asset'}
              className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-am-primary-500 hover:bg-am-primary-600 text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAm ? 'አዲስ ንብረት' : 'Register Asset'}</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <nav aria-label={isAm ? 'የሁኔታ ማጣሪያዎች' : 'Status Filters'} className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Assets', labelAm: 'ሁሉም ንብረቶች' },
            { id: 'available', label: 'Available', labelAm: 'ዝግጁ' },
            { id: 'assigned', label: 'Assigned', labelAm: 'የተመደበ' },
            { id: 'maintenance', label: 'Maintenance', labelAm: 'ጥገና ላይ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isAm ? tab.labelAm : tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area with DataTable */}
      <main className="p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
          <DataTable
            data={filteredAssets}
            columns={columns}
            limit={10}
            lang={lang}
            emptyMessage={isAm ? 'ምንም የተመዘገበ ንብረት አልተገኘም' : 'No assets registered in this view'}
          />
        </div>
      </main>

      {/* Modal 1: Asset Registration Modal */}
      {showRegisterModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="register-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 id="register-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {isAm ? 'አዲስ ንብረት መመዝገቢያ ቅጽ' : 'Register New Asset'}
              </h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                aria-label={isAm ? 'ዝጋ' : 'Close'}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <DynamicForm
                fields={assetFormFields}
                onSubmit={handleRegisterAsset}
                submitLabel={isAm ? 'መዝግብና የQR ኮድ አመንጭ' : 'Register & Generate Code'}
                lang={lang}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Bulk Import Modal with Dry-Run Pre-Validation Report */}
      {showBulkImportModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h2 id="bulk-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {isAm ? 'በጅምላ ንብረት ማስመጣት (FR-REG-04)' : 'Bulk Asset Import (FR-REG-04)'}
                </h2>
              </div>
              <button
                onClick={() => setShowBulkImportModal(false)}
                aria-label={isAm ? 'ዝጋ' : 'Close'}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              {isAm
                ? 'የCSV ቅርጸት: የስም፣ የቅርንጫፍ ኮድ (HQ/AA)፣ የመለያ ቁጥር'
                : 'CSV format: Asset Name, Branch Code (HQ/AA), Serial Number'}
            </p>

            <textarea
              value={bulkImportData}
              onChange={(e) => setBulkImportData(e.target.value)}
              aria-label={isAm ? 'የጅምላ ውሂብ' : 'Bulk Data Input'}
              rows={5}
              className="w-full mt-2 font-mono text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="Asset Name, BranchCode, SerialNumber"
            />

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={handleDryRunValidation}
                aria-label={isAm ? 'ቅድመ-ማረጋገጫ አከናውን' : 'Run Pre-Import Validation'}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                {isAm ? 'ቅድመ-ማረጋገጫ ሪፖርት (Dry Run)' : 'Pre-validate (Dry Run)'}
              </button>

              {dryRunReport && (
                <button
                  onClick={handleCommitBulkImport}
                  disabled={dryRunReport.invalidRowsCount > 0}
                  aria-label={isAm ? 'አስመጣና መዝግብ' : 'Commit Valid Rows'}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors ${
                    dryRunReport.invalidRowsCount > 0
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isAm ? `ማስመጣቱን ፈጽም (${dryRunReport.validRowsCount})` : `Commit Import (${dryRunReport.validRowsCount} items)`}
                </button>
              )}
            </div>

            {/* Dry-run validation report output */}
            {dryRunReport && (
              <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isAm ? 'የቅድመ-ማረጋገጫ ውጤት ሪፖርት' : 'Pre-Import Validation Report'}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-emerald-600 font-semibold">✓ {dryRunReport.validRowsCount} {isAm ? 'ትክክለኛ' : 'Valid'}</span>
                    <span className="text-rose-600 font-semibold">✗ {dryRunReport.invalidRowsCount} {isAm ? 'የተሳሳተ' : 'Invalid'}</span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">{isAm ? 'ንብረት' : 'Asset'}</th>
                        <th className="p-2">{isAm ? 'ሁኔታ' : 'Status'}</th>
                        <th className="p-2">{isAm ? 'የስህተት ዝርዝር' : 'Reason / Validation Details'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dryRunReport.rowReports.map((r) => (
                        <tr key={r.rowIndex} className={r.isValid ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'bg-rose-50/40 dark:bg-rose-950/20'}>
                          <td className="p-2 font-mono">{r.rowIndex}</td>
                          <td className="p-2 font-semibold">{r.name}</td>
                          <td className="p-2">
                            {r.isValid ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Valid</span>
                            ) : (
                              <span className="text-rose-700 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">
                            {r.isValid ? 'Ready for import' : r.errors.join('; ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: QR Code & Barcode Modal (FR-REG-03) */}
      {showQrModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="qr-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 text-center">
            <h2 id="qr-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {isAm ? 'የንብረት QR እና ባርኮድ መረጃ' : 'QR & Barcode Tag (FR-REG-03)'}
            </h2>
            <p className="text-xs font-mono font-bold text-indigo-600 mt-1">{showQrModal.assetCode}</p>

            <div className="my-6 flex justify-center">
              <div className="p-4 bg-white border-2 border-slate-900 rounded-xl shadow-inner inline-block">
                {/* SVG Visual QR Simulation */}
                <svg className="w-40 h-40" viewBox="0 0 100 100">
                  <rect x="5" y="5" width="30" height="30" fill="black" />
                  <rect x="10" y="10" width="20" height="20" fill="white" />
                  <rect x="15" y="15" width="10" height="10" fill="black" />
                  <rect x="65" y="5" width="30" height="30" fill="black" />
                  <rect x="70" y="10" width="20" height="20" fill="white" />
                  <rect x="75" y="15" width="10" height="10" fill="black" />
                  <rect x="5" y="65" width="30" height="30" fill="black" />
                  <rect x="10" y="70" width="20" height="20" fill="white" />
                  <rect x="15" y="75" width="10" height="10" fill="black" />
                  <rect x="42" y="42" width="16" height="16" fill="black" />
                  <rect x="45" y="10" width="10" height="15" fill="black" />
                  <rect x="45" y="70" width="15" height="10" fill="black" />
                  <rect x="70" y="45" width="20" height="10" fill="black" />
                </svg>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 font-mono">
              <div>Barcode: {showQrModal.barcodeFormat}</div>
              <div className="truncate mt-1">{showQrModal.qrPayload}</div>
            </div>

            <button
              onClick={() => setShowQrModal(null)}
              aria-label={isAm ? 'ዝጋ' : 'Close'}
              className="mt-6 w-full py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              {isAm ? 'ዝጋ' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Modal 4: Photo Gallery Modal (FR-REG-05) */}
      {showPhotoModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="photo-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 id="photo-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {isAm ? 'የንብረት ፎቶዎች (FR-REG-05)' : 'Asset Photos (FR-REG-05)'}
              </h2>
              <button
                onClick={() => setShowPhotoModal(null)}
                aria-label={isAm ? 'ዝጋ' : 'Close'}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              {showPhotoModal.photos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {showPhotoModal.photos.map((p, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                      <img src={p.url} alt={p.caption || 'Asset photo'} className="w-full h-48 object-cover" />
                      {p.caption && (
                        <div className="p-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
                          {p.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  {isAm ? 'ምንም የተያያዘ ፎቶ የለም' : 'No photos attached yet'}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPhotoModal(null)}
              className="mt-6 w-full py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
            >
              {isAm ? 'ዝጋ' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Modal 5: Custody Action Modal (Assign, Return, Transfer) */}
      {showCustodyModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="custody-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 id="custody-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {showCustodyModal.mode === 'assign' && (isAm ? 'ንብረት መድብ / አድል' : 'Assign / Dispatch Asset')}
                {showCustodyModal.mode === 'return' && (isAm ? 'ንብረት መልስ / ተቀበል' : 'Return Asset to Stock')}
                {showCustodyModal.mode === 'transfer' && (isAm ? 'ንብረት አስተላልፍ' : 'Transfer Asset Custodian')}
              </h2>
              <button
                onClick={() => setShowCustodyModal(null)}
                aria-label={isAm ? 'ዝጋ' : 'Close'}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="font-bold">{showCustodyModal.asset.assetCode}</span> - {showCustodyModal.asset.name}
              </div>

              {showCustodyModal.mode !== 'return' && (
                <div>
                  <label htmlFor="custody-target-person" className="block font-semibold mb-1">{isAm ? 'የተቀባይ ስም / መለያ' : 'Target Custodian'}</label>
                  <input
                    id="custody-target-person"
                    type="text"
                    value={custodyTarget.refName}
                    onChange={(e) => setCustodyTarget({ ...custodyTarget, refName: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent"
                  />
                </div>
              )}

              {showCustodyModal.mode === 'return' && (
                <div>
                  <label htmlFor="custody-target-status" className="block font-semibold mb-1">{isAm ? 'የመመለሻ ሁኔታ' : 'Target Status'}</label>
                  <select
                    id="custody-target-status"
                    value={custodyTarget.targetStatus}
                    onChange={(e) => setCustodyTarget({ ...custodyTarget, targetStatus: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent"
                  >
                    <option value="available">{isAm ? 'ዝግጁ (Available)' : 'Available in Store'}</option>
                    <option value="maintenance">{isAm ? 'ጥገና የሚያስፈልገው (Maintenance)' : 'Send to Maintenance'}</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="custody-condition" className="block font-semibold mb-1">{isAm ? 'የንብረቱ ሁኔታ' : 'Condition'}</label>
                <input
                  id="custody-condition"
                  type="text"
                  value={custodyTarget.condition}
                  onChange={(e) => setCustodyTarget({ ...custodyTarget, condition: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent"
                />
              </div>

              <div>
                <label htmlFor="custody-notes" className="block font-semibold mb-1">{isAm ? 'ተጨማሪ ማስታወሻ' : 'Notes / Remarks'}</label>
                <textarea
                  id="custody-notes"
                  value={custodyTarget.notes}
                  onChange={(e) => setCustodyTarget({ ...custodyTarget, notes: e.target.value })}
                  rows={2}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustodyModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {isAm ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCustodyActionSubmit}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {isAm ? 'አረጋግጥ' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Chronological Custody History Modal (FR-ASG-06) */}
      {showHistoryModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="history-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h2 id="history-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {isAm ? 'የንብረት ሙሉ የክንውን ታሪክ (FR-ASG-06)' : 'Custody Timeline History (FR-ASG-06)'}
                </h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(null)}
                aria-label={isAm ? 'ዝጋ' : 'Close'}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              <span className="font-bold text-indigo-600">{showHistoryModal.assetCode}</span> - {showHistoryModal.name}
            </div>

            {/* Chronological Timeline */}
            <div className="mt-6 relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-6">
              {(timelines[showHistoryModal._id] || []).map((ev, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900" />
                  
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {ev.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{ev.timestamp}</span>
                  </div>

                  {ev.custodian && (
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {isAm ? 'የያዘው አካል: ' : 'Custodian: '} {ev.custodian}
                    </div>
                  )}

                  {ev.actor && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {isAm ? 'አካሄጅ: ' : 'Actor: '} {ev.actor}
                    </div>
                  )}

                  {ev.condition && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {isAm ? 'ሁኔታ: ' : 'Condition: '} {ev.condition}
                    </div>
                  )}

                  {ev.notes && (
                    <div className="text-xs italic text-slate-500 mt-1 bg-slate-50 dark:bg-slate-800/60 p-2 rounded">
                      "{ev.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHistoryModal(null)}
              className="mt-8 w-full py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
            >
              {isAm ? 'ዝጋ' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
