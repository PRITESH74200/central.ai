import { describe, it, expect, beforeAll } from 'vitest';
import { db, initializeDatabase } from '../src/database/db.js';
import { searchInvoices } from '../src/tools/invoiceSearch.js';
import { readInvoiceFile } from '../src/tools/invoiceReader.js';
import { searchFinanceRecords, createFinanceRecord, verifyFinanceRecord, setSimulateTemporaryFailure } from '../src/tools/financeTools.js';
import { generateAllSamplePdfs } from '../src/utils/pdfGenerator.js';

describe('CentrAlign AI — Test Suite', () => {
  beforeAll(async () => {
    initializeDatabase();
    await generateAllSamplePdfs();
  });

  describe('Module 4 & 7: Tools and File Processing', () => {
    it('should search invoices and return results sorted newest first', async () => {
      const res = await searchInvoices({ company: 'ABC Technologies' });
      expect(res.status).toBe('success');
      expect(res.match_count).toBeGreaterThanOrEqual(1);
      // Newest should be INV-1002 (issue date: 2026-10-01)
      expect(res.files[0].invoice_number).toBe('INV-1002');
    });

    it('should parse PDF invoice metadata accurately', async () => {
      const data = await readInvoiceFile('INV-1002-ABC_Technologies.pdf');
      expect(data.invoice_number).toBe('INV-1002');
      expect(data.company_name).toBe('ABC Technologies');
      expect(data.amount).toBe(18750.5);
      expect(data.issue_date).toBe('2026-10-01');
      expect(data.due_date).toBe('2026-11-01');
    });

    it('should flag missing due date in edge-case documents', async () => {
      const data = await readInvoiceFile('INV-MISSING-DUE-Innovate_Ltd.pdf');
      expect(data.invoice_number).toBe('INV-4001');
      expect(data.company_name).toBe('Innovate Ltd');
      expect(data.due_date).toBeNull();
      expect(data.missing_fields).toContain('due_date');
    });

    it('should reject corrupted PDF document safely without crashing', async () => {
      await expect(readInvoiceFile('CORRUPTED_DOCUMENT.pdf')).rejects.toThrow();
    });
  });

  describe('Module 6 & 7: Finance Engine, Duplicate Protection & Read-After-Write Verification', () => {
    const testInvNum = 'INV-TEST-' + Date.now();

    it('should create new finance record in SQLite', () => {
      const result = createFinanceRecord({
        invoice_number: testInvNum,
        company_name: 'Test Systems Inc',
        amount: 5400.0,
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
      });

      expect(result.status).toBe('created');
      expect(result.record_id).toBeDefined();
      expect(result.record?.invoice_number).toBe(testInvNum);
    });

    it('should prevent duplicate finance record creation on identical invoice and company', () => {
      const duplicateResult = createFinanceRecord({
        invoice_number: testInvNum,
        company_name: 'Test Systems Inc',
        amount: 5400.0,
        issue_date: '2026-09-01',
      });

      expect(duplicateResult.status).toBe('duplicate_detected');
    });

    it('should independently verify saved finance record against expected fields', () => {
      const search = searchFinanceRecords({ invoice_number: testInvNum });
      expect(search.count).toBe(1);
      const recordId = search.records[0].id;

      const verification = verifyFinanceRecord(recordId, {
        invoice_number: testInvNum,
        company_name: 'Test Systems Inc',
        amount: 5400.0,
        issue_date: '2026-09-01',
      });

      expect(verification.passed).toBe(true);
      expect(verification.checks.field_comparison_passed).toBe(true);
      expect(verification.checks.saved_record_retrieved).toBe(true);
    });

    it('should fail verification if saved record has mismatching fields', () => {
      const search = searchFinanceRecords({ invoice_number: testInvNum });
      const recordId = search.records[0].id;

      const verification = verifyFinanceRecord(recordId, {
        invoice_number: testInvNum,
        amount: 99999.0, // intentional mismatch
      });

      expect(verification.passed).toBe(false);
      expect(verification.checks.field_comparison_passed).toBe(false);
    });
  });

  describe('Module 6: Transient Error Simulation and Recovery', () => {
    it('should simulate transient timeout failure and recover on retry', () => {
      setSimulateTemporaryFailure(true);

      const uniqueInv = 'INV-RETRY-' + Date.now();
      // First attempt: should fail with timeout
      const firstAttempt = createFinanceRecord({
        invoice_number: uniqueInv,
        company_name: 'Retry Corp',
        amount: 3200,
        issue_date: '2026-09-10',
      });
      expect(firstAttempt.status).toBe('error');
      expect(firstAttempt.error_code).toBe('FINANCE_GATEWAY_TIMEOUT');

      // Second attempt (retry): should recover and succeed
      const secondAttempt = createFinanceRecord({
        invoice_number: uniqueInv,
        company_name: 'Retry Corp',
        amount: 3200,
        issue_date: '2026-09-10',
      });
      expect(secondAttempt.status).toBe('created');
      expect(secondAttempt.record_id).toBeDefined();

      setSimulateTemporaryFailure(false);
    });
  });
});
