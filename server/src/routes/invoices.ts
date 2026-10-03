import { Router } from 'express';
import { db } from '../database/db.js';
import { createFinanceRecord } from '../tools/financeTools.js';
import { InvoiceRecord } from '../types/index.js';

const router = Router();

// GET /api/invoices - Query invoices with search and filters
router.get('/', (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (LOWER(company_name) LIKE ? OR UPPER(invoice_number) LIKE ?)';
      const query = `%${String(search).toLowerCase()}%`;
      params.push(query, query.toUpperCase());
    }

    if (status && status !== 'all') {
      sql += ' AND LOWER(payment_status) = ?';
      params.push(String(status).toLowerCase());
    }

    sql += ' ORDER BY issue_date DESC';

    const allRows = db.prepare(sql).all(...params) as unknown as InvoiceRecord[];

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const totalCount = allRows.length;
    const paginated = allRows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Compute stats
    let totalValue = 0;
    let unpaidValue = 0;
    for (const inv of allRows) {
      const amt = Number(inv.amount) || 0;
      totalValue += amt;
      if (inv.payment_status === 'unpaid' || inv.payment_status === 'overdue') {
        unpaidValue += amt;
      }
    }

    res.json({
      success: true,
      invoices: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total_items: totalCount,
        total_pages: Math.ceil(totalCount / limitNum),
      },
      stats: {
        total_records: totalCount,
        total_value: Math.round(totalValue * 100) / 100,
        unpaid_value: Math.round(unpaidValue * 100) / 100,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', (req, res) => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as InvoiceRecord | undefined;
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice record not found' });
    }
    res.json({ success: true, invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices - Add new invoice record
router.post('/', (req, res) => {
  try {
    const { invoice_number, company_name, amount, currency, issue_date, due_date, payment_status, source_document } = req.body;

    const result = createFinanceRecord({
      invoice_number,
      company_name,
      amount: Number(amount),
      currency: currency || 'USD',
      issue_date,
      due_date,
      payment_status: payment_status || 'unpaid',
      source_document,
    });

    if (result.status === 'duplicate_detected') {
      return res.status(409).json({
        success: false,
        error: result.message,
        duplicate_record_id: result.record_id,
      });
    }

    if (result.status === 'error') {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }

    res.status(201).json({ success: true, record: result.record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/invoices/:id - Update invoice payment status
router.put('/:id', (req, res) => {
  try {
    const { payment_status, amount, due_date } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as InvoiceRecord | undefined;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const updatedStatus = payment_status || existing.payment_status;
    const updatedAmount = amount !== undefined ? Number(amount) : existing.amount;
    const updatedDueDate = due_date !== undefined ? due_date : existing.due_date;

    db.prepare(`
      UPDATE invoices SET payment_status = ?, amount = ?, due_date = ?, updated_at = ? WHERE id = ?
    `).run(updatedStatus, updatedAmount, updatedDueDate, now, req.params.id);

    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as InvoiceRecord;
    res.json({ success: true, invoice: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Invoice record not found' });
    }
    res.json({ success: true, message: `Invoice ${req.params.id} deleted.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
