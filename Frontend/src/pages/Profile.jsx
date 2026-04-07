import { useState } from 'react';
import { User, Lock, Globe, Palette, Bell, Brain, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, LANGUAGE_NAMES } from '../context/LanguageContext';

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CNY'];

export default function Profile() {
    const { user, updateProfile, changePassword } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage } = useLanguage();

    const [activeTab, setActiveTab] = useState('profile');
    const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
    const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
    const [currency, setCurrency] = useState(user?.currency || 'USD');
    const [aiPrefs, setAiPrefs] = useState(user?.aiPreferences || { spendingAlerts: true, savingsTips: true, weeklyDigest: true, lifestyleInsights: true });
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleProfileSave = () => {
        updateProfile(profileForm);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handlePasswordChange = async () => {
        if (passwordForm.newPass !== passwordForm.confirm) {
            setMessage({ type: 'error', text: 'Passwords do not match' }); return;
        }
        try {
            await changePassword(passwordForm.current, passwordForm.newPass);
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordForm({ current: '', newPass: '', confirm: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'preferences', label: 'Preferences', icon: Palette },
        { id: 'ai', label: 'AI Settings', icon: Brain },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>⚙️ Profile & Settings</h1>
                <p>Manage your account settings and preferences</p>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="tabs">
                {tabs.map(tab => (
                    <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                        <tab.icon size={16} style={{ marginRight: 6 }} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile */}
            {activeTab === 'profile' && (
                <div className="card" style={{ maxWidth: 600 }}>
                    <h3 style={{ marginBottom: 20, fontWeight: 700, fontSize: '1.05rem' }}>Personal Information</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: 'var(--radius-full)',
                            background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.5rem', fontWeight: 800,
                        }}>
                            {profileForm.name?.[0] || 'A'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{profileForm.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{profileForm.email}</div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input className="form-input" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input className="form-input" type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                    </div>
                    <button className="btn btn-primary" onClick={handleProfileSave}><Save size={16} /> Save Changes</button>
                </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
                <div className="card" style={{ maxWidth: 600 }}>
                    <h3 style={{ marginBottom: 20, fontWeight: 700, fontSize: '1.05rem' }}>Change Password</h3>
                    <div className="form-group">
                        <label className="form-label">Current Password</label>
                        <input className="form-input" type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">New Password</label>
                        <input className="form-input" type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <input className="form-input" type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                    </div>
                    <button className="btn btn-primary" onClick={handlePasswordChange}><Lock size={16} /> Change Password</button>
                </div>
            )}

            {/* Preferences */}
            {activeTab === 'preferences' && (
                <div className="card" style={{ maxWidth: 600 }}>
                    <h3 style={{ marginBottom: 20, fontWeight: 700, fontSize: '1.05rem' }}>Appearance & Locale</h3>

                    <div className="form-group">
                        <label className="form-label">Theme</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => theme !== 'light' && toggleTheme()}
                            >
                                ☀️ Light
                            </button>
                            <button
                                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => theme !== 'dark' && toggleTheme()}
                            >
                                🌙 Dark
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Currency</label>
                        <select className="form-select" value={currency} onChange={e => { setCurrency(e.target.value); updateProfile({ currency: e.target.value }); }}>
                            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Language</label>
                        <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                            {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                                <option key={code} value={code}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* AI Settings */}
            {activeTab === 'ai' && (
                <div className="card" style={{ maxWidth: 600 }}>
                    <h3 style={{ marginBottom: 20, fontWeight: 700, fontSize: '1.05rem' }}>AI Personalization</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Configure how SnapSpend AI interacts with you and what insights it provides.
                    </p>

                    {[
                        { key: 'spendingAlerts', label: 'Spending Alerts', desc: 'Get notified when you exceed budget limits' },
                        { key: 'savingsTips', label: 'Savings Tips', desc: 'Receive AI-powered savings recommendations' },
                        { key: 'weeklyDigest', label: 'Weekly AI Digest', desc: 'Get a weekly summary of your financial activity' },
                    ].map(pref => (
                        <div key={pref.key} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 0', borderBottom: '1px solid var(--border-light)',
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pref.label}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{pref.desc}</div>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26 }}>
                                <input
                                    type="checkbox"
                                    checked={aiPrefs[pref.key]}
                                    onChange={() => setAiPrefs(prev => ({ ...prev, [pref.key]: !prev[pref.key] }))}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', inset: 0,
                                    background: aiPrefs[pref.key] ? 'var(--primary-500)' : 'var(--gray-300)',
                                    borderRadius: 'var(--radius-full)', transition: 'var(--transition-fast)',
                                }}></span>
                                <span style={{
                                    position: 'absolute', content: '', height: 20, width: 20,
                                    left: aiPrefs[pref.key] ? 24 : 3, bottom: 3,
                                    background: 'white', borderRadius: '50%', transition: 'var(--transition-fast)',
                                    boxShadow: 'var(--shadow-sm)',
                                }}></span>
                            </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
