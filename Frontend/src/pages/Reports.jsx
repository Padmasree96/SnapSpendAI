import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader, RefreshCw } from 'lucide-react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatCurrency } from '../utils/mockData';

export default function Reports() {
    const { token } = useAuth();
    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const fetchOverallAnalytics = useCallback(async (isManualRefresh = false) => {
        if (!token) {
            setLoading(false);
            return;
        }

        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            setError('');
            const data = await api.get('/reports/monthly');
            setMonthlyData(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            if (isManualRefresh) setRefreshing(false);
            else setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchOverallAnalytics();
    }, [fetchOverallAnalytics]);

    const totals = useMemo(() => {
        return monthlyData.reduce((acc, month) => {
            acc.income += month.income || 0;
            acc.expenses += month.expenses || 0;
            acc.savings += month.savings || 0;
            return acc;
        }, { income: 0, expenses: 0, savings: 0 });
    }, [monthlyData]);

    const avgSavingsPerMonth = monthlyData.length > 0 ? totals.savings / monthlyData.length : 0;

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
                    <Loader size={22} className="spin" />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>Reports & Analytics</h1>
                        <p>Overall graph based only on your entered data</p>
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fetchOverallAnalytics(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>{error}</span>
                </div>
            )}

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-label">Total Income</div>
                    <div className="stat-value">{formatCurrency(totals.income)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Expenses</div>
                    <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totals.expenses)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Savings</div>
                    <div className="stat-value" style={{ color: totals.savings < 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {formatCurrency(totals.savings)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Avg Monthly Savings</div>
                    <div className="stat-value">{formatCurrency(avgSavingsPerMonth)}</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2>Overall Financial Trend</h2>
                    <span className="badge badge-info">{monthlyData.length} month(s)</span>
                </div>

                {monthlyData.length === 0 ? (
                    <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No analytics yet. Add income or expense entries, then this graph will update automatically.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={360}>
                        <ComposedChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 10
                                }}
                            />
                            <Legend />
                            <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Income" />
                            <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} name="Expenses" />
                            <Line
                                type="monotone"
                                dataKey="savings"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#3b82f6' }}
                                name="Savings"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
