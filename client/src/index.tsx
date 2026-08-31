import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { MasterDataConsole } from './modules/masterdata/MasterDataConsole.js';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <MasterDataConsole />
    </React.StrictMode>,
  );
}
