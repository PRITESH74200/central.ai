import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  Download,
  Share2,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Ban,
  Clock,
  Sparkles,
} from 'lucide-react';
import { taskService } from '../services/api.js';
import { TaskRecord, TaskEventRecord } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { FlowGraph } from '../components/FlowGraph.js';

export const LiveExecution: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [events, setEvents] = useState<TaskEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<number | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'errors' | 'warnings' | 'api_calls'>('all');
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [outputTab, setOutputTab] = useState<'raw' | 'json' | 'logs'>('raw');
  const [copied, setCopied] = useState(false);

  // If no ID is provided, fetch latest task
  useEffect(() => {
    if (!id) {
      taskService.getTasks().then(({ tasks }) => {
        if (tasks && tasks.length > 0) {
          navigate(`/execution/${tasks[0].id}`, { replace: true });
        }
      });
    }
  }, [id, navigate]);

  const fetchTaskDetails = async () => {
    if (!id) return;
    try {
      const [{ task: taskData }, { events: eventList }] = await Promise.all([
        taskService.getTask(id),
        taskService.getEvents(id),
      ]);
      setTask(taskData);
      setEvents(eventList);

      // Auto-expand latest step by default
      if (eventList.length > 0 && Object.keys(expandedSteps).length === 0) {
        const lastStep = eventList[eventList.length - 1].step_number;
        setExpandedSteps({ [lastStep]: true });
      }
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
    const interval = setInterval(() => {
      if (task && (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled')) {
        return; // stop polling if in terminal state
      }
      fetchTaskDetails();
    }, 2000);

    return () => clearInterval(interval);
  }, [id, task?.status]);

  const toggleStepExpand = (stepNum: number) => {
    setExpandedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      await taskService.cancelTask(id);
      fetchTaskDetails();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const handleRestart = async () => {
    if (!task) return;
    try {
      const newTask = await taskService.createTask(task.user_request);
      navigate(`/execution/${newTask.id}`);
    } catch (err: any) {
      alert(`Restart failed: ${err.message}`);
    }
  };

  const handleCopyLogs = () => {
    const logText = generateLogText();
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const logText = generateLogText();
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `centralign-execution-${id || 'logs'}.txt`;
    a.click();
  };

  const generateLogText = (): string => {
    if (!task) return '';
    let out = `Agent Execution Log — CentrAlign AI\n`;
    out += `Task ID: ${task.id}\n`;
    out += `User Request: ${task.user_request}\n`;
    out += `Status: ${task.status}\n`;
    out += `Total Duration: ${calculateTotalDuration()}s\n`;
    out += `Timestamp: ${task.created_at}\n\n`;
    out += `------------------------------------------------------\n\n`;

    events.forEach((e) => {
      out += `[${e.timestamp}] Step ${e.step_number} | ${e.action_name} (${e.status.toUpperCase()}) - ${e.duration_ms}ms\n`;
      if (e.input_summary) out += `Request: ${JSON.stringify(e.input_summary, null, 2)}\n`;
      if (e.result_summary) out += `Response: ${JSON.stringify(e.result_summary, null, 2)}\n`;
      out += `\n`;
    });

    if (task.summary) out += `\nTask Final Result:\n${task.summary}\n`;
    return out;
  };

  // Metrics calculations
  const totalSteps = task?.current_step || events.length;
  const errorsCount = events.filter((e) => e.status === 'error').length;

  const calculateTotalDuration = () => {
    if (!task?.created_at) return '0.00';
    const start = new Date(task.created_at).getTime();
    const end = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
    return ((end - start) / 1000).toFixed(2);
  };

  // Filter events list
  const filteredEvents = events.filter((e) => {
    if (searchFilter) {
      const match =
        e.action_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (e.tool_name && e.tool_name.toLowerCase().includes(searchFilter.toLowerCase())) ||
        JSON.stringify(e.result_summary).toLowerCase().includes(searchFilter.toLowerCase());
      if (!match) return false;
    }

    if (categoryFilter === 'errors') return e.status === 'error';
    if (categoryFilter === 'warnings') return e.status === 'warning';
    if (categoryFilter === 'api_calls') return e.event_type === 'tool_call' || e.event_type === 'observation';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top Header Navigation matching Reference Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Tasks List</span>
            </button>
            <span>/</span>
            <span className="font-mono text-slate-400">CentrAlign Worker</span>
            <span>&gt;</span>
            <span className="font-mono text-blue-600 font-semibold">{id}</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agent Execution Viewer</h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {task?.status === 'running' && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition shadow-sm"
            >
              <Ban size={13} />
              <span>Cancel Task</span>
            </button>
          )}

          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <RotateCw size={13} />
            <span>Restart</span>
          </button>

          <button
            onClick={handleDownloadLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <Download size={13} />
            <span>Export Logs</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Bar matching Reference Image 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Steps
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalSteps}</span>
            <span className="text-xs text-slate-400 font-mono">/ 12 max</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Errors
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${errorsCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {errorsCount}
            </span>
            {errorsCount > 0 && <span className="text-xs text-red-500 font-medium">Logged</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Duration
          </span>
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{calculateTotalDuration()}s</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Status
          </span>
          <div>{task?.status ? <StatusBadge status={task.status} size="lg" /> : <StatusBadge status="running" />}</div>
        </div>
      </div>

      {/* Task Prompt Overview Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
        <Sparkles size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs">
          <span className="font-semibold text-slate-700">Goal Instruction: </span>
          <span className="text-slate-900 font-medium">{task?.user_request}</span>
        </div>
      </div>

      {/* Main 2-Column Execution Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Steps Timeline & Request/Response Inspector (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-h-[850px]">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search steps..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'errors', label: 'Errors' },
                  { id: 'warnings', label: 'Warnings' },
                  { id: 'api_calls', label: 'API Calls' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    categoryFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Steps List */}
          <div className="overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No events matching filter.</div>
            ) : (
              filteredEvents.map((evt) => {
                const isExpanded = !!expandedSteps[evt.step_number];

                return (
                  <div
                    key={evt.id}
                    className={`rounded-lg border transition ${
                      activeStep === evt.step_number
                        ? 'border-blue-500 bg-blue-50/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Step Card Header */}
                    <div
                      onClick={() => {
                        setActiveStep(evt.step_number);
                        toggleStepExpand(evt.step_number);
                      }}
                      className="p-3 cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700 flex-shrink-0">
                          {evt.step_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={evt.action_name}>
                            {evt.action_name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>
                              {new Date(evt.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span>{evt.duration_ms ? `${evt.duration_ms}ms` : 'instant'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={evt.status} size="sm" />
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Request/Response Payload Inspector matching Reference Image 2 */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/60 rounded-b-lg">
                        {evt.result_summary && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Response
                            </span>
                            <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap selection:bg-blue-600">
                              {typeof evt.result_summary === 'object'
                                ? JSON.stringify(evt.result_summary, null, 2)
                                : evt.result_summary}
                            </pre>
                          </div>
                        )}

                        {evt.input_summary && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Request
                            </span>
                            <pre className="p-2.5 rounded-lg bg-slate-900 text-blue-300 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap selection:bg-blue-600">
                              {typeof evt.input_summary === 'object'
                                ? JSON.stringify(evt.input_summary, null, 2)
                                : evt.input_summary}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Execution Flow (Top) & Execution Output Terminal (Bottom) (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top: Execution Flow Graph */}
          <FlowGraph events={events} activeStep={activeStep} onSelectStep={(s) => setActiveStep(s)} />

          {/* Bottom: Execution Output Console matching Reference Image 2 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header with Tabs and Actions */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-800 tracking-wide uppercase">Execution Output</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
                  {(['raw', 'json', 'logs'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setOutputTab(tab)}
                      className={`px-3 py-1 rounded-md capitalize transition ${
                        outputTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                      }`}
                    >
                      {tab === 'raw' ? 'Raw Output' : tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                  <button
                    onClick={handleCopyLogs}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition flex items-center gap-1 text-xs"
                    title="Copy Output"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button
                    onClick={handleDownloadLogs}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition flex items-center gap-1 text-xs"
                    title="Download Output"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 min-h-[340px] max-h-[480px] overflow-y-auto leading-relaxed">
              {outputTab === 'raw' && (
                <div className="space-y-3">
                  <div className="text-slate-400">
                    Agent execution {task?.status === 'completed' ? 'completed successfully' : task?.status}
                  </div>
                  <div>Steps processed: {totalSteps} / 12</div>
                  <div>Total duration: {calculateTotalDuration()}s</div>
                  <div>Errors: {errorsCount}</div>

                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    {events.map((e) => (
                      <div key={e.id} className="flex items-start gap-2">
                        <span className="text-slate-500 select-none">
                          [{new Date(e.timestamp).toLocaleTimeString()}]
                        </span>
                        <span className="text-blue-400">{e.action_name}</span>
                        <span className="text-slate-500">-</span>
                        <span
                          className={
                            e.status === 'success'
                              ? 'text-emerald-400'
                              : e.status === 'error'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }
                        >
                          {e.status.toUpperCase()} ({e.duration_ms}ms)
                        </span>
                      </div>
                    ))}
                  </div>

                  {task?.summary && (
                    <div className="mt-4 p-3 rounded bg-slate-900 border border-emerald-900/50 text-emerald-300 font-sans text-xs leading-relaxed">
                      <span className="font-bold text-emerald-400 block mb-1">Final Result Summary:</span>
                      {task.summary}
                    </div>
                  )}
                </div>
              )}

              {outputTab === 'json' && (
                <pre className="text-emerald-400 text-[11px] whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      task_id: task?.id,
                      user_request: task?.user_request,
                      status: task?.status,
                      current_step: task?.current_step,
                      extracted_data: task?.extracted_data,
                      verification_data: task?.verification_data,
                      evidence: task?.evidence_data,
                      events,
                    },
                    null,
                    2
                  )}
                </pre>
              )}

              {outputTab === 'logs' && (
                <pre className="text-slate-300 text-[11px] whitespace-pre-wrap font-mono">{generateLogText()}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
