from pydantic import BaseModel
from typing import Optional


class TransactionCreate(BaseModel):
    type: str  # 'expense' or 'income'
    amount: float
    category: str
    description: str
    date: str  # YYYY-MM-DD
    account: Optional[str] = None
    image: Optional[str] = None
    aiDetected: Optional[bool] = False
    confidence: Optional[int] = None
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    account: Optional[str] = None
    notes: Optional[str] = None
