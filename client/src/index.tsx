import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { MasterDataConsole } from './modules/masterdata/MasterDataConsole.js';
import { AssetConsole } from './modules/assets/AssetConsole.js';
import { Database, Package } from 'lucide-react';
import mesobIcon from './assets/branding/mesob-icon.png';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'assets' | 'masterdata'>('assets');

  return (
    <div>
      {/* Top Application Bar */}
      <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-between border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2.5">
          <img src={mesobIcon} alt="Addis Mesob" className="h-5 w-5 rounded-full object-cover ring-1 ring-am-accent-500/50" />
          <span className="font-bold text-am-accent-500 tracking-wide">AM-PMS</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-200 font-medium">Addis Mesob One Center — Property Management</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveModule('assets')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-colors ${
              activeModule === 'assets'
                ? 'bg-am-primary-500 text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Asset Management (Phase 3)</span>
          </button>

          <button
            onClick={() => setActiveModule('masterdata')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-colors ${
              activeModule === 'masterdata'
                ? 'bg-am-primary-500 text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Master Data Console (Phase 2)</span>
          </button>
        </div>
      </div>

      {/* Active Module View */}
      {activeModule === 'assets' ? <AssetConsole /> : <MasterDataConsole />}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
