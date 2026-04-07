import { createBackendUnavailableError, readJsonResponse } from './apiResponse';

const BASE_URL = '/api';

const getToken = () => {
    return localStorage.getItem('snapspend-token') || sessionStorage.getItem('snapspend-token');
};

const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    let response;
    try {
        response = await fetch(`${BASE_URL}${endpoint}`, config);
    } catch {
        throw createBackendUnavailableError();
    }

    if (response.status === 401) {
        localStorage.removeItem('snapspend-token');
        sessionStorage.removeItem('snapspend-token');
        window.location.href = '/login';
        return;
    }

    const data = await readJsonResponse(response);

    if (!response.ok) {
        const msg = data?.detail?.message || data?.message || data?.detail || 'Request failed';
        throw new Error(msg);
    }
    return data;
};

const api = {
    get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
    post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
    upload: (endpoint, formData) => {
        const token = getToken();
        return fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            body: formData,
        });
    },
};

export default api;
