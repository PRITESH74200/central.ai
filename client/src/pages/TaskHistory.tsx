import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  RotateCw,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { taskService } from '../services/api.js';
import { TaskRecord } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const TaskHistory: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getTasks({
        search,
        status: statusFilter,
      });
      setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to load task history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [search, statusFilter]);

  const calculateDuration = (t: TaskRecord) => {
    if (!t.created_at) return '0.00s';
    const start = new Date(t.created_at).getTime();
    const end = t.completed_at ? new Date(t.completed_at).getTime() : Date.now();
    return ((end - start) / 1000).toFixed(1) + 's';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Task History</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Audit Trail
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical log of all autonomous worker operations, decision trails, and verified completion states.
          </p>
        </div>

        <button
          onClick={loadTasks}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
        >
          <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search & Status Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by prompt or ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
            {[
              { id: 'all', label: 'All Tasks' },
              { id: 'completed', label: 'Completed' },
              { id: 'running', label: 'Running' },
              { id: 'waiting_for_clarification', label: 'Needs Clarification' },
              { id: 'failed', label: 'Failed' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Task Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Steps</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No task execution records found.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{t.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-md truncate" title={t.user_request}>
                      {t.user_request}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {t.current_step} / {t.max_steps}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{calculateDuration(t)}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(t.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/execution/${t.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                      >
                        Execution
                      </button>
                      <button
                        onClick={() => navigate(`/tasks/${t.id}/summary`)}
                        className="text-slate-600 hover:text-slate-900 font-semibold hover:underline"
                      >
                        Summary
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
