import { db, initializeDatabase } from './db.js';
import { generateAllSamplePdfs } from '../utils/pdfGenerator.js';

export async function seedDatabase() {
  console.log('--- Initializing Database & Generating PDF Files ---');
  initializeDatabase();

  // 1. Generate PDFs
  await generateAllSamplePdfs();
  console.log('✓ Sample PDF invoices generated in data/invoices/');

  // 2. Clear existing records for clean reproducible state
  db.exec('DELETE FROM approvals;');
  db.exec('DELETE FROM task_memory;');
  db.exec('DELETE FROM task_events;');
  db.exec('DELETE FROM tasks;');
  db.exec('DELETE FROM invoices;');

  // 3. Seed Initial Invoices in Finance Database
  // Pre-seed INV-1001 so duplicate detection can be demonstrated in Scenario 3!
  // Pre-seed Global Corp invoices (2 unpaid, 1 paid) for Scenario 2 calculation!
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, company_name, amount, currency, issue_date, due_date, payment_status, source_document, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  // Pre-seeded: INV-1001 (ABC Technologies - already recorded!)
  insertInvoice.run(
    'inv_abc_1001',
    'INV-1001',
    'ABC Technologies',
    12500.00,
    'USD',
    '2026-09-15',
    '2026-10-15',
    'paid',
    'INV-1001-ABC_Technologies.pdf',
    '2026-09-16T10:00:00.000Z',
    '2026-09-16T10:00:00.000Z'
  );

  // Pre-seeded: INV-2000 (Global Corp - paid)
  insertInvoice.run(
    'inv_gc_2000',
    'INV-2000',
    'Global Corp',
    4500.00,
    'USD',
    '2026-07-01',
    '2026-08-01',
    'paid',
    'INV-2000-Global_Corp.pdf',
    '2026-07-02T09:30:00.000Z',
    '2026-07-02T09:30:00.000Z'
  );

  // Pre-seeded: INV-2001 (Global Corp - unpaid: $9,200)
  insertInvoice.run(
    'inv_gc_2001',
    'INV-2001',
    'Global Corp',
    9200.00,
    'USD',
    '2026-08-20',
    '2026-09-20',
    'unpaid',
    'INV-2001-Global_Corp.pdf',
    '2026-08-21T11:15:00.000Z',
    '2026-08-21T11:15:00.000Z'
  );

  // Pre-seeded: INV-2002 (Global Corp - unpaid: $14,400)
  insertInvoice.run(
    'inv_gc_2002',
    'INV-2002',
    'Global Corp',
    14400.00,
    'USD',
    '2026-09-10',
    '2026-10-10',
    'unpaid',
    'INV-2002-Global_Corp.pdf',
    '2026-09-11T14:20:00.000Z',
    '2026-09-11T14:20:00.000Z'
  );

  // Pre-seeded: INV-3001 (Acme Solutions - unpaid: $5,600)
  insertInvoice.run(
    'inv_acme_3001',
    'INV-3001',
    'Acme Solutions',
    5600.00,
    'USD',
    '2026-09-05',
    '2026-10-05',
    'unpaid',
    'INV-3001-Acme_Solutions.pdf',
    '2026-09-06T16:45:00.000Z',
    '2026-09-06T16:45:00.000Z'
  );

  console.log('✓ Seeded 5 initial finance invoice records.');

  // 4. Seed 2 Realistic Historical Tasks for immediate visualization
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, user_request, status, current_step, max_steps, created_at, updated_at, completed_at, error_message, summary, extracted_data, verification_data, evidence_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO task_events (
      id, task_id, step_number, event_type, action_name, tool_name, input_summary, result_summary, status, duration_ms, error_code, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sample Task 1: Historical completed task
  const taskId1 = 'task_init_demo_01';
  insertTask.run(
    taskId1,
    'Find all unpaid invoices from Global Corp and calculate total outstanding amount',
    'completed',
    4,
    12,
    new Date(Date.now() - 3600000 * 2).toISOString(),
    new Date(Date.now() - 3600000 * 1.9).toISOString(),
    new Date(Date.now() - 3600000 * 1.9).toISOString(),
    null,
    'Identified 2 unpaid invoices for Global Corp (INV-2001 for $9,200.00 and INV-2002 for $14,400.00). Total outstanding amount calculated as $23,600.00 USD.',
    JSON.stringify({
      company: 'Global Corp',
      unpaid_count: 2,
      total_amount: 23600.00,
      currency: 'USD',
      invoices: ['INV-2001', 'INV-2002']
    }),
    JSON.stringify({
      passed: true,
      checks: {
        invoice_found: true,
        fields_extracted: true,
        duplicate_checked: true,
        finance_record_created: true,
        saved_record_retrieved: true,
        field_comparison_passed: true
      },
      message: 'Independent mathematical calculation verified against active finance database.',
      timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString()
    }),
    JSON.stringify({
      source: 'Finance Database Query',
      records: ['inv_gc_2001', 'inv_gc_2002'],
      calculated_total: 23600.00
    })
  );

  // Events for Task 1
  insertEvent.run(
    'evt_01_1',
    taskId1,
    1,
    'plan',
    'Analyze Request & Plan Tools',
    null,
    JSON.stringify({ intent: 'Retrieve unpaid records for Global Corp and calculate sum' }),
    JSON.stringify({ steps: ['search_finance_records', 'filter_unpaid', 'calculate_total'] }),
    'success',
    120,
    null,
    new Date(Date.now() - 3600000 * 1.98).toISOString()
  );

  insertEvent.run(
    'evt_01_2',
    taskId1,
    2,
    'tool_call',
    'Search Finance Records',
    'search_finance_records',
    JSON.stringify({ company: 'Global Corp' }),
    JSON.stringify({ found: 3, records: ['INV-2000 (paid)', 'INV-2001 (unpaid)', 'INV-2002 (unpaid)'] }),
    'success',
    45,
    null,
    new Date(Date.now() - 3600000 * 1.96).toISOString()
  );

  insertEvent.run(
    'evt_01_3',
    taskId1,
    3,
    'observation',
    'Filter and Deterministic Calculation',
    null,
    JSON.stringify({ unpaid_invoices: [9200, 14400] }),
    JSON.stringify({ count: 2, sum: 23600.00, currency: 'USD' }),
    'success',
    15,
    null,
    new Date(Date.now() - 3600000 * 1.93).toISOString()
  );

  insertEvent.run(
    'evt_01_4',
    taskId1,
    4,
    'decision',
    'Task Completion and Verification',
    null,
    JSON.stringify({ verified: true }),
    JSON.stringify({ summary: 'Calculation of $23,600.00 verified and presented.' }),
    'success',
    80,
    null,
    new Date(Date.now() - 3600000 * 1.9).toISOString()
  );

  console.log('✓ Seeded historical demo task with execution timeline events.');
  console.log('--- Database Seeding Complete ---');
}

// Run directly if invoked via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
