import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Brain,
    AlertTriangle,
    ArrowUpRight,
    Loader
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCategoryInfo, formatDate } from '../utils/mockData';

export default function Dashboard() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [summary, setSummary] = useState(null);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [summaryRes, trendRes, transRes, alertsRes] = await Promise.all([
                    fetch('/api/transactions/summary', { headers: { Authorization: `Bearer ${token}` } }),
                    fetch('/api/reports/monthly', { headers: { Authorization: `Bearer ${token}` } }),
                    fetch('/api/transactions?limit=8', { headers: { Authorization: `Bearer ${token}` } }),
                    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
                ]);

                if (summaryRes.ok) setSummary(await summaryRes.json());
                if (trendRes.ok) {
                    const trendData = await trendRes.json();
                    setMonthlyTrend(Array.isArray(trendData) ? trendData : []);
                }
                if (transRes.ok) setRecentTransactions(await transRes.json());
                if (alertsRes.ok) {
                    const notifyData = await alertsRes.json();
                    setAlerts(notifyData.filter(n => !n.read && (n.severity === 'danger' || n.severity === 'warning')));
                }
            } catch (error) {
                console.error('Error fetching dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const totalBalance = summary?.totalBalance ?? 0;
    const monthlyIncome = summary?.monthlyIncome ?? 0;
    const monthlyExpenses = summary?.monthlyExpenses ?? 0;

    const recentExpenseAverage = (() => {
        if (monthlyTrend.length === 0) return monthlyExpenses;
        const windowSize = Math.min(3, monthlyTrend.length);
        const recent = monthlyTrend.slice(-windowSize);
        const total = recent.reduce((sum, month) => sum + (month.expenses || 0), 0);
        return total / windowSize;
    })();

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                <Loader className="spin" size={48} style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    // Prepare chart data
    const pieData = summary?.categoryBreakdown ? Object.entries(summary.categoryBreakdown).map(([name, value]) => ({
        name,
        value,
        color: getCategoryInfo(name).color
    })) : [];

    return (
        <div className="page-container">
            {/* Alerts */}
            {alerts.map(alert => (
                <div key={alert.id} className={`alert alert-${alert.severity}`} style={{ marginBottom: 16 }}>
                    <AlertTriangle size={18} />
                    <div>
                        <strong>{alert.title}</strong>
                        <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9 }}>{alert.message}</p>
                    </div>
                </div>
            ))}

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card gradient">
                    <div className="stat-card-icon"><DollarSign size={22} /></div>
                    <div className="stat-label">Net Balance</div>
                    <div className="stat-value">{formatCurrency(totalBalance)}</div>
                    <div className="stat-change positive" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                        <ArrowUpRight size={14} /> + Live
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                        <TrendingUp size={22} />
                    </div>
                    <div className="stat-label">Total Income</div>
                    <div className="stat-value">{formatCurrency(monthlyIncome)}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                        <TrendingDown size={22} />
                    </div>
                    <div className="stat-label">Total Expenses</div>
                    <div className="stat-value">{formatCurrency(monthlyExpenses)}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                        <Brain size={22} />
                    </div>
                    <div className="stat-label">AI Spending Insights</div>
                    <div className="stat-value">{formatCurrency(recentExpenseAverage)}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>Recent 3-month expense average</span>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header">
                        <h2>Income vs Expenses</h2>
                        <span className="badge badge-info">{monthlyTrend.length} month(s)</span>
                    </div>

                    {monthlyTrend.length === 0 ? (
                        <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Add user transactions to see the monthly trend.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyTrend} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 10,
                                        boxShadow: 'var(--shadow-lg)',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                <Bar dataKey="income" fill="#6c2bfc" radius={[6, 6, 0, 0]} name="Income" />
                                <Bar dataKey="expenses" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Expenses" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2>Spending by Category</h2>
                        <span className="badge badge-primary">All data</span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {pieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    borderRadius: 10, fontSize: '0.85rem'
                                }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
                <div className="card-header">
                    <h2>Recent Transactions</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>
                        View All <ArrowUpRight size={14} />
                    </button>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.map(t => {
                                const cat = t.type === 'income' ? { icon: '$', name: t.category, color: '#10b981' } : getCategoryInfo(t.category);
                                return (
                                    <tr key={t.id}>
                                        <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                                            <span style={{ fontWeight: 500 }}>{t.description}</span>
                                            {t.aiDetected && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>AI</span>}
                                        </td>
                                        <td>
                                            <span className="category-tag">
                                                <span className="category-dot" style={{ background: cat.color }}></span>
                                                {cat.name}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatDate(t.date)}</td>
                                        <td style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </td>
                                        <td>
                                            {t.aiDetected ? (
                                                <span className="badge badge-info">Auto-detected ({t.confidence}%)</span>
                                            ) : (
                                                <span className="badge badge-primary">Manual</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
