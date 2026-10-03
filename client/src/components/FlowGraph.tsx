import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { TaskEventRecord } from '../types/index.js';

interface FlowGraphProps {
  events: TaskEventRecord[];
  activeStep?: number;
  onSelectStep?: (step: number) => void;
}

export const FlowGraph: React.FC<FlowGraphProps> = ({ events, activeStep, onSelectStep }) => {
  const [zoom, setZoom] = useState(100);

  // Group events into distinct execution steps
  const steps = events.filter((e) => e.event_type === 'tool_call' || e.event_type === 'observation' || e.step_number === 0);

  // De-duplicate steps by step_number
  const uniqueStepsMap = new Map<number, TaskEventRecord>();
  for (const s of events) {
    if (!uniqueStepsMap.has(s.step_number)) {
      uniqueStepsMap.set(s.step_number, s);
    } else {
      // If observation or completed event exists for this step, prioritize it for status
      const existing = uniqueStepsMap.get(s.step_number)!;
      if (s.event_type === 'observation' || s.status === 'success' || s.status === 'error') {
        uniqueStepsMap.set(s.step_number, s);
      }
    }
  }

  const stepList = Array.from(uniqueStepsMap.values()).sort((a, b) => a.step_number - b.step_number);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 140));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 70));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-slate-800 tracking-wide uppercase">Execution Flow</span>
          <span className="text-[11px] text-slate-400 font-normal">({stepList.length} nodes)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-slate-600">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[11px] font-mono px-1 font-medium text-slate-600">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition ml-1"
            title="Reset Zoom"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="p-6 overflow-x-auto min-h-[190px] flex items-center bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'left center' }}
      >
        <div className="flex items-center gap-3">
          {stepList.map((step, idx) => {
            const isLast = idx === stepList.length - 1;
            const isSelected = activeStep === step.step_number;

            let borderTheme = 'border-emerald-500 shadow-emerald-50';
            let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let StatusIcon = CheckCircle2;

            if (step.status === 'running' || step.status === 'pending') {
              borderTheme = 'border-blue-500 shadow-blue-50';
              badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
              StatusIcon = Clock;
            } else if (step.status === 'warning') {
              borderTheme = 'border-amber-500 shadow-amber-50';
              badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
              StatusIcon = AlertTriangle;
            } else if (step.status === 'error') {
              borderTheme = 'border-red-500 shadow-red-50';
              badgeBg = 'bg-red-50 text-red-700 border-red-200';
              StatusIcon = XCircle;
            }

            return (
              <React.Fragment key={step.id || idx}>
                {/* Node Box */}
                <div
                  onClick={() => onSelectStep?.(step.step_number)}
                  className={`w-44 bg-white rounded-lg border-2 p-3 transition-all cursor-pointer shadow-sm hover:shadow-md flex-shrink-0 ${borderTheme} ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {step.step_number === 0 ? 'Init' : `Step ${step.step_number}`}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${badgeBg}`}>
                      {step.status}
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-slate-800 truncate" title={step.action_name}>
                    {step.action_name}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 font-mono">
                    <span>{step.duration_ms ? `${step.duration_ms}ms` : 'instant'}</span>
                    <StatusIcon size={12} className={step.status === 'error' ? 'text-red-500' : 'text-emerald-500'} />
                  </div>
                </div>

                {/* Connecting arrow / line */}
                {!isLast && (
                  <div className="flex items-center text-slate-300 flex-shrink-0 px-0.5">
                    <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                      <path d="M0 6H20M20 6L15 1M20 6L15 11" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
