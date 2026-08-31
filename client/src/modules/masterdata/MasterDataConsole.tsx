import React, { useState } from 'react';
import { DataTable, type Column } from '../../design-system/DataTable.js';
import { DynamicForm, type FormFieldDef } from '../../design-system/DynamicForm.js';
import { MasterDataHistoryModal, type HistoryEntry } from './MasterDataHistoryModal.js';
import { Plus, Globe, Layers, Building2, MapPin, DoorOpen, Users, FolderTree, Tag, GitFork, FileText } from 'lucide-react';

export type MasterDataTab =
  | 'branches'
  | 'buildings'
  | 'floors'
  | 'rooms'
  | 'departments'
  | 'categories'
  | 'property-types'
  | 'status-flows'
  | 'request-types';

export interface MasterDataConsoleProps {
  initialTab?: MasterDataTab;
  initialLang?: 'en' | 'am';
}

export const MasterDataConsole: React.FC<MasterDataConsoleProps> = ({
  initialTab = 'branches',
  initialLang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<MasterDataTab>(initialTab);
  const [lang, setLang] = useState<'en' | 'am'>(initialLang);
  const isAm = lang === 'am';

  // Sample data states for interactive console
  const [records, setRecords] = useState<Record<string, any[]>>({
    branches: [
      { _id: '1', name: 'Addis Ababa Main', nameAm: 'አዲስ አበባ ዋና', code: 'AA-MAIN', address: 'Bole Road', isActive: true, version: 1 },
      { _id: '2', name: 'Hawassa Branch', nameAm: 'ሀዋሳ ቅርንጫፍ', code: 'HW-REG', address: 'Piazza', isActive: true, version: 2 },
    ],
    buildings: [
      { _id: 'b1', name: 'HQ Block A', nameAm: 'ዋና ሕንፃ ኤ', branch: 'Addis Ababa Main', floorsCount: 6, isActive: true, version: 1 },
    ],
    floors: [
      { _id: 'f1', name: 'Ground Floor', nameAm: 'ምድር ቤት', building: 'HQ Block A', order: 0, isActive: true, version: 1 },
    ],
    rooms: [
      { _id: 'r1', name: 'Executive Room 101', nameAm: 'አዳራሽ 101', floor: 'Ground Floor', capacity: 15, isActive: true, version: 1 },
    ],
    departments: [
      { _id: 'd1', name: 'ICT Department', nameAm: 'የአይሲቲ መምሪያ', code: 'ICT-01', branch: 'Addis Ababa Main', isActive: true, version: 1 },
    ],
    categories: [
      { _id: 'c1', name: 'Electronic Equipment', nameAm: 'የኤሌክትሮኒክስ እቃዎች', description: 'Computers & Peripherals', isActive: true, version: 1 },
    ],
    'property-types': [
      { _id: 'pt1', name: 'Laptop Computer', nameAm: 'ላፕቶፕ ኮምፒውተር', unitOfMeasure: 'piece', defaultUsefulLifeMonths: 36, isActive: true, version: 1 },
    ],
    'status-flows': [
      { _id: 'sf1', name: 'Standard Lifecycle', statesCount: 4, transitionsCount: 5, isActive: true, version: 1 },
    ],
    'request-types': [
      { _id: 'rt1', name: 'Asset Allocation', nameAm: 'የዕቃ ድልድል', module: 'assignment', isActive: true, version: 1 },
    ],
  });

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    entityName: string;
    entityTitle: string;
    history: HistoryEntry[];
  }>({
    isOpen: false,
    entityName: '',
    entityTitle: '',
    history: [],
  });

  // Navigation tab definitions
  const tabs: { key: MasterDataTab; label: string; labelAm: string; icon: React.ReactNode }[] = [
    { key: 'branches', label: 'Branches', labelAm: 'ቅርንጫፎች', icon: <MapPin className="h-4 w-4" /> },
    { key: 'buildings', label: 'Buildings', labelAm: 'ሕንፃዎች', icon: <Building2 className="h-4 w-4" /> },
    { key: 'floors', label: 'Floors', labelAm: 'ፎቆች', icon: <Layers className="h-4 w-4" /> },
    { key: 'rooms', label: 'Rooms', labelAm: 'ክፍሎች', icon: <DoorOpen className="h-4 w-4" /> },
    { key: 'departments', label: 'Departments', labelAm: 'መምሪያዎች', icon: <Users className="h-4 w-4" /> },
    { key: 'categories', label: 'Categories', labelAm: 'ምድቦች', icon: <FolderTree className="h-4 w-4" /> },
    { key: 'property-types', label: 'Property Types', labelAm: 'የንብረት አይነቶች', icon: <Tag className="h-4 w-4" /> },
    { key: 'status-flows', label: 'Status Flows', labelAm: 'የሁኔታ ፍሰቶች', icon: <GitFork className="h-4 w-4" /> },
    { key: 'request-types', label: 'Request Types', labelAm: 'የጥያቄ አይነቶች', icon: <FileText className="h-4 w-4" /> },
  ];

  // Column definitions per tab
  const getColumns = (): Column[] => {
    switch (activeTab) {
      case 'branches':
        return [
          { key: 'code', header: 'Code', headerAm: 'ኮድ' },
          { key: 'name', header: 'Name (EN)', headerAm: 'ስም (እንግሊዝኛ)' },
          { key: 'nameAm', header: 'Name (AM)', headerAm: 'ስም (አማርኛ)' },
          { key: 'address', header: 'Address', headerAm: 'አድራሻ' },
          {
            key: 'isActive',
            header: 'Status',
            headerAm: 'ሁኔታ',
            render: (val: boolean) => (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${val ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {val ? (isAm ? 'ንቁ' : 'Active') : (isAm ? 'ቦዝኗል' : 'Inactive')}
              </span>
            ),
          },
          { key: 'version', header: 'Version', headerAm: 'እትም' },
        ];

      case 'buildings':
        return [
          { key: 'name', header: 'Name', headerAm: 'ስም' },
          { key: 'branch', header: 'Branch', headerAm: 'ቅርንጫፍ' },
          { key: 'floorsCount', header: 'Floors Count', headerAm: 'የፎቆች ብዛት' },
          { key: 'version', header: 'Version', headerAm: 'እትም' },
        ];

      case 'departments':
        return [
          { key: 'code', header: 'Code', headerAm: 'ኮድ' },
          { key: 'name', header: 'Name', headerAm: 'ስም' },
          { key: 'branch', header: 'Branch', headerAm: 'ቅርንጫፍ' },
          { key: 'version', header: 'Version', headerAm: 'እትም' },
        ];

      case 'property-types':
        return [
          { key: 'name', header: 'Property Type', headerAm: 'የንብረት ዓይነት' },
          { key: 'unitOfMeasure', header: 'Unit of Measure', headerAm: 'መለኪያ' },
          { key: 'defaultUsefulLifeMonths', header: 'Useful Life (Months)', headerAm: 'የአገልግሎት ዘመን (ወር)' },
          { key: 'version', header: 'Version', headerAm: 'እትም' },
        ];

      default:
        return [
          { key: 'name', header: 'Name', headerAm: 'ስም' },
          { key: 'nameAm', header: 'Name (AM)', headerAm: 'ስም (አማርኛ)' },
          { key: 'version', header: 'Version', headerAm: 'እትም' },
        ];
    }
  };

  // Form fields per active tab
  const getFormFields = (): FormFieldDef[] => {
    switch (activeTab) {
      case 'branches':
        return [
          { name: 'name', label: 'Branch Name', labelAm: 'የቅርንጫፍ ስም', dataType: 'text', isRequired: true },
          { name: 'nameAm', label: 'Amharic Name', labelAm: 'የአማርኛ ስም', dataType: 'text', isRequired: true },
          { name: 'code', label: 'Code', labelAm: 'ኮድ', dataType: 'text', isRequired: true, validationRule: '^[A-Z0-9-]{3,10}$' },
          { name: 'address', label: 'Address', labelAm: 'አድራሻ', dataType: 'text' },
        ];

      case 'buildings':
        return [
          { name: 'name', label: 'Building Name', labelAm: 'የሕንፃ ስም', dataType: 'text', isRequired: true },
          { name: 'nameAm', label: 'Amharic Name', labelAm: 'የአማርኛ ስም', dataType: 'text' },
          { name: 'floorsCount', label: 'Floors Count', labelAm: 'የፎቆች ብዛት', dataType: 'number', isRequired: true },
        ];

      case 'departments':
        return [
          { name: 'name', label: 'Department Name', labelAm: 'የመምሪያ ስም', dataType: 'text', isRequired: true },
          { name: 'nameAm', label: 'Amharic Name', labelAm: 'የአማርኛ ስም', dataType: 'text' },
          { name: 'code', label: 'Code', labelAm: 'ኮድ', dataType: 'text', isRequired: true },
        ];

      case 'property-types':
        return [
          { name: 'name', label: 'Property Type Name', labelAm: 'የንብረት ዓይነት ስም', dataType: 'text', isRequired: true },
          { name: 'nameAm', label: 'Amharic Name', labelAm: 'የአማርኛ ስም', dataType: 'text' },
          { name: 'unitOfMeasure', label: 'Unit of Measure', labelAm: 'መለኪያ', dataType: 'single_select', isRequired: true, options: ['piece', 'set', 'kg', 'liter', 'meter'] },
          { name: 'defaultUsefulLifeMonths', label: 'Useful Life (Months)', labelAm: 'የአገልግሎት ዘመን (ወር)', dataType: 'number', isRequired: true },
        ];

      default:
        return [
          { name: 'name', label: 'Name', labelAm: 'ስም', dataType: 'text', isRequired: true },
          { name: 'nameAm', label: 'Amharic Name', labelAm: 'የአማርኛ ስም', dataType: 'text' },
        ];
    }
  };

  const handleCreateOrUpdate = (values: Record<string, any>) => {
    const list = records[activeTab] || [];
    if (editingRecord) {
      // Update record
      const updated = list.map((item) =>
        item._id === editingRecord._id
          ? { ...item, ...values, version: (item.version || 1) + 1 }
          : item,
      );
      setRecords((prev) => ({ ...prev, [activeTab]: updated }));
    } else {
      // Create record
      const newItem = {
        _id: String(Date.now()),
        ...values,
        isActive: true,
        version: 1,
      };
      setRecords((prev) => ({ ...prev, [activeTab]: [newItem, ...list] }));
    }
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const handleDeactivate = (row: any) => {
    const list = records[activeTab] || [];
    const updated = list.map((item) =>
      item._id === row._id ? { ...item, isActive: false, version: item.version + 1 } : item,
    );
    setRecords((prev) => ({ ...prev, [activeTab]: updated }));
  };

  const handleViewHistory = (row: any) => {
    // Generate sample history records showing version changes
    const sampleHistory: HistoryEntry[] = [
      {
        _id: 'h2',
        version: row.version || 2,
        action: 'update',
        diff: { name: { before: `${row.name} (Old)`, after: row.name } },
        performedBy: 'ict_admin',
        timestamp: new Date().toISOString(),
      },
      {
        _id: 'h1',
        version: 1,
        action: 'create',
        performedBy: 'ict_admin',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    setHistoryModal({
      isOpen: true,
      entityName: tabs.find((t) => t.key === activeTab)?.label || 'Record',
      entityTitle: row.name || row.code || 'Record',
      history: sampleHistory,
    });
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 bg-[#1668c1] text-white rounded-lg flex items-center justify-center font-bold text-lg">
            M
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#171a21]">
              {isAm ? 'መሶብ የንብረት አስተዳደር — ማዋቀሪያ ኮንሶል' : 'Messob PMS — Configuration Console'}
            </h1>
            <p className="text-xs text-gray-500">
              {isAm ? 'የዋና መረጃዎች እና ተለዋዋጭ መስኮች አስተዳደር' : 'Master Data Management & Custom Fields Engine'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Globe className="h-3.5 w-3.5 text-[#1668c1]" />
            <span>{lang === 'en' ? 'አማርኛ' : 'English'}</span>
          </button>

          {/* New Record Button */}
          <button
            onClick={() => {
              setEditingRecord(null);
              setIsFormOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#1668c1] hover:bg-[#10529b] text-white rounded-md text-xs font-semibold shadow transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isAm ? 'አዲስ መዝግብ' : 'Add New'}</span>
          </button>
        </div>
      </header>

      {/* Main Layout with Sidebar Tabs and Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-64 bg-white border-r border-gray-200 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {isAm ? 'የዋና መረጃ ክፍሎች' : 'Master Entities'}
          </p>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#eef6ff] text-[#0b3d75] font-semibold shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={isActive ? 'text-[#1668c1]' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <span>{isAm ? tab.labelAm : tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {isAm
                    ? tabs.find((t) => t.key === activeTab)?.labelAm
                    : tabs.find((t) => t.key === activeTab)?.label}
                </h2>
                <p className="text-xs text-gray-500">
                  {isAm
                    ? 'ዝርዝሩን ይመልከቱ፣ ያርትዑ ወይም የለውጥ ታሪኩን ይመርምሩ'
                    : 'View, edit records, or inspect version history'}
                </p>
              </div>
            </div>

            <DataTable
              columns={getColumns()}
              data={records[activeTab] || []}
              onEdit={(row) => {
                setEditingRecord(row);
                setIsFormOpen(true);
              }}
              onDeactivate={handleDeactivate}
              onViewHistory={handleViewHistory}
              lang={lang}
            />
          </div>
        </main>
      </div>

      {/* Dynamic Form Modal (Create / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingRecord
                ? isAm ? 'መረጃ አርትዕ' : 'Edit Record'
                : isAm ? 'አዲስ መረጃ መዝግብ' : 'Create New Record'}
            </h3>
            <DynamicForm
              fields={getFormFields()}
              initialValues={editingRecord || {}}
              onSubmit={handleCreateOrUpdate}
              lang={lang}
              submitLabel={editingRecord ? (isAm ? 'አዘምን' : 'Update') : (isAm ? 'ፍጠር' : 'Create')}
            />
            <div className="mt-3 text-right">
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingRecord(null);
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                {isAm ? 'ሰርዝ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      <MasterDataHistoryModal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal((prev) => ({ ...prev, isOpen: false }))}
        entityName={historyModal.entityName}
        entityTitle={historyModal.entityTitle}
        history={historyModal.history}
        lang={lang}
      />
    </div>
  );
};
