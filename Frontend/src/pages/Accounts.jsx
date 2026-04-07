import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X, Wallet, Loader } from 'lucide-react';
import { ACCOUNT_TYPES, formatCurrency } from '../utils/mockData';
import { useAuth } from '../context/AuthContext';

export default function Accounts() {
    const { token } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'bank', balance: '' });

    const fetchAccounts = useCallback(async () => {
        try {
            setError('');
            const response = await fetch('/api/accounts', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to load accounts');
            const data = await response.json();
            setAccounts(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to load accounts');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const totalBalance = useMemo(
        () => accounts.reduce((sum, account) => sum + (Number(account.balance) || 0), 0),
        [accounts]
    );

    const openAdd = () => {
        setEditingAccount(null);
        setForm({ name: '', type: 'bank', balance: '' });
        setError('');
        setShowModal(true);
    };

    const openEdit = (account) => {
        setEditingAccount(account);
        setForm({
            name: account.name || '',
            type: account.type || 'bank',
            balance: account.balance ?? '',
        });
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError('Account name is required');
            return;
        }

        const balance = Number(form.balance);
        if (!Number.isFinite(balance)) {
            setError('Balance must be a valid number');
            return;
        }

        const typeInfo = ACCOUNT_TYPES.find((type) => type.id === form.type) || ACCOUNT_TYPES[0];
        const payload = {
            name: form.name.trim(),
            type: form.type,
            balance,
            icon: typeInfo.icon,
            color: typeInfo.color,
        };

        setSaving(true);
        setError('');

        try {
            const response = await fetch(
                editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts',
                {
                    method: editingAccount ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Failed to save account');
            }

            setShowModal(false);
            await fetchAccounts();
        } catch (err) {
            setError(err.message || 'Failed to save account');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this account?')) return;

        try {
            setError('');
            const response = await fetch(`/api/accounts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Failed to delete account');
            }

            await fetchAccounts();
        } catch (err) {
            setError(err.message || 'Failed to delete account');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading accounts...</span>
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
                        <h1>Accounts & Wallets</h1>
                        <p>Manage your bank accounts, wallets, and payment methods</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Account</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>{error}</span>
                </div>
            )}

            <div className="stat-card gradient" style={{ marginBottom: 24, maxWidth: 360 }}>
                <div className="stat-card-icon"><Wallet size={22} /></div>
                <div className="stat-label">Net Balance</div>
                <div className="stat-value">{formatCurrency(totalBalance)}</div>
                <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>{accounts.length} account(s)</span>
            </div>

            {accounts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    No accounts yet. Add your first account.
                </div>
            ) : (
                <div className="grid-3">
                    {accounts.map((account) => (
                        <div className="card" key={account.id} style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: account.color || '#3b82f6' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 'var(--radius-md)',
                                            background: `${account.color || '#3b82f6'}15`,
                                            color: account.color || '#3b82f6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem'
                                        }}
                                    >
                                        {account.icon || '$'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{account.name}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{account.type}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(account)} style={{ width: 30, height: 30 }}><Edit2 size={14} /></button>
                                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(account.id)} style={{ width: 30, height: 30, color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <div style={{ marginTop: 20 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>BALANCE</div>
                                <div
                                    style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 800,
                                        color: Number(account.balance) >= 0 ? 'var(--text-primary)' : 'var(--danger)'
                                    }}
                                >
                                    {formatCurrency(Number(account.balance) || 0)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingAccount ? 'Edit Account' : 'Add Account'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Account Name</label>
                            <input
                                className="form-input"
                                placeholder="e.g., Main Savings"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Account Type</label>
                            <select
                                className="form-select"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                            >
                                {ACCOUNT_TYPES.map((type) => (
                                    <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Balance</label>
                            <input
                                className="form-input"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={form.balance}
                                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                            />
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editingAccount ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
