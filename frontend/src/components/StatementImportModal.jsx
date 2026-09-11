import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  FileSpreadsheet, 
  FileText, 
  Lock, 
  Building2, 
  Loader2, 
  Check, 
  Filter 
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function StatementImportModal({ isOpen, onClose, onSuccess }) {
  const { currency } = useAuth();
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Confirm, 3: Success
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  const isPdf = file?.name?.toLowerCase().endsWith('.pdf');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.toLowerCase();
      if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.pdf')) {
        setError('Please select a valid statement file (.csv, .xlsx, .xls, or .pdf).');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) {
      setError('Please select a bank statement file first.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (password.trim()) {
      formData.append('password', password.trim());
    }

    try {
      const res = await api.post('/statements/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.is_encrypted) {
        setError(res.data.parsing_notes || 'PDF is password-protected. Please enter password below.');
        setLoading(false);
        return;
      }

      if (!res.data.transactions || res.data.transactions.length === 0) {
        setError(res.data.parsing_notes || 'No transactions could be recognized in this statement.');
        setLoading(false);
        return;
      }

      setPreviewData(res.data);
      // Automatically select all non-duplicates by default
      setSelectedTransactions(res.data.transactions);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse statement.');
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

  const handleSelectAllNonDuplicates = () => {
    setSelectedTransactions(prev =>
      prev.map(tx => ({
        ...tx,
        is_duplicate: tx.duplicate_reason ? true : false
      }))
    );
  };

  const handleSelectAll = () => {
    setSelectedTransactions(prev =>
      prev.map(tx => ({ ...tx, is_duplicate: false }))
    );
  };

  const handleConfirmImport = async () => {
    const toImport = selectedTransactions.filter(t => !t.is_duplicate);
    if (toImport.length === 0) {
      setError('Please select at least one transaction to import.');
      return;
    }

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

  const activeCount = selectedTransactions.filter(t => !t.is_duplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {isPdf ? <FileText className="w-5 h-5 text-rose-400" /> : <FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Bank Statement</h2>
              <p className="text-xs text-slate-400">Supports PDF, Excel (.xlsx, .xls), and CSV from all major banks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-5">
              <div 
                onClick={() => document.getElementById('universal-file-input').click()}
                className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/50 hover:bg-slate-950/80 group"
              >
                <input 
                  id="universal-file-input"
                  type="file" 
                  accept=".csv, .xlsx, .xls, .pdf" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                
                <div className="text-sm font-bold text-white mb-1">
                  {file ? file.name : "Choose or drag & drop your bank statement"}
                </div>
                <p className="text-xs text-slate-400 text-center max-w-sm">
                  {file 
                    ? `${(file.size / 1024).toFixed(1)} KB selected`
                    : "Upload your official statement in PDF, Excel (.xlsx, .xls), or CSV format"}
                </p>

                {/* Supported Formats */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">.PDF</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">.XLSX</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">.XLS</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">.CSV</span>
                </div>
              </div>

              {/* Password prompt if PDF */}
              {isPdf && (
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>PDF Password (if statement is encrypted)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. Date of birth (DDMMYYYY) or PAN as required by your bank"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Many banks (HDFC, SBI, ICICI) password-protect statements. We decrypt securely in-memory.
                  </p>
                </div>
              )}

              {/* Bank Metadata Tolerance Note */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-start gap-3">
                <Building2 className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Universal Bank Compatibility</div>
                  <div>
                    The importer automatically detects and skips the first 10–30 rows of account metadata, locates the table headers, and normalizes columns for HDFC, SBI, ICICI, Axis, Kotak, Chase, and all standard bank formats.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Confirm */}
          {step === 2 && previewData && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{previewData.total_found} Transactions Recognized</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      {Math.round(previewData.confidence_score * 100)}% Confidence
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{previewData.parsing_notes}</div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={handleSelectAllNonDuplicates}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700"
                  >
                    Select Non-Duplicates
                  </button>
                  <button
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700"
                  >
                    Select All
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Import</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {selectedTransactions.map((tx, idx) => {
                      const isSelected = !tx.is_duplicate;
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => handleToggleTransaction(idx)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'hover:bg-slate-800/40' : 'opacity-50 hover:bg-slate-900/40'}`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0 focus:outline-none cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-white truncate max-w-xs">{tx.description}</div>
                            {tx.merchant && (
                              <div className="text-[10px] text-emerald-400">Merchant: {tx.merchant}</div>
                            )}
                            {tx.duplicate_reason && (
                              <div className="text-[10px] text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{tx.duplicate_reason}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700">
                              {tx.category || 'Other'}
                            </span>
                          </td>
                          <td className={`py-2 px-3 text-right font-bold whitespace-nowrap ${tx.transaction_type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {tx.transaction_type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{activeCount} of {selectedTransactions.length} transactions selected for import</span>
                {previewData.duplicate_transactions > 0 && (
                  <span className="text-amber-400">{previewData.duplicate_transactions} duplicates excluded by default</span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && importResult && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Statement Successfully Imported!</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {importResult.message || `Imported ${importResult.imported_count || 0} transactions into your records.`}
              </p>
              <div className="pt-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  View in Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
            {step === 2 ? (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back to Upload
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>

              {step === 1 ? (
                <button
                  onClick={handleUploadAndPreview}
                  disabled={!file || loading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Scan & Preview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleConfirmImport}
                  disabled={activeCount === 0 || loading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Import ({activeCount})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}