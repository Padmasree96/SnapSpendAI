export const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000';

export const createBackendUnavailableError = () =>
    new Error(`Unable to connect to server. Make sure the backend is running on ${LOCAL_BACKEND_URL}.`);

export const readJsonResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json') || contentType.includes('+json')) {
        return response.json();
    }

    const body = await response.text();
    const looksLikeHtml = /^\s*<!doctype html>|^\s*<html/i.test(body);
    const statusLabel = response.status ? `HTTP ${response.status}` : 'an unexpected response';
    const cleanedBody = body.trim();

    if (response.status >= 500) {
        if (cleanedBody && !looksLikeHtml) {
            return { detail: cleanedBody };
        }

        return {
            detail: `Server returned an internal error (${statusLabel}). If the problem continues, restart FastAPI on ${LOCAL_BACKEND_URL}.`
        };
    }

    if (looksLikeHtml) {
        throw new Error(`Server returned HTML instead of JSON (${statusLabel}).`);
    }

    throw new Error(`Server returned an invalid response (${statusLabel}).`);
};
