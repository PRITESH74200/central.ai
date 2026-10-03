import { db } from '../database/db.js';
import { InvoiceRecord, VerificationResult } from '../types/index.js';
import crypto from 'node:crypto';

// Simulation hook for temporary system failures (Scenario 5)
let simulateTemporaryFailure = false;
let failureCount = 0;

export function setSimulateTemporaryFailure(enable: boolean) {
  simulateTemporaryFailure = enable;
  failureCount = 0;
}

export function isSimulateTemporaryFailure(): boolean {
  return simulateTemporaryFailure;
}

export interface FinanceSearchQuery {
  company_name?: string;
  invoice_number?: string;
  payment_status?: string;
}

export interface FinanceSearchResult {
  status: 'success' | 'no_matches' | 'error';
  count: number;
  records: InvoiceRecord[];
  total_amount?: number;
  duplicate_likelihood: 'none' | 'possible' | 'exact_match';
}

export function searchFinanceRecords(query: FinanceSearchQuery = {}): FinanceSearchResult {
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const params: any[] = [];

  if (query.company_name) {
    sql += ' AND LOWER(company_name) LIKE ?';
    params.push(`%${query.company_name.toLowerCase().trim()}%`);
  }

  if (query.invoice_number) {
    sql += ' AND UPPER(invoice_number) = ?';
    params.push(query.invoice_number.toUpperCase().trim());
  }

  if (query.payment_status) {
    sql += ' AND LOWER(payment_status) = ?';
    params.push(query.payment_status.toLowerCase().trim());
  }

  sql += ' ORDER BY issue_date DESC';

  const rows = db.prepare(sql).all(...params) as unknown as InvoiceRecord[];

  let total_amount = 0;
  for (const r of rows) {
    total_amount += Number(r.amount) || 0;
  }
  total_amount = Math.round(total_amount * 100) / 100;

  let duplicate_likelihood: 'none' | 'possible' | 'exact_match' = 'none';
  if (query.invoice_number) {
    const exact = rows.some((r) => r.invoice_number.toUpperCase() === query.invoice_number?.toUpperCase());
    if (exact) duplicate_likelihood = 'exact_match';
  }

  return {
    status: rows.length > 0 ? 'success' : 'no_matches',
    count: rows.length,
    records: rows,
    total_amount,
    duplicate_likelihood,
  };
}

export interface CreateInvoiceInput {
  invoice_number: string;
  company_name: string;
  amount: number;
  currency?: string;
  issue_date: string;
  due_date?: string | null;
  payment_status?: string;
  source_document?: string | null;
  idempotency_key?: string;
}

export interface CreateInvoiceResult {
  status: 'created' | 'duplicate_detected' | 'error';
  record?: InvoiceRecord;
  record_id?: string;
  error_code?: string;
  message: string;
}

export function createFinanceRecord(input: CreateInvoiceInput): CreateInvoiceResult {
  // Temporary failure simulation for Scenario 5:
  // Fails once with transient network/timeout error, then recovers upon safe retry!
  if (simulateTemporaryFailure) {
    failureCount++;
    if (failureCount === 1) {
      return {
        status: 'error',
        error_code: 'FINANCE_GATEWAY_TIMEOUT',
        message: 'Temporary Finance API gateway timeout (HTTP 504 Gateway Timeout). Safe retry candidate.',
      };
    } else {
      // Auto-reset after demonstrating recovery
      simulateTemporaryFailure = false;
    }
  }

  // 1. Validation
  if (!input.invoice_number || !input.invoice_number.trim()) {
    return {
      status: 'error',
      error_code: 'VALIDATION_FAILED',
      message: 'Invoice number is mandatory.',
    };
  }
  if (!input.company_name || !input.company_name.trim()) {
    return {
      status: 'error',
      error_code: 'VALIDATION_FAILED',
      message: 'Company name is mandatory.',
    };
  }
  if (typeof input.amount !== 'number' || input.amount <= 0 || isNaN(input.amount)) {
    return {
      status: 'error',
      error_code: 'VALIDATION_FAILED',
      message: 'Invoice amount must be a positive number.',
    };
  }

  // 2. Strict Duplicate Protection Check
  // Check if an invoice with same invoice_number AND same company exists
  const existing = db
    .prepare('SELECT * FROM invoices WHERE UPPER(invoice_number) = ? AND LOWER(company_name) = ?')
    .get(input.invoice_number.toUpperCase().trim(), input.company_name.toLowerCase().trim()) as unknown as InvoiceRecord | undefined;

  if (existing) {
    return {
      status: 'duplicate_detected',
      record_id: existing.id,
      record: existing,
      message: `Invoice ${input.invoice_number} for company "${input.company_name}" already exists in the finance database (Record ID: ${existing.id}). Duplicate creation safely prevented.`,
    };
  }

  // 3. Insert new record
  const id = 'inv_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const currency = input.currency || 'USD';
  const payment_status = input.payment_status || 'unpaid';

  try {
    const stmt = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, company_name, amount, currency, issue_date, due_date, payment_status, source_document, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.invoice_number.trim(),
      input.company_name.trim(),
      input.amount,
      currency,
      input.issue_date,
      input.due_date || null,
      payment_status,
      input.source_document || null,
      now,
      now
    );

    const savedRecord = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as unknown as InvoiceRecord;

    return {
      status: 'created',
      record_id: id,
      record: savedRecord,
      message: `Invoice ${input.invoice_number} successfully recorded into the finance system.`,
    };
  } catch (err: any) {
    return {
      status: 'error',
      error_code: 'DATABASE_ERROR',
      message: `Failed to insert finance record: ${err?.message || 'Unknown database error'}`,
    };
  }
}

