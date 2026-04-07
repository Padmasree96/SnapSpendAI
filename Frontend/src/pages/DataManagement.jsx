import { useEffect, useRef, useState } from 'react';
import { Upload, Download, FileText, FileSpreadsheet, CheckCircle, X, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { createBackendUnavailableError, readJsonResponse } from '../services/apiResponse';

const RAG_ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png'];

const getErrorMessage = (data, fallback) =>
    data?.detail?.message || data?.message || data?.detail || fallback;

const formatFileSize = (size) => `${(size / 1024).toFixed(1)} KB`;

const isRagFileSupported = (file) => {
    const name = (file?.name || '').toLowerCase();
    return RAG_ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

export default function DataManagement() {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [importDragOver, setImportDragOver] = useState(false);
    const [dataError, setDataError] = useState('');
    const [exporting, setExporting] = useState('');

    const [ragFile, setRagFile] = useState(null);
    const [ragUploading, setRagUploading] = useState(false);
    const [ragResult, setRagResult] = useState(null);
    const [ragStatus, setRagStatus] = useState(null);
    const [ragLoading, setRagLoading] = useState(true);
    const [ragError, setRagError] = useState('');
    const [ragDragOver, setRagDragOver] = useState(false);

    const fileInputRef = useRef(null);
    const ragInputRef = useRef(null);
    const { token } = useAuth();

    const loadRagStatus = async () => {
        if (!token) {
            setRagStatus(null);
            setRagLoading(false);
            return;
        }

        setRagLoading(true);
        try {
            let response;
            try {
                response = await fetch('/api/rag/status', {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch {
                throw createBackendUnavailableError();
            }

            const data = await readJsonResponse(response);
            if (!response.ok) {
                throw new Error(getErrorMessage(data, 'Unable to load AI memory status.'));
            }

            setRagError('');
            setRagStatus(data);
        } catch (err) {
            setRagStatus(null);
            setRagError(err.message || 'Unable to load AI memory status.');
        } finally {
            setRagLoading(false);
        }
    };

    useEffect(() => {
        loadRagStatus();
    }, [token]);

    const handleRagFileSelect = (file) => {
        if (!file) return;

        if (!isRagFileSupported(file)) {
            setRagError('Please upload a PDF, Excel, CSV, JPG, JPEG, or PNG file for AI memory.');
            return;
        }

        setRagFile(file);
        setRagResult(null);
        setRagError('');
    };

    const handleRagUpload = async () => {
        if (!ragFile) return;

        setRagUploading(true);
        setRagError('');

        try {
            const formData = new FormData();
            formData.append('file', ragFile);

            let response;
            try {
                response = await fetch('/api/rag/upload', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });
            } catch {
                throw createBackendUnavailableError();
            }

            const data = await readJsonResponse(response);
            if (!response.ok) {
                throw new Error(getErrorMessage(data, 'RAG upload failed.'));
            }

            setRagResult(data);
            setRagStatus(data.status || null);
            setRagFile(null);
            if (ragInputRef.current) {
                ragInputRef.current.value = '';
            }
            toast.success(data.message || 'Document added to AI memory.');
        } catch (err) {
            setRagError(err.message || 'Unable to train AI memory.');
        } finally {
            setRagUploading(false);
        }
    };

    const handleFileSelect = (file) => {
        if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.pdf'))) {
            setUploadedFile(file);
            setUploadResult(null);
            setDataError('');
        } else if (file) {
            setDataError('Please upload a CSV, Excel (.xlsx), or PDF file.');
        }
    };

    const handleUpload = async () => {
        if (!uploadedFile) return;
        setUploading(true);
        setDataError('');

        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);

            const isExcel = uploadedFile.name.endsWith('.xlsx');
            const isPdf = uploadedFile.name.endsWith('.pdf');
            const endpoint = isPdf ? '/api/data/import/pdf' : isExcel ? '/api/data/import/excel' : '/api/data/import/csv';

            let response;
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });
            } catch {
                throw createBackendUnavailableError();
            }

            const data = await readJsonResponse(response);
            if (!response.ok) {
                throw new Error(getErrorMessage(data, 'Import failed.'));
            }

            setUploadResult(data);
        } catch (err) {
            setDataError(err.message || 'Failed to import file. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleImportDrop = (e) => {
        e.preventDefault();
        setImportDragOver(false);
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const handleRagDrop = (e) => {
        e.preventDefault();
        setRagDragOver(false);
        handleRagFileSelect(e.dataTransfer.files[0]);
    };

    const handleExport = async (format) => {
        setExporting(format);
        setDataError('');

        try {
            const endpointMap = {
                pdf: '/api/data/export/pdf',
                xlsx: '/api/data/export/excel',
                csv: '/api/data/export/csv',
            };

            let response;
            try {
                response = await fetch(endpointMap[format], {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            } catch {
                throw createBackendUnavailableError();
            }

            if (!response.ok) {
                let errData;
                try {
                    errData = await readJsonResponse(response);
                } catch {
                    errData = null;
                }
                throw new Error(getErrorMessage(errData, `Export failed (${response.status})`));
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition?.match(/filename=(.+)/);
            link.download = filenameMatch ? filenameMatch[1] : `SnapSpend_Report.${format}`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setDataError(err.message || 'Failed to export. Please try again.');
        } finally {
            setExporting('');
        }
    };

    const handleClearRagMemory = async () => {
        if (!window.confirm('Clear AI memory?')) return;

        setRagError('');
        try {
            let response;
            try {
                response = await fetch('/api/rag/clear', {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch {
                throw createBackendUnavailableError();
            }

            const data = await readJsonResponse(response);
            if (!response.ok) {
                throw new Error(getErrorMessage(data, 'Unable to clear AI memory.'));
            }

            setRagResult(null);
            setRagStatus(data.status || null);
            toast.success(data.message || 'AI memory cleared.');
        } catch (err) {
            setRagError(err.message || 'Unable to clear AI memory.');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Data Import & Export</h1>
                <p>Upload bank statements, export reports, and manage AI memory</p>
            </div>

            {dataError && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>{dataError}</span>
                </div>
            )}

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h2>Import Data</h2>
                    </div>

                    <div
                        className={`upload-zone ${importDragOver ? 'dragover' : ''}`}
                        onDrop={handleImportDrop}
                        onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
                        onDragLeave={() => setImportDragOver(false)}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ marginBottom: 16 }}
                    >
                        <Upload size={40} />
                        <p><span className="highlight">Click to upload</span> or drag & drop</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4 }}>CSV, Excel (.xlsx), or PDF files</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                            Expected columns: Date, Description, Amount, Category (optional), Type (optional)
                        </p>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.pdf" onChange={e => handleFileSelect(e.target.files[0])} style={{ display: 'none' }} />

                    {uploadedFile && (
                        <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 16,
                            }}>
                                <FileSpreadsheet size={24} style={{ color: 'var(--primary-500)' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{uploadedFile.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                        {formatFileSize(uploadedFile.size)}
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-icon" onClick={() => { setUploadedFile(null); setUploadResult(null); setDataError(''); }} style={{ width: 28, height: 28 }}>
                                    <X size={14} />
                                </button>
                            </div>

                            {!uploadResult && (
                                <button className="btn btn-primary" onClick={handleUpload} disabled={uploading} style={{ width: '100%' }}>
                                    {uploading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <><Upload size={16} /> Import Data</>}
                                </button>
                            )}

                            {uploadResult && (
                                <div className="alert alert-success">
                                    <CheckCircle size={16} />
                                    <span>
                                        Successfully imported <strong>{uploadResult.imported}</strong> transactions!
                                        {uploadResult.skipped > 0 && <> ({uploadResult.skipped} skipped)</>}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2>Export Reports</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExport('pdf')}
                            disabled={!!exporting}
                            style={{ padding: '20px', flexDirection: 'column', height: 'auto', gap: 8 }}
                        >
                            {exporting === 'pdf' ? <Loader size={28} className="spin" /> : <FileText size={28} style={{ color: 'var(--danger)' }} />}
                            <span style={{ fontWeight: 700 }}>Export PDF</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Financial report</span>
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExport('xlsx')}
                            disabled={!!exporting}
                            style={{ padding: '20px', flexDirection: 'column', height: 'auto', gap: 8 }}
                        >
                            {exporting === 'xlsx' ? <Loader size={28} className="spin" /> : <FileSpreadsheet size={28} style={{ color: 'var(--success)' }} />}
                            <span style={{ fontWeight: 700 }}>Export Excel</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Detailed data</span>
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExport('csv')}
                            disabled={!!exporting}
                            style={{ padding: '20px', flexDirection: 'column', height: 'auto', gap: 8 }}
                        >
                            {exporting === 'csv' ? <Loader size={28} className="spin" /> : <Download size={28} style={{ color: 'var(--info)' }} />}
                            <span style={{ fontWeight: 700 }}>Export CSV</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Raw data</span>
                        </button>
                    </div>

                    <div style={{ padding: 20, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Export financial data as PDF, Excel, or CSV.
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h2>AI Intelligence Training (RAG)</h2>
                    <span className="badge badge-info">{ragStatus?.mode === 'faiss' ? 'Semantic Search' : 'Document Memory'}</span>
                </div>

                {ragError && (
                    <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                        <span>{ragError}</span>
                    </div>
                )}

                {ragResult && (
                    <div className="alert alert-success" style={{ marginBottom: 16 }}>
                        <CheckCircle size={16} />
                        <span>
                            {ragResult.message} Indexed <strong>{ragResult.chunks}</strong> chunk(s).
                        </span>
                    </div>
                )}

                <div className="grid-2">
                    <div>
                        <p style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Upload documents to build AI memory for your assistant. Supported files: PDF, Excel, CSV, JPG, JPEG, and PNG.
                        </p>

                        <div
                            className={`upload-zone ${ragDragOver ? 'dragover' : ''}`}
                            onClick={() => ragInputRef.current?.click()}
                            onDrop={handleRagDrop}
                            onDragOver={(e) => { e.preventDefault(); setRagDragOver(true); }}
                            onDragLeave={() => setRagDragOver(false)}
                            style={{ padding: '30px' }}
                        >
                            <Upload size={32} />
                            <p><span className="highlight">Upload Intelligence Document</span></p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                PDF, Excel, CSV, JPG, JPEG, PNG
                            </p>
                        </div>
                        <input
                            ref={ragInputRef}
                            type="file"
                            accept={RAG_ACCEPTED_EXTENSIONS.join(',')}
                            onChange={e => handleRagFileSelect(e.target.files[0])}
                            style={{ display: 'none' }}
                        />

                        {ragFile && (
                            <div style={{ marginTop: 16 }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 12,
                                }}>
                                    <FileText size={20} style={{ color: 'var(--primary-500)' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ragFile.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{formatFileSize(ragFile.size)}</div>
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={() => {
                                            setRagFile(null);
                                            setRagResult(null);
                                            setRagError('');
                                            if (ragInputRef.current) {
                                                ragInputRef.current.value = '';
                                            }
                                        }}
                                        style={{ width: 28, height: 28 }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <button className="btn btn-primary" onClick={handleRagUpload} disabled={ragUploading} style={{ width: '100%' }}>
                                    {ragUploading ? <><Loader size={16} className="spin" /> Training AI...</> : <><Upload size={16} /> Train AI</>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: 20, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <h3 style={{ fontSize: '0.9rem', marginBottom: 12 }}>Memory Status</h3>

                        {ragLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                                <Loader size={16} className="spin" />
                                <span>Loading AI memory...</span>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Mode</div>
                                        <div style={{ fontWeight: 700 }}>{ragStatus?.modeLabel || 'Not ready'}</div>
                                    </div>
                                    <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Stored Chunks</div>
                                        <div style={{ fontWeight: 700 }}>{ragStatus?.chunkCount ?? 0}</div>
                                    </div>
                                    <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Documents</div>
                                        <div style={{ fontWeight: 700 }}>{ragStatus?.documentCount ?? 0}</div>
                                    </div>
                                    <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Answer Mode</div>
                                        <div style={{ fontWeight: 700 }}>{ragStatus?.llmEnabled ? 'AI summary' : 'Direct retrieval'}</div>
                                    </div>
                                </div>

                                {!ragStatus?.llmEnabled && (
                                    <p style={{
                                        marginTop: 0,
                                        marginBottom: 16,
                                        fontSize: '0.82rem',
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.6,
                                    }}>
                                        OpenAI summary mode is currently off. Your uploaded files are still stored in local document memory, and the AI assistant can answer from matching document text.
                                    </p>
                                )}

                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>Indexed files</div>
                                    {ragStatus?.sources?.length ? (
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {ragStatus.sources.map((source) => (
                                                <div key={`${source.source}-${source.chunks}`} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    gap: 12,
                                                    padding: '10px 12px',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border-color)',
                                                    fontSize: '0.82rem',
                                                }}>
                                                    <span style={{ wordBreak: 'break-word' }}>{source.source}</span>
                                                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{source.chunks} chunk(s)</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            No AI memory yet. Upload a document, then ask questions in the AI Assistant page.
                                        </p>
                                    )}
                                </div>

                                <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ width: '100%', color: 'var(--danger)' }}
                                    onClick={handleClearRagMemory}
                                    disabled={!ragStatus?.chunkCount}
                                >
                                    Clear AI Memory
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
