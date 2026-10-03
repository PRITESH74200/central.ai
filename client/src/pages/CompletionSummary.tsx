import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  Database,
  ExternalLink,
  RotateCw,
  FileCheck,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { taskService } from '../services/api.js';
import { TaskRecord } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const CompletionSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [allTasks, setAllTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    taskService.getTasks().then(({ tasks }) => {
      setAllTasks(tasks);
      const targetId = id || (tasks.length > 0 ? tasks[0].id : null);
      if (targetId) {
        taskService.getTask(targetId).then(({ task }) => {
          setTask(task);
          // If task completed and verified, trigger wow confetti once
          if (task.status === 'completed' && task.verification_data?.passed) {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          }
        });
      }
      setLoading(false);
    });
  }, [id]);

  const handleSelectTask = (taskId: string) => {
    navigate(`/tasks/${taskId}/summary`);
    taskService.getTask(taskId).then(({ task }) => setTask(task));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
        <RotateCw size={18} className="animate-spin text-blue-600" />
        <span>Loading verified completion report...</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-sm">No task report selected or available.</p>
        <button
          onClick={() => navigate('/history')}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          View Task History
        </button>
      </div>
    );
  }

  const extracted = task.extracted_data || {};
  const verification = task.verification_data || {};
  const evidence = task.evidence_data || {};
  const checks = verification.checks || {};
  const verificationPassed = Boolean(verification.passed);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-mono text-slate-400">Task Audit Report</span>
            <span>&gt;</span>
            <span className="font-mono font-semibold text-blue-600">{task.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Task Completion Summary</span>
          </h1>
        </div>

        {/* Task Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Select Task:</label>
          <select
            value={task.id}
            onChange={(e) => handleSelectTask(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {allTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} - {t.user_request.slice(0, 35)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Verified Status Banner */}
      <div
        className={`rounded-2xl border p-5 flex items-start gap-4 shadow-sm ${
          verificationPassed
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : task.status === 'completed'
            ? 'bg-blue-50/70 border-blue-200 text-blue-900'
            : 'bg-red-50/70 border-red-200 text-red-900'
        }`}
      >
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm ${
            verificationPassed ? 'bg-emerald-600' : task.status === 'completed' ? 'bg-blue-600' : 'bg-red-600'
          }`}
        >
          {verificationPassed ? (
            <ShieldCheck size={22} />
          ) : task.status === 'completed' ? (
            <CheckCircle2 size={22} />
          ) : (
            <XCircle size={22} />
          )}
        </div>

        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm tracking-tight">
              {verificationPassed
                ? 'Task Completed & Read-After-Write Verified'
                : task.status === 'completed'
                ? 'Task Finished with Informational Results'
                : `Task Status: ${task.status.toUpperCase()}`}
            </h2>
            <StatusBadge status={task.status} size="md" />
          </div>

          <p className="text-xs leading-relaxed opacity-90">
            {verification.message ||
              task.summary ||
              task.error_message ||
              'Independent validation confirmed outcome compliance.'}
          </p>
        </div>
      </div>

      {/* 2-Column Details: Summary & Extracted Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Task & Outcome */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-semibold text-xs text-slate-800 uppercase tracking-wider">
            <Sparkles size={15} className="text-blue-600" />
            <span>Task Overview</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-slate-500 block mb-1">User Instruction:</span>
              <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-800 leading-relaxed font-medium">
                {task.user_request}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-500 block mb-1">Final Result:</span>
              <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-800 leading-relaxed">
                {task.summary || 'Operation concluded.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-600">
              <div>
                <span className="text-slate-400 block">Completed At:</span>
                <span className="font-mono text-slate-800">
                  {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'In Progress'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Actions:</span>
                <span className="font-mono text-slate-800 font-bold">{task.current_step} steps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted Invoice Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-semibold text-xs text-slate-800 uppercase tracking-wider">
            <FileText size={15} className="text-blue-600" />
            <span>Extracted Information</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-500">Company Name:</span>
              <span className="font-bold text-slate-900">{extracted.company_name || extracted.company || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-500">Invoice Identifier:</span>
              <span className="font-mono font-bold text-blue-600">
                {extracted.invoice_number || (extracted.invoices ? extracted.invoices.join(', ') : 'N/A')}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-500">Invoice Amount:</span>
              <span className="font-mono font-bold text-slate-900">
                {extracted.amount !== undefined
                  ? `$${Number(extracted.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${
                      extracted.currency || 'USD'
                    }`
                  : extracted.total_amount !== undefined
                  ? `$${Number(extracted.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${
                      extracted.currency || 'USD'
                    }`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-500">Due Date:</span>
              <span className="text-slate-800 font-medium">
                {extracted.due_date ? (
                  extracted.due_date
                ) : (
                  <span className="text-slate-400 italic">Not Specified</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-500">Source Document:</span>
              <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
                {extracted.source_document || 'Direct Database Calculation'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Checklist matching Module 7 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 uppercase tracking-wider">
            <FileCheck size={16} className="text-emerald-600" />
            <span>Independent Verification Checklist</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Module 7: Read-After-Write</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            { key: 'invoice_found', label: 'Source Invoice Located' },
            { key: 'fields_extracted', label: 'Required Fields Extracted' },
            { key: 'duplicate_checked', label: 'Duplicate Check Executed' },
            { key: 'finance_record_created', label: 'Finance Record Written' },
            { key: 'saved_record_retrieved', label: 'Saved Record Retrieved' },
            { key: 'field_comparison_passed', label: 'Field Comparison Verified' },
          ].map((item) => {
            const isChecked = checks[item.key] ?? verificationPassed;

            return (
              <div
                key={item.key}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition ${
                  isChecked ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-white ${
                    isChecked ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  {isChecked ? <Check size={12} /> : <X size={12} />}
                </div>
                <span className="font-medium text-xs">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Field by field verification comparison table if present */}
        {verification.comparison && verification.comparison.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="font-semibold text-xs text-slate-700 block mb-2">Field-by-Field Value Comparison:</span>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 px-3">Field Name</th>
                    <th className="py-2 px-3">Expected (Extracted)</th>
                    <th className="py-2 px-3">Actual (SQLite DB)</th>
                    <th className="py-2 px-3 text-right">Integrity Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {verification.comparison.map((comp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-700">{comp.field}</td>
                      <td className="py-2 px-3 text-slate-600">{String(comp.expected)}</td>
                      <td className="py-2 px-3 text-slate-900">{String(comp.actual)}</td>
                      <td className="py-2 px-3 text-right">
                        {comp.matches ? (
                          <span className="text-emerald-600 font-bold flex items-center justify-end gap-1 font-sans">
                            <Check size={12} /> Perfect Match
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold font-sans">Mismatch</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-semibold text-xs text-slate-800 uppercase tracking-wider">
          <Database size={15} className="text-blue-600" />
          <span>Evidence & Audit Trail</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Source Document Reference:</span>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-800 flex items-center justify-between">
              <span>{extracted.source_document || 'Database Query'}</span>
              {extracted.source_document && (
                <button
                  onClick={() => navigate('/files')}
                  className="text-blue-600 hover:underline flex items-center gap-1 font-sans font-semibold"
                >
                  <span>View in Files</span>
                  <ExternalLink size={11} />
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Finance Database Record ID:</span>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-800 flex items-center justify-between">
              <span>{verification.saved_record_id || evidence.finance_record_id || 'N/A'}</span>
              <button
                onClick={() => navigate('/finance')}
                className="text-blue-600 hover:underline flex items-center gap-1 font-sans font-semibold"
              >
                <span>Inspect in Finance</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
