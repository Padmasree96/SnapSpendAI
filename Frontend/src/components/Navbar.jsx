import { useState } from 'react';
import { Bell, Search, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const searchableRoutes = [
    { path: '/dashboard', title: 'Dashboard', keywords: ['dashboard', 'home', 'overview'] },
    { path: '/image-capture', title: 'AI Image Capture', keywords: ['image', 'capture', 'camera', 'receipt', 'scan'] },
    { path: '/expenses', title: 'Expenses', keywords: ['expenses', 'expense', 'spending', 'spend', 'costs'] },
    { path: '/income', title: 'Income', keywords: ['income', 'salary', 'earnings', 'revenue'] },
    { path: '/accounts', title: 'Accounts & Wallets', keywords: ['accounts', 'wallet', 'wallets', 'bank', 'balance', 'cards'] },
    { path: '/budget', title: 'Budget Planning', keywords: ['budget', 'planning', 'limits'] },
    { path: '/reports', title: 'Reports & Analytics', keywords: ['reports', 'report', 'analytics', 'analysis', 'charts'] },
    { path: '/ai-chat', title: 'AI Assistant', keywords: ['ai', 'assistant', 'chat', 'ask'] },
    { path: '/notifications', title: 'Notifications', keywords: ['notifications', 'notification', 'alerts', 'reminders'] },
    { path: '/data-management', title: 'Import / Export', keywords: ['import', 'export', 'upload', 'download', 'data', 'rag'] },
    { path: '/profile', title: 'Profile & Settings', keywords: ['profile', 'settings', 'account settings'] },
    { path: '/help', title: 'Help & Support', keywords: ['help', 'support', 'faq'] },
];

const routeTitles = Object.fromEntries(searchableRoutes.map(({ path, title }) => [path, title]));

function normalizeSearchValue(value) {
    return value.toLowerCase().trim();
}

function getRouteScore(query, route) {
    const searchableTerms = [route.title, ...route.keywords].map(normalizeSearchValue);

    if (searchableTerms.some(term => term === query)) {
        return 0;
    }

    if (searchableTerms.some(term => term.startsWith(query))) {
        return 1;
    }

    if (searchableTerms.some(term => term.includes(query))) {
        return 2;
    }

    return Number.POSITIVE_INFINITY;
}

export default function Navbar({ onMenuClick }) {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const pageTitle = routeTitles[location.pathname] || 'SnapSpend AI';

    const handleSearchSubmit = (event) => {
        event.preventDefault();

        const query = normalizeSearchValue(searchTerm);
        if (!query) {
            return;
        }

        const bestMatch = searchableRoutes
            .map(route => ({ route, score: getRouteScore(query, route) }))
            .filter(({ score }) => Number.isFinite(score))
            .sort((left, right) => left.score - right.score || left.route.title.length - right.route.title.length)[0]?.route;

        if (!bestMatch) {
            return;
        }

        setSearchTerm(bestMatch.title);

        if (bestMatch.path !== location.pathname) {
            navigate(bestMatch.path);
        }
    };

    return (
        <header className="navbar">
            <div className="navbar-left">
                <button className="navbar-menu-btn" onClick={onMenuClick}>
                    <Menu size={20} />
                </button>
                <div className="navbar-title">
                    <h1>{pageTitle}</h1>
                </div>
            </div>

            <div className="navbar-center">
                <form className="navbar-search" onSubmit={handleSearchSubmit}>
                    <button type="submit" className="search-icon" aria-label="Search pages">
                        <Search size={16} />
                    </button>
                    <input
                        type="text"
                        list="navbar-page-search-options"
                        placeholder="Search pages, reports, budget..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                    <datalist id="navbar-page-search-options">
                        {searchableRoutes.map(route => (
                            <option key={route.path} value={route.title} />
                        ))}
                    </datalist>
                </form>
            </div>

            <div className="navbar-right">
                <button className="navbar-icon-btn" onClick={toggleTheme} title={`Current theme: ${theme}. Click to cycle.`}>
                    {theme === 'light' && <Moon size={19} />}
                    {theme === 'dark' && <Sun size={19} />}
                    {theme === 'emerald' && <div style={{width: 19, height: 19, background: '#10b981', borderRadius: '50%'}}></div>}
                    {theme === 'rose' && <div style={{width: 19, height: 19, background: '#f43f5e', borderRadius: '50%'}}></div>}
                </button>

                <button className="navbar-icon-btn notification-btn" onClick={() => navigate('/notifications')} title="Notifications">
                    <Bell size={19} />
                    {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>

                <button className="navbar-user-btn" onClick={() => navigate('/profile')}>
                    <div className="navbar-avatar">
                        {user?.name?.[0] || 'A'}
                    </div>
                    <span className="navbar-user-name">{user?.name?.split(' ')[0] || 'Alex'}</span>
                </button>
            </div>
        </header>
    );
}
