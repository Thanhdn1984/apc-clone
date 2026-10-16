import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from 'react-hot-toast';
import ClearOldCache from './components/ClearOldCache';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClearOldCache />
    <App />
    <Toaster />
  </React.StrictMode>
);
