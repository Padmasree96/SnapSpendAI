import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { forgotPassword } = useAuth();

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) return setError('Email is required');
        if (!validateEmail(email)) return setError('Please enter a valid email');

        setLoading(true);
        try {
            const result = await forgotPassword(email);
            setSuccess(result.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <h1>💸 SnapSpend AI</h1>
                    <p>Reset your password</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>Forgot Password?</h2>
                    <p className="subtitle">Enter your email and we'll send you a reset link</p>

                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                            <AlertCircle size={16} /><span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success" style={{ marginBottom: 20 }}>
                            <CheckCircle size={16} /><span>{success}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="form-input-icon">
                            <Mail size={18} className="icon" />
                            <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Sending...' : <><Send size={18} /> Send Reset Link</>}
                    </button>
                </form>

                <div className="auth-footer">
                    Remember your password? <Link to="/login">Sign In</Link>
                </div>
            </div>
        </div>
    );
}
