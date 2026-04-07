import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';

// Layout
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Feature Pages
import Dashboard from './pages/Dashboard';
import ImageCapture from './pages/ImageCapture';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Accounts from './pages/Accounts';
import Budget from './pages/Budget';
import Reports from './pages/Reports';

import AIChat from './pages/AIChat';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import DataManagement from './pages/DataManagement';
import Help from './pages/Help';

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💸</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Loading SnapSpend AI...</div>
            </div>
        </div>
    );
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <NotificationsProvider>
            <div className="app-layout">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    setCollapsed={setSidebarCollapsed}
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                />
                <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                    <Navbar onMenuClick={() => setMobileOpen(true)} />
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/image-capture" element={<ImageCapture />} />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/income" element={<Income />} />
                        <Route path="/accounts" element={<Accounts />} />
                        <Route path="/budget" element={<Budget />} />
                        <Route path="/reports" element={<Reports />} />

                        <Route path="/ai-chat" element={<AIChat />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/data-management" element={<DataManagement />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </div>
        </NotificationsProvider>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </Router>
            </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}
