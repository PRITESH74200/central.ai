import { db } from '../database/db.js';
import { TaskRecord, TaskStatus, AgentDecision, TaskEventRecord } from '../types/index.js';
import { decideNextAction } from './planner.js';
import { executeToolCall } from '../tools/registry.js';
import { TaskMemoryStore } from '../services/memory.js';
import crypto from 'node:crypto';

// Active cancellation tokens map
const activeCancellationMap = new Map<string, boolean>();

export function cancelTaskExecution(taskId: string): boolean {
  activeCancellationMap.set(taskId, true);
  db.prepare(`UPDATE tasks SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    taskId
  );
  recordTaskEvent({
    taskId,
    stepNumber: 99,
    eventType: 'status_change',
    actionName: 'Task Execution Cancelled',
    toolName: null,
    inputSummary: null,
    resultSummary: 'Task execution cancelled by user request.',
    status: 'warning',
    durationMs: 0,
    errorCode: 'USER_CANCELLED',
  });
  return true;
}

export function recordTaskEvent(params: {
  taskId: string;
  stepNumber: number;
  eventType: any;
  actionName: string;
  toolName?: string | null;
  inputSummary?: any;
  resultSummary?: any;
  status: 'success' | 'warning' | 'error' | 'running' | 'pending';
  durationMs?: number;
  errorCode?: string | null;
}): string {
  const id = 'evt_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  const inputStr = params.inputSummary
    ? typeof params.inputSummary === 'string'
      ? params.inputSummary
      : JSON.stringify(params.inputSummary)
    : null;

  const resultStr = params.resultSummary
    ? typeof params.resultSummary === 'string'
      ? params.resultSummary
      : JSON.stringify(params.resultSummary)
    : null;

  db.prepare(`
    INSERT INTO task_events (
      id, task_id, step_number, event_type, action_name, tool_name, input_summary, result_summary, status, duration_ms, error_code, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.taskId,
    params.stepNumber,
    params.eventType,
    params.actionName,
    params.toolName || null,
    inputStr,
    resultStr,
    params.status,
    params.durationMs || 0,
    params.errorCode || null,
    now
  );

  return id;
}

export async function runTaskOrchestrator(taskId: string): Promise<TaskRecord> {
  activeCancellationMap.set(taskId, false);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as unknown as TaskRecord | undefined;
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const memory = new TaskMemoryStore(taskId);

  // Update status to running
  db.prepare(`UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    taskId
  );

  let currentStep = task.current_step || 0;
  const maxSteps = task.max_steps || 12;

  while (currentStep < maxSteps) {
    // Check if cancellation was triggered
    if (activeCancellationMap.get(taskId)) {
      break;
    }

    currentStep++;
    db.prepare(`UPDATE tasks SET current_step = ?, updated_at = ? WHERE id = ?`).run(
      currentStep,
      new Date().toISOString(),
      taskId
    );

    // Fetch past events for observation history
    const pastEvents = db
      .prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY step_number ASC')
      .all(taskId) as unknown as TaskEventRecord[];

    const historySummary = pastEvents
      .filter((e) => e.event_type === 'observation')
      .map((e) => {
        let parsedResult: any = e.result_summary;
        try {
          parsedResult = JSON.parse(e.result_summary || '{}');
        } catch {}
        let parsedInput: any = e.input_summary;
        try {
          parsedInput = JSON.parse(e.input_summary || '{}');
        } catch {}
        return {
          step: e.step_number,
          tool: e.tool_name || undefined,
          action: e.action_name,
          args: parsedInput,
          result: parsedResult,
          status: e.status,
        };
      });

    // 1. Planner Decision
    const decision: AgentDecision = await decideNextAction(
      task.user_request,
      historySummary,
      memory.getAll(),
      currentStep
    );

    // 2. Handle Decision Types
    if (decision.type === 'ask_user') {
      // Create clarification request
      const approvalId = 'appr_' + crypto.randomBytes(4).toString('hex');
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO approvals (id, task_id, approval_type, request_details, status, created_at)
        VALUES (?, ?, 'clarification', ?, 'pending', ?)
      `).run(approvalId, taskId, JSON.stringify(decision), now);

      db.prepare(`UPDATE tasks SET status = 'waiting_for_clarification', updated_at = ? WHERE id = ?`).run(
        now,
        taskId
      );

      recordTaskEvent({
        taskId,
        stepNumber: currentStep,
        eventType: 'clarification_request',
        actionName: 'Clarification Requested',
        toolName: null,
        inputSummary: { question: decision.question, options: decision.options },
        resultSummary: decision.reason,
        status: 'warning',
      });

      break; // Pause orchestrator until user answers clarification
    }

    if (decision.type === 'request_approval') {
      const approvalId = 'appr_' + crypto.randomBytes(4).toString('hex');
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO approvals (id, task_id, approval_type, request_details, status, created_at)
        VALUES (?, ?, 'action_approval', ?, 'pending', ?)
      `).run(approvalId, taskId, JSON.stringify(decision), now);

      db.prepare(`UPDATE tasks SET status = 'waiting_for_approval', updated_at = ? WHERE id = ?`).run(
        now,
        taskId
      );

      recordTaskEvent({
        taskId,
        stepNumber: currentStep,
        eventType: 'approval_request',
        actionName: `Approval Requested: ${decision.action}`,
        toolName: null,
        inputSummary: decision.details,
        resultSummary: decision.reason,
        status: 'warning',
      });

      break; // Pause orchestrator until user approves/rejects
    }

    if (decision.type === 'tool_call') {
      // Record Tool Call Event
      recordTaskEvent({
        taskId,
        stepNumber: currentStep,
        eventType: 'tool_call',
        actionName: `Execute ${decision.tool}`,
        toolName: decision.tool,
        inputSummary: decision.args,
        resultSummary: decision.reason,
        status: 'running',
      });

      // Execute Tool
      const execution = await executeToolCall(decision.tool, decision.args);

      // Record Observation Event
      recordTaskEvent({
        taskId,
        stepNumber: currentStep,
        eventType: 'observation',
        actionName: `Result of ${decision.tool}`,
        toolName: decision.tool,
        inputSummary: decision.args,
        resultSummary: execution.status === 'success' ? execution.result : { error: execution.error },
        status: execution.status === 'success' ? 'success' : 'error',
        durationMs: execution.duration_ms,
        errorCode: execution.status === 'error' ? 'TOOL_EXECUTION_ERROR' : null,
      });

      // If tool was reading invoice, persist extracted data into task memory
      if (decision.tool === 'read_invoice' && execution.status === 'success' && execution.result) {
        memory.set('extracted_invoice', execution.result);
      }
      if (decision.tool === 'create_finance_record' && execution.status === 'success' && execution.result?.record) {
        memory.set('saved_finance_record', execution.result.record);
      }
      if (decision.tool === 'verify_finance_record' && execution.status === 'success') {
        memory.set('verification_result', execution.result);
      }

      // Continue next step in Observe-Decide-Act loop
      continue;
    }

    if (decision.type === 'complete') {
      const now = new Date().toISOString();
      const extracted = memory.get('extracted_invoice') || decision.extracted_data || null;
      const verification = memory.get('verification_result') || null;

      db.prepare(`
        UPDATE tasks SET
          status = 'completed',
          summary = ?,
          extracted_data = ?,
          verification_data = ?,
          evidence_data = ?,
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        decision.summary,
        extracted ? JSON.stringify(extracted) : null,
        verification ? JSON.stringify(verification) : null,
        decision.evidence ? JSON.stringify(decision.evidence) : null,
        now,
        now,
        taskId
      );

      recordTaskEvent({
        taskId,
        stepNumber: currentStep,
        eventType: 'status_change',
        actionName: 'Task Completed Successfully',
        toolName: null,
        inputSummary: null,
        resultSummary: decision.summary,
        status: 'success',
      });

      break;
    }

    if (decision.type === 'fail') {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE tasks SET
          status = 'failed',
          error_message = ?,
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(decision.error_message, now, now, taskId);

      recordTaskEvent({
        taskId,
        stepNumber: currentStep,
        eventType: 'error',
        actionName: 'Task Execution Failed',
        toolName: null,
        inputSummary: null,
        resultSummary: decision.reason,
        status: 'error',
        errorCode: 'EXECUTION_FAILED',
      });

      break;
    }
  }

  // If loop exited due to step limit
  if (currentStep >= maxSteps) {
    const finalTask = db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId) as { status: string };
    if (finalTask.status === 'running') {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE tasks SET
          status = 'partially_completed',
          error_message = 'Reached maximum action limit (12 steps).',
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(now, now, taskId);
    }
  }

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as unknown as TaskRecord;
}
