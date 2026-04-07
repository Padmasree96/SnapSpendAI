from pydantic import BaseModel
from typing import Optional


class BudgetCreate(BaseModel):
    category: str
    limit: float
    month: Optional[str] = None  # YYYY-MM


class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    limit: Optional[float] = None
    month: Optional[str] = None
