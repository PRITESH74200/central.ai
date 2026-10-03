import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.js';
import { Dashboard } from './pages/Dashboard.js';
import { NewTaskChat } from './pages/NewTaskChat.js';
import { LiveExecution } from './pages/LiveExecution.js';
import { FinanceApp } from './pages/FinanceApp.js';
import { CompletionSummary } from './pages/CompletionSummary.js';
import { TaskHistory } from './pages/TaskHistory.js';
import { FilesViewer } from './pages/FilesViewer.js';
import { Settings } from './pages/Settings.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        {/* Persistent Dark Navy Vertical Sidebar */}
        <Sidebar />

        {/* Main Application Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-task" element={<NewTaskChat />} />
            <Route path="/execution" element={<LiveExecution />} />
            <Route path="/execution/:id" element={<LiveExecution />} />
            <Route path="/summary" element={<CompletionSummary />} />
            <Route path="/tasks/:id/summary" element={<CompletionSummary />} />
            <Route path="/history" element={<TaskHistory />} />
            <Route path="/finance" element={<FinanceApp />} />
            <Route path="/files" element={<FilesViewer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
