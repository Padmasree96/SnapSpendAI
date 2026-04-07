from pydantic import BaseModel
from typing import Optional


class IncomeCreate(BaseModel):
    amount: float
    source: str  # salary, freelance, investment, rental, business, other
    category: Optional[str] = "general"
    description: str
    date: str  # YYYY-MM-DD
    recurring: Optional[bool] = False
    notes: Optional[str] = None


class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    source: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    recurring: Optional[bool] = None
    notes: Optional[str] = None
