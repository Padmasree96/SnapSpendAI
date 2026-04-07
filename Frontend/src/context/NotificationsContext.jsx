import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext(null);

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};

export function NotificationsProvider({ children }) {
    const { token } = useAuth();
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refreshNotifications = useCallback(async ({ silent = false } = {}) => {
        if (!token) {
            setNotifications([]);
            setError('');
            setLoading(false);
            return [];
        }

        if (!silent) {
            setLoading(true);
        }

        try {
            setError('');
            const data = await api.get('/notifications');
            const list = Array.isArray(data) ? data : [];
            setNotifications(list);
            return list;
        } catch (err) {
            setError(err.message || 'Failed to load notifications');
            return [];
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [token]);

    useEffect(() => {
        refreshNotifications();
    }, [refreshNotifications]);

    useEffect(() => {
        if (!token) return;
        refreshNotifications({ silent: true });
    }, [location.pathname, refreshNotifications, token]);

    useEffect(() => {
        if (!token) return;

        const handleFocus = () => {
            refreshNotifications({ silent: true });
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refreshNotifications, token]);

    const markAsRead = useCallback(async (id) => {
        const target = notifications.find((notification) => notification.id === id);
        if (!target || target.read) {
            return target;
        }

        setNotifications((prev) => prev.map((notification) => (
            notification.id === id ? { ...notification, read: true } : notification
        )));

        try {
            const updated = await api.put(`/notifications/${id}/read`);
            if (updated) {
                setNotifications((prev) => prev.map((notification) => (
                    notification.id === id ? updated : notification
                )));
            }
            return updated;
        } catch (err) {
            await refreshNotifications({ silent: true });
            throw err;
        }
    }, [notifications, refreshNotifications]);

    const markAllRead = useCallback(async () => {
        const hasUnread = notifications.some((notification) => !notification.read);
        if (!hasUnread) {
            return;
        }

        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));

        try {
            await api.put('/notifications/read-all');
        } catch (err) {
            await refreshNotifications({ silent: true });
            throw err;
        }
    }, [notifications, refreshNotifications]);

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.read).length,
        [notifications]
    );

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications,
        markAsRead,
        markAllRead,
    }), [notifications, unreadCount, loading, error, refreshNotifications, markAsRead, markAllRead]);

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}
