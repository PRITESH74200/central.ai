import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const norm = status?.toLowerCase() || 'unknown';

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';
  let label = status;

  switch (norm) {
    case 'completed':
    case 'success':
    case 'paid':
    case 'processed':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dot = 'bg-emerald-500';
      label = norm === 'completed' ? 'Completed' : norm === 'paid' ? 'Paid' : 'Success';
      break;

    case 'running':
    case 'planning':
    case 'verifying':
      bg = 'bg-blue-50 text-blue-700 border-blue-200';
      dot = 'bg-blue-500 animate-ping';
      label = norm === 'running' ? 'Running' : norm === 'planning' ? 'Planning' : 'Verifying';
      break;

    case 'waiting_for_approval':
    case 'waiting_for_clarification':
    case 'warning':
    case 'pending':
    case 'unpaid':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      dot = 'bg-amber-500';
      label =
        norm === 'waiting_for_approval'
          ? 'Needs Approval'
          : norm === 'waiting_for_clarification'
          ? 'Needs Clarification'
          : norm === 'unpaid'
          ? 'Unpaid'
          : 'Pending';
      break;

    case 'failed':
    case 'error':
    case 'corrupted':
    case 'overdue':
      bg = 'bg-red-50 text-red-700 border-red-200';
      dot = 'bg-red-500';
      label = norm === 'failed' ? 'Failed' : norm === 'overdue' ? 'Overdue' : 'Error';
      break;

    case 'cancelled':
      bg = 'bg-gray-100 text-gray-700 border-gray-300';
      dot = 'bg-gray-400';
      label = 'Cancelled';
      break;

    case 'queued':
      bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dot = 'bg-indigo-400';
      label = 'Queued';
      break;
  }

  const sizeClasses =
    size === 'lg'
      ? 'px-3 py-1 text-sm font-semibold'
      : size === 'md'
      ? 'px-2.5 py-0.5 text-xs font-semibold'
      : 'px-2 py-0.5 text-[11px] font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${bg} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
};
