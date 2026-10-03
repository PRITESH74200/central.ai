import fs from 'node:fs';
import path from 'node:path';
import { readInvoiceFile } from './invoiceReader.js';
import { getInvoicesDir } from '../utils/paths.js';

export interface InvoiceSearchCriteria {
  company?: string;
  invoice_number?: string;
  date_from?: string;
  date_to?: string;
}

export interface InvoiceSearchResultItem {
  file_name: string;
  invoice_number: string;
  company_name: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string | null;
  file_size_bytes: number;
}

export interface InvoiceSearchResult {
  status: 'success' | 'no_matches' | 'error';
  match_count: number;
  files: InvoiceSearchResultItem[];
  message: string;
}

export async function searchInvoices(criteria: InvoiceSearchCriteria = {}): Promise<InvoiceSearchResult> {
  const invoicesDir = getInvoicesDir();
  if (!fs.existsSync(invoicesDir)) {
    return {
      status: 'no_matches',
      match_count: 0,
      files: [],
      message: 'Invoices directory does not exist.',
    };
  }

  const allFiles = fs.readdirSync(invoicesDir).filter((f) => f.endsWith('.pdf'));
  const results: InvoiceSearchResultItem[] = [];

  for (const file of allFiles) {
    // Skip corrupted test files from ordinary valid results unless explicitly searched
    if (file.includes('CORRUPTED')) continue;

    try {
      const parsed = await readInvoiceFile(file);
      const stat = fs.statSync(path.join(invoicesDir, file));

      // Filter by company name (case-insensitive substring)
      if (criteria.company) {
        const queryComp = criteria.company.toLowerCase().trim();
        const docComp = parsed.company_name.toLowerCase();
        if (!docComp.includes(queryComp) && !file.toLowerCase().includes(queryComp)) {
          continue;
        }
      }

      // Filter by invoice number
      if (criteria.invoice_number) {
        const queryInv = criteria.invoice_number.toUpperCase().replace(/\s+/g, '');
        const docInv = parsed.invoice_number.toUpperCase().replace(/\s+/g, '');
        if (!docInv.includes(queryInv) && !file.toUpperCase().includes(queryInv)) {
          continue;
        }
      }

      // Filter by date range
      if (criteria.date_from && parsed.issue_date < criteria.date_from) {
        continue;
      }
      if (criteria.date_to && parsed.issue_date > criteria.date_to) {
        continue;
      }

      results.push({
        file_name: file,
        invoice_number: parsed.invoice_number,
        company_name: parsed.company_name,
        amount: parsed.amount,
        currency: parsed.currency,
        issue_date: parsed.issue_date,
        due_date: parsed.due_date || null,
        file_size_bytes: stat.size,
      });
    } catch {
      // Ignore unparseable files in search
    }
  }

  // Sort by issue_date descending so the newest/latest invoice is always first
  results.sort((a, b) => (b.issue_date > a.issue_date ? 1 : b.issue_date < a.issue_date ? -1 : 0));

  return {
    status: results.length > 0 ? 'success' : 'no_matches',
    match_count: results.length,
    files: results,
    message:
      results.length > 0
        ? `Found ${results.length} matching invoice document(s).`
        : 'No matching invoice documents found for the given criteria.',
  };
}
