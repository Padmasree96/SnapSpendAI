# Bill Auto-Detection Setup

This project supports three auto-detection engines for bill images:

1. `Gemini Vision` (recommended)
2. `Tesseract OCR` (local/offline OCR)
3. `RapidOCR` (local Python OCR fallback, no Tesseract binary required)

If both are unavailable, the app now falls back to manual entry on the uploaded image.

## 1) Check Current Status

Call:

`GET /api/image/capabilities`

It returns:

- `autoDetectionAvailable`
- `engines.geminiConfigured`
- `engines.tesseractAvailable`
- `engines.tesseractPathDetected`
- `engines.rapidOcrAvailable`

## 2) Enable Gemini Vision

Open `backend/.env` and set:

`GEMINI_API_KEY=your_real_key_here`

Restart backend.

## 3) Enable Tesseract OCR (Windows)

Install Tesseract (one-time), for example with winget:

`winget install --id UB-Mannheim.TesseractOCR -e`

Then set in `backend/.env`:

`TESSERACT_PATH=C:\\Program Files\\Tesseract-OCR\\tesseract.exe`

Restart backend.

## 4) Expected Behavior

- If auto-detection works, bill fields are pre-filled.
- If it fails, UI switches to manual-entry mode with the uploaded image preserved.

## 5) RapidOCR fallback

If Tesseract and Gemini are unavailable, install:

`pip install rapidocr-onnxruntime`

Then restart backend. The app will use RapidOCR automatically.
