"""
AI engine wrapper used by routers.
Keeps backward-compatible helper functions while routing chat through RAG + OpenAI.
"""

from datetime import datetime

from services.llm_service import ask_llm
from services.rag_service import rag_service
from services.security_service import validate_user_prompt

CATEGORY_KEYWORDS = {
    "food": ["restaurant", "cafe", "swiggy", "zomato", "dinner", "lunch", "coffee"],
    "transport": ["uber", "ola", "bus", "train", "fuel", "petrol", "diesel", "metro"],
    "shopping": ["amazon", "flipkart", "mall", "store", "shopping"],
    "entertainment": ["movie", "netflix", "spotify", "concert", "game"],
    "bills": ["electricity", "water", "internet", "bill", "postpaid", "prepaid"],
    "health": ["hospital", "pharmacy", "medicine", "doctor", "clinic"],
    "education": ["course", "udemy", "school", "college", "book"],
    "travel": ["flight", "hotel", "trip", "airbnb", "vacation"],
    "groceries": ["grocery", "supermarket", "vegetables", "milk", "mart"],
    "rent": ["rent", "landlord", "lease"],
    "subscriptions": ["subscription", "prime", "membership", "recurring"],
}

ALLOWED_CATEGORIES = list(CATEGORY_KEYWORDS.keys()) + ["others"]

CATEGORY_SYSTEM_PROMPT = (
    "Classify this transaction description into exactly one category from: "
    "food, transport, shopping, entertainment, bills, health, education, travel, "
    "groceries, rent, subscriptions, others. Return only the category name."
)


def _detect_category_rule_based(text: str) -> str:
    text_lower = (text or "").lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text_lower for keyword in keywords):
            return category
    return "others"


class AIEngine:
    def generate_chat_response(self, message: str, user_id: int) -> str:
        """RAG-grounded assistant response."""
        clean_message = validate_user_prompt(message)
        try:
            result = rag_service.answer_from_documents(clean_message, user_id=user_id)
            answer = (result.get("answer") or "").strip()
            if answer:
                return answer
        except Exception:
            pass

        # Graceful fallback to keep chat UI responsive when RAG/LLM deps are not ready.
        return (
            "I can help, but the AI knowledge pipeline is not fully configured yet. "
            "Please ensure OpenAI key and RAG dependencies are installed, then try again."
        )

    def detect_category(self, description: str) -> str:
        """LLM-first category detection with safe rule-based fallback."""
        text = (description or "").strip()
        if not text:
            return "others"

        try:
            response = ask_llm(
                user_query=text,
                system_prompt=CATEGORY_SYSTEM_PROMPT,
                temperature=0,
            ).lower().strip()
            if response in ALLOWED_CATEGORIES:
                return response
            return _detect_category_rule_based(text)
        except Exception:
            return _detect_category_rule_based(text)


def detect_category(description: str) -> str:
    return ai_engine.detect_category(description)


def simulate_ocr_analysis(filename: str) -> dict:
    """
    Backward-compatible fallback when image OCR/AI extraction fails.
    """
    category = _detect_category_rule_based(filename)
    return {
        "merchant": "Unknown",
        "amount": 0,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "category": category,
        "items": [],
        "confidence": 40,
        "activityType": "General Spending",
        "source": "mock_analysis",
    }


ai_engine = AIEngine()
