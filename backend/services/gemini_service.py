"""
Google Gemini AI Service for SnapSpend AI.
Handles: vision analysis, chat completion, budget recommendations, behavior analysis.
Falls back gracefully to rule-based engine when API key is missing or on errors.
"""

import json
import traceback
from typing import Optional

from config import settings

# Lazy-initialized client
_model = None
_vision_model = None
_available = None


def _safe_log(message: str):
    """
    Print log messages without crashing on Windows cp1252 consoles.
    """
    safe_message = str(message).encode("ascii", "backslashreplace").decode("ascii")
    print(safe_message)


def _is_available() -> bool:
    """Check if Gemini API is available."""
    global _available
    if _available is not None:
        return _available
    if not settings.GEMINI_API_KEY:
        _available = False
        _safe_log("Warning: Gemini API key not configured - AI features will use rule-based fallback")
        return False
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _available = True
        _safe_log("Gemini AI service initialized successfully")
        return True
    except Exception as e:
        _available = False
        _safe_log(f"Warning: Gemini API init failed: {e} - using fallback")
        return False


def _get_model():
    """Get or create the Gemini text model."""
    global _model
    if _model is None and _is_available():
        import google.generativeai as genai
        _model = genai.GenerativeModel(settings.GEMINI_MODEL)
    return _model


def _get_vision_model():
    """Get or create the Gemini vision model."""
    global _vision_model
    if _vision_model is None and _is_available():
        import google.generativeai as genai
        _vision_model = genai.GenerativeModel(settings.GEMINI_VISION_MODEL)
    return _vision_model


def analyze_receipt_image(image_path: str) -> Optional[dict]:
    """
    Analyze a receipt/bill image using Gemini Vision API.
    Returns structured data: merchant, amount, date, category, items, confidence.
    Returns None if Gemini is unavailable.
    """
    model = _get_vision_model()
    if not model:
        return None

    try:
        from PIL import Image
        img = Image.open(image_path)

        prompt = """Analyze this receipt/bill image and extract the following information as JSON:
{
    "merchant": "store/restaurant name",
    "amount": total_amount_as_number,
    "date": "YYYY-MM-DD",
    "category": "one of: food, transport, shopping, entertainment, bills, health, education, travel, groceries, rent, subscriptions, others",
    "items": [{"name": "item name", "price": price_as_number}],
    "confidence": confidence_percentage_as_integer
}
If you cannot determine a field, use reasonable defaults. Return ONLY valid JSON, no markdown."""

        response = model.generate_content([prompt, img])
        text = response.text.strip()

        # Clean up markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)
        return result
    except Exception as e:
        _safe_log(f"Warning: Gemini vision analysis failed: {e}")
        _safe_log(traceback.format_exc())
        return None


def generate_chat_completion(user_message: str, financial_context: str) -> Optional[str]:
    """
    Generate an AI chat response using Gemini with financial context.
    Returns None if Gemini is unavailable.
    """
    model = _get_model()
    if not model:
        return None

    try:
        prompt = f"""You are SnapSpend AI, a friendly and expert personal finance assistant.
You help users understand their finances, give actionable spending advice, and provide personalized insights.
Use markdown formatting for emphasis. Be concise but helpful.

USER'S FINANCIAL CONTEXT:
{financial_context}

USER'S QUESTION: {user_message}

Respond helpfully with specific numbers from their data when relevant. Keep your response under 200 words."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        _safe_log(f"Warning: Gemini chat failed: {e}")
        return None


def generate_budget_recommendations(spending_data: dict, income: float) -> Optional[list]:
    """
    Generate AI-powered budget recommendations based on spending patterns.
    Returns None if Gemini is unavailable.
    """
    model = _get_model()
    if not model:
        return None

    try:
        prompt = f"""Based on this user's financial data, suggest optimal budget allocations.

Monthly Income: ${income:,.2f}
Current Spending by Category: {json.dumps(spending_data)}

Return a JSON array of budget recommendations:
[{{"category": "category_name", "recommendedLimit": amount, "reason": "brief reason"}}]
Include all major spending categories. Return ONLY valid JSON array, no markdown."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        return json.loads(text)
    except Exception as e:
        _safe_log(f"Warning: Gemini budget recommendations failed: {e}")
        return None


def generate_behavior_analysis(financial_summary: str) -> Optional[str]:
    """
    Generate a deep spending behavior analysis using Gemini.
    Returns None if Gemini is unavailable.
    """
    model = _get_model()
    if not model:
        return None

    try:
        prompt = f"""Analyze the following user's financial behavior and provide insights:

{financial_summary}

Provide a brief analysis covering:
1. Spending personality description (2 sentences)
2. Key lifestyle patterns (2-3 bullet points)
3. Risk factors (1-2 bullet points)
4. Recommendations (2-3 actionable tips)

Use markdown formatting. Keep it under 150 words."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        _safe_log(f"Warning: Gemini behavior analysis failed: {e}")
        return None


def generate_financial_summary(transactions_text: str) -> Optional[str]:
    """
    Generate an AI executive summary of financial data for export.
    Returns None if Gemini is unavailable.
    """
    model = _get_model()
    if not model:
        return None

    try:
        prompt = f"""Write a brief executive financial summary based on this data:

{transactions_text}

Include: total income, total expenses, savings rate, top spending categories, and 2-3 recommendations.
Keep it under 200 words. Use professional tone."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        _safe_log(f"Warning: Gemini financial summary failed: {e}")
        return None
