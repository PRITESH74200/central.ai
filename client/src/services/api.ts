import axios from 'axios';
import { TaskRecord, TaskEventRecord, InvoiceRecord, FileItem, TaskStats } from '../types/index.js';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export const taskService = {
  async getTasks(params?: { status?: string; search?: string }): Promise<{ tasks: TaskRecord[]; count: number }> {
    const res = await api.get('/tasks', { params });
    return res.data;
  },

  async getStats(): Promise<TaskStats> {
    const res = await api.get('/tasks/stats/summary');
    return res.data.stats;
  },

  async createTask(user_request: string): Promise<TaskRecord> {
    const res = await api.post('/tasks', { user_request });
    return res.data.task;
  },

  async getTask(id: string): Promise<{ task: TaskRecord; pending_approval: any }> {
    const res = await api.get(`/tasks/${id}`);
    return res.data;
  },

  async getEvents(id: string): Promise<{ events: TaskEventRecord[]; count: number }> {
    const res = await api.get(`/tasks/${id}/events`);
    return res.data;
  },

  async submitClarification(id: string, response: string): Promise<any> {
    const res = await api.post(`/tasks/${id}/clarify`, { response });
    return res.data;
  },

  async submitApproval(id: string, approved: boolean, comment?: string): Promise<any> {
    const res = await api.post(`/tasks/${id}/approve`, { approved, comment });
    return res.data;
  },

  async cancelTask(id: string): Promise<any> {
    const res = await api.post(`/tasks/${id}/cancel`);
    return res.data;
  },
};

export const financeService = {
  async getInvoices(params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{
    invoices: InvoiceRecord[];
    pagination: { page: number; limit: number; total_items: number; total_pages: number };
    stats: { total_records: number; total_value: number; unpaid_value: number };
  }> {
    const res = await api.get('/invoices', { params });
    return res.data;
  },

  async createInvoice(data: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const res = await api.post('/invoices', data);
    return res.data.record;
  },

  async updateInvoice(id: string, data: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const res = await api.put(`/invoices/${id}`, data);
    return res.data.invoice;
  },

  async deleteInvoice(id: string): Promise<any> {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  },
};

export const filesService = {
  async getFiles(): Promise<{ files: FileItem[]; count: number }> {
    const res = await api.get('/files');
    return res.data;
  },

  async getFilePreview(fileName: string): Promise<any> {
    const res = await api.get(`/files/${encodeURIComponent(fileName)}/preview`);
    return res.data.extracted;
  },
};

export const settingsService = {
  async getHealth(): Promise<any> {
    const res = await api.get('/health');
    return res.data;
  },

  async getSettings(): Promise<any> {
    const res = await api.get('/settings');
    return res.data;
  },

  async toggleSimulation(enabled: boolean): Promise<any> {
    const res = await api.post('/settings/simulation', { enabled });
    return res.data;
  },
};

export default api;
