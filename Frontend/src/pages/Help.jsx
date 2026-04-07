import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Mail, Phone, Shield, Info, Send, HelpCircle } from 'lucide-react';
import { mockFAQs } from '../utils/mockData';

export default function Help() {
    const [openFaq, setOpenFaq] = useState(null);
    const [activeTab, setActiveTab] = useState('faq');
    const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [sent, setSent] = useState(false);

    const handleContactSubmit = (e) => {
        e.preventDefault();
        setSent(true);
        setTimeout(() => setSent(false), 4000);
        setContactForm({ name: '', email: '', subject: '', message: '' });
    };

    const tabs = [
        { id: 'faq', label: 'FAQs', icon: HelpCircle },
        { id: 'contact', label: 'Contact Support', icon: MessageSquare },
        { id: 'about', label: 'About', icon: Info },
        { id: 'privacy', label: 'Privacy', icon: Shield },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>❓ Help & Support</h1>
                <p>Find answers, get help, and learn about SnapSpend AI</p>
            </div>

            <div className="tabs">
                {tabs.map(tab => (
                    <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                        <tab.icon size={16} style={{ marginRight: 6 }} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* FAQs */}
            {activeTab === 'faq' && (
                <div style={{ maxWidth: 800 }}>
                    {mockFAQs.map((faq, i) => (
                        <div className="accordion-item" key={i}>
                            <button className="accordion-header" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <span>{faq.q}</span>
                                {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            {openFaq === i && <div className="accordion-body">{faq.a}</div>}
                        </div>
                    ))}
                </div>
            )}

            {/* Contact Support */}
            {activeTab === 'contact' && (
                <div className="grid-2">
                    <div className="card">
                        <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Send a Message</h3>
                        {sent && (
                            <div className="alert alert-success" style={{ marginBottom: 16 }}>
                                <Send size={14} /> Message sent! We'll respond within 24 hours.
                            </div>
                        )}
                        <form onSubmit={handleContactSubmit}>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input className="form-input" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <input className="form-input" value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea className="form-textarea" rows={5} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} required></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary"><Send size={16} /> Send Message</button>
                        </form>
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Other Ways to Reach Us</h3>
                        {[
                            { icon: Mail, label: 'Email Support', value: 'support@snapspend.ai', desc: 'Response within 24 hours' },
                            { icon: Phone, label: 'Phone Support', value: '+1 (800) 555-0199', desc: 'Mon-Fri, 9 AM - 6 PM EST' },
                            { icon: MessageSquare, label: 'Live Chat', value: 'Available in-app', desc: 'Use the AI Assistant for instant help' },
                        ].map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                                background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 12,
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                    background: 'var(--primary-50)', color: 'var(--primary-500)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <item.icon size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-500)' }}>{item.value}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* About */}
            {activeTab === 'about' && (
                <div className="card" style={{ maxWidth: 700 }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                            💸 SnapSpend AI
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Your Smart Personal Finance Assistant</p>
                        <span className="badge badge-primary" style={{ marginTop: 8 }}>Version 1.0.0</span>
                    </div>
                    <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <p style={{ marginBottom: 12 }}>
                            SnapSpend AI is an intelligent personal finance management platform that helps you track expenses, manage budgets, and gain AI-powered insights into your spending behavior.
                        </p>
                        <p style={{ marginBottom: 12 }}>
                            Our AI technology can automatically detect expenses from receipt photos, predict your monthly spending, and provide personalized recommendations to help you achieve your financial goals.
                        </p>
                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 20, marginBottom: 8 }}>Key Features</h4>
                        <ul style={{ paddingLeft: 20 }}>
                            <li>AI-powered receipt scanning and expense detection</li>
                            <li>Smart budget planning with overspending alerts</li>
                            <li>Behavioral and lifestyle financial insights</li>
                            <li>Interactive AI chat assistant for financial advice</li>
                            <li>Comprehensive reports and analytics</li>
                            <li>Multi-account and wallet management</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Privacy */}
            {activeTab === 'privacy' && (
                <div className="card" style={{ maxWidth: 700 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>Privacy Policy</h3>
                    <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <p style={{ marginBottom: 16 }}>
                            At SnapSpend AI, your privacy and data security are our top priorities. This policy outlines how we collect, use, and protect your personal and financial information.
                        </p>
                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Data Collection</h4>
                        <p style={{ marginBottom: 16 }}>We collect only the information necessary to provide our services, including your name, email, financial transactions, and uploaded receipt images. All data is encrypted using AES-256 encryption.</p>
                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Data Usage</h4>
                        <p style={{ marginBottom: 16 }}>Your data is used solely to provide personalized financial insights, track expenses, and improve our AI models. We never sell your data to third parties.</p>
                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Security Measures</h4>
                        <p style={{ marginBottom: 16 }}>We employ bank-level security measures including end-to-end encryption, secure token authentication, regular security audits, and compliance with financial data protection regulations.</p>
                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Your Rights</h4>
                        <p>You have the right to access, modify, or delete your personal data at any time. You can also opt out of AI analysis features through your Profile & Settings page.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
