import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve(process.cwd(), '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'centralign.sqlite');

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_request TEXT NOT NULL,
      status TEXT NOT NULL,
      current_step INTEGER DEFAULT 0,
      max_steps INTEGER DEFAULT 12,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      error_message TEXT,
      summary TEXT,
      extracted_data TEXT,
      verification_data TEXT,
      evidence_data TEXT
    );

    CREATE TABLE IF NOT EXISTS task_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      action_name TEXT NOT NULL,
      tool_name TEXT,
      input_summary TEXT,
      result_summary TEXT,
      status TEXT NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      error_code TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      company_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      issue_date TEXT NOT NULL,
      due_date TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      source_document TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      approval_type TEXT NOT NULL,
      request_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution_comment TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_memory (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      memory_key TEXT NOT NULL,
      memory_value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_number_company ON invoices(invoice_number, company_name);
    CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_name);
    CREATE INDEX IF NOT EXISTS idx_approvals_task_id ON approvals(task_id);
  `);
}

// Initialize on load
initializeDatabase();
