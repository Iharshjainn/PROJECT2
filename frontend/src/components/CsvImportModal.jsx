import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, FileSpreadsheet, Loader2 } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function CsvImportModal({ isOpen, onClose, onSuccess }) {
  const { currency } = useAuth();
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Confirm, 3: Success
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a valid .csv file.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) {
      setError('Please select a CSV statement file first.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/statements/csv-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreviewData(res.data);
      // Auto-select non-duplicates by default
      setSelectedTransactions(res.data.transactions || []);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse CSV statement.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTransaction = (idx) => {
    setSelectedTransactions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], is_duplicate: !copy[idx].is_duplicate };
      return copy;
    });
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/statements/confirm', {
        transactions: selectedTransactions
      });

      setImportResult(res.data);
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete transaction import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Import Bank Statement (CSV)</h2>
              <p className="text-[11px] text-slate-400">Preview and verify before saving to your records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center transition-all cursor-pointer bg-slate-950/50"
                onClick={() => document.getElementById('csv-file-input').click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  {file ? file.name : 'Click to select bank statement CSV'}
                </p>
                <p className="text-xs text-slate-400">
                  Supports standard CSV exports from HDFC, ICICI, SBI, Axis, or any bank with Date, Description, and Debit/Credit.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-300">How CSV Statement Import works:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>Columns for Date, Narration, Debit, and Credit are automatically identified.</li>
                  <li>Merchant names and categories are assigned deterministically.</li>
                  <li>Potential duplicate transactions are flagged for your review before inserting.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Duplicate Review */}
          {step === 2 && previewData && (
            <div className="space-y-4">
              {/* Summary Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Found</span>
                  <span className="text-lg font-bold text-white">{previewData.total_found}</span>
                </div>
                <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold block">New Rows</span>
                  <span className="text-lg font-bold text-emerald-300">{previewData.new_transactions}</span>
                </div>
                <div className="bg-amber-950/30 p-3 rounded-xl border border-amber-500/20 text-center">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block">Duplicates</span>
                  <span className="text-lg font-bold text-amber-300">{previewData.duplicate_transactions}</span>
                </div>
              </div>

              {/* Transactions Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {selectedTransactions.map((tx, idx) => (
                      <tr key={idx} className={`hover:bg-slate-800/40 ${tx.is_duplicate ? 'opacity-50' : ''}`}>
                        <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="p-2.5 max-w-[180px] truncate">{tx.description}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium border border-slate-700">
                            {tx.category}
                          </span>
                        </td>
                        <td className={`p-2.5 text-right font-semibold whitespace-nowrap ${
                          tx.transaction_type === 'income' ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                          {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </td>
                        <td className="p-2.5 text-center">
                          {tx.is_duplicate ? (
                            <button
                              type="button"
                              onClick={() => handleToggleTransaction(idx)}
                              className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 hover:bg-amber-500/20"
                              title="Duplicate detected. Click to import anyway."
                            >
                              Duplicate (Skip)
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400">
                              Import
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && importResult && (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Import Complete!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {importResult.message}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
          >
            {step === 3 ? 'Done' : 'Cancel'}
          </button>

          {step === 1 && (
            <button
              onClick={handleUploadAndPreview}
              disabled={!file || loading}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Preview Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 2 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl"
              >
                Back
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Save</span>
              </button>
            </div>
          )}

          {step === 3 && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm"
            >
              View in Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
