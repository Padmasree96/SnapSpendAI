import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { createBackendUnavailableError, readJsonResponse } from '../services/apiResponse';

const AuthContext = createContext();
const LANGUAGE_EVENT_NAME = 'snapspend-language-change';

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const syncUserPreferences = (profile) => {
        if (!profile || typeof window === 'undefined') {
            return;
        }

        if (profile.currency) {
            localStorage.setItem('snapspend-currency', profile.currency);
        }

        if (profile.language) {
            localStorage.setItem('snapspend-language', profile.language);
            window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT_NAME, {
                detail: { language: profile.language },
            }));
        }
    };

    useEffect(() => {
        const savedToken = localStorage.getItem('snapspend-token') || sessionStorage.getItem('snapspend-token');
        if (savedToken) {
            setToken(savedToken);
            // Fetch user profile from API
            fetch('/api/profile', {
                headers: { Authorization: `Bearer ${savedToken}` },
            })
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(data => {
                    syncUserPreferences(data);
                    setUser(data);
                    setLoading(false);
                })
                .catch(() => {
                    // Token expired or invalid
                    localStorage.removeItem('snapspend-token');
                    sessionStorage.removeItem('snapspend-token');
                    setToken(null);
                    setUser(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password, rememberMe = false) => {
        let response;
        try {
            response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
        } catch {
            throw createBackendUnavailableError();
        }

        const data = await readJsonResponse(response);

        if (!response.ok) {
            const msg = data?.detail?.message || data?.message || data?.detail || 'Login failed';
            throw new Error(msg);
        }

        if (rememberMe) {
            localStorage.setItem('snapspend-token', data.token);
        } else {
            sessionStorage.setItem('snapspend-token', data.token);
        }

        setToken(data.token);
        syncUserPreferences(data.user);
        setUser(data.user);
        return { success: true };
    };

    const register = async (name, email, password) => {
        let response;
        try {
            response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
        } catch {
            throw createBackendUnavailableError();
        }

        const data = await readJsonResponse(response);

        if (!response.ok) {
            const msg = data?.detail?.message || data?.message || data?.detail || 'Registration failed';
            throw new Error(msg);
        }

        localStorage.setItem('snapspend-token', data.token);
        setToken(data.token);
        syncUserPreferences(data.user);
        setUser(data.user);
        return { success: true };
    };

    const forgotPassword = async (email) => {
        let response;
        try {
            response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
        } catch {
            throw createBackendUnavailableError();
        }

        const data = await readJsonResponse(response);

        if (!response.ok) {
            const msg = data?.detail?.message || data?.message || data?.detail || 'Request failed';
            throw new Error(msg);
        }
        return data;
    };

    const resetPassword = async (resetToken, password) => {
        let response;
        try {
            response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, password }),
            });
        } catch {
            throw createBackendUnavailableError();
        }

        const data = await readJsonResponse(response);

        if (!response.ok) {
            const msg = data?.detail?.message || data?.message || data?.detail || 'Reset failed';
            throw new Error(msg);
        }
        return data;
    };

    const logout = () => {
        localStorage.removeItem('snapspend-token');
        sessionStorage.removeItem('snapspend-token');
        setToken(null);
        setUser(null);
    };

    const updateProfile = async (updates) => {
        let response;
        try {
            response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });
        } catch {
            throw createBackendUnavailableError();
        }

        const data = await readJsonResponse(response);

        if (!response.ok) {
            const msg = data?.detail?.message || data?.message || data?.detail || 'Update failed';
            throw new Error(msg);
        }
        syncUserPreferences(data);
        setUser(data);
        return { success: true };
    };

    const changePassword = async (currentPassword, newPassword) => {
        let response;
        try {
            response = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
        } catch {
            throw createBackendUnavailableError();
        }

        const data = await readJsonResponse(response);

        if (!response.ok) {
            const msg = data?.detail?.message || data?.message || data?.detail || 'Password change failed';
            throw new Error(msg);
        }
        return data;
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated: !!token,
            login,
            register,
            forgotPassword,
            resetPassword,
            logout,
            updateProfile,
            changePassword,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
