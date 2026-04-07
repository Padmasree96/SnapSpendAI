import { useMemo, useState } from 'react';
import { Bell, AlertTriangle, CreditCard, Brain, Shield, Check, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationsContext';

const typeIcons = {
    budget: { icon: CreditCard, color: '#ef4444', bg: '#fef2f2' },
    bill: { icon: Bell, color: '#f59e0b', bg: '#fffbeb' },
    warning: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' },
    ai: { icon: Brain, color: '#6c2bfc', bg: '#f0e7ff' },
    lifestyle: { icon: Shield, color: '#3b82f6', bg: '#eff6ff' },
};

const filters = ['all', 'unread', 'budget', 'bill', 'ai', 'warning', 'lifestyle'];

export default function Notifications() {
    const [filter, setFilter] = useState('all');
    const {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllRead,
    } = useNotifications();

    const filteredNotifications = useMemo(() => {
        if (filter === 'all') return notifications;
        if (filter === 'unread') return notifications.filter((notification) => !notification.read);
        return notifications.filter((notification) => notification.type === filter);
    }, [filter, notifications]);

    const handleMarkAsRead = async (id, isRead) => {
        if (isRead) return;

        try {
            await markAsRead(id);
        } catch (err) {
            toast.error(err.message || 'Failed to mark notification as read');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllRead();
        } catch (err) {
            toast.error(err.message || 'Failed to mark all notifications as read');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>Notifications</h1>
                        <p>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
                    </div>
                    {unreadCount > 0 && (
                        <button className="btn btn-secondary" onClick={handleMarkAllRead}>
                            <Check size={16} /> Mark All Read
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>{error}</span>
                </div>
            )}

            <div className="tabs" style={{ maxWidth: 600 }}>
                {filters.map((value) => (
                    <button
                        key={value}
                        className={`tab ${filter === value ? 'active' : ''}`}
                        onClick={() => setFilter(value)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {value}
                    </button>
                ))}
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div className="empty-state">
                        <Loader size={36} className="spin" />
                        <p>Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="empty-state">
                        <Bell size={48} />
                        <p>No notifications found</p>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                            Notifications are generated from your budgets, balances, recurring bill entries, and monthly spending activity.
                        </span>
                    </div>
                ) : filteredNotifications.map((notification) => {
                    const typeInfo = typeIcons[notification.type] || typeIcons.ai;
                    const IconComponent = typeInfo.icon;

                    return (
                        <div
                            key={notification.id}
                            className={`notification-item ${notification.read ? '' : 'unread'}`}
                            onClick={() => handleMarkAsRead(notification.id, notification.read)}
                            style={{ cursor: notification.read ? 'default' : 'pointer' }}
                        >
                            <div className="notification-icon" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                                <IconComponent size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{notification.title}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                                        {notification.time}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                    {notification.message}
                                </p>
                                <div style={{ marginTop: 8 }}>
                                    <span className={`badge badge-${notification.severity === 'danger' ? 'danger' : notification.severity === 'warning' ? 'warning' : 'info'}`}>
                                        {notification.severity}
                                    </span>
                                </div>
                            </div>
                            {!notification.read && (
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0, marginTop: 6 }}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
