"""
Global error handler middleware for consistent JSON error responses.
"""

import time
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse


async def error_handler_middleware(request: Request, call_next):
    """Catch unhandled exceptions and return a consistent JSON error response."""
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An internal server error occurred",
                "detail": str(exc) if str(exc) else "Unknown error",
            },
        )


async def request_logger_middleware(request: Request, call_next):
    """Log all API requests with method, path, status code, and response time."""
    start_time = time.time()
    response = await call_next(request)
    duration = round((time.time() - start_time) * 1000, 2)

    # Only log API requests, not static files
    if request.url.path.startswith("/api"):
        # Keep log output ASCII-only so Windows cp1252 consoles do not crash.
        print(f"API {request.method} {request.url.path} -> {response.status_code} ({duration}ms)")

    return response
