import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Receipt, DollarSign, Wallet, PiggyBank,
    BarChart3, Brain, Bot, Bell, User, Settings, Upload, Download,
    HelpCircle, Camera, ChevronLeft, ChevronRight, Sparkles, LogOut, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, sidebarLabelKeys } from '../context/LanguageContext';
import './Sidebar.css';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/image-capture', label: 'AI Image Capture', icon: Camera },
    { path: '/expenses', label: 'Expenses', icon: Receipt },
    { path: '/income', label: 'Income', icon: DollarSign },
    { path: '/accounts', label: 'Accounts & Wallets', icon: Wallet },
    { path: '/budget', label: 'Budget Planning', icon: PiggyBank },
    { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },

    { path: '/ai-chat', label: 'AI Assistant', icon: Bot },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/data-management', label: 'Import / Export', icon: Download },
    { path: '/profile', label: 'Profile & Settings', icon: Settings },
    { path: '/help', label: 'Help & Support', icon: HelpCircle },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const { t } = useLanguage();

    const handleNavClick = () => {
        if (window.innerWidth < 768) {
            setMobileOpen(false);
        }
    };

    return (
        <>
            {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="logo-icon">
                            <Sparkles size={20} />
                        </div>
                        {!collapsed && <span className="logo-text">SnapSpend AI</span>}
                    </div>
                    <button className="sidebar-toggle desktop-only" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    <button className="sidebar-toggle mobile-only" onClick={() => setMobileOpen(false)}>
                        <X size={18} />
                    </button>
                </div>

                {!collapsed && (
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {user?.name?.[0] || 'A'}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{user?.name || 'Alex Johnson'}</span>
                            <span className="sidebar-user-email">{user?.email || 'alex@snapspend.ai'}</span>
                        </div>
                    </div>
                )}

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={handleNavClick}
                            title={collapsed ? item.label : ''}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{sidebarLabelKeys[item.path] ? t(sidebarLabelKeys[item.path]) : item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-link logout-btn" onClick={logout} title={collapsed ? 'Logout' : ''}>
                        <LogOut size={20} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
