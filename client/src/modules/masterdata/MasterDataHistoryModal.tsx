import React from 'react';
import { X, Clock, User, CheckCircle2 } from 'lucide-react';

export interface HistoryEntry {
  _id: string;
  version: number;
  action: 'create' | 'update' | 'deactivate';
  diff?: Record<string, { before: any; after: any }>;
  snapshot?: Record<string, any>;
  performedBy?: string;
  timestamp: string;
}

export interface MasterDataHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityTitle: string;
  history: HistoryEntry[];
  lang?: 'en' | 'am';
}

export const MasterDataHistoryModal: React.FC<MasterDataHistoryModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityTitle,
  history,
  lang = 'en',
}) => {
  if (!isOpen) return null;
  const isAm = lang === 'am';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#eef6ff] border-b border-[#d9ecff] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isAm ? 'የለውጥ ታሪክ' : 'Audit & Change History'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {entityName}: <span className="font-semibold">{entityTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-6">
              {isAm ? 'ምንም የለውጥ ታሪክ የለም' : 'No change history available.'}
            </p>
          ) : (
            history.map((entry) => {
              const diffKeys = Object.keys(entry.diff || {});
              return (
                <div
                  key={entry._id || entry.version}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-[#1668c1] text-white text-xs font-bold rounded">
                        v{entry.version}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${
                          entry.action === 'create'
                            ? 'bg-green-100 text-green-800'
                            : entry.action === 'update'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.action === 'create'
                          ? isAm ? 'ተፈጥሯል' : 'Created'
                          : entry.action === 'update'
                          ? isAm ? 'ተስተካክሏል' : 'Updated'
                          : isAm ? 'ተቦዝኗል' : 'Deactivated'}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 space-x-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {entry.performedBy && (
                    <div className="flex items-center text-xs text-gray-600 space-x-1">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span>{isAm ? 'አከናወኝ:' : 'Performed by:'} {entry.performedBy}</span>
                    </div>
                  )}

                  {/* Diff rendering */}
                  {entry.action === 'update' && diffKeys.length > 0 && (
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        {isAm ? 'የተቀየሩ መረጃዎች:' : 'Field Modifications:'}
                      </p>
                      <div className="space-y-1">
                        {diffKeys.map((k) => (
                          <div
                            key={k}
                            className="text-xs grid grid-cols-3 gap-2 bg-white p-1.5 rounded border border-gray-200"
                          >
                            <span className="font-mono font-medium text-gray-700">{k}</span>
                            <span className="text-red-600 line-through truncate">
                              {JSON.stringify(entry.diff![k]?.before)}
                            </span>
                            <span className="text-green-600 font-semibold truncate">
                              {JSON.stringify(entry.diff![k]?.after)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.action === 'create' && (
                    <div className="flex items-center text-xs text-green-700 pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      <span>{isAm ? 'የመጀመሪያ ምዝገባ ተጠናቅቋል' : 'Initial record creation snapshot'}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 rounded transition-colors"
          >
            {isAm ? 'ዝጋ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
