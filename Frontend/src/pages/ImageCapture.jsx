import { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, Image, Loader, Zap, FileText, Tag, BarChart3, Save } from 'lucide-react';
import { CATEGORIES, formatCurrency } from '../utils/mockData';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ImageCapture() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [detectedResult, setDetectedResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [cameraMode, setCameraMode] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [capabilities, setCapabilities] = useState(null);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { token } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCapabilities = async () => {
            try {
                const response = await fetch('/api/image/capabilities', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) return;
                const data = await response.json();
                setCapabilities(data);
            } catch {
                setCapabilities(null);
            }
        };
        fetchCapabilities();
    }, [token]);

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setUploadComplete(false);
            setDetectedResult(null);
            setError('');
            setSaved(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setCameraStream(stream);
            setCameraMode(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 100);
        } catch {
            alert('Unable to access camera. Please check permissions.');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
            canvas.toBlob((blob) => {
                const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
                setSelectedFile(file);
                setPreview(URL.createObjectURL(blob));
                stopCamera();
            }, 'image/jpeg', 0.9);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setCameraMode(false);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch('/api/image/analyze', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('Server returned an invalid response.');
            }

            if (!response.ok) {
                const detail = data?.detail;
                if (detail && typeof detail === 'object' && detail.manualEntryRequired) {
                    setDetectedResult({
                        merchant: detail.merchant || 'Bill',
                        amount: Number(detail.amount) || 0,
                        date: detail.date || new Date().toISOString().split('T')[0],
                        category: detail.category || 'others',
                        items: [],
                        confidence: 0,
                        activityType: 'Manual Entry',
                        imagePath: detail.imagePath || '',
                        source: detail.source || 'manual_entry',
                        rawText: detail.rawText || '',
                    });
                    setUploadComplete(true);
                    setError(detail.message || 'Auto-detection failed. Please enter details manually.');
                    return;
                }

                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Image analysis failed');
            }

            setDetectedResult({
                merchant: data.merchant || 'Unknown',
                amount: Number(data.amount) || 0,
                date: data.date || new Date().toISOString().split('T')[0],
                category: data.category || 'others',
                items: data.items || [],
                confidence: Number(data.confidence) || 0,
                activityType: data.activityType || 'General Spending',
                imagePath: data.imagePath || '',
                source: data.source || 'unknown',
                rawText: data.rawText || '',
            });

            setUploadComplete(true);
        } catch (err) {
            setError(err.message || 'Failed to analyze image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const isManualEntry = detectedResult?.source === 'manual_entry';

    const handleSaveExpense = async () => {
        if (!detectedResult) return;

        const amount = Number(detectedResult.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Please enter a valid amount greater than 0 before saving.');
            return;
        }

        if (!detectedResult.merchant?.trim()) {
            setError('Please enter a bill/merchant description before saving.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type: 'expense',
                    amount,
                    category: detectedResult.category || 'others',
                    description: detectedResult.merchant.trim(),
                    date: detectedResult.date || new Date().toISOString().split('T')[0],
                    image: detectedResult.imagePath,
                    aiDetected: !isManualEntry,
                    confidence: isManualEntry ? null : detectedResult.confidence,
                    notes: isManualEntry
                        ? 'Manual entry from uploaded bill image'
                        : `AI-detected (${detectedResult.source}). Items: ${(detectedResult.items || []).map(i => i.name).join(', ')}`,
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('Server returned an invalid response.');
            }

            if (!response.ok) {
                throw new Error(data?.detail?.message || data?.message || data?.detail || 'Failed to save expense');
            }

            setSaved(true);
        } catch (err) {
            setError(err.message || 'Failed to save expense. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const clearAll = () => {
        setSelectedFile(null);
        setPreview(null);
        setUploadComplete(false);
        setDetectedResult(null);
        setError('');
        setSaved(false);
        stopCamera();
    };

    const categoryInfo = detectedResult ? CATEGORIES.find(c => c.id === detectedResult.category) : null;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>AI Image Capture & Upload</h1>
                <p>Upload or capture receipts, bills, and shopping photos for expense detection</p>
            </div>

            {capabilities && !capabilities.autoDetectionAvailable && (
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                    <span>
                        Auto bill detection is currently OFF. Configure `GEMINI_API_KEY` or install Tesseract OCR (`TESSERACT_PATH`) in backend `.env`, then restart backend.
                    </span>
                </div>
            )}

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h2>Upload Image</h2>
                        {selectedFile && (
                            <button className="btn btn-ghost btn-sm" onClick={clearAll}><X size={16} /> Clear</button>
                        )}
                    </div>

                    {cameraMode ? (
                        <div style={{ textAlign: 'center' }}>
                            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 'var(--radius-lg)', maxHeight: 350 }} />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                                <button className="btn btn-primary" onClick={capturePhoto}><Camera size={18} /> Capture</button>
                                <button className="btn btn-secondary" onClick={stopCamera}>Cancel</button>
                            </div>
                        </div>
                    ) : preview ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-block', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid var(--border-color)' }}>
                                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 350, display: 'block' }} />
                                {uploading && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: 12 }}>
                                        <Loader size={36} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                                        <span style={{ fontWeight: 600 }}>Analyzing image...</span>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Extracting bill details</span>
                                    </div>
                                )}
                                {uploadComplete && (
                                    <div style={{ position: 'absolute', top: 12, right: 12, background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <CheckCircle size={14} /> Processed
                                    </div>
                                )}
                            </div>

                            {!uploadComplete && !uploading && (
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                                    <button className="btn btn-primary" onClick={handleUpload}><Zap size={18} /> Analyze Bill</button>
                                    <button className="btn btn-secondary" onClick={clearAll}>Remove</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div
                                className={`upload-zone ${dragOver ? 'dragover' : ''}`}
                                onDrop={handleDrop}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Image size={48} />
                                <p>
                                    <span className="highlight">Click to upload</span> or drag and drop
                                </p>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                    Receipts, bills, and payment slips
                                </p>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                                    PNG, JPG, JPEG up to 10MB
                                </p>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files[0])} style={{ display: 'none' }} />
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <button className="btn btn-secondary" onClick={startCamera}>
                                    <Camera size={18} /> Open Camera
                                </button>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="alert alert-danger" style={{ marginTop: 16 }}>
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2>Detected Result</h2>
                    </div>

                    {detectedResult ? (
                        <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: isManualEntry ? 'var(--warning-bg)' : 'var(--success-bg)', borderRadius: 'var(--radius-md)', border: `1px solid ${isManualEntry ? 'var(--warning)' : 'var(--success)'}` }}>
                                <CheckCircle size={20} style={{ color: isManualEntry ? 'var(--warning)' : 'var(--success)' }} />
                                <div>
                                    <div style={{ fontWeight: 700, color: isManualEntry ? 'var(--warning)' : 'var(--success)', fontSize: '0.9rem' }}>
                                        {isManualEntry ? 'Manual entry required' : `${detectedResult.confidence}% confidence`}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        {isManualEntry ? 'Auto-detection could not complete. Enter bill details below.' : `Detected by ${detectedResult.source}`}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <div style={{ padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <FileText size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>MERCHANT</span>
                                    </div>
                                    {isManualEntry ? (
                                        <input className="form-input" value={detectedResult.merchant || ''} onChange={(e) => setDetectedResult((prev) => ({ ...prev, merchant: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{detectedResult.merchant}</div>
                                    )}
                                </div>

                                <div style={{ padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <Tag size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>CATEGORY</span>
                                    </div>
                                    {isManualEntry ? (
                                        <select className="form-select" value={detectedResult.category || 'others'} onChange={(e) => setDetectedResult((prev) => ({ ...prev, category: e.target.value }))}>
                                            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                        </select>
                                    ) : (
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{categoryInfo?.icon} {categoryInfo?.name || detectedResult.category}</div>
                                    )}
                                </div>

                                <div style={{ padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <BarChart3 size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>DATE</span>
                                    </div>
                                    {isManualEntry ? (
                                        <input className="form-input" type="date" value={detectedResult.date || new Date().toISOString().split('T')[0]} onChange={(e) => setDetectedResult((prev) => ({ ...prev, date: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{detectedResult.date}</div>
                                    )}
                                </div>

                                <div style={{ padding: 14, background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-200)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 6 }}>TOTAL AMOUNT</div>
                                    {isManualEntry ? (
                                        <input className="form-input" type="number" min="0" step="0.01" placeholder="Enter amount" value={detectedResult.amount || ''} onChange={(e) => setDetectedResult((prev) => ({ ...prev, amount: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--primary-500)' }}>{formatCurrency(detectedResult.amount)}</div>
                                    )}
                                </div>
                            </div>

                            {!isManualEntry && (detectedResult.items || []).length > 0 && (
                                <>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Extracted Items</h3>
                                    <div style={{ marginBottom: 20 }}>
                                        {(detectedResult.items || []).map((item, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                                <span style={{ fontWeight: 600 }}>{formatCurrency(item.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {saved && (
                                <div className="alert alert-success" style={{ marginBottom: 16 }}>
                                    <CheckCircle size={16} />
                                    <span>Expense saved successfully! <a href="#" onClick={(e) => { e.preventDefault(); navigate('/expenses'); }} style={{ fontWeight: 600 }}>View Expenses</a></span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                {!saved && (
                                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveExpense} disabled={saving}>
                                        {saving ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save as Expense</>}
                                    </button>
                                )}
                                <button className="btn btn-secondary" onClick={clearAll}>{saved ? 'Scan Another' : 'Discard'}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <Camera size={56} />
                            <p>Upload or capture a bill image to detect expense details</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>If auto-detection fails, manual entry will be shown automatically.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
