import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, FileText, Loader2, Info } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function PdfImportModal({ isOpen, onClose, onSuccess }) {
  const { currency } = useAuth();
  const [step, setStep] = useState(1);
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
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid .pdf file.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) {
      setError('Please select a PDF statement file first.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/statements/pdf-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreviewData(res.data);
      setSelectedTransactions(res.data.transactions || []);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to extract transactions from PDF.');
    } finally {
      setLoading(false);
    }
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
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Import PDF Statement</h2>
              <p className="text-[11px] text-slate-400">Deterministic text extraction without hallucination</p>
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
                className="border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-2xl p-8 text-center transition-all cursor-pointer bg-slate-950/50"
                onClick={() => document.getElementById('pdf-file-input').click()}
              >
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  {file ? file.name : 'Click to select bank statement PDF'}
                </p>
                <p className="text-xs text-slate-400">
                  Select a digital PDF statement issued by your bank. Scanned image PDFs without readable text streams are not supported.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs mb-1">
                  <Info className="w-4 h-4" />
                  <span>Zero-Hallucination Extraction Principle</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Our system will NEVER invent or hallucinate transaction records. If your bank uses an encrypted or non-standard visual layout, the system will transparently inform you and recommend downloading the standard CSV statement.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Confidence */}
          {step === 2 && previewData && (
            <div className="space-y-4">
              {/* Parsing Feedback & Confidence */}
              <div className={`p-3.5 rounded-xl border text-xs ${
                previewData.confidence_score >= 0.7 
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/20 text-amber-300'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Extraction Confidence: {(previewData.confidence_score * 100).toFixed(0)}%</span>
                  <span>{previewData.total_found} rows parsed</span>
                </div>
                <p className="text-[11px] text-slate-400">{previewData.parsing_notes}</p>
              </div>

              {previewData.total_found === 0 ? (
                <div className="p-6 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400 mb-3">
                    We could not safely extract structured rows from this PDF format.
                  </p>
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200"
                  >
                    Try another file or use CSV
                  </button>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedTransactions.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="p-2.5 max-w-[200px] truncate">{tx.description}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700">
                              {tx.category}
                            </span>
                          </td>
                          <td className={`p-2.5 text-right font-semibold whitespace-nowrap ${
                            tx.transaction_type === 'income' ? 'text-emerald-400' : 'text-slate-200'
                          }`}>
                            {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Extract PDF</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 2 && previewData?.total_found > 0 && (
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
                <span>Confirm & Import</span>
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
