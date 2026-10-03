export type TaskStatus =
  | 'queued'
  | 'planning'
  | 'running'
  | 'waiting_for_approval'
  | 'waiting_for_clarification'
  | 'verifying'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelled';

export interface TaskRecord {
  id: string;
  user_request: string;
  status: TaskStatus;
  current_step: number;
  max_steps: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error_message: string | null;
  summary: string | null;
  extracted_data: any;
  verification_data: any;
  evidence_data: any;
}

export interface TaskEventRecord {
  id: string;
  task_id: string;
  step_number: number;
  event_type: string;
  action_name: string;
  tool_name: string | null;
  input_summary: any;
  result_summary: any;
  status: 'success' | 'warning' | 'error' | 'running' | 'pending';
  duration_ms: number;
  error_code: string | null;
  timestamp: string;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  company_name: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string | null;
  payment_status: 'paid' | 'unpaid' | 'overdue' | 'pending_approval';
  source_document: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  file_name: string;
  file_size: number;
  modified_at: string;
  status: 'processed' | 'warning' | 'corrupted';
  company: string;
  invoice_number: string | null;
  amount: number | null;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  missing_fields: string[];
  warnings: string[];
}

export interface TaskStats {
  total: number;
  completed: number;
  in_progress: number;
  failed: number;
}
