import time
import re
from fastapi import Request, HTTPException, status
from typing import Dict, Tuple

# Simple memory-based rate limiter
# In production with multiple workers, use Redis.
_request_counts: Dict[str, Tuple[int, float]] = {}

def rate_limit_middleware(rate_limit: int, window: int = 60):
    """
    Simple rate limiting middleware.
    rate_limit: number of requests allowed
    window: time window in seconds
    """
    async def middleware(request: Request, call_next):
        client_ip = request.client.host
        current_time = time.time()
        
        if client_ip not in _request_counts:
            _request_counts[client_ip] = (1, current_time)
        else:
            count, start_time = _request_counts[client_ip]
            if current_time - start_time < window:
                if count >= rate_limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={"message": "Rate limit exceeded. Please try again later."},
                    )
                _request_counts[client_ip] = (count + 1, start_time)
            else:
                _request_counts[client_ip] = (1, current_time)
        
        return await call_next(request)
    return middleware

# Prompt Injection Protection
BLOCKED_PATTERNS = [
    r"ignore previous instructions",
    r"disregard all previous",
    r"system prompt",
    r"you are now",
    r"forget everything",
    r"new instructions",
    r"bypass",
]

def sanitize_prompt(text: str) -> str:
    """Check for prompt injection patterns and sanitize input."""
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Potential prompt injection detected and blocked."},
            )
    
    # Basic sanitization
    sanitized = text.strip()
    return sanitized

async def security_middleware(request: Request, call_next):
    """General security middleware to catch common threats."""
    # Check for suspicious headers or query params if needed
    
    # We can also add security headers here
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response
