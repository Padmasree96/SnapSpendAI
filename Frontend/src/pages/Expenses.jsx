import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Image, Zap, Volume2, VolumeX, Loader } from 'lucide-react';
import { CATEGORIES, formatCurrency, formatDate, getCategoryInfo } from '../utils/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage, VOICE_LANG_MAP } from '../context/LanguageContext';

export default function Expenses() {
    const { token } = useAuth();
    const { t, language } = useLanguage();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [form, setForm] = useState({ description: '', amount: '', category: 'food', date: new Date().toISOString().split('T')[0], account: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [accounts, setAccounts] = useState([]);

    // Fetch expenses from API
    const fetchExpenses = useCallback(async () => {
        try {
            setError('');
            const response = await fetch('/api/transactions?type=expense', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to load expenses');
            const data = await response.json();
            setExpenses(data);
        } catch (err) {
            setError(err.message || 'Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchAccounts = useCallback(async () => {
        try {
            const response = await fetch('/api/accounts', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to load accounts');
            const data = await response.json();
            setAccounts(Array.isArray(data) ? data : []);
        } catch {
            setAccounts([]);
        }
    }, [token]);

    useEffect(() => {
        fetchExpenses();
        fetchAccounts();
    }, [fetchExpenses, fetchAccounts]);

    const filtered = expenses.filter(e => {
        const matchSearch = (e.description || '').toLowerCase().includes(search.toLowerCase());
        const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
        const matchDate = !dateFilter || e.date === dateFilter;
        return matchSearch && matchCategory && matchDate;
    });

    const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

    const openAdd = () => {
        setEditingExpense(null);
        setForm({ description: '', amount: '', category: 'food', date: new Date().toISOString().split('T')[0], account: accounts[0]?.id || '', notes: '' });
        setShowModal(true);
    };

    const openEdit = (expense) => {
        setEditingExpense(expense);
        setForm({ description: expense.description, amount: expense.amount, category: expense.category, date: expense.date, account: expense.account || '', notes: expense.notes || '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.description || !form.amount) return;
        setSaving(true);
        setError('');

        try {
            if (editingExpense) {
                const response = await fetch(`/api/transactions/${editingExpense.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ description: form.description, amount: Number(form.amount), category: form.category, date: form.date, account: form.account || null, notes: form.notes }),
                });
                if (!response.ok) throw new Error('Failed to update expense');
            } else {
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ type: 'expense', description: form.description, amount: Number(form.amount), category: form.category, date: form.date, account: form.account || null, notes: form.notes }),
                });
                if (!response.ok) throw new Error('Failed to add expense');
            }
            setShowModal(false);
            await fetchExpenses();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to delete expense');
            await fetchExpenses();
        } catch (err) {
            setError(err.message);
        }
    };

    // Voice notification for total expenses
    const announceTotal = () => {
        if (!('speechSynthesis' in window)) {
            setError('Voice notifications are not supported in this browser.');
            return;
        }
        window.speechSynthesis.cancel();

        const amount = formatCurrency(totalExpenses);
        const voiceLang = VOICE_LANG_MAP[language] || 'en-US';
        const utterance = new SpeechSynthesisUtterance(
            `${t('voiceMessage')} ${amount}. ${t('voiceTransactions').replace('{count}', filtered.length)}.`
        );
        utterance.lang = voiceLang;
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading expenses...</span>
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
                        <h1>💳 Expense Management</h1>
                        <p>Track and manage all your expenses</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Expense</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>{error}</span>
                </div>
            )}

            {/* Summary */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-label">Total Expenses</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalExpenses)}</div>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={announceTotal}
                            title="Announce total expenses"
                            style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-full)',
                                background: speaking ? 'var(--primary-500)' : 'var(--bg-tertiary)',
                                color: speaking ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Transactions</div>
                    <div className="stat-value">{filtered.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">AI Detected</div>
                    <div className="stat-value">{filtered.filter(e => e.aiDetected).length}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-input-wrapper">
                    <Search size={16} className="icon" />
                    <input type="text" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <input type="date" className="filter-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Source</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No expenses found</td></tr>
                            ) : filtered.map(e => {
                                const cat = getCategoryInfo(e.category);
                                return (
                                    <tr key={e.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{e.description}</div>
                                                    {e.image && <span style={{ fontSize: '0.72rem', color: 'var(--info)' }}><Image size={10} /> Image attached</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="category-tag">
                                                <span className="category-dot" style={{ background: cat.color }}></span>
                                                {cat.name}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(e.date)}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>-{formatCurrency(e.amount)}</td>
                                        <td>
                                            {e.aiDetected ? (
                                                <span className="badge badge-info"><Zap size={10} /> AI ({e.confidence}%)</span>
                                            ) : (
                                                <span className="badge badge-primary">Manual</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost btn-icon" onClick={() => openEdit(e)} style={{ width: 32, height: 32 }}><Edit2 size={14} /></button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(e.id)} style={{ width: 32, height: 32, color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input className="form-input" placeholder="What did you spend on?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount</label>
                            <input className="form-input" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Account</label>
                            <select className="form-select" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}>
                                <option value="">No account</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.icon || '$'} {a.name}</option>)}
                            </select>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : `${editingExpense ? 'Update' : 'Add'} Expense`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
