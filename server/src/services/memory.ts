import { db } from '../database/db.js';
import crypto from 'node:crypto';

export class TaskMemoryStore {
  private taskId: string;

  constructor(taskId: string) {
    this.taskId = taskId;
  }

  set(key: string, value: any): void {
    const id = 'mem_' + crypto.randomBytes(4).toString('hex');
    const jsonVal = JSON.stringify(value);
    const now = new Date().toISOString();

    const existing = db
      .prepare('SELECT id FROM task_memory WHERE task_id = ? AND memory_key = ?')
      .get(this.taskId, key) as { id: string } | undefined;

    if (existing) {
      db.prepare('UPDATE task_memory SET memory_value = ?, updated_at = ? WHERE id = ?').run(
        jsonVal,
        now,
        existing.id
      );
    } else {
      db.prepare(
        'INSERT INTO task_memory (id, task_id, memory_key, memory_value, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(id, this.taskId, key, jsonVal, now);
    }
  }

  get<T = any>(key: string): T | null {
    const row = db
      .prepare('SELECT memory_value FROM task_memory WHERE task_id = ? AND memory_key = ?')
      .get(this.taskId, key) as { memory_value: string } | undefined;

    if (!row) return null;
    try {
      return JSON.parse(row.memory_value) as T;
    } catch {
      return null;
    }
  }

  getAll(): Record<string, any> {
    const rows = db
      .prepare('SELECT memory_key, memory_value FROM task_memory WHERE task_id = ?')
      .all(this.taskId) as { memory_key: string; memory_value: string }[];

    const result: Record<string, any> = {};
    for (const r of rows) {
      try {
        result[r.memory_key] = JSON.parse(r.memory_value);
      } catch {
        result[r.memory_key] = r.memory_value;
      }
    }
    return result;
  }
}
