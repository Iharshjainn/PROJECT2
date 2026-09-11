import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import AddTransactionModal from '../components/AddTransactionModal';
import CsvImportModal from '../components/CsvImportModal';
import PdfImportModal from '../components/PdfImportModal';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIES = [
  "All Categories", "Food", "Groceries", "Shopping", "Transport", "Housing", "Utilities",
  "Subscriptions", "Health", "Entertainment", "Travel", "Salary",
  "Investments", "Fees", "Transfers", "Other"
];

export default function TransactionsPage() {
  const { currency } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [transactionType, setTransactionType] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 200,
        offset: 0,
      };
      if (category !== 'All Categories') params.category = category;
      if (transactionType !== 'all') params.transaction_type = transactionType;
      if (accountId !== 'all') params.account_id = accountId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search.trim()) params.search = search.trim();

      const [txRes, accRes] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/accounts')
      ]);

      setTransactions(txRes.data || []);
      setAccounts(accRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [category, transactionType, accountId, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      window.dispatchEvent(new CustomEvent('financial_data_updated'));
    } catch (err) {
      alert('Failed to delete transaction.');
    }
  };

  // Client side page slice
  const paginatedTransactions = transactions.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(transactions.length / pageSize);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Transactions</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage, filter, and import your financial ledger records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            <span>Import PDF</span>
          </button>

          <button
            onClick={() => {
              setEditingTransaction(null);
              setAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search description or merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 pl-9"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </form>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                setPage(0);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="transfer">Transfers</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setPage(0);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table & Content */}
      {loading ? (
        <LoadingSpinner message="Fetching transactions..." />
      ) : transactions.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Account</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] whitespace-nowrap text-slate-400">
                      {formatDate(tx.date)}
                    </td>
                    <td className="p-3.5 font-medium text-white max-w-[240px]">
                      <div className="truncate">{tx.description}</div>
                      {tx.merchant && (
                        <div className="text-[10px] text-emerald-400 font-normal">Merchant: {tx.merchant}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium border border-slate-700">
                        {tx.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {tx.account_name || 'Cash/Manual'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-slate-800 text-slate-400">
                        {tx.source || 'manual'}
                      </span>
                    </td>
                    <td className={`p-3.5 text-right font-bold whitespace-nowrap ${
                      tx.transaction_type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTransaction(tx);
                            setAddModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit transaction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, transactions.length)} of {transactions.length} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-200">
                Page {page + 1} of {Math.max(1, totalPages)}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No transactions matching your criteria"
          description="Try clearing your search or category filters, or add your first transaction."
          primaryAction={{
            label: "Add Transaction",
            onClick: () => {
              setEditingTransaction(null);
              setAddModalOpen(true);
            }
          }}
          secondaryAction={{
            label: "Import CSV Statement",
            onClick: () => setCsvModalOpen(true)
          }}
        />
      )}

      {/* Modals */}
      <AddTransactionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        initialData={editingTransaction}
        onSuccess={() => {
          setAddModalOpen(false);
          setEditingTransaction(null);
          fetchTransactions();
        }}
      />

      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => {
          setCsvModalOpen(false);
          fetchTransactions();
        }}
      />

      <PdfImportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onSuccess={() => {
          setPdfModalOpen(false);
          fetchTransactions();
        }}
      />
    </div>
  );
}
