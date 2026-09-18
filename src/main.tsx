import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { JobQueueProvider } from './context/JobQueueContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <JobQueueProvider>
        <App />
      </JobQueueProvider>
    </ThemeProvider>
  </React.StrictMode>
);

