import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  PieChart as PieIcon,
  Coins,
  Building,
  Car
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import AddAssetModal from '../components/AddAssetModal';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const ASSET_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#64748b'
];

export default function AssetsPage() {
  const { currency } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assets');
      setAssets(res.data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset from your portfolio?')) return;
    try {
      await api.delete(`/assets/${id}`);
      setAssets(prev => prev.filter(a => a.id !== id));
      window.dispatchEvent(new CustomEvent('financial_data_updated'));
    } catch {
      alert('Failed to delete asset.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating asset portfolio valuations..." />;
  }

  const totalAssets = assets.reduce((sum, a) => sum + Number(a.current_value || 0), 0);

  // Group by asset type
  const typeMap = {};
  assets.forEach(a => {
    const t = a.asset_type || 'other';
    typeMap[t] = (typeMap[t] || 0) + Number(a.current_value || 0);
  });

  const chartData = Object.keys(typeMap).map(k => ({
    name: k.replace('_', ' ').toUpperCase(),
    value: typeMap[k]
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Assets & Wealth Portfolio</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track liquid cash, market investments, physical properties, and precious assets
          </p>
        </div>

        <button
          onClick={() => {
            setEditingAsset(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset</span>
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Portfolio Value"
          value={formatCurrency(totalAssets, currency)}
          subtitle="Cumulative asset base"
          icon={Wallet}
          color="emerald"
        />

        <StatCard
          title="Asset Holdings"
          value={assets.length}
          subtitle="Distinct positions tracked"
          icon={Coins}
          color="sky"
        />

        <StatCard
          title="Asset Allocation Classes"
          value={chartData.length}
          subtitle="Diversification categories"
          icon={PieIcon}
          color="violet"
        />
      </div>

      {assets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Allocation Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Portfolio Allocation</h3>
              <p className="text-xs text-slate-400 mb-4">Capital distribution by category</p>

              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(val) => [formatCurrency(val, currency), 'Valuation']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-4">
                {chartData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: ASSET_COLORS[idx % ASSET_COLORS.length] }}
                      />
                      <span className="text-slate-300">{item.name}</span>
                    </div>
                    <span className="font-semibold text-white">
                      {formatCurrency(item.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assets Table */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4">All Asset Holdings</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="pb-3">Asset Name</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3 text-right">Current Value</th>
                    <th className="pb-3 text-right">Share</th>
                    <th className="pb-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {assets.map((a) => {
                    const share = totalAssets > 0 ? (Number(a.current_value || 0) / totalAssets * 100) : 0;
                    return (
                      <tr key={a.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-semibold text-white">
                          <div>{a.name}</div>
                          {a.notes && <div className="text-[10px] text-slate-500 font-normal">{a.notes}</div>}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700 capitalize">
                            {(a.asset_type || 'other').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-400">
                          {formatCurrency(a.current_value, currency)}
                        </td>
                        <td className="py-3 text-right text-slate-400 text-[11px]">
                          {share.toFixed(1)}%
                        </td>
                        <td className="py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingAsset(a);
                                setModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No assets recorded in your portfolio"
          description="Track savings accounts, mutual funds, gold, or property to see your true net worth."
          primaryAction={{
            label: "Add First Asset",
            onClick: () => {
              setEditingAsset(null);
              setModalOpen(true);
            }
          }}
        />
      )}

      <AddAssetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingAsset}
        onSuccess={() => {
          setModalOpen(false);
          setEditingAsset(null);
          fetchAssets();
        }}
      />
    </div>
  );
}