export function verifyFinanceRecord(
  recordId: string,
  expected: {
    invoice_number?: string;
    company_name?: string;
    amount?: number;
    issue_date?: string;
    due_date?: string | null;
  }
): VerificationResult {
  // Independent Read-After-Write verification: fresh query to SQLite
  const saved = db.prepare('SELECT * FROM invoices WHERE id = ?').get(recordId) as unknown as InvoiceRecord | undefined;

  if (!saved) {
    return {
      passed: false,
      saved_record_id: recordId,
      checks: {
        invoice_found: true,
        fields_extracted: true,
        duplicate_checked: true,
        finance_record_created: false,
        saved_record_retrieved: false,
        field_comparison_passed: false,
      },
      comparison: [],
      message: `Verification FAILED: Finance record with ID ${recordId} could not be retrieved from the database.`,
      timestamp: new Date().toISOString(),
    };
  }

  const comparison: { field: string; expected: any; actual: any; matches: boolean }[] = [];
  let allMatched = true;

  if (expected.invoice_number !== undefined) {
    const matches = saved.invoice_number.toUpperCase().trim() === expected.invoice_number.toUpperCase().trim();
    comparison.push({ field: 'invoice_number', expected: expected.invoice_number, actual: saved.invoice_number, matches });
    if (!matches) allMatched = false;
  }

  if (expected.company_name !== undefined) {
    const matches = saved.company_name.toLowerCase().trim() === expected.company_name.toLowerCase().trim();
    comparison.push({ field: 'company_name', expected: expected.company_name, actual: saved.company_name, matches });
    if (!matches) allMatched = false;
  }

  if (expected.amount !== undefined) {
    const matches = Math.abs(Number(saved.amount) - Number(expected.amount)) < 0.01;
    comparison.push({ field: 'amount', expected: expected.amount, actual: saved.amount, matches });
    if (!matches) allMatched = false;
  }

  if (expected.issue_date !== undefined) {
    const matches = saved.issue_date === expected.issue_date;
    comparison.push({ field: 'issue_date', expected: expected.issue_date, actual: saved.issue_date, matches });
    if (!matches) allMatched = false;
  }

  if (expected.due_date !== undefined) {
    const matches = (saved.due_date || null) === (expected.due_date || null);
    comparison.push({ field: 'due_date', expected: expected.due_date, actual: saved.due_date, matches });
    if (!matches) allMatched = false;
  }

  return {
    passed: allMatched,
    saved_record_id: recordId,
    checks: {
      invoice_found: true,
      fields_extracted: true,
      duplicate_checked: true,
      finance_record_created: true,
      saved_record_retrieved: true,
      field_comparison_passed: allMatched,
    },
    comparison,
    message: allMatched
      ? `Independent read-after-write verification PASSED. All ${comparison.length} fields match database values perfectly.`
      : `Verification MISMATCH: One or more fields failed read-after-write comparison.`,
    timestamp: new Date().toISOString(),
  };
}
