import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  ExternalLink,
  X,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';
import { filesService } from '../services/api.js';
import { FileItem } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const FilesViewer: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await filesService.getFiles();
      setFiles(data.files);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const filtered = files.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.file_name.toLowerCase().includes(q) || f.company.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Documents Repository</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Restricted Directory
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorized source documents available to the worker. Strict sandbox limits arbitrary path access.
          </p>
        </div>

        <button
          onClick={loadFiles}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
        >
          <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Files Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by company or filename..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">{filtered.length} files available</span>
        </div>

        {/* Files Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Parser Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No documents found.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.file_name} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 flex items-center gap-2">
                      <FileText size={15} className="text-blue-500 flex-shrink-0" />
                      <span>{f.file_name}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{f.company}</td>
                    <td className="py-3 px-4 font-mono text-blue-600">{f.invoice_number || '—'}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {f.amount !== null ? `$${f.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {f.due_date ? (
                        f.due_date
                      ) : f.status === 'warning' ? (
                        <span className="text-amber-600 font-semibold">Missing Due Date</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedFile(f)}
                        className="p-1 text-slate-500 hover:text-blue-600 rounded transition"
                        title="Inspect extraction"
                      >
                        <Eye size={15} />
                      </button>
                      <a
                        href={`/api/files/${encodeURIComponent(f.file_name)}/raw`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-500 hover:text-slate-800 inline-block rounded transition"
                        title="Open PDF"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected File Details Drawer / Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <h3 className="font-semibold text-sm text-slate-900 truncate max-w-xs">{selectedFile.file_name}</h3>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {selectedFile.status === 'corrupted' && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <ShieldAlert size={16} className="flex-shrink-0" />
                  <span>Unreadable test document. Intentionally corrupted stream to test worker resilience.</span>
                </div>
              )}

              {selectedFile.warnings && selectedFile.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>Extraction Warnings:</span>
                  </div>
                  {selectedFile.warnings.map((w, i) => (
                    <p key={i} className="pl-5 text-[11px]">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex justify-between">
                  <span className="text-slate-500">Company:</span>
                  <span className="font-bold text-slate-800">{selectedFile.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Number:</span>
                  <span className="font-mono font-bold text-blue-600">{selectedFile.invoice_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedFile.amount !== null
                      ? `$${selectedFile.amount.toFixed(2)} ${selectedFile.currency}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Issue Date:</span>
                  <span className="font-medium text-slate-800">{selectedFile.issue_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date:</span>
                  <span className="font-medium text-slate-800">
                    {selectedFile.due_date || <span className="text-amber-600">Missing from Document</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size:</span>
                  <span className="font-mono text-slate-600">{(selectedFile.file_size / 1024).toFixed(1)} KB</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <a
                  href={`/api/files/${encodeURIComponent(selectedFile.file_name)}/raw`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <ExternalLink size={13} />
                  <span>Open PDF in New Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
