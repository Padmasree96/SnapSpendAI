import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X, AlertTriangle, Edit2, Trash2, Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CATEGORIES, formatCurrency, getCategoryInfo } from '../utils/mockData';
import { useAuth } from '../context/AuthContext';

export default function Budget() {
    const { token } = useAuth();
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [form, setForm] = useState({ category: 'food', limit: '' });

    const fetchBudgets = useCallback(async () => {
        try {
            setError('');
            const response = await fetch(`/api/budgets?month=${currentMonth}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to load budgets');
            const data = await response.json();
            setBudgets(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to load budgets');
        } finally {
            setLoading(false);
        }
    }, [token, currentMonth]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const totalBudget = useMemo(
        () => budgets.reduce((sum, budget) => sum + (Number(budget.limit) || 0), 0),
        [budgets]
    );

    const totalSpent = useMemo(
        () => budgets.reduce((sum, budget) => sum + (Number(budget.spent) || 0), 0),
        [budgets]
    );

    const overBudgetCount = useMemo(
        () => budgets.filter((budget) => Number(budget.spent) > Number(budget.limit)).length,
        [budgets]
    );

    const usagePercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

    const chartData = useMemo(() => {
        return budgets.map((budget) => {
            const category = getCategoryInfo(budget.category);
            return {
                name: category.name,
                budget: Number(budget.limit) || 0,
                spent: Number(budget.spent) || 0,
                fill: category.color,
            };
        });
    }, [budgets]);

    const openAdd = () => {
        setEditingBudget(null);
        setForm({ category: 'food', limit: '' });
        setError('');
        setShowModal(true);
    };

    const openEdit = (budget) => {
        setEditingBudget(budget);
        setForm({ category: budget.category, limit: budget.limit });
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        const limit = Number(form.limit);
        if (!Number.isFinite(limit) || limit <= 0) {
            setError('Budget limit must be greater than 0');
            return;
        }

        setSaving(true);
        setError('');

        const payload = {
            category: form.category,
            limit,
            month: currentMonth,
        };

        try {
            const response = await fetch(
                editingBudget ? `/api/budgets/${editingBudget.id}` : '/api/budgets',
                {
                    method: editingBudget ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Failed to save budget');
            }

            setShowModal(false);
            await fetchBudgets();
        } catch (err) {
            setError(err.message || 'Failed to save budget');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this budget?')) return;

        try {
            setError('');
            const response = await fetch(`/api/budgets/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Failed to delete budget');
            }

            await fetchBudgets();
        } catch (err) {
            setError(err.message || 'Failed to delete budget');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading budgets...</span>
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
                        <h1>Budget Planning</h1>
                        <p>Set and track your monthly spending budgets</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Budget</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>{error}</span>
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card gradient">
                    <div className="stat-label">Total Budget</div>
                    <div className="stat-value">{formatCurrency(totalBudget)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Spent</div>
                    <div className="stat-value">{formatCurrency(totalSpent)}</div>
                    <div className="progress-bar" style={{ marginTop: 10 }}>
                        <div className={`progress-bar-fill ${usagePercent > 90 ? 'danger' : ''}`} style={{ width: `${usagePercent}%` }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                        {usagePercent.toFixed(0)}% used
                    </span>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Remaining</div>
                    <div className="stat-value" style={{ color: totalBudget - totalSpent >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatCurrency(totalBudget - totalSpent)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Over Budget</div>
                    <div className="stat-value" style={{ color: overBudgetCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h2>Budget vs Actual Spending</h2>
                </div>
                {chartData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-secondary)' }}>
                        No budgets yet. Add your first budget to see analytics.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10 }} />
                            <Bar dataKey="budget" fill="var(--gray-300)" radius={[4, 4, 0, 0]} name="Budget" />
                            <Bar dataKey="spent" radius={[4, 4, 0, 0]} name="Spent">
                                {chartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.spent > entry.budget ? '#ef4444' : entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {budgets.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 28, color: 'var(--text-secondary)' }}>
                    No budget entries for {currentMonth}.
                </div>
            ) : (
                <div className="grid-2">
                    {budgets.map((budget) => {
                        const category = getCategoryInfo(budget.category);
                        const limit = Number(budget.limit) || 0;
                        const spent = Number(budget.spent) || 0;
                        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                        const isOver = spent > limit;

                        return (
                            <div className="card" key={budget.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: '1.4rem' }}>{category.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{category.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Monthly Budget</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {isOver && <AlertTriangle size={16} style={{ color: 'var(--danger)', marginRight: 4 }} />}
                                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(budget)} style={{ width: 28, height: 28 }}><Edit2 size={13} /></button>
                                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(budget.id)} style={{ width: 28, height: 28, color: 'var(--danger)' }}><Trash2 size={13} /></button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {formatCurrency(spent)} <span style={{ color: 'var(--text-tertiary)' }}>/ {formatCurrency(limit)}</span>
                                    </span>
                                    <span style={{ fontWeight: 600, color: isOver ? 'var(--danger)' : 'var(--text-primary)' }}>
                                        {percentage.toFixed(0)}%
                                    </span>
                                </div>

                                <div className="progress-bar">
                                    <div className={`progress-bar-fill ${isOver ? 'danger' : percentage > 80 ? '' : 'success'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                                </div>

                                {isOver && (
                                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <AlertTriangle size={13} />
                                        Over budget by {formatCurrency(spent - limit)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingBudget ? 'Edit Budget' : 'Set Budget'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={!!editingBudget}>
                                {CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Monthly Limit</label>
                            <input className="form-input" type="number" placeholder="Enter budget amount" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : `${editingBudget ? 'Update' : 'Set'} Budget`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
