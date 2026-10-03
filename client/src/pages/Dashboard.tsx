import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  ChevronRight,
  RotateCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { taskService } from '../services/api.js';
import { TaskRecord, TaskStats } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [taskInput, setTaskInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats>({ total: 0, completed: 0, in_progress: 0, failed: 0 });
  const [recentTasks, setRecentTasks] = useState<TaskRecord[]>([]);

  const exampleSuggestions = [
    'Find the latest invoice from ABC Technologies, extract the amount and due date, add it to the finance system, and confirm completion.',
    'Find all unpaid invoices from Global Corp and tell me their total amount.',
    'Add invoice INV-1001 to the finance system.',
    'Add the latest invoice.',
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, tasksData] = await Promise.all([
        taskService.getStats(),
        taskService.getTasks(),
      ]);
      setStats(statsData);
      setRecentTasks(tasksData.tasks.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskInput.trim() || submitting) return;

    try {
      setSubmitting(true);
      const newTask = await taskService.createTask(taskInput.trim());
      navigate(`/execution/${newTask.id}`);
    } catch (err: any) {
      alert(`Error starting task: ${err?.message || 'Failed to submit task'}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Greeting & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Welcome to CentrAlign AI</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              Autonomous Worker
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Delegate multi-step operations to an autonomous worker with independent read-after-write verification.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition shadow-sm"
        >
          <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Task Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50/60 to-transparent pointer-events-none -z-0" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <Sparkles size={16} />
            <span>Assign Autonomous Task</span>
          </div>

          <form onSubmit={handleStartTask} className="space-y-4">
            <div className="relative">
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Describe your task in natural language (e.g. Find the latest invoice from ABC Technologies and record it in finance)..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-4 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Enforces strict read-after-write verification on all financial operations.</span>
              </div>

              <button
                type="submit"
                disabled={!taskInput.trim() || submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  <>
                    <RotateCw size={15} className="animate-spin" />
                    <span>Orchestrating...</span>
                  </>
                ) : (
                  <>
                    <span>Start Task</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Example task pills */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Suggested Scenarios:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {exampleSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTaskInput(suggestion)}
                  className="text-left text-xs text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-lg border border-slate-200/80 hover:border-blue-200 transition line-clamp-1"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Tasks</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.in_progress}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Failed / Stopped</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-slate-900">Recent Task Executions</h2>
            <span className="text-xs text-slate-400">({recentTasks.length})</span>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No recent tasks executed yet. Start your first task above!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/execution/${t.id}`)}
                className="p-4 hover:bg-slate-50/80 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{t.id}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">{t.user_request}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
                  <span className="font-mono">
                    {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button className="flex items-center gap-1 text-blue-600 font-semibold hover:underline">
                    <span>Inspect</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
