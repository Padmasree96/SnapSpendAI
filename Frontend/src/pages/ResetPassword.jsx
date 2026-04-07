import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!password) return setError('Password is required');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        if (password !== confirmPassword) return setError('Passwords do not match');

        setLoading(true);
        try {
            const result = await resetPassword('mock-token', password);
            setSuccess(result.message);
            setTimeout(() => navigate('/login'), 2000);
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
                    <p>Create a new password</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>Reset Password</h2>
                    <p className="subtitle">Enter your new password below</p>

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
                        <label className="form-label">New Password</label>
                        <div className="form-input-icon">
                            <Lock size={18} className="icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingRight: 42 }}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', border: 'none', padding: 4 }}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <div className="form-input-icon">
                            <Lock size={18} className="icon" />
                            <input type="password" className="form-input" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Resetting...' : <><ShieldCheck size={18} /> Reset Password</>}
                    </button>
                </form>

                <div className="auth-footer">
                    <Link to="/login">Back to Sign In</Link>
                </div>
            </div>
        </div>
    );
}
