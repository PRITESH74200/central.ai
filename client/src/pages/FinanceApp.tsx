import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Edit2,
  X,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { financeService } from '../services/api.js';
import { InvoiceRecord } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const FinanceApp: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [stats, setStats] = useState({ total_records: 0, total_value: 0, unpaid_value: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<{
    invoice_number: string;
    company_name: string;
    amount: string;
    currency: string;
    issue_date: string;
    due_date: string;
    payment_status: 'paid' | 'unpaid' | 'overdue' | 'pending_approval';
  }>({
    invoice_number: '',
    company_name: '',
    amount: '',
    currency: 'USD',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_status: 'unpaid',
  });

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await financeService.getInvoices({
        search,
        status: statusFilter,
        page,
        limit: 15,
      });
      setInvoices(data.invoices);
      setStats(data.stats);
      setTotalPages(data.pagination.total_pages || 1);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search, statusFilter, page]);

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.invoice_number.trim() || !formData.company_name.trim() || !formData.amount) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setSubmitting(true);
      await financeService.createInvoice({
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date || null,
      });
      setAddModalOpen(false);
      setFormData({
        invoice_number: '',
        company_name: '',
        amount: '',
        currency: 'USD',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        payment_status: 'unpaid',
      });
      loadInvoices();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create invoice record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, invNum: string) => {
    if (!confirm(`Delete finance invoice record ${invNum}?`)) return;
    try {
      await financeService.deleteInvoice(id);
      loadInvoices();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleStatusToggle = async (invoice: InvoiceRecord) => {
    const nextStatus = invoice.payment_status === 'paid' ? 'unpaid' : 'paid';
    try {
      await financeService.updateInvoice(invoice.id, { payment_status: nextStatus });
      loadInvoices();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Finance Records</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              ERP Simulation
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simulated company accounting database accessible by the AI worker through controlled tools.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInvoices}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Plus size={15} />
            <span>Add Invoice</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Invoices Recorded</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_records}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Receipt size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Recorded Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${stats.total_value.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Outstanding Unpaid</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">${stats.unpaid_value.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Invoices Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company or invoice ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {(
              [
                { id: 'all', label: 'All Records' },
                { id: 'unpaid', label: 'Unpaid' },
                { id: 'paid', label: 'Paid' },
                { id: 'overdue', label: 'Overdue' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setStatusFilter(f.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Source Doc</th>
                <th className="py-3 px-4">Added On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No invoice records found in the database.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{inv.invoice_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inv.company_name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {inv.currency}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {inv.due_date ? (
                        inv.due_date
                      ) : (
                        <span className="text-amber-600 font-medium">Missing Due Date</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleStatusToggle(inv)}
                        title="Click to toggle status"
                        className="cursor-pointer"
                      >
                        <StatusBadge status={inv.payment_status} />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                      {inv.source_document || 'Manual Entry'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Invoice Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-sm text-slate-900">Add Finance Record</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddInvoice} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Invoice Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-5001"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Global Corp"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="15000.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
