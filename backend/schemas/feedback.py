from pydantic import BaseModel
from typing import Optional


class FeedbackCreate(BaseModel):
    feedbackType: str  # ocr_correction, category_correction
    originalValue: str
    correctedValue: str
    context: Optional[dict] = {}
