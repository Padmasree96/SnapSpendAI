import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { INCOME_CATEGORIES, formatCurrency, formatDate, getIncomeCategoryInfo } from '../utils/mockData';
import { useAuth } from '../context/AuthContext';

export default function Income() {
    const { token } = useAuth();
    const [incomes, setIncomes] = useState([]);
    const [monthlySummary, setMonthlySummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingIncome, setEditingIncome] = useState(null);
    const [form, setForm] = useState({
        description: '',
        amount: '',
        category: 'salary',
        date: new Date().toISOString().split('T')[0],
    });

    const fetchIncomeData = useCallback(async () => {
        try {
            setError('');
            const [incomeRes, summaryRes] = await Promise.all([
                fetch('/api/income', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/income/summary', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (!incomeRes.ok) throw new Error('Failed to load income entries');
            const incomeData = await incomeRes.json();
            setIncomes(Array.isArray(incomeData) ? incomeData : []);

            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setMonthlySummary(Array.isArray(summaryData?.monthly) ? summaryData.monthly : []);
            } else {
                setMonthlySummary([]);
            }
        } catch (err) {
            setError(err.message || 'Failed to load income data');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchIncomeData();
    }, [fetchIncomeData]);

    const totalIncome = useMemo(
        () => incomes.reduce((sum, income) => sum + (Number(income.amount) || 0), 0),
        [incomes]
    );

    const categoryBreakdown = useMemo(() => {
        return INCOME_CATEGORIES.map((cat) => {
            const matching = incomes.filter((income) => (income.category || income.source) === cat.id);
            return {
                ...cat,
                total: matching.reduce((sum, income) => sum + (Number(income.amount) || 0), 0),
                count: matching.length,
            };
        }).filter((item) => item.total > 0);
    }, [incomes]);

    const openAdd = () => {
        setEditingIncome(null);
        setForm({
            description: '',
            amount: '',
            category: 'salary',
            date: new Date().toISOString().split('T')[0],
        });
        setError('');
        setShowModal(true);
    };

    const openEdit = (income) => {
        setEditingIncome(income);
        setForm({
            description: income.description || '',
            amount: income.amount ?? '',
            category: income.category || income.source || 'salary',
            date: income.date || new Date().toISOString().split('T')[0],
        });
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.description.trim()) {
            setError('Description is required');
            return;
        }

        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Amount must be greater than 0');
            return;
        }

        setSaving(true);
        setError('');

        const payload = {
            description: form.description.trim(),
            amount,
            source: form.category,
            category: form.category,
            date: form.date,
            recurring: false,
        };

        try {
            const response = await fetch(
                editingIncome ? `/api/income/${editingIncome.id}` : '/api/income',
                {
                    method: editingIncome ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Failed to save income');
            }

            setShowModal(false);
            await fetchIncomeData();
        } catch (err) {
            setError(err.message || 'Failed to save income');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this income entry?')) return;

        try {
            setError('');
            const response = await fetch(`/api/income/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Failed to delete income');
            }

            await fetchIncomeData();
        } catch (err) {
            setError(err.message || 'Failed to delete income');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading income...</span>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>Income</h1>
                        <p>Track and manage your income sources</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Income</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>{error}</span>
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card gradient">
                    <div className="stat-label">Total Income</div>
                    <div className="stat-value">{formatCurrency(totalIncome)}</div>
                </div>
                {categoryBreakdown.map((cat) => (
                    <div className="stat-card" key={cat.id}>
                        <div className="stat-card-icon" style={{ background: `${cat.color}15`, color: cat.color }}>
                            <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                        </div>
                        <div className="stat-label">{cat.name}</div>
                        <div className="stat-value">{formatCurrency(cat.total)}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{cat.count} entries</span>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h2>Monthly Income Trend</h2>
                </div>

                {monthlySummary.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-secondary)' }}>
                        No income data yet. Add your first income entry to see trend analytics.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={monthlySummary}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10 }}
                            />
                            <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} name="Income" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                                        No income entries
                                    </td>
                                </tr>
                            ) : (
                                incomes.map((income) => {
                                    const cat = getIncomeCategoryInfo(income.category || income.source || 'others');
                                    return (
                                        <tr key={income.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                                                    <span style={{ fontWeight: 500 }}>{income.description}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="category-tag">
                                                    <span className="category-dot" style={{ background: cat.color }}></span>
                                                    {cat.name}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(income.date)}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>+{formatCurrency(income.amount)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(income)} style={{ width: 32, height: 32 }}><Edit2 size={14} /></button>
                                                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(income.id)} style={{ width: 32, height: 32, color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingIncome ? 'Edit Income' : 'Add Income'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input
                                className="form-input"
                                placeholder="Income source"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Amount</label>
                            <input
                                className="form-input"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            />
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                >
                                    {INCOME_CATEGORIES.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : `${editingIncome ? 'Update' : 'Add'} Income`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
