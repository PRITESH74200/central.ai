import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  Activity,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check,
  Shield,
  Layers,
} from 'lucide-react';
import { taskService } from '../services/api.js';
import { TaskRecord, TaskEventRecord } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';

interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  options?: string[];
  approvalDetails?: any;
  taskId?: string;
  events?: TaskEventRecord[];
  status?: string;
}

export const NewTaskChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      content:
        'Hello! I am your CentrAlign AI autonomous worker. What operation would you like me to plan, execute, and verify for you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [priority, setPriority] = useState<'normal' | 'high' | 'critical'>('normal');
  const [requireApproval, setRequireApproval] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll active task if one is running
  useEffect(() => {
    if (!activeTaskId) return;

    const interval = setInterval(async () => {
      try {
        const { task, pending_approval } = await taskService.getTask(activeTaskId);
        const { events } = await taskService.getEvents(activeTaskId);

        // Check if task needs clarification
        if (task.status === 'waiting_for_clarification' && pending_approval) {
          const details = pending_approval.request_details;
          setMessages((prev) => {
            const hasClarification = prev.some((m) => m.id === `clarify_${task.id}`);
            if (hasClarification) return prev;
            return [
              ...prev,
              {
                id: `clarify_${task.id}`,
                sender: 'agent',
                content: details.question || 'Clarification required before proceeding.',
                options: details.options || [],
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                taskId: task.id,
              },
            ];
          });
          setIsProcessing(false);
        }

        // Check if task needs approval
        if (task.status === 'waiting_for_approval' && pending_approval) {
          const details = pending_approval.request_details;
          setMessages((prev) => {
            const hasApproval = prev.some((m) => m.id === `appr_${task.id}`);
            if (hasApproval) return prev;
            return [
              ...prev,
              {
                id: `appr_${task.id}`,
                sender: 'agent',
                content: `Action checkpoint reached: ${details.action}. Reason: ${details.reason}`,
                approvalDetails: details,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                taskId: task.id,
              },
            ];
          });
          setIsProcessing(false);
        }

        // Check completion or failure
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'partially_completed') {
          setMessages((prev) => {
            const hasFinal = prev.some((m) => m.id === `final_${task.id}`);
            if (hasFinal) return prev;
            return [
              ...prev,
              {
                id: `final_${task.id}`,
                sender: 'agent',
                content:
                  task.status === 'completed'
                    ? `${task.summary || 'Task completed successfully and read-after-write verified.'}`
                    : `Task halted: ${task.error_message || 'Execution stopped.'}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                taskId: task.id,
                status: task.status,
                events,
              },
            ];
          });
          setIsProcessing(false);
          setActiveTaskId(null);
        }
      } catch (err) {
        console.error('Error polling task:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTaskId]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput('');

    // Add user message
    const userMsg: Message = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const task = await taskService.createTask(userText);
      setActiveTaskId(task.id);

      // Initial acknowledgement message from agent
      const ackMsg: Message = {
        id: 'ack_' + task.id,
        sender: 'agent',
        content: `I've initialized autonomous task #${task.id}. Analyzing the goal, selecting tools, and starting execution...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        taskId: task.id,
      };
      setMessages((prev) => [...prev, ackMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'system',
          content: `Failed to dispatch task: ${err?.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsProcessing(false);
    }
  };

  const handleClarifyOption = async (taskId: string, option: string) => {
    try {
      setMessages((prev) => [
        ...prev,
        {
          id: 'user_clarify_' + Date.now(),
          sender: 'user',
          content: option,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsProcessing(true);
      await taskService.submitClarification(taskId, option);
      setActiveTaskId(taskId);
    } catch (err: any) {
      alert(`Clarification failed: ${err.message}`);
    }
  };

  const handleApprovalAction = async (taskId: string, approved: boolean) => {
    try {
      setMessages((prev) => [
        ...prev,
        {
          id: 'user_appr_' + Date.now(),
          sender: 'user',
          content: approved ? 'Approved' : 'Rejected',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsProcessing(true);
      await taskService.submitApproval(taskId, approved);
      setActiveTaskId(taskId);
    } catch (err: any) {
      alert(`Approval submission failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      {/* Main Chat Workspace */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900">Task Conversation</h2>
              <p className="text-xs text-slate-500">Natural language goal planning & execution</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTaskId && (
              <button
                onClick={() => navigate(`/execution/${activeTaskId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
              >
                <Activity size={14} className="animate-pulse" />
                <span>View Live Execution</span>
                <ChevronRight size={13} />
              </button>
            )}

            <button
              onClick={() => {
                setMessages([messages[0]]);
                setActiveTaskId(null);
                setIsProcessing(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              title="Reset Conversation"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs ${
                  msg.sender === 'user' ? 'bg-slate-800' : 'bg-blue-600 shadow-sm'
                }`}
              >
                {msg.sender === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <p>{msg.content}</p>

                  {/* Clarification Choice Options */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                        Select a company:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => msg.taskId && handleClarifyOption(msg.taskId, opt)}
                            className="px-3 py-1.5 bg-white border border-blue-300 hover:border-blue-600 text-blue-700 rounded-lg text-xs font-semibold transition shadow-sm hover:bg-blue-50"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approval Checkpoint Options */}
                  {msg.approvalDetails && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                      <button
                        onClick={() => msg.taskId && handleApprovalAction(msg.taskId, true)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        Approve & Proceed
                      </button>
                      <button
                        onClick={() => msg.taskId && handleApprovalAction(msg.taskId, false)}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`flex items-center gap-2 text-[10px] text-slate-400 ${
                    msg.sender === 'user' ? 'justify-end' : ''
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.status && <StatusBadge status={msg.status} size="sm" />}
                  {msg.taskId && (
                    <button
                      onClick={() => navigate(`/execution/${msg.taskId}`)}
                      className="text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>Task {msg.taskId}</span>
                      <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-3 max-w-lg">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                <Bot size={15} />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                <span>Agent is analyzing request and executing tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Give the AI worker instructions..."
              disabled={isProcessing}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 bg-slate-50 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Side Configuration Panel */}
      <div className="w-full md:w-80 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders size={16} className="text-slate-700" />
            <h3 className="font-semibold text-sm text-slate-900">Execution Parameters</h3>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
              Task Priority
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
              {(['normal', 'high', 'critical'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-1.5 rounded-lg capitalize transition ${
                    priority === p ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Available Tools */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
              Active Tool Registry
            </label>
            <div className="space-y-1.5 text-xs">
              {[
                { name: 'search_invoices', desc: 'File Document Search' },
                { name: 'read_invoice', desc: 'PDF Parser & Metadata' },
                { name: 'search_finance_records', desc: 'SQLite Finance Query' },
                { name: 'create_finance_record', desc: 'Duplicate Protected Write' },
                { name: 'verify_finance_record', desc: 'Read-After-Write Verification' },
              ].map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div>
                    <span className="font-mono text-[11px] font-semibold text-slate-800">{tool.name}</span>
                    <p className="text-[10px] text-slate-400">{tool.desc}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" title="Available" />
                </div>
              ))}
            </div>
          </div>

          {/* Execution Constraints */}
          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide block">Constraints</span>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Max Actions:</span>
              <span className="font-semibold text-slate-800">12 steps / task</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Model Temperature:</span>
              <span className="font-semibold text-slate-800">0.1 (Bounded)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Independent Verification:</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <Check size={12} /> Mandatory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
