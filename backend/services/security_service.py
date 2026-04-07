"""
Security helpers for AI and RAG endpoints.
"""

import os
import re
from typing import Optional

from fastapi import Header, HTTPException, status

from config import settings

ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png"}

BLOCKED_PROMPT_PATTERNS = [
    r"ignore\s+previous\s+instructions",
    r"disregard\s+all\s+previous",
    r"system\s+prompt",
    r"you\s+are\s+now",
    r"forget\s+everything",
    r"new\s+instructions",
    r"bypass",
]


def validate_user_prompt(prompt: str) -> str:
    """Basic prompt safety checks and normalization."""
    cleaned = (prompt or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Prompt cannot be empty."},
        )
    if len(cleaned) > 4000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Prompt is too long."},
        )

    for pattern in BLOCKED_PROMPT_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Potential prompt injection detected and blocked."},
            )

    return cleaned


def validate_upload_file(filename: str, size_bytes: int) -> str:
    """Validate file extension and size, then return a safe basename."""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "File name is missing."},
        )

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))}"},
        )

    if size_bytes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Uploaded file is empty."},
        )

    if size_bytes > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"message": f"File exceeds max upload size of {settings.MAX_UPLOAD_SIZE} bytes."},
        )

    safe_name = os.path.basename(filename).replace(" ", "_")
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", safe_name)
    return safe_name


def require_backend_api_key(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> None:
    """
    Optional endpoint-level protection.
    If BACKEND_API_KEY is set, clients must pass matching X-API-Key header.
    """
    configured_key = (settings.BACKEND_API_KEY or "").strip()
    if not configured_key:
        return

    if not x_api_key or x_api_key != configured_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid or missing API key."},
        )
