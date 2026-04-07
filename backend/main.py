"""
SnapSpend AI – FastAPI Backend
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine
from models import Base
from config import settings

# ── Router Imports ──
from routers import (
    auth, transactions, accounts, budgets, reports,
    image, insights, chat, notifications, data_management, profile,
    income, feedback, rag,
)

# ── Middleware Imports ──
from middleware import error_handler_middleware, request_logger_middleware
from middleware.security_middleware import rate_limit_middleware, security_middleware

# ── App Setup ──
app = FastAPI(
    title="SnapSpend AI API",
    description="Personal Finance Management with AI-Powered Insights",
    version="2.0.0",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Custom Middleware ──
app.middleware("http")(request_logger_middleware)
app.middleware("http")(error_handler_middleware)
app.middleware("http")(security_middleware)
app.middleware("http")(rate_limit_middleware(settings.RATE_LIMIT_PER_MINUTE))

# ── Database ──
Base.metadata.create_all(bind=engine)

# ── Upload Directory ──
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# ── Static Files ──
if os.path.isdir(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── Register Routers ──
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(accounts.router)
app.include_router(budgets.router)
app.include_router(reports.router)
app.include_router(image.router)
app.include_router(insights.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(data_management.router)
app.include_router(profile.router)
app.include_router(income.router)
app.include_router(feedback.router)
app.include_router(rag.router)


@app.get("/")
def root():
    return {"message": "SnapSpend AI API v2.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.0.0"}
