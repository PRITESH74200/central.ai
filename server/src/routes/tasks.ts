import { Router } from 'express';
import { db } from '../database/db.js';
import { runTaskOrchestrator, cancelTaskExecution, recordTaskEvent } from '../agent/orchestrator.js';
import { TaskRecord, TaskEventRecord, ApprovalRecord } from '../types/index.js';
import crypto from 'node:crypto';

const router = Router();

// GET /api/tasks - List all tasks with optional status filter
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND LOWER(user_request) LIKE ?';
      params.push(`%${String(search).toLowerCase()}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const tasks = db.prepare(sql).all(...params) as unknown as TaskRecord[];
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/stats/summary - Real stats for dashboard cards
router.get('/stats/summary', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
    const completedRow = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get() as { count: number };
    const runningRow = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('running', 'planning', 'queued', 'verifying')").get() as { count: number };
    const failedRow = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('failed', 'partially_completed')").get() as { count: number };

    res.json({
      success: true,
      stats: {
        total: totalRow.count,
        completed: completedRow.count,
        in_progress: runningRow.count,
        failed: failedRow.count,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks - Create task and run autonomous worker
router.post('/', async (req, res) => {
  try {
    const { user_request } = req.body;
    if (!user_request || typeof user_request !== 'string' || !user_request.trim()) {
      return res.status(400).json({ success: false, error: 'user_request is required and cannot be empty.' });
    }

    const taskId = 'task_' + Date.now().toString().slice(-6) + '_' + crypto.randomBytes(3).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (
        id, user_request, status, current_step, max_steps, created_at, updated_at
      ) VALUES (?, ?, 'queued', 0, 12, ?, ?)
    `).run(taskId, user_request.trim(), now, now);

    recordTaskEvent({
      taskId,
      stepNumber: 0,
      eventType: 'status_change',
      actionName: 'Task Initialized & Queued',
      toolName: null,
      inputSummary: { request: user_request.trim() },
      resultSummary: 'Task added to execution queue.',
      status: 'pending',
    });

    // Run orchestrator asynchronously in the background so API responds immediately
    setImmediate(async () => {
      try {
        await runTaskOrchestrator(taskId);
      } catch (err) {
        console.error(`Error executing task ${taskId}:`, err);
      }
    });

    const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as unknown as TaskRecord;
    res.status(201).json({ success: true, task: createdTask });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/:id - Detailed task view
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as unknown as TaskRecord | undefined;
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Parse JSON blobs safely
    const parsed = {
      ...task,
      extracted_data: task.extracted_data ? JSON.parse(task.extracted_data) : null,
      verification_data: task.verification_data ? JSON.parse(task.verification_data) : null,
      evidence_data: task.evidence_data ? JSON.parse(task.evidence_data) : null,
    };

    // Also get any pending approval
    const pendingApproval = db
      .prepare("SELECT * FROM approvals WHERE task_id = ? AND status = 'pending'")
      .get(req.params.id) as unknown as ApprovalRecord | undefined;

    res.json({
      success: true,
      task: parsed,
      pending_approval: pendingApproval
        ? { ...pendingApproval, request_details: JSON.parse(pendingApproval.request_details) }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/:id/events - Timeline and execution flow events
router.get('/:id/events', (req, res) => {
  try {
    const events = db
      .prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY step_number ASC, timestamp ASC')
      .all(req.params.id) as unknown as TaskEventRecord[];

    const parsedEvents = events.map((e) => ({
      ...e,
      input_summary: e.input_summary ? tryParseJson(e.input_summary) : null,
      result_summary: e.result_summary ? tryParseJson(e.result_summary) : null,
    }));

    res.json({ success: true, count: parsedEvents.length, events: parsedEvents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/clarify - Submit clarification response and resume
router.post('/:id/clarify', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({ success: false, error: 'Clarification response is required.' });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as unknown as TaskRecord | undefined;
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const now = new Date().toISOString();

    // Mark approval resolved
    db.prepare(`
      UPDATE approvals SET status = 'approved', resolved_at = ?, resolution_comment = ?
      WHERE task_id = ? AND status = 'pending'
    `).run(now, response, taskId);

    // Update original user request with clarification for planner context
    const updatedRequest = `${task.user_request} (Clarification provided by user: ${response})`;
    db.prepare(`UPDATE tasks SET user_request = ?, status = 'running', updated_at = ? WHERE id = ?`).run(
      updatedRequest,
      now,
      taskId
    );

    recordTaskEvent({
      taskId,
      stepNumber: (task.current_step || 0) + 1,
      eventType: 'status_change',
      actionName: 'Clarification Received',
      inputSummary: { clarification: response },
      resultSummary: 'Resuming task execution with clarified parameters.',
      status: 'success',
    });

    // Resume orchestrator
    setImmediate(async () => {
      try {
        await runTaskOrchestrator(taskId);
      } catch (err) {
        console.error(`Error resuming task ${taskId}:`, err);
      }
    });

    res.json({ success: true, message: 'Clarification received. Task execution resumed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/approve - Approve or reject pending checkpoint
router.post('/:id/approve', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { approved, comment } = req.body;

    const now = new Date().toISOString();
    const status = approved ? 'approved' : 'rejected';

    db.prepare(`
      UPDATE approvals SET status = ?, resolved_at = ?, resolution_comment = ?
      WHERE task_id = ? AND status = 'pending'
    `).run(status, now, comment || null, taskId);

    if (approved) {
      db.prepare(`UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?`).run(now, taskId);
      recordTaskEvent({
        taskId,
        stepNumber: 90,
        eventType: 'status_change',
        actionName: 'Approval Granted',
        resultSummary: comment || 'Action checkpoint approved by user.',
        status: 'success',
      });
      setImmediate(() => runTaskOrchestrator(taskId));
    } else {
      db.prepare(`UPDATE tasks SET status = 'cancelled', updated_at = ?, error_message = ? WHERE id = ?`).run(
        now,
        `User rejected approval: ${comment || 'No reason provided'}`,
        taskId
      );
      recordTaskEvent({
        taskId,
        stepNumber: 90,
        eventType: 'status_change',
        actionName: 'Approval Rejected',
        resultSummary: comment || 'Action checkpoint was rejected by user.',
        status: 'warning',
      });
    }

    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/cancel - Cancel task execution
router.post('/:id/cancel', (req, res) => {
  try {
    const taskId = req.params.id;
    cancelTaskExecution(taskId);
    res.json({ success: true, message: `Task ${taskId} cancelled.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

export default router;
