import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.user import User
from services.auth_service import get_current_user
from services.ai_engine import detect_category
from services.ocr_service import (
    extract_text_from_image,
    parse_receipt_text,
    is_tesseract_available,
    get_tesseract_cmd,
    is_rapidocr_available,
)
from services.gemini_service import analyze_receipt_image

router = APIRouter(prefix="/api/image", tags=["Image Processing & AI"])

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _manual_entry_error(filepath: str, safe_filename: str, message: str, code: str, raw_text: str = ""):
    merchant_guess = os.path.splitext(safe_filename)[0].replace("_", " ").strip() or "Bill"
    raise HTTPException(
        status_code=422,
        detail={
            "message": message,
            "code": code,
            "manualEntryRequired": True,
            "imagePath": filepath,
            "merchant": merchant_guess[:80],
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "category": "others",
            "amount": 0,
            "source": "manual_entry",
            "rawText": raw_text[:500] if raw_text else "",
            "engines": {
                "geminiConfigured": bool(settings.GEMINI_API_KEY),
                "tesseractAvailable": is_tesseract_available(),
                "tesseractPathDetected": get_tesseract_cmd(),
                "rapidOcrAvailable": is_rapidocr_available(),
            },
        },
    )


@router.get("/capabilities")
def image_capabilities():
    """Return current bill auto-detection capability status and setup guidance."""
    gemini_configured = bool(settings.GEMINI_API_KEY)
    tesseract_available = is_tesseract_available()
    rapidocr_available = is_rapidocr_available()
    tesseract_path = get_tesseract_cmd()

    return {
        "autoDetectionAvailable": gemini_configured or tesseract_available or rapidocr_available,
        "engines": {
            "geminiConfigured": gemini_configured,
            "tesseractAvailable": tesseract_available,
            "tesseractPathDetected": tesseract_path,
            "rapidOcrAvailable": rapidocr_available,
        },
        "setupGuide": [
            "Option 1: Set GEMINI_API_KEY in backend/.env for AI vision bill extraction.",
            "Option 2: Install Tesseract OCR and set TESSERACT_PATH in backend/.env.",
            "Option 3: Keep rapidocr-onnxruntime installed (local Python OCR fallback).",
            "Restart backend after updating .env values.",
        ],
    }


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an image and return analysis results from real AI/OCR only."""
    if not file.filename:
        raise HTTPException(status_code=400, detail={"message": "No file selected"})

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail={"message": "File type not allowed. Use PNG, JPG, JPEG, GIF, or WEBP"},
        )

    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = file.filename.replace(" ", "_").replace("/", "_").replace("\\", "_")
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filepath = os.path.join(upload_dir, f"{user.id}_{timestamp}_{safe_filename}")

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # Step 1: Gemini Vision
    gemini_result = analyze_receipt_image(filepath)
    if gemini_result:
        amount = float(gemini_result.get("amount") or 0)
        category = gemini_result.get("category", "others")
        if amount > 0:
            return {
                "merchant": gemini_result.get("merchant", "Unknown"),
                "amount": amount,
                "date": gemini_result.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
                "category": category,
                "items": gemini_result.get("items", []),
                "confidence": int(gemini_result.get("confidence", 90) or 90),
                "activityType": _get_activity_type(category),
                "imagePath": filepath,
                "source": "gemini_vision",
            }

        _manual_entry_error(
            filepath,
            safe_filename,
            "Could not detect total amount from this bill. Please enter amount manually.",
            "amount_not_detected",
        )

    # Step 2: Tesseract OCR
    raw_text = extract_text_from_image(filepath)
    if raw_text and raw_text.strip():
        parsed = parse_receipt_text(raw_text)
        category = detect_category(parsed.get("merchant", "") + " " + raw_text)

        if float(parsed.get("total") or 0) <= 0:
            _manual_entry_error(
                filepath,
                safe_filename,
                "OCR read the bill text but could not find total amount. Please enter amount manually.",
                "amount_not_detected",
                raw_text,
            )

        return {
            "merchant": parsed.get("merchant", "Unknown"),
            "amount": float(parsed.get("total") or 0),
            "date": parsed.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
            "category": category,
            "items": parsed.get("items", []),
            "confidence": 75,
            "activityType": _get_activity_type(category),
            "imagePath": filepath,
            "source": "tesseract_ocr",
            "rawText": raw_text[:500],
        }

    # Step 3: no engines available / extraction failed
    _manual_entry_error(
        filepath,
        safe_filename,
        "Bill auto-detection is not available right now. Please enter details manually and save.",
        "analysis_unavailable",
    )


def _get_activity_type(category: str) -> str:
    """Map category to a lifestyle activity type."""
    activity_map = {
        "food": "Dining Out",
        "transport": "Commuting",
        "shopping": "Shopping Spree",
        "entertainment": "Leisure Activity",
        "bills": "Bill Payment",
        "health": "Healthcare Visit",
        "education": "Learning Activity",
        "travel": "Travel & Tourism",
        "groceries": "Grocery Shopping",
        "rent": "Housing Payment",
        "subscriptions": "Digital Service",
    }
    return activity_map.get(category, "General Spending")
