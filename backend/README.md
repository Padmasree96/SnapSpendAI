# SnapSpend Backend (FastAPI)

## New AI Upgrade

This backend now includes:

- OpenAI LLM integration (`gpt-4o-mini`)
- Simple RAG pipeline (upload -> chunk -> embed -> FAISS -> retrieve -> answer)
- Basic security guardrails (prompt checks, file validation, optional API key header)

## Project Structure (AI/RAG/Security)

- `services/llm_service.py` - reusable OpenAI query function
- `services/document_processor.py` - extract text from PDF/Excel/CSV/images (OCR)
- `services/vector_service.py` - FAISS vector storage and user-scoped retrieval
- `services/rag_service.py` - retrieval + grounded response generation
- `services/security_service.py` - prompt/file validation and optional `X-API-Key` protection
- `routers/rag.py` - upload, ask, clear endpoints for RAG
- `routers/chat.py` - chat endpoint now uses the RAG-enabled AI engine

## Environment Setup

1. Create `.env` from `.env.example`.
2. Set at least:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-4o-mini`
3. Optional:
   - `BACKEND_API_KEY` (if set, pass `X-API-Key` header to protected AI endpoints)
   - `TESSERACT_PATH` (for OCR on Windows)
   - `GEMINI_API_KEY` (for bill/receipt vision auto-detection)

## Install & Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## RAG Flow

1. `POST /api/rag/upload` with file (`pdf`, `xlsx`, `xls`, `csv`, `jpg`, `jpeg`, `png`)
2. Backend extracts text, chunks it, embeds it, and stores vectors in FAISS
3. `POST /api/rag/ask` with question
4. Backend retrieves relevant chunks and sends context + question to OpenAI
5. Assistant returns grounded answer text

## Notes

- RAG answers are constrained by retrieved context.
- If context is missing, API returns "I don't know based on the uploaded documents."
- Bill auto-detection setup guide: `backend/BILL_AUTODETECTION_SETUP.md`
