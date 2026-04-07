import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from config import settings
from models.user import User
from schemas.rag import RagQuestionRequest
from services.auth_service import get_current_user
from services.rag_service import rag_service
from services.security_service import require_backend_api_key, validate_upload_file

router = APIRouter(prefix="/api/rag", tags=["RAG (Retrieval Augmented Generation)"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    _: None = Depends(require_backend_api_key),
    user: User = Depends(get_current_user),
):
    """Upload a document, process it, and store chunks in vector DB."""
    file_bytes = await file.read()
    safe_filename = validate_upload_file(file.filename or "", len(file_bytes))

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_name = f"{user.id}_{timestamp}_{uuid.uuid4().hex[:8]}_{safe_filename}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as handle:
        handle.write(file_bytes)

    try:
        chunk_count = rag_service.ingest_file(file_path=file_path, user_id=user.id)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Error processing document: {exc}"},
        ) from exc

    if chunk_count <= 0:
        raise HTTPException(
            status_code=400,
            detail={"message": "No text could be extracted from this file."},
        )

    return {
        "success": True,
        "message": "File processed and indexed successfully.",
        "fileName": unique_name,
        "chunks": chunk_count,
        "status": rag_service.get_memory_status(user.id),
    }


@router.get("/status")
def get_rag_status(
    _: None = Depends(require_backend_api_key),
    user: User = Depends(get_current_user),
):
    """Return current user's RAG memory status."""
    return {"success": True, **rag_service.get_memory_status(user.id)}


@router.post("/ask")
def ask_rag_question(
    data: RagQuestionRequest,
    _: None = Depends(require_backend_api_key),
    user: User = Depends(get_current_user),
):
    """Answer user question using retrieved vector DB context."""
    try:
        result = rag_service.answer_from_documents(question=data.question, user_id=user.id)
    except HTTPException:
        raise
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Error generating answer: {exc}"},
        ) from exc

    return {"success": True, **result}


@router.delete("/clear")
def clear_vector_store(
    _: None = Depends(require_backend_api_key),
    user: User = Depends(get_current_user),
):
    """Clear only the current user's indexed chunks from vector DB."""
    try:
        removed = rag_service.clear_user_documents(user_id=user.id)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Error clearing vector store: {exc}"},
        ) from exc

    return {
        "success": True,
        "message": "User vector store cleared.",
        "removedChunks": removed,
        "status": rag_service.get_memory_status(user.id),
    }
