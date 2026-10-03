import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Shield,
  Wrench,
  Server,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Zap,
} from 'lucide-react';
import { settingsService } from '../services/api.js';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulationActive, setSimulationActive] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
      setSimulationActive(data.environment?.failure_simulation_active || false);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleSimulation = async () => {
    try {
      setToggling(true);
      const res = await settingsService.toggleSimulation(!simulationActive);
      setSimulationActive(res.failure_simulation_active);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
        <RotateCw size={18} className="animate-spin text-blue-600" />
        <span>Loading system settings & diagnostics...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Worker Configuration & Diagnostics</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            System
          </span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect model runtime limits, active tool registry status, and test failure simulation modes.
        </p>
      </div>

      {/* Scenario 5: Simulation Mode Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Scenario 5: Temporary Failure Simulation</h3>
              <p className="text-xs text-slate-500">
                Simulates an HTTP 504 Gateway Timeout during finance record creation to test autonomous retry recovery.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSimulation}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm ${
              simulationActive
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {simulationActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            <span>{simulationActive ? 'Simulation ACTIVE' : 'Simulation OFF'}</span>
          </button>
        </div>

        {simulationActive && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
            <strong>Active Mode:</strong> The next finance record creation will deliberately trigger a simulated gateway
            timeout. The autonomous agent will detect the failure, determine that a safe retry is permissible, retry the
            write, verify the database entry, and report the outcome.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-semibold text-xs text-slate-800 uppercase tracking-wider">
            <Cpu size={16} className="text-blue-600" />
            <span>AI Model Configuration</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Selected Model:</span>
              <span className="font-mono font-bold text-slate-900">
                {settings?.ai_configuration?.model_name || 'gemini-1.5-flash'}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">API Connection:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 size={13} /> Active & Connected
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Planning Temperature:</span>
              <span className="font-mono text-slate-800">
                {settings?.ai_configuration?.temperature ?? 0.1} (Bounded)
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Extraction Temperature:</span>
              <span className="font-mono text-slate-800">0.0 (Deterministic)</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Output Format:</span>
              <span className="font-mono text-slate-800">Structured JSON Mode</span>
            </div>
          </div>
        </div>

        {/* Execution Limits */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-semibold text-xs text-slate-800 uppercase tracking-wider">
            <Shield size={16} className="text-blue-600" />
            <span>Execution Bounds & Policies</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Maximum Step Bound:</span>
              <span className="font-bold text-slate-900">
                {settings?.execution_limits?.max_steps_per_task || 12} actions / task
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Transient Retry Policy:</span>
              <span className="font-bold text-slate-900">Max 2 retries with exponential backoff</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Tool Call Timeout:</span>
              <span className="font-mono text-slate-800">10,000 ms</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Duplicate Protection:</span>
              <span className="font-semibold text-emerald-600">Strict Idempotency Check</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-500">Read-After-Write Verification:</span>
              <span className="font-semibold text-emerald-600">Independent SQLite Query</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controlled Tools Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 uppercase tracking-wider">
            <Wrench size={16} className="text-blue-600" />
            <span>Controlled Tool Registry (Module 4)</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">5 Tools Registered</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            {
              name: 'search_invoices',
              desc: 'Locates authorized invoice files by company or number, sorted newest first.',
              category: 'File System',
            },
            {
              name: 'read_invoice',
              desc: 'Parses PDF binary stream, extracts fields, and validates dates.',
              category: 'PDF Engine',
            },
            {
              name: 'search_finance_records',
              desc: 'Queries SQLite finance database for existing records and payment status.',
              category: 'Finance ERP',
            },
            {
              name: 'create_finance_record',
              desc: 'Enforces duplicate protection before writing new records to SQLite.',
              category: 'Finance ERP',
            },
            {
              name: 'verify_finance_record',
              desc: 'Performs independent read-after-write verification comparing expected values.',
              category: 'Verification',
            },
          ].map((tool) => (
            <div key={tool.name} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-800">{tool.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Environment Diagnostics */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-semibold text-xs text-slate-800 uppercase tracking-wider">
          <Server size={16} className="text-blue-600" />
          <span>Environment & Database Diagnostics</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50">
            <span className="text-slate-400 block mb-0.5">Database:</span>
            <span className="font-bold text-slate-900">SQLite 3 (WAL Mode)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <span className="text-slate-400 block mb-0.5">Backend Engine:</span>
            <span className="font-bold text-slate-900">Node Express (TS)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <span className="text-slate-400 block mb-0.5">Sample Files:</span>
            <span className="font-bold text-slate-900">Seeded in data/invoices</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <span className="text-slate-400 block mb-0.5">Version:</span>
            <span className="font-mono font-bold text-slate-900">1.0.0-enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
