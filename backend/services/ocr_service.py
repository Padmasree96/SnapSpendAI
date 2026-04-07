"""
OCR Service for SnapSpend AI.
Tesseract-based text extraction with resilient engine discovery.
"""

import re
import shutil
from pathlib import Path
from typing import Optional

from config import settings


def _resolve_tesseract_cmd() -> Optional[str]:
    """Find a usable Tesseract executable path."""
    candidates = []

    if settings.TESSERACT_PATH:
        candidates.append(settings.TESSERACT_PATH)

    in_path = shutil.which("tesseract")
    if in_path:
        candidates.append(in_path)

    # Common Windows install locations
    candidates.extend([
        r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
        r"C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
    ])

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate

    return None


def get_tesseract_cmd() -> Optional[str]:
    """Public accessor for the detected Tesseract executable path."""
    return _resolve_tesseract_cmd()


_rapid_ocr_engine = None


def is_rapidocr_available() -> bool:
    """Check whether RapidOCR package is available."""
    try:
        import rapidocr_onnxruntime  # noqa: F401
        return True
    except Exception:
        return False


def _get_rapidocr_engine():
    """Lazy-initialize RapidOCR engine."""
    global _rapid_ocr_engine
    if _rapid_ocr_engine is None and is_rapidocr_available():
        from rapidocr_onnxruntime import RapidOCR
        _rapid_ocr_engine = RapidOCR()
    return _rapid_ocr_engine


def is_tesseract_available() -> bool:
    """Check whether pytesseract + Tesseract binary are usable."""
    try:
        import pytesseract
    except Exception:
        return False

    cmd = _resolve_tesseract_cmd()
    if not cmd:
        return False

    pytesseract.pytesseract.tesseract_cmd = cmd
    return True


def extract_text_from_image(image_path: str) -> Optional[str]:
    """Extract text from an image using Tesseract OCR or RapidOCR fallback."""
    if is_tesseract_available():
        try:
            import pytesseract
            from PIL import Image
            import cv2

            img = cv2.imread(image_path)
            if img is None:
                pil_img = Image.open(image_path)
                return pytesseract.image_to_string(pil_img)

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            return pytesseract.image_to_string(thresh)
        except Exception as exc:
            print(f"Warning: Tesseract OCR failed: {exc}")

    # Fallback: RapidOCR (no external binary required)
    if is_rapidocr_available():
        try:
            engine = _get_rapidocr_engine()
            if engine is None:
                return None

            result, _ = engine(image_path)
            if not result:
                return None

            # Each row is usually: [box, text, confidence]
            lines = []
            for row in result:
                if isinstance(row, (list, tuple)) and len(row) >= 2:
                    text = str(row[1]).strip()
                    if text:
                        lines.append(text)
            return "\n".join(lines) if lines else None
        except Exception as exc:
            print(f"Warning: RapidOCR failed: {exc}")

    return None


def _parse_amount(text: str) -> Optional[float]:
    """Parse a numeric amount from free text."""
    if not text:
        return None

    cleaned = text.replace(",", "").strip()
    try:
        value = float(cleaned)
        if 0 < value < 1_000_000:
            return value
    except ValueError:
        return None

    return None


def parse_receipt_text(raw_text: str) -> dict:
    """Parse OCR text into structured receipt details."""
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]

    result = {
        "merchant": "",
        "date": "",
        "items": [],
        "total": 0.0,
    }

    if not lines:
        return result

    result["merchant"] = lines[0] if lines else "Unknown"

    date_patterns = [
        r"(\d{4}[-/]\d{2}[-/]\d{2})",
        r"(\d{2}[-/]\d{2}[-/]\d{4})",
        r"(\d{2}[-/]\d{2}[-/]\d{2})",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, raw_text)
        if match:
            result["date"] = match.group(1)
            break

    total_patterns = [
        r"(?:total|grand\s*total|amount\s*due|balance|net|payable)\s*[:\-]?\s*\$?\s*(\d[\d,]*(?:[\.]\d{1,2})?)"
    ]
    for pattern in total_patterns:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            amount = _parse_amount(match.group(1))
            if amount:
                result["total"] = amount
                break

    number_pattern = re.compile(r"\$?\s*(\d[\d,]*(?:[\.]\d{1,2})?)")
    amounts = []

    for line in lines:
        matches = number_pattern.findall(line)
        for m in matches:
            amount = _parse_amount(m)
            if amount is None:
                continue

            amounts.append(amount)

            item_name = number_pattern.sub("", line).strip()
            item_name = item_name.replace("$", "").strip()
            if item_name and len(item_name) > 1:
                result["items"].append({"name": item_name[:80], "price": amount})

    if result["total"] <= 0 and amounts:
        result["total"] = max(amounts)

    return result
