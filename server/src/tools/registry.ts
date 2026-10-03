import { z } from 'zod';
import { searchInvoices } from './invoiceSearch.js';
import { readInvoiceFile } from './invoiceReader.js';
import { searchFinanceRecords, createFinanceRecord, verifyFinanceRecord } from './financeTools.js';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType<any>;
  execute: (args: any) => Promise<any> | any;
}

export const toolsRegistry: Record<string, ToolDefinition> = {
  search_invoices: {
    name: 'search_invoices',
    description: 'Search for available invoice files in the documents repository by company, invoice number, or dates.',
    schema: z.object({
      company: z.string().optional(),
      invoice_number: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
    }),
    execute: async (args) => await searchInvoices(args),
  },

  read_invoice: {
    name: 'read_invoice',
    description: 'Parse an authorized invoice PDF document, extract header metadata, line items, amount, dates, and flags missing fields.',
    schema: z.object({
      document_reference: z.string().min(1, 'Document reference or filename is required'),
    }),
    execute: async (args) => await readInvoiceFile(args.document_reference),
  },

  search_finance_records: {
    name: 'search_finance_records',
    description: 'Search the existing company finance database for recorded invoices, payment status, and duplicate checking.',
    schema: z.object({
      company_name: z.string().optional(),
      invoice_number: z.string().optional(),
      payment_status: z.enum(['paid', 'unpaid', 'overdue', 'pending_approval', 'all']).optional(),
    }),
    execute: (args) => {
      const status = args.payment_status === 'all' ? undefined : args.payment_status;
      return searchFinanceRecords({ ...args, payment_status: status });
    },
  },

  create_finance_record: {
    name: 'create_finance_record',
    description: 'Record an invoice in the company finance system. Enforces strict duplicate protection before writing.',
    schema: z.object({
      invoice_number: z.string().min(1),
      company_name: z.string().min(1),
      amount: z.number().positive(),
      currency: z.string().default('USD'),
      issue_date: z.string().min(1),
      due_date: z.string().nullable().optional(),
      payment_status: z.string().optional(),
      source_document: z.string().nullable().optional(),
      idempotency_key: z.string().optional(),
    }),
    execute: (args) => createFinanceRecord(args),
  },

  verify_finance_record: {
    name: 'verify_finance_record',
    description: 'Perform an independent read-after-write verification on a saved finance record against expected fields.',
    schema: z.object({
      record_id: z.string().min(1),
      expected_fields: z.object({
        invoice_number: z.string().optional(),
        company_name: z.string().optional(),
        amount: z.number().optional(),
        issue_date: z.string().optional(),
        due_date: z.string().nullable().optional(),
      }),
    }),
    execute: (args) => verifyFinanceRecord(args.record_id, args.expected_fields),
  },
};

export async function executeToolCall(toolName: string, rawArgs: any): Promise<{ result: any; duration_ms: number; status: 'success' | 'error'; error?: string }> {
  const tool = toolsRegistry[toolName];
  if (!tool) {
    return {
      result: null,
      duration_ms: 0,
      status: 'error',
      error: `Unknown tool: "${toolName}". Available tools: ${Object.keys(toolsRegistry).join(', ')}`,
    };
  }

  const parseResult = tool.schema.safeParse(rawArgs);
  if (!parseResult.success) {
    return {
      result: null,
      duration_ms: 0,
      status: 'error',
      error: `Invalid tool arguments for "${toolName}": ${parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
    };
  }

  const startTime = Date.now();
  try {
    const result = await tool.execute(parseResult.data);
    const duration_ms = Date.now() - startTime;
    return { result, duration_ms, status: 'success' };
  } catch (err: any) {
    const duration_ms = Date.now() - startTime;
    return {
      result: null,
      duration_ms,
      status: 'error',
      error: err?.message || 'Tool execution encountered an internal error.',
    };
  }
}
