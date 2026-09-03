import React from 'react';
import {
  Laptop,
  QrCode,
  History,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Calendar,
} from 'lucide-react';
import { AssetDto } from '@am-pms/shared-types';

export interface AssetCardProps {
  asset: AssetDto;
  locale?: 'en' | 'am';
  onAccept?: (asset: AssetDto) => void;
  onReturn?: (asset: AssetDto) => void;
  onReportIssue?: (asset: AssetDto) => void;
  onViewHistory?: (asset: AssetDto) => void;
  onViewQr?: (asset: AssetDto) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  locale = 'en',
  onAccept,
  onReturn,
  onReportIssue,
  onViewHistory,
  onViewQr,
}) => {
  const isPendingAcceptance = asset.status === 'pending_acceptance';
  const isAssigned = asset.status === 'assigned';
  const isMaintenance = asset.status === 'maintenance';

  const statusLabel = {
    available: { en: 'Available', am: 'ዝግጁ' },
    pending_acceptance: { en: 'Pending Acceptance', am: 'ማረጋገጫ የሚጠብቅ' },
    assigned: { en: 'In Custody', am: 'በእጅ ያለ' },
    in_transfer: { en: 'In Transfer', am: 'በዝውውር ላይ' },
    maintenance: { en: 'Maintenance', am: 'በጥገና ላይ' },
    lost: { en: 'Reported Lost', am: 'የጠፋ' },
    disposed: { en: 'Disposed', am: 'የተወገደ' },
  }[asset.status] || { en: asset.status, am: asset.status };

  const statusBadgeStyle = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    pending_acceptance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse',
    assigned: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    in_transfer: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    maintenance: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400',
    lost: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
    disposed: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  }[asset.status] || 'bg-slate-100 text-slate-700 border-slate-200';

  const firstPhoto = asset.photos && asset.photos.length > 0 ? asset.photos[0]?.url : null;

  return (
    <div
      data-testid={`asset-card-${asset._id}`}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Card Header & Photo / Graphic */}
        <div className="relative h-40 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center overflow-hidden">
          {firstPhoto ? (
            <img
              src={firstPhoto}
              alt={asset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/70 dark:bg-slate-700/60 shadow-xs flex items-center justify-center text-slate-500 dark:text-slate-300">
              <Laptop className="w-8 h-8 text-am-primary-500" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeStyle}`}
            >
              {locale === 'am' ? statusLabel.am : statusLabel.en}
            </span>
          </div>

          {/* Asset Code Chip */}
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-xs font-mono font-medium shadow-xs">
            {asset.assetCode}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
              {asset.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {typeof asset.propertyType === 'object' && asset.propertyType
                ? (asset.propertyType as any).name
                : 'Hardware Device'}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
            <div className="flex items-center space-x-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {asset.currentLocation?.room || asset.currentLocation?.building || 'HQ'}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
        {/* Primary Action Button (min 44x44 touch target compliant) */}
        {isPendingAcceptance && onAccept && (
          <button
            onClick={() => onAccept(asset)}
            aria-label={locale === 'am' ? 'ርክክብ አረጋግጥ' : 'Accept Custody'}
            className="w-full min-h-[44px] bg-am-accent-500 hover:bg-am-accent-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 flex items-center justify-center space-x-2 shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{locale === 'am' ? 'ርክክብ አረጋግጥ' : 'Accept Custody'}</span>
          </button>
        )}

        {isAssigned && (
          <div className="grid grid-cols-2 gap-2">
            {onReturn && (
              <button
                onClick={() => onReturn(asset)}
                aria-label={locale === 'am' ? 'ንብረት መልስ' : 'Return Asset'}
                className="min-h-[44px] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium text-xs rounded-lg px-2.5 py-2 flex items-center justify-center space-x-1.5 shadow-2xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{locale === 'am' ? 'ንብረት መልስ' : 'Return Asset'}</span>
              </button>
            )}

            {onReportIssue && (
              <button
                onClick={() => onReportIssue(asset)}
                aria-label={locale === 'am' ? 'ብልሽት ሪፖርት አድርግ' : 'Report Issue'}
                className="min-h-[44px] bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium text-xs rounded-lg px-2.5 py-2 flex items-center justify-center space-x-1.5 shadow-2xs transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="truncate">{locale === 'am' ? 'ችግር አሳውቅ' : 'Report Issue'}</span>
              </button>
            )}
          </div>
        )}

        {/* Secondary Utility Actions (History & QR) */}
        <div className="flex items-center justify-between pt-1">
          {onViewHistory && (
            <button
              onClick={() => onViewHistory(asset)}
              aria-label={locale === 'am' ? 'የታሪክ መስመር ተመልከት' : 'View Custody Timeline'}
              className="text-xs text-am-primary-600 dark:text-am-primary-400 hover:underline flex items-center space-x-1 py-1 px-1.5 rounded"
            >
              <History className="w-3.5 h-3.5" />
              <span>{locale === 'am' ? 'የይዞታ ታሪክ' : 'Timeline'}</span>
            </button>
          )}

          {onViewQr && (
            <button
              onClick={() => onViewQr(asset)}
              aria-label={locale === 'am' ? 'የኩአር ኮድ ተመልከት' : 'View QR Code'}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1 py-1 px-1.5 rounded"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
