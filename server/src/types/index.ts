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

export type EventType =
  | 'plan'
  | 'tool_call'
  | 'observation'
  | 'approval_request'
  | 'clarification_request'
  | 'verification'
  | 'decision'
  | 'status_change'
  | 'error';

export type EventStatus = 'success' | 'warning' | 'error' | 'running' | 'pending';

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
  extracted_data: string | null; // JSON
  verification_data: string | null; // JSON
  evidence_data: string | null; // JSON
}

export interface TaskEventRecord {
  id: string;
  task_id: string;
  step_number: number;
  event_type: EventType;
  action_name: string;
  tool_name: string | null;
  input_summary: string | null;
  result_summary: string | null;
  status: EventStatus;
  duration_ms: number;
  error_code: string | null;
  timestamp: string;
}

export type PaymentStatus = 'paid' | 'unpaid' | 'overdue' | 'pending_approval';

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  company_name: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string | null;
  payment_status: PaymentStatus;
  source_document: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRecord {
  id: string;
  task_id: string;
  approval_type: 'financial_record_creation' | 'clarification' | 'action_approval';
  request_details: string; // JSON
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
  resolution_comment: string | null;
}

export interface ExtractedInvoiceData {
  invoice_number: string;
  company_name: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date?: string | null;
  missing_fields?: string[];
  extraction_warnings?: string[];
  source_document?: string;
}

export interface VerificationChecklist {
  invoice_found: boolean;
  fields_extracted: boolean;
  duplicate_checked: boolean;
  finance_record_created: boolean;
  saved_record_retrieved: boolean;
  field_comparison_passed: boolean;
}

export interface VerificationResult {
  passed: boolean;
  saved_record_id?: string;
  checks: VerificationChecklist;
  comparison?: {
    field: string;
    expected: any;
    actual: any;
    matches: boolean;
  }[];
  message: string;
  timestamp: string;
}

export type AgentDecision =
  | {
      type: 'tool_call';
      tool: string;
      args: Record<string, any>;
      reason: string;
    }
  | {
      type: 'ask_user';
      question: string;
      options?: string[];
      reason: string;
    }
  | {
      type: 'request_approval';
      action: string;
      details: Record<string, any>;
      reason: string;
    }
  | {
      type: 'complete';
      summary: string;
      extracted_data?: Record<string, any>;
      evidence?: Record<string, any>;
    }
  | {
      type: 'fail';
      error_message: string;
      reason: string;
    };
